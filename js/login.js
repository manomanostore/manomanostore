/* ============================== login =================================== */
window.LOGIN = (function () {
  var mode = "login";

  function init() {
    if (AUTH.current()) { location.href = "account.html"; return; }
    var next = new URLSearchParams(location.search).get("next") || "account.html";

    var segL = document.getElementById("segLogin"), segR = document.getElementById("segReg");
    segL.onclick = function () { setMode("login"); };
    segR.onclick = function () { setMode("register"); };
    document.getElementById("switchLink").onclick = function (e) { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); };

    document.getElementById("togglePw").onclick = function () {
      var pw = document.getElementById("password");
      pw.type = pw.type === "password" ? "text" : "password";
    };

    document.getElementById("authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      msg("");
      var name = document.getElementById("name").value.trim();
      var identifier = document.getElementById("identifier").value.trim();
      var password = document.getElementById("password").value;
      var btn = document.getElementById("submitBtn");
      btn.disabled = true; btn.textContent = mode === "login" ? "Logging in…" : "Creating account…";

      var res = mode === "login"
        ? await AUTH.login(identifier, password)
        : await AUTH.signup(name, identifier, password);

      btn.disabled = false; btn.textContent = mode === "login" ? "Log in" : "Create account";
      if (res.ok) { UI.toast("Welcome, " + (res.user.name || res.user.identifier) + "!"); setTimeout(function () { location.href = next; }, 500); }
      else msg(res.error || "Something went wrong.", "err");
    });

    setMode("login");
  }

  function setMode(m) {
    mode = m;
    var isReg = m === "register";
    document.getElementById("segLogin").classList.toggle("on", !isReg);
    document.getElementById("segReg").classList.toggle("on", isReg);
    document.getElementById("nameField").hidden = !isReg;
    document.getElementById("authTitle").textContent = isReg ? "Create your account" : "Welcome back";
    document.getElementById("submitBtn").textContent = isReg ? "Create account" : "Log in";
    document.getElementById("password").autocomplete = isReg ? "new-password" : "current-password";
    document.getElementById("switchHint").textContent = isReg ? "Already have an account?" : "New here?";
    document.getElementById("switchLink").textContent = isReg ? "Log in instead" : "Create an account";
    msg("");
  }

  function msg(text, kind) {
    var el = document.getElementById("msg");
    el.innerHTML = text ? '<div class="msg '+(kind||"ok")+'">'+UI.esc(text)+'</div>' : "";
  }

  return { init: init };
})();
