window.Unidex = window.Unidex || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  // Product module keeps the item master separate from customer and invoice concerns.
  function init(app) {
    app.elements.productForm.addEventListener("submit", function (event) {
      event.preventDefault();

      app.data.products.unshift({
        id: utils.createId("ITEM"),
        barcode: valueOf("product-barcode"),
        name: valueOf("product-name"),
        hsn: valueOf("product-hsn"),
        price: numberOf("product-price"),
        gstRate: numberOf("product-gst"),
        stock: numberOf("product-stock")
      });

      app.elements.productForm.reset();
      app.persist();
      app.renderAll();
    });
  }

  function render(app) {
    var invList = document.getElementById("product-inventory-list");

    if (!app.data.products.length) {
      if (invList) invList.innerHTML = '<div class="empty-state">No inventory yet.</div>';
      return;
    }

    if (invList) {
      invList.innerHTML = app.data.products.map(function (product) {
        var stockVal = product.stock || 0;
        var stockColor = stockVal < 0 ? "var(--danger)" : "var(--accent)";
        return [
          '<article class="data-card" style="display:flex; justify-content:space-between; align-items:center;">',
          '<div>',
          '<h3>' + utils.escapeHtml(product.name) + '</h3>',
          '<p>Barcode: ' + utils.escapeHtml(product.barcode || "-") + '</p>',
          '<p>HSN: ' + utils.escapeHtml(product.hsn || "-") + ' | GST: ' + utils.escapeHtml(String(product.gstRate)) + '%</p>',
          '<p><strong>Price: ' + utils.formatCurrency(product.price) + '</strong></p>',
          '</div>',
          '<div style="text-align:right;">',
          '<h2 style="color: ' + stockColor + '; margin:0;">' + stockVal + '</h2>',
          '<p style="margin:0;"><small>Units remaining</small></p>',
          '</div>',
          '</article>'
        ].join("");
      }).join("");
    }
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function numberOf(id) {
    return parseFloat(document.getElementById(id).value) || 0;
  }

  ns.modules.products = {
    init: init,
    render: render
  };
})(window.Unidex);
