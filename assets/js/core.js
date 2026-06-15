
(() => {
  "use strict";

  const pageNames = [
    ["home", "Home"],
    ["calendar", "Calendar"],
    ["todays-schedule", "Today's Schedule"],
    ["onyx-support", "Chat Bot with DBT Skills"],
    ["dbt-diary-cards", "DBT Daily Cards"],
    ["dbt-journaling", "DBT Journaling"],
    ["mobile-games", "Mobile Games"],
    ["serotonin", "Serotonin"],
    ["store", "Store"]
  ];

  const config = window.OURSPACE_SITE_CONFIG || {};
  const PROFILE = normalizeProfile(window.OURSPACE_PROFILE || config.profile || localStorage.getItem("ourspace_active_profile") || "shared");
  const DATA_PROFILE = String(window.OURSPACE_DATA_PROFILE || config.dataProfile || (PROFILE === "william" ? "dino" : PROFILE === "jasper" ? "squishy" : PROFILE)).toLowerCase();
  const BACKEND_URL = window.OURSPACE_BACKEND_URL || config.backendUrl || "";

  const state = {
    currentPage: "home",
    tasksData: null,
    scheduleData: null,
    calendarData: null,
    storeData: null,
    hobbiesData: null,
    gamesManifest: null,
    allowedGameIds: null,
    gameRewardRules: null,
    dbtData: null,
    dbtSkillsData: null,
    dbtWorksheetsData: null,
    completedTasks: loadObject(key("completedTasks"), {}),
    cart: loadObject(key("cart"), {}),
    activeGame: loadObject(key("gameState"), { score: 0, level: 1, game: "angrybirds" }),
    gameRewardSession: loadObject(key("gameRewardSession"), {}),
    myspace: loadObject(key("myspace"), {})
  };

  const dataPaths = {
    tasks: `assets/json/${DATA_PROFILE}_tasks.json`,
    schedule: `assets/json/${DATA_PROFILE}_sched.json`,
    calendar: `assets/json/${DATA_PROFILE}_cal.json`,
    store: `assets/json/${DATA_PROFILE}_store.json`,
    hobbies: `assets/json/${DATA_PROFILE}_hobby.json`,
    gamesManifest: "assets/json/games.json",
    allowedGameIds: "assets/json/game_ids.json",
    gameRewardRules: "assets/json/game_rules.json",
    dbtCombined: "assets/json/dbt_all.json",
    dbtSkills: "assets/json/dbt_skills.json",
    dbtWorksheets: "assets/json/dbt_ws.json"
  };

  document.addEventListener("DOMContentLoaded", boot);

  async function boot() {
    installSharedNav();
    installPageNav();
    installModules();
    installMySpaceControls();
    applyMyspaceLayout();
    await loadAllData();
    renderAll();
    setPage(location.hash ? location.hash.replace(/^#/, "") : "home", false);
    window.addEventListener("hashchange", () => setPage(location.hash.replace(/^#/, "") || "home", false));
  }

  async function loadAllData() {
    const [tasks, schedule, calendar, store, hobbies, gamesManifest, allowedGameIds, gameRewardRules, dbtCombined, dbtSkills, dbtWorksheets] = await Promise.all([
      loadJson(dataPaths.tasks, { profile: DATA_PROFILE, tasks: [], tasksBySection: {} }, "tasks"),
      loadJson(dataPaths.schedule, { profile: DATA_PROFILE, defaultToday: [] }, "schedule"),
      loadJson(dataPaths.calendar, { profile: DATA_PROFILE, events: [] }, "calendar"),
      loadJson(dataPaths.store, { profile: DATA_PROFILE, aisles: [], items: [] }, "store"),
      loadJson(dataPaths.hobbies, { profile: DATA_PROFILE, hobbies: [], selfCare: [] }, "hobbies/self-care"),
      loadJson(dataPaths.gamesManifest, { games: [] }, "games-manifest"),
      loadJson(dataPaths.allowedGameIds, { allowedGameIds: [] }, "allowed-game-ids"),
      loadJson(dataPaths.gameRewardRules, { currencyScale: {}, globalEvents: {}, gameRules: {} }, "game-reward-rules"),
      loadJson(dataPaths.dbtCombined, { modules: [], acronyms_and_mnemonics: {}, handouts: [], worksheets: [] }, "dbt-combined"),
      loadJson(dataPaths.dbtSkills, { modules: [], handouts: [], acronyms_and_mnemonics: {} }, "dbt-skills"),
      loadJson(dataPaths.dbtWorksheets, { worksheets: [] }, "dbt-worksheets")
    ]);
    state.tasksData = tasks;
    state.scheduleData = schedule;
    state.calendarData = calendar;
    state.storeData = normalizeStore(store);
    state.hobbiesData = hobbies;
    state.gamesManifest = gamesManifest;
    state.allowedGameIds = allowedGameIds;
    state.gameRewardRules = gameRewardRules;
    state.dbtData = dbtCombined;
    state.dbtSkillsData = dbtSkills;
    state.dbtWorksheetsData = dbtWorksheets;
  }

  async function loadJson(path, fallback, label) {
    const override = localStorage.getItem(key(`jsonOverride_${label}`));
    if (override) {
      try { return JSON.parse(override); } catch (error) {}
    }
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`Could not auto-load ${label} JSON from ${path}.`, error);
      return fallback;
    }
  }

  function normalizeStore(store) {
    const normalized = store && typeof store === "object" ? store : { aisles: [], items: [] };
    if (!Array.isArray(normalized.aisles)) normalized.aisles = [];
    if (!Array.isArray(normalized.items)) normalized.items = [];
    if (!normalized.aisles.some(a => a.id === "all")) normalized.aisles.unshift({ id: "all", label: "Show All" });
    return normalized;
  }

  function installPageNav() {
    document.querySelectorAll("[data-osg-page]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        setPage(link.getAttribute("data-osg-page") || "home");
      });
    });
    const select = document.getElementById("osg-page-select");
    if (select) {
      select.value = "home";
      select.addEventListener("change", () => setPage(select.value));
    }
    document.querySelectorAll("[data-reset-page]").forEach(btn => {
      btn.addEventListener("click", () => resetPageLayout(btn.getAttribute("data-reset-page")));
    });
  }

  function setPage(pageId, updateHash = true) {
    if (!pageNames.some(([id]) => id === pageId)) pageId = "home";
    state.currentPage = pageId;
    document.body.dataset.page = pageId;
    document.querySelectorAll(".page-section").forEach(section => section.classList.toggle("active", section.id === pageId));
    const select = document.getElementById("osg-page-select");
    if (select) select.value = pageId;
    if (updateHash) history.replaceState(null, "", `#${pageId}`);
    const bg = (config.backgrounds || {})[pageId];
    if (bg) document.documentElement.style.setProperty("--page-bg-image", `url("${bg}")`);
    document.querySelectorAll("[data-osg-page]").forEach(link => link.classList.toggle("active", link.getAttribute("data-osg-page") === pageId));
  }

  function renderAll() {
    renderProfileText();
    renderTasks();
    renderSchedule();
    renderCalendar();
    renderStore();
    renderHobbies();
    renderDBT();
    renderGame();
  }

  function renderProfileText() {
    text("profile-owner-label", config.ownerName || PROFILE);
    text("profile-store-name", config.storeName || "Store");
    text("store-title", config.storeName || "Store");
    text("store-provider", config.rewardProvidedBy || "selected profile");
    const storeLink = document.getElementById("ourspace-store-link");
    if (storeLink) storeLink.textContent = config.storeName || "Store";
  }

  function renderTasks() {
    const list = document.getElementById("task-list");
    const filter = document.getElementById("task-filter");
    const sectionFilter = document.getElementById("task-section-filter");
    if (!list || !state.tasksData) return;
    const tasks = Array.isArray(state.tasksData.tasks) ? state.tasksData.tasks : [];
    if (sectionFilter && !sectionFilter.dataset.loaded) {
      sectionFilter.innerHTML = `<option value="">All sections</option>`;
      const sections = [...new Set(tasks.map(t => t.section).filter(Boolean))].sort();
      sections.forEach(section => sectionFilter.append(new Option(section, section)));
      sectionFilter.dataset.loaded = "1";
      sectionFilter.addEventListener("change", renderTasks);
    }
    if (filter && !filter.dataset.bound) {
      filter.addEventListener("input", renderTasks);
      filter.dataset.bound = "1";
    }
    const q = (filter?.value || "").toLowerCase().trim();
    const selectedSection = sectionFilter?.value || "";
    const visible = tasks.filter(task => {
      const hay = `${task.task || ""} ${task.category || ""} ${task.section || ""} ${task.gentleNote || ""}`.toLowerCase();
      return (!q || hay.includes(q)) && (!selectedSection || task.section === selectedSection);
    }).slice(0, 80);
    list.innerHTML = "";
    if (!tasks.length) {
      list.innerHTML = `<div class="data-card"><strong>Tasks did not auto-load.</strong><span>Use Import Tasks JSON or open this through GitHub/local server so the separate JSON files can load.</span></div>`;
      return;
    }
    visible.forEach(task => list.append(createTaskCard(task)));
    text("task-count", `${Object.keys(state.completedTasks).length} completed locally · ${tasks.length} loaded`);
  }

  function createTaskCard(task) {
    const card = el("article", "data-card task-item");
    const done = !!state.completedTasks[task.id];
    if (done) card.classList.add("completed");
    const reward = getRewardCopper(task);
    card.innerHTML = `
      <h3>${escapeHtml(task.task || "Task")}</h3>
      <p class="small-note">${escapeHtml(task.section || "")}${task.category ? " · " + escapeHtml(task.category) : ""}</p>
      <p>${escapeHtml(task.gentleNote || "")}</p>
      <p><strong>Reward:</strong> ${formatCurrency(reward)}</p>
    `;
    const controls = el("div", "json-tools-row");
    const complete = button(done ? "Completed" : "Complete + Earn");
    complete.disabled = done;
    complete.addEventListener("click", () => {
      state.completedTasks[task.id] = { completedAt: new Date().toISOString(), rewardCopper: reward, task: task.task };
      saveObject(key("completedTasks"), state.completedTasks);
      if (reward > 0) window.OurSpaceCurrency.add(reward, `Task completed: ${task.task || task.id}`);
      postBackend({ action: "taskCompleted", profile: PROFILE, dataProfile: DATA_PROFILE, taskId: task.id, task: task.task, rewardCopper: reward });
      renderTasks();
    });
    const remove = button("Hide Task");
    remove.addEventListener("click", () => {
      state.tasksData.tasks = (state.tasksData.tasks || []).filter(t => t.id !== task.id);
      persistJsonOverride("tasks", state.tasksData);
      renderTasks();
    });
    controls.append(complete, remove);
    card.append(controls);
    return card;
  }

  function renderSchedule() {
    const list = document.getElementById("schedule-list");
    if (!list || !state.scheduleData) return;
    const items = Array.isArray(state.scheduleData.defaultToday) ? state.scheduleData.defaultToday : [];
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<div class="data-card"><strong>Schedule JSON did not auto-load.</strong><span>Import a schedule JSON or serve the folder through GitHub/local server.</span></div>`;
      return;
    }
    items.forEach(item => {
      const card = el("article", "data-card");
      card.innerHTML = `<h3>${escapeHtml(item.time || "Anytime")} · ${escapeHtml(item.title || "Schedule item")}</h3><p>${escapeHtml(item.notes || "")}</p><p><strong>Reward:</strong> ${formatCurrency(item.rewardCopper || 0)}</p>`;
      const earn = button("Mark Done + Earn");
      earn.addEventListener("click", () => {
        const amount = Number(item.rewardCopper || 0);
        if (amount > 0) window.OurSpaceCurrency.add(amount, `Schedule item: ${item.title}`);
        postBackend({ action: "scheduleItemCompleted", profile: PROFILE, dataProfile: DATA_PROFILE, item });
        earn.textContent = "Done";
        earn.disabled = true;
      });
      card.append(earn);
      list.append(card);
    });
  }

  function renderCalendar() {
    const list = document.getElementById("calendar-list");
    if (!list || !state.calendarData) return;
    const events = Array.isArray(state.calendarData.events) ? state.calendarData.events.slice() : [];
    events.sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")));
    list.innerHTML = "";
    if (!events.length) {
      list.innerHTML = `<div class="data-card"><strong>Calendar JSON did not auto-load.</strong><span>Import calendar JSON or serve the folder through GitHub/local server.</span></div>`;
      return;
    }
    const grouped = events.reduce((map, event) => {
      const date = event.date || "Undated";
      (map[date] ||= []).push(event);
      return map;
    }, {});
    Object.entries(grouped).forEach(([date, dayEvents]) => {
      const day = el("section", "data-card");
      day.innerHTML = `<h3>${escapeHtml(date)}</h3>`;
      dayEvents.forEach(event => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${escapeHtml(event.title || "Event")}</strong> · ${escapeHtml(event.type || "event")} · ${formatCurrency(event.rewardCopper || 0)}<br><span class="small-note">${escapeHtml(event.notes || "")}</span>`;
        day.append(p);
      });
      list.append(day);
    });
  }

  function renderHobbies() {
    const list = document.getElementById("hobbies-list");
    if (!list || !state.hobbiesData) return;
    const items = [...(state.hobbiesData.hobbies || []), ...(state.hobbiesData.selfCare || [])];
    list.innerHTML = "";
    items.forEach(item => {
      const card = el("article", "data-card");
      card.innerHTML = `<h3>${escapeHtml(item.name || "Item")}</h3><p>${escapeHtml(item.notes || item.category || "")}</p><p><strong>Reward:</strong> ${formatCurrency(item.rewardCopper || 0)}</p>`;
      const earn = button("Use + Earn");
      earn.addEventListener("click", () => {
        const amount = Number(item.rewardCopper || 0);
        if (amount > 0) window.OurSpaceCurrency.add(amount, `Self-care/hobby: ${item.name}`);
        postBackend({ action: "hobbySelfCareUsed", profile: PROFILE, dataProfile: DATA_PROFILE, item });
      });
      card.append(earn);
      list.append(card);
    });
  }

  function renderStore() {
    const aisleSelect = document.getElementById("aisle-select");
    if (!aisleSelect || !state.storeData) return;
    if (!aisleSelect.dataset.loaded) {
      aisleSelect.innerHTML = `<option value="">Choose an aisle…</option>`;
      state.storeData.aisles.forEach(a => {
        const label = a.id === "provided-by" ? `${a.label} ${config.rewardProvidedBy || ""}`.trim() : a.label;
        aisleSelect.append(new Option(label, a.id));
      });
      aisleSelect.addEventListener("change", renderStoreGallery);
      aisleSelect.dataset.loaded = "1";
      document.getElementById("clear-cart-btn")?.addEventListener("click", () => { state.cart = {}; saveCart(); renderCart(); storeMessage("Cart cleared."); });
      document.getElementById("checkout-btn")?.addEventListener("click", submitPurchase);
      document.getElementById("add-store-item-btn")?.addEventListener("click", addStoreItemFromForm);
    }
    renderStoreGallery();
    renderCart();
  }

  function renderStoreGallery() {
    const gallery = document.getElementById("item-gallery");
    const empty = document.getElementById("empty-gallery");
    const adultCheck = document.getElementById("adult-check");
    const adultConfirm = document.getElementById("adult-confirm");
    const aisle = document.getElementById("aisle-select")?.value || "";
    if (!gallery) return;
    gallery.innerHTML = "";
    adultCheck?.classList.add("hidden");
    if (!aisle) {
      if (empty) { empty.textContent = "No aisle selected yet. Choose an aisle above to show rewards."; empty.classList.remove("hidden"); }
      return;
    }
    if (aisle === "adult" && adultConfirm && !adultConfirm.checked) {
      empty?.classList.add("hidden");
      adultCheck?.classList.remove("hidden");
      adultConfirm.onchange = renderStoreGallery;
      return;
    }
    empty?.classList.add("hidden");
    const items = aisle === "all" ? state.storeData.items : state.storeData.items.filter(item => item.aisle === aisle);
    if (!items.length) {
      if (empty) { empty.textContent = "No items found in this aisle yet."; empty.classList.remove("hidden"); }
      return;
    }
    items.forEach(item => gallery.append(createItemCard(item)));
  }

  function createItemCard(item) {
    const card = el("article", "item-card");
    card.innerHTML = `
      <div class="item-image" aria-hidden="true">${escapeHtml(item.emoji || "🎁")}</div>
      <h3>${escapeHtml(item.name || "Reward")}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      <div class="item-meta">
        <span>Cost: ${formatCurrency(item.priceCopper || 0)}</span>
        <span>Aisle: ${escapeHtml(getAisleLabel(item.aisle))}</span>
        <span>Tags: ${escapeHtml((item.tags || []).join(", "))}</span>
      </div>
    `;
    const actions = el("div", "item-actions");
    const qty = document.createElement("select");
    qty.setAttribute("aria-label", `Quantity for ${item.name}`);
    for (let i = 1; i <= 5; i++) qty.append(new Option(String(i), String(i)));
    const add = button("Add to Cart");
    add.addEventListener("click", () => addItem(item.id, Number(qty.value || 1)));
    actions.append(qty, add);
    card.append(actions);
    return card;
  }

  function renderCart() {
    const linesEl = document.getElementById("cart-lines");
    if (!linesEl) return;
    linesEl.innerHTML = "";
    const lines = Object.values(state.cart);
    const totalQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    const totalCopper = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.priceCopper || 0), 0);
    text("cart-count", `${totalQty} item${totalQty === 1 ? "" : "s"}`);
    text("cart-total", formatCurrency(totalCopper));
    if (!lines.length) {
      linesEl.innerHTML = `<p>Cart is empty.</p>`;
      return;
    }
    lines.forEach(line => {
      const row = el("div", "cart-line");
      row.innerHTML = `<div class="cart-line-main"><strong>${escapeHtml(line.name)}</strong><span>${formatCurrency(line.quantity * line.priceCopper)}</span></div><div>${line.quantity} × ${formatCurrency(line.priceCopper)}</div>`;
      const controls = el("div", "cart-line-controls");
      const minus = button("−"); minus.addEventListener("click", () => setQuantity(line.id, line.quantity - 1));
      const plus = button("+"); plus.addEventListener("click", () => setQuantity(line.id, line.quantity + 1));
      const remove = button("Remove"); remove.addEventListener("click", () => removeItem(line.id));
      controls.append(minus, document.createTextNode(String(line.quantity)), plus, remove);
      row.append(controls);
      linesEl.append(row);
    });
  }

  function addItem(id, quantity) {
    const item = (state.storeData.items || []).find(i => i.id === id);
    if (!item) return;
    const q = clampInt(quantity, 1, 5);
    if (!state.cart[id]) state.cart[id] = { id: item.id, aisle: item.aisle, name: item.name, priceCopper: Number(item.priceCopper || 0), quantity: 0 };
    state.cart[id].quantity = clampInt(state.cart[id].quantity + q, 1, 99);
    saveCart(); renderCart(); storeMessage(`${item.name} added to cart.`);
  }

  function setQuantity(id, quantity) {
    if (!state.cart[id]) return;
    if (quantity <= 0) return removeItem(id);
    state.cart[id].quantity = clampInt(quantity, 1, 99);
    saveCart(); renderCart();
  }

  function removeItem(id) {
    if (!state.cart[id]) return;
    const name = state.cart[id].name;
    delete state.cart[id];
    saveCart(); renderCart(); storeMessage(`${name} removed.`);
  }

  async function submitPurchase() {
    const lines = Object.values(state.cart);
    if (!lines.length) return storeMessage("Add at least one reward before checkout.");
    const totalCopper = lines.reduce((sum, line) => sum + line.quantity * line.priceCopper, 0);
    const available = window.OurSpaceCurrency.getTotalCopper();
    if (available < totalCopper) return storeMessage(`Not enough earned currency. You have ${formatCurrency(available)} and need ${formatCurrency(totalCopper)}.`);
    window.OurSpaceCurrency.spend(totalCopper, "Store purchase");
    const purchase = {
      action: "storePurchase",
      app: "OurSpace",
      storeName: config.storeName || state.storeData.storeName || "Store",
      purchaserProfile: PROFILE,
      dataProfile: DATA_PROFILE,
      pageOwner: config.ownerName || state.storeData.pageOwner || "",
      rewardProvidedBy: config.rewardProvidedBy || state.storeData.rewardProvidedBy || "",
      totalCostCopper: totalCopper,
      totalCostDisplay: formatCurrency(totalCopper),
      note: document.getElementById("checkout-note")?.value?.trim() || "",
      items: lines.map(line => ({ id: line.id, name: line.name, aisle: line.aisle, quantity: line.quantity, unitCostCopper: line.priceCopper, totalCostCopper: line.priceCopper * line.quantity })),
      createdAt: new Date().toISOString()
    };
    saveLocalPurchase(purchase);
    postBackend(purchase);
    state.cart = {}; saveCart(); renderCart();
    const note = document.getElementById("checkout-note"); if (note) note.value = "";
    storeMessage(`Purchase saved and ${formatCurrency(totalCopper)} deducted.`);
  }

  function addStoreItemFromForm() {
    const name = document.getElementById("new-store-name")?.value.trim();
    const aisle = document.getElementById("new-store-aisle")?.value || document.getElementById("aisle-select")?.value || "hobby";
    const price = Number(document.getElementById("new-store-price")?.value || 0);
    if (!name || !price) return storeMessage("Add a name and copper price for the new item.");
    const newItem = {
      id: slug(`${DATA_PROFILE}-${name}-${Date.now()}`), aisle, name,
      emoji: document.getElementById("new-store-emoji")?.value.trim() || "🎁",
      description: document.getElementById("new-store-desc")?.value.trim() || "Custom JSON-added reward.",
      priceCopper: Math.max(0, Math.floor(price)), tags: ["custom"]
    };
    state.storeData.items.push(newItem);
    persistJsonOverride("store", state.storeData);
    renderStore(); storeMessage(`${name} added to store JSON override.`);
  }

  function saveCart() { saveObject(key("cart"), state.cart); }
  function saveLocalPurchase(purchase) {
    const purchases = loadObject(key("purchases"), []);
    purchases.push({ ...purchase, localPurchaseId: `local_${Date.now()}_${Math.random().toString(16).slice(2)}` });
    saveObject(key("purchases"), purchases);
  }

  function installJsonTools() {
    jsonTool("tasks", () => state.tasksData, data => { state.tasksData = data; persistJsonOverride("tasks", data); renderTasks(); }, "tasks");
    jsonTool("store", () => state.storeData, data => { state.storeData = normalizeStore(data); persistJsonOverride("store", state.storeData); document.getElementById("aisle-select").dataset.loaded = ""; renderStore(); }, "store");
    jsonTool("schedule", () => state.scheduleData, data => { state.scheduleData = data; persistJsonOverride("schedule", data); renderSchedule(); }, "schedule");
    jsonTool("calendar", () => state.calendarData, data => { state.calendarData = data; persistJsonOverride("calendar", data); renderCalendar(); }, "calendar");
    jsonTool("hobbies", () => state.hobbiesData, data => { state.hobbiesData = data; persistJsonOverride("hobbies/self-care", data); renderHobbies(); }, "hobbies");
    jsonTool("games", () => ({ manifest: state.gamesManifest, allowedGameIds: state.allowedGameIds, rewardRules: state.gameRewardRules }), data => {
      if (data.manifest) state.gamesManifest = data.manifest;
      if (data.allowedGameIds) state.allowedGameIds = data.allowedGameIds;
      if (data.rewardRules) state.gameRewardRules = data.rewardRules;
      renderGame();
    }, "games");
    jsonTool("dbt", () => state.dbtData, data => { state.dbtData = data; persistJsonOverride("dbt-combined", data); renderDBT(true); }, "dbt");
  }

  function jsonTool(id, getter, setter, filePrefix) {
    document.querySelectorAll(`[data-export-json="${id}"]`).forEach(btn => {
      const boundKey = `jsonExportBound_${id}`;
      if (btn.dataset[boundKey]) return;
      btn.dataset[boundKey] = "1";
      btn.addEventListener("click", () => downloadJson(`${DATA_PROFILE}_${filePrefix}_export.json`, getter()));
    });
    document.querySelectorAll(`[data-import-json="${id}"]`).forEach(input => {
      const boundKey = `jsonImportBound_${id}`;
      if (input.dataset[boundKey]) return;
      input.dataset[boundKey] = "1";
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          setter(parsed);
          messageFor(id, `${id} JSON imported and saved locally.`);
        } catch (error) {
          messageFor(id, `Import failed: ${error.message}`);
        } finally {
          input.value = "";
        }
      });
    });
  }

  function persistJsonOverride(label, data) {
    localStorage.setItem(key(`jsonOverride_${label}`), JSON.stringify(data));
  }

  function installModules() {
    document.querySelectorAll(".module").forEach((module, index) => {
      const page = module.closest(".page-section")?.id || "global";
      const id = module.id || `module-${page}-${index}`;
      module.id = id;
      const defaults = getModuleDefaults(module, index);
      const pos = loadObject(key(`module_${id}`), defaults);
      applyModulePosition(module, pos);
      const header = module.querySelector(".module-header");
      if (header) makeDraggable(header, module, key(`module_${id}`));
      module.querySelector("[data-collapse-module]")?.addEventListener("click", () => {
        module.classList.toggle("is-collapsed");
        const current = loadObject(key(`module_${id}`), defaults);
        current.collapsed = module.classList.contains("is-collapsed");
        saveObject(key(`module_${id}`), current);
      });
      if (pos.collapsed) module.classList.add("is-collapsed");
    });
    installJsonTools();
  }

  function getModuleDefaults(module, index) {
    const x = Number(module.dataset.defaultX || 20 + (index % 2) * 540);
    const y = Number(module.dataset.defaultY || 20 + Math.floor(index / 2) * 300);
    return { x, y, collapsed: false };
  }

  function applyModulePosition(module, pos) {
    module.style.left = `${pos.x || 20}px`;
    module.style.top = `${pos.y || 20}px`;
  }

  function resetPageLayout(pageId) {
    document.querySelectorAll(`#${cssEscape(pageId)} .module`).forEach((module, index) => {
      const defaults = getModuleDefaults(module, index);
      module.classList.remove("is-collapsed");
      applyModulePosition(module, defaults);
      saveObject(key(`module_${module.id}`), defaults);
    });
  }

  function makeDraggable(handle, element, storageKey) {
    let startX = 0, startY = 0, originX = 0, originY = 0;
    handle.addEventListener("pointerdown", event => {
      if (event.target.closest("button, input, select, textarea, a")) return;
      const pageBoard = element.closest(".page-board");
      const boardRect = pageBoard ? pageBoard.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const rect = element.getBoundingClientRect();
      startX = event.clientX; startY = event.clientY;
      originX = rect.left - boardRect.left; originY = rect.top - boardRect.top;
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
      if (!handle.hasPointerCapture(event.pointerId)) return;
      const board = element.closest(".page-board");
      const maxX = Math.max(0, (board?.clientWidth || window.innerWidth) - element.offsetWidth - 8);
      const maxY = Math.max(0, (board?.clientHeight || 1200) - element.offsetHeight - 8);
      const x = clamp(originX + event.clientX - startX, 8, maxX);
      const y = clamp(originY + event.clientY - startY, 8, maxY);
      element.style.left = `${x}px`; element.style.top = `${y}px`;
    });
    handle.addEventListener("pointerup", event => {
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      const x = parseInt(element.style.left || "0", 10);
      const y = parseInt(element.style.top || "0", 10);
      saveObject(storageKey, { x, y, collapsed: element.classList.contains("is-collapsed") });
    });
  }

  function installSharedNav() {
    if (window.__ourspaceSharedNavInstalled) return;
    window.__ourspaceSharedNavInstalled = true;
    const nav = document.getElementById("ourspace-global-dropdown-nav");
    const bubble = document.getElementById("os-nav-bubble");
    const currencyKey = `ourspace_currency_totalCopper_${PROFILE}`;
    const els = {
      easternTime: document.getElementById("ourspace-eastern-time"), easternOffset: document.getElementById("ourspace-eastern-offset"),
      copper: document.getElementById("ourspace-copper-count"), silver: document.getElementById("ourspace-silver-count"), gold: document.getElementById("ourspace-gold-count"), platinum: document.getElementById("ourspace-platinum-count"), total: document.getElementById("ourspace-currency-total")
    };
    function getTotalCopper() { return Math.max(0, Math.floor(Number(localStorage.getItem(currencyKey) || 0))); }
    function setTotalCopper(totalCopper) {
      const clean = Math.max(0, Math.floor(Number(totalCopper || 0)));
      localStorage.setItem(currencyKey, String(clean)); renderCurrency(clean);
      window.dispatchEvent(new CustomEvent("ourspace:currency-updated", { detail: { profile: PROFILE, totalCopper: clean, formatted: formatCurrency(clean) } }));
      return clean;
    }
    function addCurrency(amountCopper, reason = "OurSpace reward") {
      const amount = Math.floor(Number(amountCopper || 0));
      const next = Math.max(0, getTotalCopper() + amount);
      setTotalCopper(next);
      postBackend({ action: "currencyAdded", profile: PROFILE, dataProfile: DATA_PROFILE, reason, amountCopper: amount, totalCopper: next });
      return { profile: PROFILE, reason, amountCopper: amount, totalCopper: next, formatted: formatCurrency(next) };
    }
    function spendCurrency(amountCopper, reason = "OurSpace purchase") {
      const amount = Math.max(0, Math.floor(Number(amountCopper || 0)));
      const current = getTotalCopper();
      if (current < amount) return false;
      setTotalCopper(current - amount);
      postBackend({ action: "currencySpent", profile: PROFILE, dataProfile: DATA_PROFILE, reason, amountCopper: amount, totalCopper: current - amount });
      return true;
    }
    function renderCurrency(totalCopper = getTotalCopper()) {
      const coins = splitCurrency(totalCopper);
      if (els.copper) els.copper.textContent = coins.copper;
      if (els.silver) els.silver.textContent = coins.silver;
      if (els.gold) els.gold.textContent = coins.gold;
      if (els.platinum) els.platinum.textContent = coins.platinum;
      if (els.total) els.total.textContent = `Total: ${formatCurrency(totalCopper)} · 10 copper = 1 silver · 10 silver = 1 gold · 10 gold = 1 platinum`;
    }
    function isEasternDst(date) {
      const year = date.getUTCFullYear();
      function nthSunday(monthIndex, nth) { const first = new Date(Date.UTC(year, monthIndex, 1, 7, 0, 0)); const offset = (7 - first.getUTCDay()) % 7; first.setUTCDate(1 + offset + (nth - 1) * 7); return first; }
      const start = nthSunday(2, 2); start.setUTCHours(7,0,0,0);
      const end = nthSunday(10, 1); end.setUTCHours(6,0,0,0);
      return date >= start && date < end;
    }
    function updateEasternTime() {
      const now = new Date(); const isDst = isEasternDst(now); const offset = isDst ? -4 : -5;
      const eastern = new Date(now.getTime() + offset * 3600000);
      const month = String(eastern.getUTCMonth()+1).padStart(2,"0"), day = String(eastern.getUTCDate()).padStart(2,"0"), year = eastern.getUTCFullYear();
      let hours = eastern.getUTCHours(); const minutes = String(eastern.getUTCMinutes()).padStart(2,"0"), seconds = String(eastern.getUTCSeconds()).padStart(2,"0"), ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      if (els.easternTime) els.easternTime.textContent = `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
      if (els.easternOffset) els.easternOffset.textContent = isDst ? "Eastern Daylight Time · UTC-4" : "Eastern Standard Time · UTC-5";
    }
    window.OurSpaceCurrency = { getTotalCopper, setTotalCopper, add: addCurrency, spend: spendCurrency, split: splitCurrency, format: formatCurrency, render: renderCurrency };
    document.getElementById("osg-hide-nav")?.addEventListener("click", () => { document.body.classList.add("osg-nav-hidden"); localStorage.setItem("ourspaceNavHidden", "1"); });
    document.getElementById("osg-show-nav")?.addEventListener("click", () => { document.body.classList.remove("osg-nav-hidden", "osg-scrolling"); localStorage.setItem("ourspaceNavHidden", "0"); });
    if (localStorage.getItem("ourspaceNavHidden") === "1") document.body.classList.add("osg-nav-hidden");
    makeFixedDraggable(document.querySelector("#ourspace-global-dropdown-nav .osg-drag-handle"), nav, "ourspaceNavPos");
    makeFixedDraggable(document.querySelector("#os-nav-bubble .osg-bubble-core"), bubble, "ourspaceBubblePos");
    restoreFixedPosition(nav, "ourspaceNavPos", { left: 12, top: 12 });
    restoreFixedPosition(bubble, "ourspaceBubblePos", { left: 14, top: window.innerHeight - 76 });
    let scrollTimer;
    window.addEventListener("scroll", () => {
      document.body.classList.add("osg-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => document.body.classList.remove("osg-scrolling"), 1200);
    }, { passive: true });
    window.addEventListener("storage", event => { if (event.key === currencyKey) renderCurrency(); });
    updateEasternTime(); renderCurrency(); setInterval(updateEasternTime, 1000);
  }

  function makeFixedDraggable(handle, element, storageName) {
    if (!handle || !element) return;
    let startX = 0, startY = 0, originX = 0, originY = 0;
    handle.addEventListener("pointerdown", event => { startX = event.clientX; startY = event.clientY; const rect = element.getBoundingClientRect(); originX = rect.left; originY = rect.top; handle.setPointerCapture(event.pointerId); event.preventDefault(); });
    handle.addEventListener("pointermove", event => { if (!handle.hasPointerCapture(event.pointerId)) return; const rect = element.getBoundingClientRect(); const maxX = Math.max(0, window.innerWidth - rect.width - 8); const maxY = Math.max(0, window.innerHeight - rect.height - 8); const x = clamp(originX + event.clientX - startX, 8, maxX); const y = clamp(originY + event.clientY - startY, 8, maxY); element.style.left = `${x}px`; element.style.top = `${y}px`; element.style.right = "auto"; element.style.bottom = "auto"; });
    handle.addEventListener("pointerup", event => { if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); const rect = element.getBoundingClientRect(); localStorage.setItem(storageName, JSON.stringify({ x: rect.left, y: rect.top })); });
  }

  function restoreFixedPosition(element, storageName, fallback) {
    if (!element) return;
    const saved = loadObject(storageName, null);
    const pos = saved || fallback;
    element.style.left = `${pos.x ?? pos.left}px`;
    element.style.top = `${pos.y ?? pos.top}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  }

  function installMySpaceControls() {
    document.getElementById("apply-myspace-layout")?.addEventListener("click", () => {
      state.myspace = {
        border: document.getElementById("myspace-border-color")?.value || "",
        button: document.getElementById("myspace-button-color")?.value || "",
        moduleBg: document.getElementById("myspace-module-bg")?.value || ""
      };
      saveObject(key("myspace"), state.myspace);
      applyMyspaceLayout();
    });
    document.getElementById("reset-myspace-layout")?.addEventListener("click", () => {
      state.myspace = {};
      localStorage.removeItem(key("myspace"));
      applyMyspaceLayout();
    });
  }

  function applyMyspaceLayout() {
    const root = document.documentElement;
    if (state.myspace.border) root.style.setProperty("--module-border-color", state.myspace.border);
    else root.style.removeProperty("--module-border-color");
    if (state.myspace.button) root.style.setProperty("--module-button-color", state.myspace.button);
    else root.style.removeProperty("--module-button-color");
    if (state.myspace.moduleBg) root.style.setProperty("--module-bg", hexToRgba(state.myspace.moduleBg, .72));
    else root.style.removeProperty("--module-bg");
  }

  function renderDBT(force = false) {
    const dbt = state.dbtData || {};
    const skills = state.dbtSkillsData || {};
    const worksheetsData = state.dbtWorksheetsData || {};
    const modules = Array.isArray(dbt.modules) && dbt.modules.length ? dbt.modules : (skills.modules || []);
    const handouts = Array.isArray(dbt.handouts) && dbt.handouts.length ? dbt.handouts : (skills.handouts || []);
    const worksheets = Array.isArray(dbt.worksheets) && dbt.worksheets.length ? dbt.worksheets : (worksheetsData.worksheets || []);
    const acronyms = dbt.acronyms_and_mnemonics || skills.acronyms_and_mnemonics || {};

    const chatList = document.querySelector("#dbt-chat-skills .data-list");
    if (chatList && (force || !chatList.dataset.jsonLoaded)) {
      chatList.innerHTML = "";
      const introCards = modules.slice(0, 5).map(module => ({
        title: module.module,
        body: module.short || (module.aims || []).join(" "),
        meta: (module.core_targets || []).slice(0, 6).join(", ")
      }));
      if (!introCards.length) {
        introCards.push(
          { title: "Grounding prompt", body: "Name five things you see, four things you feel, three things you hear, two things you smell, and one thing you can taste.", meta: "fallback" },
          { title: "Need selector", body: "Pick one: comfort, plan, distract, vent, rest, body check, or ask for help.", meta: "fallback" }
        );
      }
      introCards.forEach(card => {
        const item = el("article", "data-card");
        item.innerHTML = `<h3>${escapeHtml(card.title || "DBT skill")}</h3><p>${escapeHtml(card.body || "")}</p><p class="small-note">${escapeHtml(card.meta || "")}</p>`;
        const earn = button("Practice + Earn");
        earn.addEventListener("click", () => awardDbtPractice(card.title || "DBT practice", 50));
        item.append(earn);
        chatList.append(item);
      });
      chatList.dataset.jsonLoaded = "1";
    }

    const list = document.getElementById("dbt-card-list");
    if (list && (force || !list.dataset.loaded)) {
      const wrap = list.parentElement || list;
      if (!document.getElementById("dbt-filter-row")) {
        const controls = el("div", "json-tools-row");
        controls.id = "dbt-filter-row";
        controls.innerHTML = `
          <label>DBT module <select id="dbt-module-filter"><option value="">All modules</option></select></label>
          <label>DBT type <select id="dbt-type-filter"><option value="">All types</option><option value="module">Modules</option><option value="acronym">Acronyms</option><option value="handout">Handouts</option><option value="worksheet">Worksheets</option></select></label>
          <label>Search DBT JSON <input id="dbt-search" placeholder="wise mind, TIPP, chain, diary card"></label>
          <button type="button" data-export-json="dbt">Export DBT JSON</button>
          <label class="buttonish">Import DBT JSON <input class="hidden" type="file" accept="application/json" data-import-json="dbt"></label>
        `;
        wrap.insertBefore(controls, list);
        installJsonTools();
      }
      const moduleFilter = document.getElementById("dbt-module-filter");
      if (moduleFilter && !moduleFilter.dataset.loaded) {
        modules.forEach(module => moduleFilter.append(new Option(module.module || module.module_key || "Module", module.module_key || module.module || "")));
        moduleFilter.dataset.loaded = "1";
        moduleFilter.addEventListener("change", () => renderDbtCards());
      }
      const typeFilter = document.getElementById("dbt-type-filter");
      const searchBox = document.getElementById("dbt-search");
      if (typeFilter && !typeFilter.dataset.bound) { typeFilter.addEventListener("change", () => renderDbtCards()); typeFilter.dataset.bound = "1"; }
      if (searchBox && !searchBox.dataset.bound) { searchBox.addEventListener("input", () => renderDbtCards()); searchBox.dataset.bound = "1"; }
      renderDbtCards();
      list.dataset.loaded = "1";
    }

    installJournalWorksheetPicker(worksheets);

    const saveJournal = document.getElementById("save-journal");
    if (saveJournal && !saveJournal.dataset.bound) {
      saveJournal.addEventListener("click", () => {
        const textValue = document.getElementById("journal-entry")?.value || "";
        if (!textValue.trim()) return messageFor("journal", "Write something first.");
        const selectedWorksheet = document.getElementById("journal-worksheet-select")?.value || "";
        const entries = loadObject(key("journalEntries"), []);
        entries.push({ createdAt: new Date().toISOString(), worksheetId: selectedWorksheet, text: textValue });
        saveObject(key("journalEntries"), entries);
        window.OurSpaceCurrency.add(100, "DBT journaling");
        postBackend({ action: "journalSaved", profile: PROFILE, dataProfile: DATA_PROFILE, worksheetId: selectedWorksheet, length: textValue.length, createdAt: new Date().toISOString() });
        messageFor("journal", "Journal saved locally and reward added.");
      });
      saveJournal.dataset.bound = "1";
    }

    function renderDbtCards() {
      if (!list) return;
      const selectedModule = document.getElementById("dbt-module-filter")?.value || "";
      const selectedType = document.getElementById("dbt-type-filter")?.value || "";
      const q = (document.getElementById("dbt-search")?.value || "").toLowerCase().trim();
      const cards = [];
      modules.forEach(module => cards.push({ type: "module", moduleKey: module.module_key, title: module.module, summary: module.short, meta: (module.core_targets || []).join(", "), source: module }));
      Object.entries(acronyms).forEach(([title, info]) => cards.push({ type: "acronym", moduleKey: slug(info.module || ""), title, summary: info.purpose, meta: Object.entries(info.letters || {}).map(([k,v]) => `${k}: ${v}`).join(" · "), source: info }));
      handouts.forEach(item => cards.push({ type: "handout", moduleKey: item.module_key, title: item.title_full || item.title, summary: item.summary, meta: `${item.module || ""} · ${item.section || ""}`, source: item }));
      worksheets.forEach(item => cards.push({ type: "worksheet", moduleKey: item.module_key, title: item.title_full || item.title, summary: item.summary, meta: `${item.module || ""} · ${item.section || ""}`, source: item }));
      const visible = cards.filter(card => {
        const moduleMatch = !selectedModule || card.moduleKey === selectedModule || slug(card.meta || "").includes(slug(selectedModule));
        const typeMatch = !selectedType || card.type === selectedType;
        const hay = `${card.type} ${card.title || ""} ${card.summary || ""} ${card.meta || ""}`.toLowerCase();
        return moduleMatch && typeMatch && (!q || hay.includes(q));
      }).slice(0, 80);
      list.innerHTML = "";
      if (!visible.length) {
        list.innerHTML = `<div class="data-card"><strong>No DBT entries found.</strong><span>Try a broader search or import the DBT combined catalog JSON.</span></div>`;
        return;
      }
      visible.forEach(card => {
        const item = el("article", "data-card dbt-card");
        item.innerHTML = `<h3>${escapeHtml(card.title || "DBT entry")}</h3><p class="small-note">${escapeHtml(card.type)}${card.meta ? " · " + escapeHtml(card.meta) : ""}</p><p>${escapeHtml(card.summary || "")}</p>`;
        if (card.source?.practice_steps?.length) {
          const steps = el("ol", "small-note");
          card.source.practice_steps.slice(0, 8).forEach(step => { const li = document.createElement("li"); li.textContent = step; steps.append(li); });
          item.append(steps);
        }
        const earn = button(card.type === "worksheet" ? "Practice worksheet + Earn" : "Practice + Earn");
        earn.addEventListener("click", () => awardDbtPractice(card.title || card.type, card.type === "worksheet" ? 75 : 50));
        item.append(earn);
        list.append(item);
      });
    }

    function installJournalWorksheetPicker(worksheets) {
      const journal = document.getElementById("journal-entry");
      if (!journal || document.getElementById("journal-worksheet-select")) return;
      const box = el("div", "data-card");
      box.innerHTML = `
        <h3>DBT worksheet helper</h3>
        <label>Worksheet template <select id="journal-worksheet-select"><option value="">Free journal entry</option></select></label>
        <div id="journal-worksheet-fields" class="small-note"></div>
      `;
      journal.closest("label")?.before(box);
      const select = document.getElementById("journal-worksheet-select");
      worksheets.slice(0, 102).forEach(ws => select.append(new Option(ws.title_full || ws.title || ws.id, ws.id)));
      select.addEventListener("change", () => {
        const chosen = worksheets.find(ws => ws.id === select.value);
        const fields = document.getElementById("journal-worksheet-fields");
        if (!fields) return;
        if (!chosen) { fields.textContent = ""; return; }
        const schemaFields = chosen.worksheet_schema?.fields || [];
        fields.innerHTML = `<strong>${escapeHtml(chosen.summary || "")}</strong>` + (schemaFields.length ? `<ul>${schemaFields.slice(0, 12).map(f => `<li>${escapeHtml(f.name)}: ${escapeHtml(f.description || f.type || "")}</li>`).join("")}</ul>` : "");
        if (!journal.value.trim()) journal.value = `${chosen.title_full || chosen.title}

What happened?

Feelings/body/urges noticed?

Skill used or next skill to try?

What support is needed?`;
      });
    }

    function awardDbtPractice(label, amount) {
      window.OurSpaceCurrency.add(amount, `DBT practice: ${label}`);
      postBackend({ action: "dbtPractice", profile: PROFILE, dataProfile: DATA_PROFILE, label, rewardCopper: amount, createdAt: new Date().toISOString() });
    }
  }

  function renderGame() {
    ensureGameContainers();
    const gameSelect = document.getElementById("game-select");
    const games = getAllowedGames();

    if (gameSelect && (!gameSelect.dataset.bound || gameSelect.dataset.count !== String(games.length))) {
      gameSelect.innerHTML = "";
      if (!games.length) {
        gameSelect.append(new Option("No bundled games found", ""));
      } else {
        games.forEach(game => gameSelect.append(new Option(game.name || game.id, game.id)));
      }
      if (!games.some(game => game.id === state.activeGame.game)) state.activeGame.game = games[0]?.id || "";
      gameSelect.value = state.activeGame.game || "";
      if (!gameSelect.dataset.bound) {
        gameSelect.addEventListener("change", () => {
          state.activeGame.game = gameSelect.value;
          state.activeGame.score = Number(state.activeGame.score || 0);
          saveObject(key("gameState"), state.activeGame);
          awardGameEvent("game_launch", { selectedFromDropdown: true });
          renderGame();
        });
        document.getElementById("game-play")?.addEventListener("click", () => {
          state.activeGame.score = Number(state.activeGame.score || 0) + 1;
          if (state.activeGame.score === 1) awardGameEvent("first_action");
          if (state.activeGame.score % 5 === 0) awardGameEvent("action_streak_small", { score: state.activeGame.score });
          if (state.activeGame.score % 10 === 0) {
            state.activeGame.level = Number(state.activeGame.level || 1) + 1;
            awardGameEvent("level_complete", { score: state.activeGame.score, level: state.activeGame.level });
          }
          saveObject(key("gameState"), state.activeGame);
          renderGame();
        });
        document.getElementById("game-save")?.addEventListener("click", () => {
          saveObject(key("gameState"), state.activeGame);
          awardGameEvent("achievement", { reason: "manual_save" });
          messageFor("game", "Game progress saved locally.");
        });
        document.getElementById("game-fullscreen")?.addEventListener("click", () => document.querySelector("#mobile-game-module .phone-frame")?.classList.toggle("fullscreen"));
        document.getElementById("game-back")?.addEventListener("click", () => setPage("home"));
        document.getElementById("game-home")?.addEventListener("click", () => setPage("home"));
        window.addEventListener("message", event => {
          const data = event.data || {};
          if (data && data.type === "ourspace.game.reward.v1") awardGameEvent(data.eventId || data.event || "achievement", data.detail || data);
        });
      }
      gameSelect.dataset.bound = "1";
      gameSelect.dataset.count = String(games.length);
    }

    const selected = getSelectedGame();
    text("game-score", String(state.activeGame.score || 0));
    text("game-level", String(state.activeGame.level || 1));
    text("game-name", selected?.name || gameLabel(state.activeGame.game));
    renderGameInfo(selected);
    renderGameRewardRules(selected);
    renderGameFrame(selected);
  }

  function ensureGameContainers() {
    const stage = document.querySelector("#mobile-game-module .game-stage");
    if (!stage || document.getElementById("game-info")) return;
    const info = el("div", "data-card"); info.id = "game-info";
    const rules = el("div", "data-list"); rules.id = "game-reward-rules";
    const frame = document.createElement("iframe"); frame.id = "game-frame"; frame.className = "game-frame hidden"; frame.title = "Selected OurSpace game"; frame.setAttribute("loading", "lazy"); frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups");
    stage.after(info, rules, frame);
    const tools = el("div", "json-tools-row");
    tools.innerHTML = `<button type="button" data-export-json="games">Export game JSON</button><label class="buttonish">Import game JSON <input class="hidden" type="file" accept="application/json" data-import-json="games"></label>`;
    frame.after(tools);
    installJsonTools();
  }

  function getAllowedGames() {
    const manifestGames = Array.isArray(state.gamesManifest?.games) ? state.gamesManifest.games : [];
    const rules = state.gameRewardRules?.gameRules || {};
    const allowedIds = new Set(Array.isArray(state.allowedGameIds?.allowedGameIds) ? state.allowedGameIds.allowedGameIds : Object.keys(rules));
    const fromManifest = manifestGames.filter(game => allowedIds.has(game.id)).map(game => ({ ...game, ...(rules[game.id] || {}) }));
    const known = new Set(fromManifest.map(game => game.id));
    Object.entries(rules).forEach(([id, rule]) => { if (allowedIds.has(id) && !known.has(id)) fromManifest.push({ id, ...rule, path: rule.file }); });
    return fromManifest.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
  }

  function getSelectedGame() { return getAllowedGames().find(game => game.id === state.activeGame.game) || getAllowedGames()[0] || null; }

  function renderGameInfo(game) {
    const info = document.getElementById("game-info");
    if (!info) return;
    if (!game) { info.innerHTML = `<strong>Game JSON did not auto-load.</strong><span>Import the games JSON bundle or serve this folder through GitHub/local server.</span>`; return; }
    const rule = state.gameRewardRules?.gameRules?.[game.id] || game;
    const cap = rule.sessionCapCopper || state.gameRewardRules?.defaultSessionCapCopper || 0;
    info.innerHTML = `<h3>${escapeHtml(game.name || game.id)}</h3><p><strong>Category:</strong> ${escapeHtml(rule.category || game.category || "game")} · <strong>File:</strong> ${escapeHtml(game.file || rule.file || "")}</p><p><strong>Launch mode:</strong> ${escapeHtml(game.launchMode || "iframe-or-direct-html")} · <strong>Session cap:</strong> ${formatCurrency(cap)}</p><p class="small-note">Only bundled allowed OurSpace games can trigger mobile-game rewards. Imported random games do not count.</p>`;
  }

  function renderGameRewardRules(game) {
    const wrap = document.getElementById("game-reward-rules");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!game) return;
    const globalEvents = state.gameRewardRules?.globalEvents || {};
    const rule = state.gameRewardRules?.gameRules?.[game.id] || {};
    const enabled = rule.enabledEvents || Object.keys(globalEvents);
    enabled.slice(0, 18).forEach(eventId => {
      const eventRule = (rule.eventOverrides && rule.eventOverrides[eventId]) || globalEvents[eventId];
      if (!eventRule) return;
      const card = el("article", "data-card");
      card.innerHTML = `<h3>${escapeHtml(eventRule.label || eventId)}</h3><p><strong>${formatCurrency(eventRule.totalCopper || 0)}</strong> · cooldown ${Math.round(Number(eventRule.cooldownMs || 0) / 1000)}s · max/session ${eventRule.maxPerSession || "—"}</p><p class="small-note">${escapeHtml(eventId)} · ${escapeHtml(eventRule.tier || "")}</p>`;
      const test = button("Test earn");
      test.addEventListener("click", () => awardGameEvent(eventId, { manualTest: true }));
      card.append(test);
      wrap.append(card);
    });
  }

  function renderGameFrame(game) {
    const frame = document.getElementById("game-frame");
    if (!frame || !game) return;
    const src = game.path || game.file || "";
    if (!src) { frame.classList.add("hidden"); return; }
    frame.classList.remove("hidden");
    if (frame.getAttribute("src") !== src) frame.setAttribute("src", src);
  }

  function awardGameEvent(eventId, detail = {}) {
    const game = getSelectedGame();
    if (!game || !eventId) return false;
    const allowedIds = new Set(Array.isArray(state.allowedGameIds?.allowedGameIds) ? state.allowedGameIds.allowedGameIds : []);
    if (allowedIds.size && !allowedIds.has(game.id)) return false;
    const rules = state.gameRewardRules || {};
    const gameRule = rules.gameRules?.[game.id] || {};
    const eventRule = (gameRule.eventOverrides && gameRule.eventOverrides[eventId]) || rules.globalEvents?.[eventId];
    if (!eventRule) return false;
    const sessionKey = `${game.id}:${eventId}`;
    const now = Date.now();
    const session = state.gameRewardSession[sessionKey] || { count: 0, lastAwardedAt: 0, totalCopper: 0 };
    if (eventRule.cooldownMs && now - Number(session.lastAwardedAt || 0) < eventRule.cooldownMs) { messageFor("game", `${eventRule.label || eventId} is cooling down.`); return false; }
    if (eventRule.maxPerSession && Number(session.count || 0) >= Number(eventRule.maxPerSession)) { messageFor("game", `${eventRule.label || eventId} reached its session limit.`); return false; }
    const cap = Number(gameRule.sessionCapCopper || rules.defaultSessionCapCopper || 25000);
    const gameTotalKey = `${game.id}:total`;
    const totalSession = state.gameRewardSession[gameTotalKey] || { totalCopper: 0 };
    const amount = Number(eventRule.totalCopper || 0);
    if (cap && Number(totalSession.totalCopper || 0) + amount > cap) { messageFor("game", `${game.name || game.id} reached the session cap of ${formatCurrency(cap)}.`); return false; }
    session.count = Number(session.count || 0) + 1; session.lastAwardedAt = now; session.totalCopper = Number(session.totalCopper || 0) + amount;
    totalSession.totalCopper = Number(totalSession.totalCopper || 0) + amount; totalSession.lastAwardedAt = now;
    state.gameRewardSession[sessionKey] = session; state.gameRewardSession[gameTotalKey] = totalSession; saveObject(key("gameRewardSession"), state.gameRewardSession);
    if (amount > 0) window.OurSpaceCurrency.add(amount, `Game reward: ${game.name || game.id} · ${eventRule.label || eventId}`);
    postBackend({ action: "gameReward", profile: PROFILE, dataProfile: DATA_PROFILE, gameId: game.id, gameName: game.name, eventId, rewardCopper: amount, detail, createdAt: new Date().toISOString() });
    messageFor("game", `${eventRule.label || eventId}: +${formatCurrency(amount)}`);
    return true;
  }

  function gameLabel(value) {
    const game = getAllowedGames().find(g => g.id === value);
    return game?.name || value || "Game";
  }

  async function postBackend(payload) {
    const full = { ...payload, backendReceivedFrom: location.href, sentAt: new Date().toISOString() };
    const log = loadObject(key("backendOutbox"), []); log.push(full); saveObject(key("backendOutbox"), log.slice(-100));
    if (!BACKEND_URL) return;
    try {
      await fetch(BACKEND_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(full) });
    } catch (error) {
      console.warn("Backend unavailable; event saved locally.", error);
    }
  }

  function getRewardCopper(task) { return Number(task?.reward?.totalCopper ?? task?.rewardTotalCopper ?? 0) || 0; }
  function splitCurrency(totalCopper) { let r = Math.max(0, Math.floor(Number(totalCopper || 0))); const platinum = Math.floor(r/1000); r %= 1000; const gold = Math.floor(r/100); r %= 100; const silver = Math.floor(r/10); const copper = r % 10; return { platinum, gold, silver, copper }; }
  function formatCurrency(totalCopper) { const c = splitCurrency(totalCopper); const parts = []; if (c.platinum) parts.push(`${c.platinum} platinum`); if (c.gold) parts.push(`${c.gold} gold`); if (c.silver) parts.push(`${c.silver} silver`); if (c.copper) parts.push(`${c.copper} copper`); return parts.length ? parts.join(", ") : "0 copper"; }
  function getAisleLabel(id) { return state.storeData?.aisles?.find(a => a.id === id)?.label || id || ""; }
  function text(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }
  function el(tag, className) { const node = document.createElement(tag); if (className) node.className = className; return node; }
  function button(label) { const b = document.createElement("button"); b.type = "button"; b.textContent = label; return b; }
  function key(suffix) { return `ourspace_${PROFILE}_${suffix}`; }
  function loadObject(k, fallback) { try { const parsed = JSON.parse(localStorage.getItem(k) || "null"); return parsed ?? fallback; } catch { return fallback; } }
  function saveObject(k, value) { localStorage.setItem(k, JSON.stringify(value)); }
  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
  function clampInt(value, min, max) { const n = Math.floor(Number(value || 0)); return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min; }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[ch]); }
  function cssEscape(value) { return (window.CSS && CSS.escape) ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
  function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
  function downloadJson(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); }
  function messageFor(id, message) { const node = document.querySelector(`[data-message-for="${id}"]`); if (node) { node.textContent = message; setTimeout(() => { if (node.textContent === message) node.textContent = ""; }, 5000); } }
  function storeMessage(message) { messageFor("store", message); }
  function normalizeProfile(value) { const v = String(value || "shared").toLowerCase().trim(); if (v === "jasper" || v === "squishy") return "jasper"; if (v === "william" || v === "dino") return "william"; return v; }
  function hexToRgba(hex, alpha) { const clean = String(hex).replace("#", ""); if (!/^[0-9a-f]{6}$/i.test(clean)) return hex; const n = parseInt(clean, 16); return `rgba(${(n>>16)&255}, ${(n>>8)&255}, ${n&255}, ${alpha})`; }
})();
