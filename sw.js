/* Service worker — app-shell cache for an app-like, offline-capable PWA */
var CACHE = "manomano-v87";
var SHELL = [
  "index.html", "category.html", "product.html", "cart.html", "login.html", "account.html", "blog.html", "brands.html", "sell.html", "seller-dashboard.html",
  "css/styles.css",
  "js/config.js", "data/catalog.js", "js/data.js", "js/cart.js", "js/auth.js", "js/ui.js", "js/render.js",
  "js/home.js", "js/category.js", "js/product.js", "js/cart-page.js", "js/login.js", "js/account.js", "js/seller-dashboard.js",
  "data/products.json", "images/logo-64.png", "images/logo-192.png", "images/logo-512.png",
  "images/banner-1.png", "images/banner-2.png", "images/banner-3.png", "images/banner-4.png", "images/googleplay.png", "images/appstore.svg",
  "images/award-1.png", "images/award-2.png", "images/award-3.png", "images/award-4.png", "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                 // never cache POSTs (auth/orders)
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;        // let API/cross-origin pass through
  // Local development: always hit the network so edits show up on reload.
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  // Network-first for PAGES, CODE and the catalog, so a fresh deploy shows on the
  // next reload (no cache-version bump needed) while staying offline-capable via
  // the cache fallback. This prevents "works locally, stale on the live site".
  if (/\.(?:html|js|css|json)$/.test(url.pathname) || url.pathname === "/" || url.pathname.endsWith("/")) {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r;
    }).catch(function () { return caches.match(req); }));
    return;
  }
  // cache-first for static assets (images, fonts, manifest)
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
