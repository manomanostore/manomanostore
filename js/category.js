/* ============================= category =================================== */
window.CATEGORY = (function () {
  var state = { list: [], sort: "rel", cats: {}, price: null, page: 1, shown: [], catalogSize: 0 };
  var PER_PAGE = 20;

  function params() {
    var u = new URLSearchParams(location.search);
    return { cat: u.get("cat"), q: u.get("q"), badge: u.get("badge"), deals: u.get("deals"), all: u.get("all"), order: u.get("order") };
  }

  async function init() {
    var p = params();

    // No params -> show the category index grid
    if (!p.cat && !p.q && !p.badge && !p.deals && !p.all) return showIndex();

    var title = "Browse", list = [];
    var shopsDone = null;
    if (p.q && window.SHOPS) shopsDone = SHOPS.search(p.q);     // stores matching the search, fetched alongside
    if (p.q) { title = 'Results for "' + p.q + '"'; list = await DATA.search(p.q); }
    else if (p.badge === "choice") { title = CONFIG.BRAND_SHORT + " Choice"; list = await DATA.choice(); }
    else if (p.deals) { title = "Deals for every project"; list = await DATA.deals(); }
    else if (p.cat) { title = await DATA.catName(p.cat); list = await DATA.byCategory(p.cat); }
    else if (p.all) {   // "View more": every product — Our top selection (asc) or Today's best finds (desc)
      var asc = p.order === "asc";
      title = asc ? "Our top selection" : "Today's best finds";
      list = (await DATA.all()).slice().sort(function (a, b) { var d = (Number(a.id) || 0) - (Number(b.id) || 0); return asc ? d : -d; });
    }

    document.getElementById("pageTitle").textContent = title;
    document.getElementById("crumb").textContent = title;
    document.title = title + " — " + CONFIG.BRAND_NAME;
    state.full = list; state.list = list.slice();
    try { state.catalogSize = (await DATA.all()).length; } catch (e) { state.catalogSize = 0; }
    var pagerEl = document.getElementById("pager");
    if (pagerEl) pagerEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-page]"); if (!b || b.disabled) return;
      state.page = Number(b.getAttribute("data-page")) || 1; renderPage();
      var top = document.getElementById("sortBar") || document.getElementById("grid");
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    buildFilters(list);
    buildSort();
    apply();
    if (shopsDone) shopsDone.then(function (shops) {
      SHOPS.renderResults(document.getElementById("shopResults"), shops);
      // Only stores matched: show them without an empty product list under them.
      if (shops.length && !list.length) document.getElementById("listing").hidden = true;
    });
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
    // Product totals aren't shown to shoppers (the catalogue is still small).
    var cnt = document.getElementById("count"); if (cnt) { cnt.textContent = ""; cnt.hidden = true; }
    var active = brands.length + prices.length, fc = document.getElementById("filterCount");
    if (fc) { fc.textContent = active; fc.hidden = active === 0; }
    var sa = document.getElementById("sheetApply");
    if (sa) sa.textContent = list.length ? "Show results" : "No matching products";
    document.getElementById("noResults").hidden = list.length > 0;
    state.shown = list; state.page = 1;          // a new filter/sort starts at page 1
    renderPage();
  }

  // 20 products per page; page buttons + a display-only catalogue badge
  // ("500+" at minimum, then the real size rounded down to hundreds).
  function renderPage() {
    var list = state.shown || [], pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    state.page = Math.min(Math.max(1, state.page), pages);
    var from = (state.page - 1) * PER_PAGE;
    document.getElementById("grid").innerHTML = list.slice(from, from + PER_PAGE).map(function (p) { return RENDER.productCard(p); }).join("");
    var el = document.getElementById("pager"); if (!el) return;
    if (pages <= 1) { el.innerHTML = ""; return; }
    var nums = [], i, page = state.page;
    for (i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    var btn = function (p, label, cls, dis) {
      return '<button type="button" class="pg-btn' + (cls || "") + '" data-page="' + p + '"' + (dis ? " disabled" : "") + ' aria-label="Page ' + p + '">' + label + "</button>";
    };
    var big = Math.max(500, Math.floor((state.catalogSize || 0) / 100) * 100) + "+";
    el.innerHTML = '<nav class="pager" aria-label="Pages">' + btn(page - 1, "‹", "", page === 1) +
      nums.map(function (n) { return n === "…" ? '<span class="pg-gap">…</span>' : btn(n, n, n === page ? " on" : "", false); }).join("") +
      btn(page + 1, "›", "", page === pages) + '<span class="pg-more">' + big + "</span></nav>";
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
