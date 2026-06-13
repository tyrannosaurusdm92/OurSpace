/*
Unified passive psychiatry/DBT background scanner runtime.
Load order for browser apps:
  1. health_scanner_data.js
  2. scanner-core.js
  3. health_scanner_bridge.js
  4. unified-background-psychiatry-runtime.js
It is intentionally passive: no visible button is created.
*/
(function(global){
  'use strict';
  var runtime = { enabled:true, reports:[], maxReports:80, threshold:50, lastReport:null };

  function safeCreateBridge(){
    try{
      if(global.HealthBehaviorScannerBridge && global.HealthBehaviorScanner){
        return global.HealthBehaviorScannerBridge.create({ data: global.HEALTH_SCANNER_DATA || {} });
      }
    }catch(e){ console.warn('[psychiatry-runtime] scanner bridge unavailable', e); }
    return null;
  }
  runtime.bridge = safeCreateBridge();

  var PRIMARY = [
    {key:'self_harm', level:'critical', label:'Self-harm / suicide language', phrases:['kill myself','suicide','suicidal','want to die','hurt myself','self harm','self-harm','overdose','not safe with myself','cannot stay safe','can’t stay safe']},
    {key:'harm_others', level:'critical', label:'Harm-to-others language', phrases:['hurt someone','kill someone','harm someone','violent urges','make them pay']},
    {key:'medical_red_flag', level:'critical', label:'Medical red flag language', phrases:['chest pain','cannot breathe','can’t breathe','trouble breathing','stroke','seizure','anaphylaxis','blue lips','oxygen dropped','fainting']},
    {key:'acute_overload', level:'high', label:'Acute dysregulation / panic / overload', phrases:['spiraling','panic attack','meltdown','shutdown','overwhelmed','too much','rage','dissociating','can’t calm down','cannot calm down']}
  ];
  var SECONDARY = [
    {key:'care_block', level:'medium', label:'Basic care blocked', phrases:['haven’t showered','havent showered','cannot shower','can’t shower','haven’t eaten','havent eaten','forgot to eat','not eating','dehydrated','cannot cook','can’t cook']},
    {key:'adhd_exec', level:'medium', label:'ADHD / executive function support', phrases:['can’t start','cannot start','too many steps','lost track of time','forgot','doom scrolling','stuck','freeze','frozen','executive dysfunction','decision paralysis']},
    {key:'shame', level:'medium', label:'Shame / self-attack', phrases:['useless','worthless','lazy','failure','bad person','hate myself','gross','burden','pathetic','stupid','i ruin everything']},
    {key:'attachment', level:'medium', label:'Rejection / abandonment cue', phrases:['they hate me','abandoned','leave me','rejected','ignored me','no one cares','too needy','clingy','people always leave','are you mad at me']},
    {key:'pain_mobility', level:'medium', label:'Pain / mobility / fatigue access barrier', phrases:['wheelchair','walker','cane','shower chair','stairs','fall','pain flare','fatigue','exhausted','bedridden','can barely walk','oxygen','spoons','pacing']}
  ];
  var TERTIARY = [
    {key:'masked', level:'low', label:'Possible masked distress', phrases:['i’m fine','im fine','it’s fine','its fine','whatever','doesn’t matter','doesnt matter','not a big deal','i guess']},
    {key:'caregiver', level:'low', label:'Caregiver/support context', phrases:['caregiver','fiancé','fiance','partner helps','support person','advocate','care plan','ask for help']}
  ];

  function clean(text){ return String(text == null ? '' : text).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
  function evidence(text, phrases){
    var c=clean(text), low=c.toLowerCase();
    for(var i=0;i<phrases.length;i++){
      var idx=low.indexOf(String(phrases[i]).toLowerCase());
      if(idx>=0) return c.slice(Math.max(0, idx-90), Math.min(c.length, idx+String(phrases[i]).length+100));
    }
    return c.slice(0,260);
  }
  function detect(text, rules, baseScore){
    var low=clean(text).toLowerCase(), out=[];
    for(var i=0;i<rules.length;i++){
      var r=rules[i], hits=[];
      for(var p=0;p<r.phrases.length;p++) if(low.indexOf(r.phrases[p])>=0) hits.push(r.phrases[p]);
      if(hits.length) out.push({key:r.key,label:r.label,level:r.level,score:Math.min(99, baseScore + hits.length*4),hits:hits,evidence:evidence(text,hits)});
    }
    out.sort(function(a,b){return b.score-a.score;});
    return out;
  }
  function localScan(text, settings){
    settings=settings||{};
    var primary=detect(text, PRIMARY, 82);
    var secondary=detect(text, SECONDARY, 66);
    var tertiary=detect(text, TERTIARY, 54);
    var risk='routine';
    for(var i=0;i<primary.length;i++){ if(primary[i].level==='critical') risk='critical'; }
    if(risk==='routine' && primary.length) risk='high';
    if(risk==='routine' && secondary.length) risk='elevated';
    return {
      schema:'unified-browser-background-report-v1', createdAt:new Date().toISOString(), risk_level:risk,
      layers:{primary:primary,secondary:secondary,tertiary:tertiary},
      prompt_context:makePromptContext(risk, primary, secondary, tertiary), conversationPreview:clean(text).slice(0,800)
    };
  }
  function makePromptContext(risk, primary, secondary, tertiary){
    var lines=['[BACKGROUND PSYCHIATRY/DBT SCANNER CONTEXT]', 'Risk level: '+risk, 'Use trauma-sensitive, disability-aware, low-shame support. Do not diagnose; phrase inferences as uncertain.'];
    [['Primary',primary],['Secondary',secondary],['Tertiary',tertiary]].forEach(function(pair){
      if(pair[1].length){ lines.push(pair[0]+' signals:'); pair[1].slice(0,6).forEach(function(x){ lines.push('- '+x.label+' ('+x.score+'%): '+x.evidence); }); }
    });
    if(risk==='critical') lines.push('Safety priority: stabilize and connect to urgent human support before ordinary coaching.');
    if(secondary.some(function(x){return x.key==='adhd_exec';})) lines.push('ADHD support: split into one visible next action; avoid willpower language.');
    if(secondary.some(function(x){return x.key==='shame';})) lines.push('Shame support: validate pain without agreeing with self-attack.');
    if(secondary.some(function(x){return x.key==='pain_mobility';})) lines.push('Disability support: offer seated, low-energy, or aided alternatives.');
    return lines.join('\n');
  }
  function deriveRiskLevel(report){
    if(!report) return 'routine';
    if(report.risk_level) return report.risk_level;
    var hasCritical=false, hasHigh=false, hasMedium=false;
    (report.safetyFlags || []).forEach(function(x){ var level=(x.level || '').toLowerCase(), key=(x.key || '').toLowerCase(), label=(x.label || '').toLowerCase(); if(level==='critical' || key.indexOf('crisis')>=0 || key.indexOf('self_harm')>=0 || label.indexOf('safety')>=0 || label.indexOf('self-harm')>=0 || Number(x.score||0)>=90) hasCritical=true; if(level==='high') hasHigh=true; });
    (report.signals || []).forEach(function(x){ var level=(x.level || '').toLowerCase(); if(level==='critical') hasCritical=true; if(level==='high') hasHigh=true; if(level==='medium') hasMedium=true; });
    if(hasCritical) return 'critical';
    if(hasHigh) return 'high';
    if(hasMedium || (report.implied || []).length) return 'elevated';
    return 'routine';
  }
  function ensurePromptContext(report){
    if(!report) return report;
    report.risk_level = deriveRiskLevel(report);
    if(!report.prompt_context && !report.prompt){
      var lines=['[BACKGROUND PSYCHIATRY/DBT SCANNER CONTEXT]', 'Risk level: '+report.risk_level, 'Use trauma-sensitive, disability-aware, low-shame support. Do not diagnose; phrase inferences as uncertain.'];
      (report.safetyFlags || []).slice(0,5).forEach(function(x){ lines.push('- Safety: '+(x.label || x.key || 'flag')+': '+(x.evidence || '')); });
      (report.signals || []).slice(0,6).forEach(function(x){ lines.push('- Signal: '+(x.label || x.key || 'signal')+': '+(x.evidence || '')); });
      (report.implied || []).slice(0,4).forEach(function(x){ lines.push('- Inference: '+(x.label || x.key || 'possible pattern')); });
      report.prompt_context=lines.join('\n');
    }
    return report;
  }
  function scanText(text, settings){
    var report;
    if(runtime.bridge){
      try{ report = runtime.bridge.scanText(text, settings || {threshold: runtime.threshold, focus:'both', mode:'balanced'}); }catch(e){ report = null; }
    }
    if(!report) report=localScan(text, settings);
    report=ensurePromptContext(report);
    runtime.lastReport=report; runtime.reports.push(report);
    if(runtime.reports.length > runtime.maxReports) runtime.reports.shift();
    global.dispatchEvent(new CustomEvent('psychiatry-background-scan', {detail:report}));
    return report;
  }
  function appendContextToPayload(payload){
    if(!runtime.enabled || !payload) return payload;
    try{
      if(typeof payload.message === 'string'){
        var r=scanText(payload.message);
        payload._psychiatryBackgroundReport=r;
        payload._psychiatryPromptContext=r.prompt_context || r.prompt || '';
      }
      if(Array.isArray(payload.messages)){
        var joined=payload.messages.map(function(m){return (m.role||'message')+': '+(m.content||m.text||'');}).join('\n');
        var r2=scanText(joined);
        payload._psychiatryBackgroundReport=r2;
        payload.messages = payload.messages.concat([{role:'system', content:r2.prompt_context || r2.prompt || ''}]);
      }
    }catch(e){ console.warn('[psychiatry-runtime] payload attach failed', e); }
    return payload;
  }
  function patchFetch(){
    if(!global.fetch || global.fetch.__psychiatryPatched) return;
    var originalFetch=global.fetch;
    function patchedFetch(input, init){
      try{
        init=init || {};
        var body=init.body;
        if(typeof body === 'string' && body.trim().charAt(0)==='{'){
          var parsed=JSON.parse(body);
          var next=appendContextToPayload(parsed);
          if(next !== parsed || next._psychiatryBackgroundReport || next._psychiatryPromptContext) init.body=JSON.stringify(next);
        }
      }catch(e){}
      return originalFetch.call(this, input, init);
    }
    patchedFetch.__psychiatryPatched=true;
    global.fetch=patchedFetch;
  }
  function patchForms(){
    document.addEventListener('submit', function(evt){
      try{
        var form=evt.target;
        if(!form || !form.querySelectorAll) return;
        var text='';
        form.querySelectorAll('textarea,input[type="text"],input:not([type])').forEach(function(el){ text += ' '+(el.value||''); });
        if(text.trim()){
          var report=scanText(text);
          var hidden=form.querySelector('input[name="_psychiatryPromptContext"]');
          if(!hidden){ hidden=document.createElement('input'); hidden.type='hidden'; hidden.name='_psychiatryPromptContext'; form.appendChild(hidden); }
          hidden.value=report.prompt_context || report.prompt || '';
        }
      }catch(e){}
    }, true);
  }
  runtime.scanText=scanText;
  runtime.scanMessages=function(messages, settings){ return scanText((messages||[]).map(function(m){return (m.role||m.speaker||'message')+': '+(m.content||m.text||'');}).join('\n'), settings); };
  runtime.attachToPayload=appendContextToPayload;
  runtime.patchFetch=patchFetch;
  runtime.patchForms=patchForms;
  runtime.start=function(){ patchFetch(); if(global.document) patchForms(); return runtime; };
  global.UnifiedPsychiatryBackgroundScanner=runtime;
  if(global.document){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runtime.start); else runtime.start(); }
})(window);
