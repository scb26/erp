window.LedgerFlow = window.LedgerFlow || {};

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
        gstRate: numberOf("product-gst")
      });

      app.elements.productForm.reset();
      app.persist();
      app.renderAll();
    });
  }

  function render(app) {
    if (!app.data.products.length) {
      app.elements.productList.innerHTML = '<div class="empty-state">No products yet.</div>';
      return;
    }

    app.elements.productList.innerHTML = app.data.products.map(function (product) {
      return [
        '<article class="data-card">',
        "<h3>" + utils.escapeHtml(product.name) + "</h3>",
        "<p>Barcode: " + utils.escapeHtml(product.barcode || "-") + "</p>",
        "<p>HSN/SAC: " + utils.escapeHtml(product.hsn || "-") + " | GST: " + utils.escapeHtml(String(product.gstRate)) + "%</p>",
        "<p>Price: " + utils.formatCurrency(product.price) + "</p>",
        "</article>"
      ].join("");
    }).join("");
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
})(window.LedgerFlow);
