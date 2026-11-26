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

// No automatic logout: sign-ins last until the person clicks "Log out"
// (10 years is effectively forever, but keeps the expiry column a real date).
var ADMIN_TOKEN_HOURS = 24 * 365 * 10;
var SELLER_TOKEN_HOURS = 24 * 365 * 10;

// TRC20 USDT address sellers send offline wallet deposits to (shown on the
// recharge screen). Change this to your own address.
var USDT_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

// Currency symbol stored with every wallet transaction (change once here).
var CURRENCY_SYMBOL = "₹";
var ORDER_STATUSES = ["received", "processing", "shipped", "delivered", "cancelled"];

var SHEETS = {
  users:      { name: "Users",      headers: ["id","username","name","passwordHash","role","status","createdAt","updatedAt","lastLoginAt","tokenHash","tokenExpires","staff_code"],
                textCols: ["username","passwordHash","tokenHash","staff_code"] },
  sellers:    { name: "Sellers",    headers: ["id","name","email","phone","status","shopName","shop_status","staff_code","certType","certFront","certBack","shopImageURL","invite","rating","passwordHash","createdAt","updatedAt","tokenHash","tokenExpires"],
                textCols: ["phone","email","passwordHash","staff_code","tokenHash"] },
  orders:     { name: "Orders",     headers: ["id","userId","identifier","itemsJson","total","status","createdAt"],
                textCols: ["identifier"] },
  categories: { name: "Categories", headers: ["id","cat_name","seller_profit","cat_img_url","cat_order"] },
  products:   { name: "Products",   headers: ["id","name","cat_id","price","oldPrice","seller_profit","rating","quanitiy","badge","desc","imageUrl_json","status","createdAt","updatedAt"] },
  carts:      { name: "Carts",      headers: ["cart_id","productId","qty","createdAt","updatedAt"],
                textCols: ["cartId","productId"] },
  banners:    { name: "Banners",    headers: ["id","image_url","order","status"] },
  sellerproducts: { name: "SellerProducts", headers: ["id","seller_id","product_id","name","price","profit","qty","status","createdAt","updatedAt"] },
  wallet:       { name: "Wallet",       headers: ["id","seller_id","guarantee","updatedAt"] },
  transactions: { name: "Transactions", headers: ["id","seller_id","type","method","amount","currency","account","voucher","status","note","createdAt","updatedAt"] },
  bank_accounts: { name: "bank_accounts", headers: ["id","seller_id","cash_on","bank_on","bank_name","bank_acc_name","bank_acc_no","ifsc","usdt_on","usdt_link","usdt_address","createdAt","updatedAt"],
                   textCols: ["bank_acc_no","ifsc"] }
};
// Users (admin) columns: 0 id | 1 username | 2 name | 3 passwordHash | 4 role | 5 status | 6 createdAt | 7 updatedAt | 8 lastLoginAt | 9 tokenHash | 10 tokenExpires
var A = { id:0, user:1, name:2, hash:3, role:4, status:5, created:6, updated:7, lastLogin:8, tokenHash:9, tokenExp:10, staffCode:11 };
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
  saveBanner: ["superadmin", "manager"], deleteBanner: ["superadmin", "manager"],
  listWallet: ADMIN_ROLES, walletFeed: ADMIN_ROLES, addTx: ADMIN_ROLES, updateTx: ["superadmin", "manager"], setGuarantee: ADMIN_ROLES,
  listAdmins: ["superadmin"], saveAdmin: ["superadmin"], deleteAdmin: ["superadmin"]
};

/* ----------------------------- HTTP handlers ----------------------------- */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "health";
  try {
    if (action === "getProducts") return json({ ok: true, categories: readCategories(), products: readProducts(false), banners: readBanners(false) });
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
      case "sellerLogin":   return json(withLock(function () { return sellerLogin(body); }));
      case "sellerProfile": return json(withLock(function () { return sellerUpdateProfile(body); }));
      case "sellerPassword":return json(withLock(function () { return sellerChangePassword(body); }));
      case "sellerProducts":    return json(sellerListProducts(body));
      case "sellerAddProducts": return json(withLock(function () { return sellerAddProducts(body); }));
      case "sellerRemoveProduct":return json(withLock(function () { return sellerRemoveProduct(body); }));
      case "sellerWallet":   return json(sellerWallet(body));
      case "sellerBank":     return json(sellerBankGet(body));
      case "sellerBankSave": return json(withLock(function () { return sellerBankSave(body); }));
      case "sellerDeposit":  return json(withLock(function () { return sellerDeposit(body); }));
      case "sellerWithdraw": return json(withLock(function () { return sellerWithdraw(body); }));
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

// A 1/0 (or active/pending) flag → true when "on". Used for a seller's login
// status and their shop_status.
function truthyFlag(v) {
  var s = String(v == null ? "" : v).trim().toLowerCase();
  return (s === "1" || s === "active" || s === "true" || s === "yes" || s === "verified" || s === "on");
}

// Public "Become a seller" registration -> Sellers sheet.
// Rules:
//  - An invitation code is REQUIRED and must match a staff member's staff_code
//    in the Users tab (case-insensitive).
//  - New sellers start LOCKED: status = 0 (can't sign in) and shop_status = 0
//    (shop not verified). A staff/admin/manager sets status = 1 to allow login
//    and shop_status = 1 to mark the shop verified.
//  - The password is hashed in the browser (salt "seller:<email>").
function registerSeller(b) {
  var email = normId(b.email), phone = String(b.phone || "").trim();
  var shop = String(b.shopName || "").trim(), name = String(b.name || "").trim();
  if (!shop)  return { ok: false, error: "Shop name is required." };
  if (!name)  return { ok: false, error: "Your name is required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!email && loginId(phone).length < 6) return { ok: false, error: "Enter your email or a valid mobile number." };
  if (!b.passwordHash) return { ok: false, error: "A password is required." };

  var invite = String(b.invite || "").trim();
  if (!invite) return { ok: false, error: "An invitation code is required." };
  var codes = readRows("users").map(function (u) { return String(u.staff_code || "").trim().toUpperCase(); });
  if (codes.indexOf(invite.toUpperCase()) < 0)
    return { ok: false, error: "Invalid invitation code." };

  var sh = sheet("sellers");
  var pid = loginId(phone);
  if (readRows("sellers").some(function (v) { return (email && normId(v.email) === email) || (pid && loginId(v.phone) === pid); }))
    return { ok: false, error: "A seller account with that email or mobile already exists." };

  var id = nextId(sh), now = new Date().toISOString(), code = invite.toUpperCase();
  var rec = {
    id: id, name: name.slice(0, 80), email: email, phone: phone,
    status: 0, shop_status: 0, createdAt: now, updatedAt: now, shopName: shop.slice(0, 100),
    passwordHash: b.passwordHash, staff_code: code, certType: String(b.certType || ""),
    certFront: saveSellerDoc(b.certFront, id, "front"), certBack: saveSellerDoc(b.certBack, id, "back"),
    invite: code
  };
  appendNamed("sellers", rec);
  return { ok: true, message: "Thanks! Your shop application has been submitted and is pending review." };
}

// Seller sign-in against the SAME Sellers sheet used at registration. They can
// only sign in once a staff member flips status to 1 (verified).
function sellerLogin(b) {
  var id = loginId(b.identifier != null && b.identifier !== "" ? b.identifier : b.email);
  if (!id || !b.passwordHash) return { ok: false, error: "Enter your email or mobile and password." };
  var v = readRows("sellers").filter(function (r) { return loginId(r.email) === id || loginId(r.phone) === id; })[0];
  if (!v || String(v.passwordHash) !== String(b.passwordHash))
    return { ok: false, error: "Incorrect email/mobile or password." };
  if (!truthyFlag(v.status))
    return { ok: false, error: "Your shop is pending review. You can sign in once a staff member approves it." };
  ensureColumns("sellers", ["tokenHash", "tokenExpires"]);   // so the token can be stored even if initSheets wasn't run
  var token = Utilities.getUuid() + Utilities.getUuid();
  setSellerToken(v.id, token);
  return { ok: true, token: token, seller: publicSeller(v, token) };
}

// Make sure a sheet has these columns (appended at the END if missing) so a
// feature's columns show up without a manual initSheets run.
function ensureColumns(key, names) {
  var sh = sheet(key);
  var have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(function (x) { return String(x == null ? "" : x).trim(); });
  names.forEach(function (h) { if (have.indexOf(h) < 0) { sh.getRange(1, have.length + 1).setValue(h); have.push(h); } });
}

// The seller object the dashboard keeps in localStorage (never the password).
function publicSeller(v, token) {
  return { id: v.id, name: v.name, email: v.email, phone: String(v.phone || ""), shopName: v.shopName,
           status: 1, shopStatus: truthyFlag(v.shop_status) ? 1 : 0, rating: clampRating(v.rating),
           shopImage: String(v.shopImageURL || ""), token: token || String(v.token || "") };
}

// Store a hashed, expiring sign-in token on the seller's row so later requests
// (e.g. profile updates) can be authenticated without the password.
function setSellerToken(id, token) {
  var now = new Date();
  saveRecord("sellers", {
    id: id, tokenHash: sha256(token),
    tokenExpires: new Date(now.getTime() + SELLER_TOKEN_HOURS * 3600 * 1000).toISOString()
  }, function () { return ""; });
}

// Resolve a seller from their sign-in token (throws AUTH: … when invalid/expired).
function requireSeller(token) {
  if (!token) throw new Error("AUTH: Please sign in again.");
  var h = sha256(String(token)), rows = readRows("sellers");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].tokenHash && String(rows[i].tokenHash) === h) {
      if (!rows[i].tokenExpires || new Date(rows[i].tokenExpires) < new Date())
        throw new Error("AUTH: Your session expired. Please sign in again.");
      return rows[i];
    }
  }
  throw new Error("AUTH: Your session is no longer valid. Please sign in again.");
}

// Seller edits their own profile (name, phone, shop name) and optionally a new
// shop image. The image goes to Drive under seller/images/<id>/ and its URL is
// stored in shopImageURL; the old one is cleaned up.
function sellerUpdateProfile(b) {
  try {
    var me = requireSeller(b.token);
    var patch = { id: me.id };
    if (b.name !== undefined)     patch.name = String(b.name).trim().slice(0, 80);
    if (b.phone !== undefined)    patch.phone = String(b.phone).trim().slice(0, 30);
    if (b.shopName !== undefined) patch.shopName = String(b.shopName).trim().slice(0, 100);
    if (patch.shopName === "" && b.shopName !== undefined) return { ok: false, error: "Shop name can't be empty." };

    var oldImg = String(me.shopImageURL || "");
    if (b.shopImage) {
      var folder = driveChild(driveImagesFolder("seller"), String(me.id));
      var url = uploadImageTo(b.shopImage, "shop-" + me.id, folder, 600);
      if (url) patch.shopImageURL = url;
    }
    var res = saveRecord("sellers", patch, validateVendor);
    if (!res.ok) return res;
    if (patch.shopImageURL && oldImg && oldImg !== patch.shopImageURL) deleteDriveFile(oldImg);

    var v = readRows("sellers").filter(function (r) { return String(r.id) === String(me.id); })[0] || me;
    return { ok: true, seller: publicSeller(v, b.token) };
  } catch (err) {
    var msg = String(err && err.message || err);
    return { ok: false, auth: msg.indexOf("AUTH: ") === 0, error: msg.replace(/^AUTH: /, "") };
  }
}

// Seller changes their own password. Both the current and new passwords arrive
// already hashed in the browser (salt "seller:<email>"); we verify the current
// hash against the stored one before writing the new one.
function sellerChangePassword(b) {
  try {
    var me = requireSeller(b.token);
    if (!b.currentHash || String(me.passwordHash) !== String(b.currentHash))
      return { ok: false, error: "Your current password is incorrect." };
    if (!b.newHash) return { ok: false, error: "Enter a new password." };
    if (String(b.newHash) === String(me.passwordHash))
      return { ok: false, error: "The new password must be different." };
    var res = saveRecord("sellers", { id: me.id, passwordHash: b.newHash }, function () { return ""; });
    if (!res.ok) return res;
    return { ok: true };
  } catch (err) {
    var msg = String(err && err.message || err);
    return { ok: false, auth: msg.indexOf("AUTH: ") === 0, error: msg.replace(/^AUTH: /, "") };
  }
}

/* ---- A seller's own products (picked from the Storehouse catalog) ---- */

// List the products a seller has added to their shop, refreshed with the
// catalog's current name / price / profit / image.
function sellerListProducts(b) {
  try {
    var me = requireSeller(b.token);
    var cat = {}; readProducts(true).forEach(function (p) { cat[String(p.id)] = p; });
    var list = readRows("sellerproducts").filter(function (r) {
      return r.id !== "" && String(r.seller_id) === String(me.id);
    }).map(function (r) {
      var p = cat[String(r.product_id)] || {};
      return {
        id: Number(r.id) || r.id, productId: Number(r.product_id) || r.product_id,
        name: String(p.name || r.name || ""),
        price: Number(p.price != null ? p.price : r.price) || 0,
        profit: Number(p.sellerProfit != null ? p.sellerProfit : r.profit) || 0,
        qty: Math.max(1, Math.floor(Number(r.qty) || 1)),
        imageUrl: String(p.imageUrl || ""), status: String(r.status || "active")
      };
    });
    return { ok: true, products: list };
  } catch (err) {
    var m = String(err && err.message || err);
    return { ok: false, auth: m.indexOf("AUTH: ") === 0, error: m.replace(/^AUTH: /, "") };
  }
}

// Add (or update the quantity of) catalog products in the seller's shop. Items:
// [{ productId, qty }]. Existing picks are updated; new ones appended — so a
// seller can keep adding more products over time.
function sellerAddProducts(b) {
  try {
    var me = requireSeller(b.token);
    // De-dupe the batch by productId (last quantity wins).
    var want = {};
    (b.items || []).forEach(function (i) { if (i && i.productId != null) want[String(i.productId)] = Math.max(1, Math.floor(Number(i.qty) || 1)); });
    var pids = Object.keys(want);
    if (!pids.length) return { ok: false, error: "No products selected." };

    var cat = {}; readProducts(true).forEach(function (p) { cat[String(p.id)] = p; });
    var mineRows = readRows("sellerproducts").filter(function (r) { return String(r.seller_id) === String(me.id); });
    var byPid = {}; mineRows.forEach(function (r) { byPid[String(r.product_id)] = r; });

    var sh = sheet("sellerproducts"), now = new Date().toISOString(), added = 0, updated = 0;
    pids.forEach(function (pid) {
      var p = cat[pid]; if (!p) return;
      var qty = want[pid], cur = byPid[pid];
      if (cur) {
        saveRecord("sellerproducts", { id: cur.id, qty: qty, name: p.name, price: p.price, profit: p.sellerProfit, status: "active" }, function () { return ""; });
        updated++;
      } else {
        appendNamed("sellerproducts", {
          id: nextId(sh), seller_id: me.id, product_id: p.id, name: p.name, price: p.price,
          profit: p.sellerProfit, qty: qty, status: "active", createdAt: now, updatedAt: now
        });
        updated = updated; added++;
      }
    });
    return { ok: true, added: added, updated: updated };
  } catch (err) {
    var m = String(err && err.message || err);
    return { ok: false, auth: m.indexOf("AUTH: ") === 0, error: m.replace(/^AUTH: /, "") };
  }
}

// Remove one of the seller's own products (by its SellerProducts row id).
function sellerRemoveProduct(b) {
  try {
    var me = requireSeller(b.token);
    var row = readRows("sellerproducts").filter(function (r) { return String(r.id) === String(b.id) && String(r.seller_id) === String(me.id); })[0];
    if (!row) return { ok: false, error: "Product not found in your shop." };
    return deleteRecord("sellerproducts", b.id);
  } catch (err) {
    var m = String(err && err.message || err);
    return { ok: false, auth: m.indexOf("AUTH: ") === 0, error: m.replace(/^AUTH: /, "") };
  }
}

/* ------------------------------ Wallet / money --------------------------- */
// Balances are AUTO-COMPUTED from the Transactions + SellerProducts + Wallet
// sheets, so nothing drifts:
//   walletMoney    = Σ approved deposits − Σ approved withdrawals (+ delivered
//                    earnings, once Orders are wired)
//   pendingBalance = Σ (price × qty) of the products the seller stocks
//   guaranteeMoney = staff-set base (Wallet sheet) + approved guarantee recharges
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function sellerBalances(sellerId) {
  var deposits = 0, withdraws = 0, guaranteeAdds = 0;
  readRows("transactions").forEach(function (t) {
    if (String(t.seller_id) !== String(sellerId) || String(t.status) !== "approved") return;
    var amt = Number(t.amount) || 0, ty = String(t.type);
    if (ty === "deposit") deposits += amt;
    else if (ty === "withdraw") withdraws += amt;
    else if (ty === "guarantee") guaranteeAdds += amt;
  });
  var w = readRows("wallet").filter(function (r) { return String(r.seller_id) === String(sellerId); })[0];
  var guaranteeBase = w ? Number(w.guarantee) || 0 : 0;
  var deliveredEarnings = 0, deliveredProfit = 0;   // Orders not wired yet
  return {
    walletMoney: round2(deposits - withdraws + deliveredEarnings),
    pendingBalance: round2(sellerProductsValue(sellerId)),
    guaranteeMoney: round2(guaranteeBase + guaranteeAdds),
    totalProfit: round2(deliveredProfit),
    totalEarnings: round2(deposits - withdraws + deliveredEarnings),
    productCount: readRows("sellerproducts").filter(function (r) { return r.id !== "" && String(r.seller_id) === String(sellerId); }).length
  };
}

// Σ (price × qty) over the catalog products the seller stocks.
function sellerProductsValue(sellerId) {
  var cat = {}; readProducts(true).forEach(function (p) { cat[String(p.id)] = p; });
  var sum = 0;
  readRows("sellerproducts").filter(function (r) { return String(r.seller_id) === String(sellerId); }).forEach(function (r) {
    var p = cat[String(r.product_id)] || {}, price = Number(p.price != null ? p.price : r.price) || 0, qty = Math.max(1, Math.floor(Number(r.qty) || 1));
    sum += price * qty;
  });
  return sum;
}

function txPublic(r) {
  return { id: Number(r.id) || r.id, type: String(r.type || ""), method: String(r.method || ""), amount: Number(r.amount) || 0,
           currency: String(r.currency || CURRENCY_SYMBOL), account: String(r.account || ""), voucher: String(r.voucher || ""),
           status: String(r.status || "pending"), note: String(r.note || ""), createdAt: r.createdAt };
}
function authErr(err) { var m = String(err && err.message || err); return { ok: false, auth: m.indexOf("AUTH: ") === 0, error: m.replace(/^AUTH: /, "") }; }

// Seller's wallet screen: balances, the deposit address, and their history.
function sellerWallet(b) {
  try {
    var me = requireSeller(b.token);
    var txs = readRows("transactions").filter(function (r) { return r.id !== "" && String(r.seller_id) === String(me.id); }).map(txPublic).reverse();
    return { ok: true, balances: sellerBalances(me.id), depositAddress: USDT_ADDRESS, transactions: txs };
  } catch (err) { return authErr(err); }
}

/* ---- A seller's payout / bank account details (one row per seller) ---- */

// The seller's saved payment details, shaped for the form. Empty defaults when
// they haven't configured one yet.
function sellerBankPublic(r) {
  r = r || {};
  var on = function (v) { return truthyFlag(v) ? 1 : 0; };
  return {
    cashOn: on(r.cash_on), bankOn: on(r.bank_on),
    bankName: String(r.bank_name || ""), bankAccName: String(r.bank_acc_name || ""),
    bankAccNo: String(r.bank_acc_no || ""), ifsc: String(r.ifsc || ""),
    usdtOn: on(r.usdt_on), usdtLink: String(r.usdt_link || ""), usdtAddress: String(r.usdt_address || "")
  };
}

// GET the seller's bank/payment account (for editing later).
function sellerBankGet(b) {
  try {
    var me = requireSeller(b.token);
    ensureColumns("bank_accounts", SHEETS.bank_accounts.headers);
    var row = readRows("bank_accounts").filter(function (r) { return String(r.seller_id) === String(me.id); })[0];
    return { ok: true, bank: sellerBankPublic(row) };
  } catch (err) { return authErr(err); }
}

// Create or UPDATE the seller's bank/payment account (upsert by seller_id, so
// a seller can edit it any time).
function sellerBankSave(b) {
  try {
    var me = requireSeller(b.token);
    ensureColumns("bank_accounts", SHEETS.bank_accounts.headers);
    var flag = function (v) { return truthyFlag(v) ? 1 : 0; };
    var patch = {
      seller_id: me.id,
      cash_on: flag(b.cashOn), bank_on: flag(b.bankOn),
      bank_name: String(b.bankName || "").trim().slice(0, 120),
      bank_acc_name: String(b.bankAccName || "").trim().slice(0, 120),
      bank_acc_no: String(b.bankAccNo || "").trim().slice(0, 60),
      ifsc: String(b.ifsc || "").trim().slice(0, 40),
      usdt_on: flag(b.usdtOn), usdt_link: String(b.usdtLink || "").trim().slice(0, 300),
      usdt_address: String(b.usdtAddress || "").trim().slice(0, 200)
    };
    var cur = readRows("bank_accounts").filter(function (r) { return String(r.seller_id) === String(me.id); })[0];
    if (cur && cur.id !== "" && cur.id != null) {
      patch.id = cur.id;
      var res = saveRecord("bank_accounts", patch, function () { return ""; });
      if (!res.ok) return res;
    } else {
      var now = new Date().toISOString();
      patch.id = nextId(sheet("bank_accounts")); patch.createdAt = now; patch.updatedAt = now;
      appendNamed("bank_accounts", patch);
    }
    return { ok: true, bank: sellerBankPublic(patch) };
  } catch (err) { return authErr(err); }
}

// Offline wallet (or guarantee) recharge: creates a PENDING transaction with a
// payment-voucher image; a staff member approves it to credit the balance.
function sellerDeposit(b) {
  try {
    var me = requireSeller(b.token);
    var amount = Number(b.amount) || 0;
    if (!(amount > 0)) return { ok: false, error: "Enter a valid amount." };
    var type = (b.purpose === "guarantee") ? "guarantee" : "deposit", voucher = "";
    // Vouchers live in  seller/images/<sellerId>/transaction/
    if (b.voucher) {
      var folder = driveChild(driveChild(driveImagesFolder("seller"), String(me.id)), "transaction");
      voucher = uploadImageTo(b.voucher, type + "-" + me.id, folder, 1200);
    }
    var now = new Date().toISOString(), sh = sheet("transactions");
    appendNamed("transactions", { id: nextId(sh), seller_id: me.id, type: type, method: "usdt", amount: round2(amount),
      currency: CURRENCY_SYMBOL, account: "", voucher: voucher, status: "pending", note: "", createdAt: now, updatedAt: now });
    return { ok: true, message: "Your recharge request has been submitted for review." };
  } catch (err) { return authErr(err); }
}

// Withdrawal request: only allowed up to the current wallet balance; staff approve
// it to release the payout.
function sellerWithdraw(b) {
  try {
    var me = requireSeller(b.token);
    var amount = Number(b.amount) || 0;
    if (!(amount > 0)) return { ok: false, error: "Enter a valid amount." };
    // Guarantee money is locked: a seller can only request a withdrawal while
    // their wallet money is ABOVE their guarantee money. The amount itself is in
    // ₹ (like a deposit) — the admin converts it to USD at approval, and the USD
    // cap is enforced then (see adminUpdateTx).
    var bal = sellerBalances(me.id), available = round2(bal.walletMoney - bal.guaranteeMoney);
    if (available <= 0) return { ok: false, error: "Your wallet money must be above your guarantee money to withdraw." };
    var method = (b.method === "bank" ? "bank" : "usdt");
    // Payout account: use what was sent, else fall back to the seller's saved
    // payment details (Payment Settings → bank_accounts) so staff know where to pay.
    var account = String(b.account || "").trim().slice(0, 200);
    if (!account) {
      var bank = readRows("bank_accounts").filter(function (r) { return String(r.seller_id) === String(me.id); })[0];
      if (bank) {
        if (method === "bank") account = [bank.bank_name, bank.bank_acc_name, bank.bank_acc_no, bank.ifsc].filter(function (x) { return String(x == null ? "" : x).trim(); }).join(" • ").slice(0, 200);
        else account = String(bank.usdt_address || bank.usdt_link || "").slice(0, 200);
      }
    }
    var now = new Date().toISOString(), sh = sheet("transactions");
    appendNamed("transactions", { id: nextId(sh), seller_id: me.id, type: "withdraw", method: method,
      amount: round2(amount), currency: CURRENCY_SYMBOL, account: account, voucher: "", status: "pending", note: String(b.note || "").slice(0, 300), createdAt: now, updatedAt: now });
    return { ok: true, message: "Your withdrawal request has been submitted." };
  } catch (err) { return authErr(err); }
}

/* Admin: review transactions + set a seller's guarantee money.
   A superadmin/manager sees every seller; a STAFF member sees only the sellers
   who registered with that staff member's own staff_code (invite). */
// Which sellers an admin may see: superadmin/manager → all; staff → only the
// sellers who registered with that staff member's own staff_code (invite).
function walletScope(meData) {
  var role = adminRole(meData || []);
  var myCode = String((meData && meData[A.staffCode]) || "").trim().toUpperCase();
  var sellers = readSellers();
  if (role === "staff")
    sellers = sellers.filter(function (s) { return String(s.invite || "").trim().toUpperCase() === myCode && myCode !== ""; });
  var allowed = {}, nameOf = {};
  sellers.forEach(function (s) { allowed[String(s.id)] = true; nameOf[String(s.id)] = s.shopName || s.name || ("#" + s.id); });
  return { sellers: sellers, allowed: allowed, nameOf: nameOf };
}
function adminWallet(meData) {
  var sc = walletScope(meData);
  var txs = readRows("transactions").filter(function (r) { return r.id !== "" && sc.allowed[String(r.seller_id)]; }).map(function (r) {
    var pub = txPublic(r); pub.sellerId = Number(r.seller_id) || r.seller_id; pub.sellerName = sc.nameOf[String(r.seller_id)] || ("#" + r.seller_id); return pub;
  }).reverse();
  var rows = sc.sellers.map(function (s) { var bal = sellerBalances(s.id);
    return { id: s.id, shopName: s.shopName, name: s.name, email: s.email, guaranteeMoney: bal.guaranteeMoney, walletMoney: bal.walletMoney, pendingBalance: bal.pendingBalance }; });
  return { transactions: txs, sellers: rows, depositAddress: USDT_ADDRESS };
}

// Lean polling feed for real-time alerts: returns transactions NEWER than
// `sinceId` (scoped to the admin's sellers) plus the current maxId. Staff only
// ever get their own sellers' transactions; admin/manager get everyone's.
function walletFeed(meData, sinceId) {
  var sc = walletScope(meData), since = Number(sinceId) || 0, maxId = since, out = [];
  readRows("transactions").forEach(function (r) {
    if (r.id === "" || !sc.allowed[String(r.seller_id)]) return;
    var id = Number(r.id) || 0;
    if (id > maxId) maxId = id;
    if (id > since) {
      var pub = txPublic(r); pub.sellerId = Number(r.seller_id) || r.seller_id;
      pub.sellerName = sc.nameOf[String(r.seller_id)] || ("#" + r.seller_id); out.push(pub);
    }
  });
  return { transactions: out, maxId: maxId };
}
function adminUpdateTx(p) {
  if (["approved", "rejected", "pending"].indexOf(p.status) < 0) return { ok: false, error: "Invalid status." };
  var row = readRows("transactions").filter(function (r) { return String(r.id) === String(p.id); })[0];
  if (!row) return { ok: false, error: "Transaction not found." };
  var patch = { id: p.id, status: p.status, note: String(p.note || "").slice(0, 300) };
  // On approval the admin converts the seller's ₹ amount to USD at the current
  // rate: they send the final amount and currency ($), which is what the wallet
  // is credited (deposit) or debited (withdraw) in. Balances sum approved amounts.
  var hasAmt = (p.amount !== undefined && p.amount !== "" && p.amount != null && !isNaN(Number(p.amount)) && Number(p.amount) > 0);
  if (hasAmt) patch.amount = round2(Number(p.amount));
  if (p.currency !== undefined && String(p.currency) !== "")
    patch.currency = String(p.currency).slice(0, 8);
  // When the RESULT is an approved WITHDRAWAL, the USD amount can't exceed the
  // seller's withdrawable balance (wallet − guarantee), computed as if this row
  // weren't counted — so re-editing an already-approved withdrawal is correct.
  if (p.status === "approved" && String(row.type) === "withdraw") {
    var usd = hasAmt ? round2(Number(p.amount)) : (Number(row.amount) || 0);
    var already = (String(row.status) === "approved") ? (Number(row.amount) || 0) : 0;   // add back its current deduction
    var bal = sellerBalances(row.seller_id), avail = round2(bal.walletMoney + already - bal.guaranteeMoney);
    if (usd > avail) return { ok: false, error: "Approved amount $" + usd.toFixed(2) + " exceeds the seller's withdrawable balance $" + avail.toFixed(2) + " (wallet − guarantee)." };
  }
  return saveRecord("transactions", patch, function () { return ""; });
}

// A staff/manager/admin records a deposit (or guarantee top-up) on a seller's
// behalf. It's created PENDING — a superadmin/manager still has to approve it to
// credit the wallet. Staff may only do this for their OWN sellers.
function adminAddDeposit(p, meData) {
  var sid = p.seller_id || p.id;
  if (ownsSellerCheck(sid, meData)) return ownsSellerCheck(sid, meData);
  var amount = Number(p.amount) || 0;
  if (!(amount > 0)) return { ok: false, error: "Enter a valid amount." };
  var s = readRows("sellers").filter(function (r) { return String(r.id) === String(sid); })[0];
  if (!s) return { ok: false, error: "Seller not found." };
  var type = (p.purpose === "guarantee") ? "guarantee" : (p.type === "withdraw" ? "withdraw" : "deposit");
  var now = new Date().toISOString(), sh = sheet("transactions");
  appendNamed("transactions", { id: nextId(sh), seller_id: sid, type: type, method: (p.method === "bank" ? "bank" : "usdt"),
    amount: round2(amount), currency: CURRENCY_SYMBOL, account: String(p.account || "").slice(0, 200), voucher: "",
    status: "pending", note: String(p.note || "").slice(0, 300), createdAt: now, updatedAt: now });
  return { ok: true };
}

// Returns an error object when `meData` is a staff member who does NOT own the
// seller `sid` (seller registered with their staff_code); "" otherwise.
function ownsSellerCheck(sid, meData) {
  if (adminRole(meData || []) !== "staff") return "";
  var myCode = String((meData && meData[A.staffCode]) || "").trim().toUpperCase();
  var s = readRows("sellers").filter(function (r) { return String(r.id) === String(sid); })[0];
  if (!s || myCode === "" || String(s.invite || "").trim().toUpperCase() !== myCode)
    return { ok: false, error: "You can only manage your own sellers." };
  return "";
}
function adminSetGuarantee(p, meData) {
  var sid = p.seller_id || p.id;
  // Staff may only manage guarantee for the sellers who registered with their code.
  if (ownsSellerCheck(sid, meData)) return ownsSellerCheck(sid, meData);
  var amount = Math.max(0, Number(p.amount) || 0), now = new Date().toISOString();
  var cur = readRows("wallet").filter(function (r) { return String(r.seller_id) === String(sid); })[0];
  if (cur) saveRecord("wallet", { id: cur.id, guarantee: round2(amount), updatedAt: now }, function () { return ""; });
  else appendNamed("wallet", { id: nextId(sheet("wallet")), seller_id: sid, guarantee: round2(amount), updatedAt: now });
  return { ok: true };
}

// A seller's shop rating: a number from 0 to 5 (shown as stars on the seller
// dashboard). Blank/invalid becomes 0.
function clampRating(v) {
  var n = Number(v);
  if (!isFinite(n)) n = 0;
  return Math.min(5, Math.max(0, n));
}

// Save a seller's certificate (image OR PDF data URL) into Drive under
// seller/images/<sellerId>/ and return a viewable URL. Returns "" when nothing
// was provided.
function saveSellerDoc(dataUrl, sellerId, label) {
  var m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) return "";
  try {
    var mime = m[1], ext = (mime.split("/")[1] || "bin").split("+")[0];
    var folder = driveChild(driveImagesFolder("seller"), String(sellerId));
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), mime, label + "_" + Date.now() + "." + ext);
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    if (/^image\//i.test(mime)) return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200";
    return "https://drive.google.com/file/d/" + file.getId() + "/view";
  } catch (err) { return ""; }
}

// For the admin: expose status as active/pending and shop_status as
// verified/unverified, plus the raw fields the admin may want to see.
function readSellers() {
  return readRows("sellers").filter(function (v) { return v.id !== ""; }).map(function (v) {
    v.id = Number(v.id) || v.id; v.phone = String(v.phone || "");
    v.status = truthyFlag(v.status) ? "active" : "pending";
    v.shopStatus = truthyFlag(v.shop_status) ? "verified" : "unverified";
    v.staffCode = String(v.staff_code || "");
    v.rating = clampRating(v.rating);
    return v;
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
               sellerProfit: Math.max(0, Math.min(100, Number(c.seller_profit) || 0)),
               order: Number(c.cat_order) || 0 };
    })
    .sort(function (a, b) { return (a.order - b.order) || (Number(a.id) - Number(b.id)); });
}

// includeHidden=false for the public shop; the admin panel sees everything.
// Each product carries a sellerProfit ($): the stored value, or — when blank —
// computed from its category's seller_profit percentage × price.
function readProducts(includeHidden) {
  var out = [], pmap = categoryProfitMap();
  readRows("products").forEach(function (o) {
    if (o.id === "") return;
    if (!includeHidden && String(o.status) === "hidden") return;
    var cp = cleanProduct(o);
    cp.sellerProfit = productProfit(o, cp, pmap);
    out.push(cp);
  });
  return out;
}

// { categoryId: profitPercent } — used to auto-compute a product's profit.
function categoryProfitMap() {
  var m = {};
  readRows("categories").forEach(function (c) { m[String(c.id)] = Math.max(0, Math.min(100, Number(c.seller_profit) || 0)); });
  return m;
}
// A product's profit in $: the stored seller_profit, else price × category%/100.
function productProfit(o, cp, pmap) {
  var stored = o.seller_profit;
  if (stored !== "" && stored != null && !isNaN(Number(stored))) return Math.max(0, +Number(stored).toFixed(2));
  var pct = (pmap || categoryProfitMap())[String(cp.cat_id)] || 0, price = Number(cp.price) || 0;
  return (pct > 0 && price > 0) ? +(price * pct / 100).toFixed(2) : 0;
}

// Products sheet columns: id | name | cat_id | price | oldPrice | rating |
// quanitiy | badge | desc | imageUrl_json | createdAt | updatedAt.
// imageUrl_json holds one or more image URLs (a JSON array, or newline/comma
// separated). The returned object keeps the fields the storefront expects, with
// safe defaults for ones no longer stored (brand, choice, options, status…).
function parseImages(v) {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  var s = String(v).trim();
  if (s.charAt(0) === "[") { try { var a = JSON.parse(s); if (Array.isArray(a)) return a.map(String).filter(Boolean); } catch (e) {} }
  return s.split(/[\n,]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}
function cleanProduct(o) {
  var imgs = parseImages(o.imageUrl_json !== undefined ? o.imageUrl_json : o.imageUrl);
  return {
    id: Number(o.id) || o.id,
    name: String(o.name || ""),
    cat_id: Number(o.cat_id) || o.cat_id,
    price: Number(o.price) || 0,
    oldPrice: (o.oldPrice === "" || o.oldPrice == null) ? "" : Number(o.oldPrice),
    rating: Number(o.rating) || 0,
    quantity: (o.quanitiy === "" || o.quanitiy == null) ? "" : Math.max(0, Math.floor(Number(o.quanitiy) || 0)),
    badge: String(o.badge || ""),
    desc: String(o.desc || ""),
    images: imgs,
    imageUrl: imgs[0] || "",
    sellerProfit: (o.seller_profit === "" || o.seller_profit == null) ? 0 : Math.max(0, Number(o.seller_profit) || 0),
    status: String(o.status || "active"),
    createdAt: o.createdAt, updatedAt: o.updatedAt,
    // compatibility defaults so the existing storefront keeps rendering
    brand: "", vendor_id: "", reviews: 0, choice: false, options: ""
  };
}

function readRows(key) {
  var rows = sheet(key).getDataRange().getValues();
  if (rows.length < 2) return [];
  var h = rows[0], out = [];
  for (var i = 1; i < rows.length; i++) {
    var o = {};
    for (var c = 0; c < h.length; c++) o[String(h[c] == null ? "" : h[c]).trim()] = rows[i][c];
    out.push(o);
  }
  return out;
}

// The tab's ACTUAL header row (trimmed), used so writes line up by column NAME
// instead of a fixed position — a hand-reordered or hand-extended sheet still
// works. Falls back to the canonical headers when the sheet has no header yet.
function sheetHeaders(key) {
  var sh = sheet(key), n = Math.max(sh.getLastColumn(), 1);
  var row = sh.getRange(1, 1, 1, n).getValues()[0].map(function (x) { return String(x == null ? "" : x).trim(); });
  return row.some(function (h) { return h !== ""; }) ? row : SHEETS[key].headers.slice();
}

// Append a record placing each field under its matching header column by NAME.
function appendNamed(key, rec) {
  var sh = sheet(key), hdr = sheetHeaders(key), r = sh.getLastRow() + 1;
  (SHEETS[key].textCols || []).forEach(function (name) { var c = hdr.indexOf(name) + 1; if (c > 0) sh.getRange(r, c).setNumberFormat("@"); });
  var row = hdr.map(function (h) { return rec[h] === undefined || rec[h] === null ? "" : rec[h]; });
  sh.getRange(r, 1, 1, row.length).setValues([row]);
  return row;
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
           role: adminRole(r), status: String(r[A.status] || "active"), staffCode: String(r[A.staffCode] || ""),
           createdAt: r[A.created], lastLoginAt: r[A.lastLogin] };
}

// Staff code: two uppercase letters + six digits, e.g. "US445734". Generated by
// the system when an admin is created and never changed afterwards (read-only).
function genStaffCode() {
  var L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", s = L.charAt(Math.floor(Math.random() * 26)) + L.charAt(Math.floor(Math.random() * 26));
  for (var i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
  return s;
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
             role: String(a.role || "superadmin"), status: String(a.status || "active"), staffCode: String(a.staff_code || ""),
             createdAt: a.createdAt, lastLoginAt: a.lastLoginAt };
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
    var id = nextId(sh), code = genStaffCode();
    var row = [id, u, name, p.passwordHash, role, "active", now, now, "", "", "", code];
    appendRowAsText(sh, row);
    return { ok: true, admin: publicAdmin(row) };
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
      listCatalog:     function () { return { categories: readCategories(), vendors: readSellers(), products: readProducts(true), banners: readBanners(true) }; },
      saveBanner:      function () { return withLock(function () { return saveBannerRec(p); }); },
      deleteBanner:    function () { return withLock(function () { return deleteBannerRec(p.id, p.matchUrl); }); },
      saveProduct:     function () { return withLock(function () { return saveProductRec(p); }); },
      deleteProduct:   function () { return withLock(function () { return deleteProductRec(p.id); }); },
      saveCategory:    function () { return withLock(function () { return saveCategoryRec(p); }); },
      deleteCategory:  function () { return withLock(function () { return deleteCategoryRec(p.id); }); },
      saveVendor:      function () { return withLock(function () { return saveRecord("sellers", p, validateVendor); }); },
      deleteVendor:    function () { return withLock(function () { return deleteSellerRec(p.id); }); },
      listWallet:      function () { return adminWallet(me.data); },
      walletFeed:      function () { return walletFeed(me.data, p.sinceId); },
      addTx:           function () { return withLock(function () { return adminAddDeposit(p, me.data); }); },
      updateTx:        function () { return withLock(function () { return adminUpdateTx(p); }); },
      setGuarantee:    function () { return withLock(function () { return adminSetGuarantee(p, me.data); }); },
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
      pendingVendors: sellers.filter(function (v) { return !truthyFlag(v.status); }).length,
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
  var hdr = sheetHeaders(key);                     // position by the REAL columns
  var idx = obj.id ? findRowById(sh, obj.id) : 0;
  if (obj.id && !idx) return { ok: false, error: "Record not found — it may have been deleted." };
  var current = {};
  if (idx) {
    var vals = sh.getRange(idx, 1, 1, hdr.length).getValues()[0];
    hdr.forEach(function (h, i) { current[h] = vals[i]; });
  } else {
    current.id = nextId(sh);
    if (hdr.indexOf("createdAt") > -1) current.createdAt = now;
  }
  hdr.forEach(function (h) { if (h !== "id" && h !== "createdAt" && obj[h] !== undefined) current[h] = obj[h]; });
  if (hdr.indexOf("updatedAt") > -1) current.updatedAt = now;
  var row = hdr.map(function (h) { return current[h] === undefined || current[h] === null ? "" : current[h]; });
  var r = idx || (sh.getLastRow() + 1);
  (cfg.textCols || []).forEach(function (n) { var c = hdr.indexOf(n) + 1; if (c > 0) sh.getRange(r, c).setNumberFormat("@"); });
  sh.getRange(r, 1, 1, row.length).setValues([row]);
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
  if (res.ok) {
    if (cur) { deleteDriveFile(cur.certFront); deleteDriveFile(cur.certBack); }
    try { var it = driveImagesFolder("seller").getFoldersByName(String(id)); while (it.hasNext()) it.next().setTrashed(true); } catch (e) {}
  }
  return res;
}
// Deleting a product also removes its uploaded images + its products/images/<id> folder.
function deleteProductRec(id) {
  var cur = readRows("products").filter(function (x) { return String(x.id) === String(id); })[0];
  var res = deleteRecord("products", id);
  if (res.ok) {
    if (cur) parseImages(cur.imageUrl_json).forEach(function (u) { if (/drive\.google\.com/i.test(u)) deleteDriveFile(u); });
    try { var it = driveImagesFolder("products").getFoldersByName(String(id)); while (it.hasNext()) it.next().setTrashed(true); } catch (e) {}
  }
  return res;
}

// Validates create (no id) fully, and partial updates (e.g. a status-only
// toggle) by only checking fields that were actually sent.
function validateProduct(p) {
  var creating = !p.id;
  if (p.name !== undefined) p.name = String(p.name).trim().slice(0, 140);
  if (creating && !p.name) return "Product name is required.";

  if (p.price !== undefined && p.price !== "" && p.price != null) p.price = Number(p.price);
  if (creating && !(Number(p.price) > 0)) return "Price must be greater than 0.";
  if (p.price !== undefined && p.price !== "" && p.price != null && !(Number(p.price) > 0)) return "Price must be greater than 0.";

  if (p.oldPrice !== undefined) p.oldPrice = (p.oldPrice === "" || p.oldPrice == null) ? "" : Number(p.oldPrice);
  if (p.oldPrice !== undefined && p.oldPrice !== "" && p.price !== undefined && p.price !== "" && p.price != null && Number(p.oldPrice) <= Number(p.price))
    return "Old price must be higher than the price (or leave it empty).";

  if ((creating || p.cat_id !== undefined) && !findRowById(sheet("categories"), p.cat_id)) return "Choose a valid category.";
  if (p.badge !== undefined && ["", "deal", "bestseller"].indexOf(String(p.badge)) < 0) return "Invalid badge.";
  if (p.status !== undefined) { if (["active", "hidden"].indexOf(String(p.status)) < 0) return "Invalid status."; }
  else if (creating) p.status = "active";

  if (p.rating !== undefined) p.rating = (p.rating === "" || p.rating == null) ? 0 : Math.min(5, Math.max(0, Number(p.rating) || 0));
  else if (creating) p.rating = 0;
  if (p.quanitiy !== undefined) p.quanitiy = (p.quanitiy === "" || p.quanitiy == null) ? 0 : Math.max(0, Math.floor(Number(p.quanitiy) || 0));
  // Seller profit ($): if left blank, auto-compute from the category's percentage
  // × price; a value sent by the admin is kept as a manual override.
  if (p.seller_profit !== undefined && p.seller_profit !== "" && p.seller_profit != null) {
    p.seller_profit = Math.max(0, +Number(p.seller_profit).toFixed(2)) || 0;
  } else if ((p.seller_profit === "" || p.seller_profit === undefined) && p.price !== undefined && p.price !== "" && p.price != null && p.cat_id !== undefined) {
    var pct = categoryProfitMap()[String(p.cat_id)] || 0, price = Number(p.price) || 0;
    p.seller_profit = (pct > 0 && price > 0) ? +(price * pct / 100).toFixed(2) : 0;
  }
  if (p.desc !== undefined) p.desc = String(p.desc).slice(0, 2000);
  if (p.imageUrl_json !== undefined) {
    var imgs = parseImages(p.imageUrl_json).filter(function (u) { return /^(https?:\/\/|images\/)/i.test(u); }).slice(0, 8);
    p.imageUrl_json = JSON.stringify(imgs);
  }
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
  if (c.seller_profit !== undefined)
    c.seller_profit = (c.seller_profit === "" || c.seller_profit == null) ? 0 : Math.max(0, Math.min(100, Number(c.seller_profit) || 0));
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

// Upload a base64 image into a Drive folder, make it link-viewable, and return
// an embeddable image URL. Returns "" if nothing valid was provided.
function uploadImageTo(dataUrl, name, folder, w) {
  var m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl || ""));
  if (!m) return "";
  try {
    var ext = (m[1].split("/")[1] || "png").split("+")[0];
    var fname = String(name).replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 40) + "_" + Date.now() + "." + ext;
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], fname);
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w" + (w || 1000);
  } catch (err) { return ""; }
}
function saveCategoryImage(dataUrl, name) { return uploadImageTo(dataUrl, name, driveImagesFolder("categories"), 1000); }
function saveBannerImage(dataUrl, name)   { return uploadImageTo(dataUrl, name, driveImagesFolder("banners"), 1600); }
// A product's uploads live in  products/images/<productId>/  so each product's
// photos are grouped in their own Drive folder.
function saveProductImage(dataUrl, pid, name) {
  var folder = driveChild(driveImagesFolder("products"), String(pid));
  return uploadImageTo(dataUrl, name || ("p" + pid), folder, 1200);
}

// saveProduct wrapper: a product can have up to 4 images. The form sends kept
// image URLs in imageUrl_json and NEW uploads (base64) in imageData[]. Because
// each product's images go in  products/images/<id>/, we save the row FIRST (so
// a new product gets its id), then upload into that id's folder, write the final
// list, and delete any of OUR old Drive images that were removed.
function saveProductRec(p) {
  var newImages = Array.isArray(p.imageData) ? p.imageData : (p.imageData ? [p.imageData] : []);
  delete p.imageData;
  var kept = parseImages(p.imageUrl_json).filter(function (u) { return /^(https?:\/\/|images\/)/i.test(u); }).slice(0, 4);

  // Previous images (for cleanup) must be read before we overwrite the cell.
  var oldImgs = [];
  if (p.id) { var cur = readRows("products").filter(function (x) { return String(x.id) === String(p.id); })[0]; if (cur) oldImgs = parseImages(cur.imageUrl_json); }

  // Save the row first (assigns an id for new products), with the kept URLs.
  p.imageUrl_json = JSON.stringify(kept);
  var res = saveRecord("products", p, validateProduct);
  if (!res.ok) return res;
  var id = res.record.id;

  // Upload new images into products/images/<id>/ and build the final list.
  var uploads = [];
  newImages.forEach(function (d) { var u = saveProductImage(d, id, "product-" + id); if (u) uploads.push(u); });
  var all = kept.concat(uploads).slice(0, 4);

  if (JSON.stringify(all) !== p.imageUrl_json) {
    var sh = sheet("products"), idx = findRowById(sh, id), col = sheetHeaders("products").indexOf("imageUrl_json") + 1;
    if (idx && col) sh.getRange(idx, col).setValue(JSON.stringify(all));
    res.record.imageUrl_json = JSON.stringify(all);
  }
  oldImgs.forEach(function (u) { if (all.indexOf(u) < 0 && /drive\.google\.com/i.test(u)) deleteDriveFile(u); });
  return res;
}
function driveImagesFolder(top) { return driveChild(driveChild(DriveApp.getRootFolder(), top), "images"); }
function driveChild(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ------------------------------ Banners ---------------------------------- */
// Homepage hero banners — one row per slide: id | image_url | order | link.
// Shown on the storefront in `order`; clicking a slide follows `link` (or the
// deals page when blank).
// includeHidden=true for the admin panel; the public shop sees active only.
// status accepts 1/0 or active/hidden; anything not explicitly off counts active.
function bannerActive(v) {
  var s = String(v == null ? "" : v).trim().toLowerCase();
  return !(s === "0" || s === "hidden" || s === "inactive" || s === "false" || s === "no");
}
// Locate the Banners columns tolerantly: match each header name (trimmed, case-
// insensitive) and fall back to the fixed layout id|image_url|order|status by
// POSITION. This is why banners — a tab people add by hand — can't be broken by
// a mistyped header such as "ID", "id " or a stray space in cell A1: the id is
// still read from column A even when its header text isn't exactly "id".
function bannerCols() {
  var rows = sheet("banners").getDataRange().getValues();
  var hdr = (rows[0] || []).map(function (x) { return String(x == null ? "" : x).trim().toLowerCase(); });
  function col(name, fallback) { var i = hdr.indexOf(name); return i >= 0 ? i : fallback; }
  return { rows: rows, id: col("id", 0), url: col("image_url", 1), order: col("order", 2), status: col("status", 3) };
}
function readBanners(includeHidden) {
  var b = bannerCols(), out = [];
  for (var i = 1; i < b.rows.length; i++) {
    var r = b.rows[i], id = r[b.id], url = String(r[b.url] == null ? "" : r[b.url]);
    if (!url) continue;                     // a banner must have an image
    out.push({ id: Number(id) || id, imageUrl: url,
               order: Number(r[b.order]) || 0, status: bannerActive(r[b.status]) ? "active" : "hidden" });
  }
  return out.filter(function (x) { return includeHidden || x.status === "active"; })
    .sort(function (a, c) { return (a.order - c.order) || (Number(a.id) - Number(c.id)); });
}

function validateBanner(b) {
  // Store status as 1 (show) / 0 (hide) to match the Sheet's column. New banners
  // default to shown; a status-only update just flips visibility.
  if (b.status !== undefined) b.status = bannerActive(b.status) ? 1 : 0;
  else if (!b.id) b.status = 1;
  if (b.order !== undefined) b.order = (b.order === "" || b.order == null) ? 0 : Math.max(0, Math.floor(Number(b.order) || 0));
  if (!b.id && !b.image_url && !b.imageData) return "A banner image is required.";
  return "";
}

// Find a banner's row id by its current image URL — a fallback so edits/toggles
// still work even if the client couldn't send an id.
function bannerRowIdByUrl(url) {
  url = String(url || "");
  if (!url) return "";
  var b = bannerCols();
  for (var i = 1; i < b.rows.length; i++) {
    if (String(b.rows[i][b.url] == null ? "" : b.rows[i][b.url]) === url) return b.rows[i][b.id];
  }
  return "";
}
function saveBannerRec(p) {
  if ((p.id === "" || p.id == null) && p.matchUrl) p.id = bannerRowIdByUrl(p.matchUrl);
  delete p.matchUrl;
  var oldUrl = "";
  if (p.id && p.imageData) {
    var cur = readRows("banners").filter(function (b) { return String(b.id) === String(p.id); })[0];
    if (cur) oldUrl = String(cur.image_url || "");
  }
  if (p.imageData) {
    var url = saveBannerImage(p.imageData, "banner");
    if (url) p.image_url = url;
    delete p.imageData;
  }
  var res = saveRecord("banners", p, validateBanner);
  if (res.ok && oldUrl && p.image_url && oldUrl !== p.image_url) deleteDriveFile(oldUrl);
  return res;
}
function deleteBannerRec(id, matchUrl) {
  if ((id === "" || id == null) && matchUrl) id = bannerRowIdByUrl(matchUrl);
  var cur = readRows("banners").filter(function (b) { return String(b.id) === String(id); })[0];
  var res = deleteRecord("banners", id);
  if (res.ok && cur && cur.image_url) deleteDriveFile(cur.image_url);
  return res;
}
function validateVendor(v) {
  // Only touch fields that were actually sent, so a status-only update (e.g.
  // approving a pending shop) doesn't blank the seller's name / shop name.
  // status (login) and shop_status (shop verified) are stored as 1 / 0.
  if (v.name !== undefined) v.name = String(v.name).trim();
  if (v.shopName !== undefined) v.shopName = String(v.shopName).trim();
  if (!v.id && !v.shopName && !v.name) return "Shop name is required.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return "Enter a valid email address.";
  if (v.status !== undefined) v.status = truthyFlag(v.status) ? 1 : 0;
  if (v.shop_status !== undefined) v.shop_status = truthyFlag(v.shop_status) ? 1 : 0;
  if (v.rating !== undefined) v.rating = (v.rating === "" || v.rating == null) ? 0 : clampRating(v.rating);
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
  appendRowAsText(sh, [nextId(sh), u, "Administrator", hash, "superadmin", "active", now, now, "", "", "", genStaffCode()]);
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
    appendRowAsText(sh, [nextId(sh), u, "Administrator", hash, "superadmin", "active", now, now, "", "", "", genStaffCode()]);
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
    var have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(function (x) { return String(x == null ? "" : x).trim(); });
    // Add any missing expected column at the END — never reorder or rename the
    // columns you already have, so a hand-edited tab can't get corrupted.
    cfg.headers.forEach(function (h) { if (have.indexOf(h) < 0) { sh.getRange(1, have.length + 1).setValue(h); have.push(h); } });
    (cfg.textCols || []).forEach(function (name) {
      var col = have.indexOf(name) + 1;
      if (col > 0) sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat("@");
    });
  });
  // Give every row a numeric id — so rows added by hand in the Sheet (e.g. a
  // banner pasted straight in) still work with edit/delete, which key off id.
  Object.keys(SHEETS).forEach(backfillIds);
  fillBlank("users", "role", "superadmin");
  fillBlank("users", "status", "active");
  fillBlank("sellers", "status", 0);
  fillBlank("products", "status", "active");
  backfillStaffCodes();
}

// Give any admin missing a staff_code one (2 letters + 6 digits), so accounts
// that existed before this column still get a code. New codes only; existing
// ones are left untouched.
function backfillStaffCodes() {
  var sh = sheet("users"), c = sheetHeaders("users").indexOf("staff_code") + 1, last = sh.getLastRow();
  if (!c || last < 2) return;
  var rng = sh.getRange(2, c, last - 1, 1), v = rng.getValues(), changed = false;
  v.forEach(function (row) { if (String(row[0] == null ? "" : row[0]).trim() === "") { row[0] = genStaffCode(); changed = true; } });
  if (changed) { rng.setNumberFormat("@"); rng.setValues(v); }
}

// Fill blank ids in a tab (whose first column is "id") with the next numbers,
// leaving existing ids untouched.
function backfillIds(key) {
  if (SHEETS[key].headers[0] !== "id") return;
  var sh = sheet(key), last = sh.getLastRow();
  if (last < 2) return;
  var rng = sh.getRange(2, 1, last - 1, 1), ids = rng.getValues(), max = 0, changed = false;
  ids.forEach(function (r) { var n = Number(r[0]); if (n > max) max = n; });
  ids.forEach(function (r) { if (r[0] === "" || r[0] === null) { r[0] = ++max; changed = true; } });
  if (changed) rng.setValues(ids);
}

function fillBlank(key, col, value) {
  var sh = sheet(key), c = sheetHeaders(key).indexOf(col) + 1, last = sh.getLastRow();
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
// Canonical sign-in id: an email is lowercased; a mobile becomes digits only.
// Used so a seller can register and sign in with EITHER email or mobile.
function loginId(s) { s = String(s == null ? "" : s).trim(); return /@/.test(s) ? s.toLowerCase() : s.replace(/[^\d]/g, ""); }
function safeParse(s) { try { return JSON.parse(s); } catch (_) { return []; } }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
