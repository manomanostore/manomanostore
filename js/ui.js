/* ============================ i18n (EN / HI) ============================ */
/* Lightweight two-language layer. Mark any element with data-i18n="key"
   (textContent), data-i18n-ph="key" (placeholder) or data-i18n-al="key"
   (aria-label); I18N.apply() fills them for the current language, and a
   MutationObserver auto-translates anything added later (dynamic cards, other
   pages). Product data from the sheet stays in its original language. */
window.I18N = (function () {
  var KEY = "mm_lang";
  var LANGS = { en: { name: "English", flag: "🇬🇧", code: "EN" }, hi: { name: "हिन्दी", flag: "🇮🇳", code: "HI" } };
  var DICT = {
    en: {
      "nav.home": "Home", "nav.flash": "Flash Sale", "nav.blogs": "Blogs", "nav.brands": "All Brands", "nav.cats": "All categories",
      "search.ph": "What are you looking for?", "lang.label": "Language", "a11y.account": "Account", "a11y.basket": "Basket", "a11y.menu": "Menu",
      "foot.information": "Information", "foot.track": "Track orders", "foot.returns": "Returns", "foot.help": "Need help?", "foot.contact": "Contact us", "foot.seller": "Become a seller",
      "foot.more": "Find out more", "foot.advice": "Our advice", "foot.popcats": "Popular categories", "foot.best": "Best sellers", "foot.brands": "Our brands", "foot.secure": "Secure payment",
      "drawer.browse": "Browse", "drawer.catalog": "Catalog", "drawer.account": "Account", "drawer.signin": "Sign in / Register", "drawer.today": "Today's deals",
      "bn.home": "Home", "bn.cats": "Categories", "bn.deals": "Deals", "bn.basket": "Basket", "bn.account": "Account",
      "home.today": "Today's Deals", "home.hot": "Hot", "home.seeall": "See all deals ›", "home.topsel": "Our top selection",
      "home.best": "Our best sellers", "home.seeall2": "See all", "home.shopcat": "Shop by category", "home.finds": "Today's best finds",
      "home.sponsored": "Sponsored", "home.brands": "Our biggest brands", "cta.add": "Add"
    },
    hi: {
      "nav.home": "होम", "nav.flash": "फ्लैश सेल", "nav.blogs": "ब्लॉग", "nav.brands": "सभी ब्रांड", "nav.cats": "सभी श्रेणियाँ",
      "search.ph": "आप क्या ढूँढ रहे हैं?", "lang.label": "भाषा", "a11y.account": "खाता", "a11y.basket": "बास्केट", "a11y.menu": "मेन्यू",
      "foot.information": "जानकारी", "foot.track": "ऑर्डर ट्रैक करें", "foot.returns": "रिटर्न", "foot.help": "मदद चाहिए?", "foot.contact": "संपर्क करें", "foot.seller": "विक्रेता बनें",
      "foot.more": "और जानें", "foot.advice": "हमारी सलाह", "foot.popcats": "लोकप्रिय श्रेणियाँ", "foot.best": "बेस्ट सेलर", "foot.brands": "हमारे ब्रांड", "foot.secure": "सुरक्षित भुगतान",
      "drawer.browse": "ब्राउज़ करें", "drawer.catalog": "कैटलॉग", "drawer.account": "खाता", "drawer.signin": "साइन इन / रजिस्टर", "drawer.today": "आज के ऑफ़र",
      "bn.home": "होम", "bn.cats": "श्रेणियाँ", "bn.deals": "ऑफ़र", "bn.basket": "बास्केट", "bn.account": "खाता",
      "home.today": "आज के ऑफ़र", "home.hot": "हॉट", "home.seeall": "सभी ऑफ़र देखें ›", "home.topsel": "हमारा शीर्ष चयन",
      "home.best": "हमारे बेस्ट सेलर", "home.seeall2": "सभी देखें", "home.shopcat": "श्रेणी अनुसार खरीदें", "home.finds": "आज की बेहतरीन खोज",
      "home.sponsored": "प्रायोजित", "home.brands": "हमारे सबसे बड़े ब्रांड", "cta.add": "जोड़ें"
    }
  };
  var lang = read();
  function read() { try { var l = localStorage.getItem(KEY); return LANGS[l] ? l : "en"; } catch (e) { return "en"; } }
  function t(k) { var d = DICT[lang] || {}; return d[k] != null ? d[k] : (DICT.en[k] != null ? DICT.en[k] : k); }
  function one(el) {
    var k = el.getAttribute("data-i18n"); if (k != null) el.textContent = t(k);
    var p = el.getAttribute("data-i18n-ph"); if (p != null) el.setAttribute("placeholder", t(p));
    var a = el.getAttribute("data-i18n-al"); if (a != null) el.setAttribute("aria-label", t(a));
  }
  function apply(root) {
    root = root || document;
    if (root.nodeType === 1 && (root.hasAttribute("data-i18n") || root.hasAttribute("data-i18n-ph") || root.hasAttribute("data-i18n-al"))) one(root);
    if (root.querySelectorAll) root.querySelectorAll("[data-i18n],[data-i18n-ph],[data-i18n-al]").forEach(one);
  }
  function setLang(l) {
    if (!LANGS[l] || l === lang) return;
    lang = l; try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.setAttribute("lang", l);
    apply(document);
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: l } }));
  }
  document.documentElement.setAttribute("lang", lang);
  if ("MutationObserver" in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) apply(n); }); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  return { t: t, apply: apply, setLang: setLang, get: function () { return lang; }, langs: LANGS };
})();

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
        '<a class="icon-btn" href="login.html" data-i18n-al="a11y.account" aria-label="Account">'+ic.user+'</a>'+
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
    function a(key, href, i18n, label, icon, badge) {
      return '<a href="'+href+'" class="'+(active===key?'active':'')+'">'+icon+
        (badge?'<span class="nc" data-cart-count hidden>0</span>':'')+'<span data-i18n="'+i18n+'">'+label+'</span></a>';
    }
    return '<nav class="bottom-nav">'+
      a('home','index.html','bn.home','Home',ic.home)+
      a('cats','category.html','bn.cats','Categories',ic.grid)+
      a('deals','deals.html','bn.deals','Deals',ic.tag)+
      a('cart','cart.html','bn.basket','Basket',ic.cart,true)+
      a('account','login.html','bn.account','Account',ic.user)+
    '</nav>';
  }

  function footer() {
    var cols = [
      ['foot.information', 'Information', [['foot.track','Track orders','account.html'],['foot.returns','Returns','#'],['foot.help','Need help?','#'],['foot.contact','Contact us','#'],['foot.seller','Become a seller','sell.html']]],
      ['foot.more', 'Find out more', [['foot.advice','Our advice','blog.html'],['foot.popcats','Popular categories','category.html'],['foot.best','Best sellers','deals.html'],['foot.brands','Our brands','brands.html']]]
    ];
    var html = '<footer class="app"><div class="cols">';
    cols.forEach(function (c) {
      html += '<div><h4 data-i18n="'+c[0]+'">'+c[1]+'</h4>'+c[2].map(function (l) { return '<a href="'+l[2]+'" data-i18n="'+l[0]+'">'+l[1]+'</a>'; }).join('')+'</div>';
    });
    html += '<div><h4 data-i18n="foot.secure">Secure payment</h4><div class="pay">'+
      ['VISA','MC','AMEX','PayPal','G Pay','Pay'].map(function(p){return '<span>'+p+'</span>';}).join('')+
      '</div><p style="margin-top:16px;font-size:13px">'+esc(C.BRAND_TAGLINE)+'</p></div>';
    html += '</div><div class="copy">© '+new Date().getFullYear()+' '+esc(C.BRAND_NAME)+' · Demo store. All products & imagery are original placeholders.</div></footer>';
    return html;
  }

  // The drawer renders immediately; its category list fills in when the catalog
  // arrives, so a slow or failed catalog load never delays the page.
  function drawer() {
    return '<div class="drawer-back" id="drawerBack"></div>'+
      '<aside class="drawer" id="drawer">'+
        '<div class="d-head"><strong style="font-size:18px"><span data-i18n="drawer.browse">Browse</span> '+esc(C.BRAND_NAME)+'</strong>'+
          '<button class="icon-btn" id="drawerClose" style="color:var(--ink)">'+ic.close+'</button></div>'+
        '<h3 data-i18n="drawer.catalog">Catalog</h3><div id="drawerCats"></div>'+
        '<h3 data-i18n="drawer.account">Account</h3>'+
        '<a class="d-item" href="login.html"><span class="di">'+ic.user+'<span data-i18n="drawer.signin">Sign in / Register</span></span>'+ic.chev+'</a>'+
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
    menu.innerHTML = Object.keys(langs).map(function (l) {
      return '<button type="button" class="lang-opt" role="menuitem" data-lang="'+l+'">'+
        '<span class="lang-flag">'+langs[l].flag+'</span><span>'+esc(langs[l].name)+'</span></button>';
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

  window.UI = { mount: mount, toast: toast, icons: ic, esc: esc, updateCartBadges: updateCartBadges };
})();
