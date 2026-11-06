// Pagina unde oaspetele isi vede sau isi anuleaza rezervarea, pe baza linkului primit.
(function () {
  const root = document.getElementById("manage");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { missing: "This link is not valid. Please use the link from your booking email.", code: "Booking code", apt: "Apartment", in: "Check-in", out: "Check-out", guests: "Guests", total: "Total", pay: "pay at the property", host: "Host phone",
        status: { pending: "Waiting for the owner's confirmation", confirmed: "Confirmed", declined: "Not confirmed", cancelled: "Cancelled", expired: "Expired" },
        cancel: "Cancel booking", sure: "Are you sure you want to cancel this booking?", noCancel: "The free cancellation period has ended. Please contact the host.", failed: "We could not complete this. Please try again." }
    : { missing: "Linkul nu este valid. Folosește linkul din emailul de rezervare.", code: "Cod rezervare", apt: "Apartament", in: "Sosire", out: "Plecare", guests: "Oaspeți", total: "Total", pay: "plată la proprietate", host: "Telefon gazdă",
        status: { pending: "Așteaptă confirmarea proprietarului", confirmed: "Confirmată", declined: "Neconfirmată", cancelled: "Anulată", expired: "Expirată" },
        cancel: "Anulează rezervarea", sure: "Sigur vrei să anulezi această rezervare?", noCancel: "Perioada de anulare gratuită s-a încheiat. Te rugăm să contactezi gazda.", failed: "Nu am putut finaliza. Te rugăm să încerci din nou." };
  const q = new URLSearchParams(location.search);
  const code = q.get("cod"), token = q.get("t");
  const url = (suffix = "") => `/api/bookings/${encodeURIComponent(code)}${suffix}?token=${encodeURIComponent(token)}`;
  const date = (d) => new Date(d + "T00:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const show = (text) => { const p = document.createElement("p"); p.textContent = text; root.replaceChildren(p); };

  function render(b) {
    const list = document.createElement("dl");
    list.className = "mg-list";
    const rows = [[T.code, b.code], [T.apt, b.propertyName], [T.in, `${date(b.checkin)}, ${b.checkinTime}`], [T.out, `${date(b.checkout)}, ${b.checkoutTime}`],
      [T.guests, b.adults + b.children], [T.total, `${b.total} lei (${T.pay})`]];
    if (b.ownerPhone) rows.push([T.host, b.ownerPhone]);
    for (const [k, v] of rows) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      list.append(dt, dd);
    }
    const badge = document.createElement("span");
    badge.className = `mg-status is-${b.status}`;
    badge.textContent = T.status[b.status] || b.status;
    root.replaceChildren(badge, list);
    if (b.canCancel) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn-ghost"; btn.textContent = T.cancel;
      btn.addEventListener("click", async () => {
        if (!confirm(T.sure)) return;
        btn.disabled = true;
        const r = await fetch(url("/cancel"), { method: "POST" }).catch(() => null);
        if (r && r.ok) render(await r.json());
        else { btn.disabled = false; alert(T.failed); }
      });
      root.append(btn);
    } else if (b.status === "confirmed") {
      const p = document.createElement("p"); p.textContent = T.noCancel; root.append(p);
    }
  }

  if (!code || !token) return show(T.missing);
  fetch(url()).then((r) => (r.ok ? r.json() : Promise.reject())).then(render).catch(() => show(T.missing));
})();
