// Pagina unui apartament adaugat din panou: datele vin din API. Slug-ul se pune sincron, ca booking.js si review.js sa il gaseasca.
(function () {
  const main = document.querySelector("[data-apartment]");
  if (!main) return;
  const lang = main.dataset.lang === "en" ? "en" : "ro";
  const slug = new URLSearchParams(location.search).get("p") || "";
  const $ = (id) => document.getElementById(id);
  $("bk").dataset.slug = slug;
  $("direct-reviews").dataset.slug = slug;
  const missing = () => { $("ap-missing").hidden = false; };
  if (!slug) { missing(); return; }
  fetch(`/api/properties/${encodeURIComponent(slug)}/details?lang=${lang}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((p) => {
    // titlul complet (pentru Google) il pune serverul; aici doar daca lipseste
    if (!document.title.includes(p.name)) document.title = `${p.name} - Green Future Sinaia`;
    $("ap-name").textContent = p.name;
    $("ap-sub").textContent = [lang === "en" ? `${p.capacity} guests` : `${p.capacity} persoane`, p.roomType].filter(Boolean).join(" · ");
    $("ap-tagline").textContent = p.tagline || "";
    if (p.story) {
      $("ap-story").append(...p.story.split(/\n+/).filter(Boolean).map((t) => { const e = document.createElement("p"); e.textContent = t; return e; }));
      $("ap-story").hidden = false;
    }
    const bk = (p.bookingReviews || []).map((r) => ({ text: r.text, author: r.author }));
    const grid = { photos: p.photos, name: p.name, score: p.booking?.score, count: p.booking?.count, url: p.booking?.url, quotes: bk, reviewsHref: p.booking?.score ? "#recenzii" : "", ownerHref: `${lang === "en" ? "/en/messages/" : "/mesaje/"}?p=${encodeURIComponent(slug)}` };
    window.gfPhotoGrid?.($("ap-grid"), grid);
    // sectiunea "Ce spun oaspetii" de jos, cu nota si recenziile de pe Booking ale acestei proprietati
    if (p.booking?.score) {
      const s = Math.round(Number(p.booking.score) * 10) / 10;
      const W = lang === "en" ? ["Exceptional", "Superb", "Fabulous", "Very good", "Good"] : ["Excepțional", "Superb", "Fabulos", "Foarte bine", "Bine"];
      $("bk-score").textContent = String(s).replace(".", lang === "en" ? "." : ",");
      $("bk-word").textContent = s >= 9.5 ? W[0] : s >= 9 ? W[1] : s >= 8.5 ? W[2] : s >= 8 ? W[3] : W[4];
      $("bk-count").textContent = p.booking.count || 0;
      if (p.booking.url) { $("bk-link").href = p.booking.url; $("bk-link").hidden = false; }
      $("bk-quotes").append(...bk.map((r) => {
        const f = document.createElement("figure"), q = document.createElement("blockquote"), c = document.createElement("figcaption");
        f.className = "quote";
        q.textContent = r.text;
        c.textContent = "— " + (r.author || (lang === "en" ? "Booking guest" : "Oaspete pe Booking"));
        f.append(q, c);
        return f;
      }));
      $("recenzii").hidden = false;
    }
    // prima recenzie directa, daca exista, apare in cardul cu nota
    fetch(`/api/properties/${encodeURIComponent(slug)}/reviews`).then((r) => (r.ok ? r.json() : null)).then((rv) => {
      const quotes = (rv?.reviews || []).filter((x) => x.body && x.body.length > 20).slice(0, 8)
        .map((x) => ({ text: x.body.length > 180 ? x.body.slice(0, 177) + "…" : x.body, author: x.author }));
      if (quotes.length) window.gfPhotoGrid?.($("ap-grid"), { ...grid, quotes: [...quotes, ...bk], reviewsHref: "#recenzii-directe" });
    }).catch(() => {});
    if (p.amenities.length) {
      $("dotari").append(...p.amenities.map((a) => {
        const d = document.createElement("span");
        const c = document.createElement("span");
        c.className = "ck";
        c.textContent = "✓";
        d.append(c, a);
        return d;
      }));
      $("dotari").hidden = false;
    }
    if (p.description) {
      $("ap-desc").append(...p.description.split(/\n+/).filter(Boolean).map((t) => { const e = document.createElement("p"); e.textContent = t; return e; }));
      $("despre").hidden = false;
    }
    main.hidden = false;
    $("rezervare").hidden = false;
  }).catch(missing);
})();
