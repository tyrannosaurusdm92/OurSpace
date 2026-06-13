(() => {
  "use strict";
  const MOBILE_QUERY = "(max-width: 767px)";
  const ICONS = {
    "task-board": "🏠",
    "todays-routine": "🗓️",
    "chat-bot-dbt-skills": "💬",
    "dbt-daily-cards": "🃏",
    "dbt-journaling": "📓",
    "mobile-games": "🎮",
    serotonin: "✨",
    "squishy-store": "🛍️"
  };
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
  const media = window.matchMedia(MOBILE_QUERY);

  ready(() => {
    const apply = () => {
      if (!media.matches) {
        document.body.classList.remove("device-mobile-enhanced");
        if (document.body.dataset.deviceMode === "mobile") delete document.body.dataset.deviceMode;
        removeRail();
        return;
      }
      document.body.dataset.deviceMode = "mobile";
      document.body.classList.add("device-mobile-enhanced");
      buildRail();
      syncActiveRail();
      installMobileComfortHooks();
    };
    apply();
    media.addEventListener?.("change", apply);
    window.addEventListener("jcc:pagechange", syncActiveRail);
    window.addEventListener("hashchange", syncActiveRail);
  });

  function navLinks() {
    return Array.from(document.querySelectorAll("#bdg-menu-links .bdg-link, .nav-link"))
      .filter((link, index, arr) => {
        const page = link.dataset.page || link.dataset.target || (link.getAttribute("href") || "").replace(/^#/, "");
        return page && arr.findIndex((x) => (x.dataset.page || x.dataset.target || (x.getAttribute("href") || "").replace(/^#/, "")) === page) === index;
      });
  }

  function buildRail() {
    let rail = document.getElementById("jccDeviceRail");
    if (!rail) {
      rail = document.createElement("nav");
      rail.id = "jccDeviceRail";
      rail.className = "app-device-rail";
      rail.setAttribute("aria-label", "Mobile app page navigation");
      document.body.appendChild(rail);
    }
    const links = navLinks();
    rail.innerHTML = links.map((link) => {
      const page = link.dataset.page || link.dataset.target || (link.getAttribute("href") || "").replace(/^#/, "");
      const label = (link.textContent || page).trim();
      const icon = ICONS[page] || "✨";
      return `<button type="button" data-mobile-page="${escapeAttr(page)}" aria-label="Open ${escapeAttr(label)}"><span class="rail-emoji">${icon}</span><span class="rail-label">${escapeHtml(label)}</span></button>`;
    }).join("");
    rail.querySelectorAll("[data-mobile-page]").forEach((button) => {
      button.addEventListener("click", () => {
        location.hash = button.dataset.mobilePage;
        document.getElementById("bdg-nav-details")?.removeAttribute("open");
      });
    });
  }

  function removeRail() {
    document.getElementById("jccDeviceRail")?.remove();
  }

  function syncActiveRail() {
    const active = document.body.dataset.activePage || (location.hash || "#task-board").slice(1) || "task-board";
    document.querySelectorAll("[data-mobile-page]").forEach((button) => {
      const on = button.dataset.mobilePage === active;
      button.classList.toggle("active", on);
      if (on) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  let hooksInstalled = false;
  function installMobileComfortHooks() {
    if (hooksInstalled) return;
    hooksInstalled = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      const frame = document.getElementById("gameFrame");
      try { frame?.contentWindow?.postMessage({ type: "jasperGamePauseAndSave", reason: "mobile app hidden", at: new Date().toISOString() }, "*"); } catch {}
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => document.querySelector(".page-panel.active")?.scrollIntoView({ block: "start" }), 250);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
})();
