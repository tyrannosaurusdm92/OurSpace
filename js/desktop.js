(() => {
  "use strict";
  const DESKTOP_QUERY = "(min-width: 1200px)";
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
  const media = window.matchMedia(DESKTOP_QUERY);

  ready(() => {
    const apply = () => {
      if (!media.matches) {
        document.body.classList.remove("device-desktop-enhanced");
        if (document.body.dataset.deviceMode === "desktop") delete document.body.dataset.deviceMode;
        return;
      }
      document.body.dataset.deviceMode = "desktop";
      document.body.classList.add("device-desktop-enhanced");
      installDesktopShortcuts();
    };
    apply();
    media.addEventListener?.("change", apply);
  });

  let shortcutsInstalled = false;
  function installDesktopShortcuts() {
    if (shortcutsInstalled) return;
    shortcutsInstalled = true;
    document.addEventListener("keydown", (event) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName || "");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.getElementById("saveNowBtn")?.click();
        return;
      }
      if (event.key === "Escape") {
        document.getElementById("bdg-nav-details")?.removeAttribute("open");
        document.getElementById("floatingBot")?.classList.remove("open");
        return;
      }
      if (typing || !event.altKey) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0) return;
      const links = Array.from(document.querySelectorAll("#bdg-menu-links .bdg-link"));
      const target = links[index];
      if (target) {
        event.preventDefault();
        const page = target.dataset.page || target.dataset.target || (target.getAttribute("href") || "").replace(/^#/, "");
        if (page) location.hash = page;
      }
    });
  }
})();
