window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var defaultApiBaseUrl = (function () {
    var protocol = window.location.protocol;
    var hostname = window.location.hostname;

    // When the ERP is opened from another device on the same network,
    // reuse the current host so API calls point back to the PC instead of the phone.
    if ((protocol === "http:" || protocol === "https:") && hostname) {
      return protocol + "//" + hostname + ":4000";
    }

    return "http://localhost:4000";
  })();

  // Central configuration lives here so every UI module reads the same labels and keys.
  ns.config = {
    API: {
      // Allow manual override, otherwise follow the current host for same-Wi-Fi testing.
      customerBaseUrl: window.LedgerFlowCustomerApiBaseUrl || defaultApiBaseUrl
    },
    STORAGE_KEYS: {
      company: "ledgerflow-company",
      customers: "ledgerflow-customers",
      products: "ledgerflow-products",
      invoices: "ledgerflow-invoices",
      sidebar: "ledgerflow-sidebar-collapsed"
    },
    STATES: [
      "Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa",
      "Gujarat", "Haryana", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
      "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
      "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ],
    MODULES: {
      dashboard: {
        title: "Dashboard",
        description: "See the overall business picture, then jump into billing, customers, products, and admin setup.",
        menuTitle: "Dashboard Actions",
        menu: [
          { label: "Overview", target: "dashboard-overview" },
          { label: "Recent Activity", target: "dashboard-activity" }
        ]
      },
      invoices: {
        title: "Billing",
        description: "Run quick bills and full GST invoices from one billing workspace.",
        menuTitle: "Billing Menu",
        menu: [
          { label: "Quick Bill", target: "billing-quick-bill-view", view: "quick-bill" },
          { label: "Invoice", target: "billing-invoice-view", view: "invoice" }
        ]
      },
      customers: {
        title: "Customers",
        description: "Add and maintain customer records so invoices use the correct GST and place-of-supply details.",
        menuTitle: "Customer Menu",
        menu: [
          { label: "Add Customer", target: "customer-add" },
          { label: "Customer List", target: "customer-list-panel" }
        ]
      },
      products: {
        title: "Products",
        description: "Manage products and services with price, HSN or SAC, and GST rates for faster billing.",
        menuTitle: "Product Menu",
        menu: [
          { label: "Add Product", target: "product-add" },
          { label: "Product List", target: "product-list-panel" }
        ]
      },
      admin: {
        title: "Admin",
        description: "Configure company identity, tax profile, and the main settings that appear on every invoice.",
        menuTitle: "Admin Menu",
        menu: [
          { label: "Company Profile", target: "admin-company" },
          { label: "Current Setup", target: "admin-controls" }
        ]
      }
    }
  };
})(window.LedgerFlow);
