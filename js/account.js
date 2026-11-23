/* ============================== account ================================= */
window.ACCOUNT = (function () {
  var user = null, orders = [];

  var I = {
    box: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    id: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h3"/></svg>',
    help: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/></svg>',
    out: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>',
    check: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
  };

  async function init() {
    user = AUTH.current();
    if (!user) { location.href = "login.html?next=account.html"; return; }

    document.getElementById("accountBody").innerHTML =
      orderBanner() +
      '<section class="acct-hero" id="acctHero">'+heroInner()+'</section>'+

      '<div class="acct-stats">'+
        stat("statOrders", "—", "Orders") +
        stat("statSpent", "—", "Total spent") +
        stat("statBasket", String(CART.count()), "In basket", "cart.html") +
      '</div>'+

      '<div class="acct-layout">'+
        '<nav class="acct-nav" aria-label="Account sections">'+
          navLink("#orders", I.box, "My orders", true) +
          navLink("#details", I.id, "Account details") +
          navLink("#help", I.help, "Help & support") +
          '<button type="button" class="acct-nav-link danger" data-logout>'+I.out+'<span>Log out</span></button>'+
        '</nav>'+

        '<div class="acct-main">'+
          '<section class="acct-card" id="orders">'+
            '<div class="acct-card-head"><h2>My orders</h2><span class="tag" id="ordersCount" hidden></span></div>'+
            '<div id="ordersList">'+orderSkeleton()+orderSkeleton()+'</div>'+
          '</section>'+

          '<section class="acct-card" id="details">'+detailsView()+'</section>'+

          '<section class="acct-card" id="help">'+
            '<div class="acct-card-head"><h2>Help & support</h2></div>'+
            '<p class="acct-muted">Questions about an order, delivery or returns? Our team is happy to help.</p>'+
            '<a class="btn btn-ghost acct-help-btn" href="mailto:'+UI.esc(CONFIG.SUPPORT_EMAIL)+'">'+I.mail+' '+UI.esc(CONFIG.SUPPORT_EMAIL)+'</a>'+
          '</section>'+

          '<button type="button" class="btn btn-ghost btn-block acct-logout-bottom" data-logout>'+I.out+' Log out</button>'+
        '</div>'+
      '</div>';

    document.getElementById("accountBody").addEventListener("click", function (e) {
      if (e.target.closest("[data-logout]")) { AUTH.logout(); location.href = "index.html"; }
    });
    wireDetails();
    document.addEventListener("cart:change", function () {
      var el = document.getElementById("statBasket"); if (el) el.textContent = CART.count();
    });
    highlightNav();
    await loadOrders();
  }

  /* ------------------------------ orders --------------------------------- */
  // Orders come from Apps Script (~2-3 s). Show the last known list instantly,
  // then refresh from the Sheet and re-render only if something changed.
  async function loadOrders() {
    var key = "mm_orders_" + user.id, cached = null;
    try { cached = JSON.parse(localStorage.getItem(key)); } catch (e) {}
    if (cached) renderOrders(withLastOrder(cached));

    document.getElementById("ordersList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-reorder]"); if (!b) return;
      var o = orders[Number(b.dataset.reorder)], added = 0;
      (o.items || []).forEach(function (it) { if (it && it.id) { CART.add(it, it.qty || 1); added++; } });
      UI.toast(added ? "Added to your basket" : "These items are no longer available");
    });

    var fresh = null;
    if (CONFIG.API_URL) {
      try {
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "getOrders", userId: user.id }) });
        var j = await r.json(); if (j.ok) fresh = j.orders || [];
      } catch (e) {}
    }
    if (fresh) {
      try { localStorage.setItem(key, JSON.stringify(fresh)); } catch (e) {}
      if (!cached || JSON.stringify(fresh) !== JSON.stringify(cached)) renderOrders(withLastOrder(fresh));
    } else if (!cached) {
      renderOrders(withLastOrder([]));
    }
  }

  // Make sure an order just placed on this device shows even if the Sheet
  // hasn't returned it yet (or the server was unreachable at checkout).
  function withLastOrder(list) {
    var last = lastOrder();
    if (!last || list.some(function (o) { return o.id === last.id; })) return list;
    return [{ id: last.id, total: last.total, status: "received", createdAt: last.createdAt,
      items: Array.isArray(last.items) ? last.items : [], count: Array.isArray(last.items) ? null : Number(last.items) || 0 }].concat(list);
  }

  function renderOrders(list) {
    orders = list;
    var spent = orders.reduce(function (s, o) { return s + (Number(o.total) || 0); }, 0);
    document.getElementById("statOrders").textContent = orders.length;
    document.getElementById("statSpent").textContent = DATA.money(spent);
    var oc = document.getElementById("ordersCount");
    oc.hidden = !orders.length; oc.textContent = orders.length + (orders.length === 1 ? " order" : " orders");

    var el = document.getElementById("ordersList");
    if (!orders.length) return emptyOrders(el);
    el.innerHTML = orders.map(orderCard).join("");
  }

  function orderCard(o, i) {
    var items = Array.isArray(o.items) ? o.items.filter(Boolean) : [];
    var count = items.length ? items.reduce(function (n, it) { return n + (Number(it.qty) || 1); }, 0)
                             : (o.count != null ? o.count : Number(o.items) || 0);
    var thumbs = items.slice(0, 4).map(function (it) {
      return '<img src="'+DATA.productImage(it, 120)+'" alt="'+UI.esc(it.name || "")+'" title="'+UI.esc(it.name || "")+'">';
    }).join("") + (items.length > 4 ? '<span class="more">+'+(items.length - 4)+'</span>' : "");
    var st = String(o.status || "received").toLowerCase();
    var date = o.createdAt ? new Date(o.createdAt) : null;
    var dateTxt = date && !isNaN(date) ? date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Just now";
    var canReorder = items.some(function (it) { return it.id; });

    return '<article class="order">'+
      '<div class="order-top">'+
        '<div><div class="order-id">Order '+UI.esc(orderNo(o.id))+'</div>'+
          '<div class="order-date">Placed '+UI.esc(dateTxt)+'</div></div>'+
        '<span class="status st-'+UI.esc(st)+'">'+UI.esc(st.charAt(0).toUpperCase() + st.slice(1))+'</span>'+
      '</div>'+
      (thumbs ? '<div class="order-thumbs">'+thumbs+'</div>' : "")+
      '<div class="order-bottom">'+
        '<div class="order-sum">'+count+' item'+(count === 1 ? "" : "s")+' · <strong>'+DATA.money(o.total)+'</strong></div>'+
        (canReorder ? '<button type="button" class="btn btn-ghost order-again" data-reorder="'+i+'">Buy again</button>' : "")+
      '</div>'+
    '</article>';
  }

  async function emptyOrders(list) {
    list.innerHTML =
      '<div class="acct-empty">'+
        '<div class="acct-empty-ic">'+I.box+'</div>'+
        '<h3>No orders yet</h3>'+
        '<p>When you place an order, you can follow it here.</p>'+
        '<a class="btn btn-primary" href="index.html">Start shopping</a>'+
      '</div>'+
      '<div class="acct-reco"><h3>Recommended for you</h3><div class="scroll-x" id="recoRow">'+RENDER.skeletons(4)+'</div></div>';
    try {
      var picks = (await DATA.bestsellers()).slice(0, 8);
      var row = document.getElementById("recoRow");
      row.innerHTML = picks.map(function (p) { return '<div class="row-item">'+RENDER.productCard(p)+'</div>'; }).join("");
      RENDER.wireAdd(row);
    } catch (e) { document.querySelector(".acct-reco").remove(); }
  }

  /* ------------------------------ helpers -------------------------------- */
  function orderBanner() {
    var last = lastOrder();
    if (!new URLSearchParams(location.search).get("ordered") || !last) return "";
    return '<div class="acct-success" role="status">'+
      '<div class="acct-success-ic">'+I.check+'</div>'+
      '<div><strong>Thank you! Your order is confirmed.</strong>'+
        '<span>Order '+UI.esc(orderNo(last.id))+' · '+DATA.money(last.total)+
        (last.ok ? '' : ' · saved on this device')+'</span></div>'+
    '</div>';
  }
  function lastOrder() { try { return JSON.parse(sessionStorage.getItem("tn_last_order")); } catch (e) { return null; } }
  function initials() {
    var parts = (user.name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return (user.identifier || "?").charAt(0).toUpperCase();
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function prettyId(id) {
    id = String(id || "");
    var d = id.replace(/\D/g, "");
    if (!AUTH.isEmail(id) && d.length === 10) return d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6);
    return id;
  }
  function stat(id, val, label, href) {
    var inner = '<span class="acct-stat-val" id="'+id+'">'+UI.esc(val)+'</span><span class="acct-stat-lbl">'+label+'</span>';
    return href ? '<a class="acct-stat" href="'+href+'">'+inner+'</a>' : '<div class="acct-stat">'+inner+'</div>';
  }
  function navLink(href, icon, label, active) {
    return '<a class="acct-nav-link'+(active ? " active" : "")+'" href="'+href+'">'+icon+'<span>'+label+'</span>'+UI.icons.chev+'</a>';
  }
  function row(k, v) { return '<div><dt>'+UI.esc(k)+'</dt><dd>'+UI.esc(v)+'</dd></div>'; }
  function orderNo(id) { return /^\d+$/.test(String(id)) ? "#" + id : String(id).toUpperCase(); }

  /* ------------------------------ profile -------------------------------- */
  function heroInner() {
    var isEmail = AUTH.isEmail(user.identifier);
    var first = (user.name || "").trim().split(/\s+/)[0];
    return '<div class="acct-avatar" aria-hidden="true">'+UI.esc(initials())+'</div>'+
      '<div class="acct-hello">'+
        '<p class="acct-kicker">My account</p>'+
        '<h1>Hello, '+UI.esc(first || "there")+'</h1>'+
        '<p class="acct-id">'+UI.esc(prettyId(user.identifier))+' · '+(isEmail ? "Email account" : "Mobile account")+'</p>'+
      '</div>'+
      '<button class="acct-logout-top" type="button" data-logout>'+I.out+'<span>Log out</span></button>';
  }

  function detailsView(notice) {
    var isEmail = AUTH.isEmail(user.identifier);
    return '<div class="acct-card-head"><h2>Account details</h2>'+
        '<button type="button" class="btn btn-ghost acct-edit-btn" data-edit>'+I.edit+' Edit profile</button></div>'+
      (notice ? '<div class="msg ok" role="status">'+UI.esc(notice)+'</div>' : '')+
      '<dl class="acct-dl">'+
        row("Name", user.name || "—") +
        row(isEmail ? "Email" : "Mobile number", prettyId(user.identifier)) +
        row("Password", "••••••••") +
        row("Customer ID", user.id != null ? "#" + user.id : "—") +
      '</dl>'+
      '<p class="acct-note">🔒 Your password is hashed on your device and is never stored in plain text.</p>';
  }

  function detailsForm() {
    return '<div class="acct-card-head"><h2>Edit profile</h2></div>'+
      '<form class="acct-form" id="profileForm" novalidate>'+
        '<div id="profileMsg"></div>'+
        '<div class="field"><label for="pfName">Full name</label>'+
          '<input id="pfName" type="text" autocomplete="name" maxlength="80" required value="'+UI.esc(user.name || "")+'"></div>'+
        '<div class="field"><label for="pfIdent">Email or mobile number</label>'+
          '<input id="pfIdent" type="text" autocomplete="username" required value="'+UI.esc(user.identifier || "")+'">'+
          '<small>You\'ll use this to log in.</small></div>'+
        '<div class="field"><label for="pfNewPw">New password <span class="opt">(optional)</span></label>'+
          '<input id="pfNewPw" type="password" autocomplete="new-password" minlength="6" placeholder="Leave blank to keep your current password"></div>'+
        '<div class="acct-form-sep"></div>'+
        '<div class="field"><label for="pfCurPw">Current password</label>'+
          '<input id="pfCurPw" type="password" autocomplete="current-password" required placeholder="Required to save changes"></div>'+
        '<div class="acct-form-actions">'+
          '<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>'+
          '<button type="submit" class="btn btn-primary" id="pfSave">Save changes</button>'+
        '</div>'+
      '</form>';
  }

  function wireDetails() {
    var sec = document.getElementById("details");
    sec.addEventListener("click", function (e) {
      if (e.target.closest("[data-edit]")) {
        sec.innerHTML = detailsForm();
        document.getElementById("pfName").focus();
      } else if (e.target.closest("[data-cancel]")) {
        sec.innerHTML = detailsView();
      }
    });
    sec.addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = document.getElementById("pfSave"), msg = document.getElementById("profileMsg");
      msg.innerHTML = ""; btn.disabled = true; btn.textContent = "Saving…";
      var res = await AUTH.updateProfile({
        name: document.getElementById("pfName").value,
        identifier: document.getElementById("pfIdent").value,
        newPassword: document.getElementById("pfNewPw").value,
        currentPassword: document.getElementById("pfCurPw").value
      });
      if (!res.ok) {
        btn.disabled = false; btn.textContent = "Save changes";
        msg.innerHTML = '<div class="msg err" role="alert">'+UI.esc(res.error || "Couldn't save your changes.")+'</div>';
        return;
      }
      user = AUTH.current();
      document.getElementById("acctHero").innerHTML = heroInner();
      sec.innerHTML = detailsView("Your profile has been updated.");
      UI.toast("Profile updated");
    });
  }
  function orderSkeleton() {
    return '<div class="order"><div class="skeleton" style="height:16px;width:40%"></div>'+
      '<div class="skeleton" style="height:12px;width:25%;margin-top:8px"></div>'+
      '<div class="skeleton" style="height:56px;width:60%;margin-top:14px"></div></div>';
  }
  // Highlight the side-nav item for the section currently in view.
  function highlightNav() {
    if (!("IntersectionObserver" in window)) return;
    var links = document.querySelectorAll(".acct-nav a.acct-nav-link");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    ["orders", "details", "help"].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  return { init: init };
})();
