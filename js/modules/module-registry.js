window.Unidex = window.Unidex || {};

(function (ns) {
  // The registry gives the bootstrap a single place to initialize and render business modules.
  function list() {
    return [
      ns.modules.admin,
      ns.modules.products,
      ns.modules.dashboard,
      ns.modules.quickbill,
      ns.modules.sales
    ].filter(Boolean);
  }

  function initAll(app) {
    list().forEach(function (moduleDefinition) {
      if (typeof moduleDefinition.init === "function") {
        moduleDefinition.init(app);
      }
    });
  }

  function renderAll(app) {
    list().forEach(function (moduleDefinition) {
      if (typeof moduleDefinition.render === "function") {
        moduleDefinition.render(app);
      }
    });
  }

  ns.moduleRegistry = {
    initAll: initAll,
    renderAll: renderAll
  };
})(window.Unidex);
