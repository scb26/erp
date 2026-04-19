window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;
  var dom = ns.dom;
  var moduleRegistry = ns.moduleRegistry;
  var navigation = ns.navigation;
  var stateStore = ns.stateStore;

  // The bootstrap now focuses on app startup and lets each ERP module own its own behavior.
  async function init() {
    var elements = dom.collect();
    var app;
    var customerSyncError = "";

    if (!elements.isReady) {
      return;
    }

    app = {
      elements: elements,
      data: stateStore.hydrate(),
      previewInvoice: null,
      activeModule: "dashboard",
      activeBillingView: "invoice",
      isSidebarCollapsed: window.localStorage.getItem(config.STORAGE_KEYS.sidebar) === "true"
    };

    app.persist = function () {
      stateStore.persist(app.data);
    };

    app.renderAll = function () {
      moduleRegistry.renderAll(app);
    };

    app.setActiveModule = function (moduleKey) {
      navigation.setActiveModule(app, moduleKey);
      app.renderAll();
    };

    app.setActiveBillingView = function (viewKey) {
      if (ns.modules.sales && typeof ns.modules.sales.setActiveBillingView === "function") {
        ns.modules.sales.setActiveBillingView(app, viewKey);
      }
    };

    populateStateOptions(app.elements.companyStateSelect);
    populateStateOptions(app.elements.customerStateSelect);
    bindGlobalEvents(app);
    moduleRegistry.initAll(app);
    navigation.applySidebarState(app);

    if (ns.modules.customers) {
      ns.modules.customers.resetForm(app);
      customerSyncError = await ns.modules.customers.syncFromBackend(app, false);
    }

    app.setActiveModule(app.activeModule);

    if (customerSyncError && ns.modules.customers) {
      ns.modules.customers.setMessage(app, customerSyncError, "error");
    }

    // Keeping the app object on the namespace helps future modules and debugging.
    ns.app = app;
  }

  function bindGlobalEvents(app) {
    app.elements.featureButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        app.setActiveModule(button.dataset.module);
      });
    });

    if (app.elements.sidebarToggle) {
      app.elements.sidebarToggle.addEventListener("click", function () {
        navigation.toggleSidebar(app);
      });
    }

    app.elements.moduleMenu.addEventListener("click", function (event) {
      var target;

      if (event.target.dataset.billingView && typeof app.setActiveBillingView === "function") {
        app.setActiveBillingView(event.target.dataset.billingView);
        return;
      }

      if (!event.target.dataset.targetId) {
        return;
      }

      target = document.getElementById(event.target.dataset.targetId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function populateStateOptions(select) {
    select.innerHTML = config.STATES.map(function (stateName) {
      return '<option value="' + stateName + '">' + stateName + "</option>";
    }).join("");
  }

  init();
})(window.LedgerFlow);
