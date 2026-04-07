(function () {
  var THEME_KEY = "ledgerflow-theme";
  var toggle = document.getElementById("theme-toggle");

  if (!toggle) {
    return;
  }

  sync();

  toggle.addEventListener("click", function () {
    var nextTheme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
    sync();
  });

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function sync() {
    var dark = currentTheme() === "dark";
    toggle.textContent = dark ? "Light" : "Dark";
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
})();
