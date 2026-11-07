// Cautare pe date pe prima pagina. Apare doar daca exista cel putin un apartament rezervabil.
(function () {
  const form = document.getElementById("search");
  if (!form) return;
  const lang = form.dataset.lang === "en" ? "en" : "ro";
  const dynamicSlugs = new Set();
  const T = lang === "en"
    ? { free: "Available", busy: "Unavailable", total: (t, n) => [`${t} lei`, `for ${n} ${n === 1 ? "night" : "nights"}`], from: (p) => [`from ${p} lei`, "per night"],
        min: (n) => `Minimum ${n} nights`, cap: (n) => `Up to ${n} guests`, dates: "Check-out must be after check-in.", pick: "Please choose your check-in and check-out dates.", past: "Check-in cannot be in the past.", soon: "Soon", none: "No apartment is available for these dates. Try other dates.",
        noneFor: (g) => `We have no availability for ${g} guests on these dates. Try other dates or fewer guests.`, comboTitle: (g, n) => `For ${g} guests we recommend ${n} apartments`, comboGuests: (g) => `${g} ${g === 1 ? "guest" : "guests"}`, recommended: "Recommended", comboTotal: "Total", comboNote: "Each apartment is booked separately, with its own owner.", path: (s) => (dynamicSlugs.has(s) ? `/en/apartment/?p=${s}&` : `/en/apartments/${s}/?`), reviewsEmpty: "New", book: "See apartment", guestsN: (n) => `${n} guests`, available: "Available" }
    : { free: "Disponibil", busy: "Indisponibil", total: (t, n) => [`${t} lei`, `pentru ${n} ${n === 1 ? "noapte" : "nopți"}`], from: (p) => [`de la ${p} lei`, "pe noapte"],
        min: (n) => `Minimum ${n} nopți`, cap: (n) => `Maximum ${n} persoane`, dates: "Plecarea trebuie să fie după sosire.", pick: "Alege data sosirii și data plecării.", past: "Sosirea nu poate fi în trecut.", soon: "În curând", none: "Niciun apartament nu e liber în aceste date. Încearcă alte date.",
        noneFor: (g) => `Nu avem disponibilitate pentru ${g} persoane în aceste date. Încearcă alte date sau mai puține persoane.`, comboTitle: (g, n) => `Pentru ${g} persoane îți recomandăm ${n} apartamente`, comboGuests: (g) => `${g} ${g === 1 ? "persoană" : "persoane"}`, recommended: "Recomandat", comboTotal: "Total", comboNote: "Fiecare apartament se rezervă separat, la proprietarul lui.", path: (s) => (dynamicSlugs.has(s) ? `/apartament/?p=${s}&` : `/apartamente/${s}/?`), reviewsEmpty: "Nou", book: "Vezi apartamentul", guestsN: (n) => `${n} persoane`, available: "Disponibil" };
  const msg = document.getElementById("search-msg");
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const todayStr = local(new Date());
  form.elements.checkin.min = todayStr;
  form.elements.checkout.min = todayStr;
  form.elements.checkin.addEventListener("change", () => { form.elements.checkout.min = form.elements.checkin.value || todayStr; });

  const setPrice = (el, [main, sub]) => {
    const b = document.createElement("b");
    b.textContent = main;
    const s = document.createElement("small");
    s.textContent = sub;
    el.replaceChildren(b, s);
  };
  const cards = new Map([...document.querySelectorAll(".apt[data-slug]")].map((el) => [el.dataset.slug, el]));
  const basePrices = new Map();
  // la date gresite nu raman afisate rezultatele cautarii de dinainte
  const clearResults = () => {
    document.body.classList.remove("has-search");
    const box = document.getElementById("combo");
    box.hidden = true;
    box.replaceChildren();
    for (const [slug, card] of cards) {
      const pill = card.querySelector(".tagpill");
      pill.textContent = T.free;
      pill.classList.remove("is-busy");
      if (basePrices.has(slug)) setPrice(card.querySelector(".price"), T.from(basePrices.get(slug)));
      card.querySelectorAll("a.apt-link").forEach((a) => a.setAttribute("href", a.getAttribute("href").replace(/([?&])checkin=.*$/, "").replace(/[?&]$/, "")));
    }
  };

  // apartamentele adaugate din panou, in lista, inainte de "In curand"
  const addListing = (p) => {
    dynamicSlugs.add(p.slug);
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const card = el("article", "apt");
    card.dataset.slug = p.slug;
    const ph = el("div", "ph");
    if (p.photo) { const img = el("img"); img.src = p.photo; img.alt = ""; img.loading = "lazy"; ph.append(img); }
    const body = el("div", "body");
    const h3 = el("h3");
    const a = el("a", "apt-link", p.name);
    a.href = `${lang === "en" ? "/en/apartment/" : "/apartament/"}?p=${encodeURIComponent(p.slug)}`;
    h3.append(a);
    const meta = el("div", "meta");
    meta.append(el("span", null, T.guestsN(p.capacity)));
    if (p.roomType) meta.append(el("span", null, "·"), el("span", null, p.roomType));
    body.append(h3, meta);
    if (p.tagline) body.append(el("p", "desc", p.tagline));
    body.append(el("span", "tagpill", T.available));
    const side = el("div", "apt-side");
    side.append(el("div", "price"), el("span", "btn btn-primary apt-go", T.book));
    card.append(ph, body, side);
    const soon = document.querySelector(".apts .apt:not([data-slug])");
    document.querySelector(".apts").insertBefore(card, soon);
    cards.set(p.slug, card);
  };
  fetch("/api/listings").then((r) => (r.ok ? r.json() : { listings: [] })).then((d) => d.listings.forEach(addListing)).catch(() => {}).then(() => fetch("/api/properties")).then((r) => (r.ok ? r.json() : null)).then((data) => {
    if (!data || !data.properties.length) return;
    form.hidden = false;
    for (const p of data.properties) {
      const card = cards.get(p.slug);
      basePrices.set(p.slug, p.basePrice);
      if (card) setPrice(card.querySelector(".price"), T.from(p.basePrice));
    }
  }).catch(() => {});

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const checkin = form.elements.checkin.value;
    const checkout = form.elements.checkout.value;
    const guests = form.elements.guests.value;
    msg.textContent = "";
    const wrong = !checkin || !checkout ? T.pick : checkin < todayStr ? T.past : checkin >= checkout ? T.dates : "";
    if (wrong) { clearResults(); msg.textContent = wrong; return; }
    const qs = new URLSearchParams({ checkin, checkout, guests });
    const r = await fetch(`/api/search?${qs}`).catch(() => null);
    const data = r && r.ok ? await r.json() : null;
    if (!data) { msg.textContent = lang === "en" ? "Search failed. Please try again." : "Căutarea nu a mers. Te rugăm să încerci din nou."; return; }
    // dupa cautare, rezultatele vin imediat sub formular, fara prezentarea complexului
    document.body.classList.add("has-search");
    let free = 0;
    for (const res of data.results) {
      const card = cards.get(res.slug);
      if (!card) continue;
      const pill = card.querySelector(".tagpill");
      const price = card.querySelector(".price");
      pill.textContent = res.available ? T.free : T.busy;
      pill.classList.toggle("is-busy", !res.available);
      if (res.available) setPrice(price, T.total(res.total, res.nights));
      else price.textContent = res.reason === "min_nights" ? T.min(res.minNights)
        : res.reason === "too_many_guests" ? T.cap(res.capacity) : T.busy;
      card.querySelectorAll("a.apt-link").forEach((a) => {
        a.setAttribute("href", `${T.path(res.slug)}${qs}`);
      });
      if (res.available) free++;
    }
    const box = document.getElementById("combo");
    box.hidden = !data.combo;
    box.replaceChildren();
    if (data.combo) {
      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
      box.append(el("h3", null, T.comboTitle(data.combo.guests, data.combo.items.length)));
      for (const it of data.combo.items) {
        // cardul din lista nu spune "indisponibil" despre un apartament recomandat
        const own = cards.get(it.slug);
        if (own) {
          const pill = own.querySelector(".tagpill");
          pill.textContent = T.recommended;
          pill.classList.remove("is-busy");
          setPrice(own.querySelector(".price"), T.total(it.total, it.nights));
          own.querySelectorAll("a.apt-link").forEach((l) => l.setAttribute("href", `${T.path(it.slug)}${new URLSearchParams({ checkin, checkout, guests: it.guests })}`));
        }
        const a = el("a", "combo-item");
        a.href = `${T.path(it.slug)}${new URLSearchParams({ checkin, checkout, guests: it.guests })}`;
        a.append(el("b", null, it.name), el("span", null, T.comboGuests(it.guests)), el("span", "combo-price", `${it.total} lei`));
        box.append(a);
      }
      const sum = el("div", "combo-total");
      sum.append(el("span", null, T.comboTotal), el("b", null, `${data.combo.total} lei`));
      box.append(sum, el("p", null, T.comboNote));
    } else if (!free) {
      msg.textContent = Number(guests) > 1 && data.results.some((r) => r.reason === "too_many_guests") ? T.noneFor(guests) : T.none;
    }
    document.getElementById("apartamente").scrollIntoView({ behavior: "smooth" });
  });
})();
