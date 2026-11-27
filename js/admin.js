/* ============================== admin panel ============================== */
/* Single-page admin for the Google Sheets backend. Every call goes to the
   Apps Script web app with a short-lived admin token (see adminLogin in
   apps-script/Code.gs). Hash routes: #dashboard #orders #products
   #categories #vendors #users                                              */
window.ADMIN = (function () {
  var C = window.CONFIG;
  var SKEY = "mm_admin";
  var STATUSES = ["pending", "received", "processing", "shipped", "delivered", "cancelled"];
  var session = null, catalog = null;
  var ADMIN_ROLES = ["superadmin", "manager", "staff"];
  // Mirror of PERMS in Code.gs (the server enforces these; here we just hide UI).
  var OP_PERM = {
    deleteProduct: ["superadmin", "manager"], saveCategory: ["superadmin", "manager"],
    deleteCategory: ["superadmin", "manager"], saveVendor: ADMIN_ROLES,
    deleteVendor: ["superadmin", "manager"], importCatalog: ["superadmin", "manager"],
    saveBanner: ["superadmin", "manager"], deleteBanner: ["superadmin", "manager"],
    addTx: ["superadmin", "manager", "staff"], updateTx: ["superadmin", "manager"], setGuarantee: ["superadmin", "manager", "staff"],
    listAdmins: ["superadmin"], saveAdmin: ["superadmin"], deleteAdmin: ["superadmin"]
  };
  function role() { return (session && session.admin && session.admin.role) || "superadmin"; }
  function can(op) { return !OP_PERM[op] || OP_PERM[op].indexOf(role()) > -1; }
  function myStaffCode() { return String((session && session.admin && session.admin.staffCode) || ""); }
  function roleLabel(r) { return { superadmin: "Super admin", manager: "Manager", staff: "Staff" }[r] || cap(r); }

  var ic = {
    dash: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z"/>',
    orders: '<path d="M6 3h12l1 4H5zM5 7h14v13H5zM9 11h6"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    store: '<path d="M4 9l1.5-5h13L20 9M4 9h16v2a3 3 0 0 1-5.3 2A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1A3 3 0 0 1 4 11zM5 13v7h14v-7M10 20v-4h4v4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/><path class="chev" d="M15.5 9.5 13 12l2.5 2.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'
  };
  function svg(name, size) {
    return '<svg width="'+(size||18)+'" height="'+(size||18)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ic[name]+'</svg>';
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]; }); }
  function money(n) { return DATA.money(Number(n) || 0); }
  // All dates in Indian Standard Time: "27/11/2026" and "12:47 AM IST".
  var IST_D = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" });
  var IST_T = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
  function istParts(d) { var x = d ? new Date(d) : null; return x && !isNaN(x) ? { date: IST_D.format(x), time: IST_T.format(x).toUpperCase() + " IST" } : null; }
  function fmtDate(d) { var p = istParts(d); return p ? p.date : "—"; }
  // Two-line cell: date, then the time underneath (HTML).
  function fmtDateTime(d) { var p = istParts(d); return p ? '<div class="adm-dt">'+esc(p.date)+'</div><div class="adm-cell-sub">'+esc(p.time)+'</div>' : "—"; }
  function fmtDateTimeInline(d) { var p = istParts(d); return p ? p.date + ", " + p.time : ""; }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function $(id) { return document.getElementById(id); }

  /* ------------------------------- session -------------------------------- */
  // Kept in localStorage so closing the tab/browser doesn't sign the admin out;
  // the session ends only when they click "Log out".
  function loadSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY));
      if (s && s.token && new Date(s.expires) > new Date()) return s;
    } catch (e) {}
    localStorage.removeItem(SKEY); return null;
  }
  function logout(msg) {
    localStorage.removeItem(SKEY); session = null; catalog = null;
    if (_txTimer) { clearInterval(_txTimer); _txTimer = null; }
    if (_chatTimer) { clearInterval(_chatTimer); _chatTimer = null; }
    if (_chatW) { _chatW.destroy(); _chatW = null; }
    _chatData = null; _chatSel = null; _chatMax = 0;
    renderLogin(msg);
  }

  async function post(body) {
    try {
      var r = await fetch(C.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      return await r.json();
    } catch (e) { return { ok: false, error: "Can't reach the server. Check your connection and that the Apps Script is deployed." }; }
  }
  async function api(op, payload) {
    var res = await post({ action: "admin", token: session && session.token, op: op, payload: payload || {} });
    if (res.auth) { logout(res.error); throw new Error(res.error); }
    if (res.ok && (op === "updateTx" || op === "addTx")) refreshTxBadge();
    return res;
  }

  /* -------------------------------- init ---------------------------------- */
  function init() {
    if (!C.API_URL) {
      $("adminApp").innerHTML = '<div class="adm-login"><div class="adm-login-card">'+brand()+
        '<h1>Admin panel</h1><div class="msg err">The admin panel needs the Google Sheets backend. Set <code>API_URL</code> in <code>js/config.js</code>.</div></div></div>';
      return;
    }
    session = loadSession();
    if (session) renderShell(); else renderLogin();
  }

  function brand() {
    var n = esc(C.BRAND_NAME), r = role();
    var badge = r === "staff" ? "Staff" : r === "manager" ? "Manager" : "Admin";
    return '<a class="adm-brand" href="index.html"><img src="images/logo-64.png" alt="" width="30" height="30"><span>'+n+'</span><em>'+esc(badge)+'</em></a>';
  }

  /* -------------------------------- login --------------------------------- */
  function renderLogin(msg) {
    document.body.classList.remove("adm-nav-open");
    $("adminApp").innerHTML =
      '<div class="adm-login"><form class="adm-login-card" id="admLogin" novalidate>'+ brand() +
        '<h1>Sign in to admin</h1><p class="adm-muted">Enter your admin username and password.</p>'+
        '<div id="admLoginMsg">'+(msg ? '<div class="msg err">'+esc(msg)+'</div>' : '')+'</div>'+
        '<div class="field"><label for="admId">Username</label><input id="admId" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>'+
        '<div class="field"><label for="admPw">Password</label><input id="admPw" type="password" autocomplete="current-password" required></div>'+
        '<button class="btn btn-primary btn-block" id="admLoginBtn" type="submit">Sign in</button>'+
        '<a class="adm-back" href="index.html">← Back to the shop</a>'+
      '</form></div>';
    enhancePasswords(document);
    $("admId").focus();
    $("admLogin").addEventListener("submit", async function (e) {
      e.preventDefault();
      var username = AUTH.normId($("admId").value), pw = $("admPw").value, btn = $("admLoginBtn");
      if (!username || !pw) { $("admLoginMsg").innerHTML = '<div class="msg err">Enter your username and password.</div>'; return; }
      btn.disabled = true; btn.textContent = "Signing in…";
      var res = await post({ action: "adminLogin", username: username, passwordHash: await adminHash(username, pw) });
      btn.disabled = false; btn.textContent = "Sign in";
      if (!res.ok) { $("admLoginMsg").innerHTML = '<div class="msg err">'+esc(res.error || "Sign in failed.")+'</div>'; return; }
      session = { token: res.token, expires: res.expires, admin: res.admin };
      localStorage.setItem(SKEY, JSON.stringify(session));
      renderShell();
    });
  }

  /* -------------------------------- shell --------------------------------- */
  var NAV = [
    ["dashboard", "Dashboard", "dash", ADMIN_ROLES], ["orders", "Orders", "orders", ADMIN_ROLES], ["products", "Products", "box", ADMIN_ROLES],
    // staff see (and add) only the sellers registered with their staff code
    ["vendors", "Sellers", "store", ADMIN_ROLES],
    ["categories", "Categories", "tag", ["superadmin", "manager"]], ["banners", "Banners", "image", ["superadmin", "manager"]],
    ["wallet", "Wallet Transaction", "wallet", ["superadmin", "manager", "staff"]],
    ["chat", "Support Chat", "chat", ADMIN_ROLES],
    ["visitors", "Visitors", "globe", ["superadmin", "manager"]],
    ["admins", "Admins", "shield", ["superadmin"]]
  ];
  function canRoute(r) { var n = NAV.filter(function (x) { return x[0] === r; })[0]; return n && n[3].indexOf(role()) > -1; }
  function renderShell() {
    var u = session.admin || {};
    $("adminApp").innerHTML =
      '<div class="adm">'+
        '<aside class="adm-side" id="admSide">'+ brand() +
          '<nav class="adm-nav">'+NAV.filter(function (n) { return canRoute(n[0]); }).map(function (n) {
            return '<a href="#'+n[0]+'" data-route="'+n[0]+'" data-tip="'+esc(n[1])+'">'+svg(n[2], 20)+'<span>'+n[1]+'</span></a>';
          }).join("")+'</nav>'+
          '<div class="adm-side-foot">'+
            '<a href="index.html" target="_blank" rel="noopener" data-tip="View shop">'+svg("ext")+'<span>View shop</span></a>'+
            '<button type="button" id="admLogout" data-tip="Log out">'+svg("out")+'<span>Log out</span></button>'+
          '</div>'+
        '</aside>'+
        '<div class="adm-scrim" id="admScrim"></div>'+
        '<div class="adm-main">'+
          '<header class="adm-top">'+
            '<button type="button" class="adm-menu" id="admMenu" aria-label="Open menu">'+svg("menu", 22)+'</button>'+
            // Desktop: collapse the sidebar to icons only / expand it again (remembered)
            '<button type="button" class="adm-collapse" id="admCollapse">'+svg("sidebar", 20)+'</button>'+
            '<h1 id="admTitle">Dashboard</h1>'+
            '<div class="adm-bellwrap">'+
              '<button type="button" class="adm-menu adm-refresh adm-bell" id="admBell" aria-label="Notifications" title="Notifications">'+svg("bell", 20)+'<span class="adm-bell-dot" id="admBellDot" hidden></span></button>'+
              '<div class="adm-bell-menu" id="admBellMenu" hidden></div>'+
            '</div>'+
            '<button type="button" class="adm-menu adm-refresh" id="admRefresh" aria-label="Refresh" title="Refresh">'+svg("refresh", 20)+'</button>'+
            '<div class="adm-mewrap">'+
              '<button type="button" class="adm-me" id="admMe" aria-haspopup="menu" aria-expanded="false" aria-controls="admMeMenu">'+
                '<span class="adm-avatar">'+esc((u.name || u.username || "A").charAt(0).toUpperCase())+'</span>'+
                '<span class="adm-me-txt"><strong>'+esc(u.name || "Admin")+'</strong><small>@'+esc(u.username || "")+' · '+esc(roleLabel(u.role))+'</small></span>'+
                '<span class="adm-me-chev">'+svg("chevDown", 16)+'</span>'+
              '</button>'+
              '<div class="adm-me-menu" id="admMeMenu" role="menu" hidden>'+
                '<div class="adm-me-head"><strong>'+esc(u.name || u.username || "Admin")+'</strong><small>@'+esc(u.username || "")+' · '+esc(roleLabel(u.role))+'</small></div>'+
                '<button type="button" role="menuitem" data-me="profile">'+svg("user")+'<span>Profile</span></button>'+
                '<button type="button" role="menuitem" data-me="password">'+svg("key")+'<span>Change password</span></button>'+
                '<button type="button" role="menuitem" data-me="logout" class="danger">'+svg("out")+'<span>Log out</span></button>'+
              '</div>'+
            '</div>'+
          '</header>'+
          '<main class="adm-content" id="admView"></main>'+
        '</div>'+
        '<nav class="adm-tabbar" id="admTabbar">'+
          NAV.filter(function (n) { return canRoute(n[0]); }).slice(0, 4).map(function (n) {
            return '<a href="#'+n[0]+'" data-route="'+n[0]+'" class="adm-tab">'+svg(n[2], 22)+'<span>'+esc(n[1])+'</span></a>';
          }).join("")+
          '<button type="button" class="adm-tab" id="admTabMore">'+svg("menu", 22)+'<span>More</span></button>'+
        '</nav>'+
      '</div>'+
      '<div class="adm-toast" id="admToast" role="status"></div>'+
      // Floating support button → Support Chat (hidden while on that page)
      '<button type="button" class="sp-fab on-admin" id="admFab" aria-label="Support chat"><img src="images/support-agent.svg" alt="">'+
        '<span class="sp-dot"></span><span class="sp-badge" hidden>0</span><span class="sp-tip">Support chat</span></button>';

    $("admLogout").onclick = function () { logout(); };
    $("admFab").onclick = function () { location.hash = "#chat"; };
    $("admRefresh").onclick = function () { location.reload(); };
    $("admBell").onclick = function (e) { e.stopPropagation(); setMeMenu(false); toggleBell(); };
    $("admMe").onclick = function (e) { e.stopPropagation(); var m = $("admBellMenu"); if (m) m.hidden = true; setMeMenu($("admMeMenu").hidden); };
    $("admMeMenu").onclick = function (e) {
      e.stopPropagation();
      var b = e.target.closest("[data-me]"); if (!b) return;
      setMeMenu(false);
      if (b.dataset.me === "profile") showMyProfile();
      else if (b.dataset.me === "password") changeMyPassword();
      else if (b.dataset.me === "logout") logout();
    };
    document.addEventListener("click", function () { var m = $("admBellMenu"); if (m) m.hidden = true; setMeMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("admMeMenu") && !$("admMeMenu").hidden) { setMeMenu(false); $("admMe").focus(); } });
    $("admMenu").onclick = function () { document.body.classList.add("adm-nav-open"); };
    function setCollapsed(on) {
      document.body.classList.toggle("adm-collapsed", on);
      var b = $("admCollapse"), t = on ? "Expand sidebar" : "Collapse sidebar";
      b.setAttribute("aria-label", t); b.title = t; b.setAttribute("aria-expanded", on ? "false" : "true");
      try { localStorage.setItem("mm_adm_side", on ? "1" : "0"); } catch (e) {}
    }
    setCollapsed((function () { try { return localStorage.getItem("mm_adm_side") === "1"; } catch (e) { return false; } })());
    $("admCollapse").onclick = function () { setCollapsed(!document.body.classList.contains("adm-collapsed")); };
    $("admTabMore").onclick = function () { document.body.classList.add("adm-nav-open"); };
    $("admScrim").onclick = function () { document.body.classList.remove("adm-nav-open"); };
    window.onhashchange = route;
    route();
    startTxAlerts();
    startChatAlerts();
  }

  /* ---- Real-time transaction alerts (role-scoped polling) ----
     Staff see only their own sellers' requests; admin/manager see everyone's.
     Visual only — a bell notification + toast, no sound or voice. */
  var _txTimer = null;

  // Account menu under the avatar in the header (Profile / Change password / Log out).
  function setMeMenu(open) {
    var m = $("admMeMenu"), b = $("admMe"); if (!m || !b) return;
    m.hidden = !open; b.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // Notification inbox shown under the header bell.
  var _notes = [], _unread = 0;
  function toggleBell() {
    var m = $("admBellMenu"); if (!m) return;
    var show = m.hidden; m.hidden = !show;
    if (show) { _unread = 0; paintBell(); }
  }
  function paintBell() {
    var dot = $("admBellDot"); if (dot) { dot.hidden = _unread <= 0; dot.textContent = _unread > 9 ? "9+" : String(_unread); }
    var m = $("admBellMenu"); if (!m) return;
    m.innerHTML = _notes.length
      ? '<div class="adm-bell-head">Notifications</div>' + _notes.slice(0, 20).map(function (n) {
          return '<div class="adm-bell-item"><div class="adm-bell-main">'+esc(n.title)+'</div><div class="adm-bell-sub">'+esc(n.sub)+'</div></div>';
        }).join("")
      : '<div class="adm-bell-head">Notifications</div><div class="adm-bell-empty">No new notifications.</div>';
  }
  function announceTx(t) {
    var kind = t.type === "withdraw" ? "withdrawal" : t.type === "guarantee" ? "guarantee" : "deposit";
    var amt = (t.currency || "") + Number(t.amount).toFixed(2);
    var text = "New " + kind + " request from " + (t.sellerName || "a seller") + ", " + amt;
    _notes.unshift({ title: (t.sellerName || "Seller") + " — " + cap(kind), sub: amt + " · " + (t.method || "").toUpperCase() });
    _unread++;
    paintBell();
    toast(text);
  }
  // Red count on the "Wallet Transaction" menu item: requests new today or still pending.
  var _txBadge = 0;
  function paintTxBadge(n) {
    _txBadge = n;
    document.querySelectorAll('.adm-nav a[data-route="wallet"], .adm-tab[data-route="wallet"]').forEach(function (a) {
      var b = a.querySelector(".adm-navbadge");
      if (!b) { b = document.createElement("b"); b.className = "adm-navbadge"; a.appendChild(b); }
      b.hidden = !(n > 0); b.textContent = n > 99 ? "99+" : String(n);
    });
  }
  // After approving/rejecting, refresh the count right away instead of waiting for the next poll.
  async function refreshTxBadge() {
    try { var r = await api("walletFeed", { sinceId: 1e15 }); if (r && r.ok && r.badge != null) paintTxBadge(Number(r.badge) || 0); } catch (e) {}
  }
  function startTxAlerts() {
    if (!session || _txTimer) return;
    var KEY = "mm_adm_tx_seen_" + ((session.admin && session.admin.username) || "");
    var seen = Number(localStorage.getItem(KEY) || 0);
    var baselined = seen > 0;
    async function poll() {
      if (!session) return;
      try {
        var r = await api("walletFeed", { sinceId: seen });
        if (!r || !r.ok) return;
        if (r.badge != null) paintTxBadge(Number(r.badge) || 0);
        if (!baselined) { seen = r.maxId || 0; try { localStorage.setItem(KEY, seen); } catch (e) {} baselined = true; return; }
        if (r.transactions && r.transactions.length) {
          r.transactions.forEach(announceTx);
          seen = r.maxId || seen; try { localStorage.setItem(KEY, seen); } catch (e) {}
          if ((location.hash || "").indexOf("wallet") > -1) route();   // refresh the open wallet view
        }
      } catch (e) {}
    }
    poll();
    _txTimer = setInterval(poll, 15000);
  }

  function route() {
    if (!session) return;
    var r = (location.hash || "#dashboard").slice(1);
    if (!canRoute(r)) r = "dashboard";
    document.body.classList.remove("adm-nav-open");
    if ($("admFab")) $("admFab").hidden = r === "chat";
    // Leaving a view (nav click, Back button) closes any open dialog.
    document.querySelectorAll(".adm-modal-back").forEach(function (m) { m.remove(); });
    document.documentElement.classList.remove("no-scroll");
    document.querySelectorAll(".adm-nav a").forEach(function (a) { a.classList.toggle("active", a.dataset.route === r); });
    document.querySelectorAll(".adm-tab[data-route]").forEach(function (a) { a.classList.toggle("active", a.dataset.route === r); });
    $("admTitle").textContent = NAV.filter(function (n) { return n[0] === r; })[0][1];
    document.title = $("admTitle").textContent + " — Admin";
    $("admView").onclick = null;
    if (_chatW) { _chatW.destroy(); _chatW = null; }
    $("admView").innerHTML = skeleton();
    ({ dashboard: viewDashboard, orders: viewOrders, products: viewProducts, categories: viewCategories,
       banners: viewBanners, vendors: viewVendors, wallet: viewWallet, chat: viewChat, visitors: viewVisitors, admins: viewAdmins })[r]().catch(function (e) {
      if (session) $("admView").innerHTML = '<div class="msg err">'+esc(e.message || e)+'</div>';
    });
  }

  function toast(msg, err) {
    var t = $("admToast"); if (!t) return;
    t.textContent = msg; t.className = "adm-toast show" + (err ? " err" : "");
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = "adm-toast"; }, 2600);
  }

  async function getCatalog(force) {
    if (catalog && !force) return catalog;
    var res = await api("listCatalog");
    if (!res.ok) throw new Error(res.error);
    catalog = { categories: res.categories || [], vendors: res.vendors || [], products: res.products || [], banners: res.banners || [], staff: res.staff || [] };
    return catalog;
  }
  // After catalog edits, make sure this browser's shop shows them straight away.
  function catalogChanged() { catalog = null; DATA.clearSheetCache(); }

  function pill(text, kind) { return '<span class="adm-pill '+esc(kind || text)+'">'+esc(cap(text))+'</span>'; }
  function empty(title, sub, action) {
    return '<div class="adm-empty"><h3>'+esc(title)+'</h3><p>'+esc(sub)+'</p>'+(action || "")+'</div>';
  }

  // Shimmering skeleton shown while a view loads — a toolbar + table silhouette,
  // which reads as "content is coming" far better than a lone spinner.
  function skeleton() {
    var row = '<div class="sk-row"><span class="sk sk-av"></span>'+
      '<span class="sk sk-line w35"></span><span class="sk sk-line w15"></span>'+
      '<span class="sk sk-line w15"></span><span class="sk sk-pill"></span></div>';
    var rows = ""; for (var i = 0; i < 6; i++) rows += row;
    return '<div class="adm-skel" aria-busy="true" aria-label="Loading">'+
      '<div class="sk-toolbar"><span class="sk sk-line w15"></span><span class="sk sk-btn"></span></div>'+
      '<section class="adm-card adm-flush">'+
        '<div class="sk-head"><span class="sk sk-line w20"></span><span class="sk sk-line w10"></span>'+
          '<span class="sk sk-line w10"></span><span class="sk sk-line w10"></span><span class="sk sk-pill"></span></div>'+
        rows+
      '</section></div>';
  }

  /* ------------------------------ dashboard ------------------------------- */
  async function viewDashboard() {
    var res = await api("stats");
    if (!res.ok) throw new Error(res.error);
    var s = res.stats, total = Math.max(1, s.orders);
    $("admView").innerHTML =
      '<div class="adm-kpis">'+
        kpi("Revenue", money(s.revenue), "Excludes cancelled orders") +
        kpi("Orders", s.orders, ((s.byStatus.pending || 0) + (s.byStatus.received || 0)) + " awaiting processing", "#orders") +
        kpi("Products", s.products, s.hiddenProducts ? s.hiddenProducts + " hidden" : "All visible", "#products") +
        (canRoute("vendors") ? kpi("Sellers", s.vendors, s.pendingVendors ? s.pendingVendors + " pending approval" : "Manage shops", "#vendors") : "") +
      '</div>'+
      '<div class="adm-grid2">'+
        '<section class="adm-card"><div class="adm-card-head"><h2>Recent orders</h2><a href="#orders">View all</a></div>'+
          (res.recentOrders.length ? ordersTable(res.recentOrders, false) : empty("No orders yet", "Orders placed on the shop appear here."))+
        '</section>'+
        '<section class="adm-card"><div class="adm-card-head"><h2>Orders by status</h2></div>'+
          '<div class="adm-bars">'+STATUSES.map(function (st) {
            var n = s.byStatus[st] || 0;
            return '<div class="adm-bar"><span>'+cap(st)+'</span><div class="track"><i class="'+st+'" style="width:'+Math.round(n / total * 100)+'%"></i></div><b>'+n+'</b></div>';
          }).join("")+'</div>'+
          (s.products ? '' : '<div class="adm-hint">Your Products tab is empty. <a href="#products">Import the sample catalog</a> to get started.</div>')+
        '</section>'+
      '</div>';
  }
  function kpi(label, value, sub, href) {
    var inner = '<span class="lbl">'+esc(label)+'</span><span class="val">'+esc(value)+'</span><span class="sub">'+esc(sub)+'</span>';
    return href ? '<a class="adm-kpi" href="'+href+'">'+inner+'</a>' : '<div class="adm-kpi">'+inner+'</div>';
  }

  /* -------------------------------- orders -------------------------------- */
  var orderFilter = "", orderSeller = "", orderPage = 1, ORDERS_PER_PAGE = 10;
  async function viewOrders() {
    var res = await api("listOrders");
    if (!res.ok) throw new Error(res.error);
    var all = res.orders || [], sellers = res.sellers || [];
    if (orderSeller && !sellers.some(function (s) { return String(s.id) === orderSeller; })) orderSeller = "";
    var sellerName = function (s) { return s.shopName || s.name || ("Seller #" + s.id); };
    function scoped() { return orderSeller ? all.filter(function (o) { return String(o.sellerId) === orderSeller; }) : all; }
    function draw() {
      var base = scoped(), list = orderFilter ? base.filter(function (o) { return o.status === orderFilter; }) : base;
      $("ordStatus").innerHTML = '<option value="">All statuses ('+base.length+')</option>'+
        STATUSES.map(function (st) { var n = base.filter(function (o) { return o.status === st; }).length;
          return '<option value="'+st+'"'+(orderFilter === st ? " selected" : "")+'>'+cap(st)+' ('+n+')</option>'; }).join("");
      $("ordersHead").innerHTML = orderSeller ? "<h3>Orders for "+esc(sellerName(sellers.filter(function (s) { return String(s.id) === orderSeller; })[0] || {}))+"</h3>" : "";
      var pages = Math.max(1, Math.ceil(list.length / ORDERS_PER_PAGE));
      orderPage = Math.min(Math.max(1, orderPage), pages);
      var from = (orderPage - 1) * ORDERS_PER_PAGE, pageList = list.slice(from, from + ORDERS_PER_PAGE);
      $("ordersBox").innerHTML = list.length ? ordersTable(pageList, true) + pager(orderPage, pages, from + 1, from + pageList.length, list.length) : empty("No orders",
        orderFilter ? "No orders with this status." : orderSeller ? "No orders for this seller yet. Pick a product above to place one." : "Orders placed on the shop appear here.");
    }
    $("admView").innerHTML =
      '<div class="adm-toolbar">'+
        '<label class="adm-seller-pick">'+svg("store", 18)+
          '<select id="ordSeller" aria-label="Seller to create an order for"><option value="">'+
            (sellers.length ? "Create order for seller…" : "No sellers available")+'</option>'+
          sellers.map(function (s) { return '<option value="'+esc(s.id)+'"'+(String(s.id) === orderSeller ? " selected" : "")+'>'+esc(sellerName(s))+(s.status === "pending" ? " (pending)" : "")+'</option>'; }).join("")+
        '</select></label>'+
        '<select id="ordStatus" aria-label="Filter by status"></select>'+
        '<button class="btn btn-ghost adm-btn" type="button" id="ordRefresh">'+svg("refresh")+' Refresh</button>'+
      '</div>'+
      '<section id="ordShop"></section>'+
      '<div class="adm-sechead" id="ordersHead"></div>'+
      '<section class="adm-card adm-flush" id="ordersBox"></section>';
    draw();
    loadShop();
    $("ordSeller").onchange = function () { orderSeller = this.value; orderFilter = ""; orderPage = 1; draw(); loadShop(); };
    $("ordStatus").onchange = function () { orderFilter = this.value; orderPage = 1; draw(); };
    $("ordRefresh").onclick = function () { route(); };

    // The selected seller's products: tap one to place an order on their behalf.
    var shopItems = [];
    async function loadShop() {
      var box = $("ordShop"); if (!box) return;
      if (!orderSeller) { box.innerHTML = ""; return; }
      var sid = orderSeller, s = sellers.filter(function (x) { return String(x.id) === sid; })[0] || {};
      box.innerHTML = '<div class="adm-card adm-shop"><div class="adm-shop-head"><h3>'+esc(sellerName(s))+' — products</h3><span class="adm-cell-sub">Loading…</span></div>'+
        '<div class="adm-pgrid">'+[1, 2, 3, 4].map(function () { return '<div class="adm-pcard sk"><div class="adm-pimg"></div><div class="adm-pbody"><i></i><i></i></div></div>'; }).join("")+'</div></div>';
      var r = await api("sellerShop", { sellerId: sid });
      if (sid !== orderSeller || !$("ordShop")) return;     // switched seller meanwhile
      if (!r.ok) { box.innerHTML = '<div class="msg err">'+esc(r.error || "Couldn't load products.")+'</div>'; return; }
      shopItems = (r.products || []).filter(function (p) { return p.status !== "hidden"; });
      box.innerHTML = '<div class="adm-card adm-shop">'+
        '<div class="adm-shop-head"><h3>'+esc(sellerName(s))+' — products</h3><span class="adm-cell-sub">'+
          (shopItems.length ? shopItems.length + " product" + (shopItems.length === 1 ? "" : "s") + " · tap one to create an order" : "")+'</span></div>'+
        (shopItems.length
          ? '<div class="adm-pgrid">'+shopItems.map(function (p) {
              return '<button type="button" class="adm-pcard" data-sp="'+esc(p.id)+'">'+
                '<div class="adm-pimg">'+(p.imageUrl ? '<img src="'+esc(p.imageUrl)+'" alt="" loading="lazy">' : svg("box", 30))+'</div>'+
                '<div class="adm-pbody"><div class="adm-pname">'+esc(p.name)+'</div>'+
                  '<div class="adm-pmeta"><strong>'+money(p.price)+'</strong><span>In shop: '+esc(p.qty)+'</span></div>'+
                  '<span class="adm-pcta">'+svg("plus", 15)+' Create order</span></div>'+
              '</button>';
            }).join("")+'</div>'
          : '<div class="adm-empty" style="padding:26px"><h3>No products</h3><p>This seller hasn\'t added any products to their shop yet.</p></div>')+
      '</div>';
      box.querySelector(".adm-shop").onclick = function (e) {
        var b = e.target.closest("[data-sp]"); if (!b) return;
        var p = shopItems.filter(function (x) { return String(x.id) === b.dataset.sp; })[0];
        if (p) orderForm(s, p);
      };
    }

    // Create-order popup: customer name + quantity (phone, address, note optional).
    function orderForm(s, p) {
      modal("Create order",
        '<div class="adm-oprod">'+
          '<div class="adm-pimg sm">'+(p.imageUrl ? '<img src="'+esc(p.imageUrl)+'" alt="">' : svg("box", 22))+'</div>'+
          '<div><div class="adm-cell-main">'+esc(p.name)+'</div><div class="adm-cell-sub">'+money(p.price)+' each · Seller: '+esc(sellerName(s))+'</div></div>'+
        '</div>'+
        f("oName", "Customer name *", '<input id="oName" type="text" maxlength="100" required autocomplete="off" placeholder="e.g. Rahul Sharma">')+
        '<div class="field"><label for="oQty">Quantity *</label><div class="adm-qty">'+
          '<button type="button" data-q="-1" aria-label="Less">−</button><input id="oQty" type="number" min="1" max="9999" step="1" value="1" inputmode="numeric" required>'+
          '<button type="button" data-q="1" aria-label="More">+</button></div></div>'+
        '<div class="adm-form-cols">'+
          f("oPhone", "Phone <span class=\"adm-opt\">optional</span>", '<input id="oPhone" type="tel" maxlength="30" autocomplete="off">')+
          f("oNote", "Note <span class=\"adm-opt\">optional</span>", '<input id="oNote" type="text" maxlength="500" autocomplete="off">')+
        '</div>'+
        f("oAddr", "Delivery address <span class=\"adm-opt\">optional</span>", '<textarea id="oAddr" rows="2" maxlength="500"></textarea>')+
        '<div class="adm-ototal"><span id="oCalc"></span><strong id="oTotal"></strong></div>',
        async function () {
          var name = $("oName").value.trim(), qty = Math.floor(Number($("oQty").value) || 0);
          if (!name) { $("oName").focus(); return "Enter the customer's name."; }
          if (qty < 1 || qty > 9999) { $("oQty").focus(); return "Enter a quantity between 1 and 9999."; }
          var r = await api("placeOrder", { sellerId: s.id, sellerProductId: p.id, qty: qty, customerName: name,
            customerPhone: $("oPhone").value.trim(), address: $("oAddr").value.trim(), note: $("oNote").value.trim() });
          if (!r.ok) return r.error;
          toast("Order " + (r.orderKey || "#" + r.orderId) + " placed for " + name + " · " + money(r.total));
          route();
        }, { saveLabel: "Place order", busyLabel: "Placing order…" });
      function calc() {
        var q = Math.max(0, Math.floor(Number($("oQty").value) || 0));
        $("oCalc").textContent = q + " × " + money(p.price);
        $("oTotal").textContent = money(q * p.price);
      }
      $("oQty").oninput = calc;
      document.querySelector(".adm-qty").onclick = function (e) {
        var b = e.target.closest("[data-q]"); if (!b) return;
        $("oQty").value = Math.min(9999, Math.max(1, (Math.floor(Number($("oQty").value) || 0)) + Number(b.dataset.q))); calc();
      };
      calc(); $("oName").focus();
    }

    $("ordersBox").addEventListener("change", async function (e) {
      var sel = e.target.closest("select[data-order]"); if (!sel) return;
      sel.disabled = true;
      var r = await api("updateOrder", { id: sel.dataset.order, status: sel.value });
      sel.disabled = false;
      if (!r.ok) { toast(r.error, true); return; }
      all.forEach(function (o) { if (String(o.id) === sel.dataset.order) o.status = sel.value; });
      sel.className = "adm-status-sel " + sel.value;
      toast("Order #" + sel.dataset.order + " marked " + sel.value);
    });
    $("ordersBox").addEventListener("click", async function (e) {
      var pg = e.target.closest("[data-opage]");
      if (pg) { if (!pg.disabled) { orderPage = Number(pg.dataset.opage) || 1; draw(); $("ordersBox").scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
      var ed = e.target.closest("[data-oedit]"), del = e.target.closest("[data-odel]");
      if (ed) { var o = all.filter(function (x) { return String(x.id) === ed.dataset.oedit; })[0]; if (o) editOrderForm(o); return; }
      if (del) {
        var d = all.filter(function (x) { return String(x.id) === del.dataset.odel; })[0]; if (!d) return;
        if (!confirm("Delete order " + orderLabel(d) + (d.customer ? " for " + d.customer : "") + "? This can't be undone.")) return;
        del.disabled = true;
        var r = await api("deleteOrder", { id: d.id });
        if (!r.ok) { del.disabled = false; toast(r.error, true); return; }
        toast("Order " + orderLabel(d) + " deleted");
        all = all.filter(function (x) { return x !== d; }); draw();
        return;
      }
      var b = e.target.closest("[data-items]"); if (!b) return;
      var row = $("items-" + b.dataset.items); if (row) row.hidden = !row.hidden;
    });

    // Edit a staff-placed order: customer details, quantity and status.
    function editOrderForm(o) {
      var it = (o.items && o.items[0]) || {}, price = Number(it.price) || 0;
      modal("Edit order " + orderLabel(o),
        '<div class="adm-oprod">'+
          '<div class="adm-pimg sm">'+(it.imageUrl ? '<img src="'+esc(it.imageUrl)+'" alt="">' : svg("box", 22))+'</div>'+
          '<div><div class="adm-cell-main">'+esc(it.name || "Product")+'</div><div class="adm-cell-sub">'+money(price)+' each · Seller: '+esc(o.sellerName || "—")+'</div></div>'+
        '</div>'+
        f("eoName", "Customer name *", '<input id="eoName" type="text" maxlength="100" required autocomplete="off" value="'+esc(o.customerName)+'">')+
        '<div class="adm-form-cols">'+
          '<div class="field"><label for="eoQty">Quantity *</label><div class="adm-qty">'+
            '<button type="button" data-q="-1" aria-label="Less">−</button><input id="eoQty" type="number" min="1" max="9999" step="1" inputmode="numeric" required value="'+esc(it.qty || 1)+'">'+
            '<button type="button" data-q="1" aria-label="More">+</button></div></div>'+
          f("eoStatus", "Status", '<select id="eoStatus">'+STATUSES.map(function (st) { return '<option value="'+st+'"'+(o.status === st ? " selected" : "")+'>'+cap(st)+'</option>'; }).join("")+'</select>')+
        '</div>'+
        '<div class="adm-form-cols">'+
          f("eoPhone", "Phone <span class=\"adm-opt\">optional</span>", '<input id="eoPhone" type="tel" maxlength="30" autocomplete="off" value="'+esc(o.customerPhone)+'">')+
          f("eoNote", "Note <span class=\"adm-opt\">optional</span>", '<input id="eoNote" type="text" maxlength="500" autocomplete="off" value="'+esc(o.note)+'">')+
        '</div>'+
        f("eoAddr", "Delivery address <span class=\"adm-opt\">optional</span>", '<textarea id="eoAddr" rows="3" maxlength="500">'+esc(o.address)+'</textarea>')+
        '<div class="adm-ototal"><span id="eoCalc"></span><strong id="eoTotal"></strong></div>',
        async function () {
          var name = $("eoName").value.trim(), qty = Math.floor(Number($("eoQty").value) || 0);
          if (!name) { $("eoName").focus(); return "Enter the customer's name."; }
          if (qty < 1 || qty > 9999) { $("eoQty").focus(); return "Enter a quantity between 1 and 9999."; }
          var r = await api("editOrder", { id: o.id, customerName: name, qty: qty, status: $("eoStatus").value,
            customerPhone: $("eoPhone").value.trim(), address: $("eoAddr").value.trim(), note: $("eoNote").value.trim() });
          if (!r.ok) return r.error;
          toast("Order " + orderLabel(o) + " updated");
          route();
        }, { saveLabel: "Save changes" });
      function calc() {
        var q = Math.max(0, Math.floor(Number($("eoQty").value) || 0));
        $("eoCalc").textContent = q + " × " + money(price); $("eoTotal").textContent = money(q * price);
      }
      $("eoQty").oninput = calc;
      document.querySelector(".adm-modal .adm-qty").onclick = function (e) {
        var b = e.target.closest("[data-q]"); if (!b) return;
        $("eoQty").value = Math.min(9999, Math.max(1, (Math.floor(Number($("eoQty").value) || 0)) + Number(b.dataset.q))); calc();
      };
      calc();
    }
  }
  // "Showing 11–20 of 34" + ‹ 1 2 3 › page buttons (… for long ranges).
  function pager(page, pages, a, b, total) {
    var info = '<span class="adm-pinfo">Showing '+a+'–'+b+' of '+total+'</span>';
    if (pages <= 1) return '<div class="adm-pager">'+info+'</div>';
    var nums = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    var btn = function (p, label, cls, dis) { return '<button type="button" class="adm-pbtn'+(cls || "")+'" data-opage="'+p+'"'+(dis ? " disabled" : "")+' aria-label="Page '+p+'">'+label+'</button>'; };
    return '<div class="adm-pager">'+info+'<div class="adm-pnums">'+btn(page - 1, "‹", "", page === 1)+
      nums.map(function (n) { return n === "…" ? '<span class="adm-pgap">…</span>' : btn(n, n, n === page ? " on" : "", false); }).join("")+
      btn(page + 1, "›", "", page === pages)+'</div></div>';
  }
  // "ORP2711260231101" for staff orders (the order key), "#12" for shop orders.
  function orderLabel(o) { return /^ORP\d{13}$/.test(o.identifier || "") ? o.identifier : "#" + o.id; }
  function ordersTable(list, editable) {
    var cols = editable ? 8 : 7;
    return '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Order</th><th>Customer</th><th>Seller</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th>'+(editable ? '<th class="r">Actions</th>' : '')+'</tr></thead><tbody>'+
      list.map(function (o) {
        var items = Array.isArray(o.items) ? o.items : [];
        var count = items.reduce(function (n, it) { return n + (Number(it.qty) || 1); }, 0);
        var status = editable
          ? '<select class="adm-status-sel '+esc(o.status)+'" data-order="'+esc(o.id)+'" aria-label="Status of order '+esc(o.id)+'">'+
              STATUSES.map(function (st) { return '<option value="'+st+'"'+(o.status === st ? " selected" : "")+'>'+cap(st)+'</option>'; }).join("")+'</select>'
          : pill(o.status);
        var sub = o.customerPhone || (o.customerName || /^ORP\d{13}$/.test(o.identifier || "") ? "" : o.identifier);
        var details = [];
        if (o.address) details.push('<li class="adm-odet"><span>Address</span><b>'+esc(o.address)+'</b></li>');
        if (o.note) details.push('<li class="adm-odet"><span>Note</span><b>'+esc(o.note)+'</b></li>');
        if (o.createdBy) details.push('<li class="adm-odet"><span>Placed by</span><b>'+esc(o.createdBy)+' (staff)</b></li>');
        var key = orderLabel(o), canEdit = o.sellerId !== "" && o.sellerId != null, canDel = canEdit || role() !== "staff";
        var actions = '<td class="r"><div class="adm-actions">'+
          (canEdit ? '<button type="button" class="adm-icon-btn" data-oedit="'+esc(o.id)+'" title="Edit order" aria-label="Edit order '+esc(key)+'">'+svg("edit")+'</button>' : '')+
          (canDel ? '<button type="button" class="adm-icon-btn danger" data-odel="'+esc(o.id)+'" title="Delete order" aria-label="Delete order '+esc(key)+'">'+svg("trash")+'</button>' : '')+
          (!canEdit && !canDel ? '<span class="adm-cell-sub">—</span>' : '')+'</div></td>';
        return '<tr><td>'+(key.charAt(0) === "#" ? '<strong>'+esc(key)+'</strong>' : '<strong class="adm-okey">'+esc(key)+'</strong><div class="adm-cell-sub">#'+esc(o.id)+'</div>')+'</td>'+
          '<td><div class="adm-cell-main">'+esc(o.customer || "Guest")+(o.createdBy ? ' <span class="adm-tag">VIP</span>' : "")+'</div>'+(sub ? '<div class="adm-cell-sub">'+esc(sub)+'</div>' : "")+'</td>'+
          '<td>'+(o.sellerName ? esc(o.sellerName) : '<span class="adm-cell-sub">—</span>')+'</td>'+
          '<td>'+(editable && items.length ? '<button type="button" class="adm-link" data-items="'+esc(o.id)+'">'+count+' item'+(count === 1 ? "" : "s")+'</button>' : count)+'</td>'+
          '<td><strong>'+money(o.total)+'</strong></td><td>'+fmtDateTime(o.createdAt)+'</td><td>'+status+'</td>'+(editable ? actions : '')+'</tr>'+
          (editable && items.length ? '<tr class="adm-subrow" id="items-'+esc(o.id)+'" hidden><td colspan="'+cols+'"><ul class="adm-items">'+
            items.map(function (it) { return '<li><span>'+esc(it.name)+' <em>× '+esc(it.qty || 1)+'</em></span><b>'+money((it.price || 0) * (it.qty || 1))+'</b></li>'; }).join("")+
            details.join("")+
          '</ul></td></tr>' : '');
      }).join("")+'</tbody></table></div>';
  }

  /* ------------------------------- products ------------------------------- */
  var pf = { q: "", cat: "", status: "" }, prodPage = 1, PRODUCTS_PER_PAGE = 10;
  async function viewProducts() {
    var cat = await getCatalog();
    var catName = {}, venName = {};
    cat.categories.forEach(function (c) { catName[String(c.id)] = c.name; });
    cat.vendors.forEach(function (v) { venName[String(v.id)] = v.name; });

    if (!cat.products.length) {
      $("admView").innerHTML =
        '<div class="adm-toolbar"><span class="adm-count">0 products</span>'+
          '<button class="btn btn-primary adm-btn" type="button" id="addProd">'+svg("plus")+' Add product</button></div>'+
        '<section class="adm-card">'+empty("No products yet",
          cat.categories.length ? "Add your first product below, or import the sample catalog."
                                : "Add a category first (Categories), then add products here.",
          '<button class="btn btn-primary" type="button" id="addProd0">'+svg("plus")+' Add product</button>'+
          (can("importCatalog") ? ' <button class="btn btn-ghost" type="button" id="importBtn">Import sample catalog</button>' : ''))+'</section>';
      var openAdd = function () {
        if (!cat.categories.length) { toast("Add a category first, then add products.", true); return; }
        productForm(null);
      };
      if ($("addProd")) $("addProd").onclick = openAdd;
      if ($("addProd0")) $("addProd0").onclick = openAdd;
      if ($("importBtn")) $("importBtn").onclick = importSample;
      return;
    }

    function draw() {
      var q = pf.q.toLowerCase();
      var list = cat.products.filter(function (p) {
        return (!q || p.name.toLowerCase().indexOf(q) > -1) && (!pf.cat || String(p.cat_id) === pf.cat) &&
          (!pf.status || p.status === pf.status);
      }).sort(function (a, b) { return (Number(b.id) || 0) - (Number(a.id) || 0); });   // newest first (descending id)
      // 10 products per page
      var pages = Math.max(1, Math.ceil(list.length / PRODUCTS_PER_PAGE));
      prodPage = Math.min(Math.max(1, prodPage), pages);
      var from = (prodPage - 1) * PRODUCTS_PER_PAGE, pageList = list.slice(from, from + PRODUCTS_PER_PAGE);
      $("prodBox").innerHTML = list.length ?
        '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Profit</th><th>Stock</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>'+
        pageList.map(function (p) {
          var hidden = p.status === "hidden";
          return '<tr'+(hidden ? ' class="adm-dim"' : '')+'>'+
            '<td><div class="adm-prod"><img src="'+DATA.productImage(p, 96)+'" alt="" loading="lazy"><div><div class="adm-cell-main">'+esc(p.name)+'</div>'+
              '<div class="adm-cell-sub">#'+esc(p.id)+(p.badge ? ' · '+esc(cap(p.badge)) : '')+'</div></div></div></td>'+
            '<td>'+esc(catName[String(p.cat_id)] || "—")+'</td>'+
            '<td><strong>'+money(p.price)+'</strong>'+(p.oldPrice ? '<div class="adm-cell-sub"><s>'+money(p.oldPrice)+'</s></div>' : '')+'</td>'+
            '<td><span class="adm-profit">'+money(p.sellerProfit || 0)+'</span></td>'+
            '<td>'+(p.quantity === "" || p.quantity == null ? "—" : esc(p.quantity))+'</td>'+
            '<td>'+pill(hidden ? "hidden" : "active", hidden ? "blocked" : "active")+'</td>'+
            '<td class="r"><div class="adm-actions">'+
              '<button type="button" class="adm-icon-btn" data-edit="'+esc(p.id)+'" title="Edit" aria-label="Edit '+esc(p.name)+'">'+svg("edit")+'</button>'+
              (can("deleteProduct") ? '<button type="button" class="adm-icon-btn danger" data-del="'+esc(p.id)+'" title="Delete" aria-label="Delete '+esc(p.name)+'">'+svg("trash")+'</button>' : '')+
            '</div></td></tr>';
        }).join("")+'</tbody></table></div>' + pager(prodPage, pages, from + 1, from + pageList.length, list.length)
        : empty("No products match", "Try a different search or filter.");
      $("prodCount").textContent = list.length + " of " + cat.products.length;
    }

    $("admView").innerHTML =
      '<div class="adm-toolbar">'+
        '<label class="adm-search">'+svg("search")+'<input id="pfQ" type="search" placeholder="Search products" value="'+esc(pf.q)+'"></label>'+
        '<select id="pfCat" aria-label="Category"><option value="">All categories</option>'+cat.categories.map(function (c) {
          return '<option value="'+esc(c.id)+'"'+(pf.cat === String(c.id) ? " selected" : "")+'>'+esc(c.name)+'</option>'; }).join("")+'</select>'+
        '<select id="pfStatus" aria-label="Status"><option value="">Any status</option><option value="active"'+(pf.status === "active" ? " selected" : "")+'>Active</option><option value="hidden"'+(pf.status === "hidden" ? " selected" : "")+'>Hidden</option></select>'+
        '<span class="adm-count" id="prodCount"></span>'+
        '<button class="btn btn-primary adm-btn" type="button" id="addProd">'+svg("plus")+' Add product</button>'+
      '</div>'+
      '<section class="adm-card adm-flush" id="prodBox"></section>';
    draw();
    $("pfQ").oninput = function () { pf.q = this.value; prodPage = 1; draw(); };
    $("pfCat").onchange = function () { pf.cat = this.value; prodPage = 1; draw(); };
    $("pfStatus").onchange = function () { pf.status = this.value; prodPage = 1; draw(); };
    $("addProd").onclick = function () { productForm(null); };
    $("prodBox").addEventListener("click", async function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.opage) { if (!b.disabled) { prodPage = Number(b.dataset.opage) || 1; draw(); $("prodBox").scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
      var find = function (id) { return cat.products.filter(function (p) { return String(p.id) === id; })[0]; };
      if (b.dataset.edit) productForm(find(b.dataset.edit));
      if (b.dataset.del) {
        var d = find(b.dataset.del);
        if (!confirm('Delete "' + d.name + '"? This can\'t be undone. (Tip: set its status to Hide in Edit instead to keep it.)')) return;
        b.disabled = true;
        var rr = await api("deleteProduct", { id: d.id });
        if (!rr.ok) { b.disabled = false; toast(rr.error, true); return; }
        catalogChanged(); toast("Product deleted"); route();
      }
    });
  }

  async function importSample() {
    var btn = $("importBtn"); btn.disabled = true; btn.textContent = "Importing…";
    try {
      var data = await (await fetch("data/products.json", { cache: "no-cache" })).json();
      var r = await api("importCatalog", { data: data });
      if (!r.ok) throw new Error(r.error);
      catalogChanged(); toast("Imported " + r.imported.products + " products"); route();
    } catch (e) {
      btn.disabled = false; btn.textContent = "Import sample catalog";
      toast(e.message || "Import failed", true);
    }
  }

  function productForm(p) {
    var cat = catalog, isNew = !p;
    p = p || { name: "", cat_id: cat.categories[0] && cat.categories[0].id, price: "", oldPrice: "",
               rating: "", quantity: "", badge: "", desc: "", images: [], status: "active" };
    // Legacy self-heal: an older bug wrote the image array into the desc column.
    // If this product has no images but its desc is a JSON array of image URLs,
    // move them back to images and clear the description (fixed on next save).
    if (!isNew && (!p.images || !p.images.length) && /^\s*\[/.test(p.desc || "")) {
      try {
        var arr = JSON.parse(p.desc);
        if (Array.isArray(arr) && arr.length && /^https?:\/\//i.test(String(arr[0]))) {
          p.images = arr.filter(function (u) { return /^https?:\/\//i.test(String(u)); });
          p.imageUrl = p.images[0] || ""; p.desc = "";
        }
      } catch (e) {}
    }
    var opt = function (list, val) {
      return list.map(function (x) {
        return '<option value="'+esc(x.id)+'"'+(String(val) === String(x.id) ? " selected" : "")+'>'+esc(x.name)+'</option>'; }).join("");
    };
    modal(isNew ? "Add product" : "Edit product #" + p.id,
      '<div class="adm-form-grid">'+
        '<div class="adm-preview"><img id="pPrev" alt="Preview"><small>Preview</small></div>'+
        '<div class="adm-form-cols">'+
          f("pName", "Product name", '<input id="pName" required maxlength="140" value="'+esc(p.name)+'">', "full") +
          f("pCat", "Category", '<select id="pCat" required>'+opt(cat.categories, p.cat_id)+'</select>') +
          f("pStatus", "Status", '<select id="pStatus"><option value="active"'+(p.status !== "hidden" ? " selected" : "")+'>Active</option><option value="hidden"'+(p.status === "hidden" ? " selected" : "")+'>Hide</option></select>') +
          f("pBadge", "Badge", '<select id="pBadge"><option value="">None</option><option value="deal"'+(p.badge === "deal" ? " selected" : "")+'>Deal</option><option value="bestseller"'+(p.badge === "bestseller" ? " selected" : "")+'>#1 in sales</option></select>') +
          f("pPrice", "Price ("+esc(C.CURRENCY_CODE)+")", '<input id="pPrice" type="number" min="0.01" step="0.01" required value="'+esc(p.price)+'">') +
          f("pProfit", "Seller profit <span class=\"opt\" id=\"pProfitHint\">(auto from category %)</span>", '<input id="pProfit" type="number" min="0" step="0.01" value="'+esc(p.sellerProfit == null ? '' : p.sellerProfit)+'">') +
          f("pOld", "Old price <span class=\"opt\">(for a discount)</span>", '<input id="pOld" type="number" min="0" step="0.01" value="'+esc(p.oldPrice)+'">') +
          f("pRating", "Rating <span class=\"opt\">(0–5)</span>", '<input id="pRating" type="number" min="0" max="5" step="0.1" value="'+esc(p.rating)+'">') +
          f("pQty", "Quantity <span class=\"opt\">(stock)</span>", '<input id="pQty" type="number" min="0" step="1" value="'+esc(p.quantity)+'">') +
          f("pImgs", "Product images <span class=\"opt\">(up to 4 — upload or paste a URL)</span>",
            '<div class="pimg-grid" id="pImgGrid"></div>'+
            '<input id="pImgFile" type="file" accept="image/*" multiple hidden>'+
            '<div class="pimg-url"><input id="pImgUrl" type="url" placeholder="…or paste an image URL">'+
              '<button type="button" class="btn btn-ghost adm-mini" id="pImgUrlAdd">Add URL</button></div>', "full") +
          f("pDesc", "Description", '<textarea id="pDesc" rows="3" maxlength="2000">'+esc(p.desc)+'</textarea>', "full") +
        '</div>'+
      '</div>',
      async function () {
        var keepUrls = pImgs.filter(function (x) { return x.url; }).map(function (x) { return x.url; });
        var uploads = pImgs.filter(function (x) { return x.data; }).map(function (x) { return x.data; });
        var data = {
          id: isNew ? undefined : p.id, name: $("pName").value, cat_id: $("pCat").value,
          price: $("pPrice").value, oldPrice: $("pOld").value, rating: $("pRating").value,
          seller_profit: $("pProfit").value, quanitiy: $("pQty").value, badge: $("pBadge").value, status: $("pStatus").value,
          imageUrl_json: JSON.stringify(keepUrls), imageData: uploads, desc: $("pDesc").value.trim()
        };
        var r = await api("saveProduct", data);
        if (!r.ok) return r.error;
        catalogChanged(); toast(isNew ? "Product added" : "Product saved"); route();
      });

    // --- seller profit: auto = category% × price, recalculated live until the
    //     admin types their own value; a hint shows the category's % in use ----
    var profitTouched = false;
    function curCat(id) { return cat.categories.filter(function (x) { return String(x.id) === String(id); })[0]; }
    function catPct(id) { var c = curCat(id); return c ? Number(c.sellerProfit) || 0 : 0; }
    function autoProfit(catId, price) { var pct = catPct(catId); return (pct > 0 && price > 0) ? +(price * pct / 100).toFixed(2) : 0; }
    function updateHint() {
      var h = $("pProfitHint"); if (!h) return;
      var c = curCat($("pCat").value), pct = catPct($("pCat").value);
      if (profitTouched) h.textContent = "(manual)";
      else if (pct > 0) h.textContent = "(" + pct + "% of price)";
      else h.textContent = "(set a profit % on “" + ((c && c.name) || "this category") + "” first)";
    }
    function syncProfit() { if (!profitTouched) $("pProfit").value = autoProfit($("pCat").value, Number($("pPrice").value) || 0) || ""; updateHint(); }
    $("pProfit").addEventListener("input", function () { profitTouched = true; updateHint(); });
    $("pCat").addEventListener("change", syncProfit);
    $("pPrice").addEventListener("input", syncProfit);
    if (!isNew && Number(p.sellerProfit || 0) !== autoProfit(p.cat_id, Number(p.price) || 0)) profitTouched = true;
    syncProfit();

    // --- up-to-4 image picker (existing URLs + new uploads) ---
    var pImgs = (p.images && p.images.length ? p.images : (p.imageUrl ? [p.imageUrl] : [])).slice(0, 4)
      .map(function (u) { return { url: u }; });
    function thumbSrc(x) { return x.url ? (DATA.safeImageUrl(x.url) || x.url) : x.data; }
    function prev() { $("pPrev").src = DATA.productImage({ name: $("pName").value, imageUrl: pImgs[0] ? thumbSrc(pImgs[0]) : "" }, 300); }
    function renderImgs() {
      $("pImgGrid").innerHTML = pImgs.map(function (x, i) {
        return '<div class="pimg-thumb"><img src="'+esc(thumbSrc(x))+'" alt="">'+
          '<button type="button" class="pimg-rm" data-rm="'+i+'" aria-label="Remove image">'+svg("close", 16)+'</button></div>';
      }).join("") + (pImgs.length < 4 ? '<button type="button" class="pimg-add" id="pImgAdd">'+svg("plus", 22)+'<span>Add</span></button>' : "");
      if ($("pImgAdd")) $("pImgAdd").onclick = function () { $("pImgFile").click(); };
      prev();
    }
    $("pImgGrid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]"); if (!b) return;
      pImgs.splice(Number(b.dataset.rm), 1); renderImgs();
    });
    $("pImgFile").addEventListener("change", function () {
      var files = [].slice.call(this.files, 0, 4 - pImgs.length), left = files.length || 0;
      if (!left) return;
      files.forEach(function (file) {
        if (!/^image\//.test(file.type)) { if (--left === 0) renderImgs(); return; }
        toImage(file, 1200, function (d) { if (d && pImgs.length < 4) pImgs.push({ data: d }); if (--left === 0) renderImgs(); });
      });
      this.value = "";
    });
    function addUrl() {
      var u = $("pImgUrl").value.trim();
      if (!u) return;
      if (!/^(https?:\/\/|images\/)/i.test(u)) { toast("Enter a valid image URL (https://…).", true); return; }
      if (pImgs.length >= 4) { toast("Up to 4 images per product.", true); return; }
      pImgs.push({ url: u }); $("pImgUrl").value = ""; renderImgs();
    }
    $("pImgUrlAdd").onclick = addUrl;
    $("pImgUrl").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addUrl(); } });
    $("pName").addEventListener("input", prev);
    renderImgs();
  }
  function f(id, label, control, cls) { return '<div class="field '+(cls || "")+'"><label for="'+id+'">'+label+'</label>'+control+'</div>'; }

  /* ------------------------------ categories ------------------------------ */
  async function viewCategories() {
    var cat = await getCatalog();
    var count = {}; cat.products.forEach(function (p) { count[String(p.cat_id)] = (count[String(p.cat_id)] || 0) + 1; });
    $("admView").innerHTML =
      '<div class="adm-toolbar"><span class="adm-count">'+cat.categories.length+' categories</span>'+
        '<button class="btn btn-primary adm-btn" type="button" id="addCat">'+svg("plus")+' Add category</button></div>'+
      (cat.categories.length ?
        '<section class="adm-card adm-flush"><div class="adm-table-wrap"><table class="adm-table">'+
          '<thead><tr><th>Category</th><th>ID</th><th>Profit</th><th>Order</th><th>Products</th><th class="r">Actions</th></tr></thead><tbody>'+
          cat.categories.map(function (c) {
            return '<tr>'+
              '<td><div class="adm-user"><span class="adm-cat-thumb"><img src="'+DATA.categoryImage(c)+'" alt="" loading="lazy"></span>'+
                '<span class="adm-cell-main">'+esc(c.name)+'</span></div></td>'+
              '<td class="adm-cell-sub">#'+esc(c.id)+'</td>'+
              '<td>'+(Number(c.sellerProfit) > 0 ? '<span class="adm-profit">'+esc(c.sellerProfit)+'%</span>' : '<span class="adm-cell-sub">—</span>')+'</td>'+
              '<td>'+esc(c.order || 0)+'</td>'+
              '<td>'+(count[String(c.id)] || 0)+'</td>'+
              '<td class="r"><div class="adm-actions">'+
                '<button type="button" class="adm-icon-btn" data-edit="'+esc(c.id)+'" aria-label="Edit '+esc(c.name)+'">'+svg("edit")+'</button>'+
                '<button type="button" class="adm-icon-btn danger" data-del="'+esc(c.id)+'" aria-label="Delete '+esc(c.name)+'">'+svg("trash")+'</button>'+
              '</div></td></tr>';
          }).join("")+'</tbody></table></div></section>'
        : '<section class="adm-card">'+empty("No categories", "Add a category, or import the sample catalog from Products.")+'</section>');
    $("addCat").onclick = function () { categoryForm(null); };
    $("admView").onclick = async function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var c = cat.categories.filter(function (x) { return String(x.id) === (b.dataset.edit || b.dataset.del); })[0];
      if (b.dataset.edit) categoryForm(c);
      if (b.dataset.del) {
        if (!confirm('Delete the category "' + c.name + '"?')) return;
        var r = await api("deleteCategory", { id: c.id });
        if (!r.ok) { toast(r.error, true); return; }
        catalogChanged(); toast("Category deleted"); route();
      }
    };
  }
  function categoryForm(c) {
    var isNew = !c; c = c || { name: "", imageUrl: "", order: 0 };
    var imageData = ""; // base64 of a newly chosen image; "" = keep existing
    modal(isNew ? "Add category" : "Edit category #" + c.id,
      '<div class="adm-form-grid"><div class="adm-preview"><img id="cPrev" alt="Preview"><small>Preview</small></div><div class="adm-form-cols">'+
        f("cName", "Name", '<input id="cName" required maxlength="60" value="'+esc(c.name)+'">', "full") +
        f("cImg", "Category image",
          '<div class="adm-drop" id="cDrop"><input id="cFile" type="file" accept="image/*" hidden>'+
          '<span class="adm-drop-txt">Drag &amp; drop an image here, or <b>browse</b></span></div>', "full") +
        f("cProfit", "Seller profit <span class=\"opt\">(% of price)</span>", '<input id="cProfit" type="number" min="0" max="100" step="0.1" value="'+esc(c.sellerProfit == null ? '' : c.sellerProfit)+'" placeholder="e.g. 10">') +
        f("cOrder", "Display order", '<input id="cOrder" type="number" min="0" step="1" value="'+esc(c.order || 0)+'">') +
      '</div></div>',
      async function () {
        var name = $("cName").value.trim();
        if (!name) return "Category name is required.";
        var r = await api("saveCategory", { id: isNew ? undefined : c.id,
          cat_name: name, cat_order: Number($("cOrder").value) || 0,
          seller_profit: Math.max(0, Math.min(100, Number($("cProfit").value) || 0)), imageData: imageData });
        if (!r.ok) return r.error;
        catalogChanged(); toast(isNew ? "Category added" : "Category saved"); route();
      });

    function showPreview(src) { $("cPrev").src = src || DATA.categoryImage({ name: $("cName").value || "Category", imageUrl: c.imageUrl }); }
    showPreview(c.imageUrl ? DATA.safeImageUrl(c.imageUrl) : "");
    $("cName").addEventListener("input", function () { if (!imageData && !c.imageUrl) showPreview(""); });

    var drop = $("cDrop"), file = $("cFile"), txt = drop.querySelector(".adm-drop-txt");
    function handle(f) {
      if (!f || !/^image\//.test(f.type)) { toast("Please choose an image file.", true); return; }
      toImage(f, 1000, function (durl) {
        if (!durl) { toast("Couldn't read that image.", true); return; }
        imageData = durl; showPreview(durl); txt.innerHTML = "✓ " + esc(f.name) + " — <b>change</b>";
      });
    }
    drop.addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () { handle(file.files[0]); });
    ["dragover", "dragenter"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "dragend"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
  }

  // Downscale a chosen image to <=max px and return a compact JPEG data URL.
  function toImage(file, max, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * s));
      cv.height = Math.max(1, Math.round(img.height * s));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      try { cb(cv.toDataURL("image/jpeg", 0.82)); } catch (e) { cb(""); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(""); };
    img.src = url;
  }

  /* -------------------------------- banners ------------------------------- */
  // Hero banners shown on the homepage carousel, in display order.
  async function viewBanners() {
    var cat = await getCatalog(true);   // always fresh, so a just-deployed backend shows immediately
    var banners = (cat.banners || []).slice();
    $("admView").innerHTML =
      '<div class="adm-toolbar"><span class="adm-count">'+banners.length+(banners.length===1?' banner':' banners')+'</span>'+
        '<button class="btn btn-primary adm-btn" type="button" id="addBan">'+svg("plus")+' Add banner</button></div>'+
      (banners.length ?
        '<section class="adm-card adm-flush"><div class="adm-table-wrap"><table class="adm-table">'+
          '<thead><tr><th>Banner</th><th>ID</th><th>Order</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>'+
          banners.map(function (b, i) {
            var on = b.status !== "hidden";
            return '<tr'+(on ? '' : ' class="adm-dim"')+'>'+
              '<td><span class="adm-ban-thumb"><img src="'+esc(DATA.safeImageUrl(b.imageUrl) || b.imageUrl)+'" alt="" loading="lazy"></span></td>'+
              '<td class="adm-cell-sub">#'+esc(b.id != null && b.id !== "" ? b.id : "—")+'</td>'+
              '<td>'+esc(b.order || 0)+'</td>'+
              '<td>'+pill(on ? "active" : "hidden", on ? "active" : "blocked")+'</td>'+
              '<td class="r"><div class="adm-actions">'+
                '<button type="button" class="btn btn-ghost adm-mini" data-act="toggle" data-i="'+i+'">'+(on ? "Hide" : "Show")+'</button>'+
                '<button type="button" class="adm-icon-btn" data-act="edit" data-i="'+i+'" aria-label="Edit banner">'+svg("edit")+'</button>'+
                '<button type="button" class="adm-icon-btn danger" data-act="del" data-i="'+i+'" aria-label="Delete banner">'+svg("trash")+'</button>'+
              '</div></td></tr>';
          }).join("")+'</tbody></table></div></section>'
        : '<section class="adm-card">'+empty("No banners yet", "Add a banner image to show it on the homepage carousel.", '<button class="btn btn-primary" type="button" id="addBan2">Add a banner</button>')+'</section>');
    var add = function () { bannerForm(null); };
    if ($("addBan")) $("addBan").onclick = add;
    if ($("addBan2")) $("addBan2").onclick = add;
    $("admView").onclick = async function (e) {
      var btn = e.target.closest("button[data-act]"); if (!btn) return;
      var rec = banners[Number(btn.dataset.i)]; if (!rec) return;
      if (btn.dataset.act === "edit") { bannerForm(rec); return; }
      if (btn.dataset.act === "toggle") {
        btn.disabled = true;
        var next = rec.status === "hidden" ? "active" : "hidden";
        var t = await api("saveBanner", { id: rec.id, matchUrl: rec.imageUrl, status: next });
        if (!t.ok) { btn.disabled = false; toast(t.error, true); return; }
        catalogChanged(); toast(next === "hidden" ? "Banner hidden" : "Banner shown"); route();
      }
      if (btn.dataset.act === "del") {
        if (!confirm("Delete this banner? It will be removed from the homepage.")) return;
        var r = await api("deleteBanner", { id: rec.id, matchUrl: rec.imageUrl });
        if (!r.ok) { toast(r.error, true); return; }
        catalogChanged(); toast("Banner deleted"); route();
      }
    };
  }

  function bannerForm(b) {
    var isNew = !b; b = b || { imageUrl: "", order: 0 };
    var imageData = "";
    var existing = b.imageUrl ? (DATA.safeImageUrl(b.imageUrl) || b.imageUrl) : "";
    // The image area IS the preview: it shows the chosen/existing banner at a
    // true 3:1 ratio, with a drop/browse prompt until one is picked.
    modal(isNew ? "Add banner" : ("Edit banner" + (b.id != null && b.id !== "" ? " #" + b.id : "")),
      f("bImg", "Banner image",
        '<div class="adm-drop ban-drop'+(existing ? ' has-img' : '')+'" id="bDrop">'+
          '<input id="bFile" type="file" accept="image/*" hidden>'+
          '<img id="bPrev" class="ban-prev" alt="Banner preview"'+(existing ? ' src="'+esc(existing)+'"' : '')+'>'+
          '<div class="ban-empty">'+svg("image", 28)+
            '<span>Drag &amp; drop a wide banner here, or <b>browse</b></span>'+
            '<small>Best at 1600 × 530 px (3:1)</small></div>'+
          '<span class="ban-change">Change image</span>'+
        '</div>', "full") +
      f("bOrder", "Display order", '<input id="bOrder" type="number" min="0" step="1" value="'+esc(b.order || 0)+'">') +
      f("bStatus", "Visibility", '<label class="adm-switch"><input id="bStatus" type="checkbox"'+(b.status === "hidden" ? '' : ' checked')+'><span>Show on homepage</span></label>'),
      async function () {
        if (isNew && !imageData) return "Please choose a banner image.";
        var r = await api("saveBanner", { id: isNew ? undefined : b.id, matchUrl: b.imageUrl || "",
          order: Number($("bOrder").value) || 0, status: $("bStatus").checked ? "active" : "hidden", imageData: imageData });
        if (!r.ok) return r.error;
        catalogChanged(); toast(isNew ? "Banner added" : "Banner saved"); route();
      });

    var drop = $("bDrop"), file = $("bFile"), prev = $("bPrev");
    function setImg(src) { if (!src) return; prev.src = src; drop.classList.add("has-img"); }
    function handle(file2) {
      if (!file2 || !/^image\//.test(file2.type)) { toast("Please choose an image file.", true); return; }
      toImage(file2, 1600, function (durl) {
        if (!durl) { toast("Couldn't read that image.", true); return; }
        imageData = durl; setImg(durl);
      });
    }
    drop.addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () { handle(file.files[0]); });
    ["dragover", "dragenter"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "dragend"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
  }

  /* -------------------------------- vendors ------------------------------- */
  var venStaff = "";   // Sellers page filter (superadmin/manager): a staff code, "-" = no staff, "" = all
  function staffName(code) {
    var s = ((catalog && catalog.staff) || []).filter(function (x) { return x.code === String(code || "").toUpperCase(); })[0];
    return s ? s.name || s.username : "";
  }
  async function viewVendors() {
    var cat = await getCatalog();
    var count = {}; cat.products.forEach(function (p) { if (p.vendor_id !== "") count[String(p.vendor_id)] = (count[String(p.vendor_id)] || 0) + 1; });
    var codeOf = function (v) { return String(v.staffCode || v.invite || "").trim().toUpperCase(); };
    var staffList = role() === "staff" ? [] : (cat.staff || []);
    if (venStaff && venStaff !== "-" && !staffList.some(function (x) { return x.code === venStaff; })) venStaff = "";
    var list = cat.vendors.filter(function (v) { return !venStaff || (venStaff === "-" ? !codeOf(v) : codeOf(v) === venStaff); });
    var nBy = {}; cat.vendors.forEach(function (v) { var c = codeOf(v) || "-"; nBy[c] = (nBy[c] || 0) + 1; });
    var staffPick = staffList.length ? '<label class="adm-seller-pick">'+svg("users", 18)+'<select id="venStaff" aria-label="Show sellers of staff member">'+
        '<option value="">All staff ('+cat.vendors.length+')</option>'+
        staffList.map(function (x) { return '<option value="'+esc(x.code)+'"'+(venStaff === x.code ? " selected" : "")+'>'+esc(x.name || x.username)+' · '+esc(x.code)+' ('+(nBy[x.code] || 0)+')'+(x.role !== "staff" ? ' — '+esc(roleLabel(x.role)) : '')+'</option>'; }).join("")+
        (nBy["-"] ? '<option value="-"'+(venStaff === "-" ? " selected" : "")+'>No staff code ('+nBy["-"]+')</option>' : '')+
      '</select></label>' : '';
    $("admView").innerHTML =
      '<div class="adm-toolbar">'+staffPick+'<span class="adm-count">'+list.length+(list.length===1?' seller':' sellers')+
        (role() === "staff" && myStaffCode() ? ' · registered with your code <b class="adm-okey">'+esc(myStaffCode())+'</b>' : '')+'</span>'+
        '<button class="btn btn-primary adm-btn" type="button" id="addVen">'+svg("plus")+' Add seller</button></div>'+
      '<section class="adm-card adm-flush">'+(list.length ?
        '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Shop</th><th>Contact</th><th>Products</th><th>Login</th><th>Shop</th><th class="r">Actions</th></tr></thead><tbody>'+
        list.map(function (v) {
          var canLogin = v.status === "active", shopOk = v.shopStatus === "verified", sc = codeOf(v), sn = sc ? staffName(sc) : "";
          return '<tr><td><div class="adm-cell-main">'+esc(v.shopName || v.name)+'</div><div class="adm-cell-sub">#'+esc(v.id)+(sc ? ' · '+(sn ? esc(sn)+' · ' : 'code ')+esc(sc) : ' · no staff')+'</div>'+
              (v.hasPassword === false ? '<div class="adm-cell-sub" style="color:#b45309">No password — can\'t sign in yet</div>' : '')+'</td>'+
            '<td><div class="adm-cell-main">'+esc(v.name || '—')+'</div>'+(v.email ? '<div class="adm-cell-sub"><a class="adm-link" href="mailto:'+esc(v.email)+'">'+esc(v.email)+'</a></div>' : '')+(v.phone?'<div class="adm-cell-sub">'+esc(v.phone)+'</div>':'')+'</td>'+
            '<td>'+(count[String(v.id)] || 0)+'</td>'+
            '<td>'+pill(canLogin ? "active" : "pending")+'</td>'+
            '<td>'+pill(shopOk ? "verified" : "unverified")+'</td>'+
            '<td class="r"><div class="adm-actions">'+
              '<button type="button" class="btn btn-ghost adm-mini" data-login="'+esc(v.id)+'" data-to="'+(canLogin?'0':'1')+'">'+(canLogin?'Revoke':'Approve')+'</button>'+
              '<button type="button" class="btn btn-ghost adm-mini" data-shop="'+esc(v.id)+'" data-to="'+(shopOk?'0':'1')+'">'+(shopOk?'Unverify':'Verify')+'</button>'+
              '<button type="button" class="adm-icon-btn" data-edit="'+esc(v.id)+'" aria-label="Edit '+esc(v.shopName||v.name)+'">'+svg("edit")+'</button>'+
              (can("deleteVendor") ? '<button type="button" class="adm-icon-btn danger" data-del="'+esc(v.id)+'" aria-label="Delete '+esc(v.shopName||v.name)+'">'+svg("trash")+'</button>' : '')+'</div></td></tr>';
        }).join("")+'</tbody></table></div>'
        : venStaff ? empty("No sellers", "No sellers are registered under this staff member yet.")
        : empty("No sellers yet", role() === "staff"
            ? "Sellers who register with your staff code " + (myStaffCode() || "") + " appear here for approval. You can also add one yourself."
            : "Sellers who register from “Become a seller” appear here for approval. You can also add one manually.", '<button class="btn btn-primary" type="button" id="addVen2">Add a seller</button>'))+
      '</section>';
    $("addVen").onclick = function () { vendorForm(null); };
    if ($("venStaff")) $("venStaff").onchange = function () { venStaff = this.value; route(); };
    if ($("addVen2")) $("addVen2").onclick = function () { vendorForm(null); };
    $("admView").onclick = async function (e) {
      var b = e.target.closest("button[data-edit],button[data-del],button[data-login],button[data-shop]"); if (!b) return;
      var v = cat.vendors.filter(function (x) { return String(x.id) === (b.dataset.edit || b.dataset.del || b.dataset.login || b.dataset.shop); })[0];
      if (b.dataset.login !== undefined) { var rl = await api("saveVendor", { id: v.id, status: b.dataset.to === "1" ? "active" : "pending" }); if (!rl.ok) { toast(rl.error, true); return; } catalogChanged(); toast(b.dataset.to === "1" ? "Login approved — seller can sign in" : "Login revoked"); route(); return; }
      if (b.dataset.shop !== undefined) { var rs = await api("saveVendor", { id: v.id, shop_status: b.dataset.to === "1" ? 1 : 0 }); if (!rs.ok) { toast(rs.error, true); return; } catalogChanged(); toast(b.dataset.to === "1" ? "Shop verified" : "Shop set unverified"); route(); return; }
      if (b.dataset.edit) vendorForm(v);
      if (b.dataset.del) {
        if (!confirm('Delete the seller "' + (v.shopName||v.name) + '"?')) return;
        var r = await api("deleteVendor", { id: v.id });
        if (!r.ok) { toast(r.error, true); return; }
        catalogChanged(); toast("Seller deleted"); route();
      }
    };
  }
  function vendorForm(v) {
    var isNew = !v; v = v || { shopName: "", name: "", email: "", phone: "", status: "pending", shopStatus: "unverified" };
    var loginSel = '<select id="vStatus"><option value="active"'+(v.status==="active"?" selected":"")+'>Approved — can sign in</option><option value="pending"'+(v.status!=="active"?" selected":"")+'>Pending — sign-in blocked</option></select>';
    var shopSel = '<select id="vShopStatus"><option value="1"'+(v.shopStatus==="verified"?" selected":"")+'>Verified</option><option value="0"'+(v.shopStatus!=="verified"?" selected":"")+'>Unverified</option></select>';
    var codeNote = isNew && role() === "staff"
      ? f("vCode", "Staff code", '<input value="'+esc(myStaffCode())+'" readonly><small class="adm-hint-sm">The seller is added under your code.</small>') : "";
    var pwField = f("vPw", (isNew ? "Password" : "New password") + ' <span class="opt">(' + (isNew ? "needed to sign in" : "leave blank to keep") + ')</span>',
      '<input id="vPw" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters">');
    var cur = String(v.staffCode || v.invite || (isNew && venStaff !== "-" ? venStaff : "") || "").toUpperCase();
    var staffSel = role() !== "staff" && (catalog && catalog.staff || []).length
      ? f("vStaff", "Staff member", '<select id="vStaff"><option value="">— None —</option>'+catalog.staff.map(function (x) {
          return '<option value="'+esc(x.code)+'"'+(x.code === cur ? " selected" : "")+'>'+esc(x.name || x.username)+' · '+esc(x.code)+'</option>'; }).join("")+'</select>') : "";
    var extra = staffSel + (isNew ? codeNote :
      (staffSel ? "" : f("vCode", "Invitation / staff code", '<input value="'+esc(v.staffCode || v.invite || "")+'" readonly>')) +
      f("vDocs", "Certificates", '<div class="adm-doclinks">'+
        (v.certFront ? '<a class="adm-link" target="_blank" rel="noopener" href="'+esc(v.certFront)+'">View front</a>' : '<span class="adm-cell-sub">No front</span>')+' · '+
        (v.certBack ? '<a class="adm-link" target="_blank" rel="noopener" href="'+esc(v.certBack)+'">View back</a>' : '<span class="adm-cell-sub">No back</span>')+'</div>'));
    modal(isNew ? "Add seller" : "Edit seller #" + v.id,
      '<div class="adm-form-cols">'+
        f("vShop", "Shop name", '<input id="vShop" required maxlength="100" value="'+esc(v.shopName||'')+'">', "full") +
        f("vName", "Contact name", '<input id="vName" maxlength="80" value="'+esc(v.name)+'">') +
        f("vEmail", "Email", '<input id="vEmail" type="email" value="'+esc(v.email)+'">') +
        f("vPhone", "Phone", '<input id="vPhone" type="tel" value="'+esc(v.phone)+'">') +
        f("vStatus", "Login access", loginSel) +
        f("vShopStatus", "Shop status", shopSel) +
        f("vRating", "Rating <span class=\"opt\">(0–5)</span>", '<input id="vRating" type="number" min="0" max="5" step="0.5" value="'+esc(v.rating == null ? '' : v.rating)+'" placeholder="0–5">') +
        pwField + extra +
      '</div>',
      async function () {
        if (!$("vShop").value.trim()) return "Shop name is required.";
        var rating = Math.min(5, Math.max(0, Number($("vRating").value) || 0));
        var email = $("vEmail").value.trim(), phone = $("vPhone").value.trim(), pw = $("vPw").value;
        if (email && !AUTH.isEmail(email)) return "Enter a valid email address.";
        var payload = { id: isNew ? undefined : v.id, shopName: $("vShop").value.trim(), name: $("vName").value.trim(), email: email, phone: phone, status: $("vStatus").value, shop_status: $("vShopStatus").value, rating: rating };
        if (pw) {
          if (pw.length < 8) return "Password must be at least 8 characters.";
          // same hash the seller sign-in page makes: salt "seller:<email, or mobile digits>"
          var ident = email ? AUTH.loginId(email) : AUTH.loginId(phone);
          if (!ident || (!email && ident.length < 6)) return "Add an email or mobile number so the seller can sign in.";
          payload.passwordHash = await AUTH.hash("seller:" + ident, pw);
          // email + mobile → a second hash so the seller can sign in with either
          if (email && AUTH.loginId(phone).length >= 6) payload.passwordHashPhone = await AUTH.hash("seller:" + AUTH.loginId(phone), pw);
        }
        if ($("vStaff")) payload.invite = $("vStaff").value;
        var r = await api("saveVendor", payload);
        if (!r.ok) return r.error;
        catalogChanged(); toast(isNew ? "Seller added" : "Seller saved"); route();
      });
    enhancePasswords(document.querySelector(".adm-modal"));
  }

  /* -------------------------------- wallet -------------------------------- */
  // Approve/reject sellers' deposit & withdrawal requests, and set each seller's
  // guarantee money. Balances are auto-computed server-side from these.
  async function viewWallet() {
    var res = await api("listWallet");
    if (!res.ok) throw new Error(res.error);
    var allTxs = res.transactions || [], allSellers = res.sellers || [];
    function dt(iso) { return fmtDateTimeInline(iso); }
    function kindOf(s) { return s === "approved" ? "verified" : s === "rejected" ? "blocked" : "pending"; }
    function txRow(t) {
      var actions = can("updateTx")
        ? '<button type="button" class="adm-icon-btn" data-editamt="'+esc(t.id)+'" data-amt="'+esc(t.amount)+'" data-cur="'+esc(t.currency || '')+'" data-type="'+esc(t.type || '')+'" data-status="'+esc(t.status || 'pending')+'" title="Edit transaction" aria-label="Edit transaction">'+svg("edit")+'</button>'
        : '<span class="adm-cell-sub">'+(t.note ? esc(t.note) : (t.status === "pending" ? "Pending review" : "—"))+'</span>';
      return '<tr>'+
        '<td><div class="adm-cell-main">'+esc(t.sellerName)+'</div><div class="adm-cell-sub">#'+esc(t.id)+' · '+esc(dt(t.createdAt))+'</div></td>'+
        '<td>'+esc(cap(t.type))+'</td>'+
        '<td><strong>'+esc(t.currency || '$')+Number(t.amount).toFixed(2)+'</strong>'+(t.account ? '<div class="adm-cell-sub">'+esc(t.account)+'</div>' : '')+'</td>'+
        '<td>'+esc((t.method || '—').toUpperCase())+'</td>'+
        '<td>'+pill(t.status, kindOf(t.status))+'</td>'+
        '<td>'+(t.voucher ? '<a class="adm-link" target="_blank" rel="noopener" href="'+esc(t.voucher)+'">View</a>' : '<span class="adm-cell-sub">—</span>')+'</td>'+
        '<td class="r"><div class="adm-actions">'+actions+'</div></td></tr>';
    }
    function selRow(s) {
      var nm = esc(s.shopName || s.name || '');
      var btns = [];
      if (can("addTx")) btns.push('<button type="button" class="btn btn-primary adm-mini" data-dep="'+esc(s.id)+'" data-name="'+nm+'">Add deposit</button>');
      if (can("setGuarantee")) btns.push('<button type="button" class="btn btn-ghost adm-mini" data-guar="'+esc(s.id)+'" data-name="'+nm+'" data-amt="'+esc(s.guaranteeMoney)+'">Set guarantee</button>');
      var act = btns.length ? '<div class="adm-actions">'+btns.join("")+'</div>' : '<span class="adm-cell-sub">—</span>';
      return '<tr>'+
        '<td><div class="adm-cell-main">'+esc(s.shopName || s.name || '—')+'</div><div class="adm-cell-sub">'+esc(s.email || '')+'</div></td>'+
        '<td><strong>'+money(s.walletMoney)+'</strong></td>'+
        '<td>'+money(s.pendingBalance)+'</td>'+
        '<td><span class="adm-profit">'+money(s.guaranteeMoney)+'</span></td>'+
        '<td class="r">'+act+'</td></tr>';
    }
    var options = '<option value="">All sellers</option>'+allSellers.map(function (s) {
      return '<option value="'+esc(s.id)+'">'+esc(s.shopName || s.name || ("#"+s.id))+'</option>'; }).join("");

    $("admView").innerHTML =
      '<div class="adm-toolbar"><select id="wlSeller" aria-label="Seller">'+options+'</select><span class="adm-count" id="wlCount"></span></div>'+
      '<div id="wlBody"></div>';

    function render(sid) {
      var sellers = sid ? allSellers.filter(function (s) { return String(s.id) === String(sid); }) : allSellers;
      var txs = sid ? allTxs.filter(function (t) { return String(t.sellerId) === String(sid); }) : allTxs;
      var pending = txs.filter(function (t) { return t.status === "pending"; }).length;
      $("wlCount").textContent = txs.length+' transaction'+(txs.length === 1 ? '' : 's')+(pending ? ' · '+pending+' pending' : '');
      $("wlBody").innerHTML =
        '<div class="adm-toolbar"><span class="adm-count">Sellers &amp; guarantee money</span></div>'+
        '<section class="adm-card adm-flush"><div class="adm-table-wrap"><table class="adm-table">'+
          '<thead><tr><th>Seller</th><th>Wallet</th><th>Pending</th><th>Guarantee</th><th class="r">Actions</th></tr></thead>'+
          '<tbody>'+(sellers.length ? sellers.map(selRow).join("") : '<tr><td colspan="5">'+empty("No sellers", "")+'</td></tr>')+'</tbody></table></div></section>'+
        '<div class="adm-toolbar" style="margin-top:20px"><span class="adm-count">Wallet transactions</span></div>'+
        '<section class="adm-card adm-flush"><div class="adm-table-wrap"><table class="adm-table">'+
          '<thead><tr><th>Seller</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Voucher</th><th class="r">Actions</th></tr></thead>'+
          '<tbody>'+(txs.length ? txs.map(txRow).join("") : '<tr><td colspan="7">'+empty("No transactions", "Deposits and withdrawal requests will appear here.")+'</td></tr>')+'</tbody></table></div></section>';
    }
    // Remember the chosen seller so a page refresh keeps them selected.
    var SELKEY = "mm_wallet_seller", saved = "";
    try { saved = localStorage.getItem(SELKEY) || ""; } catch (e) {}
    if (saved && !allSellers.some(function (s) { return String(s.id) === String(saved); })) saved = "";
    $("wlSeller").value = saved;
    render(saved);
    $("wlSeller").addEventListener("change", function () {
      try { localStorage.setItem(SELKEY, this.value); } catch (e) {}
      render(this.value);
    });

    $("admView").onclick = async function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.approve) {
        approveForm(b.dataset.approve, b.dataset.amt, b.dataset.cur, b.dataset.type);
      } else if (b.dataset.reject) {
        b.disabled = true;
        var r = await api("updateTx", { id: b.dataset.reject, status: "rejected" });
        if (!r.ok) { b.disabled = false; return toast(r.error, true); }
        toast("Rejected"); route();
      } else if (b.dataset.editamt) {
        editTxForm(b.dataset.editamt, b.dataset.amt, b.dataset.cur, b.dataset.type, b.dataset.status);
      } else if (b.dataset.guar) {
        guaranteeForm(b.dataset.guar, b.dataset.name, b.dataset.amt);
      } else if (b.dataset.dep) {
        depositForm(b.dataset.dep, b.dataset.name);
      }
    };
  }

  // Edit a pending transaction's amount + currency (e.g. convert ₹ → $) WITHOUT
  // approving it. It stays pending; approve later to credit/debit the wallet.
  function editTxForm(id, amt, cur, type, status) {
    var title = type === "withdraw" ? "Edit Withdrawal Transactions"
              : type === "deposit"  ? "Edit Deposit Transactions"
              : "Edit Transaction";
    var c = cur || '₹', st = status || 'pending';
    var curOpts = [['₹', '₹ (INR)'], ['$', '$ (USD)']].map(function (o) {
      return '<option value="'+o[0]+'"'+(o[0] === c ? ' selected' : '')+'>'+o[1]+'</option>';
    }).join('');
    var stOpts = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(function (o) {
      return '<option value="'+o[0]+'"'+(o[0] === st ? ' selected' : '')+'>'+o[1]+'</option>';
    }).join('');
    modal(title,
      '<p class="adm-hint" style="margin:0 0 16px">Update the amount and currency (e.g. convert ₹ to $ at the current rate) and set the status. An <b>Approved</b> amount is what credits (deposit) or debits (withdraw) the wallet.</p>'+
      '<div class="adm-form-cols">'+
        f("eAmt", "Amount", '<input id="eAmt" type="number" min="0.01" step="0.01" required value="'+esc(Number(amt).toFixed(2))+'">')+
        f("eCur", "Currency", '<select id="eCur">'+curOpts+'</select>')+
        f("eStatus", "Status", '<select id="eStatus">'+stOpts+'</select>')+
      '</div>',
      async function () {
        var a = Number($("eAmt").value) || 0;
        if (!(a > 0)) return "Enter a valid amount.";
        var r = await api("updateTx", { id: id, status: $("eStatus").value, amount: a, currency: ($("eCur").value || '').trim() });
        if (!r.ok) return r.error;
        toast("Transaction updated"); route();
      });
  }

  // Approving a transaction: the seller's amount is in ₹ (INR). The admin enters
  // the amount converted to USD at the current rate and the currency becomes $,
  // which is what the wallet is credited in.
  function approveForm(id, amt, cur, type) {
    var usd = C.CURRENCY_SYMBOL || "$";
    var curOpts = [['$', '$ (USD)'], ['₹', '₹ (INR)']].map(function (o) {
      return '<option value="'+o[0]+'"'+(o[0] === '$' ? ' selected' : '')+'>'+o[1]+'</option>';
    }).join('');
    modal("Approve — convert to USD",
      '<p class="adm-hint" style="background:#eef4ff;color:#1d4ed8;margin:0 0 16px">Seller requested <b>'+esc(cur || '₹')+esc(Number(amt).toFixed(2))+'</b>. Enter the amount converted to USD at the current rate — the wallet is '+(type === 'withdraw' ? 'debited' : 'credited')+' by this amount.</p>'+
      '<div class="adm-form-cols">'+
        f("aAmt", "Amount in USD ($)", '<input id="aAmt" type="number" min="0.01" step="0.01" required value="'+esc(Number(amt).toFixed(2))+'">')+
        f("aCur", "Currency", '<select id="aCur">'+curOpts+'</select>')+
      '</div>',
      async function () {
        var a = Number($("aAmt").value) || 0;
        if (!(a > 0)) return "Enter the converted USD amount.";
        var r = await api("updateTx", { id: id, status: "approved", amount: a, currency: ($("aCur").value || usd).trim() });
        if (!r.ok) return r.error;
        toast("Approved"); route();
      });
  }

  // Staff/manager/admin records a deposit for a seller. It's created PENDING and
  // a superadmin/manager still has to approve it on the Wallet Transaction page.
  function depositForm(id, name) {
    modal("Add deposit — " + name,
      '<div class="adm-form-cols">'+
        f("dAmt", "Amount", '<input id="dAmt" type="number" min="0.01" step="0.01" required value="">')+
        f("dMethod", "Method", '<select id="dMethod"><option value="usdt">USDT</option><option value="bank">Bank</option></select>')+
        f("dNote", "Note (optional)", '<input id="dNote" type="text" maxlength="300" value="" placeholder="Reference / remark">')+
      '</div><p class="adm-hint">This deposit is created as <b>Pending</b>. A manager or admin must approve it before it credits the wallet.</p>',
      async function () {
        var amt = Math.max(0, Number($("dAmt").value) || 0);
        if (!(amt > 0)) return "Enter a valid amount.";
        var r = await api("addTx", { seller_id: id, type: "deposit", amount: amt, method: $("dMethod").value, note: $("dNote").value });
        if (!r.ok) return r.error;
        toast("Deposit added — pending approval"); route();
      });
  }

  function guaranteeForm(id, name, amt) {
    modal("Set guarantee — " + name,
      '<div class="adm-form-cols">'+f("gAmt", "Guarantee money ("+esc(C.CURRENCY_CODE)+")", '<input id="gAmt" type="number" min="0" step="0.01" value="'+esc(amt || 0)+'">')+'</div>',
      async function () {
        var r = await api("setGuarantee", { seller_id: id, amount: Math.max(0, Number($("gAmt").value) || 0) });
        if (!r.ok) return r.error;
        toast("Guarantee updated"); route();
      });
  }

  /* -------------------------------- admins -------------------------------- */
  // Admin passwords are hashed in the browser like customers', salted with
  // "admin:<username>" (createAdmin in Code.gs computes the same hash).
  function adminHash(username, pw) { return AUTH.hash("admin:" + AUTH.normId(username), pw); }

  /* ----------------------------- Support chat ----------------------------- */
  // Inbox of seller conversations (left) + the open chat (right, js/chat.js).
  // Staff only see the sellers who registered with their staff code; the
  // server enforces that too. A background poll keeps the nav badge current
  // and shows a toast when a seller sends a new message.
  var _chatW = null, _chatTimer = null, _chatData = null, _chatSel = null, _chatMax = 0;
  var _chatFilter = "all", _chatQ = "";
  var _chatPushed = false;   // phone layout: opening a chat adds a history entry so Back closes it
  window.addEventListener("popstate", function () { if (_chatPushed) { _chatPushed = false; closeThread(); } });
  function phoneLayout() { return window.matchMedia("(max-width: 900px)").matches; }

  function paintChatBadge(n) {
    var fb = document.querySelector("#admFab .sp-badge");
    if (fb) { fb.hidden = !(n > 0); fb.textContent = n > 99 ? "99+" : String(n); }
    document.querySelectorAll('.adm-nav a[data-route="chat"], .adm-tab[data-route="chat"]').forEach(function (a) {
      var b = a.querySelector(".adm-navbadge");
      if (!b) { b = document.createElement("b"); b.className = "adm-navbadge"; a.appendChild(b); }
      b.hidden = !(n > 0); b.textContent = n > 99 ? "99+" : String(n);
    });
  }
  function onChatRoute() { return (location.hash || "").slice(1) === "chat"; }
  async function loadChatList() {
    var r = await api("chatList");
    if (!r.ok) throw new Error(r.error || "Couldn't load conversations.");
    // the conversation open on screen is being read right now
    (r.conversations || []).forEach(function (c) {
      if (onChatRoute() && String(c.seller.id) === _chatSel) { r.unread -= c.unread; c.unread = 0; }
    });
    _chatData = r;
    paintChatBadge(Math.max(0, r.unread));
    return r;
  }
  function startChatAlerts() {
    if (!session || _chatTimer) return;
    async function poll() {
      if (!session || document.visibilityState !== "visible") return;
      try {
        var prevMax = _chatMax, r = await loadChatList();
        _chatMax = Math.max(_chatMax, Number(r.maxSellerMsg) || 0);
        if (prevMax && _chatMax > prevMax) {
          (r.conversations || []).filter(function (c) {
            return c.lastSender === "seller" && Number(c.lastId) > prevMax && !(onChatRoute() && String(c.seller.id) === _chatSel);
          }).forEach(function (c) {
            var who = c.seller.shopName || c.seller.name || "A seller";
            _notes.unshift({ title: "💬 " + who, sub: c.lastText || "New message" }); _unread++; paintBell();
            toast("New message from " + who);
          });
        }
        if (onChatRoute() && $("ctiList")) renderChatList();
      } catch (e) {}
    }
    poll();
    _chatTimer = setInterval(poll, 12000);
  }

  function chatAva(s, cls) {
    var img = String(s.shopImage || "").replace(/["'()\\]/g, "");
    var initial = esc(((s.shopName || s.name || "?").trim().charAt(0) || "?").toUpperCase());
    return img ? '<span class="' + cls + ' img" style="background-image:url(&quot;' + esc(img) + '&quot;)"></span>'
               : '<span class="' + cls + '">' + initial + "</span>";
  }
  function renderChatList() {
    var d = _chatData || { conversations: [], sellers: [] }, q = _chatQ.trim().toLowerCase();
    var conv = {}; (d.conversations || []).forEach(function (c) { conv[String(c.seller.id)] = c; });
    var match = function (s) { return !q || [s.shopName, s.name, s.email, s.phone, "#" + s.id].join(" ").toLowerCase().indexOf(q) > -1; };
    var name = function (c) { return String(c.seller.shopName || c.seller.name || ""); };
    var rows;
    if (_chatFilter === "sellers") {
      rows = (d.sellers || []).filter(match).map(function (s) { return conv[String(s.id)] || { seller: s, none: true, unread: 0 }; })
        .sort(function (a, b) { return (Number(b.lastId) || 0) - (Number(a.lastId) || 0) || name(a).localeCompare(name(b)); });
    } else {
      rows = (d.conversations || []).filter(function (c) { return match(c.seller) && (_chatFilter !== "unread" || c.unread > 0); });
    }
    var cnt = $("ctiCount"), total = Math.max(0, d.unread || 0);
    if (cnt) { cnt.hidden = !total; cnt.textContent = total; }
    var list = $("ctiList"); if (!list) return;
    if (!rows.length) {
      var none = q ? "No sellers match “" + esc(_chatQ) + "”." :
        _chatFilter === "unread" ? "You're all caught up — no unread messages." :
        _chatFilter === "sellers" ? (role() === "staff" ? "No sellers have registered with your staff code yet." : "No sellers yet.") :
        "No conversations yet. Open <b>All sellers</b> to message a seller.";
      list.innerHTML = '<div class="cti-none">' + none + "</div>"; return;
    }
    list.innerHTML = rows.map(function (c) {
      var s = c.seller, sid = String(s.id), on = sid === _chatSel, unread = on ? 0 : c.unread;
      var tick = "";
      if (!c.none && c.lastSender === "support")
        tick = '<span class="ct-tk' + (c.lastStatus === "seen" ? " seen" : "") + '">' + (c.lastStatus === "sent" ? CHAT.TICK1 : CHAT.TICK2) + "</span>";
      var prev = c.none ? '<span style="color:#9aa4b8">No messages yet · start a chat</span>' : tick + "<span>" + esc(c.lastText) + "</span>";
      return '<button type="button" class="cti-item' + (on ? " on" : "") + (unread ? " unread" : "") + '" data-sid="' + esc(sid) + '">' +
        chatAva(s, "cti-ava") +
        '<span class="cti-mid"><span class="cti-row1"><span class="cti-name">' + esc(name(c) || "Seller #" + sid) + "</span>" +
          (c.none ? "" : '<span class="cti-time" title="' + esc(CHAT.fullIST(c.lastAt)) + '">' + esc(CHAT.shortStamp(c.lastAt)) + "</span>") + "</span>" +
        '<span class="cti-row2"><span class="cti-prev">' + prev + "</span>" +
          (unread ? '<span class="cti-badge">' + (unread > 99 ? "99+" : unread) + "</span>" : "") + "</span></span>" +
      "</button>";
    }).join("");
  }
  function chatPick() {
    return '<div class="cti-pick"><div class="ct-empty-ic">' + svg("chat", 34) + "</div><h4>Select a conversation</h4>" +
      "<p>Choose a seller on the left to read and reply. Messages, screenshots and read receipts update live. All times are in IST.</p></div>";
  }
  function closeThread() {
    if (_chatW) { _chatW.destroy(); _chatW = null; }
    _chatSel = null;
    var box = $("cti"); if (box) box.classList.remove("open");
    var main = $("ctiMain"); if (main) main.innerHTML = chatPick();
    renderChatList();
  }
  function openThread(sid) {
    var d = _chatData || {}, s = (d.sellers || []).filter(function (x) { return String(x.id) === String(sid); })[0];
    if (!s) return;
    if (_chatW) { _chatW.destroy(); _chatW = null; }
    _chatSel = String(s.id);
    // reading it now → drop its unread count from the badges straight away
    (d.conversations || []).forEach(function (c) {
      if (String(c.seller.id) === _chatSel && c.unread) { d.unread = Math.max(0, (d.unread || 0) - c.unread); c.unread = 0; }
    });
    paintChatBadge(d.unread || 0);
    $("cti").classList.add("open");
    var main = $("ctiMain"); main.innerHTML = "";
    var root = document.createElement("div"); main.appendChild(root);
    var contact = [s.name, s.email || s.phone].filter(Boolean).join(" · ");
    function call(op, payload) { payload.sellerId = s.id; return post({ action: "admin", token: session && session.token, op: op, payload: payload }); }
    _chatW = CHAT.create({
      root: root, me: "support", showAgent: true, myAdminId: session.admin && session.admin.id, chips: false,
      their: { avatar: s.shopImage || "", initial: s.shopName || s.name || "S" },
      header: { title: s.shopName || s.name || "Seller #" + s.id, avatar: s.shopImage || "",
                subtitle: esc(contact ? contact + " · " : "") + "Seller #" + esc(s.id) +
                  (s.shopStatus === "verified" ? ' · <span style="color:#12a150;font-weight:600">Verified</span>' : "") },
      fetch: function (sinceId, mark) { return call("chatThread", { sinceId: sinceId, mark: mark }); },
      send: function (m) { return call("chatSend", { text: m.text, images: m.images }); },
      onAuth: function (msg) { logout(msg); },
      onBack: function () { if (_chatPushed) history.back(); else closeThread(); }
    });
    if (phoneLayout() && !_chatPushed) { try { history.pushState({ chat: _chatSel }, "", location.href); _chatPushed = true; } catch (e) {} }
    renderChatList();
    setTimeout(function () { if (_chatW) _chatW.focus(); }, 60);
  }

  async function viewChat() {
    var v = $("admView");
    v.innerHTML =
      '<div class="cti" id="cti">' +
        '<aside class="cti-side">' +
          '<div class="cti-top"><h3>Conversations <span class="cti-count" id="ctiCount" hidden></span></h3>' +
            '<label class="cti-search">' + svg("search", 16) + '<input id="ctiQ" type="search" placeholder="Search shop, name, email, phone" autocomplete="off"></label>' +
            '<div class="cti-tabs" id="ctiTabs">' +
              [["all", "Chats"], ["unread", "Unread"], ["sellers", "All sellers"]].map(function (k) {
                return '<button type="button" data-f="' + k[0] + '"' + (_chatFilter === k[0] ? ' class="on"' : "") + ">" + k[1] + "</button>";
              }).join("") +
            "</div></div>" +
          '<div class="cti-list" id="ctiList"><div class="cti-none">Loading conversations…</div></div>' +
        "</aside>" +
        '<section class="cti-main" id="ctiMain">' + chatPick() + "</section>" +
      "</div>";
    $("ctiQ").value = _chatQ;
    $("ctiQ").oninput = function () { _chatQ = this.value; renderChatList(); };
    $("ctiTabs").onclick = function (e) {
      var b = e.target.closest("[data-f]"); if (!b) return;
      _chatFilter = b.getAttribute("data-f");
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderChatList();
    };
    $("ctiList").onclick = function (e) { var b = e.target.closest("[data-sid]"); if (b) openThread(b.getAttribute("data-sid")); };
    await loadChatList();
    _chatMax = Math.max(_chatMax, Number(_chatData.maxSellerMsg) || 0);
    renderChatList();
    // coming back to the chat page re-opens the last conversation (desktop)
    var keep = _chatSel; _chatSel = null;
    if (keep && !phoneLayout()) openThread(keep);
  }

  /* ------------------------------- visitors ------------------------------- */
  // Storefront visits logged by the website (one row per browser session).
  var vf = { q: "", device: "", day: "" }, visPage = 1, VISITS_PER_PAGE = 20;
  async function viewVisitors() {
    var res = await api("listVisitors");
    if (!res.ok) throw new Error(res.error);
    var all = res.visitors || [], s = res.stats || {}, dv = s.devices || {};
    var IST_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
    var dayKey = function (iso) { var d = new Date(iso); return isNaN(d) ? "" : IST_KEY.format(d); };
    var todayKey = IST_KEY.format(new Date()), weekKey = IST_KEY.format(new Date(Date.now() - 6 * 864e5));
    var place = function (v) { return [v.city, v.region, v.country].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(", "); };
    var pct = function (n) { return s.total ? Math.round(n / s.total * 100) + "%" : "0%"; };
    function draw() {
      var q = vf.q.trim().toLowerCase();
      var list = all.filter(function (v) {
        if (vf.device && v.device !== vf.device) return false;
        if (vf.day === "today" && dayKey(v.createdAt) !== todayKey) return false;
        if (vf.day === "week" && dayKey(v.createdAt) < weekKey) return false;
        return !q || [v.ip, v.city, v.region, v.country, v.isp, v.os, v.browser, v.model, v.page, v.referrer, v.user].join(" ").toLowerCase().indexOf(q) > -1;
      });
      var pages = Math.max(1, Math.ceil(list.length / VISITS_PER_PAGE));
      visPage = Math.min(Math.max(1, visPage), pages);
      var from = (visPage - 1) * VISITS_PER_PAGE, pageList = list.slice(from, from + VISITS_PER_PAGE);
      $("visBox").innerHTML = list.length ?
        '<div class="adm-table-wrap"><table class="adm-table adm-vis"><thead><tr><th>Time</th><th>IP address</th><th>Location</th><th>Device</th><th>Browser</th><th>Page</th><th class="r"></th></tr></thead><tbody>'+
        pageList.map(function (v) {
          var dev = (v.device || "—") + (v.model ? " · " + v.model : "");
          return '<tr>'+
            '<td>'+fmtDateTime(v.createdAt)+'</td>'+
            '<td><span class="adm-code">'+esc(v.ip || "Unknown")+'</span>'+(v.isp ? '<div class="adm-cell-sub adm-clip" title="'+esc(v.isp)+'">'+esc(v.isp)+'</div>' : '')+'</td>'+
            '<td><div class="adm-cell-main">'+esc(place(v) || "Unknown")+'</div>'+(v.timezone ? '<div class="adm-cell-sub">'+esc(v.timezone)+'</div>' : '')+'</td>'+
            '<td><span class="adm-pill dev-'+esc(String(v.device || "").toLowerCase())+'">'+esc(dev)+'</span><div class="adm-cell-sub">'+esc(v.os || "")+(v.screen ? ' · '+esc(v.screen) : '')+'</div></td>'+
            '<td>'+esc(v.browser || "—")+'<div class="adm-cell-sub">'+esc(v.language || "")+'</div></td>'+
            '<td><div class="adm-cell-main adm-clip" title="'+esc(v.page)+'">'+esc(v.page || "—")+'</div><div class="adm-cell-sub">'+(v.referrer ? 'from '+esc(v.referrer) : 'Direct')+(v.user ? ' · '+esc(v.user) : '')+'</div></td>'+
            '<td class="r"><button type="button" class="adm-icon-btn" data-vis="'+esc(v.id)+'" title="Details" aria-label="Visit details">'+svg("eye")+'</button></td>'+
          '</tr>';
        }).join("")+'</tbody></table></div>' + pager(visPage, pages, from + 1, from + pageList.length, list.length)
        : empty(all.length ? "No visits match" : "No visits yet", all.length ? "Try a different search or filter." : "Visits to your website appear here a few seconds after someone opens it.");
      $("visCount").textContent = list.length + " of " + all.length + (s.total > all.length ? " (latest)" : "");
    }
    $("admView").innerHTML =
      '<div class="adm-kpis">'+
        kpi("Visits today", s.today || 0, (s.uniqueToday || 0) + " unique visitor" + (s.uniqueToday === 1 ? "" : "s")) +
        kpi("Last 7 days", s.week || 0, "Visits incl. today") +
        kpi("All time", s.total || 0, (s.unique || 0) + " unique visitors") +
        kpi("Devices", pct(dv.Mobile || 0) + " mobile", pct(dv.Desktop || 0) + " desktop · " + pct(dv.Tablet || 0) + " tablet") +
      '</div>'+
      ((s.countries || []).length ? '<div class="adm-vis-top"><span>Top countries</span>'+s.countries.map(function (c) {
        return '<b>'+esc(c.country)+' <em>'+c.visits+'</em></b>'; }).join("")+'</div>' : '')+
      '<div class="adm-toolbar">'+
        '<label class="adm-search">'+svg("search")+'<input id="vfQ" type="search" placeholder="Search IP, city, ISP, browser…" value="'+esc(vf.q)+'"></label>'+
        '<select id="vfDay" aria-label="Date"><option value="">All dates</option><option value="today"'+(vf.day === "today" ? " selected" : "")+'>Today</option><option value="week"'+(vf.day === "week" ? " selected" : "")+'>Last 7 days</option></select>'+
        '<select id="vfDev" aria-label="Device"><option value="">All devices</option>'+["Mobile", "Desktop", "Tablet"].map(function (d) {
          return '<option'+(vf.device === d ? " selected" : "")+'>'+d+'</option>'; }).join("")+'</select>'+
        '<span class="adm-count" id="visCount"></span>'+
        '<button class="btn adm-btn btn-ghost" type="button" id="visRefresh">'+svg("refresh")+' Refresh</button>'+
        (role() === "superadmin" && all.length ? '<button class="btn adm-btn btn-ghost adm-danger-btn" type="button" id="visClear">'+svg("trash")+' Clear all</button>' : '')+
      '</div>'+
      '<section class="adm-card adm-flush" id="visBox"></section>';
    draw();
    $("vfQ").oninput = function () { vf.q = this.value; visPage = 1; draw(); };
    $("vfDay").onchange = function () { vf.day = this.value; visPage = 1; draw(); };
    $("vfDev").onchange = function () { vf.device = this.value; visPage = 1; draw(); };
    $("visRefresh").onclick = function () { route(); };
    if ($("visClear")) $("visClear").onclick = async function () {
      if (!confirm("Delete all " + s.total + " logged visits from the Visitors sheet? This can't be undone.")) return;
      var r = await api("clearVisitors"); if (!r.ok) { toast(r.error, true); return; }
      toast("Visitor log cleared"); route();
    };
    $("visBox").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.opage) { if (!b.disabled) { visPage = Number(b.dataset.opage) || 1; draw(); $("visBox").scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
      var v = all.filter(function (x) { return String(x.id) === b.dataset.vis; })[0]; if (!v) return;
      var row = function (k, val) { return '<div class="adm-kv"><span>'+esc(k)+'</span><b>'+esc(val || "—")+'</b></div>'; };
      modal("Visit details",
        '<div class="adm-kvs">'+row("Time", fmtDateTimeInline(v.createdAt))+row("IP address", v.ip)+row("Location", place(v))+row("ISP / network", v.isp)+
          row("Time zone", v.timezone)+row("Device", (v.device || "") + (v.model ? " · " + v.model : ""))+row("Operating system", v.os)+row("Browser", v.browser)+
          row("Screen", v.screen)+row("Language", v.language)+row("Landing page", v.page)+row("Came from", v.referrer || "Direct")+row("Signed in as", v.user || "Guest")+
          row("Visitor ID", v.visitorId)+'</div>'+
        '<div class="adm-kv adm-kv-ua"><span>User agent</span><code>'+esc(v.userAgent || "—")+'</code></div>'+
        (v.visitorId ? '<p class="adm-cell-sub">This browser has visited '+all.filter(function (x) { return x.visitorId === v.visitorId; }).length+' time(s) in the visits shown.</p>' : ''),
        null, { readOnly: true });
    });
  }

  async function viewAdmins() {
    var res = await api("listAdmins");
    if (!res.ok) throw new Error(res.error);
    var admins = res.admins || [], meId = String(res.meId);
    $("admView").innerHTML =
      '<div class="adm-toolbar"><span class="adm-count">'+admins.length+' admin'+(admins.length === 1 ? '' : 's')+'</span>'+
        '<button class="btn btn-primary adm-btn" type="button" id="addAdm">'+svg("plus")+' Add admin</button></div>'+
      '<section class="adm-card adm-flush"><div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>Admin</th><th>Staff code</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Added</th><th class="r">Actions</th></tr></thead><tbody>'+
      admins.map(function (a) {
        var me = String(a.id) === meId;
        return '<tr><td><div class="adm-user"><span class="adm-avatar sm">'+esc((a.name || a.username).charAt(0).toUpperCase())+'</span><div>'+
            '<div class="adm-cell-main">'+esc(a.name || a.username)+(me ? ' <em class="adm-you">you</em>' : '')+'</div><div class="adm-cell-sub">@'+esc(a.username)+'</div></div></div></td>'+
          '<td><span class="adm-code">'+esc(a.staffCode || '—')+'</span></td>'+
          '<td><span class="adm-pill '+esc(a.role)+'">'+esc(roleLabel(a.role))+'</span></td>'+
          '<td>'+pill(a.status === "disabled" ? "disabled" : "active", a.status === "disabled" ? "blocked" : "active")+'</td>'+
          '<td>'+(a.lastLoginAt ? fmtDateTime(a.lastLoginAt) : 'Never')+'</td><td>'+fmtDateTime(a.createdAt)+'</td>'+
          '<td class="r"><div class="adm-actions">'+(me ? '<span class="adm-cell-sub">—</span>' :
            '<button type="button" class="adm-icon-btn" data-edit="'+esc(a.id)+'" aria-label="Edit '+esc(a.username)+'">'+svg("edit")+'</button>'+
            '<button type="button" class="adm-icon-btn danger" data-del="'+esc(a.id)+'" aria-label="Delete '+esc(a.username)+'">'+svg("trash")+'</button>')+
          '</div></td></tr>';
      }).join("")+'</tbody></table></div></section>';
    $("addAdm").onclick = function () { adminForm(null); };
    $("admView").onclick = async function (e) {
      var b = e.target.closest("button[data-edit],button[data-del]"); if (!b) return;
      var a = admins.filter(function (x) { return String(x.id) === (b.dataset.edit || b.dataset.del); })[0];
      if (b.dataset.edit) adminForm(a);
      if (b.dataset.del) {
        if (!confirm('Delete the admin "' + a.username + '"? They will lose access immediately.')) return;
        var r = await api("deleteAdmin", { id: a.id });
        if (!r.ok) { toast(r.error, true); return; }
        toast("Admin deleted"); route();
      }
    };
  }

  function adminForm(a) {
    var isNew = !a; a = a || { username: "", name: "", role: "staff", status: "active" };
    var isMe = !isNew && String(a.id) === String(session.admin && session.admin.id);
    var roleSel = '<select id="aRole"'+(isMe ? ' disabled' : '')+'>'+ADMIN_ROLES.map(function (r) {
      return '<option value="'+r+'"'+((a.role || "staff") === r ? " selected" : "")+'>'+roleLabel(r)+'</option>'; }).join("")+'</select>';
    modal(isNew ? "Add admin" : "Edit admin @" + a.username,
      '<div class="adm-form-cols">'+
        (isNew ? f("aUser", "Username", '<input id="aUser" required maxlength="32" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="e.g. priya">') : '') +
        f("aName", "Display name", '<input id="aName" maxlength="80" value="'+esc(a.name)+'">', isNew ? "" : "full") +
        f("aCode", "Staff code", '<input id="aCode" value="'+esc(isNew ? '' : (a.staffCode || ''))+'"'+(isNew ? ' placeholder="Auto-generated on save (e.g. US445734)"' : '')+' readonly>'+
          (isNew ? '<small>Created automatically — 2 letters + 6 digits.</small>' : '<small>System code — can\'t be changed.</small>'), isNew ? "" : "full") +
        f("aRole", "Role", roleSel + (isMe ? '<small>You can\'t change your own role.</small>' : '')) +
        (isNew ? '' : f("aStatus", "Status", '<select id="aStatus"><option value="active"'+(a.status !== "disabled" ? " selected" : "")+'>Active</option><option value="disabled"'+(a.status === "disabled" ? " selected" : "")+'>Disabled</option></select>')) +
        f("aPw", isNew ? "Password" : "New password <span class=\"opt\">(optional — resets it)</span>",
          '<input id="aPw" type="password" minlength="4" autocomplete="new-password"'+(isNew ? ' required' : '')+' placeholder="At least 4 characters">', "full") +
        (isNew ? '<p class="adm-cell-sub full" style="margin:-4px 0 0">Username: 3–32 characters — letters, numbers, dot, dash or underscore. It can\'t be changed later.</p>' : '') +
      '</div>',
      async function () {
        var pw = $("aPw").value, username = isNew ? AUTH.normId($("aUser").value) : a.username;
        if ((isNew || pw) && pw.length < 4) return "Password must be at least 4 characters.";
        var data = { id: isNew ? undefined : a.id, name: $("aName").value };
        if (!isMe) data.role = $("aRole").value;
        if (isNew) data.username = username;
        else data.status = $("aStatus").value;
        if (pw) data.passwordHash = await adminHash(username, pw);
        var r = await api("saveAdmin", data);
        if (!r.ok) return r.error;
        toast(isNew ? "Admin @" + username + " added" : "Admin saved"); route();
      });
    enhancePasswords(document.querySelector(".adm-modal"));
  }

  function showMyProfile() {
    var me = session.admin || {};
    var row = function (k, v) { return '<div class="adm-prof-row"><span>'+k+'</span><strong>'+v+'</strong></div>'; };
    modal("My profile",
      '<div class="adm-prof">'+
        '<div class="adm-prof-top"><span class="adm-avatar lg">'+esc((me.name || me.username || "A").charAt(0).toUpperCase())+'</span>'+
          '<div><div class="adm-prof-name">'+esc(me.name || me.username || "Admin")+'</div><div class="adm-cell-sub">@'+esc(me.username || "")+'</div></div></div>'+
        row("Role", '<span class="adm-pill '+esc(me.role || "")+'">'+esc(roleLabel(me.role))+'</span>')+
        row("Staff code", '<span class="adm-code">'+esc(me.staffCode || "—")+'</span>')+
        row("Status", esc(cap(me.status || "active")))+
        row("Member since", esc(fmtDate(me.createdAt)))+
      '</div>',
      null, { readOnly: true });
  }

  function changeMyPassword() {
    var me = session.admin || {};
    modal("Change my password",
      '<div class="adm-form-cols">'+
        f("cpCur", "Current password", '<input id="cpCur" type="password" autocomplete="current-password" required>', "full") +
        f("cpNew", "New password", '<input id="cpNew" type="password" minlength="4" autocomplete="new-password" required placeholder="At least 4 characters">', "full") +
        f("cpNew2", "Repeat new password", '<input id="cpNew2" type="password" autocomplete="new-password" required>', "full") +
      '</div>',
      async function () {
        var cur = $("cpCur").value, n1 = $("cpNew").value, n2 = $("cpNew2").value;
        if (!cur) return "Enter your current password.";
        if (n1.length < 4) return "New password must be at least 4 characters.";
        if (n1 !== n2) return "The new passwords don't match.";
        var r = await api("changePassword", { currentHash: await adminHash(me.username, cur), newHash: await adminHash(me.username, n1) });
        if (!r.ok) return r.error;
        toast("Password changed");
      });
    enhancePasswords(document.querySelector(".adm-modal"));
  }

  /* --------------------------------- modal -------------------------------- */
  function modal(title, body, onSave, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "adm-modal-back";
    wrap.innerHTML = '<form class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="mTitle" novalidate>'+
      '<div class="adm-modal-head"><h2 id="mTitle">'+esc(title)+'</h2><button type="button" class="adm-icon-btn" data-close aria-label="Close">'+svg("close", 20)+'</button></div>'+
      '<div class="adm-modal-body"><div id="mMsg"></div>'+body+'</div>'+
      '<div class="adm-modal-foot">'+(opts.readOnly
        ? '<button type="button" class="btn btn-primary" data-close>Close</button>'
        : '<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary" id="mSave">'+esc(opts.saveLabel || "Save")+'</button>')+'</div>'+
      '<div class="adm-busy" aria-hidden="true"><span class="spinner lg"></span><span class="adm-busy-txt">'+esc(opts.busyLabel || "Saving…")+'</span></div>'+
    '</form>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add("no-scroll");
    var close = function () { wrap.remove(); document.documentElement.classList.remove("no-scroll"); document.removeEventListener("keydown", onKey); };
    var onKey = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) close(); });
    wrap.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = close; });
    var first = wrap.querySelector("input,select,textarea"); if (first) first.focus();
    var form = wrap.querySelector("form");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!onSave) { close(); return; }
      var save = $("mSave");
      save.disabled = true;
      save.innerHTML = '<span class="spinner sm"></span> ' + esc(opts.busyLabel || "Saving…");
      // Lock the dialog and show a processing overlay (the save may upload an
      // image to Drive, which takes a moment) so it never looks frozen.
      form.classList.add("busy");
      wrap.querySelectorAll("[data-close]").forEach(function (b) { b.disabled = true; });
      var err;
      try { err = await onSave(); } catch (x) { err = x.message; }
      if (err) {
        save.disabled = false; save.textContent = opts.saveLabel || "Save";
        form.classList.remove("busy");
        wrap.querySelectorAll("[data-close]").forEach(function (b) { b.disabled = false; });
        $("mMsg").innerHTML = '<div class="msg err" role="alert">'+esc(err)+'</div>';
        wrap.querySelector(".adm-modal-body").scrollTop = 0;
      } else close();
    });
  }

  // Same show/hide control as the shop (the admin page doesn't load ui.js).
  function enhancePasswords(root) {
    root.querySelectorAll('input[type="password"]').forEach(function (input) {
      if (input.dataset.pwToggle) return; input.dataset.pwToggle = "1";
      var wrap = document.createElement("span"); wrap.className = "pw-wrap";
      input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
      var b = document.createElement("button"); b.type = "button"; b.className = "pw-toggle";
      b.setAttribute("aria-label", "Show password"); b.innerHTML = svg("eye", 20);
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = function () {
        var show = input.type === "password"; input.type = show ? "text" : "password";
        b.innerHTML = svg(show ? "eyeOff" : "eye", 20); b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      };
      wrap.appendChild(b);
    });
  }

  return { init: init };
})();
