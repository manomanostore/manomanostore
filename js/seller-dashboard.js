/* ============================ Seller dashboard =========================== */
/* The page a seller lands on right after login. Session comes from SELLER
   (login.js, key "mm_seller"); language from the shared I18N layer (ui.js), so
   the EN/HI switch here uses the SAME preference as the storefront. The seller
   can edit their profile + shop image from the account menu (sellerProfile). */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var T = function (k) { return (window.I18N && I18N.t) ? I18N.t(k) : k; };
  var session = null;

  // kind "ok" shows a green success banner with a × to dismiss.
  function toast(text, kind) {
    var t = $("sdToast"); if (!t) return;
    t.className = "sd-toast" + (kind ? " " + kind : "");
    if (kind === "ok") {
      t.textContent = "";
      var span = document.createElement("span"); span.textContent = text; t.appendChild(span);
      var x = document.createElement("button"); x.className = "sd-toast-x"; x.setAttribute("aria-label", "Close"); x.innerHTML = "&times;";
      x.onclick = function () { t.classList.remove("show"); }; t.appendChild(x);
    } else { t.textContent = text; }
    t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, kind === "ok" ? 4500 : 2800);
  }
  function ok(text) { toast(text, "ok"); }

  // A professional confirm dialog (title, message, danger button). Calls onYes
  // only when the seller confirms.
  function confirmDialog(title, message, confirmLabel, onYes) {
    var root = document.createElement("div");
    root.className = "sd-modal";
    root.innerHTML =
      '<div class="sd-dialog" role="dialog" aria-modal="true" style="width:400px">' +
        '<div class="sd-dhead"><h3>' + esc(title) + '</h3><button class="sd-dclose" id="cfX" aria-label="Close">×</button></div>' +
        '<div class="sd-dbody">' +
          '<div class="sd-confirm-ic"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7zM9 7V5h6v2M10 11v6M14 11v6"/></svg></div>' +
          '<p class="sd-confirm-msg">' + esc(message) + '</p>' +
        '</div>' +
        '<div class="sd-dfoot"><button class="sd-btn sd-btn-grey" id="cfNo">' + esc(T("sd.cancel")) + '</button>' +
          '<button class="sd-btn sd-btn-danger" id="cfYes">' + esc(confirmLabel) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);
    function close() { root.remove(); }
    $("cfX").onclick = close; $("cfNo").onclick = close;
    document.addEventListener("keydown", function esc2(ev) { if (ev.key === "Escape") { close(); document.removeEventListener("keydown", esc2); } });
    $("cfYes").onclick = function () { close(); onYes(); };
    $("cfYes").focus();
  }

  // Stale/expired session → tell the seller and send them to sign in again
  // (where a fresh token is issued), preserving the return page.
  function reloginSoon() {
    toast(T("sd.relogin"));
    setTimeout(function () { if (window.SELLER && SELLER.logout) SELLER.logout(); location.href = "login.html?next=seller-dashboard.html"; }, 1400);
  }

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

  // Avatars show the uploaded shop image when present, else the shop initial.
  function setAvatars(shopImage, initial) {
    ["sdAva", "sdAvatar", "sdAvatar2"].forEach(function (id) {
      var el = $(id); if (!el) return;
      if (shopImage) { el.textContent = ""; el.style.backgroundImage = "url('" + shopImage + "')"; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; }
      else { el.style.backgroundImage = ""; el.textContent = initial; }
    });
  }

  function paintIdentity(s) {
    var shop = s.shopName || s.name || "My Shop";
    var initial = (shop.trim()[0] || "S").toUpperCase();
    ["sdShop", "sdShop2", "sdShop3", "sdWelcomeName"].forEach(function (id) { if ($(id)) $(id).textContent = shop; });
    ["sdEmail", "sdEmail2"].forEach(function (id) { if ($(id)) $(id).textContent = s.email || ""; });
    setAvatars(s.shopImage, initial);
  }

  // Downscale a chosen image to <=max px and return a compact JPEG data URL.
  function fileToImage(file, max) {
    return new Promise(function (resolve) {
      if (!file) return resolve("");
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, (max || 600) / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL("image/jpeg", 0.85)); } catch (e) { resolve(""); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(""); };
      img.src = url;
    });
  }

  /* ------------------------------ Profile editor ------------------------- */
  function openProfile() {
    var s = session, shop = s.shopName || s.name || "Shop";
    var initial = (shop.trim()[0] || "S").toUpperCase();
    var newImage = "";   // base64 of a freshly chosen image

    var root = document.createElement("div");
    root.className = "sd-modal"; root.id = "sdModal";
    root.innerHTML =
      '<div class="sd-dialog" role="dialog" aria-modal="true">' +
        '<div class="sd-dhead"><h3>' + esc(T("sd.editshop")) + '</h3><button class="sd-dclose" id="pmX" aria-label="Close">×</button></div>' +
        '<div class="sd-dbody">' +
          '<p class="sd-msg" id="pmMsg" hidden></p>' +
          '<div class="sd-imgrow">' +
            '<div class="sd-imgprev" id="pmPrev"></div>' +
            '<div><label class="sd-imgbtn">' + esc(T("sd.changephoto")) +
              '<input type="file" id="pmFile" accept="image/*"></label>' +
              '<div style="font-size:11px;color:#8792a6;margin-top:6px">' + esc(T("sd.shopimage")) + '</div></div>' +
          '</div>' +
          '<div class="sd-field"><label>' + esc(T("sd.shopname")) + '</label><input id="pmShop" maxlength="100" value="' + esc(s.shopName || "") + '"></div>' +
          '<div class="sd-field"><label>' + esc(T("sd.contactname")) + '</label><input id="pmName" maxlength="80" value="' + esc(s.name || "") + '"></div>' +
          '<div class="sd-field"><label>' + esc(T("sd.phone")) + ' <span style="color:#aab2c3">(' + esc(T("sd.optional")) + ')</span></label><input id="pmPhone" type="tel" maxlength="30" value="' + esc(s.phone || "") + '"></div>' +
          '<div class="sd-field"><label>' + esc(T("sd.email")) + '</label><input value="' + esc(s.email || "") + '" readonly></div>' +
        '</div>' +
        '<div class="sd-dfoot"><button class="sd-btn sd-btn-grey" id="pmCancel">' + esc(T("sd.cancel")) + '</button>' +
          '<button class="sd-btn" id="pmSave">' + esc(T("sd.save")) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);

    var prev = $("pmPrev");
    function paintPrev(img) {
      if (img) { prev.textContent = ""; prev.style.backgroundImage = "url('" + img + "')"; }
      else { prev.style.backgroundImage = ""; prev.textContent = initial; }
    }
    paintPrev(s.shopImage);

    function close() { root.remove(); }
    $("pmX").onclick = close; $("pmCancel").onclick = close;

    $("pmFile").addEventListener("change", async function () {
      var f = this.files[0]; if (!f) return;
      newImage = await fileToImage(f, 600);
      if (newImage) paintPrev(newImage);
    });

    $("pmSave").addEventListener("click", async function () {
      var msg = $("pmMsg");
      var shopName = $("pmShop").value.trim();
      if (!shopName) { msg.hidden = false; msg.textContent = T("sd.shopname") + " ✱"; return; }
      if (!session.token) { msg.hidden = false; msg.textContent = T("sd.relogin"); return; }
      if (!CONFIG.API_URL) { msg.hidden = false; msg.textContent = "Backend not configured."; return; }
      var btn = this; btn.disabled = true; btn.textContent = T("sd.saving");
      try {
        var body = { action: "sellerProfile", token: session.token,
          shopName: shopName, name: $("pmName").value.trim(), phone: $("pmPhone").value.trim() };
        if (newImage) body.shopImage = newImage;
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
        var j = await r.json();
        if (!j.ok) {
          btn.disabled = false; btn.textContent = T("sd.save");
          msg.hidden = false; msg.textContent = j.auth ? T("sd.relogin") : (j.error || "Couldn't save.");
          return;
        }
        // merge the fresh fields into the saved session and repaint
        session = Object.assign({}, session, j.seller);
        if (window.SELLER && SELLER.save) SELLER.save(session);
        paintIdentity(session);
        close(); ok(T("sd.saved"));
      } catch (x) {
        btn.disabled = false; btn.textContent = T("sd.save");
        msg.hidden = false; msg.textContent = "Can't reach the server right now.";
      }
    });
  }

  /* ------------------------------ Change password ------------------------ */
  function openChangePw() {
    var root = document.createElement("div");
    root.className = "sd-modal"; root.id = "sdPwModal";
    root.innerHTML =
      '<div class="sd-dialog" role="dialog" aria-modal="true" style="width:420px">' +
        '<div class="sd-dhead"><h3>' + esc(T("sd.changepw")) + '</h3><button class="sd-dclose" id="cpX" aria-label="Close">×</button></div>' +
        '<div class="sd-dbody">' +
          '<p class="sd-msg" id="cpMsg" hidden></p>' +
          '<div class="sd-field"><label>' + esc(T("sd.currentpw")) + '</label><input id="cpCur" type="password" autocomplete="current-password"></div>' +
          '<div class="sd-field"><label>' + esc(T("sd.newpw")) + '</label><input id="cpNew" type="password" autocomplete="new-password"></div>' +
          '<div class="sd-field"><label>' + esc(T("sd.confirmpw")) + '</label><input id="cpNew2" type="password" autocomplete="new-password"></div>' +
        '</div>' +
        '<div class="sd-dfoot"><button class="sd-btn sd-btn-grey" id="cpCancel">' + esc(T("sd.cancel")) + '</button>' +
          '<button class="sd-btn" id="cpSave">' + esc(T("sd.save")) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);
    function close() { root.remove(); }
    $("cpX").onclick = close; $("cpCancel").onclick = close;

    $("cpSave").addEventListener("click", async function () {
      var msg = $("cpMsg"); msg.hidden = true;
      var cur = $("cpCur").value, nw = $("cpNew").value, nw2 = $("cpNew2").value;
      function fail(t) { msg.hidden = false; msg.textContent = t; }
      if (!cur) return fail(T("sd.currentpw"));
      if (nw.length < 8) return fail(T("sd.pwshort"));
      if (nw !== nw2) return fail(T("sd.pwmismatch"));
      if (!session.token) return fail(T("sd.relogin"));
      if (!window.AUTH) return fail("Missing crypto module.");
      var btn = this; btn.disabled = true; btn.textContent = T("sd.saving");
      try {
        // Salt = the sign-in email, or the mobile digits for sellers without an email.
        var em = AUTH.loginId(session.email || ""), ph = AUTH.loginId(session.phone || "");
        var salt = "seller:" + (em || ph);
        var currentHash = await AUTH.hash(salt, cur), newHash = await AUTH.hash(salt, nw);
        var body = { action: "sellerPassword", token: session.token, currentHash: currentHash, newHash: newHash };
        if (em && ph.length >= 6) body.newHashPhone = await AUTH.hash("seller:" + ph, nw);   // keeps mobile sign-in working
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(body) });
        var j = await r.json();
        if (!j.ok) { btn.disabled = false; btn.textContent = T("sd.save"); return fail(j.auth ? T("sd.relogin") : (j.error || T("sd.pwwrong"))); }
        close(); ok(T("sd.pwchanged"));
      } catch (x) { btn.disabled = false; btn.textContent = T("sd.save"); fail("Can't reach the server right now."); }
    });
  }

  /* ------------------------------ Payment settings ----------------------- */
  // Seller's payout details (cash / bank / USDT), saved to the bank_accounts
  // sheet. Opens prefilled with what's stored, so it's editable any time.
  function openPayment() {
    if (!session.token || !CONFIG.API_URL) { toast(T("sd.relogin"), "err"); return; }

    function sw(id, label) {
      return '<label class="sd-swrow"><span>' + esc(label) + '</span>' +
        '<span class="sd-switch"><input type="checkbox" id="' + id + '"><span class="sd-slider"></span></span></label>';
    }
    function fld(id, label, ph) {
      return '<div class="sd-field"><label>' + esc(label) + '</label><input id="' + id + '" value="" placeholder="' + esc(ph || "") + '"></div>';
    }

    // Render the modal FIRST so the close/save buttons always work, even if the
    // network is slow or the backend hasn't been redeployed yet.
    var root = document.createElement("div");
    root.className = "sd-modal"; root.id = "sdPayModal";
    root.innerHTML =
      '<div class="sd-dialog" role="dialog" aria-modal="true">' +
        '<div class="sd-dhead"><h3>' + esc(T("sd.paymentsetting")) + '</h3><button type="button" class="sd-dclose" id="payX" aria-label="Close">&times;</button></div>' +
        '<div class="sd-dbody">' +
          '<p class="sd-msg" id="payMsg" hidden></p>' +
          sw("payCash", T("sd.cashpay")) +
          sw("payBank", T("sd.bankpay")) +
          fld("payBankName", T("sd.bankname")) +
          fld("payBankAccName", T("sd.bankaccname"), session.email) +
          fld("payBankAccNo", T("sd.bankaccno")) +
          fld("payIfsc", T("sd.ifsc")) +
          sw("payUsdt", T("sd.usdtpay")) +
          fld("payUsdtLink", T("sd.usdtlink")) +
          fld("payUsdtAddr", T("sd.usdtaddr")) +
        '</div>' +
        '<div class="sd-dfoot"><button type="button" class="sd-btn sd-btn-grey" id="payCancel">' + esc(T("sd.cancel")) + '</button>' +
          '<button type="button" class="sd-btn" id="paySave">' + esc(T("sd.savebtn")) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);

    function close() { document.removeEventListener("keydown", onKey); root.remove(); }
    function onKey(e) { if (e.key === "Escape") close(); }
    $("payX").onclick = close;
    $("payCancel").onclick = close;
    root.addEventListener("click", function (e) { if (e.target === root) close(); });   // backdrop click
    document.addEventListener("keydown", onKey);

    // Prefill with whatever is already saved (editable any time).
    fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "sellerBank", token: session.token }) })
      .then(function (r) { return r.json(); })
      .then(function (gj) {
        if (!gj || !gj.ok) return;
        var b = gj.bank || {};
        if ($("payCash")) $("payCash").checked = !!b.cashOn;
        if ($("payBank")) $("payBank").checked = !!b.bankOn;
        if ($("payUsdt")) $("payUsdt").checked = !!b.usdtOn;
        if ($("payBankName")) $("payBankName").value = b.bankName || "";
        if ($("payBankAccName")) $("payBankAccName").value = b.bankAccName || "";
        if ($("payBankAccNo")) $("payBankAccNo").value = b.bankAccNo || "";
        if ($("payIfsc")) $("payIfsc").value = b.ifsc || "";
        if ($("payUsdtLink")) $("payUsdtLink").value = b.usdtLink || "";
        if ($("payUsdtAddr")) $("payUsdtAddr").value = b.usdtAddress || "";
      }).catch(function () {});

    $("paySave").addEventListener("click", async function () {
      var msg = $("payMsg"); msg.hidden = true;
      if (!session.token) { msg.hidden = false; msg.textContent = T("sd.relogin"); return; }
      var btn = this; btn.disabled = true; btn.textContent = T("sd.saving");
      try {
        var body = { action: "sellerBankSave", token: session.token,
          cashOn: $("payCash").checked ? 1 : 0, bankOn: $("payBank").checked ? 1 : 0,
          bankName: $("payBankName").value, bankAccName: $("payBankAccName").value,
          bankAccNo: $("payBankAccNo").value, ifsc: $("payIfsc").value,
          usdtOn: $("payUsdt").checked ? 1 : 0, usdtLink: $("payUsdtLink").value, usdtAddress: $("payUsdtAddr").value };
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
        var j = await r.json();
        if (!j.ok) { btn.disabled = false; btn.textContent = T("sd.savebtn"); msg.hidden = false; msg.textContent = j.auth ? T("sd.relogin") : (j.error || "Couldn't save."); return; }
        close(); ok(T("sd.bankadded"));
      } catch (x) { btn.disabled = false; btn.textContent = T("sd.savebtn"); msg.hidden = false; msg.textContent = "Can't reach the server right now."; }
    });
  }

  /* ------------------------------ Product Storehouse --------------------- */
  // store.products = full catalog; sel = { productId: qty } the seller is picking;
  // myIds = products already in the seller's shop (for an "in your shop" hint).
  var store = { loaded: false, products: [], cats: [], byId: {} };
  var sel = {}, myIds = {};
  function qtyOf(id) { return Math.max(1, Math.floor(Number(sel[id]) || 1)); }

  function inStockOf(p) { return (p.quantity === "" || p.quantity == null) ? true : Number(p.quantity) > 0; }

  function productCard(p) {
    var img = p.imageUrl || (p.images && p.images[0]) || "";
    var inStock = inStockOf(p);
    var old = (p.oldPrice !== "" && p.oldPrice != null) ? '<span class="sd-pold">$' + Number(p.oldPrice).toFixed(2) + '</span>' : '';
    var badge = p.badge ? '<span class="sd-pbadge">' + esc(p.badge) + '</span>' : '';
    var rate = Number(p.rating) > 0 ? '<span class="sd-prate">★ ' + Number(p.rating).toFixed(1) + '</span>' : '';
    var profit = Number(p.sellerProfit) > 0 ? '<div class="sd-pprofit">' + esc(T("sd.profit")) + ': $' + Number(p.sellerProfit).toFixed(2) + '</div>' : '';
    var picked = sel[p.id] != null;
    var control = picked
      ? '<div class="sd-qtyrow"><div class="sd-qty"><button type="button" data-dec="' + esc(p.id) + '">−</button>' +
          '<input type="number" min="1" value="' + qtyOf(p.id) + '" data-qid="' + esc(p.id) + '"><button type="button" data-inc="' + esc(p.id) + '">+</button></div>' +
          '<button type="button" class="sd-rmbtn" data-rm="' + esc(p.id) + '" aria-label="' + esc(T("sd.remove")) + '"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7zM9 7V5h6v2M10 11v6M14 11v6"/></svg></button></div>'
      : '<button type="button" class="sd-addbtn" data-add="' + esc(p.id) + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> ' + esc(T("sd.add")) + '</button>';
    return '<div class="sd-pcard' + (picked ? ' sel' : '') + '" data-id="' + esc(p.id) + '">' +
      '<div class="sd-pimg">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' :
        '<svg class="sd-ph" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>') +
      '<span class="sd-pstock ' + (inStock ? 'in' : 'out') + '">' + T(inStock ? 'sd.instock' : 'sd.outstock') + '</span>' + badge + '</div>' +
      '<div class="sd-pbody"><div class="sd-pname">' + esc(p.name) + (myIds[p.id] ? ' <span class="sd-prate" style="color:#12a150">✓ ' + esc(T("sd.inmyshop")) + '</span>' : '') + '</div>' +
      '<div class="sd-pprice">$' + Number(p.price).toFixed(2) + old + '</div>' + profit + rate +
      '<div class="sd-padd">' + control + '</div></div></div>';
  }

  function filteredStore() {
    var q = ($("stSearch").value || "").trim().toLowerCase();
    var cat = $("stCat").value, stock = $("stStock").value;
    return store.products.filter(function (p) {
      if (cat && String(p.cat_id) !== String(cat)) return false;
      var inStock = inStockOf(p);
      if (stock === "in" && !inStock) return false;
      if (stock === "out" && inStock) return false;
      if (q && String(p.name || "").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  // Product lists show 10 per page (no total count shown to sellers).
  var PRODUCTS_PER_PAGE = 10;
  function pageSlice(list, state, extra) {
    var pages = Math.max(1, Math.ceil(list.length / PRODUCTS_PER_PAGE));
    state.page = Math.min(Math.max(1, state.page || 1), pages);
    var from = (state.page - 1) * PRODUCTS_PER_PAGE, items = list.slice(from, from + PRODUCTS_PER_PAGE);
    return { items: items, pager: list.length ? pagerHtml(state.page, pages, from + 1, from + items.length, list.length, true, extra) : "" };
  }
  function renderStore() {
    // Display-only catalogue size badge beside the page buttons: "500+" at
    // minimum, then the real size rounded down to hundreds (e.g. 742 → "700+").
    var big = Math.max(500, Math.floor(store.products.length / 100) * 100) + "+";
    var list = filteredStore(), pg = pageSlice(list, store, '<span class="sd-pmore" title="' + esc(T("sd.products.n")) + '">' + big + "</span>");
    $("stGrid").innerHTML = pg.items.map(productCard).join("");
    $("stPager").innerHTML = pg.pager;
    $("stCount").textContent = "";
    var empty = $("stEmpty"); empty.hidden = list.length > 0; empty.textContent = T("sd.noresults");
    renderSelPanel();
  }

  // Subtotal = price × qty ; Total profit = profit × qty ; Total = Σ subtotal.
  function renderSelPanel() {
    var ids = Object.keys(sel), panel = $("stPanel");
    if (!ids.length) { panel.hidden = true; return; }
    panel.hidden = false;
    var sub = 0, prof = 0, rows = "";
    ids.forEach(function (id) {
      var p = store.byId[id]; if (!p) return;
      var qty = qtyOf(id), lineSub = p.price * qty;
      sub += lineSub; prof += (Number(p.sellerProfit) || 0) * qty;
      var img = p.imageUrl || "";
      rows += '<div class="sd-selrow">' +
        '<span class="sd-selthumb"' + (img ? ' style="background-image:url(\'' + esc(img) + '\')"' : '') + '></span>' +
        '<div class="sd-selinfo"><div class="sd-seln">' + esc(p.name) + '</div>' +
          '<div class="sd-selp">$' + Number(p.price).toFixed(2) + ' · ' + esc(T("sd.profit")) + ' $' + Number(p.sellerProfit || 0).toFixed(2) + '</div></div>' +
        '<div class="sd-qty"><button type="button" data-dec="' + esc(id) + '">−</button>' +
          '<input type="number" min="1" value="' + qty + '" data-qid="' + esc(id) + '"><button type="button" data-inc="' + esc(id) + '">+</button></div>' +
        '<span class="sd-selsub">$' + lineSub.toFixed(2) + '</span>' +
        '<button type="button" class="sd-rmbtn" data-rm="' + esc(id) + '" aria-label="' + esc(T("sd.remove")) + '"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7zM9 7V5h6v2M10 11v6M14 11v6"/></svg></button></div>';
    });
    $("stSelList").innerHTML = rows;
    $("stSelN").textContent = ids.length;
    $("stSub").textContent = "$" + sub.toFixed(2);
    $("stProfit").textContent = "$" + prof.toFixed(2);
    $("stTotal").textContent = "$" + sub.toFixed(2);
    // Products are paid from the wallet: show the balance and warn when short.
    var bal = wallet.data && wallet.data.balances, warn = $("stWarn"), add = $("stAdd");
    var have = bal ? Number(bal.walletMoney) || 0 : null, short = have != null && sub > have + 0.0001;
    if ($("stWallet")) { $("stWallet").textContent = have == null ? "—" : money(have); $("stWallet").style.color = short ? "var(--no)" : ""; }
    if (warn) { warn.hidden = !short; if (short) warn.textContent = T("sd.notenough").replace("{x}", money(sub - have)); }
    if (add) add.disabled = short;
  }

  function setQty(id, qty) { if (sel[id] == null) return; sel[id] = Math.max(1, Math.floor(Number(qty) || 1)); }

  // Clicks inside the storehouse (cards + the selected panel) — add/remove/qty.
  function onStoreClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    var add = b.getAttribute("data-add"), inc = b.getAttribute("data-inc"), dec = b.getAttribute("data-dec"), rm = b.getAttribute("data-rm");
    if (add != null) { sel[add] = 1; renderStore(); }
    else if (rm != null) { delete sel[rm]; renderStore(); }
    else if (inc != null) { setQty(inc, qtyOf(inc) + 1); renderStore(); }
    else if (dec != null) { setQty(dec, qtyOf(dec) - 1); renderStore(); }
    else if (b.id === "stClear") { sel = {}; renderStore(); }
    else if (b.id === "stAdd") addToStore(Object.keys(sel).map(function (id) { return { productId: id, qty: qtyOf(id) }; }));
    else if (b.id === "stAddAll") addToStore(filteredStore().map(function (p) { return { productId: p.id, qty: sel[p.id] != null ? qtyOf(p.id) : 1 }; }));
  }
  function onStoreInput(e) {
    var inp = e.target.closest("input[data-qid]"); if (!inp) return;
    setQty(inp.getAttribute("data-qid"), inp.value); renderSelPanel();
  }

  async function addToStore(items) {
    items = items.filter(function (i) { return i && i.productId; });
    if (!items.length) { toast(T("sd.noresults")); return; }
    if (!session.token) { reloginSoon(); return; }
    var btns = [$("stAdd"), $("stAddAll")]; btns.forEach(function (b) { if (b) b.disabled = true; });
    try {
      var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sellerAddProducts", token: session.token, items: items }) });
      var j = await r.json();
      btns.forEach(function (b) { if (b) b.disabled = false; });
      if (!j.ok) { if (j.auth) reloginSoon(); else toast(j.error || "Couldn't add."); return; }
      sel = {}; mine.loaded = false; renderStore(); loadMyIds(); renderSelPanel();
      ok(j.charged ? T("sd.charged").replace("{x}", money(j.charged)) : T("sd.addedmsg"));
      fetchWallet(false).then(function () { if (!$("viewWallet").hidden) renderWallet(); });
    } catch (x) { btns.forEach(function (b) { if (b) b.disabled = false; }); toast("Can't reach the server right now."); }
  }

  async function ensureStorehouse() {
    if (store.loaded) return;
    store.loaded = true;
    $("stGrid").innerHTML = ""; $("stCount").textContent = T("sd.loading");
    try {
      var r = await fetch(CONFIG.API_URL + "?action=getProducts");
      var j = await r.json();
      store.products = j.products || []; store.cats = j.categories || [];
      store.byId = {}; store.products.forEach(function (p) { store.byId[p.id] = p; });
      fillCatSelect();
      loadMyIds();
      renderStore();
      fetchWallet(false).then(renderSelPanel);
    } catch (e) {
      store.loaded = false;
      var empty = $("stEmpty"); empty.hidden = false; empty.textContent = "Can't load products.";
      $("stCount").textContent = "";
    }
  }

  function fillCatSelect() {
    var selEl = $("stCat"), cur = selEl.value;
    selEl.innerHTML = '<option value="">' + esc(T("sd.allcats")) + '</option>' +
      store.cats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join("");
    selEl.value = cur;
  }

  /* ------------------------------ My Products ---------------------------- */
  var mine = { loaded: false, products: [] };

  async function loadMyIds() {
    if (!session.token) return;
    try {
      var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sellerProducts", token: session.token }) });
      var j = await r.json();
      if (j.ok) { myIds = {}; (j.products || []).forEach(function (p) { myIds[p.productId] = true; }); if (store.loaded) renderStore(); }
    } catch (e) {}
  }

  // Units ordered per shop product, from the seller's orders: delivered vs still
  // in progress (pending / received / processing / shipped). Cancelled orders
  // don't count. Order lines point at the shop product (sellerProductId), or at
  // the catalog product (id) for older orders.
  var IN_PROGRESS = ["pending", "received", "processing", "shipped"];
  function orderQtyMap() {
    var map = {};
    (orders.list || []).forEach(function (o) {
      var st = String(o.status || "pending");
      if (st === "cancelled") return;
      (o.items || []).forEach(function (it) {
        var key = it.sellerProductId != null && it.sellerProductId !== "" ? "s" + it.sellerProductId : "p" + it.id;
        var m = map[key] || (map[key] = { delivered: 0, progress: 0, by: {} });
        var q = Math.max(1, Math.floor(Number(it.qty) || 1));
        if (st === "delivered") m.delivered += q;
        else if (IN_PROGRESS.indexOf(st) > -1) { m.progress += q; m.by[st] = (m.by[st] || 0) + q; }
      });
    });
    return map;
  }
  function orderCell(p, map) {
    if (!orders.list) return '<td class="sd-tord"><span class="sd-omuted">…</span></td>';
    // orders linked to this shop product + older orders matched by catalog product
    var a = { delivered: 0, progress: 0, by: {} };
    [map["s" + p.id], map["p" + p.productId]].forEach(function (m) {
      if (!m) return;
      a.delivered += m.delivered; a.progress += m.progress;
      Object.keys(m.by).forEach(function (k) { a.by[k] = (a.by[k] || 0) + m.by[k]; });
    });
    if (!a.delivered && !a.progress) return '<td class="sd-tord"><span class="sd-omuted">' + esc(T("sd.noord")) + "</span></td>";
    var tip = Object.keys(a.by).map(function (k) { return a.by[k] + " " + T("sd.st." + k); }).join(" · ");
    return '<td class="sd-tord">' +
      '<span class="sd-ochip ok" title="' + esc(T("sd.delivered")) + '">✓ ' + a.delivered + " " + esc(T("sd.delivered")) + "</span>" +
      '<span class="sd-ochip wait" title="' + esc(tip || T("sd.pendingq")) + '">⏳ ' + a.progress + " " + esc(T("sd.pendingq")) + "</span></td>";
  }
  // Units still available (server: bought − delivered); older servers only send qty.
  function availQty(p) { var q = Math.floor(Number(p.qty)); return isNaN(q) ? 1 : Math.max(0, q); }
  function qtyCell(p) {
    var left = availQty(p), bought = p.bought != null ? Math.max(left, Math.floor(Number(p.bought) || 0)) : null;
    var tip = bought != null ? T("sd.bought") + ": " + bought + " · " + T("sd.delivered") + ": " + Math.max(0, bought - left) : "";
    return '<td title="' + esc(tip) + '">' +
      (left > 0 ? '<span class="sd-tqty">× ' + left + "</span>" : '<span class="sd-tqty out">' + esc(T("sd.soldout")) + "</span>") +
      (bought != null && bought !== left ? '<div class="sd-tqsub">' + esc(T("sd.ofbought").replace("{n}", bought)) + "</div>" : "") + "</td>";
  }
  function myRow(p, n, omap) {
    var img = p.imageUrl || "";
    var thumb = img ? '<span class="sd-tthumb" style="background-image:url(\'' + esc(img) + '\')"></span>'
      : '<span class="sd-tthumb" style="display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c7cedd" stroke-width="1.5"><path d="M3 9l9-5 9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg></span>';
    var hidden = String(p.status) === "hidden";
    var statusPill = '<span class="sd-status ' + (hidden ? 'hidden' : 'active') + '">' + T(hidden ? 'sd.hidden' : 'sd.active') + '</span>';
    // Show at most 60 characters of the name, then "..." (full name on hover).
    var full = String(p.name || ""), short = full.length > 60 ? full.slice(0, 60).replace(/\s+$/, "") + "..." : full;
    return '<tr>' +
      '<td class="sd-tno">' + n + '</td>' +
      '<td><div class="sd-tprod">' + thumb + '<span class="sd-tname" title="' + esc(full) + '">' + esc(short) + '</span></div></td>' +
      '<td class="sd-tprice">$' + Number(p.price).toFixed(2) + '</td>' +
      '<td class="sd-tprofit">$' + Number(p.profit || 0).toFixed(2) + '</td>' +
      qtyCell(p) +
      orderCell(p, omap || {}) +
      '<td>' + statusPill + '</td>' +
      '<td class="sd-tright"><button type="button" class="sd-rmbtn" data-myrm="' + esc(p.id) + '" aria-label="' + esc(T("sd.remove")) + '"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7zM9 7V5h6v2M10 11v6M14 11v6"/></svg></button></td>' +
      '</tr>';
  }

  function renderMy() {
    var q = ($("mpSearch").value || "").trim().toLowerCase();
    var list = mine.products.filter(function (p) { return !q || String(p.name || "").toLowerCase().indexOf(q) >= 0; });
    // Totals = Σ price×qty and Σ profit×qty over the shown products.
    var amount = 0, profit = 0;
    list.forEach(function (p) {
      var qty = availQty(p);   // units still in stock (bought − delivered)
      amount += (Number(p.price) || 0) * qty;
      profit += (Number(p.profit) || 0) * qty;
    });
    // Totals above cover ALL matching products; the table shows 10 per page with
    // "Showing 1–10 of N" (it's the seller's own list, so the count is shown).
    var pages = Math.max(1, Math.ceil(list.length / PRODUCTS_PER_PAGE));
    mine.page = Math.min(Math.max(1, mine.page || 1), pages);
    var from = (mine.page - 1) * PRODUCTS_PER_PAGE, items = list.slice(from, from + PRODUCTS_PER_PAGE);
    var pageInfo = { items: items, pager: list.length ? pagerHtml(mine.page, pages, from + 1, from + items.length, list.length, false) : "" };
    var omap = orderQtyMap();
    var stats = '<div class="sd-mpstats">' +
      '<div class="sd-mpstat"><span class="sd-mpic a"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg></span>' +
        '<div><span>' + esc(T("sd.totalamount")) + '</span><b>$' + amount.toFixed(2) + '</b></div></div>' +
      '<div class="sd-mpstat"><span class="sd-mpic b"><svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 16l4-5 3 3 5-7"/></svg></span>' +
        '<div><span>' + esc(T("sd.totalprofit")) + '</span><b class="sd-green">$' + profit.toFixed(2) + '</b></div></div>' +
      '</div>';
    var table = list.length ? '<div class="sd-tablewrap"><table class="sd-table"><thead><tr>' +
        '<th class="sd-tno">#</th><th>' + esc(T("sd.th.product")) + '</th><th>' + esc(T("sd.th.price")) + '</th>' +
        '<th>' + esc(T("sd.profit")) + '</th><th>' + esc(T("sd.th.qty")) + '</th><th>' + esc(T("sd.th.orders")) + '</th><th>' + esc(T("sd.status")) + '</th><th></th>' +
        '</tr></thead><tbody>' + pageInfo.items.map(function (p, i) { return myRow(p, from + i + 1, omap); }).join("") + '</tbody></table></div>' : "";
    $("mpGrid").innerHTML = (list.length ? stats : "") + table;
    $("mpPager").innerHTML = pageInfo.pager;
    $("mpCount").textContent = "";
    var empty = $("mpEmpty"); empty.hidden = list.length > 0; empty.textContent = q ? T("sd.noresults") : T("sd.myempty");
  }

  async function ensureMyProducts() {
    // delivered / pending quantities come from the seller's orders
    fetchOrders().then(function () { if (mine.loaded && !$("viewProducts").hidden) renderMy(); });
    if (mine.loaded) { renderMy(); return; }
    mine.loaded = true;
    $("mpGrid").innerHTML = ""; $("mpCount").textContent = T("sd.loading");
    try {
      var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sellerProducts", token: session.token }) });
      var j = await r.json();
      mine.products = (j.ok && j.products) || [];
      myIds = {}; mine.products.forEach(function (p) { myIds[p.productId] = true; });
      renderMy();
    } catch (e) { mine.loaded = false; var empty = $("mpEmpty"); empty.hidden = false; empty.textContent = "Can't load products."; $("mpCount").textContent = ""; }
  }

  function onMyClick(e) {
    var b = e.target.closest("button[data-myrm]"); if (!b) return;
    var id = b.getAttribute("data-myrm");
    var p = mine.products.filter(function (x) { return String(x.id) === String(id); })[0];
    var name = (p && p.name) || "";
    confirmDialog(T("sd.removetitle"), T("sd.removeconfirm").replace("{x}", name), T("sd.remove"), function () { removeMyProduct(id, b, p); });
  }

  async function removeMyProduct(id, b, p) {
    b.disabled = true;
    try {
      var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sellerRemoveProduct", token: session.token, id: id }) });
      var j = await r.json();
      if (j.ok) {
        mine.products = mine.products.filter(function (x) { return String(x.id) !== String(id); });
        if (p) delete myIds[p.productId];
        renderMy(); if (store.loaded) renderStore(); ok(T("sd.removed"));
      } else if (j.auth) { reloginSoon(); }
      else { b.disabled = false; toast(j.error || "Couldn't remove."); }
    } catch (x) { b.disabled = false; toast("Can't reach the server right now."); }
  }

  /* ------------------------------ Wallet / Money Withdraw ---------------- */
  var wallet = { data: null };
  function money(n) { return "$" + (Number(n) || 0).toFixed(2); }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? "" : IST_DATE.format(d); }   // IST, e.g. 27/11/2026
  function txTypeLabel(t) { return t === "deposit" ? T("sd.deposit") : t === "withdraw" ? T("sd.withdraw2") : t === "guarantee" ? T("sd.guaranteet") : t === "purchase" ? T("sd.purchase") : t === "earning" ? T("sd.earning") : t; }

  function paintWalletStats(bal) {
    if (!bal) return;
    if ($("sdGuarantee")) $("sdGuarantee").textContent = money(bal.guaranteeMoney);
    if ($("sdCardProducts")) $("sdCardProducts").textContent = bal.productCount || 0;
    if ($("sdCardWallet")) $("sdCardWallet").textContent = money(bal.walletMoney);
    if ($("wlPending")) $("wlPending").textContent = money(bal.pendingBalance);
    if ($("wlWallet")) $("wlWallet").textContent = money(bal.walletMoney);
    if ($("wlGuarantee")) $("wlGuarantee").textContent = money(bal.guaranteeMoney);
  }

  // interactive=true → if the session is stale, bounce to re-login (so a seller
  // who hasn't signed in since the token change sees fresh balances).
  async function fetchWallet(interactive) {
    if (!session.token) { if (interactive) reloginSoon(); return null; }
    try {
      var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sellerWallet", token: session.token }) });
      var j = await r.json();
      if (j.ok) { wallet.data = j; paintWalletStats(j.balances); return j; }
      if (j.auth && interactive) reloginSoon();
    } catch (e) {}
    return null;
  }

  /* ---- Silent background wallet refresh. The seller panel shows the bell icon
     only — NO sound, voice or toast alerts (per request). This just keeps the
     balances/history current when an admin approves/rejects. ---- */
  var _sTxTimer = null;
  async function pollSellerTx() {
    if (!session.token) return;
    var j = await fetchWallet(false);
    if (j && j.transactions && !$("viewWallet").hidden) renderWallet();
  }

  function renderWallet() {
    var d = wallet.data; if (!d) return;
    var shop = session.shopName || session.name || "Shop", initial = (shop.trim()[0] || "S").toUpperCase();
    if ($("wlShop")) $("wlShop").textContent = shop;
    if ($("wlEmail")) $("wlEmail").textContent = session.email || "";
    var logo = $("wlLogo");
    if (logo) { if (session.shopImage) { logo.textContent = ""; logo.style.backgroundImage = "url('" + session.shopImage + "')"; } else { logo.style.backgroundImage = ""; logo.textContent = initial; } }
    paintWalletStats(d.balances);
    var txs = d.transactions || [];
    if (!txs.length) { $("wlHist").innerHTML = ""; var e = $("wlEmpty"); e.hidden = false; e.textContent = T("sd.notx"); return; }
    $("wlEmpty").hidden = true;
    $("wlHist").innerHTML = '<div class="sd-tablewrap"><table class="sd-table"><thead><tr>' +
      '<th>' + esc(T("sd.date")) + '</th><th>' + esc(T("sd.amount")) + '</th><th>' + esc(T("sd.type")) + '</th><th>' + esc(T("sd.method")) + '</th><th>' + esc(T("sd.status")) + '</th>' +
      '</tr></thead><tbody>' + txs.map(function (t) {
        var wd = t.type === "withdraw" || t.type === "purchase";   // money out of the wallet
        return '<tr>' +
          '<td>' + istDateTime(t.createdAt) + '</td>' +
          '<td style="font-weight:800" class="sd-txamt ' + (wd ? 'wd' : 'dep') + '">' + (wd ? '−' : '+') + esc(t.currency || '$') + Number(t.amount).toFixed(2) + '</td>' +
          '<td>' + esc(txTypeLabel(t.type)) + ((t.type === "purchase" || t.type === "earning") && t.note ? '<small class="sd-txsub" title="' + esc(t.note) + '">' + esc(t.note) + "</small>" : "") + '</td>' +
          '<td>' + esc(t.method ? t.method.toUpperCase() : '—') + '</td>' +
          '<td><span class="sd-txpill ' + esc(t.status) + '">' + esc(T("sd." + t.status)) + '</span></td>' +
          '</tr>';
      }).join("") + '</tbody></table></div>';
  }

  async function ensureWallet() {
    $("wlEmpty").hidden = true;
    var d = await fetchWallet(true);   // re-login if the session is stale
    if (d) renderWallet();
    else { var e = $("wlEmpty"); e.hidden = false; e.textContent = "Can't load wallet."; }
  }

  // Offline recharge (deposit) or guarantee recharge modal.
  function openRecharge(purpose) {
    var addr = (wallet.data && wallet.data.depositAddress) || "", newImage = "";
    var root = document.createElement("div"); root.className = "sd-modal";
    root.innerHTML = '<div class="sd-dialog" role="dialog" aria-modal="true">' +
      '<div class="sd-dhead"><h3>' + esc(purpose === "guarantee" ? T("sd.guaranteerecharge") : T("sd.offlinerecharge")) + '</h3><button class="sd-dclose" id="rcX">×</button></div>' +
      '<div class="sd-dbody">' +
        '<p class="sd-msg" id="rcMsg" hidden></p>' +
        '<div class="sd-usdtcard"><svg class="sd-tether" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#fff" d="M17.9 17.4v-2.07c3 .13 5.2.6 5.2 1.15 0 .55-2.3 1.02-5.2 1.15v-.23zm0-2.28V13.3H23V9.5H9v3.8h5.1v1.82c-2.9.13-5.1.6-5.1 1.1 0 .5 2.2.9 5.1 1.05v6.73h3.8v-6.73c2.9-.15 5.1-.55 5.1-1.05 0-.5-2.2-.97-5.1-1.1z"/></svg><b>' + esc(T("sd.usdt")) + '</b></div>' +
        '<div class="sd-addr"><code id="rcAddr">' + esc(addr) + '</code><button type="button" id="rcCopy">' + esc(T("sd.copy")) + '</button></div>' +
        '<p class="sd-txnote">' + esc(T("sd.uploadvoucher")) + '</p>' +
        '<div class="sd-field"><label>' + esc(T("sd.amount")) + '</label><input id="rcAmt" type="number" min="1" step="0.01" placeholder="0.00"></div>' +
        '<div class="sd-field"><label>' + esc(T("sd.photo")) + ' <i style="color:var(--no)">*</i></label>' +
          // Browse | file name picker → photo preview underneath (with ✕ to remove)
          '<div class="sd-filepick" id="rcDrop"><label class="sd-browse"><input type="file" id="rcFile" accept="image/*">' + esc(T("sd.browse")) + '</label>' +
            '<span class="sd-filename" id="rcFn">' + esc(T("sd.chooseimg")) + '</span></div>' +
          '<div class="sd-vbox" id="rcFileBox" hidden><img id="rcPrev" alt="">' +
            '<button type="button" id="rcRemove" class="sd-vrm" aria-label="' + esc(T("sd.removebtn")) + '">×</button></div></div>' +
      '</div>' +
      '<div class="sd-dfoot"><button class="sd-btn sd-btn-grey" id="rcCancel">' + esc(T("sd.cancel")) + '</button><button class="sd-btn" id="rcSave">' + esc(T("sd.confirm")) + '</button></div></div>';
    document.body.appendChild(root);
    function close() { root.remove(); }
    $("rcX").onclick = close; $("rcCancel").onclick = close;
    $("rcCopy").onclick = function () { try { navigator.clipboard.writeText(addr); } catch (e) {} ok(T("sd.copied")); };
    // Photo: pick, drag & drop, change or remove
    async function takeFile(f) {
      if (!f) return;
      if (!/^image\//.test(f.type)) { var m = $("rcMsg"); m.hidden = false; m.textContent = T("sd.photoreq"); return; }
      newImage = await fileToImage(f, 1200);
      if (!newImage) return;
      $("rcPrev").src = newImage; $("rcFn").textContent = f.name; $("rcFn").classList.add("has");
      $("rcFileBox").hidden = false; $("rcDrop").classList.remove("sd-invalid"); $("rcMsg").hidden = true;
    }
    $("rcFile").addEventListener("change", function () { takeFile(this.files[0]); this.value = ""; });
    $("rcRemove").onclick = function () { newImage = ""; $("rcFileBox").hidden = true; $("rcFn").textContent = T("sd.chooseimg"); $("rcFn").classList.remove("has"); };
    var drop = $("rcDrop");
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("drag"); }); });
    drop.addEventListener("drop", function (e) { takeFile(e.dataTransfer && e.dataTransfer.files[0]); });
    $("rcSave").addEventListener("click", async function () {
      var msg = $("rcMsg"); msg.hidden = true;
      var amt = Number($("rcAmt").value) || 0;
      if (!(amt > 0)) { msg.hidden = false; msg.textContent = T("sd.amountreq"); return; }
      // The payment screenshot is required.
      var pick = $("rcDrop");
      if (!newImage) { msg.hidden = false; msg.textContent = T("sd.photoreq"); if (pick) pick.classList.add("sd-invalid"); return; }
      if (!session.token) { reloginSoon(); return; }
      var btn = this; btn.disabled = true; btn.textContent = T("sd.saving");
      try {
        var body = { action: "sellerDeposit", token: session.token, amount: amt, purpose: purpose };
        if (newImage) body.voucher = newImage;
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
        var j = await r.json();
        if (!j.ok) { btn.disabled = false; btn.textContent = T("sd.confirm"); if (j.auth) reloginSoon(); else { msg.hidden = false; msg.textContent = j.error || "Couldn't submit."; } return; }
        close(); ok(T("sd.reqsent")); await ensureWallet();
      } catch (x) { btn.disabled = false; btn.textContent = T("sd.confirm"); msg.hidden = false; msg.textContent = "Can't reach the server right now."; }
    });
  }

  // Withdrawal request modal.
  // Withdrawals need money above the guarantee: withdrawable = wallet − guarantee.
  // Without enough money the popup still opens, but only shows the balances
  // and a notice — the form and Send button stay disabled.
  function openWithdraw() {
    var bal = (wallet.data && wallet.data.balances) || {};
    var walletMoney = Number(bal.walletMoney) || 0, guarantee = Number(bal.guaranteeMoney) || 0;
    var available = Math.max(0, Math.round((walletMoney - guarantee) * 100) / 100);
    var root = document.createElement("div"); root.className = "sd-modal";
    root.innerHTML = '<div class="sd-dialog" style="width:430px" role="dialog" aria-modal="true">' +
      '<div class="sd-dhead"><h3>' + esc(T("sd.withdrawtitle")) + '</h3><button type="button" class="sd-dclose" id="wdX" aria-label="Close">&times;</button></div>' +
      '<div class="sd-dbody">' +
        '<p class="sd-msg" id="wdMsg" hidden></p>' +
        '<div class="sd-wdblock" id="wdBlock" hidden></div>' +
        '<div class="sd-wbalrow"><span>' + esc(T("sd.walletbalance")) + ' :</span> <b id="wdWallet">$' + walletMoney.toFixed(2) + '</b></div>' +
        '<div class="sd-wbalrow"><span>' + esc(T("sd.guaranteebalance")) + ' :</span> <b id="wdGuar">$' + guarantee.toFixed(2) + '</b></div>' +
        '<div class="sd-wbalrow last"><span>' + esc(T("sd.withdrawable")) + ' :</span> <b id="wdAvail">$' + available.toFixed(2) + '</b></div>' +
        '<div id="wdForm">' +
        '<div class="sd-field"><label>' + esc(T("sd.amount")) + ' <span class="sd-req">*</span></label><input id="wdAmt" type="number" min="1" step="0.01" placeholder="0.00"></div>' +
        '<div class="sd-field"><label>' + esc(T("sd.operatype")) + '</label><select id="wdOpera" class="sd-select" style="width:100%"><option value="user_balance">' + esc(T("sd.userbalance")) + '</option></select></div>' +
        '<div class="sd-field"><label>' + esc(T("sd.withdrawtype")) + '</label><select id="wdMethod" class="sd-select" style="width:100%"><option value="bank">' + esc(T("sd.bank")) + '</option><option value="usdt">' + esc(T("sd.usdt")) + '</option></select></div>' +
        '<div class="sd-field"><label>' + esc(T("sd.message")) + ' <span class="sd-req">*</span></label><textarea id="wdNote" rows="4" placeholder="' + esc(T("sd.messageph")) + '"></textarea></div>' +
        '</div>' +
      '</div>' +
      '<div class="sd-dfoot" style="padding-top:4px"><button type="button" class="sd-btn" id="wdSave" style="width:100%">' + esc(T("sd.send")) + '</button></div></div>';
    document.body.appendChild(root);
    function close() { document.removeEventListener("keydown", onKey); root.remove(); }
    function onKey(e) { if (e.key === "Escape") close(); }
    $("wdX").onclick = close;
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    document.addEventListener("keydown", onKey);

    // Enable the form only when there's money to withdraw; re-checked with
    // fresh balances from the server as soon as they arrive.
    function applyBalances(b) {
      walletMoney = Number(b.walletMoney) || 0; guarantee = Number(b.guaranteeMoney) || 0;
      available = Math.max(0, Math.round((walletMoney - guarantee) * 100) / 100);
      $("wdWallet").textContent = "$" + walletMoney.toFixed(2); $("wdGuar").textContent = "$" + guarantee.toFixed(2);
      $("wdAvail").textContent = "$" + available.toFixed(2);
      var can = available > 0, form = $("wdForm"), blk = $("wdBlock");
      blk.hidden = can; if (!can) blk.textContent = T("sd.nowithdrawpop");
      form.classList.toggle("sd-disabled", !can);
      form.querySelectorAll("input,select,textarea").forEach(function (el) { el.disabled = !can; });
      $("wdSave").disabled = !can;
    }
    applyBalances(bal);
    fetchWallet(false).then(function (d) { if (d && d.balances && document.body.contains(root)) applyBalances(d.balances); });

    $("wdSave").addEventListener("click", async function () {
      var msg = $("wdMsg"); msg.hidden = true;
      var amt = Number($("wdAmt").value) || 0, method = $("wdMethod").value, note = $("wdNote").value.trim(), opera = $("wdOpera").value;
      function fail(t) { msg.hidden = false; msg.textContent = t; }
      if (!(amt > 0)) return fail(T("sd.amountreq"));
      if (available <= 0) return fail(T("sd.nowithdraw"));
      if (!note) return fail(T("sd.messagereq"));
      if (!session.token) { reloginSoon(); return; }
      var btn = this; btn.disabled = true; btn.textContent = T("sd.saving");
      try {
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "sellerWithdraw", token: session.token, amount: amt, method: method, note: note, operaType: opera }) });
        var j = await r.json();
        if (!j.ok) { btn.disabled = false; btn.textContent = T("sd.send"); if (j.auth) reloginSoon(); else fail(j.error || "Couldn't submit."); return; }
        close(); ok(T("sd.reqsent")); await ensureWallet();
      } catch (x) { btn.disabled = false; btn.textContent = T("sd.send"); fail("Can't reach the server right now."); }
    });
  }

  /* ------------------------------- Orders -------------------------------- */
  // Orders placed for this seller's shop (e.g. by staff for VIP customers).
  // Fills the Orders view, the "Total Orders" card, the "This month" counters
  // and the sidebar badge (new = still "received").
  var orders = { list: null, busy: null, page: 1 };
  var ORDERS_PER_PAGE = 10;
  function fetchOrders() {
    if (orders.busy) return orders.busy;
    if (!session.token || !CONFIG.API_URL) return Promise.resolve(null);
    orders.busy = chatPost({ action: "sellerOrders" }).then(function (j) {
      orders.busy = null;
      if (j && j.ok) { orders.list = j.orders || []; paintOrderStats(); }
      else if (j && j.auth) reloginSoon();
      return orders.list;
    }, function () { orders.busy = null; return orders.list; });
    return orders.busy;
  }
  function paintOrderStats() {
    var list = orders.list || [], now = new Date();
    var month = list.filter(function (o) { var d = new Date(o.createdAt); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); });
    var count = function (arr, sts) { return arr.filter(function (o) { return sts.indexOf(o.status) > -1; }).length; };
    if ($("sdCardOrders")) $("sdCardOrders").textContent = list.length;
    var v = document.querySelectorAll(".sd-ord-row .sd-ord-v");
    if (v.length === 3) { v[0].textContent = count(month, ["pending", "received"]); v[1].textContent = count(month, ["cancelled"]); v[2].textContent = count(month, ["processing", "shipped"]); }
    var pill = document.querySelector('.sd-nav a[data-view="orders"] .sd-pill'), fresh = count(list, ["pending", "received"]);
    if (pill) { pill.textContent = fresh; pill.hidden = !fresh; }
  }
  // Order date + time in Indian Standard Time: "27/11/2026" and "3:11 AM IST".
  var IST_DATE = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" });
  var IST_TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
  function istDateTime(iso) {
    var d = new Date(iso); if (isNaN(d)) return "—";
    return '<div class="sd-odate">' + esc(IST_DATE.format(d)) + "</div>" +
      '<small class="sd-otime">' + esc(IST_TIME.format(d).toUpperCase()) + " IST</small>";
  }
  function orderQty(o) { return (o.items || []).reduce(function (n, x) { return n + (Number(x.qty) || 1); }, 0); }
  function orderProfit(o) { return (o.items || []).reduce(function (n, x) { return n + (Number(x.profit) || 0) * (Number(x.qty) || 1); }, 0); }
  // Pending section = every order still on its way (pending, received,
  // processing, shipped); Delivered = delivered. Cancelled orders count in
  // neither — they only appear in the records table.
  function paintOrderSummary() {
    var list = orders.list || [], pend = { n: 0, amt: 0, profit: 0 }, done = { n: 0, amt: 0, profit: 0 };
    list.forEach(function (o) {
      if (o.status === "cancelled") return;
      var b = o.status === "delivered" ? done : pend;
      b.n++; b.amt += Number(o.total) || 0; b.profit += orderProfit(o);
    });
    var lbl = function (n) { return n + " " + T(n === 1 ? "sd.order1" : "sd.orderN"); };
    if (!$("osPendAmt")) return;
    $("osPendAmt").textContent = money(pend.amt); $("osPendProfit").textContent = money(pend.profit); $("osPendCount").textContent = lbl(pend.n);
    $("osDoneAmt").textContent = money(done.amt); $("osDoneProfit").textContent = money(done.profit); $("osDoneCount").textContent = lbl(done.n);
  }
  function renderOrders() {
    var grid = $("ordGrid"), e = $("ordEmpty"), all = orders.list || [];
    paintOrderSummary();
    if (!all.length) { grid.innerHTML = ""; e.hidden = false; e.textContent = T("sd.noorders"); return; }
    e.hidden = true;
    // 10 orders per page (newest first)
    var pages = Math.max(1, Math.ceil(all.length / ORDERS_PER_PAGE));
    orders.page = Math.min(Math.max(1, orders.page || 1), pages);
    var from = (orders.page - 1) * ORDERS_PER_PAGE, list = all.slice(from, from + ORDERS_PER_PAGE);
    grid.innerHTML = '<div class="sd-tablewrap"><table class="sd-table"><thead><tr>' +
      "<th>" + esc(T("sd.th.orderkey")) + "</th><th>" + esc(T("sd.th.product")) + "</th><th>" + esc(T("sd.customer")) + "</th>" +
      "<th>" + esc(T("sd.amount")) + "</th><th>" + esc(T("sd.profit")) + "</th><th>" + esc(T("sd.date")) + "</th><th>" + esc(T("sd.status")) + "</th>" +
      "</tr></thead><tbody>" + list.map(function (o) {
        var it = (o.items && o.items[0]) || {}, more = (o.items || []).length - 1;
        var key = String(o.identifier || "").trim() || "#" + o.id;   // the sheet's identifier column
        return '<tr class="' + esc(o.status) + '">' +
          '<td><span class="sd-okey">' + esc(key) + "</span></td>" +
          '<td><div class="sd-oprod"><span class="sd-oimg">' + (it.imageUrl ? '<img src="' + esc(it.imageUrl) + '" alt="" loading="lazy">' : "") + "</span>" +
            '<div style="min-width:0"><div class="sd-oname" title="' + esc(it.name || "") + '">' + esc(it.name || "—") + (more > 0 ? " +" + more : "") + "</div>" +
            '<small style="color:var(--muted)">' + esc(T("sd.th.qty")) + ": " + orderQty(o) + "</small></div></div></td>" +
          "<td>" + esc(o.customerName || "—") + "</td>" +
          '<td class="sd-num">' + money(o.total) + "</td>" +
          '<td class="sd-num profit">' + money(orderProfit(o)) + "</td>" +
          "<td>" + istDateTime(o.createdAt) + "</td>" +
          '<td><span class="sd-ost st-' + esc(o.status) + '">' + esc(T("sd.st." + o.status)) + "</span></td>" +
        "</tr>";
      }).join("") + "</tbody></table></div>" + pagerHtml(orders.page, pages, from + 1, from + list.length, all.length);
  }
  // "Showing 11–20 of 34" + ‹ 1 2 3 › (with … for long ranges)
  function pagerHtml(page, pages, a, b, total, noTotal, extra) {
    // noTotal: product lists don't reveal how many products exist — page buttons only
    var info = noTotal ? "<span></span>" : '<span class="sd-pinfo">' + esc(T("sd.showing").replace("{a}", a).replace("{b}", b).replace("{n}", total)) + "</span>";
    if (noTotal && pages <= 1) return "";
    if (pages <= 1) return '<div class="sd-pager">' + info + "</div>";
    var nums = [], i;
    for (i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    var btn = function (p, label, extra) {
      return '<button type="button" class="sd-pbtn' + (extra || "") + '" data-page="' + p + '"' + (extra === " dis" ? " disabled" : "") + ">" + label + "</button>";
    };
    return '<div class="sd-pager">' + info + '<div class="sd-pnums">' +
      btn(page - 1, "‹", page === 1 ? " dis" : "") +
      nums.map(function (n) { return n === "…" ? '<span class="sd-pgap">…</span>' : btn(n, n, n === page ? " on" : ""); }).join("") +
      btn(page + 1, "›", page === pages ? " dis" : "") + (extra || "") + "</div></div>";
  }
  function ensureOrders() {
    if (!orders.list) { $("ordGrid").innerHTML = '<p class="sd-empty">' + esc(T("sd.loading")) + "</p>"; $("ordEmpty").hidden = true; }
    else renderOrders();
    fetchOrders().then(function () { if (!$("viewOrders").hidden) renderOrders(); });
  }

  /* ---------------------------- Support chat ----------------------------- */
  // The "Conversations" view: a chat between this seller and the support team
  // (js/chat.js). A light background check keeps the unread badge current.
  var chat = null, _chatUnread = 0, _chatTimer = null;
  var _chatPushed = false;   // opened chat with a history entry → phone Back button closes it
  function chatPost(body) {
    body.token = session.token;
    return fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function setChatBadge(n) {
    var txt = n > 99 ? "99+" : String(n), b = $("sdChatBadge");
    if (b) { b.hidden = !(n > 0); b.textContent = txt; }
    var fb = document.querySelector("#spFab .sp-badge");
    if (fb) { fb.hidden = !(n > 0); fb.textContent = txt; }
    // phones: Conversations lives under "More", so badge that tab too
    var more = $("sdTabMore");
    if (more) {
      var mb = more.querySelector(".sd-tabbadge");
      if (!mb) { mb = document.createElement("span"); mb.className = "sd-tabbadge"; more.appendChild(mb); }
      mb.hidden = !(n > 0); mb.textContent = txt;
    }
  }
  function chatHeader() {
    return { title: (CONFIG.BRAND_NAME || "Shop") + " " + T("sd.support"), avatar: "images/support-agent.svg", online: true,
             subtitle: '<span class="ct-live"></span>' + esc(T("sd.chatsub")) };
  }
  function ensureChat() {
    setChatBadge(0); _chatUnread = 0;
    if (chat) { chat.refresh(); setTimeout(chat.focus, 50); return; }
    if (!session.token || !CONFIG.API_URL) { reloginSoon(); return; }
    chat = CHAT.create({
      root: $("sdChat"), me: "seller", lang: (window.I18N && I18N.get()) || "en", header: chatHeader(),
      their: { avatar: "images/support-agent.svg" },
      // back arrow (shown in the full-screen phone layout)
      onBack: function () { if (_chatPushed) history.back(); else switchView("dashboard"); },
      fetch: function (sinceId, mark) { return chatPost({ action: "sellerChat", sinceId: sinceId, mark: mark }); },
      send: function (m) { return chatPost({ action: "sellerChatSend", text: m.text, images: m.images }); },
      getImage: function (m, url) { return chatPost({ action: "sellerChatImage", url: url }); },
      onAuth: reloginSoon
    });
  }
  // Every 20s (only while the tab is visible and the chat isn't open): count
  // unread support replies → badge + a toast when a new one arrives.
  function startChatWatch() {
    if (_chatTimer || !session.token || !CONFIG.API_URL) return;
    async function check() {
      if (document.visibilityState !== "visible" || !$("viewChat").hidden) return;
      try {
        var j = await chatPost({ action: "sellerChat", sinceId: 1e15, mark: "delivered" });
        if (!j || !j.ok) return;
        var n = Number(j.unread) || 0;
        if (n > _chatUnread) toast(T("sd.newchat"));
        _chatUnread = n; setChatBadge(n);
      } catch (e) {}
    }
    check(); _chatTimer = setInterval(check, 20000);
  }

  var VIEWS = ["dashboard", "storehouse", "products", "wallet", "orders", "chat"];
  function switchView(name, fromHash) {
    if (VIEWS.indexOf(name) < 0) name = "dashboard";
    document.querySelectorAll('.sd-nav a[data-view]').forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-view") === name); });
    document.querySelectorAll('.sd-tab[data-tab]').forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-tab") === name); });
    $("viewDashboard").hidden = name !== "dashboard";
    $("viewStorehouse").hidden = name !== "storehouse";
    $("viewProducts").hidden = name !== "products";
    $("viewWallet").hidden = name !== "wallet";
    $("viewOrders").hidden = name !== "orders";
    $("viewChat").hidden = name !== "chat";
    if ($("spFab")) $("spFab").hidden = name === "chat";          // already on the chat
    var key = { storehouse: "sd.storehouse", products: "sd.products", wallet: "sd.withdraw", orders: "sd.orders", chat: "sd.conversations" }[name] || "sd.dashboard";
    var title = $("sdTopTitle"); if (title) { title.setAttribute("data-i18n", key); if (window.I18N) I18N.apply(title); }
    if (name === "storehouse") ensureStorehouse();
    if (name === "products") ensureMyProducts();
    if (name === "wallet") ensureWallet();
    if (name === "orders") ensureOrders();
    if (name === "chat") ensureChat();
    // keep the URL hash in sync so the storefront can deep-link (e.g. #wallet)
    if (!fromHash) {
      try {
        if (name === "chat" && location.hash !== "#chat") { history.pushState(null, "", "#chat"); _chatPushed = true; }
        else history.replaceState(null, "", name === "dashboard" ? location.pathname + location.search : "#" + name);
      } catch (e) {}
    }
    if (name !== "chat") _chatPushed = false;
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------ Language ------------------------------- */
  function buildLang() {
    if (!window.I18N) return;
    var langs = I18N.langs, menu = $("sdLangMenu"), btn = $("sdLangBtn");
    function paintBtn() { var cur = I18N.get(); $("sdLangFlag").innerHTML = langs[cur].flag; $("sdLangCode").textContent = langs[cur].code; }
    btn.classList.add("notranslate"); btn.setAttribute("translate", "no");
    menu.classList.add("notranslate"); menu.setAttribute("translate", "no");
    menu.innerHTML = Object.keys(langs).map(function (code) {
      var l = langs[code];
      return '<button type="button" data-l="' + code + '"' + (code === I18N.get() ? ' class="on"' : '') +
        '><span class="sd-fl">' + l.flag + '</span><span class="lang-nm">' + l.name + '<small>' + l.country + '</small></span></button>';
    }).join("");
    paintBtn();
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-l]"); if (!b) return;
      I18N.setLang(b.getAttribute("data-l"));
      menu.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      paintBtn(); close();
    });
    document.addEventListener("click", close);
    document.addEventListener("i18n:change", paintBtn);
  }

  function refreshTips() {
    document.querySelectorAll(".sd-nav a").forEach(function (a) {
      var lbl = a.querySelector("span[data-i18n]");
      if (lbl) { a.setAttribute("data-tip", lbl.textContent); a.setAttribute("title", lbl.textContent); }
    });
  }

  function init() {
    session = (window.SELLER && SELLER.current && SELLER.current()) || null;
    if (!session) { location.href = "login.html?next=seller-dashboard.html"; return; }

    var rating = Math.max(0, Math.min(5, Number(session.rating) || 0));
    var verified = String(session.shopStatus) === "1" || session.shopStatus === 1 || session.shopStatus === "verified";

    paintIdentity(session);
    $("sdStars").innerHTML = stars(rating);
    $("sdRnum").textContent = rating.toFixed(1);

    var badge = $("sdVerifyBadge"), vbtn = $("sdVerifyBtn");
    if (verified) {
      badge.className = "sd-badge sd-badge-ok";
      badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span data-i18n="sd.verified">Shop verified</span>';
      if (window.I18N) I18N.apply(badge);
      if (vbtn) vbtn.style.display = "none";
    } else if (vbtn) {
      vbtn.addEventListener("click", function () { toast(T("sd.verifymsg")); });
    }

    var bars = $("sdBars");
    if (bars) { var h = ""; for (var i = 0; i < 7; i++) h += '<div class="sd-bar" style="height:0"></div>'; bars.innerHTML = h; }

    // Placeholder menu items (no page yet) — just don't navigate; no message.
    document.querySelectorAll("[data-soon]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); });
    });

    // Refresh the page
    var refresh = $("sdRefresh");
    if (refresh) refresh.addEventListener("click", function () { location.reload(); });

    // Notifications
    var bell = $("sdBell");
    if (bell) bell.addEventListener("click", function () { toast(T("sd.nonotif")); });

    // Wallet action buttons + live balances on the dashboard
    if ($("wlWithdraw")) $("wlWithdraw").addEventListener("click", openWithdraw);
    if ($("wlRecharge")) $("wlRecharge").addEventListener("click", function () { openRecharge("deposit"); });
    // Guarantee Recharge: kept for layout only (guarantee money is set by staff) — no action.
    fetchWallet();   // populate Guarantee Money, Total Products and Wallet Balance cards
    pollSellerTx();  // silent background refresh (no sound/voice alerts)
    _sTxTimer = setInterval(pollSellerTx, 20000);

    // Lock page scroll whenever a modal is open (background stays non-interactive).
    if ("MutationObserver" in window) new MutationObserver(function () {
      document.documentElement.classList.toggle("sd-noscroll", !!document.querySelector(".sd-modal"));
    }).observe(document.body, { childList: true });
    document.addEventListener("i18n:change", function () { if (wallet.data && !$("viewWallet").hidden) renderWallet(); });

    // Profile + change-password (account menu)
    function fromMenu(fn) { return function (e) { e.preventDefault(); var m = $("sdWhoMenu"); if (m) m.hidden = true; fn(); }; }
    var pwbtn = $("sdPwBtn"); if (pwbtn) pwbtn.addEventListener("click", fromMenu(openChangePw));

    // View switching (Dashboard / Product Storehouse)
    document.querySelectorAll('.sd-nav a[data-view]').forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); switchView(a.getAttribute("data-view")); });
    });
    // Storehouse filters + selection
    ["stSearch", "stCat", "stStock"].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener(id === "stSearch" ? "input" : "change", function () { store.page = 1; renderStore(); });
    });
    // page buttons under the product lists
    [["stPager", store, function () { renderStore(); }, "stGrid"], ["mpPager", mine, function () { renderMy(); }, "mpGrid"]].forEach(function (x) {
      var box = $(x[0]); if (!box) return;
      box.addEventListener("click", function (e) {
        var b = e.target.closest("[data-page]"); if (!b || b.disabled) return;
        x[1].page = Number(b.getAttribute("data-page")) || 1; x[2]();
        var top = $(x[3]); if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    if ($("stGrid")) { $("stGrid").addEventListener("click", onStoreClick); $("stGrid").addEventListener("change", onStoreInput); }
    if ($("stPanel")) { $("stPanel").addEventListener("click", onStoreClick); $("stPanel").addEventListener("input", onStoreInput); }
    // My Products
    if ($("mpSearch")) $("mpSearch").addEventListener("input", function () { mine.page = 1; renderMy(); });
    if ($("mpGrid")) $("mpGrid").addEventListener("click", onMyClick);
    if ($("mpAdd")) $("mpAdd").addEventListener("click", function () { switchView("storehouse"); });

    // Dashboard quick-action cards
    document.querySelectorAll('.sd-action[data-view]').forEach(function (el) {
      el.addEventListener("click", function () { switchView(el.getAttribute("data-view")); });
    });
    if ($("sdGoSetting")) $("sdGoSetting").addEventListener("click", openProfile);
    if ($("sdConfigPay")) $("sdConfigPay").addEventListener("click", openPayment);
    // "Shop Setting" sidebar menu opens the same editor as "Show Profile".
    if ($("sdShopSetting")) $("sdShopSetting").addEventListener("click", function (e) { e.preventDefault(); openProfile(); });
    document.addEventListener("i18n:change", function () {
      if (store.loaded) { fillCatSelect(); renderStore(); }
      if (mine.loaded) renderMy();
    });

    // Logout (sidebar + account menu)
    function doLogout(e) { if (e) e.preventDefault(); if (window.SELLER && SELLER.logout) SELLER.logout(); location.href = "login.html"; }
    ["sdLogout", "sdLogout2"].forEach(function (id) { if ($(id)) $(id).addEventListener("click", doLogout); });

    refreshTips();
    document.addEventListener("i18n:change", refreshTips);

    // Sidebar collapse (desktop) — remembered across visits
    var shell = $("sdShell"), collapse = $("sdCollapse"), CKEY = "mm_sd_collapsed";
    try { if (localStorage.getItem(CKEY) === "1") shell.classList.add("sd-collapsed"); } catch (e) {}
    if (collapse) collapse.addEventListener("click", function () {
      var on = shell.classList.toggle("sd-collapsed");
      try { localStorage.setItem(CKEY, on ? "1" : "0"); } catch (e) {}
    });

    // Account dropdown (top-right)
    var whoBtn = $("sdWhoBtn"), whoMenu = $("sdWhoMenu");
    if (whoBtn && whoMenu) {
      whoBtn.addEventListener("click", function (e) { e.stopPropagation(); whoMenu.hidden = !whoMenu.hidden; whoBtn.setAttribute("aria-expanded", String(!whoMenu.hidden)); });
      whoMenu.addEventListener("click", function (e) { e.stopPropagation(); });
      document.addEventListener("click", function () { whoMenu.hidden = true; whoBtn.setAttribute("aria-expanded", "false"); });
    }

    // Mobile drawer
    var burger = $("sdBurger"), backdrop = $("sdBackdrop");
    function closeDrawer() { shell.classList.remove("sd-open"); }
    if (burger) burger.addEventListener("click", function () { shell.classList.toggle("sd-open"); });
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    // Bottom tab bar (mobile) → same views as the sidebar; "More" opens the drawer.
    document.querySelectorAll('.sd-tab[data-tab]').forEach(function (t) {
      t.addEventListener("click", function () { switchView(t.getAttribute("data-tab")); closeDrawer(); });
    });
    if ($("sdTabMore")) $("sdTabMore").addEventListener("click", function () { shell.classList.add("sd-open"); });
    document.querySelectorAll(".sd-nav a").forEach(function (a) { a.addEventListener("click", closeDrawer); });

    buildLang();
    // Show/hide eye on every password field (Change password, etc.), including dialogs opened later.
    if (window.UI && UI.passwordToggles) UI.passwordToggles();
    // Floating support button (bottom-right on every view) → Conversations
    if (!$("spFab")) {
      var fab = document.createElement("button");
      fab.type = "button"; fab.id = "spFab"; fab.className = "sp-fab on-seller";
      fab.setAttribute("aria-label", T("sd.chatwithus"));
      fab.innerHTML = '<img src="images/support-agent.svg" alt=""><span class="sp-dot"></span><span class="sp-badge" hidden>0</span><span class="sp-tip">' + esc(T("sd.chatwithus")) + "</span>";
      fab.addEventListener("click", function () { switchView("chat"); });
      document.body.appendChild(fab);
      fab.hidden = !$("viewChat").hidden;
    }
    startChatWatch();
    fetchOrders();
    document.addEventListener("i18n:change", function () { if (orders.list && !$("viewOrders").hidden) renderOrders(); });
    if ($("ordGrid")) $("ordGrid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-page]"); if (!b || b.disabled) return;
      orders.page = Number(b.getAttribute("data-page")) || 1; renderOrders();
      var panel = $("ordGrid").closest(".sd-panel"); if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.addEventListener("i18n:change", function () {
      if (chat) { chat.setLang((window.I18N && I18N.get()) || "en"); chat.setHeader(chatHeader()); }
    });

    // Deep-link support: open the view named in the URL hash (e.g. the storefront
    // links to seller-dashboard.html#wallet), and follow hash changes.
    // #password / #profile (linked from the shop's side menu) open those dialogs.
    function fromHash() {
      var h = (location.hash || "").replace("#", "");
      if (h === "password" || h === "profile") {
        switchView("dashboard", true);
        try { history.replaceState(null, "", location.pathname + location.search + "#dashboard"); } catch (e) {}
        (h === "password" ? openChangePw : openProfile)();
        return;
      }
      switchView(h || "dashboard", true);
    }
    window.addEventListener("hashchange", fromHash);
    if (location.hash) fromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
