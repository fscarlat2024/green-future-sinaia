// Cos si comanda la camera pe pagina restaurantului. Preturile sunt recalculate pe server.
(function () {
  const root = document.getElementById("menu");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = {
    ro: {
      title: "Comanda ta", empty: "Alege ceva din meniu.", total: "Total", next: "Continuă", back: "Înapoi",
      apartment: "Apartament", name: "Nume", phone: "Telefon", note: "Mențiuni (opțional)", notePh: "Ora dorită, alergii, alte preferințe",
      room: "Sunt de acord ca suma să fie trecută pe nota apartamentului.", send: "Trimite comanda", sending: "Se trimite...",
      remove: "Scoate", add: "Adaugă", bar: (n, t) => `Comanda ta · ${n} ${n === 1 ? "produs" : "produse"} · ${t} lei`,
      okTitle: "Comanda a fost trimisă", okDemo: "Este o comandă de test și nu se prepară.", okReal: "Restaurantul o confirmă în scurt timp și o aduce la apartament.",
      code: "Cod comandă", again: "Comandă nouă", note24: "Plata se trece pe nota camerei.",
      invalid_apartment: "Scrie numărul apartamentului.", invalid_name: "Scrie numele tău.", invalid_phone: "Numărul de telefon nu pare corect.",
      accept_required: "Bifează acordul pentru plata pe nota camerei.", too_many_requests: "Prea multe comenzi într-un timp scurt. Revino puțin mai târziu.",
      generic: "Comanda nu a putut fi trimisă. Te rugăm să încerci din nou.",
    },
    en: {
      title: "Your order", empty: "Choose something from the menu.", total: "Total", next: "Continue", back: "Back",
      apartment: "Apartment", name: "Name", phone: "Phone", note: "Notes (optional)", notePh: "Preferred time, allergies, other wishes",
      room: "I agree that the amount is added to the apartment bill.", send: "Send order", sending: "Sending...",
      remove: "Remove", add: "Add", bar: (n, t) => `Your order · ${n} ${n === 1 ? "item" : "items"} · ${t} lei`,
      okTitle: "Your order has been sent", okDemo: "This is a test order and will not be prepared.", okReal: "The restaurant will confirm it shortly and bring it to your apartment.",
      code: "Order code", again: "New order", note24: "Payment is added to the room bill.",
      invalid_apartment: "Please enter your apartment number.", invalid_name: "Please enter your name.", invalid_phone: "This phone number does not look right.",
      accept_required: "Please tick the room bill consent.", too_many_requests: "Too many orders in a short time. Please come back a little later.",
      generic: "Your order could not be sent. Please try again.",
    },
  }[lang];

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

  const cartEl = document.getElementById("cart");
  const barEl = document.getElementById("cart-bar");
  const KEY = "gf_cart";
  const cart = new Map();
  let step = "items";
  let error = "";

  const catalog = new Map([...root.querySelectorAll(".mi-add")].map((b) => [b.dataset.id, { name: b.dataset.name, price: Number(b.dataset.price) }]));
  try {
    for (const [id, qty] of JSON.parse(sessionStorage.getItem(KEY) || "[]")) if (catalog.has(id)) cart.set(id, qty);
  } catch {}
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify([...cart])); } catch {} };
  const totals = () => {
    let count = 0, total = 0;
    for (const [id, qty] of cart) { count += qty; total += qty * catalog.get(id).price; }
    return { count, total };
  };
  function change(id, n) {
    const qty = (cart.get(id) || 0) + n;
    if (qty <= 0) cart.delete(id); else cart.set(id, Math.min(qty, 20));
    save();
    if (!cart.size) step = "items";
    render();
  }

  const totalLine = () => h("div", { class: "cart-total" }, h("span", null, T.total), h("b", null, `${totals().total} lei`));
  const lines = () => h("ul", { class: "cart-lines" }, [...cart].map(([id, qty]) => {
    const item = catalog.get(id);
    return h("li", null,
      h("span", { class: "cl-name" }, item.name),
      h("span", { class: "cl-qty" },
        h("button", { type: "button", "aria-label": `${T.remove} ${item.name}`, on: { click: () => change(id, -1) } }, "−"),
        h("output", null, String(qty)),
        h("button", { type: "button", "aria-label": `${T.add} ${item.name}`, on: { click: () => change(id, 1) } }, "+")),
      h("span", { class: "cl-price" }, `${qty * item.price} lei`));
  }));
  const field = (label, name, attrs) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name, required: true, ...attrs }));

  function renderItems() {
    cartEl.replaceChildren(h("h2", null, T.title), ...(cart.size
      ? [lines(), totalLine(), h("p", { class: "cart-room" }, T.note24),
         h("button", { type: "button", class: "btn btn-primary btn-lg bk-go", on: { click: () => { step = "form"; error = ""; render(); } } }, T.next)]
      : [h("p", { class: "cart-empty" }, T.empty)]));
  }

  function renderForm() {
    const form = h("form", { class: "bk-form", on: { submit } },
      h("button", { type: "button", class: "bk-back", on: { click: () => { step = "items"; error = ""; render(); } } }, `‹ ${T.back}`),
      totalLine(),
      field(T.apartment, "apartment", { maxlength: "20", autocomplete: "off" }),
      field(T.name, "name", { maxlength: "100", autocomplete: "name" }),
      field(T.phone, "phone", { type: "tel", maxlength: "30", autocomplete: "tel" }),
      h("label", { class: "bk-field" }, h("span", null, T.note), h("textarea", { name: "note", rows: "2", maxlength: "500", placeholder: T.notePh })),
      h("input", { class: "bk-trap", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" }),
      h("label", { class: "bk-check" }, h("input", { type: "checkbox", name: "accept", required: true }), h("span", null, T.room)),
      error ? h("p", { class: "bk-err", role: "alert" }, error) : null,
      h("button", { type: "submit", class: "btn btn-primary btn-lg bk-go" }, T.send));
    cartEl.replaceChildren(h("h2", null, T.title), form);
  }

  async function submit(ev) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const f = new FormData(form);
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    btn.textContent = T.sending;
    const r = await fetch("/api/orders", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lang, items: [...cart].map(([id, qty]) => ({ id, qty })), apartment: f.get("apartment"), name: f.get("name"),
        phone: f.get("phone"), note: f.get("note"), website: f.get("website"), accept: f.get("accept") === "on",
      }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) {
      cart.clear();
      save();
      step = "items";
      barEl.hidden = true;
      root.querySelectorAll(".mi-add").forEach((b) => { b.textContent = "+"; b.classList.remove("has-qty"); });
      cartEl.replaceChildren(h("div", { class: "bk-done" }, h("div", { class: "bk-tick", "aria-hidden": "true" }, "✓"),
        h("h3", null, T.okTitle), h("p", null, data.demo ? T.okDemo : T.okReal),
        h("div", { class: "bk-code" }, h("small", null, T.code), h("b", null, data.code)),
        h("button", { type: "button", class: "btn btn-ghost", on: { click: () => render() } }, T.again)));
      cartEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const keep = Object.fromEntries(f.entries());
    error = T[data.error] || T.generic;
    renderForm();
    const again = cartEl.querySelector("form");
    for (const [k, v] of Object.entries(keep)) { const el = again.elements[k]; if (el && el.type !== "checkbox") el.value = v; }
    again.elements.accept.checked = keep.accept === "on";
  }

  function render() {
    if (step === "form") renderForm(); else renderItems();
    const { count, total } = totals();
    barEl.hidden = !count;
    barEl.textContent = count ? T.bar(count, total) : "";
    root.querySelectorAll(".mi-add").forEach((b) => {
      const qty = cart.get(b.dataset.id) || 0;
      b.textContent = qty ? String(qty) : "+";
      b.classList.toggle("has-qty", qty > 0);
    });
  }

  root.querySelectorAll(".mi-add").forEach((b) => b.addEventListener("click", () => { if (step === "form") step = "items"; change(b.dataset.id, 1); }));
  render();
})();
