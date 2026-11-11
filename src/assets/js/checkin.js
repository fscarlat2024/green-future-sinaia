// Check-in online: oaspetele trimite poza buletinului si bifeaza regulamentul. Poza ajunge doar la proprietar.
(function () {
  const root = document.getElementById("checkin");
  if (!root) return;
  const en = root.dataset.lang === "en";
  const T = en ? {
    missing: "This check-in link is not valid. Ask the host for the correct link.",
    closed: "This booking is no longer active.",
    failed: "Could not load the page. Check your connection and try again.",
    intro: "Send a photo of the ID of the person who made the booking and confirm that you have read the rules. Only the owner of the apartment sees the photo, and it is deleted automatically 30 days after check-out.",
    name: "Full name, as on the ID", phone: "Phone (optional)", in: "Check-in", out: "Check-out",
    photo: "Photo of the ID card or passport", photoHint: "Take a photo or choose one from the gallery. Make sure the text is readable.",
    condo: "Green Future condominium rules", house: "Apartment rules",
    agreeCondo: "I have read and accept the condominium rules.", agreeHouse: "I have read and accept the apartment rules.",
    send: "Send check-in", sending: "Sending...", done: "Thank you! Your check-in has reached the owner. See you soon!",
    already: "You already sent the check-in for this booking. You can send it again if something changed.",
    noPhoto: "Add the photo of the ID.", badPhoto: "The photo could not be read. Try a JPG or PNG photo.",
    errors: { invalid_name: "Write your full name.", invalid_dates: "Check the dates: check-out must be after check-in.", rules_required: "Tick that you accept the rules.", photo_too_large: "The photo is too large.", invalid_photo: "The file is not a valid photo.", photo_required: "Add the photo of the ID.", too_many_requests: "Too many attempts. Try again later." },
  } : {
    missing: "Linkul de check-in nu este valid. Cere-i gazdei linkul corect.",
    closed: "Rezervarea nu mai este activă.",
    failed: "Pagina nu s-a putut încărca. Verifică internetul și încearcă din nou.",
    intro: "Trimite poza actului de identitate al persoanei care a făcut rezervarea și confirmă că ai citit regulamentul. Poza o vede doar proprietarul apartamentului și se șterge automat la 30 de zile după plecare.",
    name: "Nume complet, ca în buletin", phone: "Telefon (opțional)", in: "Sosire", out: "Plecare",
    photo: "Poza buletinului sau a pașaportului", photoHint: "Fă o poză sau alege una din galerie. Verifică să se citească scrisul.",
    condo: "Regulamentul condominiului Green Future", house: "Regulamentul apartamentului",
    agreeCondo: "Am citit și accept regulamentul condominiului.", agreeHouse: "Am citit și accept regulamentul apartamentului.",
    send: "Trimite check-in-ul", sending: "Se trimite...", done: "Mulțumim! Check-in-ul a ajuns la proprietar. Te așteptăm!",
    already: "Ai trimis deja check-in-ul pentru această rezervare. Îl poți trimite din nou dacă s-a schimbat ceva.",
    noPhoto: "Adaugă poza buletinului.", badPhoto: "Poza nu a putut fi citită. Încearcă o poză JPG sau PNG.",
    errors: { invalid_name: "Scrie numele complet.", invalid_dates: "Verifică datele: plecarea trebuie să fie după sosire.", rules_required: "Bifează că accepți regulamentul.", photo_too_large: "Poza e prea mare.", invalid_photo: "Fișierul nu e o poză validă.", photo_required: "Adaugă poza buletinului.", too_many_requests: "Prea multe încercări. Încearcă mai târziu." },
  };
  const q = new URLSearchParams(location.search);
  const params = new URLSearchParams();
  for (const k of ["b", "t", "p", "k"]) if (q.get(k)) params.set(k, q.get(k));
  const api = `/api/checkin?${params}`;
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) n.setAttribute(k, v === true ? "" : v);
    n.append(...kids.flat().filter((c) => c != null));
    return n;
  };
  const say = (text) => root.replaceChildren(el("p", null, text));
  if (!(q.get("b") && q.get("t")) && !(q.get("p") && q.get("k"))) return say(T.missing);

  // micsoreaza poza in browser; buletinul trebuie sa ramana lizibil
  async function shrink(file) {
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    return { blob, preview: c.toDataURL("image/jpeg", 0.6) };
  }

  const rulesBox = (title, text, name, agree) => el("div", { class: "ci-rules" },
    el("h2", null, title), el("div", { class: "ci-rules-text", tabindex: "0" }, text),
    el("label", { class: "bk-check" }, el("input", { type: "checkbox", name, required: true }), el("span", null, agree)));

  function render(d) {
    document.getElementById("ci-apt").textContent = d.propertyName;
    const pre = d.prefill;
    let photo = null;
    const preview = el("img", { class: "ci-preview", alt: "", hidden: true });
    const photoErr = el("p", { class: "bk-err", hidden: true });
    const file = el("input", { type: "file", accept: "image/*", "aria-label": T.photo });
    file.addEventListener("change", async () => {
      photo = null; preview.hidden = true; photoErr.hidden = true;
      const f = file.files[0];
      if (!f) return;
      try {
        const r = await shrink(f);
        if (!r.blob) throw new Error();
        photo = r.blob; preview.src = r.preview; preview.hidden = false;
      } catch { photoErr.textContent = T.badPhoto; photoErr.hidden = false; }
    });
    const err = el("p", { class: "bk-err", role: "alert", hidden: true });
    const btn = el("button", { class: "btn btn-primary", type: "submit" }, T.send);
    const day = (s) => new Date(s + "T00:00:00Z").toLocaleDateString(en ? "en-GB" : "ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const dates = pre
      ? el("dl", { class: "mg-list" }, el("dt", null, T.in), el("dd", null, day(pre.checkin)), el("dt", null, T.out), el("dd", null, day(pre.checkout)))
      : el("div", { class: "adm-row ci-dates" },
        el("label", { class: "bk-field" }, el("span", null, T.in), el("input", { type: "date", name: "checkin", required: true })),
        el("label", { class: "bk-field" }, el("span", null, T.out), el("input", { type: "date", name: "checkout", required: true })));
    const form = el("form", { class: "ci-form", novalidate: true },
      d.doneAt ? el("p", { class: "ci-done" }, T.already) : null,
      el("p", null, T.intro),
      el("label", { class: "bk-field" }, el("span", null, T.name), el("input", { name: "name", required: true, maxlength: "100", autocomplete: "name", value: pre?.name || "" })),
      el("label", { class: "bk-field" }, el("span", null, T.phone), el("input", { name: "phone", type: "tel", maxlength: "30", autocomplete: "tel", value: pre?.phone || "" })),
      dates,
      el("div", { class: "bk-field" }, el("span", null, T.photo), el("small", null, T.photoHint), file, preview, photoErr),
      d.condoRules ? rulesBox(T.condo, d.condoRules, "condo", T.agreeCondo) : null,
      d.houseRules ? rulesBox(T.house, d.houseRules, "house", T.agreeHouse) : null,
      err, btn);
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      const fail = (m) => { err.textContent = m; err.hidden = false; };
      if (form.elements.name.value.trim().length < 3) return fail(T.errors.invalid_name);
      if (!pre && (!form.elements.checkin.value || !form.elements.checkout.value || form.elements.checkin.value >= form.elements.checkout.value)) return fail(T.errors.invalid_dates);
      if (!photo) return fail(T.noPhoto);
      if ([...form.querySelectorAll("input[type=checkbox]")].some((c) => !c.checked)) return fail(T.errors.rules_required);
      const body = new FormData();
      body.set("name", form.elements.name.value.trim());
      body.set("phone", form.elements.phone.value.trim());
      if (!pre) { body.set("checkin", form.elements.checkin.value); body.set("checkout", form.elements.checkout.value); }
      if (form.elements.condo?.checked) body.set("condo", "on");
      if (form.elements.house?.checked) body.set("house", "on");
      body.set("lang", en ? "en" : "ro");
      body.set("photo", photo, "act.jpg");
      btn.disabled = true; btn.textContent = T.sending;
      try {
        const r = await fetch(api, { method: "POST", body });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(T.errors[data.error] || T.failed);
        root.replaceChildren(el("p", { class: "ci-done" }, T.done));
      } catch (e) {
        btn.disabled = false; btn.textContent = T.send;
        fail(e.message);
      }
    });
    root.replaceChildren(form);
  }

  fetch(api).then(async (r) => {
    const d = await r.json().catch(() => ({}));
    if (r.status === 409) return say(T.closed);
    if (!r.ok) return say(r.status === 404 ? T.missing : T.failed);
    render(d);
  }).catch(() => say(T.failed));
})();
