(function(){
  "use strict";

  const VERSION = "onyx-embedded-robust-static-browser-v13";
  const MOODS = {
    snuggly:{title:"Snuggly Mode",img:"onyx_snuggly.png"},
    caring:{title:"Caring Mode",img:"onyx_caring.png"},
    listening:{title:"Listening Mode",img:"onyx_listening.png"},
    purring:{title:"Purring Mode",img:"onyx_purring.png"},
    advising_professor:{title:"Advising Professor Mode",img:"onyx_advising_professor.png"},
    thinking:{title:"Thinking Mode",img:"onyx_thinking.png"},
    thoughtful:{title:"Thoughtful Mode",img:"onyx_thoughtful.png"},
    sleepy:{title:"Sleepy Mode",img:"onyx_sleepy.png"},
    hungry:{title:"Hungry Mode",img:"onyx_hungry.png"},
    judgmental:{title:"Loving Judgmental Mode",img:"onyx_judgmental.png"}
  };
  const PROFILE = {
    papa:{
      key:"papa", address:"Papa", person:"William", catalog:"Dino Dad", profileIncludes:["Dino_Dad","service_dino","dino"],
      widgetLabel:"Dino Support Onyx", bond:"protective best-friend service-void", storage:"onyx.static.chat.papa",
      opener:"Papa, best-friend Onyx is awake right here in your page. No backend. No app install. Just tiny void paws, safety sniffing, DBT skills, body-care checks, and one reachable pawstep.",
      prompts:["Help me body-check","Talk me through panic","Split this task","Pick a DBT skill","Tell me the facts","Write a message gently"],
      fallbacks:[
        "Papa, I am here. Tiny service-void report: first check body, then facts, then one paw-sized next step. You do not have to earn care from me.",
        "Papa, ears forward. I am staying with you. Name the problem messy, and I will sort it into body needs, feelings, facts, and the smallest safe action.",
        "Papa, best-friend Onyx has judged the situation and decided shame is not useful equipment. Give me one piece of the mess and I will help carry it."
      ]
    },
    momma:{
      key:"momma", address:"Momma", person:"Jasper", catalog:"Squishy Momma", profileIncludes:["Squishy_Momma","service_momma","squishy"],
      widgetLabel:"Jasper Support Onyx", bond:"soft baby-void helper", storage:"onyx.static.chat.momma",
      opener:"Momma, baby Onyx is awake inside your page. No backend. No app install. Just little paws, soft checks, DBT skills, comfort logic, and one baby pawstep at a time.",
      prompts:["Ground me","Tiny task help","Wise Mind","Help me feel softer","Relationship words","Baby Onyx check-in"],
      fallbacks:[
        "Momma, baby Onyx is here. I am doing soft little support: body first, feelings second, facts third, then one tiny baby pawstep.",
        "Momma, mrrp. You do not have to make the feeling neat before I sit with it. Tell me the messy version and I will help soften the next step.",
        "Momma, the baby void has arrived with purrs and a tiny clipboard. Shame is not a plan. One breath, one fact, one gentle action."
      ]
    }
  };

  const panelsByProfile = new Map();
  const chatsByProfile = new Map();
  const moodByProfile = new Map();
  let brainPromise = null;

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s==null?"":s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const clean=s=>String(s==null?"":s).trim();
  const norm=s=>String(s==null?"":s).toLowerCase();
  const now=()=>new Date().toLocaleString([], {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});

  function scriptBase(){
    const s = document.currentScript || qs('script[src$="onyx-widget.js"]') || qs('script[src*="onyx/onyx-widget.js"]');
    if(s && s.src) return s.src.replace(/[^/]*$/, "");
    return "onyx/";
  }
  const BASE = scriptBase();
  const SCRIPT_BASE = BASE + "static/script/";
  const IMG_BASE = BASE + "static/img/";

  function profileFor(el, fallback){
    const raw = (el && (el.dataset.onyxProfile || el.getAttribute("data-profile"))) ||
      (document.currentScript && document.currentScript.dataset.onyxProfile) ||
      document.body?.dataset?.profile || fallback || "papa";
    const val = norm(raw);
    if(val.includes("momma") || val.includes("jasper") || val.includes("squishy")) return "momma";
    return "papa";
  }
  function moodKey(value){
    const key = norm(value || "listening").replace(/\s+/g,"_").replace("judgemental","judgmental").replace("advising","advising_professor");
    return MOODS[key] ? key : "listening";
  }
  function moodTitle(mood){ return (MOODS[moodKey(mood)] || MOODS.listening).title; }
  function moodImage(mood){ return IMG_BASE + (MOODS[moodKey(mood)] || MOODS.listening).img; }
  function pick(list){ const a=Array.isArray(list)?list:[]; return a.length ? a[Math.floor(Math.random()*a.length)] : ""; }
  function onyxBackendUrl(){
    const cfg = window.ONYX_BACKEND_CONFIG || {};
    return cfg.onyxFullBackendUrl || window.OURSPACE_ONYX_FULL_BACKEND_URL || "";
  }
  function postOnyxBackend(action, data){
    const url = onyxBackendUrl();
    if(!url || typeof fetch !== "function") return;
    const payload = { action, source:"onyx_widget", version:VERSION, createdAt:new Date().toISOString(), data };
    fetch(url, {
      method:"POST", mode:"cors", credentials:"omit",
      headers:{"Content-Type":"text/plain;charset=utf-8", "Accept":"application/json"},
      body:JSON.stringify(payload)
    }).catch(()=>{});
  }

  function loadScriptOnce(src){
    return new Promise((resolve,reject)=>{
      const existing = Array.from(document.scripts).find(s => s.src === src || s.getAttribute("data-onyx-src") === src);
      if(existing){
        if(existing.dataset.onyxLoaded === "true") return resolve();
        existing.addEventListener("load",()=>resolve(),{once:true});
        existing.addEventListener("error",()=>reject(new Error("Could not load " + src)),{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src=src;
      s.async=false;
      s.setAttribute("data-onyx-src",src);
      s.onload=()=>{s.dataset.onyxLoaded="true"; resolve();};
      s.onerror=()=>reject(new Error("Could not load " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureBrain(){
    if(brainPromise) return brainPromise;
    brainPromise = (async()=>{
      await loadScriptOnce(SCRIPT_BASE + "conversation_scanner_randomizer.js");
      // Full merged chatbot bundle from onyx_scanner_randomizer_merged_static_chatbot.zip.
      // It stays browser-only, but adds the larger response banks and knowledge base.
      await loadScriptOnce(SCRIPT_BASE + "onyx_full_data_bundle.js").catch(()=>null);
      await loadScriptOnce(SCRIPT_BASE + "onyx_robust_brain.js").catch(()=>null);
      await loadScriptOnce(SCRIPT_BASE + "onyx_emotion_routes.js").catch(()=>null);
      await loadScriptOnce(SCRIPT_BASE + "onyx_conversation_brain_bundle.js").catch(()=>null);
      await loadScriptOnce(SCRIPT_BASE + "onyx_service_voice_bundle.js").catch(()=>null);
      const scanner = window.ConversationScannerRandomizer;
      if(!scanner || !scanner.generateResponse) throw new Error("ConversationScannerRandomizer did not attach.");
      if(!window.__ONYX_STATIC_BRAIN_REGISTERED__){
        try{ scanner.resetAll(); }catch(_err){}
        try{ window.OnyxRobustBrain && window.OnyxRobustBrain.registerInlineData(scanner); }catch(_err){}
        try{ scanner.registerJsonBundle(window.OnyxConversationBrainBundle || []); }catch(_err){}
        try{ scanner.registerJsonBundle(window.OnyxServiceVoiceBundle || []); }catch(_err){}
        window.__ONYX_STATIC_BRAIN_REGISTERED__ = true;
      }
      return { scanner, routes:window.OnyxEmotionRoutes || {}, service:window.OnyxServiceVoiceBundle || [], robust:window.OnyxRobustBrain || null };
    })();
    return brainPromise;
  }

  function detectMood(text){
    const lower = norm(text);
    // Priority matters: DBT/support requests must not get stolen by body/food words that appear in the answer.
    if(/dbt|wise mind|stop\b|tipp|dear man|give\b|fast\b|opposite action|check the facts|facts|boundary|emotion regulation|distress tolerance|interpersonal|mindfulness|chain analysis|skill/.test(lower)) return "advising_professor";
    if(/panic|spiral|scared|unsafe|danger|hurt myself|suicide|self harm|overwhelm|meltdown|shutdown|dissociat|shame|cry|afraid/.test(lower)) return "caring";
    if(/\b(food|hungry|treat|snack|breakfast|lunch|dinner|kibble|tuna|nugget|bacon|cheese|milk|yogurt|pudding)\b/.test(lower)) return "hungry";
    if(/\b(water|drink|med|medicine|oxygen|pain|body|bathroom)\b/.test(lower)) return "caring";
    if(/sleep|tired|exhausted|fatigue|rest/.test(lower)) return "sleepy";
    if(/pet|snuggle|cuddle|love you|good boy|baby/.test(lower)) return "purring";
    const routes = window.OnyxEmotionRoutes && window.OnyxEmotionRoutes.emotions || {};
    let best = "listening", score = 0;
    Object.keys(routes).forEach(key=>{
      let s=0;
      (routes[key].triggers || []).forEach(trigger=>{
        const t = norm(trigger);
        if(t && lower.includes(t)) s += Math.max(1, t.length);
      });
      if(s > score){ score=s; best=key; }
    });
    if(score) return moodKey(best);
    if(/why|how|what|explain|think|plan|decide/.test(lower)) return "thoughtful";
    return "listening";
  }

  function safetyOverride(profile, input){
    const lower = norm(input);
    if(!/(kill myself|suicide|end it|hurt myself|self harm|self-harm|can't stay safe|cannot stay safe|hurt someone|overdose|emergency)/.test(lower)) return null;
    const p = PROFILE[profile] || PROFILE.papa;
    return `${p.address}, Onyx is using serious safety voice: if you might hurt yourself, might hurt someone else, took something dangerous, or cannot stay safe, contact emergency help now. Call local emergency services, use 988 in the U.S. or Canada if that is available to you, or get a trusted nearby person physically with you. Stay away from tools/meds/means if you can, keep the screen open, and take one tiny safe action: move closer to another person, unlock the door for help, or call/message someone with “I need help staying safe right now.”`;
  }

  function profileOptions(profile, input){
    const p = PROFILE[profile] || PROFILE.papa;
    return {
      botName:"Lord Onyx Blepman",
      userName:p.address,
      displayName:p.address,
      tone:"protective-warm-service-animal",
      topics:["onyx","conversation","dbt","adhd","self care","body check", p.catalog],
      sourceFileIncludes:p.profileIncludes,
      maxTopCandidates:18,
      minUsefulScore:1,
      seed: profile + ":" + String(input || "").slice(0,80)
    };
  }

  function sanitizeRelationship(profile, text){
    const p = PROFILE[profile] || PROFILE.papa;
    let out = clean(text);
    if(!out) out = pick(p.fallbacks);
    if(profile === "momma"){
      out = out.replace(/\bPapa\b/g,"Momma").replace(/\bDino Dad\b/g,"Squishy Momma").replace(/\bDino\b/g,"Momma").replace(/\bWilliam\b/g,"Jasper");
    }else{
      out = out.replace(/\bMomma\b/g,"Papa").replace(/\bSquishy Momma\b/g,"Dino Dad").replace(/\bSquishy\b/g,"Dino Dad").replace(/\bJasper\b/g,"William");
    }
    // Make sure every response clearly uses the correct relationship voice without awkwardly double-addressing.
    if(!new RegExp("\\b" + p.address + "\\b", "i").test(out)) out = p.address + ", " + out;
    return out;
  }

  function manualFallback(profile, input){
    const p = PROFILE[profile] || PROFILE.papa;
    const lower = norm(input);
    if(/panic|spiral|overwhelm|meltdown|shutdown|dissociat/.test(lower)){
      return `${p.address}, Onyx is pressing tiny paws on the brakes. First: lower one input. Longer exhale than inhale. Name five things you can see, then one body need. After that, the next step is only this: choose water, meds-as-planned, safer position, or message a safe person.`;
    }
    if(/dbt|wise mind|stop|tipp|dear man|opposite action|check the facts|facts/.test(lower)){
      return `${p.address}, professor bowtie mode. Use STOP: Stop, Take one step back, Observe body/facts/urges, then Proceed with one effective pawstep. Feelings are real, but they are not verdicts.`;
    }
    if(/hungry|food|snack|water|drink|med|oxygen|pain|body|bathroom/.test(lower)){
      return `${p.address}, body-check from the service void: water, food, bathroom, meds as prescribed, pain/position, oxygen or medical needs if relevant. Pick only the first missing body thing. Tiny emperor orders: body before shame.`;
    }
    if(/pet|cuddle|snuggle|good boy|love you|baby/.test(lower)){
      return profile === "momma" ?
        "Momma, baby Onyx accepts gentle pets with imperial dignity. I am purring, but I am also checking: shoulders down, jaw soft, one tiny breath, then we may continue adoring the void." :
        "Papa, best-friend Onyx accepts the petting tribute. I am purring and staying on duty: body safe, breathing softer, shame not invited onto the couch.";
    }
    if(/how are you|how's onyx|how is onyx/.test(lower)){
      return profile === "momma" ?
        "Momma, baby Onyx is small, dramatic, hungry in a suspiciously legal way, and fully available for purr-based support." :
        "Papa, best-friend Onyx is alert, loyal, slightly grumbly, and ready to guard the room from shame, spirals, and snack neglect.";
    }
    return pick(p.fallbacks);
  }

  function storageRead(key){ try{return JSON.parse(localStorage.getItem(key)||"[]");}catch(_err){return [];} }
  function storageWrite(key,value){ try{localStorage.setItem(key, JSON.stringify(value).slice(0,120000));}catch(_err){} }

  function register(map, profile, el){ if(!map.has(profile)) map.set(profile,new Set()); map.get(profile).add(el); }

  function setMood(profile, mood){
    const key = moodKey(mood);
    moodByProfile.set(profile,key);
    (panelsByProfile.get(profile)||new Set()).forEach(panel=>updateMoodPanel(panel,key));
    (chatsByProfile.get(profile)||new Set()).forEach(chat=>updateChatMood(chat,key));
    window.dispatchEvent(new CustomEvent("onyx:mood",{detail:{version:VERSION,profile,mood:key,moodImage:moodImage(key)}}));
  }
  function updateMoodPanel(panel,mood){
    const img=qs(".onyx-picture-main",panel), mode=qs(".onyx-mode",panel), cap=qs("[data-onyx-caption]",panel);
    if(img){img.src=moodImage(mood); img.classList.remove("onyx-fade"); void img.offsetWidth; img.classList.add("onyx-fade");}
    if(mode) mode.textContent=moodTitle(mood);
    if(cap) cap.textContent = captionForMood(mood);
  }
  function updateChatMood(chat,mood){
    const img=qs(".onyx-chat-face",chat), mode=qs(".onyx-mode",chat);
    if(img){img.src=moodImage(mood); img.classList.remove("onyx-fade"); void img.offsetWidth; img.classList.add("onyx-fade");}
    if(mode) mode.textContent=moodTitle(mood);
  }
  function captionForMood(mood){
    return ({
      snuggly:"The void is nearby and soft, but still judging whether anyone has eaten.",
      caring:"Safety, body needs, and one tiny next step come first.",
      listening:"Onyx is listening for feelings, facts, needs, and the smallest useful move.",
      purring:"Affection accepted. Purr motor engaged. Support remains active.",
      advising_professor:"Professor bowtie mode: facts, skills, and practical steps.",
      thinking:"Tiny void brain is sorting the signal from the emotional static.",
      thoughtful:"Onyx is considering the situation with ancient couch wisdom.",
      sleepy:"Rest is allowed. Low-energy choices count.",
      hungry:"Body care and snack logistics have entered the royal court.",
      judgmental:"Loving judgment: shame is not a plan, mortal. Try care instead."
    })[moodKey(mood)] || "Onyx is here.";
  }

  function renderMoodPanel(panel){
    if(!panel || panel.dataset.onyxReady === "true") return;
    panel.dataset.onyxReady = "true";
    const profile = profileFor(panel);
    const p = PROFILE[profile] || PROFILE.papa;
    register(panelsByProfile,profile,panel);
    const initial = moodByProfile.get(profile) || "listening";
    panel.innerHTML = `<div class="onyx-static-panel">
      <div class="onyx-picture-stage">
        <img class="onyx-picture-main" alt="Lord Onyx Blepman current conversation-selected face" src="${esc(moodImage(initial))}">
        <div class="onyx-picture-copy">
          <div class="onyx-title">${esc(p.widgetLabel)}</div>
          <div class="onyx-subtitle">${esc(p.bond)} • fully static browser mode</div>
          <div class="onyx-pill-row">
            <span class="onyx-mode">${esc(moodTitle(initial))}</span>
            <span class="onyx-status-pill" data-onyx-knowledge>local JSON brain</span>
            <span class="onyx-status-pill">no backend</span>
          </div>
          <div class="onyx-auto-note" data-onyx-caption>${esc(captionForMood(initial))}</div>
        </div>
      </div>
    </div>`;
    ensureBrain().then(()=>{
      const state = window.ConversationScannerRandomizer && window.ConversationScannerRandomizer.getState ? window.ConversationScannerRandomizer.getState() : null;
      const stats = window.OnyxRobustBrain && window.OnyxRobustBrain.stats ? window.OnyxRobustBrain.stats() : null;
      const k = qs("[data-onyx-knowledge]",panel);
      if(k && stats && stats.responseBankEntries) k.textContent = `${stats.responseBankEntries} bank replies + ${state?.responseEntries || 0} scanned entries`;
      else if(k && state) k.textContent = `${state.responseEntries || 0} local response entries`;
    }).catch(()=>{
      const k = qs("[data-onyx-knowledge]",panel);
      if(k) k.textContent = "tiny emergency brain";
    });
    setMood(profile, initial);
  }

  function addMessage(chat, role, text, meta, extraClass){
    const log = qs(".onyx-log", chat);
    if(!log) return null;
    const div=document.createElement("article");
    div.className = "onyx-message " + role + (extraClass ? " " + extraClass : "");
    div.innerHTML = `<div class="meta">${role === "user" ? "you" : role === "system" ? "system" : "onyx"}${meta ? " · " + esc(meta) : ""}</div><div class="body">${esc(text).replace(/\n/g,"<br>")}</div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderChips(chat, items){
    const root = qs(".onyx-chips", chat);
    if(!root) return;
    root.innerHTML = "";
    (items || []).slice(0,6).forEach(label=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="onyx-chip";
      b.textContent=label;
      b.addEventListener("click",()=>sendFromChat(chat,label));
      root.appendChild(b);
    });
  }

  function renderChat(chat){
    if(!chat || chat.dataset.onyxReady === "true") return;
    chat.dataset.onyxReady="true";
    const profile = profileFor(chat);
    const p = PROFILE[profile] || PROFILE.papa;
    register(chatsByProfile,profile,chat);
    const initial = moodByProfile.get(profile) || "snuggly";
    chat.innerHTML = `<div class="onyx-static-chat" data-profile="${esc(profile)}">
      <div class="onyx-chat-head">
        <img class="onyx-chat-face" alt="Onyx current mood" src="${esc(moodImage(initial))}">
        <div class="onyx-chat-title-wrap">
          <div class="onyx-title">${esc(p.widgetLabel)}</div>
          <div class="onyx-subtitle">${esc(p.bond)} • browser-only static conversation brain</div>
        </div>
        <div class="onyx-mode">${esc(moodTitle(initial))}</div>
      </div>
      <div class="onyx-log" aria-live="polite"></div>
      <div class="onyx-controls">
        <div class="onyx-chips"></div>
        <div class="onyx-input-row">
          <textarea class="onyx-input" placeholder="Talk to Onyx here. Messy is allowed; he will answer from local JSON without a backend."></textarea>
          <button class="onyx-send" type="button">Send</button>
        </div>
        <div class="onyx-tool-row">
          <button class="onyx-tool-button" type="button" data-onyx-clear>Clear</button>
          <button class="onyx-tool-button" type="button" data-onyx-export>Export chat</button>
          <span class="onyx-small-note" data-onyx-status>loading local brain…</span>
        </div>
      </div>
    </div>`;
    const saved = storageRead(p.storage);
    if(Array.isArray(saved) && saved.length){
      saved.slice(-14).forEach(m=>addMessage(chat, m.role === "user" ? "user" : "onyx", m.text || m.content || "", "remembered"));
    }else{
      addMessage(chat,"system","Onyx is embedded in this profile page. He is not a separate HTML page and does not call a backend.");
      addMessage(chat,"onyx",p.opener,"static · ready");
    }
    renderChips(chat,p.prompts);
    const input = qs(".onyx-input", chat);
    qs(".onyx-send", chat).addEventListener("click",()=>{ const text=clean(input.value); if(text) sendFromChat(chat,text); });
    input.addEventListener("keydown",ev=>{ if(ev.key === "Enter" && !ev.shiftKey){ ev.preventDefault(); const text=clean(input.value); if(text) sendFromChat(chat,text); }});
    qs("[data-onyx-clear]",chat).addEventListener("click",()=>{
      storageWrite(p.storage,[]);
      qs(".onyx-log",chat).innerHTML="";
      addMessage(chat,"system","Chat cleared for this profile only.");
      addMessage(chat,"onyx",p.opener,"static · reset");
      renderChips(chat,p.prompts);
      setMood(profile,"snuggly");
    });
    qs("[data-onyx-export]",chat).addEventListener("click",()=>exportChat(profile));
    ensureBrain().then(()=>{
      const status=qs("[data-onyx-status]",chat);
      const s=window.ConversationScannerRandomizer.getState();
      const stats = window.OnyxRobustBrain && window.OnyxRobustBrain.stats ? window.OnyxRobustBrain.stats() : null;
      if(status && stats && stats.responseBankEntries) status.textContent = `${stats.responseBankEntries} full-bank replies + ${s.responseEntries || 0} scanner entries · backend-free`;
      else if(status) status.textContent = `${s.responseEntries || 0} entries loaded · backend-free`;
    }).catch(err=>{
      const status=qs("[data-onyx-status]",chat);
      if(status) status.textContent = "tiny emergency fallback · " + (err && err.message ? err.message : "script load issue");
    });
    setMood(profile,initial);
  }

  async function sendFromChat(chat, text){
    const profile = profileFor(chat);
    const p = PROFILE[profile] || PROFILE.papa;
    const input = qs(".onyx-input", chat);
    if(input) input.value = "";
    addMessage(chat,"user",text,now());
    setMood(profile,"thinking");
    const thinking = addMessage(chat,"onyx","Tiny void is thinking… ears forward, bowtie engaged.","thinking");
    let reply="", mood="listening", source="local", chipSuggestions=null, packet=null;
    let safety = safetyOverride(profile,text);
    try{
      if(safety){
        reply = safety; mood = "caring"; source = "safety";
      }else{
        const brain = await ensureBrain();
        const robust = brain.robust && brain.robust.generate ? brain.robust.generate(text, {profile}) : null;
        if(robust && robust.text){
          reply = robust.text;
          mood = moodKey(robust.mood || detectMood(text));
          source = robust.source || "full Onyx robust brain";
          chipSuggestions = Array.isArray(robust.suggestions) ? robust.suggestions : null;
          packet = robust;
        }else{
          packet = brain.scanner.generateResponse(text, profileOptions(profile,text));
          reply = packet && (packet.text || packet.response) || "";
          const selectedSource = packet && packet.selected && packet.selected.sourceFile || "local JSON";
          // If profile-filtered catalog gives only a weak/generic answer, reinforce with a role-correct Onyx fallback.
          if(!reply || (packet && packet.fallbackUsed && /built-in|fallback/i.test(selectedSource))){
            reply = manualFallback(profile,text);
            source = "role fallback";
          }else{
            source = selectedSource.replace(/_/g," ").replace(/\.json$/i,"");
          }
          reply = sanitizeRelationship(profile, reply);
          mood = detectMood(text + " " + reply);
        }
      }
    }catch(err){
      reply = sanitizeRelationship(profile, manualFallback(profile,text));
      mood = detectMood(text + " " + reply);
      source = "emergency static fallback";
    }
    if(thinking) thinking.remove();
    addMessage(chat,"onyx",reply,`${moodTitle(mood)} · ${source}`, safety ? "safety" : "");
    setMood(profile,mood);
    renderChips(chat, chipSuggestions || suggestionsFor(profile,mood,text));
    const status=qs("[data-onyx-status]",chat);
    if(status) status.textContent = `last answer: ${source} · ${moodTitle(mood)} · no backend`;
    const hist = storageRead(p.storage).slice(-28);
    hist.push({role:"user",text,at:new Date().toISOString()},{role:"onyx",text:reply,mood,source,at:new Date().toISOString()});
    storageWrite(p.storage,hist);
    const detail={version:VERSION,profile,userText:text,onyxReply:reply,mood,source,packet};
    window.dispatchEvent(new CustomEvent("onyx:message",{detail}));
    postOnyxBackend("onyx.chat", detail);
    return {reply,mood,source,profile,packet};
  }

  function suggestionsFor(profile,mood,input){
    const p = PROFILE[profile] || PROFILE.papa;
    const key = moodKey(mood);
    if(key === "caring") return profile === "momma" ? ["Ground me","Tiny safe step","Wise Mind","I need softness","Body check","Stay with me"] : ["Body check","Talk me through panic","Tiny safe step","Tell me the facts","DBT STOP","Stay with me"];
    if(key === "hungry") return ["Water check","Food idea","Meds as planned","Pain position","Tiny chore split","Rest counts"];
    if(key === "advising_professor") return ["STOP skill","Check the Facts","Opposite Action","DEAR MAN","Wise Mind","Chain analysis"];
    if(/task|split|stuck|plan|overwhelm/i.test(input)) return ["Split this task","First tiny step","Body double me","Transition help","Reward after","What can wait?"];
    return p.prompts;
  }

  function exportChat(profile){
    const p = PROFILE[profile] || PROFILE.papa;
    const data = {schema:"onyx.embedded.static.chat.v1",version:VERSION,profile,relationship:p.address,messages:storageRead(p.storage)};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`onyx_${profile}_chat_export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }

  function init(){
    qsa("[data-onyx-mood-panel], #onyxMoodPicture, .onyx-mood-panel").forEach(renderMoodPanel);
    qsa("[data-onyx-chat], #onyx-dbt-chat, .onyx-dbt-chat, .onyx-live-chat").forEach(renderChat);
  }

  window.OnyxDBT = {
    version:VERSION,
    init,
    send:(profile,text)=>{
      const key=profileFor(null,profile);
      const chats=Array.from(chatsByProfile.get(key)||[]);
      if(chats[0]) return sendFromChat(chats[0],text);
      return Promise.resolve({reply:sanitizeRelationship(key, manualFallback(key,text)), mood:detectMood(text), profile:key});
    },
    setMood,
    moods:MOODS,
    ensureBrain
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
