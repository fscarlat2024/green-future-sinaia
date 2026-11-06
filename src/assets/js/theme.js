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
