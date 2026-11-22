// Pagina Abonamente: preturile vin de pe server (le schimba contul Attitude din panou).
// Ce e scris in pagina ramane ca rezerva daca serverul nu raspunde.
(function () {
  const lang = document.documentElement.lang === "en" ? "en" : "ro";
  const L = lang === "en"
    ? { unit: "lei", adults: "adults", children: "children", students: "students", pay: "Pay by card", soon: "Coming soon" }
    : { unit: "lei", adults: "adulți", children: "copii", students: "elevi", pay: "Plătește cu cardul", soon: "În curând" };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  fetch("/api/passes").then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !Array.isArray(d.groups)) return;
    for (const g of d.groups) {
      const box = document.querySelector(`[data-pass-plans="${g.id}"]`);
      if (!box) continue;
      const sec = box.closest("section");
      const desc = sec.querySelector("[data-pass-desc]");
      const status = sec.querySelector("[data-pass-status]");
      if (desc) desc.textContent = g[`desc_${lang}`] || g.desc_ro;
      if (status) { const s = g[`status_${lang}`] || ""; status.textContent = s; status.hidden = !s; }
      const second = L[box.dataset.second] || "";
      const soonId = `soon-${g.id}`;
      box.replaceChildren(...g.plans.map((p) => {
        const a = el("article", `plan${p.featured ? " is-featured" : ""}`);
        const price = el("div", "plan-price");
        price.append(el("b", null, String(p.adult)), ` ${L.unit} `, el("small", null, L.adults));
        const btn = el("button", "btn btn-pay", L.pay);
        btn.type = "button"; btn.disabled = true; btn.setAttribute("aria-describedby", soonId);
        a.append(el("h3", null, p[`name_${lang}`] || p.name_ro), el("span", "plan-period", p[`period_${lang}`] || p.period_ro), price,
          el("div", "plan-other", `${p.other} ${L.unit} ${second}`), btn, el("span", "plan-soon", L.soon));
        return a;
      }));
    }
    const ex = document.querySelector("[data-pass-extras]");
    if (ex && Array.isArray(d.extras)) {
      ex.replaceChildren(...d.extras.map((e) => { const li = el("li"); li.append(el("span", null, e[lang] || e.ro), el("b", null, `${e.price} ${L.unit}`)); return li; }));
    }
  }).catch(() => {});
})();

// Piscină & Spa (#spa) și Fitness (#sala) din meniu: arată doar secțiunea aleasă, fără poza celeilalte.
(function () {
  const groups = document.querySelectorAll(".pass-group");
  const extras = document.querySelector(".extras");
  if (!groups.length) return;
  const apply = () => {
    const h = location.hash.slice(1);
    const only = h === "spa" || h === "sala" ? h : "";
    groups.forEach((g) => { g.style.display = only && g.id !== only ? "none" : ""; });
    if (extras) extras.style.display = only === "sala" ? "none" : "";
  };
  apply();
  window.addEventListener("hashchange", apply);
})();

// Programare online la piscină și spa: zi, persoane, interval cu locuri libere, apoi datele de contact.
(function () {
  const box = document.querySelector("[data-spa-book]");
  if (!box) return;
  const lang = document.documentElement.lang === "en" ? "en" : "ro";
  const T = lang === "en" ? {
    title: "Book online", sub: "Pick the day, the number of people and a free time slot. Payment is made at the spa reception.",
    day: "Day", people: "People", slots: "Free time slots", none: "No free slots on this day. Try another day.", full: "Full", places: (n) => `${n} ${n === 1 ? "place" : "places"} left`,
    name: "Full name", phone: "Phone", email: "Email (for the confirmation)", note: "Note (optional)", send: "Book the slot", pick: "Choose a time slot first.",
    ok: "Booked!", okText: (c, w) => `Your code is ${c}, for ${w}. We sent the confirmation by email, with a link to cancel if your plans change.`, another: "Book another slot",
    err: { spa_full: "Meanwhile the slot filled up. Choose another one.", invalid_phone: "The phone number doesn't look right.", invalid_email: "The email doesn't look right.", invalid_name: "Please write your name.", invalid_dates: "That slot is no longer available.", invalid_guests: "Check the number of people.", too_many_requests: "Too many attempts. Try again later.", spa_closed: "Online booking is closed right now." }, fallback: "Booking failed. Please try again.",
    cancelQ: (c) => `Cancel the pool & spa booking ${c}?`, cancelYes: "Yes, cancel it", cancelDone: "The booking is cancelled. Thank you for letting us know.", cancelOld: "This booking was already cancelled.", cancelBad: "We couldn't find this booking.",
  } : {
    title: "Programează-te online", sub: "Alege ziua, numărul de persoane și un interval liber. Plata se face la recepția spa-ului.",
    day: "Ziua", people: "Persoane", slots: "Intervale libere", none: "Nu mai sunt intervale libere în ziua aceasta. Încearcă altă zi.", full: "Complet", places: (n) => (n === 1 ? "1 loc liber" : `${n} locuri libere`),
    name: "Nume și prenume", phone: "Telefon", email: "Email (pentru confirmare)", note: "Mențiuni (opțional)", send: "Rezervă intervalul", pick: "Alege întâi un interval.",
    ok: "Programare făcută!", okText: (c, w) => `Codul tău este ${c}, pentru ${w}. Ți-am trimis confirmarea pe email, cu un link de anulare dacă se schimbă planurile.`, another: "Fă altă programare",
    err: { spa_full: "Între timp intervalul s-a ocupat. Alege altul.", invalid_phone: "Numărul de telefon nu pare corect.", invalid_email: "Emailul nu pare corect.", invalid_name: "Scrie-ți numele.", invalid_dates: "Intervalul nu mai este disponibil.", invalid_guests: "Verifică numărul de persoane.", too_many_requests: "Prea multe încercări. Reîncearcă mai târziu.", spa_closed: "Programările online sunt oprite acum." }, fallback: "Programarea nu a reușit. Încearcă din nou.",
    cancelQ: (c) => `Anulezi programarea la piscină și spa ${c}?`, cancelYes: "Da, anulează", cancelDone: "Programarea a fost anulată. Mulțumim că ne-ai anunțat.", cancelOld: "Programarea era deja anulată.", cancelBad: "Nu am găsit această programare.",
  };
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v === true) n.setAttribute(k, ""); else if (v != null && v !== false) n.setAttribute(k, v); }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  };
  const fmt = (d) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const post = async (path, body) => {
    const r = await fetch(`/api/spa/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(T.err[d.error] || T.fallback); e.code = d.error; throw e; }
    return d;
  };

  // linkul de anulare din email: ?anulare=COD&t=TOKEN
  const q = new URLSearchParams(location.search);
  if (q.get("anulare") && q.get("t")) {
    const code = q.get("anulare"), tk = q.get("t");
    const msg = el("p", { role: "status" });
    const yes = el("button", { type: "button", class: "btn btn-primary" }, T.cancelYes);
    const card = el("div", { class: "spa-cancel" }, el("p", null, T.cancelQ(code)), yes, msg);
    yes.addEventListener("click", async () => {
      yes.disabled = true;
      try { const d = await post("cancel", { code, token: tk }); msg.textContent = d.already ? T.cancelOld : T.cancelDone; yes.remove(); }
      catch (e) { msg.textContent = e.code === "not_found" ? T.cancelBad : e.message; yes.disabled = false; }
    });
    box.before(card);
  }

  const state = { day: "", people: 2, slot: null };
  async function load() {
    const r = await fetch(`/api/spa${state.day ? `?day=${state.day}` : ""}`).catch(() => null);
    const d = r && r.ok ? await r.json() : null;
    if (!d || !d.enabled) { box.hidden = true; return; }
    if (!state.day) state.day = d.day;
    state.people = Math.min(state.people, d.maxPeople);
    box.hidden = false;
    const head = box.closest("section")?.querySelector(".sec-head");
    if (head && !head.querySelector(".spa-jump")) {
      const jump = el("button", { type: "button", class: "btn btn-primary spa-jump" }, T.title);
      jump.addEventListener("click", () => box.scrollIntoView({ behavior: "smooth", block: "start" }));
      head.append(jump);
    }
    draw(d);
  }
  function draw(d) {
    const maxDay = new Date(Date.parse(d.today + "T00:00:00Z") + d.days * 86400000).toISOString().slice(0, 10);
    const dayIn = el("input", { type: "date", min: d.today, max: maxDay, value: state.day, required: true });
    dayIn.addEventListener("change", () => { if (dayIn.value) { state.day = dayIn.value; state.slot = null; load(); } });
    const ppl = el("select", null, Array.from({ length: d.maxPeople }, (_, i) => el("option", { value: i + 1, selected: i + 1 === state.people }, String(i + 1))));
    ppl.addEventListener("change", () => { state.people = Number(ppl.value); if (state.slot && state.slot.free < state.people) state.slot = null; draw(d); });
    const slots = (d.slots || []).map((s) => {
      const on = !!state.slot && state.slot.time === s.time;
      const b = el("button", { type: "button", class: `spa-slot${on ? " on" : ""}`, disabled: s.free < state.people, "aria-pressed": on ? "true" : "false" },
        el("b", null, `${s.time}–${s.end}`), el("span", null, s.free ? T.places(s.free) : T.full));
      b.addEventListener("click", () => { state.slot = s; draw(d); box.querySelector("[name=name]")?.focus(); });
      return b;
    });
    const err = el("p", { class: "bk-err", role: "alert", hidden: true });
    const field = (label, name, attrs) => el("label", { class: "bk-field" }, el("span", null, label), el("input", { name, ...attrs }));
    const form = el("form", { class: "spa-form" },
      field(T.name, "name", { required: true, maxlength: 100, autocomplete: "name" }),
      field(T.phone, "phone", { required: true, type: "tel", maxlength: 30, autocomplete: "tel" }),
      field(T.email, "email", { required: true, type: "email", maxlength: 200, autocomplete: "email" }),
      field(T.note, "note", { maxlength: 300 }),
      el("input", { name: "website", tabindex: "-1", autocomplete: "off", class: "spa-hp", "aria-hidden": "true" }),
      err, el("button", { type: "submit", class: "btn btn-primary btn-lg" }, T.send));
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      if (!state.slot) { err.textContent = T.pick; err.hidden = false; return; }
      const f = form.elements, btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const r = await post("book", { day: state.day, time: state.slot.time, people: state.people, name: f.name.value, phone: f.phone.value, email: f.email.value, note: f.note.value, website: f.website.value, lang });
        const again = el("button", { type: "button", class: "btn btn-ghost" }, T.another);
        again.addEventListener("click", () => { state.slot = null; load(); });
        box.replaceChildren(el("div", { class: "spa-done", role: "status" }, el("h3", null, T.ok),
          el("p", null, T.okText(r.code, `${fmt(r.day)}, ${r.time}–${r.end}, ${r.people} ${lang === "en" ? (r.people === 1 ? "person" : "people") : (r.people === 1 ? "persoană" : "persoane")}`)), again));
        box.scrollIntoView({ block: "center" });
      } catch (e) {
        err.textContent = e.message; err.hidden = false; btn.disabled = false;
        if (e.code === "spa_full" || e.code === "invalid_dates") { state.slot = null; setTimeout(load, 1500); }
      }
    });
    const note = d[`note_${lang}`] || d.note_ro;
    box.replaceChildren(
      el("div", { class: "spa-book-head" }, el("h3", null, T.title), el("p", null, T.sub), note ? el("p", { class: "spa-note" }, note) : null),
      el("div", { class: "spa-pick" }, el("label", { class: "bk-field" }, el("span", null, T.day), dayIn), el("label", { class: "bk-field" }, el("span", null, T.people), ppl)),
      el("p", { class: "spa-label" }, `${T.slots} · ${fmt(state.day)}`),
      slots.length ? el("div", { class: "spa-slots" }, slots) : el("p", { class: "spa-none" }, T.none),
      form);
    form.hidden = !slots.some((b) => !b.disabled);
  }
  load();
})();
