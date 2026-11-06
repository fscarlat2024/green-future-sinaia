// Calendar + formular de rezervare pe pagina apartamentului.
// Daca apartamentul nu are rezervari active, sectiunea ramane ascunsa si se vede doar contactul.
(function () {
  const root = document.getElementById("bk");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = {
    ro: {
      checkin: "Sosire", checkout: "Plecare", pick: "Alege data", adults: "Adulți", children: "Copii",
      pickDates: "Alege data sosirii și a plecării în calendar.", pickOut: "Alege acum data plecării.",
      nights: (n) => (n === 1 ? "1 noapte" : `${n} nopți`), cleaning: "Curățenie", total: "Total", club: (l, p) => `Reducere ${l} (${p}%)`,
      joinHint: "Cu un cont Green Future Club, rezervarea îți aduce reduceri la sejururile viitoare.", join: "Creează cont",
      perNight: "lei / noapte", from: "de la", minStay: (n) => `Sejur minim: ${n} nopți`,
      next: "Continuă", bookNow: "Rezervă acum", request: "Trimite cererea de rezervare", back: "Înapoi",
      name: "Nume și prenume", email: "Email", phone: "Telefon", note: "Mesaj pentru gazdă (opțional)",
      payNote: "Nu plătești nimic acum. Plata se face la proprietate.",
      instantNote: "Rezervarea se confirmă pe loc.",
      requestNote: "Proprietarul confirmă în cel mult 24 de ore. Perioada e reținută până atunci.",
      cancelNote: (n) => (n > 0 ? `Anulare gratuită cu cel puțin ${n} zile înainte de sosire.` : "Anulare gratuită până în ziua sosirii."),
      accept: "Sunt de acord ca datele mele să fie folosite pentru această rezervare și transmise proprietarului.",
      sending: "Se trimite...",
      okRequest: "Cererea ta a fost trimisă", okInstant: "Rezervarea ta este confirmată",
      okText: "Ți-am trimis detaliile pe email. Păstrează codul și linkul de mai jos.",
      okTextNoMail: "Păstrează codul și linkul de mai jos pentru a vedea starea rezervării.",
      code: "Cod rezervare", manage: "Vezi sau anulează rezervarea", prev: "Luna anterioară", nextM: "Luna următoare",
      unavailable: "Perioada tocmai a fost ocupată. Te rugăm să alegi alte date.",
      min_nights: (e) => `Sejurul minim pentru această perioadă este de ${e.minNights} nopți.`,
      too_many_guests: (e) => `Apartamentul primește cel mult ${e.capacity} persoane.`,
      invalid_name: "Scrie numele complet.", invalid_email: "Adresa de email nu pare corectă.",
      invalid_phone: "Numărul de telefon nu pare corect.", accept_required: "Bifează acordul pentru a continua.",
      too_many_requests: "Prea multe încercări. Te rugăm să revii puțin mai târziu.",
      generic: "Nu am putut finaliza. Te rugăm să încerci din nou sau să ne scrii.",
    },
    en: {
      checkin: "Check-in", checkout: "Check-out", pick: "Select date", adults: "Adults", children: "Children",
      pickDates: "Select your check-in and check-out dates in the calendar.", pickOut: "Now select your check-out date.",
      nights: (n) => (n === 1 ? "1 night" : `${n} nights`), cleaning: "Cleaning", total: "Total", club: (l, p) => `${l} discount (${p}%)`,
      joinHint: "With a Green Future Club account, this booking earns you discounts on future stays.", join: "Create account",
      perNight: "lei / night", from: "from", minStay: (n) => `Minimum stay: ${n} nights`,
      next: "Continue", bookNow: "Book now", request: "Send booking request", back: "Back",
      name: "Full name", email: "Email", phone: "Phone", note: "Message for the host (optional)",
      payNote: "You pay nothing now. Payment is made at the property.",
      instantNote: "Your booking is confirmed immediately.",
      requestNote: "The owner confirms within 24 hours. The dates are held until then.",
      cancelNote: (n) => (n > 0 ? `Free cancellation up to ${n} days before check-in.` : "Free cancellation until the day of check-in."),
      accept: "I agree that my details are used for this booking and shared with the owner.",
      sending: "Sending...",
      okRequest: "Your request has been sent", okInstant: "Your booking is confirmed",
      okText: "We emailed you the details. Keep the code and the link below.",
      okTextNoMail: "Keep the code and the link below to check your booking status.",
      code: "Booking code", manage: "View or cancel your booking", prev: "Previous month", nextM: "Next month",
      unavailable: "These dates were just taken. Please select other dates.",
      min_nights: (e) => `The minimum stay for this period is ${e.minNights} nights.`,
      too_many_guests: (e) => `The apartment hosts at most ${e.capacity} guests.`,
      invalid_name: "Please enter your full name.", invalid_email: "This email address does not look right.",
      invalid_phone: "This phone number does not look right.", accept_required: "Please tick the consent box to continue.",
      too_many_requests: "Too many attempts. Please come back a little later.",
      generic: "We could not complete this. Please try again or write to us.",
    },
  }[lang];
  const locale = lang === "en" ? "en-GB" : "ro-RO";
  let guestToken = null;
  try { guestToken = localStorage.getItem("gf_guest_token"); } catch {}
  const authHeader = () => (guestToken ? { authorization: `Bearer ${guestToken}` } : {});
  let member = null;
  if (guestToken) fetch("/api/guest/me", { headers: authHeader() }).then((r) => (r.ok ? r.json() : null)).then((m) => { member = m; }).catch(() => {});

  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
      else if (v === true) el.setAttribute(k, "");
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  };
  const longDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const addDays = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
  const diff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  const errText = (e) => {
    const m = T[e.error];
    return typeof m === "function" ? m(e) : m || T.generic;
  };

  const state = { property: null, days: new Map(), first: null, last: null, month: null, checkin: null, checkout: null, adults: 2, children: 0, quote: null, step: "dates", error: "" };
  const calEl = h("div", { class: "bk-cal" });
  const sideEl = h("aside", { class: "bk-side", "aria-live": "polite" });

  function monthKey(d) { return d.slice(0, 7); }
  function shiftMonth(m, n) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  }

  // Ultima zi in care se poate pleca dupa sosirea aleasa: pana la prima noapte ocupata inclusiv.
  function lastCheckoutFor(checkin) {
    let d = checkin;
    while (state.days.get(d)?.a === 1) d = addDays(d, 1);
    return d;
  }
  function minNightsFor(d) { return state.days.get(d)?.m || state.property.minNights; }
  // O zi e buna de sosire doar daca incape sejurul minim pana la urmatoarea noapte ocupata.
  function canCheckIn(d) {
    const min = minNightsFor(d);
    for (let i = 0; i < min; i++) if (state.days.get(addDays(d, i))?.a !== 1) return false;
    return true;
  }

  function pickDay(d) {
    state.error = "";
    if (state.checkin && !state.checkout && d > state.checkin && d <= lastCheckoutFor(state.checkin) && diff(state.checkin, d) >= minNightsFor(state.checkin)) {
      state.checkout = d;
    } else if (canCheckIn(d)) {
      state.checkin = d;
      state.checkout = null;
      state.quote = null;
    }
    render();
    if (state.checkout) loadQuote();
  }

  function renderMonth(m) {
    const [y, mo] = m.split("-").map(Number);
    const firstDay = new Date(Date.UTC(y, mo - 1, 1));
    const count = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const lead = (firstDay.getUTCDay() + 6) % 7;
    const grid = h("div", { class: "bk-grid", role: "grid" });
    for (let i = 0; i < 7; i++) {
      grid.append(h("span", { class: "bk-dow" }, new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }).slice(0, 2)));
    }
    for (let i = 0; i < lead; i++) grid.append(h("span"));
    const pickingOut = state.checkin && !state.checkout;
    const limit = pickingOut ? lastCheckoutFor(state.checkin) : null;
    const minOut = pickingOut ? addDays(state.checkin, minNightsFor(state.checkin)) : null;
    for (let n = 1; n <= count; n++) {
      const d = `${m}-${String(n).padStart(2, "0")}`;
      const info = state.days.get(d);
      const canOut = pickingOut && d >= minOut && d <= limit;
      const canIn = canCheckIn(d);
      const inRange = state.checkin && state.checkout && d > state.checkin && d < state.checkout;
      const cls = ["bk-day"];
      if (d === state.checkin || d === state.checkout) cls.push("is-end");
      if (inRange) cls.push("is-range");
      if (info && !canIn && !canOut) cls.push("is-taken");
      const label = `${longDate(d)}${info && canIn ? `, ${info.p} ${T.perNight}` : ""}`;
      grid.append(h("button", {
        type: "button", class: cls.join(" "), disabled: !(canIn || canOut), "aria-label": label,
        "aria-pressed": d === state.checkin || d === state.checkout ? "true" : "false",
        on: { click: () => pickDay(d) },
      }, h("b", null, String(n)), h("small", null, info && canIn ? String(info.p) : "")));
    }
    const title = firstDay.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
    return h("div", { class: "bk-month" }, h("div", { class: "bk-month-title" }, title), grid);
  }

  function renderCalendar() {
    const min = monthKey(state.first);
    const max = monthKey(state.last);
    const second = shiftMonth(state.month, 1);
    calEl.replaceChildren(
      h("div", { class: "bk-cal-nav" },
        h("button", { type: "button", class: "bk-nav", disabled: state.month <= min, "aria-label": T.prev, on: { click: () => { state.month = shiftMonth(state.month, -1); renderCalendar(); } } }, "‹"),
        h("button", { type: "button", class: "bk-nav", disabled: second >= max, "aria-label": T.nextM, on: { click: () => { state.month = shiftMonth(state.month, 1); renderCalendar(); } } }, "›")),
      h("div", { class: "bk-months" }, renderMonth(state.month), second <= max ? renderMonth(second) : null),
    );
  }

  function stepper(label, key, min) {
    const total = state.adults + state.children;
    return h("div", { class: "bk-step" }, h("span", null, label),
      h("div", { class: "bk-step-ctl" },
        h("button", { type: "button", "aria-label": `${label} -`, disabled: state[key] <= min, on: { click: () => change(key, -1) } }, "−"),
        h("output", null, String(state[key])),
        h("button", { type: "button", "aria-label": `${label} +`, disabled: total >= state.property.capacity, on: { click: () => change(key, 1) } }, "+")));
  }
  function change(key, n) { state[key] += n; state.error = ""; renderSide(); if (state.checkout) loadQuote(); }

  async function loadQuote() {
    const r = await fetch("/api/quote", {
      method: "POST", headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({ slug: root.dataset.slug, checkin: state.checkin, checkout: state.checkout, guests: state.adults + state.children }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : {};
    state.quote = r && r.ok && data.available ? data : null;
    state.error = !r || !r.ok ? errText(data) : data.available ? "" : T.unavailable;
    renderSide();
    stickyPrice();
  }

  // bara de jos: pretul de la care porneste, apoi totalul pentru datele alese
  function stickyPrice() {
    const q = state.quote;
    const main = q ? `${q.total} lei` : `${T.from} ${state.property.basePrice} lei`;
    const note = q ? T.nights(q.nights) : T.perNight.replace(/^lei \/ /, "/ ");
    document.querySelectorAll("[data-ap-price]").forEach((el) => { el.textContent = main; });
    document.querySelectorAll("[data-ap-note]").forEach((el) => { el.textContent = note; });
  }

  function priceLines() {
    const q = state.quote;
    if (!q) return null;
    return h("div", { class: "bk-lines" },
      h("div", null, h("span", null, T.nights(q.nights)), h("span", null, `${q.subtotal} lei`)),
      q.discount ? h("div", { class: "bk-discount" }, h("span", null, q.offerTitle ? `${q.offerTitle} (${q.discountPct}%)` : T.club(q.level === "gold" ? "Gold" : "Silver", q.discountPct)), h("span", null, `-${q.discount} lei`)) : null,
      q.cleaningFee ? h("div", null, h("span", null, T.cleaning), h("span", null, `${q.cleaningFee} lei`)) : null,
      h("div", { class: "bk-total" }, h("span", null, T.total), h("b", null, `${q.total} lei`)));
  }
  function notes() {
    const p = state.property;
    return h("ul", { class: "bk-notes" },
      h("li", null, T.payNote),
      h("li", null, p.instantBook ? T.instantNote : T.requestNote),
      h("li", null, T.cancelNote(p.freeCancelDays)));
  }
  const errorBox = () => (state.error ? h("p", { class: "bk-err", role: "alert" }, state.error) : null);

  function renderSide() {
    if (state.step === "form") return renderForm();
    const p = state.property;
    const hint = !state.checkin ? T.pickDates : !state.checkout ? T.pickOut : null;
    sideEl.replaceChildren(...[
      h("div", { class: "bk-from" }, T.from, " ", h("b", null, String(p.basePrice)), " ", T.perNight),
      h("div", { class: "bk-dates" },
        h("div", null, h("small", null, T.checkin), h("b", null, state.checkin ? longDate(state.checkin) : T.pick)),
        h("div", null, h("small", null, T.checkout), h("b", null, state.checkout ? longDate(state.checkout) : T.pick))),
      stepper(T.adults, "adults", 1), stepper(T.children, "children", 0),
      hint ? h("p", { class: "bk-hint" }, hint) : null,
      p.minNights > 1 && !state.checkout ? h("p", { class: "bk-hint" }, T.minStay(p.minNights)) : null,
      errorBox(), priceLines(),
      h("button", { type: "button", class: "btn btn-primary btn-lg bk-go", disabled: !state.quote, on: { click: () => { state.step = "form"; state.error = ""; renderSide(); } } }, T.next),
      notes()].filter(Boolean));
  }

  const field = (label, name, attrs) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name, required: true, ...attrs }));

  function renderForm() {
    const p = state.property;
    const form = h("form", { class: "bk-form", on: { submit } },
      h("button", { type: "button", class: "bk-back", on: { click: () => { state.step = "dates"; state.error = ""; renderSide(); } } }, `‹ ${T.back}`),
      h("p", { class: "bk-sum" }, `${longDate(state.checkin)} – ${longDate(state.checkout)}`), priceLines(),
      guestToken ? null : h("p", { class: "bk-join" }, T.joinHint, " ", h("a", { href: lang === "en" ? "/en/account/" : "/cont/" }, T.join)),
      field(T.name, "name", { autocomplete: "name", maxlength: "100", value: member?.name }),
      field(T.email, "email", { type: "email", autocomplete: "email", maxlength: "200", value: member?.email }),
      field(T.phone, "phone", { type: "tel", autocomplete: "tel", maxlength: "30", value: member?.phone }),
      h("label", { class: "bk-field" }, h("span", null, T.note), h("textarea", { name: "note", rows: "3", maxlength: "1000" })),
      h("input", { class: "bk-trap", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" }),
      h("label", { class: "bk-check" }, h("input", { type: "checkbox", name: "accept", required: true }), h("span", null, T.accept)),
      errorBox(),
      h("button", { type: "submit", class: "btn btn-primary btn-lg bk-go" }, p.instantBook ? T.bookNow : T.request),
      notes());
    sideEl.replaceChildren(form);
  }

  async function submit(ev) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const btn = form.querySelector("[type=submit]");
    const f = new FormData(form);
    btn.disabled = true;
    btn.textContent = T.sending;
    const r = await fetch("/api/bookings", {
      method: "POST", headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({
        slug: root.dataset.slug, checkin: state.checkin, checkout: state.checkout, adults: state.adults, children: state.children, lang,
        name: f.get("name"), email: f.get("email"), phone: f.get("phone"), note: f.get("note"), website: f.get("website"), accept: f.get("accept") === "on", pushToken: window.GF_NATIVE_PUSH?.token,
      }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) return success(data);
    const keep = Object.fromEntries(f.entries());
    state.error = r ? errText(data) : T.generic;
    if (r && r.status === 409) { await loadCalendar(); state.checkin = state.checkout = null; state.quote = null; state.step = "dates"; render(); return; }
    renderForm();
    const again = sideEl.querySelector("form");
    for (const [k, v] of Object.entries(keep)) { const el = again.elements[k]; if (el && el.type !== "checkbox") el.value = v; }
    again.elements.accept.checked = keep.accept === "on";
  }

  function success(b) {
    if (window.GF_NATIVE) {
      // notificarile nu poarta cheia rezervarii; pagina o ia de aici, de pe telefonul care a rezervat
      try {
        const saved = JSON.parse(localStorage.getItem("gf_bookings") || "{}");
        saved[b.code] = b.token;
        localStorage.setItem("gf_bookings", JSON.stringify(saved));
      } catch {}
    }
    const path = lang === "en" ? "/en/booking/" : "/rezervare/";
    const link = `${path}?cod=${encodeURIComponent(b.code)}&t=${encodeURIComponent(b.token)}`;
    calEl.hidden = true;
    root.classList.add("is-done");
    sideEl.replaceChildren(
      h("div", { class: "bk-done" }, h("div", { class: "bk-tick", "aria-hidden": "true" }, "✓"),
        h("h3", null, b.status === "confirmed" ? T.okInstant : T.okRequest),
        h("p", null, b.emailSent ? T.okText : T.okTextNoMail),
        h("div", { class: "bk-code" }, h("small", null, T.code), h("b", null, b.code)),
        h("a", { class: "btn btn-primary", href: link }, T.manage)));
    sideEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function render() { renderCalendar(); renderSide(); }

  async function loadCalendar() {
    const r = await fetch(`/api/properties/${encodeURIComponent(root.dataset.slug)}/calendar`).catch(() => null);
    if (!r || !r.ok) return false;
    const data = await r.json();
    state.property = data.property;
    state.days = new Map(data.days.map((x) => [x.d, x]));
    state.first = data.days[0].d;
    state.last = data.days[data.days.length - 1].d;
    state.month = state.month || monthKey(state.first);
    return true;
  }

  (async function start() {
    if (!(await loadCalendar())) return;
    state.adults = Math.min(2, state.property.capacity);
    root.hidden = false;
    root.replaceChildren(calEl, sideEl);
    document.querySelectorAll("[data-direct-hide]").forEach((el) => { el.hidden = true; });
    document.querySelectorAll("[data-direct-show]").forEach((el) => { el.hidden = false; });

    // datele alese in cautarea de pe prima pagina
    const q = new URLSearchParams(location.search);
    const inD = q.get("checkin"), outD = q.get("checkout"), guests = Number(q.get("guests"));
    if (guests > 0) state.adults = Math.max(1, Math.min(guests, state.property.capacity));
    if (state.days.has(inD) && canCheckIn(inD)) {
      state.checkin = inD;
      state.month = monthKey(inD);
      if (outD > inD && outD <= lastCheckoutFor(inD) && diff(inD, outD) >= minNightsFor(inD)) state.checkout = outD;
    }
    render();
    stickyPrice();
    if (state.checkout) loadQuote();
    const bar = document.querySelector(".ap-sticky");
    if (bar && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => bar.classList.toggle("is-away", e.isIntersecting)).observe(document.getElementById("rezervare"));
    }
    // sectiunea era ascunsa cand browserul a sarit la ancora
    if (location.hash === "#rezervare") document.getElementById("rezervare").scrollIntoView();
  })();
})();
