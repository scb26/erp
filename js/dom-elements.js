window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  // All DOM lookups are grouped here to keep the bootstrap file focused on behavior.
  function collect() {
    var elements = {
      companyForm: document.getElementById("company-form"),
      customerForm: document.getElementById("customer-form"),
      productForm: document.getElementById("product-form"),
      invoiceForm: document.getElementById("invoice-form"),
      companyStateSelect: document.getElementById("company-state"),
      customerIdInput: document.getElementById("customer-id"),
      customerNameInput: document.getElementById("customer-name"),
      customerMobileInput: document.getElementById("customer-mobile"),
      customerTypeSelect: document.getElementById("customer-type"),
      customerCompanyNameInput: document.getElementById("customer-company-name"),
      customerStateSelect: document.getElementById("customer-state"),
      customerGstNumberInput: document.getElementById("customer-gst-number"),
      customerEmailInput: document.getElementById("customer-email"),
      customerOpeningBalanceInput: document.getElementById("customer-opening-balance"),
      customerCreditLimitInput: document.getElementById("customer-credit-limit"),
      customerCityInput: document.getElementById("customer-city"),
      customerPincodeInput: document.getElementById("customer-pincode"),
      customerAddressInput: document.getElementById("customer-address"),
      invoiceCustomerSelect: document.getElementById("invoice-customer"),
      lineItemsContainer: document.getElementById("line-items"),
      addLineItemButton: document.getElementById("add-line-item"),
      customerList: document.getElementById("customer-list"),
      customerFormEyebrow: document.getElementById("customer-form-eyebrow"),
      customerFormTitle: document.getElementById("customer-form-title"),
      customerFormMessage: document.getElementById("customer-form-message"),
      customerSubmitButton: document.getElementById("customer-submit-button"),
      customerCancelButton: document.getElementById("customer-cancel-button"),
      customerRefreshButton: document.getElementById("customer-refresh-button"),
      productList: document.getElementById("product-list"),
      invoiceHistory: document.getElementById("invoice-history"),
      invoicePreview: document.getElementById("invoice-preview"),
      printButton: document.getElementById("print-invoice"),
      moduleMenu: document.getElementById("module-menu"),
      moduleMenuTitle: document.getElementById("module-menu-title"),
      activeModuleTitle: document.getElementById("active-module-title"),
      activeModuleDescription: document.getElementById("active-module-description"),
      featureButtons: Array.prototype.slice.call(document.querySelectorAll(".feature-button")),
      moduleScreens: Array.prototype.slice.call(document.querySelectorAll(".module-screen")),
      dashboardInvoiceList: document.getElementById("dashboard-invoice-list"),
      dashboardBillingStatus: document.getElementById("dashboard-billing-status"),
      dashboardCompanyState: document.getElementById("dashboard-company-state"),
      dashboardLatestInvoice: document.getElementById("dashboard-latest-invoice"),
      adminCompanyName: document.getElementById("admin-company-name"),
      adminCompanyGstin: document.getElementById("admin-company-gstin"),
      adminCompanyState: document.getElementById("admin-company-state"),
      featureRail: document.getElementById("feature-rail"),
      sidebarToggle: document.getElementById("sidebar-toggle"),
      subtotalValue: document.getElementById("subtotal-value"),
      cgstValue: document.getElementById("cgst-value"),
      sgstValue: document.getElementById("sgst-value"),
      igstValue: document.getElementById("igst-value"),
      grandTotalValue: document.getElementById("grand-total-value")
    };

    elements.isReady = !!(
      elements.companyForm &&
      elements.customerForm &&
      elements.productForm &&
      elements.invoiceForm
    );

    return elements;
  }

  ns.dom = {
    collect: collect
  };
})(window.LedgerFlow);
