/* ============================ seller login ============================== */
/* The storefront is seller-only: this page signs sellers in against the
   Sellers sheet (same account they created on "Become a seller"). */
window.SELLER = (function () {
  var KEY = "mm_seller";
  function current() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function logout() { try { localStorage.removeItem(KEY); } catch (e) {} }
  return { current: current, save: save, logout: logout };
})();

window.SELLERLOGIN = (function () {
  function init() {
    if (SELLER.current()) { location.href = "index.html"; return; }
    var next = new URLSearchParams(location.search).get("next") || "index.html";

    document.getElementById("authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      msg("");
      var email = AUTH.normId(document.getElementById("identifier").value);
      var password = document.getElementById("password").value;
      if (!AUTH.isEmail(email)) return msg("Please enter a valid email address.", "err");
      if (!password) return msg("Please enter your password.", "err");
      if (!CONFIG.API_URL) return msg("Sign-in needs the online backend. Please try again later.", "err");

      var btn = document.getElementById("submitBtn");
      btn.disabled = true; btn.textContent = "Signing in…";
      try {
        var passwordHash = await AUTH.hash("seller:" + email, password);
        var r = await fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "sellerLogin", email: email, passwordHash: passwordHash }) });
        var j = await r.json();
        btn.disabled = false; btn.textContent = "Sign in";
        if (!j.ok) return msg(j.error || "Couldn't sign you in.", "err");
        SELLER.save(j.seller);
        UI.toast("Welcome back, " + (j.seller.shopName || j.seller.name || "seller") + "!");
        setTimeout(function () { location.href = next; }, 500);
      } catch (x) {
        btn.disabled = false; btn.textContent = "Sign in";
        msg("Can't reach the server right now. Please try again in a moment.", "err");
      }
    });
  }

  function msg(text, kind) {
    var el = document.getElementById("msg");
    el.innerHTML = text ? '<div class="msg '+(kind||"ok")+'">'+UI.esc(text)+'</div>' : "";
  }

  return { init: init };
})();
