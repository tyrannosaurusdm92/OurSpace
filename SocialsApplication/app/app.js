(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
  const FILTERS = {
    normal: { css: 'none', canvas: 'none' },
    warm: { css: 'sepia(.16) saturate(1.22) brightness(1.04)', canvas: 'sepia(16%) saturate(122%) brightness(104%)' },
    cool: { css: 'saturate(1.25) hue-rotate(178deg) brightness(1.04)', canvas: 'saturate(125%) hue-rotate(178deg) brightness(104%)' },
    noir: { css: 'grayscale(1) contrast(1.2) brightness(.95)', canvas: 'grayscale(100%) contrast(120%) brightness(95%)' },
    vintage: { css: 'sepia(.42) contrast(1.08) saturate(.9)', canvas: 'sepia(42%) contrast(108%) saturate(90%)' },
    dream: { css: 'saturate(1.45) brightness(1.12) blur(.15px)', canvas: 'saturate(145%) brightness(112%) blur(.15px)' },
    cyber: { css: 'contrast(1.15) saturate(1.6) hue-rotate(145deg)', canvas: 'contrast(115%) saturate(160%) hue-rotate(145deg)' }
  };
  const OVERLAYS = {
    dog: [
      { type: 'image', src: 'assets/overlays/dog/ears.png', left: 27, top: 4, width: 48 },
      { type: 'image', src: 'assets/overlays/dog/nose.png', left: 42, top: 42, width: 16 },
      { type: 'image', src: 'assets/overlays/dog/tongue.png', left: 44, top: 56, width: 14 }
    ],
    glasses: [{ type: 'image', src: 'assets/overlays/fun/glasses.png', left: 30, top: 31, width: 40 }],
    hat: [{ type: 'image', src: 'assets/overlays/fun/hat.png', left: 30, top: 1, width: 42 }],
    mustache: [{ type: 'image', src: 'assets/overlays/fun/mustache.png', left: 39, top: 48, width: 22 }],
    rainbow: [{ type: 'image', src: 'assets/overlays/fun/rainbow.png', left: 17, top: 56, width: 66 }],
    flies: [
      { type: 'image', src: 'assets/overlays/flies/flies_00.png', left: 20, top: 15, width: 12, anim: 'flies' },
      { type: 'image', src: 'assets/overlays/flies/flies_01.png', left: 69, top: 22, width: 11, anim: 'flies' },
      { type: 'image', src: 'assets/overlays/flies/flies_02.png', left: 45, top: 10, width: 10, anim: 'flies' }
    ]
  };

  const state = {
    data: { profiles: [], channels: {}, feed: [], stories: [], events: [] },
    activeChannel: localStorage.getItem('socials.activeChannel') || 'general',
    gallery: [],
    selectedOverlay: null,
    stream: null,
    facingMode: 'user',
    recorder: null,
    chunks: [],
    recording: false,
    lastCapture: null,
    room: {
      name: '', room: '', pass: '', peerId: '', localStream: null, screenTrack: null, eventSource: null,
      participants: new Map(), peers: new Map(), startTime: 0, timer: null, heartbeat: null,
      messages: [], transcript: [], mediaRecorder: null, recordedChunks: [], recognition: null, captionsRunning: false, handRaised: false
    }
  };

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 3600);
  }

  async function api(path, options = {}) {
    if (window.SocialSharedBackend?.isEnabled?.()) {
      const shared = await window.SocialSharedBackend.api(path, options);
      if (shared) return shared;
    }
    const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  }
  const postJson = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
  const slug = value => String(value || 'general').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'general';
  const me = () => ($('#displayName').value.trim() || 'Friend').slice(0, 80);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = value => new Date(value || Date.now()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const fmtTime = ms => { const sec = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
  const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase() || '').join('') || '?';

  const PROFILE_LAYOUT_MARKER = '[[SOCIALS_PROFILE_LAYOUT_V1]]';
  const MYSPACE_PROFILE_KEY = 'socials.myspaceProfile.v1';
  const PASSWORD_HELP_KEY = 'socials.passwordHelp.v1';

  function getVisibleFeedPosts() {
    return (state.data.feed || []).filter(post => !isProfileDesignPost(post));
  }

  function isProfileDesignPost(post) {
    return String(post?.text || '').startsWith(PROFILE_LAYOUT_MARKER);
  }

  function parseProfileDesignPost(post) {
    if (!isProfileDesignPost(post)) return null;
    try {
      const parsed = JSON.parse(String(post.text || '').slice(PROFILE_LAYOUT_MARKER.length));
      parsed.author = parsed.name || post.author || parsed.author || 'Friend';
      parsed.updatedAt = parsed.updatedAt || post.createdAt || new Date().toISOString();
      return parsed;
    } catch {
      return null;
    }
  }

  function loadLocalMyspaceProfile() {
    try { return JSON.parse(localStorage.getItem(MYSPACE_PROFILE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveLocalMyspaceProfile(profile) {
    localStorage.setItem(MYSPACE_PROFILE_KEY, JSON.stringify(profile || {}));
  }

  function collectProfileDesigns() {
    const designs = new Map();
    for (const p of state.data.profiles || []) {
      if (p?.name) designs.set(String(p.name).toLowerCase(), {
        name: p.name,
        status: p.status || 'Around',
        color: p.color || '#38bdf8',
        headline: `${p.status || 'Around'}`,
        about: 'This friend has not published a custom profile layout yet.',
        layoutCode: '',
        mediaTitle: '',
        mediaUrl: '',
        updatedAt: ''
      });
    }
    for (const post of state.data.feed || []) {
      const design = parseProfileDesignPost(post);
      if (!design?.author) continue;
      const key = String(design.author).toLowerCase();
      const existing = designs.get(key);
      if (!existing || String(design.updatedAt || '').localeCompare(String(existing.updatedAt || '')) >= 0) {
        designs.set(key, { ...existing, ...design, name: design.author || design.name });
      }
    }
    const local = loadLocalMyspaceProfile();
    if (local?.name) designs.set(String(local.name).toLowerCase(), { ...designs.get(String(local.name).toLowerCase()), ...local });
    return designs;
  }

  function currentMyspaceDesign() {
    return {
      name: me(),
      status: $('#displayStatus')?.value.trim() || 'Around',
      headline: $('#myspaceHeadline')?.value.trim() || 'Mood: online',
      about: $('#myspaceAbout')?.value.trim() || '',
      color: $('#myspaceProfileColor')?.value || '#ff66cc',
      mediaTitle: $('#myspaceMediaTitle')?.value.trim() || '',
      mediaUrl: $('#myspaceMediaUrl')?.value.trim() || '',
      layoutCode: $('#myspaceLayoutCode')?.value || '',
      updatedAt: new Date().toISOString()
    };
  }

  function packMyspaceDesignForBackend(design) {
    const maxChars = 3900 - PROFILE_LAYOUT_MARKER.length;
    const packed = { ...design };
    let json = JSON.stringify(packed);
    if (json.length <= maxChars) return { design: packed, truncated: false };
    const overflow = json.length - maxChars;
    packed.layoutCode = String(packed.layoutCode || '').slice(0, Math.max(0, String(packed.layoutCode || '').length - overflow - 240));
    json = JSON.stringify(packed);
    if (json.length > maxChars) {
      const extra = json.length - maxChars;
      packed.about = String(packed.about || '').slice(0, Math.max(0, String(packed.about || '').length - extra - 120));
    }
    return { design: packed, truncated: true };
  }

  function safeText(value, fallback = '') {
    return esc(String(value ?? fallback));
  }

  function sanitizeMyspaceLayoutCode(code) {
    let clean = String(code || '');
    clean = clean.replace(/<script\b[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '');
    clean = clean.replace(/<object\b[\s\S]*?<\/object>/gi, '');
    clean = clean.replace(/<embed\b[\s\S]*?>/gi, '');
    clean = clean.replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');
    clean = clean.replace(/javascript\s*:/gi, '');
    clean = clean.replace(/data:text\/html/gi, '');
    if (!/<[a-z][\s\S]*>/i.test(clean) && clean.trim()) clean = `<style>${clean}</style>`;
    return clean;
  }

  function profileMediaMarkup(design) {
    const url = String(design.mediaUrl || '').trim();
    if (!url) return '<div class="media-player empty">No profile song selected.</div>';
    const title = safeText(design.mediaTitle || 'Profile media');
    const safeUrl = safeText(url);
    if (/\.(mp3|m4a|ogg|wav)(\?.*)?$/i.test(url)) {
      return `<div class="media-player"><b>${title}</b><audio controls src="${safeUrl}"></audio></div>`;
    }
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
      return `<div class="media-player"><b>${title}</b><video controls src="${safeUrl}"></video></div>`;
    }
    return `<div class="media-player"><b>${title}</b><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></div>`;
  }

  function buildMyspaceProfileDoc(design = {}, posts = []) {
    const color = /^#[0-9a-f]{6}$/i.test(String(design.color || '')) ? design.color : '#ff66cc';
    const name = safeText(design.name || 'Friend');
    const status = safeText(design.status || 'Around');
    const headline = safeText(design.headline || 'Mood: online');
    const about = safeText(design.about || 'No About Me yet.').replace(/\n/g, '<br>');
    const layoutCode = sanitizeMyspaceLayoutCode(design.layoutCode);
    const layoutStyles = (layoutCode.match(/<style\b[\s\S]*?<\/style>/gi) || []).join('\n');
    const layoutHtml = layoutCode.replace(/<style\b[\s\S]*?<\/style>/gi, '').trim();
    const postItems = posts.slice(0, 8).map(post => `<li><b>${safeText(fmt(post.createdAt))}</b><br>${safeText(post.text || '').replace(/\n/g, '<br>')}</li>`).join('') || '<li>No public posts yet.</li>';
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
      :root{--accent:${color};font-family:Verdana,Arial,sans-serif;color:#111;background:#dbeafe}
      body{margin:0;background:linear-gradient(90deg,#003399 0 16px,#fff 16px calc(100% - 16px),#ff6600 calc(100% - 16px));font-size:12px}
      a{color:#003399;font-weight:bold}.page{max-width:840px;margin:0 auto;padding:10px;background:#fff;min-height:100vh}
      .top{background:#003399;color:#fff;padding:8px 10px;border:2px solid #001a66;display:flex;justify-content:space-between;gap:8px;align-items:center}
      h1{font-size:24px;margin:0;color:#fff;text-shadow:2px 2px 0 #000}.online{color:#00ff66;font-weight:bold;text-transform:uppercase}
      .grid{display:grid;grid-template-columns:220px 1fr;gap:10px;margin-top:10px}.box{border:2px solid #6699cc;background:#f2f8ff;margin-bottom:10px}
      .box h2{margin:0;background:#ffcc99;color:#003366;font-size:13px;padding:5px;border-bottom:2px solid #6699cc;text-transform:uppercase}
      .box .inside{padding:8px}.pfp{height:160px;background:radial-gradient(circle,var(--accent),#003399);display:grid;place-items:center;color:#fff;font-size:48px;font-weight:bold;border:4px ridge #fff}
      .contact{display:grid;grid-template-columns:1fr 1fr;gap:4px}.contact span{background:#e6f0ff;border:1px solid #99bbee;padding:4px;text-align:center}
      .media-player{border:2px inset #888;background:#000;color:#00ff66;padding:7px;font-family:"Courier New",monospace}.media-player audio,.media-player video{width:100%;margin-top:5px}
      .blurbs{background:#fffbe6}.friend-posts ul{margin:0;padding-left:18px}.friend-posts li{margin-bottom:8px}
      .custom-zone{border:2px dashed var(--accent);background:#fff;margin-top:10px;padding:8px;min-height:40px}
      @media(max-width:640px){.grid{grid-template-columns:1fr}.top{display:block}}
    </style>${layoutStyles}</head><body><div class="page">
      <div class="top"><h1>${name}</h1><div><span class="online">Online Now!</span><br>${status}</div></div>
      <div class="grid">
        <aside>
          <div class="box"><h2>${name}'s Profile</h2><div class="inside"><div class="pfp">${safeText(initials(design.name || 'F'))}</div><p><b>${headline}</b></p></div></div>
          <div class="box"><h2>Contacting ${name}</h2><div class="inside contact"><span>Message</span><span>Add Comment</span><span>Forward</span><span>Favorite</span></div></div>
          <div class="box"><h2>Music</h2><div class="inside">${profileMediaMarkup(design)}</div></div>
        </aside>
        <main>
          <div class="box blurbs"><h2>${name}'s Blurbs</h2><div class="inside"><b>About me:</b><p>${about}</p></div></div>
          <div class="box friend-posts"><h2>${name}'s Latest Posts</h2><div class="inside"><ul>${postItems}</ul></div></div>
          <div class="custom-zone">${layoutHtml || '<b>Custom layout zone</b>'}</div>
        </main>
      </div>
    </div></body></html>`;
  }

  function refreshMyspacePreview() {
    const frame = $('#myspacePreview');
    if (!frame) return;
    const posts = getVisibleFeedPosts().filter(post => String(post.author || '').toLowerCase() === me().toLowerCase());
    frame.srcdoc = buildMyspaceProfileDoc(currentMyspaceDesign(), posts);
  }

  async function publishMyspaceDesign() {
    const design = currentMyspaceDesign();
    saveLocalMyspaceProfile(design);
    const packed = packMyspaceDesignForBackend(design);
    await postJson('/api/profile', { id: slug(design.name), name: design.name, status: design.status, color: design.color });
    await postJson('/api/post', { author: design.name, text: PROFILE_LAYOUT_MARKER + JSON.stringify(packed.design) });
    toast(packed.truncated ? 'Profile published. Very long layout code was trimmed for backend sharing, but the full version stayed saved in this browser.' : 'Profile and MySpace layout published.');
    await loadState().catch(err => toast(err.message));
  }

  function profilePostCard(post) {
    const card = document.createElement('article');
    card.className = 'post';
    card.innerHTML = `<div class="post-head"><button class="profile-link" type="button">${esc(post.author)}</button><span>${fmt(post.createdAt)}</span></div>${post.text ? `<div class="post-body">${esc(post.text)}</div>` : ''}`;
    $('.profile-link', card)?.addEventListener('click', () => openRetroProfile(post.author));
    const media = mediaElement(post);
    if (media) card.appendChild(media);
    card.appendChild(reactionRow('post', post));
    return card;
  }

  function openRetroProfile(name) {
    const key = String(name || '').toLowerCase();
    const designs = collectProfileDesigns();
    const design = designs.get(key) || { name, status: 'Around', headline: 'Profile', about: 'No profile published yet.', color: '#38bdf8' };
    const posts = getVisibleFeedPosts().filter(post => String(post.author || '').toLowerCase() === key);
    $('#profileViewTitle').textContent = `${design.name || name}'s Profile`;
    $('#profileViewFrame').srcdoc = buildMyspaceProfileDoc(design, posts);
    const list = $('#profilePostList');
    list.innerHTML = '';
    if (!posts.length) list.innerHTML = '<article class="post"><strong>No public posts yet.</strong></article>';
    else posts.slice(0, 12).forEach(post => list.appendChild(profilePostCard(post)));
    $('#profileView').hidden = false;
    $('#profileView').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  function fileToDataUrl(file) {
    if (!file) return Promise.resolve({ media: '', mediaType: '' });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.onload = () => resolve({ media: reader.result, mediaType: file.type || '' });
      reader.readAsDataURL(file);
    });
  }

  function downloadText(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function mediaElement(item) {
    if (!item?.media) return null;
    const type = item.mediaType || '';
    const el = document.createElement(type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : 'img');
    el.className = `media ${el.tagName === 'IMG' ? 'image' : el.tagName === 'VIDEO' ? 'video' : 'audio'}`;
    if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') el.controls = true;
    el.src = item.media;
    return el;
  }

  function bindMainTabs() {
    $$('.tab').forEach(btn => btn.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.toggle('active', x === btn));
      $$('.panel').forEach(p => p.classList.toggle('active-panel', p.id === btn.dataset.tab));
    }));
  }

  async function loadState() {
    state.data = await api('/api/state');
    renderAll();
  }

  function connectSocialEvents() {
    if (window.SocialSharedBackend?.isEnabled?.()) {
      state.sharedStateStop?.();
      state.sharedStateStop = window.SocialSharedBackend.startStatePolling((nextState) => {
        state.data = nextState;
        renderAll();
      }, (error) => toast(error.message || 'Shared backend polling warning.'));
      return;
    }
    try {
      const es = new EventSource('/events');
      es.addEventListener('state', event => { state.data = JSON.parse(event.data); renderAll(); });
      es.onerror = () => {};
    } catch {}
  }

  function renderAll() {
    renderProfiles();
    renderFeed();
    renderChannels();
    renderMessages();
    renderStories();
    renderEvents();
  }

    function renderProfiles() {
    const root = $('#profiles');
    if (!root) return;
    root.innerHTML = '';
    const designs = collectProfileDesigns();
    const seen = new Set();
    const people = [];
    for (const p of state.data.profiles || []) people.push({ name: p.name, status: p.status, color: p.color });
    for (const design of designs.values()) people.push({ name: design.name, status: design.status, color: design.color });
    for (const p of people) {
      if (!p?.name) continue;
      const key = String(p.name).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'profile retro-profile-button';
      card.innerHTML = `<span class="dot" style="background:${esc(p.color || '#38bdf8')}">${esc(initials(p.name))}</span><div><strong>${esc(p.name)}</strong><div class="hint">${esc(p.status || 'Around')}</div></div>`;
      card.addEventListener('click', () => openRetroProfile(p.name));
      root.appendChild(card);
    }
    if (!root.children.length) root.innerHTML = '<article class="profile"><span class="dot">?</span><div><strong>No profiles yet</strong><div class="hint">Sign in and publish yours.</div></div></article>';
    refreshMyspacePreview();
  }

  function renderFeed() {
    const list = $('#feedList');
    if (!list) return;
    list.innerHTML = '';
    const posts = getVisibleFeedPosts();
    if (!posts.length) {
      list.innerHTML = '<div class="post"><strong>No posts yet.</strong><p class="hint">Share the first update above.</p></div>';
      return;
    }
    for (const post of posts) {
      const card = profilePostCard(post);
      const comments = document.createElement('div');
      comments.className = 'comments';
      for (const c of post.comments || []) {
        const row = document.createElement('div');
        row.className = 'comment';
        row.innerHTML = `<button class="comment-author profile-link" type="button">${esc(c.author)}</button>: ${esc(c.text)}`;
        $('.profile-link', row)?.addEventListener('click', () => openRetroProfile(c.author));
        comments.appendChild(row);
      }
      const form = document.createElement('form');
      form.className = 'comment-row';
      form.innerHTML = '<input maxlength="1200" placeholder="Comment"><button class="secondary">Reply</button>';
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const text = $('input', form).value.trim();
        if (!text) return;
        await postJson('/api/comment', { postId: post.id, author: me(), text }).catch(err => toast(err.message));
        $('input', form).value = '';
      });
      card.append(comments, form);
      list.appendChild(card);
    }
    refreshMyspacePreview();
  }


  function reactionRow(type, item) {
    const row = document.createElement('div');
    row.className = 'react-row';
    const counts = {};
    for (const r of item.reactions || []) counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    for (const emoji of ['💙', '👍', '😂', '🎉', '☕']) {
      const btn = document.createElement('button');
      btn.className = 'reaction';
      btn.type = 'button';
      btn.textContent = `${emoji}${counts[emoji] ? ` ${counts[emoji]}` : ''}`;
      btn.addEventListener('click', () => postJson('/api/reaction', { type, id: item.id, author: me(), reaction: emoji }).catch(err => toast(err.message)));
      row.appendChild(btn);
    }
    return row;
  }

  function renderChannels() {
    const root = $('#channelButtons');
    root.innerHTML = '';
    const channels = Object.keys(state.data.channels || { general: [] }).sort();
    if (!channels.includes(state.activeChannel)) state.activeChannel = channels[0] || 'general';
    $('#activeChannelTitle').textContent = `# ${state.activeChannel}`;
    for (const channel of channels) {
      const btn = document.createElement('button');
      btn.className = `channel-btn ${channel === state.activeChannel ? 'active' : ''}`;
      btn.textContent = `# ${channel}`;
      btn.addEventListener('click', () => { state.activeChannel = channel; localStorage.setItem('socials.activeChannel', channel); renderChannels(); renderMessages(); });
      root.appendChild(btn);
    }
  }

  function renderMessages() {
    const list = $('#messageList');
    const messages = (state.data.channels || {})[state.activeChannel] || [];
    list.innerHTML = '';
    if (!messages.length) {
      list.innerHTML = '<article class="message"><div class="msg-head"><strong>system</strong></div>No messages in this channel yet.</article>';
      return;
    }
    for (const msg of messages) {
      const card = document.createElement('article');
      card.className = `message ${msg.author === me() ? 'mine' : ''}`;
      card.innerHTML = `<div class="msg-head"><strong>${esc(msg.author)}</strong><span>${fmt(msg.createdAt)}${msg.origin ? ` · ${esc(msg.origin)}` : ''}</span></div>${msg.text ? `<div class="msg-body">${esc(msg.text)}</div>` : ''}`;
      const media = mediaElement(msg);
      if (media) card.appendChild(media);
      card.appendChild(reactionRow('message', msg));
      list.appendChild(card);
    }
    list.scrollTop = list.scrollHeight;
  }

  function renderStories() {
    const root = $('#stories');
    root.innerHTML = '';
    const stories = state.data.stories || [];
    if (!stories.length) {
      root.innerHTML = '<article class="story"><strong>No active stories.</strong><p class="hint">Capture a photo and share it as a story.</p></article>';
      return;
    }
    for (const story of stories) {
      const card = document.createElement('article');
      card.className = 'story';
      const min = Math.max(0, Math.round((story.expiresAt - Date.now()) / 60000));
      card.innerHTML = `<div class="post-head"><strong>${esc(story.author)}</strong><span>expires in ${min}m</span></div>${story.text ? `<div class="post-body">${esc(story.text)}</div>` : ''}`;
      const media = mediaElement(story);
      if (media) card.appendChild(media);
      card.appendChild(reactionRow('story', story));
      root.appendChild(card);
    }
  }


  function renderEvents() {
    const list = $('#eventsList');
    if (!list) return;
    const events = (state.data.events || []).slice().sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
    list.innerHTML = '';
    if (!events.length) {
      list.innerHTML = '<article class="post"><strong>No events yet.</strong><p class="hint">Add the first shared calendar item above.</p></article>';
      return;
    }
    for (const item of events) {
      const card = document.createElement('article');
      card.className = 'post event-card';
      card.innerHTML = `<div class="post-head"><strong>${esc(item.title || 'Untitled event')}</strong><span>${esc(item.start || '')}</span></div>
        ${item.end ? `<div class="hint">Ends: ${esc(item.end)}</div>` : ''}
        ${item.location ? `<div class="hint">Location: ${esc(item.location)}</div>` : ''}
        ${item.description ? `<div class="post-body">${esc(item.description)}</div>` : ''}
        <div class="row wrap"><button class="danger" type="button" data-delete-event="${esc(item.id)}">Delete</button></div>`;
      const del = card.querySelector('[data-delete-event]');
      del?.addEventListener('click', async () => {
        await postJson('/api/event', { operation: 'delete', id: item.id }).catch(err => toast(err.message));
        await loadState().catch(err => toast(err.message));
      });
      list.appendChild(card);
    }
  }

    function bindSocialForms() {
    const localProfile = loadLocalMyspaceProfile();
    const session = window.SocialSharedBackend?.getSession?.() || {};
    $('#displayName').value = localProfile.name || session.displayName || localStorage.getItem('socials.name') || 'Friend';
    $('#displayStatus').value = localProfile.status || localStorage.getItem('socials.status') || 'Around';
    $('#myspaceHeadline').value = localProfile.headline || localStorage.getItem('socials.myspaceHeadline') || 'Mood: nostalgic';
    $('#myspaceAbout').value = localProfile.about || localStorage.getItem('socials.myspaceAbout') || '';
    $('#myspaceProfileColor').value = localProfile.color || localStorage.getItem('socials.myspaceColor') || '#ff66cc';
    $('#myspaceMediaTitle').value = localProfile.mediaTitle || localStorage.getItem('socials.myspaceMediaTitle') || '';
    $('#myspaceMediaUrl').value = localProfile.mediaUrl || localStorage.getItem('socials.myspaceMediaUrl') || '';
    $('#myspaceLayoutCode').value = localProfile.layoutCode || localStorage.getItem('socials.myspaceLayoutCode') || '';
    if ($('#roomName')) $('#roomName').value = $('#displayName').value;
    refreshMyspacePreview();

    ['displayName','displayStatus','myspaceHeadline','myspaceAbout','myspaceProfileColor','myspaceMediaTitle','myspaceMediaUrl','myspaceLayoutCode'].forEach(id => {
      const el = $('#' + id);
      el?.addEventListener('input', () => {
        const design = currentMyspaceDesign();
        saveLocalMyspaceProfile(design);
        localStorage.setItem('socials.name', design.name);
        localStorage.setItem('socials.status', design.status);
        localStorage.setItem('socials.myspaceHeadline', design.headline);
        localStorage.setItem('socials.myspaceAbout', design.about);
        localStorage.setItem('socials.myspaceColor', design.color);
        localStorage.setItem('socials.myspaceMediaTitle', design.mediaTitle);
        localStorage.setItem('socials.myspaceMediaUrl', design.mediaUrl);
        localStorage.setItem('socials.myspaceLayoutCode', design.layoutCode);
        refreshMyspacePreview();
      });
    });

    $('#saveProfile').addEventListener('click', async () => {
      localStorage.setItem('socials.name', me());
      localStorage.setItem('socials.status', $('#displayStatus').value.trim() || 'Around');
      if ($('#roomName')) $('#roomName').value = me();
      await publishMyspaceDesign().catch(err => toast(err.message));
    });
    $('#previewMyspaceLayout')?.addEventListener('click', refreshMyspacePreview);
    $('#closeProfileView')?.addEventListener('click', () => { $('#profileView').hidden = true; });
    $('#refreshState').addEventListener('click', () => loadState().catch(err => toast(err.message)));
    $('#postForm').addEventListener('submit', async event => {
      event.preventDefault();
      const text = $('#postText').value.trim();
      const file = $('#postFile').files?.[0];
      const media = await fileToDataUrl(file).catch(err => (toast(err.message), {}));
      if (!text && !media.media) return;
      await postJson('/api/post', { author: me(), text, ...media }).catch(err => toast(err.message));
      $('#postText').value = ''; $('#postFile').value = '';
      await loadState().catch(err => toast(err.message));
    });
    $('#messageForm').addEventListener('submit', async event => {
      event.preventDefault();
      const text = $('#messageInput').value.trim();
      const file = $('#messageFile').files?.[0];
      const media = await fileToDataUrl(file).catch(err => (toast(err.message), {}));
      if (!text && !media.media) return;
      await postJson('/api/messages', { channel: state.activeChannel, author: me(), text, ...media }).catch(err => toast(err.message));
      $('#messageInput').value = ''; $('#messageFile').value = '';
      await loadState().catch(err => toast(err.message));
    });
    $('#newChannelForm').addEventListener('submit', event => {
      event.preventDefault();
      const channel = slug($('#newChannelName').value);
      state.data.channels[channel] ||= [];
      state.activeChannel = channel;
      $('#newChannelName').value = '';
      renderChannels(); renderMessages();
    });
    $('#exportChat').addEventListener('click', () => downloadText(`socials-${state.activeChannel}.json`, JSON.stringify({ channel: state.activeChannel, messages: state.data.channels[state.activeChannel] || [] }, null, 2)));
    $('#exportData').addEventListener('click', async () => {
      const all = await postJson('/api/export', {}).catch(err => (toast(err.message), null));
      if (all) downloadText('socials-application-export.json', JSON.stringify(all, null, 2));
    });
    $('#importHistory').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const history = JSON.parse(await file.text());
      const result = await postJson('/api/import/history', { channel: state.activeChannel || 'imports', history }).catch(err => (toast(err.message), null));
      if (result) toast(`Imported ${result.imported} message(s).`);
      e.target.value = '';
    });
  }


  function bindCamera() {
    $('#startCamera').addEventListener('click', startCamera);
    $('#switchCamera').addEventListener('click', async () => { state.facingMode = state.facingMode === 'user' ? 'environment' : 'user'; await startCamera(); });
    $('#flashBtn').addEventListener('click', flash);
    $('#capturePhoto').addEventListener('click', capturePhoto);
    $('#recordVideo').addEventListener('click', toggleRecord);
    $('#mediaFile').addEventListener('change', loadLocalMedia);
    $('#colorFilter').addEventListener('change', applyFilter);
    $$('.chip').forEach(btn => btn.addEventListener('click', () => addPreset(btn.dataset.preset)));
    $('#addTextSticker').addEventListener('click', () => { const text = $('#textStickerInput').value.trim(); if (text) { addText(text); $('#textStickerInput').value = ''; } });
    $('#clearOverlays').addEventListener('click', () => { $('#overlayLayer').innerHTML = ''; state.selectedOverlay = null; });
    $('#deleteOverlay').addEventListener('click', () => { state.selectedOverlay?.remove(); state.selectedOverlay = null; });
    $('#growOverlay').addEventListener('click', () => scaleSelected(1.15));
    $('#shrinkOverlay').addEventListener('click', () => scaleSelected(.87));
    $('#rotateOverlay').addEventListener('click', () => rotateSelected(12));
    $('#shareStory').addEventListener('click', () => shareCapture('story'));
    $('#shareFeed').addEventListener('click', () => shareCapture('feed'));
    $('#clearGallery').addEventListener('click', () => { if (confirm('Clear local gallery?')) { state.gallery = []; saveGallery(); renderGallery(); } });
    applyFilter(); loadGallery(); renderGallery();
    window.addEventListener('beforeunload', stopCamera);
  }

  async function startCamera() {
    stopCamera();
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: state.facingMode, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false });
      const video = $('#cameraVideo');
      video.srcObject = state.stream;
      video.style.display = 'block';
      document.documentElement.style.setProperty('--mirror', state.facingMode === 'user' ? '-1' : '1');
      $('#fallbackDrop').style.display = 'none';
      $('.loaded-media', $('#stage'))?.remove();
    } catch (err) {
      $('#fallbackDrop').style.display = 'grid';
      $('#fallbackDrop').innerHTML = `<strong>Camera unavailable.</strong><span>${esc(err.message || 'Permission denied or unsupported browser.')}</span>`;
    }
  }
  function stopCamera() { state.stream?.getTracks().forEach(t => t.stop()); state.stream = null; }
  function applyFilter() { $('#stage').style.setProperty('--filter-css', (FILTERS[$('#colorFilter').value] || FILTERS.normal).css); }
  function flash() { const el = $('#screenFlash'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  function loadLocalMedia(evt) {
    const file = evt.target.files?.[0]; if (!file) return;
    stopCamera(); $('#cameraVideo').srcObject = null; $('#cameraVideo').style.display = 'none'; $('.loaded-media', $('#stage'))?.remove();
    const url = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
    if (media.tagName === 'VIDEO') { media.autoplay = true; media.loop = true; media.muted = true; media.playsInline = true; }
    media.src = url; media.className = 'loaded-media'; media.style.filter = 'var(--filter-css, none)';
    $('#stage').insertBefore(media, $('#overlayLayer'));
    $('#fallbackDrop').style.display = 'none';
  }
  function addPreset(name) { (OVERLAYS[name] || []).forEach(addOverlay); }
  function addOverlay(spec) {
    const el = document.createElement('div');
    el.className = 'overlay-item'; el.dataset.kind = 'image'; el.dataset.src = spec.src;
    if (spec.anim) el.dataset.anim = spec.anim;
    el.style.left = `${spec.left ?? 40}%`; el.style.top = `${spec.top ?? 35}%`; el.style.width = `${spec.width ?? 24}%`;
    const img = document.createElement('img'); img.src = spec.src; img.alt = ''; img.draggable = false; el.appendChild(img);
    makeDraggable(el); $('#overlayLayer').appendChild(el); selectOverlay(el);
  }
  function addText(text) {
    const el = document.createElement('div');
    el.className = 'overlay-item text'; el.dataset.kind = 'text'; el.textContent = text; el.style.left = '25%'; el.style.top = '70%'; el.style.width = '50%';
    makeDraggable(el); $('#overlayLayer').appendChild(el); selectOverlay(el);
  }
  function makeDraggable(el) {
    el.addEventListener('pointerdown', evt => {
      evt.preventDefault(); selectOverlay(el);
      const box = $('#overlayLayer').getBoundingClientRect();
      const start = { x: evt.clientX, y: evt.clientY, left: el.offsetLeft, top: el.offsetTop };
      el.setPointerCapture(evt.pointerId);
      const move = ev => {
        const x = Math.max(0, Math.min(box.width - el.offsetWidth, start.left + ev.clientX - start.x));
        const y = Math.max(0, Math.min(box.height - el.offsetHeight, start.top + ev.clientY - start.y));
        el.style.left = `${x / box.width * 100}%`; el.style.top = `${y / box.height * 100}%`;
      };
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
    });
  }
  function selectOverlay(el) { $$('.overlay-item', $('#overlayLayer')).forEach(x => x.classList.toggle('selected', x === el)); state.selectedOverlay = el; }
  function scaleSelected(multiplier) { if (!state.selectedOverlay) return; const cur = parseFloat(state.selectedOverlay.style.width || '20'); state.selectedOverlay.style.width = `${Math.max(5, Math.min(95, cur * multiplier))}%`; }
  function rotateSelected(deg) { if (!state.selectedOverlay) return; const cur = parseFloat(state.selectedOverlay.dataset.rot || '0') + deg; state.selectedOverlay.dataset.rot = cur; state.selectedOverlay.style.setProperty('--rot', `${cur}deg`); }

  function activeVisualSource() { return $('.loaded-media', $('#stage')) || $('#cameraVideo'); }
  async function renderToCanvas(canvas) {
    const source = activeVisualSource();
    const rect = $('#stage').getBoundingClientRect();
    const width = source.videoWidth || source.naturalWidth || rect.width || 720;
    const height = source.videoHeight || source.naturalHeight || rect.height || 1280;
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.save(); ctx.filter = (FILTERS[$('#colorFilter').value] || FILTERS.normal).canvas;
    if (source.tagName === 'VIDEO' && state.facingMode === 'user' && source === $('#cameraVideo')) { ctx.translate(width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, 0, 0, width, height); ctx.restore();
    await drawOverlays(ctx, width, height);
  }
  async function drawOverlays(ctx, canvasW, canvasH) {
    const layerRect = $('#overlayLayer').getBoundingClientRect();
    const scaleX = canvasW / layerRect.width; const scaleY = canvasH / layerRect.height;
    for (const el of $$('.overlay-item', $('#overlayLayer'))) {
      const x = el.offsetLeft * scaleX, y = el.offsetTop * scaleY, w = el.offsetWidth * scaleX, h = el.offsetHeight * scaleY;
      const rot = (parseFloat(el.dataset.rot || '0') * Math.PI) / 180;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot);
      if (el.dataset.kind === 'text') {
        const fontSize = Math.max(26, h || canvasH * .055);
        ctx.font = `900 ${fontSize}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(4, fontSize * .1); ctx.strokeStyle = 'black'; ctx.fillStyle = 'white';
        wrapText(ctx, el.textContent, 0, 0, Math.min(canvasW * .82, w || canvasW * .6), fontSize * 1.12);
      } else {
        const img = $('img', el); if (img?.complete) ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/), lines = []; let line = '';
    for (const word of words) { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test; }
    lines.push(line); const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((ln, i) => { ctx.strokeText(ln, x, startY + i * lineHeight); ctx.fillText(ln, x, startY + i * lineHeight); });
  }
  async function capturePhoto() {
    const canvas = document.createElement('canvas'); await renderToCanvas(canvas);
    const dataUrl = canvas.toDataURL('image/png');
    state.lastCapture = { media: dataUrl, mediaType: 'image/png', createdAt: new Date().toISOString(), filter: $('#colorFilter').value };
    addGalleryItem({ type: 'image', dataUrl, createdAt: state.lastCapture.createdAt, filter: state.lastCapture.filter });
    flash(); toast('Captured. You can post it as a story or to the feed.');
  }
  async function toggleRecord() {
    if (state.recording) return stopRecording();
    const canvas = $('#recordCanvas'); await renderToCanvas(canvas);
    const stream = canvas.captureStream ? canvas.captureStream(30) : null;
    if (!stream || !window.MediaRecorder) return toast('This browser cannot record canvas video. Photo capture still works.');
    state.chunks = []; state.recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    let raf = 0; const paint = async () => { if (!state.recording) return; await renderToCanvas(canvas); raf = requestAnimationFrame(paint); };
    state.recorder.ondataavailable = e => { if (e.data.size) state.chunks.push(e.data); };
    state.recorder.onstop = () => { cancelAnimationFrame(raf); const blob = new Blob(state.chunks, { type: 'video/webm' }); const url = URL.createObjectURL(blob); addGalleryItem({ type: 'video', objectUrl: url, createdAt: new Date().toISOString(), filter: $('#colorFilter').value, transient: true }); $('#recordVideo').textContent = 'Record'; state.recording = false; };
    state.recording = true; $('#recordVideo').textContent = 'Stop'; state.recorder.start(250); paint();
  }
  function stopRecording() { state.recorder?.stop(); }
  function addGalleryItem(item) { state.gallery.unshift(item); state.gallery = state.gallery.slice(0, 18); saveGallery(); renderGallery(); }
  function loadGallery() { try { state.gallery = JSON.parse(localStorage.getItem('socials.gallery') || '[]'); } catch { state.gallery = []; } }
  function saveGallery() { localStorage.setItem('socials.gallery', JSON.stringify(state.gallery.filter(x => !x.transient && (!x.dataUrl || x.dataUrl.length < 950000)))); }
  function renderGallery() {
    const root = $('#galleryGrid'); root.innerHTML = '';
    if (!state.gallery.length) { root.innerHTML = '<article class="gallery-card"><strong>No captures yet.</strong><p class="hint">Use the camera to capture photos.</p></article>'; return; }
    state.gallery.forEach((item, idx) => {
      const card = document.createElement('article'); card.className = 'gallery-card';
      const media = document.createElement(item.type === 'video' ? 'video' : 'img'); if (item.type === 'video') media.controls = true; media.className = 'media'; media.src = item.dataUrl || item.objectUrl; card.appendChild(media);
      const btn = document.createElement('button'); btn.className = 'secondary'; btn.textContent = 'Download'; btn.addEventListener('click', () => { const a = document.createElement('a'); a.href = item.dataUrl || item.objectUrl; a.download = `socials-capture-${idx + 1}.${item.type === 'image' ? 'png' : 'webm'}`; a.click(); });
      card.insertAdjacentHTML('beforeend', `<p class="hint">${fmt(item.createdAt)} · ${esc(item.filter || 'normal')}</p>`); card.appendChild(btn); root.appendChild(card);
    });
  }
  async function shareCapture(target) {
    if (!state.lastCapture?.media) return toast('Capture a photo first.');
    const caption = prompt(target === 'story' ? 'Story caption:' : 'Feed caption:') || '';
    const path = target === 'story' ? '/api/story' : '/api/post';
    await postJson(path, { author: me(), text: caption, media: state.lastCapture.media, mediaType: state.lastCapture.mediaType }).catch(err => toast(err.message));
    toast(target === 'story' ? 'Story posted.' : 'Posted to feed.');
  }

  function bindRoom() {
    $('#joinForm').addEventListener('submit', joinRoom);
    $('#roomChatForm').addEventListener('submit', sendRoomChat);
    $('#micBtn').addEventListener('click', toggleMic);
    $('#camBtn').addEventListener('click', toggleCam);
    $('#screenBtn').addEventListener('click', shareScreen);
    $('#recordBtn').addEventListener('click', toggleRoomRecording);
    $('#handBtn').addEventListener('click', toggleHand);
    $('#reactionSelect').addEventListener('change', e => sendRoomReaction(e.target.value));
    $('#leaveRoom').addEventListener('click', leaveRoom);
    $('#copyInvite').addEventListener('click', copyInvite);
    $('#captionBtn').addEventListener('click', toggleCaptions);
    $('#addManualLine').addEventListener('click', addManualLine);
    $('#transcriptFile').addEventListener('change', e => importTranscript(e.target.files[0]).catch(err => toast(err.message)));
    $('#analyzeBtn').addEventListener('click', renderAnalysis);
    $('#exportMd').addEventListener('click', exportMarkdown);
    $('#exportJson').addEventListener('click', exportMeetingJson);
    $('#exportHtml').addEventListener('click', exportMeetingHtml);
    $('#exportVtt').addEventListener('click', exportVtt);
    $$('.room-tab').forEach(btn => btn.addEventListener('click', () => { $$('.room-tab').forEach(b => b.classList.toggle('active', b === btn)); $$('.room-panel').forEach(p => p.classList.toggle('active-room-panel', `#${p.id}` === btn.dataset.roomTab)); }));
    $$('.quick-note').forEach(btn => btn.addEventListener('click', () => { const add = `${btn.dataset.prefix || ''}${prompt(`${btn.dataset.prefix || ''}note:`) || ''}`.trim(); if (add && add !== (btn.dataset.prefix || '').trim()) $('#meetingNotes').value += `${$('#meetingNotes').value ? '\n' : ''}${add}`; }));
    window.addEventListener('beforeunload', () => { if (state.room.peerId && !window.SocialSharedBackend?.isEnabled?.()) navigator.sendBeacon?.('/api/room/leave', new Blob([JSON.stringify(roomPayload())], { type: 'application/json' })); });
    setupCaptions();
  }
  async function roomApi(path, payload) { return postJson(path, payload); }
  function roomPayload(extra = {}) { return { room: state.room.room, pass: state.room.pass, from: state.room.peerId, peerId: state.room.peerId, ...extra }; }
  async function startRoomMedia() {
    const constraints = { audio: $('#joinAudio').checked, video: $('#joinVideo').checked ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false };
    try { state.room.localStream = await navigator.mediaDevices.getUserMedia(constraints); }
    catch (err) {
      if (constraints.video && constraints.audio) { toast('Camera blocked; trying microphone only.'); state.room.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
      else throw err;
    }
  }
  async function joinRoom(event) {
    event.preventDefault();
    state.room.name = $('#roomName').value.trim() || me(); state.room.room = slug($('#roomCode').value); state.room.pass = $('#roomPass').value;
    try {
      await startRoomMedia();
      const joined = await roomApi('/api/room/join', { room: state.room.room, pass: state.room.pass, name: state.room.name, peerId: sessionStorage.getItem('socials.peerId') || '' });
      state.room.peerId = joined.peerId; sessionStorage.setItem('socials.peerId', state.room.peerId);
      $('#lobby').classList.add('hidden'); $('#meeting').classList.remove('hidden'); $('#roomTitle').textContent = state.room.room;
      state.room.startTime = Date.now(); state.room.timer = setInterval(() => { $('#meetingTimer').textContent = fmtTime(Date.now() - state.room.startTime); }, 1000);
      setConnection('Connecting', 'warn'); upsertLocalTile(); connectRoomEvents(); updateParticipants(joined.participants || []);
      state.room.heartbeat = setInterval(() => roomApi('/api/room/heartbeat', roomPayload()).catch(() => {}), 20_000);
      await negotiateWithExistingPeers(); toast('Room joined.');
    } catch (err) { toast(err.message || 'Could not join room.'); stopRoomMedia(); }
  }
  function connectRoomEvents() {
    state.room.eventSource?.close?.();
    state.room.pollStop?.();
    if (window.SocialSharedBackend?.isEnabled?.()) {
      setConnection('Connected by shared backend polling', 'good');
      state.room.pollStop = window.SocialSharedBackend.startRoomPolling(state.room.room, state.room.peerId, (packet) => {
        const eventName = packet.event || packet.type;
        const data = packet.data || packet.payload || packet;
        if (eventName === 'participants') updateParticipants(data);
        else if (eventName === 'signal') handleSignal(data).catch(console.warn);
        else if (eventName === 'room-chat') addRoomChat(data);
        else if (eventName === 'room-reaction') showRoomReaction(data);
      }, () => setConnection('Polling shared backend', 'warn'));
      return;
    }
    state.room.eventSource = new EventSource(`/room-events?room=${encodeURIComponent(state.room.room)}&peer=${encodeURIComponent(state.room.peerId)}`);
    state.room.eventSource.addEventListener('ready', () => setConnection('Connected', 'good'));
    state.room.eventSource.addEventListener('participants', e => updateParticipants(JSON.parse(e.data)));
    state.room.eventSource.addEventListener('signal', e => handleSignal(JSON.parse(e.data)).catch(console.warn));
    state.room.eventSource.addEventListener('room-chat', e => addRoomChat(JSON.parse(e.data)));
    state.room.eventSource.addEventListener('room-reaction', e => showRoomReaction(JSON.parse(e.data)));
    state.room.eventSource.onerror = () => setConnection('Reconnecting', 'warn');
  }
  function setConnection(text, kind = '') { $('#connectionState').textContent = text; $('#connectionState').className = `pill ${kind}`; }
  function updateParticipants(list) {
    state.room.participants.clear(); for (const p of list) state.room.participants.set(p.id, p);
    $('#participants').innerHTML = '';
    for (const p of list) { const chip = document.createElement('span'); chip.className = 'participant'; chip.textContent = `${p.handRaised ? '✋ ' : ''}${p.name}${p.id === state.room.peerId ? ' (you)' : ''}`; $('#participants').appendChild(chip); }
    for (const p of list) if (p.id !== state.room.peerId && !state.room.peers.has(p.id)) maybeCreatePeer(p.id);
    for (const id of [...state.room.peers.keys()]) if (!state.room.participants.has(id)) cleanupPeer(id);
  }
  async function negotiateWithExistingPeers() { for (const id of state.room.participants.keys()) if (id !== state.room.peerId && state.room.peerId < id) await createOffer(id); }
  function maybeCreatePeer(remoteId) {
    const pc = new RTCPeerConnection({ iceServers: ICE }); const record = { pc, stream: new MediaStream() }; state.room.peers.set(remoteId, record);
    state.room.localStream?.getTracks().forEach(track => pc.addTrack(track, state.room.localStream));
    pc.onicecandidate = ({ candidate }) => { if (candidate) roomApi('/api/room/signal', roomPayload({ to: remoteId, type: 'ice', payload: candidate })).catch(console.warn); };
    pc.ontrack = ({ track, streams }) => { const stream = streams[0] || record.stream; if (!stream.getTracks().includes(track)) stream.addTrack(track); record.stream = stream; upsertRemoteTile(remoteId, stream); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) cleanupPeer(remoteId); };
    pc.onnegotiationneeded = async () => { if (state.room.peerId < remoteId) await createOffer(remoteId).catch(console.warn); };
    return record;
  }
  const getPeer = id => state.room.peers.get(id) || maybeCreatePeer(id);
  async function createOffer(remoteId) { const { pc } = getPeer(remoteId); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await roomApi('/api/room/signal', roomPayload({ to: remoteId, type: 'offer', payload: pc.localDescription })); }
  async function handleSignal(msg) {
    if (msg.to !== state.room.peerId || msg.from === state.room.peerId) return; const { pc } = getPeer(msg.from);
    if (msg.type === 'offer') { await pc.setRemoteDescription(new RTCSessionDescription(msg.payload)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await roomApi('/api/room/signal', roomPayload({ to: msg.from, type: 'answer', payload: pc.localDescription })); }
    else if (msg.type === 'answer') { if (pc.signalingState !== 'stable') await pc.setRemoteDescription(new RTCSessionDescription(msg.payload)); }
    else if (msg.type === 'ice') await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
  }
  function upsertLocalTile() { upsertTile('local', state.room.name, state.room.localStream, true); }
  function upsertRemoteTile(id, stream) { upsertTile(id, state.room.participants.get(id)?.name || 'Guest', stream, false); }
  function safeSelector(id) { return window.CSS?.escape ? CSS.escape(id) : String(id).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }
  function upsertTile(id, name, stream, local) {
    let tile = document.querySelector(`[data-tile="${safeSelector(id)}"]`);
    if (!tile) { tile = document.createElement('section'); tile.className = `tile ${local ? 'local' : ''}`; tile.dataset.tile = id; tile.innerHTML = '<div class="avatar"></div><video autoplay playsinline></video><div class="tile-meta"><span class="tile-name"></span><span class="tile-state"></span></div>'; $('#videoGrid').appendChild(tile); }
    tile.querySelector('.avatar').textContent = initials(name); tile.querySelector('.tile-name').textContent = local ? `${name} (you)` : name;
    const video = tile.querySelector('video'); if (local) video.muted = true; video.srcObject = stream;
    const hasVideo = Boolean(stream?.getVideoTracks?.().some(t => t.enabled && t.readyState === 'live'));
    video.style.display = hasVideo ? 'block' : 'none'; tile.querySelector('.avatar').style.display = hasVideo ? 'none' : 'grid'; tile.querySelector('.tile-state').textContent = local ? micStateText() : 'Live';
  }
  function micStateText() { const a = state.room.localStream?.getAudioTracks?.()[0]; const v = state.room.localStream?.getVideoTracks?.()[0]; return `${a?.enabled ? 'Mic on' : 'Muted'} · ${v?.enabled ? 'Cam on' : 'Cam off'}`; }
  function refreshLocalSenders() {
    for (const { pc } of state.room.peers.values()) {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video'); const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
      const videoTrack = state.room.screenTrack || state.room.localStream?.getVideoTracks()[0]; const audioTrack = state.room.localStream?.getAudioTracks()[0];
      if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack).catch(console.warn); if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack).catch(console.warn);
    }
  }
  function cleanupPeer(id) { const rec = state.room.peers.get(id); if (rec) rec.pc.close(); state.room.peers.delete(id); document.querySelector(`[data-tile="${safeSelector(id)}"]`)?.remove(); }
  function stopRoomMedia() { state.room.localStream?.getTracks().forEach(t => t.stop()); state.room.screenTrack?.stop(); state.room.localStream = null; state.room.screenTrack = null; }
  function toggleMic() { const tracks = state.room.localStream?.getAudioTracks() || []; const next = !tracks.some(t => t.enabled); tracks.forEach(t => { t.enabled = next; }); $('#micBtn').textContent = next ? 'Mute' : 'Unmute'; upsertLocalTile(); }
  function toggleCam() { const tracks = state.room.localStream?.getVideoTracks() || []; const next = !tracks.some(t => t.enabled); tracks.forEach(t => { t.enabled = next; }); $('#camBtn').textContent = next ? 'Camera off' : 'Camera on'; upsertLocalTile(); }
  async function shareScreen() {
    if (state.room.screenTrack) { state.room.screenTrack.stop(); state.room.screenTrack = null; $('#screenBtn').textContent = 'Share screen'; refreshLocalSenders(); upsertLocalTile(); return; }
    try { const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); state.room.screenTrack = display.getVideoTracks()[0]; state.room.screenTrack.onended = () => { state.room.screenTrack = null; $('#screenBtn').textContent = 'Share screen'; refreshLocalSenders(); upsertLocalTile(); }; $('#screenBtn').textContent = 'Stop sharing'; refreshLocalSenders(); upsertTile('local', `${state.room.name} — screen`, new MediaStream([state.room.screenTrack, ...(state.room.localStream?.getAudioTracks() || [])]), true); }
    catch (err) { toast(err.message || 'Screen share failed.'); }
  }
  function addRoomChat(msg) { state.room.messages.push(msg); const card = document.createElement('article'); card.className = `msg ${msg.from === state.room.peerId ? 'mine' : ''}`; card.innerHTML = `<div class="msg-head"><strong>${esc(msg.sender)}</strong><span>${new Date(msg.sentAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><div>${esc(msg.body || '')}</div>`; $('#roomChatLog').appendChild(card); $('#roomChatLog').scrollTop = $('#roomChatLog').scrollHeight; }
  async function sendRoomChat(event) { event.preventDefault(); const body = $('#roomChatInput').value.trim(); if (!body) return; $('#roomChatInput').value = ''; await roomApi('/api/room/chat', roomPayload({ message: body })).catch(err => toast(err.message)); }
  async function sendRoomReaction(value) { if (!value) return; await roomApi('/api/room/reaction', roomPayload({ reaction: value })).catch(err => toast(err.message)); $('#reactionSelect').value = ''; }
  function showRoomReaction(r) { toast(`${r.sender}: ${r.reaction}`); }
  async function toggleHand() { state.room.handRaised = !state.room.handRaised; $('#handBtn').textContent = state.room.handRaised ? 'Lower hand' : 'Raise hand'; await roomApi('/api/room/raise-hand', roomPayload({ raised: state.room.handRaised })).catch(err => toast(err.message)); }
  async function leaveRoom() {
    await roomApi('/api/room/leave', roomPayload()).catch(() => {}); state.room.eventSource?.close?.(); state.room.pollStop?.(); clearInterval(state.room.timer); clearInterval(state.room.heartbeat); for (const id of [...state.room.peers.keys()]) cleanupPeer(id); stopRoomMedia(); $('#videoGrid').innerHTML = ''; $('#roomChatLog').innerHTML = ''; $('#lobby').classList.remove('hidden'); $('#meeting').classList.add('hidden'); setConnection('Not connected', 'warn');
  }
  async function copyInvite() { const url = `${location.origin}/#room=${encodeURIComponent(state.room.room)}`; try { await navigator.clipboard.writeText(`Join ${state.room.room} at ${url}`); toast('Invite copied.'); } catch { prompt('Copy invite:', `Join ${state.room.room} at ${url}`); } }
  function transcriptLine({ speaker = state.room.name, text, at = Date.now(), startMs = Date.now() - state.room.startTime, source = 'live' }) { const clean = String(text || '').trim(); if (!clean) return; const line = { id: crypto.randomUUID(), speaker, text: clean, at, startMs: Math.max(0, startMs), source }; state.room.transcript.push(line); renderTranscriptLine(line); localStorage.setItem(`socials:${state.room.room}:transcript`, JSON.stringify(state.room.transcript.slice(-1000))); }
  function renderTranscriptLine(line) { const card = document.createElement('article'); card.className = 'line'; card.innerHTML = `<div class="line-head"><strong>${esc(line.speaker)}</strong><span>${fmtTime(line.startMs)} · ${esc(line.source)}</span></div><div>${esc(line.text)}</div>`; $('#transcriptLog').appendChild(card); $('#transcriptLog').scrollTop = $('#transcriptLog').scrollHeight; }
  function setupCaptions() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { $('#captionStatus').textContent = 'SpeechRecognition is not available here. You can import transcripts or add manual lines.'; $('#captionBtn').disabled = true; return; }
    state.room.recognition = new SpeechRecognition(); state.room.recognition.continuous = true; state.room.recognition.interimResults = true; state.room.recognition.lang = navigator.language || 'en-US'; let lastFinal = '';
    state.room.recognition.onresult = event => { for (let i = event.resultIndex; i < event.results.length; i++) { const result = event.results[i]; if (result.isFinal) { const text = result[0].transcript.trim(); if (text && text !== lastFinal) { lastFinal = text; transcriptLine({ text, source: 'caption' }); } } } };
    state.room.recognition.onerror = e => { $('#captionStatus').textContent = `Caption warning: ${e.error}`; };
    state.room.recognition.onend = () => { if (state.room.captionsRunning) { try { state.room.recognition.start(); } catch {} } };
  }
  function toggleCaptions() { if (!state.room.recognition) setupCaptions(); if (!state.room.recognition) return; state.room.captionsRunning = !state.room.captionsRunning; if (state.room.captionsRunning) { try { state.room.recognition.start(); } catch {} $('#captionBtn').textContent = 'Stop captions'; $('#captionStatus').textContent = 'Captions running. Browser support varies.'; } else { state.room.recognition.stop(); $('#captionBtn').textContent = 'Start captions'; $('#captionStatus').textContent = 'Captions stopped.'; } }
  function addManualLine() { const text = prompt('Transcript line text:'); if (text) transcriptLine({ text, source: 'manual' }); }
  async function importTranscript(file) { if (!file) return; const text = await file.text(); const imported = file.name.toLowerCase().endsWith('.json') ? parseTranscriptJson(text) : parseTranscriptText(text); imported.forEach(transcriptLine); toast(`Imported ${imported.length} transcript lines.`); }
  function parseTranscriptJson(text) { const data = JSON.parse(text); const arr = Array.isArray(data) ? data : (data.transcript || data.lines || []); return arr.map((x, i) => ({ speaker: x.speaker || x.name || 'Imported', text: x.text || x.body || String(x), startMs: Number(x.startMs || x.start || i * 1000), source: 'import' })); }
  function parseTranscriptText(text) { const rows = text.replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean); const lines = []; let pendingTime = 0; for (const row of rows) { if (/^\d+$/.test(row) || /^WEBVTT/i.test(row)) continue; const timeMatch = row.match(/(?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*(?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3})/); if (timeMatch) { pendingTime = parseTime(row.split('-->')[0].trim()); continue; } const speakerMatch = row.match(/^([^:]{1,60}):\s*(.+)$/); lines.push(speakerMatch ? { speaker: speakerMatch[1], text: speakerMatch[2], startMs: pendingTime, source: 'import' } : { speaker: 'Imported', text: row, startMs: pendingTime, source: 'import' }); pendingTime += 5000; } return lines; }
  function parseTime(value) { const parts = value.replace(',', '.').split(':').map(Number); let h = 0, m = 0, s = 0; if (parts.length === 3) [h, m, s] = parts; else [m, s] = parts; return Math.round(((h * 3600) + (m * 60) + s) * 1000); }
  async function buildRecordingStream() { const tracks = []; const video = state.room.screenTrack || state.room.localStream?.getVideoTracks()[0]; if (video) tracks.push(video); const AudioCtx = window.AudioContext || window.webkitAudioContext; if (AudioCtx) { const audioCtx = new AudioCtx(); const dest = audioCtx.createMediaStreamDestination(); const addAudio = stream => { if (!stream?.getAudioTracks?.().length) return; try { audioCtx.createMediaStreamSource(stream).connect(dest); } catch {} }; addAudio(state.room.localStream); for (const rec of state.room.peers.values()) addAudio(rec.stream); tracks.push(...dest.stream.getAudioTracks()); } return new MediaStream(tracks); }
  async function toggleRoomRecording() { if (state.room.mediaRecorder?.state === 'recording') { state.room.mediaRecorder.stop(); $('#recordBtn').textContent = 'Record'; return; } try { const stream = await buildRecordingStream(); state.room.recordedChunks = []; state.room.mediaRecorder = new MediaRecorder(stream, { mimeType: pickMime() }); state.room.mediaRecorder.ondataavailable = e => { if (e.data.size) state.room.recordedChunks.push(e.data); }; state.room.mediaRecorder.onstop = () => { const blob = new Blob(state.room.recordedChunks, { type: state.room.mediaRecorder.mimeType || 'video/webm' }); downloadBlob(blob, `room-${state.room.room}-${Date.now()}.webm`); toast('Recording exported.'); }; state.room.mediaRecorder.start(1000); $('#recordBtn').textContent = 'Stop recording'; toast('Recording started.'); } catch (err) { toast(err.message || 'Recording failed.'); } }
  function pickMime() { for (const type of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) if (MediaRecorder.isTypeSupported(type)) return type; return ''; }
  function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function analyzeMeeting() { const notes = $('#meetingNotes').value || ''; const text = [...state.room.transcript.map(l => l.text), notes].join('\n'); const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean); const pick = re => sentences.filter(s => re.test(s)).slice(0, 20); return { actions: pick(/\b(action|todo|to do|follow up|assign|owner|due|next step|please|will you|can you)\b/i), decisions: pick(/\b(decided|decision|agreed|approved|we will|final|chosen|resolved)\b/i), risks: pick(/\b(risk|blocked|blocker|issue|concern|problem|delay|privacy|security|urgent)\b/i), questions: pick(/\?|\b(question|wonder|clarify|how do we|what if)\b/i), summary: sentences.slice(0, 8), generatedAt: new Date().toISOString() }; }
  function renderAnalysis() { const a = analyzeMeeting(); const section = (title, list) => `<article class="analysis-card"><h3>${title}</h3>${list.length ? `<ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="hint">None detected yet.</p>'}</article>`; $('#analysis').innerHTML = section('Summary candidates', a.summary) + section('Action items', a.actions) + section('Decisions', a.decisions) + section('Risks/blockers', a.risks) + section('Questions', a.questions); }
  function meetingPayload() { return { room: state.room.room, generatedAt: new Date().toISOString(), notes: $('#meetingNotes').value, transcript: state.room.transcript, chat: state.room.messages, analysis: analyzeMeeting() }; }
  function exportMarkdown() { const p = meetingPayload(); const lines = [`# ${p.room} meeting notes`, '', `Generated: ${p.generatedAt}`, '', '## Notes', p.notes || '_No notes_', '', '## Transcript', ...p.transcript.map(l => `- [${fmtTime(l.startMs)}] **${l.speaker}:** ${l.text}`), '', '## Analysis', ...Object.entries(p.analysis).flatMap(([k, arr]) => Array.isArray(arr) ? [`### ${k}`, ...(arr.length ? arr.map(x => `- ${x}`) : ['_None_']), ''] : [])]; downloadText(`meeting-${p.room}.md`, lines.join('\n'), 'text/markdown'); }
  function exportMeetingJson() { downloadText(`meeting-${state.room.room}.json`, JSON.stringify(meetingPayload(), null, 2)); }
  function exportMeetingHtml() { const p = meetingPayload(); downloadText(`meeting-${p.room}.html`, `<!doctype html><meta charset="utf-8"><title>${esc(p.room)}</title><body><pre>${esc(JSON.stringify(p, null, 2))}</pre></body>`, 'text/html'); }
  function exportVtt() { const lines = ['WEBVTT', '']; for (const l of state.room.transcript) { const s = vttTime(l.startMs), e = vttTime(l.startMs + Math.max(1800, l.text.length * 45)); lines.push(`${s} --> ${e}`, `${l.speaker}: ${l.text}`, ''); } downloadText(`meeting-${state.room.room}.vtt`, lines.join('\n'), 'text/vtt'); }
  function vttTime(ms) { const t = Math.max(0, Math.floor(ms)); const h = Math.floor(t / 3600000); const m = Math.floor((t % 3600000) / 60000); const s = Math.floor((t % 60000) / 1000); const z = t % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(z).padStart(3, '0')}`; }


    function setAuthPasswordVisible(input, button) {
    if (!input || !button) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? 'Show' : 'Hide';
    button.setAttribute('aria-pressed', String(!showing));
    input.focus();
  }

  function enterSignedInApp(session = {}) {
    const name = session.displayName || session.name || localStorage.getItem('socials.name') || $('#usernameInput')?.value.trim() || 'Friend';
    $('#signinShell').hidden = true;
    $('#appShell').hidden = false;
    document.body.classList.add('signed-in');
    $('#signedInMessage').textContent = `Signed in as ${name}.`;
    $('#logoutBackend')?.removeAttribute('hidden');
    localStorage.setItem('socials.name', name);
  }

  function showSignInShell(message = '') {
    $('#appShell').hidden = true;
    $('#signinShell').hidden = false;
    document.body.classList.remove('signed-in');
    if (message) $('#statusMessage').textContent = message;
  }

  function localPasswordHelp(email, newPassword) {
    const payload = { email, note: 'Browser-only reminder. Remote backend passwords are not changed by this app screen.', savedAt: new Date().toISOString(), length: String(newPassword || '').length };
    localStorage.setItem(PASSWORD_HELP_KEY, JSON.stringify(payload));
    return payload;
  }

  async function initSharedBackendUI() {
    window.SocialSharedBackend?.applyDynamicManifest?.();
    const install = $('#installProjectApp');
    install?.addEventListener('click', async () => {
      const projectName = prompt('Project/app icon name:', window.SocialSharedBackend?.getProjectName?.() || document.title) || '';
      if (projectName.trim()) window.SocialSharedBackend?.setProject(projectName.trim());
      await window.SocialSharedBackend?.promptInstall?.().catch(err => toast(err.message));
    });
    $('#backendSettings')?.addEventListener('click', () => {
      const current = window.SocialSharedBackend?.getBackendUrl?.() || window.SocialSharedBackend?.getDefaultBackendUrl?.() || '';
      const url = prompt('Shared backend URL for all projects. Leave unchanged to keep the deployed backend. Type LOCAL to disable only for this browser:', current);
      if (url === null) return;
      if (url.trim().toLowerCase() === 'local') window.SocialSharedBackend?.disableBackend?.();
      else if (!url.trim()) window.SocialSharedBackend?.useDefaultBackend?.();
      else window.SocialSharedBackend?.setBackendUrl?.(url);
      location.reload();
    });

    $('#togglePassword')?.addEventListener('click', () => setAuthPasswordVisible($('#passwordInput'), $('#togglePassword')));
    $('#toggleResetPassword')?.addEventListener('click', () => setAuthPasswordVisible($('#resetPasswordInput'), $('#toggleResetPassword')));
    $('#forgotButton')?.addEventListener('click', () => {
      $('#forgotPanel').hidden = !$('#forgotPanel').hidden;
      $('#resetMessage').textContent = '';
      if (!$('#forgotPanel').hidden) $('#resetEmailInput').focus();
    });
    $('#resetPasswordButton')?.addEventListener('click', () => {
      const email = $('#resetEmailInput').value.trim().toLowerCase();
      const newPassword = $('#resetPasswordInput').value;
      if (!email || !newPassword) {
        $('#resetMessage').textContent = 'Enter the email and the new password you want to remember.';
        return;
      }
      localPasswordHelp(email, newPassword);
      $('#resetMessage').textContent = 'Saved a browser-only reminder. The deployed backend password was not changed.';
    });

    $('#logoutBackend')?.addEventListener('click', async () => {
      await window.SocialSharedBackend?.logout?.();
      showSignInShell('Signed out. The inner site is hidden again.');
    });

    if (!window.SocialSharedBackend?.isEnabled?.()) {
      enterSignedInApp({ displayName: localStorage.getItem('socials.name') || 'Local Friend' });
      return null;
    }

    const existing = window.SocialSharedBackend.getSession();
    if (existing?.sessionToken || existing?.token) {
      enterSignedInApp(existing);
      return existing;
    }

    showSignInShell('');
    return new Promise(resolve => {
      $('#signinForm').addEventListener('submit', async event => {
        event.preventDefault();
        const email = $('#emailInput').value.trim().toLowerCase();
        const username = $('#usernameInput').value.trim();
        const password = $('#passwordInput').value;
        const displayName = $('#signinDisplayNameInput').value.trim() || username;
        if (!username || !password) {
          $('#statusMessage').textContent = 'Please enter a username and password.';
          return;
        }
        if (password.length < 6) {
          $('#statusMessage').textContent = 'The deployed backend requires passwords of at least 6 characters.';
          return;
        }
        $('#statusMessage').textContent = 'Signing in...';
        try {
          let session;
          try {
            session = await window.SocialSharedBackend.login(username, password, displayName);
            $('#statusMessage').textContent = 'Signed in.';
          } catch (error) {
            if (!/not found|register|first setup/i.test(error.message || '')) throw error;
            $('#statusMessage').textContent = 'No account found. Creating it now...';
            session = await window.SocialSharedBackend.register(username, password, displayName);
          }
          if (email) localStorage.setItem('socials.email', email);
          localStorage.setItem('socials.username', username);
          localStorage.setItem('socials.name', session.displayName || displayName);
          enterSignedInApp(session);
          await window.SocialSharedBackend.request('heartbeat', { name: session.displayName || displayName, status: 'Around' }).catch(() => {});
          resolve(session);
        } catch (error) {
          $('#statusMessage').textContent = error.message || 'Sign in failed.';
        }
      }, { once: false });
    });
  }


  async function init() {
    bindMainTabs();
    await initSharedBackendUI();
    bindSocialForms(); bindCamera(); bindRoom();
    connectSocialEvents();
    await loadState().catch(err => toast(err.message));
    if (location.hash.startsWith('#room=')) { $('#roomCode').value = decodeURIComponent(location.hash.replace('#room=', '')); $$('.tab').find(b => b.dataset.tab === 'rooms')?.click(); }
  }
  init();
})();
