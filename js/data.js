/* ============================ data layer ================================== */
(function () {
  var C = window.CONFIG;
  var cache = null;

  function money(n) {
    return C.CURRENCY_SYMBOL + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(p) { if (!p.oldPrice || p.oldPrice <= p.price) return 0; return Math.round((1 - p.price / p.oldPrice) * 100); }

  // ---- load catalog -------------------------------------------------------
  // Google Apps Script takes ~2-5 s per request, so pages never wait on it:
  //   1. a saved copy of the Sheet catalog (localStorage)   -> instant
  //   2. otherwise the bundled data/products.json            -> fast
  //   3. only if both are unavailable (e.g. file://), wait for the Sheet
  // The Sheet is re-checked in the background (at most every few minutes) and
  // saved, so edits made in the Sheet show up on the next page view.
  var SHEET_KEY = "mm_sheet_catalog_v1", REFRESH_MS = 5 * 60 * 1000;
  var pending = null;

  function load() {
    if (cache) return Promise.resolve(cache);
    if (!pending) pending = loadFresh().then(function (c) { cache = c; return c; }, function (e) { pending = null; throw e; });
    return pending;
  }

  function hasData(d) { return d && ((d.categories && d.categories.length) || (d.products && d.products.length) || (d.banners && d.banners.length)); }

  async function loadFresh() {
    var saved = readSaved();
    // The Sheet is authoritative once it has ANY data (categories and/or
    // products) — so admin-added categories show even before any product exists.
    if (hasData(saved)) {
      if (Date.now() - saved.at > REFRESH_MS) refreshFromSheet();
      return normalize(saved);
    }
    // Embedded catalog (data/catalog.js) — works even from file:// where fetch
    // of a local JSON file is blocked. Always check the Sheet in the background
    // on a fresh device, and live-swap to it when it answers.
    if (window.__CATALOG && window.__CATALOG.products && window.__CATALOG.products.length) {
      refreshFromSheet();
      return normalize(window.__CATALOG);
    }
    try {
      var res = await fetch("data/products.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var local = normalize(await res.json());
      if (!saved || Date.now() - saved.at > REFRESH_MS) refreshFromSheet();
      return local;
    } catch (e) {
      var sheet = await refreshFromSheet();           // last resort: wait for the Sheet
      if (sheet) return normalize(sheet);
      throw e;
    }
  }

  // Fetch the Sheet catalog and remember it. When it brings something new, swap
  // it into the in-memory cache and tell pages to re-render ("catalog:change"),
  // so Sheet edits (e.g. new categories) appear without a manual reload.
  async function refreshFromSheet() {
    if (!C.API_URL) return null;
    try {
      var r = await fetch(C.API_URL + "?action=getProducts", { method: "GET" });
      var j = await r.json();
      if (!j.ok) return null;
      var data = { at: Date.now(), categories: j.categories || [], products: j.products || [], banners: j.banners || [] };
      try { localStorage.setItem(SHEET_KEY, JSON.stringify(data)); } catch (e) {}
      if (!hasData(data)) return null;
      var fresh = normalize(data);
      if (!cache || sig(cache) !== sig(fresh)) {
        cache = fresh;
        try { document.dispatchEvent(new CustomEvent("catalog:change")); } catch (e) {}
      }
      return data;
    } catch (e) { return null; }
  }
  // Cheap fingerprint so we only re-render when the catalog actually changed.
  function sig(c) {
    return c.categories.map(function (x) { return x.id + ":" + x.name + ":" + x.imageUrl + ":" + x.order; }).join("|") +
      " / " + c.products.map(function (x) { return x.id; }).join(",") +
      " / " + (c.banners || []).map(function (x) { return x.id + ":" + x.imageUrl + ":" + x.order; }).join("|");
  }
  function readSaved() { try { return JSON.parse(localStorage.getItem(SHEET_KEY)); } catch (e) { return null; } }

  // IDs are numbers in the Sheet/JSON (1, 2, 3...) but arrive as text from URLs
  // and data-attributes, so the client keeps every id as a string.
  function normalize(data) {
    var cats = ((data.categories && data.categories.length) ? data.categories : DEFAULT_CATS).map(function (c) {
      return { id: String(c.id),
               name: c.name || c.cat_name || c.cate_name || "",
               imageUrl: c.imageUrl || c.cat_img_url || "",
               order: Number(c.order != null ? c.order : c.cat_order) || 0,
               icon: c.icon, color: c.color };   // kept for fallback art when no image
    }).sort(function (a, b) { return a.order - b.order; });
    var prods = (data.products || data).map(function (p) {
      p.id = String(p.id); p.cat_id = String(p.cat_id);
      p.price = Number(p.price); if (p.oldPrice) p.oldPrice = Number(p.oldPrice);
      return p;
    });
    var banners = (data.banners || []).map(function (b) {
      return { id: String(b.id), imageUrl: b.imageUrl || b.image_url || "",
               order: Number(b.order) || 0, status: b.status || "active" };
    }).filter(function (b) { return b.imageUrl; }).sort(function (a, b) { return a.order - b.order; });
    return { categories: cats, products: prods, banners: banners, byId: index(prods) };
  }
  function index(arr) { var m = {}; arr.forEach(function (p) { m[p.id] = p; }); return m; }

  var DEFAULT_CATS = [
    { id: "1", name: "Tools", color: "#1f6f54" }
  ];

  // ---------------- queries ----------------
  async function all() { return (await load()).products; }
  async function categories() { return (await load()).categories; }
  async function banners() { return (await load()).banners || []; }
  async function get(id) { return (await load()).byId[String(id)]; }
  async function byCategory(catId) { return (await all()).filter(function (p) { return p.cat_id === String(catId); }); }
  async function bestsellers() { return (await all()).filter(function (p) { return p.badge === "bestseller"; }); }
  // Deals = products the admin gave the "Deal" badge (a discount alone doesn't make a deal).
  async function deals() { return (await all()).filter(function (p) { return p.badge === "deal"; }); }
  async function choice() { return (await all()).filter(function (p) { return p.choice; }); }
  async function search(q) {
    q = (q || "").trim().toLowerCase(); if (!q) return [];
    var names = {}; (await categories()).forEach(function (c) { names[c.id] = c.name; });
    return (await all()).filter(function (p) {
      return (p.name + " " + p.brand + " " + (names[p.cat_id] || "")).toLowerCase().indexOf(q) > -1;
    });
  }
  async function catName(catId) {
    var c = (await categories()).find(function (x) { return x.id === String(catId); });
    return c ? c.name : catId;
  }

  // ---------------- image generator (inline SVG, no external hosts) ----------------
  var ICONS = {
    tools: 'M14 6l4 4-8 8-4 4H3v-3l7-7M14 6l3-3 4 4-3 3',
    drill: 'M4 9h8v6H4zM12 11h4l4-2v6l-4-2h-4M7 15v4',
    battery:'M4 8h12v8H4zM16 10h2v4h-2M7 10v4M10 10v4',
    garden:'M12 20v-7M12 13c-4 0-6-3-6-6 4 0 6 3 6 6zM12 13c4 0 6-3 6-6-4 0-6 3-6 6z',
    bath:'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM7 12V7a2 2 0 0 1 4 0',
    shower:'M12 3v4M12 7a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6zM9 16v3M12 16v4M15 16v3',
    rad:'M5 5v14M9 5v14M13 5v14M17 5v14M3 8h16M3 16h16',
    fire:'M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 2 0-3-1-5-1-7z',
    sofa:'M4 11V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2M6 19v2M18 19v2',
    bed:'M3 17v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 13h18M3 17v2M21 17v2M6 10V8a1 1 0 0 1 1-1h3v3',
    chair:'M6 10V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5M5 10h14l-1 6H6zM7 16v4M17 16v4',
    bolt:'M13 3L5 13h6l-2 8 8-10h-6z',
    heat:'M8 4v4a4 4 0 0 0 8 0M12 12v8M8 20h8'
  };
  // A product's own photo (imageUrl) if it has a safe one, else a generated SVG.
  function safeImageUrl(u) {
    u = String(u || "").trim();
    if (!/^(https?:\/\/|images\/)/i.test(u)) return "";
    return u.replace(/["'<>\s]/g, function (c) { return encodeURIComponent(c); });
  }
  function productImage(p, size) {
    var own = safeImageUrl(p.imageUrl);
    if (own) return own;
    size = size || 600;
    var color = p.color || "#2b5f8a";
    var icon = ICONS[p.icon] || ICONS.tools;
    var light = shade(color, 0.86), mid = shade(color, 0.55);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 600 600">'+
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="'+light+'"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>'+
      '<rect width="600" height="600" fill="url(#g)"/>'+
      '<circle cx="300" cy="250" r="150" fill="'+color+'" opacity="0.10"/>'+
      '<g transform="translate(300 250) scale(9) translate(-12 -12)" fill="none" stroke="'+mid+'" '+
         'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+icon+'"/></g>'+
      '<text x="300" y="470" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" '+
         'font-size="30" font-weight="700" fill="'+shade(color,0.25)+'">'+esc(p.brand||'')+'</text>'+
      '<text x="300" y="512" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" '+
         'font-size="22" fill="#6a7690">'+esc(clip(p.caption||p.name,28))+'</text>'+
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function categoryImage(c) {
    var own = safeImageUrl(c.imageUrl || c.cat_img_url);
    if (own) return own;
    return productImage({ brand: c.name, caption: " ", color: c.color, icon: c.icon }, 480);
  }
  function shade(hex, t) { // mix hex toward white by t (0..1)
    var c = hex.replace("#", ""); if (c.length === 3) c = c.replace(/./g, "$&$&");
    var r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
    r = Math.round(r + (255-r)*t); g = Math.round(g + (255-g)*t); b = Math.round(b + (255-b)*t);
    return "#" + [r,g,b].map(function(x){return ("0"+x.toString(16)).slice(-2);}).join("");
  }
  function esc(s){return String(s).replace(/[<&>]/g,function(m){return{"<":"&lt;","&":"&amp;",">":"&gt;"}[m];});}
  function clip(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+"…":s;}

  window.DATA = {
    money: money, pct: pct, load: load, all: all, categories: categories, get: get,
    byCategory: byCategory, bestsellers: bestsellers, deals: deals, choice: choice, banners: banners,
    search: search, catName: catName, productImage: productImage, categoryImage: categoryImage,
    iconNames: Object.keys(ICONS), safeImageUrl: safeImageUrl,
    clearSheetCache: function () { try { localStorage.removeItem(SHEET_KEY); } catch (e) {} cache = null; pending = null; }
  };
})();
