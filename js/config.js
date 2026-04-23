window.Unidex = window.Unidex || {};

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
      customerBaseUrl: window.UnidexCustomerApiBaseUrl || defaultApiBaseUrl
    },
    STORAGE_KEYS: {
      company: "unidex-company",
      customers: "unidex-customers",
      vendors: "unidex-vendors",
      products: "unidex-products",
      invoices: "unidex-invoices",
      purchases: "unidex-purchases",
      expenses: "unidex-expenses",
      sidebar: "unidex-sidebar-collapsed"
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
      inventory: {
        title: "Inventory Management",
        description: "Manage products, monitor stock levels, and set low-stock alerts.",
        menuTitle: "Inventory Menu",
        menu: [
          { label: "New Purchase", target: "product-new-purchase", view: "new-purchase" },
          { label: "Purchase History", target: "product-purchase-history", view: "purchase-history" },
          { label: "Vendors", target: "product-vendors", view: "vendors" },
          { label: "Inventory", target: "product-inventory-list", view: "inventory" }
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
})(window.Unidex);
