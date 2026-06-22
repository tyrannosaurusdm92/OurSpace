(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'socials.games.v2';
  const CLIENT_ID_KEY = 'socials.clientId';
  const SAVE_EXPORT_NAME = 'socials-game-sessions.json';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const slug = value => String(value || 'friend').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'friend';
  const nowIso = () => new Date().toISOString();
  const fmt = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not saved yet';
  const fmtSeconds = seconds => {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return `${h}h ${m}m ${sec}s`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  };
  const toast = message => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 3600);
  };
  const api = async (path, options = {}) => {
    if (window.SocialSharedBackend?.isEnabled?.()) {
      const shared = await window.SocialSharedBackend.api(path, options);
      if (shared) return shared;
    }
    const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  };
  const postJson = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const me = () => ($('#displayName')?.value?.trim() || localStorage.getItem('socials.name') || 'Friend').slice(0, 80);
  const status = () => ($('#displayStatus')?.value?.trim() || localStorage.getItem('socials.status') || 'Around').slice(0, 120);
  const clientId = () => {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `client_${Date.now()}_${Math.random().toString(16).slice(2)}`);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  };
  const defaultStore = () => ({ selectedSlug: '', selectedPlayersByGame: {}, notes: {}, sessions: [], totalPlaySecondsBySlug: {}, lastSavedAt: null });
  const readStore = () => {
    try { return { ...defaultStore(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return defaultStore(); }
  };
  let store = readStore();
  const saveStore = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

  const state = {
    games: [], stats: {}, onlineUsers: [], currentGame: null, loadedAt: 0,
    presenceTimer: null, rosterTimer: null
  };

  function currentTab() {
    return $('.panel.active-panel')?.id || 'feed';
  }
  function selectedPlayerIds(game = state.currentGame) {
    if (!game) return [];
    return store.selectedPlayersByGame[game.slug] || [];
  }
  function setSelectedPlayerIds(ids, game = state.currentGame) {
    if (!game) return;
    const max = Math.max(1, Number(game.maxPlayers || 1));
    store.selectedPlayersByGame[game.slug] = [...new Set(ids)].slice(0, max);
    saveStore();
  }
  function onlineById() {
    return new Map(state.onlineUsers.map(user => [user.clientId || user.id || slug(user.name), user]));
  }
  function pickedPlayers(game = state.currentGame) {
    const byId = onlineById();
    const ids = selectedPlayerIds(game);
    const chosen = ids.map(id => byId.get(id)).filter(Boolean);
    if (game?.isMultiplayer && chosen.length === 0 && state.onlineUsers.length) {
      const max = Math.max(2, Number(game.maxPlayers || 2));
      const fallback = state.onlineUsers.slice(0, max);
      setSelectedPlayerIds(fallback.map(u => u.clientId || u.id || slug(u.name)), game);
      return fallback;
    }
    return chosen;
  }
  function bySlug(value) {
    return state.games.find(g => g.slug === value) || state.games[0] || null;
  }
  function gameUrl(game) {
    const players = encodeURIComponent(JSON.stringify(pickedPlayers(game).map(p => ({ id: p.clientId || p.id, name: p.name, status: p.status }))));
    const glue = game.file.includes('?') ? '&' : '?';
    return `${game.file}${glue}socials=1&socialsGame=${encodeURIComponent(game.slug)}&socialsPlayers=${players}`;
  }
  async function loadManifest() {
    const manifest = await api('games_manifest.json');
    state.games = manifest.games || [];
    state.stats = manifest;
    store.selectedSlug ||= state.games[0]?.slug || '';
    saveStore();
    renderGames();
  }
  function renderGames() {
    const select = $('#gameSelect');
    if (!select) return;
    if (!state.games.length) {
      $('#gameStatus').textContent = 'No games were found in the bundled manifest.';
      return;
    }
    select.innerHTML = state.games.map(g => `<option value="${esc(g.slug)}">#${esc(g.popularityRankApprox)} — ${esc(g.title)}${g.isMultiplayer ? ' · multiplayer' : ''}</option>`).join('');
    select.value = bySlug(store.selectedSlug)?.slug || state.games[0].slug;
    state.currentGame = bySlug(select.value);
    $('#gameCountBadge').textContent = `${state.games.length} games`;
    updateSelectedGame();
    renderSaves();
  }
  function updateSelectedGame() {
    const game = bySlug($('#gameSelect')?.value || store.selectedSlug);
    if (!game) return;
    state.currentGame = game;
    store.selectedSlug = game.slug;
    $('#gameTitle').textContent = game.title;
    $('#gameNote').value = store.notes[game.slug] || '';
    const tags = (game.categories || []).map(c => `<span class="tag">${esc(c)}</span>`).join('');
    $('#gameDetails').innerHTML = `
      <div class="game-kv"><b>Genre</b><span>${esc(game.genre || 'game')}</span></div>
      <div class="game-kv"><b>Fit</b><span>${esc(game.themeFit || '')}</span></div>
      <div class="game-kv"><b>Mobile</b><span>${esc(game.mobileFit || '')}</span></div>
      <div class="game-kv"><b>Popularity</b><span>${esc(game.popularityLevel || '')}</span></div>
      <div class="game-kv"><b>Categories</b><span class="tags">${tags || '<span class="tag">uncategorized</span>'}</span></div>
      <div class="game-kv"><b>Players</b><span>${game.isMultiplayer ? `Pulls live site roster · max ${esc(game.maxPlayers || 2)}` : 'single-player'}</span></div>`;
    $('#gameStatus').textContent = game.isMultiplayer
      ? `${game.title} is marked multiplayer-capable. Online Socials users can be selected below.`
      : `${game.title} is ready to load.`;
    saveStore();
    renderPlayers();
  }
  function renderOnlineUsers() {
    const root = $('#onlineUsers');
    if (!root) return;
    if (!state.onlineUsers.length) {
      root.innerHTML = '<article class="online-card"><strong>No active users yet.</strong><span>Save your profile or open the site in another browser to populate the roster.</span></article>';
      return;
    }
    root.innerHTML = state.onlineUsers.map(user => `
      <article class="online-card">
        <span class="avatar-dot" style="--user-color:${esc(user.color || '#22d3ee')}">${esc((user.name || '?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span>
        <div><strong>${esc(user.name || 'Friend')}</strong><span>${esc(user.status || 'Around')} · ${esc(user.section || 'site')}${user.activeGameTitle ? ` · playing ${esc(user.activeGameTitle)}` : ''}</span></div>
      </article>`).join('');
  }
  function renderPlayers() {
    renderOnlineUsers();
    const root = $('#selectedPlayers');
    const game = state.currentGame;
    if (!root || !game) return;
    if (!game.isMultiplayer) {
      root.innerHTML = '<div class="notice subtle">This game is marked single-player. The Socials roster will still be available to the page, but no multiplayer slots are required.</div>';
      return;
    }
    if (!state.onlineUsers.length) {
      root.innerHTML = '<div class="notice subtle">No online users to assign yet.</div>';
      return;
    }
    const selected = new Set(selectedPlayerIds(game));
    root.innerHTML = state.onlineUsers.map(user => {
      const id = user.clientId || user.id || slug(user.name);
      const checked = selected.has(id) ? 'checked' : '';
      return `<label class="player-check"><input type="checkbox" value="${esc(id)}" ${checked}> <span>${esc(user.name || 'Friend')}</span></label>`;
    }).join('');
    $$('#selectedPlayers input[type="checkbox"]').forEach(input => input.addEventListener('change', () => {
      const max = Math.max(1, Number(game.maxPlayers || 1));
      const ids = $$('#selectedPlayers input[type="checkbox"]:checked').map(x => x.value).slice(0, max);
      if (ids.length >= max) $$('#selectedPlayers input[type="checkbox"]:not(:checked)').forEach(x => x.disabled = true);
      else $$('#selectedPlayers input[type="checkbox"]').forEach(x => x.disabled = false);
      setSelectedPlayerIds(ids, game);
      renderPlayers();
      syncPlayersToGame();
    }));
  }
  async function sendPresence() {
    const game = state.currentGame;
    const body = {
      clientId: clientId(),
      name: me(),
      status: status(),
      color: '#22d3ee',
      section: currentTab(),
      activeGame: $('#gameViewer')?.classList.contains('loaded') ? game?.slug : '',
      activeGameTitle: $('#gameViewer')?.classList.contains('loaded') ? game?.title : ''
    };
    const result = await postJson('/api/presence', body).catch(() => null);
    if (result?.onlineUsers) {
      state.onlineUsers = result.onlineUsers;
      renderPlayers();
    }
  }
  async function refreshRoster() {
    const result = await api('/api/online-users').catch(() => null);
    if (result?.onlineUsers) {
      state.onlineUsers = result.onlineUsers;
      renderPlayers();
    }
  }
  function saveSession(showMessage = true) {
    const game = state.currentGame;
    if (!game) return;
    const seconds = state.loadedAt ? Math.max(0, Math.round((Date.now() - state.loadedAt) / 1000)) : 0;
    const savedAt = nowIso();
    let savedSession = null;
    store.notes[game.slug] = $('#gameNote')?.value || '';
    store.lastSavedAt = savedAt;
    if (showMessage || seconds > 0) {
      const session = {
        slug: game.slug,
        title: game.title,
        savedAt,
        playSeconds: seconds,
        note: store.notes[game.slug] || '',
        players: pickedPlayers(game).map(p => ({ id: p.clientId || p.id, name: p.name })),
        launcher: 'Socials Application Games tab',
        projectId: window.SocialSharedBackend?.getProjectId?.() || 'local-project'
      };
      savedSession = session;
      store.sessions.unshift(session);
      store.sessions = store.sessions.slice(0, 100);
      store.totalPlaySecondsBySlug[game.slug] = (store.totalPlaySecondsBySlug[game.slug] || 0) + seconds;
    }
    state.loadedAt = Date.now();
    saveStore();
    renderSaves();
    if (savedSession) syncGameSessionToBackend(savedSession).catch(() => undefined);
    if (showMessage) toast(`Saved ${game.title} session.`);
  }
  async function syncGameSessionToBackend(session) {
    if (!session || !window.SocialSharedBackend?.isEnabled?.() || !window.SocialSharedBackend?.getSession?.()) return;
    await postJson('/api/messages', {
      channel: 'game-sessions',
      author: me(),
      text: 'GAME_SESSION::' + JSON.stringify(session),
      origin: 'game-session'
    });
  }
  function renderSaves() {
    const root = $('#gameSaves');
    if (!root) return;
    if (!store.sessions.length) {
      root.innerHTML = '<article class="save-card">No saved game sessions yet.</article>';
      return;
    }
    root.innerHTML = store.sessions.slice(0, 12).map(s => `
      <article class="save-card"><strong>${esc(s.title)}</strong><span>${esc(fmt(s.savedAt))} · ${esc(fmtSeconds(s.playSeconds))}</span>${s.players?.length ? `<small>Players: ${esc(s.players.map(p => p.name).join(', '))}</small>` : ''}</article>`).join('');
  }
  function loadGame() {
    const game = state.currentGame;
    if (!game) return;
    saveSession(false);
    const frame = $('#gameFrame');
    const viewer = $('#gameViewer');
    frame.src = gameUrl(game);
    viewer.classList.add('loaded');
    state.loadedAt = Date.now();
    $('#gameStatus').textContent = `Loaded ${game.title}.`;
    frame.onload = () => syncPlayersToGame();
    setTimeout(() => { try { frame.focus(); } catch {} }, 300);
    sendPresence();
  }
  function saveAndExit() {
    saveSession(true);
    const frame = $('#gameFrame');
    frame.removeAttribute('src');
    $('#gameViewer')?.classList.remove('loaded');
    state.loadedAt = 0;
    $('#gameStatus').textContent = 'Game exited and launcher session saved.';
    sendPresence();
  }
  function syncPlayersToGame() {
    const frame = $('#gameFrame');
    const game = state.currentGame;
    if (!frame || !game) return;
    const payload = {
      type: 'socials:players',
      source: 'Socials Application',
      game: game.slug,
      gameTitle: game.title,
      players: pickedPlayers(game).map((p, index) => ({ id: p.clientId || p.id || slug(p.name), name: p.name || `Player ${index + 1}`, status: p.status || '', slot: index + 1 })),
      activeUser: { id: clientId(), name: me(), status: status() },
      updatedAt: nowIso()
    };
    try { frame.contentWindow?.postMessage(payload, '*'); } catch {}
    try {
      const win = frame.contentWindow;
      win.localStorage.setItem('socials.players', JSON.stringify(payload.players));
      win.localStorage.setItem('socials.activeUser', JSON.stringify(payload.activeUser));
      win.sessionStorage.setItem('socials.players', JSON.stringify(payload.players));
      win.SOCIALS_PLAYERS = payload.players;
      win.SOCIALS_ACTIVE_USER = payload.activeUser;
      win.dispatchEvent(new CustomEvent('socials-players', { detail: payload }));
      const doc = win.document;
      if (doc && !doc.getElementById('socials-player-bridge')) {
        const script = doc.createElement('script');
        script.id = 'socials-player-bridge';
        script.textContent = `window.SOCIALS_PLAYERS=${JSON.stringify(payload.players)};window.SOCIALS_ACTIVE_USER=${JSON.stringify(payload.activeUser)};window.addEventListener('message',function(e){if(e.data&&e.data.type==='socials:players'){window.SOCIALS_PLAYERS=e.data.players||[];window.SOCIALS_ACTIVE_USER=e.data.activeUser||window.SOCIALS_ACTIVE_USER;try{localStorage.setItem('socials.players',JSON.stringify(window.SOCIALS_PLAYERS));sessionStorage.setItem('socials.players',JSON.stringify(window.SOCIALS_PLAYERS));}catch(_){ }window.dispatchEvent(new CustomEvent('socials-players',{detail:e.data}));}});`;
        doc.documentElement.appendChild(script);
      }
      $('#gameStatus').textContent = payload.players.length ? `Synced players: ${payload.players.map(p => p.name).join(', ')}` : 'Game loaded. No multiplayer players selected.';
    } catch {
      $('#gameStatus').textContent = 'Game loaded. Player roster sent by postMessage.';
    }
  }
  async function fullscreenGame() {
    const viewer = $('#gameViewer');
    try {
      if (!document.fullscreenElement) {
        await viewer.requestFullscreen();
        try { await screen.orientation?.lock?.('landscape'); } catch {}
      } else await document.exitFullscreen();
    } catch { toast('Fullscreen or rotation lock was blocked by this browser.'); }
  }
  function bindGames() {
    if (!$('#games')) return;
    $('#gameSelect').addEventListener('change', updateSelectedGame);
    $('#loadGameBtn').addEventListener('click', loadGame);
    $('#saveGameBtn').addEventListener('click', () => saveSession(true));
    $('#saveExitGameBtn').addEventListener('click', saveAndExit);
    $('#fullscreenGameBtn').addEventListener('click', fullscreenGame);
    $('#openGameTabBtn').addEventListener('click', () => { if (state.currentGame) window.open(gameUrl(state.currentGame), '_blank', 'noopener'); });
    $('#syncPlayersBtn').addEventListener('click', syncPlayersToGame);
    $('#gameNote').addEventListener('input', () => { if (state.currentGame) { store.notes[state.currentGame.slug] = $('#gameNote').value; saveStore(); } });
    $('#saveProfile')?.addEventListener('click', () => setTimeout(sendPresence, 250));
    $$('.tab').forEach(btn => btn.addEventListener('click', () => setTimeout(sendPresence, 50)));
    window.addEventListener('beforeunload', () => saveSession(false));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { sendPresence(); refreshRoster(); } });
  }
  async function initGames() {
    bindGames();
    await loadManifest().catch(err => { $('#gameStatus').textContent = `Could not load games: ${err.message}`; });
    await sendPresence();
    await refreshRoster();
    state.presenceTimer = setInterval(sendPresence, 20_000);
    state.rosterTimer = setInterval(refreshRoster, 15_000);
    try {
      const es = new EventSource('/events');
      es.addEventListener('state', event => {
        const data = JSON.parse(event.data);
        if (data.onlineUsers) { state.onlineUsers = data.onlineUsers; renderPlayers(); }
      });
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGames);
  else initGames();
})();
