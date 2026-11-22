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
  var LOGO = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#43cdb4"/><path d="M14 32V16l10 8 10-8v16" fill="none" stroke="#16233f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function esc(s){return String(s==null?"":s).replace(/[<&>"]/g,function(m){return{"<":"&lt;","&":"&amp;",">":"&gt;",'"':"&quot;"}[m];});}
  function brandMarkup(){ // bold the tail of the brand name in the accent colour
    var n = C.BRAND_NAME, cut = Math.min(Math.ceil(n.length/2), n.length-1);
    if (n.length < 2) return esc(n);
    return esc(n.slice(0,cut)) + "<b>" + esc(n.slice(cut)) + "</b>";
  }

  function header(active) {
    return '' +
    '<header class="app">' +
      '<div class="app-bar">' +
        '<button class="icon-btn" id="menuBtn" aria-label="Menu">'+ic.menu+'</button>'+
        '<a class="brand" href="index.html">'+LOGO+'<span>'+brandMarkup()+'</span></a>'+
        '<form class="search" id="searchForm" role="search">'+ic.search+
          '<input id="searchInput" type="search" placeholder="What are you looking for?" aria-label="Search products" autocomplete="off">'+
        '</form>'+
        '<a class="icon-btn" href="login.html" aria-label="Account">'+ic.user+'</a>'+
        '<a class="icon-btn" href="cart.html" aria-label="Basket">'+ic.cart+'<span class="cart-count" data-cart-count hidden>0</span></a>'+
      '</div>'+
      '<div class="nav-row"><div class="scroll-x">'+
        '<button class="nav-pill ghost" id="menuBtn2">'+ic.menu+' Products</button>'+
        '<a class="nav-pill solid" href="deals.html">Deals</a>'+
        '<a class="nav-pill lime" href="category.html?badge=choice">'+esc(C.BRAND_SHORT)+' Choice</a>'+
        '<a class="nav-pill ghost" href="deals.html">Best sellers</a>'+
        '<a class="nav-pill ghost" href="category.html?cat=garden">Garden</a>'+
        '<a class="nav-pill ghost" href="category.html?cat=bathroom">Bathroom</a>'+
      '</div></div>'+
    '</header>';
  }

  function bottomNav(active) {
    function a(key, href, label, icon, badge) {
      return '<a href="'+href+'" class="'+(active===key?'active':'')+'">'+icon+
        (badge?'<span class="nc" data-cart-count hidden>0</span>':'')+'<span>'+label+'</span></a>';
    }
    return '<nav class="bottom-nav">'+
      a('home','index.html','Home',ic.home)+
      a('cats','category.html','Categories',ic.grid)+
      a('deals','deals.html','Deals',ic.tag)+
      a('cart','cart.html','Basket',ic.cart,true)+
      a('account','login.html','Account',ic.user)+
    '</nav>';
  }

  function footer() {
    var cols = [
      ['Information', ['Track orders','Returns','Need help?','Contact us','Become a seller']],
      ['Find out more', ['Our advice','Popular categories','Best sellers','Our brands']]
    ];
    var html = '<footer class="app"><div class="cols">';
    cols.forEach(function (c) {
      html += '<div><h4>'+c[0]+'</h4>'+c[1].map(function (l) { return '<a href="#">'+l+'</a>'; }).join('')+'</div>';
    });
    html += '<div><h4>Secure payment</h4><div class="pay">'+
      ['VISA','MC','AMEX','PayPal','G Pay','Pay'].map(function(p){return '<span>'+p+'</span>';}).join('')+
      '</div><p style="margin-top:16px;font-size:13px">'+esc(C.BRAND_TAGLINE)+'</p></div>';
    html += '</div><div class="copy">© '+new Date().getFullYear()+' '+esc(C.BRAND_NAME)+' · Demo store. All products & imagery are original placeholders.</div></footer>';
    return html;
  }

  async function drawer() {
    var cats = await DATA.categories();
    var items = cats.map(function (c) {
      return '<a class="d-item" href="category.html?cat='+c.key+'"><span class="di">'+
        '<span style="width:34px;height:34px;border-radius:9px;display:inline-grid;place-items:center;background:'+c.color+'22;color:'+c.color+'">'+ic.tag+'</span>'+
        esc(c.name)+'</span>'+ic.chev+'</a>';
    }).join('');
    return '<div class="drawer-back" id="drawerBack"></div>'+
      '<aside class="drawer" id="drawer">'+
        '<div class="d-head"><strong style="font-size:18px">Browse '+esc(C.BRAND_NAME)+'</strong>'+
          '<button class="icon-btn" id="drawerClose" style="color:var(--ink)">'+ic.close+'</button></div>'+
        '<h3>Catalog</h3>'+items+
        '<h3>Account</h3>'+
        '<a class="d-item" href="login.html"><span class="di">'+ic.user+'Sign in / Register</span>'+ic.chev+'</a>'+
        '<a class="d-item" href="deals.html"><span class="di">'+ic.tag+'Today\'s deals</span>'+ic.chev+'</a>'+
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
    document.body.insertAdjacentHTML("beforeend", await drawer());

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

    updateCartBadges();
    document.addEventListener("cart:change", updateCartBadges);
  }

  window.UI = { mount: mount, toast: toast, icons: ic, esc: esc, updateCartBadges: updateCartBadges };
})();
