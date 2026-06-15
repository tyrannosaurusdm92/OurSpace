(() => {
  "use strict";

  const FALLBACK_PROFILE = "shared";

  const PROFILE = normalizeProfile(
    window.OURSPACE_STORE_PROFILE ||
    localStorage.getItem("ourspace_active_profile") ||
    FALLBACK_PROFILE
  );

  const PROFILE_RULES = {
    jasper: {
      pageOwner: "Jasper",
      storeName: "Squishy Store",
      rewardProvidedBy: "Dino"
    },
    william: {
      pageOwner: "William",
      storeName: "Dino Store",
      rewardProvidedBy: "Squishy"
    },
    shared: {
      pageOwner: "Selected Profile",
      storeName: "Profile Store",
      rewardProvidedBy: "selected profile"
    }
  };

  const ACTIVE_RULES = PROFILE_RULES[PROFILE] || PROFILE_RULES.shared;

  const AISLES = [
    { id: "all", label: "Show All" },
    { id: "beverages", label: "Beverages" },
    { id: "snacks", label: "Snacks" },
    { id: "food", label: "Food" },
    { id: "clothes", label: "Clothes" },
    { id: "comfort", label: "Comfort Items" },
    { id: "hobby", label: "Hobby Items" },
    { id: "work-help", label: "Work-Help Items" },
    { id: "gift-cards", label: "Gift Cards" },
    { id: "in-store", label: "In-Store Purchases" },
    { id: "online", label: "Online Purchases" },
    { id: "outings", label: "Outings" },
    { id: "provided-by", label: "Reward Provided By " + ACTIVE_RULES.rewardProvidedBy },
    { id: "adult", label: "21+ Items" },
    { id: "vacation", label: "Vacation Items" }
  ];

  const STORE_ITEMS = [
    makeItem("bev-energy", "beverages", "Favorite Energy Drink", "🥤", "A preferred canned or bottled drink.", 500, ["drink"]),
    makeItem("bev-juice", "beverages", "Juice", "🧃", "A juice bottle, carton, or single-serve drink.", 600, ["drink"]),
    makeItem("bev-fancy", "beverages", "Fancy Soda / Sparkling Drink", "🥤", "A fun drink that feels like a treat.", 700, ["drink", "treat"]),

    makeItem("snack-candy", "snacks", "Candy Treat", "🍬", "Candy, gummies, chocolate, or a sweet treat.", 500, ["snack", "sweet"]),
    makeItem("snack-chips", "snacks", "Chips / Crunchy Snack", "🍟", "Chips, crackers, popcorn, or a crunchy snack.", 600, ["snack"]),
    makeItem("snack-dessert", "snacks", "Dessert Snack", "🍰", "A small cake, cookie, pastry, or bakery treat.", 900, ["sweet"]),

    makeItem("food-small", "food", "Small Delivery Food Reward", "🍔", "A smaller food order or delivery contribution.", 2500, ["delivery", "meal"]),
    makeItem("food-homecooked", "food", "Homecooked Meal", "🍲", "A planned homecooked meal reward.", 3000, ["meal"]),
    makeItem("food-favorite", "food", "Favorite Meal", "🍱", "A bigger favorite food reward.", 4000, ["meal"]),

    makeItem("clothes-shirt", "clothes", "Shirt / Top", "👕", "A shirt, top, or comfy wearable item.", 3500, ["clothes"]),
    makeItem("clothes-cozy", "clothes", "Cozy Clothing", "🧦", "Socks, hoodie, pajama pants, or cozy basics.", 4500, ["comfort"]),
    makeItem("clothes-outfit", "clothes", "Outfit Contribution", "👚", "A larger clothing reward or partial outfit budget.", 8000, ["clothes"]),

    makeItem("comfort-plush", "comfort", "Comfort Blanket / Plush", "🧸", "A soft comfort item, plush, pillow, or blanket.", 3500, ["comfort"]),
    makeItem("comfort-body", "comfort", "Bath / Body Comfort Item", "🛁", "A gentle body-care, bath, or sensory comfort item.", 2500, ["self-care"]),
    makeItem("comfort-kit", "comfort", "Cozy Recovery Kit", "🛋️", "A small bundle for decompression or recovery.", 5000, ["recovery"]),

    makeItem("hobby-craft", "hobby", "Craft / Art Supply", "🎨", "A hobby supply, craft item, art tool, or small kit.", 2500, ["creative"]),
    makeItem("hobby-game", "hobby", "Game Credit / Add-On", "🎮", "A small game add-on, game currency, or DLC contribution.", 5000, ["gaming"]),
    makeItem("hobby-collectible", "hobby", "Collectible Item", "🦖", "A collectible, display item, figure, or themed reward.", 6000, ["collectible"]),

    makeItem("work-admin", "work-help", "Admin Help Reward", "📋", "Help with a form, call, email, schedule, or planning task.", 4000, ["help"]),
    makeItem("work-setup", "work-help", "Setup Help Reward", "🛠️", "Help setting up supplies, workspace, app, device, or comfort area.", 3000, ["help"]),
    makeItem("work-big", "work-help", "Big Work-Help Reward", "🧰", "A bigger help session for a hard task.", 7000, ["help"]),

    makeItem("gift-small", "gift-cards", "Small Gift Card", "🎁", "A small digital or physical gift card.", 5000, ["gift card"]),
    makeItem("gift-medium", "gift-cards", "Medium Gift Card", "💳", "A medium gift card reward.", 10000, ["gift card"]),
    makeItem("gift-large", "gift-cards", "Large Gift Card", "🏆", "A high-tier gift card reward.", 20000, ["gift card"]),

    makeItem("instore-small", "in-store", "Small In-Store Purchase", "🛒", "A small item picked up from a local store.", 2500, ["in store"]),
    makeItem("instore-medium", "in-store", "Medium In-Store Purchase", "🏬", "A planned in-store reward with a moderate budget.", 7000, ["in store"]),
    makeItem("instore-big", "in-store", "Big In-Store Purchase", "🛍️", "A larger in-store reward.", 15000, ["in store"]),

    makeItem("online-small", "online", "Small Online Purchase", "📦", "A small item ordered online.", 3000, ["online"]),
    makeItem("online-market", "online", "Marketplace Find", "🛍️", "A saved item from an online marketplace.", 6000, ["online"]),
    makeItem("online-big", "online", "Big Online Purchase", "🚚", "A high-tier online reward.", 15000, ["online"]),

    makeItem("outing-small", "outings", "Small Outing", "🌤️", "A short, low-pressure outing or drive.", 5000, ["outing"]),
    makeItem("outing-food", "outings", "Food Outing", "🍽️", "A restaurant, pickup, or treat outing.", 9000, ["outing"]),
    makeItem("outing-special", "outings", "Special Outing", "🎟️", "A bigger planned outing or event.", 18000, ["outing"]),

    makeItem("provider-small", "provided-by", ACTIVE_RULES.rewardProvidedBy + "'s Choice: Small Reward", "💌", "The reward provider chooses a small surprise reward.", 2500, ["provider choice"]),
    makeItem("provider-medium", "provided-by", ACTIVE_RULES.rewardProvidedBy + "'s Choice: Medium Reward", "🎁", "The reward provider chooses a medium surprise reward.", 6000, ["provider choice"]),
    makeItem("provider-big", "provided-by", ACTIVE_RULES.rewardProvidedBy + "'s Choice: Big Reward", "🌟", "The reward provider chooses a special larger surprise.", 12000, ["provider choice"]),

    makeItem("adult-small", "adult", "21+ Legal Adult Reward", "🔞", "Private adult-only reward. Follow age rules and local law.", 7000, ["21+", "legal only"]),
    makeItem("adult-medium", "adult", "21+ Adult Errand Reward", "✅", "Adult-only errand reward. No purchase details stored here.", 12000, ["21+", "legal only"]),
    makeItem("adult-big", "adult", "21+ Special Adult Reward", "🪪", "Adult-only high-tier reward with ID/legal check reminder.", 20000, ["21+", "legal only"]),

    makeItem("vacation-snack", "vacation", "Vacation Snack Budget", "🧳", "Treats, snacks, drinks, or comfort items for a trip.", 5000, ["vacation"]),
    makeItem("vacation-activity", "vacation", "Vacation Activity", "🏖️", "A small trip activity, attraction, or special plan.", 15000, ["vacation"]),
    makeItem("vacation-big", "vacation", "Big Vacation Reward", "✈️", "A larger travel/vacation contribution reward.", 30000, ["vacation"])
  ];

  const STORAGE_KEYS = {
    cart: "ourspace_store_cart_" + PROFILE,
    purchases: "ourspace_store_purchases_" + PROFILE
  };

  const state = {
    selectedAisle: "",
    cart: loadCart()
  };

  const els = {
    title: document.getElementById("storeTitle"),
    subtitle: document.getElementById("storeSubtitle"),
    rewardProviderLine: document.getElementById("rewardProviderLine"),
    aisleSelect: document.getElementById("aisleSelect"),
    emptyGallery: document.getElementById("emptyGallery"),
    adultCheck: document.getElementById("adultCheck"),
    adultConfirm: document.getElementById("adultConfirm"),
    gallery: document.getElementById("itemGallery"),
    clearCart: document.getElementById("clearCartBtn"),
    cartCount: document.getElementById("cartCount"),
    cartLines: document.getElementById("cartLines"),
    cartTotal: document.getElementById("cartTotal"),
    checkoutProvider: document.getElementById("checkoutProvider"),
    checkoutNote: document.getElementById("checkoutNote"),
    checkoutBtn: document.getElementById("checkoutBtn"),
    checkoutMessage: document.getElementById("checkoutMessage")
  };

  boot();

  function boot() {
    els.title.textContent = ACTIVE_RULES.storeName;
    els.subtitle.textContent = ACTIVE_RULES.pageOwner + " reward store. Choose an aisle to load rewards.";
    els.rewardProviderLine.textContent = "Reward provided by " + ACTIVE_RULES.rewardProvidedBy;
    els.checkoutProvider.textContent = ACTIVE_RULES.rewardProvidedBy;

    renderAisleOptions();
    renderGallery();
    renderCart();

    els.aisleSelect.addEventListener("change", function () {
      state.selectedAisle = els.aisleSelect.value;
      renderGallery();
    });

    els.adultConfirm.addEventListener("change", renderGallery);

    els.clearCart.addEventListener("click", function () {
      state.cart = {};
      saveCart();
      renderCart();
      setMessage("Cart cleared.");
    });

    els.checkoutBtn.addEventListener("click", submitPurchase);

    window.OurSpaceStore = {
      getCart: function () {
        return cloneSafe(state.cart);
      },
      clearCart: function () {
        state.cart = {};
        saveCart();
        renderCart();
      },
      addItem: addItem,
      removeItem: removeItem,
      setQuantity: setQuantity,
      getItems: function () {
        return cloneSafe(STORE_ITEMS);
      },
      getSelectedAisle: function () {
        return state.selectedAisle;
      },
      setSelectedAisle: function (aisleId) {
        state.selectedAisle = aisleId;
        els.aisleSelect.value = aisleId;
        renderGallery();
      },
      formatCurrency: formatCurrency,
      splitCurrency: splitCurrency
    };
  }

  function makeItem(id, aisle, name, emoji, description, priceCopper, tags) {
    return {
      id: id,
      aisle: aisle,
      name: name,
      emoji: emoji,
      description: description,
      priceCopper: priceCopper,
      tags: tags || []
    };
  }

  function renderAisleOptions() {
    AISLES.forEach(function (aisle) {
      const option = document.createElement("option");
      option.value = aisle.id;
      option.textContent = aisle.label;
      els.aisleSelect.appendChild(option);
    });
  }

  function renderGallery() {
    els.gallery.innerHTML = "";
    els.adultCheck.classList.add("hidden");

    if (!state.selectedAisle) {
      els.emptyGallery.textContent = "No aisle selected yet. Choose an aisle above to show rewards.";
      els.emptyGallery.classList.remove("hidden");
      return;
    }

    if (state.selectedAisle === "adult" && !els.adultConfirm.checked) {
      els.emptyGallery.classList.add("hidden");
      els.adultCheck.classList.remove("hidden");
      return;
    }

    els.emptyGallery.classList.add("hidden");

    const items = getVisibleItems();

    if (!items.length) {
      els.emptyGallery.textContent = "No items found in this aisle yet.";
      els.emptyGallery.classList.remove("hidden");
      return;
    }

    items.forEach(function (item) {
      els.gallery.appendChild(createItemCard(item));
    });
  }

  function getVisibleItems() {
    if (state.selectedAisle === "all") {
      return STORE_ITEMS.slice();
    }

    return STORE_ITEMS.filter(function (item) {
      return item.aisle === state.selectedAisle;
    });
  }

  function createItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const image = document.createElement("div");
    image.className = "item-image";
    image.setAttribute("aria-hidden", "true");
    image.textContent = item.emoji || "🎁";

    const title = document.createElement("h3");
    title.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.description;

    const meta = document.createElement("div");
    meta.className = "item-meta";

    const cost = document.createElement("span");
    cost.textContent = "Cost: " + formatCurrency(item.priceCopper);

    const aisle = document.createElement("span");
    aisle.textContent = "Aisle: " + getAisleLabel(item.aisle);

    const tags = document.createElement("span");
    tags.textContent = "Tags: " + item.tags.join(", ");

    meta.append(cost, aisle, tags);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const qty = document.createElement("select");
    qty.setAttribute("aria-label", "Quantity for " + item.name);

    for (let i = 1; i <= 5; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = String(i);
      qty.appendChild(option);
    }

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add to Cart";
    addButton.addEventListener("click", function () {
      addItem(item.id, Number(qty.value || 1));
    });

    actions.append(qty, addButton);
    card.append(image, title, description, meta, actions);

    return card;
  }

  function renderCart() {
    els.cartLines.innerHTML = "";

    const lines = Object.values(state.cart);
    const totalQuantity = lines.reduce(function (sum, line) {
      return sum + line.quantity;
    }, 0);

    const totalCopper = lines.reduce(function (sum, line) {
      return sum + line.quantity * line.priceCopper;
    }, 0);

    els.cartCount.textContent = totalQuantity + " item" + (totalQuantity === 1 ? "" : "s");
    els.cartTotal.textContent = formatCurrency(totalCopper);

    if (!lines.length) {
      const empty = document.createElement("p");
      empty.textContent = "Cart is empty.";
      els.cartLines.appendChild(empty);
      return;
    }

    lines.forEach(function (line) {
      els.cartLines.appendChild(createCartLine(line));
    });
  }

  function createCartLine(line) {
    const wrap = document.createElement("div");
    wrap.className = "cart-line";

    const top = document.createElement("div");
    top.className = "cart-line-main";

    const name = document.createElement("strong");
    name.textContent = line.name;

    const lineTotal = document.createElement("span");
    lineTotal.textContent = formatCurrency(line.quantity * line.priceCopper);

    top.append(name, lineTotal);

    const details = document.createElement("div");
    details.textContent = line.quantity + " × " + formatCurrency(line.priceCopper);

    const controls = document.createElement("div");
    controls.className = "cart-line-controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "small";
    minus.textContent = "−";
    minus.addEventListener("click", function () {
      setQuantity(line.id, line.quantity - 1);
    });

    const qty = document.createElement("span");
    qty.textContent = String(line.quantity);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "small";
    plus.textContent = "+";
    plus.addEventListener("click", function () {
      setQuantity(line.id, line.quantity + 1);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small";
    remove.textContent = "Remove";
    remove.addEventListener("click", function () {
      removeItem(line.id);
    });

    controls.append(minus, qty, plus, remove);
    wrap.append(top, details, controls);

    return wrap;
  }

  function addItem(itemId, quantity) {
    const item = STORE_ITEMS.find(function (entry) {
      return entry.id === itemId;
    });

    if (!item) return;

    const cleanQuantity = clampInt(quantity, 1, 5);

    if (!state.cart[itemId]) {
      state.cart[itemId] = {
        id: item.id,
        aisle: item.aisle,
        name: item.name,
        priceCopper: item.priceCopper,
        quantity: 0
      };
    }

    state.cart[itemId].quantity = clampInt(state.cart[itemId].quantity + cleanQuantity, 1, 99);

    saveCart();
    renderCart();
    setMessage(item.name + " added to cart.");
  }

  function setQuantity(itemId, quantity) {
    if (!state.cart[itemId]) return;

    const cleanQuantity = Math.floor(Number(quantity || 0));

    if (cleanQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    state.cart[itemId].quantity = clampInt(cleanQuantity, 1, 99);
    saveCart();
    renderCart();
  }

  function removeItem(itemId) {
    if (!state.cart[itemId]) return;

    const name = state.cart[itemId].name;
    delete state.cart[itemId];

    saveCart();
    renderCart();
    setMessage(name + " removed.");
  }

  async function submitPurchase() {
    const lines = Object.values(state.cart);

    if (!lines.length) {
      setMessage("Add at least one reward before checkout.");
      return;
    }

    const totalCopper = lines.reduce(function (sum, line) {
      return sum + line.quantity * line.priceCopper;
    }, 0);

    const purchase = {
      action: "recordPurchase",
      app: ACTIVE_RULES.storeName,
      storeName: ACTIVE_RULES.storeName,
      purchaserProfile: PROFILE,
      pageOwner: ACTIVE_RULES.pageOwner,
      rewardProvidedBy: ACTIVE_RULES.rewardProvidedBy,
      totalCostCopper: totalCopper,
      totalCostDisplay: formatCurrency(totalCopper),
      note: els.checkoutNote.value.trim(),
      items: lines.map(function (line) {
        return {
          id: line.id,
          name: line.name,
          aisle: line.aisle,
          quantity: line.quantity,
          unitCostCopper: line.priceCopper,
          totalCostCopper: line.priceCopper * line.quantity
        };
      }),
      createdAt: new Date().toISOString()
    };

    const storedSession = window.OurSpaceBackend && typeof window.OurSpaceBackend.getStoredSession === "function"
      ? window.OurSpaceBackend.getStoredSession()
      : null;
    const sessionToken = (storedSession && storedSession.sessionToken) || localStorage.getItem("ourspace_session_token") || "";
    if (sessionToken) purchase.sessionToken = sessionToken;

    els.checkoutBtn.disabled = true;
    setMessage("Submitting purchase…");

    try {
      const backendUrl = window.OURSPACE_BACKEND_URL || (window.OURSPACE_CONFIG && window.OURSPACE_CONFIG.BACKEND_URL) || "";
      if (backendUrl) {
        const response = await fetch(backendUrl, {
          method: "POST",
          body: JSON.stringify(purchase)
        });

        const result = await response.json();

        if (!result.ok) {
          throw new Error(result.error || "Backend rejected purchase.");
        }

        finishCheckout("Purchase submitted. Total: " + formatCurrency(totalCopper) + ".");
        return;
      }

      saveLocalPurchase(purchase);

      window.dispatchEvent(new CustomEvent("ourspace:store-purchase", {
        detail: purchase
      }));

      finishCheckout("Purchase saved locally. Total: " + formatCurrency(totalCopper) + ".");
    } catch (error) {
      setMessage("Checkout error: " + error.message);
    } finally {
      els.checkoutBtn.disabled = false;
    }
  }

  function finishCheckout(message) {
    state.cart = {};
    saveCart();
    renderCart();
    els.checkoutNote.value = "";
    setMessage(message);
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
  }

  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveLocalPurchase(purchase) {
    const existing = loadLocalPurchases();
    existing.push({
      ...purchase,
      localPurchaseId: "local_" + Date.now() + "_" + Math.random().toString(16).slice(2)
    });

    localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(existing));
  }

  function loadLocalPurchases() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.purchases) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function getAisleLabel(aisleId) {
    const aisle = AISLES.find(function (entry) {
      return entry.id === aisleId;
    });

    return aisle ? aisle.label : aisleId;
  }

  function splitCurrency(totalCopper) {
    let remaining = Math.max(0, Math.floor(Number(totalCopper || 0)));

    const platinum = Math.floor(remaining / 1000);
    remaining %= 1000;

    const gold = Math.floor(remaining / 100);
    remaining %= 100;

    const silver = Math.floor(remaining / 10);
    const copper = remaining % 10;

    return {
      platinum: platinum,
      gold: gold,
      silver: silver,
      copper: copper
    };
  }

  function formatCurrency(totalCopper) {
    const coins = splitCurrency(totalCopper);
    const parts = [];

    if (coins.platinum) parts.push(coins.platinum + " platinum");
    if (coins.gold) parts.push(coins.gold + " gold");
    if (coins.silver) parts.push(coins.silver + " silver");
    if (coins.copper) parts.push(coins.copper + " copper");

    return parts.length ? parts.join(", ") : "0 copper";
  }

  function normalizeProfile(value) {
    const profile = String(value || "shared").toLowerCase().trim();

    if (profile === "jasper" || profile === "squishy") return "jasper";
    if (profile === "william" || profile === "dino") return "william";

    return "shared";
  }

  function clampInt(value, min, max) {
    const number = Math.floor(Number(value || 0));

    if (!Number.isFinite(number)) return min;

    return Math.min(Math.max(number, min), max);
  }

  function setMessage(message) {
    els.checkoutMessage.textContent = message;

    clearTimeout(setMessage.timer);
    setMessage.timer = setTimeout(function () {
      if (els.checkoutMessage.textContent === message) {
        els.checkoutMessage.textContent = "";
      }
    }, 5000);
  }

  function cloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();