/* ============================= category =================================== */
window.CATEGORY = (function () {
  var state = { list: [], sort: "rel", cats: {}, price: null };

  function params() {
    var u = new URLSearchParams(location.search);
    return { cat: u.get("cat"), q: u.get("q"), badge: u.get("badge"), deals: u.get("deals") };
  }

  async function init() {
    var p = params();

    // No params -> show the category index grid
    if (!p.cat && !p.q && !p.badge && !p.deals) return showIndex();

    var title = "Browse", list = [];
    if (p.q) { title = 'Results for "' + p.q + '"'; list = await DATA.search(p.q); }
    else if (p.badge === "choice") { title = CONFIG.BRAND_SHORT + " Choice"; list = await DATA.choice(); }
    else if (p.deals) { title = "Deals for every project"; list = await DATA.deals(); }
    else if (p.cat) { title = await DATA.catName(p.cat); list = await DATA.byCategory(p.cat); }

    document.getElementById("pageTitle").textContent = title;
    document.getElementById("crumb").textContent = title;
    document.title = title + " — " + CONFIG.BRAND_NAME;
    state.full = list; state.list = list.slice();

    buildFilters(list);
    buildSort();
    apply();
  }

  async function showIndex() {
    document.getElementById("listing").hidden = true;
    document.getElementById("pageTitle").textContent = "All categories";
    document.getElementById("crumb").textContent = "Categories";
    var grid = document.getElementById("catIndex"); grid.hidden = false;
    var cats = await DATA.categories();
    grid.innerHTML = cats.map(function (c) {
      return '<a class="cat-card" href="category.html?cat='+c.id+'">'+
        '<div class="ci"><img loading="lazy" src="'+DATA.categoryImage(c)+'" alt="'+UI.esc(c.name)+'"></div>'+
        '<div class="cl">'+UI.esc(c.name)+'</div></a>';
    }).join("");
  }

  function buildSort() {
    var opts = [["rel","Relevance"],["price-asc","Price: low to high"],["price-desc","Price: high to low"],["rating","Top rated"],["disc","Biggest discount"]];
    document.getElementById("sortBar").innerHTML =
      '<button type="button" class="chip filter-toggle" id="filterToggle" aria-controls="filters" aria-expanded="false">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>'+
        'Filters<span class="fcount" id="filterCount" hidden></span></button>'+
      '<label class="chip" style="display:flex;gap:8px;align-items:center"><strong>Sort</strong>'+
      '<select id="sortSel" style="border:none;background:transparent;font-weight:600;color:var(--ink)">'+
      opts.map(function (o) { return '<option value="'+o[0]+'">'+o[1]+'</option>'; }).join("")+
      '</select></label>';
    document.getElementById("sortSel").addEventListener("change", function (e) { state.sort = e.target.value; apply(); });
    document.getElementById("filterToggle").addEventListener("click", function () { sheet(true); });
  }

  function buildFilters(list) {
    var brands = count(list.map(function (p) { return p.brand; }));
    var el = document.getElementById("filters");
    el.innerHTML =
      '<div class="sheet-head"><strong>Filters</strong>'+
        '<button type="button" class="link" data-act="clear">Clear all</button>'+
        '<button type="button" class="sheet-x" data-act="close" aria-label="Close filters">'+UI.icons.close+'</button></div>'+
      section("Price", [
        chk("price","0-50","Under $50"), chk("price","50-150","$50 – $150"),
        chk("price","150-300","$150 – $300"), chk("price","300+","$300+")
      ].join("")) +
      section("Brand", Object.keys(brands).map(function (b) { return chk("brand",b,b+" ("+brands[b]+")"); }).join("")) +
      '<div class="sheet-foot"><button type="button" class="btn btn-primary btn-block" data-act="close" id="sheetApply">Show results</button></div>';
    el.addEventListener("change", apply);
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "clear") {
        el.querySelectorAll("input[type=checkbox]:checked").forEach(function (c) { c.checked = false; });
        apply();
      } else sheet(false);
    });
    var back = document.createElement("div"); back.className = "sheet-back"; back.id = "sheetBack";
    back.addEventListener("click", function () { sheet(false); });
    document.body.appendChild(back);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") sheet(false); });
  }

  function section(title, body) { return '<details open><summary>'+title+' '+UI.icons.chev+'</summary><div>'+body+'</div></details>'; }
  function chk(group, val, label) { return '<label><input type="checkbox" data-group="'+group+'" value="'+UI.esc(val)+'"> '+UI.esc(label)+'</label>'; }
  function count(arr) { var m = {}; arr.forEach(function (v) { if (v) m[v] = (m[v]||0)+1; }); return m; }

  function selected(group) {
    return Array.prototype.map.call(document.querySelectorAll('[data-group="'+group+'"]:checked'), function (c) { return c.value; });
  }
  function inPrice(p, ranges) {
    if (!ranges.length) return true;
    return ranges.some(function (r) {
      if (r === "0-50") return p.price < 50;
      if (r === "50-150") return p.price >= 50 && p.price < 150;
      if (r === "150-300") return p.price >= 150 && p.price < 300;
      if (r === "300+") return p.price >= 300;
    });
  }

  function apply() {
    var brands = selected("brand"), prices = selected("price");
    var list = state.full.filter(function (p) {
      return (!brands.length || brands.indexOf(p.brand) > -1)
        && inPrice(p, prices);
    });
    list.sort(function (a, b) {
      switch (state.sort) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        case "disc": return DATA.pct(b) - DATA.pct(a);
        default: return 0;
      }
    });
    var grid = document.getElementById("grid");
    document.getElementById("count").textContent = list.length + " products";
    var active = brands.length + prices.length, fc = document.getElementById("filterCount");
    if (fc) { fc.textContent = active; fc.hidden = active === 0; }
    var sa = document.getElementById("sheetApply");
    if (sa) sa.textContent = list.length ? "Show " + list.length + " result" + (list.length === 1 ? "" : "s") : "No matching products";
    document.getElementById("noResults").hidden = list.length > 0;
    grid.innerHTML = list.map(function (p) { return RENDER.productCard(p); }).join("");
  }

  // Bottom sheet for filters on phones/tablets (a plain sidebar on desktop).
  function sheet(open) {
    var listing = document.getElementById("listing"), t = document.getElementById("filterToggle");
    listing.classList.toggle("filters-open", open);
    var back = document.getElementById("sheetBack"); if (back) back.classList.toggle("open", open);
    if (t) t.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("no-scroll", open);
  }

  return { init: init };
})();
