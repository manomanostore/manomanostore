/* ============================== cart ===================================== */
(function () {
  var KEY = "mm_cart"; // new key: baskets saved with the old text ids are dropped
  var CART_ID = "mm_cart_id";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(items) { localStorage.setItem(KEY, JSON.stringify(items)); emit(); sync(items); }
  function emit() { document.dispatchEvent(new CustomEvent("cart:change")); }

  // A stable per-browser cart id, so the Carts sheet mirrors this basket.
  function cartId() {
    var id = "";
    try { id = localStorage.getItem(CART_ID) || ""; } catch (e) {}
    if (!id) {
      id = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(CART_ID, id); } catch (e) {}
    }
    return id;
  }

  // Best-effort: push the whole basket (with quantities) to the Carts sheet.
  // Never blocks the UI and silently ignores failures / offline.
  function sync(items) {
    try {
      if (!window.CONFIG || !CONFIG.API_URL) return;
      fetch(CONFIG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        keepalive: true, body: JSON.stringify({ action: "saveCart", cartId: cartId(),
          items: items.map(function (i) { return { id: i.id, name: i.name, price: i.price, qty: i.qty }; }) }) }).catch(function () {});
    } catch (e) {}
  }

  function items() { return read(); }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return read().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  function add(product, qty) {
    qty = qty || 1;
    var pid = String(product.id);
    var items = read(), f = items.find(function (i) { return i.id === pid; });
    if (f) f.qty += qty;
    else items.push({ id: pid, name: product.name, brand: product.brand,
      price: product.price, color: product.color, icon: product.icon, imageUrl: product.imageUrl || "", qty: qty });
    write(items);
  }
  function setQty(id, qty) {
    id = String(id);
    var items = read().map(function (i) { if (i.id === id) i.qty = qty; return i; })
      .filter(function (i) { return i.qty > 0; });
    write(items);
  }
  function remove(id) { id = String(id); write(read().filter(function (i) { return i.id !== id; })); }
  function clear() { write([]); }

  window.CART = { items: items, count: count, subtotal: subtotal, add: add, setQty: setQty, remove: remove, clear: clear, cartId: cartId };
})();
