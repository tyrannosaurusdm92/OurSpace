(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  function category(name){ return (((Onyx.data || {}).dialogue || {}).categories || {})[name] || []; }
  function line(name){ return Onyx.sample(category(name)); }
  function target(){ return ((Onyx.data || {}).profile || {}).onyx_direct_address || ((Onyx.data || {}).personality || {}).target || 'friend'; }
  function intentReply(text){
    const low = Onyx.lower(text);
    const pp = (Onyx.data || {}).profilePersonality || {};
    const intents = pp.chatIntents || {};
    const map = {
      who:'lore', lore:'lore', love:'love', snack:'food', comfort:'comfort', pep:'pep', grounding:'grounding', attachment:'attachment', diary_card:'diary_card', self_care_reset:'self_care_reset', dbt:'dbt', adhd:'adhd_start', sleepy:'sleep', sleep:'sleep', thinking:'thinking'
    };
    for(const [intent, cat] of Object.entries(map)){
      const phrases = intents[intent] || [];
      if(phrases.some(p => low.includes(Onyx.lower(p))) || (intent === 'who' && (low.includes('who are you') || low.includes('about you')))){
        const picked = line(cat);
        if(picked) return picked;
      }
    }
    return '';
  }
  function compose(text, report){
    if(report.risk === 'critical') return [line('safety') || 'Safety first: contact emergency or crisis support now and move toward a safe person/place.', 'I am staying serious here. Ordinary task coaching can wait until danger is lower.', 'Please do not handle this alone. If there is immediate danger, call emergency services now. In the U.S., call or text 988 for crisis support.'].join('\n\n');
    const skill = Onyx.Support.chooseSkill(text, report);
    const action = Onyx.Support.chooseAction(text, report);
    const validation = line('validation') || 'That sounds heavy, not lazy.';
    const opener = intentReply(text) || line('thinking') || '';
    const closer = line('closing') || 'One paw-step counts.';
    const edu = skill.education;
    const eduBlock = edu ? `\n\nTiny psychoeducation: ${edu.teach}\n\nOnyx translation: ${edu.onyx_translation || 'We make this smaller and kinder.'}${edu.reflection_questions && edu.reflection_questions.length ? '\n\nQuestion to answer, not overthink: ' + Onyx.sample(edu.reflection_questions) : ''}` : '';
    const ref = skill.reference ? `\n\nDBT reference matched: ${skill.reference.title_full || skill.reference.title || skill.reference.module || skill.reference.id || 'DBT catalog item'}` : '';
    return `${opener ? opener + '\n\n' : ''}${validation}\n\nEmperor Onyx recommends: ${skill.skill}. This fits because ${skill.why}.${eduBlock}\n\nNext paw-step: ${action.action}\n\nAfter that: pause and check whether the task should become smaller, more seated, more supported, or delegated.${ref}\n\n${closer}`;
  }
  function tinyStep(text=''){
    const report = Onyx.Scanner.scan(text || 'stuck executive dysfunction basic care');
    return Onyx.Support.chooseAction(text, report).action;
  }
  function dbtSkill(text=''){
    const report = Onyx.Scanner.scan(text || 'overwhelmed emotion regulation');
    const skill = Onyx.Support.chooseSkill(text, report);
    const edu = skill.education ? ` Onyx lesson: ${skill.education.title}.` : '';
    return `${skill.skill}: ${skill.why}.${edu}`;
  }
  Onyx.Chat = {compose, tinyStep, dbtSkill, line};
})(window);
