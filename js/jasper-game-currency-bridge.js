(function(){
  'use strict';
  const STORE_KEY = 'jasperCareCurrencyLedger.v1';
  const GAME_ID = (location.pathname.split('/').pop() || 'mobile-game').replace(/\.html?$/i,'');
  const GAME_NAME = GAME_ID.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  let sessionSeconds = 0;
  let interactionCount = 0;
  let lastActivity = Date.now();
  let launchRewarded = false;
  let fiveMinuteRewarded = false;
  let lastInteractionRewardAt = 0;

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
    renderOverlay();
  }
  function reward(amount, label, extra={}){
    const msg = { type:'jasperCurrencyReward', amount, label, category:'mobile_games', source:'game_bridge', extra: { game: GAME_NAME, sessionId, ...extra } };
    let sent = false;
    try {
      if(window.parent && window.parent !== window){
        window.parent.postMessage(msg, '*');
        sent = true;
      }
    } catch(err){}
    if(!sent) localReward(amount, label);
    flash(`+${amountLabel(amountToCopper(amount))}`);
  }
  function activeEnough(){
    return !document.hidden && Date.now() - lastActivity < 90000;
  }
  function markActivity(){
    lastActivity = Date.now();
    interactionCount += 1;
    if(interactionCount % 25 === 0 && Date.now() - lastInteractionRewardAt > 10000){
      lastInteractionRewardAt = Date.now();
      reward({ copper: 7 }, 'Mobile game interaction milestone', { interactions: interactionCount });
    }
  }
  function ensureOverlay(){
    if(document.getElementById('jasperGameCurrencyOverlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #jasperGameCurrencyOverlay{position:fixed;right:10px;top:10px;z-index:2147483647;max-width:min(310px,calc(100vw - 20px));font:13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaffff;background:rgba(3,10,12,.82);border:1px solid rgba(97,255,243,.55);border-radius:16px;padding:10px 11px;box-shadow:0 8px 32px rgba(0,0,0,.45);backdrop-filter:blur(10px)}
      #jasperGameCurrencyOverlay b{color:#b5ff8a}
      #jasperGameCurrencyOverlay .jgo-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #jasperGameCurrencyOverlay small{display:block;color:#b2d3d7;margin-top:2px}
      #jasperGameCurrencyOverlay button{margin-top:7px;margin-right:4px;border:1px solid rgba(97,255,243,.45);border-radius:10px;background:rgba(97,255,243,.12);color:#eaffff;font-weight:800;padding:6px 8px}
      #jasperGameCurrencyFlash{position:absolute;left:10px;bottom:-28px;background:#b5ff8a;color:#031013;font-weight:900;border-radius:999px;padding:4px 8px;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}
      #jasperGameCurrencyFlash.show{opacity:1;transform:translateY(0)}
      @media(max-width:520px){#jasperGameCurrencyOverlay{left:8px;right:8px;top:8px;max-width:none;font-size:12px;padding:8px}#jasperGameCurrencyOverlay button{padding:5px 7px}}
    `;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'jasperGameCurrencyOverlay';
    box.innerHTML = `
      <div class="jgo-row"><strong>Jasper Currency Game</strong><b id="jgoBalance">0C</b></div>
      <small id="jgoStatus">Old game points are ignored; play converts to Jasper currency.</small>
      <button type="button" id="jgoFive">Claim 5-min decompress</button>
      <button type="button" id="jgoStop">Stop regulated</button>
      <div id="jasperGameCurrencyFlash"></div>
    `;
    document.body.appendChild(box);
    document.getElementById('jgoFive')?.addEventListener('click', () => reward({ gold: 2, silver: 5 }, 'Claimed game decompression session', { manualClaim: true }));
    document.getElementById('jgoStop')?.addEventListener('click', () => reward({ gold: 4 }, 'Stopped game while still regulated', { manualClaim: true }));
    renderOverlay();
  }
  function renderOverlay(){
    const bal = document.getElementById('jgoBalance');
    if(bal) bal.textContent = amountLabel(loadLedger().totalCopper);
    const status = document.getElementById('jgoStatus');
    if(status) status.textContent = `${GAME_NAME}: ${Math.floor(sessionSeconds/60)}m ${sessionSeconds%60}s session. Game points → Jasper currency.`;
  }
  function flash(text){
    const el = document.getElementById('jasperGameCurrencyFlash');
    if(!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(flash._timer);
    flash._timer = setTimeout(() => el.classList.remove('show'), 1300);
  }
  function startTimers(){
    setTimeout(() => {
      if(!launchRewarded){
        launchRewarded = true;
        reward({ silver: 5 }, `Launched ${GAME_NAME}`, { launch: true });
      }
    }, 2500);
    setInterval(() => {
      if(activeEnough()){
        sessionSeconds += 1;
        if(sessionSeconds % 60 === 0) reward({ silver: 3 }, 'Focused mobile game play minute', { sessionSeconds });
        if(sessionSeconds >= 300 && !fiveMinuteRewarded){
          fiveMinuteRewarded = true;
          reward({ gold: 2, silver: 5 }, 'Five-minute decompression game session', { sessionSeconds });
        }
      }
      renderOverlay();
    }, 1000);
  }
  function init(){
    ensureOverlay();
    ['pointerdown','touchstart','click','keydown'].forEach(evt => window.addEventListener(evt, markActivity, { passive:true, capture:true }));
    ['mousemove','touchmove'].forEach(evt => window.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive:true, capture:true }));
    window.addEventListener('storage', (event) => { if(event.key === STORE_KEY) renderOverlay(); });
    try { window.parent?.postMessage({ type:'jasperCurrencySyncRequest' }, '*'); } catch(err){}
    window.addEventListener('message', (event) => {
      if(event.data?.type === 'jasperCurrencySync') renderOverlay();
    });
    startTimers();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
