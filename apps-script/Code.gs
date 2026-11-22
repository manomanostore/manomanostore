/* =============================================================================
   ToolNest — Google Sheets backend (Google Apps Script Web App)
   -----------------------------------------------------------------------------
   Handles: user signup/login (hashed passwords only) + orders, and can serve
   the product catalog from the sheet.

   SETUP (see apps-script/README.md for the full walkthrough):
     1. Create a Google Sheet.
     2. Extensions > Apps Script. Paste this file. Save.
     3. Run `initSheets` once (authorise when asked).
     4. (Optional) Set CATALOG_URL below, then run `seedProducts` to fill the
        Products tab from your published data/products.json.
     5. Deploy > New deployment > Web app:
          - Execute as: Me
          - Who has access: Anyone
        Copy the Web App URL into js/config.js -> API_URL.

   SECURITY NOTE: passwords arrive already hashed (SHA-256 + per-user salt) from
   the browser. We NEVER receive or store a plaintext password. This is a demo-
   grade scheme — fine for a learning/portfolio project, not a bank.
   ============================================================================= */

// Optional: raw URL of your published products.json (used only by seedProducts()).
// e.g. "https://manomano-arch.github.io/data/products.json"
var CATALOG_URL = "";

var SHEETS = {
  users:    { name: "Users",    headers: ["id","name","identifier","type","passwordHash","salt","createdAt"] },
  orders:   { name: "Orders",   headers: ["id","userId","identifier","itemsJson","total","status","createdAt"] },
  products: { name: "Products", headers: ["id","name","brand","category","sub","price","oldPrice","rating","reviews","badge","choice","options","color","icon","desc","imageUrl"] }
};

/* ----------------------------- HTTP handlers ----------------------------- */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "health";
  try {
    if (action === "getProducts") return json({ ok: true, products: readProducts() });
    return json({ ok: true, status: "alive", brand: "ToolNest" });
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
      case "signup":      return json(signup(body));
      case "login":       return json(login(body));
      case "createOrder": return json(createOrder(body));
      case "getOrders":   return json({ ok: true, orders: getOrders(body.userId) });
      default:            return json({ ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ------------------------------- Auth ------------------------------------ */

function signup(b) {
  var identifier = normId(b.identifier);
  if (!identifier)    return { ok: false, error: "Email or mobile is required." };
  if (!b.passwordHash)return { ok: false, error: "Missing password." };

  var sh = sheet("users");
  if (findRowByIdentifier(sh, identifier))
    return { ok: false, error: "An account with that email/mobile already exists." };

  var id = "u-" + Date.now().toString(36);
  sh.appendRow([ id, b.name || "", identifier, b.type || guessType(identifier),
                 b.passwordHash, b.salt || "", new Date().toISOString() ]);
  return { ok: true, user: { id: id, name: b.name || "", identifier: identifier } };
}

function login(b) {
  var identifier = normId(b.identifier);
  var sh = sheet("users");
  var row = findRowByIdentifier(sh, identifier);
  if (!row) return { ok: false, error: "No account found for that email/mobile." };
  if (String(row.data[4]) !== String(b.passwordHash))
    return { ok: false, error: "Incorrect password." };
  return { ok: true, user: { id: row.data[0], name: row.data[1], identifier: row.data[2] },
           salt: row.data[5] };
}

// Clients call this first to fetch the salt for a given identifier before hashing.
function getSalt(identifier) {
  var row = findRowByIdentifier(sheet("users"), normId(identifier));
  return row ? row.data[5] : null;
}

/* ------------------------------- Orders ---------------------------------- */

function createOrder(b) {
  var sh = sheet("orders");
  var id = "o-" + Date.now().toString(36);
  sh.appendRow([ id, b.userId || "guest", normId(b.identifier) || "",
                 JSON.stringify(b.items || []), Number(b.total) || 0,
                 "received", new Date().toISOString() ]);
  return { ok: true, orderId: id };
}

function getOrders(userId) {
  var sh = sheet("orders");
  var rows = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] === userId) out.push({
      id: rows[i][0], items: safeParse(rows[i][3]), total: rows[i][4],
      status: rows[i][5], createdAt: rows[i][6]
    });
  }
  return out.reverse();
}

/* ------------------------------ Products --------------------------------- */

function readProducts() {
  var sh = sheet("products");
  var rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  var h = rows[0], out = [];
  for (var i = 1; i < rows.length; i++) {
    var o = {};
    for (var c = 0; c < h.length; c++) o[h[c]] = rows[i][c];
    o.price = Number(o.price) || 0;
    if (o.oldPrice) o.oldPrice = Number(o.oldPrice);
    o.rating = Number(o.rating) || 0;
    o.reviews = Number(o.reviews) || 0;
    if (o.options) o.options = Number(o.options);
    o.choice = (o.choice === true || o.choice === "TRUE" || o.choice === "true");
    out.push(o);
  }
  return out;
}

// Run manually from the editor to fill the Products tab from CATALOG_URL.
function seedProducts() {
  if (!CATALOG_URL) throw new Error("Set CATALOG_URL at the top of Code.gs first.");
  var data = JSON.parse(UrlFetchApp.fetch(CATALOG_URL).getContentText());
  var sh = sheet("products");
  sh.clearContents();
  sh.appendRow(SHEETS.products.headers);
  (data.products || []).forEach(function (p) {
    sh.appendRow(SHEETS.products.headers.map(function (k) {
      return p[k] === undefined ? "" : p[k];
    }));
  });
  SpreadsheetApp.getUi && SpreadsheetApp.getActive().toast("Seeded " + (data.products||[]).length + " products");
}

/* ------------------------------ Helpers ---------------------------------- */

function initSheets() { Object.keys(SHEETS).forEach(function (k) { sheet(k); }); }

function sheet(key) {
  var cfg = SHEETS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(cfg.name);
  if (!sh) { sh = ss.insertSheet(cfg.name); sh.appendRow(cfg.headers); }
  else if (sh.getLastRow() === 0) { sh.appendRow(cfg.headers); }
  return sh;
}

function findRowByIdentifier(sh, identifier) {
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++)
    if (normId(rows[i][2]) === identifier) return { index: i + 1, data: rows[i] };
  return null;
}

function normId(s) { return String(s || "").trim().toLowerCase(); }
function guessType(s) { return s.indexOf("@") > -1 ? "email" : "mobile"; }
function safeParse(s) { try { return JSON.parse(s); } catch (_) { return []; } }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
