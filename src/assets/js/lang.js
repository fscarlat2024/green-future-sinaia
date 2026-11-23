// Limba: la prima vizita, cine are telefonul pe alta limba decat romana ajunge direct pe varianta in engleza.
// Alegerea facuta din butonul RO | EN se tine minte. Motoarele de cautare nu sunt redirectionate.
(function () {
  var html = document.documentElement;
  var urlEn = html.getAttribute("data-url-en"), urlRo = html.getAttribute("data-url-ro");
  var get = function () { try { return localStorage.getItem("gf_lang"); } catch (e) { return null; } };
  var set = function (v) { try { localStorage.setItem("gf_lang", v); } catch (e) {} };
  var extra = location.search + location.hash; // pastreaza ?p=... la paginile de apartament
  if (html.lang === "ro" && urlEn && !get() && !/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) {
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]).join(",").toLowerCase();
    if (langs && !/(^|,)ro\b/.test(langs)) { set("en"); location.replace(urlEn + extra); return; }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var links = document.querySelectorAll(".lang-switch a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i], to = a.getAttribute("href");
      if (to === urlRo || to === urlEn) {
        if (location.search) a.setAttribute("href", to + location.search);
        a.addEventListener("click", function (ev) { set(ev.currentTarget.getAttribute("href").indexOf("/en/") === 0 ? "en" : "ro"); });
      }
    }
  });
})();
