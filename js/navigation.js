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
    if (!app.elements.featureRail) {
      return;
    }

    app.elements.featureRail.classList.toggle("is-collapsed", app.isSidebarCollapsed);
    document.body.classList.toggle("sidebar-collapsed", app.isSidebarCollapsed);

    if (app.elements.sidebarToggle) {
      app.elements.sidebarToggle.setAttribute("aria-expanded", app.isSidebarCollapsed ? "false" : "true");
    }
  }

  function setActiveModule(app, moduleKey) {
    app.activeModule = config.MODULES[moduleKey] ? moduleKey : "dashboard";

    app.elements.featureButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.module === app.activeModule);
    });

    app.elements.moduleScreens.forEach(function (screen) {
      screen.classList.toggle("is-active", screen.dataset.module === app.activeModule);
    });

    app.elements.activeModuleTitle.textContent = config.MODULES[app.activeModule].title;
    app.elements.activeModuleDescription.textContent = config.MODULES[app.activeModule].description;
    app.elements.moduleMenuTitle.textContent = config.MODULES[app.activeModule].menuTitle;
    renderModuleMenu(app);
  }

  function renderModuleMenu(app) {
    app.elements.moduleMenu.innerHTML = config.MODULES[app.activeModule].menu.map(function (item) {
      return '<button class="module-menu__button" type="button" data-target-id="' + item.target + '">' + item.label + '</button>';
    }).join("");
  }

  ns.navigation = {
    toggleSidebar: toggleSidebar,
    applySidebarState: applySidebarState,
    setActiveModule: setActiveModule,
    renderModuleMenu: renderModuleMenu
  };
})(window.LedgerFlow);
