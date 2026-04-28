window.Unidex = window.Unidex || {};

(function (ns) {
  var utils = ns.utils;
  var stateStore = ns.stateStore;

  /**
   * @module InventoryModule
   * @description Manages product catalog, stock levels, and HSN/GST configurations.
   */

  var uiState = {
    searchQuery: ""
  };


  function init(app) {
    if (!app.elements.productForm) return;

    if (app.elements.productSearchInput) {
      app.elements.productSearchInput.addEventListener("input", function (e) {
        uiState.searchQuery = e.target.value.toLowerCase();
        render(app);
      });
    }

    if (app.elements.btnAddProduct) {
      app.elements.btnAddProduct.addEventListener("click", function () {
        openModal(app, null);
      });
    }

    if (app.elements.productForm) {
      app.elements.productForm.addEventListener("submit", function (e) {
        e.preventDefault();
        saveProduct(app);
      });
    }

    if (app.elements.closeProductModal) {
      app.elements.closeProductModal.addEventListener("click", function () {
        closeModal(app);
      });
    }

    if (app.elements.productCancelBtn) {
      app.elements.productCancelBtn.addEventListener("click", function () {
        closeModal(app);
      });
    }

    // Bulk CSV Import
    if (app.elements.btnBulkImport) {
      var fileInput = document.getElementById("bulk-import-file");
      app.elements.btnBulkImport.addEventListener("click", function () {
        if (fileInput) fileInput.click();
      });
      if (fileInput) {
        fileInput.addEventListener("change", function (e) {
          var file = e.target.files && e.target.files[0];
          if (file) {
            importCsv(app, file);
            e.target.value = "";
          }
        });
      }
    }

    render(app);
  }

  function render(app) {
    var listContainer = app.elements.productInventoryList;
    if (!listContainer) return;

    var q = uiState.searchQuery;
    var products = stateStore.getInventoryItems(app);
    var filtered = products.filter(function (p) {
      return !q || 
             (p.name && p.name.toLowerCase().indexOf(q) !== -1) || 
             (p.barcode && p.barcode.indexOf(q) !== -1);
    });

    // Header count
    var countBadge = document.querySelector("#product-inventory-list .panel-head span");
    if (countBadge) countBadge.textContent = products.length;

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 24px;">No products found.</div>';
      return;
    }

    listContainer.innerHTML = filtered.map(function (p) {
      var isLowStock = p.stock <= (p.lowStockThreshold || 5);
      var stockBadgeClass = isLowStock ? "badge--danger" : "badge--success";
      
      return '<div class="data-card" style="background: var(--bg-strong); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">' +
          '<div>' +
            '<strong style="color: var(--text); font-size: 1.1rem; display: block; margin-bottom: 2px;">' + utils.escapeHtml(p.name) + '</strong>' +
            '<span style="color: var(--muted); font-size: 0.85rem;">Barcode: ' + (p.barcode ? utils.escapeHtml(p.barcode) : "N/A") + '</span>' +
          '</div>' +
          '<span class="badge ' + stockBadgeClass + '">' + (p.stock || 0) + ' In Stock</span>' +
        '</div>' +
        '<div style="display: flex; justify-content: space-between; background: var(--bg); padding: 10px; border-radius: 6px; margin-bottom: 16px;">' +
          '<div>' +
            '<span style="color: var(--muted); font-size: 0.8rem; display: block;">Price</span>' +
            '<strong style="color: var(--text);">₹' + (p.price || 0).toLocaleString("en-IN") + '</strong>' +
          '</div>' +
          '<div style="text-align: right;">' +
            '<span style="color: var(--muted); font-size: 0.8rem; display: block;">GST</span>' +
            '<span style="color: var(--text);">' + (p.gstRate || 0) + '%</span>' +
          '</div>' +
        '</div>' +
        '<div style="display: flex; gap: 8px;">' +
          '<button class="button button--secondary button--small edit-btn" data-id="' + utils.escapeHtml(p.id) + '" type="button" style="flex: 1;">Edit</button>' +
          '<button class="button button--secondary button--small" type="button" style="flex: 1;">History</button>' +
        '</div>' +
      '</div>';
    }).join("");

    listContainer.querySelectorAll(".edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var product = products.find(function (p) { return String(p.id) === String(btn.dataset.id); });
        if (product) openModal(app, product);
      });
    });
  }

  function openModal(app, product) {
    if (!app.elements.productModal) return;

    if (product) {
      app.elements.productModalTitle.textContent = "Edit Product";
      app.elements.productIdInput.value = product.id;
      app.elements.productNameInput.value = product.name || "";
      app.elements.productBarcodeInput.value = product.barcode || "";
      app.elements.productHsnInput.value = product.hsn || "";
      app.elements.productPriceInput.value = product.price || 0;
      app.elements.productGstInput.value = product.gstRate || 0;
      app.elements.productStockInput.value = product.stock || 0;
      app.elements.productSubmitBtn.textContent = "Save Changes";
    } else {
      app.elements.productModalTitle.textContent = "Add New Product";
      app.elements.productForm.reset();
      app.elements.productIdInput.value = "";
      app.elements.productSubmitBtn.textContent = "Add Product";
    }

    app.elements.productModal.showModal();
  }

  function closeModal(app) {
    if (app.elements.productModal) {
      app.elements.productModal.close();
    }
  }

  function saveProduct(app) {
    var productId = app.elements.productIdInput.value.trim();
    var name = app.elements.productNameInput.value.trim();
    if (!name) return;

    var productData = {
      id: productId || "PROD-" + Date.now(),
      name: name,
      barcode: app.elements.productBarcodeInput.value.trim(),
      hsn: app.elements.productHsnInput.value.trim(),
      price: parseFloat(app.elements.productPriceInput.value) || 0,
      gstRate: parseFloat(app.elements.productGstInput.value) || 0,
      stock: parseInt(app.elements.productStockInput.value) || 0
    };

    var promise;
    if (productId) {
      promise = stateStore.updateInventoryItem(app, productId, productData);
    } else {
      promise = stateStore.addInventoryItem(app, productData);
    }

    promise.then(function() {
      render(app);
      closeModal(app);
    }).catch(function(err) {
      alert("Error saving product: " + err.message);
    });
  }

  function importCsv(app, file) {
    var reader = new FileReader();
    reader.onload = function () {
      var lines = String(reader.result || "").split(/\r?\n/).filter(function (l) {
        return l.trim();
      });
      var headers = (lines.shift() || "").split(",").map(function (h) {
        return h.trim().toLowerCase();
      });
      var created = 0;

      lines.forEach(function (line) {
        var cells = line.split(",");
        var row = {};
        headers.forEach(function (h, i) {
          row[h] = (cells[i] || "").trim();
        });

        var name = row.name || row.product_name;
        if (!name) return;

        stateStore.addInventoryItem(app, {
          id: "PROD-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          name: name,
          barcode: row.barcode || "",
          hsn: row.hsn || row.hsn_sac_code || "",
          price: parseFloat(row.price || row.selling_price || 0) || 0,
          gstRate: parseFloat(row.gst || row.gst_rate || 0) || 0,
          stock: parseInt(row.stock || row.stock_qty || 0) || 0
        });
        created++;
      });

      if (created > 0) {
        render(app);
        alert(created + " product(s) imported successfully.");
      }
    };
    reader.readAsText(file);
  }

  function setActiveInventoryView(app, viewKey) {
    if (!viewKey) return;
    
    app.activeInventoryView = viewKey;

    var screens = document.querySelectorAll('.product-view');
    screens.forEach(function (screen) {
      if (screen.dataset.productView === viewKey) {
        screen.classList.add('is-active');
      } else {
        screen.classList.remove('is-active');
      }
    });

    ns.navigation.renderModuleMenu(app);
    
    // Call specific renders for subviews if needed
    if (viewKey === "inventory") render(app);
    if (viewKey === "vendors" && ns.modules.vendors) ns.modules.vendors.render(app);
    if (viewKey === "purchase-history" && ns.modules.purchase) ns.modules.purchase.render(app);
  }

  ns.modules.inventory = {
    init: init,
    render: render,
    setActiveInventoryView: setActiveInventoryView
  };
})(window.Unidex);
