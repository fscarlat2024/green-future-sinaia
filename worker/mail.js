// Emailuri tranzactionale prin Brevo (secretul BREVO_API_KEY, expeditor MAIL_FROM autentificat in Brevo).
// Fara cheie nu pleaca nimic; rezervarile raman vizibile in panou.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d, lang) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function send(env, to, subject, html) {
  const key = String(env.BREVO_API_KEY || "").replace(/^﻿/, "").trim();
  if (!key || !to) { console.log(`[mail oprit] ${to}: ${subject}`); return false; }
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ sender: { name: "Green Future Sinaia", email: env.MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (!r.ok) console.error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}

const wrap = (title, body) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C2A1E">
  <div style="background:#204E35;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:18px"><b>Green Future Sinaia</b></div>
  <div style="border:1px solid #E3DECE;border-top:0;padding:22px;border-radius:0 0 12px 12px"><h2 style="margin:0 0 14px;font-size:20px">${title}</h2>${body}</div></div>`;

const details = (p, b, lang) => {
  const L = lang === "en"
    ? { code: "Booking code", apt: "Apartment", in: "Check-in", out: "Check-out", guests: "Guests", total: "Total", pay: "pay at the property" }
    : { code: "Cod rezervare", apt: "Apartament", in: "Sosire", out: "Plecare", guests: "Oaspeți", total: "Total", pay: "plată la proprietate" };
  const row = (k, v) => `<tr><td style="padding:5px 12px 5px 0;color:#7B7A69">${k}</td><td style="padding:5px 0"><b>${esc(v)}</b></td></tr>`;
  return `<table style="border-collapse:collapse;font-size:15px">
    ${row(L.code, b.code)}${row(L.apt, p.name)}
    ${row(L.in, `${fmt(b.checkin, lang)}, ${p.checkin_time}`)}${row(L.out, `${fmt(b.checkout, lang)}, ${p.checkout_time}`)}
    ${row(L.guests, b.adults + b.children)}${row(L.total, `${b.total} lei (${L.pay})`)}</table>`;
};

const COPY = {
  received: {
    ro: ["Am primit cererea ta de rezervare", "Proprietarul o verifică și primești răspunsul în cel mult 24 de ore. Perioada e reținută pentru tine până atunci."],
    en: ["We received your booking request", "The owner will review it and you will get an answer within 24 hours. The dates are held for you until then."],
  },
  confirmed: {
    ro: ["Rezervarea ta este confirmată", "Te așteptăm la Green Future Sinaia!"],
    en: ["Your booking is confirmed", "We look forward to welcoming you at Green Future Sinaia!"],
  },
  declined: {
    ro: ["Rezervarea nu a putut fi confirmată", "Ne pare rău, perioada aleasă nu mai este disponibilă. Nu ți s-a reținut nicio sumă."],
    en: ["Your booking could not be confirmed", "Sorry, the selected dates are no longer available. You have not been charged."],
  },
  cancelled: {
    ro: ["Rezervarea a fost anulată", "Perioada a fost eliberată. Nu ți s-a reținut nicio sumă."],
    en: ["Your booking was cancelled", "The dates have been released. You have not been charged."],
  },
  expired: {
    ro: ["Cererea de rezervare a expirat", "Proprietarul nu a răspuns în 24 de ore, așa că perioada a fost eliberată. Nu ți s-a reținut nicio sumă."],
    en: ["Your booking request expired", "The owner did not answer within 24 hours, so the dates were released. You have not been charged."],
  },
};

export function mailGuest(env, p, b, kind, token) {
  const lang = b.lang === "en" ? "en" : "ro";
  const [title, text] = COPY[kind][lang];
  const path = lang === "en" ? "/en/booking/" : "/rezervare/";
  const manage = token
    ? `<p style="margin-top:18px"><a href="${esc(env.SITE_URL)}${path}?cod=${esc(b.code)}&t=${esc(token)}" style="background:#2E6B47;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${lang === "en" ? "View or cancel your booking" : "Vezi sau anulează rezervarea"}</a></p>`
    : "";
  return send(env, b.guest_email, `${title} - ${b.code}`, wrap(esc(title), `<p>${esc(text)}</p>${details(p, b, lang)}${manage}`));
}

export function mailOwnerNew(env, p, b, cancelled = false) {
  const title = cancelled ? `Rezervare anulată de oaspete: ${b.code}` : `Rezervare nouă: ${p.name}, ${b.code}`;
  const action = cancelled ? "" : b.status === "pending"
    ? `<p><b>Confirmă sau refuză în 24 de ore</b>, altfel cererea expiră.</p><p><a href="${esc(env.SITE_URL)}/admin/">Deschide panoul de rezervări</a></p>`
    : `<p><a href="${esc(env.SITE_URL)}/admin/">Deschide panoul de rezervări</a></p>`;
  const body = `${details(p, b, "ro")}
    <p style="margin-top:16px"><b>${esc(b.guest_name)}</b><br>${esc(b.guest_email)}<br>${esc(b.guest_phone)}</p>
    ${b.note ? `<p><i>${esc(b.note)}</i></p>` : ""}${action}`;
  return send(env, p.owner_email, title, wrap(esc(title), body));
}

export function mailConflict(env, p, b, event) {
  const title = `Suprapunere în calendar: ${p.name}, ${b.code}`;
  const body = `<p>Calendarul extern arată o perioadă ocupată (${fmt(event.from, "ro")} - ${fmt(event.to, "ro")}) peste rezervarea directă de mai jos. Verifică și rezolvă manual.</p>
    ${details(p, b, "ro")}<p><b>${esc(b.guest_name)}</b>, ${esc(b.guest_phone)}</p>`;
  return send(env, p.owner_email, title, wrap(esc(title), body));
}
