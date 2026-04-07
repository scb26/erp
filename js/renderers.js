window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  // Rendering stays separate from event wiring so each screen can be understood in isolation.
  function renderAll(app) {
    fillCompanyForm(app);
    renderCustomers(app);
    renderProducts(app);
    renderCustomerOptions(app);
    renderDashboard(app);
    renderHistory(app);
    renderAdminSummary(app);
    ns.invoice.ensureInvoiceDefaults(app);
    ns.invoice.syncPreview(app);
  }

  function fillCompanyForm(app) {
    document.getElementById("company-name").value = app.data.company.name;
    document.getElementById("company-gstin").value = app.data.company.gstin;
    document.getElementById("company-address").value = app.data.company.address;
    app.elements.companyStateSelect.value = app.data.company.state;
  }

  function renderDashboard(app) {
    var latestInvoice = app.data.invoices[0] || null;

    app.elements.dashboardBillingStatus.textContent = app.data.invoices.length ? "Active" : "Ready";
    app.elements.dashboardCompanyState.textContent = app.data.company.state || "-";
    app.elements.dashboardLatestInvoice.textContent = latestInvoice ? latestInvoice.invoiceNumber : "None yet";

    if (!app.data.invoices.length) {
      app.elements.dashboardInvoiceList.innerHTML = '<div class="empty-state">Create your first invoice to see recent activity here.</div>';
      return;
    }

    app.elements.dashboardInvoiceList.innerHTML = app.data.invoices.slice(0, 4).map(function (invoice) {
      return [
        '<article class="data-card">',
        '<h3>' + utils.escapeHtml(invoice.invoiceNumber) + ' <span class="inline-total">' + utils.formatCurrency(invoice.totals.grandTotal) + "</span></h3>",
        "<p>" + utils.escapeHtml(invoice.customer.name) + " | " + utils.escapeHtml(invoice.invoiceDate) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderAdminSummary(app) {
    app.elements.adminCompanyName.textContent = app.data.company.name || "-";
    app.elements.adminCompanyGstin.textContent = app.data.company.gstin || "-";
    app.elements.adminCompanyState.textContent = app.data.company.state || "-";
  }

  function renderCustomers(app) {
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

  function renderProducts(app) {
    if (!app.data.products.length) {
      app.elements.productList.innerHTML = '<div class="empty-state">No products yet.</div>';
      return;
    }

    app.elements.productList.innerHTML = app.data.products.map(function (product) {
      return [
        '<article class="data-card">',
        "<h3>" + utils.escapeHtml(product.name) + "</h3>",
        "<p>HSN/SAC: " + utils.escapeHtml(product.hsn || "-") + " | GST: " + utils.escapeHtml(String(product.gstRate)) + "%</p>",
        "<p>Price: " + utils.formatCurrency(product.price) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function renderCustomerOptions(app) {
    if (!app.data.customers.length) {
      app.elements.invoiceCustomerSelect.innerHTML = '<option value="">No customers available</option>';
      return;
    }

    app.elements.invoiceCustomerSelect.innerHTML = app.data.customers.map(function (customer) {
      return '<option value="' + customer.id + '">' + utils.escapeHtml(customer.name) + " - " + utils.escapeHtml(customer.state) + "</option>";
    }).join("");
  }

  function renderHistory(app) {
    var head = [
      '<div class="history-head">',
      "<span>Invoice</span>",
      "<span>Date</span>",
      "<span>Customer</span>",
      "<span>Total</span>",
      "<span>Action</span>",
      "</div>"
    ].join("");

    if (!app.data.invoices.length) {
      app.elements.invoiceHistory.innerHTML = head + '<div class="empty-state">No invoices saved yet.</div>';
      return;
    }

    app.elements.invoiceHistory.innerHTML = head + app.data.invoices.map(function (invoice) {
      return [
        '<div class="history-row">',
        "<strong>" + utils.escapeHtml(invoice.invoiceNumber) + "</strong>",
        "<span>" + utils.escapeHtml(invoice.invoiceDate) + "</span>",
        "<span>" + utils.escapeHtml(invoice.customer.name) + "</span>",
        "<span>" + utils.formatCurrency(invoice.totals.grandTotal) + "</span>",
        '<button class="button button--secondary" type="button" data-invoice-id="' + invoice.id + '">View</button>',
        "</div>"
      ].join("");
    }).join("");
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

    app.elements.customerFormEyebrow.textContent = isEdit ? "Customer Editor" : "Customer Master";
    app.elements.customerFormTitle.textContent = isEdit ? "Edit customer" : "Add customer";
    app.elements.customerSubmitButton.textContent = isEdit ? "Update customer" : "Add customer";
    app.elements.customerCancelButton.hidden = !isEdit;
  }

  function setCustomerMessage(app, message, type) {
    app.elements.customerFormMessage.textContent = message || "";
    app.elements.customerFormMessage.className = "form-message field-span";

    if (type) {
      app.elements.customerFormMessage.classList.add("form-message--" + type);
    }
  }

  ns.renderers = {
    renderAll: renderAll,
    fillCompanyForm: fillCompanyForm,
    renderCustomerOptions: renderCustomerOptions,
    resetCustomerForm: resetCustomerForm,
    fillCustomerForm: fillCustomerForm,
    setCustomerFormMode: setCustomerFormMode,
    setCustomerMessage: setCustomerMessage
  };
})(window.LedgerFlow);
