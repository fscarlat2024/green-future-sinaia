// Pagina unui apartament adaugat din panou: datele vin din API. Slug-ul se pune sincron, ca booking.js si review.js sa il gaseasca.
(function () {
  const main = document.querySelector("[data-apartment]");
  if (!main) return;
  const lang = main.dataset.lang === "en" ? "en" : "ro";
  const slug = new URLSearchParams(location.search).get("p") || "";
  const $ = (id) => document.getElementById(id);
  $("bk").dataset.slug = slug;
  $("direct-reviews").dataset.slug = slug;
  $("ap-chat").href = `${lang === "en" ? "/en/messages/" : "/mesaje/"}?p=${encodeURIComponent(slug)}`;
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
    const grid = { photos: p.photos, name: p.name, score: p.booking?.score, count: p.booking?.count, url: p.booking?.url, reviewsHref: p.booking?.url };
    window.gfPhotoGrid?.($("ap-grid"), grid);
    // prima recenzie directa, daca exista, apare in cardul cu nota
    fetch(`/api/properties/${encodeURIComponent(slug)}/reviews`).then((r) => (r.ok ? r.json() : null)).then((rv) => {
      const r = rv?.reviews?.find((x) => x.body && x.body.length > 20);
      if (r) window.gfPhotoGrid?.($("ap-grid"), { ...grid, quote: r.body.length > 180 ? r.body.slice(0, 177) + "…" : r.body, author: r.author, reviewsHref: "#recenzii-directe" });
    }).catch(() => {});
    if (p.amenities.length) {
      $("ap-amenities").append(...p.amenities.map((a) => {
        const d = document.createElement("div");
        const c = document.createElement("span");
        c.className = "ck";
        c.textContent = "✓";
        d.append(c, ` ${a}`);
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
