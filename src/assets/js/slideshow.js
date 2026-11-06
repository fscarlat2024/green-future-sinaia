(function () {
  var boxes = document.querySelectorAll("[data-slideshow]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  boxes.forEach(function (box) {
    var slides = Array.prototype.slice.call(box.querySelectorAll(".hero-slide"));
    if (slides.length < 2) return;
    // pozele se incarca pe masura ce se ajunge la ele, nu toate deodata
    function load(n) {
      var s = slides[(n + slides.length) % slides.length];
      if (s.dataset.bg) { s.style.backgroundImage = "url('" + s.dataset.bg + "')"; delete s.dataset.bg; }
    }
    load(1);

    var host = box.parentElement || box;
    var i = 0;
    var timer = null;
    var DELAY = box.hasAttribute("data-arrows") ? 4500 : 5000;

    // buline
    var dots = document.createElement("div");
    dots.className = "hero-dots";
    var btns = slides.map(function (_, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Fotografia " + (idx + 1));
      if (idx === 0) b.className = "on";
      b.addEventListener("click", function () { go(idx); restart(); });
      dots.appendChild(b);
      return b;
    });
    host.appendChild(dots);

    // sageti (doar daca are data-arrows)
    if (box.hasAttribute("data-arrows")) {
      host.appendChild(mkArrow("prev", "‹", function () { go(i - 1); restart(); }));
      host.appendChild(mkArrow("next", "›", function () { go(i + 1); restart(); }));
    }
    function mkArrow(dir, ch, fn) {
      var a = document.createElement("button");
      a.type = "button";
      a.className = "slide-arrow " + dir;
      a.innerHTML = ch;
      a.setAttribute("aria-label", dir === "prev" ? "Poza anterioara" : "Poza urmatoare");
      a.addEventListener("click", fn);
      return a;
    }

    function go(n) {
      slides[i].classList.remove("is-active");
      btns[i].classList.remove("on");
      i = (n + slides.length) % slides.length;
      load(i);
      load(i + 1);
      slides[i].classList.add("is-active");
      btns[i].classList.add("on");
    }
    function next() { go(i + 1); }
    function start() { if (!reduce && !box.hasAttribute("data-noauto")) timer = setInterval(next, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", start);

    // glisare cu degetul
    var startX = null;
    host.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    host.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); restart(); }
    }, { passive: true });

    start();
  });
})();
