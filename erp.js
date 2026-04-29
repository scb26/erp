window.Unidex = window.Unidex || {};

(function (ns) {
  var config = ns.config;
  var dom = ns.dom;
  var moduleRegistry = ns.moduleRegistry;
  var navigation = ns.navigation;
  var stateStore = ns.stateStore;

  // The bootstrap now focuses on app startup and lets each ERP module own its own behavior.
  async function init() {
    console.log("🚀 Starting Unidex ERP...");
    var elements = dom.collect();
    var app;
    var loader = document.getElementById("global-sync-loader");

    if (!elements.isReady) {
      return;
    }

    if (loader) loader.classList.remove("hidden");

    app = {
      elements: elements,
      data: stateStore.hydrate(),
      previewInvoice: null,
      activeModule: "dashboard",
      activeBillingView: "invoice",
      activeProductView: "inventory",
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
      // Re-bind admin tab buttons each time the admin module becomes active,
      // because navigation.renderModuleMenu() re-creates the DOM nodes.
      if (moduleKey === "admin" && app._bindAdminTabs) {
        app._bindAdminTabs();
      }
    };

    app.setActiveBillingView = function (viewKey) {
      if (ns.modules.sales && typeof ns.modules.sales.setActiveBillingView === "function") {
        ns.modules.sales.setActiveBillingView(app, viewKey);
      }
    };

    app.setActiveInventoryView = function (viewKey) {
      if (ns.modules.inventory && typeof ns.modules.inventory.setActiveInventoryView === "function") {
        ns.modules.inventory.setActiveInventoryView(app, viewKey);
      }
    };

    populateStateOptions(app.elements.companyStateSelect);
    populateStateOptions(app.elements.customerStateSelect);
    bindGlobalEvents(app);

    // Synchronize with live backend BEFORE initializing modules
    try {
      await stateStore.syncAll(app);
      console.log("✅ Sync complete.");
    } catch (err) {
      console.warn("Initial sync had issues:", err.message);
    }

    moduleRegistry.initAll(app);
    navigation.applySidebarState(app);
    app.setActiveModule(app.activeModule);

    // Emergency Unlock: If sync hangs for more than 10 seconds, force hide the loader
    setTimeout(function () {
      if (loader && !loader.classList.contains("hidden")) {
        console.warn("Sync taking too long, emergency unlocking UI...");
        loader.classList.add("hidden");
      }
    }, 10000);

    // Keeping the app object on the namespace helps future modules and debugging.
    ns.app = app;

    if (loader) {
      setTimeout(function() {
        loader.classList.add("hidden");
      }, 500);
    }
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
      if (event.target.dataset.subView) {
        if (app.activeModule === "sales" && typeof app.setActiveBillingView === "function") {
          app.setActiveBillingView(event.target.dataset.subView);
        } else if (app.activeModule === "inventory" && typeof app.setActiveInventoryView === "function") {
          app.setActiveInventoryView(event.target.dataset.subView);
        }
        return;
      }

      // Admin tab buttons are handled by bindAdminTabs — skip scrollIntoView.
      if (event.target.dataset.adminTab) {
        return;
      }

      if (!event.target.dataset.targetId) {
        return;
      }

      var target = document.getElementById(event.target.dataset.targetId);

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
})(window.Unidex);
