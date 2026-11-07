// Meniul vine din panoul bistroului. Pagina are si varianta scrisa la publicare, folosita daca serverul nu raspunde.
(function () {
  const root = document.getElementById("menu");
  const start = () => { window.gfMenuView?.(); window.gfRestaurant?.(); };
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { allergens: "Allergens", soldOut: "Sold out today", add: "Add", remove: "Remove", closed: (a, b) => `The bistro takes orders between ${a} and ${b}. You can browse the menu in the meantime.`, empty: "The menu is not available right now." }
    : { allergens: "Alergeni", soldOut: "Epuizat azi", add: "Adaugă", remove: "Scoate", closed: (a, b) => `Bistroul primește comenzi între ${a} și ${b}. Între timp poți vedea meniul.`, empty: "Meniul nu este disponibil acum." };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  function itemNode(i, canOrder) {
    const t = i[lang];
    const art = el("article", `menu-item${i.photo ? " has-photo" : ""}${i.soldOut ? " is-out" : ""}`);
    const text = el("div", "mi-text");
    if (i.photo) { const img = el("img", "mi-thumb"); img.src = i.photo; img.alt = ""; img.loading = "lazy"; text.append(img); }
    text.append(el("h3", null, t.name));
    if (t.desc) text.append(el("p", null, t.desc));
    if (t.allergens) text.append(el("p", "mi-allergens", `${T.allergens}: ${t.allergens}`));
    const buy = el("div", "mi-buy");
    buy.append(el("span", "mi-price", `${i.price} lei`));
    const ctl = el("div", "mi-ctl");
    if (i.soldOut) ctl.append(el("span", "mi-soldout", T.soldOut));
    else if (canOrder) {
      const sub = el("button", "mi-sub", "−");
      sub.type = "button"; sub.dataset.id = i.id; sub.hidden = true; sub.setAttribute("aria-label", `${T.remove} ${t.name}`);
      const qty = el("output", "mi-qty"); qty.hidden = true;
      const add = el("button", "mi-add", "+");
      add.type = "button"; add.dataset.id = i.id; add.dataset.name = t.name; add.dataset.price = String(i.price); add.setAttribute("aria-label", `${T.add} ${t.name}`);
      ctl.append(sub, qty, add);
    }
    buy.append(ctl);
    art.append(text, buy);
    return art;
  }
  function apply(m) {
    const list = root.querySelector(".menu-list");
    const nav = list.querySelector(".menu-cats");
    if (!m.categories.length) { list.replaceChildren(el("p", "menu-empty", T.empty)); root.querySelector("#cart")?.remove(); return false; }
    nav.replaceChildren(...m.categories.map((c) => { const a = el("a", null, c[lang]); a.href = `#${c.id}`; return a; }));
    list.replaceChildren(nav, ...m.categories.map((c) => {
      const sec = el("section", "menu-cat");
      sec.id = c.id;
      sec.append(el("h2", null, c[lang]), ...c.items.map((i) => itemNode(i, m.open)));
      return sec;
    }));
    if (!m.open) root.before(el("p", "wrap menu-closed", T.closed(m.from, m.to)));
    return true;
  }
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 4000);
  fetch("/api/menu", { signal: stop.signal }).then((r) => (r.ok ? r.json() : Promise.reject())).then((m) => { clearTimeout(timer); if (apply(m)) start(); }).catch(start);
})();
