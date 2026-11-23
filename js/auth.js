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
    try {
      var r = await fetch(C.API_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return await r.json();
    } catch (e) {
      // Network error, or the Apps Script isn't deployed with access "Anyone"
      // (Google then answers with a sign-in page instead of JSON).
      console.warn("Backend unreachable:", e);
      return { ok: false, error: "Can't reach the server right now. Please try again in a moment." };
    }
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
    var nextId = users.reduce(function (m, u) { return Math.max(m, Number(u.id) || 0); }, 0) + 1;
    var user = { id: nextId, name: name, identifier: identifier, type: type, passwordHash: passwordHash };
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

  // Update name, email/mobile and/or password. The current password is always
  // required. The hash is salted with the identifier, so we send a fresh hash
  // for the (possibly new) identifier with (possibly new) password.
  async function updateProfile(fields) {
    var me = current();
    if (!me) return { ok: false, error: "Please log in again." };
    var name = String(fields.name || "").trim();
    var newIdent = normId(fields.identifier || me.identifier);
    if (!name) return { ok: false, error: "Please enter your name." };
    if (!isEmail(newIdent) && !isMobile(newIdent)) return { ok: false, error: "Enter a valid email or mobile number." };
    if (!fields.currentPassword) return { ok: false, error: "Enter your current password to save changes." };
    if (fields.newPassword && fields.newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters." };

    var passwordHash = await hash(me.identifier, fields.currentPassword);
    var newPasswordHash = await hash(newIdent, fields.newPassword || fields.currentPassword);
    var type = isEmail(newIdent) ? "email" : "mobile";

    if (C.API_URL) {
      var res = await post({ action: "updateProfile", identifier: me.identifier, passwordHash: passwordHash,
        name: name, newIdentifier: newIdent, type: type, newPasswordHash: newPasswordHash });
      if (res.ok) setSession(res.user);
      return res;
    }
    var users = localUsers(), u = users.find(function (x) { return x.identifier === normId(me.identifier); });
    if (!u) return { ok: false, error: "Account not found. Please log in again." };
    if (u.passwordHash !== passwordHash) return { ok: false, error: "Your current password is incorrect." };
    if (newIdent !== u.identifier && users.some(function (x) { return x.identifier === newIdent; }))
      return { ok: false, error: "That email/mobile is already used by another account." };
    u.name = name; u.identifier = newIdent; u.type = type; u.passwordHash = newPasswordHash;
    saveLocalUsers(users);
    var pub = { id: u.id, name: u.name, identifier: u.identifier, type: type };
    setSession(pub);
    return { ok: true, user: pub };
  }

  function setSession(user) { localStorage.setItem(SKEY, JSON.stringify(user)); document.dispatchEvent(new CustomEvent("auth:change")); }
  function current() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY));
      // Sessions from before numeric ids (e.g. "u-mwryz66n") no longer match the
      // Sheet, so treat them as logged out and ask the customer to sign in again.
      if (s && typeof s.id === "string" && !/^\d+$/.test(s.id)) { localStorage.removeItem(SKEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  function logout() {
    localStorage.removeItem(SKEY);
    // Drop cached order history so the next person on this device can't see it.
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("mm_orders_") === 0) localStorage.removeItem(k); }); } catch (e) {}
    document.dispatchEvent(new CustomEvent("auth:change"));
  }

  window.AUTH = { hash: hash, normId: normId, signup: signup, login: login, updateProfile: updateProfile, current: current, logout: logout, isEmail: isEmail, isMobile: isMobile };
})();
