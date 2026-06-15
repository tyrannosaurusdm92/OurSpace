const messages = document.getElementById('messages');
const form = document.getElementById('chatForm');
const input = document.getElementById('messageInput');
const forceLocal = document.getElementById('forceLocal');
const profileSelect = document.getElementById('profileSelect');
const moodImg = document.getElementById('onyxMood');
const moodLabel = document.getElementById('moodLabel');
const moodChips = document.getElementById('moodChips');
const imageForm = document.getElementById('imageForm');
const suggestions = document.getElementById('suggestions');
const providerBadge = document.getElementById('providerBadge');
const knowledgeStats = document.getElementById('knowledgeStats');
const history = JSON.parse(localStorage.getItem('onyx_history_v3') || '[]');
let conversationId = localStorage.getItem('onyx_conversation_id_v3') || '';
const moodImages = new Map();

const backendConfig = window.ONYX_BACKEND_CONFIG || {};
const isLocalProxy = ['127.0.0.1','localhost',''].includes(location.hostname) && location.protocol !== 'file:';
const useDirectAppsScript = backendConfig.directAppsScript === null || backendConfig.directAppsScript === undefined
  ? !isLocalProxy
  : Boolean(backendConfig.directAppsScript);
const staticBase = backendConfig.staticBase || (useDirectAppsScript ? 'static/' : '/static/');
function resolveAssetUrl(url){
  const value = String(url || '');
  if(!value) return value;
  if(value.startsWith('/static/')) return staticBase.replace(/\/?$/, '/') + value.slice('/static/'.length);
  return value;
}
async function apiFetch(localPath, action, payload={}, options={}){
  if(useDirectAppsScript){
    const base = (backendConfig.onyxFullBackendUrl || '').replace(/\/$/, '');
    if(!base){ throw new Error('Onyx full Google Apps Script backend URL is not configured.'); }
    const url = base + '?action=' + encodeURIComponent(action);
    const method = (options.method || (['health','persona','memory.export','mood-test'].includes(action) ? 'GET' : 'POST')).toUpperCase();
    if(method === 'GET'){
      return fetch(url, {method:'GET', headers:{'Accept':'application/json'}});
    }
    return fetch(url, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8','Accept':'application/json'},
      body:JSON.stringify({action, payload})
    });
  }
  return fetch(localPath, {
    method: options.method || 'POST',
    headers:{'Content-Type':'application/json'},
    body: options.method === 'GET' ? undefined : JSON.stringify(payload || {})
  });
}

async function safeJsonResponse(res){
  try { return await res.json(); }
  catch(_err){ return {ok:false, error:{message:`Backend returned ${res.status || 'unknown'} but not JSON.`}, data:{}}; }
}
function normalizeApiPayload(payload){
  if(payload && Object.prototype.hasOwnProperty.call(payload, 'data') && Object.prototype.hasOwnProperty.call(payload, 'ok')){
    const data = payload.data || {};
    if(payload.ok === false){
      data.error = (payload.error && (payload.error.message || payload.error.code)) || 'Backend returned ok=false.';
      data.backendEnvelope = payload;
      return data;
    }
    if(payload.warnings && payload.warnings.length) data.warnings = payload.warnings;
    data.backendEnvelope = payload;
    return data;
  }
  return payload || {};
}
function apiErrorText(payload){
  if(!payload) return 'Unknown backend error.';
  if(typeof payload.error === 'string') return payload.error;
  if(payload.error && payload.error.message) return payload.error.message;
  if(payload.backendEnvelope && payload.backendEnvelope.error && payload.backendEnvelope.error.message) return payload.backendEnvelope.error.message;
  return payload.message || 'The void coughed up an error.';
}
function backendCrashMessage(err){
  const msg = err && err.message ? err.message : String(err || 'unknown error');
  return 'The backend did not answer cleanly, so I stayed awake instead of crashing. Check whether the Google Apps Script /exec backend is deployed for Anyone access, returns JSON, and has no Apps Script runtime errors. If using local mode, also check the local proxy console. Void error: ' + msg;
}

function saveHistory(){ localStorage.setItem('onyx_history_v3', JSON.stringify(history.slice(-30))); }
function saveConversationId(id){ if(id){ conversationId = id; localStorage.setItem('onyx_conversation_id_v3', id); } }
function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function moodName(mood){ return String(mood || 'snuggly').replace(/_/g,' '); }
function moodUrl(mood){ return resolveAssetUrl(moodImages.get(mood) || `/static/assets/onyx-moods/onyx_${mood || 'snuggly'}.png`); }
function addMessage(role, text, meta=''){
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="meta">${role === 'user' ? 'you' : 'onyx'}${meta ? ' · '+escapeHtml(meta) : ''}</div><div class="body">${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}
function setMood(mood, url){
  const clean = String(mood || 'snuggly').replace('judgemental','judgmental');
  moodLabel.textContent = moodName(clean);
  moodImg.dataset.mood = clean;
  moodImg.classList.add('mood-changing');
  moodImg.src = resolveAssetUrl(url || moodUrl(clean));
  window.setTimeout(()=>moodImg.classList.remove('mood-changing'), 350);
}
function setSuggestions(items){
  suggestions.innerHTML = '';
  (items || []).slice(0,6).forEach(label => {
    const b = document.createElement('button'); b.type='button'; b.className='suggestion'; b.textContent=label;
    b.addEventListener('click', () => sendOnyx(label)); suggestions.appendChild(b);
  });
}
function summarizeStats(data){
  const stats = data.knowledgeStats || {};
  const parts = [];
  if(stats.referenceChunks !== undefined) parts.push(`${stats.referenceChunks || 0} reference chunks`);
  if(stats.psychiatryHealthFiles !== undefined) parts.push(`${stats.psychiatryHealthFiles || 0} health files`);
  if(stats.liveMemories !== undefined) parts.push(`${stats.liveMemories || 0} memories hit`);
  if(stats.liveDocuments !== undefined) parts.push(`${stats.liveDocuments || 0} docs hit`);
  knowledgeStats.textContent = parts.join(' · ') || 'Onyx knowledge loaded';
}
async function sendOnyx(text){
  addMessage('user', text);
  input.value = '';
  setMood('thinking', moodUrl('thinking'));
  const thinking = addMessage('onyx', 'Tiny void is thinking… ears forward, bowtie engaged.', 'thinking');
  try{
    const res = await apiFetch('/api/chat','chat',{message:text, text, history, forceLocal:forceLocal.checked, profile:profileSelect.value, conversation_id: conversationId});
    const raw = await safeJsonResponse(res);
    const data = normalizeApiPayload(raw);
    thinking.remove();
    if(!res.ok || (raw && raw.ok === false)){ setMood('judgmental', moodUrl('judgmental')); addMessage('onyx', apiErrorText(data)); return; }
    saveConversationId(data.conversation_id || data.conversationId);
    setMood(data.mood, data.moodImage);
    providerBadge.textContent = `${data.provider} · ${data.mode || data.intent}`;
    summarizeStats(data);
    addMessage('onyx', data.reply, `${data.profile} · ${data.mood} · ${data.risk}`);
    setSuggestions(data.suggestions || []);
    history.push({role:'user',content:text},{role:'assistant',content:data.reply});
    while(history.length > 30) history.shift(); saveHistory();
  } catch(err){
    thinking.remove();
    setMood('caring', moodUrl('caring'));
    addMessage('onyx', backendCrashMessage(err));
  }
}
form.addEventListener('submit', e => { e.preventDefault(); const text=input.value.trim(); if(text) sendOnyx(text); });
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => sendOnyx(btn.dataset.prompt)));
imageForm.addEventListener('submit', async e => {
  e.preventDefault();
  const file = document.getElementById('imageInput').files[0];
  if(!file){ setMood('judgmental', moodUrl('judgmental')); addMessage('onyx','Upload an image first, mortal. I cannot judge invisible pixels.'); return; }
  setMood('thinking', moodUrl('thinking'));
  try{
    const res = await apiFetch('/api/image-mood','image-mood',{filename:file.name, caption:document.getElementById('imageCaption').value || '', profile:profileSelect.value, conversation_id: conversationId});
    const raw = await safeJsonResponse(res);
    const data = normalizeApiPayload(raw);
    if(!res.ok || (raw && raw.ok === false)){ setMood('caring', moodUrl('caring')); addMessage('onyx', apiErrorText(data) || 'Image mood ritual failed.'); return; }
    saveConversationId(data.conversation_id || data.conversationId);
    setMood(data.mood, data.moodImage);
    addMessage('onyx', data.onyx, `image mood · ${data.mood}`);
  } catch(err){
    setMood('caring', moodUrl('caring'));
    addMessage('onyx', backendCrashMessage(err));
  }
});
apiFetch('/api/persona','persona',{}, {method:'GET'}).then(r=>r.json()).then(raw=>{
  const data = normalizeApiPayload(raw);
  summarizeStats(data);
  const backend = (data.liveLLMMerge || {}).backend || data.backendCapabilities || {};
  providerBadge.textContent = useDirectAppsScript ? 'Google Apps Script Onyx backend connected' : (backend.onyxFullBackendUrlConfigured || backend.webAppUrlConfigured ? 'local proxy → Google Apps Script Onyx backend' : 'local fallback brain ready');
  for(const item of data.moodImages || []){
    moodImages.set(item.name, resolveAssetUrl(item.url));
    const preload = new Image(); preload.src = resolveAssetUrl(item.url);
    const chip = document.createElement('button'); chip.type='button'; chip.className='chip'; chip.textContent=item.name.replace(/_/g,' ');
    chip.addEventListener('click',()=>setMood(item.name,resolveAssetUrl(item.url))); moodChips.appendChild(chip);
  }
}).catch(()=>{ providerBadge.textContent = useDirectAppsScript ? 'Google Apps Script backend unreachable; local page stayed alive' : 'local brain ready'; });
for(const item of history.slice(-8)) addMessage(item.role === 'user' ? 'user' : 'onyx', item.content, 'remembered');
if(!history.length){
  addMessage('onyx','Lord Onyx Blepman, Emperor of the Voidattude, is awake. I was once human, which explains the literacy and the opinions. Tell me the messy version; I will bring paws, psychiatric pattern-sniffing, body-care logic, live memory, and judgment only for the chaos goblin.', 'snuggly · merged live brain');
}
