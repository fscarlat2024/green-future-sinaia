// Contul: autentificare, cont nou, parola uitata si Green Future Club. Proprietarii intra pe acelasi ecran si ajung in panou.
(function () {
  const root = document.getElementById("acc");
  if (!root) return;
  const lang = root.dataset.lang === "en" ? "en" : "ro";
  const T = {
    ro: {
      loginTitle: "Intră în cont", loginSub: "Reduceri la sejururi și la bistro, cu Green Future Club.", email: "Email", password: "Parolă", login: "Intră",
      noAccount: "Creează cont", forgot: "Am uitat parola",
      registerTitle: "Cont nou", registerSub: "Primești reduceri după primele sejururi.", name: "Nume și prenume", phone: "Telefon", newPassword: "Parolă (minimum 8 caractere)",
      accept: "Sunt de acord ca datele mele să fie folosite pentru cont și rezervări.", register: "Creează contul", haveAccount: "Am deja cont",
      forgotTitle: "Parolă uitată", forgotSub: "Îți trimitem pe email un link pentru o parolă nouă.", sendLink: "Trimite linkul", back: "Înapoi",
      sent: "Dacă există un cont cu această adresă, emailul ajunge în câteva minute. Verifică și folderul Spam.",
      resetTitle: "Parolă nouă", savePassword: "Salvează parola", saved: "Parola a fost schimbată. Poți intra în cont.",
      club: "Green Future Club", levels: { member: "Membru", silver: "Silver", gold: "Gold" }, hello: (n) => `Bună, ${n}!`,
      perks: (p) => (p ? `Ai ${p}% reducere la apartamentele participante și la bistro.` : "Rezervă din cont și urci în nivel."),
      next: (n, l, p) => `Încă ${n === 1 ? "1 sejur" : `${n} sejururi`} până la ${l} (${p}% reducere).`, top: "Ai ajuns la cel mai înalt nivel.",
      tiers: [["Membru", "la crearea contului", "member"], ["Silver, 5% reducere", "după 2 sejururi", "silver"], ["Gold, 10% reducere", "după 5 sejururi", "gold"]],
      rules: "Contează sejururile încheiate rezervate din cont. 5 comenzi livrate la bistro contează cât un sejur. Reducerea se aplică la prețul nopților, fără curățenie, la apartamentele ai căror proprietari participă.",
      stats: (s, o) => `${s === 1 ? "1 sejur încheiat" : `${s} sejururi încheiate`} · ${o === 1 ? "1 comandă livrată" : `${o} comenzi livrate`}`,
      offers: "Ofertele tale", valid: (d) => `Valabilă până la ${d}`, off: (p, k) => `-${p}% ${k === "bistro" ? "la bistro" : "la sejur"}`, offerNote: "Reducerea se aplică automat, o singură dată, și nu se adună cu cea de nivel.", useStay: "Rezervă", useBistro: "Vezi meniul",
      messages: "Mesajele mele", unread: (n) => (n === 1 ? "1 mesaj nou" : `${n} mesaje noi`), chatPath: "/mesaje/",
      cardTitle: "Cardul de membru", cardSince: (y) => `Membru din ${y}`, cardNo: "Număr card",
      verifyTitle: "Confirmă-ți emailul", verifyText: (e) => `Am trimis un cod pe ${e}. După confirmare, cardul de membru și rezervările făcute cu acest email apar aici automat.`, verifyAsk: (e) => `Confirmă adresa ${e} și cardul de membru, împreună cu rezervările făcute cu ea, apar aici automat.`, verifySend: "Trimite codul pe email", verifyCode: "Codul din email", verifyBtn: "Confirmă", verifyResend: "Trimite alt cod", verifySent: "Am trimis un cod nou.",
      noCardText: (e) => `Cardul apare automat după prima rezervare confirmată făcută cu ${e}.`,
      orders: "Comenzile mele la bistro", orderStatus: { new: "Trimisă", confirmed: "Confirmată", delivered: "Livrată", cancelled: "Anulată" }, orderTest: "test",
      bookings: "Rezervările mele", noBookings: "Nu ai încă rezervări din acest cont.", book: "Vezi apartamentele", discount: (d) => `reducere ${d} lei`,
      status: { pending: "De confirmat", confirmed: "Confirmată", declined: "Refuzată", cancelled: "Anulată", expired: "Expirată" },
      logout: "Ieșire din cont", deleteOpen: "Șterge contul", deleteTitle: "Ștergi contul?",
      deleteText: "Contul și nivelul tău dispar definitiv. Rezervările rămân la proprietar, fără legătură cu contul.", deleteConfirm: "Șterge definitiv", cancel: "Renunță",
      errors: { code_invalid: "Codul nu este corect.", code_expired: "Codul a expirat. Cere altul.", bad_login: "Email sau parolă greșită.", too_many_requests: "Prea multe încercări. Revino puțin mai târziu.", email_taken: "Există deja un cont cu acest email.", invalid_email: "Adresa de email nu pare corectă.", invalid_name: "Scrie numele complet.", invalid_phone: "Numărul de telefon nu pare corect.", weak_password: "Parola trebuie să aibă cel puțin 8 caractere.", accept_required: "Bifează acordul pentru a continua.", reset_expired: "Linkul a expirat. Cere altul." },
      generic: "Nu am putut finaliza. Încearcă din nou.",
    },
    en: {
      loginTitle: "Sign in", loginSub: "Discounts on stays and at the bistro, with Green Future Club.", email: "Email", password: "Password", login: "Sign in",
      noAccount: "Create account", forgot: "Forgot password",
      registerTitle: "New account", registerSub: "Earn discounts after your first stays.", name: "Full name", phone: "Phone", newPassword: "Password (at least 8 characters)",
      accept: "I agree that my details are used for my account and bookings.", register: "Create account", haveAccount: "I already have an account",
      forgotTitle: "Forgot password", forgotSub: "We will email you a link to choose a new password.", sendLink: "Send link", back: "Back",
      sent: "If an account exists for this address, the email arrives within minutes. Check your Spam folder too.",
      resetTitle: "New password", savePassword: "Save password", saved: "Your password was changed. You can sign in now.",
      club: "Green Future Club", levels: { member: "Member", silver: "Silver", gold: "Gold" }, hello: (n) => `Hello, ${n}!`,
      perks: (p) => (p ? `You get ${p}% off at participating apartments and at the bistro.` : "Book from your account to move up a level."),
      next: (n, l, p) => `${n === 1 ? "1 more stay" : `${n} more stays`} until ${l} (${p}% off).`, top: "You have reached the highest level.",
      tiers: [["Member", "when you sign up", "member"], ["Silver, 5% off", "after 2 stays", "silver"], ["Gold, 10% off", "after 5 stays", "gold"]],
      rules: "Completed stays booked from your account count. 5 delivered bistro orders count as one stay. The discount applies to the nightly price, not to cleaning, at apartments whose owners participate.",
      stats: (s, o) => `${s === 1 ? "1 completed stay" : `${s} completed stays`} · ${o === 1 ? "1 delivered order" : `${o} delivered orders`}`,
      offers: "Your offers", valid: (d) => `Valid until ${d}`, off: (p, k) => `${p}% off ${k === "bistro" ? "at the bistro" : "your stay"}`, offerNote: "The discount applies automatically, once, and does not add to your level discount.", useStay: "Book", useBistro: "See menu",
      messages: "My messages", unread: (n) => (n === 1 ? "1 new message" : `${n} new messages`), chatPath: "/en/messages/",
      cardTitle: "Member card", cardSince: (y) => `Member since ${y}`, cardNo: "Card number",
      verifyTitle: "Confirm your email", verifyText: (e) => `We sent a code to ${e}. Once confirmed, your member card and the bookings made with this email appear here automatically.`, verifyAsk: (e) => `Confirm ${e} and your member card, along with the bookings made with it, appear here automatically.`, verifySend: "Email me the code", verifyCode: "Code from the email", verifyBtn: "Confirm", verifyResend: "Send another code", verifySent: "We sent a new code.",
      noCardText: (e) => `Your card appears automatically after your first confirmed booking made with ${e}.`,
      orders: "My bistro orders", orderStatus: { new: "Sent", confirmed: "Confirmed", delivered: "Delivered", cancelled: "Cancelled" }, orderTest: "test",
      bookings: "My bookings", noBookings: "No bookings from this account yet.", book: "See apartments", discount: (d) => `${d} lei off`,
      status: { pending: "Pending", confirmed: "Confirmed", declined: "Declined", cancelled: "Cancelled", expired: "Expired" },
      logout: "Sign out", deleteOpen: "Delete account", deleteTitle: "Delete your account?",
      deleteText: "Your account and level are permanently removed. Bookings stay with the owner, no longer linked to the account.", deleteConfirm: "Delete permanently", cancel: "Cancel",
      errors: { code_invalid: "This code is not correct.", code_expired: "This code has expired. Please ask for another one.", bad_login: "Wrong email or password.", too_many_requests: "Too many attempts. Please come back a little later.", email_taken: "An account with this email already exists.", invalid_email: "This email address does not look right.", invalid_name: "Please enter your full name.", invalid_phone: "This phone number does not look right.", weak_password: "The password needs at least 8 characters.", accept_required: "Please tick the consent box to continue.", reset_expired: "This link has expired. Please ask for a new one." },
      generic: "We could not complete this. Please try again.",
    },
  }[lang];
  const KEY = "gf_guest_token";
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
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
  // replaceChildren ar scrie "null" pe pagina pentru blocurile care lipsesc
  const fill = (...kids) => root.replaceChildren(...kids.filter((c) => c != null && c !== false));
  const field = (label, name, attrs) => h("label", { class: "bk-field" }, h("span", null, label), h("input", { name, required: true, ...attrs }));
  const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const mark = () => h("span", { class: "gf-mark", "aria-hidden": "true" });
  const link = (label, fn) => h("button", { type: "button", class: "acc-link", on: { click: fn } }, label);

  async function call(path, method, body, token) {
    const r = await fetch(`/api/guest/${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(T.errors[data.error] || T.generic); e.status = r.status; throw e; }
    return data;
  }

  // formular comun: dezactiveaza butonul si arata eroarea sub campuri
  function authForm(title, sub, fields, label, action, after) {
    const err = h("p", { class: "bk-err", role: "alert", hidden: true });
    const btn = h("button", { type: "submit", class: "btn btn-primary btn-lg" }, label);
    const form = h("form", { class: "acc-auth", on: { submit: async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      btn.disabled = true;
      try { await action(Object.fromEntries(new FormData(form).entries())); }
      catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; }
    } } }, mark(), h("h1", null, title), sub ? h("p", { class: "acc-sub" }, sub) : null, fields, err, btn, after);
    fill(form);
  }

  function enter(data) {
    if (data.admin) {
      store.set("gf_admin_token", data.token);
      location.replace("/admin/");
      return;
    }
    store.set(KEY, data.token);
    window.gfRegisterPush?.();
    // revine la conversatia de unde a venit; doar pagini de pe site
    const next = new URLSearchParams(location.search).get("next");
    if (next && /^\/(?![/\\])/.test(next)) { location.replace(next); return; }
    dashboard();
  }

  function showLogin(message) {
    authForm(T.loginTitle, message || T.loginSub,
      [field(T.email, "email", { type: "email", autocomplete: "username" }), field(T.password, "password", { type: "password", autocomplete: "current-password" })],
      T.login, async (f) => enter(await call("login", "POST", f)),
      h("div", { class: "acc-links" }, link(T.noAccount, showRegister), link(T.forgot, showForgot)));
  }

  function showRegister() {
    authForm(T.registerTitle, T.registerSub, [
      field(T.name, "name", { autocomplete: "name", maxlength: "100" }),
      field(T.email, "email", { type: "email", autocomplete: "email", maxlength: "200" }),
      field(T.phone, "phone", { type: "tel", autocomplete: "tel", maxlength: "30" }),
      field(T.newPassword, "password", { type: "password", autocomplete: "new-password", minlength: "8", maxlength: "200" }),
      h("input", { class: "bk-trap", name: "website", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" }),
      h("label", { class: "bk-check" }, h("input", { type: "checkbox", name: "accept", required: true }), h("span", null, T.accept)),
    ], T.register, async (f) => enter(await call("register", "POST", { ...f, accept: f.accept === "on", lang })),
    h("div", { class: "acc-links" }, link(T.haveAccount, () => showLogin())));
  }

  function showForgot() {
    authForm(T.forgotTitle, T.forgotSub, [field(T.email, "email", { type: "email", autocomplete: "email" })], T.sendLink,
      async (f) => { await call("forgot", "POST", f); showLogin(T.sent); },
      h("div", { class: "acc-links" }, link(T.back, () => showLogin())));
  }

  function showReset(token) {
    authForm(T.resetTitle, null, [field(T.newPassword, "password", { type: "password", autocomplete: "new-password", minlength: "8", maxlength: "200" })], T.savePassword,
      async (f) => {
        await call("reset", "POST", { token, password: f.password });
        history.replaceState(null, "", location.pathname);
        store.del(KEY);
        showLogin(T.saved);
      });
  }

  function cardBlock(me, token) {
    const c = me.card || {};
    if (c.state === "active") {
      return h("section", { class: `member-card is-${me.level.key}`, "aria-label": T.cardTitle },
        h("div", { class: "mc-top" }, h("span", { class: "gf-mark", "aria-hidden": "true" }), h("span", { class: "mc-brand" }, "Green Future Club")),
        h("b", { class: "mc-level" }, T.levels[me.level.key]),
        h("div", { class: "mc-bottom" },
          h("div", null, h("span", { class: "mc-name" }, me.name), h("small", null, T.cardSince(c.since))),
          h("div", { class: "mc-no" }, h("small", null, T.cardNo), h("span", null, c.number))));
    }
    if (c.state === "no_booking") return h("section", { class: "acc-card" }, h("h3", null, T.cardTitle), h("p", null, T.noCardText(me.email)));
    const err = h("p", { class: "bk-err", role: "alert", hidden: true });
    const said = h("p", { role: "status", hidden: true });
    if (!c.codeSent) {
      return h("section", { class: "acc-card" }, h("h3", null, T.verifyTitle), h("p", null, T.verifyAsk(me.email)), err,
        h("button", { type: "button", class: "btn btn-primary", on: { click: async () => {
          err.hidden = true;
          try { await call("verify/send", "POST", null, token); dashboard(); }
          catch (e) { err.textContent = e.message; err.hidden = false; }
        } } }, T.verifySend));
    }
    return h("section", { class: "acc-card" }, h("h3", null, T.verifyTitle), h("p", null, T.verifyText(me.email)),
      h("form", { class: "bk-form", on: { submit: async (ev) => {
        ev.preventDefault();
        err.hidden = true;
        try { await call("verify", "POST", { code: new FormData(ev.currentTarget).get("code") }, token); dashboard(); }
        catch (e) { err.textContent = e.message; err.hidden = false; }
      } } }, field(T.verifyCode, "code", { inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6", pattern: "[0-9]{6}" }), err, said,
        h("div", { class: "acc-row" }, h("button", { type: "submit", class: "btn btn-primary" }, T.verifyBtn),
          link(T.verifyResend, async () => {
            err.hidden = true;
            try { await call("verify/send", "POST", null, token); said.textContent = T.verifySent; said.hidden = false; }
            catch (e) { err.textContent = e.message; err.hidden = false; }
          }))));
  }

  async function dashboard() {
    const token = store.get(KEY);
    let me;
    try { me = await call("me", "GET", null, token); }
    catch (e) {
      if (e.status === 401) { store.del(KEY); showLogin(); return; }
      fill(h("p", { class: "bk-err", role: "alert" }, e.message));
      return;
    }
    const chats = (await call("chats", "GET", null, token).catch(() => ({ chats: [] }))).chats;
    const lv = me.level;
    const first = me.name.split(" ")[0];
    const danger = h("div", { class: "acc-card", hidden: true });
    const home = lang === "en" ? "/en/#apartamente" : "/#apartamente";
    danger.append(h("h3", null, T.deleteTitle), h("p", null, T.deleteText));
    const err = h("p", { class: "bk-err", role: "alert", hidden: true });
    danger.append(h("form", { class: "bk-form", on: { submit: async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      try {
        await call("me", "DELETE", { password: new FormData(ev.currentTarget).get("password") }, token);
        store.del(KEY);
        window.gfRegisterPush?.();
        showLogin();
      } catch (e) { err.textContent = e.message; err.hidden = false; }
    } } }, field(T.password, "password", { type: "password", autocomplete: "current-password" }), err,
      h("div", { class: "acc-row" }, h("button", { type: "submit", class: "btn btn-ghost" }, T.deleteConfirm), link(T.cancel, () => { danger.hidden = true; }))));

    fill(
      cardBlock(me, token),
      h("section", { class: "club-card" }, me.card?.state === "active" ? null : [h("small", null, T.club), h("h2", null, T.levels[lv.key])],
        h("p", null, T.hello(first), " ", T.perks(lv.pct)),
        h("p", null, lv.nextKey ? T.next(lv.staysToNext, T.levels[lv.nextKey], lv.nextPct) : T.top),
        h("p", null, T.stats(lv.stays, lv.orders))),
      me.offers.length ? h("section", { class: "acc-card" }, h("h3", null, T.offers),
        me.offers.map((o) => h("article", { class: "offer" },
          h("div", { class: "acc-row" }, h("b", null, o.title), o.pct ? h("span", { class: "offer-pct" }, T.off(o.pct, o.kind)) : null),
          h("p", null, o.body), h("small", null, T.valid(day(o.validTo))),
          o.kind === "info" ? null : h("a", { class: "btn btn-primary", href: o.kind === "bistro" ? (lang === "en" ? "/en/restaurant/" : "/restaurant/") : home }, o.kind === "bistro" ? T.useBistro : T.useStay))),
        me.offers.some((o) => o.pct) ? h("p", null, T.offerNote) : null) : null,
      h("section", { class: "acc-card" },
        h("ul", { class: "club-tiers" }, T.tiers.map(([name, when, key]) => h("li", { class: key === lv.key ? "on" : null }, h("span", null, name), h("span", null, when)))),
        h("p", null, T.rules)),
      chats.length ? h("section", { class: "acc-card" }, h("h3", null, T.messages),
        chats.map((c) => h("a", { class: "acc-chat", href: `${T.chatPath}?p=${encodeURIComponent(c.slug)}` },
          h("div", { class: "acc-row" }, h("b", null, c.name), c.unread ? h("span", { class: "chat-badge" }, T.unread(c.unread)) : null),
          h("span", null, c.last)))) : null,
      h("section", { class: "acc-card" }, h("h3", null, T.bookings),
        me.bookings.length
          ? me.bookings.map((b) => h("div", { class: "acc-booking" },
              h("div", { class: "acc-row" }, h("b", null, b.property_name), h("span", { class: `mg-status is-${b.status}` }, T.status[b.status] || b.status)),
              h("span", null, `${day(b.checkin)} - ${day(b.checkout)} · ${b.total} lei${b.discount ? ` (${T.discount(b.discount)})` : ""} · ${b.code}`)))
          : [h("p", null, T.noBookings), h("a", { class: "btn btn-ghost", href: home }, T.book)]),
      me.orders?.length ? h("section", { class: "acc-card" }, h("h3", null, T.orders),
        me.orders.map((o) => h("div", { class: "acc-booking" },
          h("div", { class: "acc-row" }, h("b", null, `${o.total} lei · ${o.apartment}`), h("span", { class: `mg-status is-${o.status === "new" ? "pending" : o.status === "delivered" ? "confirmed" : o.status}` }, `${T.orderStatus[o.status] || o.status}${o.demo ? ` (${T.orderTest})` : ""}`)),
          h("span", null, o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")),
          h("small", null, `${new Date(o.createdAt).toLocaleString(lang === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${o.code}`)))) : null,
      h("div", { class: "acc-links" },
        link(T.logout, async () => { await call("logout", "POST", null, token).catch(() => {}); store.del(KEY); window.gfRegisterPush?.(); showLogin(); }),
        link(T.deleteOpen, () => { danger.hidden = false; danger.scrollIntoView({ behavior: "smooth", block: "center" }); })),
      danger);
  }

  const reset = new URLSearchParams(location.search).get("reset");
  if (reset) showReset(reset);
  else if (window.GF_NATIVE && store.get("gf_admin_token")) location.replace("/admin/");
  else if (store.get(KEY)) dashboard();
  else showLogin();
})();
