window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  // Shared helpers keep formatting and safe string handling consistent across the app.
  function readJSON(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(value || 0);
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function today() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function createId(prefix) {
    return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  ns.utils = {
    readJSON: readJSON,
    formatCurrency: formatCurrency,
    round: round,
    today: today,
    createId: createId,
    clone: clone,
    escapeHtml: escapeHtml
  };
})(window.LedgerFlow);
