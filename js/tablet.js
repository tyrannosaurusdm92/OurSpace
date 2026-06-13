(() => {
  "use strict";
  const TABLET_QUERY = "(min-width: 768px) and (max-width: 1199px)";
  const ICONS = {
    "task-board": "🏠",
    "todays-routine": "🗓️",
    "chat-bot-dbt-skills": "🐈‍⬛",
    "dbt-daily-cards": "🃏",
    "dbt-journaling": "📓",
    "mobile-games": "🎮",
    serotonin: "✨",
    "squishy-store": "🛍️"
  };
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
  const media = window.matchMedia(TABLET_QUERY);

  ready(() => {
    const apply = () => {
      if (!media.matches) {
        document.body.classList.remove("device-tablet-enhanced");
        if (document.body.dataset.deviceMode === "tablet") delete document.body.dataset.deviceMode;
        removeRail();
        return;
      }
      document.body.dataset.deviceMode = "tablet";
      document.body.classList.add("device-tablet-enhanced");
      buildRail();
      syncActiveRail();
      installTabletHooks();
    };
    apply();
    media.addEventListener?.("change", apply);
    window.addEventListener("jcc:pagechange", syncActiveRail);
    window.addEventListener("hashchange", syncActiveRail);
  });

  function navLinks() {
    const links = Array.from(document.querySelectorAll("#bdg-menu-links .bdg-link, .nav-link"));
    const seen = new Set();
    return links.filter((link) => {
      const page = link.dataset.page || link.dataset.target || (link.getAttribute("href") || "").replace(/^#/, "");
      if (!page || seen.has(page)) return false;
      seen.add(page);
      return true;
    });
  }

  function buildRail() {
    let rail = document.getElementById("jccTabletRail");
    if (!rail) {
      rail = document.createElement("nav");
      rail.id = "jccTabletRail";
      rail.className = "app-device-rail";
      rail.setAttribute("aria-label", "Tablet page navigation");
      document.body.appendChild(rail);
    }
    rail.innerHTML = navLinks().map((link) => {
      const page = link.dataset.page || link.dataset.target || (link.getAttribute("href") || "").replace(/^#/, "");
      const label = (link.textContent || page).trim();
      return `<button type="button" data-tablet-page="${escapeAttr(page)}" aria-label="Open ${escapeAttr(label)}"><span class="rail-emoji">${ICONS[page] || "✨"}</span><span class="rail-label">${escapeHtml(label)}</span></button>`;
    }).join("");
    rail.querySelectorAll("[data-tablet-page]").forEach((button) => button.addEventListener("click", () => { location.hash = button.dataset.tabletPage; }));
  }

  function removeRail() { document.getElementById("jccTabletRail")?.remove(); }

  function syncActiveRail() {
    const active = document.body.dataset.activePage || (location.hash || "#task-board").slice(1) || "task-board";
    document.querySelectorAll("[data-tablet-page]").forEach((button) => {
      const on = button.dataset.tabletPage === active;
      button.classList.toggle("active", on);
      if (on) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  let hooksInstalled = false;
  function installTabletHooks() {
    if (hooksInstalled) return;
    hooksInstalled = true;
    window.addEventListener("jcc:pagechange", () => document.getElementById("bdg-nav-details")?.removeAttribute("open"));
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
})();
