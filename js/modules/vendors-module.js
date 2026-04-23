window.Unidex = window.Unidex || {};

(function (ns) {
  var stateStore = ns.stateStore;

  var uiState = {
    searchQuery: ""
  };

  function init(app) {
    if (!app.elements.vendorForm) return;

    app.elements.vendorSearchInput.addEventListener("input", function (e) {
      uiState.searchQuery = e.target.value.toLowerCase();
      render(app);
    });

    app.elements.btnAddVendor.addEventListener("click", function () {
      openModal(app, null);
    });

    app.elements.vendorForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveVendor(app);
    });

    if (app.elements.closeVendorModal) {
      app.elements.closeVendorModal.addEventListener("click", function () {
        app.elements.vendorModal.close();
      });
    }

    if (app.elements.vendorCancelBtn) {
      app.elements.vendorCancelBtn.addEventListener("click", function () {
        app.elements.vendorModal.close();
      });
    }

    render(app);
  }

  function render(app) {
    var listContainer = app.elements.vendorList;
    if (!listContainer) return;

    var q = uiState.searchQuery;
    var vendors = stateStore.getVendors(app);
    var filtered = vendors.filter(function (v) {
      return !q || 
             (v.name && v.name.toLowerCase().indexOf(q) !== -1) || 
             (v.phone && v.phone.indexOf(q) !== -1);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 24px;">No vendors found.</div>';
      return;
    }

    listContainer.innerHTML = filtered.map(function (v) {
      return '<div class="data-card" style="background: var(--bg-strong); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">' +
          '<div>' +
            '<strong style="color: var(--text); font-size: 1.1rem; display: block; margin-bottom: 2px;">' + (v.name || "Unnamed") + '</strong>' +
            '<span style="color: var(--muted); font-size: 0.85rem;">Phone: ' + (v.phone || "N/A") + '</span>' +
          '</div>' +
          '<span class="badge badge--primary">₹' + (v.balance || 0).toLocaleString("en-IN") + ' Payable</span>' +
        '</div>' +
        '<div style="display: flex; gap: 8px;">' +
          '<button class="button button--secondary button--small edit-vendor-btn" data-id="' + v.id + '" type="button" style="flex: 1;">Edit</button>' +
          '<button class="button button--secondary button--small delete-vendor-btn" data-id="' + v.id + '" type="button" style="flex: 1; border-color: rgba(239, 68, 68, 0.3); color: var(--danger);">Delete</button>' +
        '</div>' +
      '</div>';
    }).join("");

    listContainer.querySelectorAll(".edit-vendor-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var vendor = vendors.find(function (v) { return String(v.id) === String(btn.dataset.id); });
        if (vendor) openModal(app, vendor);
      });
    });

    listContainer.querySelectorAll(".delete-vendor-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this vendor? This cannot be undone.")) {
          stateStore.deleteVendor(app, btn.dataset.id).then(function() {
            render(app);
          }).catch(function(err) {
            alert("Error deleting vendor: " + err.message);
          });
        }
      });
    });
  }

  function openModal(app, vendor) {
    if (!app.elements.vendorModal) return;

    if (vendor) {
      app.elements.vendorModalTitle.textContent = "Edit Vendor";
      app.elements.vendorIdInput.value = vendor.id;
      app.elements.vendorNameInput.value = vendor.name || "";
      app.elements.vendorPhoneInput.value = vendor.phone || "";
      app.elements.vendorGstinInput.value = vendor.gstin || "";
      app.elements.vendorStateSelect.value = vendor.state || "";
      app.elements.vendorOpeningBalanceInput.value = vendor.balance || 0;
      app.elements.vendorSubmitBtn.textContent = "Save Changes";
    } else {
      app.elements.vendorModalTitle.textContent = "Add New Vendor";
      app.elements.vendorForm.reset();
      app.elements.vendorIdInput.value = "";
      app.elements.vendorSubmitBtn.textContent = "Add Vendor";
    }

    app.elements.vendorModal.showModal();
  }

  function saveVendor(app) {
    var id = app.elements.vendorIdInput.value.trim();
    var vendorData = {
      name: app.elements.vendorNameInput.value.trim(),
      phone: app.elements.vendorPhoneInput.value.trim(),
      gstin: app.elements.vendorGstinInput.value.trim(),
      state: app.elements.vendorStateSelect.value,
      balance: parseFloat(app.elements.vendorOpeningBalanceInput.value) || 0
    };

    if (!vendorData.name) return;

    var promise;
    if (id) {
      promise = stateStore.updateVendor(app, id, vendorData);
    } else {
      promise = stateStore.addVendor(app, vendorData);
    }

    promise.then(function() {
      app.elements.vendorModal.close();
      render(app);
    }).catch(function(err) {
      alert("Error saving vendor: " + err.message);
    });
  }

  ns.modules.vendors = {
    init: init,
    render: render
  };
})(window.Unidex);
