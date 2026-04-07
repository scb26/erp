window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;
  var utils = ns.utils;

  // Storage concerns are isolated here so the rest of the app can work with plain objects.
  function hydrate() {
    var company = utils.readJSON(config.STORAGE_KEYS.company) || {
      name: "Acme Trading Co.",
      gstin: "27ABCDE1234F1Z5",
      state: "Maharashtra",
      address: "201 Market Arcade, Pune, Maharashtra"
    };

    var customers = utils.readJSON(config.STORAGE_KEYS.customers) || [
      {
        id: "CUST-1001",
        name: "Northwind Retail",
        gstin: "29AACCN2456Q1ZA",
        state: "Karnataka",
        email: "accounts@northwind.example",
        phone: "+91 9876543210",
        address: "18 Residency Road, Bengaluru"
      }
    ];

    var products = utils.readJSON(config.STORAGE_KEYS.products) || [
      { id: "ITEM-1001", name: "Consulting Service", hsn: "998312", price: 15000, gstRate: 18 },
      { id: "ITEM-1002", name: "Billing Software License", hsn: "997331", price: 8500, gstRate: 18 }
    ];

    var invoices = utils.readJSON(config.STORAGE_KEYS.invoices) || [];

    return {
      company: company,
      customers: customers,
      products: products,
      invoices: invoices
    };
  }

  function persist(data) {
    window.localStorage.setItem(config.STORAGE_KEYS.company, JSON.stringify(data.company));
    window.localStorage.setItem(config.STORAGE_KEYS.customers, JSON.stringify(data.customers));
    window.localStorage.setItem(config.STORAGE_KEYS.products, JSON.stringify(data.products));
    window.localStorage.setItem(config.STORAGE_KEYS.invoices, JSON.stringify(data.invoices));
  }

  ns.stateStore = {
    hydrate: hydrate,
    persist: persist
  };
})(window.LedgerFlow);
