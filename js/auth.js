/* ============================== auth ===================================== */
/* Passwords are hashed in the browser (SHA-256 + app pepper + identifier as
   salt) and ONLY the hash ever leaves the device. No plaintext is stored or
   transmitted. If API_URL is unset, a local (localStorage) user store is used
   so the demo works on GitHub Pages before the Google Sheet is connected.    */
(function () {
  var C = window.CONFIG;
  var SKEY = "tn_session", UKEY = "tn_users_local";
  var PEPPER = "toolnest.v1"; // app-level constant mixed into every hash

  function normId(s) { return String(s || "").trim().toLowerCase(); }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function isMobile(s) { return /^[+]?[\d][\d\s-]{6,}$/.test(s); }

  async function hash(identifier, password) {
    var data = new TextEncoder().encode(PEPPER + "|" + normId(identifier) + "|" + password);
    var buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  // ---- POST helper: text/plain avoids CORS preflight against Apps Script ----
  async function post(payload) {
    var r = await fetch(C.API_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return r.json();
  }

  // ---- local fallback store ----
  function localUsers() { try { return JSON.parse(localStorage.getItem(UKEY)) || []; } catch (e) { return []; } }
  function saveLocalUsers(u) { localStorage.setItem(UKEY, JSON.stringify(u)); }

  async function signup(name, identifier, password) {
    identifier = normId(identifier);
    if (!isEmail(identifier) && !isMobile(identifier)) return { ok: false, error: "Enter a valid email or mobile number." };
    if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    var type = isEmail(identifier) ? "email" : "mobile";
    var passwordHash = await hash(identifier, password);

    if (C.API_URL) {
      var res = await post({ action: "signup", name: name, identifier: identifier, type: type, passwordHash: passwordHash });
      if (res.ok) setSession(res.user);
      return res;
    }
    // local
    var users = localUsers();
    if (users.some(function (u) { return u.identifier === identifier; }))
      return { ok: false, error: "An account with that email/mobile already exists." };
    var user = { id: "u-" + Date.now().toString(36), name: name, identifier: identifier, type: type, passwordHash: passwordHash };
    users.push(user); saveLocalUsers(users);
    setSession({ id: user.id, name: name, identifier: identifier });
    return { ok: true, user: { id: user.id, name: name, identifier: identifier } };
  }

  async function login(identifier, password) {
    identifier = normId(identifier);
    if (!identifier || !password) return { ok: false, error: "Enter your email/mobile and password." };
    var passwordHash = await hash(identifier, password);

    if (C.API_URL) {
      var res = await post({ action: "login", identifier: identifier, passwordHash: passwordHash });
      if (res.ok) setSession(res.user);
      return res;
    }
    var user = localUsers().find(function (u) { return u.identifier === identifier; });
    if (!user) return { ok: false, error: "No account found for that email/mobile." };
    if (user.passwordHash !== passwordHash) return { ok: false, error: "Incorrect password." };
    setSession({ id: user.id, name: user.name, identifier: identifier });
    return { ok: true, user: { id: user.id, name: user.name, identifier: identifier } };
  }

  function setSession(user) { localStorage.setItem(SKEY, JSON.stringify(user)); document.dispatchEvent(new CustomEvent("auth:change")); }
  function current() { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } }
  function logout() { localStorage.removeItem(SKEY); document.dispatchEvent(new CustomEvent("auth:change")); }

  window.AUTH = { signup: signup, login: login, current: current, logout: logout, isEmail: isEmail, isMobile: isMobile };
})();
