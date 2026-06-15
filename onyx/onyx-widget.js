(function () {
  "use strict";

  const ONYX_VERSION = "ourspace-widget-v5-gas-live";
  const DEFAULT_MAIN_BACKEND = "https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec";
  const DEFAULT_ONYX_BACKEND = "https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec";

  const MOODS = {
    snuggly: { title: "Snuggly Mode", img: "onyx_snuggly.png" },
    caring: { title: "Caring Mode", img: "onyx_caring.png" },
    listening: { title: "Listening Mode", img: "onyx_listening.png" },
    purring: { title: "Purring Mode", img: "onyx_purring.png" },
    advising_professor: { title: "Advising Professor Mode", img: "onyx_advising_professor.png" },
    thinking: { title: "Thinking Mode", img: "onyx_thinking.png" },
    thoughtful: { title: "Thoughtful Mode", img: "onyx_thoughtful.png" },
    sleepy: { title: "Sleepy Mode", img: "onyx_sleepy.png" },
    hungry: { title: "Hungry Mode", img: "onyx_hungry.png" },
    judgmental: { title: "Loving Judgmental Mode", img: "onyx_judgmental.png" },
    judgemental: { title: "Loving Judgmental Mode", img: "onyx_judgmental.png" }
  };

  const PROFILE = {
    papa: {
      address: "Papa",
      label: "Papa / Dino Dad",
      widgetLabel: "Papa's Best Friend Onyx",
      bond: "Papa's best friend and savior",
      profileValue: "papa",
      opener: "Papa, best-friend Onyx is awake in the module. I brought paws, live memory, psychiatric pattern-sniffing, body-care logic, and one tiny reachable pawstep.",
      prompts: ["Help me body-check", "Talk me through panic", "Split this task", "Write a message gently", "Pick a DBT skill", "Tell me the facts"]
    },
    momma: {
      address: "Momma",
      label: "Momma",
      widgetLabel: "Momma Helper Onyx",
      bond: "Momma's little baby and helper",
      profileValue: "momma",
      opener: "Momma, baby Onyx is awake in the module with the whole little face. I am helping softly: body, safety, feelings, facts, then one baby pawstep.",
      prompts: ["Help me feel softer", "Ground me", "Tiny task help", "Relationship words", "Wise Mind", "Baby Onyx check-in"]
    }
  };

  const stateByProfile = new Map();
  const moodByProfile = new Map();
  const panelsByProfile = new Map();
  const chatsByProfile = new Map();

  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value == null ? "" : value).trim();
  const escapeHTML = (value) => String(value == null ? "" : value).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));

  function getConfig() {
    const cfg = window.ONYX_BACKEND_CONFIG || {};
    return {
      mainBackendUrl: window.OURSPACE_BACKEND_URL || cfg.mainBackendUrl || DEFAULT_MAIN_BACKEND,
      onyxFullBackendUrl: window.OURSPACE_ONYX_FULL_BACKEND_URL || window.OURSPACE_ONYX_ALERTS_BACKEND_URL || cfg.onyxFullBackendUrl || DEFAULT_ONYX_BACKEND,
      directAppsScript: cfg.directAppsScript !== false,
      staticBase: cfg.staticBase || scriptBase()
    };
  }

  function scriptBase() {
    const script = document.currentScript || qs('script[src$="onyx-widget.js"]');
    if (!script || !script.src) return "onyx/";
    return script.src.replace(/[^/]*$/, "");
  }

  function profileFor(el, fallback) {
    const raw = (el && (el.dataset.onyxProfile || el.getAttribute("data-profile"))) ||
      (document.currentScript && document.currentScript.dataset.onyxProfile) ||
      fallback || "papa";
    const val = String(raw).toLowerCase();
    if (val.includes("momma") || val.includes("jasper") || val.includes("squishy")) return "momma";
    return "papa";
  }

  function moodKey(value) {
    const key = String(value || "snuggly").toLowerCase().replace(/\s+/g, "_").replace("judgemental", "judgmental");
    return MOODS[key] ? key : "snuggly";
  }

  function moodTitle(mood) {
    return (MOODS[moodKey(mood)] || MOODS.snuggly).title;
  }

  function moodImage(mood) {
    const cfg = getConfig();
    const meta = MOODS[moodKey(mood)] || MOODS.snuggly;
    return cfg.staticBase.replace(/\/?$/, "/") + "assets/onyx-moods/" + meta.img;
  }

  function storeKey(profile) {
    return "onyx_live_widget_v5_" + profile;
  }

  function loadProfileState(profile) {
    if (stateByProfile.has(profile)) return stateByProfile.get(profile);
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(storeKey(profile)) || "[]"); }
    catch (_err) { saved = []; }
    const state = { profile, history: Array.isArray(saved) ? saved.slice(-30) : [], conversationId: localStorage.getItem(storeKey(profile) + "_conversation") || "", stats: null, provider: "connecting…" };
    stateByProfile.set(profile, state);
    return state;
  }

  function saveProfileState(state) {
    try {
      localStorage.setItem(storeKey(state.profile), JSON.stringify((state.history || []).slice(-30)));
      if (state.conversationId) localStorage.setItem(storeKey(state.profile) + "_conversation", state.conversationId);
    } catch (_err) {}
  }

  async function apiFetch(action, payload={}, options={}) {
    const cfg = getConfig();
    const base = (action === "app.event" || action === "landing.event") ? cfg.mainBackendUrl : cfg.onyxFullBackendUrl;
    if (!base) throw new Error("Backend URL is missing.");
    const method = (options.method || (["health","persona","memory.export","mood-test"].includes(action) ? "GET" : "POST")).toUpperCase();
    const url = base.replace(/\/$/, "") + "?action=" + encodeURIComponent(action);
    if (method === "GET") {
      return fetch(url, { method:"GET", headers: { "Accept":"application/json" } });
    }
    return fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type":"text/plain;charset=utf-8", "Accept":"application/json" },
      body: JSON.stringify({ action, payload, source:"ourspace_onyx_widget_v5", createdAt:new Date().toISOString() })
    });
  }

  async function readJsonResponse(response) {
    const text = await response.text();
    try { return JSON.parse(text); }
    catch (_err) {
      return { ok:false, error: { message: "Backend returned non-JSON text.", raw: text.slice(0, 240) }, data: {} };
    }
  }

  function normalizePayload(raw) {
    if (!raw) return {};
    if (Object.prototype.hasOwnProperty.call(raw, "ok") && Object.prototype.hasOwnProperty.call(raw, "data")) {
      const data = raw.data || {};
      if (raw.ok === false) {
        data.error = (raw.error && (raw.error.message || raw.error.code)) || raw.error || "Backend returned ok=false.";
        data.backendEnvelope = raw;
      }
      if (raw.warnings) data.warnings = raw.warnings;
      return data;
    }
    return raw;
  }

  function getErrorText(rawOrData, fallback) {
    const data = rawOrData || {};
    if (typeof data.error === "string") return data.error;
    if (data.error && data.error.message) return data.error.message;
    if (data.backendEnvelope && data.backendEnvelope.error && data.backendEnvelope.error.message) return data.backendEnvelope.error.message;
    return data.message || fallback || "The void coughed, but Onyx stayed awake.";
  }

  function fallbackReply(profile, text) {
    const p = PROFILE[profile] || PROFILE.papa;
    const lower = String(text || "").toLowerCase();
    let mood = "listening";
    let reply = p.address + ", the live Apps Script backend did not answer cleanly, so I am using emergency tiny-void fallback instead of crashing. ";
    if (/(panic|overwhelm|spiral|scared|dissociat|meltdown|shutdown)/.test(lower)) {
      mood = "caring";
      reply += "First: reduce one input. Feet/legs supported, jaw unclenched, one slow exhale. Then name: feeling, body signal, safest next pawstep.";
    } else if (/(dbt|wise mind|stop|tipp|dear man|opposite action|facts)/.test(lower)) {
      mood = "advising_professor";
      reply += "DBT professor bowtie mode: STOP. Stop, Take a step back, Observe body/facts/urges, then Proceed with one skill-sized move.";
    } else if (/(hungry|food|water|drink|med|pain|oxygen|body)/.test(lower)) {
      mood = "hungry";
      reply += "Body check, mortal beloved: water, food, meds-as-planned, bathroom, pain position, oxygen/medical needs if relevant, then one tiny step.";
    } else {
      mood = "snuggly";
      reply += "Tell me the messy version. I can hold feeling, facts, body needs, relationship words, or one reachable pawstep.";
    }
    return { reply, mood, risk:"fallback", suggestions:p.prompts.slice(0, 6), provider:"local fallback" };
  }

  function registerProfileMap(profile, type, el) {
    const map = type === "panel" ? panelsByProfile : chatsByProfile;
    if (!map.has(profile)) map.set(profile, new Set());
    map.get(profile).add(el);
  }

  function setMood(profile, mood, url) {
    const key = moodKey(mood);
    moodByProfile.set(profile, key);
    (panelsByProfile.get(profile) || new Set()).forEach(panel => updateMoodPanel(panel, key, url));
    (chatsByProfile.get(profile) || new Set()).forEach(chat => updateChatMood(chat, key, url));
    window.dispatchEvent(new CustomEvent("onyx:mood", { detail: { version: ONYX_VERSION, profile, mood:key, moodImage:url || moodImage(key) } }));
  }

  function updateMoodPanel(panel, mood, url) {
    const img = qs(".onyx-picture-main", panel);
    const mode = qs(".onyx-picture-mode", panel);
    if (img) {
      img.src = url || moodImage(mood);
      img.classList.remove("onyx-fade");
      void img.offsetWidth;
      img.classList.add("onyx-fade");
    }
    if (mode) mode.textContent = moodTitle(mood);
    qsa("[data-onyx-mood]", panel).forEach(btn => btn.classList.toggle("is-active", moodKey(btn.dataset.onyxMood) === moodKey(mood)));
  }

  function updateChatMood(chat, mood, url) {
    const img = qs(".onyx-face", chat);
    const mode = qs(".onyx-mode", chat);
    if (img) {
      img.src = url || moodImage(mood);
      img.classList.remove("onyx-fade");
      void img.offsetWidth;
      img.classList.add("onyx-fade");
    }
    if (mode) mode.textContent = moodTitle(mood);
  }

  function renderMoodPanel(panel) {
    if (!panel || panel.dataset.onyxReady === "true") return;
    panel.dataset.onyxReady = "true";
    const profile = profileFor(panel);
    const p = PROFILE[profile] || PROFILE.papa;
    registerProfileMap(profile, "panel", panel);
    const initial = moodByProfile.get(profile) || "snuggly";
    panel.innerHTML = `<div class="onyx-live-panel onyx-picture-card">
      <div class="onyx-picture-stage">
        <img class="onyx-picture-main" alt="Lord Onyx Blepman current conversation-chosen face" src="${escapeHTML(moodImage(initial))}">
        <div class="onyx-picture-copy">
          <strong>${escapeHTML(p.widgetLabel)}</strong>
          <span class="onyx-picture-mode">${escapeHTML(moodTitle(initial))}</span>
          <small>${escapeHTML(p.bond)} • V5 live GAS brain</small>
          <div class="onyx-auto-note">Onyx chooses this face from conversation input, output, body-care context, and backend mood logic. The user does not have to pick his mood.</div>
          <div class="onyx-status-row">
            <span data-onyx-provider>connecting…</span>
            <span data-onyx-knowledge>loading knowledge…</span>
          </div>
        </div>
      </div>
    </div>`;
    setMood(profile, initial);
    hydratePersona(profile);
  }

  function addMessage(chat, role, text, meta) {
    const messages = qs(".onyx-messages", chat);
    if (!messages) return null;
    const div = document.createElement("div");
    div.className = "onyx-msg " + role;
    div.innerHTML = `<div class="meta">${role === "user" ? "you" : role === "system" ? "system" : "onyx"}${meta ? " · " + escapeHTML(meta) : ""}</div><div class="body">${escapeHTML(text).replace(/\n/g, "<br>")}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function renderSuggestions(chat, items) {
    const root = qs(".onyx-suggestions", chat);
    if (!root) return;
    root.innerHTML = "";
    (items || []).slice(0, 6).forEach(label => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "onyx-suggestion";
      b.textContent = label;
      b.addEventListener("click", () => sendFromChat(chat, label));
      root.appendChild(b);
    });
  }

  function renderChat(chat) {
    if (!chat || chat.dataset.onyxReady === "true") return;
    chat.dataset.onyxReady = "true";
    const profile = profileFor(chat);
    const p = PROFILE[profile] || PROFILE.papa;
    const state = loadProfileState(profile);
    registerProfileMap(profile, "chat", chat);
    const initial = moodByProfile.get(profile) || "snuggly";
    chat.innerHTML = `<div class="onyx-widget" data-profile="${escapeHTML(profile)}">
      <div class="onyx-header">
        <img class="onyx-face" alt="Onyx current mood" src="${escapeHTML(moodImage(initial))}">
        <div class="onyx-title-wrap">
          <div class="onyx-title">${escapeHTML(p.widgetLabel)}</div>
          <div class="onyx-subtitle">${escapeHTML(p.bond)} • live Google Apps Script backend</div>
        </div>
        <div class="onyx-mode">${escapeHTML(moodTitle(initial))}</div>
      </div>
      <div class="onyx-messages" aria-live="polite"></div>
      <div class="onyx-controls">
        <div class="onyx-suggestions"></div>
        <div class="onyx-input-row">
          <textarea class="onyx-input" placeholder="Talk to Onyx like a real support chat… messy is allowed."></textarea>
          <button class="onyx-send" type="button">Send</button>
        </div>
        <div class="onyx-tool-row">
          <input class="onyx-image-input" type="file" accept="image/*">
          <input class="onyx-image-caption" type="text" placeholder="optional image/mood note">
          <button class="onyx-tool-button" type="button" data-onyx-image-mood>Image mood</button>
          <button class="onyx-tool-button" type="button" data-onyx-clear>Clear</button>
          <span class="onyx-small-note" data-onyx-chat-status>V5 Onyx ready</span>
        </div>
      </div>
    </div>`;
    const messages = qs(".onyx-messages", chat);
    if (state.history.length) {
      state.history.slice(-10).forEach(item => addMessage(chat, item.role === "user" ? "user" : "onyx", item.content, "remembered"));
    } else {
      addMessage(chat, "system", "Onyx is integrated inside this profile page as a widget, not a separate page.");
      addMessage(chat, "onyx", p.opener, "snuggly · v5");
    }
    renderSuggestions(chat, p.prompts);
    qs(".onyx-send", chat).addEventListener("click", () => {
      const input = qs(".onyx-input", chat);
      const text = clean(input && input.value);
      if (text) sendFromChat(chat, text);
    });
    qs(".onyx-input", chat).addEventListener("keydown", ev => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        const text = clean(ev.currentTarget.value);
        if (text) sendFromChat(chat, text);
      }
    });
    qs("[data-onyx-clear]", chat).addEventListener("click", () => {
      state.history = [];
      saveProfileState(state);
      messages.innerHTML = "";
      addMessage(chat, "system", "Chat cleared for this profile.");
      addMessage(chat, "onyx", p.opener, "snuggly");
      renderSuggestions(chat, p.prompts);
      setMood(profile, "snuggly");
    });
    qs("[data-onyx-image-mood]", chat).addEventListener("click", () => sendImageMood(chat));
    setMood(profile, initial);
    hydratePersona(profile);
  }

  async function sendFromChat(chat, text) {
    const profile = profileFor(chat);
    const state = loadProfileState(profile);
    const input = qs(".onyx-input", chat);
    if (input) input.value = "";
    addMessage(chat, "user", text);
    setMood(profile, "thinking");
    const thinking = addMessage(chat, "onyx", "Tiny void is thinking… ears forward, bowtie engaged.", "thinking");
    try {
      const response = await apiFetch("chat", {
        message: text,
        text,
        history: state.history.slice(-24),
        profile,
        relationshipMode: profile,
        conversation_id: state.conversationId
      });
      const raw = await readJsonResponse(response);
      const data = normalizePayload(raw);
      if (thinking) thinking.remove();
      if (!response.ok || raw.ok === false || data.error) throw new Error(getErrorText(data));
      const reply = data.reply || data.onyx || data.message || fallbackReply(profile, text).reply;
      const mood = moodKey(data.mood || data.emotion || "snuggly");
      if (data.conversation_id || data.conversationId) state.conversationId = data.conversation_id || data.conversationId;
      setMood(profile, mood, data.moodImage);
      addMessage(chat, "onyx", reply, [data.profile || profile, mood, data.risk || data.intent || data.mode].filter(Boolean).join(" · "));
      renderSuggestions(chat, data.suggestions || (PROFILE[profile] || PROFILE.papa).prompts);
      const status = qs("[data-onyx-chat-status]", chat);
      if (status) status.textContent = (data.provider || "Apps Script") + " · " + (data.mode || data.intent || "live");
      state.history.push({ role:"user", content:text, time:Date.now() }, { role:"assistant", content:reply, time:Date.now() });
      state.history = state.history.slice(-30);
      saveProfileState(state);
      window.dispatchEvent(new CustomEvent("onyx:message", { detail: { version: ONYX_VERSION, profile, userText:text, onyxReply:reply, mood, backend:"google_apps_script" } }));
    } catch (err) {
      if (thinking) thinking.remove();
      const local = fallbackReply(profile, text);
      setMood(profile, local.mood);
      addMessage(chat, "onyx", local.reply + "\n\nBackend note: " + (err && err.message ? err.message : String(err || "unknown error")), "safe fallback");
      renderSuggestions(chat, local.suggestions);
      state.history.push({ role:"user", content:text, time:Date.now() }, { role:"assistant", content:local.reply, time:Date.now() });
      state.history = state.history.slice(-30);
      saveProfileState(state);
    }
  }

  async function sendImageMood(chat) {
    const profile = profileFor(chat);
    const fileInput = qs(".onyx-image-input", chat);
    const captionInput = qs(".onyx-image-caption", chat);
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      setMood(profile, "judgmental");
      addMessage(chat, "onyx", "Upload an image first, beloved mortal. I cannot sniff invisible pixels.", "image mood");
      return;
    }
    setMood(profile, "thinking");
    addMessage(chat, "system", "Sending image mood note to Onyx: " + file.name);
    try {
      const response = await apiFetch("image-mood", {
        filename: file.name,
        mimeType: file.type,
        caption: captionInput ? captionInput.value : "",
        profile,
        note: "GitHub Pages widget sends metadata/caption only; image bytes are intentionally not stored by this static frontend."
      });
      const raw = await readJsonResponse(response);
      const data = normalizePayload(raw);
      if (!response.ok || raw.ok === false || data.error) throw new Error(getErrorText(data));
      const mood = moodKey(data.mood || "thoughtful");
      setMood(profile, mood, data.moodImage);
      addMessage(chat, "onyx", data.onyx || data.reply || "Image mood received. Onyx is studying the vibe with royal seriousness.", "image mood · " + mood);
    } catch (err) {
      setMood(profile, "caring");
      addMessage(chat, "onyx", "Image mood did not come back cleanly, but I stayed here. Caption/filename noted locally. " + (err && err.message ? err.message : ""), "safe fallback");
    }
  }

  function summarizeStats(data) {
    const stats = data && (data.knowledgeStats || data.stats || data.backendCapabilities) || {};
    const parts = [];
    if (stats.referenceChunks !== undefined) parts.push((stats.referenceChunks || 0) + " reference chunks");
    if (stats.psychiatryHealthFiles !== undefined) parts.push((stats.psychiatryHealthFiles || 0) + " health files");
    if (stats.liveMemories !== undefined) parts.push((stats.liveMemories || 0) + " memories");
    if (stats.liveDocuments !== undefined) parts.push((stats.liveDocuments || 0) + " docs");
    return parts.join(" · ") || "v5 knowledge loaded";
  }

  async function hydratePersona(profile) {
    const state = loadProfileState(profile);
    if (state.personaLoaded) return;
    state.personaLoaded = true;
    try {
      const response = await apiFetch("persona", {}, { method:"GET" });
      const raw = await readJsonResponse(response);
      const data = normalizePayload(raw);
      state.stats = summarizeStats(data);
      state.provider = "GAS Onyx v5 connected";
    } catch (_err) {
      state.stats = "static mood assets loaded";
      state.provider = "backend not confirmed";
    }
    (panelsByProfile.get(profile) || new Set()).forEach(panel => {
      const provider = qs("[data-onyx-provider]", panel);
      const knowledge = qs("[data-onyx-knowledge]", panel);
      if (provider) provider.textContent = state.provider;
      if (knowledge) knowledge.textContent = state.stats;
    });
  }

  function init() {
    qsa("[data-onyx-mood-panel], #onyxMoodPicture, .onyx-mood-panel").forEach(renderMoodPanel);
    qsa("[data-onyx-chat], #onyx-dbt-chat, .onyx-dbt-chat, .onyx-live-chat").forEach(renderChat);
  }

  window.OnyxDBT = {
    version: ONYX_VERSION,
    init,
    send: (profile, text) => {
      const chats = Array.from(chatsByProfile.get(profileFor(null, profile)) || []);
      if (chats[0]) return sendFromChat(chats[0], text);
      return Promise.resolve(fallbackReply(profileFor(null, profile), text));
    },
    setMood,
    moods: MOODS
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
