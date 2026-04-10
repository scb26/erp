window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var customerApi = ns.customerApi;
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  // Customer module manages backend sync plus the customer master form and list.
  function init(app) {
    app.elements.customerForm.addEventListener("submit", async function (event) {
      var customerId = app.elements.customerIdInput.value;
      var payload = buildPayload(app);
      var savedCustomer;

      event.preventDefault();

      try {
        if (customerId) {
          savedCustomer = await customerApi.updateCustomer(customerId, payload);
          upsertCustomer(app, savedCustomer);
        } else {
          savedCustomer = await customerApi.createCustomer(payload);
          upsertCustomer(app, savedCustomer);
        }

        app.persist();
        app.renderAll();
        resetForm(app);
        setMessage(app, customerId ? "Customer updated successfully." : "Customer added successfully.", "success");
      } catch (error) {
        setMessage(app, error.message, "error");
      }
    });

    if (app.elements.customerCancelButton) {
      app.elements.customerCancelButton.addEventListener("click", function () {
        resetForm(app);
      });
    }

    if (app.elements.customerRefreshButton) {
      app.elements.customerRefreshButton.addEventListener("click", async function () {
        await syncFromBackend(app, true);
        app.renderAll();
      });
    }

    app.elements.customerList.addEventListener("click", async function (event) {
      var action = event.target.dataset.customerAction;
      var customerId = event.target.dataset.customerId;
      var customer;

      if (!action || !customerId) {
        return;
      }

      if (action === "edit") {
        try {
          customer = await customerApi.getCustomer(customerId);
          upsertCustomer(app, customer);
          app.persist();
          app.renderAll();
          fillForm(app, customer);
          setMessage(app, "Editing customer " + customer.name + ".", "success");
          document.getElementById("customer-add").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          setMessage(app, error.message, "error");
        }
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this customer?")) {
          return;
        }

        try {
          await customerApi.deleteCustomer(customerId);
          app.data.customers = app.data.customers.filter(function (item) {
            return String(item.id) !== String(customerId);
          });
          app.persist();
          app.renderAll();

          if (String(app.elements.customerIdInput.value) === String(customerId)) {
            resetForm(app);
          }

          setMessage(app, "Customer deleted successfully.", "success");
        } catch (error) {
          setMessage(app, error.message, "error");
        }
      }
    });
  }

  function render(app) {
    renderList(app);
    renderCustomerOptions(app);
  }

  async function syncFromBackend(app, showStatus) {
    try {
      app.data.customers = await customerApi.listCustomers();
      app.persist();

      if (showStatus) {
        setMessage(app, "Customers synced from backend successfully.", "success");
      }

      return "";
    } catch (error) {
      if (showStatus) {
        setMessage(app, error.message, "error");
      }

      return error.message;
    }
  }

  function renderList(app) {
    if (!app.data.customers.length) {
      app.elements.customerList.innerHTML = '<div class="empty-state">No customers available from the backend yet.</div>';
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

    app.elements.customerFormEyebrow.textContent = isEdit ? "Customer Editor" : "Customer Master";
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

  function upsertCustomer(app, customer) {
    var index = app.data.customers.findIndex(function (item) {
      return String(item.id) === String(customer.id);
    });

    if (index === -1) {
      app.data.customers.unshift(customer);
      return;
    }

    app.data.customers[index] = customer;
  }

  function buildPayload(app) {
    return {
      name: valueOf("customer-name"),
      mobile: valueOf("customer-mobile"),
      customer_type: app.elements.customerTypeSelect.value,
      company_name: valueOf("customer-company-name") || null,
      address: valueOf("customer-address") || null,
      gst_number: valueOf("customer-gst-number") || null,
      opening_balance: numberOrDefault("customer-opening-balance", 0),
      credit_limit: nullableNumber("customer-credit-limit"),
      email: valueOf("customer-email") || null,
      city: valueOf("customer-city") || null,
      state: app.elements.customerStateSelect.value || null,
      pincode: valueOf("customer-pincode") || null
    };
  }

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function numberOrDefault(id, fallback) {
    var numericValue = parseFloat(document.getElementById(id).value);
    return Number.isNaN(numericValue) ? fallback : numericValue;
  }

  function nullableNumber(id) {
    var rawValue = document.getElementById(id).value.trim();

    if (!rawValue) {
      return null;
    }

    return numberOrDefault(id, null);
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
