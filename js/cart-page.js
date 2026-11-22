/* ============================== cart page ================================ */
window.CARTPAGE = (function () {
  function init() { render(); document.addEventListener("cart:change", render); }

  function render() {
    var items = CART.items();
    var body = document.getElementById("cartBody");
    if (!items.length) {
      body.innerHTML =
        '<div class="empty">'+
          '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--line)" stroke-width="1.5"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L21 7H6"/></svg>'+
          '<h3>Your basket is empty</h3><p>Browse our deals and add something you love.</p>'+
          '<a class="btn btn-primary" href="index.html" style="display:inline-flex;margin-top:12px">Continue shopping</a>'+
        '</div>';
      return;
    }

    var lines = items.map(function (i) {
      return '<div class="cart-line">'+
        '<a class="ci" href="product.html?id='+i.id+'"><img src="'+DATA.productImage(i,200)+'" alt="'+UI.esc(i.name)+'"></a>'+
        '<div><a class="cn" href="product.html?id='+i.id+'">'+UI.esc(i.name)+'</a>'+
          '<div style="color:var(--muted);font-size:13px">'+UI.esc(i.brand||"")+'</div>'+
          '<div class="qty" style="margin-top:8px"><button data-dec="'+i.id+'">−</button><span>'+i.qty+'</span><button data-inc="'+i.id+'">+</button></div>'+
          '<div class="rm" data-rm="'+i.id+'" role="button" style="cursor:pointer">Remove</div>'+
        '</div>'+
        '<div style="text-align:right;font-weight:800">'+DATA.money(i.price*i.qty)+'</div>'+
      '</div>';
    }).join("");

    var sub = CART.subtotal();
    var ship = 0; // free shipping
    var total = sub + ship;

    body.innerHTML =
      '<div class="listing" style="grid-template-columns:1fr">'+
        '<div style="display:grid;gap:16px;grid-template-columns:1fr">'+
          '<div>'+lines+'</div>'+
          '<div class="summary">'+
            '<div class="line"><span>Subtotal ('+CART.count()+' items)</span><span>'+DATA.money(sub)+'</span></div>'+
            '<div class="line"><span>Delivery</span><span style="color:#0c7a5b;font-weight:700">Free</span></div>'+
            '<div class="line total"><span>Total</span><span>'+DATA.money(total)+'</span></div>'+
            '<button class="btn btn-lime btn-block" id="checkoutBtn" style="margin-top:14px">Proceed to checkout</button>'+
            '<button class="btn btn-ghost btn-block" id="clearBtn" style="margin-top:10px">Clear basket</button>'+
            '<p style="color:var(--muted);font-size:12px;text-align:center;margin:12px 0 0">'+UI.icons.shield+' Secure checkout · '+CONFIG.CURRENCY_CODE+' only</p>'+
          '</div>'+
        '</div>'+
      '</div>';

    body.querySelectorAll("[data-inc]").forEach(function (b) { b.onclick = function () { var i = find(b.getAttribute("data-inc")); CART.setQty(i.id, i.qty+1); }; });
    body.querySelectorAll("[data-dec]").forEach(function (b) { b.onclick = function () { var i = find(b.getAttribute("data-dec")); CART.setQty(i.id, i.qty-1); }; });
    body.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { CART.remove(b.getAttribute("data-rm")); UI.toast("Removed from basket"); }; });
    document.getElementById("clearBtn").onclick = function () { CART.clear(); };
    document.getElementById("checkoutBtn").onclick = checkout;
  }

  function find(id) { return CART.items().find(function (i) { return i.id === id; }); }

  async function checkout() {
    var user = AUTH.current();
    if (!user) { UI.toast("Please sign in to checkout"); setTimeout(function () { location.href = "login.html?next=cart.html"; }, 700); return; }
    var items = CART.items(), total = CART.subtotal();
    var btn = document.getElementById("checkoutBtn"); btn.textContent = "Placing order…"; btn.disabled = true;

    var ok = true, orderId = "o-" + Date.now().toString(36);
    if (CONFIG.API_URL) {
      try {
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "createOrder", userId: user.id, identifier: user.identifier, items: items, total: total }) });
        var j = await r.json(); ok = j.ok; if (j.orderId) orderId = j.orderId;
      } catch (e) { ok = false; }
    }
    CART.clear();
    sessionStorage.setItem("tn_last_order", JSON.stringify({ id: orderId, total: total, items: items.length, ok: ok }));
    location.href = "account.html?ordered=1";
  }

  return { init: init };
})();
