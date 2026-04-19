window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  var html5QrCode = null;
  var lastScanMap = {};
  var scanDebounceMs = 3000;
  var audioCtx = null;
  var cameraStarted = false; // Fix 11: explicit flag prevents re-init on every renderAll

  function playBeep() {
    try {
      if (!audioCtx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = new AudioContext();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      var oscillator = audioCtx.createOscillator();
      var gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime); // High pitch scanner beep
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch(e) {
      console.warn("Could not play beep", e);
    }
  }

  function init(app) {
    if (!app.quickBillCart) app.quickBillCart = [];
    if (app.quickBillInitialized) return;
    app.quickBillInitialized = true;

    // --- PWA View Toggles ---
    var viewCartBtn = document.getElementById("qb-view-cart-btn");
    var backToScanBtn = document.getElementById("qb-back-to-scan-btn");
    var fabBtn = document.getElementById("qb-manual-search-fab");
    var closeSheetBtn = document.getElementById("qb-close-sheet-btn");
    var manualSearchSheet = document.getElementById("qb-manual-search-sheet");

    if (viewCartBtn) {
      viewCartBtn.addEventListener("click", function () {
        document.getElementById("qb-camera-view").hidden = true;
        document.getElementById("qb-cart-view").hidden = false;
      });
    }

    if (backToScanBtn) {
      backToScanBtn.addEventListener("click", function () {
        document.getElementById("qb-cart-view").hidden = true;
        document.getElementById("qb-camera-view").hidden = false;
        renderQuickBillCart(app); // Fix 6: ensure cart bar stays visible on return
      });
    }

    if (fabBtn) {
      fabBtn.addEventListener("click", function () {
        if (manualSearchSheet) manualSearchSheet.hidden = false;
        setTimeout(function() { manualSearchSheet.classList.add("is-open"); }, 10);
        var input = document.getElementById("quick-barcode-input-pwa");
        if (input) {
          input.value = "";
          input.focus();
        }
      });
    }

    // Fix 8: Tap backdrop (the sheet overlay itself) to close
    if (manualSearchSheet) {
      manualSearchSheet.addEventListener("click", function(event) {
        if (event.target === manualSearchSheet) {
          manualSearchSheet.classList.remove("is-open");
          setTimeout(function() { manualSearchSheet.hidden = true; }, 300);
        }
      });
    }

    if (closeSheetBtn) {
      closeSheetBtn.addEventListener("click", function () {
        if (manualSearchSheet) {
          manualSearchSheet.classList.remove("is-open");
          setTimeout(function() { manualSearchSheet.hidden = true; }, 300);
        }
      });
    }

    // --- Search Inputs (Both Web and PWA) ---
    function setupInputs(prefix) {
      var input = document.getElementById("quick-barcode-input-" + prefix);
      var suggestions = document.getElementById("quick-barcode-suggestions-" + prefix);

      if (!input || !suggestions) return;

      input.addEventListener("input", function () {
        renderProductSuggestions(app, input.value, suggestions, prefix);
      });

      input.addEventListener("keydown", function (event) {
        var items = suggestions.querySelectorAll(".customer-suggestion");
        var active = suggestions.querySelector(".customer-suggestion.is-active");
        var activeIdx = Array.prototype.indexOf.call(items, active);

        if (event.key === "Enter") {
          event.preventDefault();
          if (active) {
            scanProduct(app, active.dataset.barcode || active.dataset.productId, prefix);
          } else {
            scanProduct(app, input.value.trim(), prefix);
          }
          input.value = "";
          suggestions.hidden = true;
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
          suggestions.hidden = true;
        }
      });

      suggestions.addEventListener("click", function (event) {
        var btn = event.target.closest(".customer-suggestion");
        if (!btn) return;
        scanProduct(app, btn.dataset.barcode || btn.dataset.productId, prefix);
        input.value = "";
        input.focus();
        suggestions.hidden = true;
      });

      document.addEventListener("click", function (event) {
        if (!input.contains(event.target) && !suggestions.contains(event.target)) {
          suggestions.hidden = true;
        }
      });
    }

    setupInputs("web");
    setupInputs("pwa");

    // --- Carts (Both Web and PWA) ---
    function setupCart(prefix) {
      var container = document.getElementById("quick-bill-cart-container-" + prefix);
      if (container) {
        container.addEventListener("click", function (event) {
          var btn = event.target.closest("[data-action]");
          if (!btn) return;

          var idx = parseInt(btn.dataset.index, 10);
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
        });
      }

      var cashBtn = document.getElementById("save-quick-bill-cash-" + prefix);
      if (cashBtn) {
        cashBtn.addEventListener("click", function () {
          submitQuickBill(app, "cash");
        });
      }

      var upiBtn = document.getElementById("save-quick-bill-upi-" + prefix);
      if (upiBtn) {
        upiBtn.addEventListener("click", function () {
          showUpiModal(app);
        });
      }
    }

    setupCart("web");
    setupCart("pwa");

    // --- Web Camera Manual Toggle ---
    var cameraBtnWeb = document.getElementById("start-camera-scan-web");
    if (cameraBtnWeb) {
      bindCameraButton(app, cameraBtnWeb, "web");
    }
  }

  function render(app) {
    var standaloneView = document.getElementById("quickbill-module-screen");

    if (!standaloneView) {
      return;
    }

    var isActive = app.activeModule === "quickbill";
    standaloneView.classList.toggle("is-active", isActive);
    
    var isPWA = window.matchMedia('(display-mode: standalone)').matches || window.innerWidth <= 768;

    var webView = document.getElementById("qb-web-view");
    var pwaView = document.getElementById("qb-pwa-container");

    if (isActive) {
      if (isPWA) {
        if (webView) webView.hidden = true;
        if (pwaView) pwaView.hidden = false;
        
        document.body.classList.add("hide-site-header");
        
        var cartView = document.getElementById("qb-cart-view");
        var cameraView = document.getElementById("qb-camera-view");
        if (cartView) cartView.hidden = true;
        if (cameraView) cameraView.hidden = false;
        
        // Force synchronous layout calculation so the container has dimensions
        void cameraView.offsetHeight;
        
        if (!cameraStarted) { // Fix 11: only start once, not on every renderAll
          cameraStarted = true;
          startCamera(app, "pwa");
        }
      } else {
        if (webView) webView.hidden = false;
        if (pwaView) pwaView.hidden = true;
        document.body.classList.remove("hide-site-header");
        cameraStarted = false; // Fix 11: reset flag when leaving PWA mode
        stopCamera();
      }
    } else {
      document.body.classList.remove("hide-site-header");
      cameraStarted = false; // Fix 11: reset flag when module deactivated
      stopCamera();
    }
    
    renderQuickBillCart(app);
  }

  function startCamera(app, prefix) {
    var readerId = "camera-reader-" + prefix;
    var readerEl = document.getElementById(readerId);
    var statusEl = document.getElementById("camera-reader-status-" + prefix);

    if (!readerEl) return;
    if (typeof Html5Qrcode === "undefined") {
      if (statusEl) statusEl.textContent = "Scanner library not loaded. Check internet.";
      return;
    }

    if (html5QrCode) return; // Already running

    readerEl.style.display = "block";
    
    // Force layout calculation
    var w = readerEl.clientWidth;
    var h = readerEl.clientHeight;
    
    html5QrCode = new Html5Qrcode(readerId);

    var config = { 
      fps: 10
    };

    var onSuccess = function (decodedText) {
      var now = Date.now();
      var lastScan = lastScanMap[decodedText] || 0;
      if (now - lastScan < scanDebounceMs) return;

      lastScanMap[decodedText] = now;
      scanProduct(app, decodedText, prefix);
      
      playBeep();

      if (navigator && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    };

    var onCatch = function(err) {
      if (statusEl) statusEl.innerHTML = 'Camera blocked by browser.<br><br><button id="pwa-force-start-btn" style="padding: 15px 30px; font-size: 1.2rem; border-radius: 30px; background: #007aff; color: #fff; border: none; cursor: pointer; pointer-events: auto;">Tap to Open Camera</button>';
      
      setTimeout(function() {
        var forceBtn = document.getElementById("pwa-force-start-btn");
        if (forceBtn) {
          forceBtn.addEventListener("click", function() {
            statusEl.textContent = "Starting...";
            html5QrCode.start({ facingMode: "environment" }, config, onSuccess, function(){}).catch(function(e) {
              statusEl.textContent = "Could not start camera: " + (e.message || e);
            });
          });
        }
      }, 100);
      
      console.warn("Html5Qrcode start error", err);
    };

    html5QrCode.start({ facingMode: "environment" }, config, onSuccess, function(){}).catch(onCatch);
  }

  function bindCameraButton(app, cameraBtn, prefix) {
    cameraBtn.addEventListener("click", function () {
      var readerEl = document.getElementById("camera-reader-" + prefix);
      var statusEl = document.getElementById("camera-reader-status-" + prefix);

      if (!readerEl) return;

      if (readerEl.style.display === "block") {
        readerEl.style.display = "none";
        cameraBtn.textContent = "Camera";
        stopCamera();
        return;
      }

      if (typeof Html5Qrcode === "undefined") {
        if (statusEl) statusEl.textContent = "Scanner library not loaded. Check internet connection.";
        return;
      }

      cameraBtn.textContent = "Stop Camera";
      if (statusEl) statusEl.textContent = "Starting camera...";
      startCamera(app, prefix);
    });
  }

  function stopCamera() {
    if (html5QrCode) {
      try {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(function() {
            html5QrCode.clear();
            html5QrCode = null; // Fix 1 (partial): null inside .then() after stop resolves
          }).catch(function(e) { console.warn("Failed to stop", e); html5QrCode = null; });
        } else {
          html5QrCode.clear();
          html5QrCode = null;
        }
      } catch (e) { html5QrCode = null; }
    }
    // Fix 15: Close AudioContext to free mobile browser audio resources
    if (audioCtx) {
      try { audioCtx.close(); } catch(e) {}
      audioCtx = null;
    }
    lastScanMap = {};
  }

  function renderProductSuggestions(app, query, container, prefix) {
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

  function scanProduct(app, barcode, prefix) {
    var product;
    var statusEl = document.getElementById("camera-reader-status-" + prefix);
    var existingItem;

    if (!barcode) return;

    // Fix 4: Prune stale debounce entries to prevent unbounded memory growth
    var now = Date.now();
    Object.keys(lastScanMap).forEach(function(key) {
      if (now - lastScanMap[key] > scanDebounceMs * 2) {
        delete lastScanMap[key];
      }
    });

    product = app.data.products.find(function (candidate) {
      return String(candidate.barcode || "") === String(barcode) || String(candidate.id) === String(barcode);
    });

    if (!product) {
      if (statusEl) {
        statusEl.textContent = "Product not found for barcode: " + barcode;
        statusEl.style.color = "var(--danger)";
        // Fix 5: Auto-clear error after 3 seconds
        setTimeout(function() {
          if (statusEl.textContent.indexOf("not found") !== -1) {
            statusEl.textContent = "";
            statusEl.style.color = "";
          }
        }, 3000);
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

    if (prefix === "pwa") {
      var manualSearchSheet = document.getElementById("qb-manual-search-sheet");
      if (manualSearchSheet && manualSearchSheet.classList.contains("is-open")) {
        manualSearchSheet.classList.remove("is-open");
        setTimeout(function() { manualSearchSheet.hidden = true; }, 300);
      }
    }

    renderQuickBillCart(app);
  }

  function renderQuickBillCart(app) {
    var cart = app.quickBillCart || [];
    
    var containerWeb = document.getElementById("quick-bill-cart-container-web");
    var totalElWeb = document.getElementById("quick-bill-total-web");
    var countElWeb = document.getElementById("quick-bill-item-count-web");

    var containerPwa = document.getElementById("quick-bill-cart-container-pwa");
    var cameraTotalEl = document.getElementById("qb-camera-total");
    var cameraCountEl = document.getElementById("qb-camera-item-count");
    var cartTotalElPwa = document.getElementById("quick-bill-total-pwa");
    var cartCountElPwa = document.getElementById("quick-bill-item-count-pwa");
    var emptyMsgPwa = document.getElementById("qb-empty-state-msg");
    var bottomBarContentPwa = document.querySelector(".qb-bottom-bar-content");

    var helpers = getSalesHelpers();
    var defaultCustomer = { state: app.data.company && app.data.company.state ? app.data.company.state : "" };
    var totals;
    var rows;

    if (!cart.length) {
      var emptyWebHtml = '<div class="pos-cart-empty">Cart is empty — scan a product to begin.</div>';
      if (containerWeb) containerWeb.innerHTML = emptyWebHtml;
      if (containerPwa) containerPwa.innerHTML = emptyWebHtml;
      
      if (totalElWeb) totalElWeb.textContent = "₹0.00";
      if (countElWeb) countElWeb.textContent = "";

      if (cameraTotalEl) cameraTotalEl.textContent = "₹0.00";
      if (cartTotalElPwa) cartTotalElPwa.textContent = "₹0.00";
      if (cameraCountEl) cameraCountEl.textContent = "Items: 0";
      
      if (emptyMsgPwa) emptyMsgPwa.style.display = "block";
      if (bottomBarContentPwa) bottomBarContentPwa.style.display = "none";
      return;
    }

    if (emptyMsgPwa) emptyMsgPwa.style.display = "none";
    if (bottomBarContentPwa) bottomBarContentPwa.style.display = "flex";

    totals = helpers.calculateTotals(app, defaultCustomer, cart);
    var formattedTotal = utils.formatCurrency(totals.grandTotal);
    var totalItems = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);

    // Update Web
    if (totalElWeb) totalElWeb.textContent = formattedTotal;
    if (countElWeb) countElWeb.textContent = "(" + totalItems + " items)";

    // Update PWA
    if (cameraTotalEl) cameraTotalEl.textContent = formattedTotal;
    if (cartTotalElPwa) cartTotalElPwa.textContent = formattedTotal;
    if (cameraCountEl) cameraCountEl.textContent = "Items: " + totalItems;
    if (cartCountElPwa) {
      cartCountElPwa.textContent = "(" + totalItems + " items)";
      cartCountElPwa.hidden = false;
    }

    rows = cart.map(function (item, index) {
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

    var tableHtml = '<div class="pos-cart-table">'
      + '<div class="pos-cart-header"><span>Product</span><span style="text-align:center">Qty</span><span style="text-align:right">Amount</span><span></span></div>'
      + rows
      + '</div>';

    if (containerWeb) containerWeb.innerHTML = tableHtml;
    if (containerPwa) containerPwa.innerHTML = tableHtml;
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
      + '<div style="text-align:center;font-size:0.78rem;color:var(--muted);margin-top:-8px;margin-bottom:8px;">incl. GST</div>' // Fix 7
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
      
      // Auto-return to camera view if in PWA
      var cartView = document.getElementById("qb-cart-view");
      var cameraView = document.getElementById("qb-camera-view");
      if (cartView && cameraView && !cartView.hidden) {
        cartView.hidden = true;
        cameraView.hidden = false;
      }
      
      app.renderAll();
    });
  }

  function setQuickBillStatus(message, color) {
    // Attempt to set on both if they exist
    var isPWA = window.matchMedia('(display-mode: standalone)').matches || window.innerWidth <= 768;
    var statusEl = document.getElementById("camera-reader-status-" + (isPWA ? "pwa" : "web"));
    if (statusEl) {
      statusEl.textContent = message || "";
      statusEl.style.color = color || "";
    }
  }
  
  function closeModal(modal) {
    modal.classList.remove("is-open");
    setTimeout(function () {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 280);
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
