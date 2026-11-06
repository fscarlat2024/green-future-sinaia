// Meniul pe categorii: se vede o singura sectiune odata, cu cautare si filtre de alergeni.
// Fara JS ramane lista completa.
(function () {
  const root = document.getElementById("menu");
  const list = root && root.querySelector(".menu-list");
  if (!list) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { search: "Search the menu", placeholder: "Burger, salad, coffee...", without: "Without", gluten: "gluten", dairy: "dairy", egg: "egg", fish: "fish", nuts: "nuts", results: (n) => (n === 1 ? "1 dish" : `${n} dishes`), none: "Nothing matches. Try another word or remove a filter.", clear: "Clear filters", allergyNote: "Filters are a guide. If you have a severe allergy, please ask the bistro.", close: "Close", found: "Results" }
    : { search: "Caută în meniu", placeholder: "Burger, salată, cafea...", without: "Fără", gluten: "gluten", dairy: "lactate", egg: "ou", fish: "pește", nuts: "alune", results: (n) => (n === 1 ? "1 preparat" : `${n} preparate`), none: "Nu am găsit nimic. Încearcă alt cuvânt sau scoate un filtru.", clear: "Șterge filtrele", allergyNote: "Filtrele sunt orientative. Dacă ai o alergie severă, întreabă la bistro.", close: "Închide", found: "Rezultate" };
  const FILTERS = [["gluten", /gluten/], ["dairy", /lactoz|lapte/], ["egg", /(^|[ ,])ou($|[ ,])/], ["fish", /pe[sș]te/], ["nuts", /alune/]];
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const sections = [...list.querySelectorAll(".menu-cat")];
  const items = [...list.querySelectorAll(".menu-item")].map((node) => ({
    node, section: node.closest(".menu-cat"), allergens: node.dataset.allergens || "", text: fold(node.querySelector(".mi-text").textContent),
  }));

  const state = { cat: sections.some((s) => `#${s.id}` === location.hash) ? location.hash.slice(1) : sections[0].id, query: "", off: new Set() };

  // ---------- comenzi ----------
  const tools = el("div", "mv-tools");
  const searchLabel = el("label", "mv-search");
  const input = el("input");
  input.type = "search";
  input.placeholder = T.placeholder;
  input.setAttribute("aria-label", T.search);
  searchLabel.append(input);
  const chips = el("div", "mv-chips");
  chips.append(el("span", "mv-chips-label", T.without));
  for (const [key] of FILTERS) {
    const b = el("button", "mv-chip", T[key]);
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      if (state.off.has(key)) state.off.delete(key); else state.off.add(key);
      b.classList.toggle("on", state.off.has(key));
      b.setAttribute("aria-pressed", String(state.off.has(key)));
      apply();
    });
    chips.append(b);
  }
  tools.append(searchLabel, chips);

  const nav = root.querySelector(".menu-cats");
  const links = [...nav.querySelectorAll("a")];
  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.cat = a.getAttribute("href").slice(1);
      history.replaceState(null, "", `#${state.cat}`);
      state.query = "";
      input.value = "";
      apply(true);
      const top = list.getBoundingClientRect().top + scrollY - 130;
      if (scrollY > top) window.scrollTo({ top });
    });
  });
  const status = el("p", "mv-status");
  status.setAttribute("aria-live", "polite");
  const empty = el("p", "mv-empty", T.none);
  empty.hidden = true;
  const note = el("p", "mv-note", T.allergyNote);
  note.hidden = true;
  list.prepend(tools, status);
  list.append(empty, note);
  const layout = el("div", "mv-layout");
  list.before(layout);
  layout.append(nav, list);

  function apply(animate) {
    const q = fold(state.query.trim());
    const searching = q.length > 0;
    const blocked = FILTERS.filter(([k]) => state.off.has(k)).map(([, re]) => re);
    let shown = 0;
    for (const it of items) {
      const inScope = searching || it.section.id === state.cat;
      const ok = inScope && (!searching || q.split(/\s+/).every((w) => it.text.includes(w))) && !blocked.some((re) => re.test(it.allergens));
      it.node.hidden = !ok;
      if (ok) {
        it.node.style.setProperty("--i", String(shown));
        shown++;
      }
    }
    for (const s of sections) {
      const visible = items.some((it) => it.section === s && !it.node.hidden);
      s.hidden = !visible;
      s.classList.toggle("is-searching", searching);
    }
    links.forEach((a) => {
      const on = !searching && a.getAttribute("href") === `#${state.cat}`;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      if (on && window.innerWidth < 900) nav.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
    });
    status.textContent = searching || blocked.length ? T.results(shown) : "";
    empty.hidden = shown > 0;
    note.hidden = !blocked.length;
    if (animate) {
      list.classList.remove("is-enter");
      void list.offsetWidth;
      list.classList.add("is-enter");
    }
  }
  input.addEventListener("input", () => { state.query = input.value; apply(); });

  // ---------- cosul intr-un panou lateral ----------
  const cart = document.getElementById("cart");
  const bar = document.getElementById("cart-bar");
  const drawer = el("div", "cart-drawer");
  const scrim = el("div", "cart-scrim");
  const closeBtn = el("button", "cart-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", T.close);
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  cart.before(scrim, drawer);
  drawer.append(closeBtn, cart);
  const setOpen = (open) => {
    drawer.classList.toggle("is-open", open);
    scrim.classList.toggle("is-open", open);
    document.body.classList.toggle("no-scroll", open);
    if (open) closeBtn.focus(); else bar.focus({ preventScroll: true });
  };
  bar.addEventListener("click", (e) => { e.preventDefault(); setOpen(true); });
  closeBtn.addEventListener("click", () => setOpen(false));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false); });
  root.addEventListener("click", (e) => {
    if (!e.target.closest(".mi-add")) return;
    bar.classList.remove("is-bump");
    void bar.offsetWidth;
    bar.classList.add("is-bump");
  });

  apply(true);
})();
