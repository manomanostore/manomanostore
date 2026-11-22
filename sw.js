/* Service worker — app-shell cache for an app-like, offline-capable PWA */
var CACHE = "toolnest-v2";
var SHELL = [
  "index.html", "category.html", "product.html", "cart.html", "login.html", "account.html",
  "css/styles.css",
  "js/config.js", "js/data.js", "js/cart.js", "js/auth.js", "js/ui.js", "js/render.js",
  "js/home.js", "js/category.js", "js/product.js", "js/cart-page.js", "js/login.js", "js/account.js",
  "data/products.json", "images/icon.svg", "manifest.webmanifest"
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

  // network-first for the catalog so product updates show; cache fallback offline
  if (url.pathname.endsWith("products.json")) {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r;
    }).catch(function () { return caches.match(req); }));
    return;
  }
  // cache-first for the app shell
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
