// Meniul ca o pagina incadrata: o singura categorie odata, cu trecere la categoria vecina.
// Fara JS ramane lista completa.
(function () {
  const root = document.getElementById("menu");
  const list = root && root.querySelector(".menu-list");
  if (!list) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { allergensHint: "Tap a dish to see its allergens.", close: "Close", noAllergens: "No listed allergens." }
    : { allergensHint: "Apasă pe un preparat pentru a-i vedea alergenii.", close: "Închide", noAllergens: "Fără alergeni menționați." };
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const sections = [...list.querySelectorAll(".menu-cat")];
  const nav = root.querySelector(".menu-cats");
  const links = [...nav.querySelectorAll("a")];
  let current = Math.max(0, sections.findIndex((s) => `#${s.id}` === location.hash));

  const page = el("div", "menu-page");
  for (const c of ["tl", "tr", "bl", "br"]) page.append(el("span", `mp-corner is-${c}`));
  const folio = el("div", "mp-folio");
  const prev = el("button", "mp-turn is-prev");
  const next = el("button", "mp-turn is-next");
  prev.type = next.type = "button";
  const numeral = el("span", "mp-numeral");
  folio.append(prev, numeral, next);
  const hint = el("p", "mp-hint", T.allergensHint);
  list.before(page);
  page.before(nav);
  page.append(list, hint, folio);
  list.classList.add("is-paged");

  function show(i, animate) {
    current = (i + sections.length) % sections.length;
    sections.forEach((s, n) => { s.hidden = n !== current; });
    sections[current].querySelectorAll(".menu-item").forEach((it, n) => it.style.setProperty("--i", String(n)));
    links.forEach((a, n) => {
      a.classList.toggle("on", n === current);
      if (n === current) {
        a.setAttribute("aria-current", "true");
        nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: animate ? "smooth" : "auto" });
      } else a.removeAttribute("aria-current");
    });
    const title = (n) => sections[(n + sections.length) % sections.length].querySelector("h2").textContent;
    prev.textContent = `‹ ${title(current - 1)}`;
    next.textContent = `${title(current + 1)} ›`;
    numeral.textContent = ROMAN[current] || String(current + 1);
    if (animate) {
      page.classList.remove("is-enter");
      void page.offsetWidth;
      page.classList.add("is-enter");
      history.replaceState(null, "", `#${sections[current].id}`);
      const top = nav.getBoundingClientRect().top + scrollY - 100;
      if (scrollY > top) window.scrollTo({ top });
    }
  }
  links.forEach((a, n) => a.addEventListener("click", (e) => { e.preventDefault(); show(n, true); }));
  prev.addEventListener("click", () => show(current - 1, true));
  next.addEventListener("click", () => show(current + 1, true));

  // Alergenii raman disponibili la cerere: nu incarca pagina, dar clientul ii poate vedea inainte sa comande.
  list.querySelectorAll(".menu-item").forEach((it) => {
    if (!it.querySelector(".mi-allergens")) it.querySelector(".mi-text").append(el("p", "mi-allergens", T.noAllergens));
    it.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      it.classList.toggle("show-allergens");
    });
  });

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
  document.addEventListener("gf-cart-close", () => setOpen(false));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false); });
  root.addEventListener("click", (e) => {
    if (!e.target.closest(".mi-add")) return;
    bar.classList.remove("is-bump");
    void bar.offsetWidth;
    bar.classList.add("is-bump");
  });

  show(current, false);
  page.classList.add("is-enter");
})();
