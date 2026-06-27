/*
  OurSpace Journaling Module
  Local-first journal manager with folders/subfolders, categories/subcategories,
  drag-and-drop entry/file organizing, external links, imports, reading, saving,
  syncing, and downloads.
*/
(function () {
  'use strict';

  const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec';
  const MODULE_NAME = 'ourspace_journal';
  const STATE_VERSION = 2;

  function nowIso() { return new Date().toISOString(); }
  function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`; }
  function safeText(value) { return String(value == null ? '' : value); }
  function cleanName(value, fallback) {
    const cleaned = safeText(value).trim().replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ');
    return cleaned || fallback;
  }
  function slug(value) {
    return cleanName(value, 'journal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'journal';
  }
  function escapeHtml(value) {
    return safeText(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }
  function normalizeUrl(value) {
    const raw = safeText(value).trim();
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  }
  function paragraphsToHtml(text) {
    const parts = safeText(text).replace(/\r\n/g, '\n').split(/\n{2,}/g);
    return parts.map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('') || '<p></p>';
  }
  function downloadBlob(filename, mimeType, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function resolveProfile(options) {
    const explicit = options && options.profile;
    const fromBody = document.body && (document.body.dataset.profile || document.body.dataset.user || document.body.dataset.accountName);
    const fromWindow = window.OurSpaceAuth && (window.OurSpaceAuth.profile || window.OurSpaceAuth.userName || window.OurSpaceAuth.accountName);
    const fromLocal = localStorage.getItem('ourspaceCurrentProfile') || localStorage.getItem('OurSpace.currentProfile') || localStorage.getItem('currentUser');
    return cleanName(explicit || fromBody || fromWindow || fromLocal || 'shared', 'shared').slice(0, 80);
  }

  function defaultState(profile) {
    const ts = nowIso();
    return {
      version: STATE_VERSION,
      profile,
      folders: [{ id: 'folder_unfiled', name: 'Unfiled', parentId: '', system: true, createdAt: ts, updatedAt: ts }],
      categories: [],
      links: [],
      entries: [],
      lastSavedAt: ts,
      lastSyncedAt: '',
      clientId: localStorage.getItem('ourspaceJournalClientId') || uid('client')
    };
  }

  function normalizeState(raw, profile) {
    const base = defaultState(profile);
    const state = Object.assign(base, raw && typeof raw === 'object' ? raw : {});
    state.version = STATE_VERSION;
    state.profile = profile;
    state.folders = Array.isArray(state.folders) ? state.folders : base.folders;
    state.categories = Array.isArray(state.categories) ? state.categories : [];
    state.links = Array.isArray(state.links) ? state.links : [];
    state.entries = Array.isArray(state.entries) ? state.entries : [];
    if (!state.folders.some((folder) => folder.id === 'folder_unfiled')) state.folders.unshift(base.folders[0]);
    state.folders = state.folders.map((folder) => Object.assign({
      id: uid('folder'), name: 'Folder', parentId: '', system: false, createdAt: nowIso(), updatedAt: nowIso()
    }, folder, { parentId: folder.id === 'folder_unfiled' ? '' : (folder.parentId || '') }));
    state.categories = state.categories.map((category) => Object.assign({
      id: uid('category'), name: 'Category', parentId: '', createdAt: nowIso(), updatedAt: nowIso()
    }, category));
    const folderIds = new Set(state.folders.map((folder) => folder.id));
    const categoryIds = new Set(state.categories.map((category) => category.id));
    state.entries = state.entries.map((entry) => Object.assign({
      id: uid('entry'), title: 'Untitled entry', folderId: 'folder_unfiled', categoryIds: [], content: '', sourceType: 'manual', sourceName: '', createdAt: nowIso(), updatedAt: nowIso(), pinned: false
    }, entry)).map((entry) => Object.assign(entry, {
      folderId: folderIds.has(entry.folderId) ? entry.folderId : 'folder_unfiled',
      categoryIds: Array.isArray(entry.categoryIds) ? entry.categoryIds.filter((id) => categoryIds.has(id)) : []
    }));
    const targetIsValid = (link) => {
      if (link.targetKind === 'entry') return state.entries.some((entry) => entry.id === link.targetId);
      if (link.targetKind === 'category') return categoryIds.has(link.targetId);
      return folderIds.has(link.targetId);
    };
    state.links = state.links.map((link) => Object.assign({
      id: uid('link'), title: '', url: '', targetKind: 'folder', targetId: 'folder_unfiled', createdAt: nowIso()
    }, link)).filter((link) => link.url && targetIsValid(link));
    localStorage.setItem('ourspaceJournalClientId', state.clientId || base.clientId);
    return state;
  }

  class BackendAdapter {
    constructor(url, profile) {
      this.url = url || DEFAULT_BACKEND_URL;
      this.profile = profile;
      this.key = `journal:${profile}`;
    }
    async request(action, data) {
      if (!this.url) throw new Error('No backend URL configured.');
      const payload = { module: MODULE_NAME, action: `journal_${action}`, profile: this.profile, key: this.key, data, updatedAt: nowIso(), source: 'OurSpace Journaling Module' };
      const url = new URL(this.url);
      url.searchParams.set('module', MODULE_NAME);
      url.searchParams.set('action', `journal_${action}`);
      url.searchParams.set('profile', this.profile);
      url.searchParams.set('key', this.key);
      const response = await fetch(url.toString(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const text = await response.text();
      if (!response.ok) throw new Error(`Backend responded ${response.status}.`);
      if (!text) return { ok: true };
      try { return JSON.parse(text); } catch (_error) { return { ok: true, text }; }
    }
    extractState(response) {
      if (!response) return null;
      if (response.version && response.entries) return response;
      if (response.state) return response.state;
      if (response.journal) return response.journal;
      if (response.data && response.data.version && response.data.entries) return response.data;
      if (response.data && response.data.state) return response.data.state;
      if (response.result && response.result.state) return response.result.state;
      return null;
    }
    async save(state) { return this.request('save', state); }
    async load() { return this.extractState(await this.request('load', null)); }
  }

  class OurSpaceJournalModule {
    constructor(root, options) {
      this.root = typeof root === 'string' ? document.querySelector(root) : root;
      if (!this.root) throw new Error('Journal module root element was not found.');
      this.options = options || {};
      this.profile = resolveProfile(this.options);
      this.backend = new BackendAdapter(this.options.backendUrl || DEFAULT_BACKEND_URL, this.profile);
      this.localKey = `ourspace.journal.${this.profile}`;
      this.state = this.loadLocal();
      this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null;
      this.filters = { search: '', folderId: 'all', categoryId: 'all' };
      this.saveTimer = null;
      this.render();
      this.bind();
      this.refresh();
      this.status('Ready. Local saving is on. Drag entries or uploaded files into folders and categories.');
      if (this.options.autoLoadBackend !== false) this.loadBackend({ quiet: true });
    }

    loadLocal() {
      try { return normalizeState(JSON.parse(localStorage.getItem(this.localKey) || 'null'), this.profile); }
      catch (_error) { return defaultState(this.profile); }
    }
    saveLocal() { this.state.lastSavedAt = nowIso(); localStorage.setItem(this.localKey, JSON.stringify(this.state)); }
    scheduleBackendSave() { window.clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(() => this.saveBackend({ quiet: true }), 900); }
    status(message, tone) { if (this.refs && this.refs.status) { this.refs.status.textContent = message; this.refs.status.dataset.tone = tone || 'neutral'; } }

    render() {
      this.root.innerHTML = `
        <section class="os-journal" aria-label="Journaling module">
          <header class="os-journal__header">
            <div>
              <h2>Journal</h2>
              <p>Folders, subfolders, categories, subcategories, TXT/DOCX imports, drag-and-drop organizing, external links, reading, saving, syncing, and downloads.</p>
            </div>
            <div class="os-journal__header-actions">
              <button type="button" data-journal="newEntry">New entry</button>
              <button type="button" data-journal="saveBackend">Sync save</button>
              <button type="button" data-journal="loadBackend">Sync load</button>
              <button type="button" data-journal="exportJson">Download all</button>
              <label class="os-journal__file-button">Import JSON<input type="file" data-journal="importJson" accept="application/json,.json"></label>
            </div>
          </header>

          <div class="os-journal__status" data-journal="status" role="status" aria-live="polite"></div>

          <div class="os-journal__tools">
            <label>Folder name
              <span class="os-journal__inline-control"><input data-journal="folderName" placeholder="Example: Stardew Valley"><button type="button" data-journal="addFolder">Add folder</button><button type="button" data-journal="addSubfolder">Add subfolder</button></span>
            </label>
            <label>Category name
              <span class="os-journal__inline-control"><input data-journal="categoryName" placeholder="Example: Quests"><button type="button" data-journal="addCategory">Add category</button><button type="button" data-journal="addSubcategory">Add subcategory</button></span>
            </label>
            <label class="os-journal__upload">Upload TXT/DOCX files
              <input type="file" data-journal="uploadFiles" accept=".txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple>
            </label>
            <label class="os-journal__upload">Upload TXT/DOCX folder
              <input type="file" data-journal="uploadFolder" accept=".txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple webkitdirectory directory>
            </label>
          </div>

          <div class="os-journal__drop-zone" data-journal="dropZone" tabindex="0">
            Drop TXT/DOCX files here, or drag existing entries into folders/categories below.
          </div>

          <div class="os-journal__grid">
            <aside class="os-journal__sidebar" aria-label="Journal entries">
              <label>Search<input data-journal="search" type="search" placeholder="Search entries, links, notes"></label>
              <label>Folder filter<select data-journal="folderFilter"></select></label>
              <label>Category filter<select data-journal="categoryFilter"></select></label>

              <div class="os-journal__manager">
                <div class="os-journal__manager-head"><strong>Folders</strong><span>drop entries/files here</span></div>
                <div data-journal="folderManager" class="os-journal__tree"></div>
              </div>
              <div class="os-journal__manager">
                <div class="os-journal__manager-head"><strong>Categories</strong><span>drop entries here</span></div>
                <div data-journal="categoryManager" class="os-journal__tree"></div>
              </div>

              <div class="os-journal__manager">
                <div class="os-journal__manager-head"><strong>Website links</strong><span>open externally</span></div>
                <label>Attach link to<select data-journal="linkTarget"></select></label>
                <input data-journal="linkTitle" placeholder="Link title, like Game Wiki">
                <input data-journal="linkUrl" placeholder="https://example.com">
                <button type="button" data-journal="addLink">Add website link</button>
                <div data-journal="linkList" class="os-journal__links"></div>
              </div>

              <div class="os-journal__list" data-journal="entryList"></div>
            </aside>

            <main class="os-journal__workspace">
              <div class="os-journal__editor-card">
                <label>Entry name<input data-journal="title" placeholder="Entry name"></label>
                <div class="os-journal__meta-row">
                  <label>Folder<select data-journal="folderSelect"></select></label>
                  <div class="os-journal__category-box"><span>Categories</span><div data-journal="categoryChecks"></div></div>
                </div>
                <label>Write or edit<textarea data-journal="content" rows="14" placeholder="Write here, or upload a .txt/.docx file."></textarea></label>
                <div class="os-journal__editor-actions">
                  <button type="button" data-journal="saveEntry">Name & save</button>
                  <button type="button" data-journal="downloadTxt">Download entry</button>
                  <button type="button" data-journal="copyText">Copy text</button>
                  <button type="button" data-journal="deleteEntry" class="os-journal__danger">Delete entry</button>
                </div>
              </div>

              <article class="os-journal__reader" aria-label="Reader view">
                <div class="os-journal__reader-head">
                  <h3 data-journal="readerTitle">Reader</h3>
                  <span data-journal="readerMeta"></span>
                </div>
                <div data-journal="readerBody" class="os-journal__reader-body"></div>
              </article>
            </main>
          </div>
        </section>`;
      this.refs = {};
      this.root.querySelectorAll('[data-journal]').forEach((el) => { this.refs[el.dataset.journal] = el; });
    }

    bind() {
      const on = (name, type, handler) => this.refs[name] && this.refs[name].addEventListener(type, handler.bind(this));
      on('newEntry', 'click', this.newEntry);
      on('addFolder', 'click', function () { this.addFolder(''); });
      on('addSubfolder', 'click', function () { this.addFolder(this.activeFolderParentId()); });
      on('addCategory', 'click', function () { this.addCategory(''); });
      on('addSubcategory', 'click', function () { this.addCategory(this.activeCategoryParentId()); });
      on('uploadFiles', 'change', function (event) { this.uploadFiles(event); });
      on('uploadFolder', 'change', function (event) { this.uploadFiles(event, { preserveFolders: true }); });
      on('saveEntry', 'click', this.saveCurrentEntry);
      on('downloadTxt', 'click', this.downloadCurrentEntry);
      on('copyText', 'click', this.copyCurrentText);
      on('deleteEntry', 'click', this.deleteCurrentEntry);
      on('exportJson', 'click', this.exportJson);
      on('importJson', 'change', this.importJson);
      on('saveBackend', 'click', this.saveBackend);
      on('loadBackend', 'click', this.loadBackend);
      on('addLink', 'click', this.addLink);
      on('search', 'input', function () { this.filters.search = this.refs.search.value.trim().toLowerCase(); this.refreshEntryList(); this.refreshLinks(); });
      on('folderFilter', 'change', function () { this.filters.folderId = this.refs.folderFilter.value; this.refreshEntryList(); this.refreshLinks(); this.refreshManagers(); });
      on('categoryFilter', 'change', function () { this.filters.categoryId = this.refs.categoryFilter.value; this.refreshEntryList(); this.refreshLinks(); this.refreshManagers(); });
      on('entryList', 'click', function (event) { const button = event.target.closest('[data-entry-id]'); if (button) { this.selectedEntryId = button.dataset.entryId; this.refresh(); } });
      on('folderManager', 'click', this.onManagerClick);
      on('categoryManager', 'click', this.onManagerClick);
      on('linkList', 'click', this.onLinkListClick);
      this.root.addEventListener('dragstart', this.onDragStart.bind(this));
      this.root.addEventListener('dragover', this.onDragOver.bind(this));
      this.root.addEventListener('dragleave', this.onDragLeave.bind(this));
      this.root.addEventListener('drop', this.onDrop.bind(this));
      this.refs.dropZone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') this.refs.uploadFiles.click(); });
    }

    getEntry(id) { return this.state.entries.find((entry) => entry.id === id) || null; }
    currentEntry() { return this.getEntry(this.selectedEntryId); }
    getFolder(id) { return this.state.folders.find((folder) => folder.id === id) || null; }
    getCategory(id) { return this.state.categories.find((category) => category.id === id) || null; }
    getCollection(kind) { return kind === 'category' ? this.state.categories : this.state.folders; }
    activeFolderParentId() { return this.filters.folderId !== 'all' ? this.filters.folderId : (this.currentEntry()?.folderId || ''); }
    activeCategoryParentId() { return this.filters.categoryId !== 'all' ? this.filters.categoryId : ''; }

    itemDepth(kind, item) {
      const list = this.getCollection(kind);
      let depth = 0;
      let current = item;
      const seen = new Set();
      while (current && current.parentId && !seen.has(current.parentId)) {
        seen.add(current.parentId);
        current = list.find((candidate) => candidate.id === current.parentId);
        if (current) depth += 1;
      }
      return depth;
    }
    itemPath(kind, item) {
      const list = this.getCollection(kind);
      const chain = [];
      let current = item;
      const seen = new Set();
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        chain.unshift(current.name);
        current = current.parentId ? list.find((candidate) => candidate.id === current.parentId) : null;
      }
      return chain.join(' / ');
    }
    descendantIds(kind, id) {
      const list = this.getCollection(kind);
      const ids = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        list.forEach((item) => { if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); changed = true; } });
      }
      return ids;
    }
    sortedTree(kind) {
      const list = this.getCollection(kind).slice();
      return list.sort((a, b) => this.itemPath(kind, a).localeCompare(this.itemPath(kind, b)));
    }
    touch() {
      this.saveLocal();
      this.refresh();
      this.scheduleBackendSave();
      this.root.dispatchEvent(new CustomEvent('ourspace-journal-state-changed', { detail: { instance: this } }));
      document.dispatchEvent(new CustomEvent('ourspace-journal-state-changed', { detail: { instance: this } }));
    }

    addFolder(parentId) {
      const name = cleanName(this.refs.folderName.value, 'New folder');
      const parent = parentId && parentId !== 'all' ? parentId : '';
      if (this.state.folders.some((folder) => (folder.parentId || '') === parent && folder.name.toLowerCase() === name.toLowerCase())) return this.status('That folder already exists there.', 'warn');
      const ts = nowIso();
      this.state.folders.push({ id: uid('folder'), name, parentId: parent, createdAt: ts, updatedAt: ts });
      this.refs.folderName.value = '';
      this.touch();
      this.status(parent ? `Subfolder created: ${name}` : `Folder created: ${name}`);
    }
    addCategory(parentId) {
      const name = cleanName(this.refs.categoryName.value, 'New category');
      const parent = parentId && parentId !== 'all' ? parentId : '';
      if (this.state.categories.some((category) => (category.parentId || '') === parent && category.name.toLowerCase() === name.toLowerCase())) return this.status('That category already exists there.', 'warn');
      const ts = nowIso();
      this.state.categories.push({ id: uid('category'), name, parentId: parent, createdAt: ts, updatedAt: ts });
      this.refs.categoryName.value = '';
      this.touch();
      this.status(parent ? `Subcategory created: ${name}` : `Category created: ${name}`);
    }

    renameFolder(id) {
      const folder = this.getFolder(id);
      if (!folder || folder.system) return;
      const name = window.prompt('Rename folder:', folder.name);
      if (!name) return;
      folder.name = cleanName(name, folder.name); folder.updatedAt = nowIso();
      this.touch(); this.status('Folder renamed.');
    }
    deleteFolder(id) {
      const folder = this.getFolder(id);
      if (!folder || folder.system) return;
      const children = this.state.folders.filter((item) => item.parentId === id);
      const entries = this.state.entries.filter((entry) => entry.folderId === id);
      if (!window.confirm(`Delete folder "${folder.name}"? ${entries.length} entry/entries move to its parent/Unfiled, and ${children.length} subfolder(s) move up one level.`)) return;
      const fallback = folder.parentId || 'folder_unfiled';
      this.state.entries.forEach((entry) => { if (entry.folderId === id) entry.folderId = fallback; });
      children.forEach((child) => { child.parentId = folder.parentId || ''; });
      this.state.links = this.state.links.filter((link) => !(link.targetKind === 'folder' && link.targetId === id));
      this.state.folders = this.state.folders.filter((item) => item.id !== id);
      if (this.filters.folderId === id) this.filters.folderId = 'all';
      this.touch(); this.status('Folder deleted.', 'warn');
    }
    renameCategory(id) {
      const category = this.getCategory(id);
      if (!category) return;
      const name = window.prompt('Rename category:', category.name);
      if (!name) return;
      category.name = cleanName(name, category.name); category.updatedAt = nowIso();
      this.touch(); this.status('Category renamed.');
    }
    deleteCategory(id) {
      const category = this.getCategory(id);
      if (!category) return;
      const children = this.state.categories.filter((item) => item.parentId === id);
      if (!window.confirm(`Delete category "${category.name}"? Entries keep their text and lose this tag. ${children.length} subcategory(s) move up one level.`)) return;
      this.state.entries.forEach((entry) => { entry.categoryIds = entry.categoryIds.filter((catId) => catId !== id); });
      children.forEach((child) => { child.parentId = category.parentId || ''; });
      this.state.links = this.state.links.filter((link) => !(link.targetKind === 'category' && link.targetId === id));
      this.state.categories = this.state.categories.filter((item) => item.id !== id);
      if (this.filters.categoryId === id) this.filters.categoryId = 'all';
      this.touch(); this.status('Category deleted.', 'warn');
    }

    newEntry() {
      const ts = nowIso();
      const entry = { id: uid('entry'), title: 'Untitled entry', folderId: this.filters.folderId !== 'all' ? this.filters.folderId : 'folder_unfiled', categoryIds: this.filters.categoryId !== 'all' ? [this.filters.categoryId] : [], content: '', sourceType: 'manual', sourceName: '', createdAt: ts, updatedAt: ts, pinned: false };
      this.state.entries.unshift(entry);
      this.selectedEntryId = entry.id;
      this.touch();
      this.status('New entry ready.');
      this.refs.title.focus();
    }
    createEntryFromText(options) {
      const data = options || {};
      const ts = nowIso();
      const entry = { id: uid('entry'), title: cleanName(data.title, 'Untitled entry'), folderId: data.folderId || 'folder_unfiled', categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [], content: safeText(data.content || data.text || ''), sourceType: data.sourceType || 'manual', sourceName: data.sourceName || '', createdAt: ts, updatedAt: ts, pinned: false };
      this.state.entries.unshift(entry);
      this.selectedEntryId = entry.id;
      this.touch();
      return entry;
    }
    insertAccessibilityText(options) {
      const data = options || {};
      const mode = data.mode || 'new';
      const text = safeText(data.text || data.content || '');
      if (mode === 'new' || !this.currentEntry()) {
        const entry = this.createEntryFromText({ title: data.title || 'Scanned page', content: text, sourceType: 'ocr', sourceName: data.sourceName || 'accessibility scan' });
        this.status(`Created OCR entry: ${entry.title}`, 'good');
        return entry;
      }
      const entry = this.currentEntry();
      if (mode === 'replace') entry.content = text;
      else entry.content = `${entry.content || ''}${entry.content ? '\n\n' : ''}${text}`;
      entry.sourceName = entry.sourceName || data.sourceName || '';
      entry.updatedAt = nowIso();
      this.touch();
      this.status(mode === 'replace' ? 'Replaced current entry with scanned text.' : 'Appended scanned text to current entry.', 'good');
      return entry;
    }

    async uploadFiles(event, options) {
      await this.importFileList(Array.from(event.target.files || []), options || {});
      event.target.value = '';
    }
    async importFileList(files, options) {
      if (!files.length) return;
      let imported = 0;
      for (const file of files) {
        try {
          const lower = file.name.toLowerCase();
          let content = '';
          let sourceType = 'txt';
          if (lower.endsWith('.txt')) { content = await file.text(); sourceType = 'txt'; }
          else if (lower.endsWith('.docx')) {
            if (!window.OurSpaceDocxLite || !window.OurSpaceDocxLite.extractText) throw new Error('DOCX reader is not loaded.');
            content = await window.OurSpaceDocxLite.extractText(file); sourceType = 'docx';
          } else { continue; }
          const folderId = options.folderId || (options.preserveFolders ? this.ensureFolderPathFromRelative(file.webkitRelativePath) : (this.filters.folderId !== 'all' ? this.filters.folderId : 'folder_unfiled'));
          const categoryIds = options.categoryId ? [options.categoryId] : (this.filters.categoryId !== 'all' ? [this.filters.categoryId] : []);
          const ts = nowIso();
          const entry = { id: uid('entry'), title: cleanName(file.name.replace(/\.[^.]+$/, ''), 'Uploaded entry'), folderId, categoryIds, content, sourceType, sourceName: file.webkitRelativePath || file.name, createdAt: ts, updatedAt: ts, pinned: false };
          this.state.entries.unshift(entry);
          this.selectedEntryId = entry.id;
          imported += 1;
        } catch (error) { this.status(`${file.name}: ${error.message}`, 'warn'); }
      }
      if (imported) { this.touch(); this.status(`Imported ${imported} file${imported === 1 ? '' : 's'}.`); }
    }
    ensureFolderPathFromRelative(relativePath) {
      const parts = safeText(relativePath).split('/').filter(Boolean).slice(0, -1);
      if (!parts.length) return this.filters.folderId !== 'all' ? this.filters.folderId : 'folder_unfiled';
      let parentId = '';
      let folder = null;
      for (const part of parts) {
        folder = this.state.folders.find((item) => (item.parentId || '') === parentId && item.name.toLowerCase() === part.toLowerCase());
        if (!folder) {
          const ts = nowIso();
          folder = { id: uid('folder'), name: cleanName(part, 'Folder'), parentId, createdAt: ts, updatedAt: ts };
          this.state.folders.push(folder);
        }
        parentId = folder.id;
      }
      return folder ? folder.id : 'folder_unfiled';
    }

    saveCurrentEntry() {
      let entry = this.currentEntry();
      if (!entry) { this.newEntry(); entry = this.currentEntry(); }
      entry.title = cleanName(this.refs.title.value, 'Untitled entry');
      entry.folderId = this.refs.folderSelect.value || 'folder_unfiled';
      entry.categoryIds = Array.from(this.root.querySelectorAll('[data-category-check]:checked')).map((input) => input.value);
      entry.content = this.refs.content.value;
      entry.updatedAt = nowIso();
      this.touch(); this.status(`Saved: ${entry.title}`);
    }
    deleteCurrentEntry() {
      const entry = this.currentEntry();
      if (!entry) return;
      if (!window.confirm(`Delete "${entry.title}"? This removes the local saved entry.`)) return;
      this.state.entries = this.state.entries.filter((item) => item.id !== entry.id);
      this.state.links = this.state.links.filter((link) => !(link.targetKind === 'entry' && link.targetId === entry.id));
      this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null;
      this.touch(); this.status('Entry deleted.', 'warn');
    }
    downloadCurrentEntry() {
      const entry = this.currentEntry();
      if (!entry) return;
      const folder = this.getFolder(entry.folderId);
      const cats = this.state.categories.filter((cat) => entry.categoryIds.includes(cat.id)).map((cat) => this.itemPath('category', cat)).join(', ');
      const links = this.linksForEntryBundle(entry).map((link) => `${link.title || link.url}: ${link.url}`).join('\n');
      const header = [`Title: ${entry.title}`, `Folder: ${folder ? this.itemPath('folder', folder) : 'Unfiled'}`, `Categories: ${cats}`, `Created: ${entry.createdAt}`, `Updated: ${entry.updatedAt}`, entry.sourceName ? `Imported from: ${entry.sourceName}` : '', links ? `Links:\n${links}` : ''].filter(Boolean).join('\n');
      downloadBlob(`${slug(entry.title)}.txt`, 'text/plain;charset=utf-8', `${header}\n\n${entry.content || ''}`);
      this.status('Entry downloaded.');
    }
    async copyCurrentText() {
      const entry = this.currentEntry();
      if (!entry) return;
      try { await navigator.clipboard.writeText(entry.content || ''); this.status('Entry text copied.'); }
      catch (_error) { this.refs.content.focus(); this.refs.content.select(); this.status('Text selected; copy from the editor.', 'warn'); }
    }
    exportJson() { downloadBlob(`ourspace-journal-${slug(this.profile)}.json`, 'application/json;charset=utf-8', JSON.stringify(Object.assign({}, this.state, { exportedAt: nowIso() }), null, 2)); this.status('Journal JSON downloaded.'); }
    async importJson(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try { this.state = normalizeState(JSON.parse(await file.text()), this.profile); this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null; this.touch(); this.status('Journal JSON imported.'); }
      catch (error) { this.status(`Import failed: ${error.message}`, 'warn'); }
      finally { event.target.value = ''; }
    }
    async saveBackend(eventOrOptions) {
      const quiet = eventOrOptions && eventOrOptions.quiet;
      try { await this.backend.save(this.state); this.state.lastSyncedAt = nowIso(); this.saveLocal(); if (!quiet) this.status('Backend sync save complete.'); }
      catch (error) { if (!quiet) this.status(`Backend save unavailable; local copy is safe. ${error.message}`, 'warn'); }
    }
    async loadBackend(eventOrOptions) {
      const quiet = eventOrOptions && eventOrOptions.quiet;
      try {
        const remote = await this.backend.load();
        if (remote && Array.isArray(remote.entries)) {
          const remoteState = normalizeState(remote, this.profile);
          const localUpdated = Date.parse(this.state.lastSavedAt || 0) || 0;
          const remoteUpdated = Date.parse(remoteState.lastSavedAt || remoteState.updatedAt || 0) || 0;
          if (remoteUpdated >= localUpdated || !this.state.entries.length) { this.state = remoteState; this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null; this.saveLocal(); this.refresh(); if (!quiet) this.status('Backend sync load complete.'); }
          else if (!quiet) this.status('Local copy is newer than backend copy; not overwritten.', 'warn');
        } else if (!quiet) this.status('Backend returned no journal data yet.');
      } catch (error) { if (!quiet) this.status(`Backend load unavailable; local copy is open. ${error.message}`, 'warn'); }
    }

    filteredEntries() {
      const search = this.filters.search;
      const folderSet = this.filters.folderId !== 'all' ? this.descendantIds('folder', this.filters.folderId) : null;
      const categorySet = this.filters.categoryId !== 'all' ? this.descendantIds('category', this.filters.categoryId) : null;
      return this.state.entries.filter((entry) => {
        if (folderSet && !folderSet.has(entry.folderId)) return false;
        if (categorySet && !entry.categoryIds.some((id) => categorySet.has(id))) return false;
        if (search) {
          const entryLinks = this.linksForEntryBundle(entry).map((link) => `${link.title} ${link.url}`).join('\n');
          const haystack = `${entry.title}\n${entry.content}\n${entry.sourceName}\n${entryLinks}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      }).sort((a, b) => safeText(b.updatedAt).localeCompare(safeText(a.updatedAt)));
    }
    refresh() { this.refreshSelects(); this.refreshManagers(); this.refreshEntryList(); this.refreshLinks(); this.refreshEditor(); this.refreshReader(); }
    refreshSelects() {
      const folderOptions = this.sortedTree('folder').map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(this.itemPath('folder', folder))}</option>`).join('');
      this.refs.folderSelect.innerHTML = folderOptions;
      this.refs.folderFilter.innerHTML = `<option value="all">All folders</option>${folderOptions}`;
      this.refs.folderFilter.value = this.filters.folderId;
      const categoryOptions = this.sortedTree('category').map((cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(this.itemPath('category', cat))}</option>`).join('');
      this.refs.categoryFilter.innerHTML = `<option value="all">All categories</option>${categoryOptions}`;
      this.refs.categoryFilter.value = this.filters.categoryId;
      this.refs.categoryChecks.innerHTML = this.state.categories.length ? this.sortedTree('category').map((cat) => `<label class="os-journal__chip" style="margin-left:${Math.min(this.itemDepth('category', cat), 5) * 10}px"><input type="checkbox" data-category-check value="${escapeHtml(cat.id)}">${escapeHtml(this.itemPath('category', cat))}</label>`).join('') : '<span class="os-journal__empty-note">No categories yet.</span>';
      const targets = [];
      if (this.currentEntry()) targets.push(`<option value="entry:${escapeHtml(this.currentEntry().id)}">Current entry: ${escapeHtml(this.currentEntry().title)}</option>`);
      if (this.filters.folderId !== 'all') targets.push(`<option value="folder:${escapeHtml(this.filters.folderId)}">Current folder filter</option>`);
      if (this.filters.categoryId !== 'all') targets.push(`<option value="category:${escapeHtml(this.filters.categoryId)}">Current category filter</option>`);
      targets.push(`<option value="folder:folder_unfiled">Unfiled/general journal links</option>`);
      this.refs.linkTarget.innerHTML = targets.join('');
    }
    refreshManagers() {
      this.refs.folderManager.innerHTML = this.sortedTree('folder').map((folder) => {
        const count = this.state.entries.filter((entry) => this.descendantIds('folder', folder.id).has(entry.folderId)).length;
        return `<div class="os-journal__tree-row os-journal__drop-target ${this.filters.folderId === folder.id ? 'is-current' : ''}" data-drop-kind="folder" data-id="${escapeHtml(folder.id)}" style="margin-left:${Math.min(this.itemDepth('folder', folder), 5) * 10}px">
          <button type="button" data-manager="select-folder" data-id="${escapeHtml(folder.id)}">${folder.id === 'folder_unfiled' ? '' : '↳ '}${escapeHtml(folder.name)} <span>${count}</span></button>
          <button type="button" data-manager="rename-folder" data-id="${escapeHtml(folder.id)}" ${folder.system ? 'disabled' : ''}>Rename</button>
          <button type="button" data-manager="delete-folder" data-id="${escapeHtml(folder.id)}" class="os-journal__danger" ${folder.system ? 'disabled' : ''}>Delete</button>
        </div>`;
      }).join('');
      this.refs.categoryManager.innerHTML = this.sortedTree('category').map((category) => {
        const ids = this.descendantIds('category', category.id);
        const count = this.state.entries.filter((entry) => entry.categoryIds.some((id) => ids.has(id))).length;
        return `<div class="os-journal__tree-row os-journal__drop-target ${this.filters.categoryId === category.id ? 'is-current' : ''}" data-drop-kind="category" data-id="${escapeHtml(category.id)}" style="margin-left:${Math.min(this.itemDepth('category', category), 5) * 10}px">
          <button type="button" data-manager="select-category" data-id="${escapeHtml(category.id)}">↳ ${escapeHtml(category.name)} <span>${count}</span></button>
          <button type="button" data-manager="rename-category" data-id="${escapeHtml(category.id)}">Rename</button>
          <button type="button" data-manager="delete-category" data-id="${escapeHtml(category.id)}" class="os-journal__danger">Delete</button>
        </div>`;
      }).join('') || '<div class="os-journal__empty">No categories yet.</div>';
    }
    refreshEntryList() {
      const entries = this.filteredEntries();
      if (!entries.length) { this.refs.entryList.innerHTML = '<div class="os-journal__empty">No entries match this view.</div>'; return; }
      this.refs.entryList.innerHTML = entries.map((entry) => {
        const folder = this.getFolder(entry.folderId);
        const date = entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '';
        const selected = entry.id === this.selectedEntryId ? ' aria-current="true"' : '';
        return `<button type="button" draggable="true" data-entry-id="${escapeHtml(entry.id)}"${selected}>
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(folder ? this.itemPath('folder', folder) : 'Unfiled')} • ${escapeHtml(date)}</span>
        </button>`;
      }).join('');
    }
    refreshLinks() {
      const links = this.visibleLinks();
      this.refs.linkList.innerHTML = links.length ? links.map((link) => `<div class="os-journal__link-item"><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title || link.url)} ↗</a><button type="button" data-delete-link="${escapeHtml(link.id)}" class="os-journal__danger">Delete</button></div>`).join('') : '<div class="os-journal__empty-note">No links for the current entry/filter yet.</div>';
    }
    refreshEditor() {
      const entry = this.currentEntry();
      if (!entry) { this.refs.title.value = ''; this.refs.content.value = ''; this.refs.folderSelect.value = 'folder_unfiled'; Array.from(this.root.querySelectorAll('[data-category-check]')).forEach((input) => { input.checked = false; }); return; }
      this.refs.title.value = entry.title || '';
      this.refs.content.value = entry.content || '';
      this.refs.folderSelect.value = entry.folderId || 'folder_unfiled';
      Array.from(this.root.querySelectorAll('[data-category-check]')).forEach((input) => { input.checked = entry.categoryIds.includes(input.value); });
    }
    refreshReader() {
      const entry = this.currentEntry();
      if (!entry) { this.refs.readerTitle.textContent = 'Reader'; this.refs.readerMeta.textContent = ''; this.refs.readerBody.innerHTML = '<p>Choose or create an entry.</p>'; return; }
      const folder = this.getFolder(entry.folderId);
      const cats = this.state.categories.filter((cat) => entry.categoryIds.includes(cat.id)).map((cat) => this.itemPath('category', cat)).join(', ');
      const links = this.linksForEntryBundle(entry);
      this.refs.readerTitle.textContent = entry.title || 'Untitled entry';
      this.refs.readerMeta.textContent = [folder ? this.itemPath('folder', folder) : 'Unfiled', cats, entry.sourceName ? `imported: ${entry.sourceName}` : ''].filter(Boolean).join(' • ');
      this.refs.readerBody.innerHTML = `${links.length ? `<div class="os-journal__reader-links"><strong>Links</strong>${links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title || link.url)} ↗</a>`).join('')}</div>` : ''}${paragraphsToHtml(entry.content || '')}`;
    }

    visibleLinks() {
      const entry = this.currentEntry();
      const visible = [];
      const add = (kind, id) => this.state.links.filter((link) => link.targetKind === kind && link.targetId === id).forEach((link) => { if (!visible.some((item) => item.id === link.id)) visible.push(link); });
      if (entry) { add('entry', entry.id); add('folder', entry.folderId); entry.categoryIds.forEach((id) => add('category', id)); }
      if (this.filters.folderId !== 'all') add('folder', this.filters.folderId);
      if (this.filters.categoryId !== 'all') add('category', this.filters.categoryId);
      if (!visible.length) add('folder', 'folder_unfiled');
      return visible;
    }
    linksForEntryBundle(entry) {
      const out = [];
      const add = (kind, id) => this.state.links.filter((link) => link.targetKind === kind && link.targetId === id).forEach((link) => { if (!out.some((item) => item.id === link.id)) out.push(link); });
      if (entry) { add('entry', entry.id); add('folder', entry.folderId); entry.categoryIds.forEach((id) => add('category', id)); }
      return out;
    }
    addLink() {
      const target = safeText(this.refs.linkTarget.value || 'folder:folder_unfiled').split(':');
      const targetKind = target[0] || 'folder';
      const targetId = target.slice(1).join(':') || 'folder_unfiled';
      const url = normalizeUrl(this.refs.linkUrl.value);
      if (!url) return this.status('Paste a website link first.', 'warn');
      const title = cleanName(this.refs.linkTitle.value || url, url);
      this.state.links.push({ id: uid('link'), title, url, targetKind, targetId, createdAt: nowIso() });
      this.refs.linkTitle.value = ''; this.refs.linkUrl.value = '';
      this.touch(); this.status('Website link saved.');
    }
    onLinkListClick(event) {
      const button = event.target.closest('[data-delete-link]');
      if (!button) return;
      this.state.links = this.state.links.filter((link) => link.id !== button.dataset.deleteLink);
      this.touch(); this.status('Website link deleted.', 'warn');
    }
    onManagerClick(event) {
      const button = event.target.closest('[data-manager]');
      if (!button) return;
      const id = button.dataset.id;
      if (button.dataset.manager === 'select-folder') { this.filters.folderId = id; this.refs.folderFilter.value = id; this.refresh(); }
      if (button.dataset.manager === 'rename-folder') this.renameFolder(id);
      if (button.dataset.manager === 'delete-folder') this.deleteFolder(id);
      if (button.dataset.manager === 'select-category') { this.filters.categoryId = id; this.refs.categoryFilter.value = id; this.refresh(); }
      if (button.dataset.manager === 'rename-category') this.renameCategory(id);
      if (button.dataset.manager === 'delete-category') this.deleteCategory(id);
    }
    onDragStart(event) {
      const button = event.target.closest('[data-entry-id]');
      if (!button || !event.dataTransfer) return;
      event.dataTransfer.setData('text/plain', button.dataset.entryId);
      event.dataTransfer.setData('application/x-ourspace-entry-id', button.dataset.entryId);
      event.dataTransfer.effectAllowed = 'copyMove';
    }
    onDragOver(event) {
      const target = event.target.closest('.os-journal__drop-target, .os-journal__drop-zone');
      if (!target) return;
      event.preventDefault();
      target.classList.add('is-drag');
      event.dataTransfer.dropEffect = event.dataTransfer?.files?.length ? 'copy' : 'move';
    }
    onDragLeave(event) { const target = event.target.closest('.os-journal__drop-target, .os-journal__drop-zone'); if (target) target.classList.remove('is-drag'); }
    async onDrop(event) {
      const target = event.target.closest('.os-journal__drop-target, .os-journal__drop-zone');
      if (!target) return;
      event.preventDefault();
      target.classList.remove('is-drag');
      const files = Array.from(event.dataTransfer?.files || []);
      const kind = target.dataset.dropKind;
      const id = target.dataset.id;
      if (files.length) { await this.importFileList(files, { folderId: kind === 'folder' ? id : undefined, categoryId: kind === 'category' ? id : undefined, preserveFolders: !kind }); return; }
      const entryId = event.dataTransfer?.getData('application/x-ourspace-entry-id') || event.dataTransfer?.getData('text/plain');
      const entry = this.getEntry(entryId);
      if (!entry) return;
      if (kind === 'folder') { entry.folderId = id; entry.updatedAt = nowIso(); this.touch(); this.status('Entry moved to folder.'); }
      if (kind === 'category') { if (!entry.categoryIds.includes(id)) entry.categoryIds.push(id); entry.updatedAt = nowIso(); this.touch(); this.status('Category added to entry.'); }
    }
  }

  function mount(root, options) {
    const instance = new OurSpaceJournalModule(root, options || {});
    instance.root.__ourspaceJournalInstance = instance;
    window.OurSpaceJournalInstances = window.OurSpaceJournalInstances || [];
    if (!window.OurSpaceJournalInstances.includes(instance)) window.OurSpaceJournalInstances.push(instance);
    instance.root.dispatchEvent(new CustomEvent('ourspace-journal-mounted', { detail: { instance } }));
    document.dispatchEvent(new CustomEvent('ourspace-journal-mounted-global', { detail: { instance } }));
    return instance;
  }

  window.OurSpaceJournal = { mount, BackendAdapter, DEFAULT_BACKEND_URL, OurSpaceJournalModule };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ourspace-journal-auto]').forEach((el) => {
      if (!el.__ourspaceJournalMounted) {
        el.__ourspaceJournalMounted = true;
        mount(el, { profile: el.dataset.profile, backendUrl: el.dataset.backendUrl || DEFAULT_BACKEND_URL, autoLoadBackend: el.dataset.autoLoadBackend !== 'false' });
      }
    });
  });
}());
