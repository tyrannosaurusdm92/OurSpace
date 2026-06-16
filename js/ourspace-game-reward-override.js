/* OurSpace Game Reward Override v1
   Game/iframe-side reward detector. Include inside each game HTML after removing older reward bridges.
*/
(function () {
  'use strict';

  if (window.__OurSpaceGameRewardOverrideInstalled) return;
  window.__OurSpaceGameRewardOverrideInstalled = true;

  const currentScript = document.currentScript;
  const scriptSrc = currentScript && currentScript.src || '';
  const scriptDir = scriptSrc ? scriptSrc.replace(/[^/]*$/, '') : '';
  const rulesSrc = currentScript && currentScript.getAttribute('data-ourspace-rules-src') || (scriptDir ? scriptDir.replace(/\/js\/$/, '/json/') + 'ourspace_game_reward_rules.json' : '../json/ourspace_game_reward_rules.json');
  const cssSrc = currentScript && currentScript.getAttribute('data-ourspace-css-src') || (scriptDir ? scriptDir.replace(/\/js\/$/, '/css/') + 'ourspace-game-rewards.css' : '../css/ourspace-game-rewards.css');
  const params = new URLSearchParams(location.search || '');
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const gameId = normalizeGameId(params.get('game') || params.get('gameId') || document.documentElement.getAttribute('data-game-id') || (location.pathname.split('/').pop() || 'game').replace(/\.html?$/i, ''));
  const embedded = !!(window.parent && window.parent !== window);

  const FALLBACK_RULES = {
    currencyScale: { copper: 1, silver: 10, gold: 100, platinum: 1000 },
    defaultSessionCapCopper: 25000,
    globalEvents: {
      game_launch: { label: 'Game opened', totalCopper: 100, cooldownMs: 300000, maxPerSession: 1 },
      first_action: { label: 'First in-game action', totalCopper: 250, cooldownMs: 300000, maxPerSession: 1 },
      action_streak_small: { label: 'In-game action streak', totalCopper: 250, cooldownMs: 45000, maxPerSession: 8 },
      action_streak_large: { label: 'Strong play streak', totalCopper: 500, cooldownMs: 90000, maxPerSession: 4 },
      play_time_5_min: { label: 'Focused play block', totalCopper: 500, cooldownMs: 300000, maxPerSession: 6 },
      level_complete: { label: 'Level / round cleared', totalCopper: 900, cooldownMs: 20000, maxPerSession: 12 },
      achievement: { label: 'Achievement unlocked', totalCopper: 500, cooldownMs: 20000, maxPerSession: 10 },
      high_score: { label: 'High score / best score', totalCopper: 900, cooldownMs: 45000, maxPerSession: 8 },
      score_milestone: { label: 'Score milestone', totalCopper: 250, cooldownMs: 15000, maxPerSession: 20 },
      resource_milestone: { label: 'Resource / coin milestone', totalCopper: 250, cooldownMs: 15000, maxPerSession: 20 },
      game_over_recovery: { label: 'Played and reset safely', totalCopper: 100, cooldownMs: 120000, maxPerSession: 5 },
      fnaf_defensive_set: { label: 'FNAF defensive survival actions', totalCopper: 250, cooldownMs: 12000, maxPerSession: 20 },
      fnaf_hour_survived: { label: 'FNAF hour survived', totalCopper: 900, cooldownMs: 30000, maxPerSession: 8 },
      fnaf_night_survived: { label: 'FNAF night survived', totalCopper: 2500, cooldownMs: 60000, maxPerSession: 8 },
      fnaf_hard_clear: { label: 'FNAF hard clear', totalCopper: 5000, cooldownMs: 180000, maxPerSession: 3 }
    },
    gameRules: {}
  };

  let RULES = FALLBACK_RULES;
  let gameRules = {};
  let totalAwardedThisSession = 0;
  let actionCount = 0;
  let defensiveActionCount = 0;
  let focusSeconds = 0;
  const eventCounts = Object.create(null);
  const lastAwardAt = Object.create(null);
  const statValues = Object.create(null);
  const seenText = new Map();

  function normalizeGameId(value) {
    return String(value || 'game').toLowerCase().replace(/\.html?$/i, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'game';
  }

  function isFnaf() { return /^fnaf/.test(gameId) || /five-nights|freddy/i.test(document.title || ''); }

  function cleanInt(value) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function copperToAmount(totalCopper) {
    let total = cleanInt(totalCopper);
    const platinum = Math.floor(total / 1000); total %= 1000;
    const gold = Math.floor(total / 100); total %= 100;
    const silver = Math.floor(total / 10);
    const copper = total % 10;
    return { platinum, gold, silver, copper, totalCopper: cleanInt(totalCopper) };
  }

  function formatCurrency(totalCopper) {
    const a = copperToAmount(totalCopper);
    const parts = [];
    if (a.platinum) parts.push(`${a.platinum} platinum`);
    if (a.gold) parts.push(`${a.gold} gold`);
    if (a.silver) parts.push(`${a.silver} silver`);
    if (a.copper) parts.push(`${a.copper} copper`);
    return parts.join(', ') || '0 copper';
  }

  function eventRule(eventId) {
    const gameSpecific = gameRules.eventOverrides && gameRules.eventOverrides[eventId];
    return Object.assign({}, RULES.globalEvents && RULES.globalEvents[eventId] || {}, gameSpecific || {});
  }

  function eventEnabled(eventId) {
    if (!gameRules.enabledEvents || !gameRules.enabledEvents.length) return true;
    return gameRules.enabledEvents.indexOf(eventId) !== -1 || /^fnaf_/.test(eventId) && isFnaf();
  }

  function canAward(eventId, rule) {
    if (!eventEnabled(eventId)) return false;
    rule = rule || eventRule(eventId);
    const amount = cleanInt(rule.totalCopper);
    if (!amount) return false;
    const cap = cleanInt(gameRules.sessionCapCopper || RULES.defaultSessionCapCopper || 25000);
    if (cap && totalAwardedThisSession + amount > cap) return false;
    eventCounts[eventId] = eventCounts[eventId] || 0;
    if (rule.maxPerSession && eventCounts[eventId] >= rule.maxPerSession) return false;
    const now = Date.now();
    const last = lastAwardAt[eventId] || 0;
    if (rule.cooldownMs && last && now - last < rule.cooldownMs) return false;
    return true;
  }

  function directLocalAward(payload) {
    try {
      if (window.OurSpaceCurrency && typeof window.OurSpaceCurrency.award === 'function') {
        window.OurSpaceCurrency.award(payload);
        return;
      }
      const key = 'ourspace.directGameLedger.v1';
      const ledger = JSON.parse(localStorage.getItem(key) || 'null') || { totalCopper: 0, history: [] };
      ledger.totalCopper = cleanInt(ledger.totalCopper) + cleanInt(payload.totalCopper);
      ledger.updatedAt = new Date().toISOString();
      ledger.history.unshift(Object.assign({ at: ledger.updatedAt }, payload, { display: formatCurrency(payload.totalCopper) }));
      ledger.history = ledger.history.slice(0, 500);
      localStorage.setItem(key, JSON.stringify(ledger));
    } catch (err) {}
  }

  function award(eventId, detail) {
    const rule = eventRule(eventId);
    if (!canAward(eventId, rule)) return false;
    const amount = cleanInt(rule.totalCopper);
    eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
    lastAwardAt[eventId] = Date.now();
    totalAwardedThisSession += amount;
    const payload = {
      type: 'ourspace.game.reward.v1',
      source: 'ourspace-game-reward-override',
      sessionId,
      gameId,
      gameName: gameRules.name || document.title || gameId,
      eventId,
      label: rule.label || eventId,
      totalCopper: amount,
      amount: copperToAmount(amount),
      cooldownMs: rule.cooldownMs || 0,
      dedupeKey: `${gameId}:${sessionId}:${eventId}:${eventCounts[eventId]}`,
      detail: Object.assign({ url: location.pathname }, detail || {})
    };
    if (embedded) {
      try { window.parent.postMessage(payload, '*'); } catch (err) { directLocalAward(payload); }
    } else {
      directLocalAward(payload);
    }
    showAward(rule.label || eventId, amount);
    renderOverlay();
    return true;
  }

  function showAward(label, totalCopper) {
    ensureOverlay();
    const toast = document.createElement('div');
    toast.className = 'ourspace-reward-toast';
    toast.innerHTML = `<strong>+${escapeHtml(formatCurrency(totalCopper))}</strong><span>${escapeHtml(label)}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 1800);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function ensureCss() {
    if (document.querySelector('link[data-ourspace-reward-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssSrc;
    link.setAttribute('data-ourspace-reward-css', 'true');
    document.head.appendChild(link);
  }

  function ensureOverlay() {
    if (document.getElementById('ourspaceGameRewardOverlay')) return;
    ensureCss();
    const box = document.createElement('div');
    box.id = 'ourspaceGameRewardOverlay';
    box.innerHTML = `<div class="osgr-top"><strong>OurSpace</strong><span id="osgrSessionTotal">0 copper</span></div><div class="osgr-sub" id="osgrStatus">Rewards active</div>`;
    document.body.appendChild(box);
    renderOverlay();
  }

  function renderOverlay() {
    const total = document.getElementById('osgrSessionTotal');
    if (total) total.textContent = formatCurrency(totalAwardedThisSession);
    const status = document.getElementById('osgrStatus');
    if (status) status.textContent = `${gameRules.name || gameId}: ${actionCount} actions`;
  }

  function textRecentlySeen(text) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (!cleaned || cleaned.length < 2) return true;
    const now = Date.now();
    const previous = seenText.get(cleaned);
    if (previous && now - previous < 3500) return true;
    seenText.set(cleaned, now);
    if (seenText.size > 400) {
      for (const key of seenText.keys()) { seenText.delete(key); if (seenText.size < 260) break; }
    }
    return false;
  }

  function scanText(text, source) {
    if (textRecentlySeen(text)) return;
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const lower = raw.toLowerCase();
    if (/\b(new high score|best score|personal best|record|achievement|unlocked)\b/.test(lower)) award('high_score', { source, text: raw.slice(0, 160) }) || award('achievement', { source, text: raw.slice(0, 160) });
    if (/\b(you win|victory|level complete|stage clear|mission complete|round complete|wave clear|complete!)\b/.test(lower)) award('level_complete', { source, text: raw.slice(0, 160) });
    if (/\b(game over|try again|failed|you died|defeat)\b/.test(lower)) award('game_over_recovery', { source, text: raw.slice(0, 160) });

    if (isFnaf()) {
      if (/\b(6\s*a\.?m\.?|6am|night\s*(survived|complete|cleared)|survived)\b/.test(lower)) award('fnaf_night_survived', { source, text: raw.slice(0, 160), hardGame: true });
      if (/\b(night\s*[56]|20\/20\/20\/20|nightmare|custom night|hard mode)\b/.test(lower) && /\b(complete|clear|survived|win|won|6\s*a\.?m\.?)\b/.test(lower)) award('fnaf_hard_clear', { source, text: raw.slice(0, 160), hardGame: true });
      const hourMatch = lower.match(/\b([1-5])\s*a\.?m\.?\b/);
      if (hourMatch) award('fnaf_hour_survived', { source, hour: Number(hourMatch[1]), text: raw.slice(0, 160), hardGame: true });
    }

    const statRegex = /\b(score|points?|coins?|gold|cash|money|stars?|gems?|candy|fruit|fish|xp|level|stage|round|wave|night|day|reward)\b\s*[:=\- ]\s*(-?\d{1,9})/gi;
    let m;
    while ((m = statRegex.exec(raw))) handleStat(m[1].toLowerCase(), Number(m[2]), `${source}:${raw.slice(0, 160)}`);
    const reverseRegex = /(-?\d{1,9})\s*(score|points?|coins?|gold|cash|money|stars?|gems?|candy|fruit|fish|xp)/gi;
    while ((m = reverseRegex.exec(raw))) handleStat(m[2].toLowerCase(), Number(m[1]), `${source}:${raw.slice(0, 160)}`);
  }

  function handleStat(kind, value, source) {
    if (!Number.isFinite(value) || value < 0) return;
    const key = kind.replace(/\s+/g, '_');
    const previous = statValues[key];
    if (previous === undefined) { statValues[key] = value; return; }
    if (value <= previous) { statValues[key] = Math.max(previous, value); return; }
    statValues[key] = value;
    const delta = value - previous;
    if (/level|stage|round|wave|night|day/.test(key)) {
      if (delta >= 1) award(isFnaf() && /night/.test(key) ? 'fnaf_hour_survived' : 'level_complete', { kind, value, previous, delta, source });
      return;
    }
    if (/coin|gold|cash|money|gem|star|fish|xp/.test(key)) {
      if (delta >= 5 || value >= nextMilestone(previous, value)) award('resource_milestone', { kind, value, previous, delta, source });
      return;
    }
    if (/score|point|fruit|candy/.test(key)) {
      if (delta >= 10 || value >= nextMilestone(previous, value)) award('score_milestone', { kind, value, previous, delta, source });
    }
  }

  function nextMilestone(previous, current) {
    const thresholds = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    for (const t of thresholds) if (previous < t && current >= t) return t;
    return Infinity;
  }

  function getTargetText(target) {
    if (!target) return '';
    const parts = [];
    try { if (target.id) parts.push(target.id); } catch (err) {}
    try { if (typeof target.className === 'string') parts.push(target.className); } catch (err) {}
    try {
      if (target.getAttribute) ['aria-label', 'title', 'alt', 'data-action', 'data-control', 'data-name', 'role'].forEach(attr => {
        const v = target.getAttribute(attr); if (v) parts.push(v);
      });
    } catch (err) {}
    try { if (target.innerText && target.innerText.length < 120) parts.push(target.innerText); } catch (err) {}
    return parts.join(' ');
  }

  function registerAction(event) {
    actionCount += 1;
    if (actionCount === 1) award('first_action', { event: event.type });
    if (actionCount % 20 === 0) award('action_streak_small', { event: event.type, actionCount });
    if (actionCount % 80 === 0) award('action_streak_large', { event: event.type, actionCount });
    const txt = getTargetText(event.target);
    if (txt) scanText(txt, event.type);
    if (isFnaf()) {
      const lower = `${txt} ${event.key || ''} ${event.code || ''}`.toLowerCase();
      if (/door|light|camera|monitor|mask|flash|flashlight|listen|closet|bed|vent|shock/.test(lower)) {
        defensiveActionCount += 1;
        if (defensiveActionCount % 8 === 0) award('fnaf_defensive_set', { event: event.type, defensiveActionCount, hardGame: true });
      }
    }
    renderOverlay();
  }

  function installCanvasScanner() {
    try {
      const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
      if (!proto || proto.__OurSpaceTextScanner) return;
      proto.__OurSpaceTextScanner = true;
      const originalFillText = proto.fillText;
      const originalStrokeText = proto.strokeText;
      if (typeof originalFillText === 'function') {
        proto.fillText = function (text) { try { scanText(String(text), 'canvas-fillText'); } catch (err) {} return originalFillText.apply(this, arguments); };
      }
      if (typeof originalStrokeText === 'function') {
        proto.strokeText = function (text) { try { scanText(String(text), 'canvas-strokeText'); } catch (err) {} return originalStrokeText.apply(this, arguments); };
      }
    } catch (err) {}
  }

  function installDomScanner() {
    try {
      const observer = new MutationObserver(mutations => {
        for (const mut of mutations) {
          if (mut.type === 'characterData') scanText(mut.target && mut.target.textContent, 'dom-text');
          for (const node of mut.addedNodes || []) {
            if (node.nodeType === Node.TEXT_NODE) scanText(node.textContent, 'dom-text');
            else if (node.nodeType === Node.ELEMENT_NODE && !/^(SCRIPT|STYLE|CANVAS|NOSCRIPT)$/i.test(node.tagName || '')) {
              scanText((node.innerText || node.textContent || '').slice(0, 260), 'dom-element');
            }
          }
        }
      });
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true, characterData: true });
      setTimeout(() => scanText(document.body && document.body.innerText || '', 'initial-dom'), 1500);
    } catch (err) {}
  }

  function installStorageScanner() {
    try {
      if (!window.Storage || !Storage.prototype || Storage.prototype.__OurSpaceStorageScanner) return;
      const original = Storage.prototype.setItem;
      if (typeof original !== 'function') return;
      Storage.prototype.__OurSpaceStorageScanner = true;
      Storage.prototype.setItem = function (key, value) {
        try {
          const lowerKey = String(key || '').toLowerCase();
          const text = `${key}:${value}`;
          if (/score|point|coin|gold|cash|money|star|gem|xp|level|stage|round|wave|night|best|high|record|fish/.test(lowerKey)) {
            const numbers = String(value).match(/-?\d{1,9}/g) || [];
            if (numbers.length) handleStat(lowerKey, Math.max.apply(null, numbers.map(Number)), `localStorage:${key}`);
            else scanText(text, 'localStorage');
          }
        } catch (err) {}
        return original.apply(this, arguments);
      };
    } catch (err) {}
  }

  function installFocusTimer() {
    setInterval(() => {
      if (document.hidden) return;
      focusSeconds += 30;
      if (focusSeconds > 0 && focusSeconds % 300 === 0) award('play_time_5_min', { focusSeconds });
    }, 30000);
  }

  function installApi() {
    window.OurSpaceGameRewards = Object.assign(window.OurSpaceGameRewards || {}, {
      version: '1.0.0',
      gameId,
      sessionId,
      award,
      reportScore(value, kind) { handleStat(kind || 'score', Number(value), 'api-reportScore'); },
      scanText(text) { scanText(text, 'api-scanText'); },
      formatCurrency,
      getSessionTotalCopper() { return totalAwardedThisSession; }
    });
  }

  async function loadRules() {
    try {
      const res = await fetch(rulesSrc, { cache: 'no-store' });
      if (res.ok) RULES = Object.assign({}, FALLBACK_RULES, await res.json());
    } catch (err) {
      RULES = FALLBACK_RULES;
    }
    gameRules = (RULES.gameRules && RULES.gameRules[gameId]) || { name: document.title || gameId, enabledEvents: Object.keys(RULES.globalEvents || {}) };
  }

  async function init() {
    await loadRules();
    ensureOverlay();
    installApi();
    installCanvasScanner();
    installDomScanner();
    installStorageScanner();
    installFocusTimer();
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(type => window.addEventListener(type, registerAction, { capture: true, passive: true }));
    award('game_launch', { launch: true });
    renderOverlay();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
