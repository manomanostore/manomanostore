# Google Sheets backend (Apps Script)

This connects the store to a Google Sheet for **user accounts** and **orders**,
and (optionally) serves the **product catalog** from the sheet too.

> Passwords are hashed in the browser (SHA‑256 + app pepper) before they are
> sent. The sheet never receives or stores a plaintext password.

## 1. Create the Sheet
1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Rename it e.g. `ManoMano DB`.

## 2. Add the script
1. In the sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste the contents of
   [`Code.gs`](./Code.gs). **Save**.
3. In the editor, run the function **`initSheets`** once.
   - Authorise when prompted (*Review permissions → your account → Allow*).
   - This creates the `Users`, `Orders`, `Categories` and `Products` tabs with headers.

## 3. (Optional) Load the catalog into the sheet
1. First deploy the site to GitHub Pages (see the main README) so
   `data/products.json` is reachable at a public URL.
2. In `Code.gs`, set:
   ```js
   var CATALOG_URL = "https://manomano-arch.github.io/data/products.json";
   ```
3. Save, then run **`seedProducts`** once. The `Categories` and `Products` tabs fill up.
   - `Categories` columns: `id`, `name`, `icon`, `color`.
   - Each product's `cat_id` must match a category `id`. There are no subcategories.
   - You can now edit products directly in the sheet — the site reads from it.
   - If you skip this, the site simply uses the bundled `data/products.json`.

## 4. Deploy as a Web App
1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Settings:
   - **Description:** ManoMano API
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. **Deploy** → copy the **Web app URL**
   (looks like `https://script.google.com/macros/s/AKfy…/exec`).

## 5. Connect the site
Open [`js/config.js`](../js/config.js) and paste the URL:
```js
API_URL: "https://script.google.com/macros/s/AKfy…/exec",
```
Commit & push. Done — signups, logins and orders now persist to your sheet.

### Re-deploying after you change `Code.gs`
Use **Deploy → Manage deployments → (edit) → Version: New version → Deploy**,
so the URL stays the same.

## Notes & limits
- CORS: the site uses `GET` for reads and `POST` with `text/plain` for writes,
  which avoids the preflight that Apps Script can’t answer. Don’t add custom
  headers on the client.
- This is a demo-grade auth scheme (hashed, not plaintext) — good for a
  portfolio/learning project, not for storing real high-value credentials.
- Free Google quotas are plenty for a demo; heavy traffic may hit limits.

## Numeric IDs & upgrading an existing sheet
Every tab uses a numeric `id` column — `1, 2, 3, …`. New users and orders get the
next number automatically (highest id + 1, under a lock so two requests can't
get the same number). `Orders.userId` holds the user's number, and
`Products.cat_id` holds the category's number from `data/products.json`.

If your sheet was created with an older version (ids like `u-mwryz66n` or
`o-mfx2k9`):
1. Paste the latest `Code.gs` and **Save**.
2. Run **`initSheets`** — adds the new `updatedAt` column and formats the
   `identifier` / `passwordHash` columns as text (keeps leading zeros in mobile
   numbers, e.g. `0987…`).
3. Run **`migrateToNumericIds`** once — renumbers Users and Orders and fixes
   `Orders.userId` to match.
4. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
5. If you seeded products before, run **`seedProducts`** again so the
   Categories/Products tabs get the numeric ids too.

Customers signed in with an old id are signed out automatically and just log in again.

## Profile updates
Customers can change their name, email/mobile and password from **My account →
Account details → Edit profile**. Every change requires their current password
(sent as a hash and checked by `updateProfile`), and `updatedAt` records when.

## Admin panel (`admin.html`)
Manage the shop from **`/admin.html`**: dashboard, orders (change status),
products (add / edit / hide / delete, image URL, vendor, badge, discount),
categories, vendors, customers (block / unblock) and admins.

**Two separate account sets, two tabs:**
- **`Users`** tab — admin logins (username + password), each with a **role**.
- **`Customers`** tab — shop customers (log in with email / mobile).

**Admin roles** (set per admin; the server enforces them):
| Area | Super admin | Manager | Staff |
|------|:--:|:--:|:--:|
| Dashboard, Orders | ✓ | ✓ | ✓ |
| Products add / edit / hide | ✓ | ✓ | ✓ |
| Products delete | ✓ | ✓ | — |
| Categories, Vendors, Customers | ✓ | ✓ | — |
| Admins (add / remove / roles) | ✓ | — | — |

There is **no default admin password** — you create the first admin yourself.

**Create the first admin (once):**
1. Paste the latest `Code.gs`, **Save**, run **`initSheets`** (creates the
   `Users`, `Customers`, `Vendors` tabs and the role/status columns).
   - If you already renamed tabs by hand: the admin tab must be named exactly
     **`Users`** and the customer tab **`Customers`**. `initSheets` creates any
     that are missing; delete leftover tabs like `Userss` or `Sheet1`.
2. Near the top of `Code.gs` set, for example:
   ```js
   var ADMIN_USERNAME = "admin";
   var ADMIN_PASSWORD = "choose-a-strong-password";
   ```
   **Save** and run **`createAdmin`** (it creates a **super admin**).
3. **Clear `ADMIN_PASSWORD` again** (`""`) and **Save**, so the password isn't
   left in the script. Only its hash is stored in the `Users` tab.
4. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
5. Open `admin.html`, sign in, then **Products → Import sample catalog** to
   load the 45 sample products into the sheet (from then on the shop reads the
   catalog from the sheet).

Forgot the password? Repeat step 2–3 with the same username — `createAdmin`
resets it. More admins (manager / staff / super admin) are added from
**Admins → Add admin**; each admin can change their own password there.

**How admin access is protected:** the password is hashed in the browser
(salted with `admin:<username>`), the server checks it and issues a random
token valid for 12 hours. Only the token's SHA-256 is stored; every admin
request is re-checked (role allowed, account active, not expired). Each admin
has one active session — signing in again, being disabled, or having the
password reset by another admin ends the previous session. Hidden products are
never sent to the shop.
