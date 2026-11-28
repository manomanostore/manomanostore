/* ============================ seller stores ===============================
   Public seller stores on the website: find a store by its shop name or the
   seller's name (search results page) and open its store page (shop.html).
   The server only sends public details — never contact info or stock
   quantities.
   ========================================================================== */
window.SHOPS = (function () {
  var esc = function (s) { return UI.esc(s == null ? "" : String(s)); };

  function call(action, params) {
    if (!window.CONFIG || !CONFIG.API_URL) return Promise.resolve({ ok: false, error: "offline" });
    var qs = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(CONFIG.API_URL + "?action=" + action + "&" + qs, { method: "GET" })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: "Couldn't reach the shop right now. Please try again." }; });
  }
  function search(q) {
    q = String(q || "").trim();
    if (q.length < 2) return Promise.resolve([]);
    return call("searchShops", { q: q }).then(function (j) { return (j && j.ok && j.shops) || []; });
  }
  function get(id) { return call("getShop", { id: id }); }

  // Round shop picture, or the shop's first letter on a colour picked from its name.
  var COLORS = ["#2f6df6", "#16a37f", "#e0712b", "#8b5cf6", "#d93676", "#0e9fb5", "#c2901a"];
  function avatar(shop, cls) {
    var img = DATA.safeImageUrl ? DATA.safeImageUrl(shop.shopImage) : shop.shopImage;
    var name = String(shop.shopName || "?"), n = 0;
    for (var i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % 997;
    return '<span class="shop-av ' + (cls || "") + '" style="--av:' + COLORS[n % COLORS.length] + '">' +
      (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : "") +
      "<b>" + esc(name.trim().charAt(0).toUpperCase() || "?") + "</b></span>";
  }
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  function verified(shop) { return shop.verified ? '<span class="shop-ver" title="Verified shop">' + TICK + ' Verified</span>' : ""; }
  function stars(r) {
    var full = Math.round(Number(r) || 0), s = "";
    for (var i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
    return '<span class="shop-stars" aria-label="Rated ' + (Number(r) || 0).toFixed(1) + ' out of 5">' + s + " <em>" + (Number(r) || 0).toFixed(1) + "</em></span>";
  }
  function count(n) { return n + " product" + (n === 1 ? "" : "s"); }
  function url(shop) { return "shop.html?id=" + encodeURIComponent(shop.id); }

  // A store tile for the search results.
  function card(shop) {
    return '<a class="shop-card" href="' + url(shop) + '">' + avatar(shop) +
      '<span class="shop-card-txt"><span class="shop-card-name">' + esc(shop.shopName) + "</span>" +
      '<span class="shop-card-meta">' + verified(shop) + stars(shop.rating) + "</span>" +
      '<span class="shop-card-sub">' + count(shop.products) + "</span></span>" +
      '<span class="shop-card-go">Visit store ›</span></a>';
  }

  // "Shops" block above the product results of a search.
  function renderResults(el, shops) {
    if (!el) return;
    if (!shops.length) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = '<div class="block-head"><h2>Shops <small>(' + shops.length + ")</small></h2></div>" +
      '<div class="shop-cards">' + shops.map(card).join("") + "</div>";
  }

  return { search: search, get: get, avatar: avatar, verified: verified, stars: stars, count: count, card: card, url: url, renderResults: renderResults };
})();
