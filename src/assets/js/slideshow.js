(function () {
  var boxes = document.querySelectorAll("[data-slideshow]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  boxes.forEach(function (box) {
    var slides = Array.prototype.slice.call(box.querySelectorAll(".hero-slide"));
    if (slides.length < 2) return;

    var i = 0;
    var timer = null;
    var DELAY = 5000;

    // buline de navigare
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
    // pune bulinele in interiorul hero-ului (parintele slideshow-ului)
    (box.parentElement || box).appendChild(dots);

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

    // pauza la hover
    box.parentElement.addEventListener("mouseenter", stop);
    box.parentElement.addEventListener("mouseleave", start);

    start();
  });
})();
