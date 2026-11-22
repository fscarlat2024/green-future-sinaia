// Pagina Abonamente: preturile vin de pe server (le schimba contul Attitude din panou).
// Ce e scris in pagina ramane ca rezerva daca serverul nu raspunde.
(function () {
  const lang = document.documentElement.lang === "en" ? "en" : "ro";
  const L = lang === "en"
    ? { unit: "lei", adults: "adults", children: "children", students: "students", pay: "Pay by card", soon: "Coming soon" }
    : { unit: "lei", adults: "adulți", children: "copii", students: "elevi", pay: "Plătește cu cardul", soon: "În curând" };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  fetch("/api/passes").then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !Array.isArray(d.groups)) return;
    for (const g of d.groups) {
      const box = document.querySelector(`[data-pass-plans="${g.id}"]`);
      if (!box) continue;
      const sec = box.closest("section");
      const desc = sec.querySelector("[data-pass-desc]");
      const status = sec.querySelector("[data-pass-status]");
      if (desc) desc.textContent = g[`desc_${lang}`] || g.desc_ro;
      if (status) { const s = g[`status_${lang}`] || ""; status.textContent = s; status.hidden = !s; }
      const second = L[box.dataset.second] || "";
      const soonId = `soon-${g.id}`;
      box.replaceChildren(...g.plans.map((p) => {
        const a = el("article", `plan${p.featured ? " is-featured" : ""}`);
        const price = el("div", "plan-price");
        price.append(el("b", null, String(p.adult)), ` ${L.unit} `, el("small", null, L.adults));
        const btn = el("button", "btn btn-pay", L.pay);
        btn.type = "button"; btn.disabled = true; btn.setAttribute("aria-describedby", soonId);
        a.append(el("h3", null, p[`name_${lang}`] || p.name_ro), el("span", "plan-period", p[`period_${lang}`] || p.period_ro), price,
          el("div", "plan-other", `${p.other} ${L.unit} ${second}`), btn, el("span", "plan-soon", L.soon));
        return a;
      }));
    }
    const ex = document.querySelector("[data-pass-extras]");
    if (ex && Array.isArray(d.extras)) {
      ex.replaceChildren(...d.extras.map((e) => { const li = el("li"); li.append(el("span", null, e[lang] || e.ro), el("b", null, `${e.price} ${L.unit}`)); return li; }));
    }
  }).catch(() => {});
})();

// Piscină & Spa (#spa) și Fitness (#sala) din meniu: arată doar secțiunea aleasă, fără poza celeilalte.
(function () {
  const groups = document.querySelectorAll(".pass-group");
  const extras = document.querySelector(".extras");
  if (!groups.length) return;
  const apply = () => {
    const h = location.hash.slice(1);
    const only = h === "spa" || h === "sala" ? h : "";
    groups.forEach((g) => { g.style.display = only && g.id !== only ? "none" : ""; });
    if (extras) extras.style.display = only === "sala" ? "none" : "";
  };
  apply();
  window.addEventListener("hashchange", apply);
})();
