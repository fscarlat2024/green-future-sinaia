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
    invalid_dates: "Verifică datele: sfârșitul trebuie să fie după început.", invalid_value: "Verifică valorile introduse.",
    price_required: "Pune un preț pe noapte înainte de a activa rezervările.", invalid_ical_url: "Linkul calendarului trebuie să înceapă cu https://.",
    forbidden: "Nu ai acces la acest apartament.",
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
    const err = h("p", { class: "bk-err", role: "alert", hidden: !message }, message || "");
    root.replaceChildren(h("form", { class: "adm-card adm-login", on: { submit: async (ev) => {
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

  // ---------- rezervari ----------
  async function renderBookings() {
    const { bookings } = await api("bookings");
    const act = (b, action, label, cls, ask) => h("button", { type: "button", class: `btn ${cls}`, on: { click: guarded(async () => {
      if (ask && !confirm(ask)) return;
      await api(`bookings/${b.id}/${action}`, "POST");
      renderBookings();
    }) } }, label);
    const pending = bookings.filter((b) => b.status === "pending").length;
    root.replaceChildren(
      h("div", { class: "adm-head" }, h("h1", null, "Rezervări"), h("p", null, pending ? `${pending} de confirmat. Cererile fără răspuns expiră după 24 de ore.` : "Nimic de confirmat.")),
      bookings.length ? h("div", { class: "adm-list" }, bookings.map((b) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, b.guest_name), h("span", { class: `mg-status is-${b.status}` }, STATUS[b.status] || b.status)),
        h("p", null, `${b.property_name} · ${date(b.checkin)} – ${date(b.checkout)} · ${b.adults + b.children} oaspeți · ${b.total} lei`),
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
    root.replaceChildren(
      h("div", { class: "adm-head" }, h("h1", null, "Anunț în aplicație"), h("p", null, `${devices} telefoane cu aplicația.`)),
      h("form", { class: "adm-card adm-login", on: { submit: send } },
        enabled ? null : h("p", { class: "bk-err" }, "Cheia pentru notificări nu e pusă pe server."),
        h("label", { class: "bk-field" }, h("span", null, "Titlu"), h("input", { name: "title", required: true, maxlength: 80 })),
        h("label", { class: "bk-field" }, h("span", null, "Mesaj"), h("textarea", { name: "body", rows: 3, maxlength: 240 })),
        h("label", { class: "bk-field" }, h("span", null, "Pagina deschisă la apăsare"), h("input", { name: "url", value: "/", maxlength: 200 })),
        status,
        h("button", { class: "btn btn-primary btn-lg", type: "submit", disabled: !enabled || !devices }, "Trimite")));
  }

  // ---------- comenzi restaurant ----------
  const ORDER_STATUS = { new: "Nouă", confirmed: "Confirmată", delivered: "Livrată", cancelled: "Anulată" };
  async function renderOrders() {
    const { orders } = await api("orders");
    const act = (o, action, label, cls) => h("button", { type: "button", class: `btn ${cls}`, on: { click: guarded(async () => {
      await api(`orders/${o.id}/${action}`, "POST");
      renderOrders();
    }) } }, label);
    const open = orders.filter((o) => o.status === "new").length;
    root.replaceChildren(
      h("div", { class: "adm-head" }, h("h1", null, "Comenzi la cameră"), h("p", null, open ? `${open} comenzi noi.` : "Nicio comandă nouă.")),
      orders.length ? h("div", { class: "adm-list" }, orders.map((o) => h("article", { class: "adm-card adm-booking" },
        h("div", { class: "adm-bk-top" }, h("b", null, `Ap. ${o.apartment} · ${o.guest_name}`), h("span", { class: `mg-status is-${{ new: "pending", confirmed: "confirmed", delivered: "confirmed", cancelled: "cancelled" }[o.status]}` }, ORDER_STATUS[o.status] || o.status)),
        h("p", null, o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")),
        h("p", null, h("b", null, `${o.total} lei`), " pe nota camerei · ", h("a", { href: `tel:${o.guest_phone.replace(/[^+\d]/g, "")}` }, o.guest_phone), ` · ${o.code}${o.demo ? " · TEST" : ""}`),
        o.note ? h("p", { class: "adm-note" }, o.note) : null,
        h("div", { class: "adm-actions" },
          o.status === "new" ? act(o, "confirm", "Confirmă", "btn-primary") : null,
          o.status === "confirmed" ? act(o, "deliver", "Marchează livrată", "btn-primary") : null,
          o.status === "new" || o.status === "confirmed" ? act(o, "cancel", "Anulează", "btn-ghost") : null)))) : h("p", { class: "adm-card" }, "Nu există comenzi încă."));
  }

  // ---------- apartamente ----------
  async function renderSettings(slug) {
    const me = await api("me");
    if (!me.properties.length) { root.replaceChildren(h("p", { class: "adm-card" }, "Contul nu are apartamente atribuite.")); return; }
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
        active: f.get("active") === "on", instantBook: f.get("instantBook") === "on",
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
      h("button", { class: "btn btn-primary", type: "submit" }, "Salvează"));

    const cal = h("section", { class: "adm-card" },
      h("h2", null, "Calendare externe"),
      h("p", null, "Pune acest link în Booking.com sau Airbnb, ca rezervările de aici să închidă perioada și acolo:"),
      h("input", { class: "adm-copy", readonly: true, value: p.icalExportUrl, "aria-label": "Link calendar exportat", on: { focus: (e) => e.target.select() } }),
      p.icalImportUrl ? h("p", null, p.icalError ? `Ultima sincronizare a eșuat: ${p.icalError}` : p.icalSyncedAt ? `Sincronizat: ${new Date(p.icalSyncedAt).toLocaleString("ro-RO")}. Se actualizează la 30 de minute.` : "Nu s-a sincronizat încă.") : null,
      p.icalImportUrl ? h("button", { type: "button", class: "btn btn-ghost", on: { click: guarded(async () => { await api(`properties/${slug}/sync`, "POST"); reload(); }) } }, "Sincronizează acum") : null);

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
    root.replaceChildren(h("div", { class: "adm-head" }, h("h1", null, p.name), picker), settings, rates, blocks, cal);
  }

  const TABS = { bookings: renderBookings, orders: renderOrders, settings: () => renderSettings(), push: renderPush };
  function openTab(name) {
    nav.querySelectorAll(".adm-tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    guarded(TABS[name])();
  }
  nav.querySelectorAll(".adm-tab").forEach((b) => b.addEventListener("click", () => openTab(b.dataset.tab)));
  document.getElementById("adm-logout").addEventListener("click", guarded(async () => { await api("logout", "POST"); logout(); }));

  const start = guarded(async () => {
    const me = await api("me");
    nav.querySelector('[data-tab="orders"]').hidden = me.role !== "admin";
    nav.querySelector('[data-tab="push"]').hidden = me.role !== "admin";
    nav.hidden = false;
    openTab("bookings");
  });
  if (token) start(); else renderLogin();
})();
