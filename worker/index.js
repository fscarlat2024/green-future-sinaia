// API rezervari directe Green Future Sinaia. Restul site-ului e static (_site).
// Auth panou: parola PBKDF2 + token Bearer (merge si in site, si in viitoarea aplicatie mobila).
// Disponibilitatea e verificata in aceeasi instructiune SQL cu rezervarea, ca doi oaspeti
// sa nu poata prinde aceeasi perioada.
import { mailOwnerNew, mailGuest, mailConflict, mailOrder, mailGuestReset, mailChat, brevoKeepAlive } from "./mail.js";
import restaurant from "../src/_data/restaurant.json";
import { parseIcal, buildIcal } from "./ical.js";
import { pushEnabled, validPushToken, pushTo, pushToStaff, guestBookingMessage, guestOrderMessage } from "./push.js";

const enc = new TextEncoder();
const SESSION_DAYS = 30;
const GUEST_SESSION_DAYS = 180;
const MAX_NIGHTS = 60;
const MAX_ADVANCE_DAYS = 400;
const PENDING_HOURS = 24;
const ICAL_MAX_AGE_MS = 30 * 60000;
const ICAL_BOOKING_AGE_MS = 2 * 60000; // inainte de o rezervare sau confirmare, calendarul trebuie sa fie aproape la zi
const ICAL_WAIT_MS = 3000;
const ACTIVE = "('pending','confirmed')";
// Green Future Club: un sejur incheiat conteaza 1, iar 5 comenzi livrate la bistro conteaza cat un sejur.
const LEVELS = [{ key: "gold", min: 5, pct: 10 }, { key: "silver", min: 2, pct: 5 }, { key: "member", min: 0, pct: 0 }];
const ORDERS_PER_STAY = 5;

class Fail extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}
const fail = (status, code, extra) => { throw new Fail(status, code, extra); };

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-max-age": "86400",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS },
});
const readJson = (req) => req.json().catch(() => fail(400, "bad_json"));

// ---------- date ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (s) => typeof s === "string" && DATE_RE.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const addDays = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());

// ---------- criptografie ----------
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function hashPassword(pw, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return b64(bits);
}
async function verifyPassword(pw, stored) {
  const [, , salt, hash] = stored.split("$");
  const again = await hashPassword(pw, unb64(salt));
  if (again.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= again.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
async function makePassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$100000$${b64(salt)}$${await hashPassword(pw, salt)}`;
}
const randomHex = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function bookingCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "GF-" + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => abc[b % abc.length]).join("");
}

// ---------- limitari ----------
async function rateLimit(env, key, max, windowMs) {
  const now = Date.now();
  const r = await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start < ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start < ?3 THEN ?2 ELSE window_start END
     RETURNING count`).bind(key, now, now - windowMs).first();
  if (r.count > max) fail(429, "too_many_requests");
}
const clientIp = (req) => req.headers.get("cf-connecting-ip") || "local";

// ---------- apartamente, preturi, disponibilitate ----------
const getProperty = (env, slug) => env.DB.prepare("SELECT * FROM properties WHERE slug = ?").bind(slug).first();
const isBookable = (p) => p && p.active === 1 && p.base_price > 0;
async function bookableProperty(env, slug) {
  const p = await getProperty(env, slug);
  if (!isBookable(p)) fail(404, "not_bookable");
  return p;
}
const publicProperty = (p) => ({
  slug: p.slug, name: p.name, capacity: p.capacity, basePrice: p.base_price, cleaningFee: p.cleaning_fee,
  minNights: p.min_nights, instantBook: !!p.instant_book, freeCancelDays: p.free_cancel_days,
  checkinTime: p.checkin_time, checkoutTime: p.checkout_time, currency: "lei", loyalty: !!p.loyalty_enabled,
});

async function loadRates(env, slug, from, to) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM rates WHERE property_slug = ? AND date_from < ? AND date_to > ? ORDER BY id"
  ).bind(slug, to, from).all();
  return results;
}
// perioada adaugata ultima are prioritate daca se suprapun
const rateFor = (rates, day) => {
  for (let i = rates.length - 1; i >= 0; i--) if (rates[i].date_from <= day && day < rates[i].date_to) return rates[i];
  return null;
};

async function isFree(env, slug, checkin, checkout) {
  const r = await env.DB.prepare(
    `SELECT
       EXISTS(SELECT 1 FROM bookings WHERE property_slug = ?1 AND status IN ${ACTIVE} AND checkin < ?3 AND checkout > ?2) AS booked,
       EXISTS(SELECT 1 FROM blocks WHERE property_slug = ?1 AND date_from < ?3 AND date_to > ?2) AS blocked`
  ).bind(slug, checkin, checkout).first();
  return !r.booked && !r.blocked;
}

// Toate regulile de pret si sejur; aceeasi functie e folosita la afisare si la rezervare.
async function quote(env, p, checkin, checkout, guests, deal) {
  if (!isDate(checkin) || !isDate(checkout)) fail(400, "invalid_dates");
  const nights = diffDays(checkin, checkout);
  if (nights < 1 || nights > MAX_NIGHTS) fail(400, "invalid_dates");
  const now = today();
  if (checkin < now || diffDays(now, checkin) > MAX_ADVANCE_DAYS) fail(400, "invalid_dates");
  if (guests < 1 || guests > p.capacity) fail(400, "too_many_guests", { capacity: p.capacity });

  const rates = await loadRates(env, p.slug, checkin, checkout);
  const minNights = rateFor(rates, checkin)?.min_nights || p.min_nights;
  if (nights < minNights) fail(400, "min_nights", { minNights });

  const nightly = [];
  for (let i = 0; i < nights; i++) {
    const d = addDays(checkin, i);
    nightly.push({ date: d, price: rateFor(rates, d)?.price ?? p.base_price });
  }
  const subtotal = nightly.reduce((sum, n) => sum + n.price, 0);
  // reducerea se aplica pe nopti, nu si pe curatenie, si doar daca proprietarul participa
  const pct = p.loyalty_enabled && deal ? deal.pct : 0;
  const discount = Math.round(subtotal * pct / 100);
  return {
    checkin, checkout, nights, guests, nightly, subtotal, discount, discountPct: pct, level: discount ? deal.key : undefined,
    offerId: discount ? deal.offerId : undefined, offerTitle: discount ? deal.title : undefined,
    cleaningFee: p.cleaning_fee, total: subtotal - discount + p.cleaning_fee, currency: "lei",
    available: await isFree(env, p.slug, checkin, checkout),
  };
}

async function calendar(env, p) {
  const from = today();
  const to = addDays(from, MAX_ADVANCE_DAYS);
  const [rates, booked, blocked] = await Promise.all([
    loadRates(env, p.slug, from, to),
    env.DB.prepare(`SELECT checkin AS a, checkout AS b FROM bookings WHERE property_slug = ? AND status IN ${ACTIVE} AND checkout > ?`).bind(p.slug, from).all(),
    env.DB.prepare("SELECT date_from AS a, date_to AS b FROM blocks WHERE property_slug = ? AND date_to > ?").bind(p.slug, from).all(),
  ]);
  const taken = new Set();
  for (const r of [...booked.results, ...blocked.results]) {
    for (let d = r.a < from ? from : r.a; d < r.b && d < to; d = addDays(d, 1)) taken.add(d);
  }
  const days = [];
  for (let d = from; d < to; d = addDays(d, 1)) {
    const rate = rateFor(rates, d);
    days.push({ d, p: rate?.price ?? p.base_price, m: rate?.min_nights || p.min_nights, a: taken.has(d) ? 0 : 1 });
  }
  return { property: publicProperty(p), days };
}

// ---------- rezervari ----------
function cleanGuest(b) {
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const phone = String(b.phone || "").trim();
  const note = String(b.note || "").trim().slice(0, 1000);
  if (name.length < 2 || name.length > 100) fail(400, "invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) fail(400, "invalid_email");
  if (phone.replace(/\D/g, "").length < 6 || phone.length > 30) fail(400, "invalid_phone");
  return { name, email, phone, note };
}
const publicBooking = (b, p) => ({
  code: b.code, property: b.property_slug, propertyName: p?.name, checkin: b.checkin, checkout: b.checkout,
  nights: diffDays(b.checkin, b.checkout), adults: b.adults, children: b.children, guestName: b.guest_name,
  subtotal: b.subtotal, discount: b.discount, cleaningFee: b.cleaning_fee, total: b.total, currency: "lei", status: b.status, lang: b.lang,
  checkinTime: p?.checkin_time, checkoutTime: p?.checkout_time, freeCancelDays: p?.free_cancel_days,
  ownerPhone: b.status === "confirmed" ? p?.owner_phone : undefined,
  canCancel: guestCanCancel(b, p),
});
function guestCanCancel(b, p) {
  if (b.status === "pending") return true;
  return b.status === "confirmed" && !!p && diffDays(today(), b.checkin) >= p.free_cancel_days;
}

async function createBooking(req, env, ctx) {
  const b = await readJson(req);
  if (b.website) return json({ code: "GF-000000", status: "pending" }, 201); // capcana pentru boti
  if (b.accept !== true) fail(400, "accept_required");
  const p = await bookableProperty(env, String(b.slug || ""));
  const adults = Math.trunc(Number(b.adults)) || 0;
  const children = Math.trunc(Number(b.children)) || 0;
  if (adults < 1 || children < 0) fail(400, "invalid_guests");
  const guest = cleanGuest(b);
  await freshen(env, ctx, p, ICAL_BOOKING_AGE_MS);
  const account = await optionalGuest(req, env);
  const q = await quote(env, p, b.checkin, b.checkout, adults + children, await guestDeal(env, account, "stay"));
  if (!q.available) fail(409, "unavailable");
  // dupa validari, ca o greseala de tastare sa nu consume din limita
  await rateLimit(env, `book:${clientIp(req)}`, 5, 3600000);

  const code = bookingCode();
  const token = randomHex();
  const status = p.instant_book ? "confirmed" : "pending";
  const now = Date.now();
  const lang = b.lang === "en" ? "en" : "ro";
  const res = await env.DB.prepare(
    `INSERT INTO bookings (code, token_hash, property_slug, checkin, checkout, adults, children, guest_name,
       guest_email, guest_phone, note, lang, subtotal, cleaning_fee, total, status, created_at, updated_at, push_token, guest_id, discount, offer_id)
     SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17,?18,?19,?20,?21
     WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE property_slug = ?3 AND status IN ${ACTIVE} AND checkin < ?5 AND checkout > ?4)
       AND NOT EXISTS (SELECT 1 FROM blocks WHERE property_slug = ?3 AND date_from < ?5 AND date_to > ?4)`
  ).bind(code, await sha256(token), p.slug, q.checkin, q.checkout, adults, children, guest.name, guest.email,
    guest.phone, guest.note, lang, q.subtotal, q.cleaningFee, q.total, status, now, validPushToken(b.pushToken), account ? account.id : null, q.discount, q.offerId || null).run();
  if (!res.meta.changes) fail(409, "unavailable");

  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE code = ?").bind(code).first();
  ctx.waitUntil(Promise.allSettled([
    mailOwnerNew(env, p, booking),
    mailGuest(env, p, booking, status === "confirmed" ? "confirmed" : "received", token),
    pushToStaff(env, p.slug, staffBookingMessage(p, booking, status === "confirmed" ? "Rezervare nouă confirmată" : "Rezervare nouă de confirmat")),
  ]));
  return json({ ...publicBooking(booking, p), token, emailSent: !!env.BREVO_API_KEY }, 201);
}

const staffBookingMessage = (p, b, title) => ({ title, body: `${p.name}: ${b.guest_name}, ${b.checkin} - ${b.checkout}, ${b.total} lei`, url: "/admin/" });

async function guestBooking(env, code, token) {
  const b = await env.DB.prepare("SELECT * FROM bookings WHERE code = ?").bind(code).first();
  if (!b || !token || b.token_hash !== await sha256(token)) fail(404, "not_found");
  return b;
}

async function setStatus(env, b, status) {
  await env.DB.prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?").bind(status, Date.now(), b.id).run();
  return { ...b, status };
}

// ---------- panou proprietari ----------
async function adminAuth(req, env) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) fail(401, "unauthorized");
  const a = await env.DB.prepare(
    `SELECT a.id, a.email, a.role FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.expires_at > ?`).bind(await sha256(m[1]), Date.now()).first();
  if (!a) fail(401, "unauthorized");
  a.tokenHash = await sha256(m[1]);
  return a;
}
async function adminSlugs(env, a) {
  const q = a.role === "admin"
    ? env.DB.prepare("SELECT slug FROM properties ORDER BY name")
    : env.DB.prepare("SELECT property_slug AS slug FROM admin_properties WHERE admin_id = ? ORDER BY property_slug").bind(a.id);
  return (await q.all()).results.map((r) => r.slug);
}
async function ownedProperty(env, a, slug) {
  if (!(await adminSlugs(env, a)).includes(slug)) fail(403, "forbidden");
  const p = await getProperty(env, slug);
  if (!p) fail(404, "not_found");
  return p;
}

async function login(req, env) {
  const b = await readJson(req);
  const email = String(b.email || "").trim().toLowerCase();
  const lock = await env.DB.prepare("SELECT until FROM login_fails WHERE email = ?").bind(email).first();
  if (lock && lock.until > Date.now()) fail(429, "too_many_requests");
  const a = await env.DB.prepare("SELECT * FROM admins WHERE email = ?").bind(email).first();
  if (!a || !(await verifyPassword(String(b.password || ""), a.pass_hash))) {
    await env.DB.prepare(
      `INSERT INTO login_fails (email, count, until) VALUES (?1, 1, 0)
       ON CONFLICT(email) DO UPDATE SET count = count + 1, until = CASE WHEN count + 1 >= 8 THEN ?2 ELSE 0 END`
    ).bind(email, Date.now() + 15 * 60000).run();
    fail(401, "bad_login");
  }
  await env.DB.prepare("DELETE FROM login_fails WHERE email = ?").bind(email).run();
  const token = randomHex();
  await env.DB.prepare("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), a.id, Date.now() + SESSION_DAYS * 86400000).run();
  return json({ token, email: a.email, role: a.role });
}

const adminProperty = (p, env) => ({
  ...publicProperty(p), active: !!p.active, basePrice: p.base_price, ownerEmail: p.owner_email, ownerPhone: p.owner_phone,
  icalImportUrl: p.ical_import_url, icalExportUrl: `${env.SITE_URL}/ical/${p.ical_token}.ics`,
  icalSyncedAt: p.ical_synced_at, icalError: p.ical_error,
});

async function updateProperty(env, p, b) {
  const int = (v, min, max) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) fail(400, "invalid_value");
    return n;
  };
  const icalUrl = String(b.icalImportUrl || "").trim();
  if (icalUrl && !/^https:\/\//i.test(icalUrl)) fail(400, "invalid_ical_url");
  const time = (v) => { if (!/^\d{2}:\d{2}$/.test(v)) fail(400, "invalid_value"); return v; };
  const basePrice = b.basePrice === null || b.basePrice === "" ? null : int(b.basePrice, 1, 100000);
  if (b.active && !basePrice) fail(400, "price_required");
  await env.DB.prepare(
    `UPDATE properties SET active=?, capacity=?, base_price=?, cleaning_fee=?, min_nights=?, instant_book=?,
       free_cancel_days=?, checkin_time=?, checkout_time=?, owner_email=?, owner_phone=?, ical_import_url=?, loyalty_enabled=? WHERE slug=?`
  ).bind(b.active ? 1 : 0, int(b.capacity, 1, 30), basePrice, int(b.cleaningFee || 0, 0, 100000), int(b.minNights, 1, 30),
    b.instantBook ? 1 : 0, int(b.freeCancelDays, 0, 60), time(b.checkinTime), time(b.checkoutTime),
    String(b.ownerEmail || "").trim() || null, String(b.ownerPhone || "").trim() || null, icalUrl || null, b.loyalty ? 1 : 0, p.slug).run();
}

async function adminRoutes(req, env, ctx, parts) {
  if (parts[0] === "login" && req.method === "POST") return login(req, env);
  const a = await adminAuth(req, env);
  const [first, second, third] = parts;

  if (first === "logout" && req.method === "POST") {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(a.tokenHash).run();
    return json({ ok: true });
  }
  if (first === "me") {
    const slugs = await adminSlugs(env, a);
    const props = await Promise.all(slugs.map((s) => getProperty(env, s)));
    return json({ email: a.email, role: a.role, properties: props.map((p) => ({ slug: p.slug, name: p.name, active: !!p.active })) });
  }

  if (first === "bookings" && !second && req.method === "GET") {
    const slugs = await adminSlugs(env, a);
    if (!slugs.length) return json({ bookings: [] });
    const marks = slugs.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT b.*, p.name AS property_name FROM bookings b JOIN properties p ON p.slug = b.property_slug
       WHERE b.property_slug IN (${marks}) ORDER BY b.status = 'pending' DESC, b.checkin DESC LIMIT 300`
    ).bind(...slugs).all();
    return json({ bookings: results.map(({ token_hash, ...b }) => b) });
  }

  if (first === "bookings" && second && req.method === "POST") {
    const b = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(second)).first();
    if (!b) fail(404, "not_found");
    const p = await ownedProperty(env, a, b.property_slug);
    let updated;
    if (third === "confirm") {
      if (b.status !== "pending") fail(409, "wrong_status");
      await freshen(env, ctx, p, ICAL_BOOKING_AGE_MS);
      if (!(await blocksFree(env, b))) fail(409, "calendar_conflict");
      updated = await setStatus(env, b, "confirmed");
    } else if (third === "decline") {
      if (b.status !== "pending") fail(409, "wrong_status");
      updated = await setStatus(env, b, "declined");
    } else if (third === "cancel") {
      if (b.status !== "pending" && b.status !== "confirmed") fail(409, "wrong_status");
      updated = await setStatus(env, b, "cancelled");
    } else fail(404, "not_found");
    ctx.waitUntil(Promise.allSettled([
      mailGuest(env, p, updated, updated.status),
      pushTo(env, [b.push_token], guestBookingMessage(p, updated, updated.status)),
    ]));
    return json({ ok: true, status: updated.status });
  }

  if (first === "orders") {
    if (a.role !== "admin") fail(403, "forbidden");
    if (!second && req.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM orders ORDER BY status = 'new' DESC, status = 'confirmed' DESC, created_at DESC LIMIT 200"
      ).all();
      return json({ orders: results.map((o) => ({ ...o, items: JSON.parse(o.items) })) });
    }
    if (second && req.method === "POST") {
      const next = { confirm: ["new", "confirmed"], deliver: ["confirmed", "delivered"], cancel: [null, "cancelled"] }[third];
      if (!next) fail(404, "not_found");
      const o = await env.DB.prepare("SELECT status, code, lang, push_token FROM orders WHERE id = ?").bind(Number(second)).first();
      if (!o) fail(404, "not_found");
      if (next[0] ? o.status !== next[0] : !["new", "confirmed"].includes(o.status)) fail(409, "wrong_status");
      await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").bind(next[1], Date.now(), Number(second)).run();
      ctx.waitUntil(pushTo(env, [o.push_token], guestOrderMessage(o, next[1])));
      return json({ ok: true, status: next[1] });
    }
  }

  if (first === "chats") {
    const slugs = await adminSlugs(env, a);
    if (!second && req.method === "GET") {
      if (!slugs.length) return json({ chats: [] });
      const { results } = await env.DB.prepare(
        `SELECT c.id, c.unread_owner AS unread, c.last_at, p.name AS property_name, g.name AS guest_name,
           (SELECT body FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last
         FROM chats c JOIN properties p ON p.slug = c.property_slug JOIN guests g ON g.id = c.guest_id
         WHERE c.property_slug IN (${slugs.map(() => "?").join(",")}) ORDER BY c.last_at DESC LIMIT 200`
      ).bind(...slugs).all();
      return json({ chats: results });
    }
    if (second) {
      const chat = await env.DB.prepare(
        `SELECT c.*, g.name AS guest_name, g.email AS guest_email, g.lang AS guest_lang, g.id AS gid
         FROM chats c JOIN guests g ON g.id = c.guest_id WHERE c.id = ?`
      ).bind(Number(second)).first();
      // alt proprietar nu poate afla nici macar ca exista conversatia
      if (!chat || !slugs.includes(chat.property_slug)) fail(404, "not_found");
      if (req.method === "GET") {
        if (chat.unread_owner) await env.DB.prepare("UPDATE chats SET unread_owner = 0 WHERE id = ?").bind(chat.id).run();
        const p = await getProperty(env, chat.property_slug);
        return json({ guestName: chat.guest_name, guestEmail: chat.guest_email, propertyName: p.name, messages: await threadOf(env, chat.id) });
      }
      if (req.method === "POST") {
        const b = await readJson(req);
        const body = cleanMessage(b.body);
        const now = Date.now();
        await env.DB.batch([
          env.DB.prepare("INSERT INTO messages (chat_id, sender, body, created_at) VALUES (?, 'owner', ?, ?)").bind(chat.id, body, now),
          env.DB.prepare("UPDATE chats SET unread_guest = unread_guest + 1, unread_owner = 0, last_at = ? WHERE id = ?").bind(now, chat.id),
        ]);
        const p = await getProperty(env, chat.property_slug);
        ctx.waitUntil(notifyGuest(env, p, { id: chat.gid, email: chat.guest_email, lang: chat.guest_lang }, body).catch((e) => console.error("chat", e)));
        return json({ ok: true }, 201);
      }
    }
  }

  if (first === "offers") {
    if (a.role !== "admin") fail(403, "forbidden");
    if (!second && req.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT o.*, (SELECT COUNT(*) FROM bookings b WHERE b.offer_id = o.id AND b.status IN ${ACTIVE})
           + (SELECT COUNT(*) FROM orders c WHERE c.offer_id = o.id AND c.status <> 'cancelled') AS used
         FROM offers o ORDER BY o.created_at DESC LIMIT 100`
      ).all();
      const names = (await env.DB.prepare("SELECT id, name FROM guests").all()).results;
      return json({ offers: results.map((o) => ({ ...o, guestName: o.audience.startsWith("guest:") ? names.find((n) => n.id === Number(o.audience.slice(6)))?.name : undefined })), push: pushEnabled(env) });
    }
    if (!second && req.method === "POST") {
      const b = await readJson(req);
      const title = String(b.title || "").trim();
      const body = String(b.body || "").trim();
      const audience = String(b.audience || "");
      const pct = Number(b.pct || 0);
      if (!title || title.length > 80 || !body || body.length > 400) fail(400, "invalid_value");
      if (!isDate(b.validTo) || b.validTo < today()) fail(400, "invalid_dates");
      if (!["stay", "bistro", "info"].includes(b.kind)) fail(400, "invalid_value");
      if (!Number.isInteger(pct) || pct < 0 || pct > 50 || (b.kind === "info" ? pct !== 0 : pct < 1)) fail(400, "invalid_value");
      const person = audience.match(/^guest:(\d+)$/);
      if (!person && !["all", "member", "silver", "gold"].includes(audience)) fail(400, "invalid_value");
      if (person && !(await env.DB.prepare("SELECT 1 FROM guests WHERE id = ?").bind(Number(person[1])).first())) fail(400, "invalid_value");
      const r = await env.DB.prepare("INSERT INTO offers (title, body, audience, kind, pct, valid_to, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(title, body, audience, b.kind, pct, b.validTo, Date.now()).run();
      return json({ id: r.meta.last_row_id }, 201);
    }
    if (second && third === "stop" && req.method === "POST") {
      await env.DB.prepare("UPDATE offers SET active = 0 WHERE id = ?").bind(Number(second)).run();
      return json({ ok: true });
    }
    if (second && third === "notify" && req.method === "POST") {
      const o = await env.DB.prepare("SELECT * FROM offers WHERE id = ? AND active = 1").bind(Number(second)).first();
      if (!o) fail(404, "not_found");
      if (!pushEnabled(env)) fail(409, "push_off");
      const b = await readJson(req);
      const after = String(b.after || "");
      const tokens = (await offerTokens(env, o.audience)).filter((t) => t > after);
      const batch = tokens.slice(0, 40);
      // pe telefon nu stim numele fiecaruia aici, asa ca fara {nume} in notificare
      const clean = (s) => s.replace(/\{nume\},?\s*/g, "").trim();
      const r = await pushTo(env, batch, { title: clean(o.title), body: clean(o.body), url: "/cont/" });
      return json({ ...r, next: tokens.length > 40 ? batch[39] : null, total: tokens.length });
    }
  }

  if (first === "guests") {
    if (a.role !== "admin") fail(403, "forbidden");
    if (!second && req.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT g.id, g.name, g.email, g.phone, g.level_override, g.created_at,
           (SELECT COUNT(*) FROM bookings b WHERE b.guest_id = g.id AND b.status = 'confirmed' AND b.checkout <= ?1) AS stays,
           (SELECT COUNT(*) FROM orders o WHERE o.guest_id = g.id AND o.status = 'delivered' AND o.demo = 0) AS orders
         FROM guests g ORDER BY g.created_at DESC LIMIT 300`
      ).bind(today()).all();
      return json({ guests: results.map((g) => ({ ...g, level: levelFrom(g.stays, g.orders, g.level_override).key })) });
    }
    if (second && req.method === "POST") {
      const b = await readJson(req);
      const override = b.level === "auto" ? null : b.level;
      if (override !== null && !LEVELS.some((l) => l.key === override)) fail(400, "invalid_value");
      const r = await env.DB.prepare("UPDATE guests SET level_override = ? WHERE id = ?").bind(override, Number(second)).run();
      if (!r.meta.changes) fail(404, "not_found");
      return json({ ok: true });
    }
  }

  if (first === "push") {
    if (a.role !== "admin") fail(403, "forbidden");
    if (req.method === "GET") {
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM push_devices").first();
      return json({ devices: r.n, enabled: pushEnabled(env) });
    }
    if (req.method === "POST") {
      const b = await readJson(req);
      const title = String(b.title || "").trim();
      const body = String(b.body || "").trim();
      const link = String(b.url || "/").trim() || "/";
      if (!title || title.length > 80 || body.length > 240) fail(400, "invalid_value");
      if (!/^\/(?!\/)/.test(link) || link.length > 200) fail(400, "invalid_link");
      if (!pushEnabled(env)) fail(409, "push_off");
      // cate 40 odata (limita Workers); panoul cere urmatorul grup pana se termina
      const { results } = await env.DB.prepare("SELECT token FROM push_devices WHERE token > ? ORDER BY token LIMIT 40").bind(String(b.after || "")).all();
      const r = await pushTo(env, results.map((d) => d.token), { title, body, url: link });
      return json({ ...r, next: results.length === 40 ? results[39].token : null });
    }
  }

  if (first === "properties" && second) {
    const p = await ownedProperty(env, a, second);
    if (!third && req.method === "GET") {
      const [rates, blocks, bookings] = await Promise.all([
        env.DB.prepare("SELECT * FROM rates WHERE property_slug = ? AND date_to > ? ORDER BY date_from").bind(p.slug, today()).all(),
        env.DB.prepare("SELECT * FROM blocks WHERE property_slug = ? AND date_to > ? ORDER BY date_from").bind(p.slug, today()).all(),
        env.DB.prepare(`SELECT code, checkin, checkout, status, guest_name FROM bookings WHERE property_slug = ? AND status IN ${ACTIVE} AND checkout > ? ORDER BY checkin`).bind(p.slug, today()).all(),
      ]);
      return json({ property: adminProperty(p, env), rates: rates.results, blocks: blocks.results, bookings: bookings.results });
    }
    if (!third && req.method === "PATCH") {
      await updateProperty(env, p, await readJson(req));
      return json({ property: adminProperty(await getProperty(env, p.slug), env) });
    }
    if (third === "rates" && req.method === "POST") {
      const b = await readJson(req);
      if (!isDate(b.dateFrom) || !isDate(b.dateTo) || b.dateFrom >= b.dateTo) fail(400, "invalid_dates");
      const price = Number(b.price);
      if (!Number.isInteger(price) || price < 1) fail(400, "invalid_value");
      const minNights = b.minNights ? Number(b.minNights) : null;
      if (minNights !== null && (!Number.isInteger(minNights) || minNights < 1 || minNights > 30)) fail(400, "invalid_value");
      await env.DB.prepare("INSERT INTO rates (property_slug, date_from, date_to, price, min_nights, label) VALUES (?,?,?,?,?,?)")
        .bind(p.slug, b.dateFrom, b.dateTo, price, minNights, String(b.label || "").slice(0, 60) || null).run();
      return json({ ok: true }, 201);
    }
    if (third === "blocks" && req.method === "POST") {
      const b = await readJson(req);
      if (!isDate(b.dateFrom) || !isDate(b.dateTo) || b.dateFrom >= b.dateTo) fail(400, "invalid_dates");
      const clash = await env.DB.prepare(
        `SELECT 1 FROM bookings WHERE property_slug = ? AND status IN ${ACTIVE} AND checkin < ? AND checkout > ? LIMIT 1`
      ).bind(p.slug, b.dateTo, b.dateFrom).first();
      if (clash) fail(409, "calendar_conflict");
      await env.DB.prepare("INSERT INTO blocks (property_slug, date_from, date_to, source, note) VALUES (?,?,?, 'manual', ?)")
        .bind(p.slug, b.dateFrom, b.dateTo, String(b.note || "").slice(0, 100) || null).run();
      return json({ ok: true }, 201);
    }
    if (third === "sync" && req.method === "POST") {
      const r = await syncIcal(env, p);
      return json(r);
    }
  }

  if ((first === "rates" || first === "blocks") && second && req.method === "DELETE") {
    const row = await env.DB.prepare(`SELECT * FROM ${first} WHERE id = ?`).bind(Number(second)).first();
    if (!row) fail(404, "not_found");
    await ownedProperty(env, a, row.property_slug);
    if (first === "blocks" && row.source !== "manual") fail(409, "ical_block");
    await env.DB.prepare(`DELETE FROM ${first} WHERE id = ?`).bind(row.id).run();
    return json({ ok: true });
  }
  fail(404, "not_found");
}

const blocksFree = async (env, b) => !(await env.DB.prepare(
  "SELECT 1 FROM blocks WHERE property_slug = ? AND date_from < ? AND date_to > ? LIMIT 1"
).bind(b.property_slug, b.checkout, b.checkin).first());

// ---------- calendar Booking.com / Airbnb ----------
async function syncIcal(env, p) {
  if (!p.ical_import_url) return { ok: false, error: "no_url" };
  try {
    const r = await fetch(p.ical_import_url, { headers: { "user-agent": "GreenFutureSinaia/1.0" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("not an iCal file");
    const horizon = addDays(today(), -1);
    const events = parseIcal(text).filter((e) => e.to > horizon);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM blocks WHERE property_slug = ? AND source = 'ical'").bind(p.slug),
      ...events.map((e) => env.DB.prepare(
        "INSERT INTO blocks (property_slug, date_from, date_to, source, note) VALUES (?,?,?, 'ical', ?)"
      ).bind(p.slug, e.from, e.to, e.summary.slice(0, 100))),
      env.DB.prepare("UPDATE properties SET ical_synced_at = ?, ical_error = NULL WHERE slug = ?").bind(Date.now(), p.slug),
    ]);
    await notifyConflicts(env, p, events);
    return { ok: true, events: events.length };
  } catch (e) {
    await env.DB.prepare("UPDATE properties SET ical_error = ? WHERE slug = ?").bind(String(e.message).slice(0, 200), p.slug).run();
    return { ok: false, error: e.message };
  }
}

// Rezervare de pe alta platforma peste una directa. O perioada inchisa cuprinsa in intregime intr-o rezervare
// confirmata e ecoul calendarului nostru (Booking o inchide dupa ce ne citeste), deci nu e conflict.
async function notifyConflicts(env, p, events) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM bookings WHERE property_slug = ? AND status IN ${ACTIVE} AND conflict_notified = 0 AND checkout > ?`
  ).bind(p.slug, today()).all();
  for (const b of results) {
    const hit = events.find((e) => e.from < b.checkout && e.to > b.checkin
      && !(b.status === "confirmed" && e.from >= b.checkin && e.to <= b.checkout));
    if (!hit) continue;
    await env.DB.prepare("UPDATE bookings SET conflict_notified = 1 WHERE id = ?").bind(b.id).run();
    await mailConflict(env, p, b, hit).catch(() => {});
  }
}

async function expirePending(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE status = 'pending' AND created_at < ?"
  ).bind(Date.now() - PENDING_HOURS * 3600000).all();
  for (const b of results) {
    const updated = await setStatus(env, b, "expired");
    const p = await getProperty(env, b.property_slug);
    await mailGuest(env, p, updated, "expired").catch(() => {});
    await pushTo(env, [b.push_token], guestBookingMessage(p, updated, "expired")).catch(() => {});
  }
}

// ---------- comenzi restaurant ----------
const MENU = new Map(restaurant.categories.flatMap((c) => c.items).map((i) => [i.id, i]));
function orderCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "CMD-" + [...crypto.getRandomValues(new Uint8Array(6))].map((b) => abc[b % abc.length]).join("");
}

// Numele si pretul vin din meniul de pe server, nu din browser.
async function createOrder(req, env, ctx) {
  const b = await readJson(req);
  if (b.website) return json({ code: "CMD-000000", demo: true }, 201); // capcana pentru boti
  if (b.accept !== true) fail(400, "accept_required");
  const apartment = String(b.apartment || "").trim();
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  if (!apartment || apartment.length > 20) fail(400, "invalid_apartment");
  if (name.length < 2 || name.length > 100) fail(400, "invalid_name");
  if (phone.replace(/\D/g, "").length < 6 || phone.length > 30) fail(400, "invalid_phone");
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 40) fail(400, "invalid_items");
  const lang = b.lang === "en" ? "en" : "ro";
  const items = b.items.map((line) => {
    const item = MENU.get(String(line?.id));
    const qty = Number(line?.qty);
    if (!item || !Number.isInteger(qty) || qty < 1 || qty > 20) fail(400, "invalid_items");
    return { id: item.id, name: item.ro.name, price: item.price, qty };
  });
  const account = await optionalGuest(req, env);
  const deal = await guestDeal(env, account, "bistro");
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = deal ? Math.round(subtotal * deal.pct / 100) : 0;
  const total = subtotal - discount;
  await rateLimit(env, `order:${clientIp(req)}`, 5, 3600000);
  const now = Date.now();
  const demo = restaurant.demo ? 1 : 0;
  const code = orderCode();
  const note = String(b.note || "").trim().slice(0, 500);
  await env.DB.prepare(
    `INSERT INTO orders (code, apartment, guest_name, guest_phone, note, items, total, status, demo, lang, created_at, updated_at, push_token, guest_id, discount, offer_id)
     VALUES (?,?,?,?,?,?,?, 'new', ?,?,?,?,?,?,?,?)`
  ).bind(code, apartment, name, phone, note, JSON.stringify(items), total, demo, lang, now, now, validPushToken(b.pushToken), account ? account.id : null, discount, discount && deal.offerId ? deal.offerId : null).run();
  ctx.waitUntil(Promise.allSettled([
    mailOrder(env, { code, apartment, guest_name: name, guest_phone: phone, note, items, total, discount, demo }),
    pushToStaff(env, null, { title: "Comandă nouă la bistro", body: `Ap. ${apartment}: ${total} lei${demo ? " (test)" : ""}`, url: "/admin/" }),
  ]));
  return json({ code, total, discount, demo: !!demo }, 201);
}

// ---------- mesaje oaspete - proprietar ----------
const cleanMessage = (v) => {
  const body = String(v || "").trim();
  if (!body || body.length > 1000) fail(400, "invalid_message");
  return body;
};
const threadOf = async (env, chatId) => (await env.DB.prepare(
  "SELECT sender, body, created_at FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 200"
).bind(chatId).all()).results.reverse();
// proprietarul apartamentului; administratorul primeste doar daca apartamentul nu are proprietar setat
async function notifyOwner(env, p, guest, body) {
  const owners = (await env.DB.prepare("SELECT admin_id FROM admin_properties WHERE property_slug = ?").bind(p.slug).all()).results.map((r) => r.admin_id);
  const q = owners.length
    ? env.DB.prepare(`SELECT token FROM push_devices WHERE admin_id IN (${owners.map(() => "?").join(",")})`).bind(...owners)
    : env.DB.prepare("SELECT d.token FROM push_devices d JOIN admins a ON a.id = d.admin_id WHERE a.role = 'admin'");
  const tokens = (await q.all()).results.map((r) => r.token);
  const r = await pushTo(env, tokens, { title: `${guest.name}, ${p.name}`, body: body.slice(0, 180), url: "/admin/#mesaje" });
  if (!r.sent) await mailChat(env, p.owner_email || env.MAIL_FROM, `Mesaj nou de la ${guest.name}: ${p.name}`, body, `${env.SITE_URL}/admin/#mesaje`, "ro");
}
async function notifyGuest(env, p, guest, body) {
  const tokens = (await env.DB.prepare("SELECT token FROM push_devices WHERE guest_id = ?").bind(guest.id).all()).results.map((r) => r.token);
  const en = guest.lang === "en";
  const path = `${en ? "/en/messages/" : "/mesaje/"}?p=${encodeURIComponent(p.slug)}`;
  const r = await pushTo(env, tokens, { title: p.name, body: body.slice(0, 180), url: path });
  if (!r.sent) await mailChat(env, guest.email, en ? `New message about ${p.name}` : `Mesaj nou despre ${p.name}`, body, env.SITE_URL + path, guest.lang);
}

// ---------- conturi de oaspeti si Green Future Club ----------
function levelFrom(stays, orders, override) {
  const score = stays + Math.floor(orders / ORDERS_PER_STAY);
  const auto = LEVELS.find((l) => score >= l.min);
  const current = LEVELS.find((l) => l.key === override) || auto;
  const next = [...LEVELS].reverse().find((l) => l.pct > current.pct);
  return { key: current.key, pct: current.pct, stays, orders, nextKey: next?.key, nextPct: next?.pct, staysToNext: next ? Math.max(next.min - score, 0) : 0 };
}
async function guestLevel(env, g) {
  const r = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM bookings WHERE guest_id = ?1 AND status = 'confirmed' AND checkout <= ?2) AS stays,
       (SELECT COUNT(*) FROM orders WHERE guest_id = ?1 AND status = 'delivered' AND demo = 0) AS orders`
  ).bind(g.id, today()).first();
  return levelFrom(r.stays, r.orders, g.level_override);
}
const guestByToken = async (env, token) => env.DB.prepare(
  `SELECT g.* FROM guest_sessions s JOIN guests g ON g.id = s.guest_id WHERE s.token_hash = ? AND s.expires_at > ?`
).bind(await sha256(token), Date.now()).first();
async function optionalGuest(req, env) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer ([a-f0-9]{64})$/);
  return m ? guestByToken(env, m[1]) : null;
}
// ofertele valabile azi pentru oaspete; una deja folosita nu mai apare (o rezervare anulata o elibereaza)
async function guestOffers(env, g, level) {
  const { results } = await env.DB.prepare(
    `SELECT o.* FROM offers o
     WHERE o.active = 1 AND o.valid_to >= ?1 AND (o.audience = 'all' OR o.audience = ?2 OR o.audience = ?3)
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.offer_id = o.id AND b.guest_id = ?4 AND b.status IN ${ACTIVE})
       AND NOT EXISTS (SELECT 1 FROM orders c WHERE c.offer_id = o.id AND c.guest_id = ?4 AND c.status <> 'cancelled')
     ORDER BY o.created_at DESC LIMIT 20`
  ).bind(today(), level.key, `guest:${g.id}`, g.id).all();
  return results;
}
// cea mai mare reducere dintre nivel si oferte; nu se aduna
async function guestDeal(env, g, kind) {
  if (!g) return null;
  const level = await guestLevel(env, g);
  const best = (await guestOffers(env, g, level)).filter((o) => o.kind === kind && o.pct > level.pct).sort((a, b) => b.pct - a.pct)[0];
  return best ? { pct: best.pct, key: level.key, offerId: best.id, title: best.title } : { pct: level.pct, key: level.key };
}
const personal = (text, g) => text.replaceAll("{nume}", g.name.split(" ")[0]);
// telefoanele cu oaspeti autentificati carora li se adreseaza oferta
async function offerTokens(env, audience) {
  if (audience.startsWith("guest:")) {
    return (await env.DB.prepare("SELECT token FROM push_devices WHERE guest_id = ? ORDER BY token").bind(Number(audience.slice(6))).all()).results.map((r) => r.token);
  }
  const { results } = await env.DB.prepare(
    `SELECT d.token, g.level_override,
       (SELECT COUNT(*) FROM bookings b WHERE b.guest_id = g.id AND b.status = 'confirmed' AND b.checkout <= ?1) AS stays,
       (SELECT COUNT(*) FROM orders o WHERE o.guest_id = g.id AND o.status = 'delivered' AND o.demo = 0) AS orders
     FROM push_devices d JOIN guests g ON g.id = d.guest_id ORDER BY d.token`
  ).bind(today()).all();
  return results.filter((r) => audience === "all" || levelFrom(r.stays, r.orders, r.level_override).key === audience).map((r) => r.token);
}
async function requireGuest(req, env) {
  const g = await optionalGuest(req, env);
  if (!g) fail(401, "unauthorized");
  return g;
}
async function guestSession(env, id) {
  const token = randomHex();
  await env.DB.prepare("INSERT INTO guest_sessions (token_hash, guest_id, expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), id, Date.now() + GUEST_SESSION_DAYS * 86400000).run();
  return token;
}
const cleanEmail = (v) => {
  const email = String(v || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) fail(400, "invalid_email");
  return email;
};
const cleanPassword = (v) => {
  const pw = String(v || "");
  if (pw.length < 8 || pw.length > 200) fail(400, "weak_password");
  return pw;
};

async function guestRoutes(req, env, ctx, parts) {
  const [first] = parts;
  if (first === "register" && req.method === "POST") {
    const b = await readJson(req);
    if (b.website) return json({ ok: true }, 201); // capcana pentru boti
    if (b.accept !== true) fail(400, "accept_required");
    const email = cleanEmail(b.email);
    const name = String(b.name || "").trim();
    const phone = String(b.phone || "").trim();
    if (name.length < 2 || name.length > 100) fail(400, "invalid_name");
    if (phone.replace(/\D/g, "").length < 6 || phone.length > 30) fail(400, "invalid_phone");
    const pw = cleanPassword(b.password);
    await rateLimit(env, `register:${clientIp(req)}`, 10, 3600000);
    if (await env.DB.prepare("SELECT 1 FROM admins WHERE email = ?").bind(email).first()) fail(409, "email_taken");
    const res = await env.DB.prepare(
      "INSERT OR IGNORE INTO guests (email, pass_hash, name, phone, lang, created_at) VALUES (?,?,?,?,?,?)"
    ).bind(email, await makePassword(pw), name, phone, b.lang === "en" ? "en" : "ro", Date.now()).run();
    if (!res.meta.changes) fail(409, "email_taken");
    return json({ token: await guestSession(env, res.meta.last_row_id) }, 201);
  }
  if (first === "login" && req.method === "POST") {
    const b = await readJson(req);
    const email = String(b.email || "").trim().toLowerCase();
    const pw = String(b.password || "");
    const lock = await env.DB.prepare("SELECT until FROM login_fails WHERE email = ?").bind(email).first();
    if (lock && lock.until > Date.now()) fail(429, "too_many_requests");
    const g = await env.DB.prepare("SELECT id, pass_hash FROM guests WHERE email = ?").bind(email).first();
    const a = g ? null : await env.DB.prepare("SELECT id, email, role, pass_hash FROM admins WHERE email = ?").bind(email).first();
    const who = g || a;
    if (!who || !(await verifyPassword(pw, who.pass_hash))) {
      await env.DB.prepare(
        `INSERT INTO login_fails (email, count, until) VALUES (?1, 1, 0)
         ON CONFLICT(email) DO UPDATE SET count = count + 1, until = CASE WHEN count + 1 >= 8 THEN ?2 ELSE 0 END`
      ).bind(email, Date.now() + 15 * 60000).run();
      fail(401, "bad_login");
    }
    await env.DB.prepare("DELETE FROM login_fails WHERE email = ?").bind(email).run();
    if (g) return json({ token: await guestSession(env, g.id) });
    // acelasi ecran de cont pentru toti: proprietarii si administratorii ajung in panou
    const token = randomHex();
    await env.DB.prepare("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?,?,?)")
      .bind(await sha256(token), a.id, Date.now() + SESSION_DAYS * 86400000).run();
    return json({ token, admin: true });
  }
  if (first === "forgot" && req.method === "POST") {
    const b = await readJson(req);
    const email = cleanEmail(b.email);
    await rateLimit(env, `forgot:${clientIp(req)}`, 5, 3600000);
    await rateLimit(env, `forgot:${email}`, 3, 3600000);
    const g = await env.DB.prepare("SELECT * FROM guests WHERE email = ?").bind(email).first();
    if (g) {
      const token = randomHex();
      await env.DB.batch([
        env.DB.prepare("DELETE FROM guest_resets WHERE guest_id = ? OR expires_at < ?").bind(g.id, Date.now()),
        env.DB.prepare("INSERT INTO guest_resets (token_hash, guest_id, expires_at) VALUES (?,?,?)").bind(await sha256(token), g.id, Date.now() + 3600000),
      ]);
      ctx.waitUntil(mailGuestReset(env, g, token));
    }
    return json({ ok: true }); // acelasi raspuns, ca sa nu se afle cine are cont
  }
  if (first === "reset" && req.method === "POST") {
    const b = await readJson(req);
    await rateLimit(env, `reset:${clientIp(req)}`, 20, 3600000);
    const pw = cleanPassword(b.password);
    const row = await env.DB.prepare("SELECT guest_id FROM guest_resets WHERE token_hash = ? AND expires_at > ?")
      .bind(await sha256(String(b.token || "")), Date.now()).first();
    if (!row) fail(400, "reset_expired");
    await env.DB.batch([
      env.DB.prepare("UPDATE guests SET pass_hash = ? WHERE id = ?").bind(await makePassword(pw), row.guest_id),
      env.DB.prepare("DELETE FROM guest_resets WHERE guest_id = ?").bind(row.guest_id),
      env.DB.prepare("DELETE FROM guest_sessions WHERE guest_id = ?").bind(row.guest_id),
    ]);
    return json({ ok: true });
  }

  const g = await requireGuest(req, env);
  if (first === "chats" && req.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT c.property_slug AS slug, c.unread_guest AS unread, c.last_at, p.name,
         (SELECT body FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last
       FROM chats c JOIN properties p ON p.slug = c.property_slug WHERE c.guest_id = ? ORDER BY c.last_at DESC LIMIT 50`
    ).bind(g.id).all();
    return json({ chats: results });
  }
  if (first === "chat" && parts[1]) {
    const p = await getProperty(env, parts[1]);
    if (!p) fail(404, "not_found");
    if (req.method === "GET") {
      const chat = await env.DB.prepare("SELECT id, unread_guest FROM chats WHERE property_slug = ? AND guest_id = ?").bind(p.slug, g.id).first();
      if (chat?.unread_guest) await env.DB.prepare("UPDATE chats SET unread_guest = 0 WHERE id = ?").bind(chat.id).run();
      return json({ propertyName: p.name, messages: chat ? await threadOf(env, chat.id) : [] });
    }
    if (req.method === "POST") {
      const b = await readJson(req);
      const body = cleanMessage(b.body);
      await rateLimit(env, `chat:${g.id}`, 40, 3600000);
      const now = Date.now();
      const chat = await env.DB.prepare(
        `INSERT INTO chats (property_slug, guest_id, unread_owner, last_at) VALUES (?1, ?2, 1, ?3)
         ON CONFLICT(property_slug, guest_id) DO UPDATE SET unread_owner = unread_owner + 1, last_at = ?3 RETURNING id`
      ).bind(p.slug, g.id, now).first();
      await env.DB.prepare("INSERT INTO messages (chat_id, sender, body, created_at) VALUES (?, 'guest', ?, ?)").bind(chat.id, body, now).run();
      ctx.waitUntil(notifyOwner(env, p, g, body).catch((e) => console.error("chat", e)));
      return json({ ok: true }, 201);
    }
  }
  if (first === "logout" && req.method === "POST") {
    const m = req.headers.get("authorization").match(/^Bearer (.+)$/);
    await env.DB.prepare("DELETE FROM guest_sessions WHERE token_hash = ?").bind(await sha256(m[1])).run();
    return json({ ok: true });
  }
  if (first === "me" && req.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT b.code, b.checkin, b.checkout, b.status, b.total, b.discount, p.name AS property_name
       FROM bookings b JOIN properties p ON p.slug = b.property_slug WHERE b.guest_id = ? ORDER BY b.checkin DESC LIMIT 50`
    ).bind(g.id).all();
    const level = await guestLevel(env, g);
    const offers = await guestOffers(env, g, level);
    const bistro = await guestDeal(env, g, "bistro");
    return json({
      name: g.name, email: g.email, phone: g.phone, level, bookings: results, bistro: { pct: bistro.pct, title: bistro.title, key: bistro.key },
      offers: offers.map((o) => ({ id: o.id, title: personal(o.title, g), body: personal(o.body, g), kind: o.kind, pct: o.pct, validTo: o.valid_to })),
    });
  }
  if (first === "me" && req.method === "DELETE") {
    const b = await readJson(req);
    await rateLimit(env, `delete:${g.id}`, 8, 3600000);
    if (!(await verifyPassword(String(b.password || ""), g.pass_hash))) fail(401, "bad_login");
    // rezervarile raman pentru evidenta proprietarului, fara legatura cu contul; mesajele se sterg
    await env.DB.batch([
      env.DB.prepare("DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE guest_id = ?)").bind(g.id),
      env.DB.prepare("DELETE FROM chats WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("UPDATE bookings SET guest_id = NULL WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("UPDATE orders SET guest_id = NULL WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("DELETE FROM guest_sessions WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("DELETE FROM guest_resets WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("UPDATE push_devices SET guest_id = NULL WHERE guest_id = ?").bind(g.id),
      env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(g.id),
    ]);
    return json({ ok: true });
  }
  fail(404, "not_found");
}

// ---------- intretinere fara cron ----------
// Contul Cloudflare a atins limita gratuita de 5 cron-uri, asa ca lucrarile periodice pornesc la cererile primite.
// Fiecare lucrare e revendicata atomic, ca cererile simultane sa nu o porneasca de doua ori.
async function claim(env, key, everyMs) {
  const now = Date.now();
  const r = await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start < ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start < ?3 THEN ?2 ELSE window_start END
     RETURNING count`).bind(key, now, now - everyMs).first();
  return r.count === 1;
}

// Aduce calendarul extern daca e mai vechi decat maxAgeMs. Asteapta putin, ca vizitatorul sa vada deja datele noi;
// daca Booking raspunde greu, cererea continua si sincronizarea se termina in fundal.
async function freshen(env, ctx, p, maxAgeMs) {
  if (!p.ical_import_url || !(await claim(env, `ical:${p.slug}`, maxAgeMs))) return;
  const job = syncIcal(env, p);
  ctx.waitUntil(job);
  await Promise.race([job, new Promise((resolve) => setTimeout(resolve, ICAL_WAIT_MS))]);
}

async function maintain(env, ctx) {
  if (await claim(env, "expire-pending", 10 * 60000)) ctx.waitUntil(expirePending(env));
  if (env.BREVO_API_KEY && await claim(env, "brevo-keepalive", 30 * 86400000)) ctx.waitUntil(brevoKeepAlive(env));
}

// ---------- rute ----------
async function api(req, env, ctx, url) {
  const parts = url.pathname.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  const [first, second, third] = parts;

  await maintain(env, ctx);

  if (first === "admin") return adminRoutes(req, env, ctx, parts.slice(1));
  if (first === "guest") return guestRoutes(req, env, ctx, parts.slice(1));

  if (first === "properties" && req.method === "GET") {
    if (!second) {
      const { results } = await env.DB.prepare("SELECT * FROM properties WHERE active = 1 AND base_price > 0 ORDER BY name").all();
      return json({ properties: results.map(publicProperty) });
    }
    if (third === "calendar") {
      const p = await bookableProperty(env, second);
      await freshen(env, ctx, p, ICAL_MAX_AGE_MS);
      return json(await calendar(env, p));
    }
  }

  if (first === "quote" && req.method === "POST") {
    await rateLimit(env, `quote:${clientIp(req)}`, 300, 3600000);
    const b = await readJson(req);
    const p = await bookableProperty(env, String(b.slug || ""));
    const account = await optionalGuest(req, env);
    return json(await quote(env, p, b.checkin, b.checkout, Math.trunc(Number(b.guests)) || 0, await guestDeal(env, account, "stay")));
  }

  if (first === "search" && req.method === "GET") {
    await rateLimit(env, `search:${clientIp(req)}`, 300, 3600000);
    const checkin = url.searchParams.get("checkin");
    const checkout = url.searchParams.get("checkout");
    const guests = Math.trunc(Number(url.searchParams.get("guests"))) || 1;
    if (!isDate(checkin) || !isDate(checkout) || checkin >= checkout) fail(400, "invalid_dates");
    const { results } = await env.DB.prepare("SELECT * FROM properties WHERE active = 1 AND base_price > 0").all();
    await Promise.all(results.map((p) => freshen(env, ctx, p, ICAL_MAX_AGE_MS)));
    const out = [];
    for (const p of results) {
      try {
        const q = await quote(env, p, checkin, checkout, guests);
        out.push({ slug: p.slug, available: q.available, nights: q.nights, total: q.total, currency: "lei" });
      } catch (e) {
        if (!(e instanceof Fail)) throw e;
        out.push({ slug: p.slug, available: false, reason: e.code, ...e.extra });
      }
    }
    return json({ results: out });
  }

  if (first === "orders" && !second && req.method === "POST") return createOrder(req, env, ctx);

  if (first === "push" && second === "register" && req.method === "POST") {
    await rateLimit(env, `push:${clientIp(req)}`, 120, 3600000);
    const b = await readJson(req);
    const token = validPushToken(b.token);
    if (!token || !["ios", "android"].includes(b.platform)) fail(400, "invalid_token");
    // telefonul primeste alertele de proprietar doar cat timp sesiunea din panou e valida
    const admin = await adminAuth(req, env).catch((e) => { if (e instanceof Fail) return null; throw e; });
    const account = /^[a-f0-9]{64}$/.test(b.guestToken || "") ? await guestByToken(env, b.guestToken) : null;
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO push_devices (token, platform, lang, admin_id, guest_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?6, ?5, ?5)
       ON CONFLICT(token) DO UPDATE SET lang = ?3, admin_id = ?4, guest_id = ?6, updated_at = ?5`
    ).bind(token, b.platform, b.lang === "en" ? "en" : "ro", admin ? admin.id : null, now, account ? account.id : null).run();
    return json({ ok: true });
  }

  if (first === "bookings") {
    if (!second && req.method === "POST") return createBooking(req, env, ctx);
    if (second) {
      const token = url.searchParams.get("token");
      if (!third && req.method === "GET") {
        await rateLimit(env, `lookup:${clientIp(req)}`, 60, 3600000);
        const b = await guestBooking(env, second, token);
        return json(publicBooking(b, await getProperty(env, b.property_slug)));
      }
      if (third === "cancel" && req.method === "POST") {
        await rateLimit(env, `lookup:${clientIp(req)}`, 60, 3600000);
        const b = await guestBooking(env, second, token);
        const p = await getProperty(env, b.property_slug);
        if (!guestCanCancel(b, p)) fail(409, "cannot_cancel");
        const updated = await setStatus(env, b, "cancelled");
        ctx.waitUntil(Promise.allSettled([
          mailGuest(env, p, updated, "cancelled"), mailOwnerNew(env, p, updated, true),
          pushToStaff(env, p.slug, staffBookingMessage(p, updated, "Rezervare anulată de oaspete")),
        ]));
        return json(publicBooking(updated, p));
      }
    }
  }
  fail(404, "not_found");
}

async function icalExport(env, token) {
  const p = await env.DB.prepare("SELECT * FROM properties WHERE ical_token = ?").bind(token).first();
  if (!p) return new Response("Not found", { status: 404 });
  const from = addDays(today(), -30);
  const [booked, blocked] = await Promise.all([
    env.DB.prepare("SELECT code AS uid, checkin AS a, checkout AS b FROM bookings WHERE property_slug = ? AND status = 'confirmed' AND checkout > ?").bind(p.slug, from).all(),
    // perioadele venite din alte calendare nu se trimit inapoi, ca sa nu se blocheze reciproc
    env.DB.prepare("SELECT 'block-' || id AS uid, date_from AS a, date_to AS b FROM blocks WHERE property_slug = ? AND source = 'manual' AND date_to > ?").bind(p.slug, from).all(),
  ]);
  return new Response(buildIcal(p.name, [...booked.results, ...blocked.results]), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" },
  });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const ics = url.pathname.match(/^\/ical\/([a-f0-9]{40})\.ics$/);
    if (ics) return icalExport(env, ics[1]);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    try {
      return await api(req, env, ctx, url);
    } catch (e) {
      if (e instanceof Fail) return json({ error: e.code, ...e.extra }, e.status);
      console.error(e);
      return json({ error: "server_error" }, 500);
    }
  },
};
