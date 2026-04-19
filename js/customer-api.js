window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;

  // All backend-facing customer requests live here so the UI can stay focused on rendering.
  async function listCustomers() {
    var response = await request("/customers", { method: "GET" });
    return (response.data || []).map(normalizeCustomer);
  }

  async function getCustomer(id) {
    var response = await request("/customers/" + encodeURIComponent(id), { method: "GET" });
    return normalizeCustomer(response.data);
  }

  async function createCustomer(payload) {
    var response = await request("/customers", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return normalizeCustomer(response.data);
  }

  async function updateCustomer(id, payload) {
    var response = await request("/customers/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return normalizeCustomer(response.data);
  }

  async function deleteCustomer(id) {
    return request("/customers/" + encodeURIComponent(id), { method: "DELETE" });
  }

  async function request(path, options) {
    var response;
    var data;
    var baseUrl = String(config.API.customerBaseUrl || "http://localhost:4000").replace(/\/$/, "");
    var requestOptions = Object.assign(
      {
        headers: {
          "Content-Type": "application/json"
        }
      },
      options || {}
    );

    try {
      response = await window.fetch(baseUrl + path, requestOptions);
    } catch (error) {
      throw new Error("Customer backend is unreachable. Make sure the Node server is running on " + baseUrl + ".");
    }

    data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(extractMessage(data, response.status));
    }

    return data;
  }

  function extractMessage(data, statusCode) {
    if (data && Array.isArray(data.errors) && data.errors.length) {
      return data.errors.join(" | ");
    }

    if (data && data.message) {
      return data.message;
    }

    return "Request failed with status " + statusCode + ".";
  }

  function normalizeCustomer(record) {
    if (!record) {
      return null;
    }

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

  ns.customerApi = {
    listCustomers: listCustomers,
    getCustomer: getCustomer,
    createCustomer: createCustomer,
    updateCustomer: updateCustomer,
    deleteCustomer: deleteCustomer
  };
})(window.LedgerFlow);
