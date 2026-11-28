// Formularul de recenzie din linkul primit dupa sejur, si lista recenziilor de pe pagina apartamentului.
(function () {
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

  // aceleasi categorii ca pe Booking
  const CATS = [
    { k: "cleanliness", ro: "Curățenie", en: "Cleanliness" },
    { k: "comfort", ro: "Confort", en: "Comfort" },
    { k: "facilities", ro: "Facilități și dotări", en: "Facilities" },
    { k: "location", ro: "Locație", en: "Location" },
    { k: "host", ro: "Gazda", en: "Host" },
    { k: "value", ro: "Raport calitate-preț", en: "Value for money" },
  ];
  const list = document.getElementById("direct-reviews");
  if (list) {
    const en = list.dataset.lang === "en";
    fetch(`/api/properties/${encodeURIComponent(list.dataset.slug)}/reviews`).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (!data || !data.count) return;
      const fmt = (d) => new Date(d).toLocaleDateString(en ? "en-GB" : "ro-RO", { month: "long", year: "numeric" });
      document.getElementById("direct-reviews-score").textContent = data.average.toFixed(1);
      document.getElementById("direct-reviews-count").textContent = en
        ? `${data.count} ${data.count === 1 ? "review" : "reviews"} from guests who booked here`
        : `${data.count} ${data.count === 1 ? "recenzie" : "recenzii"} de la oaspeți care au rezervat aici`;
      // barele pe categorii, ca pe Booking (doar categoriile cu note)
      const cats = CATS.filter((c) => data.categories && data.categories[c.k] != null);
      if (cats.length) {
        const bars = h("div", { class: "rv-bars" }, cats.map((c) => {
          const v = data.categories[c.k];
          return h("div", { class: "rv-bar" },
            h("div", { class: "rv-bar-top" }, h("span", null, c[en ? "en" : "ro"]), h("b", null, v.toFixed(1))),
            h("div", { class: "rv-bar-line" }, h("i", { style: `width:${Math.max(0, Math.min(100, v * 10))}%` })));
        }));
        (list.closest(".reviews-wrap") || list).before(bars);
      }
      list.replaceChildren(...data.reviews.map((r) => h("figure", { class: "quote" },
        h("div", { class: "review-mark" }, String(r.score)),
        r.body ? h("blockquote", null, r.body) : null,
        h("figcaption", null, `${r.author}, ${fmt(r.date)}`))));
      const blk = list.closest(".rv-direct");
      if (blk) blk.hidden = false;
      list.closest("section").hidden = false;
    }).catch(() => {});
  }

  const root = document.getElementById("review");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { title: "How was your stay?", stay: (p, a, b) => `${p}, ${a} - ${b}`, score: "Your score, from 1 to 10", text: "What did you like, and what could be better? (optional)", send: "Send review", sending: "Sending...", thanks: "Thank you for your review!", thanksText: "It helps other guests and the owner.", done: "You already left a review for this stay. Thank you!", invalid: "This link is not valid. Please use the link from your email.", pick: "Please choose a score.", failed: "We could not send your review. Please try again.", toSite: "Back to the site", site: "/en/" }
    : { title: "Cum a fost sejurul?", stay: (p, a, b) => `${p}, ${a} - ${b}`, score: "Nota ta, de la 1 la 10", text: "Ce ți-a plăcut și ce ar putea fi mai bine? (opțional)", send: "Trimite recenzia", sending: "Se trimite...", thanks: "Mulțumim pentru recenzie!", thanksText: "Îi ajută pe ceilalți oaspeți și pe proprietar.", done: "Ai lăsat deja o recenzie pentru acest sejur. Mulțumim!", invalid: "Linkul nu este valid. Folosește linkul din email.", pick: "Alege o notă.", failed: "Nu am putut trimite recenzia. Încearcă din nou.", toSite: "Înapoi la site", site: "/" };
  T.score = lang === "en" ? "Rate each part from 1 (very poor) to 10 (excellent)." : "Dă o notă fiecărei părți, de la 1 (foarte slab) la 10 (excelent).";
  T.pick = lang === "en" ? "Please give a score for every part." : "Dă o notă pentru fiecare parte.";
  T.overall = lang === "en" ? "Your overall score" : "Nota ta generală";
  const q = new URLSearchParams(location.search);
  const code = q.get("cod"), token = q.get("t");
  const url = `/api/reviews/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`;
  const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // replaceChildren ar scrie "null" pe pagina pentru blocurile care lipsesc
  const fill = (...kids) => root.replaceChildren(...kids.filter((c) => c != null && c !== false));
  const note = (title, text) => fill(h("h1", null, title), text ? h("p", null, text) : null, h("a", { class: "btn btn-primary", href: T.site }, T.toSite));

  function form(b) {
    // note pe categorii, ca pe Booking; nota generala e media lor
    const scores = {};
    const err = h("p", { class: "bk-err", role: "alert", hidden: true });
    const total = h("b", { class: "rv-total-num" }, "–");
    const updateTotal = () => {
      const vals = CATS.map((c) => scores[c.k]).filter(Boolean);
      total.textContent = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : "–";
    };
    const rows = CATS.map((c) => {
      const buttons = Array.from({ length: 10 }, (_, i) => h("button", { type: "button", class: "score-btn", "aria-pressed": "false", "aria-label": `${c[lang]} ${i + 1}`, on: { click: () => {
        scores[c.k] = i + 1;
        buttons.forEach((x, j) => x.setAttribute("aria-pressed", j === i ? "true" : "false"));
        updateTotal();
      } } }, String(i + 1)));
      return h("div", { class: "bk-field rv-cat" }, h("span", null, c[lang]), h("div", { class: "score-row", role: "group", "aria-label": c[lang] }, buttons));
    });
    const text = h("textarea", { rows: 4, maxlength: 1000, name: "body" });
    const send = h("button", { type: "submit", class: "btn btn-primary btn-lg" }, T.send);
    fill(h("h1", null, T.title), h("p", null, T.stay(b.propertyName, day(b.checkin), day(b.checkout))),
      h("form", { class: "bk-form", on: { submit: async (ev) => {
        ev.preventDefault();
        err.hidden = true;
        if (CATS.some((c) => !scores[c.k])) { err.textContent = T.pick; err.hidden = false; return; }
        send.disabled = true;
        send.textContent = T.sending;
        const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scores, body: text.value }) }).catch(() => null);
        if (r && (r.ok || r.status === 409)) { note(r.ok ? T.thanks : T.done, r.ok ? T.thanksText : null); return; }
        err.textContent = T.failed;
        err.hidden = false;
        send.disabled = false;
        send.textContent = T.send;
      } } },
        h("p", { class: "rv-hint" }, T.score), ...rows,
        h("div", { class: "rv-total" }, h("span", null, T.overall), total, h("span", null, "/10")),
        h("label", { class: "bk-field" }, h("span", null, T.text), text), err, send));
  }

  if (!code || !token) { note(T.invalid); return; }
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject())).then((b) => { if (b.done) note(T.done); else form(b); }).catch(() => note(T.invalid));
})();
