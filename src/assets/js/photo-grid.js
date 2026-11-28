// Galerie ca pe Booking: o poza mare, doua alaturi, un rand de miniaturi cu "+N fotografii",
// iar in dreapta nota si harta. Click pe orice poza deschide vizualizarea pe tot ecranul.
// Pagina statica (Studio Dandelion) are datele in atribute; paginile din panou apeleaza window.gfPhotoGrid.
(function () {
  const lang = document.documentElement.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { more: (n) => `+${n} photos`, all: "Show all photos", close: "Close", prev: "Previous photo", next: "Next photo", on: (n) => `${n} reviews on Booking`, read: "All reviews", onBooking: "See reviews on Booking", moreTxt: "more", lessTxt: "less", guest: "Booking guest", map: "Show on map", addr: "Str. Walter Mărăcineanu 20, Sinaia", liked: "Guests who stayed here loved" }
    : { more: (n) => `+${n} fotografii`, all: "Vezi toate fotografiile", close: "Închide", prev: "Poza anterioară", next: "Poza următoare", on: (n) => `${n} evaluări pe Booking`, read: "Toate recenziile", onBooking: "Vezi recenziile pe Booking", moreTxt: "mai mult", lessTxt: "mai puțin", guest: "Oaspete pe Booking", map: "Arată pe hartă", addr: "Str. Walter Mărăcineanu 20, Sinaia", liked: "Oaspeții cazați aici au apreciat" };
  const MAP = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Strada Walter Mărăcineanu 20, Sinaia");
  const EMBED = "https://www.google.com/maps?q=" + encodeURIComponent("Strada Walter Mărăcineanu 20, Sinaia") + "&z=15&hl=" + lang + "&output=embed";
  const word = (s) => {
    const W = lang === "en" ? ["Exceptional", "Superb", "Fabulous", "Very good", "Good"] : ["Excepțional", "Superb", "Fabulos", "Foarte bine", "Bine"];
    return s >= 9.5 ? W[0] : s >= 9 ? W[1] : s >= 8.5 ? W[2] : s >= 8 ? W[3] : W[4];
  };
  const el = (tag, cls, ...kids) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const k of kids) if (k != null && k !== false) n.append(k);
    return n;
  };
  const img = (src, alt, eager) => {
    const i = el("img");
    i.src = src; i.alt = alt; i.decoding = "async";
    if (!eager) i.loading = "lazy";
    return i;
  };

  function lightbox(photos, name, start) {
    let i = start;
    const pic = el("img", "pg-lb-img");
    const count = el("span", "pg-lb-count");
    const show = () => { pic.src = photos[i]; pic.alt = `${name} ${i + 1}`; count.textContent = `${i + 1} / ${photos.length}`; };
    const go = (d) => { i = (i + d + photos.length) % photos.length; show(); };
    const btn = (cls, label, txt, fn) => { const b = el("button", cls, txt); b.type = "button"; b.setAttribute("aria-label", label); b.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); return b; };
    const box = el("div", "pg-lb", el("div", "pg-lb-bar", count, btn("pg-lb-x", T.close, "×", () => close())),
      btn("pg-lb-nav pg-lb-prev", T.prev, "‹", () => go(-1)), pic, btn("pg-lb-nav pg-lb-next", T.next, "›", () => go(1)));
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", name);
    const key = (e) => { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); };
    let x0 = null;
    box.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); x0 = null; });
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    function close() { box.remove(); document.removeEventListener("keydown", key); document.documentElement.style.overflow = ""; }
    document.addEventListener("keydown", key);
    document.documentElement.style.overflow = "hidden";
    document.body.append(box);
    show();
    box.querySelector(".pg-lb-x").focus();
  }

  // box: elementul in care se deseneaza; o: { photos, name, score, count, url, quote, author, reviewsHref }
  function build(box, o) {
    const photos = (o.photos || []).filter(Boolean);
    if (!photos.length) return;
    const tile = (k, cls, eager) => {
      const b = el("button", `pg-tile ${cls}`, img(photos[k], `${o.name} ${k + 1}`, eager));
      // poza intreaga (fara taiere), cu aceeasi poza estompata pe fundal ca sa umple spatiul
      b.style.setProperty("--bg", `url("${photos[k]}")`);
      b.type = "button";
      b.setAttribute("aria-label", `${o.name}, ${k + 1} / ${photos.length}`);
      b.addEventListener("click", () => lightbox(photos, o.name, k));
      return b;
    };
    const top = el("div", "pg-top", tile(0, "pg-big", true));
    for (let k = 1; k <= 2 && k < photos.length; k++) top.append(tile(k, "pg-side"));
    top.classList.add(`pg-n${Math.min(photos.length, 3)}`);
    const thumbs = el("div", "pg-thumbs");
    const shown = photos.slice(3, 8);
    shown.forEach((_, j) => {
      const k = j + 3, t = tile(k, "pg-thumb");
      const left = photos.length - (k + 1);
      if (j === shown.length - 1 && left > 0) t.append(el("span", "pg-more", el("span", "pg-more-l", T.more(left)), el("span", "pg-more-s", `+${left}`)));
      thumbs.append(t);
    });
    const all = el("button", "pg-all", T.all + ` (${photos.length})`);
    all.type = "button";
    all.addEventListener("click", () => lightbox(photos, o.name, 0));
    const grid = el("div", "pg", top, all);
    // randul de jos: miniaturile, apoi butonul catre proprietar
    let owner = null;
    if (o.ownerHref) {
      owner = el("a", "btn btn-outline pg-owner", lang === "en" ? "Message the owner" : "Scrie proprietarului");
      owner.href = o.ownerHref;
    }
    const bottom = shown.length ? el("div", "pg-bottom", thumbs) : null;

    const side = el("aside", "pg-aside");
    if (o.score) {
      const s = Math.round(Number(o.score) * 10) / 10;
      const head = el("div", "pg-score", el("div", "pg-score-t", el("b", null, word(s)), el("small", null, T.on(o.count || 0))), el("span", "pg-score-n", String(s).replace(".", lang === "en" ? "." : ",")));
      const card = el("div", "pg-card", head);
      // recenziile se schimba singure, cu derulare in sus; textele lungi au "mai mult"
      const quotes = (o.quotes && o.quotes.length ? o.quotes : o.quote ? [{ text: o.quote, author: o.author }] : []).filter((q) => q && q.text);
      let paused = false, expanded = false;
      if (quotes.length) {
        const items = quotes.map((q, k) => {
          const long = q.text.length > 160;
          const p = el("p", null, `„${long ? q.text.slice(0, q.text.lastIndexOf(" ", 150)) + "…" : q.text}”`);
          let more = null;
          if (long) {
            more = el("button", "pg-qmore", T.moreTxt);
            more.type = "button";
            more.addEventListener("click", () => {
              const open = more.dataset.open !== "1";
              more.dataset.open = open ? "1" : "";
              p.textContent = `„${open ? q.text : q.text.slice(0, q.text.lastIndexOf(" ", 150)) + "…"}”`;
              more.textContent = open ? T.lessTxt : T.moreTxt;
              expanded = open;
            });
          }
          return el("div", `pg-q${k ? "" : " is-on"}`, p, more, el("span", "pg-author", q.author || T.guest));
        });
        const list = el("div", "pg-qlist", ...items);
        const dots = quotes.length > 1 ? el("div", "pg-qdots", ...quotes.map((_, k) => {
          const d = el("button", k ? "" : "is-on");
          d.type = "button";
          d.setAttribute("aria-label", `${k + 1} / ${quotes.length}`);
          return d;
        })) : null;
        let cur = 0;
        const go = (n) => {
          items[cur].classList.remove("is-on"); dots?.children[cur].classList.remove("is-on");
          const btn = items[cur].querySelector(".pg-qmore");
          if (btn && btn.dataset.open === "1") btn.click();
          cur = (n + items.length) % items.length;
          items[cur].classList.add("is-on"); dots?.children[cur].classList.add("is-on");
        };
        dots && [...dots.children].forEach((d, k) => d.addEventListener("click", () => go(k)));
        card.append(el("div", "pg-quote", el("small", null, T.liked), list, dots));
        if (quotes.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
          list.addEventListener("mouseenter", () => { paused = true; });
          list.addEventListener("mouseleave", () => { paused = false; });
          setInterval(() => { if (!paused && !expanded && list.isConnected) go(cur + 1); }, 6000);
        }
      }
      const links = el("div", "pg-links");
      if (o.reviewsHref && !/^https?:/.test(o.reviewsHref)) {
        const a = el("a", "pg-read", T.read + " →");
        a.href = o.reviewsHref;
        links.append(a);
      }
      if (o.url) {
        const a = el("a", "pg-read pg-bk", T.onBooking + " ↗");
        a.href = o.url; a.target = "_blank"; a.rel = "noopener";
        links.append(a);
      }
      if (links.children.length) card.append(links);
      side.append(card);
    }
    // harta e acum jos, in subsolul paginii
    // "Scrie proprietarului" sta in coloana din dreapta, chiar deasupra capatului randului de miniaturi
    if (owner) side.append(owner);
    box.replaceChildren(grid, side, bottom || "");
    box.hidden = false;
  }
  window.gfPhotoGrid = build;

  // pagina statica: datele sunt in atributele elementului
  document.querySelectorAll("[data-photo-grid][data-photos]").forEach((box) => {
    let d = {};
    try { d = JSON.parse(decodeURIComponent(box.dataset.photos)); } catch { return; }
    build(box, d);
  });
})();
