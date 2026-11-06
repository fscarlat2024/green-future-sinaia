// Conversatia oaspetelui cu proprietarul unui apartament. Mesajele noi se citesc la cateva secunde cat pagina e deschisa.
(function () {
  const root = document.getElementById("chat");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = lang === "en"
    ? { title: "Message the owner", login: "Sign in to message the owner. You get the answer here and as a notification.", enter: "Sign in", placeholder: "Write your question", send: "Send", empty: "Ask anything about the apartment. Only the owner sees your messages.", back: "Back", failed: "The message could not be sent. Please try again.", limit: "Too many messages. Please come back a little later.", missing: "This apartment was not found.", account: "/en/account/" }
    : { title: "Scrie proprietarului", login: "Intră în cont ca să scrii proprietarului. Primești răspunsul aici și prin notificare.", enter: "Intră în cont", placeholder: "Scrie întrebarea ta", send: "Trimite", empty: "Întreabă orice despre apartament. Mesajele le vede doar proprietarul.", back: "Înapoi", failed: "Mesajul nu a putut fi trimis. Încearcă din nou.", limit: "Prea multe mesaje. Revino puțin mai târziu.", missing: "Apartamentul nu a fost găsit.", account: "/cont/" };
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
  const slug = new URLSearchParams(location.search).get("p") || "";
  let token = null;
  try { token = localStorage.getItem("gf_guest_token"); } catch {}
  const backBtn = () => h("button", { type: "button", class: "chat-back", "aria-label": T.back, on: { click: () => { if (history.length > 1) history.back(); else location.href = T.account; } } }, "‹");

  if (!slug) { root.replaceChildren(h("p", { class: "chat-note" }, T.missing)); return; }
  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    root.replaceChildren(h("header", { class: "chat-head" }, backBtn(), h("b", null, T.title)),
      h("div", { class: "chat-gate" }, h("p", null, T.login), h("a", { class: "btn btn-primary btn-lg", href: `${T.account}?next=${next}` }, T.enter)));
    return;
  }

  const api = (method, body) => fetch(`/api/guest/chat/${encodeURIComponent(slug)}`, {
    method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  const nameEl = h("b", null, T.title);
  const list = h("div", { class: "chat-list", role: "log", "aria-live": "polite" });
  const err = h("p", { class: "bk-err", role: "alert", hidden: true });
  const input = h("textarea", { rows: 1, maxlength: 1000, placeholder: T.placeholder, "aria-label": T.placeholder });
  const btn = h("button", { type: "submit", class: "btn btn-primary" }, T.send);
  const time = (ms) => new Date(ms).toLocaleString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  let shown = -1;

  function draw(messages) {
    if (messages.length === shown) return;
    shown = messages.length;
    list.replaceChildren(...(messages.length
      ? messages.map((m) => h("div", { class: `msg ${m.sender === "guest" ? "me" : "them"}` }, h("span", null, m.body), h("small", null, time(m.created_at))))
      : [h("p", { class: "chat-note" }, T.empty)]));
    list.scrollTop = list.scrollHeight;
  }
  async function load() {
    const r = await api("GET").catch(() => null);
    if (!r) return;
    if (r.status === 401) {
      try { localStorage.removeItem("gf_guest_token"); } catch {}
      location.replace(`${T.account}?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (r.status === 404) { stop(); root.replaceChildren(h("p", { class: "chat-note" }, T.missing)); return; }
    if (!r.ok) return;
    const data = await r.json();
    nameEl.textContent = data.propertyName;
    draw(data.messages);
  }
  const form = h("form", { class: "chat-form", on: { submit: async (ev) => {
    ev.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    err.hidden = true;
    btn.disabled = true;
    const r = await api("POST", { body }).catch(() => null);
    btn.disabled = false;
    if (r && r.ok) { input.value = ""; input.style.height = ""; shown = -1; await load(); return; }
    err.textContent = r && r.status === 429 ? T.limit : T.failed;
    err.hidden = false;
  } } }, input, btn);
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; });

  root.replaceChildren(h("header", { class: "chat-head" }, backBtn(), nameEl), list, err, form);
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { if (!timer) timer = setInterval(load, 6000); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else { load(); start(); } });
  load();
  start();
})();
