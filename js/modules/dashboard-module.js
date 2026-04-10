window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var utils = ns.utils;

  ns.modules = ns.modules || {};

  // Dashboard owns the high-level business summary and recent billing activity.
  function render(app) {
    var latestInvoice = app.data.invoices[0] || null;

    app.elements.dashboardBillingStatus.textContent = app.data.invoices.length ? "Active" : "Ready";
    app.elements.dashboardCompanyState.textContent = app.data.company.state || "-";
    app.elements.dashboardLatestInvoice.textContent = latestInvoice ? latestInvoice.invoiceNumber : "None yet";

    if (!app.data.invoices.length) {
      app.elements.dashboardInvoiceList.innerHTML = '<div class="empty-state">Create your first bill to see recent billing activity here.</div>';
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

  ns.modules.dashboard = {
    render: render
  };
})(window.LedgerFlow);
