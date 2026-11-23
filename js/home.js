/* =============================== home ==================================== */
window.HOME = (function () {
  // On desktop the "Today's Deals" sidebar matches the left column (banner +
  // category circles) height; its list scrolls inside. A ResizeObserver keeps
  // them in sync as the circles render and on resize.
  function matchDealsHeight() {
    var left = document.querySelector(".hero-left"), deals = document.querySelector(".today-deals");
    if (!left || !deals) return;
    deals.style.height = matchMedia("(min-width:900px)").matches ? left.offsetHeight + "px" : "";
  }
  function watchHeroHeights() {
    var left = document.querySelector(".hero-left");
    if (left && window.ResizeObserver) new ResizeObserver(matchDealsHeight).observe(left);
    window.addEventListener("resize", matchDealsHeight);
    window.addEventListener("load", matchDealsHeight);
    matchDealsHeight();
  }

  async function init() {
    heroCarousel();                 // runs immediately — never waits on the catalog
    watchHeroHeights();
    var all = await DATA.all();
    var choice = await DATA.choice();
    var best = await DATA.bestsellers();
    var deals = await DATA.deals();
    var cats = await DATA.categories();

    fill("topSelection", pick(all, 8));
    fill("bestSellers", best.length ? best : pick(all, 8));
    fill("finds", deals.length ? deals : pick(all.slice().reverse(), 8));

    // Today's Deals panel (beside the banner)
    var tdList = document.getElementById("tdList");
    if (tdList) {
      var td = (deals.length ? deals : all.slice().reverse()).slice(0, 5);
      tdList.innerHTML = td.map(function (p) {
        return '<a class="td-item" href="product.html?id='+encodeURIComponent(p.id)+'">'+
          '<img src="'+DATA.productImage(p, 160)+'" alt="'+UI.esc(p.name)+'" loading="lazy">'+
          '<div class="td-info"><div class="td-name">'+UI.esc(p.name)+'</div>'+
            '<div class="td-price"><span class="now">'+DATA.money(p.price)+'</span>'+
            (p.oldPrice ? '<span class="was">'+DATA.money(p.oldPrice)+'</span>' : '')+'</div></div></a>';
      }).join("");
    }

    // Category circles (same generated images as the catalog)
    var cc = document.getElementById("catCircles");
    if (cc) {
      cc.innerHTML = cats.map(function (c) {
        return '<a class="cat-circle" href="category.html?cat='+encodeURIComponent(c.id)+'">'+
          '<span class="cc-img"><img loading="lazy" src="'+DATA.categoryImage(c)+'" alt="'+UI.esc(c.name)+'"></span>'+
          '<span class="cc-label">'+UI.esc(c.name)+'</span></a>';
      }).join("");
    }

    // categories
    var cg = document.getElementById("catGrid");
    cg.innerHTML = cats.map(function (c) {
      return '<a class="cat-card" href="category.html?cat='+c.id+'">'+
        '<div class="ci"><img loading="lazy" src="'+DATA.categoryImage(c)+'" alt="'+UI.esc(c.name)+'"></div>'+
        '<div class="cl">'+UI.esc(c.name)+'</div></a>';
    }).join("");

    // brands
    var brands = unique(all.map(function (p) { return p.brand; })).filter(function (b) { return b.indexOf("Choice") < 0; });
    document.getElementById("brands").innerHTML = brands.map(function (b) {
      return '<div class="bchip">'+UI.esc(b)+'</div>';
    }).join("");

    // feature icons
    var fi = { f1: UI.icons.tag, f2: UI.icons.truck, f3: UI.icons.card, f4: UI.icons.shield };
    Object.keys(fi).forEach(function (id) { var e = document.getElementById(id); if (e) e.innerHTML = fi[id]; });
  }

  function fill(id, list) {
    var el = document.getElementById(id);
    el.innerHTML = list.map(function (p) {
      return '<div class="row-item">'+RENDER.productCard(p)+'</div>';
    }).join("");
  }
  function pick(arr, n) { return arr.slice(0, n); }
  function unique(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  // Auto-scrolling hero banner: 5s advance, pauses on hover/focus/tab-hidden,
  // swipeable, dots + arrows, and respects "reduce motion".
  function heroCarousel() {
    var root = document.getElementById("heroCarousel"); if (!root) return;
    var track = document.getElementById("hcTrack"), dotsWrap = document.getElementById("hcDots");
    var n = track.children.length; if (n < 2) return;
    var i = 0, timer = null, reduce = matchMedia("(prefers-reduced-motion:reduce)").matches, dots = [];

    for (var k = 0; k < n; k++) {
      var d = document.createElement("button");
      d.type = "button"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", "Go to banner " + (k + 1));
      (function (idx) { d.addEventListener("click", function () { go(idx); restart(); }); })(k);
      dotsWrap.appendChild(d); dots.push(d);
    }
    function go(to) {
      i = (to + n) % n;
      track.style.transform = "translateX(" + (-i * 100) + "%)";
      for (var k = 0; k < n; k++) { dots[k].classList.toggle("active", k === i); dots[k].setAttribute("aria-selected", k === i ? "true" : "false"); }
    }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function start() { if (reduce || timer) return; timer = setInterval(next, 5000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    root.querySelector(".hc-next").addEventListener("click", function () { next(); restart(); });
    root.querySelector(".hc-prev").addEventListener("click", function () { prev(); restart(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

    // swipe (a short tap still follows the slide's link)
    var x0 = null;
    track.addEventListener("pointerdown", function (e) { x0 = e.clientX; stop(); });
    window.addEventListener("pointerup", function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
      start();
    });

    go(0); start();
  }

  return { init: init };
})();
