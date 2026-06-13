(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  const fallback = {
    personality:{botName:'Emperor Onyx', opening:'Emperor Onyx is here. We start with one paw-sized step.', voice_rules:['Warmth before instruction','Tiny next action','No shame']},
    dialogue:{categories:{greetings:['Emperor Onyx is here. We shall reduce the chaos to one paw-sized step.'],validation:['That sounds heavy, not lazy.'],safety:['Safety first: move toward a trusted person and contact emergency or crisis support now.'],closing:['One paw-step counts.']}},
    rules:{layers:{primary:[{key:'self_harm',level:'critical',label:'Self-harm language',phrases:['suicide','kill myself','want to die','hurt myself']}],secondary:[{key:'adhd_exec',level:'medium',label:'ADHD / task friction',phrases:['can’t start','cannot start','stuck','executive dysfunction']}],tertiary:[{key:'masked',level:'low',label:'Masked distress',phrases:['im fine','i’m fine']}]}},
    care:{categories:[{id:'adhd_start',name:'ADHD task start',signals:['stuck'],actions:['Name only the next visible action.']}]},
    dbt:{modules:[],handouts:[],worksheets:[]}, health:{entries:[]}, crisis:{}
  };
  async function fetchJson(path){
    const res = await fetch(path, {cache:'no-store'});
    if(!res.ok) throw new Error(path + ' ' + res.status);
    return res.json();
  }
  async function loadAll(){
    const loaded = {...fallback};
    const map = {personality:'personality',dialogue:'dialogue',scanner:'rules',care:'care',dbt:'dbt',health:'health',crisis:'crisis',manifest:'manifest',education:'education',profile:'profile',profilePersonality:'profilePersonality',supportCatalog:'supportCatalog',moodManifest:'moodManifest'};
    const results = await Promise.allSettled(Object.entries(Onyx.paths).map(async ([key,path]) => [map[key], await fetchJson(path)]));
    results.forEach(r => { if(r.status === 'fulfilled') loaded[r.value[0]] = r.value[1]; });
    mergeProfilePersonality(loaded);
    Onyx.data = loaded;
    buildIndexes();
    return loaded;
  }

  function mergeProfilePersonality(loaded){
    const pp = loaded.profilePersonality || {};
    const persona = pp.persona || {};
    const target = loaded.profile && loaded.profile.onyx_direct_address || pp.relationshipTarget || 'friend';
    if(persona.identity || persona.voice){
      loaded.personality = Object.assign({}, loaded.personality || {}, {
        botName: pp.botName || (loaded.personality && loaded.personality.botName) || 'Lord Onyx Blepman',
        fullTitle: persona.identity || (loaded.personality && loaded.personality.fullTitle),
        identity: persona.identity || (loaded.personality && loaded.personality.identity),
        opening: (persona.greetings && persona.greetings[0]) || (loaded.personality && loaded.personality.opening),
        target: target,
        defaultMoodImage: 'assets/onyx-moods/onyx_caring.png'
      });
    }
    const cats = ((loaded.dialogue = loaded.dialogue || {}).categories = (loaded.dialogue.categories || {}));
    const poolMap = {
      greetings:['greetings','openerLines'], validation:['careLines','comfortLines','listeningLines','selfCareResetLines'],
      safety:['crisisLines'], closing:['signoffs'], dbt:['dbtLines','advisorLines'], adhd_start:['adhdLines'],
      grounding:['groundingLines','purringLines'], attachment:['attachmentLines'], diary_card:['diaryCardLines'],
      self_care_reset:['selfCareResetLines'], love:['loveLines'], lore:['loreLines'], comfort:['comfortLines','snugglyLines'],
      pep:['pepTalkLines'], food:['snackLines','hungryLines'], sleep:['sleepyLines'], thinking:['thinkingLines','thoughtfulLines']
    };
    Object.entries(poolMap).forEach(([cat, keys]) => {
      let merged = [];
      keys.forEach(k => { if(Array.isArray(persona[k])) merged = merged.concat(persona[k]); });
      cats[cat] = Onyx.uniq(merged.concat(cats[cat] || []));
    });
  }

  function textOf(value){
    if(Array.isArray(value)) return value.join(' ');
    if(value && typeof value === 'object') return Object.values(value).map(textOf).join(' ');
    return String(value || '');
  }
  function buildIndexes(){
    const data = Onyx.data || fallback;
    const healthEntries = (data.health && data.health.entries) || [];
    const dbtItems = [];
    const dbt = data.dbt || {};
    ['modules','handouts','worksheets','acronyms_and_mnemonics'].forEach(bucket => {
      const value = dbt[bucket] || [];
      if(Array.isArray(value)) value.forEach(item => dbtItems.push({...item, bucket}));
      else Object.entries(value).forEach(([id,item]) => dbtItems.push({id, ...(item || {}), bucket}));
    });
    Onyx.indexes = {
      health:healthEntries.map(item => ({item, haystack:Onyx.lower(textOf(item))})),
      dbt:dbtItems.map(item => ({item, haystack:Onyx.lower(textOf(item))})),
      care:((data.care && data.care.categories) || []).map(item => ({item, haystack:Onyx.lower(textOf(item))})),
      education:((data.education && data.education.modules) || []).map(item => ({item, haystack:Onyx.lower(textOf(item))})),
      profileSupport:Object.entries(data.supportCatalog || {}).map(([id,item]) => ({item:{id, value:item}, haystack:Onyx.lower(id+' '+textOf(item))}))
    };
  }
  function search(indexName, query, limit=5){
    const terms = Onyx.uniq(Onyx.lower(query).split(/[^a-z0-9]+/).filter(t => t.length > 2));
    const rows = (Onyx.indexes && Onyx.indexes[indexName]) || [];
    return rows.map(row => {
      let score = 0;
      terms.forEach(t => { if(row.haystack.includes(t)) score += t.length > 4 ? 2 : 1; });
      return {...row, score};
    }).filter(r => r.score > 0).sort((a,b) => b.score-a.score).slice(0,limit).map(r => r.item);
  }
  Onyx.Data = {loadAll, search, fallback};
})(window);
