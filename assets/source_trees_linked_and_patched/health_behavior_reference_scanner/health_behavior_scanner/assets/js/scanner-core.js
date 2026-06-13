(function(global){
  'use strict';

  var STOP = {
    the:1,and:1,that:1,with:1,have:1,this:1,from:1,for:1,you:1,your:1,are:1,was:1,were:1,they:1,them:1,then:1,than:1,into:1,about:1,because:1,just:1,like:1,what:1,when:1,where:1,there:1,their:1,will:1,would:1,could:1,should:1,not:1,but:1,all:1,can:1,cant:1,cannot:1,its:1,ive:1,im:1,ill:1,had:1,has:1,been:1,being:1,our:1,out:1,off:1,over:1,under:1,very:1,more:1,less:1,too:1
  };

  function cleanText(text){
    if(!text) return '';
    return String(text)
      .replace(/<script[\s\S]*?<\/script>/gi,' ')
      .replace(/<style[\s\S]*?<\/style>/gi,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function tokens(text){
    var raw = cleanText(text).toLowerCase().replace(/[^a-z0-9'\-\s]/g,' ').split(/\s+/);
    var out = [];
    for(var i=0;i<raw.length;i++){
      var t = raw[i].replace(/^'+|'+$/g,'');
      if(t.length < 3) continue;
      if(STOP[t]) continue;
      out.push(t);
    }
    return out;
  }

  function uniq(list){
    var seen = {}, out = [];
    for(var i=0;i<list.length;i++){
      var v = list[i];
      if(!seen[v]){ seen[v]=1; out.push(v); }
    }
    return out;
  }

  function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function evidenceFor(text, phrases){
    var cleaned = cleanText(text);
    var lower = cleaned.toLowerCase();
    for(var i=0;i<phrases.length;i++){
      var p = phrases[i].toLowerCase();
      var idx = lower.indexOf(p);
      if(idx >= 0){
        var start = Math.max(0, idx - 90);
        var end = Math.min(cleaned.length, idx + p.length + 120);
        return cleaned.slice(start, end);
      }
    }
    var sentences = cleaned.match(/[^.!?]+[.!?]*/g) || [cleaned];
    return (sentences[0] || '').slice(0,260);
  }

  function chunkText(text, size, overlap){
    var words = cleanText(text).split(/\s+/);
    var chunks = [];
    if(!words.length || !words[0]) return chunks;
    size = size || 130;
    overlap = overlap || 30;
    var n = 0;
    for(var i=0;i<words.length;i += Math.max(1, size-overlap)){
      var part = words.slice(i, i+size).join(' ');
      if(part.trim().length < 20) continue;
      chunks.push({ id:'chunk-' + (++n), text:part, tokenSet:tokenSet(part) });
      if(i + size >= words.length) break;
    }
    return chunks;
  }

  function tokenSet(text){
    var ts = tokens(text), set = {};
    for(var i=0;i<ts.length;i++) set[ts[i]] = (set[ts[i]] || 0) + 1;
    return set;
  }

  function addDocument(store, doc){
    var text = cleanText(doc.text || '');
    if(!text) return null;
    var id = doc.id || ('doc-' + (store.documents.length + 1) + '-' + Date.now());
    var item = {
      id:id,
      title:doc.title || id,
      source:doc.source || 'attached',
      type:doc.type || 'text',
      addedAt:new Date().toISOString(),
      text:text,
      chunks:chunkText(text, doc.chunkSize || 150, doc.overlap || 35)
    };
    store.documents.push(item);
    return item;
  }

  function createStore(){
    return { documents:[], builtInCount:0, importedCount:0, lastReport:null, lastPrompt:'' };
  }

  function flattenHealth(data){
    var docs = [];
    if(!data || !data.health) return docs;
    for(var c=0;c<data.health.length;c++){
      var cat = data.health[c] || {};
      var entries = cat.entries || [];
      for(var i=0;i<entries.length;i++){
        var e = entries[i] || {};
        var parts = [];
        parts.push('Topic: ' + (e.name || e.id || 'health support entry'));
        if(e.source_group) parts.push('Group: ' + e.source_group);
        if(e.life_limitations) parts.push('Life limitations: ' + joinField(e.life_limitations));
        if(e.possible_life_improvements_or_supports) parts.push('Possible improvements or supports: ' + joinField(e.possible_life_improvements_or_supports));
        if(e.support_or_accommodation_ideas) parts.push('Support or accommodation ideas: ' + joinField(e.support_or_accommodation_ideas));
        if(e.spoon_energy_notes) parts.push('Energy pacing notes: ' + joinField(e.spoon_energy_notes));
        if(e.individual_variability_note) parts.push('Individual variability: ' + joinField(e.individual_variability_note));
        docs.push({
          id:'health-' + (e.id || (c + '-' + i)),
          title:e.name || 'Health support entry',
          source:cat.source_pdf || 'health life impact catalog',
          type:'built-in-health',
          text:parts.join('\n')
        });
      }
    }
    return docs;
  }

  function flattenDbt(data){
    var docs = [];
    var dbt = data && data.dbt ? data.dbt : {};
    var modules = dbt.modules || [];
    for(var m=0;m<modules.length;m++){
      var mod = modules[m] || {};
      var modParts = ['DBT module: ' + (mod.module || mod.module_key || 'module')];
      if(mod.short) modParts.push(mod.short);
      if(mod.aims) modParts.push('Aims: ' + joinField(mod.aims));
      if(mod.core_targets) modParts.push('Core targets: ' + joinField(mod.core_targets));
      docs.push({id:'dbt-module-' + (mod.module_key || m), title:mod.module || 'DBT module', source:'DBT catalog', type:'built-in-dbt', text:modParts.join('\n')});
    }
    var handouts = dbt.handouts || [];
    for(var h=0;h<handouts.length;h++){
      var ho = handouts[h] || {};
      var hp = ['DBT handout reference: ' + (ho.title_full || ho.title || ho.id || 'handout')];
      if(ho.module) hp.push('Module: ' + ho.module);
      if(ho.summary) hp.push('Summary: ' + ho.summary);
      if(ho.practice_steps) hp.push('Practice steps: ' + joinField(ho.practice_steps));
      if(ho.keywords) hp.push('Keywords: ' + joinField(ho.keywords));
      docs.push({id:'dbt-handout-' + (ho.id || h), title:ho.title_full || ho.title || 'DBT handout', source:'DBT catalog', type:'built-in-dbt', text:hp.join('\n')});
    }
    var worksheets = dbt.worksheets || [];
    for(var w=0;w<worksheets.length;w++){
      var ws = worksheets[w] || {};
      var wp = ['DBT worksheet reference: ' + (ws.title_full || ws.title || ws.id || 'worksheet')];
      if(ws.module) wp.push('Module: ' + ws.module);
      if(ws.summary) wp.push('Summary: ' + ws.summary);
      if(ws.practice_steps) wp.push('Practice steps: ' + joinField(ws.practice_steps));
      if(ws.keywords) wp.push('Keywords: ' + joinField(ws.keywords));
      docs.push({id:'dbt-worksheet-' + (ws.id || w), title:ws.title_full || ws.title || 'DBT worksheet', source:'DBT catalog', type:'built-in-dbt', text:wp.join('\n')});
    }
    return docs;
  }

  function joinField(v){
    if(Array.isArray(v)) return v.join('; ');
    if(v && typeof v === 'object') return JSON.stringify(v);
    return String(v || '');
  }

  function loadBuiltIns(store, data){
    var healthDocs = flattenHealth(data);
    var dbtDocs = flattenDbt(data);
    for(var i=0;i<healthDocs.length;i++) addDocument(store, healthDocs[i]);
    for(var j=0;j<dbtDocs.length;j++) addDocument(store, dbtDocs[j]);
    store.builtInCount = healthDocs.length + dbtDocs.length;
    return store.builtInCount;
  }

  var SIGNALS = [
    {key:'crisis_safety', label:'Possible urgent safety issue', level:'high', focus:'behavioral', confidence:90, phrases:['kill myself','suicide','suicidal','self harm','self-harm','hurt myself','cannot stay safe','not safe with myself','overdose','want to die','no reason to live','cutting myself','harm someone','hurt someone else'], support:['Escalate to emergency/crisis support before chatbot guidance.','Ask only enough to support immediate safety.']},
    {key:'medical_red_flag', label:'Possible medical red flag', level:'high', focus:'physical', confidence:88, phrases:['chest pain','trouble breathing','can’t breathe','cannot breathe','fainting','stroke','seizure','blue lips','oxygen dropped','severe allergic','anaphylaxis','new weakness','worst headache'], support:['Use emergency or urgent medical support rather than chatbot-only guidance.']},
    {key:'basic_care_gap', label:'Basic care may be blocked', level:'medium', focus:'both', confidence:72, phrases:['haven’t showered','havent showered','not showered','cannot shower','can’t shower','havent eaten','haven’t eaten','forgot to eat','not eating','haven’t drank','dehydrated','not drinking water','brushing teeth is hard','cannot cook','can’t cook'], support:['Offer tiny-step care options, low-energy alternatives, and shame-free support.']},
    {key:'mobility_barrier', label:'Mobility or access barrier', level:'medium', focus:'physical', confidence:75, phrases:['wheelchair','power chair','manual chair','walker','rollator','cane','crutches','stairs','too tired to stand','cannot stand','can’t stand','hard to walk','barely walk','fall risk','falls','transfer','shower chair','grab bar','bidet','oxygen'], support:['Reference mobility aids, pacing, safer setup, and caregiver support when available.']},
    {key:'pain_fatigue_flare', label:'Pain, fatigue, or flare pattern', level:'medium', focus:'physical', confidence:70, phrases:['flare','pain','exhausted','fatigue','spoons','low energy','bedridden','stuck in bed','migraine','nausea','dizzy','weak','tremor','joint pain'], support:['Use pacing, lower-demand task versions, rest planning, and physical-health references.']},
    {key:'emotional_overload', label:'Emotional overload', level:'medium', focus:'behavioral', confidence:72, phrases:['overwhelmed','spiraling','meltdown','panic','shut down','shutdown','can’t calm down','cannot calm down','too much','emotionally flooded','rage','exploded','crying all day'], support:['Suggest distress tolerance, grounding, sensory reduction, and brief next-step choices.']},
    {key:'avoidance_stuck', label:'Avoidance or stuck-loop pattern', level:'medium', focus:'behavioral', confidence:65, phrases:['putting it off','avoid','avoiding','stuck','freeze','frozen','paralyzed','can’t start','cannot start','doom scrolling','scrolling all day','lost track of time','task feels impossible'], support:['Use tiny task splitting, missing-links analysis, and ADHD-friendly prompts.']},
    {key:'rejection_abandonment', label:'Rejection, abandonment, or relationship threat cue', level:'medium', focus:'behavioral', confidence:68, phrases:['they hate me','abandoned','leave me','rejected','ignored me','no one cares','clingy','too needy','people always leave','they are mad at me','are you mad at me'], support:['Use validation, checking facts, interpersonal effectiveness, and attachment-sensitive reassurance.']},
    {key:'shame_self_attack', label:'Shame or self-attack cue', level:'medium', focus:'behavioral', confidence:70, phrases:['i’m useless','im useless','worthless','lazy','failure','bad person','hate myself','gross','burden','pathetic','stupid','i ruin everything'], support:['Use nonjudgmental language, self-validation, opposite action to shame, and low-pressure care steps.']},
    {key:'masked_distress', label:'Possible masked distress', level:'low', focus:'both', confidence:58, phrases:['i’m fine','im fine','it’s fine','its fine','whatever','doesn’t matter','doesnt matter','not a big deal','i guess','probably my fault'], support:['Treat as uncertain. Ask gentle permission before deeper questions. Look for surrounding evidence before acting.']},
    {key:'caregiver_context', label:'Caregiver or support-person context', level:'low', focus:'both', confidence:55, phrases:['caregiver','fiancé helps','fiance helps','partner helps','mom helps','dad helps','needs help with','ask for help','support person','advocate'], support:['Consider shared tasks, consent, practical handoffs, and clear communication scripts.']}
  ];

  var DBT_HINTS = [
    {topic:'Distress tolerance', phrases:['overwhelmed','spiraling','panic','crisis','urge','self harm','rage','cannot calm','too much'], query:'distress tolerance crisis survival STOP TIP grounding self soothe'},
    {topic:'Emotion regulation', phrases:['emotion','mood','rage','sad','shame','guilt','fear','anxiety','depression','overload'], query:'emotion regulation naming emotions opposite action PLEASE vulnerability'},
    {topic:'Mindfulness', phrases:['ruminating','thoughts','judging','judgment','present','focus','dissociate','numb','blank'], query:'mindfulness wise mind observe describe participate nonjudgmentally'},
    {topic:'Interpersonal effectiveness', phrases:['rejected','ignored','relationship','boundaries','ask for help','no one cares','mad at me','leave me'], query:'interpersonal effectiveness DEAR MAN GIVE FAST boundaries ask say no'},
    {topic:'Behavior chain', phrases:['can’t start','stuck','avoid','loop','again','habit','trigger','consequence'], query:'chain analysis missing links problem solving behavior'}
  ];

  function detectSignals(text, threshold, focus){
    var lower = cleanText(text).toLowerCase();
    var found = [];
    for(var i=0;i<SIGNALS.length;i++){
      var sig = SIGNALS[i];
      if(focus === 'behavioral' && sig.focus === 'physical') continue;
      if(focus === 'physical' && sig.focus === 'behavioral') continue;
      var hits = [];
      for(var p=0;p<sig.phrases.length;p++){
        var phrase = sig.phrases[p].toLowerCase();
        if(lower.indexOf(phrase) >= 0) hits.push(sig.phrases[p]);
      }
      if(hits.length){
        var extra = Math.min(15, (hits.length-1)*5);
        var score = Math.min(99, sig.confidence + extra);
        if(score >= threshold){
          found.push({key:sig.key,label:sig.label,level:sig.level,focus:sig.focus,score:score,hits:hits,evidence:evidenceFor(text,hits),support:sig.support});
        }
      }
    }
    found.sort(function(a,b){ return b.score - a.score; });
    return found;
  }

  function inferBetweenLines(text, signals, threshold){
    var lower = cleanText(text).toLowerCase();
    var out = [];
    function hasAny(list){ for(var i=0;i<list.length;i++){ if(lower.indexOf(list[i])>=0) return true; } return false; }
    function add(label, score, rationale, query, level){ if(score >= threshold){ out.push({label:label, score:score, rationale:rationale, query:query, level:level || 'low'}); } }
    var masked = hasAny(['i’m fine','im fine','it’s fine','its fine','whatever','not a big deal','doesn’t matter','doesnt matter']);
    var careGap = false, overload = false, pain = false, relationship = false, shame = false;
    for(var s=0;s<signals.length;s++){
      if(signals[s].key === 'basic_care_gap') careGap = true;
      if(signals[s].key === 'emotional_overload') overload = true;
      if(signals[s].key === 'pain_fatigue_flare') pain = true;
      if(signals[s].key === 'rejection_abandonment') relationship = true;
      if(signals[s].key === 'shame_self_attack') shame = true;
    }
    if(masked && (careGap || overload || pain)) add('The user may be minimizing distress while still needing practical support.', 68, 'A minimizing phrase appears near care, overload, pain, or fatigue cues. Treat this as possible, not certain.', 'masked distress practical support validation pacing', 'medium');
    if(careGap && shame) add('Basic self-care may need to be framed as disability-aware support, not a moral failure.', 74, 'Care gaps and self-attack language appear together.', 'self care shame opposite action tiny steps disability support', 'medium');
    if(overload && relationship) add('The conversation may need attachment-sensitive validation before problem-solving.', 70, 'Emotional overload appears with rejection or abandonment language.', 'validation checking facts interpersonal effectiveness attachment sensitive', 'medium');
    if(pain && hasAny(['should','supposed to','lazy','failure','burden'])) add('Physical limitation may be getting interpreted as laziness or failure.', 72, 'Pain/fatigue language appears with pressure or self-blame terms.', 'fatigue pacing accommodations self validation', 'medium');
    if(hasAny(['forgot','lost track','can’t start','cannot start','too many steps']) && hasAny(['task','clean','shower','eat','appointment','email'])) add('Executive-function support may be more useful than motivation talk.', 67, 'Task language appears with start/remember/time cues.', 'ADHD tiny steps missing links routine prompts', 'medium');
    if(!out.length && cleanText(text).length > 50) add('No strong indirect pattern found; use gentle questions and cite only clear evidence.', Math.max(20, threshold), 'The text does not contain enough overlapping cues for a stronger inference.', 'gentle support ask permission', 'low');
    out.sort(function(a,b){return b.score-a.score;});
    return out;
  }

  function searchDocuments(store, query, options){
    options = options || {};
    var mode = options.mode || 'balanced';
    var limit = options.limit || 8;
    var qTokens = tokens(query).concat(tokens((options.extra || '').join ? options.extra.join(' ') : (options.extra || '')));
    qTokens = uniq(qTokens);
    var results = [];
    for(var d=0; d<store.documents.length; d++){
      var doc = store.documents[d];
      var isBuilt = String(doc.type || '').indexOf('built-in') === 0;
      if(mode === 'attached' && isBuilt) continue;
      if(mode === 'builtIn' && !isBuilt) continue;
      for(var c=0; c<doc.chunks.length; c++){
        var chunk = doc.chunks[c];
        var score = 0, matched = [];
        for(var t=0; t<qTokens.length; t++){
          var tok = qTokens[t];
          if(chunk.tokenSet[tok]){ score += 2 + Math.min(4, chunk.tokenSet[tok]); matched.push(tok); }
        }
        if(score > 0){
          var titleTokens = tokens(doc.title || '');
          for(var tt=0; tt<titleTokens.length; tt++){
            if(qTokens.indexOf(titleTokens[tt])>=0) score += 3;
          }
          results.push({docId:doc.id,title:doc.title,source:doc.source,type:doc.type,chunkId:chunk.id,score:score,matched:uniq(matched),text:chunk.text});
        }
      }
    }
    results.sort(function(a,b){ return b.score - a.score; });
    return results.slice(0, limit);
  }

  function dbtSuggestions(store, text, mode){
    var lower = cleanText(text).toLowerCase();
    var suggestions = [];
    for(var i=0;i<DBT_HINTS.length;i++){
      var item = DBT_HINTS[i], hit = false;
      for(var p=0;p<item.phrases.length;p++){ if(lower.indexOf(item.phrases[p])>=0){ hit = true; break; } }
      if(hit){
        var refs = searchDocuments(store, item.query + ' ' + text, {mode:mode, limit:3});
        suggestions.push({topic:item.topic, query:item.query, references:refs});
      }
    }
    if(!suggestions.length){
      suggestions.push({topic:'Gentle orientation', query:'validation wise mind tiny next step', references:searchDocuments(store, 'validation wise mind tiny next step', {mode:mode, limit:3})});
    }
    return suggestions.slice(0,5);
  }

  function healthMatches(store, text, mode, focus){
    var q = text;
    if(focus === 'behavioral') q += ' mental health anxiety shame trauma emotion relationship DBT';
    if(focus === 'physical') q += ' pain fatigue mobility disability accommodation aid energy pacing';
    if(focus === 'both') q += ' mental health physical health disability accommodation DBT energy pacing';
    return searchDocuments(store, q, {mode:mode, limit:10});
  }

  function makePrompt(report){
    var lines = [];
    lines.push('You are responding as a supportive health-and-behavior chatbot. Use only the cited reference pack and the user conversation. Do not diagnose, prescribe, or claim certainty about implied feelings.');
    lines.push('Use trauma-sensitive, disability-aware, low-shame wording. Ask permission before deeper questions. Give tiny next steps when the user seems overwhelmed.');
    if(report.safetyFlags.length){
      lines.push('Safety priority: the scan found possible urgent safety or medical red-flag language. Encourage emergency/crisis/urgent support instead of chatbot-only guidance.');
    }
    lines.push('\nDetected direct signals:');
    for(var i=0;i<report.signals.length;i++) lines.push('- ' + report.signals[i].label + ' (' + report.signals[i].score + '%): evidence: "' + report.signals[i].evidence + '"');
    lines.push('\nPossible between-the-lines signals; phrase these as uncertain:');
    for(var j=0;j<report.implied.length;j++) lines.push('- ' + report.implied[j].label + ' (' + report.implied[j].score + '%): ' + report.implied[j].rationale);
    lines.push('\nSuggested support direction:');
    for(var d=0;d<report.dbt.length;d++) lines.push('- ' + report.dbt[d].topic);
    lines.push('\nReference pack citations to consider:');
    for(var r=0;r<report.references.length;r++) lines.push('- [' + (r+1) + '] ' + report.references[r].title + ' / ' + report.references[r].source + ' / ' + report.references[r].chunkId);
    lines.push('\nRequired answer style: validate first, cite references where relevant, offer practical accommodations or DBT skills, and keep crisis language clear if safety flags exist.');
    return lines.join('\n');
  }

  function scan(store, text, opts){
    opts = opts || {};
    var threshold = Number(opts.threshold || 55);
    var focus = opts.focus || 'both';
    var mode = opts.mode || 'balanced';
    var signals = detectSignals(text, threshold, focus);
    var implied = inferBetweenLines(text, signals, Math.max(35, threshold - 10));
    var safetyFlags = [];
    for(var s=0;s<signals.length;s++){ if(signals[s].level === 'high') safetyFlags.push(signals[s]); }
    var refQueryParts = [text];
    for(var i=0;i<signals.length;i++){ refQueryParts.push(signals[i].label); refQueryParts = refQueryParts.concat(signals[i].hits || []); }
    for(var k=0;k<implied.length;k++){ refQueryParts.push(implied[k].query); }
    var refs = healthMatches(store, refQueryParts.join(' '), mode, focus);
    var dbt = dbtSuggestions(store, text + ' ' + refQueryParts.join(' '), mode);
    var used = {}, allRefs = [];
    function take(list){
      for(var i=0;i<list.length;i++){
        var key = list[i].docId + '::' + list[i].chunkId;
        if(!used[key]){ used[key]=1; allRefs.push(list[i]); }
      }
    }
    take(refs);
    for(var d=0; d<dbt.length; d++) take(dbt[d].references || []);
    var report = {
      schema:'health-behavior-scan-report-v1',
      createdAt:new Date().toISOString(),
      settings:{threshold:threshold, focus:focus, referenceMode:mode},
      conversationPreview:cleanText(text).slice(0,800),
      signals:signals,
      implied:implied,
      safetyFlags:safetyFlags,
      dbt:dbt,
      references:allRefs.slice(0,14)
    };
    report.prompt = makePrompt(report);
    store.lastReport = report;
    store.lastPrompt = report.prompt;
    return report;
  }

  function importPackage(store, pack){
    var count = 0;
    if(!pack) return 0;
    var docs = pack.documents || pack.files || [];
    for(var i=0;i<docs.length;i++){
      var d = docs[i];
      var text = d.text || d.content || d.body || '';
      if(text){
        addDocument(store,{id:d.id,title:d.title || d.name || d.path || ('imported-' + i),source:d.source || d.path || 'imported package',type:d.type || 'attached',text:text});
        count++;
      }
    }
    store.importedCount += count;
    return count;
  }

  function exportIndex(store){
    var docs = [];
    for(var i=0;i<store.documents.length;i++){
      var d = store.documents[i];
      if(String(d.type || '').indexOf('built-in') === 0) continue;
      docs.push({id:d.id,title:d.title,source:d.source,type:d.type,text:d.text});
    }
    return {schema:'health-behavior-document-index-v1',createdAt:new Date().toISOString(),documents:docs};
  }

  global.HealthBehaviorScanner = {
    createStore:createStore,
    cleanText:cleanText,
    tokens:tokens,
    addDocument:addDocument,
    loadBuiltIns:loadBuiltIns,
    importPackage:importPackage,
    searchDocuments:searchDocuments,
    scan:scan,
    exportIndex:exportIndex
  };
})(window);
