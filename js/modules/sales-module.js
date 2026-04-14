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
    var quickSuggestions = document.getElementById("quick-barcode-suggestions");

    if (quickBarcodeInput) {
      quickBarcodeInput.addEventListener("input", function() {
        renderProductSuggestions(app, quickBarcodeInput.value, quickSuggestions);
      });

      quickBarcodeInput.addEventListener("keydown", function (event) {
        var items = quickSuggestions.querySelectorAll(".customer-suggestion");
        var active = quickSuggestions.querySelector(".customer-suggestion.is-active");
        var activeIdx = Array.prototype.indexOf.call(items, active);

        if (event.key === "Enter") {
          event.preventDefault();
          if (active) {
            scanProduct(app, active.dataset.barcode || active.dataset.productId);
            quickBarcodeInput.value = "";
            quickSuggestions.hidden = true;
          } else {
            scanProduct(app, quickBarcodeInput.value.trim());
            quickBarcodeInput.value = "";
            quickSuggestions.hidden = true;
          }
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!items.length) return;
          if (active) active.classList.remove("is-active");
          var next = items[(activeIdx + 1) % items.length];
          next.classList.add("is-active");
          next.scrollIntoView({ block: "nearest" });
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!items.length) return;
          if (active) active.classList.remove("is-active");
          var prev = items[(activeIdx - 1 + items.length) % items.length];
          prev.classList.add("is-active");
          prev.scrollIntoView({ block: "nearest" });
        } else if (event.key === "Escape") {
          quickSuggestions.hidden = true;
        }
      });
    }

    if (quickSuggestions) {
      quickSuggestions.addEventListener("click", function(e) {
        var btn = e.target.closest(".customer-suggestion");
        if (!btn) return;
        scanProduct(app, btn.dataset.barcode || btn.dataset.productId);
        quickBarcodeInput.value = "";
        quickSuggestions.hidden = true;
        quickBarcodeInput.focus();
      });
    }

    // Hide suggestions when clicking elsewhere
    document.addEventListener("click", function(e) {
      if (quickBarcodeInput && !quickBarcodeInput.contains(e.target) && quickSuggestions && !quickSuggestions.contains(e.target)) {
        quickSuggestions.hidden = true;
      }
    });
    var saveQuickCashBtn = document.getElementById("save-quick-bill-cash");
    if (saveQuickCashBtn) {
      saveQuickCashBtn.addEventListener("click", function() {
        submitQuickBill(app, "cash");
      });
    }

    var saveQuickUpiBtn = document.getElementById("save-quick-bill-upi");
    if (saveQuickUpiBtn) {
      saveQuickUpiBtn.addEventListener("click", function() {
        showUpiModal(app);
      });
    }

    var quickCartContainer = document.getElementById("quick-bill-cart-container");
    if (quickCartContainer) {
      quickCartContainer.addEventListener("click", function(event) {
        var btn = event.target.closest("[data-action]");
        if (!btn) return;
        var action = btn.dataset.action;
        var idx = parseInt(btn.dataset.index, 10);
        if (isNaN(idx) || idx < 0 || idx >= (app.quickBillCart || []).length) return;

        if (action === "remove") {
          app.quickBillCart.splice(idx, 1);
        } else if (action === "inc") {
          app.quickBillCart[idx].quantity += 1;
          app.quickBillCart[idx].taxableValue = app.quickBillCart[idx].quantity * app.quickBillCart[idx].rate;
        } else if (action === "dec") {
          if (app.quickBillCart[idx].quantity > 1) {
            app.quickBillCart[idx].quantity -= 1;
            app.quickBillCart[idx].taxableValue = app.quickBillCart[idx].quantity * app.quickBillCart[idx].rate;
          } else {
            app.quickBillCart.splice(idx, 1);
          }
        } else if (action === "show-all") {
          showAllItemsModal(app);
          return;
        }
        renderQuickBillCart(app);
        syncAllItemsModal(app);
      });
    }

    var cameraBtn = document.getElementById("start-camera-scan");
    if (cameraBtn) {
      // Debounce map: tracks the timestamp of the last scan for each barcode
      var lastScanMap = {};
      var SCAN_DEBOUNCE_MS = 5000; // ignore same barcode for 5 seconds

      cameraBtn.addEventListener("click", function () {
        var readerEl = document.getElementById("camera-reader");
        var statusEl = document.getElementById("camera-reader-status");
        
        if (readerEl.style.display === "block") {
           readerEl.style.display = "none";
           this.textContent = "📷 Camera";
           if (html5QrcodeScanner) {
             html5QrcodeScanner.clear();
           }
           lastScanMap = {}; // reset debounce on stop
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
            var now = Date.now();
            var lastScan = lastScanMap[decodedText] || 0;
            if (now - lastScan < SCAN_DEBOUNCE_MS) {
              return; // Same barcode scanned too recently — ignore
            }
            lastScanMap[decodedText] = now;
            scanProduct(app, decodedText);
            
            // Haptic/Audio confirmation
            if (navigator && navigator.vibrate) navigator.vibrate(200);
            try {
              var AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) {
                var audioCtx = new AudioCtx();
                var osc = audioCtx.createOscillator();
                var gainNode = audioCtx.createGain();
                osc.type = 'square'; // sharp barcode scanner sound
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1); // 100ms beep
              }
            } catch (e) { /* ignore audio errors */ }
            
            if (statusEl) {
              statusEl.innerHTML = '<span style="color: var(--accent);">✔ Scanned!</span>';
              setTimeout(function() { statusEl.innerHTML = ""; }, 1500);
            }
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
      updatePartialBalanceDue(app);
    });

    // Show / hide the Amount Paid field based on payment status
    var invoiceStatusSelect = document.getElementById("invoice-status");
    if (invoiceStatusSelect) {
      invoiceStatusSelect.addEventListener("change", function () {
        toggleAmountPaidField(this.value);
        updatePartialBalanceDue(app);
      });
    }

    // Live balance-due recalculation as user types amount paid
    var amountPaidInput = document.getElementById("invoice-amount-paid");
    if (amountPaidInput) {
      amountPaidInput.addEventListener("input", function () {
        updatePartialBalanceDue(app);
      });
    }

    app.elements.invoiceForm.addEventListener("submit", function (event) {
      var draft;

      event.preventDefault();
      draft = collectInvoiceDraft(app, true);

      if (!draft) {
        return;
      }

      app.data.invoices.unshift(draft);
      deductStock(app, draft.items);
      app.previewInvoice = draft;
      app.persist();
      resetForm(app, { keepPreview: true });
      setActiveBillingView(app, "invoice");
      app.renderAll();
      setMessage(app, "Invoice " + draft.invoiceNumber + " saved successfully. You can review it in the preview and history below.", "success");
      app.setActiveModule("sales");
    });

    app.elements.invoiceHistory.addEventListener("click", function (event) {
      if (!event.target.dataset.invoiceId) {
        return;
      }

      app.previewInvoice = app.data.invoices.find(function (savedInvoice) {
        return String(savedInvoice.id) === String(event.target.dataset.invoiceId);
      }) || null;

      renderPreview(app, app.previewInvoice);
      setActiveBillingView(app, "invoice");
      app.setActiveModule("sales");
      document.getElementById("invoice-preview-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    app.elements.printButton.addEventListener("click", function () {
      var draft = app.previewInvoice || collectInvoiceDraft(app, false);

      if (draft) {
        printInvoice(draft);
      }
    });

    // --- Integrated Customer Logic ---
    if (app.elements.customerForm) {
      app.elements.customerForm.addEventListener("submit", function (event) {
        var customerId = app.elements.customerIdInput.value.trim();
        var payload = buildCustomerPayload(app);
        var validationError = validateCustomerPayload(payload);

        event.preventDefault();

        if (validationError) {
          setCustomerMessage(app, validationError, "error");
          return;
        }

        if (customerId) {
          var index = app.data.customers.findIndex(function (c) {
            return String(c.id) === String(customerId);
          });
          if (index !== -1) {
            app.data.customers[index] = Object.assign({}, app.data.customers[index], payload, { id: customerId });
          }
          setCustomerMessage(app, "Customer updated successfully.", "success");
        } else {
          var newCustomer = Object.assign({}, payload, {
            id: utils.createId("CUS"),
            createdAt: new Date().toISOString()
          });
          app.data.customers.unshift(newCustomer);
          setCustomerMessage(app, "Customer added successfully.", "success");
        }

        app.persist();
        app.renderAll();
        resetCustomerForm(app);
      });
    }

    if (app.elements.customerCancelButton) {
      app.elements.customerCancelButton.addEventListener("click", function () {
        resetCustomerForm(app);
      });
    }

    if (app.elements.customerRefreshButton) {
      app.elements.customerRefreshButton.addEventListener("click", function () {
        app.renderAll();
        setCustomerMessage(app, "Customer list refreshed.", "success");
      });
    }

    if (app.elements.customerList) {
      app.elements.customerList.addEventListener("click", function (event) {
        var action = event.target.dataset.customerAction;
        var customerId = event.target.dataset.customerId;
        if (!action || !customerId) return;

        if (action === "edit") {
          var customer = app.data.customers.find(function (c) { return String(c.id) === String(customerId); });
          if (customer) {
            fillCustomerForm(app, customer);
            setCustomerMessage(app, "Editing customer " + customer.name + ".", "success");
            document.getElementById("customer-add").scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else if (action === "delete") {
          if (!window.confirm("Delete this customer? This cannot be undone.")) return;
          app.data.customers = app.data.customers.filter(function (item) { return String(item.id) !== String(customerId); });
          if (String(app.elements.customerIdInput.value) === String(customerId)) resetCustomerForm(app);
          app.persist();
          app.renderAll();
          setCustomerMessage(app, "Customer deleted.", "success");
        }
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
      updateTotals(app, liveTotals, null);
      return;
    }

    app.elements.invoicePreview.innerHTML = buildInvoiceMarkup(invoice);
    updateTotals(app, invoice.totals, invoice);
  }

  function renderQuickBillCart(app) {
    var cart = app.quickBillCart || [];
    var container = document.getElementById("quick-bill-cart-container");
    if (!container) return;

    // Update total display
    var totalEl = document.getElementById("quick-bill-total");
    var countEl = document.getElementById("quick-bill-item-count");
    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : '' };

    if (!cart.length) {
      container.innerHTML = '<div class="pos-cart-empty">Cart is empty — scan a product to begin.</div>';
      if (totalEl) totalEl.textContent = '\u20b90.00';
      if (countEl) countEl.textContent = '';
      return;
    }

    var totals = calculateTotals(app, defaultCustomer, cart);
    if (totalEl) totalEl.textContent = utils.formatCurrency(totals.grandTotal);
    if (countEl) {
      var totalQty = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
      countEl.textContent = '(' + totalQty + ' item' + (totalQty !== 1 ? 's' : '') + ')';
    }

    var MAX_VISIBLE = 4;
    var visibleCart = cart.slice(0, MAX_VISIBLE);

    var rows = visibleCart.map(function(item, index) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return '<div class="pos-cart-row">'
        + '<div class="pos-cart-row__name">' + utils.escapeHtml(item.name) + '</div>'
        + '<div class="pos-cart-row__qty">'
        + '<button type="button" class="pos-qty-btn" data-action="dec" data-index="' + index + '" aria-label="Decrease">&#8722;</button>'
        + '<span class="pos-qty-value">' + item.quantity + '</span>'
        + '<button type="button" class="pos-qty-btn" data-action="inc" data-index="' + index + '" aria-label="Increase">&#43;</button>'
        + '</div>'
        + '<div class="pos-cart-row__amount">' + utils.formatCurrency(lineTotal) + '</div>'
        + '<button type="button" class="pos-remove-btn" data-action="remove" data-index="' + index + '" aria-label="Remove item">&times;</button>'
        + '</div>';
    }).join('');

    var showAllBtn = '';
    if (cart.length > MAX_VISIBLE) {
      showAllBtn = '<button type="button" class="pos-show-all-btn" data-action="show-all" data-index="0">'
        + '&#9776; Show All Items (' + cart.length + ')'
        + '</button>';
    }

    container.innerHTML = '<div class="pos-cart-table">'
      + '<div class="pos-cart-header">'
      + '<span>Product</span><span style="text-align:center">Qty</span><span style="text-align:right">Amount</span><span></span>'
      + '</div>'
      + rows
      + '</div>'
      + showAllBtn;
  }

  function showAllItemsModal(app) {
    var existing = document.getElementById("pos-all-items-modal");
    if (existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = "pos-all-items-modal";
    modal.className = "pos-modal-overlay";
    modal.innerHTML = '<div class="pos-modal-sheet">'
      + '<div class="pos-modal-header">'
      + '<span class="pos-modal-title">All Cart Items</span>'
      + '<button type="button" class="pos-modal-close" id="pos-all-items-close">&times;</button>'
      + '</div>'
      + '<div id="pos-all-items-list" class="pos-all-items-list"></div>'
      + '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add("is-open"); });
    modal.querySelector("#pos-all-items-close").addEventListener("click", function() { closeModal(modal); });
    modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(modal); });
    renderAllItemsList(app);
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    setTimeout(function() { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 280);
  }

  function renderAllItemsList(app) {
    var listEl = document.getElementById("pos-all-items-list");
    if (!listEl) return;
    var cart = app.quickBillCart || [];
    if (!cart.length) { listEl.innerHTML = '<div class="pos-cart-empty">Cart is empty.</div>'; return; }
    listEl.innerHTML = cart.map(function(item, index) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return '<div class="pos-cart-row">'
        + '<div class="pos-cart-row__name">' + utils.escapeHtml(item.name) + '</div>'
        + '<div class="pos-cart-row__qty">'
        + '<button type="button" class="pos-qty-btn modal-qty-btn" data-action="modal-dec" data-index="' + index + '">&#8722;</button>'
        + '<span class="pos-qty-value">' + item.quantity + '</span>'
        + '<button type="button" class="pos-qty-btn modal-qty-btn" data-action="modal-inc" data-index="' + index + '">&#43;</button>'
        + '</div>'
        + '<div class="pos-cart-row__amount">' + utils.formatCurrency(lineTotal) + '</div>'
        + '<button type="button" class="pos-remove-btn modal-remove-btn" data-action="modal-remove" data-index="' + index + '">&times;</button>'
        + '</div>';
    }).join('');
    listEl.addEventListener("click", function(e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.dataset.action;
      var idx = parseInt(btn.dataset.index, 10);
      if (isNaN(idx) || idx < 0 || idx >= cart.length) return;
      if (action === "modal-remove") {
        cart.splice(idx, 1);
      } else if (action === "modal-inc") {
        cart[idx].quantity += 1;
        cart[idx].taxableValue = cart[idx].quantity * cart[idx].rate;
      } else if (action === "modal-dec") {
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
          cart[idx].taxableValue = cart[idx].quantity * cart[idx].rate;
        } else {
          cart.splice(idx, 1);
        }
      }
      renderAllItemsList(app);
      renderQuickBillCart(app);
    }, { once: false });
  }

  function syncAllItemsModal(app) {
    var modal = document.getElementById("pos-all-items-modal");
    if (!modal) return;
    renderAllItemsList(app);
  }

  function showUpiModal(app) {
    var cart = app.quickBillCart || [];
    if (!cart.length) {
      var statusEl = document.getElementById("camera-reader-status");
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: var(--danger);">Please scan at least one item before charging.</span>';
        setTimeout(function() { statusEl.innerHTML = ""; }, 3000);
      }
      return;
    }
    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : '' };
    var totals = calculateTotals(app, defaultCustomer, cart);
    var totalStr = utils.formatCurrency(totals.grandTotal);

    var existing = document.getElementById("pos-upi-modal");
    if (existing) existing.remove();

    var upiId = app.data.company && app.data.company.upiId ? app.data.company.upiId : null;
    var merchantName = app.data.company && app.data.company.name ? encodeURIComponent(app.data.company.name) : "Unidex";
    var upiUri = '';
    var qrContent = '';
    
    if (upiId) {
      upiUri = 'upi://pay?pa=' + encodeURIComponent(upiId) + '&pn=' + merchantName + '&am=' + totals.grandTotal + '&cu=INR';
      qrContent = '<canvas id="pos-upi-qr-canvas"></canvas>';
    } else {
      qrContent = '<div class="pos-upi-qr-placeholder">'
        + '<svg viewBox="0 0 80 80" fill="none" width="80" height="80"><rect x="4" y="4" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="12" width="12" height="12" rx="1" fill="currentColor"/><rect x="48" y="4" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="56" y="12" width="12" height="12" rx="1" fill="currentColor"/><rect x="4" y="48" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="56" width="12" height="12" rx="1" fill="currentColor"/><rect x="48" y="48" width="8" height="8" rx="1" fill="currentColor"/><rect x="62" y="48" width="14" height="8" rx="1" fill="currentColor"/><rect x="48" y="62" width="14" height="8" rx="1" fill="currentColor"/><rect x="68" y="62" width="8" height="14" rx="1" fill="currentColor"/></svg>'
        + '<p>Configure UPI ID in Settings</p>'
        + '</div>';
    }

    var modal = document.createElement("div");
    modal.id = "pos-upi-modal";
    modal.className = "pos-modal-overlay";
    modal.innerHTML = '<div class="pos-modal-sheet pos-upi-sheet">'
      + '<div class="pos-modal-header">'
      + '<span class="pos-modal-title">UPI QR Payment</span>'
      + '<button type="button" class="pos-modal-close" id="pos-upi-close">&times;</button>'
      + '</div>'
      + '<div class="pos-upi-amount">' + totalStr + '</div>'
      + '<div class="pos-upi-qr-area">'
      + qrContent
      + '</div>'
      + '<p class="pos-upi-hint">Ask customer to scan this QR with any UPI app</p>'
      + '<button type="button" class="btn-received-payment" id="pos-upi-received">&#10003; I Received Payment</button>'
      + '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add("is-open"); });

    if (upiId && typeof window.QRious !== 'undefined') {
      new QRious({
        element: document.getElementById('pos-upi-qr-canvas'),
        value: upiUri,
        size: 200
      });
    }

    modal.querySelector("#pos-upi-close").addEventListener("click", function() { closeModal(modal); });
    modal.addEventListener("click", function(e) { if (e.target === modal) closeModal(modal); });
    modal.querySelector("#pos-upi-received").addEventListener("click", function() {
      closeModal(modal);
      submitQuickBill(app, "upi");
    });
  }

  function showSuccessOverlay(amount, paymentMethod, onDone) {
    var existing = document.getElementById("pos-success-overlay");
    if (existing) existing.remove();

    var label = paymentMethod === "upi" ? "UPI" : "Cash";
    var overlay = document.createElement("div");
    overlay.id = "pos-success-overlay";
    overlay.className = "pos-success-overlay";
    overlay.innerHTML = '<div class="pos-success-content">'
      + '<div class="pos-success-check">&#10003;</div>'
      + '<div class="pos-success-amount">' + amount + '</div>'
      + '<div class="pos-success-msg">Received Successfully</div>'
      + '<div class="pos-success-method">' + label + '</div>'
      + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add("is-visible"); });
    setTimeout(function() {
      overlay.classList.remove("is-visible");
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onDone === "function") onDone();
      }, 320);
    }, 1800);
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

    var totals = calculateTotals(app, defaultCustomer, cart);
    var amountStr = utils.formatCurrency(totals.grandTotal);

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
      totals: totals
    };

    app.data.invoices.unshift(draft);
    deductStock(app, draft.items);
    app.persist();

    showSuccessOverlay(amountStr, paymentMethod, function() {
      app.quickBillCart = [];
      renderQuickBillCart(app);
      app.renderAll();
    });
  }

  function collectInvoiceDraft(app, strict) {
    var customer = resolveCustomer(app);
    var items = collectLineItems(app);
    var invoiceNumber = valueOf("invoice-number");
    var invoiceDate = valueOf("invoice-date");
    var invoiceType = valueOf("invoice-type") || "tax_invoice";
    var paymentStatus = valueOf("invoice-status") || "unpaid";
    var amountPaidRaw = parseFloat(document.getElementById("invoice-amount-paid").value) || 0;

    if (!customer || !items.length || !invoiceNumber || !invoiceDate) {
      if (strict) {
        setMessage(app, "Please complete invoice number, date, customer, and at least one valid line item.", "error");
      }
      return null;
    }

    var totals = calculateTotals(app, customer, items);

    // Partial payment validation
    if (paymentStatus === "partial") {
      if (strict && amountPaidRaw <= 0) {
        setMessage(app, "Enter a valid amount paid (must be greater than zero).", "error");
        return null;
      }
      if (strict && amountPaidRaw >= totals.grandTotal) {
        setMessage(app, "Amount paid equals or exceeds the total — mark as Paid instead.", "error");
        return null;
      }
    }

    var amountPaid = paymentStatus === "paid" ? totals.grandTotal
      : paymentStatus === "partial" ? utils.round(amountPaidRaw)
      : 0;
    var balanceDue = utils.round(totals.grandTotal - amountPaid);

    return {
      id: utils.createId("INV"),
      invoiceType: invoiceType,
      paymentStatus: paymentStatus,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      company: utils.clone(app.data.company),
      customer: utils.clone(customer),
      notes: valueOf("invoice-notes"),
      items: items,
      totals: totals
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

  function updateTotals(app, totals, invoice) {
    app.elements.subtotalValue.textContent = utils.formatCurrency(totals.subtotal);
    app.elements.cgstValue.textContent = utils.formatCurrency(totals.cgst);
    app.elements.sgstValue.textContent = utils.formatCurrency(totals.sgst);
    app.elements.igstValue.textContent = utils.formatCurrency(totals.igst);
    app.elements.grandTotalValue.textContent = utils.formatCurrency(totals.grandTotal);

    // Show balance-due cell only for partial invoices in preview
    var balanceCell = document.getElementById("invoice-balance-due-cell");
    var balanceValue = document.getElementById("balance-due-value");
    if (balanceCell && balanceValue) {
      var isPartial = invoice && invoice.paymentStatus === "partial";
      balanceCell.hidden = !isPartial;
      if (isPartial && invoice.balanceDue !== undefined) {
        balanceValue.textContent = utils.formatCurrency(invoice.balanceDue);
      }
    }
  }

  function deductStock(app, items) {
    if (!items || !items.length) return;
    items.forEach(function(item) {
      var product = app.data.products.find(function(p) { return p.id === item.productId; });
      if (product) {
        product.stock = (product.stock || 0) - item.quantity;
      }
    });
  }

  function resetForm(app, options) {
    var keepPreview = !!(options && options.keepPreview);

    app.elements.invoiceForm.reset();
    document.getElementById("invoice-type").value = "tax_invoice";
    document.getElementById("invoice-status").value = "unpaid";
    toggleAmountPaidField("unpaid");
    document.getElementById("invoice-amount-paid").value = "";
    var balanceCell = document.getElementById("invoice-balance-due-cell");
    if (balanceCell) balanceCell.hidden = true;
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
      (invoice.paymentStatus === 'paid' && invoice.invoiceType !== 'estimate'
        ? '<div style="position:absolute; top:0; right:0; color:#28a745; border:3px solid #28a745; padding:4px 12px; font-weight:bold; font-size:1.5rem; text-transform:uppercase; transform:rotate(-5deg); opacity:0.8; border-radius:6px; letter-spacing:2px;">PAID</div>'
        : invoice.paymentStatus === 'partial' && invoice.invoiceType !== 'estimate'
          ? '<div style="position:absolute; top:0; right:0; color:#f59e0b; border:3px solid #f59e0b; padding:4px 12px; font-weight:bold; font-size:1.5rem; text-transform:uppercase; transform:rotate(-5deg); opacity:0.8; border-radius:6px; letter-spacing:2px;">PARTIAL</div>'
          : ''),
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
      (invoice.paymentStatus === 'partial'
        ? '<p>Amount Paid: <strong style="color:#16a34a;">' + utils.formatCurrency(invoice.amountPaid || 0) + '</strong></p>'
          + '<p>Balance Due: <strong style="color:#f59e0b; font-size:1.05em;">' + utils.formatCurrency(invoice.balanceDue || 0) + '</strong></p>'
        : ''),
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
      } else if (invoice.paymentStatus === 'partial') {
        statusBadge = '<span class="status-badge status-badge--partial">🟠 Partial</span>';
      } else {
        statusBadge = '<span class="status-badge status-badge--unpaid">🔴 Unpaid</span>';
      }

      var totalDisplay = utils.formatCurrency(invoice.totals.grandTotal);
      if (invoice.paymentStatus === 'partial' && invoice.balanceDue) {
        totalDisplay += '<br><small style="color:#f59e0b;font-size:0.8rem;">due ' + utils.formatCurrency(invoice.balanceDue) + '</small>';
      }

      return [
        '<div class="history-row">',
        '<strong class="history-row__title">' + utils.escapeHtml(invoice.invoiceNumber) + "</strong>",
        '<span class="history-row__cell history-row__cell--date">' + utils.escapeHtml(invoice.invoiceDate) + "</span>",
        '<span class="history-row__cell history-row__cell--status">' + statusBadge + "</span>",
        '<span class="history-row__cell history-row__cell--customer">' + utils.escapeHtml(invoice.customer.name) + "</span>",
        '<span class="history-row__cell history-row__cell--total">' + totalDisplay + "</span>",
        '<button class="button button--secondary history-row__action" type="button" data-invoice-id="' + invoice.id + '">View</button>',
        "</div>"
      ].join("");
    }).join("");
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

  function renderProductSuggestions(app, query, container) {
    if (!container) return;
    var normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    var matches = app.data.products.filter(function (product) {
      return (product.name || "").toLowerCase().indexOf(normalizedQuery) !== -1 ||
             (product.barcode || "").toLowerCase().indexOf(normalizedQuery) !== -1;
    }).slice(0, 8);

    if (!matches.length) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    container.innerHTML = matches.map(function (product) {
      return [
        '<button class="customer-suggestion" type="button" data-product-id="' + product.id + '" data-barcode="' + (product.barcode || "") + '">',
        '<div style="display:flex; justify-content:space-between; align-items:center;">',
        '<div>',
        '<span class="customer-suggestion__name">' + utils.escapeHtml(product.name) + "</span><br>",
        '<small>Barcode: ' + utils.escapeHtml(product.barcode || "-") + "</small>",
        '</div>',
        '<strong style="color:var(--accent);">' + utils.formatCurrency(product.price) + '</strong>',
        '</div>',
        "</button>"
      ].join("");
    }).join("");
    container.hidden = false;
  }

  function render(app) {
    applyBillingView(app);
    
    if (app.activeBillingView === "history") {
      renderHistory(app);
    } else if (app.activeBillingView === "invoice") {
      renderInvoiceForm(app);
    }
    
    // Independent Quick Bill components
    renderQuickBillCart(app);
    syncPreview(app);
    
    // --- Integrated Customer Rendering ---
    renderCustomerList(app);
    updateInvoiceCustomerOptions(app);
    
    ensureDefaults(app);
    syncLineItemProductOptions(app);
    renderCustomerSuggestions(app);
  }

  function setActiveBillingView(app, viewKey) {
    // Expand to include customer-related views
    var validViews = ["invoice", "history", "customer-list-panel", "customer-add"];
    app.activeBillingView = validViews.indexOf(viewKey) !== -1 ? viewKey : "quick-bill";
    
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

    // --- PWA High-Speed Focus Mode ---
    // Hide toolbar if in Quick Bill (the SCAN context)
    var toolbar = document.querySelector(".workspace-toolbar");
    if (toolbar) {
      if (app.activeBillingView === "quick-bill") {
        toolbar.style.display = "none";
      } else {
        toolbar.style.display = "grid"; // restore standard grid
      }
    }
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function toggleAmountPaidField(status) {
    var field = document.getElementById("amount-paid-field");
    if (!field) return;
    if (status === "partial") {
      field.classList.remove("field-hidden");
    } else {
      field.classList.add("field-hidden");
    }
  }

  function updatePartialBalanceDue(app) {
    var statusEl = document.getElementById("invoice-status");
    var amountPaidEl = document.getElementById("invoice-amount-paid");
    var balanceCell = document.getElementById("invoice-balance-due-cell");
    var balanceValue = document.getElementById("balance-due-value");
    if (!statusEl || !balanceCell || !balanceValue) return;

    var status = statusEl.value;
    if (status !== "partial") {
      balanceCell.hidden = true;
      return;
    }

    // Compute live balance from current line items
    var items = collectLineItems(app);
    var customer = resolveCustomer(app) || {};
    if (!items.length) {
      balanceCell.hidden = true;
      return;
    }
    var totals = calculateTotals(app, customer, items);
    var amountPaid = parseFloat(amountPaidEl ? amountPaidEl.value : 0) || 0;
    var balanceDue = utils.round(totals.grandTotal - amountPaid);

    balanceCell.hidden = false;
    balanceValue.textContent = utils.formatCurrency(balanceDue > 0 ? balanceDue : 0);
  }

  function setCustomerMessage(app, message, type) {
    if (!app.elements.customerFormMessage) return;
    app.elements.customerFormMessage.textContent = message || "";
    app.elements.customerFormMessage.className = "form-message field-span";
    if (type) app.elements.customerFormMessage.classList.add("form-message--" + type);
  }

  function renderCustomerList(app) {
    if (!app.elements.customerList) return;
    if (!app.data.customers.length) {
      app.elements.customerList.innerHTML = '<div class="empty-state">No customers yet. Add your first customer above.</div>';
      return;
    }
    app.elements.customerList.innerHTML = app.data.customers.map(function (customer) {
      return [
        '<article class="data-card">',
        '<div class="data-card__head">',
        '<h3>' + utils.escapeHtml(customer.name) + "</h3>",
        '<div class="data-card__actions">',
        '<button class="button button--secondary" type="button" data-customer-action="edit" data-customer-id="' + customer.id + '">Edit</button>',
        '<button class="button button--secondary" type="button" data-customer-action="delete" data-customer-id="' + customer.id + '">Delete</button>',
        "</div>",
        "</div>",
        '<div class="data-card__meta">',
        "<p><strong>Mobile:</strong> " + utils.escapeHtml(customer.mobile || "-") + "</p>",
        "<p><strong>Type:</strong> " + utils.escapeHtml(customer.customerType || "-") + "</p>",
        "<p><strong>State:</strong> " + utils.escapeHtml(customer.state || "-") + "</p>",
        "<p><strong>GST:</strong> " + utils.escapeHtml(customer.gstNumber || "-") + "</p>",
        "<p><strong>Email:</strong> " + utils.escapeHtml(customer.email || "-") + "</p>",
        "<p><strong>Address:</strong> " + utils.escapeHtml(customer.address || "-") + "</p>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function updateInvoiceCustomerOptions(app) {
    var currentSelection = String(app.elements.invoiceCustomerSelect.value || "");
    if (!app.elements.invoiceCustomerNameInput || !app.elements.invoiceCustomerSelect) return;
    if (!app.data.customers.length) {
      app.elements.invoiceCustomerSelect.value = "";
      return;
    }
    var selectedCustomer = app.data.customers.find(function (customer) {
      return String(customer.id) === currentSelection;
    }) || null;
    if (!selectedCustomer) {
      app.elements.invoiceCustomerSelect.value = "";
      return;
    }
    app.elements.invoiceCustomerNameInput.value = selectedCustomer.name;
  }

  function resetCustomerForm(app) {
    app.elements.customerForm.reset();
    app.elements.customerIdInput.value = "";
    app.elements.customerTypeSelect.value = "Individual";
    app.elements.customerOpeningBalanceInput.value = "0";
    app.elements.customerStateSelect.value = app.data.company.state || "";
    setCustomerFormMode(app, "create");
    setCustomerMessage(app, "", "");
  }

  function fillCustomerForm(app, customer) {
    app.elements.customerIdInput.value = String(customer.id);
    app.elements.customerNameInput.value = customer.name || "";
    app.elements.customerMobileInput.value = customer.mobile || "";
    app.elements.customerTypeSelect.value = customer.customerType || "Individual";
    app.elements.customerCompanyNameInput.value = customer.companyName || "";
    app.elements.customerStateSelect.value = customer.state || app.data.company.state || "";
    app.elements.customerGstNumberInput.value = customer.gstNumber || "";
    app.elements.customerEmailInput.value = customer.email || "";
    app.elements.customerOpeningBalanceInput.value = String(customer.openingBalance || 0);
    app.elements.customerCreditLimitInput.value = customer.creditLimit === null ? "" : String(customer.creditLimit);
    app.elements.customerCityInput.value = customer.city || "";
    app.elements.customerPincodeInput.value = customer.pincode || "";
    app.elements.customerAddressInput.value = customer.address || "";
    setCustomerFormMode(app, "edit");
  }

  function setCustomerFormMode(app, mode) {
    var isEdit = mode === "edit";
    app.elements.customerFormTitle.textContent = isEdit ? "Edit customer" : "Add customer";
    app.elements.customerSubmitButton.textContent = isEdit ? "Update customer" : "Add customer";
    app.elements.customerCancelButton.hidden = !isEdit;
  }

  function validateCustomerPayload(payload) {
    if (!payload.name) return "Customer name is required.";
    return null;
  }

  function buildCustomerPayload(app) {
    return {
      name: valueOf("customer-name"),
      mobile: valueOf("customer-mobile"),
      customerType: app.elements.customerTypeSelect.value,
      companyName: valueOf("customer-company-name") || "",
      address: valueOf("customer-address") || "",
      gstNumber: valueOf("customer-gst-number") || "",
      openingBalance: numberOrDefault("customer-opening-balance", 0),
      creditLimit: nullableNumber("customer-credit-limit"),
      email: valueOf("customer-email") || "",
      city: valueOf("customer-city") || "",
      state: app.elements.customerStateSelect.value || "",
      pincode: valueOf("customer-pincode") || ""
    };
  }

  function numberOrDefault(id, fallback) {
    var el = document.getElementById(id);
    var numericValue = parseFloat(el ? el.value : "");
    return Number.isNaN(numericValue) ? fallback : numericValue;
  }

  function nullableNumber(id) {
    var el = document.getElementById(id);
    var rawValue = el ? el.value.trim() : "";
    if (!rawValue) return null;
    return numberOrDefault(id, null);
  }

  ns.modules.sales = {
    init: init,
    render: render,
    setActiveBillingView: setActiveBillingView
  };
})(window.LedgerFlow);
