/* OurSpace Media Player Module
   Vanilla JS, local-first IndexedDB storage, optional Google Apps Script sync.
   Backend URL supplied by user and intentionally centralized here. */
(() => {
  'use strict';

  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec';
  const DB_NAME = 'ourspace_media_player_v1';
  const DB_VERSION = 1;
  const STORE_STATE = 'state';
  const STORE_BLOBS = 'blobs';
  const LIBRARY_KEY = 'library';
  const PLAYBACK_KEY = 'ourspace.media.playback';
  const ACCEPTED_AUDIO = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac','audio/mp4','audio/x-m4a','audio/flac','audio/webm'];
  const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm)$/i;
  const GAME_SELECTOR = '[data-ourspace-game], [data-game-loaded="true"], iframe[data-game], iframe[src*="game"], canvas.game, .game canvas, .games canvas';

  const defaultLibrary = () => ({
    schemaVersion: 1,
    folders: [{ id: 'folder-all', name: 'All Music', system: true, createdAt: Date.now() }],
    playlists: [{ id: 'playlist-favorites', name: 'Favorites', trackIds: [], system: true, createdAt: Date.now() }],
    tracks: [],
    selectedFolderId: 'folder-all',
    selectedPlaylistId: '',
    currentTrackId: '',
    currentQueue: [],
    shuffle: false,
    repeat: 'all',
    volume: 0.9,
    updatedAt: Date.now(),
    backendUrl: BACKEND_URL
  });

  const state = {
    db: null,
    library: defaultLibrary(),
    audio: new Audio(),
    objectUrls: new Map(),
    root: null,
    mini: null,
    toast: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    lastPausedByGame: false,
    saveTimer: null,
    syncTimer: null,
    initialized: false
  };

  state.audio.preload = 'metadata';
  state.audio.crossOrigin = 'anonymous';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const formatBytes = (bytes = 0) => {
    if (!bytes) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  };
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  };
  const parseName = (file) => {
    const clean = file.name.replace(AUDIO_EXT, '').replace(/[_]+/g, ' ').trim();
    const parts = clean.split(/\s+-\s+/);
    if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    return { artist: '', title: clean || file.name };
  };
  const isAudioFile = (file) => ACCEPTED_AUDIO.includes(file.type) || AUDIO_EXT.test(file.name);
  const selectedTracks = () => {
    const lib = state.library;
    if (lib.selectedPlaylistId) {
      const playlist = lib.playlists.find(p => p.id === lib.selectedPlaylistId);
      const ids = new Set(playlist?.trackIds || []);
      return lib.tracks.filter(t => ids.has(t.id));
    }
    if (lib.selectedFolderId && lib.selectedFolderId !== 'folder-all') return lib.tracks.filter(t => t.folderId === lib.selectedFolderId);
    return lib.tracks.slice();
  };
  const currentTrack = () => state.library.tracks.find(t => t.id === state.library.currentTrackId) || null;

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_STATE)) db.createObjectStore(STORE_STATE);
        if (!db.objectStoreNames.contains(STORE_BLOBS)) db.createObjectStore(STORE_BLOBS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbSet(storeName, key, value) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
  function idbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadLibrary() {
    const stored = await idbGet(STORE_STATE, LIBRARY_KEY).catch(() => null);
    state.library = normalizeLibrary(stored || defaultLibrary());
    const playback = readPlayback();
    if (playback?.trackId && state.library.tracks.some(t => t.id === playback.trackId)) {
      state.library.currentTrackId = playback.trackId;
      state.currentTime = playback.currentTime || 0;
      state.library.volume = Number.isFinite(playback.volume) ? playback.volume : state.library.volume;
      state.library.shuffle = Boolean(playback.shuffle);
    }
    state.audio.volume = state.library.volume;
  }
  function normalizeLibrary(raw) {
    const next = { ...defaultLibrary(), ...(raw || {}) };
    next.folders = Array.isArray(next.folders) ? next.folders : [];
    next.playlists = Array.isArray(next.playlists) ? next.playlists : [];
    next.tracks = Array.isArray(next.tracks) ? next.tracks : [];
    if (!next.folders.some(f => f.id === 'folder-all')) next.folders.unshift({ id:'folder-all', name:'All Music', system:true, createdAt:Date.now() });
    if (!next.playlists.some(p => p.id === 'playlist-favorites')) next.playlists.unshift({ id:'playlist-favorites', name:'Favorites', trackIds:[], system:true, createdAt:Date.now() });
    next.tracks = next.tracks.map(track => ({
      id: track.id || uid('track'),
      title: track.title || track.name || 'Untitled Track',
      artist: track.artist || '',
      album: track.album || '',
      folderId: track.folderId || 'folder-all',
      mime: track.mime || track.type || 'audio/mpeg',
      size: Number(track.size || 0),
      duration: Number(track.duration || 0),
      originalName: track.originalName || track.name || `${track.title || 'track'}.mp3`,
      addedAt: Number(track.addedAt || Date.now()),
      backendId: track.backendId || '',
      remoteUrl: track.remoteUrl || track.streamUrl || track.url || '',
      downloadUrl: track.downloadUrl || track.remoteUrl || track.streamUrl || track.url || '',
      source: track.source || 'local'
    }));
    next.playlists = next.playlists.map(p => ({...p, trackIds: Array.isArray(p.trackIds) ? p.trackIds.filter(id => next.tracks.some(t => t.id === id)) : []}));
    if (!next.selectedFolderId) next.selectedFolderId = 'folder-all';
    return next;
  }
  function scheduleSave() {
    clearTimeout(state.saveTimer);
    state.library.updatedAt = Date.now();
    state.saveTimer = setTimeout(async () => {
      await idbSet(STORE_STATE, LIBRARY_KEY, state.library).catch(err => notify(`Could not save library locally: ${err.message}`, 'error'));
      writePlayback();
    }, 160);
  }
  function readPlayback() {
    try { return JSON.parse(localStorage.getItem(PLAYBACK_KEY) || 'null'); } catch { return null; }
  }
  function writePlayback() {
    const track = currentTrack();
    localStorage.setItem(PLAYBACK_KEY, JSON.stringify({
      trackId: track?.id || '',
      currentTime: state.audio.currentTime || state.currentTime || 0,
      volume: state.library.volume,
      shuffle: state.library.shuffle,
      isPlaying: state.isPlaying,
      updatedAt: Date.now()
    }));
  }

  async function getTrackUrl(track) {
    if (!track) return '';
    if (track.remoteUrl) return track.remoteUrl;
    if (state.objectUrls.has(track.id)) return state.objectUrls.get(track.id);
    const blob = await idbGet(STORE_BLOBS, track.id).catch(() => null);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    state.objectUrls.set(track.id, url);
    return url;
  }
  async function getTrackBlob(track) {
    if (!track) return null;
    const blob = await idbGet(STORE_BLOBS, track.id).catch(() => null);
    if (blob) return blob;
    if (!track.downloadUrl && !track.remoteUrl) return null;
    const res = await fetch(track.downloadUrl || track.remoteUrl);
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  function render() {
    if (state.root) renderFull();
    renderMini();
  }
  function renderFull() {
    const lib = state.library;
    const track = currentTrack();
    const folders = lib.folders;
    const playlists = lib.playlists;
    const shownTracks = selectedTracks().sort((a,b) => (a.title || '').localeCompare(b.title || ''));
    const totalSize = lib.tracks.reduce((sum, t) => sum + (Number(t.size) || 0), 0);
    state.root.innerHTML = `
      <div class="osm-top">
        <div class="osm-title">
          <h2>OurSpace Media Player</h2>
          <p>Upload music, make folders and playlists, shuffle, download, and keep audio alive while using the site.</p>
        </div>
        <div class="osm-status" aria-label="Media library status">
          <span class="osm-pill"><strong>${lib.tracks.length}</strong> tracks</span>
          <span class="osm-pill"><strong>${folders.length - 1}</strong> folders</span>
          <span class="osm-pill"><strong>${playlists.length}</strong> playlists</span>
          <span class="osm-pill"><strong>${formatBytes(totalSize)}</strong> local</span>
        </div>
      </div>
      <div class="osm-grid">
        <aside class="osm-panel osm-stack">
          <div class="osm-section-title"><h3>Upload</h3></div>
          <label class="osm-drop" id="osmDropZone" tabindex="0">
            <strong>Drop audio here</strong>
            <span>or choose files / folders</span>
            <input class="osm-hidden-input" id="osmFileInput" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" multiple>
          </label>
          <input class="osm-hidden-input" id="osmFolderInput" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" multiple webkitdirectory>
          <div class="osm-actions">
            <button class="osm-btn osm-btn-small" data-action="choose-files">Upload files</button>
            <button class="osm-btn osm-btn-small" data-action="choose-folder">Upload folder</button>
          </div>
          <div class="osm-section-title"><h3>Folders</h3><button class="osm-btn osm-btn-small" data-action="new-folder">New</button></div>
          <div class="osm-list" aria-label="Folders">
            ${folders.map(folder => `
              <button class="osm-item ${lib.selectedFolderId === folder.id && !lib.selectedPlaylistId ? 'is-current' : ''}" data-action="select-folder" data-id="${esc(folder.id)}">
                <span class="osm-item-head"><span class="osm-item-title">${esc(folder.name)}</span><span class="osm-tag">${folder.id === 'folder-all' ? lib.tracks.length : lib.tracks.filter(t => t.folderId === folder.id).length}</span></span>
              </button>`).join('')}
          </div>
          <div class="osm-section-title"><h3>Playlists</h3><button class="osm-btn osm-btn-small" data-action="new-playlist">New</button></div>
          <div class="osm-list" aria-label="Playlists">
            ${playlists.map(playlist => `
              <button class="osm-item ${lib.selectedPlaylistId === playlist.id ? 'is-current' : ''}" data-action="select-playlist" data-id="${esc(playlist.id)}">
                <span class="osm-item-head"><span class="osm-item-title">${esc(playlist.name)}</span><span class="osm-tag">${playlist.trackIds.length}</span></span>
              </button>`).join('')}
          </div>
          <button class="osm-btn" data-action="sync-now">Sync metadata to backend</button>
        </aside>
        <section class="osm-panel">
          <div class="osm-now" aria-live="polite">
            <div class="osm-cover" aria-hidden="true">♪</div>
            <div class="osm-stack" style="gap:4px;min-width:0">
              <div class="osm-track-title">${esc(track?.title || 'No track selected')}</div>
              <div class="osm-track-subtitle">${esc(track?.artist || track?.originalName || 'Upload music to begin')}</div>
            </div>
          </div>
          <div class="osm-progress-wrap">
            <span class="osm-time" id="osmCurrentTime">${formatTime(state.currentTime)}</span>
            <input class="osm-range" id="osmSeek" type="range" min="0" max="${Math.max(1, Math.floor(state.duration || track?.duration || 1))}" step="0.1" value="${Number(state.audio.currentTime || state.currentTime || 0)}" aria-label="Seek through current track">
            <span class="osm-time" id="osmDuration">${formatTime(state.duration || track?.duration || 0)}</span>
          </div>
          <div class="osm-controls" aria-label="Playback controls">
            <button class="osm-btn osm-btn-icon" data-action="previous" aria-label="Previous track">⏮</button>
            <button class="osm-btn osm-btn-icon" data-action="rewind" aria-label="Rewind 5 seconds">↺5</button>
            <button class="osm-btn osm-btn-main osm-btn-icon" data-action="play-pause" aria-label="Play or pause">${state.isPlaying ? '⏸' : '▶'}</button>
            <button class="osm-btn osm-btn-icon" data-action="stop" aria-label="Stop">⏹</button>
            <button class="osm-btn osm-btn-icon" data-action="forward" aria-label="Fast forward 5 seconds">5↻</button>
            <button class="osm-btn osm-btn-icon" data-action="next" aria-label="Next track">⏭</button>
            <button class="osm-btn osm-btn-icon ${lib.shuffle ? 'is-active' : ''}" data-action="shuffle" aria-pressed="${lib.shuffle ? 'true' : 'false'}" aria-label="Shuffle">🔀</button>
            <button class="osm-btn osm-btn-icon" data-action="download-current" aria-label="Download current track">⬇</button>
          </div>
          <div class="osm-volume">
            <span class="osm-item-meta">Volume</span>
            <input class="osm-range" id="osmVolume" type="range" min="0" max="1" step="0.01" value="${lib.volume}" aria-label="Volume">
          </div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,.14);margin:16px 0">
          <div class="osm-section-title">
            <h3>Library</h3>
            <div class="osm-actions">
              <button class="osm-btn osm-btn-small" data-action="download-list">Download list</button>
              <button class="osm-btn osm-btn-small" data-action="clear-filter">All music</button>
            </div>
          </div>
          <div class="osm-library-tools">
            <input class="osm-field" id="osmSearch" type="search" placeholder="Search tracks" aria-label="Search tracks">
            <select class="osm-field" id="osmSort" aria-label="Sort tracks">
              <option value="title">Sort by title</option>
              <option value="artist">Sort by artist</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <div class="osm-list" id="osmTrackList" aria-label="Tracks">
            ${shownTracks.length ? shownTracks.map(trackItem).join('') : `<div class="osm-empty">No tracks here yet.</div>`}
          </div>
          <p class="osm-footer-note">For hard navigation between separate HTML files, browsers restart the page. This module saves the track and time, then resumes from that point after the user presses play again. In a single-page/tabbed OurSpace shell, playback stays continuous while pages switch.</p>
        </section>
      </div>`;
    bindFullEvents();
  }
  function trackItem(track) {
    const folder = state.library.folders.find(f => f.id === track.folderId)?.name || 'All Music';
    return `<article class="osm-item ${state.library.currentTrackId === track.id ? 'is-current' : ''}" data-track-row="${esc(track.id)}">
      <div class="osm-item-head">
        <div style="min-width:0">
          <div class="osm-item-title">${esc(track.title)}</div>
          <div class="osm-item-meta">${esc(track.artist || 'Unknown artist')} · ${esc(folder)} · ${formatBytes(track.size)}</div>
        </div>
        <span class="osm-tag">${track.duration ? formatTime(track.duration) : 'audio'}</span>
      </div>
      <div class="osm-actions">
        <button class="osm-btn osm-btn-small" data-action="play-track" data-id="${esc(track.id)}">Play</button>
        <button class="osm-btn osm-btn-small" data-action="add-to-playlist" data-id="${esc(track.id)}">Add to playlist</button>
        <button class="osm-btn osm-btn-small" data-action="download-track" data-id="${esc(track.id)}">Download</button>
        <button class="osm-btn osm-btn-small osm-btn-danger" data-action="delete-track" data-id="${esc(track.id)}">Delete</button>
      </div>
    </article>`;
  }
  function bindFullEvents() {
    const root = state.root;
    root.onclick = onFullClick;
    const fileInput = $('#osmFileInput', root);
    const folderInput = $('#osmFolderInput', root);
    const drop = $('#osmDropZone', root);
    const seek = $('#osmSeek', root);
    const volume = $('#osmVolume', root);
    const search = $('#osmSearch', root);
    const sort = $('#osmSort', root);
    if (fileInput) fileInput.onchange = () => addFiles(Array.from(fileInput.files || []));
    if (folderInput) folderInput.onchange = () => addFiles(Array.from(folderInput.files || []), { preserveFolders: true });
    if (drop) {
      ['dragenter','dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
      ['dragleave','drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
      drop.addEventListener('drop', e => addFiles(Array.from(e.dataTransfer?.files || []), { preserveFolders: true }));
      drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); });
    }
    if (seek) seek.oninput = () => seekTo(Number(seek.value || 0));
    if (volume) volume.oninput = () => setVolume(Number(volume.value));
    if (search) search.oninput = () => filterTrackList(search.value, sort?.value || 'title');
    if (sort) sort.onchange = () => filterTrackList(search?.value || '', sort.value);
  }
  function onFullClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'choose-files') $('#osmFileInput', state.root)?.click();
    if (action === 'choose-folder') $('#osmFolderInput', state.root)?.click();
    if (action === 'new-folder') createFolder();
    if (action === 'new-playlist') createPlaylist();
    if (action === 'select-folder') selectFolder(id);
    if (action === 'select-playlist') selectPlaylist(id);
    if (action === 'clear-filter') selectFolder('folder-all');
    if (action === 'play-pause') togglePlay();
    if (action === 'stop') stop();
    if (action === 'previous') previous();
    if (action === 'next') next();
    if (action === 'rewind') jump(-5);
    if (action === 'forward') jump(5);
    if (action === 'shuffle') toggleShuffle();
    if (action === 'play-track') playTrack(id);
    if (action === 'download-current') downloadTrack(currentTrack());
    if (action === 'download-track') downloadTrack(state.library.tracks.find(t => t.id === id));
    if (action === 'download-list') downloadList();
    if (action === 'delete-track') deleteTrack(id);
    if (action === 'add-to-playlist') addToPlaylist(id);
    if (action === 'sync-now') syncNow(true);
  }
  function filterTrackList(query, sort) {
    const q = String(query || '').trim().toLowerCase();
    let tracks = selectedTracks().filter(t => !q || [t.title, t.artist, t.album, t.originalName].some(v => String(v || '').toLowerCase().includes(q)));
    tracks.sort((a,b) => {
      if (sort === 'artist') return (a.artist || '').localeCompare(b.artist || '') || (a.title || '').localeCompare(b.title || '');
      if (sort === 'newest') return b.addedAt - a.addedAt;
      if (sort === 'oldest') return a.addedAt - b.addedAt;
      return (a.title || '').localeCompare(b.title || '');
    });
    const list = $('#osmTrackList', state.root);
    if (list) list.innerHTML = tracks.length ? tracks.map(trackItem).join('') : `<div class="osm-empty">No matching tracks.</div>`;
  }

  function renderMini() {
    if (!state.mini) {
      state.mini = document.createElement('div');
      state.mini.className = 'osm-mini-player';
      state.mini.setAttribute('role', 'region');
      state.mini.setAttribute('aria-label', 'Mini media player');
      document.body.appendChild(state.mini);
      state.mini.addEventListener('click', event => {
        const button = event.target.closest('[data-mini-action]');
        if (!button) return;
        const action = button.dataset.miniAction;
        if (action === 'play') togglePlay();
        if (action === 'stop') stop();
        if (action === 'rewind') jump(-5);
        if (action === 'forward') jump(5);
        if (action === 'next') next();
      });
    }
    const track = currentTrack();
    const rootPage = state.root?.closest?.('.page');
    const rootVisible = state.root && (!rootPage || rootPage.classList.contains('active'));
    const show = Boolean(track && !rootVisible);
    state.mini.classList.toggle('is-visible', Boolean(show));
    if (!show) return;
    state.mini.innerHTML = `<div class="osm-mini-main"><div class="osm-mini-title">${esc(track.title)}</div><div class="osm-mini-meta">${esc(track.artist || track.originalName || '')} · ${formatTime(state.audio.currentTime || state.currentTime)} / ${formatTime(state.duration || track.duration || 0)}</div></div><div class="osm-actions"><button class="osm-btn osm-btn-icon" data-mini-action="rewind" aria-label="Rewind 5 seconds">↺5</button><button class="osm-btn osm-btn-main osm-btn-icon" data-mini-action="play" aria-label="Play or pause">${state.isPlaying ? '⏸' : '▶'}</button><button class="osm-btn osm-btn-icon" data-mini-action="stop" aria-label="Stop">⏹</button><button class="osm-btn osm-btn-icon" data-mini-action="forward" aria-label="Fast forward 5 seconds">5↻</button><button class="osm-btn osm-btn-icon" data-mini-action="next" aria-label="Next track">⏭</button></div>`;
  }

  async function addFiles(files, options = {}) {
    const audioFiles = files.filter(isAudioFile);
    if (!audioFiles.length) return notify('No supported audio files found.', 'error');
    notify(`Adding ${audioFiles.length} audio file${audioFiles.length === 1 ? '' : 's'}...`);
    const folderCache = new Map();
    let added = 0;
    for (const file of audioFiles) {
      const folderId = resolveFolderForFile(file, options, folderCache);
      const meta = parseName(file);
      const track = {
        id: uid('track'),
        title: meta.title,
        artist: meta.artist,
        album: '',
        folderId,
        mime: file.type || 'audio/mpeg',
        size: file.size,
        duration: 0,
        originalName: file.name,
        addedAt: Date.now(),
        backendId: '',
        remoteUrl: '',
        downloadUrl: '',
        source: 'local'
      };
      state.library.tracks.push(track);
      await idbSet(STORE_BLOBS, track.id, file);
      readDuration(track).then(duration => { if (duration) { track.duration = duration; scheduleSave(); render(); } });
      uploadToBackend(track, file).catch(() => {});
      added++;
    }
    if (!state.library.currentTrackId && state.library.tracks[0]) state.library.currentTrackId = state.library.tracks[0].id;
    scheduleSave();
    render();
    notify(`Added ${added} track${added === 1 ? '' : 's'}.`);
  }
  function resolveFolderForFile(file, options, folderCache) {
    if (options.preserveFolders && file.webkitRelativePath) {
      const top = file.webkitRelativePath.split('/').filter(Boolean)[0];
      if (top) {
        if (!folderCache.has(top)) folderCache.set(top, ensureFolder(top));
        return folderCache.get(top);
      }
    }
    return state.library.selectedFolderId && state.library.selectedFolderId !== 'folder-all' ? state.library.selectedFolderId : 'folder-all';
  }
  function ensureFolder(name) {
    const trimmed = String(name || '').trim() || 'New Folder';
    const existing = state.library.folders.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const folder = { id: uid('folder'), name: trimmed, createdAt: Date.now() };
    state.library.folders.push(folder);
    return folder.id;
  }
  function readDuration(track) {
    return new Promise(async resolve => {
      try {
        const url = await getTrackUrl(track);
        if (!url) return resolve(0);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => resolve(audio.duration || 0);
        audio.onerror = () => resolve(0);
        audio.src = url;
      } catch { resolve(0); }
    });
  }

  async function loadIntoAudio(track, preserveTime = false) {
    if (!track) return false;
    const url = await getTrackUrl(track);
    if (!url) {
      notify('This track is missing its audio file. Re-upload it or sync from the backend.', 'error');
      return false;
    }
    if (state.audio.src !== url) {
      state.audio.src = url;
      state.audio.load();
    }
    if (preserveTime && state.currentTime) {
      try { state.audio.currentTime = state.currentTime; } catch {}
    }
    return true;
  }
  async function playTrack(id, preserveTime = false) {
    const track = state.library.tracks.find(t => t.id === id);
    if (!track) return;
    state.library.currentTrackId = track.id;
    if (!state.library.currentQueue.length || !state.library.currentQueue.includes(track.id)) state.library.currentQueue = selectedTracks().map(t => t.id);
    const ok = await loadIntoAudio(track, preserveTime);
    if (!ok) return;
    try {
      await state.audio.play();
      state.isPlaying = true;
      notify(`Playing ${track.title}`);
    } catch (err) {
      state.isPlaying = false;
      notify('Press play to start audio. The browser blocked automatic playback.', 'error');
    }
    scheduleSave();
    render();
  }
  async function togglePlay() {
    const track = currentTrack() || selectedTracks()[0] || state.library.tracks[0];
    if (!track) return notify('Upload a track first.', 'error');
    if (!state.library.currentTrackId) state.library.currentTrackId = track.id;
    if (state.isPlaying) {
      state.audio.pause();
      state.isPlaying = false;
    } else {
      await loadIntoAudio(currentTrack() || track, true);
      try {
        await state.audio.play();
        state.isPlaying = true;
      } catch {
        notify('Press play again after choosing a track. Browser autoplay protection stepped in.', 'error');
      }
    }
    scheduleSave();
    render();
  }
  function stop() {
    state.audio.pause();
    state.audio.currentTime = 0;
    state.currentTime = 0;
    state.isPlaying = false;
    scheduleSave();
    render();
  }
  function seekTo(seconds) {
    state.currentTime = clamp(seconds, 0, state.duration || state.audio.duration || seconds);
    try { state.audio.currentTime = state.currentTime; } catch {}
    writePlayback();
    updateTimesOnly();
  }
  function jump(delta) { seekTo((state.audio.currentTime || state.currentTime || 0) + delta); }
  function setVolume(value) {
    state.library.volume = clamp(value, 0, 1);
    state.audio.volume = state.library.volume;
    scheduleSave();
    renderMini();
  }
  function toggleShuffle() {
    state.library.shuffle = !state.library.shuffle;
    scheduleSave();
    render();
  }
  function queueIds() {
    const selected = selectedTracks().map(t => t.id);
    if (selected.includes(state.library.currentTrackId)) return selected;
    return state.library.tracks.map(t => t.id);
  }
  function next() {
    const ids = queueIds();
    if (!ids.length) return;
    let nextId = ids[0];
    const index = Math.max(0, ids.indexOf(state.library.currentTrackId));
    if (state.library.shuffle && ids.length > 1) {
      const choices = ids.filter(id => id !== state.library.currentTrackId);
      nextId = choices[Math.floor(Math.random() * choices.length)];
    } else {
      nextId = ids[(index + 1) % ids.length];
    }
    playTrack(nextId);
  }
  function previous() {
    const ids = queueIds();
    if (!ids.length) return;
    const index = Math.max(0, ids.indexOf(state.library.currentTrackId));
    const previousId = ids[(index - 1 + ids.length) % ids.length];
    playTrack(previousId);
  }

  function createFolder() {
    const name = prompt('Folder name:');
    if (!name) return;
    const id = ensureFolder(name);
    state.library.selectedFolderId = id;
    state.library.selectedPlaylistId = '';
    scheduleSave();
    render();
  }
  function createPlaylist() {
    const name = prompt('Playlist name:');
    if (!name) return;
    const playlist = { id: uid('playlist'), name: name.trim(), trackIds: [], createdAt: Date.now() };
    state.library.playlists.push(playlist);
    state.library.selectedPlaylistId = playlist.id;
    scheduleSave();
    render();
  }
  function selectFolder(id) {
    state.library.selectedFolderId = id || 'folder-all';
    state.library.selectedPlaylistId = '';
    state.library.currentQueue = selectedTracks().map(t => t.id);
    scheduleSave();
    render();
  }
  function selectPlaylist(id) {
    state.library.selectedPlaylistId = id || '';
    state.library.currentQueue = selectedTracks().map(t => t.id);
    scheduleSave();
    render();
  }
  function addToPlaylist(trackId) {
    const choices = state.library.playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const answer = prompt(`Add to which playlist?\n${choices}\n\nType a number or a new playlist name:`);
    if (!answer) return;
    const numeric = Number(answer);
    let playlist = Number.isInteger(numeric) ? state.library.playlists[numeric - 1] : null;
    if (!playlist) {
      playlist = { id: uid('playlist'), name: answer.trim(), trackIds: [], createdAt: Date.now() };
      state.library.playlists.push(playlist);
    }
    if (!playlist.trackIds.includes(trackId)) playlist.trackIds.push(trackId);
    scheduleSave();
    render();
    notify('Track added to playlist.');
  }
  async function deleteTrack(trackId) {
    const track = state.library.tracks.find(t => t.id === trackId);
    if (!track) return;
    if (!confirm(`Delete “${track.title}” from this local library?`)) return;
    state.audio.pause();
    if (state.objectUrls.has(trackId)) URL.revokeObjectURL(state.objectUrls.get(trackId));
    state.objectUrls.delete(trackId);
    await idbDelete(STORE_BLOBS, trackId).catch(() => {});
    state.library.tracks = state.library.tracks.filter(t => t.id !== trackId);
    state.library.playlists.forEach(p => { p.trackIds = p.trackIds.filter(id => id !== trackId); });
    if (state.library.currentTrackId === trackId) {
      state.library.currentTrackId = state.library.tracks[0]?.id || '';
      state.isPlaying = false;
      state.currentTime = 0;
    }
    scheduleSave();
    render();
  }
  async function downloadTrack(track) {
    if (!track) return notify('No track selected.', 'error');
    try {
      const blob = await getTrackBlob(track);
      if (!blob) return notify('No downloadable file is available for this track.', 'error');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = track.originalName || `${track.title || 'track'}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err) {
      notify(`Download failed: ${err.message}`, 'error');
    }
  }
  function downloadList() {
    const data = {
      exportedAt: new Date().toISOString(),
      selectedFolderId: state.library.selectedFolderId,
      selectedPlaylistId: state.library.selectedPlaylistId,
      tracks: selectedTracks().map(({id,title,artist,album,folderId,originalName,size,duration,addedAt,remoteUrl,downloadUrl}) => ({id,title,artist,album,folderId,originalName,size,duration,addedAt,remoteUrl,downloadUrl}))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ourspace-media-list.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function backendPost(action, payload, opaqueFallback = true) {
    const body = JSON.stringify({ app:'OurSpace', module:'media-player', action, payload, sentAt:new Date().toISOString() });
    try {
      const res = await fetch(BACKEND_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { ok: res.ok, text }; }
    } catch (err) {
      if (!opaqueFallback) throw err;
      await fetch(BACKEND_URL, { method:'POST', mode:'no-cors', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body }).catch(() => null);
      return { ok:true, opaque:true };
    }
  }
  function backendJsonp(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const callback = `__osmMediaJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const cleanup = () => { delete window[callback]; script.remove(); };
      window[callback] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error('JSONP request failed')); };
      const params = new URLSearchParams({ action, callback, payload: JSON.stringify(payload), app:'OurSpace', module:'media-player' });
      script.src = `${BACKEND_URL}?${params.toString()}`;
      document.head.appendChild(script);
      setTimeout(() => { if (window[callback]) { cleanup(); reject(new Error('JSONP request timed out')); } }, 12000);
    });
  }
  async function uploadToBackend(track, file) {
    // Avoid forcing huge base64 uploads through Apps Script. Metadata always syncs; binary upload is attempted only for smaller files.
    const smallEnoughForAppsScript = file.size <= 18 * 1024 * 1024;
    const payload = { track: {...track}, binaryIncluded: false };
    if (smallEnoughForAppsScript) {
      const dataUrl = await fileToDataUrl(file);
      payload.binaryIncluded = true;
      payload.file = { name:file.name, type:file.type || 'audio/mpeg', size:file.size, dataUrl };
    }
    const result = await backendPost('uploadTrack', payload, true);
    if (result?.track?.remoteUrl || result?.remoteUrl) {
      track.remoteUrl = result.track?.remoteUrl || result.remoteUrl;
      track.downloadUrl = result.track?.downloadUrl || result.downloadUrl || track.remoteUrl;
      track.backendId = result.track?.id || result.id || track.backendId;
      track.source = 'backend+local';
      scheduleSave();
    }
  }
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  async function syncNow(showToast = false) {
    const payload = {
      schemaVersion: state.library.schemaVersion,
      folders: state.library.folders,
      playlists: state.library.playlists,
      tracks: state.library.tracks.map(({id,title,artist,album,folderId,mime,size,duration,originalName,addedAt,backendId,remoteUrl,downloadUrl,source}) => ({id,title,artist,album,folderId,mime,size,duration,originalName,addedAt,backendId,remoteUrl,downloadUrl,source})),
      playback: readPlayback()
    };
    const result = await backendPost('saveMediaLibrary', payload, true).catch(err => ({ ok:false, error:err.message }));
    if (showToast) notify(result?.ok === false ? `Backend sync may need adapter setup: ${result.error || 'no confirmation'}` : 'Media metadata sync sent to backend.');
  }
  async function loadBackendMetadata() {
    const result = await backendJsonp('listMediaLibrary', { localUpdatedAt: state.library.updatedAt }).catch(() => null);
    if (!result?.library?.tracks?.length) return;
    const merged = mergeBackendLibrary(state.library, result.library);
    state.library = normalizeLibrary(merged);
    scheduleSave();
    render();
  }
  function mergeBackendLibrary(local, remote) {
    const merged = normalizeLibrary(local);
    for (const folder of remote.folders || []) if (!merged.folders.some(f => f.id === folder.id || f.name === folder.name)) merged.folders.push(folder);
    for (const playlist of remote.playlists || []) {
      const existing = merged.playlists.find(p => p.id === playlist.id || p.name === playlist.name);
      if (existing) existing.trackIds = Array.from(new Set([...(existing.trackIds || []), ...(playlist.trackIds || [])]));
      else merged.playlists.push(playlist);
    }
    for (const track of remote.tracks || []) {
      if (!merged.tracks.some(t => t.id === track.id || (t.originalName && t.originalName === track.originalName && t.size === track.size))) merged.tracks.push({ ...track, source:'backend' });
    }
    return merged;
  }

  function watchGames() {
    const autoPause = () => {
      const pageName = String(document.body?.dataset?.page || location.hash || document.title || '').toLowerCase();
      const gamePresent = pageName.includes('game') && $(GAME_SELECTOR);
      if (gamePresent) gameLoaded('auto');
    };
    autoPause();
    const observer = new MutationObserver(autoPause);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['data-page','class','src'] });
    document.addEventListener('focusin', event => { if (event.target.closest?.(GAME_SELECTOR)) gameLoaded('focus'); });
    document.addEventListener('click', event => { if (event.target.closest?.(GAME_SELECTOR)) gameLoaded('click'); });
    return observer;
  }
  function gameLoaded(reason = 'game') {
    if (state.isPlaying) {
      state.lastPausedByGame = true;
      state.audio.pause();
      state.isPlaying = false;
      notify('Music paused while the game is loaded.');
      render();
      writePlayback();
    }
    window.dispatchEvent(new CustomEvent('ourspace:media-paused-for-game', { detail:{ reason } }));
  }
  async function resumeAfterGame(reason = 'game-closed') {
    if (!state.lastPausedByGame) return;
    state.lastPausedByGame = false;
    window.dispatchEvent(new CustomEvent('ourspace:media-game-resume-ready', { detail:{ reason } }));
    notify('Game closed. Press play to resume music.');
    render();
  }

  function bindAudio() {
    state.audio.addEventListener('timeupdate', () => {
      state.currentTime = state.audio.currentTime || 0;
      state.duration = state.audio.duration || state.duration || 0;
      updateTimesOnly();
      writePlayback();
    });
    state.audio.addEventListener('loadedmetadata', () => {
      state.duration = state.audio.duration || 0;
      const track = currentTrack();
      if (track && state.duration && !track.duration) { track.duration = state.duration; scheduleSave(); }
      updateTimesOnly();
    });
    state.audio.addEventListener('play', () => { state.isPlaying = true; render(); });
    state.audio.addEventListener('pause', () => { state.isPlaying = false; render(); });
    state.audio.addEventListener('ended', () => next());
    state.audio.addEventListener('error', () => notify('Audio could not play. The file may be missing, blocked, or unsupported.', 'error'));
    document.addEventListener('visibilitychange', writePlayback);
    window.addEventListener('beforeunload', writePlayback);
    window.addEventListener('storage', event => {
      if (event.key !== PLAYBACK_KEY) return;
      const playback = readPlayback();
      if (playback?.trackId && playback.trackId !== state.library.currentTrackId) {
        state.library.currentTrackId = playback.trackId;
        state.currentTime = playback.currentTime || 0;
        render();
      }
    });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('seekbackward', () => jump(-5));
      navigator.mediaSession.setActionHandler('seekforward', () => jump(5));
    }
  }
  function updateTimesOnly() {
    const current = $('#osmCurrentTime');
    const duration = $('#osmDuration');
    const seek = $('#osmSeek');
    if (current) current.textContent = formatTime(state.audio.currentTime || state.currentTime || 0);
    if (duration) duration.textContent = formatTime(state.audio.duration || state.duration || 0);
    if (seek && document.activeElement !== seek) {
      seek.max = Math.max(1, Math.floor(state.audio.duration || state.duration || 1));
      seek.value = String(state.audio.currentTime || state.currentTime || 0);
    }
    renderMini();
    const track = currentTrack();
    if ('mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist || 'OurSpace', album: track.album || 'OurSpace Media' });
    }
  }

  function notify(message, type = 'info') {
    if (!state.toast) {
      state.toast = document.createElement('div');
      state.toast.className = 'osm-toast';
      state.toast.setAttribute('role', 'status');
      document.body.appendChild(state.toast);
    }
    state.toast.textContent = message;
    state.toast.dataset.type = type;
    state.toast.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => state.toast?.classList.remove('is-visible'), type === 'error' ? 5200 : 2600);
  }

  async function init() {
    if (state.initialized || !('indexedDB' in window)) return;
    state.initialized = true;
    state.db = await openDb();
    await loadLibrary();
    state.root = document.getElementById('ourspace-media-module');
    bindAudio();
    render();
    const track = currentTrack();
    if (track) loadIntoAudio(track, true).catch(() => null);
    watchGames();
    loadBackendMetadata().catch(() => null);
    window.dispatchEvent(new CustomEvent('ourspace:media-ready'));
  }

  window.OurSpaceMedia = {
    playTrack,
    togglePlay,
    stop,
    next,
    previous,
    jump,
    addFiles,
    syncNow,
    watchGames,
    gameLoaded,
    resumeAfterGame,
    getLibrary: () => JSON.parse(JSON.stringify(state.library)),
    refresh: render,
    backendUrl: BACKEND_URL
  };

  window.addEventListener('ourspace:page-changed', () => render());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
