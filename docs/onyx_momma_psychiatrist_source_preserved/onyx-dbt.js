(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  const map = [
    {when:['panic','overwhelmed','meltdown','shutdown','spiraling','dissociating','hyperventilating'], skill:'TIPP / body-first distress tolerance', why:'body arousal is too high for complex problem-solving'},
    {when:['rejected','ignored','abandoned','they hate me','are you mad','too needy','people always leave'], skill:'Check the Facts + DEAR MAN', why:'relationship threat cues need facts and a clear ask'},
    {when:['worthless','useless','lazy','failure','hate myself','burden','pathetic','gross'], skill:'Self-validation + Opposite Action to shame', why:'shame wants hiding; care needs a tiny approach step'},
    {when:['can’t start','cannot start','stuck','executive dysfunction','too many steps','task paralysis','decision paralysis'], skill:'ADHD tiny-door start', why:'ADHD support works best when steps are external, visible, and very small'},
    {when:['pain','fatigue','spoons','wheelchair','bedridden','oxygen','shower chair','eds','multiple sclerosis'], skill:'Pacing plan + adaptive version', why:'the accessible version protects capacity and reduces crash risk'},
    {when:['diary card','chain analysis','track urges','daily card','i did it again'], skill:'Diary card + mini chain analysis', why:'patterns are easier to change when they are tracked without shame'},
    {when:['can’t sleep','cant sleep','insomnia','nightmare','night panic'], skill:'Sleep downshift routine', why:'night distress needs lower input and fewer decisions'}
  ];
  function chooseSkill(text, report){
    const low = Onyx.lower(text + ' ' + JSON.stringify(report || {}));
    const chosen = map.find(row => row.when.some(w => low.includes(w))) || {skill:'Wise Mind pause', why:'a brief pause helps separate feeling, facts, and next action'};
    const dbtMatch = (report && report.matches && report.matches.dbt && report.matches.dbt[0]) || null;
    const education = chooseEducation(text, report);
    return {skill:chosen.skill, why:chosen.why, reference:dbtMatch, education};
  }
  function chooseEducation(text, report){
    const query = [text, report && report.conversationPreview, JSON.stringify(report && report.layers || {})].filter(Boolean).join(' ');
    const matches = Onyx.Data.search('education', query, 5);
    return matches[0] || (((Onyx.data || {}).education || {}).modules || []).find(m => m.id === 'dbt_wise_mind') || null;
  }
  function educationMatches(text, report, limit=4){
    const query = [text, report && report.conversationPreview, JSON.stringify(report && report.layers || {})].filter(Boolean).join(' ');
    let matches = Onyx.Data.search('education', query, limit);
    if(!matches.length && Onyx.data && Onyx.data.education) matches = (Onyx.data.education.modules || []).slice(0, limit);
    return matches;
  }
  function chooseAction(text, report){
    const edu = chooseEducation(text, report);
    if(edu && Array.isArray(edu.tiny_steps) && edu.tiny_steps.length) return {category:edu.title, action:Onyx.sample(edu.tiny_steps)};
    const care = (report && report.matches && report.matches.care) || [];
    if(care[0] && care[0].actions && care[0].actions.length) return {category:care[0].name, action:Onyx.sample(care[0].actions)};
    return {category:'Tiny next action', action:'Choose one object, tab, sip, bite, or message. Touch only that first.'};
  }
  function summarizeMatches(report){
    const out = [];
    ((report && report.matches && report.matches.health) || []).slice(0,3).forEach(m => out.push({title:m.name || m.id, source:m.catalog_source || m.source_group || 'health catalog', detail:(m.support_or_accommodation_ideas || m.life_limitations || []).slice ? (m.support_or_accommodation_ideas || m.life_limitations || []).slice(0,3).join('; ') : ''}));
    ((report && report.matches && report.matches.dbt) || []).slice(0,2).forEach(m => out.push({title:m.title_full || m.title || m.module || m.id || 'DBT reference', source:m.bucket || 'DBT catalog', detail:m.summary || m.short || ''}));
    educationMatches(report && report.conversationPreview || '', report, 2).forEach(m => out.push({title:m.title, source:'Onyx educational support upgrade', detail:m.teach || ''}));
    return out;
  }
  Onyx.Support = {chooseSkill, chooseAction, summarizeMatches, chooseEducation, educationMatches};
})(window);
