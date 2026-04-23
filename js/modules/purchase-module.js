window.Unidex = window.Unidex || {};

(function (ns) {
  var stateStore = ns.stateStore;

  // Internal draft object to track the current bill being created
  var currentDraft = {
    vendorId: "",
    vendorName: "",
    date: new Date().toISOString().split('T')[0],
    billNo: "",
    items: [],
    paid: 0,
    paymentMethod: "cash",
    notes: ""
  };

  function escHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function init(app) {
    if (!app.elements.purchaseForm) return;

    // --- Purchase History Listeners ---
    if (app.elements.purchaseHistorySearch) {
      app.elements.purchaseHistorySearch.addEventListener("input", function (e) {
        renderHistory(app, e.target.value, app.elements.purchaseHistoryDateFilter.value);
      });
    }

    if (app.elements.btnPurchaseHistoryFilter) {
      app.elements.btnPurchaseHistoryFilter.addEventListener("click", function () {
        if (app.elements.purchaseHistoryDateFilter.showPicker) {
          app.elements.purchaseHistoryDateFilter.showPicker();
        } else {
          app.elements.purchaseHistoryDateFilter.click();
        }
      });

      app.elements.purchaseHistoryDateFilter.addEventListener("change", function (e) {
        renderHistory(app, app.elements.purchaseHistorySearch.value, e.target.value);
        app.elements.btnPurchaseHistoryFilter.textContent = e.target.value ? "📅 " + e.target.value : "📅 Filter";
      });
    }

    // --- New Purchase Flow Listeners ---
    
    // Vendor Search
    app.elements.purchaseVendorName.addEventListener("input", function (e) {
      handleVendorSearch(app, e.target.value);
    });

    app.elements.purchaseVendorSuggestions.addEventListener("click", function (e) {
      var item = e.target.closest(".customer-suggestion");
      if (item) {
        currentDraft.vendorId = item.dataset.customerId;
        currentDraft.vendorName = item.dataset.name;
        app.elements.purchaseVendorName.value = item.dataset.name;
        app.elements.purchaseVendorId.value = item.dataset.customerId;
        app.elements.purchaseVendorSuggestions.hidden = true;
      }
    });

    // Add Line Item
    app.elements.addPurchaseLineBtn.addEventListener("click", function () {
      addLineItemRow(app);
    });

    // Handle Line Item Inputs (Product search, Qty, Rate)
    app.elements.purchaseLineItems.addEventListener("input", function (e) {
      var row = e.target.closest(".line-item-row");
      if (e.target.classList.contains("purchase-line-product-search")) {
        handleProductSearch(app, row, e.target.value);
      }
      calculateTotals(app);
    });

    // Handle Product Selection from Suggestions
    app.elements.purchaseLineItems.addEventListener("click", function (e) {
      var suggestion = e.target.closest(".customer-suggestion");
      if (suggestion) {
        var row = suggestion.closest(".line-item-row");
        var productId = suggestion.dataset.customerId; // Reusing data-customer-id attribute name from common CSS
        var productName = suggestion.dataset.name;
        var rate = suggestion.dataset.price;
        var gst = suggestion.dataset.gst;

        row.querySelector(".purchase-line-product-search").value = productName;
        row.querySelector(".purchase-line-product-id").value = productId;
        row.querySelector(".purchase-line-rate").value = rate;
        row.querySelector(".purchase-line-gst").value = gst;
        row.querySelector(".customer-suggestions").hidden = true;
        
        calculateTotals(app);
      }

      if (e.target.classList.contains("remove-line")) {
        if (app.elements.purchaseLineItems.children.length > 1) {
          e.target.closest(".line-item-row").remove();
          calculateTotals(app);
        }
      }
    });

    // Form Submit
    app.elements.purchaseForm.addEventListener("submit", function (e) {
      e.preventDefault();
      savePurchase(app);
    });

    // Cancel
    app.elements.cancelPurchaseBtn.addEventListener("click", function () {
      resetDraft(app);
      app.setActiveInventoryView("inventory");
    });

    // Initial Renders
    renderHistory(app);
    resetDraft(app);
  }

  function handleVendorSearch(app, query) {
    var q = query.toLowerCase();
    var vendors = stateStore.getVendors(app);
    var filtered = vendors.filter(function(v) {
      return v.name.toLowerCase().indexOf(q) !== -1 || v.phone.indexOf(q) !== -1;
    }).slice(0, 5);

    if (filtered.length > 0) {
      app.elements.purchaseVendorSuggestions.innerHTML = filtered.map(function(v) {
        return '<div class="customer-suggestion" data-customer-id="' + v.id + '" data-name="' + escHtml(v.name) + '">' +
                 '<strong>' + escHtml(v.name) + '</strong><br><small>' + escHtml(v.phone) + '</small>' +
               '</div>';
      }).join("");
      app.elements.purchaseVendorSuggestions.hidden = false;
    } else {
      app.elements.purchaseVendorSuggestions.hidden = true;
    }
  }

  function handleProductSearch(app, row, query) {
    var q = query.toLowerCase();
    var products = app.data.products || [];
    var suggestions = row.querySelector(".customer-suggestions");

    var filtered = products.filter(function(p) {
      return p.name.toLowerCase().indexOf(q) !== -1 || (p.barcode && p.barcode.indexOf(q) !== -1);
    }).slice(0, 5);

    if (filtered.length > 0) {
      suggestions.innerHTML = filtered.map(function(p) {
        return '<div class="customer-suggestion" data-customer-id="' + p.id + '" data-name="' + escHtml(p.name) + '" data-price="' + p.price + '" data-gst="' + p.gstRate + '">' +
                 '<strong>' + escHtml(p.name) + '</strong><br><small>₹' + p.price + ' | GST ' + p.gstRate + '%</small>' +
               '</div>';
      }).join("");
      suggestions.hidden = false;
    } else {
      suggestions.hidden = true;
    }
  }

  function addLineItemRow(app) {
    var div = document.createElement("div");
    div.className = "line-item-row";
    div.innerHTML = 
      '<label><span>Product</span><div class="customer-search">' +
        '<input class="purchase-line-product-search" type="text" placeholder="Search Product" autocomplete="off">' +
        '<input class="purchase-line-product-id" type="hidden">' +
        '<div class="customer-suggestions" hidden></div>' +
      '</div></label>' +
      '<label><span>Qty</span><input class="purchase-line-qty" type="number" min="0" step="0.01" value="1"></label>' +
      '<label><span>Rate</span><input class="purchase-line-rate" type="number" min="0" step="0.01" placeholder="0.00"></label>' +
      '<label><span>GST %</span><input class="purchase-line-gst" type="number" min="0" step="0.01" value="0"></label>' +
      '<button class="button button--secondary remove-line" type="button">×</button>';
    app.elements.purchaseLineItems.appendChild(div);
  }

  function calculateTotals(app) {
    var subtotal = 0;
    var totalGst = 0;
    var rows = app.elements.purchaseLineItems.querySelectorAll(".line-item-row");

    rows.forEach(function(row) {
      var qty = parseFloat(row.querySelector(".purchase-line-qty").value) || 0;
      var rate = parseFloat(row.querySelector(".purchase-line-rate").value) || 0;
      var gstRate = parseFloat(row.querySelector(".purchase-line-gst").value) || 0;

      var lineTotal = qty * rate;
      var lineGst = lineTotal * gstRate / 100;

      subtotal += lineTotal;
      totalGst += lineGst;
    });

    var grandTotal = subtotal + totalGst;
    var paid = parseFloat(app.elements.purchaseAmountPaid.value) || 0;
    var due = grandTotal - paid;

    app.elements.purchaseSubtotal.textContent = "₹ " + subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    app.elements.purchaseGst.textContent = "₹ " + totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    app.elements.purchaseGrandTotal.textContent = "₹ " + grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 });
    app.elements.purchaseBalanceDue.textContent = "₹ " + (due > 0 ? due : 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  }

  function savePurchase(app) {
    var vendorId = app.elements.purchaseVendorId.value;
    if (!vendorId) {
      alert("Please select a vendor.");
      return;
    }

    var billData = {
      billNo: app.elements.purchaseNumber.value.trim(),
      date: app.elements.purchaseDate.value,
      vendorId: vendorId,
      vendorName: app.elements.purchaseVendorName.value,
      paidAmount: parseFloat(app.elements.purchaseAmountPaid.value) || 0,
      paymentMethod: app.elements.purchasePaymentMethod.value,
      notes: app.elements.purchaseNotes.value.trim(),
      items: []
    };

    var rows = app.elements.purchaseLineItems.querySelectorAll(".line-item-row");
    var subtotal = 0;
    var totalGst = 0;

    rows.forEach(function(row) {
      var item = {
        productId: row.querySelector(".purchase-line-product-id").value,
        name: row.querySelector(".purchase-line-product-search").value,
        qty: parseFloat(row.querySelector(".purchase-line-qty").value) || 0,
        rate: parseFloat(row.querySelector(".purchase-line-rate").value) || 0,
        gstRate: parseFloat(row.querySelector(".purchase-line-gst").value) || 0
      };
      item.total = item.qty * item.rate;
      item.taxAmount = item.total * item.gstRate / 100;
      
      subtotal += item.total;
      totalGst += item.taxAmount;
      billData.items.push(item);
    });

    billData.totalAmount = subtotal;
    billData.taxAmount = totalGst;
    billData.grandTotal = subtotal + totalGst;
    billData.balanceDue = billData.grandTotal - billData.paidAmount;

    stateStore.savePurchaseBill(app, billData).then(function() {
      alert("Purchase bill saved successfully!");
      resetDraft(app);
      renderHistory(app);
      app.setActiveInventoryView("purchase-history");
    }).catch(function(err) {
      alert("Error saving purchase: " + err.message);
    });
  }

  function resetDraft(app) {
    app.elements.purchaseForm.reset();
    app.elements.purchaseDate.value = new Date().toISOString().split('T')[0];
    app.elements.purchaseLineItems.innerHTML = "";
    addLineItemRow(app);
    calculateTotals(app);
  }

  function renderHistory(app, query, dateFilter) {
    var listContainer = app.elements.purchaseHistoryList;
    if (!listContainer) return;

    var purchases = stateStore.getPurchaseBills(app);
    var q = query ? query.toLowerCase() : "";

    var filtered = purchases.filter(function (p) {
      var matchesSearch = !q || 
        (p.billNo && p.billNo.toLowerCase().indexOf(q) !== -1) || 
        (p.vendorName && p.vendorName.toLowerCase().indexOf(q) !== -1);
      var matchesDate = !dateFilter || p.date === dateFilter;
      return matchesSearch && matchesDate;
    });

    var countBadge = document.querySelector("#product-purchase-history .panel-head span");
    if (countBadge) countBadge.textContent = filtered.length + " bills";

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 24px;">No purchase records found.</div>';
      return;
    }

    listContainer.innerHTML = filtered.map(function (p) {
      var statusClass = "status-badge--paid";
      var statusText = "PAID";
      if (p.due > 0) {
        statusClass = p.paid > 0 ? "status-badge--partial" : "status-badge--unpaid";
        statusText = p.paid > 0 ? "PARTIAL" : "UNPAID";
      }

      return '<div class="data-card" style="background: var(--bg-strong); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">' +
          '<strong style="color: var(--text); font-size: 1.1rem;">' + escHtml(p.billNo) + '</strong>' +
          '<span style="color: var(--muted);">' + escHtml(p.date) + '</span>' +
        '</div>' +
        '<div style="color: var(--text); margin-bottom: 16px; font-weight: 500;">' +
          escHtml(p.vendorName) +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">' +
          '<div><span style="color: var(--muted); font-size: 0.85rem;">Grand Total:</span> <strong style="color: var(--text);">₹' + (p.grandTotal || 0).toLocaleString("en-IN") + '</strong></div>' +
          '<div style="text-align: right;"><span class="status-badge ' + statusClass + '">' + statusText + '</span></div>' +
        '</div>' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 0.9rem;">' +
          '<div style="color: #16a34a;">Paid: ₹' + (p.paid || 0).toLocaleString("en-IN") + '</div>' +
          '<div style="text-align: right; color: ' + (p.due > 0 ? "#f59e0b" : "var(--muted)") + ';">Due: ₹' + (p.due || 0).toLocaleString("en-IN") + '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 8px; border-top: 1px dashed var(--border); padding-top: 16px;">' +
          '<button class="button button--secondary button--small" type="button">View</button>' +
          '<button class="button button--secondary button--small" type="button">PDF</button>' +
          '<button class="button button--secondary button--small record-payment-btn" data-id="' + escHtml(p.billNo) + '" type="button">Pay</button>' +
        '</div>' +
      '</div>';
    }).join("");

    // Bind Record Payment
    listContainer.querySelectorAll(".record-payment-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var billNo = btn.dataset.id;
        var amount = parseFloat(prompt("Enter payment amount for bill " + billNo));
        if (amount > 0) {
          stateStore.recordPurchasePayment(app, billNo, amount);
          renderHistory(app);
        }
      });
    });
  }

  ns.modules.purchase = {
    init: init,
    render: renderHistory
  };
})(window.Unidex);
