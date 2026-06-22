(function () {
  'use strict';

  const MAX_USERS = 10;
  const fallbackUsers = [
    { id: 'friend-1', label: 'Friend 1', avatar: '💬', status: 'online', mood: 'Around' },
    { id: 'friend-2', label: 'Friend 2', avatar: '🌟', status: 'away', mood: 'Checking messages' },
    { id: 'friend-3', label: 'Friend 3', avatar: '🎮', status: 'online', mood: 'Ready to hang out' }
  ];

  function safeId(value, fallback) {
    return String(value || fallback || 'friend').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || fallback || 'friend';
  }

  function initials(name) {
    return String(name || 'Friend').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || '💬';
  }

  function avatarFor(index, name) {
    const avatars = ['💬', '🌟', '🎮', '📸', '🎧', '✨', '🧩', '🐈‍⬛', '🦖', '🎲'];
    return avatars[index % avatars.length] || initials(name);
  }

  async function getSiteState() {
    try {
      if (window.SocialSharedBackend?.isEnabled?.()) {
        const result = await window.SocialSharedBackend.get('state');
        return result?.state || null;
      }
      const response = await fetch('api/state', { cache: 'no-store' });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function buildUsers(siteState, currentUser) {
    const seen = new Set();
    const users = [];
    function add(raw, index) {
      const label = raw.label || raw.name || 'Friend';
      const id = safeId(raw.id || raw.clientId || label, 'friend-' + index);
      if (seen.has(id) || users.length >= MAX_USERS) return;
      seen.add(id);
      users.push({
        id,
        label,
        avatar: raw.avatar || avatarFor(index, label),
        status: raw.status === 'offline' ? 'offline' : (raw.status === 'busy' || raw.status === 'away' || raw.status === 'online' ? raw.status : 'online'),
        mood: raw.mood || raw.activeGameTitle || raw.status || 'Around'
      });
    }
    add(currentUser, 0);
    (siteState?.onlineUsers || []).forEach((user, index) => add({
      id: user.clientId,
      label: user.name,
      status: 'online',
      mood: user.activeGameTitle ? 'Playing ' + user.activeGameTitle : user.status
    }, index + 1));
    (siteState?.profiles || []).forEach((profile, index) => add({
      id: profile.id,
      label: profile.name,
      status: 'away',
      mood: profile.status
    }, users.length + index + 1));
    fallbackUsers.forEach((user, index) => add(user, users.length + index + 1));
    return users.slice(0, MAX_USERS);
  }

  function buildRooms(siteState) {
    const rooms = [
      { id: 'friend-feed', label: 'Friend Feed', avatar: '📰' },
      { id: 'party-chat', label: 'Party Chat', avatar: '💬' },
      { id: 'game-lobby', label: 'Game Lobby', avatar: '🎮' },
      { id: 'camera-stories', label: 'Camera & Stories', avatar: '📸' },
      { id: 'table-call', label: 'Group Call', avatar: '📹' }
    ];
    const existing = new Set(rooms.map(room => room.id));
    Object.keys(siteState?.channels || {}).forEach((name) => {
      const id = safeId(name, 'channel');
      if (!existing.has(id)) {
        existing.add(id);
        rooms.push({ id, label: '# ' + name, avatar: '#' });
      }
    });
    return rooms;
  }

  async function initMessenger() {
    const root = document.querySelector('#messenger-plugin-root');
    if (!root || !window.MessengerPlugin) return;
    if (window.SocialSharedBackend?.isEnabled?.() && !window.SocialSharedBackend?.getSession?.() && !document.querySelector('#sharedBackendAuth:not(.hidden)')) {
      await window.SocialSharedBackend.ensureSession?.({ allowLocal: true }).catch(() => null);
    }
    const siteState = await getSiteState();
    const name = localStorage.getItem('socials.name') || document.querySelector('#displayName')?.value || 'Friend';
    const status = localStorage.getItem('socials.status') || document.querySelector('#displayStatus')?.value || 'Around';
    const currentUser = { id: safeId(name, 'me'), label: name, avatar: '💬', status: 'online', mood: status };
    const baseUrl = location.protocol === 'file:' ? '' : location.origin;
    const shared = window.SocialSharedBackend?.isEnabled?.();
    const sharedUrl = shared ? window.SocialSharedBackend.getBackendUrl() : '';
    const historyParams = shared ? new URLSearchParams({
      action: 'messengerHistory',
      projectId: window.SocialSharedBackend.getProjectId(),
      sessionToken: window.SocialSharedBackend.getSession()?.sessionToken || ''
    }).toString() : '';
    window.MessengerPlugin.init({
      mount: '#messenger-plugin-root',
      appName: 'Messenger Plug-in',
      maxCallParticipants: 10,
      currentUser,
      users: buildUsers(siteState, currentUser),
      rooms: buildRooms(siteState),
      httpEndpoint: shared ? sharedUrl : (baseUrl ? baseUrl + '/api/messenger/envelope' : ''),
      eventsEndpoint: shared ? '' : (baseUrl ? baseUrl + '/messenger-events' : ''),
      historyEndpoint: shared ? `${sharedUrl}?${historyParams}` : (baseUrl ? baseUrl + '/api/messenger/history' : '')
    });
  }

  window.addEventListener('DOMContentLoaded', initMessenger);
})();
