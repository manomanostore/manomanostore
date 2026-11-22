/* ============================ data layer ================================== */
(function () {
  var C = window.CONFIG;
  var cache = null;

  function money(n) {
    return C.CURRENCY_SYMBOL + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(p) { if (!p.oldPrice || p.oldPrice <= p.price) return 0; return Math.round((1 - p.price / p.oldPrice) * 100); }

  // ---- load catalog: Google Sheet first (if API_URL set & non-empty), else local json
  async function load() {
    if (cache) return cache;
    if (C.API_URL) {
      try {
        var r = await fetch(C.API_URL + "?action=getProducts", { method: "GET" });
        var j = await r.json();
        if (j.ok && j.products && j.products.length) { cache = normalize(j); return cache; }
      } catch (e) { /* fall through to local */ }
    }
    var res = await fetch("data/products.json", { cache: "no-cache" });
    cache = normalize(await res.json());
    return cache;
  }

  function normalize(data) {
    var cats = data.categories || DEFAULT_CATS;
    var prods = (data.products || data).map(function (p) {
      p.price = Number(p.price); if (p.oldPrice) p.oldPrice = Number(p.oldPrice);
      return p;
    });
    return { categories: cats, products: prods, byId: index(prods) };
  }
  function index(arr) { var m = {}; arr.forEach(function (p) { m[p.id] = p; }); return m; }

  var DEFAULT_CATS = [
    { key: "tools", name: "Tools", color: "#1f6f54" }
  ];

  // ---------------- queries ----------------
  async function all() { return (await load()).products; }
  async function categories() { return (await load()).categories; }
  async function get(id) { return (await load()).byId[id]; }
  async function byCategory(key) { return (await all()).filter(function (p) { return p.category === key; }); }
  async function bestsellers() { return (await all()).filter(function (p) { return p.badge === "bestseller"; }); }
  async function deals() { return (await all()).filter(function (p) { return p.badge === "deal" || (p.oldPrice && p.oldPrice > p.price); }); }
  async function choice() { return (await all()).filter(function (p) { return p.choice; }); }
  async function search(q) {
    q = (q || "").trim().toLowerCase(); if (!q) return [];
    return (await all()).filter(function (p) {
      return (p.name + " " + p.brand + " " + p.sub + " " + p.category).toLowerCase().indexOf(q) > -1;
    });
  }
  async function catName(key) {
    var c = (await categories()).find(function (x) { return x.key === key; });
    return c ? c.name : key;
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
  function productImage(p, size) {
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
         'font-size="22" fill="#6a7690">'+esc(clip(p.sub||p.name,28))+'</text>'+
      '</svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function categoryImage(c) {
    return productImage({ brand: c.name, sub: "", color: c.color, icon: c.icon }, 480);
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
    byCategory: byCategory, bestsellers: bestsellers, deals: deals, choice: choice,
    search: search, catName: catName, productImage: productImage, categoryImage: categoryImage
  };
})();
