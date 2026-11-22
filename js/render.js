/* ============================ shared renderers =========================== */
(function () {
  var esc = UI.esc;

  function stars(rating, reviews) {
    var full = Math.round(rating);
    var s = "";
    for (var i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
    return '<span class="stars"><span class="s">'+s+'</span>'+(reviews!=null?'<span>'+reviews+'</span>':'')+'</span>';
  }

  function badge(p) {
    if (p.badge === "deal") return '<span class="badge deal">Deal</span>';
    if (p.badge === "bestseller") return '<span class="badge sales">#1 in sales</span>';
    return "";
  }

  function priceBlock(p) {
    var off = DATA.pct(p);
    var html = '<div class="price"><span class="now'+(off?' sale':'')+'">'+DATA.money(p.price)+'</span>';
    if (off) html += '<span class="off">-'+off+'%</span>';
    html += '</div>';
    if (p.oldPrice && off) html += '<div style="font-size:12px"><span class="was">'+DATA.money(p.oldPrice)+'</span> <span style="color:var(--muted)">Lowest 30d</span></div>';
    return html;
  }

  // card: full (with Add button) or compact
  function productCard(p, opts) {
    opts = opts || {};
    var img = DATA.productImage(p, 400);
    var opt = p.options ? '<span class="badge opts">'+p.options+' options</span>' : "";
    var choice = p.choice ? '<span class="badge choice">'+UI.icons.star.replace(/width="22" height="22"/,'width="13" height="13"')+' '+esc(CONFIG.BRAND_SHORT)+'</span>' : "";
    return '<article class="prod">'+
      '<a class="thumb" href="product.html?id='+encodeURIComponent(p.id)+'">'+
        badge(p)+opt+choice+
        '<img loading="lazy" src="'+img+'" alt="'+esc(p.name)+'">'+
      '</a>'+
      '<div class="body">'+
        '<a class="pname" href="product.html?id='+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a>'+
        stars(p.rating, p.reviews)+
        priceBlock(p)+
        '<div class="ship">'+UI.esc(CONFIG.FREE_SHIPPING_LABEL)+'</div>'+
        (opts.add!==false ? '<button class="btn btn-add" data-add="'+p.id+'">Add to basket</button>' : '')+
      '</div>'+
    '</article>';
  }

  // wire "Add to basket" clicks within a container
  function wireAdd(root) {
    (root || document).addEventListener("click", async function (e) {
      var b = e.target.closest("[data-add]"); if (!b) return;
      var p = await DATA.get(b.getAttribute("data-add"));
      if (p) { CART.add(p, 1); UI.toast(esc(p.name) + " added to basket"); }
    });
  }

  function skeletons(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += '<div class="prod"><div class="skeleton" style="aspect-ratio:1/1"></div><div class="body"><div class="skeleton" style="height:14px;width:90%"></div><div class="skeleton" style="height:14px;width:50%"></div><div class="skeleton" style="height:22px;width:60%"></div></div></div>';
    return s;
  }

  window.RENDER = { stars: stars, productCard: productCard, priceBlock: priceBlock, wireAdd: wireAdd, skeletons: skeletons };
})();
