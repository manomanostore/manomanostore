/* ============================== product ================================== */
window.PRODUCT = (function () {
  var qty = 1, current = null;

  async function init() {
    var id = new URLSearchParams(location.search).get("id");
    var p = await DATA.get(id);
    if (!p) { document.getElementById("pdp").innerHTML = '<div class="empty"><h3>Product not found</h3><p><a class="link" href="index.html">Back to home</a></p></div>'; return; }
    current = p;
    document.title = p.name + " — " + CONFIG.BRAND_NAME;

    var catName = await DATA.catName(p.cat_id);
    document.getElementById("crumbs").innerHTML =
      '<a href="index.html">Home</a> › <a href="category.html?cat='+encodeURIComponent(p.cat_id)+'">'+UI.esc(catName)+'</a> › <span>'+UI.esc(p.name)+'</span>';

    var off = DATA.pct(p);
    document.getElementById("pdp").innerHTML =
      '<div class="pdp">'+
        '<div class="gallery"><img src="'+DATA.productImage(p, 800)+'" alt="'+UI.esc(p.name)+'"></div>'+
        '<div>'+
          '<div class="brandline">'+UI.esc(p.brand)+(p.choice?' · '+UI.esc(CONFIG.BRAND_SHORT)+' Choice':'')+'</div>'+
          '<h1>'+UI.esc(p.name)+'</h1>'+
          RENDER.stars(p.rating, p.reviews)+
          '<div class="buybox">'+
            RENDER.priceBlock(p)+
            '<div class="ship">'+UI.icons.truck+' '+UI.esc(CONFIG.FREE_SHIPPING_LABEL)+' · Delivered in 3–5 days</div>'+
            '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+
              '<div class="qty"><button id="dec" aria-label="Decrease">−</button><span id="qv">1</span><button id="inc" aria-label="Increase">+</button></div>'+
              '<button class="btn btn-add" id="addBtn" style="flex:1;min-width:180px">Add to basket</button>'+
            '</div>'+
            '<button class="btn btn-primary btn-block" id="buyBtn">Buy now</button>'+
          '</div>'+
          '<div style="margin-top:18px">'+
            '<h3 style="margin:0 0 8px">Description</h3>'+
            '<p class="desc">'+UI.esc(p.desc||"")+'</p>'+
            (p.options ? '<div class="chips" style="margin-top:14px"><span class="chip">'+p.options+' options available</span></div>' : '')+
          '</div>'+
        '</div>'+
      '</div>';

    document.getElementById("inc").onclick = function () { qty++; document.getElementById("qv").textContent = qty; };
    document.getElementById("dec").onclick = function () { if (qty>1) qty--; document.getElementById("qv").textContent = qty; };
    document.getElementById("addBtn").onclick = function () { CART.add(p, qty); UI.toast(p.name + " added to basket"); };
    document.getElementById("buyBtn").onclick = function () { CART.add(p, qty); location.href = "cart.html"; };

    // related
    var rel = (await DATA.byCategory(p.cat_id)).filter(function (x) { return x.id !== p.id; }).slice(0, 8);
    document.getElementById("related").innerHTML = rel.map(function (x) {
      return '<div style="width:180px">'+RENDER.productCard(x)+'</div>';
    }).join("");
  }

  return { init: init };
})();
