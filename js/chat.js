/* =============================== Support chat ============================= */
/* One chat widget shared by the seller dashboard (seller ↔ support) and the
   admin panel (support ↔ a seller). The host page supplies two functions:
     fetch(sinceId, mark) → { ok, messages, lastDelivered, lastSeen, unread, auth?, error? }
     send({ text, images }) → { ok, message, auth?, error? }
   Features: text + several images per message (pick, paste or drag-drop
   screenshots), WhatsApp-style ticks (✓ sent, ✓✓ delivered, blue ✓✓ seen),
   Indian Standard Time everywhere, date separators, image lightbox, retry on
   failure, polling while the chat is visible.                                */
window.CHAT = (function () {
  var TZ = "Asia/Kolkata", MAX_IMAGES = 6, MAX_TEXT = 4000;

  /* ------------------------------ i18n --------------------------------- */
  var DICT = {
    en: {
      placeholder: "Type a message…", send: "Send", attach: "Attach images", today: "Today", yesterday: "Yesterday",
      loading: "Loading conversation…", seen: "Seen", sending: "Sending…", failed: "Not sent. Tap to retry",
      newmsg: "New messages", drop: "Drop images to send", ist: "Times in IST (GMT+5:30)", photo: "Photo",
      tooMany: "You can send up to 6 images at a time.", notImage: "Only images can be sent.",
      emptyTitle: "How can we help?", emptySub: "Send us a message and our support team will reply here. You can attach screenshots too.",
      emptyAdminTitle: "No messages yet", emptyAdminSub: "Start the conversation — the seller will see it in their dashboard.",
      offline: "Can't reach the server. Retrying…", remove: "Remove", close: "Close", open: "Open original",
      copy: "Copy text", copied: "Copied", copyImg: "Copy image", copyImgN: "Copy image {n}", copyingImg: "Copying image…",
      copiedImg: "Image copied — paste it anywhere", copyImgFail: "Couldn't copy this image", copyImgNo: "This browser can't copy images — right-click the photo to save it", del: "Delete message", deleted: "Message deleted",
      delAsk: "Delete this message? It will be removed for the seller too.", clear: "Clear conversation",
      clearAsk: "Delete every message in this conversation? This can't be undone.", cleared: "Conversation cleared", more: "Message options",
      chips: ["Withdrawal not received", "Deposit not credited", "Shop verification", "Product question"]
    },
    hi: {
      placeholder: "संदेश लिखें…", send: "भेजें", attach: "इमेज जोड़ें", today: "आज", yesterday: "कल",
      loading: "बातचीत लोड हो रही है…", seen: "देखा गया", sending: "भेजा जा रहा है…", failed: "नहीं भेजा गया। फिर से कोशिश करें",
      newmsg: "नए संदेश", drop: "भेजने के लिए इमेज यहाँ छोड़ें", ist: "समय IST (GMT+5:30) में", photo: "फ़ोटो",
      tooMany: "एक बार में अधिकतम 6 इमेज भेज सकते हैं।", notImage: "केवल इमेज भेजी जा सकती हैं।",
      emptyTitle: "हम कैसे मदद कर सकते हैं?", emptySub: "हमें संदेश भेजें, हमारी सपोर्ट टीम यहीं जवाब देगी। आप स्क्रीनशॉट भी भेज सकते हैं।",
      emptyAdminTitle: "अभी कोई संदेश नहीं", emptyAdminSub: "बातचीत शुरू करें — सेलर इसे अपने डैशबोर्ड में देखेगा।",
      offline: "सर्वर से कनेक्ट नहीं हो पा रहा। फिर से कोशिश हो रही है…", remove: "हटाएँ", close: "बंद करें", open: "मूल इमेज खोलें",
      copy: "टेक्स्ट कॉपी करें", copied: "कॉपी हो गया", copyImg: "इमेज कॉपी करें", copyImgN: "इमेज {n} कॉपी करें", copyingImg: "इमेज कॉपी हो रही है…",
      copiedImg: "इमेज कॉपी हो गई — कहीं भी पेस्ट करें", copyImgFail: "यह इमेज कॉपी नहीं हो सकी", copyImgNo: "यह ब्राउज़र इमेज कॉपी नहीं कर सकता — इमेज सेव करने के लिए उस पर राइट-क्लिक करें", del: "संदेश हटाएँ", deleted: "संदेश हटा दिया गया",
      delAsk: "यह संदेश हटाएँ? यह सेलर के लिए भी हट जाएगा।", clear: "बातचीत साफ़ करें",
      clearAsk: "इस बातचीत के सभी संदेश हटाएँ? इसे वापस नहीं लाया जा सकता।", cleared: "बातचीत साफ़ कर दी गई", more: "संदेश विकल्प",
      chips: ["निकासी नहीं मिली", "जमा राशि नहीं जुड़ी", "शॉप वेरिफ़िकेशन", "प्रोडक्ट से जुड़ा सवाल"]
    }
  };

  /* ---------------------------- helpers -------------------------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // Escape, then turn URLs into links and keep line breaks.
  function richText(s) {
    return esc(s).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>";
    }).replace(/\n/g, "<br>");
  }
  function toDate(v) { var d = v instanceof Date ? v : new Date(v); return isNaN(d) ? new Date() : d; }
  var fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  var fmtTime = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
  var fmtDay = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
  var fmtFull = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  function dayKey(d) { return fmtKey.format(toDate(d)); }                       // "2026-11-26" in IST
  function timeIST(d) { return fmtTime.format(toDate(d)).toUpperCase(); }       // "10:48 PM"
  function fullIST(d) { return fmtFull.format(toDate(d)) + " IST"; }
  // "Today" / "Yesterday" / "26 Nov 2026" — all judged on the IST calendar.
  function dayLabel(d, L) {
    var k = dayKey(d);
    if (k === dayKey(Date.now())) return L.today;
    if (k === dayKey(Date.now() - 864e5)) return L.yesterday;
    return fmtDay.format(toDate(d));
  }
  // Short stamp for inbox lists: time today, "Yesterday", else the date.
  function shortStamp(d, lang) {
    var L = DICT[lang] || DICT.en, k = dayKey(d);
    if (k === dayKey(Date.now())) return timeIST(d);
    if (k === dayKey(Date.now() - 864e5)) return L.yesterday;
    return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short" }).format(toDate(d));
  }

  var ICON = {
    clip: '<path d="M21 11.5 12.6 20a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="M11 13 20 4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };
  function svg(name, size, extra) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + ICON[name] + "</svg>";
  }
  // WhatsApp-style status marks.
  var TICK1 = '<svg viewBox="0 0 16 11" width="16" height="11" aria-hidden="true"><path d="M11.1.6 4.6 7.9 1.6 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var TICK2 = '<svg viewBox="0 0 18 11" width="18" height="11" aria-hidden="true"><path d="M11.1.6 4.6 7.9 1.6 5M16.4.6 9.9 7.9 8.9 6.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CLOCK = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.6V8l2.2 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  // Downscale a picked/pasted image to <= max px and return a JPEG data URL.
  // Screenshots stay readable at 1600px / 0.88 quality and upload quickly.
  function fileToDataUrl(file, max) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, (max || 1600) / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL("image/jpeg", 0.88)); } catch (e) { resolve(""); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(""); };
      img.src = url;
    });
  }
  // Bigger version of a Drive thumbnail for the lightbox.
  function bigUrl(u) { return /drive\.google\.com\/thumbnail/.test(u) ? u.replace(/([?&]sz=)w\d+/, "$1w2400") : u; }

  /* ----------------------------- lightbox ------------------------------ */
  function lightbox(images, start, L) {
    var i = start || 0, box = document.createElement("div");
    box.className = "ct-lb"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    function paint() {
      box.innerHTML =
        '<div class="ct-lb-bar"><span>' + (images.length > 1 ? (i + 1) + " / " + images.length : "") + "</span>" +
          '<a class="ct-lb-btn" href="' + esc(bigUrl(images[i])) + '" target="_blank" rel="noopener" title="' + esc(L.open) + '">' + svg("ext", 20) + "</a>" +
          '<button type="button" class="ct-lb-btn" data-lb="x" title="' + esc(L.close) + '">' + svg("close", 22) + "</button></div>" +
        (images.length > 1 ? '<button type="button" class="ct-lb-nav prev" data-lb="p" aria-label="Previous">' + svg("left", 26) + "</button>" : "") +
        '<img class="ct-lb-img" src="' + esc(bigUrl(images[i])) + '" alt="">' +
        (images.length > 1 ? '<button type="button" class="ct-lb-nav next" data-lb="n" aria-label="Next">' + svg("right", 26) + "</button>" : "");
    }
    function close() { box.remove(); document.removeEventListener("keydown", key); }
    function go(d) { i = (i + d + images.length) % images.length; paint(); }
    function key(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lb]");
      if (b) { e.preventDefault(); var a = b.getAttribute("data-lb"); if (a === "x") close(); else go(a === "n" ? 1 : -1); return; }
      if (!e.target.closest(".ct-lb-img, a")) close();   // click outside the photo closes
    });
    document.addEventListener("keydown", key);
    paint(); document.body.appendChild(box);
  }

  /* ------------------------------ widget ------------------------------- */
  // opts: { root, me: "seller"|"support", fetch, send, lang, header: { title,
  //   subtitle, avatar, initial, badge }, onBack, onAuth, onUnread, showAgent,
  //   myAdminId, pollMs, chips: bool, their: { avatar, initial } }
  function create(opts) {
    var root = opts.root, me = opts.me, lang = opts.lang || "en", L = DICT[lang] || DICT.en;
    var msgs = [], byId = {}, pending = [], seq = 0;
    var lastSeen = 0, lastDelivered = 0, pollSince = 0, loaded = false, dead = false, busy = false, timer = null, failCount = 0;
    var localImgs = {};           // serverId → data URLs we already have (no re-download flash)
    var drafts = [];              // [{ id, data }] images waiting in the composer
    var nearBottomish = true;     // was the list scrolled to the latest message?
    var els = {};

    root.classList.add("ct");
    root.innerHTML =
      '<header class="ct-head">' +
        (opts.onBack ? '<button type="button" class="ct-back" aria-label="Back">' + svg("left", 22) + "</button>" : "") +
        '<span class="ct-ava"></span>' +
        '<div class="ct-who"><b class="ct-title"></b><small class="ct-sub"></small></div>' +
        '<span class="ct-ist" title="Indian Standard Time"></span>' +
        (opts.onClear ? '<button type="button" class="ct-clear">' + svg("trash", 18) + "</button>" : "") +
      "</header>" +
      '<div class="ct-scroll"><div class="ct-list" role="log" aria-live="polite"></div></div>' +
      '<button type="button" class="ct-jump" hidden>' + svg("down", 16) + "<span></span></button>" +
      '<div class="ct-offline" hidden></div>' +
      '<form class="ct-compose" autocomplete="off">' +
        '<div class="ct-tray" hidden></div>' +
        '<div class="ct-row">' +
          '<button type="button" class="ct-attach">' + svg("clip", 21) + "</button>" +
          '<input type="file" accept="image/*" multiple hidden>' +
          '<textarea rows="1" maxlength="' + MAX_TEXT + '"></textarea>' +
          '<button type="submit" class="ct-send" disabled>' + svg("send", 20) + "</button>" +
        "</div>" +
      "</form>" +
      '<div class="ct-drop" hidden><div>' + svg("img", 34) + "<span></span></div></div>";
    ["head", "ava", "title", "sub", "ist", "scroll", "list", "jump", "offline", "compose", "tray", "attach", "send", "drop", "back", "clear"].forEach(function (k) { els[k] = root.querySelector(".ct-" + k); });
    els.file = root.querySelector('input[type="file"]'); els.text = root.querySelector("textarea");

    function paintLabels() {
      els.text.placeholder = L.placeholder;
      els.attach.title = L.attach; els.attach.setAttribute("aria-label", L.attach);
      els.send.title = L.send; els.send.setAttribute("aria-label", L.send);
      els.ist.textContent = "IST"; els.ist.title = L.ist;
      els.jump.querySelector("span").textContent = L.newmsg;
      els.drop.querySelector("span").textContent = L.drop;
      els.offline.textContent = L.offline;
      if (els.clear) { els.clear.title = L.clear; els.clear.setAttribute("aria-label", L.clear); }
    }
    function setHeader(h) {
      h = h || {};
      els.title.textContent = h.title || "";
      els.sub.innerHTML = h.subtitle || "";
      if (h.avatar) { els.ava.style.backgroundImage = "url('" + String(h.avatar).replace(/'/g, "%27") + "')"; els.ava.textContent = ""; els.ava.classList.add("img"); }
      else { els.ava.style.backgroundImage = ""; els.ava.textContent = (h.initial || (h.title || "?").trim().charAt(0) || "?").toUpperCase(); els.ava.classList.remove("img"); }
      els.ava.classList.toggle("online", !!h.online);
    }
    paintLabels(); setHeader(opts.header);

    /* ---------------- full-screen "Android app" mode (phones) ---------------- */
    // The host page's CSS decides when the chat goes full-screen (it makes the
    // chat, or a wrapper, position:fixed on small screens). We detect that and
    // add .ct-is-full for the app look (coloured app bar, back arrow, floating
    // composer), keep it sized to the VISIBLE area while the keyboard is open,
    // tint the phone's status bar and stop the page behind from scrolling.
    var fullEl = null, themeMeta = document.querySelector('meta[name="theme-color"]');
    var themeOrig = themeMeta ? themeMeta.getAttribute("content") : null;
    function isShown() { return root.getClientRects().length > 0; }   // offsetParent is null for fixed elements
    // The fixed container counts as full-screen only when it spans the whole
    // width (phones). A small fixed popup (the website's desktop chat widget)
    // keeps its own size.
    function fixedAncestor() {
      for (var el = root; el && el !== document.body; el = el.parentElement)
        if (getComputedStyle(el).position === "fixed") return el.getBoundingClientRect().width >= window.innerWidth - 2 ? el : null;
      return null;
    }
    function layout() {
      if (dead) return;
      var el = isShown() ? fixedAncestor() : null, stick = nearBottomish;
      if (fullEl && fullEl !== el) { fullEl.style.height = ""; fullEl.style.top = ""; }
      fullEl = el;
      root.classList.toggle("ct-is-full", !!el);
      document.documentElement.classList.toggle("ct-lock", !!el);
      if (themeMeta && themeOrig != null) themeMeta.setAttribute("content", el ? "#1f58e0" : themeOrig);
      var vv = window.visualViewport;
      if (el && vv) {
        var h = Math.round(vv.height) + "px", t = Math.round(vv.offsetTop) + "px";
        if (el.style.height !== h) el.style.height = h;
        if (el.style.top !== t) el.style.top = t;
      }
      if (el && stick) requestAnimationFrame(toBottom);
    }
    function unlayout() {
      if (fullEl) { fullEl.style.height = ""; fullEl.style.top = ""; fullEl = null; }
      document.documentElement.classList.remove("ct-lock");
      if (themeMeta && themeOrig != null) themeMeta.setAttribute("content", themeOrig);
    }
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(root);
    window.addEventListener("resize", layout);
    if (window.visualViewport) { visualViewport.addEventListener("resize", layout); visualViewport.addEventListener("scroll", layout); }

    /* ------------------------- rendering ------------------------------ */
    function nearBottom() { var s = els.scroll; return s.scrollHeight - s.scrollTop - s.clientHeight < 140; }
    function toBottom() { els.scroll.scrollTop = els.scroll.scrollHeight; els.jump.hidden = true; }

    function statusOf(m) {
      if (m._pending) return m._failed ? "failed" : "sending";
      if (m.sender !== me) return "";
      var id = Number(m.id) || 0;
      if (id <= lastSeen || m.status === "seen") return "seen";
      if (id <= lastDelivered || m.status === "delivered") return "delivered";
      return "sent";
    }
    function tickHtml(st) {
      if (st === "sending") return '<span class="ct-tk sending" title="' + esc(L.sending) + '">' + CLOCK + "</span>";
      if (st === "failed") return '<span class="ct-tk failed">' + svg("alert", 14) + "</span>";
      if (st === "seen") return '<span class="ct-tk seen" title="' + esc(L.seen) + '">' + TICK2 + "</span>";
      if (st === "delivered") return '<span class="ct-tk delivered" title="Delivered">' + TICK2 + "</span>";
      if (st === "sent") return '<span class="ct-tk sent" title="Sent">' + TICK1 + "</span>";
      return "";
    }
    function imagesHtml(list) {
      if (!list.length) return "";
      var n = list.length, cls = n === 1 ? "one" : n === 2 ? "two" : n === 3 ? "three" : "many";
      return '<div class="ct-imgs ' + cls + '">' + list.slice(0, 4).map(function (u, i) {
        var more = (i === 3 && n > 4) ? '<span class="ct-more">+' + (n - 4) + "</span>" : "";
        return '<button type="button" class="ct-img" data-img="' + i + '"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async">' + more + "</button>";
      }).join("") + "</div>";
    }
    function all() { return msgs.concat(pending); }
    // Small avatar beside the other side's messages (logo / shop image / initial).
    function theirAva() {
      var t = opts.their || {}, url = String(t.avatar || "").replace(/["'()\\]/g, "");
      if (url) return '<span class="ct-mava" style="background-image:url(&quot;' + esc(url) + '&quot;)"></span>';
      return '<span class="ct-mava txt">' + esc(((t.initial || "?") + "").charAt(0).toUpperCase()) + "</span>";
    }
    // Build [{ key, sig, html }] in display order; a keyed diff below reuses
    // unchanged nodes so images never reload and scroll doesn't jump.
    function items() {
      var out = [], prev = null, list = all(), lastMine = null;
      list.forEach(function (m) { if (m.sender === me && !m._pending) lastMine = m; });
      list.forEach(function (m, idx) {
        var at = toDate(m.createdAt), k = dayKey(at);
        if (!prev || dayKey(prev.createdAt) !== k) out.push({ key: "d" + k, sig: k + lang, html: '<div class="ct-day"><span>' + esc(dayLabel(at, L)) + "</span></div>" });
        var next = list[idx + 1];
        var sameAsPrev = prev && prev.sender === m.sender && dayKey(prev.createdAt) === k && (at - toDate(prev.createdAt)) < 5 * 60e3;
        var sameAsNext = next && next.sender === m.sender && dayKey(next.createdAt) === k && (toDate(next.createdAt) - at) < 5 * 60e3;
        var mine = m.sender === me, imgs = localImgs[m.id] || m.images || [];
        var agent = (opts.showAgent && m.sender === "support" && m.adminName && String(m.adminId) !== String(opts.myAdminId)) ? m.adminName : "";
        var key = m._pending ? "t" + m._tmp : "m" + m.id;
        var cls = "ct-msg " + (mine ? "mine" : "theirs") + (sameAsPrev ? " cont" : "") + (sameAsNext ? "" : " tail") + (imgs.length && !m.text ? " media" : "") + (m._failed ? " failed" : "");
        var html =
          '<div class="' + cls + '" data-key="' + key + '">' +
            (!mine && !sameAsNext ? theirAva() : "") +
            '<div class="ct-bubble">' +
              '<button type="button" class="ct-act" data-act aria-label="' + esc(L.more) + '" title="' + esc(L.more) + '">' + svg("down", 14) + "</button>" +
              (agent && !sameAsPrev ? '<div class="ct-agent">' + esc(agent) + "</div>" : "") +
              imagesHtml(imgs) +
              (m.text ? '<div class="ct-text">' + richText(m.text) + "</div>" : "") +
              '<div class="ct-meta"><time title="' + esc(fullIST(at)) + '">' + esc(timeIST(at)) + '</time><span class="ct-tkslot"></span></div>' +
            "</div>" +
            (m._failed ? '<button type="button" class="ct-retry" data-retry="' + m._tmp + '">' + esc(L.failed) + "</button>" : "") +
            (m === lastMine ? '<div class="ct-seen" hidden></div>' : "") +
          "</div>";
        out.push({ key: key, sig: html, html: html, m: m });
        prev = m;
      });
      return out;
    }
    function render(forceBottom) {
      if (!loaded) return;
      var stick = forceBottom || nearBottom(), list = els.list;
      var it = items(), have = {};
      Array.prototype.forEach.call(list.children, function (el) { have[el.getAttribute("data-k")] = el; });
      it.forEach(function (x, i) {
        var el = have[x.key];
        if (!el || el._sig !== x.sig) {
          var t = document.createElement("div"); t.innerHTML = x.html; el = t.firstChild;
          el.setAttribute("data-k", x.key); el._sig = x.sig;
          if (have[x.key]) { list.replaceChild(el, have[x.key]); }
        }
        delete have[x.key];
        if (list.children[i] !== el) list.insertBefore(el, list.children[i] || null);
        el._m = x.m;
      });
      Object.keys(have).forEach(function (k) { have[k].remove(); });
      if (!it.length) list.innerHTML = emptyHtml(); else { var e = list.querySelector(".ct-empty"); if (e) e.remove(); }
      paintTicks();
      if (stick) toBottom();
    }
    // Ticks + "Seen 10:48 PM" are patched in place (they change often).
    function paintTicks() {
      Array.prototype.forEach.call(els.list.querySelectorAll(".ct-msg.mine"), function (el) {
        var m = el._m; if (!m) return;
        var st = statusOf(m), slot = el.querySelector(".ct-tkslot");
        if (slot && slot._st !== st) { slot.innerHTML = tickHtml(st); slot._st = st; }
        var seen = el.querySelector(".ct-seen");
        if (seen) {
          var show = st === "seen";
          seen.hidden = !show;
          if (show) seen.textContent = L.seen + (m.seenAt ? " · " + timeIST(m.seenAt) : "");
        }
      });
    }
    function emptyHtml() {
      if (me === "support") return '<div class="ct-empty"><div class="ct-empty-ic">' + svg("send", 26) + "</div><h4>" + esc(L.emptyAdminTitle) + "</h4><p>" + esc(L.emptyAdminSub) + "</p></div>";
      return '<div class="ct-empty"><div class="ct-empty-ic">💬</div><h4>' + esc(L.emptyTitle) + "</h4><p>" + esc(L.emptySub) + "</p>" +
        (opts.chips !== false ? '<div class="ct-chips">' + L.chips.map(function (c) { return '<button type="button" data-chip="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" : "") + "</div>";
    }

    /* --------------------------- data ---------------------------------- */
    function merge(list) {
      var added = 0, incoming = 0;
      (list || []).forEach(function (m) {
        var id = String(m.id);
        pollSince = Math.max(pollSince, Number(m.id) || 0);
        if (byId[id]) { var o = byId[id]; o.status = m.status; o.seenAt = m.seenAt; return; }
        byId[id] = m; msgs.push(m); added++;
        if (m.sender !== me) incoming++;
      });
      if (added) msgs.sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
      return incoming;
    }
    // Drop messages that no longer exist on the server (deleted / conversation cleared).
    function prune(alive) {
      var ok = {}; alive.forEach(function (id) { ok[String(id)] = 1; });
      var before = msgs.length;
      msgs = msgs.filter(function (m) { return ok[String(m.id)]; });
      if (msgs.length !== before) { byId = {}; msgs.forEach(function (m) { byId[String(m.id)] = m; }); }
    }
    function removeLocal(id) {
      msgs = msgs.filter(function (m) { return String(m.id) !== String(id); }); delete byId[String(id)]; render();
    }
    async function poll(first) {
      if (dead || busy) return;
      var visible = document.visibilityState === "visible" && isShown();
      if (!first && !visible) return;
      busy = true;
      try {
        var r = await opts.fetch(pollSince, visible ? "seen" : "delivered");
        if (dead) return;
        if (r && r.auth) { if (opts.onAuth) opts.onAuth(r.error); return; }
        if (!r || !r.ok) throw new Error((r && r.error) || "offline");
        failCount = 0; els.offline.hidden = true;
        var wasBottom = nearBottom();
        var incoming = merge(r.messages);
        if (Array.isArray(r.alive)) prune(r.alive);
        lastSeen = Math.max(lastSeen, Number(r.lastSeen) || 0);
        lastDelivered = Math.max(lastDelivered, Number(r.lastDelivered) || 0);
        var firstLoad = !loaded; loaded = true;
        render(firstLoad);
        if (incoming && !firstLoad && !wasBottom) els.jump.hidden = false;
        if (opts.onUnread) opts.onUnread(visible ? 0 : (Number(r.unread) || 0));
      } catch (e) {
        if (++failCount >= 2) els.offline.hidden = false;
        if (!loaded) els.list.innerHTML = '<div class="ct-loading">' + esc(L.loading) + "</div>";
      } finally { busy = false; }
    }
    function schedule() {
      clearTimeout(timer);
      if (dead) return;
      timer = setTimeout(function () { poll().then(schedule, schedule); }, document.visibilityState === "visible" ? (opts.pollMs || 4000) : 20000);
    }
    function onVis() { if (document.visibilityState === "visible") { poll().then(schedule, schedule); } }
    document.addEventListener("visibilitychange", onVis);

    /* --------------------------- sending ------------------------------- */
    function syncSend() { els.send.disabled = !(els.text.value.trim() || drafts.length); }
    function autosize() { var t = els.text; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 150) + "px"; }
    function paintTray() {
      els.tray.hidden = !drafts.length;
      els.tray.innerHTML = drafts.map(function (d) {
        return '<div class="ct-thumb"><img src="' + d.data + '" alt=""><button type="button" data-rm="' + d.id + '" aria-label="' + esc(L.remove) + '">' + svg("close", 14) + "</button></div>";
      }).join("");
      syncSend();
    }
    async function addFiles(files) {
      files = Array.prototype.slice.call(files || []);
      var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
      if (files.length && !imgs.length) { flash(L.notImage); return; }
      if (drafts.length + imgs.length > MAX_IMAGES) { flash(L.tooMany); imgs = imgs.slice(0, Math.max(0, MAX_IMAGES - drafts.length)); }
      for (var i = 0; i < imgs.length; i++) {
        var data = await fileToDataUrl(imgs[i], 1600);
        if (data) drafts.push({ id: ++seq, data: data });
      }
      paintTray(); els.text.focus();
    }
    function flash(text) {
      var f = document.createElement("div"); f.className = "ct-flash"; f.textContent = text;
      root.appendChild(f); setTimeout(function () { f.classList.add("out"); }, 2200); setTimeout(function () { f.remove(); }, 2600);
    }
    async function deliver(p) {
      p._failed = false; render(true);
      var r;
      try { r = await opts.send({ text: p.text, images: p._payload }); } catch (e) { r = { ok: false }; }
      if (dead) return;
      if (r && r.auth) { if (opts.onAuth) opts.onAuth(r.error); return; }
      if (!r || !r.ok || !r.message) { p._failed = true; render(); if (r && r.error && r.error !== "offline") flash(r.error); return; }
      pending = pending.filter(function (x) { return x !== p; });
      var m = r.message;
      if (p._payload.length) localImgs[m.id] = p._payload.slice(0, (m.images || []).length || p._payload.length);
      if (!byId[String(m.id)]) { byId[String(m.id)] = m; msgs.push(m); msgs.sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); }); }
      render(true);
    }
    function submit() {
      var text = els.text.value.replace(/\s+$/, ""), images = drafts.map(function (d) { return d.data; });
      if (!text.trim() && !images.length) return;
      var p = { _pending: true, _tmp: ++seq, sender: me, text: text.trim(), images: images, _payload: images, createdAt: new Date().toISOString() };
      pending.push(p);
      els.text.value = ""; drafts = []; paintTray(); autosize();
      if (!loaded) loaded = true;
      deliver(p);
    }

    /* --------------------------- events -------------------------------- */
    var coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    els.compose.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    els.text.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !coarse && !e.isComposing) { e.preventDefault(); submit(); }
    });
    els.text.addEventListener("input", function () { autosize(); syncSend(); });
    els.text.addEventListener("focus", function () { if (nearBottomish) setTimeout(toBottom, 250); });
    els.text.addEventListener("paste", function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [], files = [];
      for (var i = 0; i < items.length; i++) if (items[i].kind === "file" && /^image\//.test(items[i].type)) { var f = items[i].getAsFile(); if (f) files.push(f); }
      if (files.length) { e.preventDefault(); addFiles(files); }
    });
    els.attach.addEventListener("click", function () { els.file.click(); });
    els.file.addEventListener("change", function () { addFiles(els.file.files); els.file.value = ""; });
    els.tray.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]"); if (!b) return;
      var id = Number(b.getAttribute("data-rm")); drafts = drafts.filter(function (d) { return d.id !== id; }); paintTray();
    });
    els.list.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-chip]");
      if (chip) { els.text.value = chip.getAttribute("data-chip"); autosize(); syncSend(); els.text.focus(); return; }
      var rt = e.target.closest("[data-retry]");
      if (rt) { var tmp = Number(rt.getAttribute("data-retry")); var p = pending.filter(function (x) { return x._tmp === tmp; })[0]; if (p) deliver(p); return; }
      var im = e.target.closest("[data-img]");
      if (im) {
        var row = im.closest(".ct-msg"), m = row && row._m; if (!m) return;
        // full-size Drive originals when saved; local copies while still sending
        var list = (m.images && m.images.length) ? m.images : (localImgs[m.id] || []);
        if (list.length) lightbox(list, Number(im.getAttribute("data-img")), L);
      }
    });
    /* ---------------- message menu: copy / delete ---------------- */
    var menu = null;
    function closeMenu() { if (menu) { menu.remove(); menu = null; } document.removeEventListener("mousedown", outside, true); }
    function outside(e) { if (menu && !menu.contains(e.target)) closeMenu(); }
    function copyText(t) {
      var done = function () { flash(L.copied); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(t).then(done, function () { legacyCopy(t) && done(); });
      } else if (legacyCopy(t)) done();
    }
    function legacyCopy(t) {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0"; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); return ok;
    }
    // ---- copy an image to the clipboard (as PNG), so it can be pasted anywhere
    // (this chat's message box accepts pasted images too). Drive images can't be
    // read cross-origin, so we try a direct fetch, then ask the server.
    function blobToPng(blob) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(blob), img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0); URL.revokeObjectURL(url);
          c.toBlob(function (b) { b ? resolve(b) : reject(new Error("png")); }, "image/png");
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("img")); };
        img.src = url;
      });
    }
    function srcToBlob(m, src) {
      if (/^data:/.test(src)) return fetch(src).then(function (r) { return r.blob(); });
      return fetch(src, { mode: "cors", credentials: "omit" }).then(function (r) {
        if (!r.ok) throw new Error("http"); return r.blob();
      }).catch(function () {
        if (!opts.getImage) throw new Error("no proxy");
        return Promise.resolve(opts.getImage(m, src)).then(function (res) {
          if (!res || !res.ok || !res.dataUrl) throw new Error((res && res.error) || "proxy");
          return fetch(res.dataUrl).then(function (r) { return r.blob(); });
        });
      });
    }
    function copyImage(m, src) {
      if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) { flash(L.copyImgNo); return; }
      flash(L.copyingImg);
      var png = srcToBlob(m, src).then(function (b) { return b.type === "image/png" ? b : blobToPng(b); });
      // The promise goes straight into ClipboardItem (needed by Safari, fine in Chrome).
      navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
        .then(function () { flash(L.copiedImg); }, function () { flash(L.copyImgFail); });
    }
    function openMenu(row) {
      var m = row && row._m; if (!m) return;
      closeMenu();
      var imgs = (localImgs[m.id] && localImgs[m.id].length ? localImgs[m.id] : (m.images || [])).filter(Boolean).slice(0, 6);
      var canDel = opts.onDelete && !m._pending && m.id != null;
      var acts = [];
      if (m.text) acts.push(["copy", svg("copy", 16), L.copy]);
      imgs.forEach(function (u, i) { acts.push(["img" + i, svg("img", 16), imgs.length > 1 ? L.copyImgN.replace("{n}", i + 1) : L.copyImg]); });
      if (canDel) acts.push(["del", svg("trash", 16), L.del]);
      if (!acts.length) return;
      menu = document.createElement("div"); menu.className = "ct-menu"; menu.setAttribute("role", "menu");
      menu.innerHTML = acts.map(function (a) { return '<button type="button" role="menuitem" data-do="' + a[0] + '"' + (a[0] === "del" ? ' class="danger"' : "") + ">" + a[1] + "<span>" + esc(a[2]) + "</span></button>"; }).join("");
      root.appendChild(menu);
      var b = row.querySelector(".ct-bubble").getBoundingClientRect(), rr = root.getBoundingClientRect();
      var w = menu.offsetWidth, h = menu.offsetHeight, mine = row.classList.contains("mine");
      var left = mine ? b.right - rr.left - w : b.left - rr.left, top = b.bottom - rr.top + 6;
      if (top + h > rr.height - 8) top = b.top - rr.top - h - 6;          // no room below → open above
      menu.style.left = Math.max(8, Math.min(left, rr.width - w - 8)) + "px";
      menu.style.top = Math.max(8, top) + "px";
      menu.addEventListener("click", async function (e) {
        var btn = e.target.closest("[data-do]"); if (!btn) return;
        var what = btn.getAttribute("data-do"); closeMenu();
        if (what === "copy") copyText(m.text);
        else if (/^img\d+$/.test(what)) copyImage(m, imgs[Number(what.slice(3))]);
        else if (what === "del") {
          var yes = opts.confirm ? await opts.confirm({ title: L.del, message: L.delAsk, confirmLabel: L.del }) : window.confirm(L.delAsk);
          if (!yes) return;
          var r; try { r = await opts.onDelete(m); } catch (x) { r = { ok: false, error: x.message }; }
          if (r && r.ok) { removeLocal(m.id); flash(L.deleted); } else flash((r && r.error) || L.offline);
        }
      });
      setTimeout(function () { document.addEventListener("mousedown", outside, true); }, 0);
    }
    els.list.addEventListener("click", function (e) {
      var a = e.target.closest("[data-act]"); if (!a) return;
      e.stopPropagation(); openMenu(a.closest(".ct-msg"));
    }, true);
    // right-click (desktop) / long-press (Android) on a message bubble
    els.list.addEventListener("contextmenu", function (e) {
      var bub = e.target.closest(".ct-bubble"); if (!bub || e.target.closest("a")) return;
      e.preventDefault(); openMenu(bub.closest(".ct-msg"));
    });
    // long-press for iPhone (no contextmenu event there)
    var lpTimer = null;
    els.list.addEventListener("touchstart", function (e) {
      var bub = e.target.closest(".ct-bubble"); if (!bub) return;
      clearTimeout(lpTimer); lpTimer = setTimeout(function () { openMenu(bub.closest(".ct-msg")); }, 550);
    }, { passive: true });
    ["touchend", "touchmove", "touchcancel"].forEach(function (ev) { els.list.addEventListener(ev, function () { clearTimeout(lpTimer); }, { passive: true }); });
    els.scroll.addEventListener("scroll", closeMenu, { passive: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    if (els.clear) els.clear.addEventListener("click", async function () {
      var yes = opts.confirm ? await opts.confirm({ title: L.clear, message: L.clearAsk, confirmLabel: L.clear }) : window.confirm(L.clearAsk);
      if (!yes) return;
      var r; try { r = await opts.onClear(); } catch (x) { r = { ok: false, error: x.message }; }
      if (r && r.ok) { msgs = []; byId = {}; render(); flash(L.cleared); } else flash((r && r.error) || L.offline);
    });

    // keep pinned to the bottom while images finish loading
    els.list.addEventListener("load", function (e) { if (e.target.tagName === "IMG" && nearBottomish) toBottom(); }, true);
    els.scroll.addEventListener("scroll", function () { nearBottomish = nearBottom(); if (nearBottomish) els.jump.hidden = true; }, { passive: true });
    els.jump.addEventListener("click", toBottom);
    if (els.back) els.back.addEventListener("click", function () { opts.onBack(); });

    // drag & drop screenshots anywhere on the chat
    var dragDepth = 0;
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") > -1; }
    root.addEventListener("dragenter", function (e) { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; els.drop.hidden = false; });
    root.addEventListener("dragover", function (e) { if (hasFiles(e)) e.preventDefault(); });
    root.addEventListener("dragleave", function () { if (--dragDepth <= 0) { dragDepth = 0; els.drop.hidden = true; } });
    root.addEventListener("drop", function (e) { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; els.drop.hidden = true; addFiles(e.dataTransfer.files); });

    els.list.innerHTML = '<div class="ct-loading"><span class="ct-spin"></span>' + esc(L.loading) + "</div>";
    layout();
    poll(true).then(schedule, schedule);

    return {
      setHeader: setHeader,
      setLang: function (l) { lang = l; L = DICT[l] || DICT.en; paintLabels(); Array.prototype.forEach.call(els.list.children, function (el) { el._sig = null; }); render(); },
      refresh: function () { poll().then(schedule, schedule); },
      focus: function () { els.text.focus(); },
      layout: layout,
      destroy: function () {
        dead = true; clearTimeout(timer); unlayout(); closeMenu();
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", layout);
        if (window.visualViewport) { visualViewport.removeEventListener("resize", layout); visualViewport.removeEventListener("scroll", layout); }
        if (ro) ro.disconnect();
        root.innerHTML = ""; root.classList.remove("ct", "ct-is-full");
      }
    };
  }

  return { create: create, timeIST: timeIST, shortStamp: shortStamp, fullIST: fullIST, esc: esc, TICK1: TICK1, TICK2: TICK2 };
})();
