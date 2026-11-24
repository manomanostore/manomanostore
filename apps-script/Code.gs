/* =============================================================================
   ManoMano — Google Sheets backend (Google Apps Script Web App)
   -----------------------------------------------------------------------------
   Seller-only marketplace. Handles: shop (seller) registration + login,
   the product catalog, carts (with quantities), orders, and the admin panel.

   Sheets (tabs) used — these are the ONLY tables:
     Users       admin logins for the admin panel (superadmin / manager / staff)
     Sellers     shops that register from "Become a seller" and sign in
     Orders      placed orders
     Categories  product categories (one cat_id per product)
     Products    the catalog
     Carts       cart lines (one row per product in a cart, with a quantity)

   Every tab uses a numeric `id` column: 1, 2, 3, ... New rows get the next
   number (max id + 1) under a script lock, so concurrent requests never clash.

   SETUP (see apps-script/README.md for the full walkthrough):
     1. Create a Google Sheet.
     2. Extensions > Apps Script. Paste this file. Save.
     3. Run `initSheets` once (authorise when asked). Safe to re-run any time:
        it adds missing tabs/columns and formats ID-like columns as text.
     4. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
        Copy the Web App URL into js/config.js -> API_URL.
     5. Open  <web app URL>?action=setupAdmin&username=admin&password=admin
        once to create the first admin, then sign in at admin.html.

   SECURITY NOTE: passwords arrive already hashed (SHA-256 + app pepper +
   salt) from the browser — we NEVER receive or store a plaintext password.
   Sellers salt with "seller:<email>", admins with "admin:<username>". Admins
   also get a short-lived random token (only its SHA-256 is stored). This is a
   demo-grade scheme — fine for a learning/portfolio project, not a bank.
   ============================================================================= */

// Optional: raw URL of your published products.json (used only by seedProducts()).
var CATALOG_URL = "";

// Used ONLY by createAdmin() (run from the editor). Clear ADMIN_PASSWORD after.
var ADMIN_USERNAME = "";
var ADMIN_PASSWORD = "";

// Must match PEPPER in js/auth.js — passwords are hashed the same way in both.
var PASSWORD_PEPPER = "toolnest.v1";

var ADMIN_TOKEN_HOURS = 12;
var ORDER_STATUSES = ["received", "processing", "shipped", "delivered", "cancelled"];

var SHEETS = {
  users:      { name: "Users",      headers: ["id","username","name","passwordHash","role","status","createdAt","updatedAt","lastLoginAt","tokenHash","tokenExpires"],
                textCols: ["username","passwordHash","tokenHash"] },
  sellers:    { name: "Sellers",    headers: ["id","name","email","phone","status","createdAt","updatedAt","shopName","passwordHash","certType","certFront","certBack","invite"],
                textCols: ["phone","email","passwordHash"] },
  orders:     { name: "Orders",     headers: ["id","userId","identifier","itemsJson","total","status","createdAt"],
                textCols: ["identifier"] },
  categories: { name: "Categories", headers: ["id","cat_name","cat_img_url","cat_order"] },
  products:   { name: "Products",   headers: ["id","name","brand","cat_id","vendor_id","price","oldPrice","rating","reviews","badge","choice","options","color","icon","desc","imageUrl","status","createdAt","updatedAt"] },
  carts:      { name: "Carts",      headers: ["cart_id","productId","qty","createdAt","updatedAt"],
                textCols: ["cartId","productId"] }
};
// Users (admin) columns: 0 id | 1 username | 2 name | 3 passwordHash | 4 role | 5 status | 6 createdAt | 7 updatedAt | 8 lastLoginAt | 9 tokenHash | 10 tokenExpires
var A = { id:0, user:1, name:2, hash:3, role:4, status:5, created:6, updated:7, lastLogin:8, tokenHash:9, tokenExp:10 };
// Carts columns: 0 id | 1 cartId | 2 productId | 3 name | 4 price | 5 qty | 6 createdAt | 7 updatedAt
var C = { id:0, cart:1, product:2, name:3, price:4, qty:5, created:6, updated:7 };
var ADMIN_ROLES = ["superadmin", "manager", "staff"];
// What each role may call. Blank/legacy role is treated as superadmin.
var PERMS = {
  stats: ADMIN_ROLES, listOrders: ADMIN_ROLES, updateOrder: ADMIN_ROLES,
  listCatalog: ADMIN_ROLES, saveProduct: ADMIN_ROLES, changePassword: ADMIN_ROLES,
  deleteProduct: ["superadmin", "manager"], saveCategory: ["superadmin", "manager"],
  deleteCategory: ["superadmin", "manager"], saveVendor: ["superadmin", "manager"],
  deleteVendor: ["superadmin", "manager"], importCatalog: ["superadmin", "manager"],
  listAdmins: ["superadmin"], saveAdmin: ["superadmin"], deleteAdmin: ["superadmin"]
};

/* ----------------------------- HTTP handlers ----------------------------- */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "health";
  try {
    if (action === "getProducts") return json({ ok: true, categories: readCategories(), products: readProducts(false) });
    if (action === "setupAdmin")  return json(withLock(function () { return setupAdmin(e.parameter || {}); }));
    if (action === "initSheets")  return json(withLock(function () { initSheets(); return { ok: true, message: "Sheets created / updated (columns added)." }; }));
    return json({ ok: true, status: "alive", brand: "ManoMano" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (_) {}
  var action = body.action || "";
  try {
    switch (action) {
      case "registerSeller":return json(withLock(function () { return registerSeller(body); }));
      case "sellerLogin":   return json(sellerLogin(body));
      case "saveCart":      return json(withLock(function () { return saveCart(body); }));
      case "getCart":       return json({ ok: true, cart: getCartItems(String(body.cartId || "")) });
      case "createOrder":   return json(withLock(function () { return createOrder(body); }));
      case "getOrders":     return json({ ok: true, orders: getOrders(body.userId) });
      case "adminLogin":    return json(withLock(function () { return adminLogin(body); }));
      case "admin":         return json(adminCall(body));
      default:              return json({ ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ------------------------------ Sellers ---------------------------------- */

// Public "Become a seller" registration -> Sellers sheet (status "pending").
// The password is hashed in the browser (salt "seller:<email>"), so sellers can
// log in once approved. No transaction password is used.
function registerSeller(b) {
  var email = normId(b.email), shop = String(b.shopName || "").trim(), name = String(b.name || "").trim();
  if (!shop)  return { ok: false, error: "Shop name is required." };
  if (!name)  return { ok: false, error: "Your name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!b.passwordHash) return { ok: false, error: "A password is required." };

  var sh = sheet("sellers");
  if (readRows("sellers").some(function (v) { return normId(v.email) === email; }))
    return { ok: false, error: "A seller account with that email already exists." };

  var id = nextId(sh), now = new Date().toISOString();
  var rec = {
    id: id, name: name.slice(0, 80), email: email, phone: String(b.phone || "").trim(),
    status: "pending", createdAt: now, updatedAt: now, shopName: shop.slice(0, 100),
    passwordHash: b.passwordHash, certType: String(b.certType || ""),
    certFront: saveCert(b.certFront, "front", email), certBack: saveCert(b.certBack, "back", email),
    invite: String(b.invite || "").slice(0, 40)
  };
  appendRowAsText(sh, SHEETS.sellers.headers.map(function (h) { return rec[h] === undefined ? "" : rec[h]; }));
  return { ok: true, message: "Thanks! Your shop application has been submitted and is pending review." };
}

// Seller sign-in against the SAME Sellers sheet used at registration.
// Password is hashed in the browser with salt "seller:<email>".
function sellerLogin(b) {
  var email = normId(b.email);
  if (!email || !b.passwordHash) return { ok: false, error: "Enter your email and password." };
  var v = readRows("sellers").filter(function (r) { return normId(r.email) === email; })[0];
  if (!v || String(v.passwordHash) !== String(b.passwordHash))
    return { ok: false, error: "Incorrect email or password." };
  var st = String(v.status || "").toLowerCase();
  if (st === "pending")  return { ok: false, error: "Your shop is still pending review. You can sign in once it's approved." };
  if (st && st !== "active") return { ok: false, error: "This seller account is not active. Please contact support." };
  return { ok: true, seller: { id: v.id, name: v.name, email: v.email, phone: v.phone, shopName: v.shopName, status: v.status } };
}

// Save a seller's certificate image (base64 data URL from the browser) into a
// Drive folder and return its URL. Returns "" when nothing was provided.
function saveCert(dataUrl, label, email) {
  var m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) return "";
  try {
    var ext = (m[1].split("/")[1] || "jpg").split("+")[0];
    var fname = label + "_" + String(email).replace(/[^a-z0-9]+/gi, "_") + "_" + Date.now() + "." + ext;
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], fname);
    return sellerDocsFolder().createFile(blob).getUrl();
  } catch (err) { return ""; }
}
function sellerDocsFolder() {
  var name = "ManoMano Seller Documents";
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function readSellers() {
  return readRows("sellers").filter(function (v) { return v.id !== ""; }).map(function (v) {
    v.id = Number(v.id) || v.id; v.phone = String(v.phone || ""); v.status = String(v.status || "active"); return v;
  });
}

/* -------------------------------- Carts ---------------------------------- */
// A cart belongs to a browser-generated cartId (stored in localStorage). Each
// product in the cart is one row with its quantity. saveCart replaces the whole
// cart for a cartId with the posted items, so the sheet mirrors the basket.

function saveCart(b) {
  var cartId = String(b.cartId || "").trim();
  if (!cartId) return { ok: false, error: "Missing cart id." };
  var items = (b.items || []).filter(function (i) { return i && (Number(i.qty) > 0); });
  var sh = sheet("carts"), now = new Date().toISOString();

  // Delete existing rows for this cart (bottom-up so indexes stay valid).
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) if (String(rows[i][C.cart]) === cartId) sh.deleteRow(i + 1);

  items.slice(0, 200).forEach(function (it) {
    appendRowAsText(sh, [ nextId(sh), cartId, String(it.id || it.productId || ""),
      String(it.name || "").slice(0, 140), Number(it.price) || 0, Math.max(1, Math.floor(Number(it.qty) || 1)), now, now ]);
  });
  return { ok: true, count: items.length };
}

function getCartItems(cartId) {
  cartId = String(cartId || "").trim();
  if (!cartId) return [];
  return readRows("carts").filter(function (r) { return String(r.cartId) === cartId; }).map(function (r) {
    return { productId: String(r.productId || ""), name: String(r.name || ""),
             price: Number(r.price) || 0, qty: Math.max(1, Math.floor(Number(r.qty) || 1)) };
  });
}

/* ------------------------------- Orders ---------------------------------- */
// Orders columns: 0 id | 1 userId | 2 identifier | 3 itemsJson | 4 total | 5 status | 6 createdAt

function createOrder(b) {
  var sh = sheet("orders");
  var id = nextId(sh);
  appendRowAsText(sh, [ id, Number(b.userId) || b.userId || "guest", normId(b.identifier) || "",
                        JSON.stringify(b.items || []), Number(b.total) || 0,
                        "received", new Date().toISOString() ]);
  return { ok: true, orderId: id };
}

function getOrders(userId) {
  var rows = sheet("orders").getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) if (String(rows[i][1]) === String(userId)) out.push(orderObj(rows[i]));
  return out.reverse();
}

function orderObj(r) {
  return { id: r[0], userId: r[1], identifier: String(r[2] || ""), items: safeParse(r[3]),
           total: Number(r[4]) || 0, status: String(r[5] || "received"), createdAt: r[6] };
}

/* ------------------------------ Products --------------------------------- */

// Each category is one row; each product points at exactly one category via cat_id.
// Columns: id | cat_name | cat_img_url | cat_order. Returned in cat_order order
// with a frontend-friendly shape (name / imageUrl / order). The name column is
// read whether it's spelled cat_name, cate_name or name, so a differently-named
// header still works.
function catNameOf(c) {
  return String(c.cat_name !== undefined ? c.cat_name
              : c.cate_name !== undefined ? c.cate_name
              : (c.name || ""));
}
function readCategories() {
  return readRows("categories").filter(function (c) { return c.id !== ""; })
    .map(function (c) {
      return { id: Number(c.id) || c.id,
               name: catNameOf(c),
               imageUrl: String(c.cat_img_url || ""),
               order: Number(c.cat_order) || 0 };
    })
    .sort(function (a, b) { return (a.order - b.order) || (Number(a.id) - Number(b.id)); });
}

// includeHidden=false for the public shop; the admin panel sees everything.
function readProducts(includeHidden) {
  var out = [];
  readRows("products").forEach(function (o) {
    if (o.id === "") return;
    if (!includeHidden && String(o.status) === "hidden") return;
    out.push(cleanProduct(o));
  });
  return out;
}

function cleanProduct(o) {
  o.id = Number(o.id) || o.id;
  o.cat_id = Number(o.cat_id) || o.cat_id;
  o.vendor_id = o.vendor_id === "" ? "" : (Number(o.vendor_id) || o.vendor_id);
  o.price = Number(o.price) || 0;
  o.oldPrice = o.oldPrice === "" ? "" : Number(o.oldPrice);
  o.rating = Number(o.rating) || 0;
  o.reviews = Number(o.reviews) || 0;
  o.options = o.options === "" ? "" : Number(o.options);
  o.choice = (o.choice === true || o.choice === "TRUE" || o.choice === "true");
  o.status = String(o.status || "active");
  return o;
}

function readRows(key) {
  var rows = sheet(key).getDataRange().getValues();
  if (rows.length < 2) return [];
  var h = rows[0], out = [];
  for (var i = 1; i < rows.length; i++) {
    var o = {};
    for (var c = 0; c < h.length; c++) o[h[c]] = rows[i][c];
    out.push(o);
  }
  return out;
}

// Run manually from the editor to fill Categories + Products from CATALOG_URL.
function seedProducts() {
  if (!CATALOG_URL) throw new Error("Set CATALOG_URL at the top of Code.gs first.");
  var data = JSON.parse(UrlFetchApp.fetch(CATALOG_URL).getContentText());
  var r = importCatalog(data);
  SpreadsheetApp.getActive().toast("Seeded " + r.categories + " categories, " + r.products + " products");
}

function importCatalog(data) {
  var cats = data.categories || [], prods = (data.products || []).map(function (p) {
    p.status = p.status || "active"; return p;
  });
  writeRows("categories", cats);
  writeRows("products", prods);
  return { categories: cats.length, products: prods.length };
}

function writeRows(key, items) {
  var headers = SHEETS[key].headers, sh = sheet(key);
  sh.clearContents();
  var rows = [headers].concat(items.map(function (it) {
    return headers.map(function (k) { return it[k] === undefined || it[k] === null ? "" : it[k]; });
  }));
  sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

/* ================================ Admin ================================== */

// Admin login: username + password (hashed in the browser, salt "admin:<username>").
// Returns a random token; only its SHA-256 is stored, with an expiry.
function adminLogin(b) {
  var sh = sheet("users"), row = findAdmin(sh, b.username);
  if (!row || String(row.data[A.hash]) !== String(b.passwordHash))
    return { ok: false, error: "Incorrect username or password." };
  if (String(row.data[A.status]) === "disabled")
    return { ok: false, error: "This admin account is disabled." };
  var token = Utilities.getUuid() + Utilities.getUuid(), now = new Date();
  var data = padRow(row.data, "users");
  data[A.tokenHash] = sha256(token);
  data[A.tokenExp] = new Date(now.getTime() + ADMIN_TOKEN_HOURS * 3600 * 1000).toISOString();
  data[A.lastLogin] = now.toISOString();
  writeAdminRow(sh, row.index, data);
  return { ok: true, token: token, expires: data[A.tokenExp], admin: publicAdmin(data) };
}

function requireAdmin(token) {
  if (!token) throw new Error("AUTH: Please sign in to the admin panel.");
  var h = sha256(String(token));
  var rows = sheet("users").getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][A.tokenHash]) === h) {
      if (String(rows[i][A.status]) === "disabled")
        throw new Error("AUTH: This admin account was disabled.");
      if (!rows[i][A.tokenExp] || new Date(rows[i][A.tokenExp]) < new Date())
        throw new Error("AUTH: Your admin session expired. Please sign in again.");
      return { index: i + 1, data: rows[i] };
    }
  }
  throw new Error("AUTH: Your admin session is no longer valid. Please sign in again.");
}

function adminRole(r) { return String(r[A.role] || "superadmin"); }
function publicAdmin(r) {
  return { id: Number(r[A.id]) || r[A.id], username: String(r[A.user] || ""), name: String(r[A.name] || ""),
           role: adminRole(r), status: String(r[A.status] || "active"), createdAt: r[A.created], lastLoginAt: r[A.lastLogin] };
}

function findAdmin(sh, username) {
  var u = normId(username);
  if (!u) return null;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (normId(rows[i][A.user]) === u) return { index: i + 1, data: rows[i] };
  return null;
}

function writeAdminRow(sh, index, data) {
  sh.getRange(index, 2, 1, data.length - 1).setValues([data.slice(1).map(function (v) { return v === null || v === undefined ? "" : String(v); })]);
}

function validUsername(u) { return /^[a-z0-9._-]{3,32}$/.test(u); }

function adminList() {
  return readRows("users").filter(function (a) { return a.id !== ""; }).map(function (a) {
    return { id: Number(a.id) || a.id, username: String(a.username || ""), name: String(a.name || ""),
             role: String(a.role || "superadmin"), status: String(a.status || "active"), createdAt: a.createdAt, lastLoginAt: a.lastLoginAt };
  });
}

// Create (no id) or update an admin. New admins need username + passwordHash.
function adminSave(p, me) {
  var sh = sheet("users"), now = new Date().toISOString();
  var name = String(p.name || "").trim().slice(0, 80);
  if (!p.id) {
    var u = normId(p.username);
    if (!validUsername(u)) return { ok: false, error: "Username must be 3–32 characters: letters, numbers, dot, dash or underscore." };
    if (findAdmin(sh, u)) return { ok: false, error: "That username is already taken." };
    if (!p.passwordHash) return { ok: false, error: "Set a password for the new admin." };
    var role = ADMIN_ROLES.indexOf(p.role) > -1 ? p.role : "staff";
    var id = nextId(sh);
    appendRowAsText(sh, [id, u, name, p.passwordHash, role, "active", now, now, "", "", ""]);
    return { ok: true, admin: publicAdmin([id, u, name, p.passwordHash, role, "active", now]) };
  }
  var idx = findRowById(sh, p.id);
  if (!idx) return { ok: false, error: "Admin not found." };
  var data = padRow(sh.getRange(idx, 1, 1, SHEETS.users.headers.length).getValues()[0], "users");
  var isMe = idx === me.index;
  if (p.name !== undefined) data[A.name] = name;
  if (p.role !== undefined) {
    if (ADMIN_ROLES.indexOf(p.role) < 0) return { ok: false, error: "Invalid role." };
    if (isMe) return { ok: false, error: "You can't change your own role." };
    data[A.role] = p.role;
  }
  if (p.status !== undefined) {
    if (["active", "disabled"].indexOf(p.status) < 0) return { ok: false, error: "Invalid status." };
    if (isMe && p.status === "disabled") return { ok: false, error: "You can't disable your own account." };
    data[A.status] = p.status;
    if (p.status === "disabled") { data[A.tokenHash] = ""; data[A.tokenExp] = ""; }
  }
  if (p.passwordHash) {
    if (isMe) return { ok: false, error: "Use “Change my password” for your own account." };
    data[A.hash] = p.passwordHash; data[A.tokenHash] = ""; data[A.tokenExp] = "";
  }
  data[A.updated] = now;
  writeAdminRow(sh, idx, data);
  return { ok: true, admin: publicAdmin(data) };
}

function adminDelete(p, me) {
  var sh = sheet("users"), idx = findRowById(sh, p.id);
  if (!idx) return { ok: false, error: "Admin not found." };
  if (idx === me.index) return { ok: false, error: "You can't delete your own admin account." };
  sh.deleteRow(idx);
  return { ok: true };
}

function adminChangePassword(p, me) {
  if (String(me.data[A.hash]) !== String(p.currentHash)) return { ok: false, error: "Your current password is incorrect." };
  if (!p.newHash) return { ok: false, error: "Enter a new password." };
  var sh = sheet("users"), data = padRow(me.data, "users");
  data[A.hash] = p.newHash; data[A.updated] = new Date().toISOString();
  writeAdminRow(sh, me.index, data);   // keeps the current session's token
  return { ok: true };
}

function adminCall(b) {
  try {
    var me = requireAdmin(b.token);
    var p = b.payload || {};
    var ops = {
      stats:           function () { return adminStats(); },
      listAdmins:      function () { return { admins: adminList(), meId: Number(me.data[A.id]) || me.data[A.id] }; },
      saveAdmin:       function () { return withLock(function () { return adminSave(p, me); }); },
      deleteAdmin:     function () { return withLock(function () { return adminDelete(p, me); }); },
      changePassword:  function () { return withLock(function () { return adminChangePassword(p, me); }); },
      listOrders:      function () { return { orders: adminOrders() }; },
      updateOrder:     function () { return withLock(function () { return adminUpdateOrder(p); }); },
      listCatalog:     function () { return { categories: readCategories(), vendors: readSellers(), products: readProducts(true) }; },
      saveProduct:     function () { return withLock(function () { return saveRecord("products", p, validateProduct); }); },
      deleteProduct:   function () { return withLock(function () { return deleteRecord("products", p.id); }); },
      saveCategory:    function () { return withLock(function () { return saveCategoryRec(p); }); },
      deleteCategory:  function () { return withLock(function () { return deleteCategoryRec(p.id); }); },
      saveVendor:      function () { return withLock(function () { return saveRecord("sellers", p, validateVendor); }); },
      deleteVendor:    function () { return withLock(function () { return deleteSellerRec(p.id); }); },
      importCatalog:   function () { return withLock(function () {
                           if (readRows("products").length && !p.overwrite) return { ok: false, error: "The Products tab already has data." };
                           var r = importCatalog(p.data || {}); return { ok: true, imported: r }; }); }
    };
    if (!ops[b.op]) return { ok: false, error: "Unknown admin operation: " + b.op };
    if (PERMS[b.op] && PERMS[b.op].indexOf(adminRole(me.data)) < 0)
      return { ok: false, error: "Your role doesn't have access to that action." };
    var res = ops[b.op]();
    if (res && res.ok === false) return res;
    var out = { ok: true }; for (var k in res) out[k] = res[k];
    return out;
  } catch (err) {
    var msg = String(err && err.message || err);
    return { ok: false, auth: msg.indexOf("AUTH: ") === 0, error: msg.replace(/^AUTH: /, "") };
  }
}

function adminStats() {
  var orders = adminOrders(), products = readRows("products"), sellers = readRows("sellers");
  var revenue = 0, byStatus = {};
  ORDER_STATUSES.forEach(function (s) { byStatus[s] = 0; });
  orders.forEach(function (o) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (o.status !== "cancelled") revenue += o.total;
  });
  return {
    stats: {
      revenue: revenue, orders: orders.length,
      admins: readRows("users").length,
      products: products.length,
      hiddenProducts: products.filter(function (p) { return String(p.status) === "hidden"; }).length,
      vendors: sellers.length,
      pendingVendors: sellers.filter(function (v) { return String(v.status) === "pending"; }).length,
      byStatus: byStatus
    },
    recentOrders: orders.slice(0, 8)
  };
}

function adminOrders() {
  var rows = sheet("orders").getDataRange().getValues(), out = [];
  for (var i = 1; i < rows.length; i++) {
    var o = orderObj(rows[i]); o.customer = o.identifier || ""; out.push(o);
  }
  return out.reverse();
}

function adminUpdateOrder(p) {
  if (ORDER_STATUSES.indexOf(p.status) < 0) return { ok: false, error: "Invalid order status." };
  var sh = sheet("orders"), idx = findRowById(sh, p.id);
  if (!idx) return { ok: false, error: "Order not found." };
  sh.getRange(idx, 6).setValue(p.status);
  return { ok: true };
}

/* --------------------------- generic CRUD -------------------------------- */

// Create (no id) or update (id) a row from an object, after validation.
function saveRecord(key, obj, validate) {
  var err = validate(obj);
  if (err) return { ok: false, error: err };
  var cfg = SHEETS[key], sh = sheet(key), now = new Date().toISOString();
  var idx = obj.id ? findRowById(sh, obj.id) : 0;
  if (obj.id && !idx) return { ok: false, error: "Record not found — it may have been deleted." };
  var current = {};
  if (idx) {
    var vals = sh.getRange(idx, 1, 1, cfg.headers.length).getValues()[0];
    cfg.headers.forEach(function (h, i) { current[h] = vals[i]; });
  } else {
    current.id = nextId(sh);
    if (cfg.headers.indexOf("createdAt") > -1) current.createdAt = now;
  }
  cfg.headers.forEach(function (h) { if (h !== "id" && h !== "createdAt" && obj[h] !== undefined) current[h] = obj[h]; });
  if (cfg.headers.indexOf("updatedAt") > -1) current.updatedAt = now;
  var row = cfg.headers.map(function (h) { return current[h] === undefined || current[h] === null ? "" : current[h]; });
  if (idx) {
    (cfg.textCols || []).forEach(function (n) { var c = cfg.headers.indexOf(n) + 1; if (c) sh.getRange(idx, c).setNumberFormat("@"); });
    sh.getRange(idx, 1, 1, row.length).setValues([row]);
  } else {
    appendRowAsText(sh, row);
  }
  return { ok: true, record: current };
}

function deleteRecord(key, id) {
  var sh = sheet(key), idx = findRowById(sh, id);
  if (!idx) return { ok: false, error: "Record not found." };
  sh.deleteRow(idx);
  return { ok: true };
}

function deleteIfUnused(key, id, fkCol, label) {
  var used = readRows("products").filter(function (p) { return String(p[fkCol]) === String(id); }).length;
  if (used) return { ok: false, error: "This " + label + " still has " + used + " product" + (used === 1 ? "" : "s") + ". Move or delete them first." };
  return deleteRecord(key, id);
}

// Deleting a category also removes its Drive image; deleting a seller removes
// their certificate files — so nothing is left orphaned in Drive.
function deleteCategoryRec(id) {
  var cur = readRows("categories").filter(function (c) { return String(c.id) === String(id); })[0];
  var res = deleteIfUnused("categories", id, "cat_id", "category");
  if (res.ok && cur && cur.cat_img_url) deleteDriveFile(cur.cat_img_url);
  return res;
}
function deleteSellerRec(id) {
  var cur = readRows("sellers").filter(function (v) { return String(v.id) === String(id); })[0];
  var res = deleteIfUnused("sellers", id, "vendor_id", "seller");
  if (res.ok && cur) { deleteDriveFile(cur.certFront); deleteDriveFile(cur.certBack); }
  return res;
}

function validateProduct(p) {
  p.name = String(p.name || "").trim();
  if (!p.name) return "Product name is required.";
  if (!(Number(p.price) > 0)) return "Price must be greater than 0.";
  if (p.oldPrice !== "" && p.oldPrice != null && Number(p.oldPrice) <= Number(p.price)) return "Old price must be higher than the price (or leave it empty).";
  if (!findRowById(sheet("categories"), p.cat_id)) return "Choose a valid category.";
  if (p.vendor_id !== "" && p.vendor_id != null && !findRowById(sheet("sellers"), p.vendor_id)) return "Choose a valid seller.";
  if (p.imageUrl && !/^(https?:\/\/|images\/)/i.test(String(p.imageUrl))) return "Image URL must start with https:// (or images/ for a local file).";
  if (["", "deal", "bestseller"].indexOf(String(p.badge || "")) < 0) return "Invalid badge.";
  if (["active", "hidden"].indexOf(String(p.status || "active")) < 0) return "Invalid status.";
  p.price = Number(p.price); p.oldPrice = p.oldPrice === "" || p.oldPrice == null ? "" : Number(p.oldPrice);
  p.options = p.options === "" || p.options == null ? "" : Math.max(0, Math.floor(Number(p.options)));
  p.choice = !!p.choice; p.name = p.name.slice(0, 140); p.desc = String(p.desc || "").slice(0, 2000);
  if (p.rating === undefined && !p.id) { p.rating = 0; p.reviews = 0; }
  return "";
}
function validateCategory(c) {
  // Accept the name under any spelling (cat_name / cate_name / name) and write it
  // back to the actual column key (cat_name), so a form/sheet mismatch can't drop
  // the name. Only touch the name when one was sent (partial updates stay intact).
  if (c.cat_name !== undefined || c.cate_name !== undefined || c.name !== undefined)
    c.cat_name = catNameOf(c).trim();
  if (!c.id && !c.cat_name) return "Category name is required.";
  if (c.cat_img_url && !/^(https?:\/\/|images\/)/i.test(String(c.cat_img_url)))
    return "Category image must be an uploaded file or an https:// URL.";
  if (c.cat_order !== undefined)
    c.cat_order = (c.cat_order === "" || c.cat_order == null) ? 0 : Math.max(0, Math.floor(Number(c.cat_order) || 0));
  return "";
}

// saveCategory wrapper: if the admin attached an image (base64 data URL), upload
// it to Drive  categories/images, store the URL, and delete the PREVIOUS image
// from Drive so replaced files never pile up.
function saveCategoryRec(p) {
  var oldUrl = "";
  if (p.id && p.imageData) {
    var cur = readRows("categories").filter(function (c) { return String(c.id) === String(p.id); })[0];
    if (cur) oldUrl = String(cur.cat_img_url || "");
  }
  if (p.imageData) {
    var url = saveCategoryImage(p.imageData, catNameOf(p) || "category");
    if (url) p.cat_img_url = url;
    delete p.imageData;
  }
  var res = saveRecord("categories", p, validateCategory);
  if (res.ok && oldUrl && p.cat_img_url && oldUrl !== p.cat_img_url) deleteDriveFile(oldUrl);
  return res;
}

// Delete a file we stored in Drive, given one of our image/cert URLs. Prefers
// PERMANENT deletion via the advanced Drive service (enable it in the Apps
// Script project: Services → “Drive API”); falls back to Trash (auto-purged in
// ~30 days) when that service isn't enabled.
function driveIdFromUrl(url) {
  url = String(url || "");
  var m = /[?&]id=([a-zA-Z0-9_-]+)/.exec(url) || /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(url) || /\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  return m ? m[1] : "";
}
function deleteDriveFile(url) {
  var id = driveIdFromUrl(url);
  if (!id) return false;
  try { if (typeof Drive !== "undefined" && Drive.Files && Drive.Files.remove) { Drive.Files.remove(id); return true; } } catch (e) {}
  try { DriveApp.getFileById(id).setTrashed(true); return true; } catch (e) {}
  return false;
}

// Upload a category image to Drive  categories/images, make it link-viewable,
// and return an embeddable image URL. Returns "" if nothing valid was provided.
function saveCategoryImage(dataUrl, name) {
  var m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) return "";
  try {
    var ext = (m[1].split("/")[1] || "png").split("+")[0];
    var fname = String(name).replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 40) + "_" + Date.now() + "." + ext;
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], fname);
    var file = categoriesImagesFolder().createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
  } catch (err) { return ""; }
}
function categoriesImagesFolder() {
  return driveChild(driveChild(DriveApp.getRootFolder(), "categories"), "images");
}
function driveChild(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function validateVendor(v) {
  // Only touch fields that were actually sent, so a status-only update (e.g.
  // approving a pending shop) doesn't blank the seller's name / shop name.
  if (v.name !== undefined) v.name = String(v.name).trim();
  if (v.shopName !== undefined) v.shopName = String(v.shopName).trim();
  if (!v.id && !v.shopName && !v.name) return "Shop name is required.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return "Enter a valid email address.";
  if (v.status !== undefined && ["active", "inactive", "pending"].indexOf(String(v.status)) < 0) return "Invalid status.";
  return "";
}

/* -------------------------- Editor-run helpers --------------------------- */

// One-time web bootstrap: create the FIRST admin by opening a URL in the browser:
//   <web app URL>?action=setupAdmin&username=admin&password=admin
// It only works while the Users tab has no admin yet, then self-disables.
function setupAdmin(p) {
  var sh = sheet("users");
  if (readRows("users").filter(function (a) { return a.id !== ""; }).length)
    return { ok: false, error: "An admin already exists — web setup is disabled. Add more admins from the admin panel." };
  var u = normId(p.username || ""), pw = String(p.password || "");
  if (!validUsername(u)) return { ok: false, error: "username must be 3–32 characters: letters, numbers, dot, dash or underscore." };
  if (pw.length < 4) return { ok: false, error: "password must be at least 4 characters." };
  var now = new Date().toISOString();
  var hash = sha256(PASSWORD_PEPPER + "|admin:" + u + "|" + pw);
  appendRowAsText(sh, [nextId(sh), u, "Administrator", hash, "superadmin", "active", now, now, "", "", ""]);
  return { ok: true, message: "Admin '" + u + "' created. You can sign in now. (Web setup is now disabled.)" };
}

// Create an admin login from ADMIN_USERNAME / ADMIN_PASSWORD (top of this file),
// or reset that admin's password. Run from the editor, then clear ADMIN_PASSWORD.
function createAdmin() {
  var u = normId(ADMIN_USERNAME);
  if (!validUsername(u)) throw new Error("Set ADMIN_USERNAME (3–32 letters, numbers, . _ -) at the top of Code.gs.");
  if (String(ADMIN_PASSWORD).length < 4) throw new Error("Set ADMIN_PASSWORD (at least 4 characters) at the top of Code.gs.");
  initSheets();
  var hash = sha256(PASSWORD_PEPPER + "|admin:" + u + "|" + ADMIN_PASSWORD);
  var sh = sheet("users"), row = findAdmin(sh, u), now = new Date().toISOString();
  if (row) {
    var data = padRow(row.data, "users");
    data[A.hash] = hash; data[A.status] = "active"; data[A.updated] = now; data[A.tokenHash] = ""; data[A.tokenExp] = "";
    writeAdminRow(sh, row.index, data);
    SpreadsheetApp.getActive().toast("Password reset for admin '" + u + "'. Now clear ADMIN_PASSWORD and Save.");
  } else {
    appendRowAsText(sh, [nextId(sh), u, "Administrator", hash, "superadmin", "active", now, now, "", "", ""]);
    SpreadsheetApp.getActive().toast("Admin '" + u + "' created. Now clear ADMIN_PASSWORD and Save.");
  }
}

// Renumbers the Orders tab's ids to 1, 2, 3, ... in row order. Safe to re-run.
function migrateToNumericIds() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    initSheets();
    var orders = sheet("orders");
    var o = orders.getDataRange().getValues();
    for (var j = 1; j < o.length; j++) o[j][0] = j;
    if (o.length > 1) orders.getRange(2, 1, o.length - 1, 1).setValues(o.slice(1).map(function (r) { return [r[0]]; }));
    SpreadsheetApp.getActive().toast("Renumbered " + (o.length - 1) + " orders");
  } finally { lock.releaseLock(); }
}

/* ------------------------------ Helpers ---------------------------------- */

// Creates missing tabs, adds any missing header columns (fills defaults for new
// role/status columns), and formats identifier-like columns as plain text.
function initSheets() {
  Object.keys(SHEETS).forEach(function (k) {
    var cfg = SHEETS[k], sh = sheet(k);
    var have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    cfg.headers.forEach(function (h, i) { if (have[i] !== h) sh.getRange(1, i + 1).setValue(h); });
    (cfg.textCols || []).forEach(function (name) {
      var col = cfg.headers.indexOf(name) + 1;
      if (col > 0) sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat("@");
    });
  });
  fillBlank("users", "role", "superadmin");
  fillBlank("users", "status", "active");
  fillBlank("sellers", "status", "pending");
  fillBlank("products", "status", "active");
}

function fillBlank(key, col, value) {
  var sh = sheet(key), c = SHEETS[key].headers.indexOf(col) + 1, last = sh.getLastRow();
  if (!c || last < 2) return;
  var r = sh.getRange(2, c, last - 1, 1), v = r.getValues();
  var changed = false;
  v.forEach(function (row) { if (row[0] === "") { row[0] = value; changed = true; } });
  if (changed) r.setValues(v);
}

function sheet(key) {
  var cfg = SHEETS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(cfg.name);
  if (!sh) { sh = ss.insertSheet(cfg.name); sh.appendRow(cfg.headers); }
  else if (sh.getLastRow() === 0) { sh.appendRow(cfg.headers); }
  return sh;
}

// Next numeric id for a tab: highest existing numeric id + 1 (ids start at 1).
function nextId(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < ids.length; i++) { var n = Number(ids[i][0]); if (n > max) max = n; }
  return max + 1;
}

function findRowById(sh, id) {
  if (id === undefined || id === null || id === "") return 0;
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

// Append a row, formatting text columns as text first so Sheets doesn't turn
// "0123456789" into the number 123456789.
function appendRowAsText(sh, values) {
  var key = Object.keys(SHEETS).filter(function (k) { return SHEETS[k].name === sh.getName(); })[0];
  var cfg = SHEETS[key], row = sh.getLastRow() + 1;
  (cfg.textCols || []).forEach(function (name) {
    var col = cfg.headers.indexOf(name) + 1;
    if (col > 0) sh.getRange(row, col).setNumberFormat("@");
  });
  sh.getRange(row, 1, 1, values.length).setValues([values]);
}

function padRow(r, key) {
  var d = r.slice();
  while (d.length < SHEETS[key].headers.length) d.push("");
  return d;
}

function sha256(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ("0" + ((b + 256) % 256).toString(16)).slice(-2); }).join("");
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, error: "Server is busy, please try again." };
  try { return fn(); } finally { lock.releaseLock(); }
}

function normId(s) { return String(s || "").trim().toLowerCase(); }
function safeParse(s) { try { return JSON.parse(s); } catch (_) { return []; } }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
