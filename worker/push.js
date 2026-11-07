// Notificari in aplicatii: iOS prin APNs, Android prin Firebase. Fara secrete nu se trimite nimic, restul site-ului merge normal.
const enc = new TextEncoder();
const MAX_PER_CALL = 40; // Workers permite 50 de cereri externe per apel (una in plus pentru tokenul Firebase)
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const apnsReady = (env) => !!(env.APNS_KEY && env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_TOPIC);
export const pushEnabled = (env) => apnsReady(env) || !!env.FCM_SA;
const isApnsToken = (t) => /^[a-f0-9]{64,200}$/.test(t);
// tokenurile Firebase sunt mai lungi si contin litere mari si ":"; dupa format stim pe ce cale pleaca
export const validPushToken = (t) => (typeof t === "string" && (isApnsToken(t) || /^[A-Za-z0-9:_-]{100,400}$/.test(t)) ? t : null);

let jwtCache = { token: "", at: 0 };
async function apnsJwt(env) {
  const now = Math.floor(Date.now() / 1000);
  if (jwtCache.token && now - jwtCache.at < 40 * 60) return jwtCache.token; // Apple refuza tokenuri mai noi de 20 min recreate des
  const pem = env.APNS_KEY.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ alg: "ES256", kid: env.APNS_KEY_ID })));
  const claims = b64u(enc.encode(JSON.stringify({ iss: env.APNS_TEAM_ID, iat: now })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  jwtCache = { token: `${head}.${claims}.${b64u(sig)}`, at: now };
  return jwtCache.token;
}

let fcmCache = { token: "", exp: 0, project: "" };
let fcmPending = null;
// o singura cerere de token, oricate telefoane primesc notificarea in acelasi timp
function fcmAccess(env) {
  if (fcmCache.token && fcmCache.exp - 120 > Math.floor(Date.now() / 1000)) return Promise.resolve(fcmCache);
  if (!fcmPending) fcmPending = fcmLoad(env).finally(() => { fcmPending = null; });
  return fcmPending;
}
async function fcmLoad(env) {
  const now = Math.floor(Date.now() / 1000);
  const sa = JSON.parse(env.FCM_SA.replace(/^\uFEFF/, ""));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64u(enc.encode(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${claims}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${head}.${claims}.${b64u(sig)}`,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`fcm oauth ${r.status}`);
  fcmCache = { token: j.access_token, exp: now + (j.expires_in || 3600), project: sa.project_id };
  return fcmCache;
}

async function sendFcm(env, token, msg) {
  const a = await fcmAccess(env);
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: {
      token,
      notification: { title: msg.title, body: msg.body || "" },
      data: { url: msg.url || "/" },
      android: { priority: "HIGH", notification: { channel_id: "anunturi" } },
    } }),
  });
  if (r.ok) return true;
  const err = (await r.json().catch(() => ({}))).error || {};
  const code = (err.details || []).map((d) => d.errorCode).find(Boolean) || err.status || "";
  if (r.status === 404 || code === "UNREGISTERED") {
    await env.DB.prepare("DELETE FROM push_devices WHERE token = ?").bind(token).run();
  } else {
    console.error("fcm", r.status, code);
  }
  return false;
}

async function sendOne(env, token, msg) {
  if (!isApnsToken(token)) return sendFcm(env, token, msg);
  const r = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: "POST",
    headers: { authorization: `bearer ${await apnsJwt(env)}`, "apns-topic": env.APNS_TOPIC, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" },
    body: JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body || "" }, sound: "default" }, url: msg.url || "/" }),
  });
  if (r.ok) return true;
  const reason = (await r.json().catch(() => ({}))).reason || "";
  if (r.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
    await env.DB.prepare("DELETE FROM push_devices WHERE token = ?").bind(token).run();
  } else {
    console.error("apns", r.status, reason);
  }
  return false;
}

export async function pushTo(env, tokens, msg) {
  const list = [...new Set(tokens.filter(Boolean))]
    .filter((t) => (isApnsToken(t) ? apnsReady(env) : !!env.FCM_SA))
    .slice(0, MAX_PER_CALL);
  if (!list.length) return { sent: 0, failed: 0 };
  const results = await Promise.all(list.map((t) => sendOne(env, t, msg).catch((e) => { console.error("push", e); return false; })));
  const sent = results.filter(Boolean).length;
  return { sent, failed: list.length - sent };
}

// Telefoanele proprietarilor unui apartament si ale administratorilor; fara slug, doar ale administratorilor.
// comenzile de la bistro merg la administratori si la contul Attitude, nu la proprietari
export async function pushToBistro(env, msg) {
  const { results } = await env.DB.prepare(
    "SELECT d.token FROM push_devices d JOIN admins a ON a.id = d.admin_id WHERE a.role IN ('admin', 'bistro')"
  ).all();
  return pushTo(env, results.map((r) => r.token), msg);
}

export async function pushToStaff(env, slug, msg) {
  const { results } = await env.DB.prepare(
    `SELECT d.token FROM push_devices d JOIN admins a ON a.id = d.admin_id
     WHERE a.role = 'admin' OR EXISTS (SELECT 1 FROM admin_properties ap WHERE ap.admin_id = a.id AND ap.property_slug = ?)`
  ).bind(slug || "").all();
  return pushTo(env, results.map((r) => r.token), msg);
}

// Pagina oaspetelui gaseste accesul la rezervare in memoria aplicatiei de pe acelasi telefon (manage.js).
export function guestBookingMessage(p, b, status) {
  const en = b.lang === "en";
  const T = en
    ? { confirmed: "Booking confirmed", declined: "Booking not confirmed", cancelled: "Booking cancelled", expired: "Booking request expired" }
    : { confirmed: "Rezervare confirmată", declined: "Rezervare neconfirmată", cancelled: "Rezervare anulată", expired: "Cerere de rezervare expirată" };
  const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(en ? "en-GB" : "ro-RO", { day: "numeric", month: "short", timeZone: "UTC" });
  return {
    title: T[status] || T.cancelled,
    body: `${p.name}, ${day(b.checkin)} - ${day(b.checkout)}`,
    url: `${en ? "/en/booking/" : "/rezervare/"}?cod=${encodeURIComponent(b.code)}`,
  };
}

export function guestOrderMessage(o, status) {
  const en = o.lang === "en";
  const T = en
    ? { confirmed: "Your order is confirmed", delivered: "Your order was delivered", cancelled: "Your order was cancelled" }
    : { confirmed: "Comanda ta e confirmată", delivered: "Comanda ta a fost livrată", cancelled: "Comanda ta a fost anulată" };
  return { title: T[status], body: `Attitude Bistro, ${o.code}`, url: en ? "/en/restaurant/" : "/restaurant/" };
}
