// Colajul din "Despre complex": cate o poza se schimba pe rand. Pozele urmatoare se incarca abia cand e nevoie de ele.
(function () {
  const box = document.querySelector("[data-collage]");
  if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tiles = [...box.querySelectorAll(".collage-tile")];
  const queue = JSON.parse(box.dataset.collage);
  const order = [0, 2, 1];
  let step = 0, next = 0, timer = null, busy = false;

  function swap() {
    if (busy || !queue.length) return;
    busy = true;
    const tile = tiles[order[step % order.length]];
    step++;
    const outgoing = tile.querySelector("img").getAttribute("src");
    const src = queue[next];
    const img = new Image();
    img.alt = "";
    img.onload = () => {
      queue[next] = outgoing; // poza scoasa revine la coada, ca sa nu apara de doua ori deodata
      next = (next + 1) % queue.length;
      const old = tile.querySelector("img");
      tile.append(img);
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("on")));
      setTimeout(() => { old.remove(); busy = false; }, 1300);
    };
    img.onerror = () => { next = (next + 1) % queue.length; busy = false; };
    img.src = src;
  }
  const start = () => { if (!timer) timer = setInterval(swap, 3200); };
  const stop = () => { clearInterval(timer); timer = null; };
  // merge doar cat timp colajul se vede, ca sa nu consume date degeaba
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.2 }).observe(box);
})();
