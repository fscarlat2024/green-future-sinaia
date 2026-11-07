// Panoul proprietarilor: rezervari, preturi, perioade blocate, calendare externe.
(function () {
  const root = document.getElementById("adm");
  const nav = document.getElementById("adm-nav");
  const KEY = "gf_admin_token";
  let token = null;
  try { token = localStorage.getItem(KEY); } catch {}

  const ERR = {
    bad_login: "Email sau parolă greșită.", too_many_requests: "Prea multe încercări. Reîncearcă în 15 minute.",
    calendar_conflict: "Perioada se suprapune cu o rezervare sau cu un calendar extern.", wrong_status: "Rezervarea și-a schimbat deja starea.",
    invalid_hours: "Completează ambele ore, diferite între ele, sau lasă-le goale pe amândouă.", category_not_empty: "Mută sau șterge întâi produsele din această categorie.", invalid_name: "Scrie numele.", need_photos: "Adaugă cel puțin 3 poze.", need_description: "Scrie descrierea apartamentului și salveaz-o.", too_many_photos: "Poți avea cel mult 20 de poze.", invalid_photo: "Fișierul nu e o poză validă.", photo_too_large: "Poza e prea mare.",
    invalid_phone: "Numărul de telefon nu pare corect.", invalid_dates: "Verifică datele: sfârșitul trebuie să fie după început, iar oferta valabilă cel puțin azi.", invalid_value: "Verifică valorile introduse.",
    price_required: "Pune un preț pe noapte înainte de a activa rezervările.", invalid_ical_url: "Linkul calendarului trebuie să înceapă cu https://.",
    forbidden: "Nu ai acces la acest apartament.", push_off: "Cheia pentru notificări nu e pusă pe server.",
  };
  const STATUS = { pending: "De confirmat", confirmed: "Confirmată", declined: "Refuzată", cancelled: "Anulată", expired: "Expirată" };

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
  // replaceChildren ar scrie "null" pe pagina pentru blocurile care lipsesc
  const fill = (...kids) => root.replaceChildren(...kids.filter((c) => c != null && c !== false));
  const date = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  async function api(path, method = "GET", body) {
    const r = await fetch(`/api/admin/${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "login") { logout(); throw new Error("Sesiunea a expirat."); }
    if (!r.ok) throw new Error(ERR[data.error] || "Operațiunea nu a reușit.");
    return data;
  }
  const guarded = (fn) => async (...args) => {
    try { await fn(...args); } catch (e) { alert(e.message); }
  };

  function logout() {
    token = null;
    try { localStorage.removeItem(KEY); } catch {}
    window.gfRegisterPush?.(); // telefonul nu mai primeste alertele de proprietar
    nav.hidden = true;
    renderLogin();
  }

  function renderLogin(message) {
    if (window.GF_NATIVE) { location.replace("/cont/"); return; } // in aplicatie exista un singur ecran de cont
    const err = h("p", { class: "bk-err", role: "alert", hidden: !message }, message || "");
    fill(h("form", { class: "adm-card adm-login", on: { submit: async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.currentTarget);
      err.hidden = true;
      try {
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
        const data = await r.json();
        if (!r.ok) throw new Error(ERR[data.error] || "Autentificarea nu a reușit.");
        token = data.token;
        try { localStorage.setItem(KEY, token); } catch {}
        window.gfRegisterPush?.();
        start();
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    } } },
      h("h1", null, "Intră în panou"),
      h("label", { class: "bk-field" }, h("span", null, "Email"), h("input", { name: "email", type: "email", required: true, autocomplete: "username" })),
      h("label", { class: "bk-field" }, h("span", null, "Parolă"), h("input", { name: "password", type: "password", required: true, autocomplete: "current-password" })),
      err,
      h("button", { class: "btn btn-primary btn-lg", type: "submit" }, "Intră")));
  }

  // ---------- acasa ----------
  const lei = (n) => `${Number(n).toLocaleString("ro-RO")} lei`;
  const STAFF_LABEL = { cleaner: "Sună femeia de serviciu", technician: "Sună tehnicianul", laundry: "Sună spălătoria" };
  async function renderHome() {
    const d = await api("dashboard");
    const count = d.properties.length || 1;
    const occupancy = Math.round(d.properties.reduce((sum, p) => sum + p.occupancy, 0) / count);
    const revenue = d.properties.reduce((sum, p) => sum + p.revenue, 0);
    const prev = d.properties.reduce((sum, p) => sum + p.prevRevenue, 0);
    const monthName = new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("ro-RO", { month: "long", year: "numeric", timeZone: "UTC" });
    const kpi = (value, label, tab) => h(tab ? "button" : "div", { class: "pn-kpi", ...(tab ? { type: "button", on: { click: () => openTab(tab) } } : {}) }, h("b", null, value), h("span", null, label));
    const call = (key) => (d.contacts[key]
      ? h("a", { class: "pn-action", href: `tel:${d.contacts[key].replace(/[^+\d]/g, "")}` }, STAFF_LABEL[key])
      : h("span", { class: "pn-action is-off" }, STAFF_LABEL[key], h("small", null, "Număr nesetat")));
    const row = (p) => h("div", { class: "pn-apt" },
      h("div", { class: "adm-bk-top" }, h("b", null, p.name), h("b", null, lei(p.revenue))),
      h("div", { class: "pn-bar", role: "img", "aria-label": `Ocupare ${p.occupancy}%` }, h("i", { style: `width:${p.occupancy}%` })),
      h("small", null, `${p.occupancy}% ocupare · ${p.nights} din ${d.days} nopți · luna trecută ${lei(p.prevRevenue)}`));
    // administratorul vede apartamentele grupate pe proprietar; proprietarul doar pe ale lui
    const groups = new Map();
    for (const p of d.properties) {
      const key = isAdmin ? (p.owners.join(", ") || "Fără proprietar setat") : "Apartamentele mele";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Acasă"), h("p", null, monthName)),
      h("div", { class: "pn-kpis" },
        kpi(`${occupancy}%`, "grad de ocupare"), kpi(lei(revenue), "venit din platformă"),
        kpi(String(d.pending), d.pending === 1 ? "rezervare de confirmat" : "rezervări de confirmat", "bookings"), kpi(String(d.unread), d.unread === 1 ? "mesaj necitit" : "mesaje necitite", "chats")),
      h("p", { class: "pn-note" }, `Luna trecută: ${lei(prev)} din platformă. Venitul include doar rezervările directe, pentru că Booking și Airbnb nu transmit prețuri în calendar. Ocuparea le include și pe ale lor.`),
      h("div", { class: "pn-actions" }, call("cleaner"), call("technician"), call("laundry"),
        h("button", { type: "button", class: "pn-action is-main", on: { click: () => openTab("chats") } }, "Chat cu chiriașii", d.unread ? h("span", { class: "chat-badge" }, String(d.unread)) : null)),
      ...[...groups].map(([title, list]) => h("section", { class: "adm-card pn-group" }, h("h2", null, title), list.map(row))),
      h("section", { class: "adm-card pn-group" }, h("h2", null, "Următorii oaspeți"),
        d.upcoming.length ? d.upcoming.map((b) => h("div", { class: "adm-bk-top pn-next" },
          h("div", null, h("b", null, b.guest_name), h("small", null, `${date(b.checkin)} – ${date(b.checkout)} · ${b.property_name}`)),
          h("span", { class: `mg-status is-${b.status}` }, STATUS[b.status]))) : h("p", null, "Nicio rezervare directă viitoare.")));
    const badge = nav.querySelector('[data-tab="chats"] .pn-dot');
    if (badge) { badge.textContent = d.unread || ""; badge.hidden = !d.unread; }
  }

  // ---------- mai mult (telefon) ----------
  function renderMore() {
    const extra = TAB_LIST().filter((t) => !t.main);
    fill(h("div", { class: "adm-head" }, h("h1", null, "Mai mult")),
      h("div", { class: "pn-hub" }, extra.map((t) => h("button", { type: "button", on: { click: () => openTab(t.tab) } }, h("b", null, t.label), h("span", null, t.hint))),
        h("a", { href: "/" }, h("b", null, "Site-ul"), h("span", null, "Înapoi la Green Future")),
        h("button", { type: "button", on: { click: guarded(async () => { await api("logout", "POST"); logout(); }) } }, h("b", null, "Ieșire"), h("span", null, "Din panou"))));
  }

  // ---------- recenzii ----------
  async function renderReviews() {
    const { reviews } = await api("reviews");
    const shown = reviews.filter((r) => !r.hidden);
    const avg = shown.length ? (shown.reduce((sum, r) => sum + r.score, 0) / shown.length).toFixed(1) : null;
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Recenzii"), h("p", null, avg ? `Media ${avg} din ${shown.length} recenzii vizibile.` : "Nu există recenzii încă.")),
      h("p", { class: "pn-note" }, "Emailul pleacă a doua zi după plecare, pentru rezervările directe confirmate."),
      reviews.length ? h("div", { class: "adm-list" }, reviews.map((r) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, `${r.score}/10 · ${r.author}`), r.hidden ? h("span", { class: "mg-status is-cancelled" }, "Ascunsă") : null),
        h("p", null, `${r.property_name} · ${date(r.checkin)} – ${date(r.checkout)} · ${r.code}`),
        r.body ? h("p", { class: "adm-note" }, r.body) : null,
        isAdmin ? h("div", { class: "adm-actions" }, h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { await api(`reviews/${r.id}`, "POST", { hidden: !r.hidden }); renderReviews(); }) } }, r.hidden ? "Afișează" : "Ascunde")) : null))) : null);
  }

  // ---------- contacte echipa ----------
  async function renderContacts() {
    const { contacts } = await api("contacts");
    const say = h("p", { role: "status" });
    const field = (key, label) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name: key, type: "tel", value: contacts[key] || "", maxlength: 25, autocomplete: "off" }));
    fill(h("div", { class: "adm-head" }, h("h1", null, "Echipa"), h("p", null, "Numerele apar ca butoane de apel la toți proprietarii.")),
      h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
        ev.preventDefault();
        await api("contacts", "POST", Object.fromEntries(new FormData(ev.currentTarget).entries()));
        say.textContent = "Salvat.";
      }) } }, field("cleaner", "Femeia de serviciu"), field("technician", "Tehnician"), field("laundry", "Spălătorie"), say,
        h("button", { class: "btn btn-primary", type: "submit" }, "Salvează")));
  }

  // ---------- rezervari ----------
  async function renderBookings() {
    const { bookings } = await api("bookings");
    const act = (b, action, label, cls, ask) => h("button", { type: "button", class: `btn ${cls}`, on: { click: guarded(async () => {
      if (ask && !confirm(ask)) return;
      await api(`bookings/${b.id}/${action}`, "POST");
      renderBookings();
    }) } }, label);
    const pending = bookings.filter((b) => b.status === "pending").length;
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Rezervări"), h("p", null, pending ? `${pending} de confirmat. Cererile fără răspuns expiră după 24 de ore.` : "Nimic de confirmat.")),
      bookings.length ? h("div", { class: "adm-list" }, bookings.map((b) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, b.guest_name), h("span", { class: `mg-status is-${b.status}` }, STATUS[b.status] || b.status)),
        h("p", null, `${b.property_name} · ${date(b.checkin)} – ${date(b.checkout)} · ${b.adults + b.children} oaspeți · ${b.total} lei${b.discount ? ` (reducere club ${b.discount} lei)` : ""}`),
        h("p", null, h("a", { href: `tel:${b.guest_phone.replace(/[^+\d]/g, "")}` }, b.guest_phone), " · ", h("a", { href: `mailto:${b.guest_email}` }, b.guest_email), ` · ${b.code}`),
        b.note ? h("p", { class: "adm-note" }, b.note) : null,
        h("div", { class: "adm-actions" },
          b.status === "pending" ? act(b, "confirm", "Confirmă", "btn-primary") : null,
          b.status === "pending" ? act(b, "decline", "Refuză", "btn-ghost", "Refuzi această rezervare? Oaspetele primește un email.") : null,
          b.status === "confirmed" ? act(b, "cancel", "Anulează", "btn-ghost", "Anulezi această rezervare confirmată? Oaspetele primește un email.") : null)))) : h("p", { class: "adm-card" }, "Nu există rezervări încă."));
  }

  // ---------- anunt in aplicatie ----------
  async function renderPush() {
    const { devices, enabled } = await api("push");
    const status = h("p", { role: "status" });
    const send = async (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      const f = new FormData(form);
      if (!confirm(`Trimiți anunțul pe ${devices} telefoane? Nu poate fi retras.`)) return;
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      status.textContent = "Se trimite...";
      let sent = 0, failed = 0, after = "";
      try {
        do {
          const r = await api("push", "POST", { title: f.get("title"), body: f.get("body"), url: f.get("url"), after });
          sent += r.sent; failed += r.failed; after = r.next;
        } while (after);
        status.textContent = `Trimis: ${sent}${failed ? `, nereușite: ${failed}` : ""}.`;
        form.reset();
      } catch (e) { status.textContent = e.message; }
      btn.disabled = false;
    };
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Anunț în aplicație"), h("p", null, `${devices} telefoane cu aplicația.`)),
      h("form", { class: "adm-card adm-login", on: { submit: send } },
        enabled ? null : h("p", { class: "bk-err" }, "Cheia pentru notificări nu e pusă pe server."),
        h("label", { class: "bk-field" }, h("span", null, "Titlu"), h("input", { name: "title", required: true, maxlength: 80 })),
        h("label", { class: "bk-field" }, h("span", null, "Mesaj"), h("textarea", { name: "body", rows: 3, maxlength: 240 })),
        h("label", { class: "bk-field" }, h("span", null, "Pagina deschisă la apăsare"), h("select", { name: "url" }, [["/", "Prima pagină"], ["/#apartamente", "Apartamente"], ["/restaurant/", "Bistro"], ["/abonamente/", "Abonamente"]].map(([v, t]) => h("option", { value: v }, t)))),
        status,
        h("button", { class: "btn btn-primary btn-lg", type: "submit", disabled: !enabled || !devices }, "Trimite")));
  }

  // ---------- comenzi restaurant ----------
  const ORDER_STATUS = { new: "Nouă", confirmed: "Confirmată", delivered: "Livrată", cancelled: "Anulată" };
  let orderTimer = null, orderSig = "", orderIds = null, audio = null;
  const stopOrders = () => { clearInterval(orderTimer); orderTimer = null; orderIds = null; };
  // telefonul si browserul lasa sunetul sa porneasca doar dupa o atingere
  document.addEventListener("pointerdown", () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {} });
  function beep() {
    if (!audio || audio.state !== "running") return;
    [0, .22].forEach((at) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(.18, audio.currentTime + at);
      g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + at + .18);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + at);
      o.stop(audio.currentTime + at + .2);
    });
  }
  async function renderOrders(poll) {
    const { orders } = await api("orders");
    const sig = JSON.stringify(orders.map((o) => [o.id, o.status]));
    const fresh = orders.filter((o) => o.status === "new").map((o) => o.id);
    if (orderIds && fresh.some((id) => !orderIds.includes(id))) beep();
    orderIds = fresh;
    if (poll === true && sig === orderSig) return;
    orderSig = sig;
    if (!orderTimer) orderTimer = setInterval(() => renderOrders(true).catch(() => {}), 20000);
    const act = (o, action, label, cls) => h("button", { type: "button", class: `btn ${cls}`, on: { click: guarded(async () => {
      await api(`orders/${o.id}/${action}`, "POST");
      renderOrders();
    }) } }, label);
    const open = orders.filter((o) => o.status === "new").length;
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Comenzi la cameră"), h("p", null, open ? `${open} comenzi noi.` : "Nicio comandă nouă.")),
      h("p", { class: "pn-note" }, "Lista se actualizează singură. Lasă pagina deschisă și atinge ecranul o dată ca să se audă sunetul la comenzile noi."),
      orders.length ? h("div", { class: "adm-list" }, orders.map((o) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, `Ap. ${o.apartment} · ${o.guest_name}`), h("span", { class: `mg-status is-${{ new: "pending", confirmed: "confirmed", delivered: "confirmed", cancelled: "cancelled" }[o.status]}` }, ORDER_STATUS[o.status] || o.status)),
        h("p", null, o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")),
        h("p", null, h("b", null, `${o.total} lei`), `${o.discount ? ` (reducere club ${o.discount} lei)` : ""} pe nota camerei · `, h("a", { href: `tel:${o.guest_phone.replace(/[^+\d]/g, "")}` }, o.guest_phone), ` · ${o.code}${o.demo ? " · TEST" : ""}`),
        o.note ? h("p", { class: "adm-note" }, o.note) : null,
        h("div", { class: "adm-actions" },
          o.status === "new" ? act(o, "confirm", "Confirmă", "btn-primary") : null,
          o.status === "confirmed" ? act(o, "deliver", "Marchează livrată", "btn-primary") : null,
          o.status === "new" || o.status === "confirmed" ? act(o, "cancel", "Anulează", "btn-ghost") : null)))) : h("p", { class: "adm-card" }, "Nu există comenzi încă."));
  }

  // ---------- meniul bistroului ----------
  async function renderMenu(openCat) {
    const m = await api("menu");
    const row = (...kids) => h("div", { class: "adm-row" }, kids);
    const text = (label, name, value, attrs) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name, value: value ?? "", ...attrs }));
    const area = (label, name, value) => { const t = h("textarea", { name, rows: 2, maxlength: 500 }); t.value = value ?? ""; return h("label", { class: "bk-field" }, h("span", null, label), t); };
    const hours = h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.currentTarget);
      await api("menu/settings", "PATCH", { from: f.get("from"), to: f.get("to") });
      renderMenu(openCat);
    }) } }, h("h2", null, "Program comenzi"),
      h("p", null, m.settings.from ? (m.open ? "Acum se primesc comenzi." : "Acum nu se primesc comenzi.") : "Fără program: comenzile se primesc oricând."),
      row(text("De la", "from", m.settings.from, { type: "time" }), text("Până la", "to", m.settings.to, { type: "time" })),
      h("button", { class: "btn btn-primary", type: "submit" }, "Salvează programul"));
    const editItem = (item, categoryId) => {
      const isNew = !item;
      const i = item || {};
      const del = h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => {
        if (!confirm("Ștergi produsul din meniu? Comenzile vechi rămân.")) return;
        await api(`menu/items/${i.id}`, "DELETE");
        renderMenu(i.category_id);
      }) } }, "Șterge produsul");
      const photoSay = h("p", { role: "status" });
      const photo = isNew ? null : h("section", { class: "adm-card" }, h("h2", null, "Poză"),
        i.photo ? h("img", { class: "mn-photo", src: i.photo, alt: "" }) : h("p", null, "Fără poză."),
        h("input", { type: "file", accept: "image/*", "aria-label": "Alege o poză", on: { change: guarded(async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          photoSay.textContent = "Se încarcă...";
          const blob = await shrink(file);
          const r = await fetch(`/api/admin/menu/items/${i.id}/photo`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" }, body: blob });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(ERR[data.error] || "Poza nu a putut fi încărcată.");
          const fresh = (await api("menu")).items.find((x) => x.id === i.id);
          editItem(fresh, fresh.category_id);
        }) } }), photoSay,
        i.photo ? h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => {
          await api(`menu/items/${i.id}/photo`, "DELETE");
          const fresh = (await api("menu")).items.find((x) => x.id === i.id);
          editItem(fresh, fresh.category_id);
        }) } }, "Scoate poza") : null);
      fill(h("button", { type: "button", class: "bk-back", on: { click: guarded(() => renderMenu(categoryId)) } }, "‹ Înapoi la meniu"),
        h("div", { class: "adm-head" }, h("h1", null, isNew ? "Produs nou" : i.name_ro)),
        h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          const body = Object.fromEntries(f.entries());
          body.active = f.get("active") === "on";
          body.price = Number(body.price);
          if (isNew) await api("menu/items", "POST", body); else await api(`menu/items/${i.id}`, "PATCH", body);
          renderMenu(body.categoryId);
        }) } },
          h("label", { class: "bk-field" }, h("span", null, "Categorie"), h("select", { name: "categoryId", required: true }, m.categories.map((c) => h("option", { value: c.id, selected: c.id === (i.category_id || categoryId) }, c.name_ro)))),
          text("Nume în română", "nameRo", i.name_ro, { required: true, maxlength: 120 }),
          text("Nume în engleză (opțional)", "nameEn", i.name_en === i.name_ro ? "" : i.name_en, { maxlength: 120 }),
          text("Preț (lei)", "price", i.price, { type: "number", min: 1, max: 100000, step: 1, required: true, inputmode: "numeric" }),
          area("Descriere în română", "descRo", i.desc_ro), area("Descriere în engleză", "descEn", i.desc_en),
          area("Alergeni în română", "allergensRo", i.allergens_ro), area("Alergeni în engleză", "allergensEn", i.allergens_en),
          h("p", { class: "pn-note" }, "Verifică alergenii cu bucătăria. Ce scrii aici văd oaspeții înainte să comande."),
          h("label", { class: "bk-check" }, h("input", { type: "checkbox", name: "active", checked: isNew || !!i.active }), h("span", null, "Apare în meniu")),
          h("button", { class: "btn btn-primary", type: "submit" }, isNew ? "Adaugă produsul" : "Salvează")),
        photo, isNew ? null : del);
      window.scrollTo(0, 0);
    };
    const item = (i, list, n) => h("article", { class: `adm-card mn-item${i.active ? "" : " is-off"}` },
      h("div", { class: "adm-bk-top" }, h("b", null, i.name_ro), h("span", null, `${i.price} lei`)),
      i.active ? null : h("p", { class: "pn-note" }, "Nu apare în meniu"),
      h("div", { class: "adm-actions" },
        h("button", { type: "button", class: `btn ${i.soldOut ? "btn-primary" : "btn-ghost"}`, on: { click: guarded(async () => { await api(`menu/items/${i.id}/soldout`, "POST", { on: !i.soldOut }); renderMenu(i.category_id); }) } }, i.soldOut ? "Epuizat azi: reactivează" : "Epuizat azi"),
        h("button", { type: "button", class: "btn btn-ghost", on: { click: () => editItem(i, i.category_id) } }, "Editează"),
        n > 0 ? h("button", { type: "button", class: "btn btn-ghost", "aria-label": `Mută mai sus ${i.name_ro}`, on: { click: guarded(async () => { await api(`menu/items/${i.id}/move`, "POST", { dir: "up" }); renderMenu(i.category_id); }) } }, "↑") : null,
        n < list.length - 1 ? h("button", { type: "button", class: "btn btn-ghost", "aria-label": `Mută mai jos ${i.name_ro}`, on: { click: guarded(async () => { await api(`menu/items/${i.id}/move`, "POST", { dir: "down" }); renderMenu(i.category_id); }) } }, "↓") : null));
    const cats = m.categories.map((c, n) => {
      const items = m.items.filter((i) => i.category_id === c.id);
      const rename = h("form", { class: "adm-inline", hidden: true, on: { submit: guarded(async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.currentTarget);
        await api(`menu/categories/${c.id}`, "PATCH", { nameRo: f.get("nameRo"), nameEn: f.get("nameEn") });
        renderMenu(c.id);
      }) } }, text("Nume în română", "nameRo", c.name_ro, { required: true, maxlength: 80 }), text("Nume în engleză", "nameEn", c.name_en, { maxlength: 80 }), h("button", { class: "btn btn-primary", type: "submit" }, "Salvează categoria"));
      return h("details", { class: "adm-card mn-cat", open: c.id === openCat ? true : null },
        h("summary", null, h("b", null, c.name_ro), h("span", null, `${items.length} produse`)),
        h("div", { class: "adm-actions" },
          h("button", { type: "button", class: "btn btn-primary", on: { click: () => editItem(null, c.id) } }, "Adaugă produs"),
          h("button", { type: "button", class: "btn btn-ghost", on: { click: () => { rename.hidden = !rename.hidden; } } }, "Redenumește"),
          n > 0 ? h("button", { type: "button", class: "btn btn-ghost", "aria-label": `Mută mai sus ${c.name_ro}`, on: { click: guarded(async () => { await api(`menu/categories/${c.id}/move`, "POST", { dir: "up" }); renderMenu(c.id); }) } }, "↑") : null,
          n < m.categories.length - 1 ? h("button", { type: "button", class: "btn btn-ghost", "aria-label": `Mută mai jos ${c.name_ro}`, on: { click: guarded(async () => { await api(`menu/categories/${c.id}/move`, "POST", { dir: "down" }); renderMenu(c.id); }) } }, "↓") : null,
          items.length ? null : h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { if (confirm("Ștergi categoria goală?")) { await api(`menu/categories/${c.id}`, "DELETE"); renderMenu(); } }) } }, "Șterge categoria")),
        rename, items.map((i, k) => item(i, items, k)));
    });
    const add = h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.currentTarget);
      const { id } = await api("menu/categories", "POST", { nameRo: f.get("nameRo"), nameEn: f.get("nameEn") });
      renderMenu(id);
    }) } }, h("h2", null, "Categorie nouă"), row(text("Nume în română", "nameRo", "", { required: true, maxlength: 80 }), text("Nume în engleză (opțional)", "nameEn", "", { maxlength: 80 })), h("button", { class: "btn btn-ghost", type: "submit" }, "Adaugă categoria"));
    fill(h("div", { class: "adm-head" }, h("h1", null, "Meniu"), h("p", null, `${m.items.length} produse. Modificările apar imediat pe site și în aplicație.`)), hours, ...cats, add);
  }

  // ---------- mesaje ----------
  let chatTimer = null;
  const stopChat = () => { clearInterval(chatTimer); chatTimer = null; };
  const when = (ms) => new Date(ms).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  async function renderChats() {
    stopChat();
    const { chats } = await api("chats");
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Mesaje"), h("p", null, chats.some((c) => c.unread) ? "Ai mesaje necitite." : "Nimic necitit.")),
      chats.length ? h("div", { class: "adm-list" }, chats.map((c) => h("button", { type: "button", class: "adm-card acc-chat adm-chat-row", on: { click: guarded(() => renderThread(c.id)) } },
        h("div", { class: "adm-bk-top" }, h("b", null, c.guest_name), c.unread ? h("span", { class: "chat-badge" }, `${c.unread} noi`) : null),
        h("span", null, c.property_name), h("span", null, c.last)))) : h("p", { class: "adm-card" }, "Nu există mesaje încă."));
  }
  async function renderThread(id) {
    stopChat();
    const list = h("div", { class: "chat-list", role: "log", "aria-live": "polite" });
    const err = h("p", { class: "bk-err", role: "alert", hidden: true });
    const input = h("textarea", { rows: 2, maxlength: 1000, placeholder: "Scrie răspunsul", "aria-label": "Răspuns" });
    let shown = -1;
    const load = async () => {
      const t = await api(`chats/${id}`);
      title.textContent = `${t.guestName}, ${t.propertyName}`;
      if (t.messages.length === shown) return;
      shown = t.messages.length;
      list.replaceChildren(...t.messages.map((m) => h("div", { class: `msg ${m.sender === "owner" ? "me" : "them"}` }, h("span", null, m.body), h("small", null, when(m.created_at)))));
      list.scrollTop = list.scrollHeight;
    };
    const title = h("b");
    fill(h("div", { class: "chat adm-thread" },
      h("header", { class: "chat-head" }, h("button", { type: "button", class: "chat-back", "aria-label": "Înapoi", on: { click: guarded(renderChats) } }, "‹"), title),
      list, err,
      h("form", { class: "chat-form", on: { submit: async (ev) => {
        ev.preventDefault();
        const body = input.value.trim();
        if (!body) return;
        err.hidden = true;
        try { await api(`chats/${id}`, "POST", { body }); input.value = ""; await load(); }
        catch (e) { err.textContent = e.message; err.hidden = false; }
      } } }, input, h("button", { type: "submit", class: "btn btn-primary" }, "Trimite"))));
    await load();
    chatTimer = setInterval(() => load().catch(() => {}), 6000);
  }

  // ---------- oaspeti cu cont ----------
  const LEVEL = { member: "Membru", silver: "Silver", gold: "Gold" };
  async function renderGuests() {
    const { guests } = await api("guests");
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Oaspeți"), h("p", null, `${guests.length} conturi în Green Future Club.`)),
      guests.length ? h("div", { class: "adm-list" }, guests.map((g) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, g.name), h("span", { class: "mg-status" }, LEVEL[g.level])),
        h("p", null, h("a", { href: `mailto:${g.email}` }, g.email), " · ", h("a", { href: `tel:${g.phone.replace(/[^+\d]/g, "")}` }, g.phone)),
        h("p", null, `${g.stays} sejururi încheiate · ${g.orders} comenzi livrate`),
        h("label", { class: "bk-field" }, h("span", null, "Nivel"), h("select", { on: { change: guarded(async (e) => { await api(`guests/${g.id}`, "POST", { level: e.target.value }); renderGuests(); }) } },
          [["auto", "Automat"], ["member", "Membru"], ["silver", "Silver"], ["gold", "Gold"]].map(([v, t]) => h("option", { value: v, selected: (g.level_override || "auto") === v }, t))))))) : h("p", { class: "adm-card" }, "Nu există conturi încă."));
  }

  // ---------- oferte ----------
  async function renderOffers() {
    const [{ offers, push }, { guests }] = await Promise.all([api("offers"), api("guests")]);
    const KIND = { stay: "Sejur", bistro: "Bistro", info: "Doar informare" };
    const who = (o) => (o.guestName ? o.guestName : { all: "Toți oaspeții", member: "Membri", silver: "Silver", gold: "Gold" }[o.audience] || "Oaspete șters");
    const notify = async (id, say) => {
      let sent = 0, failed = 0, after = "";
      do {
        const r = await api(`offers/${id}/notify`, "POST", { after });
        sent += r.sent; failed += r.failed; after = r.next;
      } while (after);
      say.textContent = sent || failed ? `Notificări trimise: ${sent}${failed ? `, nereușite: ${failed}` : ""}.` : "Niciun telefon cu aplicația nu e autentificat în acest public.";
    };
    const today = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const status = h("p", { role: "status" });
    const form = h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.currentTarget);
      const { id } = await api("offers", "POST", { title: f.get("title"), body: f.get("body"), audience: f.get("audience"), kind: f.get("kind"), pct: f.get("kind") === "info" ? 0 : Number(f.get("pct")), validTo: f.get("validTo") });
      await renderOffers();
    }) } },
      h("h2", null, "Ofertă nouă"),
      h("p", null, "Scrie {nume} ca să apară prenumele oaspetelui în cont. Oferta se folosește o singură dată, iar reducerea nu se adună cu cea de nivel. La sejur se aplică doar apartamentelor care participă la club."),
      h("label", { class: "bk-field" }, h("span", null, "Titlu"), h("input", { name: "title", required: true, maxlength: 80, placeholder: "{nume}, revino în Sinaia" })),
      h("label", { class: "bk-field" }, h("span", null, "Text"), h("textarea", { name: "body", rows: 3, required: true, maxlength: 400 })),
      h("div", { class: "adm-row" },
        h("label", { class: "bk-field" }, h("span", null, "Pentru cine"), h("select", { name: "audience" },
          h("option", { value: "all" }, "Toți oaspeții"), h("option", { value: "member" }, "Membri"), h("option", { value: "silver" }, "Silver"), h("option", { value: "gold" }, "Gold"),
          guests.map((g) => h("option", { value: `guest:${g.id}` }, `${g.name} (${g.email})`)))),
        h("label", { class: "bk-field" }, h("span", null, "Tip"), h("select", { name: "kind" }, h("option", { value: "stay" }, "Reducere la sejur"), h("option", { value: "bistro" }, "Reducere la bistro"), h("option", { value: "info" }, "Doar informare"))),
        h("label", { class: "bk-field" }, h("span", null, "Reducere (%)"), h("input", { name: "pct", type: "number", min: 1, max: 50, value: 15 })),
        h("label", { class: "bk-field" }, h("span", null, "Valabilă până la"), h("input", { name: "validTo", type: "date", required: true, value: today }))),
      h("button", { class: "btn btn-primary", type: "submit" }, "Creează oferta"));
    fill(
      h("div", { class: "adm-head" }, h("h1", null, "Oferte"), h("p", null, "Oaspeții le văd în tabul Cont.")),
      form, status,
      offers.length ? h("div", { class: "adm-list" }, offers.map((o) => {
        const say = h("p", { role: "status" });
        return h("article", { class: "adm-card adm-booking" },
          h("div", { class: "adm-bk-top" }, h("b", null, o.title), h("span", { class: `mg-status ${o.active ? "is-confirmed" : "is-cancelled"}` }, o.active ? "Activă" : "Oprită")),
          h("p", null, o.body),
          h("p", null, `${who(o)} · ${KIND[o.kind]}${o.pct ? ` -${o.pct}%` : ""} · până la ${date(o.valid_to)} · folosită de ${o.used} ori`),
          o.active ? h("div", { class: "adm-actions" },
            h("button", { type: "button", class: "btn btn-primary", disabled: !push, on: { click: guarded(async () => { if (confirm("Trimiți notificarea? Nu poate fi retrasă.")) await notify(o.id, say); }) } }, "Trimite notificare"),
            h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { if (confirm("Oprești oferta?")) { await api(`offers/${o.id}/stop`, "POST"); renderOffers(); } }) } }, "Oprește")) : null,
          say);
      })) : h("p", { class: "adm-card" }, "Nu există oferte încă."));
  }

  // ---------- apartament nou si prezentare ----------
  const listingFields = (p) => [
    h("label", { class: "bk-field" }, h("span", null, "Numele apartamentului"), h("input", { name: "name", required: true, maxlength: 60, value: p?.name || "" })),
    h("div", { class: "adm-row" },
      h("label", { class: "bk-field" }, h("span", null, "Câte persoane"), h("input", { name: "capacity", type: "number", min: 1, max: 30, required: true, value: p?.capacity || 2 })),
      h("label", { class: "bk-field" }, h("span", null, "Tip (ex. garsonieră, 2 camere)"), h("input", { name: "roomType", maxlength: 60, value: p?.roomType || "" }))),
    h("label", { class: "bk-field" }, h("span", null, "O frază scurtă"), h("input", { name: "tagline", maxlength: 160, value: p?.tagline || "" })),
    (() => { const t = h("textarea", { name: "story", rows: 4, maxlength: 1200, placeholder: "De ce ai amenajat locul așa? Ce simte cineva când intră aici?" }); t.value = p?.story || ""; return h("label", { class: "bk-field" }, h("span", null, "Povestea apartamentului (apare într-un chenar auriu)"), t); })(),
    (() => { const t = h("textarea", { name: "description", rows: 6, maxlength: 4000 }); t.value = p?.description || ""; return h("label", { class: "bk-field" }, h("span", null, "Descriere"), t); })(),
    (() => { const t = h("textarea", { name: "amenities", rows: 6, maxlength: 2000, placeholder: "Wi-Fi\nBucătărie utilată\nBalcon" }); t.value = (p?.amenities || []).join("\n"); return h("label", { class: "bk-field" }, h("span", null, "Facilități, câte una pe rând"), t); })(),
  ];
  const listingBody = (form) => {
    const f = new FormData(form);
    return { name: f.get("name"), capacity: Number(f.get("capacity")), roomType: f.get("roomType"), tagline: f.get("tagline"), description: f.get("description"), story: f.get("story"), amenities: String(f.get("amenities")).split("\n") };
  };
  function renderNewListing() {
    fill(h("div", { class: "adm-head" }, h("h1", null, "Apartament nou")),
      h("p", null, "Îl poți completa pe rând. Apare pe site abia după ce îl trimiți și e aprobat."),
      h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
        ev.preventDefault();
        const { slug } = await api("properties", "POST", listingBody(ev.currentTarget));
        await renderSettings(slug);
      }) } }, listingFields(), h("button", { class: "btn btn-primary", type: "submit" }, "Continuă cu pozele")));
  }
  // micsoreaza poza in browser, ca sa incapa si sa se incarce repede pe telefon
  async function shrink(file) {
    // data: e permis de CSP (img-src 'self' data:), blob: nu
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
  }
  async function listingEditor(p, slug, reload) {
    const { photos } = await api(`properties/${slug}/photos`);
    const say = h("p", { role: "status" });
    const input = h("input", { type: "file", accept: "image/*", multiple: true, "aria-label": "Alege poze", on: { change: guarded(async (ev) => {
      const files = [...ev.target.files];
      let done = 0;
      for (const file of files) {
        say.textContent = `Se încarcă ${done + 1} din ${files.length}...`;
        const blob = await shrink(file).catch(() => null);
        if (!blob) throw new Error(`Nu pot citi poza ${file.name}.`);
        const r = await fetch(`/api/admin/properties/${slug}/photos`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" }, body: blob });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(ERR[data.error] || "Poza nu a putut fi încărcată.");
        done++;
      }
      await reload();
    }) } });
    const grid = h("div", { class: "pn-photos" }, photos.map((ph, i) => h("figure", null, h("img", { src: ph.url, alt: "", loading: "lazy" }),
      h("figcaption", null,
        i === 0 ? h("span", null, "Prima") : h("button", { type: "button", on: { click: guarded(async () => { await api(`photos/${ph.id}/first`, "POST"); await reload(); }) } }, "Prima"),
        h("button", { type: "button", on: { click: guarded(async () => { if (confirm("Ștergi poza?")) { await api(`photos/${ph.id}`, "DELETE"); await reload(); } }) } }, "Șterge")))));
    const details = h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      await api(`properties/${slug}/listing`, "PATCH", listingBody(ev.currentTarget));
      await reload();
    }) } }, h("h2", null, "Prezentare"), listingFields(p), h("button", { class: "btn btn-primary", type: "submit" }, "Salvează prezentarea"));
    const act = (path, label, cls) => h("button", { type: "button", class: `btn ${cls}`, on: { click: guarded(async () => { await api(`properties/${slug}/${path}`, "POST"); await reload(); }) } }, label);
    const publish = h("section", { class: "adm-card" }, h("h2", null, "Publicare"),
      h("p", null, "Ai nevoie de cel puțin 3 poze, descriere și preț pe noapte. Pentru rezervări, bifează și „Rezervările sunt active pe site”."),
      h("div", { class: "adm-actions" },
        p.status === "published" ? null : act("submit", isAdmin ? "Publică" : p.status === "pending" ? "Trimis, așteaptă aprobarea" : "Trimite spre aprobare", "btn-primary"),
        isAdmin && p.status === "pending" ? act("approve", "Aprobă", "btn-primary") : null,
        isAdmin && p.status === "published" ? act("unpublish", "Scoate de pe site", "btn-ghost") : null));
    return h("div", { class: "adm-main pn-listing" }, h("section", { class: "adm-card" }, h("h2", null, `Poze (${photos.length}/20)`), h("p", null, "Prima poză apare în listă."), grid, input, say), details, publish);
  }

  // ---------- apartamente ----------
  async function renderSettings(slug) {
    const me = await api("me");
    if (!me.properties.length) { renderNewListing(); return; }
    slug = slug || me.properties[0].slug;
    const data = await api(`properties/${slug}`);
    const p = data.property;
    const input = (label, name, value, attrs) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name, value: value ?? "", ...attrs }));
    const check = (label, name, on) => h("label", { class: "bk-check" }, h("input", { type: "checkbox", name, checked: !!on }), h("span", null, label));
    const reload = () => renderSettings(slug);

    const settings = h("form", { class: "adm-card adm-form", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.currentTarget);
      await api(`properties/${slug}`, "PATCH", {
        active: f.get("active") === "on", instantBook: f.get("instantBook") === "on", loyalty: f.get("loyalty") === "on", icalPaused: f.get("icalPaused") === "on",
        basePrice: f.get("basePrice") === "" ? null : Number(f.get("basePrice")), cleaningFee: Number(f.get("cleaningFee") || 0),
        capacity: Number(f.get("capacity")), minNights: Number(f.get("minNights")), freeCancelDays: Number(f.get("freeCancelDays")),
        checkinTime: f.get("checkinTime"), checkoutTime: f.get("checkoutTime"),
        ownerEmail: f.get("ownerEmail"), ownerPhone: f.get("ownerPhone"), icalImportUrl: f.get("icalImportUrl"),
      });
      reload();
    }) } },
      h("h2", null, "Setări"),
      check("Rezervările sunt active pe site", "active", p.active),
      check("Confirmare pe loc, fără aprobarea proprietarului", "instantBook", p.instantBook),
      check("Particip la Green Future Club: oaspeții Silver primesc 5%, iar cei Gold 10% din prețul nopților, din încasarea proprietarului", "loyalty", p.loyalty),
      h("div", { class: "adm-row" },
        input("Preț pe noapte (lei)", "basePrice", p.basePrice, { type: "number", min: "1" }),
        input("Curățenie (lei)", "cleaningFee", p.cleaningFee, { type: "number", min: "0" }),
        input("Oaspeți maxim", "capacity", p.capacity, { type: "number", min: "1", required: true }),
        input("Nopți minim", "minNights", p.minNights, { type: "number", min: "1", required: true }),
        input("Anulare gratuită (zile înainte)", "freeCancelDays", p.freeCancelDays, { type: "number", min: "0", required: true }),
        input("Ora de sosire", "checkinTime", p.checkinTime, { type: "time", required: true }),
        input("Ora de plecare", "checkoutTime", p.checkoutTime, { type: "time", required: true })),
      h("div", { class: "adm-row" },
        input("Email proprietar (primește rezervările)", "ownerEmail", p.ownerEmail, { type: "email" }),
        input("Telefon proprietar (îl vede oaspetele confirmat)", "ownerPhone", p.ownerPhone, { type: "tel" })),
      input("Calendar Booking.com / Airbnb (link iCal)", "icalImportUrl", p.icalImportUrl, { type: "url", placeholder: "https://..." }),
      check("Pune pe pauză preluarea din Booking / Airbnb. Atenție: rezervările noi de acolo nu mai închid perioada aici.", "icalPaused", p.icalPaused),
      h("button", { class: "btn btn-primary", type: "submit" }, "Salvează"));

    const cal = h("section", { class: "adm-card" },
      h("h2", null, "Calendare externe"),
      h("p", null, "Pune acest link în Booking.com sau Airbnb, ca rezervările de aici să închidă perioada și acolo:"),
      h("input", { class: "adm-copy", readonly: true, value: p.icalExportUrl, "aria-label": "Link calendar exportat", on: { focus: (e) => e.target.select() } }),
      p.icalPaused ? h("p", { class: "bk-err" }, "Preluarea din Booking / Airbnb e pe pauză. Perioadele deja preluate rămân închise.") : null,
      p.icalImportUrl && !p.icalPaused ? h("p", null, p.icalError ? `Ultima sincronizare a eșuat: ${p.icalError}` : p.icalSyncedAt ? `Sincronizat: ${new Date(p.icalSyncedAt).toLocaleString("ro-RO")}. Se actualizează la 30 de minute.` : "Nu s-a sincronizat încă.") : null,
      p.icalImportUrl && !p.icalPaused ? h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { await api(`properties/${slug}/sync`, "POST"); reload(); }) } }, "Sincronizează acum") : null);

    const rangeForm = (path, extra, label) => h("form", { class: "adm-inline", on: { submit: guarded(async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.currentTarget).entries());
      await api(`properties/${slug}/${path}`, "POST", f);
      reload();
    }) } },
      input("De la", "dateFrom", "", { type: "date", required: true }), input("Până la (exclusiv)", "dateTo", "", { type: "date", required: true }), extra,
      h("button", { class: "btn btn-primary", type: "submit" }, label));
    const del = (kind, id) => h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { await api(`${kind}/${id}`, "DELETE"); reload(); }) } }, "Șterge");

    const rates = h("section", { class: "adm-card" }, h("h2", null, "Prețuri pe perioade"),
      h("p", null, "Sezon, sărbători, weekenduri. În afara acestor perioade se aplică prețul de bază."),
      data.rates.map((r) => h("div", { class: "adm-item" }, h("span", null, `${date(r.date_from)} – ${date(r.date_to)}: ${r.price} lei${r.min_nights ? `, minim ${r.min_nights} nopți` : ""}${r.label ? ` (${r.label})` : ""}`), del("rates", r.id))),
      rangeForm("rates", [input("Preț (lei)", "price", "", { type: "number", min: "1", required: true }), input("Nopți minim", "minNights", "", { type: "number", min: "1" }), input("Etichetă", "label", "", { maxlength: "60" })], "Adaugă perioada"));

    const blocks = h("section", { class: "adm-card" }, h("h2", null, "Perioade închise"),
      data.blocks.map((b) => h("div", { class: "adm-item" }, h("span", null, `${date(b.date_from)} – ${date(b.date_to)}${b.source === "ical" ? " · din calendarul extern" : ""}${b.note ? ` (${b.note})` : ""}`), b.source === "manual" ? del("blocks", b.id) : null)),
      rangeForm("blocks", [input("Motiv", "note", "", { maxlength: "100" })], "Închide perioada"));

    const picker = me.properties.length > 1
      ? h("select", { "aria-label": "Apartament", on: { change: (e) => guarded(renderSettings)(e.target.value) } }, me.properties.map((x) => h("option", { value: x.slug, selected: x.slug === slug }, x.name)))
      : null;
    const addBtn = h("button", { type: "button", class: "btn btn-ghost", on: { click: renderNewListing } }, "Adaugă apartament");
    const presentation = p.dynamic ? await listingEditor(p, slug, reload) : null;
    const STATUS_LABEL = { draft: "Ciornă, nu apare pe site", pending: "Așteaptă aprobarea", published: "Publicat" };
    fill(h("div", { class: "adm-head" }, h("h1", null, p.name), picker, addBtn),
      p.dynamic ? h("p", null, h("span", { class: `mg-status ${p.status === "published" ? "is-confirmed" : "is-pending"}` }, STATUS_LABEL[p.status])) : null,
      presentation, settings, rates, blocks, cal);
  }

  const TABS = { bookings: renderBookings, orders: renderOrders, menu: () => renderMenu(), settings: () => renderSettings(), push: renderPush, guests: renderGuests, offers: renderOffers, chats: renderChats, home: renderHome, more: renderMore, contacts: renderContacts, reviews: renderReviews };
  const ICON = {
    menu: '<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.500 10v10h13V10"/>',
    bookings: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    chats: '<path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z"/>',
    settings: '<path d="M4 20V5.500L12 3l8 2.500V20"/><path d="M2.500 20h19M9 8h1.500M13.500 8H15M9 12h1.500M13.500 12H15"/>',
    more: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
    orders: '<path d="M7 3v8M4.500 3v5a2.500 2.500 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.500 1-4 4-4 8h4"/>',
    guests: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.7-3.500 3.200-5.500 6.500-5.500s5.800 2 6.500 5.500M16 5a3.500 3.500 0 0 1 0 6.500M18 14.800c1.800.8 3 2.500 3.500 5.200"/>',
    offers: '<path d="M4 4h7l9 9-7 7-9-9V4Z"/><circle cx="8" cy="8" r="1.300"/>',
    reviews: '<path d="m12 3 2.700 5.700 6.300.8-4.600 4.300 1.200 6.200-5.600-3.100-5.600 3.100 1.200-6.200L3 9.500l6.300-.8L12 3Z"/>',
    push: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4"/>',
    contacts: '<path d="M6 3h3l2 5-2.500 1.500a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  };
  let isAdmin = false, isBistro = false;
  // pe telefon apar doar cele principale, restul sunt in Mai mult; pe calculator apar toate in stanga
  const TAB_LIST = () => isBistro ? [
    { tab: "orders", label: "Comenzi", main: true },
    { tab: "menu", label: "Meniu", main: true },
  ] : [
    { tab: "home", label: "Acasă", main: true },
    { tab: "bookings", label: "Rezervări", main: true },
    { tab: "chats", label: "Mesaje", main: true },
    { tab: "settings", label: "Apartamente", hint: "Prețuri, calendar, reguli" },
    { tab: "reviews", label: "Recenzii", hint: "Ce spun oaspeții" },
    ...(isAdmin ? [
      { tab: "orders", label: "Comenzi", hint: "Bistro, la cameră" },
      { tab: "menu", label: "Meniu bistro", hint: "Produse, prețuri, program" },
      { tab: "guests", label: "Oaspeți", hint: "Conturi și nivele" },
      { tab: "offers", label: "Oferte", hint: "Reduceri personalizate" },
      { tab: "push", label: "Notificări", hint: "Anunț în aplicație" },
      { tab: "contacts", label: "Echipa", hint: "Numere de telefon" },
    ] : []),
    { tab: "more", label: "Mai mult", main: true, phoneOnly: true },
  ];
  function buildNav() {
    nav.replaceChildren(h("a", { class: "pn-side-brand", href: "/" }, h("b", null, "Green Future"), h("small", null, "Panou")));
    for (const t of TAB_LIST()) {
      const b = h("button", { type: "button", class: `adm-tab${t.main ? " is-main" : ""}${t.phoneOnly ? " is-phone" : ""}`, "data-tab": t.tab, on: { click: () => openTab(t.tab) } });
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[t.tab]}</svg>`;
      b.append(t.label);
      if (t.tab === "chats") b.append(h("span", { class: "pn-dot", hidden: true }));
      nav.append(b);
    }
  }
  function openTab(name) {
    stopChat();
    stopOrders();
    const inMore = !TAB_LIST().find((t) => t.tab === name)?.main;
    nav.querySelectorAll(".adm-tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === name || (inMore && b.dataset.tab === "more")));
    window.scrollTo(0, 0);
    guarded(TABS[name])();
  }
  document.getElementById("adm-logout").addEventListener("click", guarded(async () => { await api("logout", "POST"); logout(); }));

  const start = guarded(async () => {
    const me = await api("me");
    isAdmin = me.role === "admin";
    isBistro = me.role === "bistro";
    buildNav();
    nav.hidden = false;
    openTab(isBistro ? "orders" : location.hash === "#mesaje" ? "chats" : "home");
  });
  window.addEventListener("hashchange", () => { if (token && location.hash === "#mesaje") openTab("chats"); });
  if (token) start(); else renderLogin();
})();
