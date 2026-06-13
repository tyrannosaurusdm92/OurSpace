(function(){
  'use strict';
  const DATA = window.EMPEROR_ONYX_PERSONALITY_DATA || {};
  const CATALOG = window.JASPER_REWARD_CATALOG || { categories: [] };
  const STORE_KEY = 'jasperCareCurrencyLedger.v1';
  const ANNOUNCE_MS = 2800;
  const $ = (id) => document.getElementById(id);
  const normalize = (text) => String(text || '').toLowerCase().replace(/[’‘]/g, "'");
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

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
    if(amount.platinum) parts.push(`${amount.platinum} platinum`);
    if(amount.gold) parts.push(`${amount.gold} gold`);
    if(amount.silver) parts.push(`${amount.silver} silver`);
    if(amount.copper) parts.push(`${amount.copper} copper`);
    return parts.length ? parts.join(', ') : '0 copper';
  }
  function loadLedger(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if(!raw) return { totalCopper: 0, history: [], categoryTotals: {}, createdAt: new Date().toISOString() };
      const parsed = JSON.parse(raw);
      parsed.totalCopper = Number(parsed.totalCopper) || 0;
      parsed.history = Array.isArray(parsed.history) ? parsed.history : [];
      parsed.categoryTotals = parsed.categoryTotals || {};
      return parsed;
    } catch(err){
      return { totalCopper: 0, history: [], categoryTotals: {}, createdAt: new Date().toISOString() };
    }
  }
  function saveLedger(ledger){
    ledger.updatedAt = new Date().toISOString();
    ledger.currencyScale = CATALOG.currencyScale || { copper: 1, silver: 10, gold: 100, platinum: 1000 };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(ledger)); } catch(err){}
  }
  function addReward(amount, label, category='general', source='onyx', extra={}){
    const copper = amountToCopper(amount);
    if(!copper) return loadLedger();
    const ledger = loadLedger();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      at: new Date().toISOString(),
      label: String(label || 'Reward'),
      category,
      source,
      copper,
      amount: copperToAmount(copper),
      ...extra
    };
    ledger.totalCopper += copper;
    ledger.categoryTotals[category] = (ledger.categoryTotals[category] || 0) + copper;
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, 700);
    saveLedger(ledger);
    renderCurrency();
    announce(`+${amountLabel(copper)} — ${entry.label}`);
    return ledger;
  }
  function spendReward(amount, label='Spent from Jasper currency tracker', category='store'){
    const copper = amountToCopper(amount);
    const ledger = loadLedger();
    if(copper > ledger.totalCopper){
      announce(`Not enough Jasper currency for that yet.`);
      return false;
    }
    ledger.totalCopper -= copper;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      at: new Date().toISOString(),
      label,
      category,
      source: 'spend',
      copper: -copper,
      amount: copperToAmount(copper)
    };
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, 700);
    saveLedger(ledger);
    renderCurrency();
    announce(`-${amountLabel(copper)} — ${label}`);
    return true;
  }
  function renderCurrency(){
    const ledger = loadLedger();
    const amount = copperToAmount(ledger.totalCopper);
    const display = $('jasperCurrencyDisplay');
    if(display){
      display.innerHTML = `
        <span><strong>${amount.platinum}</strong> platinum</span>
        <span><strong>${amount.gold}</strong> gold</span>
        <span><strong>${amount.silver}</strong> silver</span>
        <span><strong>${amount.copper}</strong> copper</span>`;
    }
    const total = $('jasperCurrencyTotal');
    if(total) total.textContent = `${ledger.totalCopper.toLocaleString()} copper-value total`;
    const mini = $('jasperCurrencyMini');
    if(mini) mini.textContent = amountLabel(ledger.totalCopper);
    const hist = $('rewardHistory');
    if(hist){
      hist.innerHTML = ledger.history.slice(0, 12).map(entry => {
        const sign = entry.copper < 0 ? '-' : '+';
        return `<li><span>${sign}${amountLabel(Math.abs(entry.copper))}</span><small>${escapeHtml(entry.label)}</small></li>`;
      }).join('') || '<li><small>No rewards yet. Tiny paw steps await.</small></li>';
    }
    const categoryMount = $('rewardCategoryTotals');
    if(categoryMount){
      const rows = Object.entries(ledger.categoryTotals || {}).sort((a,b)=>b[1]-a[1]).slice(0,8);
      categoryMount.innerHTML = rows.map(([cat,copper]) => `<span>${escapeHtml(cat.replace(/_/g,' '))}: <b>${amountLabel(copper)}</b></span>`).join('') || '<span>No category totals yet.</span>';
    }
  }
  function announce(text){
    const el = $('rewardAnnouncement');
    if(!el) return;
    el.textContent = text;
    el.classList.add('show');
    window.clearTimeout(announce._timer);
    announce._timer = window.setTimeout(() => el.classList.remove('show'), ANNOUNCE_MS);
  }
  function renderRewardCatalog(){
    const mount = $('rewardCatalogMount');
    if(!mount) return;
    const categories = CATALOG.categories || [];
    mount.innerHTML = categories.map((cat, index) => `
      <details class="reward-category" ${index < 4 ? 'open' : ''}>
        <summary>
          <span>${escapeHtml(cat.title)}</span>
          <small>${escapeHtml((cat.tasks || []).length)} tiny rewards</small>
        </summary>
        <p>${escapeHtml(cat.description || '')}</p>
        <div class="reward-task-grid">
          ${(cat.tasks || []).map(t => `
            <button type="button" class="reward-task" data-reward-id="${escapeHtml(t.id)}" data-category="${escapeHtml(cat.key)}">
              <span>${escapeHtml(t.label)}</span>
              <b>+${escapeHtml(amountLabel(t.amount))}</b>
            </button>
          `).join('')}
        </div>
      </details>
    `).join('');
    mount.querySelectorAll('[data-reward-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = categories.find(c => c.key === btn.dataset.category);
        const t = (cat?.tasks || []).find(task => task.id === btn.dataset.rewardId);
        if(t) addReward(t.amount, t.label, cat.key, 'manual_tiny_step', { taskId: t.id });
      });
    });
  }
  function exportLedger(){
    const payload = {
      app: DATA.appName || 'Onyx reward system',
      exportedAt: new Date().toISOString(),
      conversion: CATALOG.currencyScale?.conversionRules || ['10 copper = 1 silver','10 silver = 1 gold','10 gold = 1 platinum'],
      ledger: loadLedger()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jasper_currency_ledger.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function resetLedger(){
    if(!confirm('Reset Jasper currency tracker on this device?')) return;
    saveLedger({ totalCopper: 0, history: [], categoryTotals: {}, resetAt: new Date().toISOString() });
    renderCurrency();
    announce('Jasper currency tracker reset.');
  }
  function rewardForMessage(text, source='chat'){
    const t = normalize(text);
    addReward({ silver: 2 }, 'Talked with Onyx', 'talking_with_onyx', source);
    if(/help|support|please|can you|i need/.test(t)) addReward({ gold: 1, silver: 5 }, 'Asked for help', 'talking_with_onyx', source);
    if(/dbt|wise mind|stop|tipp|check the facts|opposite action|dear man|give|fast|chain analysis|diary card/.test(t)) addReward({ gold: 2 }, 'Reached for a DBT skill', 'dbt_deescalation', source);
    if(/adhd|stuck|task|tiny step|body double|executive dysfunction|transition|timer/.test(t)) addReward({ gold: 2 }, 'Reached for an ADHD helper', 'adhd_tools', source);
    if(/journal|diary|write|log/.test(t)) addReward({ gold: 1, silver: 5 }, 'Opened journaling support', 'journaling', source);
    if(/panic|overwhelmed|de[-\s]?escalat|ground|breath|breathe|calm|dysregulated/.test(t)) addReward({ gold: 2 }, 'Chose de-escalation support', 'dbt_deescalation', source);
    if(/abandon|attachment|quiet bpd|discouraged bpd|petulant bpd|self[-\s]?destructive bpd|borderline|bpd|worthless|rejection/.test(t)) addReward({ gold: 3 }, 'Named attachment/BPD pattern', 'attachment_bpd_support', source);
    if(/eat|meal|drink|hydrate|meds|medication|shower|bath|wipe|teeth|brush|self[-\s]?care/.test(t)) addReward({ gold: 1 }, 'Named a body-care need', 'self_care_food_hydration_meds', source);
  }
  function initChatRewards(){
    const form = $('onyxChatForm');
    const input = $('onyxInput');
    if(form && input){
      form.addEventListener('submit', () => {
        const text = input.value || '';
        window.setTimeout(() => rewardForMessage(text, 'chat_message'), 0);
      }, true);
    }
    const quickRewards = {
      dbt_picker: [{gold:2}, 'Used DBT skill picker', 'dbt_deescalation'],
      tipp: [{gold:4}, 'Chose TIPP grounding', 'dbt_deescalation'],
      diary_card: [{gold:3}, 'Opened diary-card helper', 'journaling'],
      adhd_split: [{gold:2}, 'Opened ADHD tiny task splitter', 'adhd_tools'],
      body_double: [{gold:3}, 'Started body double mode', 'adhd_tools'],
      self_care_reset: [{gold:2}, 'Opened self-care reset', 'self_care_food_hydration_meds'],
      rewards: [{silver:5}, 'Checked Jasper currency tracker', 'talking_with_onyx'],
      mobile_games: [{silver:5}, 'Opened mobile game reward mode', 'mobile_games'],
      attachment_alarm: [{gold:3}, 'Named attachment alarm', 'attachment_bpd_support'],
      quiet_bpd: [{gold:3}, 'Named quiet/discouraged BPD state', 'attachment_bpd_support'],
      petulant_bpd: [{gold:3}, 'Named petulant BPD state', 'attachment_bpd_support'],
      self_destructive_bpd: [{gold:8}, 'Asked for safety-first self-destructive urge support', 'attachment_bpd_support']
    };
    document.querySelectorAll('[data-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const reward = quickRewards[btn.dataset.quick];
        if(reward) addReward(reward[0], reward[1], reward[2], 'quick_button');
      });
    });
  }
  function initGames(){
    const select = $('onyxGameSelect');
    const frame = $('onyxGameFrame');
    if(!select || !frame) return;
    const games = DATA.mobileGames || [];
    select.innerHTML = games.map(game => `<option value="${escapeHtml(game.file)}">${escapeHtml(game.name)}</option>`).join('');
    const launch = $('launchOnyxGame');
    const status = $('gameRewardStatus');
    function launchGame(){
      const file = select.value;
      if(!file) return;
      const game = games.find(g => g.file === file) || { name: file };
      frame.src = file;
      frame.title = `${game.name} — Jasper currency game`;
      if(status) status.textContent = `Playing ${game.name}. Play time and healthy interaction milestones now earn Jasper currency.`;
      addReward({ silver: 5 }, `Launched ${game.name}`, 'mobile_games', 'game_launcher', { game: game.name });
    }
    if(launch) launch.addEventListener('click', launchGame);
    const claimStop = $('claimRegulatedStop');
    if(claimStop) claimStop.addEventListener('click', () => addReward({ gold: 4 }, 'Stopped game while still regulated', 'mobile_games', 'manual_game_claim'));
    const claimReturn = $('claimReturnToCare');
    if(claimReturn) claimReturn.addEventListener('click', () => addReward({ gold: 5 }, 'Returned from game and chose care', 'mobile_games', 'manual_game_claim'));
    window.addEventListener('message', (event) => {
      const msg = event.data || {};
      if(msg && msg.type === 'jasperCurrencyReward'){
        addReward(msg.amount || msg.copper || 0, msg.label || 'Mobile game reward', msg.category || 'mobile_games', msg.source || 'game_bridge', msg.extra || {});
      }
      if(msg && msg.type === 'jasperCurrencySyncRequest'){
        try { event.source?.postMessage({ type:'jasperCurrencySync', ledger: loadLedger() }, '*'); } catch(err){}
      }
    });
    window.addEventListener('storage', (event) => {
      if(event.key === STORE_KEY) renderCurrency();
    });
  }
  function initControls(){
    const exportBtn = $('exportRewards');
    if(exportBtn) exportBtn.addEventListener('click', exportLedger);
    const resetBtn = $('resetRewards');
    if(resetBtn) resetBtn.addEventListener('click', resetLedger);
    const claimSelfCare = $('claimSelfCareStarter');
    if(claimSelfCare) claimSelfCare.addEventListener('click', () => addReward({ gold: 2 }, 'Started a self-care tiny step', 'self_care_food_hydration_meds', 'manual_claim'));
    const claimAskHelp = $('claimAskHelp');
    if(claimAskHelp) claimAskHelp.addEventListener('click', () => addReward({ gold: 1, silver: 5 }, 'Asked for help', 'talking_with_onyx', 'manual_claim'));
  }
  function init(){
    window.JasperCurrency = { addReward, spendReward, loadLedger, saveLedger, renderCurrency, amountLabel, copperToAmount, amountToCopper };
    renderCurrency();
    renderRewardCatalog();
    initControls();
    initChatRewards();
    initGames();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
