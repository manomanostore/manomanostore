/* ============================== cart ===================================== */
(function () {
  var KEY = "tn_cart";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(items) { localStorage.setItem(KEY, JSON.stringify(items)); emit(); }
  function emit() { document.dispatchEvent(new CustomEvent("cart:change")); }

  function items() { return read(); }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return read().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  function add(product, qty) {
    qty = qty || 1;
    var items = read(), f = items.find(function (i) { return i.id === product.id; });
    if (f) f.qty += qty;
    else items.push({ id: product.id, name: product.name, brand: product.brand,
      price: product.price, color: product.color, icon: product.icon, sub: product.sub, qty: qty });
    write(items);
  }
  function setQty(id, qty) {
    var items = read().map(function (i) { if (i.id === id) i.qty = qty; return i; })
      .filter(function (i) { return i.qty > 0; });
    write(items);
  }
  function remove(id) { write(read().filter(function (i) { return i.id !== id; })); }
  function clear() { write([]); }

  window.CART = { items: items, count: count, subtotal: subtotal, add: add, setQty: setQty, remove: remove, clear: clear };
})();
