window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  // Customer module — fully local-first (localStorage via app.data.customers).
  // No backend dependency.
  function init(app) {
    app.elements.customerForm.addEventListener("submit", function (event) {
      var customerId = app.elements.customerIdInput.value.trim();
      var payload = buildPayload(app);
      var validationError = validatePayload(payload);

      event.preventDefault();

      if (validationError) {
        setMessage(app, validationError, "error");
        return;
      }

      if (customerId) {
        // Update existing
        var index = app.data.customers.findIndex(function (c) {
          return String(c.id) === String(customerId);
        });

        if (index !== -1) {
          app.data.customers[index] = Object.assign({}, app.data.customers[index], payload, { id: customerId });
        }

        setMessage(app, "Customer updated successfully.", "success");
      } else {
        // Create new
        var newCustomer = Object.assign({}, payload, {
          id: utils.createId("CUS"),
          createdAt: new Date().toISOString()
        });
        app.data.customers.unshift(newCustomer);
        setMessage(app, "Customer added successfully.", "success");
      }

      app.persist();
      app.renderAll();
      resetForm(app);
    });

    if (app.elements.customerCancelButton) {
      app.elements.customerCancelButton.addEventListener("click", function () {
        resetForm(app);
      });
    }

    // Refresh button — no backend, just re-render from localStorage
    if (app.elements.customerRefreshButton) {
      app.elements.customerRefreshButton.addEventListener("click", function () {
        app.renderAll();
        setMessage(app, "Customer list refreshed.", "success");
      });
    }

    app.elements.customerList.addEventListener("click", function (event) {
      var action = event.target.dataset.customerAction;
      var customerId = event.target.dataset.customerId;
      var customer;

      if (!action || !customerId) {
        return;
      }

      if (action === "edit") {
        customer = app.data.customers.find(function (c) {
          return String(c.id) === String(customerId);
        });

        if (customer) {
          fillForm(app, customer);
          setMessage(app, "Editing customer " + customer.name + ".", "success");
          document.getElementById("customer-add").scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this customer? This cannot be undone.")) {
          return;
        }

        app.data.customers = app.data.customers.filter(function (item) {
          return String(item.id) !== String(customerId);
        });

        if (String(app.elements.customerIdInput.value) === String(customerId)) {
          resetForm(app);
        }

        app.persist();
        app.renderAll();
        setMessage(app, "Customer deleted.", "success");
      }
    });
  }

  function render(app) {
    renderList(app);
    renderCustomerOptions(app);
  }

  function renderList(app) {
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

  function renderCustomerOptions(app) {
    var currentSelection = String(app.elements.invoiceCustomerSelect.value || "");
    var selectedCustomer;

    if (!app.elements.invoiceCustomerNameInput || !app.elements.invoiceCustomerSelect) {
      return;
    }

    if (!app.data.customers.length) {
      app.elements.invoiceCustomerSelect.value = "";
      return;
    }

    selectedCustomer = app.data.customers.find(function (customer) {
      return String(customer.id) === currentSelection;
    }) || null;

    if (!selectedCustomer) {
      app.elements.invoiceCustomerSelect.value = "";
      return;
    }

    app.elements.invoiceCustomerNameInput.value = selectedCustomer.name;
  }

  function resetForm(app) {
    app.elements.customerForm.reset();
    app.elements.customerIdInput.value = "";
    app.elements.customerTypeSelect.value = "Individual";
    app.elements.customerOpeningBalanceInput.value = "0";
    app.elements.customerStateSelect.value = app.data.company.state || "";
    setFormMode(app, "create");
    setMessage(app, "", "");
  }

  function fillForm(app, customer) {
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
    setFormMode(app, "edit");
  }

  function setFormMode(app, mode) {
    var isEdit = mode === "edit";
    app.elements.customerFormTitle.textContent = isEdit ? "Edit customer" : "Add customer";
    app.elements.customerSubmitButton.textContent = isEdit ? "Update customer" : "Add customer";
    app.elements.customerCancelButton.hidden = !isEdit;
  }

  function setMessage(app, message, type) {
    app.elements.customerFormMessage.textContent = message || "";
    app.elements.customerFormMessage.className = "form-message field-span";

    if (type) {
      app.elements.customerFormMessage.classList.add("form-message--" + type);
    }
  }

  function validatePayload(payload) {
    if (!payload.name) {
      return "Customer name is required.";
    }
    return null;
  }

  function buildPayload(app) {
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

  function valueOf(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
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

  // syncFromBackend kept as a no-op for API compatibility (called elsewhere in the app)
  function syncFromBackend(app, showStatus) {
    if (showStatus) {
      setMessage(app, "This app stores customers locally — no sync needed.", "success");
    }
    return Promise.resolve("");
  }

  ns.modules.customers = {
    init: init,
    render: render,
    syncFromBackend: syncFromBackend,
    resetForm: resetForm,
    fillForm: fillForm,
    setMessage: setMessage
  };
})(window.LedgerFlow);
