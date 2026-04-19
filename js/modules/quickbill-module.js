window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  function init(app) {
    var quickBarcodeInput = document.getElementById("quick-barcode-input");
    var quickSuggestions = document.getElementById("quick-barcode-suggestions");
    var quickCartContainer = document.getElementById("quick-bill-cart-container");
    var saveQuickCashBtn = document.getElementById("save-quick-bill-cash");
    var saveQuickUpiBtn = document.getElementById("save-quick-bill-upi");
    var cameraBtn = document.getElementById("start-camera-scan");

    if (!app.quickBillCart) {
      app.quickBillCart = [];
    }

    if (app.quickBillInitialized) {
      return;
    }

    app.quickBillInitialized = true;

    if (quickBarcodeInput) {
      quickBarcodeInput.addEventListener("input", function () {
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
          } else {
            scanProduct(app, quickBarcodeInput.value.trim());
          }
          quickBarcodeInput.value = "";
          quickSuggestions.hidden = true;
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!items.length) return;
          if (active) active.classList.remove("is-active");
          items[(activeIdx + 1) % items.length].classList.add("is-active");
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!items.length) return;
          if (active) active.classList.remove("is-active");
          items[(activeIdx - 1 + items.length) % items.length].classList.add("is-active");
        } else if (event.key === "Escape") {
          quickSuggestions.hidden = true;
        }
      });
    }

    if (quickSuggestions) {
      quickSuggestions.addEventListener("click", function (event) {
        var btn = event.target.closest(".customer-suggestion");
        if (!btn) return;
        scanProduct(app, btn.dataset.barcode || btn.dataset.productId);
        if (quickBarcodeInput) {
          quickBarcodeInput.value = "";
          quickBarcodeInput.focus();
        }
        quickSuggestions.hidden = true;
      });
    }

    document.addEventListener("click", function (event) {
      if (quickBarcodeInput && !quickBarcodeInput.contains(event.target) && quickSuggestions && !quickSuggestions.contains(event.target)) {
        quickSuggestions.hidden = true;
      }
    });

    if (quickCartContainer) {
      quickCartContainer.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-action]");
        var idx;

        if (!btn) return;

        idx = parseInt(btn.dataset.index, 10);

        if (btn.dataset.action === "show-all") {
          showAllItemsModal(app);
          return;
        }

        if (Number.isNaN(idx) || idx < 0 || idx >= (app.quickBillCart || []).length) {
          return;
        }

        if (btn.dataset.action === "remove") {
          app.quickBillCart.splice(idx, 1);
        } else if (btn.dataset.action === "inc") {
          app.quickBillCart[idx].quantity += 1;
          app.quickBillCart[idx].taxableValue = app.quickBillCart[idx].quantity * app.quickBillCart[idx].rate;
        } else if (btn.dataset.action === "dec") {
          if (app.quickBillCart[idx].quantity > 1) {
            app.quickBillCart[idx].quantity -= 1;
            app.quickBillCart[idx].taxableValue = app.quickBillCart[idx].quantity * app.quickBillCart[idx].rate;
          } else {
            app.quickBillCart.splice(idx, 1);
          }
        }

        renderQuickBillCart(app);
        syncAllItemsModal(app);
      });
    }

    if (saveQuickCashBtn) {
      saveQuickCashBtn.addEventListener("click", function () {
        submitQuickBill(app, "cash");
      });
    }

    if (saveQuickUpiBtn) {
      saveQuickUpiBtn.addEventListener("click", function () {
        showUpiModal(app);
      });
    }

    if (cameraBtn) {
      bindCameraButton(app, cameraBtn);
    }
  }

  function render(app) {
    var standaloneView = document.getElementById("quickbill-module-view");

    if (!standaloneView) {
      return;
    }

    standaloneView.classList.toggle("is-active", app.activeModule === "quickbill");
    renderQuickBillCart(app);
  }

  function bindCameraButton(app, cameraBtn) {
    var html5QrcodeScanner = null;
    var lastScanMap = {};
    var scanDebounceMs = 5000;

    cameraBtn.addEventListener("click", function () {
      var readerEl = document.getElementById("camera-reader");
      var statusEl = document.getElementById("camera-reader-status");

      if (!readerEl) {
        return;
      }

      if (readerEl.style.display === "block") {
        readerEl.style.display = "none";
        cameraBtn.textContent = "Camera";
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear();
        }
        lastScanMap = {};
        return;
      }

      if (typeof Html5QrcodeScanner === "undefined") {
        if (statusEl) {
          statusEl.textContent = "Scanner library not loaded. Check internet connection.";
        }
        return;
      }

      readerEl.style.display = "block";
      cameraBtn.textContent = "Stop Camera";
      if (statusEl) {
        statusEl.textContent = "Starting camera...";
      }

      html5QrcodeScanner = new Html5QrcodeScanner(
        "camera-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      html5QrcodeScanner.render(function (decodedText) {
        var now = Date.now();
        var lastScan = lastScanMap[decodedText] || 0;

        if (now - lastScan < scanDebounceMs) {
          return;
        }

        lastScanMap[decodedText] = now;
        scanProduct(app, decodedText);

        if (navigator && navigator.vibrate) {
          navigator.vibrate(200);
        }

        if (statusEl) {
          statusEl.innerHTML = '<span style="color: var(--accent);">Scanned</span>';
          setTimeout(function () {
            statusEl.innerHTML = "";
          }, 1500);
        }
      }, function () {});
    });
  }

  function renderProductSuggestions(app, query, container) {
    var normalizedQuery;
    var matches;

    if (!container) return;

    normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    matches = app.data.products.filter(function (product) {
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
        '<span class="customer-suggestion__name">' + utils.escapeHtml(product.name) + '</span><br>',
        '<small>Barcode: ' + utils.escapeHtml(product.barcode || "-") + '</small>',
        '</div>',
        '<strong style="color:var(--accent);">' + utils.formatCurrency(product.price) + '</strong>',
        '</div>',
        "</button>"
      ].join("");
    }).join("");
    container.hidden = false;
  }

  function scanProduct(app, barcode) {
    var product;
    var statusEl = document.getElementById("camera-reader-status");
    var existingItem;

    if (!barcode) return;

    product = app.data.products.find(function (candidate) {
      return String(candidate.barcode || "") === String(barcode) || String(candidate.id) === String(barcode);
    });

    if (!product) {
      if (statusEl) {
        statusEl.textContent = "Product not found for barcode: " + barcode;
        statusEl.style.color = "var(--danger)";
      }
      return;
    }

    existingItem = app.quickBillCart.find(function (item) {
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

    if (statusEl) {
      statusEl.textContent = "Added: " + product.name;
      statusEl.style.color = "var(--success)";
      setTimeout(function () {
        statusEl.textContent = "";
      }, 2000);
    }

    renderQuickBillCart(app);
  }

  function renderQuickBillCart(app) {
    var cart = app.quickBillCart || [];
    var container = document.getElementById("quick-bill-cart-container");
    var totalEl = document.getElementById("quick-bill-total");
    var countEl = document.getElementById("quick-bill-item-count");
    var helpers = getSalesHelpers();
    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : "" };
    var totals;
    var maxVisible = 4;
    var rows;
    var showAllBtn = "";

    if (!container) return;

    if (!cart.length) {
      container.innerHTML = '<div class="pos-cart-empty">Cart is empty — scan a product to begin.</div>';
      if (totalEl) totalEl.textContent = "₹0.00";
      if (countEl) countEl.textContent = "";
      return;
    }

    totals = helpers.calculateTotals(app, defaultCustomer, cart);
    if (totalEl) totalEl.textContent = utils.formatCurrency(totals.grandTotal);
    if (countEl) {
      countEl.textContent = "(" + cart.reduce(function (sum, item) { return sum + item.quantity; }, 0) + " items)";
    }

    rows = cart.slice(0, maxVisible).map(function (item, index) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return '<div class="pos-cart-row">'
        + '<div class="pos-cart-row__name">' + utils.escapeHtml(item.name) + '</div>'
        + '<div class="pos-cart-row__qty">'
        + '<button type="button" class="pos-qty-btn" data-action="dec" data-index="' + index + '">−</button>'
        + '<span class="pos-qty-value">' + item.quantity + '</span>'
        + '<button type="button" class="pos-qty-btn" data-action="inc" data-index="' + index + '">+</button>'
        + '</div>'
        + '<div class="pos-cart-row__amount">' + utils.formatCurrency(lineTotal) + '</div>'
        + '<button type="button" class="pos-remove-btn" data-action="remove" data-index="' + index + '">×</button>'
        + '</div>';
    }).join("");

    if (cart.length > maxVisible) {
      showAllBtn = '<button type="button" class="pos-show-all-btn" data-action="show-all" data-index="0">Show All Items (' + cart.length + ')</button>';
    }

    container.innerHTML = '<div class="pos-cart-table">'
      + '<div class="pos-cart-header"><span>Product</span><span style="text-align:center">Qty</span><span style="text-align:right">Amount</span><span></span></div>'
      + rows
      + '</div>'
      + showAllBtn;
  }

  function showAllItemsModal(app) {
    var existing = document.getElementById("pos-all-items-modal");
    var modal;

    if (existing) existing.remove();

    modal = document.createElement("div");
    modal.id = "pos-all-items-modal";
    modal.className = "pos-modal-overlay";
    modal.innerHTML = '<div class="pos-modal-sheet">'
      + '<div class="pos-modal-header"><span class="pos-modal-title">All Cart Items</span><button type="button" class="pos-modal-close" id="pos-all-items-close">&times;</button></div>'
      + '<div id="pos-all-items-list" class="pos-all-items-list"></div>'
      + '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
    modal.querySelector("#pos-all-items-close").addEventListener("click", function () { closeModal(modal); });
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(modal); });
    renderAllItemsList(app);
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    setTimeout(function () {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 280);
  }

  function renderAllItemsList(app) {
    var listEl = document.getElementById("pos-all-items-list");
    var cart = app.quickBillCart || [];

    if (!listEl) return;
    if (!cart.length) {
      listEl.innerHTML = '<div class="pos-cart-empty">Cart is empty.</div>';
      return;
    }

    listEl.innerHTML = cart.map(function (item, index) {
      var lineTotal = item.taxableValue + (item.taxableValue * item.gstRate / 100);
      return '<div class="pos-cart-row">'
        + '<div class="pos-cart-row__name">' + utils.escapeHtml(item.name) + '</div>'
        + '<div class="pos-cart-row__qty">'
        + '<button type="button" class="pos-qty-btn" data-action="modal-dec" data-index="' + index + '">−</button>'
        + '<span class="pos-qty-value">' + item.quantity + '</span>'
        + '<button type="button" class="pos-qty-btn" data-action="modal-inc" data-index="' + index + '">+</button>'
        + '</div>'
        + '<div class="pos-cart-row__amount">' + utils.formatCurrency(lineTotal) + '</div>'
        + '<button type="button" class="pos-remove-btn" data-action="modal-remove" data-index="' + index + '">×</button>'
        + '</div>';
    }).join("");

    listEl.onclick = function (event) {
      var btn = event.target.closest("[data-action]");
      var idx;

      if (!btn) return;

      idx = parseInt(btn.dataset.index, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= cart.length) return;

      if (btn.dataset.action === "modal-remove") {
        cart.splice(idx, 1);
      } else if (btn.dataset.action === "modal-inc") {
        cart[idx].quantity += 1;
        cart[idx].taxableValue = cart[idx].quantity * cart[idx].rate;
      } else if (btn.dataset.action === "modal-dec") {
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
          cart[idx].taxableValue = cart[idx].quantity * cart[idx].rate;
        } else {
          cart.splice(idx, 1);
        }
      }

      renderAllItemsList(app);
      renderQuickBillCart(app);
    };
  }

  function syncAllItemsModal(app) {
    if (document.getElementById("pos-all-items-modal")) {
      renderAllItemsList(app);
    }
  }

  function showUpiModal(app) {
    var cart = app.quickBillCart || [];
    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : "" };
    var helpers = getSalesHelpers();
    var totals;
    var existing = document.getElementById("pos-upi-modal");
    var upiId;
    var merchantName;
    var upiUri;
    var qrContent;
    var modal;

    if (!cart.length) {
      setQuickBillStatus("Please scan at least one item before charging.", "var(--danger)");
      return;
    }

    totals = helpers.calculateTotals(app, defaultCustomer, cart);
    if (existing) existing.remove();

    upiId = app.data.company && app.data.company.upiId ? app.data.company.upiId : null;
    merchantName = app.data.company && app.data.company.name ? encodeURIComponent(app.data.company.name) : "Unidex";
    upiUri = "";
    qrContent = "";

    if (upiId) {
      upiUri = "upi://pay?pa=" + encodeURIComponent(upiId) + "&pn=" + merchantName + "&am=" + totals.grandTotal + "&cu=INR";
      qrContent = '<canvas id="pos-upi-qr-canvas"></canvas>';
    } else {
      qrContent = '<div class="pos-upi-qr-placeholder"><p>Configure UPI ID in Settings</p></div>';
    }

    modal = document.createElement("div");
    modal.id = "pos-upi-modal";
    modal.className = "pos-modal-overlay";
    modal.innerHTML = '<div class="pos-modal-sheet pos-upi-sheet">'
      + '<div class="pos-modal-header"><span class="pos-modal-title">UPI QR Payment</span><button type="button" class="pos-modal-close" id="pos-upi-close">&times;</button></div>'
      + '<div class="pos-upi-amount">' + utils.formatCurrency(totals.grandTotal) + '</div>'
      + '<div class="pos-upi-qr-area">' + qrContent + '</div>'
      + '<p class="pos-upi-hint">Ask customer to scan this QR with any UPI app</p>'
      + '<button type="button" class="btn-received-payment" id="pos-upi-received">I Received Payment</button>'
      + '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(function () { modal.classList.add("is-open"); });

    if (upiId && typeof window.QRious !== "undefined") {
      new window.QRious({
        element: document.getElementById("pos-upi-qr-canvas"),
        value: upiUri,
        size: 200
      });
    }

    modal.querySelector("#pos-upi-close").addEventListener("click", function () { closeModal(modal); });
    modal.addEventListener("click", function (event) { if (event.target === modal) closeModal(modal); });
    modal.querySelector("#pos-upi-received").addEventListener("click", function () {
      closeModal(modal);
      submitQuickBill(app, "upi");
    });
  }

  function showSuccessOverlay(amount, paymentMethod, onDone) {
    var existing = document.getElementById("pos-success-overlay");
    var label = paymentMethod === "upi" ? "UPI" : "Cash";
    var overlay;

    if (existing) existing.remove();

    overlay = document.createElement("div");
    overlay.id = "pos-success-overlay";
    overlay.className = "pos-success-overlay";
    overlay.innerHTML = '<div class="pos-success-content">'
      + '<div class="pos-success-check">✓</div>'
      + '<div class="pos-success-amount">' + amount + '</div>'
      + '<div class="pos-success-msg">Received Successfully</div>'
      + '<div class="pos-success-method">' + label + '</div>'
      + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("is-visible"); });
    setTimeout(function () {
      overlay.classList.remove("is-visible");
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onDone === "function") onDone();
      }, 320);
    }, 1800);
  }

  function submitQuickBill(app, paymentMethod) {
    var cart = app.quickBillCart || [];
    var defaultCustomer;
    var helpers = getSalesHelpers();
    var totals;
    var amountStr;
    var draft;

    if (!cart.length) {
      setQuickBillStatus("Please scan at least one item before charging.", "var(--danger)");
      return;
    }

    defaultCustomer = {
      name: "Walk-in Customer",
      address: "",
      state: app.data.company && app.data.company.state ? app.data.company.state : "Unknown",
      mobile: "",
      email: "",
      gstNumber: ""
    };

    totals = helpers.calculateTotals(app, defaultCustomer, cart);
    amountStr = utils.formatCurrency(totals.grandTotal);

    draft = {
      id: utils.createId("INV"),
      invoiceType: "tax_invoice",
      paymentStatus: "paid",
      invoiceNumber: helpers.nextInvoiceNumber(app),
      invoiceDate: utils.today(),
      company: utils.clone(app.data.company),
      customer: defaultCustomer,
      notes: paymentMethod === "upi" ? "Automated POS Checkout: Paid via UPI" : "Automated POS Checkout: Cash Paid",
      items: cart.map(function (item) { return Object.assign({}, item); }),
      totals: totals
    };

    app.data.invoices.unshift(draft);
    helpers.deductStock(app, draft.items);
    app.persist();

    showSuccessOverlay(amountStr, paymentMethod, function () {
      app.quickBillCart = [];
      renderQuickBillCart(app);
      app.renderAll();
    });
  }

  function setQuickBillStatus(message, color) {
    var statusEl = document.getElementById("camera-reader-status");
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = color || "";
  }

  function getSalesHelpers() {
    if (!ns.modules.sales || !ns.modules.sales.helpers) {
      throw new Error("Sales helpers are unavailable for Quick Bill.");
    }

    return ns.modules.sales.helpers;
  }

  ns.modules.quickbill = {
    init: init,
    render: render
  };
})(window.LedgerFlow);
