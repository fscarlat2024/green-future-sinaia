// Ruleaza doar in aplicatia iOS: inregistreaza telefonul pentru notificari si pune bara de jos.
(function () {
  if (!window.GF_NATIVE) return;
  const root = document.documentElement;
  const en = root.lang === "en";
  root.classList.add("gf-app");

  function register() {
    const push = window.GF_NATIVE_PUSH;
    if (!push) return;
    let admin = null;
    let guest = null;
    try { admin = localStorage.getItem("gf_admin_token"); guest = localStorage.getItem("gf_guest_token"); } catch {}
    fetch("/api/push/register", {
      method: "POST",
      headers: { "content-type": "application/json", ...(admin ? { authorization: `Bearer ${admin}` } : {}) },
      body: JSON.stringify({ platform: push.platform, token: push.token, lang: en ? "en" : "ro", guestToken: guest }),
    }).catch(() => {});
  }
  window.gfRegisterPush = register;
  window.addEventListener("gf-native-push", register);
  register();

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
    apt: '<path d="M4 20V5.5L12 3l8 2.5V20"/><path d="M2.5 20h19M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10 20v-4h4v4"/>',
    food: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.5 1-4 4-4 8h4"/>',
    spa: '<path d="M2.5 15c1.6 0 1.6-1.5 3.2-1.5S7.3 15 8.9 15s1.6-1.5 3.1-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.5 1.5 3.1 1.5"/><path d="M2.5 19.5c1.6 0 1.6-1.5 3.2-1.5s1.6 1.5 3.2 1.5 1.6-1.5 3.1-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.5 1.5 3.1 1.5"/><path d="M8 11.5V5.5a2 2 0 0 1 4 0M16 11.5V5.5a2 2 0 0 0-4 0M8 8.5h8"/>',
    gym: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.500 2 7.500 6"/>',
  };
  const tabs = en
    ? [["home", "Home", "/en/"], ["apt", "Apartments", "/en/#apartamente"], ["food", "Bistro", "/en/restaurant/"], ["spa", "Pool & Spa", "/en/passes/#spa"], ["gym", "Fitness", "/en/passes/#sala"], ["user", "Account", "/en/account/"]]
    : [["home", "Acasă", "/"], ["apt", "Apartamente", "/#apartamente"], ["food", "Bistro", "/restaurant/"], ["spa", "Piscină & Spa", "/abonamente/#spa"], ["gym", "Fitness", "/abonamente/#sala"], ["user", "Cont", "/cont/"]];
  const bar = document.createElement("nav");
  bar.className = "gf-tabs";
  bar.setAttribute("aria-label", en ? "Main menu" : "Meniu principal");
  for (const [icon, label, href] of tabs) {
    const a = document.createElement("a");
    a.href = href;
    if ((!href.includes("#") && location.pathname === href) || (icon === "user" && location.pathname.startsWith("/admin")) || (icon === "apt" && /^\/(en\/)?apart/.test(location.pathname))) a.className = "on";
    if (icon === "spa" || icon === "gym") a.dataset.pass = icon;
    a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>`;
    a.append(label);
    bar.append(a);
  }
  document.body.append(bar);
  const markPass = () => {
    const onPasses = /^\/(abonamente|en\/passes)\/?$/.test(location.pathname);
    const gym = location.hash === "#sala";
    bar.querySelectorAll("[data-pass]").forEach((a) => a.classList.toggle("on", onPasses && (a.dataset.pass === "gym") === gym));
  };
  markPass();
  window.addEventListener("hashchange", markPass);
})();
