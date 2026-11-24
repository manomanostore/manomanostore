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
    await paint();
    // Re-render when the Sheet catalog arrives/changes (e.g. new categories).
    document.addEventListener("catalog:change", function () { paint(); });
  }

  async function paint() {
    DATA.banners().then(setHeroBanners);   // swap in admin banners when available
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
    var brands = unique(all.map(function (p) { return p.brand; })).filter(function (b) { return b && b.indexOf("Choice") < 0; });
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
  // swipeable, dots + arrows, respects "reduce motion". Re-callable: controls
  // live on the element so the slides can be swapped (admin banners) and the
  // carousel re-initialised without stacking duplicate listeners.
  function heroCarousel() {
    var root = document.getElementById("heroCarousel"); if (!root) return;
    var track = document.getElementById("hcTrack"), dotsWrap = document.getElementById("hcDots");
    function count() { return track.children.length; }
    var s = root._hero;
    if (!s) {
      s = root._hero = { i: 0, timer: null, dots: [], reduce: matchMedia("(prefers-reduced-motion:reduce)").matches };
      s.go = function (to) {
        var n = count(); if (!n) return;
        s.i = (to + n) % n;
        track.style.transform = "translateX(" + (-s.i * 100) + "%)";
        s.dots.forEach(function (d, k) { d.classList.toggle("active", k === s.i); d.setAttribute("aria-selected", k === s.i ? "true" : "false"); });
      };
      s.next = function () { s.go(s.i + 1); };
      s.prev = function () { s.go(s.i - 1); };
      s.start = function () { if (s.reduce || s.timer || count() < 2) return; s.timer = setInterval(s.next, 5000); };
      s.stop = function () { if (s.timer) { clearInterval(s.timer); s.timer = null; } };
      s.restart = function () { s.stop(); s.start(); };
      root.querySelector(".hc-next").addEventListener("click", function () { s.next(); s.restart(); });
      root.querySelector(".hc-prev").addEventListener("click", function () { s.prev(); s.restart(); });
      root.addEventListener("mouseenter", s.stop);
      root.addEventListener("mouseleave", s.start);
      root.addEventListener("focusin", s.stop);
      root.addEventListener("focusout", s.start);
      document.addEventListener("visibilitychange", function () { document.hidden ? s.stop() : s.start(); });
      var x0 = null;
      track.addEventListener("pointerdown", function (e) { x0 = e.clientX; s.stop(); });
      window.addEventListener("pointerup", function (e) {
        if (x0 == null) return; var dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) (dx < 0 ? s.next : s.prev)();
        s.start();
      });
    }
    // (re)build dots for the current slide count, then restart autoplay.
    dotsWrap.innerHTML = ""; s.dots = [];
    for (var k = 0; k < count(); k++) {
      var d = document.createElement("button");
      d.type = "button"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", "Go to banner " + (k + 1));
      (function (idx) { d.addEventListener("click", function () { s.go(idx); s.restart(); }); })(k);
      dotsWrap.appendChild(d); s.dots.push(d);
    }
    s.stop(); s.go(0); s.start();
  }

  // Swap the hero slides for admin-managed banner images (when any exist).
  function setHeroBanners(banners) {
    var track = document.getElementById("hcTrack");
    if (!track || !banners || !banners.length) return;         // none -> keep the built-in hero
    track.innerHTML = banners.map(function (b) {
      return '<a class="hc-slide" href="'+UI.esc(b.link || "deals.html")+'">'+
        '<img src="'+UI.esc(b.imageUrl)+'" alt="Promotion" width="1600" height="533" loading="lazy"></a>';
    }).join("");
    heroCarousel();
  }

  return { init: init };
})();
