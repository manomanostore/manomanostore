/* =============================================================================
   SITE CONFIG — the ONE place to change brand, colors, currency, backend.
   ============================================================================= */
window.CONFIG = {
  // --- BRAND (placeholder — replace BRAND_NAME with your real store name) ----
  BRAND_NAME: "ManoMano",
  BRAND_TAGLINE: "DIY, home & garden — smarter prices",
  BRAND_SHORT: "ManoMano",          // used for PWA / small spaces

  // --- CURRENCY (USD only, per spec) ---------------------------------------
  CURRENCY_SYMBOL: "$",
  CURRENCY_CODE: "USD",

  // --- GOOGLE SHEETS BACKEND -----------------------------------------------
  // Paste the Apps Script Web App URL here after deploying (see apps-script/README.md).
  // While empty, the site runs fully from /data/products.json and localStorage,
  // so GitHub Pages works immediately. Auth/orders need this URL to persist.
  API_URL: "https://script.google.com/macros/s/AKfycbzdECGUD2SsP2tQm4hP8MOGVW0nK8EPv2mcuFpMGHpbBxBTubcHfOUV1DI7SHf8GWxp/exec",

  // --- MISC -----------------------------------------------------------------
  FREE_SHIPPING_LABEL: "Free shipping",
  SUPPORT_EMAIL: "support@example.com"
};
