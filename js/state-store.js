window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;
  var utils = ns.utils;

  // Storage concerns are isolated here so the rest of the app can work with plain objects.
  function hydrate() {
    var companyDefaults = {
      name: "Acme Trading Co.",
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      phone: "9876543210",
      state: "Maharashtra",
      pincode: "411001",
      address: "201 Market Arcade, Pune, Maharashtra",
      businessType: "Private Limited Company",
      businessCategory: "Trading",
      email: "accounts@acmetrading.example",
      financialYearStart: "2026-04-01",
      invoicePrefix: "INV-2026-",
      logoDataUrl: "",
      signatureDataUrl: ""
    };
    var company = Object.assign({}, companyDefaults, utils.readJSON(config.STORAGE_KEYS.company) || {});

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
    var baseProducts = [
      { id: "DEMO-1001", barcode: "8901058814234", name: "Maggi 2-Min Noodles 70g", hsn: "1902", price: 14, gstRate: 18 },
      { id: "DEMO-1002", barcode: "8902080001402", name: "Coca Cola Bottle 750ml", hsn: "2202", price: 40, gstRate: 28 },
      { id: "DEMO-1003", barcode: "8901719112028", name: "Parle-G Biscuits 800g", hsn: "1905", price: 80, gstRate: 18 },
      { id: "DEMO-1004", barcode: "8901491001242", name: "Lay's Classic Salted 52g", hsn: "2005", price: 20, gstRate: 12 },
      { id: "DEMO-1005", barcode: "8901262010012", name: "Amul Butter 100g", hsn: "0405", price: 54, gstRate: 12 },
      { id: "DEMO-1006", barcode: "8901030310242", name: "Dairy Milk Chocolate 50g", hsn: "1806", price: 40, gstRate: 18 },
      { id: "DEMO-1007", barcode: "8901078001001", name: "Tata Salt 1kg", hsn: "2501", price: 28, gstRate: 0 },
      { id: "DEMO-1008", barcode: "8901396382006", name: "Dettol Handwash Original 200ml", hsn: "3401", price: 99, gstRate: 18 },
      { id: "DEMO-1009", barcode: "8901030099505", name: "Surf Excel Easy Wash 1kg", hsn: "3402", price: 130, gstRate: 18 },
      { id: "DEMO-1010", barcode: "8901526101111", name: "Aashirvaad Atta 5kg", hsn: "1101", price: 235, gstRate: 0 }
    ];

    var products = utils.readJSON(config.STORAGE_KEYS.products) || baseProducts;

    // Fix the accidental patch caused by colliding ITEM-1001 IDs
    products.forEach(function(p) {
      if (p.name === "Consulting Service" || p.name === "Billing Software License") {
         if (p.barcode === "8901058814234" || p.barcode === "8902080001402") {
            p.barcode = "111222333";
         }
      }
    });

    // Aggressively guarantee all 10 FMCG items exist so testing the barcode scanner always works.
    baseProducts.forEach(function(baseItem) {
      var existing = products.find(function(p) { return p.barcode === baseItem.barcode; });
      if (!existing) {
        products.push(baseItem);
      }
    });

    var storedInvoices = utils.readJSON(config.STORAGE_KEYS.invoices);
    var storedExpenses = utils.readJSON(config.STORAGE_KEYS.expenses);
    var invoices = Array.isArray(storedInvoices) && storedInvoices.length ? storedInvoices : buildSampleInvoices(company, products);
    var expenses = Array.isArray(storedExpenses) && storedExpenses.length ? storedExpenses : buildSampleExpenses();

    return {
      company: company,
      customers: customers,
      products: products,
      invoices: invoices,
      expenses: expenses
    };
  }

  function persist(data) {
    window.localStorage.setItem(config.STORAGE_KEYS.company, JSON.stringify(data.company));
    window.localStorage.setItem(config.STORAGE_KEYS.customers, JSON.stringify(data.customers));
    window.localStorage.setItem(config.STORAGE_KEYS.products, JSON.stringify(data.products));
    window.localStorage.setItem(config.STORAGE_KEYS.invoices, JSON.stringify(data.invoices));
    window.localStorage.setItem(config.STORAGE_KEYS.expenses, JSON.stringify(data.expenses || []));
  }

  // Seed recent demo invoices only for first-time local use so the dashboard has meaningful numbers.
  function buildSampleInvoices(company, products) {
    var companySnapshot = Object.assign({}, company);
    var customerSeeds = [
      {
        id: "CUST-SAMPLE-1001",
        name: "Sunrise Retail",
        gstin: "27AACCS3456H1Z2",
        state: company.state || "Maharashtra",
        email: "accounts@sunrise.example",
        phone: "+91 9822001100",
        address: "12 Laxmi Road, Pune"
      },
      {
        id: "CUST-SAMPLE-1002",
        name: "Metro Stores",
        gstin: "29AACCM5678R1Z6",
        state: "Karnataka",
        email: "billing@metro.example",
        phone: "+91 9811002200",
        address: "44 Brigade Road, Bengaluru"
      },
      {
        id: "CUST-SAMPLE-1003",
        name: "Harbor Electronics",
        gstin: "27AACCH9012K1Z8",
        state: company.state || "Maharashtra",
        email: "finance@harbor.example",
        phone: "+91 9890003300",
        address: "8 FC Road, Pune"
      }
    ];
    var defaultProducts = products.length ? products : [
      { id: "ITEM-1001", barcode: "111222333", name: "Consulting Service", hsn: "998312", price: 15000, gstRate: 18 },
      { id: "ITEM-1002", barcode: "444555666", name: "Billing Software License", hsn: "997331", price: 8500, gstRate: 18 }
    ];
    var seeds = [
      { daysAgo: 0, invoiceNumber: "INV-2006", type: "tax_invoice", status: "paid", customer: customerSeeds[0], lines: [{ productIndex: 0, quantity: 1 }, { productIndex: 1, quantity: 1 }] },
      { daysAgo: 1, invoiceNumber: "INV-2005", type: "estimate", status: "unpaid", customer: customerSeeds[1], lines: [{ productIndex: 1, quantity: 2 }] },
      { daysAgo: 3, invoiceNumber: "INV-2004", type: "tax_invoice", status: "unpaid", customer: customerSeeds[2], lines: [{ productIndex: 0, quantity: 1 }] },
      { daysAgo: 6, invoiceNumber: "INV-2003", type: "tax_invoice", status: "paid", customer: customerSeeds[0], lines: [{ productIndex: 1, quantity: 1 }, { productIndex: 0, quantity: 1 }] },
      { daysAgo: 11, invoiceNumber: "INV-2002", type: "tax_invoice", status: "paid", customer: customerSeeds[1], lines: [{ productIndex: 0, quantity: 2 }] },
      { daysAgo: 17, invoiceNumber: "INV-2001", type: "tax_invoice", status: "paid", customer: customerSeeds[2], lines: [{ productIndex: 1, quantity: 3 }] }
    ];

    return seeds.map(function (seed, index) {
      var items = seed.lines.map(function (line) {
        var product = defaultProducts[line.productIndex] || defaultProducts[0];

        return {
          productId: product.id,
          name: product.name,
          hsn: product.hsn,
          quantity: line.quantity,
          rate: product.price,
          gstRate: product.gstRate,
          taxableValue: line.quantity * product.price
        };
      });

      return {
        id: "INV-SAMPLE-" + String(index + 1),
        invoiceType: seed.type,
        paymentStatus: seed.status,
        invoiceNumber: seed.invoiceNumber,
        invoiceDate: dateDaysAgo(seed.daysAgo),
        company: Object.assign({}, companySnapshot),
        customer: Object.assign({}, seed.customer),
        notes: "Sample billing data for dashboard widgets.",
        items: items,
        totals: calculateTotals(companySnapshot.state, seed.customer.state, items)
      };
    }).sort(function (left, right) {
      return right.invoiceDate.localeCompare(left.invoiceDate);
    });
  }

  function buildSampleExpenses() {
    var seeds = [
      { id: "EXP-SAMPLE-1001", title: "Supplier payment", amount: 3200, daysAgo: 0, type: "payable" },
      { id: "EXP-SAMPLE-1002", title: "Delivery fuel", amount: 850, daysAgo: 1, type: "expense" },
      { id: "EXP-SAMPLE-1003", title: "Packaging material", amount: 640, daysAgo: 2, type: "expense" },
      { id: "EXP-SAMPLE-1004", title: "Staff travel", amount: 1100, daysAgo: 4, type: "expense" },
      { id: "EXP-SAMPLE-1005", title: "Utility bill", amount: 2100, daysAgo: 8, type: "payable" },
      { id: "EXP-SAMPLE-1006", title: "Store maintenance", amount: 1750, daysAgo: 15, type: "expense" }
    ];

    return seeds.map(function (seed) {
      return {
        id: seed.id,
        title: seed.title,
        amount: seed.amount,
        type: seed.type,
        date: dateDaysAgo(seed.daysAgo)
      };
    });
  }

  function calculateTotals(companyState, customerState, items) {
    var subtotal = 0;
    var cgst = 0;
    var sgst = 0;
    var igst = 0;
    var intraState = customerState === companyState;

    items.forEach(function (item) {
      var itemTax = item.taxableValue * item.gstRate / 100;
      subtotal += item.taxableValue;

      if (intraState) {
        cgst += itemTax / 2;
        sgst += itemTax / 2;
      } else {
        igst += itemTax;
      }
    });

    return {
      subtotal: utils.round(subtotal),
      cgst: utils.round(cgst),
      sgst: utils.round(sgst),
      igst: utils.round(igst),
      grandTotal: utils.round(subtotal + cgst + sgst + igst)
    };
  }

  function dateDaysAgo(daysAgo) {
    var date = new Date();
    var year;
    var month;
    var day;

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    year = date.getFullYear();
    month = String(date.getMonth() + 1).padStart(2, "0");
    day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  ns.stateStore = {
    hydrate: hydrate,
    persist: persist
  };
})(window.LedgerFlow);

