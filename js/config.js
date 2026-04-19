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
      expenses: "ledgerflow-expenses",
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
        description: "See today's sale, expense, net, and trend widgets in one place.",
        menuTitle: "Dashboard Actions",
        menu: [
          { label: "Overview", target: "dashboard-overview" }
        ]
      },
      quickbill: {
        title: "Quick Bill",
        description: "Run fast counter billing with barcode scan or manual product entry.",
        menuTitle: "Quick Bill",
        menu: [
          { label: "Quick Bill", target: "quickbill-module-screen" }
        ]
      },
      sales: {
        title: "Sales",
        description: "Manage GST invoices, invoice history, and your customer database in one place.",
        menuTitle: "Sales Menu",
        menu: [
          { label: "Invoice", target: "billing-invoice-view", view: "invoice" },
          { label: "Invoice History", target: "billing-invoice-history-view", view: "history" },
          { label: "Add Customer", target: "customer-add", view: "customer-add" },
          { label: "Customer List", target: "customer-list-panel", view: "customer-list-panel" }
        ]
      },
      products: {
        title: "Products",
        description: "Manage products and services with price, HSN or SAC, and GST rates for faster billing.",
        menuTitle: "Product Menu",
        menu: [
          { label: "Add Product", target: "product-add" },
          { label: "Inventory", target: "product-inventory-panel" }
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
