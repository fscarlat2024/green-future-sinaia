// Meniul ca o carte: pagini care se intorc, in loc de o lista lunga. Fara JS ramane lista simpla.
(function () {
  const root = document.getElementById("menu");
  const list = root && root.querySelector(".menu-list");
  if (!list) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { kicker: "The menu", contents: "Contents", open: "Open the menu", prev: "Previous page", next: "Next page", page: "Page", of: "of", close: "Close", hintWide: "Use the arrows or the keyboard to turn the page", hintTouch: "Swipe to turn the page" }
    : { kicker: "Meniul", contents: "Cuprins", open: "Deschide meniul", prev: "Pagina anterioară", next: "Pagina următoare", page: "Pagina", of: "din", close: "Închide", hintWide: "Folosește săgețile sau tastatura ca să întorci pagina", hintTouch: "Glisează ca să întorci pagina" };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wide = window.matchMedia("(min-width: 900px)");

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const cats = [...list.querySelectorAll(".menu-cat")].map((sec) => ({
    id: sec.id, title: sec.querySelector("h2").textContent, items: [...sec.querySelectorAll(".menu-item")],
  }));

  const book = el("div", "book");
  const rail = el("nav", "book-rail");
  rail.setAttribute("aria-label", T.contents);
  const stage = el("div", "book-stage");
  const left = el("div", "book-slot is-left");
  const right = el("div", "book-slot is-right");
  const store = el("div");
  store.hidden = true;
  const prevBtn = el("button", "book-arrow is-prev", "‹");
  const nextBtn = el("button", "book-arrow is-next", "›");
  prevBtn.type = nextBtn.type = "button";
  prevBtn.setAttribute("aria-label", T.prev);
  nextBtn.setAttribute("aria-label", T.next);
  const counter = el("p", "book-counter");
  counter.setAttribute("aria-live", "polite");
  const hint = el("p", "book-hint");
  stage.append(left, right);
  const row = el("div", "book-row");
  row.append(prevBtn, stage, nextBtn);
  book.append(rail, row, counter, hint);
  list.hidden = true;
  list.before(book);
  root.append(store);

  let pages = [], index = 0, busy = false, laidOutSize = 1;
  const size = () => (wide.matches ? 2 : 1);
  const spreadOf = (p) => Math.floor(p / size());
  const spreadCount = () => Math.ceil(pages.length / size());

  function pageShell(extra) {
    const p = el("article", `book-page ${extra || ""}`);
    return p;
  }
  function coverPage() {
    const p = pageShell("is-cover");
    p.append(el("span", "bc-kicker", T.kicker), el("h2", "bc-title", "Attitude Bistro"), el("span", "bc-rule"), el("p", "bc-place", "Green Future · Sinaia"));
    const open = el("button", "bc-open", T.open + " →");
    open.type = "button";
    open.addEventListener("click", () => {
      flipTo(spreadOf(firstItemsPage()));
      book.scrollIntoView({ block: "start", behavior: reduced.matches ? "auto" : "smooth" });
    });
    p.append(open);
    return p;
  }
  const firstItemsPage = () => pages.findIndex((x) => x.cat);
  function tocPage() {
    const p = pageShell("is-toc");
    p.append(el("h2", "toc-title", T.contents));
    const ul = el("ul", "toc-list");
    for (const c of cats) {
      const li = el("li");
      const b = el("button", "toc-link");
      b.type = "button";
      b.dataset.cat = c.id;
      b.append(el("span", "toc-name", c.title), el("span", "toc-dots"), el("span", "toc-num"));
      b.addEventListener("click", () => goToCat(c.id));
      li.append(b);
      ul.append(li);
    }
    p.append(ul);
    return p;
  }

  function build() {
    hint.textContent = wide.matches ? T.hintWide : T.hintTouch;
    const hadPages = pages.length > 0;
    const samePage = index * laidOutSize;
    laidOutSize = size();
    const perPage = 4;
    pages = [{ node: coverPage() }, { node: tocPage() }];
    for (const c of cats) {
      for (let i = 0; i < c.items.length; i += perPage) {
        const node = pageShell("is-items");
        if (i === 0) node.append(el("h2", "bp-cat", c.title));
        else node.append(el("span", "bp-cont", c.title));
        c.items.slice(i, i + perPage).forEach((it) => node.append(it));
        pages.push({ node, cat: c.id });
      }
    }
    pages.forEach((p, i) => p.node.append(el("span", "bp-num", String(i + 1))));
    pages[1].node.querySelectorAll(".toc-link").forEach((b) => {
      b.querySelector(".toc-num").textContent = String(pages.findIndex((p) => p.cat === b.dataset.cat) + 1);
    });
    rail.replaceChildren(...cats.map((c) => {
      const b = el("button", "rail-link", c.title);
      b.type = "button";
      b.dataset.cat = c.id;
      b.addEventListener("click", () => goToCat(c.id));
      return b;
    }));
    measure();
    // paginarea e aceeasi pe orice ecran, deci ramanem pe aceeasi pagina si cand se schimba latimea
    index = hadPages ? spreadOf(samePage) : 0;
    commit();
  }

  // Toate paginile au inaltimea celei mai lungi, ca, la intoarcere, cartea sa nu sara.
  function measure() {
    stage.style.removeProperty("--book-h");
    const probe = el("div", "book-probe");
    probe.style.width = `${(wide.matches ? stage.clientWidth / 2 : stage.clientWidth) || 300}px`;
    book.append(probe);
    let max = 0;
    for (const p of pages) { probe.append(p.node); max = Math.max(max, p.node.offsetHeight); }
    probe.remove();
    stage.style.setProperty("--book-h", `${max}px`);
  }

  function place(slot, i) {
    slot.replaceChildren();
    if (i < 0 || i >= pages.length) { slot.append(pageShell("is-blank")); return; }
    slot.append(pages[i].node);
  }
  function park() {
    pages.forEach((p) => { if (!stage.contains(p.node)) store.append(p.node); });
  }
  function commit() {
    stage.querySelectorAll(".book-leaf").forEach((n) => n.remove());
    const s = size();
    if (s === 2) { place(left, index * 2); place(right, index * 2 + 1); }
    else { left.replaceChildren(); place(right, index); }
    park();
    stage.classList.toggle("is-single", s === 1);
    updateUi();
  }
  function updateUi() {
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= spreadCount() - 1;
    const first = index * size() + 1;
    const last = Math.min(first + size() - 1, pages.length);
    counter.textContent = `${T.page} ${first === last ? first : `${first}–${last}`} ${T.of} ${pages.length}`;
    const visible = pages.slice(index * size(), index * size() + size());
    const cat = visible.map((p) => p.cat).find(Boolean);
    rail.querySelectorAll(".rail-link").forEach((b) => {
      const on = b.dataset.cat === cat;
      b.classList.toggle("on", on);
      if (on) b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced.matches ? "auto" : "smooth" });
    });
  }

  function face(i, cls) {
    const f = el("div", `leaf-face ${cls}`);
    const copy = i >= 0 && i < pages.length ? pages[i].node.cloneNode(true) : pageShell("is-blank");
    copy.inert = true;
    f.append(copy);
    return f;
  }

  function flipTo(target) {
    target = Math.max(0, Math.min(spreadCount() - 1, target));
    if (busy || target === index) return;
    if (reduced.matches) { index = target; commit(); return; }
    busy = true;
    const forward = target > index;
    const s = size();
    const leaf = el("div", `book-leaf ${forward ? "turn-next" : "turn-prev"} ${s === 1 ? "is-mobile" : ""}`);
    if (s === 2) {
      const a = index * 2, b = target * 2;
      if (forward) {
        place(right, b + 1);
        leaf.append(face(a + 1, "front"), face(b, "back"));
      } else {
        place(left, b);
        leaf.append(face(a, "front"), face(b + 1, "back"));
      }
    } else if (forward) {
      leaf.append(face(index, "front"));
      place(right, target);
    } else {
      leaf.append(face(target, "front"));
    }
    park();
    stage.append(leaf);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      index = target;
      commit();
      busy = false;
    };
    leaf.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 1100);
  }
  const step = (n) => flipTo(index + n);
  function goToCat(id) {
    flipTo(spreadOf(pages.findIndex((p) => p.cat === id)));
  }

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (drawer.classList.contains("is-open") || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  let startX = null, startY = null;
  stage.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Pe telefon, bara browserului schimba inaltimea la derulare; refacem cartea doar cand se schimba latimea.
  let timer, lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => { if (!busy) build(); }, 200);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!busy) build(); });

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

  build();
})();
