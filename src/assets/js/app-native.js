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
    try { admin = localStorage.getItem("gf_admin_token"); } catch {}
    fetch("/api/push/register", {
      method: "POST",
      headers: { "content-type": "application/json", ...(admin ? { authorization: `Bearer ${admin}` } : {}) },
      body: JSON.stringify({ platform: push.platform, token: push.token, lang: en ? "en" : "ro" }),
    }).catch(() => {});
  }
  window.gfRegisterPush = register;
  window.addEventListener("gf-native-push", register);
  register();

  if (document.body.classList.contains("adm")) return;
  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
    apt: '<path d="M4 20V5.5L12 3l8 2.5V20"/><path d="M2.5 20h19M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10 20v-4h4v4"/>',
    food: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.5 1-4 4-4 8h4"/>',
    pass: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M15 6v2.5M15 11v2M15 15.5V18"/>',
  };
  const tabs = en
    ? [["home", "Home", "/en/"], ["apt", "Apartments", "/en/#apartamente"], ["food", "Bistro", "/en/restaurant/"], ["pass", "Passes", "/en/passes/"]]
    : [["home", "Acasă", "/"], ["apt", "Apartamente", "/#apartamente"], ["food", "Bistro", "/restaurant/"], ["pass", "Abonamente", "/abonamente/"]];
  const bar = document.createElement("nav");
  bar.className = "gf-tabs";
  bar.setAttribute("aria-label", en ? "Main menu" : "Meniu principal");
  for (const [icon, label, href] of tabs) {
    const a = document.createElement("a");
    a.href = href;
    if (!href.includes("#") && location.pathname === href) a.className = "on";
    a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>`;
    a.append(label);
    bar.append(a);
  }
  document.body.append(bar);
})();
