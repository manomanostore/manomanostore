/* ============================ Visitor log + block ============================
   Loaded on EVERY page (shop, seller panel, admin panel) right after config.js.

   • Log: once per browser session for each area (Website / Seller panel /
     Admin panel) and signed-in user, it records the visitor's IP + approximate
     location (from a free IP-lookup service, since Apps Script can't see the
     caller's IP) and device details into the "Visitors" sheet. Runs after the
     page has loaded and never blocks or breaks the page.
   • Block: an admin can block a device on the admin Visitors page. The server
     says so in its reply to the log / status check, and the flag is remembered
     so the block screen covers every page straight away. A blocked device
     re-checks on each page load (so an unblock takes effect on reload); others
     re-check every 5 minutes.
   ========================================================================== */
window.VISIT = (function () {
  var BLK = "mm_blk";
  var file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var AREA = file === "admin.html" ? "Admin panel" : file === "seller-dashboard.html" ? "Seller panel" : "Website";

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function get(kind, k) { var s = store(kind); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(kind, k, v) { var s = store(kind); try { if (s) { if (v == null) s.removeItem(k); else s.setItem(k, v); } } catch (e) {} }
  function json(kind, k) { try { return JSON.parse(get(kind, k) || "null"); } catch (e) { return null; } }

  /* ------------------------------ block screen ------------------------------ */
  function isBlocked() { return get("localStorage", BLK) === "1"; }
  function blockScreen(on) {
    var root = document.documentElement, el = document.getElementById("mmBlocked");
    root.classList.toggle("mm-blocked", on);
    if (!on) { if (el) el.remove(); return; }
    if (!document.getElementById("mmBlockedCss")) {
      var st = document.createElement("style"); st.id = "mmBlockedCss";
      st.textContent = "html.mm-blocked,html.mm-blocked body{overflow:hidden!important}" +
        "html.mm-blocked body>*:not(#mmBlocked){display:none!important}" +
        "#mmBlocked{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f4f6fb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f1b3d}" +
        "#mmBlocked .mb-card{max-width:420px;text-align:center;background:#fff;border-radius:20px;padding:36px 28px;box-shadow:0 12px 40px rgba(15,27,61,.12)}" +
        "#mmBlocked .mb-ic{width:64px;height:64px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:#fdecec;color:#d93636}" +
        "#mmBlocked h1{font-size:22px;margin:0 0 8px}#mmBlocked p{margin:0;color:#5b6478;line-height:1.55;font-size:15px}";
      (document.head || root).appendChild(st);
    }
    if (el) return;
    var add = function () {
      if (document.getElementById("mmBlocked") || !root.classList.contains("mm-blocked")) return;
      var d = document.createElement("div"); d.id = "mmBlocked"; d.setAttribute("role", "alert");
      d.innerHTML = '<div class="mb-card"><div class="mb-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg></div>' +
        '<h1>Access blocked</h1><p>This device has been blocked. If you think this is a mistake, please contact our support team.</p></div>';
      document.body.appendChild(d);
    };
    if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
  }
  function setBlocked(on) { set("localStorage", BLK, on ? "1" : null); blockScreen(on); }
  if (isBlocked()) blockScreen(true);   // immediately, before the page draws

  /* ------------------------------ device details ---------------------------- */
  function deviceInfo() {
    var ua = navigator.userAgent || "", m;
    var tablet = /iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ||
                 (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    var device = tablet ? "Tablet" : /Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(ua) ? "Mobile" : "Desktop";
    var os = "Other";
    if ((m = ua.match(/Windows NT ([\d.]+)/))) os = "Windows " + ({ "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" }[m[1]] || m[1]);
    else if ((m = ua.match(/Android ([\d.]+)/))) os = "Android " + m[1];
    else if ((m = ua.match(/(?:iPhone|CPU) OS (\d+)[_.]?(\d+)?/))) os = (/iPad/.test(ua) ? "iPadOS " : "iOS ") + m[1] + (m[2] ? "." + m[2] : "");
    else if (/Macintosh/.test(ua)) os = tablet ? "iPadOS" : "macOS";
    else if (/CrOS/.test(ua)) os = "ChromeOS";
    else if (/Linux/.test(ua)) os = "Linux";
    var browser = "Other", B = [["Edge", /Edg(?:e|A|iOS)?\/(\d+)/], ["Opera", /(?:OPR|Opera)\/(\d+)/], ["Samsung Internet", /SamsungBrowser\/(\d+)/],
      ["UC Browser", /UCBrowser\/(\d+)/], ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/], ["Chrome", /(?:Chrome|CriOS)\/(\d+)/], ["Safari", /Version\/(\d+).*Safari/]];
    for (var i = 0; i < B.length; i++) if ((m = ua.match(B[i][1]))) { browser = B[i][0] + " " + m[1]; break; }
    var model = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (tablet && /Macintosh/.test(ua)) ? "iPad" : "";
    if (!model && (m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/)) && m[1] !== "K") model = m[1].trim();
    return { device: device, os: os, browser: browser, model: model };
  }
  function screenText() {
    return screen.width + "x" + screen.height + (window.devicePixelRatio > 1 ? " @" + Math.round(window.devicePixelRatio * 10) / 10 + "x" : "");
  }

  // Who is signed in on THIS page: an admin on the admin panel, otherwise a
  // seller or a shop customer.
  function currentUser() {
    try {
      if (AREA === "Admin panel") {
        var s = json("localStorage", "mm_admin"), a = s && s.admin;
        return a && a.username ? "Admin: " + (a.name || a.username) + " (@" + a.username + ")" : "";
      }
      var sel = json("localStorage", "mm_seller");
      if (sel && sel.id) return "Seller: " + (sel.shopName || sel.name || "") + " #" + sel.id;
      var cu = window.AUTH && AUTH.current && AUTH.current();
      if (cu && cu.id) return "Customer: " + (cu.name || cu.email || cu.phone || "") + " #" + cu.id;
    } catch (e) {}
    return "";
  }

  function visitorId() {
    var vid = get("localStorage", "mm_vid");
    if (!vid) { vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); set("localStorage", "mm_vid", vid); }
    return vid;
  }

  /* --------------------------------- server --------------------------------- */
  function post(body) {
    return fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body), keepalive: true })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        set("sessionStorage", "mm_vchk", String(Date.now()));
        if (res && res.ok && typeof res.blocked === "boolean") setBlocked(res.blocked);
      }).catch(function () {});
  }

  var ran = false;
  function track() {
    if (ran) return; ran = true;
    if (!window.CONFIG || !CONFIG.API_URL || !store("localStorage")) return;
    var vid = visitorId(), user = currentUser();
    var key = "mm_visit:" + AREA + ":" + user;
    if (get("sessionStorage", key)) {
      // Already logged this session for this area + user: just re-check the block
      // status — always when blocked, otherwise every 5 minutes.
      var last = Number(get("sessionStorage", "mm_vchk")) || 0;
      if (!isBlocked() && Date.now() - last < 5 * 60e3) return;
      var fp = json("sessionStorage", "mm_vfp") || {};
      var di = deviceInfo();
      post({ action: "logVisit", check: true, visit: { visitorId: vid, ip: fp.ip || "", userAgent: navigator.userAgent, screen: screenText(), device: di.device, os: di.os } });
      return;
    }
    set("sessionStorage", key, "1");
    var d = deviceInfo(), ref = "";
    try { ref = document.referrer ? new URL(document.referrer).host : ""; } catch (e) {}
    var visit = { visitorId: vid, area: AREA, device: d.device, os: d.os, browser: d.browser, model: d.model, user: user,
      screen: screenText(), language: navigator.language || "", page: file + location.search,
      referrer: ref && ref !== location.host ? ref : "", userAgent: navigator.userAgent,
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || "") };
    var send = function () {
      set("sessionStorage", "mm_vfp", JSON.stringify({ ip: visit.ip || "", screen: visit.screen }));
      post({ action: "logVisit", visit: visit });
    };
    // Model + OS version from Client Hints where the browser offers them (Chrome on Android hides the model in the UA).
    var hints = navigator.userAgentData && navigator.userAgentData.getHighEntropyValues
      ? navigator.userAgentData.getHighEntropyValues(["model", "platformVersion"]).then(function (h) {
          if (h.model) visit.model = h.model;
          if (/^Windows/.test(visit.os) && h.platformVersion) visit.os = parseInt(h.platformVersion, 10) >= 13 ? "Windows 11" : "Windows 10";
        }).catch(function () {}) : Promise.resolve();
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    var geo = fetch("https://get.geojs.io/v1/ip/geo.json", ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); })
      .then(function (g) {
        visit.ip = g.ip || ""; visit.country = g.country || ""; visit.region = g.region || ""; visit.city = g.city || "";
        visit.isp = g.organization_name || g.organization || ""; if (g.timezone) visit.timezone = g.timezone;
      })
      .catch(function () {   // lookup blocked (ad blocker / network): still try for the bare IP
        return fetch("https://api.ipify.org?format=json").then(function (r) { return r.json(); }).then(function (g) { visit.ip = g.ip || ""; }).catch(function () {});
      });
    Promise.all([hints, geo]).then(function () { clearTimeout(t); send(); }, send);
  }

  // Run once the page (and the sign-in scripts after this file) have loaded.
  var start = function () { setTimeout(track, isBlocked() ? 0 : 1200); };
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);

  // The admin Visitors page uses this to stop an admin blocking their own device.
  function self() {
    var fp = json("sessionStorage", "mm_vfp") || {};
    var d = deviceInfo();
    return { vid: get("localStorage", "mm_vid") || "", ip: fp.ip || "", ua: navigator.userAgent, screen: screenText(), device: d.device, os: d.os };
  }
  return { area: AREA, self: self, track: track };
})();
