window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  // Invoice module owns line items, GST calculations, preview rendering, and history.
  function init(app) {
    if (!app.activeBillingView) {
      app.activeBillingView = "quick-bill";
    }

    // Independent POS cart - never touches the B2B form
    if (!app.quickBillCart) {
      app.quickBillCart = [];
    }

    var html5QrcodeScanner = null;

    var quickBarcodeInput = document.getElementById("quick-barcode-input");
    if (quickBarcodeInput) {
      quickBarcodeInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          scanProduct(app, quickBarcodeInput.value.trim());
          quickBarcodeInput.value = "";
        }
      });
    }
    var saveQuickCashBtn = document.getElementById("save-quick-bill-cash");
    if (saveQuickCashBtn) {
      saveQuickCashBtn.addEventListener("click", function() {
        submitQuickBill(app, "cash");
      });
    }

    var saveQuickUpiBtn = document.getElementById("save-quick-bill-upi");
    if (saveQuickUpiBtn) {
      saveQuickUpiBtn.addEventListener("click", function() {
        submitQuickBill(app, "upi");
      });
    }

    var quickCartContainer = document.getElementById("quick-bill-cart-container");
    if (quickCartContainer) {
      quickCartContainer.addEventListener("click", function(event) {
        if (event.target.classList.contains("remove-quick-cart-item")) {
          var rowIndex = parseInt(event.target.dataset.index, 10);
          if (rowIndex >= 0 && rowIndex < app.quickBillCart.length) {
            app.quickBillCart.splice(rowIndex, 1);
            renderQuickBillCart(app);
          }
        }
      });
    }

    var cameraBtn = document.getElementById("start-camera-scan");
    if (cameraBtn) {
      cameraBtn.addEventListener("click", function () {
        var readerEl = document.getElementById("camera-reader");
        var statusEl = document.getElementById("camera-reader-status");
        
        if (readerEl.style.display === "block") {
           readerEl.style.display = "none";
           this.textContent = "📷 Camera";
           if (html5QrcodeScanner) {
             html5QrcodeScanner.clear();
           }
           return;
        }

        if (typeof Html5QrcodeScanner !== "undefined") {
          readerEl.style.display = "block";
          this.textContent = "🛑 Stop Camera";
          if (statusEl) statusEl.textContent = "Starting camera...";
          
          html5QrcodeScanner = new Html5QrcodeScanner(
            "camera-reader",
            { fps: 10, qrbox: {width: 250, height: 250} },
            false
          );
          
          html5QrcodeScanner.render(function (decodedText) {
             scanProduct(app, decodedText);
             // html5QrcodeScanner.clear(); // Could stop on detect, but let's allow multi scan
          }, function (error) {});
        } else {
          if (statusEl) statusEl.textContent = "Scanner library not loaded. Check internet connection.";
        }
      });
    }

    app.elements.invoiceCustomerNameInput.addEventListener("input", function () {
      handleCustomerNameInput(app);
    });

    app.elements.invoiceCustomerNameInput.addEventListener("focus", function () {
      renderCustomerSuggestions(app);
    });

    app.elements.invoiceCustomerSuggestions.addEventListener("click", function (event) {
      var suggestion = event.target.closest(".customer-suggestion");

      if (!suggestion || !suggestion.dataset.customerId) {
        return;
      }

      applySuggestedCustomer(app, suggestion.dataset.customerId);
    });

    document.addEventListener("click", function (event) {
      if (event.target.closest(".customer-search")) {
        return;
      }

      hideCustomerSuggestions(app);
    });

    app.elements.addLineItemButton.addEventListener("click", function () {
      setMessage(app, "", "");
      addLineItemRow(app);
      app.previewInvoice = null;
      syncPreview(app);
    });

    app.elements.lineItemsContainer.addEventListener("input", function (event) {
      handleLineItemChange(app, event);
    });

    app.elements.lineItemsContainer.addEventListener("change", function (event) {
      handleLineItemChange(app, event);
    });

    app.elements.lineItemsContainer.addEventListener("click", function (event) {
      if (!event.target.classList.contains("remove-line")) {
        return;
      }

      if (app.elements.lineItemsContainer.children.length === 1) {
        clearLineItem(app, app.elements.lineItemsContainer.firstElementChild);
      } else {
        event.target.closest(".line-item-row").remove();
      }

      setMessage(app, "", "");
      app.previewInvoice = null;
      syncPreview(app);
    });

    app.elements.invoiceForm.addEventListener("input", function () {
      setMessage(app, "", "");
      app.previewInvoice = null;
      syncPreview(app);
    });

    app.elements.invoiceForm.addEventListener("submit", function (event) {
      var draft;

      event.preventDefault();
      draft = collectInvoiceDraft(app, true);

      if (!draft) {
        return;
      }

      app.data.invoices.unshift(draft);
      app.previewInvoice = draft;
      app.persist();
      resetForm(app, { keepPreview: true });
      setActiveBillingView(app, "invoice");
      app.renderAll();
      setMessage(app, "Invoice " + draft.invoiceNumber + " saved successfully. You can review it in the preview and history below.", "success");
      app.setActiveModule("invoices");
    });

    app.elements.invoiceHistory.addEventListener("click", function (event) {
      var invoiceId = event.target.dataset.invoiceId;
      var action = event.target.dataset.invoiceAction || "view";

      if (!invoiceId) {
        return;
      }

      app.previewInvoice = app.data.invoices.find(function (savedInvoice) {
        return String(savedInvoice.id) === String(invoiceId);
      }) || null;

      if (!app.previewInvoice) {
        return;
      }

      renderPreview(app, app.previewInvoice);
      setActiveBillingView(app, "invoice");
      app.setActiveModule("invoices");

      if (action === "pdf") {
        downloadInvoicePdf(app, app.previewInvoice);
      }

      document.getElementById("invoice-preview-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    app.elements.printButton.addEventListener("click", function () {
      var draft = app.previewInvoice || collectInvoiceDraft(app, false);

      if (draft) {
        printInvoice(draft);
      }
    });

    if (app.elements.downloadPdfButton) {
      app.elements.downloadPdfButton.addEventListener("click", function () {
        var draft = app.previewInvoice || collectInvoiceDraft(app, false);

        if (!draft) {
          setMessage(app, "Add invoice details before downloading a PDF.", "error");
          return;
        }

        downloadInvoicePdf(app, draft);
      });
    }
  }

  function render(app) {
    applyBillingView(app);
    renderHistory(app);
    ensureDefaults(app);
    syncLineItemProductOptions(app);
    renderCustomerSuggestions(app);
    syncPreview(app);
  }

  function ensureDefaults(app) {
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
    var row;
    var product;

    if (!event.target.closest(".line-item-row")) {
      return;
    }

    if (event.target.classList.contains("line-product")) {
      row = event.target.closest(".line-item-row");
      product = findProduct(app, event.target.value);

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
    // Keep B2B totals accurate independently of Quick Bill
    var items = collectLineItems(app);
    var liveTotals = items.length ? calculateTotals(app, resolveCustomer(app) || {}, items) : emptyTotals();

    // Quick Bill cart is driven by its own state, not B2B form
    renderQuickBillCart(app);

    if (!invoice) {
      app.elements.invoicePreview.innerHTML = '<div class="empty-state">Add invoice details to see the preview.</div>';
      updateTotals(app, liveTotals);
      return;
    }

    app.elements.invoicePreview.innerHTML = buildInvoiceMarkup(invoice);
    updateTotals(app, invoice.totals);
  }

  function renderQuickBillCart(app) {
    var cart = app.quickBillCart || [];
    var container = document.getElementById("quick-bill-cart-container");
    if (!container) return;

    if (!cart.length) {
      container.innerHTML = '<div style="padding: 20px; font-size: 0.95rem; color: var(--text-muted); text-align: center; border: 2px dashed var(--border); border-radius: 8px;">Cart is empty — scan a product to begin.</div>';
      // Also reset total display
      var totalEl = document.getElementById("quick-bill-total");
      if (totalEl) totalEl.textContent = '\u20b90.00';
      return;
    }

    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : '' };
    var totals = calculateTotals(app, defaultCustomer, cart);

    // Update the grand total display
    var totalEl = document.getElementById("quick-bill-total");
    if (totalEl) totalEl.textContent = utils.formatCurrency(totals.grandTotal);

    var header = '<div style="display: flex; align-items: center; padding: 8px 16px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 2px solid var(--border); margin-bottom: 4px;">'
      + '<div style="flex: 2;">Product</div>'
      + '<div style="flex: 1; text-align: center;">Qty</div>'
      + '<div style="flex: 1; text-align: right;">Amount</div>'
      + '<div style="flex: 0.5;"></div>'
      + '</div>';

    var tableRows = cart.map(function(item, index) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return '<div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); border-radius: 6px; margin-bottom: 4px;">'
        + '<div style="flex: 2; font-weight: 500; color: var(--text);">' + utils.escapeHtml(item.name) + '</div>'
        + '<div style="flex: 1; text-align: center; color: var(--text);">\u00d7 <strong>' + utils.escapeHtml(String(item.quantity)) + '</strong></div>'
        + '<div style="flex: 1; text-align: right; font-weight: 600; color: var(--text);">' + utils.formatCurrency(lineTotal) + '</div>'
        + '<div style="flex: 0.5; text-align: right;"><button type="button" class="remove-quick-cart-item" data-index="' + index + '" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 1.2rem; line-height: 1;" title="Remove Item">\u2715</button></div>'
        + '</div>';
    }).join('');

    container.innerHTML = '<div style="border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">' + header + '<div style="max-height: 300px; overflow-y: auto;">' + tableRows + '</div></div>';
  }

  function submitQuickBill(app, paymentMethod) {
    var cart = app.quickBillCart || [];
    if (!cart.length) {
      var statusEl = document.getElementById("camera-reader-status");
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: var(--danger);">Please scan at least one item before charging.</span>';
        setTimeout(function() { statusEl.innerHTML = ""; }, 3000);
      }
      return;
    }

    var defaultCustomer = {
      name: "Walk-in Customer",
      address: "",
      state: app.data.company && app.data.company.state ? app.data.company.state : "Unknown",
      mobile: "",
      email: "",
      gstNumber: ""
    };

    var draft = {
      id: utils.createId("INV"),
      invoiceType: "tax_invoice",
      paymentStatus: "paid",
      invoiceNumber: nextInvoiceNumber(app),
      invoiceDate: utils.today(),
      company: utils.clone(app.data.company),
      customer: defaultCustomer,
      notes: paymentMethod === 'upi' ? "Automated POS Checkout: Paid via UPI" : "Automated POS Checkout: Cash Paid",
      items: cart,
      totals: calculateTotals(app, defaultCustomer, cart)
    };

    app.data.invoices.unshift(draft);
    app.persist();

    // Flash success and wipe the POS cart
    var successEl = document.getElementById("camera-reader-status");
    if (successEl) {
      successEl.innerHTML = '<span style="color: var(--success);">\u2705 Checkout done: Invoice ' + draft.invoiceNumber + ' saved as Paid.</span>';
      setTimeout(function() { successEl.innerHTML = ""; }, 3000);
    }

    app.quickBillCart = [];
    renderQuickBillCart(app);
    app.renderAll();
  }

  function collectInvoiceDraft(app, strict) {
    var customer = resolveCustomer(app);
    var items = collectLineItems(app);
    var invoiceNumber = valueOf("invoice-number");
    var invoiceDate = valueOf("invoice-date");
    var invoiceType = valueOf("invoice-type") || "tax_invoice";
    var paymentStatus = valueOf("invoice-status") || "unpaid";

    if (!customer || !items.length || !invoiceNumber || !invoiceDate) {
      if (strict) {
        setMessage(app, "Please complete invoice number, date, customer, and at least one valid line item.", "error");
      }
      return null;
    }

    return {
      id: utils.createId("INV"),
      invoiceType: invoiceType,
      paymentStatus: paymentStatus,
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

  function resetForm(app, options) {
    var keepPreview = !!(options && options.keepPreview);

    app.elements.invoiceForm.reset();
    document.getElementById("invoice-type").value = "tax_invoice";
    document.getElementById("invoice-status").value = "unpaid";
    app.elements.invoiceCustomerSelect.value = "";
    app.elements.invoiceCustomerNameInput.value = "";
    hideCustomerSuggestions(app);
    app.elements.lineItemsContainer.innerHTML = "";
    addLineItemRow(app);
    document.getElementById("invoice-date").value = utils.today();
    document.getElementById("invoice-number").value = nextInvoiceNumber(app);
    if (!keepPreview) {
      app.previewInvoice = null;
    }
    setMessage(app, "", "");
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

  function downloadInvoicePdf(app, invoice) {
    var jsPdfApi = window.jspdf;
    var doc;
    var pageWidth;
    var pageHeight;
    var margin = 18;
    var y = margin;
    var leftCardWidth = 106;
    var notesBottom;
    var signatureBaseY;

    if (!jsPdfApi || typeof jsPdfApi.jsPDF !== "function") {
      setMessage(app, "PDF engine is unavailable. Refresh the page and try again.", "error");
      return;
    }

    doc = new jsPdfApi.jsPDF({ unit: "mm", format: "a4" });
    pageWidth = doc.internal.pageSize.getWidth();
    pageHeight = doc.internal.pageSize.getHeight();

    addBrandImage(doc, invoice.company.logoDataUrl, margin, y, 28, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(invoice.company.name || "Invoice"), margin + 34, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = writeMultilineText(doc, [
      invoice.company.address || "",
      "GSTIN: " + (invoice.company.gstin || "-"),
      "Phone: " + (invoice.company.phone || "-"),
      "Email: " + (invoice.company.email || "-")
    ], margin + 34, y + 14, pageWidth - (margin * 2) - 34, 4.8);

    doc.setDrawColor(214, 235, 247);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(invoice.invoiceType === "estimate" ? "Estimate" : "Tax Invoice", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Invoice No: " + (invoice.invoiceNumber || "-"), pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text("Invoice Date: " + (invoice.invoiceDate || "-"), margin, y);
    doc.text("Payment Status: " + formatInvoiceStatus(invoice), pageWidth - margin, y, { align: "right" });
    y += 8;

    doc.setFillColor(247, 251, 253);
    doc.roundedRect(margin, y, leftCardWidth, 28, 3, 3, "F");
    doc.roundedRect(margin + leftCardWidth + 6, y, pageWidth - (margin * 2) - leftCardWidth - 6, 28, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Bill To", margin + 4, y + 6);
    doc.text("Contact", margin + leftCardWidth + 10, y + 6);
    doc.setFont("helvetica", "normal");
    writeMultilineText(doc, [
      invoice.customer.name || "-",
      invoice.customer.address || "-",
      "GSTIN: " + (invoice.customer.gstNumber || invoice.customer.gstin || "-"),
      "State: " + (invoice.customer.state || "-")
    ], margin + 4, y + 11, leftCardWidth - 8, 4.5);
    writeMultilineText(doc, [
      "Phone: " + (invoice.customer.mobile || invoice.customer.phone || "-"),
      "Email: " + (invoice.customer.email || "-"),
      "Place of supply: " + (invoice.customer.state || "-")
    ], margin + leftCardWidth + 10, y + 11, pageWidth - (margin * 2) - leftCardWidth - 14, 4.5);
    y += 36;

    y = drawInvoiceTable(doc, invoice, margin, y, pageWidth - (margin * 2), pageHeight - 70);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Totals", pageWidth - margin - 44, y);
    doc.setFont("helvetica", "normal");
    writeAmountLine(doc, "Subtotal", invoice.totals.subtotal, pageWidth - margin - 44, pageWidth - margin, y + 6);
    writeAmountLine(doc, "CGST", invoice.totals.cgst, pageWidth - margin - 44, pageWidth - margin, y + 12);
    writeAmountLine(doc, "SGST", invoice.totals.sgst, pageWidth - margin - 44, pageWidth - margin, y + 18);
    writeAmountLine(doc, "IGST", invoice.totals.igst, pageWidth - margin - 44, pageWidth - margin, y + 24);
    doc.setFont("helvetica", "bold");
    writeAmountLine(doc, "Grand Total", invoice.totals.grandTotal, pageWidth - margin - 44, pageWidth - margin, y + 32);
    doc.setFont("helvetica", "normal");

    notesBottom = Math.max(y + 42, y + 8);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, notesBottom);
    doc.setFont("helvetica", "normal");
    notesBottom = writeMultilineText(doc, [invoice.notes || "-"], margin, notesBottom + 6, pageWidth - (margin * 2), 4.8);

    signatureBaseY = Math.min(pageHeight - 26, Math.max(notesBottom + 8, pageHeight - 42));
    addBrandImage(doc, invoice.company.signatureDataUrl, pageWidth - margin - 34, signatureBaseY - 14, 30, 12);
    doc.setDrawColor(200, 220, 235);
    doc.line(pageWidth - margin - 40, signatureBaseY, pageWidth - margin, signatureBaseY);
    doc.setFontSize(9);
    doc.text("Authorised Signatory", pageWidth - margin, signatureBaseY + 5, { align: "right" });

    doc.save(safeFileName(invoice.invoiceNumber || "invoice") + ".pdf");
    setMessage(app, "PDF downloaded for invoice " + invoice.invoiceNumber + ".", "success");
  }

  function buildInvoiceMarkup(invoice) {
    var customerGstin = invoice.customer.gstNumber || invoice.customer.gstin || "-";
    var customerPhone = invoice.customer.mobile || invoice.customer.phone || "-";
    var rows = invoice.items.map(function (item) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);

      return [
        '<div class="table-row">',
        '<span class="table-row__cell table-row__cell--description">' + utils.escapeHtml(item.name) + '<br><small>HSN/SAC: ' + utils.escapeHtml(item.hsn || "-") + '</small></span>',
        '<span class="table-row__cell table-row__cell--quantity">' + utils.escapeHtml(String(item.quantity)) + '</span>',
        '<span class="table-row__cell table-row__cell--rate">' + utils.formatCurrency(item.rate) + '</span>',
        '<span class="table-row__cell table-row__cell--gst">' + utils.escapeHtml(String(item.gstRate)) + '%</span>',
        '<span class="table-row__cell table-row__cell--total">' + utils.formatCurrency(lineTotal) + '</span>',
        '</div>'
      ].join("");
    }).join("");

    return [
      '<section class="invoice-sheet">',
      '<div class="invoice-sheet__head">',
      '<div><h3>' + utils.escapeHtml(invoice.company.name) + '</h3><p>' + utils.escapeHtml(invoice.company.address) + '</p><p>GSTIN: ' + utils.escapeHtml(invoice.company.gstin || "-") + '</p></div>',
      '<div style="position:relative;">',
      (invoice.paymentStatus === 'paid' && invoice.invoiceType !== 'estimate' ? '<div style="position:absolute; top:0; right:0; color:#28a745; border:3px solid #28a745; padding:4px 12px; font-weight:bold; font-size:1.5rem; text-transform:uppercase; transform:rotate(-5deg); opacity:0.8; border-radius:6px; letter-spacing:2px;">PAID</div>' : ''),
      '<h3>' + (invoice.invoiceType === "estimate" ? "Estimate" : "Tax Invoice") + '</h3><p>Invoice No: ' + utils.escapeHtml(invoice.invoiceNumber) + '</p><p>Date: ' + utils.escapeHtml(invoice.invoiceDate) + '</p><p>State: ' + utils.escapeHtml(invoice.company.state) + '</p></div>',
      '</div>',
      '<div class="invoice-sheet__meta">',
      '<div><h4>Bill To</h4><p>' + utils.escapeHtml(invoice.customer.name) + '</p><p>' + utils.escapeHtml(invoice.customer.address || "-") + '</p><p>GSTIN: ' + utils.escapeHtml(customerGstin) + '</p></div>',
      '<div><h4>Contact</h4><p>Email: ' + utils.escapeHtml(invoice.customer.email || "-") + '</p><p>Phone: ' + utils.escapeHtml(customerPhone) + '</p><p>Place of supply: ' + utils.escapeHtml(invoice.customer.state) + '</p></div>',
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

  function renderHistory(app) {
    var head = [
      '<div class="history-head">',
      '<span class="history-head__cell history-head__cell--invoice">Invoice</span>',
      '<span class="history-head__cell history-head__cell--date">Date</span>',
      '<span class="history-head__cell history-head__cell--status">Status</span>',
      '<span class="history-head__cell history-head__cell--customer">Customer</span>',
      '<span class="history-head__cell history-head__cell--total">Total</span>',
      '<span class="history-head__cell history-head__cell--action">Action</span>',
      "</div>"
    ].join("");

    if (!app.data.invoices.length) {
      app.elements.invoiceHistory.innerHTML = head + '<div class="empty-state">No invoices saved yet.</div>';
      return;
    }

    app.elements.invoiceHistory.innerHTML = head + app.data.invoices.map(function (invoice) {
      var statusBadge = '';
      if (invoice.invoiceType === 'estimate') {
        statusBadge = '<span class="status-badge status-badge--estimate">🟡 Estimate</span>';
      } else if (invoice.paymentStatus === 'paid') {
        statusBadge = '<span class="status-badge status-badge--paid">🟢 Paid</span>';
      } else {
        statusBadge = '<span class="status-badge status-badge--unpaid">🔴 Unpaid</span>';
      }

      return [
        '<div class="history-row">',
        '<strong class="history-row__title">' + utils.escapeHtml(invoice.invoiceNumber) + "</strong>",
        '<span class="history-row__cell history-row__cell--date">' + utils.escapeHtml(invoice.invoiceDate) + "</span>",
        '<span class="history-row__cell history-row__cell--status">' + statusBadge + "</span>",
        '<span class="history-row__cell history-row__cell--customer">' + utils.escapeHtml(invoice.customer.name) + "</span>",
        '<span class="history-row__cell history-row__cell--total">' + utils.formatCurrency(invoice.totals.grandTotal) + "</span>",
        '<div class="history-row__action-group">',
        '<button class="button button--secondary history-row__action" type="button" data-invoice-id="' + invoice.id + '" data-invoice-action="view">View</button>',
        '<button class="button button--secondary history-row__action" type="button" data-invoice-id="' + invoice.id + '" data-invoice-action="pdf">PDF</button>',
        '</div>',
        "</div>"
      ].join("");
    }).join("");
  }

  function drawInvoiceTable(doc, invoice, startX, startY, tableWidth, maxY) {
    var columns = [
      { label: "Description", width: 74, align: "left" },
      { label: "Qty", width: 18, align: "right" },
      { label: "Rate", width: 26, align: "right" },
      { label: "GST", width: 18, align: "right" },
      { label: "Total", width: 28, align: "right" }
    ];
    var y = startY;
    var headHeight = 8;

    doc.setFillColor(223, 245, 255);
    doc.roundedRect(startX, y, tableWidth, headHeight, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    drawTableCells(doc, columns, startX, y + 5.5);
    y += headHeight;
    doc.setFont("helvetica", "normal");

    invoice.items.forEach(function (item) {
      var description = String(item.name || "") + (item.hsn ? "\nHSN/SAC: " + item.hsn : "");
      var wrappedDescription = doc.splitTextToSize(description, columns[0].width - 4);
      var rowHeight = Math.max(10, (wrappedDescription.length * 4.5) + 3);
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);

      if (y + rowHeight > maxY) {
        doc.addPage();
        y = 18;
        doc.setFillColor(223, 245, 255);
        doc.roundedRect(startX, y, tableWidth, headHeight, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        drawTableCells(doc, columns, startX, y + 5.5);
        y += headHeight;
        doc.setFont("helvetica", "normal");
      }

      doc.setDrawColor(234, 245, 251);
      doc.rect(startX, y, tableWidth, rowHeight);
      drawWrappedCell(doc, wrappedDescription, startX + 2, y + 5);
      drawAlignedCell(doc, String(item.quantity), startX + columns[0].width, columns[1].width, y + 5.5, "right");
      drawAlignedCell(doc, utils.formatCurrency(item.rate), startX + columns[0].width + columns[1].width, columns[2].width, y + 5.5, "right");
      drawAlignedCell(doc, String(item.gstRate) + "%", startX + columns[0].width + columns[1].width + columns[2].width, columns[3].width, y + 5.5, "right");
      drawAlignedCell(doc, utils.formatCurrency(lineTotal), startX + columns[0].width + columns[1].width + columns[2].width + columns[3].width, columns[4].width, y + 5.5, "right");
      y += rowHeight;
    });

    return y;
  }

  function drawTableCells(doc, columns, startX, y) {
    var cursor = startX;

    columns.forEach(function (column) {
      drawAlignedCell(doc, column.label, cursor, column.width, y, column.align);
      cursor += column.width;
    });
  }

  function drawAlignedCell(doc, text, x, width, y, align) {
    if (align === "right") {
      doc.text(String(text), x + width - 2, y, { align: "right" });
      return;
    }

    doc.text(String(text), x + 2, y);
  }

  function drawWrappedCell(doc, lines, x, y) {
    lines.forEach(function (line, index) {
      doc.text(String(line), x, y + (index * 4.5));
    });
  }

  function writeAmountLine(doc, label, value, startX, endX, y) {
    doc.text(label, startX, y);
    doc.text(utils.formatCurrency(value), endX, y, { align: "right" });
  }

  function writeMultilineText(doc, lines, x, y, width, lineHeight) {
    var cursorY = y;

    lines.filter(Boolean).forEach(function (line) {
      var wrapped = doc.splitTextToSize(String(line), width);

      wrapped.forEach(function (part) {
        doc.text(String(part), x, cursorY);
        cursorY += lineHeight;
      });
    });

    return cursorY;
  }

  function addBrandImage(doc, dataUrl, x, y, width, height) {
    var format;

    if (!dataUrl) {
      return;
    }

    format = dataUrl.indexOf("image/png") !== -1 ? "PNG" : "JPEG";

    try {
      doc.addImage(dataUrl, format, x, y, width, height, undefined, "FAST");
    } catch (error) {
      // Invalid image data should not block invoice export.
    }
  }

  function formatInvoiceStatus(invoice) {
    if (invoice.invoiceType === "estimate") {
      return "Estimate";
    }

    return invoice.paymentStatus === "paid" ? "Paid" : "Unpaid";
  }

  function safeFileName(value) {
    return String(value || "invoice").replace(/[\\/:*?"<>|]+/g, "-");
  }

  function syncLineItemProductOptions(app) {
    var rows = Array.prototype.slice.call(app.elements.lineItemsContainer.querySelectorAll(".line-item-row"));

    rows.forEach(function (row) {
      var productSelect = row.querySelector(".line-product");
      var previousProductId = productSelect.value;
      var nextProduct;

      productSelect.innerHTML = productOptions(app);

      if (!app.data.products.length) {
        return;
      }

      if (app.data.products.some(function (product) { return String(product.id) === String(previousProductId); })) {
        productSelect.value = previousProductId;
        return;
      }

      productSelect.value = String(app.data.products[0].id);
      nextProduct = findProduct(app, productSelect.value);

      if (nextProduct) {
        row.querySelector(".line-rate").value = nextProduct.price;
        row.querySelector(".line-gst").value = nextProduct.gstRate;
      }
    });
  }

  function scanProduct(app, barcode) {
    if (!barcode) return;
    var product = app.data.products.find(function(p) { return p.barcode === barcode || p.id === barcode; });
    var statusEl = document.getElementById("camera-reader-status");

    if (!product) {
      if (statusEl) {
        statusEl.textContent = "\u274c Product not found for barcode: " + barcode;
        statusEl.style.color = "var(--danger)";
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = "\u2705 Added: " + product.name;
      statusEl.style.color = "var(--success)";
      setTimeout(function() { statusEl.textContent = ""; }, 2000);
    }

    // Work purely on the independent quickBillCart array
    if (!app.quickBillCart) app.quickBillCart = [];

    var existingItem = app.quickBillCart.find(function(item) {
      return item.productId === String(product.id);
    });

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.taxableValue = existingItem.quantity * existingItem.rate;
    } else {
      app.quickBillCart.push({
        productId: String(product.id),
        name: product.name,
        hsn: product.hsn || "",
        quantity: 1,
        rate: parseFloat(product.price) || 0,
        gstRate: parseFloat(product.gstRate) || 0,
        taxableValue: parseFloat(product.price) || 0
      });
    }

    renderQuickBillCart(app);
  }

  function resolveCustomer(app) {
    var selectedCustomer = getCustomerById(app, app.elements.invoiceCustomerSelect.value);
    var typedName = valueOf("invoice-customer-name");
    var exactMatch;

    if (selectedCustomer) {
      return selectedCustomer;
    }

    if (!typedName) {
      return null;
    }

    exactMatch = findCustomerByName(app, typedName);

    if (exactMatch) {
      app.elements.invoiceCustomerSelect.value = exactMatch.id;
      app.elements.invoiceCustomerNameInput.value = exactMatch.name;
      return exactMatch;
    }

    return {
      id: utils.createId("CUST"),
      name: typedName,
      mobile: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      state: app.data.company.state || "",
      customerType: "Individual",
      isAdHoc: true
    };
  }

  function handleCustomerNameInput(app) {
    var typedName = valueOf("invoice-customer-name");
    var selectedCustomer = getCustomerById(app, app.elements.invoiceCustomerSelect.value);

    if (!selectedCustomer || selectedCustomer.name.toLowerCase() !== typedName.toLowerCase()) {
      app.elements.invoiceCustomerSelect.value = "";
    }

    setMessage(app, "", "");
    renderCustomerSuggestions(app);
    app.previewInvoice = null;
    syncPreview(app);
  }

  function renderCustomerSuggestions(app) {
    var matches = getCustomerMatches(app, valueOf("invoice-customer-name"));

    if (!matches.length) {
      hideCustomerSuggestions(app);
      return;
    }

    app.elements.invoiceCustomerSuggestions.innerHTML = matches.map(function (customer) {
      return [
        '<button class="customer-suggestion" type="button" data-customer-id="' + customer.id + '">',
        '<span class="customer-suggestion__name">' + utils.escapeHtml(customer.name) + "</span>",
        '<small>' + utils.escapeHtml(customer.state || app.data.company.state || "No state") + "</small>",
        "</button>"
      ].join("");
    }).join("");
    app.elements.invoiceCustomerSuggestions.hidden = false;
  }

  function hideCustomerSuggestions(app) {
    app.elements.invoiceCustomerSuggestions.hidden = true;
    app.elements.invoiceCustomerSuggestions.innerHTML = "";
  }

  function applySuggestedCustomer(app, customerId) {
    var customer = getCustomerById(app, customerId);

    if (!customer) {
      return;
    }

    app.elements.invoiceCustomerSelect.value = customer.id;
    app.elements.invoiceCustomerNameInput.value = customer.name;
    hideCustomerSuggestions(app);
    setMessage(app, "", "");
    app.previewInvoice = null;
    syncPreview(app);
  }

  function getCustomerMatches(app, query) {
    var normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return app.data.customers.filter(function (customer) {
      return String(customer.name || "").toLowerCase().indexOf(normalizedQuery) !== -1;
    }).slice(0, 6);
  }

  function getCustomerById(app, id) {
    return app.data.customers.find(function (customer) {
      return String(customer.id) === String(id);
    }) || null;
  }

  function findCustomerByName(app, name) {
    var normalizedName = String(name || "").trim().toLowerCase();

    return app.data.customers.find(function (customer) {
      return String(customer.name || "").trim().toLowerCase() === normalizedName;
    }) || null;
  }

  function productOptions(app) {
    return app.data.products.map(function (product) {
      return '<option value="' + product.id + '">' + utils.escapeHtml(product.name) + '</option>';
    }).join("");
  }

  function findProduct(app, id) {
    return app.data.products.find(function (product) {
      return String(product.id) === String(id);
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

  function setActiveBillingView(app, viewKey) {
    app.activeBillingView = viewKey === "invoice" ? "invoice" : "quick-bill";
    applyBillingView(app);
    if (ns.navigation && typeof ns.navigation.renderModuleMenu === "function") {
      ns.navigation.renderModuleMenu(app);
    }
    app.renderAll();
  }

  function applyBillingView(app) {
    if (!app.elements.billingViews || !app.elements.billingViews.length) {
      return;
    }

    app.elements.billingViews.forEach(function (view) {
      view.classList.toggle("is-active", view.dataset.billingView === app.activeBillingView);
    });
  }

  function emptyTotals() {
    return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 };
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function setMessage(app, message, type) {
    app.elements.invoiceFormMessage.textContent = message || "";
    app.elements.invoiceFormMessage.className = "form-message field-span";

    if (type) {
      app.elements.invoiceFormMessage.classList.add("form-message--" + type);
    }
  }

  ns.modules.invoices = {
    init: init,
    render: render,
    setActiveBillingView: setActiveBillingView
  };
})(window.LedgerFlow);
