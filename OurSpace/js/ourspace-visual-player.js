/* OurSpace Visual Player Module
   Photo + video gallery/player. Vanilla JS, local-first IndexedDB storage,
   optional Google Apps Script sync through the user supplied backend URL. */
(() => {
  'use strict';

  const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec';
  const DB_NAME = 'ourspace_visual_player_v1';
  const DB_VERSION = 1;
  const STORE_STATE = 'state';
  const STORE_BLOBS = 'blobs';
  const LIBRARY_KEY = 'library';
  const PLAYBACK_KEY = 'ourspace.visual.playback';
  const SYNC_QUEUE_KEY = 'ourspace.visual.syncQueue';
  const MAX_INLINE_SYNC_BYTES = 2 * 1024 * 1024;
  const GAME_SELECTOR = '[data-ourspace-game], [data-game-loaded="true"], iframe[data-game], iframe[src*="game"], canvas.game, .game canvas, .games canvas';

  const ACCEPTED_IMAGES = ['image/jpeg','image/png','image/gif','image/webp','image/bmp','image/svg+xml','image/avif'];
  const ACCEPTED_VIDEOS = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-m4v','video/mpeg'];
  const VISUAL_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif|mp4|m4v|mov|webm|ogv|mpeg|mpg)$/i;
  const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i;
  const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv|mpeg|mpg)$/i;

  const defaultLibrary = () => ({
    schemaVersion: 1,
    folders: [
      { id: 'folder-all', name: 'All Visuals', system: true, createdAt: Date.now() },
      { id: 'folder-uploads', name: 'Uploads', system: true, createdAt: Date.now() }
    ],
    playlists: [
      { id: 'playlist-favorites', name: 'Favorites', assetIds: [], system: true, createdAt: Date.now() }
    ],
    assets: [],
    selectedFolderId: 'folder-all',
    selectedPlaylistId: '',
    currentAssetId: '',
    shuffle: false,
    repeat: 'all',
    fitMode: 'contain',
    slideshowSeconds: 8,
    videoVolume: 0.85,
    updatedAt: Date.now(),
    backendUrl: BACKEND_URL
  });

  const state = {
    db: null,
    library: defaultLibrary(),
    root: null,
    toast: null,
    mediaElement: null,
    mediaType: '',
    objectUrls: new Map(),
    isPlaying: false,
    imageElapsed: 0,
    imageTimer: null,
    saveTimer: null,
    syncTimer: null,
    lastPausedByGame: false,
    initialized: false,
    pendingRenderMedia: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowIso = () => new Date().toISOString();
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
  const cleanTitle = (file) => file.name.replace(VISUAL_EXT, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || file.name;
  const isImageFile = (file) => ACCEPTED_IMAGES.includes(file.type) || IMAGE_EXT.test(file.name);
  const isVideoFile = (file) => ACCEPTED_VIDEOS.includes(file.type) || VIDEO_EXT.test(file.name);
  const isVisualFile = (file) => isImageFile(file) || isVideoFile(file);
  const currentAsset = () => state.library.assets.find(a => a.id === state.library.currentAssetId) || null;

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
    if (playback?.assetId && state.library.assets.some(a => a.id === playback.assetId)) {
      state.library.currentAssetId = playback.assetId;
      state.imageElapsed = playback.imageElapsed || 0;
      state.library.videoVolume = Number.isFinite(playback.videoVolume) ? playback.videoVolume : state.library.videoVolume;
      state.library.shuffle = Boolean(playback.shuffle);
      state.library.fitMode = playback.fitMode || state.library.fitMode;
    }
  }

  function normalizeLibrary(raw) {
    const next = { ...defaultLibrary(), ...(raw || {}) };
    next.folders = Array.isArray(next.folders) ? next.folders : [];
    next.playlists = Array.isArray(next.playlists) ? next.playlists : [];
    next.assets = Array.isArray(next.assets) ? next.assets : [];
    if (!next.folders.some(f => f.id === 'folder-all')) next.folders.unshift({ id:'folder-all', name:'All Visuals', system:true, createdAt:Date.now() });
    if (!next.folders.some(f => f.id === 'folder-uploads')) next.folders.push({ id:'folder-uploads', name:'Uploads', system:true, createdAt:Date.now() });
    if (!next.playlists.some(p => p.id === 'playlist-favorites')) next.playlists.unshift({ id:'playlist-favorites', name:'Favorites', assetIds:[], system:true, createdAt:Date.now() });
    next.assets = next.assets.map(asset => ({
      id: asset.id || uid('asset'),
      title: asset.title || asset.name || 'Untitled Visual',
      kind: asset.kind === 'video' ? 'video' : 'image',
      folderId: asset.folderId || 'folder-uploads',
      mime: asset.mime || asset.type || (asset.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: Number(asset.size || 0),
      duration: Number(asset.duration || 0),
      width: Number(asset.width || 0),
      height: Number(asset.height || 0),
      originalName: asset.originalName || asset.name || `${asset.title || 'visual'}`,
      relativePath: asset.relativePath || '',
      thumbDataUrl: asset.thumbDataUrl || '',
      addedAt: Number(asset.addedAt || Date.now()),
      backendId: asset.backendId || '',
      remoteUrl: asset.remoteUrl || asset.url || '',
      downloadUrl: asset.downloadUrl || asset.remoteUrl || asset.url || '',
      source: asset.source || 'local'
    }));
    next.playlists = next.playlists.map(p => ({
      ...p,
      assetIds: Array.isArray(p.assetIds) ? p.assetIds.filter(id => next.assets.some(a => a.id === id)) : []
    }));
    next.selectedFolderId = next.selectedFolderId || 'folder-all';
    next.selectedPlaylistId = next.selectedPlaylistId || '';
    next.slideshowSeconds = clamp(Number(next.slideshowSeconds || 8), 2, 60);
    next.videoVolume = clamp(Number(next.videoVolume ?? 0.85), 0, 1);
    next.fitMode = ['contain','cover','actual'].includes(next.fitMode) ? next.fitMode : 'contain';
    return next;
  }

  function visibleAssets() {
    const lib = state.library;
    let assets = lib.assets.slice();
    if (lib.selectedPlaylistId) {
      const playlist = lib.playlists.find(p => p.id === lib.selectedPlaylistId);
      const ids = new Set(playlist?.assetIds || []);
      assets = assets.filter(a => ids.has(a.id));
    } else if (lib.selectedFolderId && lib.selectedFolderId !== 'folder-all') {
      assets = assets.filter(a => a.folderId === lib.selectedFolderId);
    }
    return assets.sort((a,b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function scheduleSave() {
    clearTimeout(state.saveTimer);
    state.library.updatedAt = Date.now();
    state.saveTimer = setTimeout(async () => {
      await idbSet(STORE_STATE, LIBRARY_KEY, state.library).catch(err => notify(`Could not save visual library locally: ${err.message}`, 'error'));
      writePlayback();
    }, 160);
  }

  function readPlayback() {
    try { return JSON.parse(localStorage.getItem(PLAYBACK_KEY) || 'null'); } catch { return null; }
  }
  function writePlayback() {
    const asset = currentAsset();
    localStorage.setItem(PLAYBACK_KEY, JSON.stringify({
      assetId: asset?.id || '',
      currentTime: state.mediaElement?.currentTime || 0,
      imageElapsed: state.imageElapsed || 0,
      videoVolume: state.library.videoVolume,
      shuffle: state.library.shuffle,
      fitMode: state.library.fitMode,
      isPlaying: state.isPlaying,
      updatedAt: Date.now()
    }));
  }

  async function getAssetUrl(asset) {
    if (!asset) return '';
    if (asset.remoteUrl) return asset.remoteUrl;
    if (state.objectUrls.has(asset.id)) return state.objectUrls.get(asset.id);
    const blob = await idbGet(STORE_BLOBS, asset.id).catch(() => null);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    state.objectUrls.set(asset.id, url);
    return url;
  }

  async function getAssetBlob(asset) {
    if (!asset) return null;
    const blob = await idbGet(STORE_BLOBS, asset.id).catch(() => null);
    if (blob) return blob;
    const url = asset.downloadUrl || asset.remoteUrl;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  function render() {
    if (!state.root) return;
    const lib = state.library;
    const asset = currentAsset();
    const shown = visibleAssets();
    const totalSize = lib.assets.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    const imageCount = lib.assets.filter(a => a.kind === 'image').length;
    const videoCount = lib.assets.filter(a => a.kind === 'video').length;
    const selectedPlaylist = lib.playlists.find(p => p.id === lib.selectedPlaylistId);

    state.root.classList.add('ospv-card');
    state.root.innerHTML = `
      <div class="ospv-top">
        <div class="ospv-title">
          <h2>Visual Player</h2>
          <p>Photo + video library with folders, playlists, upload, playback controls, downloads, and local-first storage.</p>
        </div>
        <div class="ospv-status">
          <span class="ospv-pill"><strong>${lib.assets.length}</strong> items</span>
          <span class="ospv-pill"><strong>${imageCount}</strong> photos</span>
          <span class="ospv-pill"><strong>${videoCount}</strong> videos</span>
          <span class="ospv-pill"><strong>${formatBytes(totalSize)}</strong></span>
        </div>
      </div>
      <div class="ospv-grid">
        <aside class="ospv-panel ospv-sidebar">
          <div class="ospv-section-title"><h3>Library</h3></div>
          <div class="ospv-stack">
            <label class="ospv-drop" data-action="upload-picker">
              <strong>Upload photos/videos</strong>
              <span>Choose files or drag them here.</span>
              <input class="ospv-hidden-input" type="file" accept="image/*,video/*" multiple data-action="upload-files">
            </label>
            <label class="ospv-drop ospv-folder-drop" data-action="folder-picker">
              <strong>Upload a folder</strong>
              <span>Keeps the first folder name as an album.</span>
              <input class="ospv-hidden-input" type="file" accept="image/*,video/*" multiple webkitdirectory directory data-action="upload-folder">
            </label>
            <div class="ospv-field-row">
              <input class="ospv-field" type="text" placeholder="New folder name" data-field="folder-name">
              <button class="ospv-btn" data-action="create-folder">Create</button>
            </div>
            <label class="ospv-label">Folder</label>
            <select class="ospv-field" data-field="folder-select">
              ${lib.folders.map(f => `<option value="${esc(f.id)}" ${f.id === lib.selectedFolderId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}
            </select>
            <div class="ospv-field-row">
              <input class="ospv-field" type="text" placeholder="New playlist name" data-field="playlist-name">
              <button class="ospv-btn" data-action="create-playlist">Create</button>
            </div>
            <label class="ospv-label">Playlist</label>
            <select class="ospv-field" data-field="playlist-select">
              <option value="">No playlist filter</option>
              ${lib.playlists.map(p => `<option value="${esc(p.id)}" ${p.id === lib.selectedPlaylistId ? 'selected' : ''}>${esc(p.name)} (${p.assetIds.length})</option>`).join('')}
            </select>
            <button class="ospv-btn" data-action="add-selected-to-playlist">Add checked items to playlist</button>
            <button class="ospv-btn ospv-btn-danger" data-action="delete-selected">Delete checked items</button>
          </div>
        </aside>

        <main class="ospv-panel ospv-main">
          <div class="ospv-player-panel">
            <div class="ospv-screen" data-visual-screen aria-live="polite">
              <div class="ospv-empty">${asset ? 'Loading visual…' : 'Upload a photo or video to begin.'}</div>
            </div>
            <div class="ospv-now">
              <div class="ospv-thumb" data-current-thumb>${asset?.thumbDataUrl ? `<img src="${asset.thumbDataUrl}" alt="">` : '<span>✦</span>'}</div>
              <div class="ospv-now-text">
                <div class="ospv-track-title" data-current-title>${esc(asset?.title || 'No visual selected')}</div>
                <div class="ospv-track-subtitle" data-current-subtitle>${asset ? `${asset.kind} • ${formatBytes(asset.size)} • ${asset.width || '?'}×${asset.height || '?'}` : 'Photos use slideshow timing. Videos use native timing.'}</div>
              </div>
            </div>
            <div class="ospv-progress-wrap">
              <span class="ospv-time" data-current-time>0:00</span>
              <input class="ospv-range" type="range" min="0" max="100" value="0" step="0.01" data-field="progress">
              <span class="ospv-time" data-duration>0:00</span>
            </div>
            <div class="ospv-controls">
              <button class="ospv-btn ospv-btn-icon" title="Previous" data-action="previous">⏮</button>
              <button class="ospv-btn ospv-btn-icon" title="Rewind 5 seconds" data-action="rewind">↺5</button>
              <button class="ospv-btn ospv-btn-main" data-action="play">▶ Play</button>
              <button class="ospv-btn" data-action="pause">⏸ Pause</button>
              <button class="ospv-btn" data-action="stop">⏹ Stop</button>
              <button class="ospv-btn ospv-btn-icon" title="Fast forward 5 seconds" data-action="forward">5↻</button>
              <button class="ospv-btn ospv-btn-icon" title="Next" data-action="next">⏭</button>
              <button class="ospv-btn ${lib.shuffle ? 'is-active' : ''}" aria-pressed="${lib.shuffle}" data-action="shuffle">Shuffle</button>
              <button class="ospv-btn" data-action="download">Download</button>
              <button class="ospv-btn" data-action="fullscreen">Fullscreen</button>
            </div>
            <div class="ospv-settings-row">
              <label>Photo seconds <input class="ospv-field ospv-small-field" type="number" min="2" max="60" value="${esc(lib.slideshowSeconds)}" data-field="slideshow-seconds"></label>
              <label>Video volume <input class="ospv-range ospv-small-range" type="range" min="0" max="1" step="0.01" value="${esc(lib.videoVolume)}" data-field="volume"></label>
              <label>Fit
                <select class="ospv-field ospv-small-field" data-field="fit-mode">
                  <option value="contain" ${lib.fitMode === 'contain' ? 'selected' : ''}>Contain</option>
                  <option value="cover" ${lib.fitMode === 'cover' ? 'selected' : ''}>Cover</option>
                  <option value="actual" ${lib.fitMode === 'actual' ? 'selected' : ''}>Actual</option>
                </select>
              </label>
            </div>
          </div>

          <div class="ospv-section-title ospv-library-title">
            <h3>${selectedPlaylist ? esc(selectedPlaylist.name) : esc(lib.folders.find(f => f.id === lib.selectedFolderId)?.name || 'All Visuals')}</h3>
            <span class="ospv-tag">${shown.length} visible</span>
          </div>
          <div class="ospv-gallery" data-gallery>
            ${shown.length ? shown.map(renderAssetCard).join('') : '<div class="ospv-empty">No visuals in this view yet.</div>'}
          </div>
        </main>
      </div>
      <p class="ospv-footer-note">Local files are saved in this browser with IndexedDB. Metadata and small assets are queued for the supplied Apps Script backend when available.</p>
    `;
    bindEvents();
    refreshMediaDisplay();
    updateProgressUi();
  }

  function renderAssetCard(asset) {
    const isCurrent = asset.id === state.library.currentAssetId;
    const meta = [asset.kind, formatBytes(asset.size), asset.width && asset.height ? `${asset.width}×${asset.height}` : '', asset.duration ? formatTime(asset.duration) : ''].filter(Boolean).join(' • ');
    return `
      <article class="ospv-card-item ${isCurrent ? 'is-current' : ''}" data-asset-id="${esc(asset.id)}">
        <label class="ospv-check"><input type="checkbox" class="ospv-select-asset" value="${esc(asset.id)}"><span></span></label>
        <button class="ospv-preview" data-action="select-asset" data-asset-id="${esc(asset.id)}" title="Open ${esc(asset.title)}">
          ${asset.thumbDataUrl ? `<img src="${asset.thumbDataUrl}" alt="">` : `<span class="ospv-preview-fallback">${asset.kind === 'video' ? '🎞' : '🖼'}</span>`}
          <span class="ospv-kind">${asset.kind}</span>
        </button>
        <div class="ospv-item-body">
          <div class="ospv-item-title">${esc(asset.title)}</div>
          <div class="ospv-item-meta">${esc(meta)}</div>
          <div class="ospv-item-actions">
            <button class="ospv-btn ospv-btn-small" data-action="select-asset" data-asset-id="${esc(asset.id)}">Open</button>
            <button class="ospv-btn ospv-btn-small" data-action="download-asset" data-asset-id="${esc(asset.id)}">Download</button>
          </div>
        </div>
      </article>
    `;
  }

  function bindEvents() {
    const root = state.root;
    $('[data-action="upload-files"]', root)?.addEventListener('change', event => handleFiles(event.target.files));
    $('[data-action="upload-folder"]', root)?.addEventListener('change', event => handleFiles(event.target.files, { useRelativeFolders: true }));
    $('[data-action="create-folder"]', root)?.addEventListener('click', createFolderFromInput);
    $('[data-action="create-playlist"]', root)?.addEventListener('click', createPlaylistFromInput);
    $('[data-action="add-selected-to-playlist"]', root)?.addEventListener('click', addCheckedToPlaylist);
    $('[data-action="delete-selected"]', root)?.addEventListener('click', deleteCheckedAssets);
    $('[data-field="folder-select"]', root)?.addEventListener('change', event => {
      state.library.selectedFolderId = event.target.value;
      state.library.selectedPlaylistId = '';
      state.library.currentAssetId = visibleAssets()[0]?.id || '';
      pause(); state.imageElapsed = 0; scheduleSave(); render();
    });
    $('[data-field="playlist-select"]', root)?.addEventListener('change', event => {
      state.library.selectedPlaylistId = event.target.value;
      state.library.currentAssetId = visibleAssets()[0]?.id || state.library.currentAssetId;
      pause(); state.imageElapsed = 0; scheduleSave(); render();
    });
    $('[data-field="progress"]', root)?.addEventListener('input', event => seekToPercent(Number(event.target.value)));
    $('[data-field="slideshow-seconds"]', root)?.addEventListener('change', event => {
      state.library.slideshowSeconds = clamp(Number(event.target.value || 8), 2, 60);
      state.imageElapsed = Math.min(state.imageElapsed, state.library.slideshowSeconds);
      scheduleSave(); updateProgressUi(); scheduleSync('updateSettings', { slideshowSeconds: state.library.slideshowSeconds });
    });
    $('[data-field="volume"]', root)?.addEventListener('input', event => {
      state.library.videoVolume = clamp(Number(event.target.value || 0), 0, 1);
      if (state.mediaElement && state.mediaElement.tagName === 'VIDEO') state.mediaElement.volume = state.library.videoVolume;
      scheduleSave();
    });
    $('[data-field="fit-mode"]', root)?.addEventListener('change', event => {
      state.library.fitMode = event.target.value;
      applyFitMode(); scheduleSave(); scheduleSync('updateSettings', { fitMode: state.library.fitMode });
    });

    $$('[data-action="select-asset"]', root).forEach(btn => btn.addEventListener('click', () => selectAsset(btn.dataset.assetId, false)));
    $$('[data-action="download-asset"]', root).forEach(btn => btn.addEventListener('click', () => downloadAsset(btn.dataset.assetId)));
    $('[data-action="previous"]', root)?.addEventListener('click', previous);
    $('[data-action="rewind"]', root)?.addEventListener('click', () => seekRelative(-5));
    $('[data-action="play"]', root)?.addEventListener('click', play);
    $('[data-action="pause"]', root)?.addEventListener('click', pause);
    $('[data-action="stop"]', root)?.addEventListener('click', stop);
    $('[data-action="forward"]', root)?.addEventListener('click', () => seekRelative(5));
    $('[data-action="next"]', root)?.addEventListener('click', next);
    $('[data-action="shuffle"]', root)?.addEventListener('click', toggleShuffle);
    $('[data-action="download"]', root)?.addEventListener('click', () => downloadAsset(state.library.currentAssetId));
    $('[data-action="fullscreen"]', root)?.addEventListener('click', requestFullscreen);

    $$('[data-action="upload-picker"], [data-action="folder-picker"]', root).forEach(drop => {
      drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
      drop.addEventListener('drop', event => {
        event.preventDefault(); drop.classList.remove('is-drag');
        handleFiles(event.dataTransfer.files, { useRelativeFolders: false });
      });
    });
  }

  async function refreshMediaDisplay() {
    const token = ++state.pendingRenderMedia;
    const screen = $('[data-visual-screen]', state.root);
    const asset = currentAsset();
    if (!screen || !asset) return;
    const url = await getAssetUrl(asset);
    if (token !== state.pendingRenderMedia) return;
    revokeMediaElement();
    screen.classList.remove('is-image','is-video');
    screen.innerHTML = '';
    if (!url) {
      screen.innerHTML = '<div class="ospv-empty">This visual is missing its local file. Re-upload it or provide a remote URL.</div>';
      return;
    }
    if (asset.kind === 'video') {
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'metadata';
      video.playsInline = true;
      video.volume = state.library.videoVolume;
      video.className = 'ospv-media ospv-media-video';
      video.addEventListener('loadedmetadata', () => {
        asset.duration = video.duration || asset.duration || 0;
        asset.width = video.videoWidth || asset.width || 0;
        asset.height = video.videoHeight || asset.height || 0;
        updateProgressUi(); scheduleSave();
      });
      video.addEventListener('timeupdate', () => { updateProgressUi(); writePlayback(); });
      video.addEventListener('play', () => { state.isPlaying = true; updateCurrentButtons(); });
      video.addEventListener('pause', () => { state.isPlaying = false; updateCurrentButtons(); writePlayback(); });
      video.addEventListener('ended', next);
      state.mediaElement = video;
      state.mediaType = 'video';
      screen.classList.add('is-video');
      screen.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = asset.title || 'Uploaded visual';
      img.className = 'ospv-media ospv-media-image';
      img.addEventListener('load', () => {
        asset.width = img.naturalWidth || asset.width || 0;
        asset.height = img.naturalHeight || asset.height || 0;
        updateNowInfo(); scheduleSave();
      });
      state.mediaElement = img;
      state.mediaType = 'image';
      screen.classList.add('is-image');
      screen.appendChild(img);
    }
    applyFitMode();
    updateNowInfo();
    updateProgressUi();
    updateCurrentButtons();
  }

  function revokeMediaElement() {
    stopImageTimer();
    if (state.mediaElement && state.mediaElement.tagName === 'VIDEO') {
      state.mediaElement.pause();
      state.mediaElement.removeAttribute('src');
      state.mediaElement.load();
    }
    state.mediaElement = null;
    state.mediaType = '';
  }

  function applyFitMode() {
    const screen = $('[data-visual-screen]', state.root);
    if (!screen) return;
    screen.dataset.fit = state.library.fitMode;
  }

  function updateNowInfo() {
    const asset = currentAsset();
    if (!state.root || !asset) return;
    const title = $('[data-current-title]', state.root);
    const sub = $('[data-current-subtitle]', state.root);
    const thumb = $('[data-current-thumb]', state.root);
    if (title) title.textContent = asset.title || 'Untitled Visual';
    if (sub) sub.textContent = `${asset.kind} • ${formatBytes(asset.size)} • ${asset.width || '?'}×${asset.height || '?'}${asset.duration ? ' • ' + formatTime(asset.duration) : ''}`;
    if (thumb) thumb.innerHTML = asset.thumbDataUrl ? `<img src="${asset.thumbDataUrl}" alt="">` : '<span>✦</span>';
  }

  function updateCurrentButtons() {
    if (!state.root) return;
    const playBtn = $('[data-action="play"]', state.root);
    if (playBtn) playBtn.textContent = state.isPlaying ? '▶ Playing' : '▶ Play';
  }

  function updateProgressUi() {
    if (!state.root) return;
    const asset = currentAsset();
    const progress = $('[data-field="progress"]', state.root);
    const current = $('[data-current-time]', state.root);
    const durationEl = $('[data-duration]', state.root);
    let cur = 0, dur = 0;
    if (asset?.kind === 'video' && state.mediaElement?.tagName === 'VIDEO') {
      cur = state.mediaElement.currentTime || 0;
      dur = state.mediaElement.duration || asset.duration || 0;
    } else if (asset?.kind === 'image') {
      cur = state.imageElapsed || 0;
      dur = state.library.slideshowSeconds || 8;
    }
    if (progress) progress.value = dur ? String((cur / dur) * 100) : '0';
    if (current) current.textContent = formatTime(cur);
    if (durationEl) durationEl.textContent = formatTime(dur);
  }

  async function handleFiles(fileList, options = {}) {
    const files = Array.from(fileList || []).filter(isVisualFile);
    if (!files.length) { notify('No supported photo or video files were found.', 'error'); return; }
    notify(`Adding ${files.length} visual item${files.length === 1 ? '' : 's'}…`);
    let added = 0;
    for (const file of files) {
      try {
        const folderId = options.useRelativeFolders ? ensureFolderFromRelativePath(file.webkitRelativePath) : selectedUploadFolderId();
        const asset = await buildAssetFromFile(file, folderId);
        await idbSet(STORE_BLOBS, asset.id, file);
        state.library.assets.push(asset);
        if (!state.library.currentAssetId) state.library.currentAssetId = asset.id;
        added += 1;
        scheduleSync('upsertAsset', await metadataForSync(asset, file));
      } catch (err) {
        notify(`Could not add ${file.name}: ${err.message}`, 'error');
      }
    }
    scheduleSave();
    render();
    notify(`Added ${added} visual item${added === 1 ? '' : 's'}.`);
  }

  function selectedUploadFolderId() {
    if (state.library.selectedFolderId && state.library.selectedFolderId !== 'folder-all') return state.library.selectedFolderId;
    return 'folder-uploads';
  }

  function ensureFolderFromRelativePath(relativePath = '') {
    const first = String(relativePath).split('/').filter(Boolean)[0];
    if (!first) return selectedUploadFolderId();
    const existing = state.library.folders.find(f => f.name.toLowerCase() === first.toLowerCase());
    if (existing) return existing.id;
    const folder = { id: uid('folder'), name: first, system: false, createdAt: Date.now() };
    state.library.folders.push(folder);
    scheduleSync('upsertFolder', folder);
    return folder.id;
  }

  async function buildAssetFromFile(file, folderId) {
    const kind = isVideoFile(file) ? 'video' : 'image';
    const metadata = kind === 'video' ? await readVideoMetadata(file) : await readImageMetadata(file);
    return {
      id: uid('asset'),
      title: cleanTitle(file),
      kind,
      folderId,
      mime: file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: file.size,
      duration: metadata.duration || 0,
      width: metadata.width || 0,
      height: metadata.height || 0,
      originalName: file.name,
      relativePath: file.webkitRelativePath || '',
      thumbDataUrl: metadata.thumbDataUrl || '',
      addedAt: Date.now(),
      backendId: '',
      remoteUrl: '',
      downloadUrl: '',
      source: 'local'
    };
  }

  function readImageMetadata(file) {
    return new Promise(resolve => {
      if (file.type === 'image/svg+xml') {
        resolve({ width: 0, height: 0, thumbDataUrl: '' });
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const data = await makeImageThumbnail(img).catch(() => '');
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0, thumbDataUrl: data });
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0, thumbDataUrl: '' }); };
      img.src = url;
    });
  }

  function readVideoMetadata(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      let done = false;
      const finish = async () => {
        if (done) return;
        done = true;
        let thumbDataUrl = '';
        try { thumbDataUrl = await makeVideoThumbnail(video); } catch {}
        const meta = { width: video.videoWidth || 0, height: video.videoHeight || 0, duration: video.duration || 0, thumbDataUrl };
        URL.revokeObjectURL(url);
        resolve(meta);
      };
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 1) {
          video.currentTime = Math.min(1, Math.max(0, video.duration / 8));
        } else finish();
      };
      video.onseeked = finish;
      video.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0, duration: 0, thumbDataUrl: '' }); };
      setTimeout(finish, 2500);
      video.src = url;
    });
  }

  function makeImageThumbnail(img) {
    return new Promise(resolve => {
      const max = 360;
      const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
      const w = Math.max(1, Math.round((img.naturalWidth || max) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || max) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    });
  }

  function makeVideoThumbnail(video) {
    return new Promise(resolve => {
      const max = 360;
      const vw = video.videoWidth || max, vh = video.videoHeight || max;
      const scale = Math.min(1, max / Math.max(vw, vh));
      const w = Math.max(1, Math.round(vw * scale));
      const h = Math.max(1, Math.round(vh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.68));
    });
  }

  async function metadataForSync(asset, file) {
    const payload = { ...asset, syncedAt: nowIso() };
    delete payload.remoteUrl;
    delete payload.downloadUrl;
    if (file && file.size <= MAX_INLINE_SYNC_BYTES) {
      payload.inlineFile = await blobToDataUrl(file).catch(() => '');
    }
    return payload;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(blob);
    });
  }

  function createFolderFromInput() {
    const input = $('[data-field="folder-name"]', state.root);
    const name = input?.value.trim();
    if (!name) return notify('Type a folder name first.', 'error');
    if (state.library.folders.some(f => f.name.toLowerCase() === name.toLowerCase())) return notify('That folder already exists.', 'error');
    const folder = { id: uid('folder'), name, system: false, createdAt: Date.now() };
    state.library.folders.push(folder);
    state.library.selectedFolderId = folder.id;
    state.library.selectedPlaylistId = '';
    scheduleSave(); scheduleSync('upsertFolder', folder); render();
    notify(`Created folder: ${name}`);
  }

  function createPlaylistFromInput() {
    const input = $('[data-field="playlist-name"]', state.root);
    const name = input?.value.trim();
    if (!name) return notify('Type a playlist name first.', 'error');
    if (state.library.playlists.some(p => p.name.toLowerCase() === name.toLowerCase())) return notify('That playlist already exists.', 'error');
    const playlist = { id: uid('playlist'), name, assetIds: [], system: false, createdAt: Date.now() };
    state.library.playlists.push(playlist);
    state.library.selectedPlaylistId = playlist.id;
    scheduleSave(); scheduleSync('upsertPlaylist', playlist); render();
    notify(`Created playlist: ${name}`);
  }

  function checkedAssetIds() {
    return $$('.ospv-select-asset:checked', state.root).map(input => input.value);
  }

  function addCheckedToPlaylist() {
    const ids = checkedAssetIds();
    if (!ids.length) return notify('Check at least one item first.', 'error');
    let playlist = state.library.playlists.find(p => p.id === state.library.selectedPlaylistId);
    if (!playlist) playlist = state.library.playlists.find(p => p.id === 'playlist-favorites');
    const existing = new Set(playlist.assetIds);
    ids.forEach(id => existing.add(id));
    playlist.assetIds = Array.from(existing);
    scheduleSave(); scheduleSync('upsertPlaylist', playlist); render();
    notify(`Added ${ids.length} item${ids.length === 1 ? '' : 's'} to ${playlist.name}.`);
  }

  async function deleteCheckedAssets() {
    const ids = checkedAssetIds();
    if (!ids.length) return notify('Check at least one item first.', 'error');
    for (const id of ids) {
      await idbDelete(STORE_BLOBS, id).catch(() => {});
      if (state.objectUrls.has(id)) { URL.revokeObjectURL(state.objectUrls.get(id)); state.objectUrls.delete(id); }
    }
    state.library.assets = state.library.assets.filter(a => !ids.includes(a.id));
    state.library.playlists.forEach(p => { p.assetIds = p.assetIds.filter(id => !ids.includes(id)); });
    if (ids.includes(state.library.currentAssetId)) state.library.currentAssetId = visibleAssets()[0]?.id || state.library.assets[0]?.id || '';
    scheduleSave(); scheduleSync('deleteAssets', { ids }); render();
    notify(`Deleted ${ids.length} item${ids.length === 1 ? '' : 's'} from this browser.`);
  }

  async function selectAsset(id, autoplay = false) {
    if (!id || !state.library.assets.some(a => a.id === id)) return;
    pause();
    state.library.currentAssetId = id;
    state.imageElapsed = 0;
    scheduleSave();
    render();
    if (autoplay) setTimeout(play, 0);
  }

  async function play() {
    let asset = currentAsset();
    if (!asset) {
      const first = visibleAssets()[0] || state.library.assets[0];
      if (first) { state.library.currentAssetId = first.id; asset = first; render(); }
    }
    if (!asset) return notify('Upload or select a visual first.', 'error');
    if (!state.mediaElement || state.mediaType !== asset.kind) await refreshMediaDisplay();
    if (asset.kind === 'video' && state.mediaElement?.tagName === 'VIDEO') {
      try { await state.mediaElement.play(); state.isPlaying = true; } catch (err) { notify(`Playback blocked: ${err.message}`, 'error'); }
    } else {
      state.isPlaying = true;
      startImageTimer();
    }
    updateCurrentButtons(); writePlayback();
  }

  function pause() {
    if (state.mediaElement?.tagName === 'VIDEO') state.mediaElement.pause();
    stopImageTimer();
    state.isPlaying = false;
    updateCurrentButtons(); writePlayback();
  }

  function stop() {
    pause();
    state.imageElapsed = 0;
    if (state.mediaElement?.tagName === 'VIDEO') state.mediaElement.currentTime = 0;
    updateProgressUi(); writePlayback();
  }

  function startImageTimer() {
    stopImageTimer();
    state.imageTimer = setInterval(() => {
      if (currentAsset()?.kind !== 'image' || !state.isPlaying) return;
      state.imageElapsed += 0.25;
      if (state.imageElapsed >= state.library.slideshowSeconds) next();
      else updateProgressUi();
    }, 250);
  }

  function stopImageTimer() {
    if (state.imageTimer) clearInterval(state.imageTimer);
    state.imageTimer = null;
  }

  function next() {
    const assets = visibleAssets();
    if (!assets.length) return;
    const current = currentAsset();
    let nextAsset;
    if (state.library.shuffle && assets.length > 1) {
      const pool = assets.filter(a => a.id !== current?.id);
      nextAsset = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const index = Math.max(0, assets.findIndex(a => a.id === current?.id));
      nextAsset = assets[index + 1] || (state.library.repeat === 'all' ? assets[0] : null);
    }
    if (!nextAsset) return stop();
    const wasPlaying = state.isPlaying;
    selectAsset(nextAsset.id, wasPlaying);
  }

  function previous() {
    const assets = visibleAssets();
    if (!assets.length) return;
    const current = currentAsset();
    const index = assets.findIndex(a => a.id === current?.id);
    const previousAsset = assets[index - 1] || assets[assets.length - 1];
    const wasPlaying = state.isPlaying;
    selectAsset(previousAsset.id, wasPlaying);
  }

  function seekRelative(seconds) {
    const asset = currentAsset();
    if (!asset) return;
    if (asset.kind === 'video' && state.mediaElement?.tagName === 'VIDEO') {
      const dur = state.mediaElement.duration || asset.duration || 0;
      state.mediaElement.currentTime = clamp((state.mediaElement.currentTime || 0) + seconds, 0, dur || Number.MAX_SAFE_INTEGER);
    } else {
      state.imageElapsed += seconds;
      if (state.imageElapsed < 0) { previous(); return; }
      if (state.imageElapsed >= state.library.slideshowSeconds) { next(); return; }
    }
    updateProgressUi(); writePlayback();
  }

  function seekToPercent(percent) {
    const asset = currentAsset();
    if (!asset) return;
    const pct = clamp(percent || 0, 0, 100) / 100;
    if (asset.kind === 'video' && state.mediaElement?.tagName === 'VIDEO') {
      const dur = state.mediaElement.duration || asset.duration || 0;
      if (dur) state.mediaElement.currentTime = dur * pct;
    } else {
      state.imageElapsed = state.library.slideshowSeconds * pct;
    }
    updateProgressUi(); writePlayback();
  }

  function toggleShuffle() {
    state.library.shuffle = !state.library.shuffle;
    scheduleSave(); render();
  }

  async function downloadAsset(id) {
    const asset = state.library.assets.find(a => a.id === id);
    if (!asset) return notify('No visual selected to download.', 'error');
    try {
      const blob = await getAssetBlob(asset);
      const url = blob ? URL.createObjectURL(blob) : (asset.downloadUrl || asset.remoteUrl);
      if (!url) return notify('This item has no downloadable file available.', 'error');
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.originalName || `${asset.title || 'visual'}.${asset.kind === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a); a.click(); a.remove();
      if (blob) setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err) { notify(`Download failed: ${err.message}`, 'error'); }
  }

  function requestFullscreen() {
    const screen = $('[data-visual-screen]', state.root);
    if (!screen) return;
    if (screen.requestFullscreen) screen.requestFullscreen().catch(() => {});
  }

  function notify(message, type = 'info') {
    if (!state.toast) {
      state.toast = document.createElement('div');
      state.toast.className = 'ospv-toast';
      document.body.appendChild(state.toast);
    }
    state.toast.textContent = message;
    state.toast.dataset.type = type;
    state.toast.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => state.toast?.classList.remove('is-visible'), type === 'error' ? 5200 : 2800);
  }

  function enqueueSync(envelope) {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
      queue.push(envelope);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-120)));
    } catch {}
  }

  function readSyncQueue() {
    try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); } catch { return []; }
  }

  function writeSyncQueue(queue) {
    try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue)); } catch {}
  }

  function scheduleSync(action, payload) {
    const envelope = {
      app: 'OurSpace',
      module: 'visual-player',
      action,
      profile: document.body?.dataset?.profile || state.root?.dataset?.profile || 'shared',
      deviceId: getDeviceId(),
      sentAt: nowIso(),
      payload
    };
    enqueueSync(envelope);
    clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(flushSyncQueue, 700);
  }

  function getDeviceId() {
    const key = 'ourspace.visual.deviceId';
    let value = localStorage.getItem(key);
    if (!value) { value = uid('device'); localStorage.setItem(key, value); }
    return value;
  }

  async function flushSyncQueue() {
    const queue = readSyncQueue();
    if (!queue.length || !BACKEND_URL) return;
    const remaining = [];
    for (const item of queue) {
      try {
        const res = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item),
          keepalive: JSON.stringify(item).length < 60000
        });
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      } catch (err) {
        remaining.push(item);
      }
    }
    writeSyncQueue(remaining.slice(-120));
  }

  function setupGameAutoPause() {
    const check = () => {
      const gameVisible = Boolean($(GAME_SELECTOR));
      if (gameVisible && state.isPlaying && currentAsset()?.kind === 'video') {
        state.lastPausedByGame = true;
        pause();
        notify('Visual playback paused while a game is loaded.');
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    setInterval(check, 2500);
  }

  async function init(root = null) {
    if (state.initialized) return;
    state.initialized = true;
    state.root = root || $('[data-ourspace-visual-player]');
    if (!state.root) return;
    if (!('indexedDB' in window)) {
      state.root.innerHTML = '<div class="ospv-card"><p>IndexedDB is required for local visual uploads in this browser.</p></div>';
      return;
    }
    state.db = await openDb();
    await loadLibrary();
    if (!state.library.currentAssetId) state.library.currentAssetId = state.library.assets[0]?.id || '';
    render();
    flushSyncQueue();
    setupGameAutoPause();
    window.addEventListener('ourspace:game-loaded', () => {
      if (state.isPlaying) { pause(); notify('Visual playback paused while a game is loaded.'); }
    });
    window.addEventListener('beforeunload', () => { writePlayback(); flushSyncQueue(); });
  }

  window.OurSpaceVisualPlayer = {
    init,
    play,
    pause,
    stop,
    next,
    previous,
    uploadFiles: handleFiles,
    getLibrary: () => JSON.parse(JSON.stringify(state.library)),
    flushSync: flushSyncQueue,
    backendUrl: BACKEND_URL
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
