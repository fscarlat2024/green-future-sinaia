(function () {
  var tt = document.getElementById('tt');
  if (!tt) return;
  tt.addEventListener('click', function () {
    var root = document.documentElement;
    var now = root.getAttribute('data-theme');
    if (!now) { now = 'dark'; }
    root.setAttribute('data-theme', now === 'dark' ? 'light' : 'dark');
  });
})();

// telefon: randurile de butoane din meniul de sus se ascund cand derulezi in jos si revin cand urci
(function () {
  let last = window.scrollY, ticking = false;
  const root = document.documentElement;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    if (y < 80) root.classList.remove("nav-hide");
    else if (y > last + 8) root.classList.add("nav-hide");
    else if (y < last - 8) root.classList.remove("nav-hide");
    else return;
    last = y;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
})();
