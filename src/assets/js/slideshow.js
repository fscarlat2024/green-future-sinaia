(function () {
  var boxes = document.querySelectorAll("[data-slideshow]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  boxes.forEach(function (box) {
    var slides = Array.prototype.slice.call(box.querySelectorAll(".hero-slide"));
    if (slides.length < 2) return;

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
      slides[i].classList.add("is-active");
      btns[i].classList.add("on");
    }
    function next() { go(i + 1); }
    function start() { if (!reduce) timer = setInterval(next, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", start);

    start();
  });
})();
