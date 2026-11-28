/* ============================== store page ================================
   shop.html?id=<sellerId> — one seller's public store: picture, name,
   verified badge, rating, product count, joined date, and the products the
   shop sells as normal product cards (no stock quantities). A search box
   filters the shop's products.
   ========================================================================== */
window.SHOP = (function () {
  var esc = UI.esc, products = [];
  var JOINED = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" });

  function fail(msg) {
    document.getElementById("shopHero").innerHTML =
      '<div class="shop-hero-txt"><h1 class="shop-name">Shop not found</h1><p class="shop-sub">' + esc(msg) + '</p>' +
      '<a class="btn" href="index.html" style="margin-top:12px;display:inline-flex">Back to shopping</a></div>';
    document.getElementById("shopGrid").innerHTML = "";
    document.title = "Shop not found — " + CONFIG.BRAND_NAME;
  }

  async function init() {
    var id = new URLSearchParams(location.search).get("id");
    if (!id) return fail("This link doesn't point to a shop.");
    var res = await SHOPS.get(id);
    if (!res || !res.ok) return fail((res && res.error) || "This shop isn't available.");
    var shop = res.shop, joined = new Date(shop.since);
    document.title = shop.shopName + " — " + CONFIG.BRAND_NAME;
    document.getElementById("crumb").textContent = shop.shopName;
    // Show the shop's name in the header search box (unless the shopper is typing there).
    var si = document.getElementById("searchInput");
    if (si && document.activeElement !== si && !si.value) si.value = shop.shopName;
    document.getElementById("shopHero").innerHTML = SHOPS.avatar(shop, "shop-av-lg") +
      '<div class="shop-hero-txt"><h1 class="shop-name">' + esc(shop.shopName) + " " + SHOPS.verified(shop) + "</h1>" +
      '<div class="shop-facts">' + SHOPS.stars(shop.rating) +
        '<span class="shop-fact">' + SHOPS.count(shop.products) + "</span>" +
        (isNaN(joined) ? "" : '<span class="shop-fact">Seller since ' + esc(JOINED.format(joined)) + "</span>") +
      "</div></div>";

    // Use the catalog's copy of each product when it has one, so cards match the rest of the site.
    var cat = {};
    try { (await DATA.all()).forEach(function (p) { cat[String(p.id)] = p; }); } catch (e) {}
    products = (res.products || []).map(function (p) { return cat[String(p.id)] || p; });
    document.getElementById("shopHead").hidden = !products.length;
    draw("");
    document.getElementById("shopFind").addEventListener("input", function (e) { draw(e.target.value); });
  }

  function draw(q) {
    q = String(q || "").trim().toLowerCase();
    var list = q ? products.filter(function (p) { return String(p.name || "").toLowerCase().indexOf(q) > -1; }) : products;
    document.getElementById("shopGrid").innerHTML = list.map(function (p) { return RENDER.productCard(p); }).join("");
    var empty = document.getElementById("shopEmpty");
    empty.hidden = list.length > 0;
    document.getElementById("shopEmptyT").textContent = products.length ? "No matching products" : "No products yet";
    document.getElementById("shopEmptyP").textContent = products.length ? "Try another word." : "This shop hasn't added any products.";
  }

  return { init: init };
})();
