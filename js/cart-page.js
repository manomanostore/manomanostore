/* ============================== cart page ================================ */
window.CARTPAGE = (function () {
  var wasEmpty = null;

  var I = {
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    returns: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>'
  };

  function init() {
    render();
    document.addEventListener("cart:change", render);
    RENDER.wireAdd(document.getElementById("cartRecoRow"));
  }

  function render() {
    var items = CART.items();
    var body = document.getElementById("cartBody");
    var empty = !items.length;
    body.innerHTML = empty ? emptyView() : filledView(items);
    document.body.classList.toggle("has-cart-bar", !empty);
    if (!empty) wire(body);
    if (empty !== wasEmpty) { wasEmpty = empty; renderReco(empty); }
  }

  /* ----------------------------- empty basket ---------------------------- */
  function emptyView() {
    var user = AUTH.current();
    var cta = user
      ? '<p>Find everything you need for your next project — tools, garden, bathroom and more.</p>'+
        '<div class="cart-empty-actions"><a class="btn btn-primary" href="index.html">Start shopping</a>'+
        '<a class="btn btn-ghost" href="category.html?deals=1">Today\'s deals</a></div>'
      : '<p>Sign in to check out faster and keep track of your orders.</p>'+
        '<div class="cart-empty-actions"><a class="btn btn-primary" href="login.html?next=cart.html">Sign in</a>'+
        '<a class="btn btn-ghost" href="index.html">Continue shopping</a></div>';
    return '<section class="cart-empty">'+
      '<div class="cart-empty-art" aria-hidden="true">'+emptyArt()+'</div>'+
      '<div class="cart-empty-copy">'+
        '<h1>Your basket is empty</h1>'+ cta +
        '<div class="cart-empty-cats" id="cartEmptyCats"></div>'+
      '</div>'+
    '</section>';
  }

  // Original illustration: an open crate with a few DIY items, in brand colours.
  function emptyArt() {
    return '<svg viewBox="0 0 240 200" width="240" height="200">'+
      '<ellipse cx="120" cy="184" rx="92" ry="9" fill="#16233f" opacity=".08"/>'+
      '<circle cx="190" cy="40" r="22" fill="#b6e94f" opacity=".35"/>'+
      '<circle cx="46" cy="58" r="12" fill="#43cdb4" opacity=".25"/>'+
      // paint roller
      '<g transform="rotate(-18 92 70)"><rect x="70" y="40" width="46" height="18" rx="9" fill="#43cdb4"/>'+
        '<path d="M116 49h8v22H96v26" fill="none" stroke="#16233f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'+
        '<rect x="90" y="96" width="12" height="30" rx="5" fill="#16233f"/></g>'+
      // wrench
      '<g transform="rotate(24 150 80)"><rect x="144" y="52" width="12" height="70" rx="6" fill="#5b667d"/>'+
        '<path d="M138 50a14 14 0 1 1 24 0l-6-2-6 8-6-8z" fill="#5b667d"/></g>'+
      // leaf / plant
      '<path d="M120 112c-4-22 6-40 24-48-2 22-10 38-24 48z" fill="#b6e94f"/>'+
      '<path d="M120 112c-10-14-24-18-36-16 6 12 20 18 36 16z" fill="#8ccf3a"/>'+
      // crate
      '<path d="M52 108h136l-12 72H64z" fill="#16233f"/>'+
      '<path d="M52 108h136l-6 14H58z" fill="#1f3257"/>'+
      '<rect x="104" y="134" width="32" height="18" rx="4" fill="#fff" opacity=".9"/>'+
      '<path d="M110 139v8M114 139v8M118 139v8M122 139v8M126 139v8M130 139v8" stroke="#16233f" stroke-width="1.6"/>'+
    '</svg>';
  }

  /* ----------------------------- filled basket --------------------------- */
  function filledView(items) {
    var count = CART.count(), sub = CART.subtotal();
    var user = AUTH.current();

    var lines = items.map(function (i) {
      var href = 'product.html?id=' + encodeURIComponent(i.id);
      return '<li class="cline">'+
        '<a class="cline-img" href="'+href+'"><img src="'+DATA.productImage(i, 200)+'" alt="'+UI.esc(i.name)+'"></a>'+
        '<div class="cline-info">'+
          '<div class="cline-brand">'+UI.esc(i.brand || "")+'</div>'+
          '<a class="cline-name" href="'+href+'">'+UI.esc(i.name)+'</a>'+
          '<div class="cline-meta"><span class="cline-stock">'+I.check+' In stock</span><span>'+UI.esc(CONFIG.FREE_SHIPPING_LABEL)+'</span></div>'+
          '<div class="cline-actions">'+
            '<div class="stepper" role="group" aria-label="Quantity for '+UI.esc(i.name)+'">'+
              '<button type="button" data-dec="'+UI.esc(i.id)+'" aria-label="Decrease quantity"'+(i.qty <= 1 ? ' class="is-min"' : '')+'>'+(i.qty <= 1 ? I.trash : '−')+'</button>'+
              '<span aria-live="polite">'+i.qty+'</span>'+
              '<button type="button" data-inc="'+UI.esc(i.id)+'" aria-label="Increase quantity">+</button>'+
            '</div>'+
            '<button type="button" class="cline-remove" data-rm="'+UI.esc(i.id)+'">Remove</button>'+
          '</div>'+
        '</div>'+
        '<div class="cline-price">'+
          '<div class="cline-total">'+DATA.money(i.price * i.qty)+'</div>'+
          (i.qty > 1 ? '<div class="cline-unit">'+DATA.money(i.price)+' each</div>' : '')+
        '</div>'+
      '</li>';
    }).join("");

    return '<div class="cart-head">'+
        '<h1>Your basket <span>('+count+' item'+(count === 1 ? '' : 's')+')</span></h1>'+
        '<a class="cart-back" href="index.html">'+I.back+' Continue shopping</a>'+
      '</div>'+
      '<div class="cart-layout">'+
        '<div class="cart-main">'+
          '<section class="cart-card">'+
            '<div class="cart-card-head"><strong>Delivered by '+UI.esc(CONFIG.BRAND_NAME)+'</strong>'+
              '<button type="button" class="cart-clear" id="clearBtn">'+I.trash+' Empty basket</button></div>'+
            '<ul class="clines">'+lines+'</ul>'+
          '</section>'+
          '<div class="cart-perks">'+
            perk(UI.icons.truck, "Free delivery", "On every order") +
            perk(I.returns, "Easy returns", "Hassle-free process") +
            perk(UI.icons.shield, "Secure payment", "Encrypted checkout") +
          '</div>'+
        '</div>'+
        '<aside class="cart-summary">'+
          '<h2>Order summary</h2>'+
          '<div class="sum-line"><span>Subtotal ('+count+' item'+(count === 1 ? '' : 's')+')</span><span>'+DATA.money(sub)+'</span></div>'+
          '<div class="sum-line"><span>Delivery</span><span class="free">Free</span></div>'+
          '<div class="sum-total"><span>Total</span><span>'+DATA.money(sub)+'</span></div>'+
          '<p class="sum-tax">Prices in '+UI.esc(CONFIG.CURRENCY_CODE)+'</p>'+
          '<button class="btn btn-checkout btn-block" type="button" data-checkout id="checkoutBtn">'+I.lock+' Proceed to checkout</button>'+
          (user ? '' : '<p class="sum-hint">You\'ll sign in or create an account at the next step.</p>')+
          '<div class="sum-pay" aria-label="Accepted payment methods">'+
            ['VISA','MC','AMEX','PayPal','G Pay','Pay'].map(function (p) { return '<span>'+p+'</span>'; }).join('')+
          '</div>'+
        '</aside>'+
      '</div>'+
      // phone: total + checkout always reachable above the tab bar
      '<div class="cart-bar">'+
        '<div><span>Total</span><strong>'+DATA.money(sub)+'</strong></div>'+
        '<button class="btn btn-checkout" type="button" data-checkout>Checkout</button>'+
      '</div>';
  }

  function perk(icon, title, sub) {
    return '<div class="perk"><span class="perk-ic">'+icon+'</span><div><strong>'+title+'</strong><span>'+sub+'</span></div></div>';
  }

  function wire(body) {
    body.querySelectorAll("[data-inc]").forEach(function (b) { b.onclick = function () { var i = find(b.dataset.inc); CART.setQty(i.id, i.qty + 1); }; });
    body.querySelectorAll("[data-dec]").forEach(function (b) {
      b.onclick = function () {
        var i = find(b.dataset.dec);
        if (i.qty <= 1) UI.toast("Removed from basket");
        CART.setQty(i.id, i.qty - 1);
      };
    });
    body.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { CART.remove(b.dataset.rm); UI.toast("Removed from basket"); }; });
    document.getElementById("clearBtn").onclick = function () {
      if (confirm("Remove all items from your basket?")) CART.clear();
    };
    body.querySelectorAll("[data-checkout]").forEach(function (b) { b.onclick = checkout; });
  }

  /* --------------------------- recommendations --------------------------- */
  async function renderReco(empty) {
    var sec = document.getElementById("cartReco"), row = document.getElementById("cartRecoRow");
    document.getElementById("cartRecoTitle").textContent = empty ? "Popular right now" : "You may also like";
    sec.hidden = false;
    row.innerHTML = RENDER.skeletons(4);
    try {
      var inCart = {}; CART.items().forEach(function (i) { inCart[i.id] = 1; });
      var picks = (await DATA.bestsellers()).concat(await DATA.deals())
        .filter(function (p, idx, arr) { return !inCart[p.id] && arr.findIndex(function (x) { return x.id === p.id; }) === idx; })
        .slice(0, 10);
      if (!picks.length) { sec.hidden = true; return; }
      row.innerHTML = picks.map(function (p) { return '<div class="row-item">'+RENDER.productCard(p)+'</div>'; }).join("");
      if (empty) {
        var cats = await DATA.categories(), el = document.getElementById("cartEmptyCats");
        if (el) el.innerHTML = '<span>Popular categories:</span>' + cats.map(function (c) {
          return '<a class="chip" href="category.html?cat='+encodeURIComponent(c.id)+'">'+UI.esc(c.name)+'</a>';
        }).join("");
      }
    } catch (e) { sec.hidden = true; }
  }

  function find(id) { return CART.items().find(function (i) { return i.id === id; }); }

  async function checkout() {
    var user = AUTH.current();
    if (!user) { UI.toast("Please sign in to checkout"); setTimeout(function () { location.href = "login.html?next=cart.html"; }, 700); return; }
    var items = CART.items(), total = CART.subtotal();
    document.querySelectorAll("[data-checkout]").forEach(function (b) { b.textContent = "Placing order…"; b.disabled = true; });

    var ok = true, orderId = "o-" + Date.now().toString(36);
    if (CONFIG.API_URL) {
      try {
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "createOrder", userId: user.id, identifier: user.identifier, items: items, total: total }) });
        var j = await r.json(); ok = j.ok; if (j.orderId) orderId = j.orderId;
      } catch (e) { ok = false; }
    }
    sessionStorage.setItem("tn_last_order", JSON.stringify({ id: orderId, total: total, items: items, ok: ok, createdAt: new Date().toISOString() }));
    document.removeEventListener("cart:change", render);   // don't flash the empty state before redirecting
    CART.clear();
    location.href = "account.html?ordered=1";
  }

  return { init: init };
})();
