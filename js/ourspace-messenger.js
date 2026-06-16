(function (global) {
  'use strict';

  const VERSION = '1.1.0';
  const STORAGE_KEY = 'ourspaceMessengerPlugin.v1';
  const DEFAULT_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
  const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
  const VOICE_EFFECTS = ['normal', 'warm', 'robot', 'chipmunk', 'deep', 'echo', 'monster'];
  const FACE_FILTERS = ['none', 'soft-glow', 'neon-glasses', 'cat-ears', 'pixel-mask', 'void'];

  const $ = (root, selector) => root.querySelector(selector);
  const $$ = (root, selector) => Array.from(root.querySelectorAll(selector));
  const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeText = (value) => escapeHtml(value).replace(/\n/g, '<br>');
  const fmtTime = (iso) => new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  const fmtDay = (iso) => new Intl.DateTimeFormat([], { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
  const linkRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?])/gi;

  function normalizeId(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'home';
  }

  function readStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (error) { return {}; }
  }

  function writeStorage(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (error) { console.warn('OurSpace Messenger storage failed:', error); }
  }

  function dataUrlFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function downloadDataUrl(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function extractLinks(text) {
    return Array.from(new Set(String(text || '').match(linkRegex) || []));
  }

  function getHumanUsers(config) {
    const configured = (config.users || []).filter(user => !user.system);
    const fallback = [
      { id: 'william', label: 'William', avatar: '🦖' },
      { id: 'jasper', label: 'Jasper', avatar: '🌙' }
    ];
    return (configured.length >= 2 ? configured : fallback).slice(0, 2);
  }

  function getParticipantIds(config) {
    return getHumanUsers(config).map(user => user.id);
  }

  function getPeerId(config, userId) {
    const participants = getParticipantIds(config);
    return participants.find(id => id !== userId) || participants[0] || 'jasper';
  }

  function isSystemAuthor(config, userId) {
    return userId === 'system' || (config.users || []).some(user => user.id === userId && user.system);
  }

  function twoPersonMeta(config, authorId) {
    const participants = getParticipantIds(config);
    const safeAuthor = participants.includes(authorId) || isSystemAuthor(config, authorId) ? authorId : participants[0];
    return {
      serverId: config.serverId || 'ourspace-private-two-person-server',
      participants,
      visibleTo: participants,
      recipientId: isSystemAuthor(config, safeAuthor) ? participants.slice() : participants.filter(id => id !== safeAuthor),
      routeMode: 'two_person_channels'
    };
  }

  function createDefaultState(config) {
    const users = config.users || [];
    const me = users.find(u => !u.system)?.id || 'william';
    const now = new Date().toISOString();
    return {
      version: VERSION,
      currentUserId: me,
      activeChannelId: config.defaultChannel || 'home',
      channels: [
        { id: config.defaultChannel || 'home', title: 'Home', icon: '💬', kind: 'channel', createdAt: now, description: 'Shared home base for both members', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'chores', title: 'Chores', icon: '🧺', kind: 'channel', createdAt: now, description: 'Tasks, rewards, reminders, and household wins', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'cat-pics', title: 'Cat Pics', icon: '🐈‍⬛', kind: 'channel', createdAt: now, description: 'Cat photos, GIFs, videos, and comfort media', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'date-ideas', title: 'Date Ideas', icon: '💖', kind: 'channel', createdAt: now, description: 'Plans, cozy ideas, outings, and wishlists', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'grocery-list', title: 'Grocery List', icon: '🛒', kind: 'channel', createdAt: now, description: 'Food, medicine-adjacent supplies, and store notes', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'media', title: 'Media', icon: '🖼️', kind: 'channel', createdAt: now, description: 'Images, GIFs, files, and clips', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) },
        { id: 'calls', title: 'Calls', icon: '📞', kind: 'channel', createdAt: now, description: 'Call invites and WebRTC signals', serverId: config.serverId || 'ourspace-private-two-person-server', participants: getParticipantIds(config) }
      ],
      messages: [
        {
          id: uid('msg'),
          channelId: config.defaultChannel || 'home',
          authorId: 'system',
          kind: 'system',
          text: 'OurSpace Messenger is ready. This private two-member space supports shared channels, attachments, calls, transcription, voice effects, stickers, backgrounds, and face filters.',
          createdAt: now,
          attachments: [],
          links: [],
          serverId: config.serverId || 'ourspace-private-two-person-server',
          participants: getParticipantIds(config),
          visibleTo: getParticipantIds(config),
          routeMode: 'two_person_channels'
        }
      ],
      stickers: [
        { id: 'sticker_spark', label: '✨ yes', text: '✨ YES ✨' },
        { id: 'sticker_chaos', label: 'chaos', text: 'tiny chaos' },
        { id: 'sticker_safe', label: 'safe', text: 'safe signal' }
      ],
      backgroundImage: '',
      backgroundOpacity: .18,
      pendingAttachments: [],
      lastSyncAt: '1970-01-01T00:00:00.000Z',
      lastSignalSyncAt: '1970-01-01T00:00:00.000Z',
      muted: false
    };
  }

  class MessengerApp {
    constructor(config) {
      this.config = Object.assign({
        appName: 'OurSpace Messenger',
        mainBackendUrl: '',
        onyxAlertsBackendUrl: '',
        faceModelPath: 'vendor/jeeliz/NN_VERYLIGHT_1.json',
        pollMs: 5000,
        maxAttachmentBytes: 7 * 1024 * 1024,
        serverId: 'ourspace-private-two-person-server',
        twoPersonOnly: true,
        users: [
          { id: 'william', label: 'William', avatar: '🦖' },
          { id: 'jasper', label: 'Jasper', avatar: '🌙' },
          { id: 'onyx', label: 'Onyx Alerts', avatar: '🐈‍⬛', system: true }
        ]
      }, config || {});

      this.mount = typeof this.config.mount === 'string' ? document.querySelector(this.config.mount) : this.config.mount;
      if (!this.mount) throw new Error('OurSpace Messenger mount element was not found.');

      this.participantIds = getParticipantIds(this.config);
      this.humanUsers = getHumanUsers(this.config);
      this.storage = Object.assign(createDefaultState(this.config), readStorage());
      this.storage = this.normalizeStorage(this.storage);
      this.storage.pendingAttachments = [];
      this.openPanels = { channels: false, studio: false };
      this.status = { backend: 'Local-first', stt: 'Idle', recorder: 'Idle', camera: 'Idle', call: 'Idle' };
      this.voice = { effect: 'normal', stream: null, context: null, analyser: null, raf: null, recorder: null, chunks: [] };
      this.face = { stream: null, raf: null, jeelizReady: false, detectState: null, currentFilter: 'none' };
      this.call = { pc: null, localStream: null, remoteStream: null, active: false, video: false, startedAt: null, signalTimer: null };
      this.recognition = null;
      this.bridge = new global.OurSpaceBackendBridge({
        mainBackendUrl: this.config.mainBackendUrl,
        onyxAlertsBackendUrl: this.config.onyxAlertsBackendUrl,
        clientId: `osm_${this.storage.currentUserId}_${Math.random().toString(36).slice(2, 8)}`,
        serverId: this.config.serverId,
        participants: this.participantIds
      });
      this.seenSignalIds = new Set(this.storage.seenSignalIds || []);
      this.render();
      this.attachGlobalEvents();
      this.applyBackground();
      this.pollTimer = setInterval(() => this.pollBackend(), this.config.pollMs);
      this.bridge.flushQueue().catch(() => {});
    }

    _dedupeById(primary, fallback) {
      const map = new Map();
      [...fallback, ...primary].forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    }

    normalizeStorage(storage) {
      const defaults = createDefaultState(this.config);
      const meta = twoPersonMeta(this.config, storage.currentUserId);
      const participantSet = new Set(this.participantIds);
      const allowedAuthor = (id) => participantSet.has(id) || isSystemAuthor(this.config, id);
      const channels = this._dedupeById(storage.channels || [], defaults.channels).map(channel => Object.assign({
        kind: 'channel',
        createdAt: new Date().toISOString(),
        description: 'Shared private channel'
      }, channel, {
        kind: channel.kind === 'dm' ? 'channel' : (channel.kind || 'channel'),
        serverId: this.config.serverId,
        participants: this.participantIds,
        visibleTo: this.participantIds
      }));
      const messages = (storage.messages || defaults.messages || []).map(message => {
        const authorId = allowedAuthor(message.authorId) ? message.authorId : 'system';
        return Object.assign({}, message, twoPersonMeta(this.config, authorId), {
          authorId,
          channelId: channels.some(channel => channel.id === message.channelId) ? message.channelId : (this.config.defaultChannel || 'home')
        });
      });
      const stickers = Array.isArray(storage.stickers) && storage.stickers.length ? storage.stickers : defaults.stickers;
      const activeChannelId = channels.some(channel => channel.id === storage.activeChannelId) ? storage.activeChannelId : (this.config.defaultChannel || channels[0]?.id || 'home');
      const currentUserId = this.participantIds.includes(storage.currentUserId) ? storage.currentUserId : this.participantIds[0];
      return Object.assign({}, defaults, storage, meta, {
        currentUserId,
        activeChannelId,
        channels,
        messages,
        stickers,
        pendingAttachments: [],
        lastSyncAt: storage.lastSyncAt || new Date().toISOString(),
        lastSignalSyncAt: storage.lastSignalSyncAt || storage.lastSyncAt || new Date().toISOString(),
        seenSignalIds: storage.seenSignalIds || []
      });
    }

    makeSharedPayload(partial, authorId) {
      return Object.assign({}, twoPersonMeta(this.config, authorId || this.storage.currentUserId), partial || {});
    }

    get peer() {
      const peerId = getPeerId(this.config, this.storage.currentUserId);
      return this.config.users.find(user => user.id === peerId) || { id: peerId, label: peerId, avatar: '🙂' };
    }

    save() {
      const clean = Object.assign({}, this.storage, { pendingAttachments: [], seenSignalIds: Array.from(this.seenSignalIds || []) });
      writeStorage(clean);
    }

    get me() {
      return this.humanUsers.find(u => u.id === this.storage.currentUserId) || this.humanUsers[0] || { id: 'me', label: 'Me', avatar: '🙂' };
    }

    get activeChannel() {
      return this.storage.channels.find(c => c.id === this.storage.activeChannelId) || this.storage.channels[0];
    }

    get activeMessages() {
      return this.storage.messages
        .filter(m => m.channelId === this.storage.activeChannelId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    render() {
      this.mount.innerHTML = `
        <section class="os-messenger" data-version="${VERSION}">
          <div class="os-app-shell">
            ${this.renderRail()}
            ${this.renderChannels()}
            ${this.renderChat()}
            ${this.renderStudio()}
          </div>
          ${this.renderCallOverlay()}
          ${this.renderModal()}
          <input class="os-hidden" id="os-file-input" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.json,.zip,.csv,.md" />
          <input class="os-hidden" id="os-bg-input" type="file" accept="image/*" />
        </section>`;
      this.root = this.mount.querySelector('.os-messenger');
      this.bindEvents();
      this.applyBackground();
    }

    renderRail() {
      return `<nav class="os-sidebar" aria-label="Messenger sections">
        <div class="os-brand" title="${escapeHtml(this.config.appName)}">OS</div>
        <button class="os-rail-button is-active" data-action="show-channels" title="Channels">💬</button>
        <button class="os-rail-button" data-action="show-studio" title="Media Studio">🎛️</button>
        <button class="os-rail-button" data-action="quick-sticker" title="Create sticker">✨</button>
        <button class="os-rail-button" data-action="send-alert" title="Send Onyx alert">🐈‍⬛</button>
        <div class="os-rail-spacer"></div>
        <button class="os-rail-button" data-action="flush-backend" title="Sync queued messages">↻</button>
      </nav>`;
    }

    renderChannels() {
      const channels = this.storage.channels.map(channel => {
        const latest = this.storage.messages.filter(m => m.channelId === channel.id).slice(-1)[0];
        const unread = 0;
        return `<button class="os-channel ${channel.id === this.storage.activeChannelId ? 'is-active' : ''}" data-channel-id="${escapeHtml(channel.id)}">
          <span class="os-channel-icon">${escapeHtml(channel.icon || '#')}</span>
          <span><span class="os-channel-title">${escapeHtml(channel.title)}</span><br><span class="os-channel-meta">${escapeHtml(latest ? latest.text || latest.kind || 'attachment' : channel.description || '')}</span></span>
          ${unread ? `<span class="os-badge">${unread}</span>` : '<span></span>'}
        </button>`;
      }).join('');
      const users = [...this.humanUsers, ...this.config.users.filter(user => user.system)].map(user => {
        const isCurrent = user.id === this.storage.currentUserId;
        const label = user.system ? 'Alert helper' : (isCurrent ? 'Sending as this member' : 'Shared channel member');
        const action = user.system ? 'send-alert' : 'switch-user';
        return `<button class="os-user-row ${isCurrent ? 'is-active' : ''}" data-action="${action}" data-user-id="${escapeHtml(user.id)}">
          <span class="os-avatar">${escapeHtml(user.avatar || '🙂')}</span>
          <span><strong>${escapeHtml(user.label || user.id)}</strong><br><small class="os-channel-meta">${escapeHtml(label)}</small></span>
        </button>`;
      }).join('');
      return `<aside class="os-channels ${this.openPanels.channels ? 'is-open' : ''}">
        <header class="os-pane-head">
          <div class="os-title-row">
            <div><h1 class="os-app-title">${escapeHtml(this.config.appName)}</h1><p class="os-subtitle">Private two-member channels, calls, media, voice, filters.</p></div>
            <button class="os-icon-button" data-action="close-channels" title="Close">×</button>
          </div>
          <input class="os-search" id="os-channel-search" type="search" placeholder="Search channels and messages" autocomplete="off" />
          <div class="os-toolbar-row">
            <button class="os-pill-button" data-action="new-channel">+ Channel</button>
            <button class="os-chip" data-action="export-chat">Export</button>
          </div>
        </header>
        <div class="os-section-label">Channels</div>
        <div class="os-list" id="os-channel-list">${channels}</div>
        <div class="os-section-label">Members & alerts</div>
        <div class="os-list">${users}</div>
      </aside>`;
    }

    renderChat() {
      const channel = this.activeChannel;
      return `<main class="os-chat" aria-label="Current conversation">
        <header class="os-chat-head">
          <button class="os-icon-button os-mobile-menu" data-action="show-channels" title="Open channels">☰</button>
          <div class="os-current-channel">
            <h2>${escapeHtml(channel.icon || '💬')} ${escapeHtml(channel.title)}</h2>
            <p>${escapeHtml(channel.description || 'Messages sync locally first and post to the configured backend when available.')}</p>
          </div>
          <div class="os-head-actions">
            <button class="os-icon-button" data-action="start-audio-call" title="Audio call">📞</button>
            <button class="os-icon-button" data-action="start-video-call" title="Video call">🎥</button>
            <button class="os-icon-button os-hide-mobile" data-action="show-studio" title="Open studio">🎛️</button>
          </div>
        </header>
        <section class="os-messages" id="os-messages" aria-live="polite">${this.renderMessages()}</section>
        ${this.renderComposer()}
      </main>`;
    }

    renderMessages() {
      const messages = this.activeMessages;
      if (!messages.length) return '<div class="os-day-break">No messages yet</div>';
      let lastDay = '';
      return messages.map(message => {
        const day = fmtDay(message.createdAt);
        const dayBreak = day !== lastDay ? `<div class="os-day-break">${escapeHtml(day)}</div>` : '';
        lastDay = day;
        return dayBreak + this.renderMessage(message);
      }).join('');
    }

    renderMessage(message) {
      const isOwn = message.authorId === this.storage.currentUserId;
      const isSystem = message.kind === 'system' || message.authorId === 'system';
      const author = this.config.users.find(u => u.id === message.authorId) || { label: message.authorId, avatar: '•' };
      const links = (message.links || []).map(link => `<div class="os-attachment-card os-link-card"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a></div>`).join('');
      const attachments = (message.attachments || []).map(att => this.renderAttachment(att)).join('');
      const signalButton = message.signal && message.signal.type === 'offer'
        ? `<button class="os-message-tool" data-action="answer-signal" data-message-id="${escapeHtml(message.id)}">Answer</button>` : '';
      const stickerText = message.kind === 'sticker' ? `<div class="os-sticker-preview">${safeText(message.text || '')}</div>` : safeText(message.text || '');
      return `<article class="os-message ${isSystem ? 'is-system' : isOwn ? 'is-own' : 'is-other'}" data-message-id="${escapeHtml(message.id)}">
        <div class="os-message-meta"><span>${escapeHtml(isSystem ? 'System' : `${author.avatar || ''} ${author.label || author.id}`)}</span><span>•</span><time>${escapeHtml(fmtTime(message.createdAt))}</time>${message.pending ? '<span>• sending</span>' : ''}</div>
        <div class="os-bubble">${stickerText}${links}${attachments}</div>
        <div class="os-message-tools">
          <button class="os-message-tool" data-action="reply-message" data-message-id="${escapeHtml(message.id)}">Reply</button>
          <button class="os-message-tool" data-action="make-message-sticker" data-message-id="${escapeHtml(message.id)}">Sticker</button>
          ${signalButton}
        </div>
      </article>`;
    }

    renderAttachment(att) {
      const type = att.type || '';
      const name = escapeHtml(att.name || 'attachment');
      const src = escapeHtml(att.dataUrl || att.url || '');
      if (IMAGE_TYPES.includes(type) || type.startsWith('image/')) {
        return `<div class="os-attachment-card"><img src="${src}" alt="${name}" loading="lazy"><div class="os-attachment-name">${name}</div></div>`;
      }
      if (VIDEO_TYPES.includes(type) || type.startsWith('video/')) {
        return `<div class="os-attachment-card"><video src="${src}" controls playsinline></video><div class="os-attachment-name">${name}</div></div>`;
      }
      if (AUDIO_TYPES.includes(type) || type.startsWith('audio/')) {
        return `<div class="os-attachment-card"><audio src="${src}" controls></audio><div class="os-attachment-name">${name}</div></div>`;
      }
      return `<div class="os-attachment-card"><a href="${src}" download="${name}">📎 ${name}</a><div class="os-attachment-name">${escapeHtml(att.sizeLabel || '')}</div></div>`;
    }

    renderComposer() {
      const files = this.storage.pendingAttachments.map(att => `<button class="os-file-pill" data-action="remove-pending" data-attachment-id="${escapeHtml(att.id)}">${escapeHtml(att.name)} ×</button>`).join('');
      const stickers = this.storage.stickers.map(sticker => `<button class="os-sticker-pill" data-action="send-sticker" data-sticker-id="${escapeHtml(sticker.id)}" title="${escapeHtml(sticker.label)}">${safeText(sticker.text)}</button>`).join('');
      return `<footer class="os-composer">
        <div class="os-file-tray ${files ? 'is-open' : ''}" id="os-file-tray">${files}</div>
        <div class="os-sticker-tray" id="os-sticker-tray">${stickers}</div>
        <div class="os-background-tray" id="os-background-tray">
          <button class="os-chip" data-action="choose-background">Choose image background</button>
          <label class="os-chip">Opacity <input id="os-bg-opacity" type="range" min="0" max="60" value="${Math.round((this.storage.backgroundOpacity || .18) * 100)}"></label>
          <button class="os-chip" data-action="clear-background">Clear background</button>
        </div>
        <div class="os-mini-tools">
          <button class="os-chip" data-action="attach-file">📎 File</button>
          <button class="os-chip" data-action="toggle-stickers">✨ Stickers</button>
          <button class="os-chip" data-action="record-audio">🎙️ Record</button>
          <button class="os-chip" data-action="transcribe">📝 Transcribe</button>
          <button class="os-chip" data-action="quick-sticker">Make sticker</button>
          <button class="os-chip" data-action="toggle-backgrounds">🖼️ Background</button>
          <button class="os-chip" data-action="send-alert">🐈‍⬛ Alert</button>
          <span class="os-recording" id="os-recording-status">${escapeHtml(this.status.recorder)}</span>
        </div>
        <div class="os-composer-main">
          <button class="os-icon-button" data-action="attach-file" title="Attach">＋</button>
          <textarea id="os-message-field" class="os-composer-field" placeholder="Message, paste a GIF/link, or use /alert for Onyx alerts" rows="1"></textarea>
          <button class="os-send-button" data-action="send-message">➤</button>
        </div>
      </footer>`;
    }

    renderStudio() {
      return `<aside class="os-studio ${this.openPanels.studio ? 'is-open' : ''}" aria-label="Messenger studio">
        <header class="os-pane-head">
          <div class="os-title-row"><div><h2 class="os-app-title">Media Studio</h2><p class="os-subtitle">Voice, transcribe, filters, background, sync.</p></div><button class="os-icon-button" data-action="close-studio">×</button></div>
        </header>
        <div class="os-studio-body">
          <section class="os-card">
            <h3>Profile sending as</h3>
            <select class="os-select" id="os-current-user">
              ${this.humanUsers.map(user => `<option value="${escapeHtml(user.id)}" ${user.id === this.storage.currentUserId ? 'selected' : ''}>${escapeHtml(user.avatar || '')} ${escapeHtml(user.label || user.id)}</option>`).join('')}
            </select>
          </section>
          <section class="os-card">
            <h3>Voice changer</h3>
            <p>Used for microphone recordings and calls. Browser audio effects are local until sent.</p>
            <select class="os-select" id="os-voice-effect">${VOICE_EFFECTS.map(effect => `<option value="${effect}" ${effect === this.voice.effect ? 'selected' : ''}>${escapeHtml(effect)}</option>`).join('')}</select>
            <div class="os-audio-meter"><span id="os-audio-meter-bar"></span></div>
            <div class="os-studio-row"><button class="os-pill-button" data-action="test-mic">Test mic</button><button class="os-chip" data-action="stop-mic">Stop</button></div>
          </section>
          <section class="os-card">
            <h3>Face filters</h3>
            <p>Uses the bundled Jeeliz face-tracking runtime when available, with a canvas fallback for local file previews.</p>
            <div class="os-video-stage">
              <video id="os-face-video" autoplay muted playsinline></video>
              <canvas id="os-face-canvas"></canvas>
              <canvas id="os-jeeliz-canvas" class="os-hidden"></canvas>
              <div class="os-video-placeholder">Camera preview appears here</div>
              <span class="os-filter-label" id="os-filter-label">${escapeHtml(this.face.currentFilter)}</span>
            </div>
            <select class="os-select" id="os-face-filter">${FACE_FILTERS.map(filter => `<option value="${filter}" ${filter === this.face.currentFilter ? 'selected' : ''}>${escapeHtml(filter)}</option>`).join('')}</select>
            <div class="os-studio-row"><button class="os-pill-button" data-action="start-camera">Start camera</button><button class="os-chip" data-action="capture-filter">Send snapshot</button><button class="os-chip" data-action="stop-camera">Stop</button></div>
          </section>
          <section class="os-card">
            <h3>Backend</h3>
            <p id="os-backend-status">${escapeHtml(this.status.backend)}</p>
            <div class="os-studio-row"><button class="os-pill-button" data-action="flush-backend">Sync queue</button><button class="os-chip" data-action="copy-install">Copy install snippet</button></div>
          </section>
        </div>
      </aside>`;
    }

    renderCallOverlay() {
      return `<section class="os-call-overlay" id="os-call-overlay" aria-modal="true" role="dialog">
        <div class="os-call-panel">
          <header class="os-call-head">
            <div class="os-call-title"><h2>Messenger call</h2><p id="os-call-status">${escapeHtml(this.status.call)}</p></div>
            <button class="os-icon-button" data-action="end-call">×</button>
          </header>
          <div class="os-call-videos">
            <div class="os-call-video-box"><video id="os-local-video" autoplay muted playsinline></video><span class="os-call-video-label">Local</span></div>
            <div class="os-call-video-box"><video id="os-remote-video" autoplay playsinline></video><span class="os-call-video-label">Remote</span></div>
          </div>
          <footer class="os-call-controls">
            <select class="os-select" id="os-call-voice-effect" style="max-width:180px">${VOICE_EFFECTS.map(effect => `<option value="${effect}" ${effect === this.voice.effect ? 'selected' : ''}>${escapeHtml(effect)}</option>`).join('')}</select>
            <button class="os-call-button" data-action="toggle-mute">Mute</button>
            <button class="os-call-button" data-action="toggle-video">Video</button>
            <button class="os-call-button" data-action="copy-call-signal">Copy signal</button>
            <button class="os-call-button is-danger" data-action="end-call">End</button>
          </footer>
        </div>
      </section>`;
    }

    renderModal() {
      return `<div class="os-modal-backdrop" id="os-modal-backdrop">
        <div class="os-modal" role="dialog" aria-modal="true">
          <h2 id="os-modal-title">New channel</h2>
          <input class="os-small-input" id="os-modal-input" placeholder="Channel name" />
          <div class="os-modal-actions"><button class="os-chip" data-action="close-modal">Cancel</button><button class="os-pill-button" data-action="confirm-modal">Create</button></div>
        </div>
      </div>`;
    }

    bindEvents() {
      this.root.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action], [data-channel-id]');
        if (!target) return;
        if (target.dataset.channelId) return this.selectChannel(target.dataset.channelId);
        this.handleAction(target.dataset.action, target);
      });

      $('#os-message-field', this.root)?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendMessageFromComposer();
        }
      });

      $('#os-message-field', this.root)?.addEventListener('input', (event) => {
        event.target.style.height = 'auto';
        event.target.style.height = `${clamp(event.target.scrollHeight, 46, 160)}px`;
      });

      $('#os-file-input', this.root)?.addEventListener('change', (event) => this.handleFiles(event.target.files));
      $('#os-bg-input', this.root)?.addEventListener('change', (event) => this.handleBackgroundFile(event.target.files?.[0]));
      $('#os-current-user', this.root)?.addEventListener('change', (event) => this.setCurrentUser(event.target.value));
      $('#os-voice-effect', this.root)?.addEventListener('change', (event) => { this.voice.effect = event.target.value; this.toast(`Voice effect: ${this.voice.effect}`); });
      $('#os-call-voice-effect', this.root)?.addEventListener('change', (event) => { this.voice.effect = event.target.value; this.toast(`Call voice effect: ${this.voice.effect}`); });
      $('#os-face-filter', this.root)?.addEventListener('change', (event) => this.setFaceFilter(event.target.value));
      $('#os-bg-opacity', this.root)?.addEventListener('input', (event) => {
        this.storage.backgroundOpacity = Number(event.target.value) / 100;
        this.applyBackground();
        this.save();
      });
      $('#os-channel-search', this.root)?.addEventListener('input', (event) => this.searchMessages(event.target.value));
      this.scrollMessagesToBottom();
    }

    attachGlobalEvents() {
      window.addEventListener('online', () => this.bridge.flushQueue().then(result => this.setBackendStatus(`Online. Synced ${result.sent || 0} queued item(s).`)));
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.pollBackend();
      });
    }

    async handleAction(action, target) {
      const actions = {
        'show-channels': () => { this.openPanels.channels = true; this.render(); },
        'close-channels': () => { this.openPanels.channels = false; this.render(); },
        'show-studio': () => { this.openPanels.studio = true; this.render(); this.restoreLivePreviewReferences(); },
        'close-studio': () => { this.openPanels.studio = false; this.render(); },
        'new-channel': () => this.openModal('New channel', 'Channel name'),
        'close-modal': () => this.closeModal(),
        'confirm-modal': () => this.confirmModal(),
        'attach-file': () => $('#os-file-input', this.root).click(),
        'toggle-stickers': () => this.toggleTray('#os-sticker-tray'),
        'toggle-backgrounds': () => this.toggleTray('#os-background-tray'),
        'choose-background': () => $('#os-bg-input', this.root).click(),
        'clear-background': () => this.clearBackground(),
        'send-message': () => this.sendMessageFromComposer(),
        'record-audio': () => this.toggleRecording(),
        'transcribe': () => this.toggleTranscription(),
        'quick-sticker': () => this.createStickerFromComposer(),
        'send-alert': () => this.sendOnyxAlertFromComposer(),
        'switch-user': () => this.setCurrentUser(target.dataset.userId),
        'send-sticker': () => this.sendSticker(target.dataset.stickerId),
        'remove-pending': () => this.removePendingAttachment(target.dataset.attachmentId),
        'reply-message': () => this.replyToMessage(target.dataset.messageId),
        'make-message-sticker': () => this.createStickerFromMessage(target.dataset.messageId),
        'answer-signal': () => this.answerSignalFromMessage(target.dataset.messageId),
        'start-audio-call': () => this.startCall(false),
        'start-video-call': () => this.startCall(true),
        'end-call': () => this.endCall(),
        'toggle-mute': () => this.toggleMute(),
        'toggle-video': () => this.toggleVideoTrack(),
        'copy-call-signal': () => this.copyCurrentSignal(),
        'test-mic': () => this.startMicPreview(),
        'stop-mic': () => this.stopMicPreview(),
        'start-camera': () => this.startCamera(),
        'stop-camera': () => this.stopCamera(),
        'capture-filter': () => this.captureFilterSnapshot(),
        'flush-backend': () => this.flushBackend(),
        'export-chat': () => this.exportChat(),
        'copy-install': () => this.copyInstallSnippet()
      };
      if (actions[action]) await actions[action]();
    }

    selectChannel(id) {
      this.storage.activeChannelId = id;
      this.openPanels.channels = false;
      this.save();
      this.render();
    }

    openDirectMessage(userId) {
      const user = this.config.users.find(u => u.id === userId);
      const id = `dm-${normalizeId(userId)}`;
      if (!this.storage.channels.some(c => c.id === id)) {
        this.storage.channels.push(Object.assign({ id, title: user?.label || userId, icon: user?.avatar || '🙂', kind: 'channel', createdAt: new Date().toISOString(), description: user?.system ? 'System alert thread' : 'Shared private member channel' }, twoPersonMeta(this.config, this.storage.currentUserId)));
      }
      this.selectChannel(id);
    }

    openModal(title, placeholder) {
      const modal = $('#os-modal-backdrop', this.root);
      $('#os-modal-title', this.root).textContent = title;
      const input = $('#os-modal-input', this.root);
      input.value = '';
      input.placeholder = placeholder || '';
      modal.classList.add('is-open');
      input.focus();
    }

    closeModal() {
      $('#os-modal-backdrop', this.root).classList.remove('is-open');
    }

    confirmModal() {
      const input = $('#os-modal-input', this.root);
      const title = input.value.trim();
      if (!title) return;
      const channel = Object.assign({
        id: normalizeId(title),
        title,
        icon: '#️⃣',
        kind: 'channel',
        description: 'Custom shared channel',
        createdAt: new Date().toISOString(),
        createdBy: this.storage.currentUserId
      }, twoPersonMeta(this.config, this.storage.currentUserId));
      if (this.storage.channels.some(c => c.id === channel.id)) channel.id = `${channel.id}-${Date.now().toString(36)}`;
      this.storage.channels.push(channel);
      this.bridge.createChannel(channel).catch(() => {});
      this.closeModal();
      this.selectChannel(channel.id);
      this.toast(`Channel created: ${title}`);
    }

    toggleTray(selector) {
      const el = $(selector, this.root);
      if (el) el.classList.toggle('is-open');
    }

    async handleFiles(files) {
      const list = Array.from(files || []);
      const converted = [];
      for (const file of list) {
        if (file.size > this.config.maxAttachmentBytes) {
          this.toast(`${file.name} is too large for inline storage.`);
          continue;
        }
        const dataUrl = await dataUrlFromFile(file);
        converted.push({
          id: uid('att'),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          sizeLabel: `${Math.round(file.size / 1024)} KB`,
          dataUrl
        });
      }
      this.storage.pendingAttachments.push(...converted);
      this.render();
      $('#os-file-input', this.root).value = '';
    }

    removePendingAttachment(id) {
      this.storage.pendingAttachments = this.storage.pendingAttachments.filter(a => a.id !== id);
      this.render();
    }

    async handleBackgroundFile(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) return this.toast('Please choose an image file.');
      if (file.size > this.config.maxAttachmentBytes) return this.toast('Background image is too large.');
      this.storage.backgroundImage = await dataUrlFromFile(file);
      this.applyBackground();
      this.save();
      this.toast('Chat background updated.');
    }

    clearBackground() {
      this.storage.backgroundImage = '';
      this.applyBackground();
      this.save();
      this.toast('Chat background cleared.');
    }

    applyBackground() {
      if (!this.root) return;
      this.root.style.setProperty('--os-chat-bg-image', this.storage.backgroundImage ? `url("${this.storage.backgroundImage}")` : 'none');
      this.root.style.setProperty('--os-chat-bg-opacity', String(this.storage.backgroundOpacity ?? .18));
    }

    async sendMessageFromComposer() {
      const field = $('#os-message-field', this.root);
      const text = field ? field.value.trim() : '';
      const attachments = this.storage.pendingAttachments.slice();
      if (!text && !attachments.length) return;
      field.value = '';
      field.style.height = 'auto';
      this.storage.pendingAttachments = [];
      await this.addAndSendMessage({ text, attachments, links: extractLinks(text), kind: 'message' });
    }

    async addAndSendMessage(partial) {
      const requestedAuthor = partial?.authorId || this.storage.currentUserId;
      const authorId = isSystemAuthor(this.config, requestedAuthor) ? requestedAuthor : (this.participantIds.includes(requestedAuthor) ? requestedAuthor : this.storage.currentUserId);
      const message = Object.assign({
        id: uid('msg'),
        channelId: this.storage.activeChannelId,
        authorId,
        createdAt: new Date().toISOString(),
        attachments: [],
        links: [],
        pending: true
      }, twoPersonMeta(this.config, authorId), partial, { authorId });
      this.storage.messages.push(message);
      this.save();
      this.render();
      try {
        const result = await this.bridge.sendMessage(message);
        message.pending = false;
        message.backendResult = result;
        this.setBackendStatus(result?.offline ? 'Saved locally; queued for backend sync.' : 'Synced with backend.');
      } catch (error) {
        message.pending = false;
        message.backendError = error.message;
        this.setBackendStatus('Saved locally; backend did not confirm.');
      }
      this.save();
      this.render();
      return message;
    }

    sendSticker(stickerId) {
      const sticker = this.storage.stickers.find(s => s.id === stickerId);
      if (!sticker) return;
      this.addAndSendMessage({ kind: 'sticker', text: sticker.text, attachments: [], links: [] });
    }

    createStickerFromComposer() {
      const field = $('#os-message-field', this.root);
      const text = (field?.value || '').trim() || 'new sticker';
      this.createSticker(text);
      if (field) field.value = '';
    }

    createStickerFromMessage(messageId) {
      const message = this.storage.messages.find(m => m.id === messageId);
      if (!message) return;
      this.createSticker(message.text || 'sticker');
    }

    createSticker(text) {
      const cleaned = String(text).replace(linkRegex, '').trim().slice(0, 42) || 'sticker';
      const sticker = { id: uid('sticker'), label: cleaned.slice(0, 18), text: cleaned };
      this.storage.stickers.unshift(sticker);
      this.save();
      this.render();
      this.toast('Sticker created from the conversation.');
    }

    replyToMessage(messageId) {
      const message = this.storage.messages.find(m => m.id === messageId);
      const field = $('#os-message-field', this.root);
      if (!message || !field) return;
      field.value = `↪ ${message.text || 'attachment'}\n`;
      field.focus();
    }

    async sendOnyxAlertFromComposer() {
      const field = $('#os-message-field', this.root);
      const text = (field?.value || '').trim() || `Alert from ${this.me.label || this.me.id} in ${this.activeChannel.title}`;
      const alert = Object.assign({
        id: uid('alert'),
        channelId: this.storage.activeChannelId,
        authorId: this.storage.currentUserId,
        text,
        createdAt: new Date().toISOString(),
        source: 'messenger'
      }, twoPersonMeta(this.config, this.storage.currentUserId));
      await this.addAndSendMessage({ kind: 'system', authorId: 'system', text: `Onyx alert sent: ${text}`, attachments: [], links: [] });
      if (field) field.value = '';
      try {
        const result = await this.bridge.sendOnyxAlert(alert);
        this.setBackendStatus(result?.offline ? 'Onyx alert queued locally.' : 'Onyx alert backend contacted.');
      } catch (error) {
        this.setBackendStatus('Onyx alert saved locally; backend did not confirm.');
      }
    }

    setCurrentUser(userId) {
      if (!this.participantIds.includes(userId)) return this.toast('Only the two configured members can send messages.');
      this.storage.currentUserId = userId;
      this.bridge.clientId = `osm_${this.storage.currentUserId}_${Math.random().toString(36).slice(2, 8)}`;
      this.save();
      this.render();
      this.toast(`Now sending as ${this.me.label || userId}.`);
    }

    searchMessages(term) {
      const q = term.trim().toLowerCase();
      $$('.os-message', this.root).forEach(node => {
        const text = node.textContent.toLowerCase();
        node.style.display = !q || text.includes(q) ? '' : 'none';
      });
    }

    async toggleTranscription() {
      const SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
      if (!SpeechRecognition) return this.toast('Speech recognition is not available in this browser.');
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
        this.status.stt = 'Idle';
        this.toast('Transcription stopped.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.onstart = () => { this.status.stt = 'Listening'; this.toast('Transcription listening.'); };
      recognition.onerror = (event) => this.toast(`Transcription error: ${event.error || 'unknown'}`);
      recognition.onend = () => { this.recognition = null; this.status.stt = 'Idle'; };
      recognition.onresult = (event) => {
        const field = $('#os-message-field', this.root);
        if (!field) return;
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        }
        if (finalText.trim()) {
          field.value = `${field.value}${field.value ? ' ' : ''}${finalText.trim()}`;
          field.dispatchEvent(new Event('input'));
        }
      };
      this.recognition = recognition;
      recognition.start();
    }

    async startMicPreview() {
      if (this.voice.stream) return;
      try {
        const raw = await navigator.mediaDevices.getUserMedia({ audio: true });
        const processed = this.buildProcessedAudioStream(raw, this.voice.effect, true);
        this.voice.stream = raw;
        this.voice.processedStream = processed.stream;
        this.voice.context = processed.context;
        this.voice.analyser = processed.analyser;
        this.updateAudioMeter();
        this.toast('Mic preview active.');
      } catch (error) {
        this.toast(`Microphone unavailable: ${error.message}`);
      }
    }

    stopMicPreview() {
      if (this.voice.raf) cancelAnimationFrame(this.voice.raf);
      this.voice.stream?.getTracks().forEach(track => track.stop());
      this.voice.processedStream?.getTracks().forEach(track => track.stop());
      this.voice.context?.close?.();
      this.voice.stream = null;
      this.voice.processedStream = null;
      this.voice.context = null;
      const bar = $('#os-audio-meter-bar', this.root);
      if (bar) bar.style.width = '0%';
      this.toast('Mic preview stopped.');
    }

    updateAudioMeter() {
      const analyser = this.voice.analyser;
      const bar = $('#os-audio-meter-bar', this.root);
      if (!analyser || !bar) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
        bar.style.width = `${clamp(avg / 1.8, 0, 100)}%`;
        this.voice.raf = requestAnimationFrame(tick);
      };
      tick();
    }

    buildProcessedAudioStream(rawStream, effect, monitor) {
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      const context = new AudioContext();
      const source = context.createMediaStreamSource(rawStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const destination = context.createMediaStreamDestination();
      let node = source;
      const connect = (next) => { node.connect(next); node = next; };

      if (effect === 'warm') {
        const filter = context.createBiquadFilter();
        filter.type = 'lowshelf'; filter.frequency.value = 360; filter.gain.value = 7;
        connect(filter);
      }
      if (effect === 'robot') {
        const shaper = context.createWaveShaper();
        shaper.curve = this.makeDistortionCurve(180);
        shaper.oversample = '4x';
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 1100; filter.Q.value = 9;
        connect(shaper); connect(filter);
      }
      if (effect === 'chipmunk') {
        const filter = context.createBiquadFilter();
        filter.type = 'highshelf'; filter.frequency.value = 1450; filter.gain.value = 12;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -24; compressor.ratio.value = 5;
        connect(filter); connect(compressor);
      }
      if (effect === 'deep') {
        const filter = context.createBiquadFilter();
        filter.type = 'lowshelf'; filter.frequency.value = 420; filter.gain.value = 14;
        const lowpass = context.createBiquadFilter();
        lowpass.type = 'lowpass'; lowpass.frequency.value = 2800;
        connect(filter); connect(lowpass);
      }
      if (effect === 'echo') {
        const delay = context.createDelay();
        delay.delayTime.value = .22;
        const feedback = context.createGain();
        feedback.gain.value = .32;
        delay.connect(feedback); feedback.connect(delay);
        node.connect(delay); delay.connect(destination);
      }
      if (effect === 'monster') {
        const shaper = context.createWaveShaper();
        shaper.curve = this.makeDistortionCurve(420);
        const filter = context.createBiquadFilter();
        filter.type = 'lowshelf'; filter.frequency.value = 500; filter.gain.value = 16;
        connect(filter); connect(shaper);
      }

      node.connect(analyser);
      analyser.connect(destination);
      if (monitor) {
        const monitorGain = context.createGain();
        monitorGain.gain.value = .0001;
        analyser.connect(monitorGain);
        monitorGain.connect(context.destination);
      }
      return { context, stream: destination.stream, analyser };
    }

    makeDistortionCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    }

    async toggleRecording() {
      if (this.voice.recorder && this.voice.recorder.state === 'recording') {
        this.voice.recorder.stop();
        this.status.recorder = 'Processing recording';
        this.render();
        return;
      }
      try {
        const raw = await navigator.mediaDevices.getUserMedia({ audio: true });
        const processed = this.buildProcessedAudioStream(raw, this.voice.effect, false);
        const recorder = new MediaRecorder(processed.stream);
        this.voice.recorder = recorder;
        this.voice.chunks = [];
        recorder.ondataavailable = (event) => { if (event.data.size) this.voice.chunks.push(event.data); };
        recorder.onstop = async () => {
          raw.getTracks().forEach(track => track.stop());
          processed.context.close();
          const blob = new Blob(this.voice.chunks, { type: 'audio/webm' });
          const dataUrl = await blobToDataUrl(blob);
          this.storage.pendingAttachments.push({ id: uid('audio'), name: `voice-${this.voice.effect}-${Date.now()}.webm`, type: 'audio/webm', size: blob.size, sizeLabel: `${Math.round(blob.size / 1024)} KB`, dataUrl });
          this.status.recorder = 'Recording attached';
          this.render();
        };
        recorder.start();
        this.status.recorder = `Recording (${this.voice.effect})`;
        this.render();
      } catch (error) {
        this.toast(`Recording failed: ${error.message}`);
      }
    }

    async startCamera() {
      const video = $('#os-face-video', this.root);
      const placeholder = $('.os-video-placeholder', this.root);
      if (!video) return;
      try {
        if (!this.face.stream) {
          this.face.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        }
        video.srcObject = this.face.stream;
        if (placeholder) placeholder.style.display = 'none';
        await video.play();
        this.status.camera = 'Camera active';
        this.initJeelizIfAvailable();
        this.drawFaceOverlay();
        this.toast('Face filter camera started.');
      } catch (error) {
        this.toast(`Camera unavailable: ${error.message}`);
      }
    }

    restoreLivePreviewReferences() {
      const video = $('#os-face-video', this.root);
      if (video && this.face.stream) {
        video.srcObject = this.face.stream;
        video.play().catch(() => {});
        this.drawFaceOverlay();
      }
      const local = $('#os-local-video', this.root);
      const remote = $('#os-remote-video', this.root);
      if (local && this.call.localStream) local.srcObject = this.call.localStream;
      if (remote && this.call.remoteStream) remote.srcObject = this.call.remoteStream;
    }

    initJeelizIfAvailable() {
      if (this.face.jeelizTried || !global.JEEFACEFILTERAPI) return;
      const canvas = $('#os-jeeliz-canvas', this.root);
      if (!canvas) return;
      this.face.jeelizTried = true;
      try {
        global.JEEFACEFILTERAPI.init({
          canvasId: 'os-jeeliz-canvas',
          NNCpath: this.config.faceModelPath,
          videoSettings: { facingMode: 'user' },
          callbackReady: (error) => {
            this.face.jeelizReady = !error;
            this.status.camera = error ? 'Canvas fallback active' : 'Jeeliz tracking active';
          },
          callbackTrack: (detectState) => {
            this.face.detectState = detectState;
          }
        });
      } catch (error) {
        this.face.jeelizReady = false;
        this.status.camera = 'Canvas fallback active';
      }
    }

    setFaceFilter(filter) {
      this.face.currentFilter = filter;
      const label = $('#os-filter-label', this.root);
      if (label) label.textContent = filter;
      this.drawFaceOverlay();
    }

    drawFaceOverlay() {
      const canvas = $('#os-face-canvas', this.root);
      const video = $('#os-face-video', this.root);
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      const loop = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = global.devicePixelRatio || 1;
        const width = Math.round(rect.width * dpr);
        const height = Math.round(rect.height * dpr);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        ctx.clearRect(0, 0, width, height);
        this.drawFilter(ctx, width, height, this.face.currentFilter, this.face.detectState);
        this.face.raf = requestAnimationFrame(loop);
      };
      if (this.face.raf) cancelAnimationFrame(this.face.raf);
      loop();
    }

    drawFilter(ctx, width, height, filter, detectState) {
      const detected = detectState && detectState.detected > .55;
      const cx = detected ? width * (.5 + (detectState.x || 0) * .5) : width * .5;
      const cy = detected ? height * (.5 + (detectState.y || 0) * .45) : height * .46;
      const scale = detected ? clamp(detectState.s || .55, .32, .92) : .56;
      const faceW = width * scale;
      const faceH = height * scale;
      ctx.save();
      ctx.translate(cx, cy);
      if (detected) ctx.rotate((detectState.ry || 0) * .45);
      if (filter === 'soft-glow') {
        const grad = ctx.createRadialGradient(0, 0, faceW * .05, 0, 0, faceW * .7);
        grad.addColorStop(0, 'rgba(125,211,252,.20)');
        grad.addColorStop(1, 'rgba(192,132,252,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, faceW * .7, 0, Math.PI * 2); ctx.fill();
      }
      if (filter === 'neon-glasses') {
        ctx.lineWidth = Math.max(4, width * .008);
        ctx.strokeStyle = '#7dd3fc';
        ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 18;
        [-faceW * .16, faceW * .16].forEach(x => { ctx.beginPath(); ctx.roundRect(x - faceW * .14, -faceH * .08, faceW * .28, faceH * .13, 18); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(-faceW * .02, -faceH * .025); ctx.lineTo(faceW * .02, -faceH * .025); ctx.stroke();
      }
      if (filter === 'cat-ears') {
        ctx.fillStyle = 'rgba(12,16,25,.82)'; ctx.strokeStyle = '#c084fc'; ctx.lineWidth = Math.max(3, width * .006); ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 14;
        [[-faceW*.24, -faceH*.48, -faceW*.08], [faceW*.24, -faceH*.48, faceW*.08]].forEach(points => {
          const [x, y, inner] = points;
          ctx.beginPath(); ctx.moveTo(x - faceW*.14, y + faceH*.16); ctx.lineTo(x, y - faceH*.14); ctx.lineTo(x + faceW*.14, y + faceH*.16); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(244,114,182,.5)'; ctx.beginPath(); ctx.moveTo(inner - faceW*.07, y + faceH*.11); ctx.lineTo(inner, y - faceH*.02); ctx.lineTo(inner + faceW*.07, y + faceH*.11); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(12,16,25,.82)';
        });
      }
      if (filter === 'pixel-mask') {
        ctx.fillStyle = 'rgba(0,0,0,.62)';
        const size = Math.max(8, width * .025);
        for (let x = -faceW*.28; x < faceW*.28; x += size) {
          for (let y = -faceH*.18; y < faceH*.10; y += size) {
            if (Math.random() > .45) ctx.fillRect(x, y, size * .88, size * .88);
          }
        }
      }
      if (filter === 'void') {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.strokeStyle = '#86efac'; ctx.lineWidth = Math.max(3, width * .006); ctx.shadowColor = '#86efac'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.ellipse(0, -faceH*.02, faceW*.34, faceH*.42, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#86efac'; [-faceW*.12, faceW*.12].forEach(x => { ctx.beginPath(); ctx.ellipse(x, -faceH*.05, faceW*.045, faceH*.07, 0, 0, Math.PI*2); ctx.fill(); });
      }
      ctx.restore();
    }

    stopCamera() {
      if (this.face.raf) cancelAnimationFrame(this.face.raf);
      this.face.stream?.getTracks().forEach(track => track.stop());
      this.face.stream = null;
      const video = $('#os-face-video', this.root);
      if (video) video.srcObject = null;
      const canvas = $('#os-face-canvas', this.root);
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      this.toast('Face filter camera stopped.');
    }

    async captureFilterSnapshot() {
      const video = $('#os-face-video', this.root);
      const overlay = $('#os-face-canvas', this.root);
      if (!video || !overlay || !this.face.stream) return this.toast('Start the camera before sending a filtered snapshot.');
      const width = overlay.width || 720;
      const height = overlay.height || 720;
      const out = document.createElement('canvas');
      out.width = width; out.height = height;
      const ctx = out.getContext('2d');
      ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -width, 0, width, height); ctx.restore();
      ctx.drawImage(overlay, 0, 0, width, height);
      const dataUrl = out.toDataURL('image/png');
      await this.addAndSendMessage({ text: `Face filter snapshot: ${this.face.currentFilter}`, attachments: [{ id: uid('snapshot'), name: `face-filter-${this.face.currentFilter}.png`, type: 'image/png', dataUrl, sizeLabel: 'snapshot' }], links: [] });
    }

    async startCall(withVideo) {
      try {
        const raw = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo ? { facingMode: 'user' } : false });
        const audioOnly = new MediaStream(raw.getAudioTracks());
        const processed = this.buildProcessedAudioStream(audioOnly, this.voice.effect, false);
        const combined = new MediaStream([...processed.stream.getAudioTracks(), ...raw.getVideoTracks()]);
        const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
        combined.getTracks().forEach(track => pc.addTrack(track, combined));
        pc.ontrack = (event) => {
          this.call.remoteStream = event.streams[0];
          const remote = $('#os-remote-video', this.root);
          if (remote) remote.srcObject = this.call.remoteStream;
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) this.sendCallSignal({ type: 'candidate', candidate: event.candidate.toJSON() });
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.call = Object.assign(this.call, { pc, localStream: combined, rawStream: raw, processedContext: processed.context, active: true, video: withVideo, startedAt: new Date().toISOString(), lastSignal: offer });
        this.openCallOverlay();
        const local = $('#os-local-video', this.root);
        if (local) local.srcObject = combined;
        await this.sendCallSignal({ type: 'offer', description: offer, video: withVideo });
        await this.addAndSendMessage({ kind: 'system', authorId: 'system', text: `${withVideo ? 'Video' : 'Audio'} call started. Waiting for answer.`, signal: { type: 'offer', description: offer, video: withVideo }, attachments: [], links: [] });
        this.status.call = 'Call started; offer sent through messenger backend.';
      } catch (error) {
        this.toast(`Call failed: ${error.message}`);
      }
    }

    openCallOverlay() {
      const overlay = $('#os-call-overlay', this.root);
      if (overlay) overlay.classList.add('is-open');
      this.restoreLivePreviewReferences();
    }

    async sendCallSignal(signal) {
      const payload = Object.assign({ id: uid('signal'), channelId: this.storage.activeChannelId, authorId: this.storage.currentUserId, createdAt: new Date().toISOString(), signal }, twoPersonMeta(this.config, this.storage.currentUserId));
      try { await this.bridge.sendSignal(payload); }
      catch (error) { /* local fallback already handled by bridge */ }
      this.call.lastSignal = signal;
    }

    async answerSignalFromMessage(messageId) {
      const message = this.storage.messages.find(m => m.id === messageId);
      if (!message?.signal?.description) return;
      try {
        const raw = await navigator.mediaDevices.getUserMedia({ audio: true, video: message.signal.video || false });
        const processed = this.buildProcessedAudioStream(new MediaStream(raw.getAudioTracks()), this.voice.effect, false);
        const combined = new MediaStream([...processed.stream.getAudioTracks(), ...raw.getVideoTracks()]);
        const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE });
        combined.getTracks().forEach(track => pc.addTrack(track, combined));
        pc.ontrack = (event) => {
          this.call.remoteStream = event.streams[0];
          const remote = $('#os-remote-video', this.root);
          if (remote) remote.srcObject = this.call.remoteStream;
        };
        pc.onicecandidate = (event) => { if (event.candidate) this.sendCallSignal({ type: 'candidate', candidate: event.candidate.toJSON() }); };
        await pc.setRemoteDescription(new RTCSessionDescription(message.signal.description));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.call = Object.assign(this.call, { pc, localStream: combined, rawStream: raw, processedContext: processed.context, active: true, video: raw.getVideoTracks().length > 0, startedAt: new Date().toISOString(), lastSignal: answer });
        this.openCallOverlay();
        const local = $('#os-local-video', this.root);
        if (local) local.srcObject = combined;
        await this.sendCallSignal({ type: 'answer', description: answer });
        await this.addAndSendMessage({ kind: 'system', authorId: 'system', text: 'Call answered. Answer signal sent.', signal: { type: 'answer', description: answer }, attachments: [], links: [] });
      } catch (error) {
        this.toast(`Could not answer call: ${error.message}`);
      }
    }

    endCall() {
      this.call.pc?.close?.();
      this.call.localStream?.getTracks().forEach(track => track.stop());
      this.call.rawStream?.getTracks().forEach(track => track.stop());
      this.call.remoteStream?.getTracks().forEach(track => track.stop());
      this.call.processedContext?.close?.();
      this.call = { pc: null, localStream: null, remoteStream: null, active: false, video: false, startedAt: null };
      const overlay = $('#os-call-overlay', this.root);
      if (overlay) overlay.classList.remove('is-open');
      this.toast('Call ended.');
    }

    toggleMute() {
      this.storage.muted = !this.storage.muted;
      this.call.localStream?.getAudioTracks().forEach(track => { track.enabled = !this.storage.muted; });
      this.toast(this.storage.muted ? 'Microphone muted.' : 'Microphone unmuted.');
    }

    toggleVideoTrack() {
      const tracks = this.call.localStream?.getVideoTracks() || [];
      tracks.forEach(track => { track.enabled = !track.enabled; });
      this.toast(tracks.some(t => t.enabled) ? 'Video on.' : 'Video off.');
    }

    async copyCurrentSignal() {
      const signal = this.call.lastSignal;
      if (!signal) return this.toast('No call signal to copy yet.');
      await navigator.clipboard.writeText(JSON.stringify(signal));
      this.toast('Call signal copied.');
    }

    normalizeIncomingChannels(result) {
      const candidates = result?.channels || result?.data?.channels || result?.items || [];
      if (!Array.isArray(candidates)) return [];
      return candidates.map(item => Object.assign({
        id: normalizeId(item.id || item.title || item.name),
        title: item.title || item.name || 'Channel',
        icon: item.icon || '#️⃣',
        kind: 'channel',
        description: item.description || 'Shared private channel',
        createdAt: item.createdAt || new Date().toISOString()
      }, item, {
        kind: 'channel',
        serverId: this.config.serverId,
        participants: this.participantIds,
        visibleTo: this.participantIds
      })).filter(channel => channel.serverId === this.config.serverId || !channel.serverId);
    }

    async pollBackend() {
      try {
        const result = await this.bridge.listChannels({
          serverId: this.config.serverId,
          participants: this.participantIds,
          visibleTo: this.storage.currentUserId
        });
        const channels = this.normalizeIncomingChannels(result);
        let addedChannels = 0;
        channels.forEach(channel => {
          if (!this.storage.channels.some(existing => existing.id === channel.id)) {
            this.storage.channels.push(channel); addedChannels += 1;
          }
        });
        if (addedChannels) { this.save(); this.render(); }
      } catch (error) {
        // Channel listing is optional; locally created channels remain available.
      }

      try {
        const result = await this.bridge.listMessages({
          serverId: this.config.serverId,
          participants: this.participantIds,
          visibleTo: this.storage.currentUserId,
          since: this.storage.lastSyncAt
        });
        const incoming = this.normalizeIncomingMessages(result);
        let added = 0;
        incoming.forEach(message => {
          if (!this.storage.messages.some(existing => existing.id === message.id)) {
            this.storage.messages.push(message); added += 1;
          }
        });
        if (added) {
          this.storage.lastSyncAt = new Date().toISOString();
          this.save(); this.render();
        }
      } catch (error) {
        // Silent: local-first plug-in should not be noisy during CORS/backend setup.
      }

      try {
        const result = await this.bridge.listSignals({
          serverId: this.config.serverId,
          channelId: this.storage.activeChannelId,
          participants: this.participantIds,
          recipientId: this.storage.currentUserId,
          since: this.storage.lastSignalSyncAt
        });
        const signals = this.normalizeIncomingSignals(result);
        for (const item of signals) await this.processIncomingSignal(item);
        if (signals.length) {
          this.storage.lastSignalSyncAt = new Date().toISOString();
          this.save();
        }
      } catch (error) {
        // Call signaling is best-effort; copy-signal fallback remains available.
      }
    }

    normalizeIncomingMessages(result) {
      const candidates = result?.messages || result?.data?.messages || result?.items || [];
      if (!Array.isArray(candidates)) return [];
      return candidates.map(item => {
        const authorId = this.participantIds.includes(item.authorId || item.userId) || isSystemAuthor(this.config, item.authorId || item.userId)
          ? (item.authorId || item.userId)
          : 'system';
        return Object.assign({
          id: item.id || uid('remote'),
          channelId: item.channelId || item.channel || this.storage.activeChannelId,
          authorId,
          kind: item.kind || 'message',
          text: item.text || item.body || '',
          attachments: item.attachments || [],
          links: item.links || extractLinks(item.text || item.body || ''),
          createdAt: item.createdAt || new Date().toISOString()
        }, twoPersonMeta(this.config, authorId), item, { authorId });
      }).filter(item => {
        const visibleTo = Array.isArray(item.visibleTo) ? item.visibleTo : this.participantIds;
        return item.serverId === this.config.serverId || visibleTo.includes(this.storage.currentUserId) || this.participantIds.includes(item.authorId);
      });
    }

    normalizeIncomingSignals(result) {
      const candidates = result?.signals || result?.data?.signals || result?.items || [];
      if (!Array.isArray(candidates)) return [];
      return candidates.map(item => {
        const signal = item.signal || item.data?.signal || item;
        const authorId = item.authorId || item.userId || signal.authorId || 'remote';
        return Object.assign({
          id: item.id || signal.id || uid('remote_signal'),
          channelId: item.channelId || signal.channelId || this.storage.activeChannelId,
          authorId,
          createdAt: item.createdAt || signal.createdAt || new Date().toISOString(),
          signal
        }, item);
      }).filter(item => {
        const visibleTo = Array.isArray(item.visibleTo) ? item.visibleTo : this.participantIds;
        const recipients = Array.isArray(item.recipientId) ? item.recipientId : [item.recipientId].filter(Boolean);
        const meantForMe = visibleTo.includes(this.storage.currentUserId) || recipients.includes(this.storage.currentUserId) || !recipients.length;
        return meantForMe && item.authorId !== this.storage.currentUserId && !this.seenSignalIds.has(item.id);
      });
    }

    async processIncomingSignal(item) {
      this.seenSignalIds.add(item.id);
      const signal = item.signal || item;
      if (!signal || !signal.type) return;
      try {
        if (signal.type === 'offer') {
          const alreadyShown = this.storage.messages.some(message => message.signal?.description?.sdp === signal.description?.sdp);
          if (!alreadyShown) {
            this.storage.messages.push(Object.assign({
              id: uid('msg'),
              channelId: item.channelId || this.storage.activeChannelId,
              authorId: item.authorId,
              kind: 'system',
              text: `${this.config.users.find(user => user.id === item.authorId)?.label || 'The other member'} started a ${signal.video ? 'video' : 'audio'} call.`,
              createdAt: item.createdAt || new Date().toISOString(),
              attachments: [],
              links: [],
              signal
            }, twoPersonMeta(this.config, item.authorId)));
            this.save();
            this.render();
          }
          return;
        }
        if (signal.type === 'answer' && this.call.pc && !this.call.pc.currentRemoteDescription) {
          await this.call.pc.setRemoteDescription(new RTCSessionDescription(signal.description));
          this.status.call = 'Call connected.';
          this.toast('Call connected.');
          return;
        }
        if (signal.type === 'candidate' && this.call.pc && signal.candidate) {
          await this.call.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (error) {
        this.toast(`Call signal issue: ${error.message}`);
      }
    }

    async flushBackend() {
      const result = await this.bridge.flushQueue();
      this.setBackendStatus(`Queue sync complete. Sent ${result.sent || 0}; remaining ${result.remaining || 0}.`);
      this.render();
    }

    setBackendStatus(text) {
      this.status.backend = text;
      const el = $('#os-backend-status', this.root);
      if (el) el.textContent = text;
    }

    scrollMessagesToBottom() {
      requestAnimationFrame(() => {
        const messages = $('#os-messages', this.root);
        if (messages) messages.scrollTop = messages.scrollHeight;
      });
    }

    toast(text) {
      this.addSystemToast(text);
    }

    addSystemToast(text) {
      const toast = document.createElement('div');
      toast.textContent = text;
      toast.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2000;max-width:min(92%,520px);padding:10px 13px;border-radius:999px;background:rgba(15,23,42,.92);color:white;border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 50px rgba(0,0,0,.28);font:700 13px system-ui,sans-serif;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }

    exportChat() {
      const payload = {
        exportedAt: new Date().toISOString(),
        channel: this.activeChannel,
        messages: this.activeMessages,
        stickers: this.storage.stickers
      };
      const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
      downloadDataUrl(dataUrl, `ourspace-messenger-${this.activeChannel.id}.json`);
    }

    async copyInstallSnippet() {
      const snippet = `<link rel="stylesheet" href="ourspace_messenger_plugin/css/ourspace-messenger.css">
<div id="ourspace-messenger-root"></div>
<script src="ourspace_messenger_plugin/vendor/jeeliz/jeelizFaceFilter.js" defer><\/script>
<script src="ourspace_messenger_plugin/js/ourspace-backend-bridge.js" defer><\/script>
<script src="ourspace_messenger_plugin/js/ourspace-messenger.js" defer><\/script>
<script>window.addEventListener('DOMContentLoaded',function(){OurSpaceMessenger.init({mount:'#ourspace-messenger-root',appName:'OurSpace Messenger',serverId:'ourspace-william-jasper-private-server',twoPersonOnly:true,users:[{id:'william',label:'William',avatar:'🦖'},{id:'jasper',label:'Jasper',avatar:'🌙'},{id:'onyx',label:'Onyx Alerts',avatar:'🐈‍⬛',system:true}],defaultChannel:'home'});});<\/script>`;
      await navigator.clipboard.writeText(snippet);
      this.toast('Install snippet copied.');
    }
  }

  global.OurSpaceMessenger = {
    init(config) { return new MessengerApp(config || {}); },
    version: VERSION
  };
})(window);
