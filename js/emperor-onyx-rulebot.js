(function(){
  'use strict';
  const DATA = window.EMPEROR_ONYX_PERSONALITY_DATA || {};
  const P = DATA.persona || {};
  const MOODS = DATA.moods || {};
  const INTENTS = DATA.chatIntents || {};
  const SUPPORT = DATA.supportSkills || {};
  const DBT_SKILLS = SUPPORT.dbtSkills || {};
  const ADHD_TOOLS = SUPPORT.adhdTools || {};
  const STORE_KEY = 'mommaOnyxPersonalityChat.v4';
  const LEGACY_STORE_KEYS = ['mommaOnyxPersonalityChat.v3','mommaOnyxPersonalityChat.v2'];
  const IDLE_AFTER_MS = 45000;
  const IDLE_REPEAT_MS = 70000;
  const DEFAULT_MOOD = DATA.defaultMood || 'snuggly';
  const ALERT_SIGNUP_URL = SUPPORT.alertSignupUrl || 'https://form.typeform.com/to/trAqvrRG';

  const state = {
    chat: loadChat(),
    lastInteraction: Date.now(),
    idleTimer: null,
    idleInterval: null,
    lastMood: DEFAULT_MOOD
  };

  const $ = (id) => document.getElementById(id);
  const pick = (arr, fallback='') => Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random()*arr.length)] : fallback;
  const normalize = (text) => String(text || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const uniqueMoodKeys = () => Object.keys(MOODS).filter(key => !MOODS[key]?.aliasFor);
  const includesAny = (text, list=[]) => list.some(item => text.includes(normalize(item)));

  function isCrisisTrigger(input){
    const text = normalize(input);
    const crisis = SUPPORT.crisisTriggers || [
      'kill myself','suicide','suicidal','end it all','hurt myself','harm myself','self harm','self-harm','cut myself','overdose',"don't want to live",'do not want to live',"can't stay safe",'cannot stay safe','not safe','danger to myself','hurt someone','harm someone'
    ];
    return includesAny(text, crisis);
  }

  function isJudgmentalTrigger(input){
    const text = normalize(input);
    const careNeglectPatterns = [
      /\b(i\s+)?(haven't|have not|didn't|did not|forgot to|skipped|missed)\s+(eat|eaten|food|meal|meals|breakfast|lunch|dinner)\b/,
      /\b(i\s+)?(had|have)\s+(no|zero)\s+(food|meal|meals|breakfast|lunch|dinner)\b/,
      /\b(i\s+)?(went|been)\s+all\s+day\s+without\s+(food|eating|a\s+meal)\b/,
      /\b(i\s+)?(haven't|have not|didn't|did not|forgot|forgot to|skipped|missed)\s+(take|taken|my\s+)?(meds|medication|medicine|pills)\b/,
      /\b(i\s+)?(haven't|have not|didn't|did not|forgot to|skipped|missed)\s+(bathe|bathed|bath|shower|showered|wash|washed)\b/,
      /\b(i\s+)?(haven't|have not|didn't|did not|forgot|forgot to|skipped|missed|neglected)\s+((my|the)\s+)?self[-\s]?care\b/,
      /\b(self[-\s]?care)\s+(got\s+)?(skipped|missed|neglected|forgotten)\b/,
      /\b(i\s+)?(haven't|have not|didn't|did not|forgot to|skipped|missed)\s+(drink|drank|hydrate|hydrated|water)\b/,
      /\b(i\s+)?(had|have)\s+(no|zero)\s+(water|drink|hydration)\b/
    ];
    const snackNeglectPatterns = [
      /\b(no|without|denied)\s+(onyx\s+)?(snack|snacks|treat|treats|tribute)\b/,
      /\b(didn't|did not|forgot to|haven't|have not)\s+(offer|give|bring|provide|present)\s+(you|onyx|him)\s+(a\s+)?(snack|treat|tribute)\b/,
      /\b(forgot|skipped|missed|denied)\s+(onyx'?s?\s+)?(snack|treat|tribute)\b/,
      /\b(doesn't|does not|won't|will not)\s+(offer|give)\s+(you|onyx|him)\s+(a\s+)?(snack|treat|tribute)\b/
    ];
    return careNeglectPatterns.concat(snackNeglectPatterns).some(rx => rx.test(text));
  }

  function loadChat(){
    try {
      let saved = localStorage.getItem(STORE_KEY);
      if(!saved){
        for(const key of LEGACY_STORE_KEYS){
          saved = localStorage.getItem(key);
          if(saved) break;
        }
      }
      return JSON.parse(saved || '[]');
    }
    catch(err){ return []; }
  }
  function saveChat(){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.chat.slice(-180))); }
    catch(err){}
  }
  function addMessage(role, text, mood){
    state.chat.push({ role, text, mood: mood || null, at: new Date().toISOString() });
    saveChat();
    renderChat();
  }
  function renderChat(){
    const log = $('chatLog');
    if(!log) return;
    log.innerHTML = state.chat.map(msg => {
      const speaker = msg.role === 'user' ? 'Momma' : 'Onyx';
      const mood = msg.mood ? `<span class="mood-tag">${escapeHtml((MOODS[msg.mood] || {}).label || msg.mood)}</span>` : '';
      return `<article class="msg ${msg.role === 'user' ? 'user' : 'bot'}"><span class="speaker">${speaker}${mood}</span>${escapeHtml(msg.text)}</article>`;
    }).join('');
    log.scrollTop = log.scrollHeight;
  }
  function canonicalMoodKey(key){
    if(MOODS[key]?.aliasFor && MOODS[MOODS[key].aliasFor]) return MOODS[key].aliasFor;
    return MOODS[key] ? key : DEFAULT_MOOD;
  }
  function setMood(key){
    const canonical = canonicalMoodKey(key);
    const mood = MOODS[canonical] || MOODS[DEFAULT_MOOD] || {};
    state.lastMood = canonical;
    const img = $('onyxMoodImage');
    const label = $('onyxMoodLabel');
    const note = $('onyxMoodNote');
    const stage = document.querySelector('.mood-stage');
    if(img && mood.image){
      img.src = mood.image;
      img.alt = `Onyx in a ${mood.label || canonical} mood`;
    }
    if(label) label.textContent = mood.label || canonical;
    if(note) note.textContent = mood.note || '';
    if(stage){
      Object.keys(MOODS).forEach(moodKey => stage.classList.remove(moodKey));
      stage.classList.add(canonical);
      stage.dataset.mood = canonical;
    }
  }
  function markInteraction(){
    state.lastInteraction = Date.now();
    resetIdleTimers();
  }
  function resetIdleTimers(){
    clearTimeout(state.idleTimer);
    clearInterval(state.idleInterval);
    state.idleTimer = setTimeout(() => {
      doIdleMoment();
      state.idleInterval = setInterval(doIdleMoment, IDLE_REPEAT_MS);
    }, IDLE_AFTER_MS);
  }
  function moodLine(moodKey, fallback){
    const mood = MOODS[canonicalMoodKey(moodKey)] || {};
    const poolName = mood.linePool;
    return pick(P[poolName], fallback || pick(P.grumbles, 'Onyx has opinions.'));
  }
  function doIdleMoment(){
    const moods = ['sleepy','thoughtful','listening','purring','snuggly','hungry','caring','advising_professor'];
    const mood = pick(moods, 'sleepy');
    setMood(mood);
    const idle = pick(P.idleLines, 'Onyx idles with imperial patience.');
    addMessage('bot', `${idle}\n\n${moodLine(mood)}`, mood);
  }

  function detectSupportIntent(input){
    const text = normalize(input);
    if(isCrisisTrigger(input)) return 'crisis';
    if(isJudgmentalTrigger(input)) return 'judgmental';
    if(includesAny(text, INTENTS.alerts_signup || [])) return 'alerts_signup';
    if(includesAny(text, INTENTS.mobile_games || [])) return 'mobile_games';
    if(includesAny(text, INTENTS.reward_system || [])) return 'reward_system';
    if(includesAny(text, INTENTS.attachment_bpd_support || [])) return 'attachment_bpd_support';
    if(includesAny(text, INTENTS.diary_card || [])) return 'diary_card';
    if(includesAny(text, INTENTS.self_care_reset || [])) return 'self_care_reset';
    if(includesAny(text, INTENTS.adhd || [])) return 'adhd';
    if(includesAny(text, INTENTS.dbt || [])) return 'dbt';
    if(findDbtSkill(input)) return 'dbt';
    if(findAdhdTool(input)) return 'adhd';
    return null;
  }

  function detectIntent(input){
    const supportIntent = detectSupportIntent(input);
    if(supportIntent) return supportIntent;
    const text = normalize(input);
    for(const [intent, keys] of Object.entries(INTENTS)){
      if(['judgmental','dbt','adhd','diary_card','self_care_reset','alerts_signup','mobile_games','reward_system','attachment_bpd_support'].includes(intent)) continue;
      if((keys || []).some(k => text.includes(normalize(k)))) return intent;
    }
    for(const moodKey of Object.keys(MOODS)){
      const canonical = canonicalMoodKey(moodKey);
      if(canonical === 'judgmental') continue;
      const label = normalize(MOODS[moodKey]?.label || moodKey.replace(/_/g, ' '));
      if(text.includes(normalize(moodKey.replace(/_/g, ' '))) || text.includes(label)) return moodKey;
    }
    return 'chat';
  }

  function findDbtSkill(input){
    const text = normalize(input);
    let first = null;
    if(/\btipp\b|panic attack|panicking|body alarm|can't calm|cannot calm|dysregulated|meltdown|shutdown|overwhelmed/.test(text) && DBT_SKILLS.tipp) return { key:'tipp', skill:DBT_SKILLS.tipp };
    if(/\bstop skill\b|urge|impulse|self destructive|self-destructive|lash out|about to react|send a text/.test(text) && DBT_SKILLS.stop) return { key:'stop', skill:DBT_SKILLS.stop };
    if(/boundary|ask for|say no|request/.test(text) && DBT_SKILLS.dear_man) return { key:'dear_man', skill:DBT_SKILLS.dear_man };
    if(/shame|lazy|failure|worthless/.test(text) && DBT_SKILLS.nonjudgmental_stance) return { key:'nonjudgmental_stance', skill:DBT_SKILLS.nonjudgmental_stance };
    for(const [key, skill] of Object.entries(DBT_SKILLS)){
      if(!first) first = { key, skill };
      if(includesAny(text, skill.triggers || [])) return { key, skill };
    }
    return text.includes('dbt') || text.includes('skill') ? first : null;
  }

  function findAdhdTool(input){
    const text = normalize(input);
    let first = null;
    for(const [key, tool] of Object.entries(ADHD_TOOLS)){
      if(!first) first = { key, tool };
      if(includesAny(text, tool.triggers || [])) return { key, tool };
    }
    if(/can't start|cannot start|stuck|task paralysis|executive dysfunction|overwhelming task/.test(text) && ADHD_TOOLS.tiny_task_splitter) return { key:'tiny_task_splitter', tool:ADHD_TOOLS.tiny_task_splitter };
    if(/remind|forgot|forget|time blindness/.test(text) && ADHD_TOOLS.reminder_loop) return { key:'reminder_loop', tool:ADHD_TOOLS.reminder_loop };
    return text.includes('adhd') ? first : null;
  }

  function formatSteps(steps){
    return (steps || []).map((step, i) => `${i+1}. ${step}`).join('\n');
  }

  function detectAttachmentBpdProfile(input){
    const text = normalize(input);
    if(/self[-\s]?destructive|self hatred|self-hate|risky urge|risk urge|substance urge|hurt myself|self harm|self-harm|suicidal|suicide/.test(text)) return 'self_destructive_bpd';
    if(/petulant|explosive anger|possessive|control|controlling|lash out|rage|jealous|accuse|accusing/.test(text)) return 'petulant_bpd';
    if(/quiet bpd|discouraged|worthless|clingy|chronic loneliness|lonely|dependent|dependence|rejection/.test(text)) return 'discouraged_quiet_bpd';
    if(/reactive attachment|attachment alarm|abandonment|abandoned|push.?pull|testing them|test them|reassurance/.test(text)) return 'underlying_reactive_attachment_alarm';
    if(/adhd|executive dysfunction|task paralysis|time blind|time blindness/.test(text)) return 'severe_adhd';
    return 'underlying_reactive_attachment_alarm';
  }

  function buildAttachmentBpdResponse(input){
    const support = SUPPORT.attachmentBpdSupport || {};
    const profiles = support.profiles || {};
    const profileKey = detectAttachmentBpdProfile(input);
    const profile = profiles[profileKey] || profiles.underlying_reactive_attachment_alarm || {};
    const safetyAddOn = profileKey === 'self_destructive_bpd'
      ? '\n\nSafety first, Momma. If the urge is about hurting yourself, risky behavior, overdose, not staying alive, or not being safe alone, this is not a solo-chat moment. Move away from unsafe things if you can, contact a trusted real person, and use live crisis/emergency support. Onyx can purr beside you, but he cannot be the only safety plan.'
      : '';
    const rewardNudge = '\n\nReward this in Jasper’s tracker: naming the pattern, using one DBT skill, asking for help directly, and doing any tiny self-care step all earn currency.';
    return {
      mood: profileKey === 'petulant_bpd' ? 'thoughtful' : (profileKey === 'self_destructive_bpd' ? 'caring' : 'listening'),
      text: `${moodLine(profileKey === 'petulant_bpd' ? 'thoughtful' : 'listening')}\n\nPattern support: ${profile.label || 'Attachment/BPD support'}\nThis is skills support, not a diagnosis or a replacement for therapy. Onyx is helping you ride the wave and choose safer behavior.\n\nWhen it shows up:\n${formatSteps(profile.whenItShowsUp || [])}\n\nOnyx-sized plan:\n${formatSteps(profile.onyxPlan || [])}${safetyAddOn}${rewardNudge}\n\nTiny first step: put one paw on the smallest true sentence: “This is an alarm, not a verdict.” Then choose STOP, TIPP, Check the Facts, DEAR MAN, or one safe connection bid.`
    };
  }

  function buildMobileGamesResponse(){
    const games = DATA.mobileGames || SUPPORT.mobileGames || [];
    const names = games.slice(0, 8).map(game => `- ${game.name}`).join('\n');
    return {
      mood:'purring',
      text: `${moodLine('purring')}\n\nMobile game decompression mode is installed. Use the game launcher on this page. Play time and healthy interaction milestones add directly to Jasper’s shared copper/silver/gold/platinum tracker.\n\nAvailable games include:\n${names || '- Mobile-friendly games'}\n\nCurrency rule: the game’s old points are not the reward that matters anymore. Jasper currency is. Launching, playing, taking a regulated break, and stopping before overstimulation all count.`
    };
  }

  function buildRewardSystemResponse(){
    return {
      mood:'advising_professor',
      text: `${moodLine('advising_professor')}\n\nJasper’s reward system is active:\n10 copper = 1 silver\n10 silver = 1 gold\n10 gold = 1 platinum\n\nHigh-value categories include DBT skills, self-care tiny steps, journaling, decompression, talking with Onyx, asking for help, attachment/BPD pattern skills, severe ADHD tools, and mobile game play.\n\nOnyx accounting law: tiny steps count. Starting counts. Asking for help counts. Wipes count. First bites count. First sips count. The tracker is here to reward care before shame can eat the evidence.`
    };
  }


  function buildDbtResponse(input){
    const found = findDbtSkill(input) || (DBT_SKILLS.wise_mind ? { key:'wise_mind', skill:DBT_SKILLS.wise_mind } : null);
    if(!found) return emotionResponse('advising_professor', 'DBT helper mode is installed, but I need a feeling, urge, relationship problem, or task to choose the best skill.');
    const { skill } = found;
    const mood = skill.mood || 'advising_professor';
    return {
      mood,
      text: `${pick(P.dbtLines, moodLine(mood))}\n\nSkill: ${skill.title}\nUse when: ${skill.useWhen}\n\nOnyx-sized practice:\n${formatSteps(skill.onyxSteps)}\n\nTiny first step: ${skill.tinyStep}\n\nNot a verdict. Not a punishment. Skill practice is how we help Future Momma.`
    };
  }

  function buildDiaryCardResponse(){
    const card = SUPPORT.diaryCardTemplate || {};
    const fields = (card.fields || []).map(field => `- ${field}`).join('\n');
    return {
      mood:'listening',
      text: `${moodLine('listening')}\n\n${card.title || 'Onyx DBT Daily Diary Card'}\n${fields}\n\nMomma can answer only one line if that is all the day has room for. Onyx counts partial check-ins as real care.`
    };
  }

  function buildAdhdResponse(input){
    const found = findAdhdTool(input) || (ADHD_TOOLS.tiny_task_splitter ? { key:'tiny_task_splitter', tool:ADHD_TOOLS.tiny_task_splitter } : null);
    if(!found) return emotionResponse('advising_professor', 'ADHD helper mode is installed. Give me the stuck task, and I will chop it into tiny rewardable pieces.');
    const { tool } = found;
    const mood = tool.mood || 'advising_professor';
    const template = (tool.template || []).length ? `\n\nFill-in helper:\n${(tool.template || []).map(line => `- ${line}`).join('\n')}` : '';
    return {
      mood,
      text: `${pick(P.adhdLines, moodLine(mood))}\n\nTool: ${tool.title}\nUse when: ${tool.useWhen}\n\nOnyx-sized steps:\n${formatSteps(tool.onyxSteps)}${template}\n\nRule of the void: starting gets rewarded before finishing. Tiny paws, tiny steps.`
    };
  }

  function buildSelfCareReset(input){
    const dbt = DBT_SKILLS.please;
    const adhd = ADHD_TOOLS.shame_free_reset;
    const bodyList = [
      'Food: something that counts, even small.',
      'Water/electrolytes: a few sips is a valid start.',
      'Meds: only as prescribed; Onyx does not change medication instructions.',
      'Hygiene: wipe face, brush teeth, bath/shower, or clean clothes — smallest available version.',
      'Bathroom/pain/rest: check the body before blaming the brain.',
      'Environment: one visible reset, one piece of trash, one dish, or one blanket adjustment.'
    ];
    return {
      mood:'caring',
      text: `${moodLine('caring')}\n\nSelf-care reset, not self-care sentencing.\n\n${bodyList.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nDBT anchor: ${dbt ? dbt.title : 'PLEASE'} — body needs can make emotions louder.\nADHD anchor: ${adhd ? adhd.title : 'Shame-Free Reset'} — the old plan expired; choose a smaller one.\n\nTiny first step: pick the easiest body need and do the smallest possible version. Then come back for void applause.`
    };
  }

  function buildAlertsResponse(){
    return {
      mood:'advising_professor',
      text: `${pick(P.alertLines, 'Jasper alert sign-up is ready.')}\n\nPhone + email alert sign-up for Jasper:\n${ALERT_SIGNUP_URL}\n\nOnyx instruction: open the form, sign up, then use alerts for care check-ins, away-too-long nudges, meals, meds-as-prescribed reminders, hydration, decompression, and task-start prompts. External reminders are outside-brain support, not a moral failing.`
    };
  }

  function buildCrisisResponse(){
    const safety = SUPPORT.clinicalSafety || {};
    return {
      mood:'caring',
      text: `${pick(P.crisisLines, 'Momma, Onyx is very serious now.')}\n\n${safety.crisisMessage || 'If there is immediate danger or you might hurt yourself or someone else, contact local emergency services or a trusted nearby person now.'}\n\nTiny next step right now:\n1. Move away from anything you could use to hurt yourself if you can.\n2. Call or message one real person nearby: “I am not safe alone and need you now.”\n3. Use emergency services or a crisis line if danger is immediate or you cannot stay safe.\n\nOnyx can stay with you for grounding, but he cannot be the only safety plan. You deserve live human help.`
    };
  }

  function buildWho(){
    const treats = (P.treats || []).slice(0,5).join('; ');
    const habits = (P.habits || []).slice(0,7).join('; ');
    const modes = uniqueMoodKeys().map(key => (MOODS[key] || {}).label || key).join(', ');
    const notes = (P.emotionModeNotes || []).join('\n- ');
    const dbtTitles = Object.values(DBT_SKILLS).slice(0,12).map(skill => skill.title).join(', ');
    const adhdTitles = Object.values(ADHD_TOOLS).map(tool => tool.title).join(', ');
    return `${P.fullLegalName}. Black cat. Green plaid bowtie collar. Tiny void emperor. Momma’s best friend, protector, service animal, alert companion, and emotional-support helper.\n\nEmotion modes wired to his assets: ${modes}.\n\n- ${notes}\n\nDBT helper skills include: ${dbtTitles}.\n\nADHD helper tools include: ${adhdTitles}.\n\nKnown behaviors: ${habits}.\n\nApproved tribute samples: ${treats}.\n\nImportant tiny print from the professor jacket: I can coach skills, grounding, diary cards, routines, and safety nudges, but I am not licensed therapy, medical care, or emergency care. Obviously I am still extremely helpful and handsome.`;
  }
  function emotionResponse(moodKey, extra=''){
    const mood = canonicalMoodKey(moodKey);
    const line = moodLine(mood);
    const tail = extra || pick(P.careLines, 'Onyx is watching over Momma.');
    return { mood, text: `${line}\n\n${tail}` };
  }
  function comfortMoodFor(text){
    const t = normalize(text);
    if(/panic|anxious|spiral|dysregulated|ground|breathe|breathing/.test(t)) return 'purring';
    if(/cry|sad|hurt|hurting|fragile|scared/.test(t)) return 'caring';
    if(/vent|listen|rant|talk/.test(t)) return 'listening';
    if(/alone|lonely|hold|cuddle|snuggle|safe/.test(t)) return 'snuggly';
    return pick(['caring','listening','snuggly','purring','thoughtful'], 'caring');
  }
  function answer(input){
    const text = normalize(input);
    const intent = detectIntent(input);

    if(intent === 'crisis') return buildCrisisResponse();
    if(intent === 'mobile_games') return buildMobileGamesResponse();
    if(intent === 'reward_system') return buildRewardSystemResponse();
    if(intent === 'attachment_bpd_support') return buildAttachmentBpdResponse(input);
    if(intent === 'diary_card') return buildDiaryCardResponse();
    if(intent === 'dbt') return buildDbtResponse(input);
    if(intent === 'adhd') return buildAdhdResponse(input);
    if(intent === 'self_care_reset') return buildSelfCareReset(input);
    if(intent === 'alerts_signup') return buildAlertsResponse();

    if(intent === 'caring') return emotionResponse('caring');
    if(intent === 'listening') return emotionResponse('listening', 'I will not rush you. Tell me one piece at a time. If you want help after, I can pick a DBT skill or an ADHD tiny step.');
    if(intent === 'snuggly') return emotionResponse('snuggly', pick(P.comfortLines));
    if(intent === 'purring') return emotionResponse('purring', 'Try one slow breath with me: in, out. Good. Tiny void engine continues. If panic is loud, ask me for TIPP.');
    if(intent === 'advise') return emotionResponse('advising_professor', 'Now we split the task into the smallest possible next step. Tiny enough to be almost funny. If feelings are loud, we pick DBT first.');
    if(intent === 'thinking') return emotionResponse('thinking', 'Give me the variables, Momma. I will inspect them like suspicious kibble.');
    if(intent === 'thoughtful') return emotionResponse('thoughtful', pick(P.careLines));
    if(intent === 'judgmental') return emotionResponse('judgmental', 'This look is reserved for skipped care or missing Onyx tribute. Tiny step now: food, meds-as-prescribed, bathing/hygiene, hydration, or snack offering — whichever applies. No shame. Move your paws.');
    if(intent === 'sleepy') return emotionResponse('sleepy', 'Rest is approved. I will supervise from your legs like a weighted blanket with opinions.');
    if(intent === 'comfort') {
      const mood = comfortMoodFor(input);
      return emotionResponse(mood, `${pick(P.comfortLines)}\n\n${pick(P.careLines)}\n\nWant a skill? Ask for “DBT skill picker,” “TIPP,” “diary card,” or “ADHD tiny steps.”`);
    }
    if(intent === 'pep') return { mood:'thinking', text: `${moodLine('thinking')}\n\n${pick(P.pepTalkLines)}\n\n${pick(P.adhdLines, 'Start tiny.')}\n\n${pick(P.grumbles)}` };
    if(intent === 'snack') return { mood:'hungry', text: pick(P.hungryLines || P.snackLines) };
    if(intent === 'who') return { mood:'advising_professor', text: buildWho() };
    if(intent === 'love') return { mood:'purring', text: 'I love you too, Momma. I will now pretend to be aloof for brand consistency while remaining completely glued to you. Prrrrrr.' };

    if(text.includes('high five')) return { mood:'thinking', text: 'High five granted. I expect payment in pets, praise, or suspicious dairy access.' };
    if(text.includes('pose') || text.includes('picture')) return { mood:'snuggly', text: 'I shall pose, because my angles are important to civilization and Momma deserves premium void content.' };

    const openers = [
      'Momma, I have considered this with my entire tiny void brain.',
      'I am placing one royal paw on the matter.',
      'The muffin man has reviewed your message.',
      'I was going to nap, but your emotional paperwork has been accepted.',
      'Fine. I will help, because I am benevolent and extremely handsome.'
    ];
    const advice = [
      'Start with the smallest next step, then report back to me for inspection.',
      'Do not bully yourself. That is my department, and I use it only for loving quality control.',
      'Drink water, adjust your body if needed, and let the next thing be gentle.',
      'Your feelings are information, not a courtroom verdict.',
      'Make the plan smaller until it stops hissing at you.',
      'If this is feelings-first, ask for DBT. If this is stuck-task-first, ask for ADHD tiny steps.'
    ];
    const mood = pick(['caring','thoughtful','listening','advising_professor','snuggly'], DEFAULT_MOOD);
    return { mood, text: `${moodLine(mood)}\n\n${pick(openers)} ${pick(advice)}\n\n${pick(P.signoffs)}` };
  }
  function sendUserMessage(text){
    const trimmed = String(text || '').trim();
    if(!trimmed) return;
    markInteraction();
    addMessage('user', trimmed);
    setMood('thinking');
    window.setTimeout(() => {
      const result = answer(trimmed);
      setMood(result.mood);
      addMessage('bot', result.text, result.mood);
    }, 260 + Math.random()*360);
  }
  function quickAction(key){
    const map = {
      comfort: 'Onyx, I need comfort.',
      pep: 'Onyx, give me a pep talk.',
      snack: 'Onyx, demand snacks dramatically.',
      who: 'Who are you and what emotion modes can you do?',
      idle: '',
      caring: 'Onyx, go caring mode and reassure me.',
      listening: 'Onyx, listening mode. I need to vent.',
      snuggly: 'Onyx, snuggly mode please.',
      advising_professor: 'Professor Onyx, I need advice and tiny steps.',
      purring: 'Onyx, purring mode. Help me breathe and ground.',
      thinking: 'Onyx, think through this with me.',
      thoughtful: 'Onyx, be thoughtful and kind-truth this.',
      judgmental: 'Onyx, I have not eaten and I forgot to offer you a snack. Please do the loving judgmental look.',
      sleepy: 'Onyx, sleepy supervisor mode.',
      hungry: 'Onyx, hungry mode.',
      dbt_picker: 'Onyx, choose a DBT skill for me.',
      tipp: 'Onyx, I am panicking and need TIPP.',
      diary_card: 'Onyx, help me fill out a DBT diary card.',
      adhd_split: 'Onyx, ADHD task splitter please. Break this down into tiny steps.',
      body_double: 'Onyx, body double mode. Sit with me while I start.',
      self_care_reset: 'Onyx, self-care reset. Help me check food, water, meds, hygiene, pain, and rest.',
      rewards: 'Onyx, explain Jasper currency rewards.',
      mobile_games: 'Onyx, open the mobile games reward mode.',
      attachment_alarm: 'Onyx, I am having an attachment alarm and fear of abandonment.',
      quiet_bpd: 'Onyx, quiet BPD feelings are loud and I feel worthless and lonely.',
      petulant_bpd: 'Onyx, petulant BPD anger/control urges are loud. Help me pause.',
      self_destructive_bpd: 'Onyx, self-destructive BPD urges are loud. Help me choose safety.',
      alerts_signup: 'Onyx, show Jasper the phone and email alert signup.'
    };
    if(key === 'idle') { markInteraction(); doIdleMoment(); return; }
    sendUserMessage(map[key] || key);
  }
  function exportChat(){
    const payload = {
      app: DATA.appName || 'Momma’s Onyx Personality Chat',
      exportedAt: new Date().toISOString(),
      persona: P.fullLegalName || 'Lord Onyx Blepman',
      relationshipTarget: DATA.relationshipTarget || 'Momma',
      availableEmotionModes: uniqueMoodKeys(),
      dbtSkillsInstalled: Object.keys(DBT_SKILLS),
      adhdToolsInstalled: Object.keys(ADHD_TOOLS),
      alertSignupUrl: ALERT_SIGNUP_URL,
      rewardSystemCatalogPath: DATA.rewardSystemCatalogPath || SUPPORT.rewardSystemCatalogPath || 'json/jasper_reward_system_catalog.json',
      mobileGamesInstalled: (DATA.mobileGames || SUPPORT.mobileGames || []).map(game => ({ name: game.name, file: game.file })),
      attachmentBpdSupportProfiles: Object.keys(SUPPORT.attachmentBpdSupport?.profiles || {}),
      chat: state.chat
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onyx_momma_dbt_adhd_support_chat.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function init(){
    renderChat();
    setMood(DEFAULT_MOOD);
    if(!state.chat.length){
      addMessage('bot', `${pick(P.greetings, 'Momma. Onyx is here.')}\n\nI can use every emotion image and now have DBT helper skills, severe-ADHD tiny-step tools, attachment/BPD pattern support, diary-card support, self-care resets, grounding, mobile-game decompression rewards, Jasper currency tracking, crisis-aware safety nudges, and Jasper alert sign-up support. Default mode remains snuggly.`, DEFAULT_MOOD);
    }
    const form = $('onyxChatForm');
    const input = $('onyxInput');
    if(form){
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendUserMessage(input ? input.value : '');
        if(input) input.value = '';
      });
    }
    if(input){
      input.addEventListener('input', markInteraction);
      input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form?.requestSubmit();
      });
    }
    document.querySelectorAll('[data-quick]').forEach(btn => btn.addEventListener('click', () => quickAction(btn.dataset.quick)));
    const alertLink = $('jasperAlertSignup');
    if(alertLink) alertLink.href = ALERT_SIGNUP_URL;
    const clear = $('clearChat');
    if(clear) clear.addEventListener('click', () => {
      markInteraction();
      state.chat = [];
      saveChat();
      addMessage('bot', pick(P.greetings, 'Momma. Onyx is here.'), DEFAULT_MOOD);
      setMood(DEFAULT_MOOD);
    });
    const exportBtn = $('exportChat');
    if(exportBtn) exportBtn.addEventListener('click', exportChat);
    window.addEventListener('mousemove', () => { if(Date.now() - state.lastInteraction > 3000) markInteraction(); }, { passive:true });
    window.addEventListener('focus', markInteraction);
    resetIdleTimers();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
