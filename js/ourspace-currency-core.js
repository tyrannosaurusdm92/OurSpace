/* OurSpace Currency Core v1
   Site/parent-side currency ledger and iframe reward listener.
   Use this on the main OurSpace page that launches games in iframes.
*/
(function () {
  'use strict';

  const CONFIG = Object.assign({
    ledgerKey: 'ourspace.currency.ledger.v1',
    profileKey: 'ourspace.activeProfile.v1',
    maxHistory: 1000,
    sessionDedupeMs: 2500,
    announceToDom: true,
    allowedGameIds: null,
    blockUnknownGameRewards: true
  }, window.OurSpaceCurrencyConfig || {});

  const SCALE = Object.freeze({ copper: 1, silver: 10, gold: 100, platinum: 1000 });
  const listeners = new Set();
  const lastDedupe = Object.create(null);

  function nowISO() { return new Date().toISOString(); }

  function cleanInt(value) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }


  function normalizedGameId(value) {
    return String(value || 'game').toLowerCase().replace(/\.html?$/i, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'game';
  }

  function isGameRewardInput(data) {
    const source = String(data && data.source || '').toLowerCase();
    const category = String(data && data.category || '').toLowerCase();
    const type = String(data && data.type || '').toLowerCase();
    return category === 'mobile_games' || source.indexOf('game') !== -1 || source.indexOf('play-to-earn') !== -1 || type === 'ourspace.game.reward.v1';
  }

  function isAllowedGameId(gameId) {
    if (!CONFIG.blockUnknownGameRewards) return true;
    if (!Array.isArray(CONFIG.allowedGameIds) || !CONFIG.allowedGameIds.length) return true;
    return CONFIG.allowedGameIds.map(normalizedGameId).indexOf(normalizedGameId(gameId)) !== -1;
  }

  function blockedLedger(data, gameId) {
    const ledger = loadLedger();
    const blocked = {
      id: `blocked-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: nowISO(),
      type: 'blocked-game-reward',
      source: data && data.source || 'unknown',
      category: data && data.category || 'mobile_games',
      gameId,
      label: 'Blocked non-OurSpace game reward',
      reason: 'Only bundled OurSpace games may earn game rewards.',
      privateCurrencyOnly: true,
      totalCopper: 0
    };
    ledger.blockedRewards = Array.isArray(ledger.blockedRewards) ? ledger.blockedRewards : [];
    ledger.blockedRewards.unshift(blocked);
    ledger.blockedRewards = ledger.blockedRewards.slice(0, 250);
    saveLedger(ledger);
    return ledger;
  }

  function amountToCopper(amount) {
    if (typeof amount === 'number') return cleanInt(amount);
    if (!amount || typeof amount !== 'object') return 0;
    if ('totalCopper' in amount) return cleanInt(amount.totalCopper);
    return cleanInt(amount.copper) + cleanInt(amount.silver) * 10 + cleanInt(amount.gold) * 100 + cleanInt(amount.platinum) * 1000;
  }

  function copperToAmount(totalCopper) {
    let total = cleanInt(totalCopper);
    const platinum = Math.floor(total / 1000); total %= 1000;
    const gold = Math.floor(total / 100); total %= 100;
    const silver = Math.floor(total / 10);
    const copper = total % 10;
    return { platinum, gold, silver, copper, totalCopper: cleanInt(totalCopper) };
  }

  function formatCurrency(amountOrCopper, options) {
    const opts = Object.assign({ short: false, zero: '0 copper' }, options || {});
    const amount = typeof amountOrCopper === 'number' ? copperToAmount(amountOrCopper) : copperToAmount(amountToCopper(amountOrCopper));
    const names = opts.short
      ? [['platinum', 'P'], ['gold', 'G'], ['silver', 'S'], ['copper', 'C']]
      : [['platinum', 'platinum'], ['gold', 'gold'], ['silver', 'silver'], ['copper', 'copper']];
    const parts = [];
    for (const [key, label] of names) {
      if (amount[key]) parts.push(opts.short ? `${amount[key]}${label}` : `${amount[key]} ${label}`);
    }
    return parts.length ? parts.join(opts.short ? ' ' : ', ') : opts.zero;
  }

  function emptyLedger() {
    return {
      schema: 'ourspace.currency.ledger.v1',
      brand: 'OurSpace',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      totalCopper: 0,
      currency: copperToAmount(0),
      categoryTotals: {},
      gameTotals: {},
      history: [],
      conversionRules: ['10 copper = 1 silver', '10 silver = 1 gold', '10 gold = 1 platinum']
    };
  }

  function loadLedger() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONFIG.ledgerKey) || 'null');
      if (!parsed || typeof parsed !== 'object') return emptyLedger();
      parsed.totalCopper = cleanInt(parsed.totalCopper || amountToCopper(parsed.currency));
      parsed.currency = copperToAmount(parsed.totalCopper);
      parsed.categoryTotals = parsed.categoryTotals && typeof parsed.categoryTotals === 'object' ? parsed.categoryTotals : {};
      parsed.gameTotals = parsed.gameTotals && typeof parsed.gameTotals === 'object' ? parsed.gameTotals : {};
      parsed.history = Array.isArray(parsed.history) ? parsed.history : [];
      return parsed;
    } catch (err) {
      return emptyLedger();
    }
  }

  function saveLedger(ledger) {
    ledger.updatedAt = nowISO();
    ledger.totalCopper = cleanInt(ledger.totalCopper);
    ledger.currency = copperToAmount(ledger.totalCopper);
    try { localStorage.setItem(CONFIG.ledgerKey, JSON.stringify(ledger)); } catch (err) {}
    notify(ledger);
    return ledger;
  }

  function notify(ledger, entry) {
    for (const fn of listeners) {
      try { fn(ledger, entry); } catch (err) {}
    }
    if (CONFIG.announceToDom) {
      try { window.dispatchEvent(new CustomEvent('ourspace:currency-updated', { detail: { ledger, entry } })); } catch (err) {}
      if (entry) {
        try { window.dispatchEvent(new CustomEvent('ourspace:currency-awarded', { detail: { ledger, entry } })); } catch (err) {}
      }
    }
  }

  function getActiveProfile() {
    try { return JSON.parse(localStorage.getItem(CONFIG.profileKey) || 'null') || {}; } catch (err) { return {}; }
  }

  function dedupeAllowed(key, cooldownMs) {
    if (!key) return true;
    const now = Date.now();
    const last = lastDedupe[key] || 0;
    const wait = cleanInt(cooldownMs || CONFIG.sessionDedupeMs);
    if (last && now - last < wait) return false;
    lastDedupe[key] = now;
    return true;
  }


  function syncPortalProfile(entry, data) {
    try {
      if (!entry || entry.totalCopper <= 0) return;
      if (data && data.detail && data.detail.portalSynced) return;
      if (!window.PortalStorage || typeof window.PortalStorage.updateProfile !== 'function') return;
      const profileId = entry.profile || 'shared';
      window.PortalStorage.updateProfile(profileId, profile => {
        profile.currencyCopper = cleanInt(profile.currencyCopper) + cleanInt(entry.totalCopper);
        profile.completed = Array.isArray(profile.completed) ? profile.completed : [];
        profile.completed.unshift({
          type: 'currency-earned',
          reason: entry.label || entry.eventId || 'OurSpace reward',
          amountCopper: entry.totalCopper,
          amount: entry.amount,
          display: entry.display,
          at: entry.at,
          category: entry.category,
          source: entry.source,
          gameId: entry.gameId,
          gameName: entry.gameName,
          detail: Object.assign({ ledgerSynced: true }, entry.detail || {})
        });
        profile.completed = profile.completed.slice(0, 1000);
      });
    } catch (err) {}
  }

  function award(input) {
    const data = Object.assign({}, input || {});
    const totalCopper = amountToCopper(data.totalCopper !== undefined ? data.totalCopper : data.amount);
    if (!totalCopper) return loadLedger();
    const gameId = normalizedGameId(data.gameId || data.game || 'game');
    if (isGameRewardInput(data) && !isAllowedGameId(gameId)) return blockedLedger(data, gameId);
    const eventId = String(data.eventId || data.reason || 'game_reward');
    const dedupeKey = data.dedupeKey || `${gameId}:${eventId}:${data.sessionId || 'session'}:${data.source || 'source'}`;
    if (!dedupeAllowed(dedupeKey, data.cooldownMs)) return loadLedger();

    const ledger = loadLedger();
    const profile = data.profile || getActiveProfile().id || getActiveProfile().profile || 'shared';
    const entry = {
      id: `ourspace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: nowISO(),
      source: data.source || 'game',
      category: data.category || 'mobile_games',
      profile,
      gameId,
      gameName: data.gameName || data.game || gameId,
      eventId,
      label: data.label || eventId.replace(/[-_]+/g, ' '),
      totalCopper,
      amount: copperToAmount(totalCopper),
      display: formatCurrency(totalCopper),
      detail: data.detail || {}
    };
    ledger.totalCopper += totalCopper;
    ledger.categoryTotals[entry.category] = cleanInt(ledger.categoryTotals[entry.category]) + totalCopper;
    ledger.gameTotals[gameId] = cleanInt(ledger.gameTotals[gameId]) + totalCopper;
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, CONFIG.maxHistory);
    syncPortalProfile(entry, data);
    saveLedger(ledger);
    return ledger;
  }


  function spend(input) {
    const data = Object.assign({}, input || {});
    const totalCopper = amountToCopper(data.totalCopper !== undefined ? data.totalCopper : data.amount);
    const ledger = loadLedger();
    if (!totalCopper) return ledger;
    if (ledger.totalCopper < totalCopper) {
      throw new Error(`Not enough currency. Need ${formatCurrency(totalCopper)} but only have ${formatCurrency(ledger.totalCopper)}.`);
    }
    const profile = data.profile || getActiveProfile().id || getActiveProfile().profile || 'shared';
    const entry = {
      id: `ourspace-spend-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: nowISO(),
      source: data.source || 'store',
      category: data.category || 'spending',
      profile,
      gameId: 'spend',
      eventId: data.eventId || 'currency_spent',
      label: data.label || data.reason || 'Currency spent',
      totalCopper: -totalCopper,
      amount: copperToAmount(totalCopper),
      display: '-' + formatCurrency(totalCopper),
      detail: data.detail || {}
    };
    ledger.totalCopper -= totalCopper;
    ledger.categoryTotals[entry.category] = cleanInt(ledger.categoryTotals[entry.category]) - totalCopper;
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, CONFIG.maxHistory);
    saveLedger(ledger, entry);
    return ledger;
  }

  function handleMessage(event) {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'ourspace.game.reward.v1') {
      award(Object.assign({ source: 'iframe-game' }, data));
      try { event.source && event.source.postMessage({ type: 'ourspace.currency.ack.v1', eventId: data.eventId, sessionId: data.sessionId }, '*'); } catch (err) {}
      return;
    }
    // All other reward-like messages are ignored. Only OurSpace v1 reward messages can pay.
  }

  function resetLedger() {
    return saveLedger(emptyLedger());
  }

  function exportLedger() {
    return JSON.stringify(loadLedger(), null, 2);
  }

  function install() {
    window.addEventListener('message', handleMessage, false);
    saveLedger(loadLedger());
  }

  window.OurSpaceCurrency = Object.assign(window.OurSpaceCurrency || {}, {
    version: '1.0.0',
    amountToCopper,
    copperToAmount,
    formatCurrency,
    loadLedger,
    saveLedger,
    award,
    resetLedger,
    exportLedger,
    spend,
    onChange(fn) { if (typeof fn === 'function') listeners.add(fn); return () => listeners.delete(fn); },
    install
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
