window.LedgerFlow = window.LedgerFlow || {};

(function (ns) {
  var config = ns.config;

  // Navigation owns module switching and the collapsible sidebar state.
  function toggleSidebar(app) {
    app.isSidebarCollapsed = !app.isSidebarCollapsed;
    window.localStorage.setItem(config.STORAGE_KEYS.sidebar, String(app.isSidebarCollapsed));
    applySidebarState(app);
  }

  function applySidebarState(app) {
    var isCollapsed;

    if (!app.elements.featureRail) {
      return;
    }

    isCollapsed = !!app.isSidebarCollapsed;

    app.elements.featureRail.classList.toggle("is-collapsed", isCollapsed);
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);

    if (app.elements.sidebarToggle) {
      app.elements.sidebarToggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      app.elements.sidebarToggle.setAttribute("aria-label", isCollapsed ? "Expand feature panel" : "Collapse feature panel");
      app.elements.sidebarToggle.innerHTML = '<span id="sidebar-toggle-icon" aria-hidden="true">' + (isCollapsed ? "&rarr;" : "&larr;") + "</span>";
    }
  }

  function setActiveModule(app, moduleKey) {
    app.activeModule = config.MODULES[moduleKey] ? moduleKey : "dashboard";

    // Clear stale Quick Bill focus classes from older flows before toggling the new state.
    document.body.classList.remove("quick-bill-focus", "quick-bill-toolbar-hidden");
    document.body.classList.toggle("quickbill-mobile-active", app.activeModule === "quickbill");
    // Show site header (Unidex ERP brand + theme toggle) only on the Settings/Admin screen in PWA.
    document.body.classList.toggle("admin-active", app.activeModule === "admin");

    app.elements.featureButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.module === app.activeModule);
    });

    app.elements.moduleScreens.forEach(function (screen) {
      screen.classList.toggle("is-active", screen.dataset.module === app.activeModule);
    });

    // Keep the toolbar hidden while Quick Bill is the active sales subview.
    var toolbar = document.querySelector(".workspace-toolbar");
    if (toolbar) {
      toolbar.style.display = app.activeModule === "quickbill" ? "none" : "grid";
    }

    if (app.elements.activeModuleTitle) {
      app.elements.activeModuleTitle.textContent = config.MODULES[app.activeModule].title;
    }

    if (app.elements.activeModuleDescription) {
      app.elements.activeModuleDescription.textContent = config.MODULES[app.activeModule].description;
    }

    if (app.elements.moduleMenuTitle) {
      app.elements.moduleMenuTitle.textContent = config.MODULES[app.activeModule].menuTitle;
    }

    renderModuleMenu(app);
  }

  function renderModuleMenu(app) {
    app.elements.moduleMenu.innerHTML = config.MODULES[app.activeModule].menu.map(function (item) {
      var isActiveBillingView = app.activeModule === "sales" && item.view && item.view === app.activeBillingView;
      var activeClass = isActiveBillingView ? " is-active" : "";
      var billingViewAttribute = item.view ? ' data-billing-view="' + item.view + '"' : "";

      return '<button class="module-menu__button' + activeClass + '" type="button" data-target-id="' + item.target + '"' + billingViewAttribute + ">" + item.label + "</button>";
    }).join("");
  }

  ns.navigation = {
    toggleSidebar: toggleSidebar,
    applySidebarState: applySidebarState,
    setActiveModule: setActiveModule,
    renderModuleMenu: renderModuleMenu
  };
})(window.LedgerFlow);
