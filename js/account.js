/* ============================== account ================================= */
window.ACCOUNT = (function () {
  async function init() {
    var user = AUTH.current();
    if (!user) { location.href = "login.html?next=account.html"; return; }
    var body = document.getElementById("accountBody");

    var ordered = new URLSearchParams(location.search).get("ordered");
    var last = null; try { last = JSON.parse(sessionStorage.getItem("tn_last_order")); } catch (e) {}
    var banner = (ordered && last)
      ? '<div class="msg ok" style="margin-bottom:16px">✅ Order <strong>'+UI.esc(last.id)+'</strong> placed — '+DATA.money(last.total)+
        (last.ok ? ' (saved to your account).' : ' (saved on this device).')+'</div>'
      : "";

    body.innerHTML = banner +
      '<div class="card-pane" style="max-width:640px;margin:0 auto 16px">'+
        '<div style="display:flex;align-items:center;gap:14px">'+
          '<div style="width:56px;height:56px;border-radius:50%;background:var(--teal);color:var(--teal-ink);display:grid;place-items:center;font-weight:800;font-size:22px">'+
            UI.esc((user.name||user.identifier).charAt(0).toUpperCase())+'</div>'+
          '<div><div style="font-weight:800;font-size:19px">'+UI.esc(user.name||"Welcome")+'</div>'+
            '<div style="color:var(--muted);font-size:14px">'+UI.esc(user.identifier)+'</div></div>'+
        '</div>'+
      '</div>'+
      '<div class="card-pane" style="max-width:640px;margin:0 auto 16px">'+
        '<h3 style="margin:0 0 10px">Your orders</h3>'+
        '<div id="orders"><p style="color:var(--muted)">Loading…</p></div>'+
      '</div>'+
      '<div style="max-width:640px;margin:0 auto">'+
        '<button class="btn btn-ghost btn-block" id="logoutBtn">Log out</button>'+
      '</div>';

    document.getElementById("logoutBtn").onclick = function () { AUTH.logout(); location.href = "index.html"; };
    loadOrders(user);
  }

  async function loadOrders(user) {
    var el = document.getElementById("orders");
    var orders = [];
    if (CONFIG.API_URL) {
      try {
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "getOrders", userId: user.id }) });
        var j = await r.json(); if (j.ok) orders = j.orders || [];
      } catch (e) {}
    }
    if (!orders.length) {
      var last = null; try { last = JSON.parse(sessionStorage.getItem("tn_last_order")); } catch (e) {}
      if (last) orders = [{ id: last.id, total: last.total, status: "received", items: new Array(last.items) }];
    }
    if (!orders.length) { el.innerHTML = '<p style="color:var(--muted)">No orders yet. <a class="link" href="index.html">Start shopping</a>.</p>'; return; }
    el.innerHTML = orders.map(function (o) {
      var n = Array.isArray(o.items) ? o.items.length : (o.items || 0);
      return '<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)">'+
        '<div><div style="font-weight:700">'+UI.esc(o.id)+'</div>'+
          '<div style="color:var(--muted);font-size:13px">'+n+' item(s) · '+UI.esc(o.status||"received")+'</div></div>'+
        '<div style="font-weight:800">'+DATA.money(o.total)+'</div></div>';
    }).join("");
  }

  return { init: init };
})();
