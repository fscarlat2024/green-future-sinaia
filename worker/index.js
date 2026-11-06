// API rezervari directe Green Future Sinaia. Restul site-ului e static (_site).
// Auth panou: parola PBKDF2 + token Bearer (merge si in site, si in viitoarea aplicatie mobila).
// Disponibilitatea e verificata in aceeasi instructiune SQL cu rezervarea, ca doi oaspeti
// sa nu poata prinde aceeasi perioada.
import { mailOwnerNew, mailGuest, mailConflict } from "./mail.js";
import { parseIcal, buildIcal } from "./ical.js";

const enc = new TextEncoder();
const SESSION_DAYS = 30;
const MAX_NIGHTS = 60;
const MAX_ADVANCE_DAYS = 400;
const PENDING_HOURS = 24;
const ACTIVE = "('pending','confirmed')";

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
  checkinTime: p.checkin_time, checkoutTime: p.checkout_time, currency: "lei",
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
async function quote(env, p, checkin, checkout, guests) {
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
  return {
    checkin, checkout, nights, guests, nightly, subtotal,
    cleaningFee: p.cleaning_fee, total: subtotal + p.cleaning_fee, currency: "lei",
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
  subtotal: b.subtotal, cleaningFee: b.cleaning_fee, total: b.total, currency: "lei", status: b.status, lang: b.lang,
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
  const q = await quote(env, p, b.checkin, b.checkout, adults + children);
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
       guest_email, guest_phone, note, lang, subtotal, cleaning_fee, total, status, created_at, updated_at)
     SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17
     WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE property_slug = ?3 AND status IN ${ACTIVE} AND checkin < ?5 AND checkout > ?4)
       AND NOT EXISTS (SELECT 1 FROM blocks WHERE property_slug = ?3 AND date_from < ?5 AND date_to > ?4)`
  ).bind(code, await sha256(token), p.slug, q.checkin, q.checkout, adults, children, guest.name, guest.email,
    guest.phone, guest.note, lang, q.subtotal, q.cleaningFee, q.total, status, now).run();
  if (!res.meta.changes) fail(409, "unavailable");

  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE code = ?").bind(code).first();
  ctx.waitUntil(Promise.allSettled([
    mailOwnerNew(env, p, booking),
    mailGuest(env, p, booking, status === "confirmed" ? "confirmed" : "received", token),
  ]));
  return json({ ...publicBooking(booking, p), token, emailSent: !!env.BREVO_API_KEY }, 201);
}

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
       free_cancel_days=?, checkin_time=?, checkout_time=?, owner_email=?, owner_phone=?, ical_import_url=? WHERE slug=?`
  ).bind(b.active ? 1 : 0, int(b.capacity, 1, 30), basePrice, int(b.cleaningFee || 0, 0, 100000), int(b.minNights, 1, 30),
    b.instantBook ? 1 : 0, int(b.freeCancelDays, 0, 60), time(b.checkinTime), time(b.checkoutTime),
    String(b.ownerEmail || "").trim() || null, String(b.ownerPhone || "").trim() || null, icalUrl || null, p.slug).run();
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
      if (!(await blocksFree(env, b))) fail(409, "calendar_conflict");
      updated = await setStatus(env, b, "confirmed");
    } else if (third === "decline") {
      if (b.status !== "pending") fail(409, "wrong_status");
      updated = await setStatus(env, b, "declined");
    } else if (third === "cancel") {
      if (b.status !== "pending" && b.status !== "confirmed") fail(409, "wrong_status");
      updated = await setStatus(env, b, "cancelled");
    } else fail(404, "not_found");
    ctx.waitUntil(mailGuest(env, p, updated, updated.status));
    return json({ ok: true, status: updated.status });
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
    await mailGuest(env, await getProperty(env, b.property_slug), updated, "expired").catch(() => {});
  }
}

// ---------- rute ----------
async function api(req, env, ctx, url) {
  const parts = url.pathname.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  const [first, second, third] = parts;

  if (first === "admin") return adminRoutes(req, env, ctx, parts.slice(1));

  if (first === "properties" && req.method === "GET") {
    if (!second) {
      const { results } = await env.DB.prepare("SELECT * FROM properties WHERE active = 1 AND base_price > 0 ORDER BY name").all();
      return json({ properties: results.map(publicProperty) });
    }
    if (third === "calendar") return json(await calendar(env, await bookableProperty(env, second)));
  }

  if (first === "quote" && req.method === "POST") {
    await rateLimit(env, `quote:${clientIp(req)}`, 300, 3600000);
    const b = await readJson(req);
    const p = await bookableProperty(env, String(b.slug || ""));
    return json(await quote(env, p, b.checkin, b.checkout, Math.trunc(Number(b.guests)) || 0));
  }

  if (first === "search" && req.method === "GET") {
    await rateLimit(env, `search:${clientIp(req)}`, 300, 3600000);
    const checkin = url.searchParams.get("checkin");
    const checkout = url.searchParams.get("checkout");
    const guests = Math.trunc(Number(url.searchParams.get("guests"))) || 1;
    if (!isDate(checkin) || !isDate(checkout) || checkin >= checkout) fail(400, "invalid_dates");
    const { results } = await env.DB.prepare("SELECT * FROM properties WHERE active = 1 AND base_price > 0").all();
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
        ctx.waitUntil(Promise.allSettled([mailGuest(env, p, updated, "cancelled"), mailOwnerNew(env, p, updated, true)]));
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

  async scheduled(event, env, ctx) {
    const { results } = await env.DB.prepare("SELECT * FROM properties WHERE active = 1 AND ical_import_url IS NOT NULL").all();
    ctx.waitUntil(Promise.allSettled([...results.map((p) => syncIcal(env, p)), expirePending(env)]));
  },
};
