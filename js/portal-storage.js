/* OurSpace Portal Storage v1
   Stores profiles, balances, custom tasks, check-ins, journals, notes, and logs locally.
*/
(function () {
  'use strict';

  const KEY = 'ourspace.portal.state.v1';
  const ACTIVE_KEY = 'ourspace.activeProfile.v1';

  const PROFILE_BASES = {
    dino: { id: 'dino', label: 'Papa / Dino Dad', defaultEmail: '' },
    momma: { id: 'momma', label: 'Momma / Squishy', defaultEmail: '' },
    shared: { id: 'shared', label: 'OurSpace shared', defaultEmail: '' },
    OurSpace: { id: 'OurSpace', label: 'OurSpace legacy alias', defaultEmail: '' }
  };

  function nowISO() { return new Date().toISOString(); }

  function createProfile(id, base) {
    base = Object.assign({}, PROFILE_BASES[id] || {}, base || {});
    return {
      id,
      label: base.label || id,
      email: base.defaultEmail || '',
      passwordHash: '',
      currencyCopper: 0,
      cart: [],
      customTasks: [],
      completed: [],
      receipts: [],
      diaryCards: [],
      journals: [],
      notes: {},
      links: [],
      customStoreItems: [],
      removedStoreItemIds: [],
      ourspaceCode: {},
      moduleLayouts: {},
      alertSignup: {
        email: false,
        text: false,
        phone: '',
        emailAddress: base.defaultEmail || '',
        cadence: 'persistent-kind'
      }
    };
  }

  function defaultState() {
    const profiles = {};
    Object.keys(PROFILE_BASES).forEach(id => { profiles[id] = createProfile(id, PROFILE_BASES[id]); });
    return {
      schema: 'ourspace.portal.state.v1',
      brand: 'OurSpace',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      activeProfileId: 'shared',
      profiles
    };
  }

  function normalizeProfile(id, profile) {
    const fresh = createProfile(id, PROFILE_BASES[id]);
    return Object.assign(fresh, profile || {}, {
      id,
      currencyCopper: Math.max(0, Math.round(Number(profile && profile.currencyCopper) || 0)),
      cart: Array.isArray(profile && profile.cart) ? profile.cart : [],
      customTasks: Array.isArray(profile && profile.customTasks) ? profile.customTasks : [],
      completed: Array.isArray(profile && profile.completed) ? profile.completed : [],
      receipts: Array.isArray(profile && profile.receipts) ? profile.receipts : [],
      diaryCards: Array.isArray(profile && profile.diaryCards) ? profile.diaryCards : [],
      journals: Array.isArray(profile && profile.journals) ? profile.journals : [],
      notes: profile && profile.notes && typeof profile.notes === 'object' ? profile.notes : {},
      links: Array.isArray(profile && profile.links) ? profile.links : [],
      customStoreItems: Array.isArray(profile && profile.customStoreItems) ? profile.customStoreItems : [],
      removedStoreItemIds: Array.isArray(profile && profile.removedStoreItemIds) ? profile.removedStoreItemIds : [],
      ourspaceCode: profile && profile.ourspaceCode && typeof profile.ourspaceCode === 'object' ? profile.ourspaceCode : {},
      moduleLayouts: profile && profile.moduleLayouts && typeof profile.moduleLayouts === 'object' ? profile.moduleLayouts : {},
      alertSignup: Object.assign(fresh.alertSignup, profile && profile.alertSignup || {})
    });
  }

  function normalizeState(state) {
    state = state && typeof state === 'object' ? state : defaultState();
    state.schema = 'ourspace.portal.state.v1';
    state.brand = 'OurSpace';
    state.profiles = state.profiles && typeof state.profiles === 'object' ? state.profiles : {};
    Object.keys(PROFILE_BASES).forEach(id => { state.profiles[id] = normalizeProfile(id, state.profiles[id]); });
    state.activeProfileId = state.profiles[state.activeProfileId] ? state.activeProfileId : 'shared';
    state.updatedAt = state.updatedAt || nowISO();
    return state;
  }

  function load() {
    try { return normalizeState(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (err) { return defaultState(); }
  }

  function save(state) {
    state = normalizeState(state);
    state.updatedAt = nowISO();
    localStorage.setItem(KEY, JSON.stringify(state));
    try { window.dispatchEvent(new CustomEvent('ourspace:portal-storage-updated', { detail: { state } })); } catch (err) {}
    return state;
  }

  function getProfile(id) {
    const state = load();
    id = id || state.activeProfileId || 'shared';
    if (!state.profiles[id]) {
      state.profiles[id] = createProfile(id, { label: id });
      save(state);
    }
    return state.profiles[id];
  }

  function updateProfile(id, patcher) {
    const state = load();
    id = id || state.activeProfileId || 'shared';
    if (!state.profiles[id]) state.profiles[id] = createProfile(id, { label: id });
    const profile = state.profiles[id];
    const result = typeof patcher === 'function' ? patcher(profile, state) : undefined;
    save(state);
    return result ?? profile;
  }

  function setActiveProfile(id) {
    const state = load();
    if (!state.profiles[id]) state.profiles[id] = createProfile(id, { label: id });
    state.activeProfileId = id;
    localStorage.setItem(ACTIVE_KEY, JSON.stringify({ id, profile: id, brand: 'OurSpace', updatedAt: nowISO() }));
    save(state);
    return state.profiles[id];
  }

  function getActiveProfileId() { return load().activeProfileId || 'shared'; }

  window.PortalStorage = Object.assign(window.PortalStorage || {}, {
    key: KEY,
    activeKey: ACTIVE_KEY,
    load,
    save,
    getProfile,
    updateProfile,
    setActiveProfile,
    getActiveProfileId,
    createProfile
  });
})();
