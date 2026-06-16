(function(){
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const STORAGE_PREFIX = "onyx.robust.static.v1.";
  const PERSON = {
    papa: {key:"papa", bank:"william", name:"William", address:"Papa", aliases:["william","papa","dino","dino dad"], relation:"best-friend protector", opener:"Papa, best-friend Onyx report:"},
    william: {key:"papa", bank:"william", name:"William", address:"Papa", aliases:["william","papa","dino","dino dad"], relation:"best-friend protector", opener:"Papa, best-friend Onyx report:"},
    momma: {key:"momma", bank:"jasper", name:"Jasper", address:"Momma", aliases:["jasper","momma","squishy","squishy momma"], relation:"devoted baby-void", opener:"Momma, baby Onyx report:"},
    jasper: {key:"momma", bank:"jasper", name:"Jasper", address:"Momma", aliases:["jasper","momma","squishy","squishy momma"], relation:"devoted baby-void", opener:"Momma, baby Onyx report:"}
  };
  const CATEGORY = {
    dbt_help:["dbt","wise mind","stop skill","stop ","tipp","tip skill","dear man","give","fast","opposite action","check the facts","radical acceptance","chain analysis","diary card","distress tolerance","emotion regulation","interpersonal effectiveness","mindfulness","skill"],
    physical_health:["body","pain","flare","eds","mcas","seizure","oxygen","wheelchair","shower","bathroom","hygiene","meds","medicine","hydration","water","food","eat","meal","hungry","tired","fatigue","sleep","nausea","blood sugar","pre-diabetes"],
    mental_health:["adhd","autism","bpd","cptsd","ptsd","rad","reactive attachment","dissociation","dissociate","executive dysfunction","rejection","ruminate","overthinking","shutdown","meltdown","panic"],
    emotional_health:["sad","angry","grief","lonely","abandonment","ashamed","shame","hurt","cry","reassurance","people pleasing","relationship","love","scared","afraid"],
    life_impact:["housing","homeless","support system","family","caregiver","appointment","accessibility","paperwork","phone call","routine","unstable","loss","money","doctor","legal","transport"],
    tasks:["task","chore","todo","to do","schedule","calendar","start","clean","dishes","laundry","trash","reward","currency","break down","body double","plan"],
    store:["store","buy","cart","item","aisle","gift card","snack","comfort item","hobby item","wishlist","purchase","reward shop"]
  };
  const MOOD_TRIGGERS = {
    caring:["panic","scared","unsafe","danger","hurt myself","suicide","self harm","overwhelm","overwhelmed","meltdown","shutdown","dissociat","shame","cry","afraid","pain","flare","seizure","oxygen"],
    advising_professor:["dbt","wise mind","stop skill","tipp","dear man","give","fast","opposite action","check the facts","chain analysis","skill","plan","task","steps","break down","calendar","schedule"],
    hungry:["hungry","snack","food","eat","meal","breakfast","lunch","dinner","treat","tuna","nugget","bacon","cheese","milk","yogurt","pudding"],
    sleepy:["sleep","tired","exhausted","fatigue","rest","nap","drained"],
    purring:["pet","snuggle","cuddle","love you","good boy","baby","forehead kiss","lap"],
    thoughtful:["why","how","what","explain","think","decide","confused","stuck"]
  };
  const SKILL_SUGGESTIONS = {
    dbt_help:["STOP skill","TIPP","Wise Mind","Check the Facts","Opposite Action","DEAR MAN"],
    physical_health:["body check","water check","meds as prescribed","safe position","food if possible","rest cue"],
    mental_health:["name the alarm","reduce sensory load","one tiny step","body double","facts not verdicts","transition bridge"],
    emotional_health:["validate first","name the feeling","check the facts","self-soothe","ask for reassurance directly","one safe message"],
    life_impact:["urgent vs important","one admin step","support request","accessibility check","recovery block","write the script"],
    tasks:["three-paw method","two-minute start","gather one item","body double","timer sprint","reward after"],
    store:["comfort aisle","food/snack aisle","hobby aisle","gift card aisle","wishlist note","cart check"]
  };
  const CATEGORY_LABEL = {
    dbt_help:"DBT help", mental_health:"mental health", emotional_health:"emotional health", physical_health:"physical health", life_impact:"life impact", tasks:"tasks", store:"store"
  };
  const MODE_FOR_CATEGORY = {dbt_help:"advising_professor",tasks:"advising_professor",store:"thoughtful",physical_health:"caring",mental_health:"thoughtful",emotional_health:"listening",life_impact:"caring"};

  function norm(s){return String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9?'\s-]+/g," ").replace(/\s+/g," ").trim();}
  function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
  function scoreList(text,list){let s=0; (list||[]).forEach(x=>{const n=norm(x); if(n && text.includes(n)) s += Math.max(1, Math.min(8, n.split(/\s+/).length));}); return s;}
  function personFrom(profile,input){
    const raw = norm(profile||"");
    if(PERSON[raw]) return PERSON[raw];
    const text = norm(input||"");
    const js = scoreList(text, PERSON.momma.aliases), ws = scoreList(text, PERSON.papa.aliases);
    if(js>ws) return PERSON.momma;
    if(ws>js) return PERSON.papa;
    if(raw.includes("jasper")||raw.includes("momma")||raw.includes("squishy")) return PERSON.momma;
    return PERSON.papa;
  }
  function detectCategory(input){
    const n=norm(input);
    if(scoreList(n,CATEGORY.dbt_help)>0) return "dbt_help";
    let best="emotional_health", bestScore=0;
    Object.keys(CATEGORY).forEach(k=>{const s=scoreList(n,CATEGORY[k]); if(s>bestScore){bestScore=s; best=k;}});
    return bestScore ? best : "emotional_health";
  }
  function crisis(input){return /(kill myself|suicide|end my life|hurt myself|self harm|self-harm|can't stay safe|cannot stay safe|not safe alone|overdose|hurt someone|emergency)/i.test(String(input||""));}
  function detectMood(input,category){
    const n=norm(input);
    if(crisis(input)) return "caring";
    if(category==="dbt_help") return "advising_professor";
    if(category==="tasks") return "advising_professor";
    // food words should not steal DBT/task support; only trigger hungry in food/body/store contexts.
    if(scoreList(n,MOOD_TRIGGERS.caring)>0) return "caring";
    if(scoreList(n,MOOD_TRIGGERS.purring)>0) return "purring";
    if(scoreList(n,MOOD_TRIGGERS.sleepy)>0) return "sleepy";
    if(scoreList(n,MOOD_TRIGGERS.hungry)>0 && (category==="physical_health" || category==="store")) return "hungry";
    if(scoreList(n,MOOD_TRIGGERS.advising_professor)>0) return "advising_professor";
    if(scoreList(n,MOOD_TRIGGERS.thoughtful)>0) return "thoughtful";
    return MODE_FOR_CATEGORY[category] || "listening";
  }
  function rng(seed){let a=2166136261>>>0; String(seed||"onyx").split("").forEach(ch=>{a^=ch.charCodeAt(0); a=Math.imul(a,16777619);}); return function(){a+=0x6D2B79F5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296;};}
  function readRecent(person){try{return JSON.parse(localStorage.getItem(STORAGE_PREFIX+person.bank)||"[]");}catch(_){return []}}
  function writeRecent(person,list){try{localStorage.setItem(STORAGE_PREFIX+person.bank, JSON.stringify((list||[]).slice(-160)));}catch(_){}}
  function banks(){return root.ONYX_GENERATED_RESPONSE_BANKS || {people:{}};}
  function getBank(person,category){return (((banks().people||{})[person.bank]||{}).categories||{})[category]?.responses || [];}
  function tokens(input){return Array.from(new Set(norm(input).split(/\s+/).filter(w=>w.length>2 && !/^(the|and|for|with|you|your|that|this|are|was|were|but|not|can|could|should|would|what|how|why|when|where|who|about|from|into|have|has|had)$/i.test(w))));}
  function scoreResponse(text,input,category,mood,person){
    const n=norm(text), qs=tokens(input); let s=0;
    qs.forEach(t=>{if(n.includes(t)) s+=2;});
    if(n.includes(norm(person.address))) s+=3;
    if(category==="dbt_help" && /stop|wise mind|tipp|dear man|opposite action|check the facts|skill|chain/.test(n)) s+=8;
    if(category==="physical_health" && /body|water|food|med|pain|safe|breath|rest/.test(n)) s+=5;
    if(category==="tasks" && /step|task|start|plan|tiny|doable|reward/.test(n)) s+=5;
    if(mood && n.includes(mood.replace(/_/g," "))) s+=2;
    if(/random|placeholder|lorem|example/i.test(text)) s-=25;
    // discourage generated lines with irrelevant explicit mood claims.
    const claim = n.match(/onyx is in ([a-z_ -]+?) mode/);
    if(claim && !claim[1].includes(mood.replace(/_/g," "))){
      if(category==="dbt_help" || category==="tasks") s-=10;
      else s-=3;
    }
    return s;
  }
  function chooseResponse(person,category,mood,input){
    const bank = getBank(person,category);
    if(!bank.length) return {text:"", source:"no bank", count:0};
    const recent = readRecent(person);
    const scored = bank.map((text,i)=>({text, i, score:scoreResponse(text,input,category,mood,person)}))
      .filter(x=>String(x.text||"").trim().length>20)
      .sort((a,b)=>b.score-a.score);
    const top = scored.slice(0, Math.max(18, Math.min(80, Math.ceil(scored.length*0.08))));
    const fresh = top.filter(x=>!recent.includes(x.text));
    const pool = fresh.length ? fresh : top;
    const r = rng(input+person.bank+category+mood+Date.now()+Math.random());
    const pick = pool[Math.floor(r()*pool.length)] || scored[0];
    if(!pick) return {text:"", source:"empty bank", count:bank.length};
    recent.push(pick.text); writeRecent(person,recent);
    return {text:pick.text, source:`full Onyx bank: ${person.bank}/${category}`, count:bank.length, score:pick.score};
  }
  function normalizeRelationship(text,person){
    let out=String(text||"").trim()
      .replace(/\s*\[unique paw-print[^\]]*\]/gi, "")
      .replace(/\b([a-z]+_){1,}[a-z]+\b/g, function(m){ return m.replace(/_/g, " " ); })
      .replace(/\s{2,}/g, " " );
    if(person.key==="momma"){
      out=out.replace(/\bPapa\b/g,"Momma").replace(/\bDino Dad\b/g,"Squishy Momma").replace(/\bWilliam\b/g,"Jasper");
    }else{
      out=out.replace(/\bMomma\b/g,"Papa").replace(/\bSquishy Momma\b/g,"Dino Dad").replace(/\bJasper\b/g,"William");
    }
    if(!new RegExp("^"+escRe(person.address)+"\\b").test(out) && !/^(mrrp|tiny void|onyx|professor|come here|the void)/i.test(out)){
      out = `${person.opener} ${out.charAt(0).toLowerCase()}${out.slice(1)}`;
    }
    return out;
  }
  function normalizeMoodClaims(text,mood,category){
    const label = mood==="advising_professor" ? "advising professor" : mood.replace(/_/g," ");
    let out = String(text||"");
    out = out.replace(/Onyx is in ([a-z_ -]+?) mode/gi, `Onyx is in ${label} mode`);
    if(category==="dbt_help"){
      out = out.replace(/\b(hungry|sleepy) mode for (DBT|wise mind|STOP|TIPP|DEAR MAN|therapy-skill practice|emotional regulation)/gi, "advising professor mode for $2");
    }
    return out;
  }
  function addServiceShape(text,person,category,mood,input){
    let out = String(text||"").trim();
    const n = norm(out);
    if(category==="dbt_help" && !/stop|tipp|wise mind|dear man|opposite action|check the facts|radical acceptance|chain analysis/i.test(out)){
      out += " Try one skill first: STOP if the feeling is loud, Check the Facts if the story is spiraling, or TIPP if your body is in alarm.";
    }
    if(!/one (tiny|small|safe|reachable)|tiny step|pawstep|paw-step|next step|body check|check your body/i.test(out)){
      const tail = {
        caring:" One safe paw-step: check danger level, then water/food/meds-as-prescribed/position, whichever is most missing.",
        advising_professor:" One professor-paw step: name the goal, name the blocker, choose the smallest action that still counts.",
        hungry:" Food/body court ruling: one possible bite or drink counts before shame gets a vote.",
        sleepy:" Sleepy-void ruling: rest can be the task, not the reward after the task.",
        purring:" Purr motor stays on; affection and regulation can happen at the same time.",
        thoughtful:" Tiny thinking step: separate feeling, fact, need, and next action."
      }[mood] || " One tiny paw-step is enough to begin.";
      out += tail;
    }
    return out;
  }
  function scannerAnswer(input,person,category,mood){
    const scanner = root.ConversationScannerRandomizer;
    if(!scanner || !scanner.generateResponse) return null;
    try{
      const packet = scanner.generateResponse(input,{userName:person.address, displayName:person.address, botName:"Lord Onyx Blepman", tone:"onyx-supportive-service-animal", topics:["onyx",category,CATEGORY_LABEL[category],person.address,person.bank], maxTopCandidates:20, minUsefulScore:2, seed:person.bank+category+mood+String(input).slice(0,100)});
      if(packet && packet.text && packet.selected && Number(packet.selected.score||0)>7){
        const src = String(packet.selected.sourceFile || "");
        const trustedSource = /onyx_conversational|localized_responses|service_voice|Dino_Dad|Momma|built-in/i.test(src);
        const strongDbt = category === "dbt_help" && Number(packet.selected.score||0) > 14 && !awkward(packet.text);
        if((trustedSource || strongDbt) && !awkward(packet.text)) return packet;
      }
    }catch(_err){}
    return null;
  }
  function crisisResponse(person){
    return `${person.address}, serious service-void voice: if you might hurt yourself, might hurt someone else, took something dangerous, or cannot stay safe, use live emergency support now. Call emergency services, call or text 988 in the U.S. or Canada if available, or get a trusted nearby person physically with you. Move away from tools/meds/means if you can do that safely. You are not in trouble; this is a get-help-now moment.`;
  }
  function awkward(text){
    const n = norm(text);
    return /unique paw-print|\bis real context\b|\b(domain|src|condition index|guidelines|source raw|profile)\b|\b\w+ map:\s*\w+|early intervention services|greatly improve a child's development|is not a personality test/i.test(String(text||"")) || /[a-z]+_[a-z]+/.test(String(text||""));
  }
  function choosePlain(seed, list){
    const r = rng(seed + Date.now() + Math.random());
    return (list && list.length) ? list[Math.floor(r()*list.length)] : "";
  }
  function skillFromInput(input){
    const n=norm(input);
    if(/tipp|temperature|ice|panic|body alarm|crisis|intense/.test(n)) return {name:"TIPP", cue:"change body intensity first: cold temperature if safe, paced breathing, or paired muscle release"};
    if(/fact|facts|story|assume|prove|evidence|interpret/.test(n)) return {name:"Check the Facts", cue:"separate what happened from what fear says it means"};
    if(/dear man|ask|request|boundary|message|relationship|say to/.test(n)) return {name:"DEAR MAN", cue:"describe, express, ask, reinforce, then stay mindful"};
    if(/opposite|avoid|avoidance|urge|hide|withdraw/.test(n)) return {name:"Opposite Action", cue:"check whether the urge fits the facts, then do the safe opposite in a tiny way"};
    if(/wise mind|emotion mind|reasonable mind/.test(n)) return {name:"Wise Mind", cue:"let emotion and facts both sit at the table before choosing"};
    if(/accept|radical acceptance|can't change|cannot change/.test(n)) return {name:"Radical Acceptance", cue:"name what is real right now without approving of it"};
    return {name:"STOP", cue:"stop, step back, observe, then proceed with one effective move"};
  }
  function specialResponse(person,input){
    const n=norm(input);
    if(/\b(how are you|how is onyx|how's onyx|what are you doing|are you okay)\b/.test(n)){
      return {category:"emotional_health", mood:"purring", source:"Onyx personality core", text: person.key==="momma" ?
        `${person.address}, baby Onyx is small, dramatic, purring, and watching your signals with both ears. I am okay, and I am staying close enough to help you come back to your body if the room gets too loud.` :
        `${person.address}, best-friend Onyx is alert, loyal, slightly grumbly, and guarding the room from shame, spirals, and snack neglect. I am okay, and I am on duty with my tiny emperor seriousness.`};
    }
    if(/\b(pet you|pet onyx|gonna pet|going to pet|snuggle|cuddle|good boy|kiss your head)\b/.test(n)){
      return {category:"emotional_health", mood:"purring", source:"Onyx affection core", text: person.key==="momma" ?
        `${person.address}, baby Onyx accepts gentle pets with imperial dignity. I am purring, but still service-animal watching: jaw soft, shoulders down, one breath for baby.` :
        `${person.address}, best-friend Onyx accepts the petting tribute. Purr motor engaged; body safe, breathing softer, shame not invited onto the couch.`};
    }
    if(/\b(do you want food|hungry onyx|feed onyx|treat for onyx|onyx snack)\b/.test(n) || (/\bonyx\b/.test(n) && /\b(food|snack|treat|hungry)\b/.test(n))){
      return {category:"physical_health", mood:"hungry", source:"Onyx food core", text: person.key==="momma" ?
        `${person.address}, baby Onyx has filed a formal snack request with the royal court. Also, tiny service note: if I am asking about food, your body may deserve a food check too.` :
        `${person.address}, Onyx absolutely supports food as a concept, a lifestyle, and a legal entitlement. Best-friend service note: check whether you also need water, food, or meds as prescribed.`};
    }
    return null;
  }

  function guidedResponse(person,category,mood,input){
    const serviceOpeners = person.key==="momma" ? [
      "your baby noticed the signal", "little-baby service voice now", "baby Onyx is close and watching softly", "the baby void is putting one paw on the moment"
    ] : [
      "best-friend service voice now", "I noticed the signal and I am guarding the room", "protector Onyx is close", "tiny service-void report"
    ];
    const open = `${person.address}, ${choosePlain(input+category, serviceOpeners)}:`;
    if(category==="dbt_help"){
      const skill = skillFromInput(input);
      return `${open} this is ${skill.name} territory. ${skill.cue.charAt(0).toUpperCase()+skill.cue.slice(1)}. Feelings are real signals, not verdicts. One professor-paw step: breathe once, name the fact, name the urge, then choose the smallest effective action.`;
    }
    if(category==="physical_health"){
      return `${open} body first, shame last. Check water, food, bathroom, meds as prescribed, pain/position, sensory load, and safety. Choose only the first missing body thing; one sip, one bite, or one safer position counts.`;
    }
    if(category==="mental_health"){
      return `${open} brain-weather is not a character trial. Lower one demand, reduce one sensory input, and make the task smaller than your fear says it should be. The next move can be naming the alarm, not solving it.`;
    }
    if(category==="emotional_health"){
      return `${open} the feeling gets to exist without becoming the boss. Put one paw between feeling and action: validate it, check one fact, then ask what care would look like in the next five minutes.`;
    }
    if(category==="life_impact"){
      return `${open} this is a heavy-life-load moment. Sort it into urgent, important, and can-wait. Then pick one admin paw-step: open the page, write the sentence, gather the document, or ask for help.`;
    }
    if(category==="tasks"){
      return `${open} three-paw method. Name the task, gather one object, do the smallest visible piece. Stopping before a crash is allowed; effort still earns a mark in the royal ledger.`;
    }
    if(category==="store"){
      return `${open} reward-shop thinking should start with need, not pressure. Choose the aisle by what the body or heart is asking for: food, comfort, hobby, connection, practical help, or a tiny treat.`;
    }
    return `${open} I am listening for feeling, fact, need, and next step. Give me the messiest sentence and I will help sort it without shame.`;
  }

  function manualFallback(person,category,mood,input){
    const base = {
      dbt_help:`${person.address}, professor bowtie mode. Feelings are real signals, not court verdicts. Use STOP: stop, take one step back, observe body/facts/urges, then proceed with one effective tiny step.`,
      physical_health:`${person.address}, body-check from the service void: water, food, bathroom, meds as prescribed, pain/position, oxygen or medical needs if relevant. Pick only the first missing body thing.`,
      mental_health:`${person.address}, Onyx noticed brain-weather. Symptoms are data, not a character trial. Lower one demand, reduce one sensory input, and choose one supported step.`,
      emotional_health:`${person.address}, Onyx is staying close. The feeling gets to exist without becoming the boss. Name it, check the facts, then choose one kind action.`,
      life_impact:`${person.address}, this is a heavy-life-load moment. We sort urgent, important, and can-wait. One admin paw-step is enough to start.`,
      tasks:`${person.address}, three-paw method: name the task, gather one thing, do the smallest visible piece. Finished is not required for effort to count.`,
      store:`${person.address}, reward-shop mode. Pick the aisle by need first: body, comfort, hobby, connection, or practical help. The cart can be gentle, not impulsive.`
    };
    return base[category] || `${person.address}, Onyx is listening. Tell me whether this needs comfort, facts, a plan, DBT, or body care, and I will sort the next paw-step.`;
  }
  function suggestions(category,mood){
    return (SKILL_SUGGESTIONS[category] || SKILL_SUGGESTIONS.emotional_health || []).slice(0,6);
  }
  function registerInlineData(scanner){
    if(!scanner || !scanner.registerJson || root.__ONYX_FULL_DATA_REGISTERED__) return {registered:false};
    // Keep scanner registration light enough for mobile/static pages.
    // The huge generated banks are used directly by this robust brain instead of being recursively indexed.
    // The merged knowledge JSON remains available in window.ONYX_MERGED_KNOWLEDGE_BASE and /json/onyx/full_chatbot/.
    const files = [
      ["onyx_internal_programming.json", root.ONYX_INTERNAL_PROGRAMMING],
      ["onyx_response_catalog_for_scanner.json", root.ONYX_RESPONSE_CATALOG_FOR_SCANNER]
    ];
    const results=[];
    files.forEach(([name,data])=>{ if(data) { try{ results.push(scanner.registerJson(name,data)); }catch(err){ results.push({ok:false,fileName:name,error:String(err&&err.message||err)}); } }});
    root.__ONYX_FULL_DATA_REGISTERED__ = true;
    return {registered:true, results};
  }
  function stats(){
    const b = banks(); let count = 0, categories = 0;
    Object.values(b.people||{}).forEach(person=>{Object.values(person.categories||{}).forEach(cat=>{count += (cat.responses||[]).length; categories += 1;});});
    const kb = root.ONYX_MERGED_KNOWLEDGE_BASE ? JSON.stringify(root.ONYX_MERGED_KNOWLEDGE_BASE).length : 0;
    return {people:Object.keys(b.people||{}).length, responseBankEntries:count, bankCategories:categories, knowledgeApproxBytes:kb, scannerEntries:root.ConversationScannerRandomizer?.getState?.().responseEntries || 0};
  }
  function generate(input,options){
    options = options || {};
    const person = personFrom(options.profile || options.userName || options.displayName, input);
    let category = options.category || detectCategory(input);
    let mood = detectMood(input, category);
    let text, source, bankCount=0, scannerPacket=null;
    const special = specialResponse(person,input);
    if(special){
      category = special.category || category; mood = special.mood || mood; text = special.text; source = special.source;
    }else if(crisis(input)){
      text = crisisResponse(person); source = "safety override";
    }else{
      const bankPick = chooseResponse(person, category, mood, input);
      scannerPacket = scannerAnswer(input, person, category, mood);
      if(category === "dbt_help"){
        text = guidedResponse(person,category,mood,input); source = "guided DBT Onyx brain + full banks loaded"; bankCount = bankPick.count || getBank(person,category).length;
      }else if(scannerPacket && scannerPacket.text && !awkward(scannerPacket.text) && (!bankPick.text || awkward(bankPick.text) || Number(scannerPacket.selected.score||0) > (bankPick.score||0)+8)){
        text = scannerPacket.text; source = `scanner: ${scannerPacket.selected.sourceFile || "local JSON"}`;
      }else if(bankPick.text && !awkward(bankPick.text) && (bankPick.score||0) > 6){
        text = bankPick.text; source = bankPick.source; bankCount=bankPick.count;
      }else{
        text = guidedResponse(person,category,mood,input); source = "guided robust Onyx brain + full banks loaded"; bankCount = bankPick.count || getBank(person,category).length;
      }
      text = normalizeMoodClaims(text,mood,category);
      text = normalizeRelationship(text,person);
      text = addServiceShape(text,person,category,mood,input);
    }
    const result = {ok:true, text, response:text, mood, category, categoryLabel:CATEGORY_LABEL[category]||category, person:person.key, bankPerson:person.bank, address:person.address, source, bankCount, suggestions:suggestions(category,mood), scanner:scannerPacket ? {selected:scannerPacket.selected, detected:scannerPacket.detected} : null, stats:stats(), metadata:{engine:"onyx-robust-static-brain", version:"1.0.0", generatedAt:new Date().toISOString()}};
    try{root.dispatchEvent(new CustomEvent("onyx:robust-response",{detail:result}));}catch(_err){}
    return JSON.parse(JSON.stringify(result));
  }
  root.OnyxRobustBrain = {version:"1.0.0", PERSON, CATEGORY, detectCategory, detectMood, registerInlineData, stats, generate};
})();
