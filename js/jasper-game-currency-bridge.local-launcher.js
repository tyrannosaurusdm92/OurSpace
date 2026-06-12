/*
  Jasper Game Currency Bridge + Local Game Launcher
  GitHub page: https://tyrannosaurusdm92.github.io/SquishyRewards/index.html
  Local games folder on your PC: C:\\Users\\Public\\Documents\\SquishyRewards\\Games

  HOW IT WORKS
  1) Keep this file on GitHub with your SquishyRewards site.
  2) Start a local server on Jasper/your PC from:
       C:\Users\Public\Documents\SquishyRewards
     using:
       py -3 -m http.server 8787 --bind 127.0.0.1
  3) This launcher opens games from:
       http://127.0.0.1:8787/Games/<game>.html

  Browser note:
  A public GitHub Pages site cannot safely open C:\ paths directly.
  The localhost URL is the browser-safe bridge to that same local folder.
*/
(function(){
  'use strict';

  const STORE_KEY = 'jasperCareCurrencyLedger.v1';
  const SETTINGS_KEY = 'jasperGameLauncherSettings.v1';
  const ACTIVE_SESSION_KEY = 'jasperActiveLocalGameSession.v1';

  const GITHUB_SITE_URL = 'https://tyrannosaurusdm92.github.io/SquishyRewards/index.html';
  const WINDOWS_GAMES_FOLDER = 'C:\\Users\\Public\\Documents\\SquishyRewards\\Games';
  const DEFAULT_LOCAL_GAMES_ROOT = 'http://127.0.0.1:8787/Games/';

  const GAME_LIBRARY = [
    { id:'theyarecoming', title:'They Are Coming', favorite:false },
    { id:'tinyfishing', title:'Tiny Fishing', favorite:false },
    { id:'zombierush', title:'Zombie Rush', favorite:false },
    { id:'fnaf4', title:'FNAF 4', favorite:true },
    { id:'fnaf3', title:'FNAF 3', favorite:true },
    { id:'fnaf2', title:'FNAF 2', favorite:true },
    { id:'fnaf', title:'FNAF', favorite:true },
    { id:'minesweeper', title:'Minesweeper', favorite:false },
    { id:'noobminer', title:'Noob Miner', favorite:false },
    { id:'tabletennisworldtour', title:'Table Tennis World Tour', favorite:false },
    { id:'badicecream3', title:'Bad Ice Cream 3', favorite:false },
    { id:'candycrush', title:'Candy Crush', favorite:false },
    { id:'capybaraclicker', title:'Capybara Clicker', favorite:false },
    { id:'flappybird', title:'Flappy Bird', favorite:false }
  ];

  const GAME_BY_ID = GAME_LIBRARY.reduce((map, game) => {
    map[game.id] = game;
    return map;
  }, Object.create(null));

  const pathGameId = (location.pathname.split('/').pop() || 'mobile-game').replace(/\.html?$/i,'').toLowerCase();
  const pageLooksLikeGame = Boolean(GAME_BY_ID[pathGameId]);
  const fallbackGameName = pathGameId.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  let currentGame = pageLooksLikeGame ? GAME_BY_ID[pathGameId] : null;
  let sessionSeconds = 0;
  let interactionCount = 0;
  let lastActivity = Date.now();
  let launchRewarded = false;
  let fiveMinuteRewarded = false;
  let lastInteractionRewardAt = 0;
  let activeIframe = null;
  let openedWindowRef = null;
  let localPlayActive = false;
  let localSessionStartedAt = 0;
  let localServerStatus = 'unknown';

  function getGameName(){
    return currentGame?.title || fallbackGameName || 'Mobile Game';
  }

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
    ledger.currencyScale = {
      copper: 1,
      silver: 10,
      gold: 100,
      platinum: 1000,
      conversionRules: ['10 copper = 1 silver','10 silver = 1 gold','10 gold = 1 platinum']
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(ledger)); } catch(err){}
  }

  function loadSettings(){
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        localRoot: normalizeRoot(parsed.localRoot || DEFAULT_LOCAL_GAMES_ROOT),
        openMode: parsed.openMode === 'tab' ? 'tab' : 'iframe',
        filePattern: ['html','index','folder'].includes(parsed.filePattern) ? parsed.filePattern : 'html'
      };
    } catch(err){
      return { localRoot: DEFAULT_LOCAL_GAMES_ROOT, openMode: 'iframe', filePattern: 'html' };
    }
  }

  function saveSettings(settings){
    const clean = {
      localRoot: normalizeRoot(settings.localRoot || DEFAULT_LOCAL_GAMES_ROOT),
      openMode: settings.openMode === 'tab' ? 'tab' : 'iframe',
      filePattern: ['html','index','folder'].includes(settings.filePattern) ? settings.filePattern : 'html'
    };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean)); } catch(err){}
    return clean;
  }

  function normalizeRoot(root){
    root = String(root || DEFAULT_LOCAL_GAMES_ROOT).trim();
    if(!root) root = DEFAULT_LOCAL_GAMES_ROOT;
    return root.endsWith('/') ? root : `${root}/`;
  }

  function gameUrl(game, pattern){
    const settings = loadSettings();
    const root = normalizeRoot(settings.localRoot);
    const chosenPattern = pattern || settings.filePattern || 'html';
    if(chosenPattern === 'index') return `${root}${encodeURIComponent(game.id)}/index.html`;
    if(chosenPattern === 'folder') return `${root}${encodeURIComponent(game.id)}/`;
    return `${root}${encodeURIComponent(game.id)}.html`;
  }

  function localFileUrl(game){
    return `file:///C:/Users/Public/Documents/SquishyRewards/Games/${encodeURIComponent(game.id)}.html`;
  }

  function localReward(amount, label, category='mobile_games', source='game_bridge', extra={}){
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
      game: getGameName(),
      sessionId,
      extra
    };
    ledger.totalCopper += copper;
    ledger.categoryTotals[category] = (ledger.categoryTotals[category] || 0) + copper;
    ledger.history.unshift(entry);
    ledger.history = ledger.history.slice(0, 700);
    saveLedger(ledger);
    renderOverlay();
    renderLauncherBalance();
    try {
      window.dispatchEvent(new CustomEvent('jasperCurrencyRewardLocal', {
        detail: {
          type: 'jasperCurrencyReward',
          amount: copperToAmount(copper),
          label,
          category,
          source,
          extra: { game: getGameName(), sessionId, ...extra }
        }
      }));
    } catch(err){}
  }

  function reward(amount, label, extra={}){
    const msg = {
      type:'jasperCurrencyReward',
      amount,
      label,
      category:'mobile_games',
      source:'game_bridge',
      extra: { game: getGameName(), sessionId, ...extra }
    };
    let sent = false;
    try {
      if(window.parent && window.parent !== window){
        window.parent.postMessage(msg, '*');
        sent = true;
      }
    } catch(err){}
    if(!sent) localReward(amount, label, 'mobile_games', 'game_bridge', extra);
    flash(`+${amountLabel(amountToCopper(amount))}`);
  }

  function activeEnough(){
    if(document.hidden) return false;
    if(localPlayActive) return true;
    return Date.now() - lastActivity < 90000;
  }

  function markActivity(){
    lastActivity = Date.now();
    interactionCount += 1;
  }

  function ensureOverlay(){
    if(document.getElementById('jasperGameCurrencyOverlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #jasperGameCurrencyOverlay{position:fixed;right:10px;top:10px;z-index:2147483647;max-width:min(330px,calc(100vw - 20px));font:13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaffff;background:rgba(3,10,12,.82);border:1px solid rgba(97,255,243,.55);border-radius:16px;padding:10px 11px;box-shadow:0 8px 32px rgba(0,0,0,.45);backdrop-filter:blur(10px)}
      #jasperGameCurrencyOverlay b{color:#b5ff8a}
      #jasperGameCurrencyOverlay .jgo-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #jasperGameCurrencyOverlay small{display:block;color:#b2d3d7;margin-top:2px}
      #jasperGameCurrencyOverlay button{margin-top:7px;margin-right:4px;border:1px solid rgba(97,255,243,.45);border-radius:10px;background:rgba(97,255,243,.12);color:#eaffff;font-weight:800;padding:6px 8px;cursor:pointer}
      #jasperGameCurrencyFlash{position:absolute;left:10px;bottom:-28px;background:#b5ff8a;color:#031013;font-weight:900;border-radius:999px;padding:4px 8px;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}
      #jasperGameCurrencyFlash.show{opacity:1;transform:translateY(0)}
      @media(max-width:520px){#jasperGameCurrencyOverlay{left:8px;right:8px;top:8px;max-width:none;font-size:12px;padding:8px}#jasperGameCurrencyOverlay button{padding:5px 7px}}
    `;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'jasperGameCurrencyOverlay';
    box.innerHTML = `
      <div class="jgo-row"><strong>Jasper Currency Game</strong><b id="jgoBalance">0C</b></div>
      <small id="jgoStatus">Old game points are ignored; tracked playtime converts to Jasper currency.</small>
      <button type="button" id="jgoStop">Stop game timer</button>
      <div id="jasperGameCurrencyFlash"></div>
    `;
    document.body.appendChild(box);
    document.getElementById('jgoStop')?.addEventListener('click', () => {
      stopLocalGame(false);
    });
    renderOverlay();
  }

  function renderOverlay(){
    const bal = document.getElementById('jgoBalance');
    if(bal) bal.textContent = amountLabel(loadLedger().totalCopper);
    const status = document.getElementById('jgoStatus');
    if(status){
      if(currentGame){
        status.textContent = `${getGameName()}: ${Math.floor(sessionSeconds/60)}m ${sessionSeconds%60}s session. Game points → Jasper currency.`;
      } else {
        status.textContent = `Launcher ready. Balance updates here while Jasper plays local games.`;
      }
    }
  }

  function renderLauncherBalance(){
    const el = document.getElementById('jglBalance');
    if(el) el.textContent = amountLabel(loadLedger().totalCopper);
    const mini = document.getElementById('jglMiniBalance');
    if(mini) mini.textContent = amountLabel(loadLedger().totalCopper);
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
    setInterval(() => {
      if((pageLooksLikeGame || localPlayActive) && activeEnough()){
        sessionSeconds += 1;
        if(sessionSeconds % 60 === 0){
          reward({ silver: 3 }, 'Focused mobile game play minute', { sessionSeconds, mode: localPlayActive ? 'local_launcher' : 'embedded_bridge' });
        }
        if(sessionSeconds >= 300 && !fiveMinuteRewarded){
          fiveMinuteRewarded = true;
          reward({ gold: 2, silver: 5 }, 'Five-minute decompression game session', { sessionSeconds, mode: localPlayActive ? 'local_launcher' : 'embedded_bridge' });
        }
      }
      renderOverlay();
      renderLocalSessionStatus();
    }, 1000);
  }

  function shouldRenderLauncher(){
    if(window !== window.parent) return false;
    if(pageLooksLikeGame) return false;
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();
    return host.includes('tyrannosaurusdm92.github.io') || path.endsWith('/index.html') || path.endsWith('/') || document.getElementById('jasperGameLauncher');
  }

  function ensureLauncher(){
    if(!shouldRenderLauncher()) return;
    if(document.getElementById('jasperLocalGameLauncher')) return;
    const settings = loadSettings();
    const style = document.createElement('style');
    style.textContent = `
      #jasperLocalGameLauncher{box-sizing:border-box;width:min(1120px,calc(100vw - 22px));margin:18px auto;padding:16px;border-radius:24px;border:1px solid rgba(255,190,97,.38);background:linear-gradient(135deg,rgba(23,15,10,.90),rgba(6,28,31,.88));color:#fff7df;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 18px 54px rgba(0,0,0,.42)}
      #jasperLocalGameLauncher *{box-sizing:border-box}
      #jasperLocalGameLauncher h2{margin:0 0 5px;font-size:clamp(22px,4vw,34px);color:#ffe28c;letter-spacing:.02em}
      #jasperLocalGameLauncher p{margin:5px 0;color:#cbeff0}
      #jasperLocalGameLauncher code{white-space:normal;color:#b5ffea;background:rgba(0,0,0,.25);padding:2px 5px;border-radius:7px}
      .jgl-top{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;align-items:start}
      .jgl-card{border:1px solid rgba(123,255,236,.26);border-radius:18px;background:rgba(0,0,0,.22);padding:12px}
      .jgl-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .jgl-balance{font-weight:900;color:#b5ff8a;font-size:22px}
      .jgl-settings{display:grid;grid-template-columns:1.4fr .7fr .7fr;gap:8px;margin-top:10px}
      .jgl-settings label{display:block;font-weight:800;color:#ffe28c;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
      .jgl-settings input,.jgl-settings select{width:100%;border:1px solid rgba(123,255,236,.35);border-radius:12px;background:rgba(0,0,0,.34);color:#f8ffff;padding:9px;font:inherit}
      .jgl-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .jgl-actions button,.jgl-game button{border:0;border-radius:13px;background:linear-gradient(135deg,#ffb25c,#ffdf80);color:#241107;font-weight:950;padding:9px 12px;cursor:pointer;box-shadow:0 5px 14px rgba(0,0,0,.25)}
      .jgl-actions button.secondary,.jgl-game button.secondary{background:rgba(123,255,236,.15);color:#eaffff;border:1px solid rgba(123,255,236,.35)}
      .jgl-actions button.danger{background:rgba(255,129,129,.16);color:#ffdada;border:1px solid rgba(255,129,129,.38)}
      .jgl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:14px}
      .jgl-game{display:flex;flex-direction:column;gap:8px;min-height:132px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.06);padding:12px}
      .jgl-game strong{font-size:17px;color:#fff3b7}.jgl-game small{color:#a7d9dc}.jgl-game.favorite{border-color:rgba(255,226,140,.70);background:rgba(255,192,102,.10)}
      .jgl-playbox{display:none;margin-top:14px;border:1px solid rgba(123,255,236,.35);border-radius:20px;overflow:hidden;background:#020809}
      .jgl-playbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px;background:rgba(123,255,236,.10)}
      .jgl-playbar strong{color:#ffe28c}.jgl-playbar span{color:#b5ff8a;font-weight:900}
      #jasperLocalGameFrame{display:block;width:100%;height:min(72vh,760px);border:0;background:#000}
      .jgl-help{margin-top:12px;padding:10px;border-radius:16px;background:rgba(255,222,128,.09);border:1px solid rgba(255,222,128,.25);color:#fff0bf}
      @media(max-width:760px){.jgl-top{grid-template-columns:1fr}.jgl-settings{grid-template-columns:1fr}.jgl-grid{grid-template-columns:1fr 1fr}#jasperLocalGameFrame{height:68vh}}
      @media(max-width:520px){#jasperLocalGameLauncher{margin-top:74px;padding:11px}.jgl-grid{grid-template-columns:1fr}.jgl-game{min-height:unset}.jgl-actions button,.jgl-game button{width:100%}}
    `;
    document.head.appendChild(style);

    const mount = document.getElementById('jasperGameLauncher') || document.createElement('section');
    if(!mount.id) document.body.prepend(mount);
    mount.id = 'jasperLocalGameLauncher';
    mount.innerHTML = `
      <div class="jgl-top">
        <div class="jgl-card">
          <h2>Jasper's Local Game Arcade</h2>
          <p>Games stay on this computer at <code>${escapeHtml(WINDOWS_GAMES_FOLDER)}</code>, while this GitHub page awards Jasper currency from tracked playtime.</p>
          <p>Start localhost first, then choose a game. FNAF is starred because Jasper especially wants it. Timed rewards count while the game stays open inside this page.</p>
          <div class="jgl-actions">
            <button type="button" id="jglTestServer">Check localhost</button>
            <button type="button" id="jglOpenFolder" class="secondary">Open local Games index</button>
            <button type="button" id="jglStopGame" class="danger">Stop current game</button>
          </div>
          <div class="jgl-help" id="jglServerHelp">Localhost expected: <code>${escapeHtml(DEFAULT_LOCAL_GAMES_ROOT)}</code></div>
        </div>
        <div class="jgl-card">
          <div class="jgl-row"><strong>Currency Balance</strong><span class="jgl-balance" id="jglBalance">${amountLabel(loadLedger().totalCopper)}</span></div>
          <p id="jglSessionStatus">No local game is running yet.</p>
          <div class="jgl-settings">
            <div>
              <label for="jglLocalRoot">Local games URL</label>
              <input id="jglLocalRoot" value="${escapeAttr(settings.localRoot)}" spellcheck="false">
            </div>
            <div>
              <label for="jglOpenMode">Open mode</label>
              <select id="jglOpenMode">
                <option value="iframe" ${settings.openMode === 'iframe' ? 'selected' : ''}>inside page</option>
                <option value="tab" ${settings.openMode === 'tab' ? 'selected' : ''}>new tab</option>
              </select>
            </div>
            <div>
              <label for="jglFilePattern">Game file type</label>
              <select id="jglFilePattern">
                <option value="html" ${settings.filePattern === 'html' ? 'selected' : ''}>game.html</option>
                <option value="index" ${settings.filePattern === 'index' ? 'selected' : ''}>game/index.html</option>
                <option value="folder" ${settings.filePattern === 'folder' ? 'selected' : ''}>game/</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="jgl-grid" id="jglGameGrid"></div>
      <div class="jgl-playbox" id="jglPlayBox">
        <div class="jgl-playbar">
          <strong id="jglNowPlaying">Now playing</strong>
          <span id="jglMiniBalance">${amountLabel(loadLedger().totalCopper)}</span>
          <div class="jgl-actions" style="margin:0">
            <button type="button" id="jglOpenCurrentTab" class="secondary">Open current in tab fallback</button>
            <button type="button" id="jglCloseFrame" class="danger">Close</button>
          </div>
        </div>
        <iframe id="jasperLocalGameFrame" title="Jasper local game"></iframe>
      </div>
    `;

    renderGameButtons();
    bindLauncherEvents();
    renderLauncherBalance();
    checkLocalServer(false);
  }

  function renderGameButtons(){
    const grid = document.getElementById('jglGameGrid');
    if(!grid) return;
    const favorites = GAME_LIBRARY.filter(g => g.favorite);
    const others = GAME_LIBRARY.filter(g => !g.favorite);
    const ordered = [...favorites, ...others];
    grid.innerHTML = ordered.map(game => `
      <article class="jgl-game ${game.favorite ? 'favorite' : ''}" data-game-id="${escapeAttr(game.id)}">
        <strong>${game.favorite ? '⭐ ' : ''}${escapeHtml(game.title)}</strong>
        <small>${escapeHtml(game.id)} · awards timed play and 5-minute decompression currency</small>
        <button type="button" data-action="play" data-game-id="${escapeAttr(game.id)}">Play ${escapeHtml(game.title)}</button>
        <button type="button" class="secondary" data-action="tab" data-game-id="${escapeAttr(game.id)}">Open tab fallback</button>
      </article>
    `).join('');
  }

  function bindLauncherEvents(){
    const rootInput = document.getElementById('jglLocalRoot');
    const openMode = document.getElementById('jglOpenMode');
    const filePattern = document.getElementById('jglFilePattern');
    const save = () => saveSettings({
      localRoot: rootInput?.value || DEFAULT_LOCAL_GAMES_ROOT,
      openMode: openMode?.value || 'iframe',
      filePattern: filePattern?.value || 'html'
    });
    rootInput?.addEventListener('change', () => { save(); checkLocalServer(false); });
    openMode?.addEventListener('change', save);
    filePattern?.addEventListener('change', save);

    document.getElementById('jglGameGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-game-id]');
      if(!button) return;
      const game = GAME_BY_ID[button.dataset.gameId];
      if(!game) return;
      save();
      if(button.dataset.action === 'tab') launchGame(game, 'tab');
      else launchGame(game, openMode?.value || 'iframe');
    });

    document.getElementById('jglTestServer')?.addEventListener('click', () => checkLocalServer(true));
    document.getElementById('jglOpenFolder')?.addEventListener('click', () => {
      save();
      const url = normalizeRoot(loadSettings().localRoot);
      window.open(url, '_blank', 'noopener,noreferrer');

    });
    document.getElementById('jglStopGame')?.addEventListener('click', () => stopLocalGame(false));
    document.getElementById('jglCloseFrame')?.addEventListener('click', () => stopLocalGame(false));
    document.getElementById('jglOpenCurrentTab')?.addEventListener('click', () => {
      if(currentGame) window.open(gameUrl(currentGame), '_blank', 'noopener,noreferrer');
    });
  }

  function launchGame(game, mode){
    currentGame = game;
    sessionSeconds = 0;
    interactionCount = 0;
    lastActivity = Date.now();
    launchRewarded = true;
    fiveMinuteRewarded = false;
    localPlayActive = true;
    localSessionStartedAt = Date.now();
    const url = gameUrl(game);

    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ game: game.id, title: game.title, url, startedAt: new Date().toISOString(), sessionId }));
    } catch(err){}

    flash('Timer started');

    if(mode === 'tab'){
      localPlayActive = false;
      openedWindowRef = window.open(url, '_blank', 'noopener,noreferrer');
      showPlayBox(false);
      setLauncherHelp(`Opened <strong>${escapeHtml(game.title)}</strong> from <code>${escapeHtml(url)}</code>. Timed rewards are only reliable inside this page, so tab mode is a fallback and does not earn playtime currency.`);
    } else {
      showPlayBox(true);
      const frame = document.getElementById('jasperLocalGameFrame');
      const nowPlaying = document.getElementById('jglNowPlaying');
      if(nowPlaying) nowPlaying.textContent = `Now playing: ${game.title}`;
      if(frame){
        activeIframe = frame;
        frame.src = url;
        frame.addEventListener('load', () => { lastActivity = Date.now(); }, { once:true });
        frame.addEventListener('mouseenter', () => { lastActivity = Date.now(); });
        frame.addEventListener('pointerenter', () => { lastActivity = Date.now(); });
      }
      setLauncherHelp(`Loaded <strong>${escapeHtml(game.title)}</strong> from <code>${escapeHtml(url)}</code>.`);
    }

    renderOverlay();
    renderLocalSessionStatus();
  }

  function showPlayBox(show){
    const box = document.getElementById('jglPlayBox');
    if(box) box.style.display = show ? 'block' : 'none';
  }

  function stopLocalGame(giveReward){
    localPlayActive = false;
    sessionSeconds = 0;
    if(activeIframe) activeIframe.src = 'about:blank';
    activeIframe = null;
    currentGame = pageLooksLikeGame ? GAME_BY_ID[pathGameId] : null;
    showPlayBox(false);
    try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch(err){}
    setLauncherHelp(`Local game stopped. Jasper's balance is saved in this browser.`);
    renderOverlay();
    renderLocalSessionStatus();
  }

  function renderLocalSessionStatus(){
    const el = document.getElementById('jglSessionStatus');
    if(!el) return;
    if(localPlayActive && currentGame){
      el.textContent = `${currentGame.title}: ${Math.floor(sessionSeconds/60)}m ${sessionSeconds%60}s session. Balance ${amountLabel(loadLedger().totalCopper)}.`;
    } else {
      el.textContent = `No local game is running yet. Balance ${amountLabel(loadLedger().totalCopper)}.`;
    }
  }

  async function checkLocalServer(showReward){
    const settings = loadSettings();
    const root = normalizeRoot(settings.localRoot);
    const help = document.getElementById('jglServerHelp');
    if(help) help.innerHTML = `Checking localhost at <code>${escapeHtml(root)}</code>...`;
    try {
      await fetch(root, { mode:'no-cors', cache:'no-store' });
      localServerStatus = 'probably-online';
      if(help) help.innerHTML = `Localhost looks reachable: <code>${escapeHtml(root)}</code>. If a game does not load, switch the file type between <strong>game.html</strong> and <strong>game/index.html</strong>.`;

    } catch(err){
      localServerStatus = 'offline';
      if(help) help.innerHTML = `Localhost is not reachable yet. Start it with:<br><code>cd /d "C:\\Users\\Public\\Documents\\SquishyRewards"</code><br><code>py -3 -m http.server 8787 --bind 127.0.0.1</code><br>Then open this GitHub page again: <code>${escapeHtml(GITHUB_SITE_URL)}</code>`;
    }
  }

  function setLauncherHelp(html){
    const help = document.getElementById('jglServerHelp');
    if(help) help.innerHTML = html;
  }

  function escapeHtml(text){
    return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function escapeAttr(text){
    return escapeHtml(text).replace(/`/g, '&#96;');
  }

  function init(){
    ensureOverlay();
    ensureLauncher();
    ['pointerdown','touchstart','click','keydown'].forEach(evt => window.addEventListener(evt, markActivity, { passive:true, capture:true }));
    ['mousemove','touchmove'].forEach(evt => window.addEventListener(evt, () => { lastActivity = Date.now(); }, { passive:true, capture:true }));
    window.addEventListener('storage', (event) => {
      if(event.key === STORE_KEY){
        renderOverlay();
        renderLauncherBalance();
        renderLocalSessionStatus();
      }
    });
    try { window.parent?.postMessage({ type:'jasperCurrencySyncRequest' }, '*'); } catch(err){}
    window.addEventListener('message', (event) => {
      if(event.data?.type === 'jasperCurrencySync'){
        renderOverlay();
        renderLauncherBalance();
      }
      if(event.data?.type === 'jasperCurrencyReward'){
        localReward(event.data.amount, event.data.label || 'Game reward', event.data.category || 'mobile_games', event.data.source || 'game_bridge', event.data.extra || {});
      }
    });
    startTimers();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
