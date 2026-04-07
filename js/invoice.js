window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  // Invoice-specific helpers stay together because they share pricing and GST logic.
  function ensureInvoiceDefaults(app) {
    if (!app.elements.lineItemsContainer.children.length) {
      addLineItemRow(app);
    }

    if (!document.getElementById("invoice-date").value) {
      document.getElementById("invoice-date").value = utils.today();
    }

    if (!document.getElementById("invoice-number").value) {
      document.getElementById("invoice-number").value = nextInvoiceNumber(app);
    }
  }

  function addLineItemRow(app) {
    var row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = [
      '<label><span>Product</span><select class="line-product">' + productOptions(app) + '</select></label>',
      '<label><span>Qty</span><input class="line-qty" type="number" min="0" step="0.01" value="1"></label>',
      '<label><span>Rate</span><input class="line-rate" type="number" min="0" step="0.01" value="' + defaultRate(app) + '"></label>',
      '<label><span>GST %</span><input class="line-gst" type="number" min="0" step="0.01" value="' + defaultGst(app) + '"></label>',
      '<button class="button button--secondary remove-line" type="button">Remove</button>'
    ].join("");
    app.elements.lineItemsContainer.appendChild(row);
  }

  function clearLineItem(app, row) {
    row.querySelector(".line-qty").value = 1;
    row.querySelector(".line-rate").value = defaultRate(app);
    row.querySelector(".line-gst").value = defaultGst(app);
    row.querySelector(".line-product").selectedIndex = 0;
  }

  function handleLineItemChange(app, event) {
    if (!event.target.closest(".line-item-row")) {
      return;
    }

    if (event.target.classList.contains("line-product")) {
      var row = event.target.closest(".line-item-row");
      var product = findProduct(app, event.target.value);

      if (product) {
        row.querySelector(".line-rate").value = product.price;
        row.querySelector(".line-gst").value = product.gstRate;
      }
    }

    app.previewInvoice = null;
    syncPreview(app);
  }

  function syncPreview(app) {
    renderPreview(app, app.previewInvoice || collectInvoiceDraft(app, false));
  }

  function renderPreview(app, invoice) {
    if (!invoice) {
      app.elements.invoicePreview.innerHTML = '<div class="empty-state">Add invoice details to see the preview.</div>';
      updateTotals(app, emptyTotals());
      return;
    }

    app.elements.invoicePreview.innerHTML = buildInvoiceMarkup(invoice);
    updateTotals(app, invoice.totals);
  }

  function collectInvoiceDraft(app, strict) {
    var customer = getSelectedCustomer(app);
    var items = collectLineItems(app);
    var invoiceNumber = valueOf("invoice-number");
    var invoiceDate = valueOf("invoice-date");

    if (!customer || !items.length || !invoiceNumber || !invoiceDate) {
      if (strict) {
        window.alert("Please complete invoice number, date, customer, and at least one valid line item.");
      }
      return null;
    }

    return {
      id: utils.createId("INV"),
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      company: utils.clone(app.data.company),
      customer: utils.clone(customer),
      notes: valueOf("invoice-notes"),
      items: items,
      totals: calculateTotals(app, customer, items)
    };
  }

  function collectLineItems(app) {
    return Array.prototype.slice.call(app.elements.lineItemsContainer.querySelectorAll(".line-item-row")).map(function (row) {
      var productId = row.querySelector(".line-product").value;
      var selectedProduct = findProduct(app, productId);
      var quantity = parseFloat(row.querySelector(".line-qty").value) || 0;
      var rate = parseFloat(row.querySelector(".line-rate").value) || 0;
      var gstRate = parseFloat(row.querySelector(".line-gst").value) || 0;

      if (!selectedProduct || quantity <= 0 || rate < 0) {
        return null;
      }

      return {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        hsn: selectedProduct.hsn,
        quantity: quantity,
        rate: rate,
        gstRate: gstRate,
        taxableValue: quantity * rate
      };
    }).filter(Boolean);
  }

  function calculateTotals(app, customer, items) {
    var subtotal = 0;
    var cgst = 0;
    var sgst = 0;
    var igst = 0;
    var intraState = customer.state === app.data.company.state;

    items.forEach(function (item) {
      var itemTax = item.taxableValue * item.gstRate / 100;
      subtotal += item.taxableValue;

      if (intraState) {
        cgst += itemTax / 2;
        sgst += itemTax / 2;
      } else {
        igst += itemTax;
      }
    });

    return {
      subtotal: utils.round(subtotal),
      cgst: utils.round(cgst),
      sgst: utils.round(sgst),
      igst: utils.round(igst),
      grandTotal: utils.round(subtotal + cgst + sgst + igst)
    };
  }

  function updateTotals(app, totals) {
    app.elements.subtotalValue.textContent = utils.formatCurrency(totals.subtotal);
    app.elements.cgstValue.textContent = utils.formatCurrency(totals.cgst);
    app.elements.sgstValue.textContent = utils.formatCurrency(totals.sgst);
    app.elements.igstValue.textContent = utils.formatCurrency(totals.igst);
    app.elements.grandTotalValue.textContent = utils.formatCurrency(totals.grandTotal);
  }

  function resetInvoiceForm(app) {
    app.elements.invoiceForm.reset();
    app.elements.lineItemsContainer.innerHTML = "";
    addLineItemRow(app);
    document.getElementById("invoice-date").value = utils.today();
    document.getElementById("invoice-number").value = nextInvoiceNumber(app);
    app.previewInvoice = null;
    ns.renderers.renderCustomerOptions(app);
    syncPreview(app);
  }

  function printInvoice(invoice) {
    var win = window.open("", "_blank", "width=980,height=760");
    if (!win) {
      return;
    }

    win.document.write([
      '<!DOCTYPE html><html><head><title>Invoice ' + utils.escapeHtml(invoice.invoiceNumber) + '</title>',
      '<style>',
      'body{font-family:Arial,sans-serif;background:#e9f7ff;padding:24px;}',
      '.invoice-sheet{max-width:960px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;color:#17324a;}',
      '.invoice-sheet__head,.invoice-sheet__meta,.invoice-sheet__totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}',
      '.invoice-table{margin-top:18px;border:1px solid #ddd;border-radius:12px;overflow:hidden;}',
      '.table-head,.table-row{display:grid;grid-template-columns:2fr .9fr .7fr .8fr 1fr;}',
      '.table-head{background:#dff5ff;font-weight:700;}',
      '.table-head span,.table-row span{padding:12px;border-bottom:1px solid #eee;}',
      '</style></head><body>',
      buildInvoiceMarkup(invoice),
      '<script>window.onload=function(){window.print();};<\/script>',
      '</body></html>'
    ].join(""));
    win.document.close();
  }

  function buildInvoiceMarkup(invoice) {
    var rows = invoice.items.map(function (item) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return [
        '<div class="table-row">',
        '<span>' + utils.escapeHtml(item.name) + '<br><small>HSN/SAC: ' + utils.escapeHtml(item.hsn || "-") + '</small></span>',
        '<span>' + utils.escapeHtml(String(item.quantity)) + '</span>',
        '<span>' + utils.formatCurrency(item.rate) + '</span>',
        '<span>' + utils.escapeHtml(String(item.gstRate)) + '%</span>',
        '<span>' + utils.formatCurrency(lineTotal) + '</span>',
        '</div>'
      ].join("");
    }).join("");

    return [
      '<section class="invoice-sheet">',
      '<div class="invoice-sheet__head">',
      '<div><h3>' + utils.escapeHtml(invoice.company.name) + '</h3><p>' + utils.escapeHtml(invoice.company.address) + '</p><p>GSTIN: ' + utils.escapeHtml(invoice.company.gstin || "-") + '</p></div>',
      '<div><h3>Tax Invoice</h3><p>Invoice No: ' + utils.escapeHtml(invoice.invoiceNumber) + '</p><p>Date: ' + utils.escapeHtml(invoice.invoiceDate) + '</p><p>State: ' + utils.escapeHtml(invoice.company.state) + '</p></div>',
      '</div>',
      '<div class="invoice-sheet__meta">',
      '<div><h4>Bill To</h4><p>' + utils.escapeHtml(invoice.customer.name) + '</p><p>' + utils.escapeHtml(invoice.customer.address || "-") + '</p><p>GSTIN: ' + utils.escapeHtml(invoice.customer.gstin || "-") + '</p></div>',
      '<div><h4>Contact</h4><p>Email: ' + utils.escapeHtml(invoice.customer.email || "-") + '</p><p>Phone: ' + utils.escapeHtml(invoice.customer.phone || "-") + '</p><p>Place of supply: ' + utils.escapeHtml(invoice.customer.state) + '</p></div>',
      '</div>',
      '<div class="invoice-table">',
      '<div class="table-head"><span>Description</span><span>Qty</span><span>Rate</span><span>GST</span><span>Total</span></div>',
      rows,
      '</div>',
      '<div class="invoice-sheet__totals">',
      '<p>Subtotal: <strong>' + utils.formatCurrency(invoice.totals.subtotal) + '</strong></p>',
      '<p>CGST: <strong>' + utils.formatCurrency(invoice.totals.cgst) + '</strong></p>',
      '<p>SGST: <strong>' + utils.formatCurrency(invoice.totals.sgst) + '</strong></p>',
      '<p>IGST: <strong>' + utils.formatCurrency(invoice.totals.igst) + '</strong></p>',
      '<p>Grand Total: <strong>' + utils.formatCurrency(invoice.totals.grandTotal) + '</strong></p>',
      '</div>',
      '<p style="margin-top:16px;">Notes: ' + utils.escapeHtml(invoice.notes || "-") + '</p>',
      '</section>'
    ].join("");
  }

  function getSelectedCustomer(app) {
    return app.data.customers.find(function (customer) {
      return String(customer.id) === String(app.elements.invoiceCustomerSelect.value);
    }) || null;
  }

  function productOptions(app) {
    return app.data.products.map(function (product) {
      return '<option value="' + product.id + '">' + utils.escapeHtml(product.name) + '</option>';
    }).join("");
  }

  function findProduct(app, id) {
    return app.data.products.find(function (product) {
      return product.id === id;
    }) || null;
  }

  function defaultRate(app) {
    return app.data.products.length ? app.data.products[0].price : 0;
  }

  function defaultGst(app) {
    return app.data.products.length ? app.data.products[0].gstRate : 18;
  }

  function nextInvoiceNumber(app) {
    return "INV-" + String(1001 + app.data.invoices.length);
  }

  function emptyTotals() {
    return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 };
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  ns.invoice = {
    ensureInvoiceDefaults: ensureInvoiceDefaults,
    addLineItemRow: addLineItemRow,
    clearLineItem: clearLineItem,
    handleLineItemChange: handleLineItemChange,
    syncPreview: syncPreview,
    renderPreview: renderPreview,
    collectInvoiceDraft: collectInvoiceDraft,
    resetInvoiceForm: resetInvoiceForm,
    printInvoice: printInvoice
  };
})(window.LedgerFlow);
