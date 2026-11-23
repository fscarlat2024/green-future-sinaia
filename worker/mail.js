// Emailuri tranzactionale prin Brevo (secretul BREVO_API_KEY, expeditor MAIL_FROM autentificat in Brevo).
// Fara cheie nu pleaca nimic; rezervarile raman vizibile in panou.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d, lang) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const brevoKey = (env) => String(env.BREVO_API_KEY || "").replace(/^﻿/, "").trim();

// Brand per apartament: dandelion are propriul site + culoare proprie. Restul merg sub umbrela Green Future.
function brandOf(p) {
  if (p && p.slug === "studio-dandelion") {
    return { name: "Studio Dandelion", siteUrl: "https://dandelionsinaia.ro", headerBg: "#1B1D22", headerAccent: "#D99A2B", buttonBg: "#D99A2B", buttonFg: "#231703", page: "#141519", card: "#1B1D22", line: "#2C2F36", clubName: "Dandelion Club" };
  }
  // aceleasi culori ca site-ul: verde-negru, crem si auriu
  return { name: "Green Future Sinaia", siteUrl: null /* foloseste env.SITE_URL */, headerBg: "#0C110D", headerAccent: "#C8A45D", buttonBg: "#C8A45D", buttonFg: "#17120A", page: "#0C110D", card: "#141B15", line: "#2F392F", clubName: "Green Future Club" };
}
const brandSiteUrl = (env, brand) => brand.siteUrl || env.SITE_URL;

// Brevo dezactiveaza cheile nefolosite 90 de zile, iar un site fara rezervari poate sta atat fara emailuri.
export async function brevoKeepAlive(env) {
  const r = await fetch("https://api.brevo.com/v3/smtp/templates?limit=1", {
    headers: { "api-key": brevoKey(env), accept: "application/json" },
  });
  if (!r.ok) console.error(`Brevo keepalive ${r.status}`);
}

async function send(env, to, subject, html, replyTo, senderName) {
  const key = brevoKey(env);
  if (!key || !to) { console.log(`[mail oprit] ${to}: ${subject}`); return false; }
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: senderName || "Green Future Sinaia", email: env.MAIL_FROM }, to: String(to).split(",").map((e) => e.trim()).filter(Boolean).map((email) => ({ email })), subject, htmlContent: html,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });
  if (!r.ok) console.error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.ok;
}

const wrap = (title, body, brand) => {
  const b = brand || brandOf(null);
  return `<div style="background:${b.page};padding:22px 10px"><div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#F1EDE3;font-size:15px;line-height:1.5">
  <div style="background:${b.headerBg};color:${b.headerAccent};padding:18px 22px;border:1px solid ${b.line};border-bottom:2px solid ${b.headerAccent};border-radius:12px 12px 0 0;font-family:Georgia,serif;font-size:20px;letter-spacing:.02em">${b.name}</div>
  <div style="background:${b.card};border:1px solid ${b.line};border-top:0;padding:22px;border-radius:0 0 12px 12px"><h2 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:22px;color:#F1EDE3">${title}</h2>${body}</div></div></div>`;
};

const details = (p, b, lang, brand) => {
  const clubName = (brand && brand.clubName) || "Green Future Club";
  const L = lang === "en"
    ? { code: "Booking code", apt: "Apartment", in: "Check-in", out: "Check-out", guests: "Guests", discount: `${clubName} discount`, total: "Total", pay: "pay at the property" }
    : { code: "Cod rezervare", apt: "Apartament", in: "Sosire", out: "Plecare", guests: "Oaspeți", discount: `Reducere ${clubName}`, total: "Total", pay: "plată la proprietate" };
  const row = (k, v) => `<tr><td style="padding:5px 12px 5px 0;color:#C4C2B5">${k}</td><td style="padding:5px 0;color:#F1EDE3"><b>${esc(v)}</b></td></tr>`;
  return `<table style="border-collapse:collapse;font-size:15px">
    ${row(L.code, b.code)}${row(L.apt, p.name)}
    ${row(L.in, `${fmt(b.checkin, lang)}, ${p.checkin_time}`)}${row(L.out, `${fmt(b.checkout, lang)}, ${p.checkout_time}`)}
    ${row(L.guests, b.adults + b.children)}${b.discount ? row(L.discount, `-${b.discount} lei`) : ""}${row(L.total, `${b.total} lei (${b.payment_status === "paid" ? (lang === "en" ? "paid online" : "plătit online") : L.pay})`)}</table>`;
};

// Fara email de proprietar, rezervarea ajunge la adresa site-ului, redirectionata catre administrator.
const ownerAddress = (env, p) => p.owner_email || env.MAIL_FROM;

const COPY = {
  received: {
    ro: ["Am primit cererea ta de rezervare", "Proprietarul o verifică și primești răspunsul în cel mult 24 de ore. Perioada e reținută pentru tine până atunci."],
    en: ["We received your booking request", "The owner will review it and you will get an answer within 24 hours. The dates are held for you until then."],
  },
  confirmed: {
    ro: ["Rezervarea ta este confirmată", "Te așteptăm la __BRAND__!"],
    en: ["Your booking is confirmed", "We look forward to welcoming you at __BRAND__!"],
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
  const brand = brandOf(p);
  const isTest = b.status === "test";
  const [titleTpl, textTpl] = isTest
    ? (lang === "en"
        ? ["Test booking — not real", "This was only a test of the booking system. No real booking was made and nothing was charged."]
        : ["Rezervare de TEST — nu e reală", "Aceasta a fost doar o testare a sistemului de rezervări. Nu s-a făcut nicio rezervare reală și nu s-a reţinut nicio sumă."])
    : COPY[kind][lang];
  const title = titleTpl;
  const text = textTpl.replace("__BRAND__", brand.name);
  const testBanner = isTest
    ? `<div style="background:#c0392b;color:#fff;padding:14px 16px;border-radius:10px;margin:0 0 16px;font-size:15px;font-weight:bold">${lang === "en" ? "⚠ TEST — no real booking was made. The Green Future system is still being tested." : "⚠ TEST — nu s-a făcut nicio rezervare reală. Sistemul Green Future este încă în teste."}</div>`
    : "";
  const path = lang === "en" ? "/en/booking/" : "/rezervare/";
  const site = brandSiteUrl(env, brand);
  const manage = token
    ? `<p style="margin-top:18px"><a href="${esc(site)}${path}?cod=${esc(b.code)}&t=${esc(token)}" style="background:${brand.buttonBg};color:${brand.buttonFg};padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">${lang === "en" ? "View or cancel your booking" : "Vezi sau anulează rezervarea"}</a></p>`
    : "";
  // check-in online (buletin + regulament), cu rezervarea deja completata cand avem tokenul
  // check-in online pe site-ul apartamentului (Dandelion are pagina lui)
  const checkinHref = token
    ? `${site}${lang === "en" ? "/en/checkin/" : "/checkin/"}?b=${encodeURIComponent(b.code)}&t=${encodeURIComponent(token)}`
    : p.checkin_key ? `${site}${lang === "en" ? "/en/checkin/" : "/checkin/"}?p=${encodeURIComponent(p.slug)}&k=${p.checkin_key}` : "";
  const checkin = (kind === "confirmed" || kind === "received") && checkinHref
    ? `<p style="margin-top:18px">${lang === "en" ? "Save time on arrival: send a photo of your ID and confirm the house rules online." : "Câștigi timp la sosire: trimite poza buletinului și confirmă regulamentul online."}</p><p><a href="${esc(checkinHref)}" style="background:${brand.buttonBg};color:${brand.buttonFg};padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">${lang === "en" ? "Online check-in" : "Check-in online"}</a></p>`
    : "";
  return send(env, b.guest_email, `${isTest ? "[TEST] " : ""}${title} - ${b.code}`, wrap(esc(title), `${testBanner}<p>${esc(text)}</p>${details(p, b, lang, brand)}${isTest ? "" : manage}${isTest ? "" : checkin}`, brand), p.owner_email, brand.name);
}

export function mailOwnerNew(env, p, b, cancelled = false) {
  const brand = brandOf(p);
  const title = cancelled ? `Rezervare anulată de oaspete: ${b.code}` : `Rezervare nouă: ${p.name}, ${b.code}`;
  const action = cancelled ? "" : b.status === "pending"
    ? `<p><b>Confirmă sau refuză în 24 de ore</b>, altfel cererea expiră.</p><p><a href="${esc(env.SITE_URL)}/admin/" style="color:#C8A45D">Deschide panoul de rezervări</a></p>`
    : `<p><a href="${esc(env.SITE_URL)}/admin/" style="color:#C8A45D">Deschide panoul de rezervări</a></p>`;
  const body = `${details(p, b, "ro", brand)}
    <p style="margin-top:16px"><b>${esc(b.guest_name)}</b><br>${esc(b.guest_email)}<br>${esc(b.guest_phone)}</p>
    ${b.note ? `<p><i>${esc(b.note)}</i></p>` : ""}${action}`;
  return send(env, ownerAddress(env, p), title, wrap(esc(title), body, brand), b.guest_email, brand.name);
}

export function mailOrder(env, o) {
  const prefix = o.demo ? "[TEST] " : "";
  const title = `${prefix}Comandă la cameră: ap. ${o.apartment}, ${o.total} lei`;
  const rows = o.items.map((i) => `<tr><td style="padding:4px 12px 4px 0">${i.qty} × ${esc(i.name)}</td><td style="padding:4px 0;text-align:right">${i.qty * i.price} lei</td></tr>`).join("");
  const body = `${o.demo ? "<p><b>Comandă de test: nu se prepară.</b></p>" : ""}
    <p><b>Apartament ${esc(o.apartment)}</b><br>${esc(o.guest_name)}, ${esc(o.guest_phone)}</p>
    <table style="border-collapse:collapse;font-size:15px">${rows}
      ${o.discount ? `<tr><td style="padding:4px 12px 0 0">Reducere Green Future Club</td><td style="padding:4px 0 0;text-align:right">-${o.discount} lei</td></tr>` : ""}
      <tr><td style="padding:8px 12px 0 0"><b>Total, pe nota camerei</b></td><td style="padding:8px 0 0;text-align:right"><b>${o.total} lei</b></td></tr></table>
    ${o.note ? `<p><i>${esc(o.note)}</i></p>` : ""}<p>Cod: ${esc(o.code)}. <a href="${esc(env.SITE_URL)}/admin/" style="color:#C8A45D">Deschide panoul</a></p>`;
  return send(env, env.RESTAURANT_EMAIL || env.MAIL_FROM, title, wrap(esc(title), body));
}

export function mailGuestReset(env, g, token) {
  const en = g.lang === "en";
  const title = en ? "Reset your password" : "Schimbă parola contului";
  const link = `${esc(env.SITE_URL)}${en ? "/en/account/" : "/cont/"}?reset=${esc(token)}`;
  const body = `<p>${en ? "Use this link within one hour to choose a new password. If you did not ask for it, ignore this email." : "Folosește linkul în cel mult o oră ca să alegi o parolă nouă. Dacă nu ai cerut asta, ignoră emailul."}</p>
    <p style="margin-top:18px"><a href="${link}" style="background:#C8A45D;color:#17120A;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:bold">${title}</a></p>`;
  return send(env, g.email, title, wrap(esc(title), body));
}

export function mailVerifyCode(env, g, code) {
  const en = g.lang === "en";
  const title = en ? "Confirm your email" : "Confirmă-ți emailul";
  const body = `<p>${en ? "Enter this code in your Green Future account. It is valid for 30 minutes. If you did not create an account, ignore this email." : "Scrie acest cod în contul tău Green Future. Este valabil 30 de minute. Dacă nu ți-ai făcut cont, ignoră emailul."}</p>
    <p style="margin-top:18px;font-size:30px;font-weight:700;letter-spacing:6px">${esc(code)}</p>`;
  return send(env, g.email, title, wrap(esc(title), body));
}

export function mailChat(env, to, title, text, link, lang) {
  const label = lang === "en" ? "Open the conversation" : "Deschide conversația";
  const body = `<p style="white-space:pre-wrap">${esc(text)}</p>
    <p style="margin-top:18px"><a href="${esc(link)}" style="background:#C8A45D;color:#17120A;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:bold">${label}</a></p>`;
  return send(env, to, title, wrap(esc(title), body));
}

export function mailReview(env, p, b, token) {
  const en = b.lang === "en";
  const brand = brandOf(p);
  // Dandelion are pagina de recenzie pe site-ul lui (dandelionsinaia.ro/recenzie), in designul lui
  const site = brandSiteUrl(env, brand);
  const title = en ? `How was your stay at ${p.name}?` : `Cum a fost sejurul la ${p.name}?`;
  const link = `${esc(site)}${en ? "/en/review/" : "/recenzie/"}?cod=${esc(b.code)}&t=${esc(token)}`;
  const body = `<p>${en ? "Thank you for staying with us! Rate cleanliness, comfort, facilities, location, the host and value for money. It takes one minute and helps other guests choose." : "Îți mulțumim că ai stat la noi! Dă o notă pentru curățenie, confort, facilități, locație, gazdă și raportul calitate-preț. Durează un minut și îi ajută pe ceilalți oaspeți să aleagă."}</p>
    <p style="margin-top:18px"><a href="${link}" style="background:${brand.buttonBg};color:${brand.buttonFg};padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">${en ? "Leave a review" : "Lasă o recenzie"}</a></p>`;
  return send(env, b.guest_email, title, wrap(esc(title), body, brand), p.owner_email, brand.name);
}

export function mailConflict(env, p, b, event) {
  const brand = brandOf(p);
  const title = `Suprapunere în calendar: ${p.name}, ${b.code}`;
  const body = `<p>Calendarul extern arată o perioadă ocupată (${fmt(event.from, "ro")} - ${fmt(event.to, "ro")}) peste rezervarea directă de mai jos. Verifică și rezolvă manual.</p>
    ${details(p, b, "ro", brand)}<p><b>${esc(b.guest_name)}</b>, ${esc(b.guest_phone)}</p>`;
  return send(env, ownerAddress(env, p), title, wrap(esc(title), body, brand), b.guest_email, brand.name);
}

// ---------- programari la piscina si spa ----------
const spaWhen = (s, lang) => `${fmt(s.day, lang)}, ${s.slot}–${s.end}`;
export function mailSpa(env, s, kind) {
  const en = s.lang === "en";
  const T = {
    booked: en ? "Your pool & spa booking" : "Programarea ta la piscină și spa",
    cancelled: en ? "Your pool & spa booking is cancelled" : "Programarea la piscină și spa a fost anulată",
    cancelled_by_spa: en ? "Your pool & spa booking was cancelled" : "Programarea la piscină și spa a fost anulată de spa",
  };
  const title = T[kind];
  const row = (k, v) => `<tr><td style="padding:5px 12px 5px 0;color:#C4C2B5">${k}</td><td style="padding:5px 0;color:#F1EDE3"><b>${esc(v)}</b></td></tr>`;
  const table = `<table style="border-collapse:collapse;font-size:15px">${row(en ? "Code" : "Cod", s.code)}${row(en ? "When" : "Când", spaWhen(s, s.lang))}${row(en ? "People" : "Persoane", s.people)}</table>`;
  const link = `${env.SITE_URL}${en ? "/en/passes/" : "/abonamente/"}?anulare=${encodeURIComponent(s.code)}&t=${encodeURIComponent(s.token)}#spa`;
  let body;
  if (kind === "booked") {
    body = `<p>${en ? `Thank you, ${esc(s.name)}! Your place is reserved.` : `Mulțumim, ${esc(s.name)}! Locul tău este rezervat.`}</p>${table}
      <p>${en ? "Payment is made at the spa reception, according to the price list on the site. Please arrive a few minutes early." : "Plata se face la recepția spa-ului, după tarifele de pe site. Te rugăm să ajungi cu câteva minute înainte."}</p>
      <p style="margin-top:18px"><a href="${esc(link)}" style="background:#C8A45D;color:#17120A;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:bold">${en ? "Cancel the booking" : "Anulează programarea"}</a></p>
      <p style="color:#C4C2B5;font-size:13px">${en ? "If your plans change, please cancel so someone else can have the place." : "Dacă nu mai poți ajunge, te rugăm să anulezi, ca locul să rămână liber pentru altcineva."}</p>`;
  } else {
    body = `${table}<p>${kind === "cancelled_by_spa"
      ? (en ? "The spa had to cancel this booking. We are sorry. You can book another time on the site." : "Spa-ul a trebuit să anuleze această programare. Ne pare rău. Poți alege alt interval pe site.")
      : (en ? "The booking is cancelled. You can book another time on the site." : "Programarea a fost anulată. Poți alege alt interval pe site.")}</p>
      <p style="margin-top:18px"><a href="${esc(env.SITE_URL)}${en ? "/en/passes/#spa" : "/abonamente/#spa"}" style="color:#C8A45D">${en ? "Book again" : "Programează-te din nou"}</a></p>`;
  }
  return send(env, s.email, title, wrap(esc(title), body));
}
export function mailSpaStaff(env, s, kind) {
  const title = `${kind === "booked" ? "Programare nouă" : "Programare anulată de client"} la spa: ${spaWhen(s, "ro")}, ${s.people} pers.`;
  const body = `<p><b>${esc(s.name)}</b>, <a href="tel:${esc(String(s.phone).replace(/[^+\d]/g, ""))}" style="color:#C8A45D">${esc(s.phone)}</a>, ${esc(s.email)}</p>
    ${s.note ? `<p><i>${esc(s.note)}</i></p>` : ""}<p>Cod: ${esc(s.code)}. <a href="${esc(env.SITE_URL)}/admin/" style="color:#C8A45D">Deschide panoul</a></p>`;
  return send(env, env.RESTAURANT_EMAIL || env.MAIL_FROM, title, wrap(esc(title), body));
}
