window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;
  var customerApi = ns.customerApi;
  var dom = ns.dom;
  var stateStore = ns.stateStore;
  var navigation = ns.navigation;
  var invoice = ns.invoice;
  var renderers = ns.renderers;
  var utils = ns.utils;

  // The bootstrap file wires modules together and keeps high-level flow easy to follow.
  async function init() {
    var elements = dom.collect();
    var app;
    var customerSyncError;

    if (!elements.isReady) {
      return;
    }

    app = {
      elements: elements,
      data: stateStore.hydrate(),
      previewInvoice: null,
      activeModule: "dashboard",
      isSidebarCollapsed: window.localStorage.getItem(config.STORAGE_KEYS.sidebar) === "true"
    };

    populateStateOptions(app.elements.companyStateSelect);
    populateStateOptions(app.elements.customerStateSelect);
    bindEvents(app);
    navigation.applySidebarState(app);
    renderers.resetCustomerForm(app);
    customerSyncError = await syncCustomersFromBackend(app, false);
    renderers.renderAll(app);
    navigation.setActiveModule(app, app.activeModule);

    if (customerSyncError) {
      renderers.setCustomerMessage(app, customerSyncError, "error");
    }

    // Keeping the app object on the namespace makes future modules and debugging easier.
    ns.app = app;
  }

  function bindEvents(app) {
    app.elements.featureButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        navigation.setActiveModule(app, button.dataset.module);
      });
    });

    if (app.elements.sidebarToggle) {
      app.elements.sidebarToggle.addEventListener("click", function () {
        navigation.toggleSidebar(app);
      });
    }

    app.elements.moduleMenu.addEventListener("click", function (event) {
      if (!event.target.dataset.targetId) {
        return;
      }

      var target = document.getElementById(event.target.dataset.targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    app.elements.companyForm.addEventListener("submit", function (event) {
      event.preventDefault();
      app.data.company = {
        name: valueOf("company-name"),
        gstin: valueOf("company-gstin"),
        state: app.elements.companyStateSelect.value,
        address: valueOf("company-address")
      };
      stateStore.persist(app.data);
      renderers.renderAll(app);
    });

    app.elements.customerForm.addEventListener("submit", async function (event) {
      var customerId = app.elements.customerIdInput.value;
      var payload = buildCustomerPayload(app);
      var savedCustomer;

      event.preventDefault();

      try {
        if (customerId) {
          savedCustomer = await customerApi.updateCustomer(customerId, payload);
          upsertCustomer(app, savedCustomer);
          renderers.setCustomerMessage(app, "Customer updated successfully.", "success");
        } else {
          savedCustomer = await customerApi.createCustomer(payload);
          upsertCustomer(app, savedCustomer);
          renderers.setCustomerMessage(app, "Customer added successfully.", "success");
        }

        stateStore.persist(app.data);
        renderers.renderAll(app);
        renderers.resetCustomerForm(app);
        renderers.setCustomerMessage(app, customerId ? "Customer updated successfully." : "Customer added successfully.", "success");
      } catch (error) {
        renderers.setCustomerMessage(app, error.message, "error");
      }
    });

    if (app.elements.customerCancelButton) {
      app.elements.customerCancelButton.addEventListener("click", function () {
        renderers.resetCustomerForm(app);
      });
    }

    if (app.elements.customerRefreshButton) {
      app.elements.customerRefreshButton.addEventListener("click", async function () {
        await syncCustomersFromBackend(app, true);
        renderers.renderAll(app);
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
          stateStore.persist(app.data);
          renderers.renderAll(app);
          renderers.fillCustomerForm(app, customer);
          renderers.setCustomerMessage(app, "Editing customer " + customer.name + ".", "success");
          document.getElementById("customer-add").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          renderers.setCustomerMessage(app, error.message, "error");
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
          stateStore.persist(app.data);
          renderers.renderAll(app);

          if (String(app.elements.customerIdInput.value) === String(customerId)) {
            renderers.resetCustomerForm(app);
          }

          renderers.setCustomerMessage(app, "Customer deleted successfully.", "success");
        } catch (error) {
          renderers.setCustomerMessage(app, error.message, "error");
        }
      }
    });

    app.elements.productForm.addEventListener("submit", function (event) {
      event.preventDefault();
      app.data.products.unshift({
        id: utils.createId("ITEM"),
        name: valueOf("product-name"),
        hsn: valueOf("product-hsn"),
        price: numberOf("product-price"),
        gstRate: numberOf("product-gst")
      });
      app.elements.productForm.reset();
      stateStore.persist(app.data);
      renderers.renderAll(app);
    });

    app.elements.addLineItemButton.addEventListener("click", function () {
      invoice.addLineItemRow(app);
      app.previewInvoice = null;
      invoice.syncPreview(app);
    });

    app.elements.lineItemsContainer.addEventListener("input", function (event) {
      invoice.handleLineItemChange(app, event);
    });

    app.elements.lineItemsContainer.addEventListener("change", function (event) {
      invoice.handleLineItemChange(app, event);
    });

    app.elements.lineItemsContainer.addEventListener("click", function (event) {
      if (!event.target.classList.contains("remove-line")) {
        return;
      }

      if (app.elements.lineItemsContainer.children.length === 1) {
        invoice.clearLineItem(app, app.elements.lineItemsContainer.firstElementChild);
      } else {
        event.target.closest(".line-item-row").remove();
      }

      app.previewInvoice = null;
      invoice.syncPreview(app);
    });

    app.elements.invoiceCustomerSelect.addEventListener("change", function () {
      app.previewInvoice = null;
      invoice.syncPreview(app);
    });

    app.elements.invoiceForm.addEventListener("input", function () {
      app.previewInvoice = null;
      invoice.syncPreview(app);
    });

    app.elements.invoiceForm.addEventListener("submit", function (event) {
      var draft;

      event.preventDefault();
      draft = invoice.collectInvoiceDraft(app, true);

      if (!draft) {
        return;
      }

      app.data.invoices.unshift(draft);
      app.previewInvoice = draft;
      stateStore.persist(app.data);
      renderers.renderAll(app);
      invoice.resetInvoiceForm(app);
      navigation.setActiveModule(app, "invoices");
    });

    app.elements.invoiceHistory.addEventListener("click", function (event) {
      if (!event.target.dataset.invoiceId) {
        return;
      }

      app.previewInvoice = app.data.invoices.find(function (savedInvoice) {
        return savedInvoice.id === event.target.dataset.invoiceId;
      }) || null;

      invoice.renderPreview(app, app.previewInvoice);
      navigation.setActiveModule(app, "invoices");
      document.getElementById("invoice-preview-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    app.elements.printButton.addEventListener("click", function () {
      var draft = app.previewInvoice || invoice.collectInvoiceDraft(app, false);
      if (draft) {
        invoice.printInvoice(draft);
      }
    });
  }

  async function syncCustomersFromBackend(app, showStatus) {
    try {
      app.data.customers = await customerApi.listCustomers();
      stateStore.persist(app.data);

      if (showStatus) {
        renderers.setCustomerMessage(app, "Customers synced from backend successfully.", "success");
      }
      return "";
    } catch (error) {
      if (showStatus) {
        renderers.setCustomerMessage(app, error.message, "error");
      }
      return error.message;
    }
  }

  function populateStateOptions(select) {
    select.innerHTML = config.STATES.map(function (stateName) {
      return '<option value="' + stateName + '">' + stateName + "</option>";
    }).join("");
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

  function buildCustomerPayload(app) {
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

  function numberOf(id) {
    return parseFloat(document.getElementById(id).value) || 0;
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

  init();
})(window.LedgerFlow);
