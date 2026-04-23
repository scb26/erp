window.Unidex = window.Unidex || {};

(function (ns) {
  var config = ns.config;

  function hydrate() {
    var data = {
      company: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.company) || "{}") || {},
      customers: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.customers) || "[]"),
      vendors: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.vendors) || "[]"),
      products: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.products) || "[]"),
      invoices: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.invoices) || "[]"),
      purchases: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.purchases) || "[]"),
      expenses: JSON.parse(window.localStorage.getItem(config.STORAGE_KEYS.expenses) || "[]")
    };
    return data;
  }

  function persist(data) {
    if (!data) return;
    window.localStorage.setItem(config.STORAGE_KEYS.company, JSON.stringify(data.company || null));
    window.localStorage.setItem(config.STORAGE_KEYS.customers, JSON.stringify(data.customers || []));
    window.localStorage.setItem(config.STORAGE_KEYS.vendors, JSON.stringify(data.vendors || []));
    window.localStorage.setItem(config.STORAGE_KEYS.products, JSON.stringify(data.products || []));
    window.localStorage.setItem(config.STORAGE_KEYS.invoices, JSON.stringify(data.invoices || []));
    window.localStorage.setItem(config.STORAGE_KEYS.purchases, JSON.stringify(data.purchases || []));
    window.localStorage.setItem(config.STORAGE_KEYS.expenses, JSON.stringify(data.expenses || []));
  }

  // --- Central API Client ---
  function request(path, options) {
    var baseUrl = String(config.API.customerBaseUrl || "http://localhost:4000").replace(/\/$/, "");
    var requestOptions = Object.assign({
      headers: { "Content-Type": "application/json" }
    }, options || {});

    // Timeout using standard Promise race or simple timeout check
    return window.fetch(baseUrl + path, requestOptions)
      .catch(function(err) {
        throw new Error("Backend unreachable. Ensure the Node.js server is running on " + baseUrl);
      })
      .then(function(response) {
        return response.json().then(function(data) {
          if (!response.ok) {
            var msg = data.message || data.error || ("Request failed with status " + response.status);
            throw new Error(msg);
          }
          return data;
        });
      });
  }

  // --- Universal Sync ---
  function syncAll(app) {
    var loader = document.getElementById("global-sync-loader");
    if (loader) loader.classList.remove("hidden");

    console.log("Starting backend synchronization...");
    
    var fetchData = function (path, defaultData) {
      return request(path).then(function(res) {
        return res.data || defaultData;
      }).catch(function(e) {
        console.warn("Failed to sync " + path + ":", e.message);
        return null;
      });
    };

    return Promise.all([
      fetchData("/customers", []),
      fetchData("/vendors", []),
      fetchData("/inventory", []),
      fetchData("/invoices", []),
      fetchData("/purchase-bills", [])
    ]).then(function(results) {
      var customers = results[0];
      var vendors = results[1];
      var inventory = results[2];
      var invoices = results[3];
      var purchases = results[4];

      if (customers) app.data.customers = customers;
      if (vendors) app.data.vendors = vendors.map(normalizeVendor);
      if (inventory) app.data.products = inventory.map(normalizeProduct);
      if (invoices) app.data.invoices = invoices.map(normalizeInvoice);
      if (purchases) app.data.purchases = purchases.map(normalizePurchase);

      persist(app.data);
      console.log("Synchronization complete.");
    }).catch(function(err) {
      console.error("Critical Sync Error:", err.message);
    }).finally(function() {
      if (loader) {
        setTimeout(function() {
          loader.classList.add("hidden");
        }, 300);
      }
    });
  }

  // --- Normalizers ---
  function normalizeCustomer(record) {
    if (!record) return null;
    return {
      id: record.id,
      name: record.name || record.customer_name || "",
      mobile: record.mobile || record.phone || "",
      phone: record.phone || record.mobile || "",
      customerType: record.customer_type || "Individual",
      companyName: record.company_name || "",
      address: record.address || "",
      gstNumber: record.gst_number || record.gstin || "",
      gstin: record.gstin || record.gst_number || "",
      openingBalance: record.opening_balance === null ? 0 : Number(record.opening_balance || 0),
      creditLimit: record.credit_limit === null || record.credit_limit === "" ? null : Number(record.credit_limit),
      email: record.email || "",
      city: record.city || "",
      state: record.state || record.state_name || "",
      stateName: record.state_name || record.state || "",
      pincode: record.pincode || record.postal_code || "",
      postalCode: record.postal_code || record.pincode || "",
      customerName: record.customer_name || record.name || "",
      companyId: record.company_id || null,
      customerCode: record.customer_code || "",
      createdAt: record.created_at || null
    };
  }

  function normalizeVendor(v) {
    return Object.assign({}, v, {
      id: String(v.id),
      balance: parseFloat(v.balance || 0),
      lastPurchase: v.last_purchase || v.lastPurchase || null
    });
  }

  function normalizeProduct(p) {
    return {
      id: String(p.id),
      name: p.name,
      barcode: p.barcode || "",
      hsn: p.hsn || "",
      price: parseFloat(p.price || 0),
      gstRate: parseFloat(p.gstRate || p.gst_rate || 0),
      stock: parseFloat(p.stock || 0)
    };
  }

  function normalizeInvoice(i) {
    return {
      id: String(i.id),
      invoiceNo: i.invoice_number || i.invoiceNo,
      date: i.invoice_date || i.date,
      customerName: i.customer_name || i.customerName,
      grandTotal: parseFloat(i.grand_total || i.grandTotal || 0),
      status: i.status || "paid",
      paid: parseFloat(i.paid_amount || i.paid || 0),
      due: parseFloat(i.balance_due || i.due || 0)
    };
  }

  function normalizePurchase(p) {
    return {
      billNo: p.bill_number || p.billNo,
      date: p.bill_date || p.date,
      vendorName: p.vendor_name || p.vendorName,
      grandTotal: parseFloat(p.grand_total || p.grandTotal || 0),
      paid: parseFloat(p.paid_amount || p.paid || 0),
      due: parseFloat(p.balance_due || p.due || 0),
      status: p.status || "paid"
    };
  }

  // --- DAL Methods (CRUD) ---

  function listCustomers() {
    return request("/customers", { method: "GET" }).then(function(response) {
      return (response.data || []).map(normalizeCustomer);
    });
  }

  function createCustomer(app, payload) {
    return request("/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(function(response) {
      return syncAll(app).then(function() {
        return normalizeCustomer(response.data);
      });
    });
  }

  function updateCustomer(app, id, payload) {
    return request("/customers/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload)
    }).then(function(response) {
      return syncAll(app).then(function() {
        return normalizeCustomer(response.data);
      });
    });
  }

  function deleteCustomer(app, id) {
    return request("/customers/" + encodeURIComponent(id), { method: "DELETE" }).then(function() {
      return syncAll(app);
    });
  }

  function addVendor(app, vendor) {
    return request("/vendors", {
      method: "POST",
      body: JSON.stringify(vendor)
    }).then(function(res) {
      var newVendor = normalizeVendor(res.data);
      app.data.vendors.unshift(newVendor);
      persist(app.data);
      return newVendor;
    });
  }

  function updateVendor(app, id, data) {
    return request("/vendors/" + id, {
      method: "PUT",
      body: JSON.stringify(data)
    }).then(function(res) {
      var updated = normalizeVendor(res.data);
      var idx = -1;
      for (var i=0; i<app.data.vendors.length; i++) {
        if (app.data.vendors[i].id === String(id)) { idx = i; break; }
      }
      if (idx !== -1) app.data.vendors[idx] = updated;
      persist(app.data);
      return updated;
    });
  }

  function deleteVendor(app, id) {
    return request("/vendors/" + id, { method: "DELETE" }).then(function() {
      app.data.vendors = app.data.vendors.filter(function(v) { return v.id !== String(id); });
      persist(app.data);
    });
  }

  function addInventoryItem(app, item) {
    return request("/inventory", {
      method: "POST",
      body: JSON.stringify(item)
    }).then(function(res) {
      var newItem = normalizeProduct(res.data);
      app.data.products.unshift(newItem);
      persist(app.data);
      return newItem;
    });
  }

  function updateInventoryItem(app, id, data) {
    return request("/inventory/" + id, {
      method: "PUT",
      body: JSON.stringify(data)
    }).then(function(res) {
      var updated = normalizeProduct(res.data);
      var idx = -1;
      for (var i=0; i<app.data.products.length; i++) {
        if (app.data.products[i].id === String(id)) { idx = i; break; }
      }
      if (idx !== -1) app.data.products[idx] = updated;
      persist(app.data);
      return updated;
    });
  }

  function deleteInventoryItem(app, id) {
    return request("/inventory/" + id, { method: "DELETE" }).then(function() {
      app.data.products = app.data.products.filter(function(p) { return p.id !== String(id); });
      persist(app.data);
    });
  }

  function saveInvoice(app, invoice) {
    return request("/invoices", {
      method: "POST",
      body: JSON.stringify(invoice)
    }).then(function() {
      return syncAll(app);
    });
  }

  function savePurchaseBill(app, bill) {
    return request("/purchase-bills", {
      method: "POST",
      body: JSON.stringify(bill)
    }).then(function() {
      return syncAll(app);
    });
  }

  function recordPurchasePayment(app, billNo, amount) {
    return request("/purchase-bills/" + encodeURIComponent(billNo) + "/payments", {
      method: "POST",
      body: JSON.stringify({ amount: amount })
    }).then(function() {
      return syncAll(app);
    });
  }

  function getVendors(app) { return app.data.vendors || []; }
  function getInventoryItems(app) { return app.data.products || []; }
  function getPurchaseBills(app) { return app.data.purchases || []; }
  function getTotalPayableByVendor(app, vendorId) {
    var vendor = null;
    for (var i=0; i<app.data.vendors.length; i++) {
      if (app.data.vendors[i].id === String(vendorId)) { vendor = app.data.vendors[i]; break; }
    }
    return vendor ? (vendor.balance || 0) : 0;
  }

  ns.stateStore = {
    hydrate: hydrate,
    persist: persist,
    syncAll: syncAll,
    listCustomers: listCustomers,
    createCustomer: createCustomer,
    updateCustomer: updateCustomer,
    deleteCustomer: deleteCustomer,
    getVendors: getVendors,
    addVendor: addVendor,
    updateVendor: updateVendor,
    deleteVendor: deleteVendor,
    getTotalPayableByVendor: getTotalPayableByVendor,
    getInventoryItems: getInventoryItems,
    addInventoryItem: addInventoryItem,
    updateInventoryItem: updateInventoryItem,
    deleteInventoryItem: deleteInventoryItem,
    getPurchaseBills: getPurchaseBills,
    savePurchaseBill: savePurchaseBill,
    recordPurchasePayment: recordPurchasePayment,
    saveInvoice: saveInvoice
  };
})(window.Unidex);

