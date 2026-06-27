/*
  OurSpace Journaling Module
  Standalone, embeddable, dependency-free journal manager for folders, categories, TXT/DOCX imports, reading, saving, syncing, and downloads.
*/
(function () {
  'use strict';

  const DEFAULT_BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec';
  const MODULE_NAME = 'ourspace_journal';
  const STATE_VERSION = 1;

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
  function escapeHtml(value) {
    return safeText(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }
  function paragraphsToHtml(text) {
    const parts = safeText(text).replace(/\r\n/g, '\n').split(/\n{2,}/g);
    return parts.map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('') || '<p></p>';
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
      folders: [{ id: 'folder_unfiled', name: 'Unfiled', createdAt: ts, updatedAt: ts }],
      categories: [],
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
    state.entries = Array.isArray(state.entries) ? state.entries : [];
    if (!state.folders.some((folder) => folder.id === 'folder_unfiled')) {
      state.folders.unshift(base.folders[0]);
    }
    state.entries = state.entries.map((entry) => Object.assign({
      id: uid('entry'), title: 'Untitled entry', folderId: 'folder_unfiled', categoryIds: [], content: '', sourceType: 'manual', sourceName: '', createdAt: nowIso(), updatedAt: nowIso(), pinned: false
    }, entry));
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
      const payload = {
        module: MODULE_NAME,
        action: `journal_${action}`,
        profile: this.profile,
        key: this.key,
        data,
        updatedAt: nowIso(),
        source: 'OurSpace Journaling Module'
      };
      const url = new URL(this.url);
      url.searchParams.set('module', MODULE_NAME);
      url.searchParams.set('action', `journal_${action}`);
      url.searchParams.set('profile', this.profile);
      url.searchParams.set('key', this.key);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Backend responded ${response.status}.`);
      if (!text) return { ok: true };
      try { return JSON.parse(text); }
      catch (_error) { return { ok: true, text }; }
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

    async save(state) {
      return this.request('save', state);
    }

    async load() {
      const response = await this.request('load', null);
      return this.extractState(response);
    }
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
      this.status('Ready. Local saving is on.');
      if (this.options.autoLoadBackend !== false) this.loadBackend({ quiet: true });
    }

    loadLocal() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.localKey) || 'null');
        return normalizeState(raw, this.profile);
      } catch (_error) {
        return defaultState(this.profile);
      }
    }

    saveLocal() {
      this.state.lastSavedAt = nowIso();
      localStorage.setItem(this.localKey, JSON.stringify(this.state));
    }

    scheduleBackendSave() {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = window.setTimeout(() => this.saveBackend({ quiet: true }), 900);
    }

    status(message, tone) {
      if (!this.refs || !this.refs.status) return;
      this.refs.status.textContent = message;
      this.refs.status.dataset.tone = tone || 'neutral';
    }

    render() {
      this.root.innerHTML = `
        <section class="os-journal" aria-label="Journaling module">
          <header class="os-journal__header">
            <div>
              <h2>Journal</h2>
              <p>Folders, categories, TXT/DOCX imports, reading, saving, syncing, and downloads.</p>
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
            <label>New folder
              <span class="os-journal__inline-control"><input data-journal="folderName" placeholder="Folder name"><button type="button" data-journal="addFolder">Add</button></span>
            </label>
            <label>New category
              <span class="os-journal__inline-control"><input data-journal="categoryName" placeholder="Category name"><button type="button" data-journal="addCategory">Add</button></span>
            </label>
            <label class="os-journal__upload">Upload TXT or DOCX
              <input type="file" data-journal="uploadFiles" accept=".txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple>
            </label>
          </div>

          <div class="os-journal__grid">
            <aside class="os-journal__sidebar" aria-label="Journal entries">
              <label>Search<input data-journal="search" type="search" placeholder="Search entries"></label>
              <label>Folder filter<select data-journal="folderFilter"></select></label>
              <label>Category filter<select data-journal="categoryFilter"></select></label>
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
      on('addFolder', 'click', this.addFolder);
      on('addCategory', 'click', this.addCategory);
      on('uploadFiles', 'change', this.uploadFiles);
      on('saveEntry', 'click', this.saveCurrentEntry);
      on('downloadTxt', 'click', this.downloadCurrentEntry);
      on('copyText', 'click', this.copyCurrentText);
      on('deleteEntry', 'click', this.deleteCurrentEntry);
      on('exportJson', 'click', this.exportJson);
      on('importJson', 'change', this.importJson);
      on('saveBackend', 'click', this.saveBackend);
      on('loadBackend', 'click', this.loadBackend);
      on('search', 'input', function () { this.filters.search = this.refs.search.value.trim().toLowerCase(); this.refreshEntryList(); });
      on('folderFilter', 'change', function () { this.filters.folderId = this.refs.folderFilter.value; this.refreshEntryList(); });
      on('categoryFilter', 'change', function () { this.filters.categoryId = this.refs.categoryFilter.value; this.refreshEntryList(); });
      on('entryList', 'click', function (event) {
        const button = event.target.closest('[data-entry-id]');
        if (!button) return;
        this.selectedEntryId = button.dataset.entryId;
        this.refresh();
      });
    }

    getEntry(id) {
      return this.state.entries.find((entry) => entry.id === id) || null;
    }

    currentEntry() {
      return this.getEntry(this.selectedEntryId);
    }

    touch() {
      this.saveLocal();
      this.refresh();
      this.scheduleBackendSave();
    }

    addFolder() {
      const name = cleanName(this.refs.folderName.value, 'New folder');
      if (this.state.folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
        this.status('That folder already exists.', 'warn');
        return;
      }
      const ts = nowIso();
      this.state.folders.push({ id: uid('folder'), name, createdAt: ts, updatedAt: ts });
      this.refs.folderName.value = '';
      this.touch();
      this.status(`Folder created: ${name}`);
    }

    addCategory() {
      const name = cleanName(this.refs.categoryName.value, 'New category');
      if (this.state.categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
        this.status('That category already exists.', 'warn');
        return;
      }
      const ts = nowIso();
      this.state.categories.push({ id: uid('category'), name, createdAt: ts, updatedAt: ts });
      this.refs.categoryName.value = '';
      this.touch();
      this.status(`Category created: ${name}`);
    }

    newEntry() {
      const ts = nowIso();
      const entry = {
        id: uid('entry'),
        title: 'Untitled entry',
        folderId: 'folder_unfiled',
        categoryIds: [],
        content: '',
        sourceType: 'manual',
        sourceName: '',
        createdAt: ts,
        updatedAt: ts,
        pinned: false
      };
      this.state.entries.unshift(entry);
      this.selectedEntryId = entry.id;
      this.touch();
      this.status('New entry ready.');
      this.refs.title.focus();
    }

    async uploadFiles(event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      let imported = 0;
      for (const file of files) {
        try {
          const lower = file.name.toLowerCase();
          let content = '';
          let sourceType = 'txt';
          if (lower.endsWith('.txt')) {
            content = await file.text();
            sourceType = 'txt';
          } else if (lower.endsWith('.docx')) {
            if (!window.OurSpaceDocxLite || !window.OurSpaceDocxLite.extractText) throw new Error('DOCX reader is not loaded.');
            content = await window.OurSpaceDocxLite.extractText(file);
            sourceType = 'docx';
          } else {
            throw new Error('Only TXT and DOCX uploads are supported.');
          }
          const ts = nowIso();
          const entry = {
            id: uid('entry'),
            title: cleanName(file.name.replace(/\.[^.]+$/, ''), 'Uploaded entry'),
            folderId: this.refs.folderFilter && this.refs.folderFilter.value !== 'all' ? this.refs.folderFilter.value : 'folder_unfiled',
            categoryIds: [],
            content,
            sourceType,
            sourceName: file.name,
            createdAt: ts,
            updatedAt: ts,
            pinned: false
          };
          this.state.entries.unshift(entry);
          this.selectedEntryId = entry.id;
          imported += 1;
        } catch (error) {
          this.status(`${file.name}: ${error.message}`, 'warn');
        }
      }
      event.target.value = '';
      if (imported) {
        this.touch();
        this.status(`Imported ${imported} file${imported === 1 ? '' : 's'}.`);
      }
    }

    saveCurrentEntry() {
      let entry = this.currentEntry();
      if (!entry) {
        this.newEntry();
        entry = this.currentEntry();
      }
      entry.title = cleanName(this.refs.title.value, 'Untitled entry');
      entry.folderId = this.refs.folderSelect.value || 'folder_unfiled';
      entry.categoryIds = Array.from(this.root.querySelectorAll('[data-category-check]:checked')).map((input) => input.value);
      entry.content = this.refs.content.value;
      entry.updatedAt = nowIso();
      this.touch();
      this.status(`Saved: ${entry.title}`);
    }

    deleteCurrentEntry() {
      const entry = this.currentEntry();
      if (!entry) return;
      const confirmed = window.confirm(`Delete "${entry.title}"? This removes the local saved entry.`);
      if (!confirmed) return;
      this.state.entries = this.state.entries.filter((item) => item.id !== entry.id);
      this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null;
      this.touch();
      this.status('Entry deleted.', 'warn');
    }

    downloadCurrentEntry() {
      const entry = this.currentEntry();
      if (!entry) return;
      const folder = this.state.folders.find((item) => item.id === entry.folderId);
      const cats = this.state.categories.filter((cat) => entry.categoryIds.includes(cat.id)).map((cat) => cat.name).join(', ');
      const header = [
        `Title: ${entry.title}`,
        `Folder: ${folder ? folder.name : 'Unfiled'}`,
        `Categories: ${cats}`,
        `Created: ${entry.createdAt}`,
        `Updated: ${entry.updatedAt}`,
        entry.sourceName ? `Imported from: ${entry.sourceName}` : ''
      ].filter(Boolean).join('\n');
      downloadBlob(`${slug(entry.title)}.txt`, 'text/plain;charset=utf-8', `${header}\n\n${entry.content || ''}`);
      this.status('Entry downloaded.');
    }

    async copyCurrentText() {
      const entry = this.currentEntry();
      if (!entry) return;
      try {
        await navigator.clipboard.writeText(entry.content || '');
        this.status('Entry text copied.');
      } catch (_error) {
        this.refs.content.focus();
        this.refs.content.select();
        this.status('Text selected; copy from the editor.', 'warn');
      }
    }

    exportJson() {
      const snapshot = Object.assign({}, this.state, { exportedAt: nowIso() });
      downloadBlob(`ourspace-journal-${slug(this.profile)}.json`, 'application/json;charset=utf-8', JSON.stringify(snapshot, null, 2));
      this.status('Journal JSON downloaded.');
    }

    async importJson(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const incoming = JSON.parse(await file.text());
        this.state = normalizeState(incoming, this.profile);
        this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null;
        this.touch();
        this.status('Journal JSON imported.');
      } catch (error) {
        this.status(`Import failed: ${error.message}`, 'warn');
      } finally {
        event.target.value = '';
      }
    }

    async saveBackend(eventOrOptions) {
      const quiet = eventOrOptions && eventOrOptions.quiet;
      try {
        await this.backend.save(this.state);
        this.state.lastSyncedAt = nowIso();
        this.saveLocal();
        if (!quiet) this.status('Backend sync save complete.');
      } catch (error) {
        if (!quiet) this.status(`Backend save unavailable; local copy is safe. ${error.message}`, 'warn');
      }
    }

    async loadBackend(eventOrOptions) {
      const quiet = eventOrOptions && eventOrOptions.quiet;
      try {
        const remote = await this.backend.load();
        if (remote && Array.isArray(remote.entries)) {
          const remoteState = normalizeState(remote, this.profile);
          const localUpdated = Date.parse(this.state.lastSavedAt || 0) || 0;
          const remoteUpdated = Date.parse(remoteState.lastSavedAt || remoteState.updatedAt || 0) || 0;
          if (remoteUpdated >= localUpdated || !this.state.entries.length) {
            this.state = remoteState;
            this.selectedEntryId = this.state.entries[0] ? this.state.entries[0].id : null;
            this.saveLocal();
            this.refresh();
            if (!quiet) this.status('Backend sync load complete.');
          } else if (!quiet) {
            this.status('Local copy is newer than backend copy; not overwritten.', 'warn');
          }
        } else if (!quiet) {
          this.status('Backend returned no journal data yet.');
        }
      } catch (error) {
        if (!quiet) this.status(`Backend load unavailable; local copy is open. ${error.message}`, 'warn');
      }
    }

    filteredEntries() {
      const search = this.filters.search;
      return this.state.entries.filter((entry) => {
        if (this.filters.folderId !== 'all' && entry.folderId !== this.filters.folderId) return false;
        if (this.filters.categoryId !== 'all' && !entry.categoryIds.includes(this.filters.categoryId)) return false;
        if (search) {
          const haystack = `${entry.title}\n${entry.content}\n${entry.sourceName}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      }).sort((a, b) => safeText(b.updatedAt).localeCompare(safeText(a.updatedAt)));
    }

    refresh() {
      this.refreshSelects();
      this.refreshEntryList();
      this.refreshEditor();
      this.refreshReader();
    }

    refreshSelects() {
      const folderOptions = this.state.folders.map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`).join('');
      this.refs.folderSelect.innerHTML = folderOptions;
      this.refs.folderFilter.innerHTML = `<option value="all">All folders</option>${folderOptions}`;
      this.refs.folderFilter.value = this.filters.folderId;

      const categoryOptions = this.state.categories.map((cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.name)}</option>`).join('');
      this.refs.categoryFilter.innerHTML = `<option value="all">All categories</option>${categoryOptions}`;
      this.refs.categoryFilter.value = this.filters.categoryId;

      this.refs.categoryChecks.innerHTML = this.state.categories.length
        ? this.state.categories.map((cat) => `<label class="os-journal__chip"><input type="checkbox" data-category-check value="${escapeHtml(cat.id)}">${escapeHtml(cat.name)}</label>`).join('')
        : '<span class="os-journal__empty-note">No categories yet.</span>';
    }

    refreshEntryList() {
      const entries = this.filteredEntries();
      if (!entries.length) {
        this.refs.entryList.innerHTML = '<div class="os-journal__empty">No entries match this view.</div>';
        return;
      }
      this.refs.entryList.innerHTML = entries.map((entry) => {
        const folder = this.state.folders.find((item) => item.id === entry.folderId);
        const date = entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '';
        const selected = entry.id === this.selectedEntryId ? ' aria-current="true"' : '';
        return `<button type="button" data-entry-id="${escapeHtml(entry.id)}"${selected}>
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(folder ? folder.name : 'Unfiled')} • ${escapeHtml(date)}</span>
        </button>`;
      }).join('');
    }

    refreshEditor() {
      const entry = this.currentEntry();
      if (!entry) {
        this.refs.title.value = '';
        this.refs.content.value = '';
        this.refs.folderSelect.value = 'folder_unfiled';
        Array.from(this.root.querySelectorAll('[data-category-check]')).forEach((input) => { input.checked = false; });
        return;
      }
      this.refs.title.value = entry.title || '';
      this.refs.content.value = entry.content || '';
      this.refs.folderSelect.value = entry.folderId || 'folder_unfiled';
      Array.from(this.root.querySelectorAll('[data-category-check]')).forEach((input) => {
        input.checked = entry.categoryIds.includes(input.value);
      });
    }

    refreshReader() {
      const entry = this.currentEntry();
      if (!entry) {
        this.refs.readerTitle.textContent = 'Reader';
        this.refs.readerMeta.textContent = '';
        this.refs.readerBody.innerHTML = '<p>Choose or create an entry.</p>';
        return;
      }
      const folder = this.state.folders.find((item) => item.id === entry.folderId);
      const cats = this.state.categories.filter((cat) => entry.categoryIds.includes(cat.id)).map((cat) => cat.name).join(', ');
      this.refs.readerTitle.textContent = entry.title || 'Untitled entry';
      this.refs.readerMeta.textContent = [folder ? folder.name : 'Unfiled', cats, entry.sourceName ? `imported: ${entry.sourceName}` : ''].filter(Boolean).join(' • ');
      this.refs.readerBody.innerHTML = paragraphsToHtml(entry.content || '');
    }
  }

  function mount(root, options) {
    return new OurSpaceJournalModule(root, options || {});
  }

  window.OurSpaceJournal = { mount, BackendAdapter, DEFAULT_BACKEND_URL };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ourspace-journal-auto]').forEach((el) => {
      if (!el.__ourspaceJournalMounted) {
        el.__ourspaceJournalMounted = true;
        mount(el, {
          profile: el.dataset.profile,
          backendUrl: el.dataset.backendUrl || DEFAULT_BACKEND_URL,
          autoLoadBackend: el.dataset.autoLoadBackend !== 'false'
        });
      }
    });
  });
}());
