/* =============================== home ==================================== */
window.HOME = (function () {
  async function init() {
    var all = await DATA.all();
    var choice = await DATA.choice();
    var best = await DATA.bestsellers();
    var deals = await DATA.deals();
    var cats = await DATA.categories();

    fill("topSelection", pick(all, 8));
    fill("bestSellers", best.length ? best : pick(all, 8));
    fill("finds", deals.length ? deals : pick(all.slice().reverse(), 8));

    // categories
    var cg = document.getElementById("catGrid");
    cg.innerHTML = cats.map(function (c) {
      return '<a class="cat-card" href="category.html?cat='+c.key+'">'+
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
      return '<div style="width:180px">'+RENDER.productCard(p)+'</div>';
    }).join("");
  }
  function pick(arr, n) { return arr.slice(0, n); }
  function unique(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  return { init: init };
})();
