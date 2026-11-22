# Google Sheets backend (Apps Script)

This connects the store to a Google Sheet for **user accounts** and **orders**,
and (optionally) serves the **product catalog** from the sheet too.

> Passwords are hashed in the browser (SHA‑256 + app pepper) before they are
> sent. The sheet never receives or stores a plaintext password.

## 1. Create the Sheet
1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Rename it e.g. `ToolNest DB`.

## 2. Add the script
1. In the sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste the contents of
   [`Code.gs`](./Code.gs). **Save**.
3. In the editor, run the function **`initSheets`** once.
   - Authorise when prompted (*Review permissions → your account → Allow*).
   - This creates the `Users`, `Orders` and `Products` tabs with headers.

## 3. (Optional) Load the catalog into the sheet
1. First deploy the site to GitHub Pages (see the main README) so
   `data/products.json` is reachable at a public URL.
2. In `Code.gs`, set:
   ```js
   var CATALOG_URL = "https://manomano-arch.github.io/data/products.json";
   ```
3. Save, then run **`seedProducts`** once. The `Products` tab fills up.
   - You can now edit products directly in the sheet — the site reads from it.
   - If you skip this, the site simply uses the bundled `data/products.json`.

## 4. Deploy as a Web App
1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Settings:
   - **Description:** ToolNest API
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
