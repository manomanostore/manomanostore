/* =============================== UI shell ================================ */
(function () {
  var C = window.CONFIG;
  var ic = {
    search:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
    user:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    cart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L21 7H6"/></svg>',
    menu:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    home:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    grid:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    tag:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l8-8 10 10-8 8z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    close:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    truck:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></svg>',
    shield:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>',
    card:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    star:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/></svg>'
  };
  var LOGO = '<img class="logo" src="images/logo-192.png" alt="" width="36" height="36">';

  function esc(s){return String(s==null?"":s).replace(/[<&>"]/g,function(m){return{"<":"&lt;","&":"&amp;",">":"&gt;",'"':"&quot;"}[m];});}
  function brandMarkup(){ // bold the tail of the brand name in the accent colour
    var n = C.BRAND_NAME, cut = Math.min(Math.ceil(n.length/2), n.length-1);
    if (n.length < 2) return esc(n);
    return esc(n.slice(0,cut)) + "<b>" + esc(n.slice(cut)) + "</b>";
  }

  function navLink(key, label, href, on) {
    return '<a class="nav-link'+(on ? ' active' : '')+'" href="'+href+'" data-i18n="'+key+'"'+(on ? ' aria-current="page"' : '')+'>'+esc(label)+'</a>';
  }

  // Language dropdown (flags) — sits just before the account icon.
  function langSwitch() {
    return '<div class="lang-switch" id="langSwitch">'+
      '<button class="icon-btn lang-btn" id="langBtn" type="button" aria-haspopup="true" aria-expanded="false" data-i18n-al="lang.label">'+
        '<span class="lang-cur" id="langCur"></span>'+
      '</button>'+
      '<div class="lang-menu" id="langMenu" role="menu" hidden></div>'+
    '</div>';
  }

  function header(active) {
    return '' +
    '<header class="app">' +
      '<div class="app-top"><div class="app-bar">' +
        '<button class="icon-btn" id="menuBtn" data-i18n-al="a11y.menu" aria-label="Menu">'+ic.menu+'</button>'+
        '<a class="brand" href="index.html">'+LOGO+'<span>'+brandMarkup()+'</span></a>'+
        '<form class="search" id="searchForm" role="search">'+ic.search+
          '<input id="searchInput" type="search" placeholder="What are you looking for?" data-i18n-ph="search.ph" aria-label="Search products" autocomplete="off">'+
        '</form>'+
        langSwitch()+
        '<a class="icon-btn" href="'+(sellerSess() ? "seller-dashboard.html" : "login.html")+'" data-i18n-al="a11y.account" aria-label="Account">'+ic.user+'</a>'+
        '<a class="icon-btn" href="cart.html" data-i18n-al="a11y.basket" aria-label="Basket">'+ic.cart+'<span class="cart-count" data-cart-count hidden>0</span></a>'+
      '</div></div>'+
      '<div class="nav-row"><nav class="scroll-x nav-links" aria-label="Main menu">'+
        navLink("nav.home", "Home", "index.html", active === "home") +
        navLink("nav.flash", "Flash Sale", "deals.html", active === "deals") +
        navLink("nav.blogs", "Blogs", "blog.html", active === "blog") +
        navLink("nav.brands", "All Brands", "brands.html", active === "brands") +
        navLink("nav.cats", "All categories", "category.html", active === "cats") +
      '</nav></div>'+
    '</header>';
  }

  function bottomNav(active) {
    function a(key, href, i18n, label, icon) {
      return '<a href="'+href+'" class="'+(active===key?'active':'')+'">'+icon+
        '<span data-i18n="'+i18n+'">'+label+'</span></a>';
    }
    // The basket is a raised circular button in the centre (like big retail apps).
    var cart = '<a href="cart.html" class="bn-cart'+(active==="cart"?" active":"")+'" aria-label="Basket">'+
      '<span class="bn-cart-btn">'+ic.cart+'<span class="nc" data-cart-count hidden>0</span></span>'+
      '<span data-i18n="bn.basket">Basket</span></a>';
    return '<nav class="bottom-nav">'+
      a('home','index.html','bn.home','Home',ic.home)+
      a('cats','category.html','bn.cats','Categories',ic.grid)+
      cart+
      a('deals','deals.html','bn.deals','Deals',ic.tag)+
      a('account','login.html','bn.account','Account',ic.user)+
    '</nav>';
  }

  function footer() {
    function links(arr) { return arr.map(function (l) { return '<a href="'+l[2]+'" data-i18n="'+l[0]+'">'+l[1]+'</a>'; }).join(''); }
    var col1 = [['foot.track','Track orders','account.html'],['foot.returns','Return or withdrawal','#'],['foot.help','Need help?','#'],['foot.contact','Contact us','#'],['foot.report','Report illicit content','#'],['foot.seller','Become a seller','sell.html'],['foot.joinus','Join Us','#'],['foot.affiliate','Affiliate Program','#'],['foot.coupons','Terms and conditions of use of coupons','#']];
    var col2 = [['foot.advice','Our advice','blog.html'],['foot.popcats','The most popular product categories','category.html'],['foot.compare','Our comparisons','#'],['foot.brands','Our brands','brands.html'],['foot.best','Best sellers','deals.html']];

    // Country flags (International) — inline SVG circular flags render the same on
    // every OS (emoji flags don't on Windows/Chrome).
    function circleFlag(code, label) {
      var id = "flg_" + code, gid = "glo_" + code, s;
      if (code === "fr") s = '<rect width="13.33" height="40" fill="#0055A4"/><rect x="13.33" width="13.34" height="40" fill="#fff"/><rect x="26.67" width="13.33" height="40" fill="#EF4135"/>';
      else if (code === "it") s = '<rect width="13.33" height="40" fill="#008C45"/><rect x="13.33" width="13.34" height="40" fill="#F4F5F0"/><rect x="26.67" width="13.33" height="40" fill="#CD212A"/>';
      else if (code === "de") s = '<rect width="40" height="13.33" fill="#0A0A0A"/><rect y="13.33" width="40" height="13.34" fill="#DD0000"/><rect y="26.67" width="40" height="13.33" fill="#FFCE00"/>';
      else s = '<rect width="40" height="10" fill="#AD1519"/><rect y="10" width="40" height="20" fill="#FABD00"/><rect y="30" width="40" height="10" fill="#AD1519"/>';
      return '<svg viewBox="0 0 40 40" width="40" height="40" role="img" aria-label="'+label+'">'+
        '<defs><clipPath id="'+id+'"><circle cx="20" cy="20" r="20"/></clipPath>'+
          '<radialGradient id="'+gid+'" cx="34%" cy="28%" r="72%">'+
            '<stop offset="0%" stop-color="#fff" stop-opacity=".42"/><stop offset="42%" stop-color="#fff" stop-opacity="0"/>'+
            '<stop offset="100%" stop-color="#000" stop-opacity=".16"/></radialGradient></defs>'+
        '<g clip-path="url(#'+id+')">'+s+'<circle cx="20" cy="20" r="20" fill="url(#'+gid+')"/></g>'+
        '<circle cx="20" cy="20" r="19.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/></svg>';
    }
    var flags = [['fr','France'],['it','Italy'],['de','Germany'],['es','Spain']]
      .map(function (f) { return '<a href="#" class="ft-flag" aria-label="'+f[1]+'">'+circleFlag(f[0], f[1])+'</a>'; }).join('');

    // Secure-payment tiles — small brand marks on white.
    var appleBlack = '<svg viewBox="0 0 24 24" width="13" height="13" fill="#000" aria-hidden="true"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.3 5.6c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.3z"/></svg>';
    var pay = [
      '<span class="pay-tile"><span class="pl-visa">VISA</span></span>',
      '<span class="pay-tile"><span class="pl-mc"><i></i><i></i></span></span>',
      '<span class="pay-tile klarna"><span class="pl-klarna">Klarna</span></span>',
      '<span class="pay-tile"><span class="pl-pp">Pay<span>Pal</span></span></span>',
      '<span class="pay-tile"><span class="pl-apay">'+appleBlack+'Pay</span></span>',
      '<span class="pay-tile"><span class="pl-gpay"><b>G</b>Pay</span></span>'
    ].join('');

    // Social icons
    function soc(label, path) { return '<a href="#" class="ft-soc" aria-label="'+label+'"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'+path+'</svg></a>'; }
    var social =
      soc('LinkedIn','<path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.4 2.63 4.4 6V21h-4v-5.3c0-1.26-.03-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V21h-4z"/>') +
      soc('Facebook','<path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/>') +
      soc('Instagram','<path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.8 3.8 0 01-1.38-.9 3.8 3.8 0 01-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.14 0-3.5 0-4.74.07-.9.04-1.38.2-1.7.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.32-.28.8-.32 1.7C3.42 8.95 3.4 9.3 3.4 12s0 3.05.07 4.26c.04.9.2 1.38.32 1.7.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.12.8.28 1.7.32 1.24.07 1.6.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.2 1.7-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.32.28-.8.32-1.7.07-1.21.07-1.56.07-4.26s0-3.05-.07-4.26c-.04-.9-.2-1.38-.32-1.7a2.85 2.85 0 00-.69-1.06 2.85 2.85 0 00-1.06-.69c-.32-.12-.8-.28-1.7-.32C15.5 4 15.14 4 12 4zm0 3.06A4.94 4.94 0 1112 17a4.94 4.94 0 010-9.88zm0 1.8a3.14 3.14 0 100 6.28 3.14 3.14 0 000-6.28zm5.14-.9a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z"/>') +
      soc('Pinterest','<path d="M12 2a10 10 0 00-3.6 19.3c-.08-.78-.15-1.98.03-2.83.16-.74 1.05-4.7 1.05-4.7s-.27-.54-.27-1.33c0-1.25.72-2.18 1.62-2.18.76 0 1.13.57 1.13 1.26 0 .77-.49 1.92-.74 2.98-.21.9.45 1.63 1.33 1.63 1.6 0 2.83-1.69 2.83-4.12 0-2.15-1.55-3.66-3.76-3.66-2.56 0-4.07 1.92-4.07 3.9 0 .77.3 1.6.67 2.05.07.09.08.17.06.26l-.25 1c-.04.17-.13.2-.3.12-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.4 5.9-5.4 3.1 0 5.51 2.21 5.51 5.16 0 3.08-1.94 5.56-4.64 5.56-.9 0-1.76-.47-2.05-1.03l-.56 2.13c-.2.78-.75 1.76-1.11 2.36A10 10 0 1012 2z"/>');

    var html = '<footer class="app"><div class="cols">'+
      '<div><h4 data-i18n="foot.information">Information &amp; Contact</h4>'+links(col1)+'</div>'+
      '<div><h4 data-i18n="foot.more">Find Out More</h4>'+links(col2)+
        '<h4 style="margin-top:18px" data-i18n="foot.international">International</h4><div class="ft-flags">'+flags+'</div></div>'+
      '<div>'+
        '<h4><span data-i18n="foot.app">The application</span></h4>'+
        '<div class="ft-apps">'+
          '<a href="https://play.google.com/store" target="_blank" rel="noopener" class="ft-appimg" aria-label="Get it on Google Play"><img src="images/googleplay.png" alt="Get it on Google Play"></a>'+
          '<a href="https://www.apple.com/app-store/" target="_blank" rel="noopener" class="ft-appimg" aria-label="Download on the App Store"><img src="images/appstore.svg" alt="Download on the App Store"></a>'+
        '</div>'+
        '<h4 style="margin-top:20px" data-i18n="foot.secure">Secure payment</h4><div class="pay">'+pay+'</div>'+
        '<h4 style="margin-top:20px" data-i18n="foot.conversation">Join the conversation!</h4><div class="ft-socials">'+social+'</div>'+
      '</div>'+
    '</div>'+
    '</footer>'+
    // Awards strip (white band)
    '<div class="ft-awards"><div class="ft-awards-in">'+
      '<img src="images/award-1.png" alt="Retail Systems Awards 2022 — Winner">'+
      '<img src="images/award-2.png" alt="DIY Week Awards 2023">'+
      '<img src="images/award-3.png" alt="Online Retailer Awards 2022 — Winner">'+
      '<img src="images/award-4.png" alt="Retail Systems Awards 2021 — Winner">'+
    '</div></div>'+
    // Bottom legal bar
    '<div class="ft-legalbar">'+
      '<div class="ft-copy">© '+new Date().getFullYear()+' '+esc(C.BRAND_NAME)+'</div>'+
      '<nav class="ft-legal">'+
        ['Manage cookies','Sitemap','Legal Notice','Data Protection Policy','Trust Center','Terms and conditions','Consumer information']
          .map(function (t) { return '<a href="#">'+t+'</a>'; }).join('')+
      '</nav>'+
    '</div>';
    return html;
  }

  // The drawer renders immediately; its category list fills in when the catalog
  // arrives, so a slow or failed catalog load never delays the page.
  // Signed-in seller (shared with the dashboard via the "mm_seller" key).
  function sellerSess() { try { return JSON.parse(localStorage.getItem("mm_seller") || "null"); } catch (e) { return null; } }

  function drawer() {
    var s = sellerSess();
    var account = s
      ? '<a class="d-item" href="seller-dashboard.html"><span class="di">'+ic.user+'<span data-i18n="drawer.dash">Seller Dashboard</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="seller-dashboard.html#products"><span class="di">'+ic.tag+'<span data-i18n="drawer.myproducts">My Products</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="seller-dashboard.html#wallet"><span class="di">'+ic.tag+'<span data-i18n="drawer.wallet">My Wallet</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="#" id="drawerLogout"><span class="di">'+ic.user+'<span data-i18n="drawer.logout">Log out</span></span>'+ic.chev+'</a>'
      : '<a class="d-item" href="login.html"><span class="di">'+ic.user+'<span data-i18n="drawer.signin">Sign in / Register</span></span>'+ic.chev+'</a>';
    return '<div class="drawer-back" id="drawerBack"></div>'+
      '<aside class="drawer" id="drawer">'+
        '<div class="d-head"><strong style="font-size:18px"><span data-i18n="drawer.browse">Browse</span> '+esc(C.BRAND_NAME)+'</strong>'+
          '<button class="icon-btn" id="drawerClose" style="color:var(--ink)">'+ic.close+'</button></div>'+
        '<h3 data-i18n="drawer.catalog">Catalog</h3><div id="drawerCats"></div>'+
        '<h3 data-i18n="drawer.account">Account</h3>'+
        account +
        '<a class="d-item" href="deals.html"><span class="di">'+ic.tag+'<span data-i18n="drawer.today">Today\'s deals</span></span>'+ic.chev+'</a>'+
      '</aside>';
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function updateCartBadges() {
    var n = CART.count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n; el.hidden = n === 0;
    });
  }

  async function mount(opts) {
    opts = opts || {};
    document.getElementById("site-header").innerHTML = header(opts.active);
    document.getElementById("site-footer").innerHTML = footer();
    // Floating "back to top" — appears once the page is scrolled down.
    if (!document.getElementById("scrollTop")) {
      var st = document.createElement("button");
      st.id = "scrollTop"; st.className = "scroll-top"; st.type = "button"; st.setAttribute("aria-label", "Back to top");
      st.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
      document.body.appendChild(st);
      st.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
      var onScroll = function () { st.classList.toggle("show", (window.scrollY || document.documentElement.scrollTop) > 400); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    supportWidget();
    document.body.insertAdjacentHTML("beforeend", bottomNav(opts.active));
    document.body.insertAdjacentHTML("beforeend", drawer());
    DATA.categories().then(function (cats) {
      document.getElementById("drawerCats").innerHTML = cats.map(function (c) {
        return '<a class="d-item" href="category.html?cat='+c.id+'"><span class="di">'+
          '<span style="width:34px;height:34px;border-radius:9px;display:inline-grid;place-items:center;background:'+c.color+'22;color:'+c.color+'">'+ic.tag+'</span>'+
          esc(c.name)+'</span>'+ic.chev+'</a>';
      }).join('');
    }).catch(function (e) { console.warn("Catalog unavailable:", e); });

    // search
    var form = document.getElementById("searchForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = document.getElementById("searchInput").value.trim();
      location.href = "category.html?q=" + encodeURIComponent(q);
    });

    // drawer open/close
    function openD(){document.getElementById("drawer").classList.add("open");document.getElementById("drawerBack").classList.add("open");}
    function closeD(){document.getElementById("drawer").classList.remove("open");document.getElementById("drawerBack").classList.remove("open");}
    ["menuBtn","menuBtn2"].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener("click",openD);});
    document.getElementById("drawerClose").addEventListener("click",closeD);
    document.getElementById("drawerBack").addEventListener("click",closeD);
    var dLogout = document.getElementById("drawerLogout");
    if (dLogout) dLogout.addEventListener("click", function (e) { e.preventDefault(); try { localStorage.removeItem("mm_seller"); } catch (x) {} location.href = "index.html"; });

    languageSwitcher();
    updateCartBadges();
    document.addEventListener("cart:change", updateCartBadges);
    stickyHeader();
    passwordToggles();
    I18N.apply(document);   // immediate pass so there's no English flash in Hindi
  }

  // Wire the header language dropdown (flags). Selecting a language re-applies
  // translations in place — no reload — via I18N.
  function languageSwitcher() {
    var sw = document.getElementById("langSwitch"); if (!sw) return;
    var btn = document.getElementById("langBtn"), menu = document.getElementById("langMenu"), cur = document.getElementById("langCur");
    var langs = I18N.langs;
    sw.classList.add("notranslate"); sw.setAttribute("translate", "no");   // language names stay in their own language
    menu.innerHTML = Object.keys(langs).map(function (l) {
      return '<button type="button" class="lang-opt" role="menuitem" data-lang="'+l+'">'+
        '<span class="lang-flag">'+langs[l].flag+'</span><span class="lang-nm">'+esc(langs[l].name)+'<small>'+esc(langs[l].country)+'</small></span></button>';
    }).join("");
    function paint() {
      var l = I18N.get();
      cur.innerHTML = '<span class="lang-flag">'+langs[l].flag+'</span><span class="lang-code">'+esc(langs[l].code)+'</span>';
      menu.querySelectorAll(".lang-opt").forEach(function (o) { o.classList.toggle("on", o.dataset.lang === l); });
    }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden ? open() : close(); });
    menu.addEventListener("click", function (e) { var o = e.target.closest(".lang-opt"); if (!o) return; I18N.setLang(o.dataset.lang); close(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("i18n:change", paint);
    paint();
  }

  // Show/hide button on every password field on every page — including fields
  // added later (e.g. the Edit profile form), via a MutationObserver.
  var EYE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

  function enhancePassword(input) {
    if (input.dataset.pwToggle) return;
    input.dataset.pwToggle = "1";
    var wrap = document.createElement("span"); wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "pw-toggle";
    btn.setAttribute("aria-label", "Show password"); btn.setAttribute("aria-pressed", "false");
    if (input.id) btn.setAttribute("aria-controls", input.id);
    btn.innerHTML = EYE;
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep focus in the field
    btn.addEventListener("click", function () {
      var show = input.type === "password";
      var start = input.selectionStart, end = input.selectionEnd;
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
      if (document.activeElement === input && start != null) { try { input.setSelectionRange(start, end); } catch (e) {} }
    });
    wrap.appendChild(btn);
  }
  function passwordToggles() {
    var scan = function (root) {
      if (root.matches && root.matches('input[type="password"]')) enhancePassword(root);
      if (root.querySelectorAll) root.querySelectorAll('input[type="password"]').forEach(enhancePassword);
    };
    scan(document.body);
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Pinned header: the search bar always stays visible; the category row slides
  // away while scrolling down and returns on scroll up (like big retail sites).
  function stickyHeader() {
    var wrap = document.getElementById("site-header");
    var navRow = wrap && wrap.querySelector(".nav-row");
    if (!wrap || !navRow) return;
    var root = document.documentElement, lastY = window.scrollY, ticking = false;

    function setVisible() {
      var full = wrap.offsetHeight;
      var hidden = wrap.classList.contains("compact") ? navRow.offsetHeight : 0;
      root.style.setProperty("--header-visible", (full - hidden) + "px");
    }
    function update() {
      ticking = false;
      var y = Math.max(0, window.scrollY), dy = y - lastY;
      wrap.classList.toggle("scrolled", y > 4);
      if (Math.abs(dy) < 8) return;              // ignore tiny jitters
      var compact = dy > 0 && y > wrap.offsetHeight;
      if (compact !== wrap.classList.contains("compact")) {
        wrap.classList.toggle("compact", compact);
        setVisible();
      }
      lastY = y;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", setVisible);
    // Keep the full header visible while typing a search.
    var input = document.getElementById("searchInput");
    if (input) input.addEventListener("focus", function () { wrap.classList.remove("compact"); setVisible(); });
    setVisible(); update();
  }

  /* ---------------- Floating support chat (every shop page) ----------------
     Bottom-right button → chat popup. Signed-in sellers chat live with the
     support team (same conversation as Conversations in their dashboard);
     anyone else is asked to sign in / become a seller. chat.js only loads
     the first time the popup opens. */
  var CHAT_V = "20261127zb", spPanel = null, spChat = null;
  function tr(k, fb) { var v = window.I18N ? I18N.t(k) : k; return v && v !== k ? v : fb; }
  function chatPost(body) {
    return fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.CHAT) return res();
      var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function spSetBadge(n) {
    var b = document.querySelector("#spFab .sp-badge"); if (!b) return;
    b.hidden = !(n > 0); b.textContent = n > 99 ? "99+" : String(n);
  }
  function supportWidget() {
    if (document.getElementById("spFab")) return;
    if (!document.querySelector("link[data-chatcss]")) {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "css/chat.css?v=" + CHAT_V; l.setAttribute("data-chatcss", "");
      document.head.appendChild(l);
    }
    var label = tr("sd.chatwithus", "Chat with support");
    var fab = document.createElement("button");
    fab.type = "button"; fab.id = "spFab"; fab.className = "sp-fab on-site sp-site"; fab.setAttribute("aria-label", label);
    fab.innerHTML = '<img src="images/support-agent-site.svg" alt=""><span class="sp-dot"></span><span class="sp-badge" hidden>0</span><span class="sp-tip">' + esc(label) + "</span>";
    fab.addEventListener("click", function () { if (spPanel && !spPanel.hidden) spClose(); else spOpen(); });
    document.body.appendChild(fab);
    document.body.classList.add("has-sp-fab");
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && spPanel && !spPanel.hidden) spClose(); });
    // unread replies for a signed-in seller (one quick check per page)
    var s = sellerSess();
    if (s && s.token && CONFIG.API_URL)
      chatPost({ action: "sellerChat", token: s.token, sinceId: 1e15, mark: "delivered" }).then(function (j) { if (j && j.ok) spSetBadge(Number(j.unread) || 0); }, function () {});
  }
  function spGuest() {
    var next = encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search);
    spChat = null;
    spPanel.innerHTML = '<div class="sp-guest">' +
      '<div class="sp-ghead"><img src="images/support-agent-site.svg" alt=""><div><b>' + esc(CONFIG.BRAND_NAME + " " + tr("sd.support", "Support")) + "</b>" +
        "<small>" + esc(tr("sd.chatsub", "Support team · usually replies within a few minutes")) + "</small></div></div>" +
      '<button type="button" class="sp-close" aria-label="Close">' + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<div class="sp-gbody"><div class="sp-gic">💬</div><h4>' + esc(tr("sp.guesttitle", "Chat with our support team")) + "</h4>" +
        "<p>" + esc(tr("sp.guesttext", "Sign in to your seller account to chat with us — we usually reply within a few minutes.")) + "</p>" +
        '<div class="sp-gbtns"><a class="pri" href="login.html?next=' + next + '">' + esc(tr("sp.signin", "Sign in to chat")) + "</a>" +
        '<a class="sec" href="sell.html">' + esc(tr("sp.become", "Become a seller")) + "</a></div></div></div>";
  }
  async function spOpen() {
    if (!spPanel) {
      spPanel = document.createElement("div"); spPanel.className = "sp-panel sp-site"; spPanel.setAttribute("role", "dialog"); spPanel.setAttribute("aria-label", tr("sd.chatwithus", "Chat with support"));
      spPanel.addEventListener("click", function (e) { if (e.target.closest(".sp-close")) spClose(); });
      document.body.appendChild(spPanel);
    }
    spPanel.hidden = false;
    var s = sellerSess();
    if (!(s && s.token && CONFIG.API_URL)) { spGuest(); return; }
    if (spChat) { spChat.refresh(); return; }
    spPanel.innerHTML = '<div class="ct-loading" style="margin:auto;padding:40px;font:500 14px system-ui;color:#8792a6">…</div>';
    try { await loadScript("js/chat.js?v=" + CHAT_V); } catch (e) { spPanel.innerHTML = '<p style="margin:auto;padding:30px">Chat is unavailable right now.</p>'; return; }
    spPanel.innerHTML = '<button type="button" class="sp-close" aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div id="spChatRoot"></div>';
    spChat = CHAT.create({
      root: document.getElementById("spChatRoot"), me: "seller", lang: (window.I18N && I18N.get()) || "en",
      header: { title: CONFIG.BRAND_NAME + " " + tr("sd.support", "Support"), avatar: "images/support-agent-site.svg", online: true,
                subtitle: '<span class="ct-live"></span>' + esc(tr("sd.chatsub", "Support team · usually replies within a few minutes")) },
      their: { avatar: "images/support-agent-site.svg" },
      fetch: function (sinceId, mark) { return chatPost({ action: "sellerChat", token: s.token, sinceId: sinceId, mark: mark }); },
      send: function (m) { return chatPost({ action: "sellerChatSend", token: s.token, text: m.text, images: m.images }); },
      onBack: spClose,
      onAuth: function () { try { localStorage.removeItem("mm_seller"); } catch (e) {} if (spChat) spChat.destroy(); spGuest(); }
    });
    spSetBadge(0);
  }
  function spClose() { if (spPanel) spPanel.hidden = true; }

  window.UI = { mount: mount, toast: toast, icons: ic, esc: esc, updateCartBadges: updateCartBadges };
})();
