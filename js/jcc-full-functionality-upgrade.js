(() => {
  "use strict";
  const STORAGE_KEY = "jasper-squishy-care-cottage-v3";
  const OVERLAY_LAYOUT_KEY = "jcc-full-upgrade-window-layout-v1";
  const TYPEFORM_ALERT_URL = "https://form.typeform.com/to/trAqvrRG";
  const CHECKOUT_EMAIL = "williamsaville92@gmail.com";
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const attr = (value) => esc(value).replace(/`/g,"&#96;");
  const api = () => window.JCC_APP || null;
  const isReady = () => !!(window.JCC_APP && document.body);
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, {once:true}) : fn();

  ready(() => {
    waitForApi(() => {
      if (window.__JCC_FULL_UPGRADE_INSTALLED__) return;
      window.__JCC_FULL_UPGRADE_INSTALLED__ = true;
      installNavTracker();
      installPageResetButtons();
      installTodayTaskSearch();
      installJournalPdfExport();
      installDiaryExportLabels();
      installExternalPortal();
      installGameShell();
      installAlertSignupCards();
      installFloatingWindowControls();
      installCheckoutStatus();
      installRenderObservers();
      toast("Full mobile-first module/window upgrade loaded.");
    });
  });

  function waitForApi(fn){
    if (isReady()) return fn();
    window.addEventListener("jcc:api-ready", () => fn(), {once:true});
    let tries = 0;
    const timer = setInterval(() => {
      if (isReady() || ++tries > 80){ clearInterval(timer); if (isReady()) fn(); }
    }, 100);
  }

  function getState(){
    if (api()?.getState) return api().getState();
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  function saveState(state){
    if (api()?.saveState) return api().saveState();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  function renderAll(){ api()?.renderAll?.(); renderTodaySearchResults(); }
  function todayKey(){ return api()?.todayKey?.() || new Date().toISOString().slice(0,10); }
  function toast(message){
    if (api()?.toast) return api().toast(message);
    const host = $("#toastHost") || document.body.appendChild(Object.assign(document.createElement("div"), {id:"toastHost", className:"toast-host"}));
    const el = document.createElement("div"); el.className = "toast"; el.textContent = message; host.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function installNavTracker(){
    const details = $("#bdg-nav-details");
    const menu = $("#bdg-menu-links");
    const tracker = $("#jcc-persistent-tracker");
    if (!details || !menu || !tracker || tracker.classList.contains("nav-embedded-tracker")) return;
    tracker.classList.add("nav-embedded-tracker");
    menu.prepend(tracker);
    const alertButton = document.createElement("button");
    alertButton.type = "button";
    alertButton.className = "soft-button jcc-nav-alert-button";
    alertButton.textContent = "📬 Sign up for Jasper alerts";
    alertButton.addEventListener("click", () => openExternalPortal(TYPEFORM_ALERT_URL, "Jasper phone + email alert signup"));
    tracker.after(alertButton);
  }

  function installPageResetButtons(){
    $$(".page-panel").forEach(panel => {
      const heading = panel.querySelector(".page-heading");
      if (!heading || heading.querySelector(".jcc-page-reset-row")) return;
      const row = document.createElement("div");
      row.className = "jcc-page-reset-row";
      row.innerHTML = `<button type="button" class="jcc-collapse-page">Collapse page modules</button><button type="button" class="jcc-expand-page">Expand page modules</button><button type="button" class="jcc-reset-page">Reset modules</button>`;
      row.querySelector(".jcc-collapse-page").addEventListener("click", () => setPageCollapsed(panel, true));
      row.querySelector(".jcc-expand-page").addEventListener("click", () => setPageCollapsed(panel, false));
      row.querySelector(".jcc-reset-page").addEventListener("click", () => resetPageModules(panel));
      heading.appendChild(row);
    });
    const headerReset = $("#resetLayout");
    if (headerReset && !headerReset.dataset.fullUpgradeReset){
      headerReset.dataset.fullUpgradeReset = "1";
      headerReset.addEventListener("click", clearOverlayLayouts, {capture:true});
    }
  }

  function setPageCollapsed(panel, collapsed){
    panel.querySelectorAll(".module").forEach(module => module.classList.toggle("minimized", collapsed));
    persistCoreLayout();
    toast(collapsed ? "Page modules collapsed into bubbles." : "Page modules expanded.");
  }
  function resetPageModules(panel){
    panel.querySelectorAll(".module").forEach(module => {
      module.classList.remove("minimized", "is-dragging", "game-fullscreen");
      module.style.transform = "";
      delete module.dataset.x; delete module.dataset.y;
    });
    const state = getState();
    if (state.layout){
      panel.querySelectorAll(".module").forEach(module => { const key = module.id || module.dataset.key; if (key) delete state.layout[key]; });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    }
    persistCoreLayout();
    toast("This page's modules were reset.");
  }
  function clearOverlayLayouts(){ try { localStorage.removeItem(OVERLAY_LAYOUT_KEY); } catch {} }
  function persistCoreLayout(){ try { api()?.saveState?.(); } catch {} }

  function installTodayTaskSearch(){
    const grid = $("#todays-routine .module-grid");
    if (!grid || $("#todayTaskSearchModule")) return;
    const module = document.createElement("section");
    module.className = "module movable wide";
    module.id = "todayTaskSearchModule";
    module.dataset.key = "today-task-search";
    module.innerHTML = `<div class="module-header drag-handle"><span class="module-title">Add / Remove Tasks From Today's Schedule</span><button class="mini-button" data-collapse type="button">Bubble</button></div><div class="module-body"><div class="today-task-search-tools"><input class="text-input" id="todayTaskSearchInput" placeholder="Search all tasks to add, remove, hide, or complete today…" /><select id="todayTaskSearchFilter"><option value="all">All areas</option></select><p class="soft-note">Daily tasks can be hidden for today only. Weekly/monthly/as-needed tasks can be added to or removed from today.</p></div><div id="todayTaskSearchResults" class="today-task-search-results"></div></div>`;
    grid.insertBefore(module, grid.firstElementChild?.nextSibling || null);
    const areas = [...new Set((api()?.allTasks?.() || []).map(t => t.room).filter(Boolean))].sort();
    const select = $("#todayTaskSearchFilter", module);
    select.insertAdjacentHTML("beforeend", areas.map(area => `<option value="${attr(area)}">${esc(area)}</option>`).join(""));
    $("#todayTaskSearchInput", module).addEventListener("input", renderTodaySearchResults);
    select.addEventListener("input", renderTodaySearchResults);
    module.addEventListener("click", (event) => {
      const add = event.target.closest("[data-today-add]");
      const remove = event.target.closest("[data-today-remove]");
      const complete = event.target.closest("[data-today-complete]");
      if (add) { api()?.addToToday?.(add.dataset.todayAdd); setTimeout(renderTodaySearchResults, 80); }
      if (remove) { api()?.removeFromToday?.(remove.dataset.todayRemove); setTimeout(renderTodaySearchResults, 80); }
      if (complete) { api()?.completeTask?.(complete.dataset.todayComplete); setTimeout(renderTodaySearchResults, 80); }
    });
    makeDraggable(module, "today-task-search");
    renderTodaySearchResults();
  }

  function renderTodaySearchResults(){
    const host = $("#todayTaskSearchResults");
    if (!host || !api()?.allTasks) return;
    const q = ($("#todayTaskSearchInput")?.value || "").toLowerCase().trim();
    const filter = $("#todayTaskSearchFilter")?.value || "all";
    const state = getState();
    const today = todayKey();
    const added = new Set(state.todayAdded?.[today] || []);
    const hidden = new Set(state.todayHidden?.[today] || []);
    const day = new Intl.DateTimeFormat("en-US", {weekday:"short"}).format(new Date());
    const weekday = !["Sat", "Sun"].includes(day);
    const autoIds = new Set((api().allTasks() || []).filter(t => t.frequency === "daily" || (t.frequency === "weekday" && weekday)).map(t => t.id));
    const tasks = (api().allTasks() || []).filter(task => {
      const text = JSON.stringify(task).toLowerCase();
      return (!q || text.includes(q)) && (filter === "all" || task.room === filter);
    }).slice(0, 80);
    host.innerHTML = tasks.map(task => {
      const scheduled = (autoIds.has(task.id) || added.has(task.id)) && !hidden.has(task.id);
      const auto = autoIds.has(task.id);
      return `<article class="today-task-result"><div><h4>${esc(task.name)}</h4><p>${esc(task.details || "")}</p><small>${esc(task.room)} • ${esc(task.priority)} • ${esc(task.frequency)}${scheduled ? " • currently on today" : ""}${hidden.has(task.id) ? " • hidden today" : ""}</small></div><div class="actions"><button class="soft-button" type="button" data-today-add="${attr(task.id)}">${scheduled ? "Keep on today" : hidden.has(task.id) ? "Unhide / add" : "Add to today"}</button><button class="ghost-button" type="button" data-today-remove="${attr(task.id)}">${auto ? "Hide today" : "Remove today"}</button><button class="complete-button" type="button" data-today-complete="${attr(task.id)}">Complete + earn</button></div></article>`;
    }).join("") || `<p class="soft-note">No tasks match that search.</p>`;
  }

  function installJournalPdfExport(){
    const row = $("#dbt-journaling .tiny-actions");
    if (!row || $("#exportJournalsPdf")) return;
    const btn = document.createElement("button");
    btn.className = "soft-button";
    btn.type = "button";
    btn.id = "exportJournalsPdf";
    btn.textContent = "Export PDF";
    btn.addEventListener("click", exportJournalsPdf);
    const docx = $("#exportJournalsDocx");
    if (docx) docx.insertAdjacentElement("afterend", btn); else row.appendChild(btn);
    const hint = document.createElement("p");
    hint.className = "journal-pdf-hint";
    hint.textContent = "Journals can be saved as TXT or PDF. DOCX is kept as an extra backup option.";
    row.insertAdjacentElement("afterend", hint);
  }
  function installDiaryExportLabels(){
    const png = $("#exportDiaryPng");
    if (png) png.textContent = "Export Image (PNG)";
  }
  function exportJournalsPdf(){
    const state = getState();
    const currentTitle = ($("#journalTitle")?.value || "").trim();
    const currentBody = ($("#journalText")?.value || "").trim();
    const currentPrompt = ($("#journalPrompt")?.textContent || "").trim();
    const entries = [...(state.journals || [])];
    if (currentBody) entries.unshift({title: currentTitle || "Unsaved current journal", date: todayKey(), prompt: currentPrompt, body: currentBody});
    if (!entries.length) return toast("Save or write a journal entry first.");
    const text = entries.map(j => `${j.title || "Journal"}\n${j.date || todayKey()}\nPrompt: ${j.prompt || ""}\n\n${j.body || ""}`).join("\n\n---\n\n");
    const blob = api()?.makeSimplePdf ? api().makeSimplePdf(text) : makeSimplePdf(text);
    (api()?.downloadBlob || downloadBlob)(blob, `jasper-journals-${todayKey()}.pdf`);
    toast("Journal PDF exported.");
  }

  function installExternalPortal(){
    if (!$("#jccExternalPortal")) {
      const portal = document.createElement("aside");
      portal.id = "jccExternalPortal";
      portal.className = "jcc-external-portal jcc-floating-window";
      portal.innerHTML = `<div class="jcc-window-head"><div class="jcc-window-title"><strong id="jccExternalTitle">Outside site</strong><small id="jccExternalUrl"></small></div><div class="jcc-window-actions"><button type="button" class="primary" id="jccExternalBack">Back to cottage</button><a id="jccExternalOpenTab" href="#" target="_blank" rel="noopener">Open tab</a><button type="button" id="jccExternalMinimize">Bubble</button></div></div><div class="jcc-external-frame-wrap"><iframe id="jccExternalFrame" title="Outside site preview"></iframe><p class="jcc-frame-note">Some outside sites block in-site previews. Use “Open tab,” then come back here with “Back to cottage.”</p></div>`;
      document.body.appendChild(portal);
      $("#jccExternalBack", portal).addEventListener("click", closeExternalPortal);
      $("#jccExternalMinimize", portal).addEventListener("click", () => portal.classList.toggle("minimized"));
      makeDraggable(portal, "external-portal");
    }
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a[href]");
      if (!anchor || anchor.closest("#jccExternalPortal")) return;
      const href = anchor.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const label = (anchor.textContent || anchor.getAttribute("aria-label") || "Outside site").trim();
      event.preventDefault();
      openExternalPortal(anchor.href, label);
    }, true);
    window.openJccExternalPortal = openExternalPortal;
  }
  function openExternalPortal(url, title="Outside site"){
    const portal = $("#jccExternalPortal");
    if (!portal) return window.open(url, "_blank", "noopener");
    portal.classList.add("open");
    portal.classList.remove("minimized");
    $("#jccExternalTitle").textContent = title || "Outside site";
    $("#jccExternalUrl").textContent = url;
    $("#jccExternalOpenTab").href = url;
    $("#jccExternalFrame").src = url;
  }
  function closeExternalPortal(){
    const portal = $("#jccExternalPortal");
    if (!portal) return;
    portal.classList.remove("open", "minimized");
    const frame = $("#jccExternalFrame");
    if (frame) frame.src = "about:blank";
  }

  function installGameShell(){
    const frame = $("#gameFrame");
    const module = $('.module[data-key="games-module"]');
    if (!frame || !module || $("#jccGameTopbar")) return;
    const bar = document.createElement("div");
    bar.id = "jccGameTopbar";
    bar.className = "jcc-game-topbar";
    bar.innerHTML = `<span class="game-status">🎮 Mobile game mode: site home button + save/exit ready</span><div class="jcc-game-actions"><button type="button" class="primary" id="jccGameFullscreen">Take over screen</button><button type="button" id="jccGameHome">🏡 Site home</button><button type="button" id="jccGameExit">Save + exit game</button><button type="button" id="jccGameOpenTab">Open game tab</button></div>`;
    frame.parentElement.insertBefore(bar, frame);
    $("#jccGameFullscreen").addEventListener("click", () => { module.classList.toggle("game-fullscreen"); injectParentHomeOverlay(); });
    $("#jccGameHome").addEventListener("click", () => { api()?.quitActiveGame?.("site home button"); module.classList.remove("game-fullscreen"); location.hash = "task-board"; });
    $("#jccGameExit").addEventListener("click", () => { api()?.quitActiveGame?.("manual save and exit button"); module.classList.remove("game-fullscreen"); });
    $("#jccGameOpenTab").addEventListener("click", () => {
      const url = frame.getAttribute("src") || $("#gameSelect")?.value;
      if (url && url !== "about:blank") window.open(url, "_blank", "noopener");
      else toast("Load a game first.");
    });
    frame.addEventListener("load", () => { injectGameHomeButton(); injectParentHomeOverlay(); });
    window.addEventListener("message", (event) => {
      if (event.data?.type === "jccGameHome") { api()?.quitActiveGame?.("game iframe home button"); module.classList.remove("game-fullscreen"); location.hash = "task-board"; }
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") api()?.quitActiveGame?.("browser/app hidden"); });
    window.addEventListener("beforeunload", () => { try { api()?.quitActiveGame?.("page leaving"); } catch {} });
    document.addEventListener("click", (event) => {
      const collapse = event.target.closest('[data-collapse]');
      if (collapse && collapse.closest('.module[data-key="games-module"]')) setTimeout(() => api()?.quitActiveGame?.("game module collapsed"), 10);
    }, true);
  }
  function injectParentHomeOverlay(){
    const module = $('.module[data-key="games-module"]');
    if (!module || !module.classList.contains("game-fullscreen")) { $("#jccParentGameHome")?.remove(); return; }
    if ($("#jccParentGameHome")) return;
    const button = document.createElement("button");
    button.id = "jccParentGameHome";
    button.type = "button";
    button.className = "jcc-game-home-overlay";
    button.textContent = "🏡 Site home";
    button.addEventListener("click", () => { api()?.quitActiveGame?.("parent overlay home button"); module.classList.remove("game-fullscreen"); location.hash = "task-board"; });
    module.appendChild(button);
  }
  function injectGameHomeButton(){
    const frame = $("#gameFrame");
    try {
      const doc = frame?.contentDocument;
      if (!doc || doc.getElementById("jccGameInsideHome")) return;
      const btn = doc.createElement("button");
      btn.id = "jccGameInsideHome";
      btn.type = "button";
      btn.textContent = "🏡 Site home";
      btn.setAttribute("style", "position:fixed;z-index:2147483647;top:10px;left:10px;border:0;border-radius:999px;padding:9px 12px;background:#ffe59b;color:#201327;font:bold 14px system-ui;box-shadow:0 8px 20px rgba(0,0,0,.28);cursor:pointer");
      btn.addEventListener("click", () => parent.postMessage({type:"jccGameHome"}, "*"));
      doc.body.appendChild(btn);
    } catch {}
  }

  function installAlertSignupCards(){
    const chatModuleBody = $('.module[data-key="support-chat"] .module-body');
    if (chatModuleBody && !$("#jccAlertSignupCard")) {
      const card = document.createElement("div");
      card.id = "jccAlertSignupCard";
      card.className = "jcc-alert-card";
      card.innerHTML = `<h3>Phone + email alert signup</h3><p>Use the Typeform/Trueform alert signup for care nudges, meals, hydration, meds-as-prescribed reminders, decompression, task starts, and check-ins.</p><div class="jcc-alert-actions"><button type="button" class="soft-button" id="jccOpenAlertSignup">Open alert signup</button><button type="button" class="ghost-button" id="jccAskOnyxAlerts">Ask Onyx about alerts</button></div>`;
      chatModuleBody.insertBefore(card, chatModuleBody.firstElementChild?.nextSibling || chatModuleBody.firstElementChild);
      $("#jccOpenAlertSignup", card).addEventListener("click", () => openExternalPortal(TYPEFORM_ALERT_URL, "Jasper phone + email alert signup"));
      $("#jccAskOnyxAlerts", card).addEventListener("click", () => {
        const input = $("#chatInput");
        if (input) { input.value = "Onyx, help me sign up for phone and email care alerts and choose which reminders Jasper needs."; $("#chatForm")?.dispatchEvent(new Event("submit", {bubbles:true, cancelable:true})); }
      });
    }
  }

  function installFloatingWindowControls(){
    const bot = $("#floatingBot");
    if (bot && !bot.classList.contains("jcc-floating-window")) {
      bot.classList.add("jcc-floating-window");
      const head = bot.querySelector(".floating-bot-head");
      if (head && !head.querySelector(".jcc-window-mini")) {
        const mini = document.createElement("button");
        mini.type = "button"; mini.className = "jcc-window-mini"; mini.textContent = "Bubble";
        mini.addEventListener("click", () => bot.classList.toggle("minimized"));
        head.insertBefore(mini, head.querySelector("#closeFloatingBot"));
        makeDraggable(bot, "floating-onyx");
      }
    }
  }

  function installCheckoutStatus(){
    const cartBody = $('.module[data-key="cart"] .module-body');
    if (!cartBody || $("#checkoutEmailStatus")) return;
    const status = document.createElement("div");
    status.id = "checkoutEmailStatus";
    status.className = "checkout-email-status";
    status.innerHTML = `<strong>Checkout email:</strong> Orders open an email to <code>${CHECKOUT_EMAIL}</code>, copy the email body when the browser allows it, and download a TXT backup so the request is not lost.`;
    cartBody.appendChild(status);
  }

  function installRenderObservers(){
    window.addEventListener("jcc:pagechange", () => { installPageResetButtons(); renderTodaySearchResults(); injectParentHomeOverlay(); });
    const host = $("#todayTaskList");
    if (host) new MutationObserver(() => renderTodaySearchResults()).observe(host, {childList:true, subtree:false});
  }

  function makeDraggable(el, key){
    if (!el || el.dataset.jccDragInstalled) return;
    el.dataset.jccDragInstalled = "1";
    const handle = el.querySelector(".jcc-window-head,.module-header,.floating-bot-head,.drag-handle") || el;
    restoreOverlayPosition(el, key);
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    handle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button,a,input,textarea,select,summary")) return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      sx = event.clientX; sy = event.clientY; ox = rect.left; oy = rect.top;
      el.classList.add("is-dragging");
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });
    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      if (getComputedStyle(el).position !== "fixed") el.style.position = "relative";
      if (el.classList.contains("module")) {
        const x = Number(el.dataset.x || 0) + event.movementX;
        const y = Number(el.dataset.y || 0) + event.movementY;
        el.dataset.x = x; el.dataset.y = y; el.style.transform = `translate3d(${x}px,${y}px,0)`;
      } else {
        const next = clamp(el, ox + event.clientX - sx, oy + event.clientY - sy);
        el.style.left = `${next.x}px`; el.style.top = `${next.y}px`; el.style.right = "auto"; el.style.bottom = "auto";
      }
    });
    handle.addEventListener("pointerup", (event) => {
      if (!dragging) return;
      dragging = false; el.classList.remove("is-dragging");
      try { handle.releasePointerCapture(event.pointerId); } catch {}
      saveOverlayPosition(el, key);
      persistCoreLayout();
    });
  }
  function clamp(el, x, y){
    const rect = el.getBoundingClientRect();
    return {x: Math.min(Math.max(4, x), Math.max(4, innerWidth - Math.min(rect.width, innerWidth) - 4)), y: Math.min(Math.max(4, y), Math.max(4, innerHeight - Math.min(rect.height, innerHeight) - 4))};
  }
  function overlayLayout(){ try { return JSON.parse(localStorage.getItem(OVERLAY_LAYOUT_KEY) || "{}"); } catch { return {}; } }
  function saveOverlayPosition(el, key){
    if (el.classList.contains("module")) return;
    const rect = el.getBoundingClientRect();
    const layout = overlayLayout();
    layout[key] = {x: rect.left, y: rect.top, minimized: el.classList.contains("minimized")};
    try { localStorage.setItem(OVERLAY_LAYOUT_KEY, JSON.stringify(layout)); } catch {}
  }
  function restoreOverlayPosition(el, key){
    const pos = overlayLayout()[key];
    if (!pos || el.classList.contains("module")) return;
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; el.style.right = "auto"; el.style.bottom = "auto";
    el.classList.toggle("minimized", !!pos.minimized);
  }

  function makeSimplePdf(text){
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    const pages = [];
    const maxLines = 42;
    for (let i=0; i<lines.length; i+=maxLines) pages.push(lines.slice(i, i+maxLines));
    if (!pages.length) pages.push([""]);
    const objects = [];
    const add = (s) => (objects.push(s), objects.length);
    const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds = [];
    pages.forEach(pageLines => {
      const content = "BT /F1 12 Tf 50 770 Td 14 TL " + pageLines.flatMap(line => wrapPdfLine(line, 92)).map(line => `(${pdfEscape(line)}) Tj T*`).join(" ") + " ET";
      const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    });
    const pagesId = objects.length + 1;
    pageIds.forEach(id => { objects[id-1] = objects[id-1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`); });
    const pagesObj = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    objects.push(pagesObj);
    const catalogId = objects.length + 1;
    objects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i+1} 0 obj\n${obj}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n` + offsets.slice(1).map(n => String(n).padStart(10,"0") + " 00000 n ").join("\n") + `\ntrailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], {type:"application/pdf"});
  }
  function wrapPdfLine(line, width){
    const words = String(line || "").split(/\s+/); const out=[]; let cur="";
    words.forEach(word => { if ((cur + " " + word).trim().length > width) { out.push(cur); cur = word; } else cur = (cur + " " + word).trim(); });
    out.push(cur); return out.length ? out : [""];
  }
  function pdfEscape(s){ return String(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"); }
  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();

/* Added final merge layer: direct Zapier webhook checkout + alert signup, no separate Onyx page dependency. */
(() => {
  "use strict";
  const STORAGE_KEY = "jasper-squishy-care-cottage-v3";
  const ZAPIER_WEBHOOK = "https://hooks.zapier.com/hooks/catch/27929806/435nrda/";
  const CAREGIVER_EMAIL = "williamsaville92@gmail.com";
  const TYPEFORM_ALERT_URL = "https://form.typeform.com/to/trAqvrRG";
  const $ = (sel, root=document) => root.querySelector(sel);
  const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const attr = (value) => esc(value).replace(/`/g, "&#96;");
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, {once:true}) : fn();
  ready(() => waitForApp(() => {
    replaceAlertSignupWithWebhookForm();
    installCheckoutWebhookCapture();
    installMergedOnyxButtons();
  }));

  function waitForApp(fn){
    if (window.JCC_APP) return fn();
    window.addEventListener("jcc:api-ready", () => fn(), {once:true});
    let tries = 0;
    const t = setInterval(() => { if (window.JCC_APP || ++tries > 80){ clearInterval(t); if(window.JCC_APP) fn(); } }, 100);
  }
  function getState(){
    try { return window.JCC_APP?.getState?.() || JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function toast(msg){ window.JCC_APP?.toast?.(msg); }
  function currencyToCopper(r){ return Math.max(0,Math.floor(Number(r?.copper||0)))+Math.max(0,Math.floor(Number(r?.silver||0)))*10+Math.max(0,Math.floor(Number(r?.gold||0)))*100+Math.max(0,Math.floor(Number(r?.platinum||0)))*1000; }
  function formatCurrency(r){ const c=normalizeCurrency(r||{}); return `${c.platinum} Platinum, ${c.gold} Gold, ${c.silver} Silver, ${c.copper} Copper`; }
  function normalizeCurrency(r){ let total=currencyToCopper(r); const platinum=Math.floor(total/1000); total%=1000; const gold=Math.floor(total/100); total%=100; const silver=Math.floor(total/10); const copper=total%10; return {copper,silver,gold,platinum}; }
  function sumCosts(items){ return normalizeCurrency((items||[]).reduce((acc,item)=>acc+currencyToCopper(item.cost||{}),0)); }
  async function postZapier(payload){
    const body = JSON.stringify({...payload, notifyEmail: CAREGIVER_EMAIL, send_to: CAREGIVER_EMAIL, timestamp: new Date().toISOString(), source: "SquishyRewards GitHub Pages"});
    const res = await fetch(ZAPIER_WEBHOOK, {method:"POST", headers:{"Content-Type":"application/json"}, body});
    return res.ok;
  }
  function mailto(subject, body){
    const a = document.createElement("a");
    a.href = `mailto:${encodeURIComponent(CAREGIVER_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  }

  function replaceAlertSignupWithWebhookForm(){
    const card = $("#jccAlertSignupCard");
    if (!card || card.dataset.webhookReady === "1") return;
    card.dataset.webhookReady = "1";
    card.innerHTML = `<h3>Phone + email alert signup</h3>
      <p>Use this direct alert form to send Jasper’s reminder preferences to <code>${esc(CAREGIVER_EMAIL)}</code> through the Zapier catcher. The Typeform/Trueform link is still available as a backup if the embedded form is blocked.</p>
      <form class="jcc-alert-form" id="jccAlertWebhookForm">
        <label>Name<input id="jccAlertName" placeholder="Jasper" autocomplete="name" /></label>
        <label>Email or phone<input id="jccAlertContact" placeholder="email, phone, or both" autocomplete="email" /></label>
        <label class="wide">Alerts wanted<textarea id="jccAlertTypes" rows="3" placeholder="Meals, hydration, meds as prescribed, DBT check-ins, schedule starts, decompression, bedtime, store/order reminders…"></textarea></label>
        <label class="wide">Notes for William<textarea id="jccAlertNotes" rows="3" placeholder="Times, tone, what helps, what not to say, safety notes, accessibility needs…"></textarea></label>
        <p class="jcc-webhook-status" id="jccAlertWebhookStatus">Ready to send alert signup.</p>
        <div class="jcc-alert-actions"><button type="submit" class="soft-button">Send alert signup</button><button type="button" class="ghost-button" id="jccOpenAlertSignup">Open Typeform/Trueform backup</button><button type="button" class="ghost-button" id="jccAskOnyxAlerts">Ask Onyx about alerts</button></div>
      </form>`;
    $("#jccAlertWebhookForm", card).addEventListener("submit", submitAlertSignup);
    $("#jccOpenAlertSignup", card).addEventListener("click", () => {
      if (window.openJccExternalPortal) window.openJccExternalPortal(TYPEFORM_ALERT_URL, "Jasper phone + email alert signup");
      else window.open(TYPEFORM_ALERT_URL, "_blank", "noopener");
    });
    $("#jccAskOnyxAlerts", card).addEventListener("click", () => {
      const input = $("#chatInput");
      if (input) { input.value = "Onyx, help me choose useful phone and email care alerts without making them overwhelming."; $("#chatForm")?.dispatchEvent(new Event("submit", {bubbles:true, cancelable:true})); }
    });
  }
  async function submitAlertSignup(event){
    event.preventDefault();
    const status = $("#jccAlertWebhookStatus");
    const payload = {
      kind: "alert_signup",
      item: "Jasper alert signup",
      cost: "0 Copper",
      name: $("#jccAlertName")?.value?.trim() || "Jasper",
      contact: $("#jccAlertContact")?.value?.trim() || "",
      alerts: $("#jccAlertTypes")?.value?.trim() || "",
      notes: $("#jccAlertNotes")?.value?.trim() || "",
      page: location.href
    };
    if (status) status.textContent = "Sending alert signup…";
    try {
      await postZapier(payload);
      if (status) status.textContent = `Sent to Zapier for ${CAREGIVER_EMAIL}.`;
      toast("Alert signup sent.");
    } catch (err) {
      if (status) status.textContent = "Webhook was blocked; opening email fallback.";
      mailto("Jasper alert signup", Object.entries(payload).map(([k,v]) => `${k}: ${v}`).join("\n"));
      toast("Webhook blocked; opened email fallback.");
    }
  }

  function installCheckoutWebhookCapture(){
    if (window.__JCC_CHECKOUT_WEBHOOK_CAPTURE__) return;
    window.__JCC_CHECKOUT_WEBHOOK_CAPTURE__ = true;
    document.addEventListener("click", (event) => {
      const btn = event.target.closest("#checkoutCart");
      if (!btn) return;
      const state = getState();
      const cart = (state.cart || []).map(item => ({name:item.name, category:item.category, url:item.url || "", cost:item.cost || {}}));
      const total = sumCosts(cart);
      if (!cart.length) return;
      if (currencyToCopper(state.currency || {}) < currencyToCopper(total)) return;
      const payload = {
        kind: "purchase_request",
        item: cart.map(i => i.name).join(", "),
        cost: formatCurrency(total),
        items: cart,
        total,
        caregiverEmail: CAREGIVER_EMAIL,
        page: location.href
      };
      setTimeout(() => sendCheckoutWebhook(payload), 50);
    }, true);
  }
  async function sendCheckoutWebhook(payload){
    const status = $("#checkoutEmailStatus");
    if (status) { status.dataset.webhook = "sending"; status.innerHTML = `<strong>Checkout:</strong> sending order to Zapier and email fallback for <code>${esc(CAREGIVER_EMAIL)}</code>…`; }
    try {
      await postZapier(payload);
      if (status) { status.dataset.webhook = "sent"; status.innerHTML = `<strong>Checkout sent:</strong> order posted to Zapier for <code>${esc(CAREGIVER_EMAIL)}</code>. Mail/email fallback may also open depending on browser settings.`; }
      toast("Checkout sent to Zapier.");
    } catch (err) {
      if (status) { status.dataset.webhook = "failed"; status.innerHTML = `<strong>Checkout fallback:</strong> webhook was blocked, so the mail/email request is the backup for <code>${esc(CAREGIVER_EMAIL)}</code>.`; }
      toast("Webhook blocked; email fallback should handle checkout.");
    }
  }

  function installMergedOnyxButtons(){
    document.addEventListener("click", (event) => {
      const jump = event.target.closest("[data-scroll-onyx-merged]");
      if (!jump) return;
      event.preventDefault();
      $("#onyxProfileMerged")?.scrollIntoView({behavior:"smooth", block:"start"});
    });
  }
})();
