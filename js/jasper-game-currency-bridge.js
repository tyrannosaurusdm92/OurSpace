(function(){
  'use strict';

  const STORE_KEY = 'jasperCareCurrencyLedger.v2';
  const MAIN_STATE_KEY = 'jasper-squishy-care-cottage-v3';
  const MAIN_CURRENCY_KEY = 'jaspersCareCottageCurrency';
  const GAME_ID = (location.pathname.split('/').pop() || 'mobile-game').replace(/\.html?$/i,'').toLowerCase();
  const GAME_NAME = GAME_ID.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) || 'Mobile Game';
  const IS_FNAF = /^fnaf/.test(GAME_ID);
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  let interactionCount = 0;
  let detectedRewardCount = 0;
  let launchRewarded = false;
  const lastByKey = Object.create(null);
  const lastThrottle = Object.create(null);
  const seenText = new Map();
  const statValues = Object.create(null);
  const savedStorageSetItem = (typeof Storage !== 'undefined' && Storage.prototype && Storage.prototype.setItem) ? Storage.prototype.setItem : null;

  function amountToCopper(amount){
    if(typeof amount === 'number') return Math.max(0, Math.floor(amount));
    amount = amount || {};
    return (Number(amount.copper)||0) + (Number(amount.silver)||0)*10 + (Number(amount.gold)||0)*100 + (Number(amount.platinum)||0)*1000;
  }
  function copperToAmount(total){
    total = Math.max(0, Math.floor(Number(total)||0));
    const platinum = Math.floor(total / 1000); total %= 1000;
    const gold = Math.floor(total / 100); total %= 100;
    const silver = Math.floor(total / 10); total %= 10;
    const copper = total;
    return { platinum, gold, silver, copper };
  }
  function amountLabel(amountOrCopper){
    const amount = typeof amountOrCopper === 'number' ? copperToAmount(amountOrCopper) : amountOrCopper || {};
    const parts = [];
    if(amount.platinum) parts.push(`${amount.platinum}P`);
    if(amount.gold) parts.push(`${amount.gold}G`);
    if(amount.silver) parts.push(`${amount.silver}S`);
    if(amount.copper) parts.push(`${amount.copper}C`);
    return parts.length ? parts.join(' ') : '0C';
  }
  function normalizeAmount(amount){ return copperToAmount(amountToCopper(amount)); }
  function loadLedger(){
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {
        totalCopper: Number(parsed.totalCopper) || 0,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        categoryTotals: parsed.categoryTotals || {},
        createdAt: parsed.createdAt || new Date().toISOString()
      };
    } catch(err){
      return { totalCopper: 0, history: [], categoryTotals: {}, createdAt: new Date().toISOString() };
    }
  }
  function saveLedger(ledger){
    ledger.updatedAt = new Date().toISOString();
    ledger.currencyScale = { copper: 1, silver: 10, gold: 100, platinum: 1000, conversionRules: ['10 copper = 1 silver','10 silver = 1 gold','10 gold = 1 platinum'] };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(ledger)); } catch(err){}
  }
  function addToMainCurrency(copper, label){
    // Direct-open fallback. When a game is inside the cottage iframe, the parent handles the real tracker.
    try {
      const current = JSON.parse(localStorage.getItem(MAIN_CURRENCY_KEY) || 'null') || { copper:0, silver:0, gold:0, platinum:0 };
      const next = copperToAmount(amountToCopper(current) + copper);
      localStorage.setItem(MAIN_CURRENCY_KEY, JSON.stringify(next));
      const state = JSON.parse(localStorage.getItem(MAIN_STATE_KEY) || 'null');
      if(state && typeof state === 'object'){
        state.currency = next;
        state.activity = Array.isArray(state.activity) ? state.activity : [];
        state.activity.unshift({date:new Date().toISOString().slice(0,10),time:new Date().toISOString(),task:'mobile-game-reward',name:`Game: ${label}`,reward:copperToAmount(copper)});
        state.activity = state.activity.slice(0,400);
        localStorage.setItem(MAIN_STATE_KEY, JSON.stringify(state));
      }
    } catch(err){}
  }
  function localReward(amount, label, category='mobile_games', source='game_bridge'){
    const copper = amountToCopper(amount);
    if(!copper) return;
    const ledger = loadLedger();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      at: new Date().toISOString(),
      label,
      category,
      source,
      copper,
      amount: copperToAmount(copper),
      game: GAME_NAME,
      sessionId
    };
    ledger.totalCopper += copper;
    ledger.categoryTotals[category] = (ledger.categoryTotals[category] || 0) + copper;
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, 700);
    saveLedger(ledger);
    addToMainCurrency(copper, label);
    renderOverlay();
  }
  function reward(amount, label, extra={}){
    const copper = amountToCopper(amount);
    if(!copper) return;
    const normalized = normalizeAmount(copper);
    const msg = { type:'jasperCurrencyReward', amount:normalized, label, category:'mobile_games', source:'game_bridge', extra: { game: GAME_NAME, sessionId, ...extra } };
    let sent = false;
    try {
      if(window.parent && window.parent !== window){
        window.parent.postMessage(msg, '*');
        sent = true;
      }
    } catch(err){}
    if(!sent) localReward(normalized, label);
    detectedRewardCount += 1;
    flash(`+${amountLabel(copper)}`);
    renderOverlay();
  }
  function rewardOnce(key, amount, label, extra){
    if(lastByKey[key]) return;
    lastByKey[key] = Date.now();
    reward(amount, label, extra || { signal:key });
  }
  function rewardThrottled(key, ms, amount, label, extra){
    const now = Date.now();
    if(lastThrottle[key] && now - lastThrottle[key] < ms) return;
    lastThrottle[key] = now;
    reward(amount, label, extra || { signal:key });
  }
  function meaningfulAction(label='In-game action'){
    interactionCount += 1;
    if(interactionCount === 1) reward({ silver: 2 }, `${GAME_NAME} first in-game action`, { interactions: interactionCount });
    if(interactionCount % 8 === 0) reward({ silver: 3, copper: 5 }, `${GAME_NAME} in-game action streak`, { interactions: interactionCount });
    if(interactionCount % 32 === 0) reward({ gold: 1, silver: 5 }, `${GAME_NAME} strong play streak`, { interactions: interactionCount });
    if(interactionCount % 96 === 0) reward({ gold: 4 }, `${GAME_NAME} big effort streak`, { interactions: interactionCount });
    if(IS_FNAF && interactionCount % 5 === 0) reward({ silver: 6 }, 'FNAF defensive action bonus', { interactions: interactionCount, hardGameBonus:true });
    if(IS_FNAF && interactionCount % 25 === 0) reward({ gold: 3, silver: 5 }, 'FNAF hard-survival streak bonus', { interactions: interactionCount, hardGameBonus:true });
    renderOverlay();
  }
  function parseNumbers(text){
    const values=[];
    const re=/(-?\d{1,9})(?:\.\d+)?/g;
    let m;
    while((m=re.exec(text))) values.push(Number(m[1]));
    return values.filter(n=>Number.isFinite(n));
  }
  function maybeRewardStat(kind, value, rawText){
    if(!Number.isFinite(value) || value < 0) return;
    const statKeyText = String(rawText || '').toLowerCase().replace(/-?\d{1,9}(?:\.\d+)?/g,'#').replace(/\s+/g,' ').slice(0,80);
    const key = `${kind}:${statKeyText}`;
    const previous = statValues[key];
    if(previous === undefined){
      statValues[key] = value;
      return;
    }
    if(value <= previous){
      statValues[key] = Math.max(previous, value);
      return;
    }
    statValues[key] = value;
    const delta = value - previous;
    if(delta <= 0) return;
    if(/level|stage|round|wave|night|day/.test(kind)){
      reward({ gold: 2, silver: 5 }, `${GAME_NAME} ${kind} progress`, { kind, value, previous, delta, detectedFrom: rawText.slice(0,120) });
    } else if(/score|point|coin|gold|cash|money|star|gem|candy|fruit|fish|reward|xp/.test(kind)){
      const copper = Math.max(5, Math.min(900, Math.ceil(delta / 2)));
      reward(copperToAmount(copper), `${GAME_NAME} ${kind} converted to Squishy currency`, { kind, value, previous, delta, detectedFrom: rawText.slice(0,120) });
    }
  }
  function scanTextForRewards(text, source='text'){
    if(!text || typeof text !== 'string') return;
    text = String(text).replace(/\s+/g,' ').trim();
    if(!text || text.length < 2 || text.length > 220) return;
    const now = Date.now();
    const seenAt = seenText.get(text);
    if(seenAt && now - seenAt < 3000) return;
    seenText.set(text, now);
    if(seenText.size > 900){
      for(const k of seenText.keys()){ seenText.delete(k); if(seenText.size <= 700) break; }
    }
    const lower = text.toLowerCase();

    // General win / completion signals.
    if(/\b(level|stage|round|wave)\s*(complete|clear|cleared|won|win|passed|finished)\b/.test(lower) || /\b(you win|victory|mission complete|complete!)\b/.test(lower)){
      rewardThrottled('generic-win', 8000, { platinum: 1, gold: 4 }, `${GAME_NAME} level/win reward`, { source, text:text.slice(0,120) });
    }
    if(/\b(new high score|best score|record|achievement|unlocked|reward)\b/.test(lower)){
      rewardThrottled('achievement', 6000, { gold: 2, silver: 5 }, `${GAME_NAME} achievement reward`, { source, text:text.slice(0,120) });
    }

    // FNAF/FNAF4 hard-game bonuses.
    if(IS_FNAF){
      if(/\b6\s*a\.?m\.?\b|\b6am\b|\bnight\s*(survived|complete|cleared|won)|\bsurvived\b/.test(lower)){
        rewardThrottled('fnaf-night-survived', 15000, { platinum: 3, gold: 8, silver: 5 }, `${GAME_NAME} night survived hard-game bonus`, { source, text:text.slice(0,120), hardGameBonus:true });
      }
      if(/\b(mask|freddy mask)\b/.test(lower)){
        rewardThrottled('fnaf-mask', 2500, { silver: 8 }, `${GAME_NAME} mask survival action`, { source, text:text.slice(0,120), hardGameBonus:true });
      }
      if(/\b(door|close door|closed door|left door|right door)\b/.test(lower)){
        rewardThrottled('fnaf-door', 2500, { silver: 8 }, `${GAME_NAME} door survival action`, { source, text:text.slice(0,120), hardGameBonus:true });
      }
      if(/\b(light|flashlight|camera|cam|monitor|power)\b/.test(lower)){
        rewardThrottled('fnaf-light-camera', 2500, { silver: 5 }, `${GAME_NAME} defensive survival action`, { source, text:text.slice(0,120), hardGameBonus:true });
      }
    }

    // Key:value or label-number style score detection.
    const statRegex = /\b(score|points?|coins?|gold|cash|money|stars?|gems?|candy|fruit|fish|xp|level|stage|round|wave|night|day|reward)\b\s*[:=\- ]\s*(-?\d{1,9})/gi;
    let m;
    while((m = statRegex.exec(text))){ maybeRewardStat(m[1].toLowerCase(), Number(m[2]), text); }

    // Number preceding a score word, e.g. "500 coins".
    const reverseRegex = /(-?\d{1,9})\s*(score|points?|coins?|gold|cash|money|stars?|gems?|candy|fruit|fish|xp)/gi;
    while((m = reverseRegex.exec(text))){ maybeRewardStat(m[2].toLowerCase(), Number(m[1]), text); }
  }
  function installCanvasTextScanner(){
    try {
      const proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
      if(!proto || proto.__jasperCurrencyPatched) return;
      proto.__jasperCurrencyPatched = true;
      const originalFillText = proto.fillText;
      const originalStrokeText = proto.strokeText;
      if(typeof originalFillText === 'function'){
        proto.fillText = function(text){
          try { scanTextForRewards(String(text), 'canvas-fillText'); } catch(err){}
          return originalFillText.apply(this, arguments);
        };
      }
      if(typeof originalStrokeText === 'function'){
        proto.strokeText = function(text){
          try { scanTextForRewards(String(text), 'canvas-strokeText'); } catch(err){}
          return originalStrokeText.apply(this, arguments);
        };
      }
    } catch(err){}
  }
  function installDomScanner(){
    try {
      const scanNode = (node) => {
        if(!node) return;
        if(node.nodeType === Node.TEXT_NODE) scanTextForRewards(node.textContent, 'dom-text');
        else if(node.nodeType === Node.ELEMENT_NODE){
          const el = node;
          if(el.matches && el.matches('canvas,script,style,noscript')) return;
          const txt = (el.innerText || el.textContent || '').slice(0,260);
          scanTextForRewards(txt, 'dom-element');
        }
      };
      const observer = new MutationObserver(mutations => {
        for(const mut of mutations){
          if(mut.type === 'characterData') scanNode(mut.target);
          for(const node of mut.addedNodes || []) scanNode(node);
        }
      });
      observer.observe(document.documentElement || document.body, { childList:true, subtree:true, characterData:true });
      setTimeout(() => scanTextForRewards(document.body && document.body.innerText || '', 'initial-dom'), 1500);
    } catch(err){}
  }
  function installStorageScanner(){
    try {
      if(!savedStorageSetItem || Storage.prototype.__jasperCurrencyStoragePatched) return;
      Storage.prototype.__jasperCurrencyStoragePatched = true;
      Storage.prototype.setItem = function(key, value){
        try {
          const lowerKey = String(key || '').toLowerCase();
          if(/score|point|coin|gold|cash|money|star|gem|xp|level|stage|round|wave|night|best|high/.test(lowerKey)){
            const nums = parseNumbers(String(value));
            const max = nums.length ? Math.max.apply(null, nums) : NaN;
            if(Number.isFinite(max)) maybeRewardStat(lowerKey, max, `${key}:${value}`);
            else scanTextForRewards(`${key}:${value}`, 'localStorage');
          }
        } catch(err){}
        return savedStorageSetItem.apply(this, arguments);
      };
    } catch(err){}
  }
  function eventText(event){
    const t = event && event.target;
    if(!t) return '';
    const parts = [];
    try { if(t.id) parts.push(t.id); } catch(err){}
    try { if(t.className && typeof t.className === 'string') parts.push(t.className); } catch(err){}
    try { if(t.getAttribute){ ['aria-label','title','alt','data-action','data-control','data-name'].forEach(a => { const v=t.getAttribute(a); if(v) parts.push(v); }); } } catch(err){}
    try { if(t.innerText && t.innerText.length < 100) parts.push(t.innerText); } catch(err){}
    return parts.join(' ');
  }
  function registerAction(event){
    meaningfulAction('In-game action');
    const txt = eventText(event);
    if(txt) scanTextForRewards(txt, event.type || 'event');
    if(IS_FNAF){
      const lower = txt.toLowerCase();
      if(/mask/.test(lower)) rewardThrottled('fnaf-mask-event', 1800, { silver: 8 }, `${GAME_NAME} mask survival action`, { event:event.type, hardGameBonus:true });
      else if(/door/.test(lower)) rewardThrottled('fnaf-door-event', 1800, { silver: 8 }, `${GAME_NAME} door survival action`, { event:event.type, hardGameBonus:true });
      else if(/light|flash|cam|camera|monitor/.test(lower)) rewardThrottled('fnaf-tool-event', 1800, { silver: 5 }, `${GAME_NAME} defensive survival action`, { event:event.type, hardGameBonus:true });
    }
  }
  function ensureOverlay(){
    if(document.getElementById('jasperGameCurrencyOverlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #jasperGameCurrencyOverlay{position:fixed;right:10px;top:10px;z-index:2147483647;max-width:min(330px,calc(100vw - 20px));font:13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff9df;background:linear-gradient(135deg,rgba(27,14,36,.88),rgba(16,104,106,.78),rgba(242,138,61,.42));border:1px solid rgba(255,244,199,.62);border-radius:18px;padding:10px 11px;box-shadow:0 12px 36px rgba(0,0,0,.44),0 0 24px rgba(124,245,223,.20);backdrop-filter:blur(10px)}
      #jasperGameCurrencyOverlay b{color:#ffe59b}
      #jasperGameCurrencyOverlay .jgo-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #jasperGameCurrencyOverlay small{display:block;color:#fff4c7;margin-top:2px}
      #jasperGameCurrencyFlash{position:absolute;left:10px;bottom:-30px;background:linear-gradient(135deg,#ffe59b,#7cf5df);color:#201327;font-weight:950;border-radius:999px;padding:5px 9px;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s;box-shadow:0 8px 24px rgba(0,0,0,.28)}
      #jasperGameCurrencyFlash.show{opacity:1;transform:translateY(0)}
      @media(max-width:520px){#jasperGameCurrencyOverlay{left:8px;right:8px;top:8px;max-width:none;font-size:12px;padding:8px}}
    `;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'jasperGameCurrencyOverlay';
    box.innerHTML = `
      <div class="jgo-row"><strong>Squishy Currency</strong><b id="jgoBalance">auto</b></div>
      <small id="jgoStatus">In-game actions, scores, levels, wins, stars, coins, and rewards convert automatically. No game-time logging.</small>
      <div id="jasperGameCurrencyFlash"></div>
    `;
    document.body.appendChild(box);
    renderOverlay();
  }
  function renderOverlay(){
    const bal = document.getElementById('jgoBalance');
    if(bal) bal.textContent = amountLabel(loadLedger().totalCopper);
    const status = document.getElementById('jgoStatus');
    if(status) status.textContent = `${GAME_NAME}: ${interactionCount} actions · ${detectedRewardCount} rewards detected. No time logs.`;
  }
  function flash(text){
    const el = document.getElementById('jasperGameCurrencyFlash');
    if(!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(flash._timer);
    flash._timer = setTimeout(() => el.classList.remove('show'), 1300);
  }
  function init(){
    ensureOverlay();
    installCanvasTextScanner();
    installDomScanner();
    installStorageScanner();
    if(!launchRewarded){
      launchRewarded = true;
      reward({ silver: 8 }, `Launched ${GAME_NAME}`, { launch:true });
    }
    ['pointerdown','touchstart','click','keydown'].forEach(evt => window.addEventListener(evt, registerAction, { passive:true, capture:true }));
    window.addEventListener('message', (event) => { if(event.data && event.data.type === 'jasperCurrencySync') renderOverlay(); });
    try { window.parent?.postMessage({ type:'jasperCurrencySyncRequest' }, '*'); } catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
