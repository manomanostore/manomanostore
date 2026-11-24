/* ============================ Seller dashboard =========================== */
/* The page a seller lands on right after login. Session comes from SELLER
   (login.js, key "mm_seller"); language from the shared I18N layer (ui.js), so
   the EN/HI switch here uses the SAME preference as the storefront. Most figures
   mirror the panel design; the live bits — shop name, email, rating and the
   shop-verified state — come from the seller's account. */
(function () {
  function $(id) { return document.getElementById(id); }
  var T = function (k) { return (window.I18N && I18N.t) ? I18N.t(k) : k; };

  function toast(text) {
    var t = $("sdToast"); if (!t) return;
    t.textContent = text; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }

  // Five stars filled to `rating` (0–5, halves supported).
  function stars(rating) {
    var r = Math.max(0, Math.min(5, Number(rating) || 0)), html = "";
    for (var i = 1; i <= 5; i++) {
      var fill = r >= i ? 1 : (r >= i - 0.5 ? 0.5 : 0);
      html += '<svg class="sd-star" viewBox="0 0 24 24" aria-hidden="true">' +
        '<defs><linearGradient id="sg' + i + '"><stop offset="' + (fill * 100) + '%" stop-color="#f6b01e"/>' +
        '<stop offset="' + (fill * 100) + '%" stop-color="#d9dee8"/></linearGradient></defs>' +
        '<path fill="url(#sg' + i + ')" d="M12 2l2.9 6.26L21.6 9l-5 4.64L18 21l-6-3.3L6 21l1.4-7.36-5-4.64 6.7-.74z"/></svg>';
    }
    return html;
  }

  // Language switcher — reuses the storefront's I18N (same stored preference).
  function buildLang() {
    if (!window.I18N) return;
    var langs = I18N.langs, cur = I18N.get(), menu = $("sdLangMenu"), btn = $("sdLangBtn");
    function paintBtn() {
      cur = I18N.get();
      $("sdLangFlag").textContent = langs[cur].flag;
      $("sdLangCode").textContent = langs[cur].code;
    }
    menu.innerHTML = Object.keys(langs).map(function (code) {
      var l = langs[code];
      return '<button type="button" data-l="' + code + '"' + (code === cur ? ' class="on"' : '') +
        '><span style="font-size:16px">' + l.flag + '</span> ' + l.name + '</button>';
    }).join("");
    paintBtn();
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden));
    });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-l]"); if (!b) return;
      I18N.setLang(b.getAttribute("data-l"));
      menu.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      paintBtn(); close();
    });
    document.addEventListener("click", close);
    // keep the verified badge translated when the language changes
    document.addEventListener("i18n:change", function () { paintBtn(); });
  }

  function init() {
    var s = (window.SELLER && SELLER.current && SELLER.current()) || null;
    if (!s) { location.href = "login.html?next=seller-dashboard.html"; return; }

    var shop = s.shopName || s.name || "My Shop";
    var initial = (shop.trim()[0] || "S").toUpperCase();
    var verified = String(s.shopStatus) === "1" || s.shopStatus === 1 || s.shopStatus === "verified";
    var rating = Math.max(0, Math.min(5, Number(s.rating) || 0));

    // Identity
    $("sdShop").textContent = shop;
    $("sdShop2").textContent = shop;
    $("sdWelcomeName").textContent = shop;
    $("sdEmail").textContent = s.email || "";
    $("sdAva").textContent = initial;
    $("sdAvatar").textContent = initial;

    // Rating
    $("sdStars").innerHTML = stars(rating);
    $("sdRnum").textContent = rating.toFixed(1);

    // Verified / unverified badge (keeps data-i18n so it re-translates)
    var badge = $("sdVerifyBadge"), vbtn = $("sdVerifyBtn");
    if (verified) {
      badge.className = "sd-badge sd-badge-ok";
      badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span data-i18n="sd.verified">Shop verified</span>';
      if (window.I18N) I18N.apply(badge);
      if (vbtn) vbtn.style.display = "none";
    } else if (vbtn) {
      vbtn.addEventListener("click", function () { toast(T("sd.verifymsg")); });
    }

    // Sales bars — no sales yet, so a flat baseline (honest empty chart).
    var bars = $("sdBars");
    if (bars) { var h = ""; for (var i = 0; i < 7; i++) h += '<div class="sd-bar" style="height:0"></div>'; bars.innerHTML = h; }

    // Placeholder menu items / Upgrade → "coming soon" (translated)
    document.querySelectorAll("[data-soon]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); toast(T(el.getAttribute("data-soon")) + " " + T("sd.soon")); });
    });

    // Logout
    var logout = $("sdLogout");
    if (logout) logout.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.SELLER && SELLER.logout) SELLER.logout();
      location.href = "login.html";
    });

    // Mobile drawer
    var shell = $("sdShell"), burger = $("sdBurger"), backdrop = $("sdBackdrop");
    function closeDrawer() { shell.classList.remove("sd-open"); }
    if (burger) burger.addEventListener("click", function () { shell.classList.toggle("sd-open"); });
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    document.querySelectorAll(".sd-nav a").forEach(function (a) { a.addEventListener("click", closeDrawer); });

    buildLang();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
