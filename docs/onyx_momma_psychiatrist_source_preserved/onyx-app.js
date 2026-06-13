(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  const els = {};
  function cacheEls(){ ['chatLog','chatForm','userInput','runtimeStatus','riskBadge','signalList','nextStep','supportMatches','safetyCard','tinyStepBtn','dbtBtn','onyxTagline','profileBadge','onyxAvatar','educationMatches'].forEach(id => els[id] = Onyx.$('#'+id)); }
  function addMessage(role, content){
    const div = document.createElement('div'); div.className = 'message ' + (role === 'user' ? 'user' : 'onyx');
    div.innerHTML = `<span class="meta">${role === 'user' ? 'You' : 'Emperor Onyx'}</span>${Onyx.escape(content)}`;
    els.chatLog.appendChild(div); els.chatLog.scrollTop = els.chatLog.scrollHeight;
  }
  function renderReport(report){
    els.riskBadge.textContent = report.risk === 'routine' ? 'Scanner routine' : `Scanner: ${report.risk}`;
    els.riskBadge.className = 'pill ' + (report.risk === 'critical' ? 'critical' : report.risk === 'routine' ? 'quiet' : 'elevated');
    els.safetyCard.classList.toggle('hidden', report.risk !== 'critical');
    const signals = ['primary','secondary','tertiary'].flatMap(layer => (report.layers[layer] || []).map(s => ({...s, layer})));
    els.signalList.innerHTML = signals.length ? signals.slice(0,8).map(s => `<div class="signal"><strong>${Onyx.escape(s.label)}</strong><small>${Onyx.escape(s.layer)} • ${s.score}% • ${Onyx.escape((s.hits || []).join(', '))}</small></div>`).join('') : '<p>No strong signals yet.</p>';
    const action = Onyx.Support.chooseAction(report.conversationPreview || '', report);
    els.nextStep.textContent = action.action;
    const matches = Onyx.Support.summarizeMatches(report);
    els.supportMatches.innerHTML = matches.length ? matches.map(m => `<div class="match"><strong>${Onyx.escape(m.title)}</strong><small>${Onyx.escape(m.source)}${m.detail ? ' • ' + Onyx.escape(m.detail).slice(0,220) : ''}</small></div>`).join('') : '<p>Onyx will match supports as more context appears.</p>';
    if(els.educationMatches){ const edu = Onyx.Support.educationMatches ? Onyx.Support.educationMatches(report.conversationPreview || '', report, 3) : []; els.educationMatches.innerHTML = edu.length ? edu.map(m => `<div class="match"><strong>${Onyx.escape(m.title)}</strong><small>${Onyx.escape(m.teach || '').slice(0,260)}</small></div>`).join('') : '<p>Educational matches will appear as Onyx sees patterns.</p>'; }
  }
  const passiveScan = Onyx.debounce(() => { const text = els.userInput.value; if(text.trim()) renderReport(Onyx.Scanner.scan(text)); }, 250);
  function submit(evt){
    evt.preventDefault();
    const text = els.userInput.value.trim(); if(!text) return;
    addMessage('user', text); Onyx.Memory.add('user', text);
    const history = Onyx.Memory.load().slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');
    const report = Onyx.Scanner.scan(history); renderReport(report);
    const reply = Onyx.Chat.compose(text, report);
    addMessage('onyx', reply); Onyx.Memory.add('onyx', reply, {scan:report});
    els.userInput.value='';
  }
  async function init(){
    cacheEls();
    try{ await Onyx.Data.loadAll(); els.runtimeStatus.textContent = 'Ready'; }
    catch(err){ console.warn(err); els.runtimeStatus.textContent = 'Fallback ready'; }
    const p = Onyx.data.personality || {}; const prof = Onyx.data.profile || {}; els.onyxTagline.textContent = p.fullTitle || p.identity || 'Emperor Onyx support console'; if(els.profileBadge) els.profileBadge.textContent = prof.onyx_direct_address ? ('Built for ' + prof.onyx_direct_address) : 'Psychiatrist bot'; if(els.onyxAvatar && p.defaultMoodImage) els.onyxAvatar.src = p.defaultMoodImage;
    addMessage('onyx', p.opening || Onyx.Chat.line('greetings') || 'Emperor Onyx is here.');
    Onyx.Memory.load().slice(-8).forEach(m => addMessage(m.role, m.content));
    els.chatForm.addEventListener('submit', submit);
    els.userInput.addEventListener('input', passiveScan);
    els.tinyStepBtn.addEventListener('click', () => { const step = Onyx.Chat.tinyStep(els.userInput.value); addMessage('onyx', 'Tiny paw-step: ' + step); });
    els.dbtBtn.addEventListener('click', () => { const skill = Onyx.Chat.dbtSkill(els.userInput.value); addMessage('onyx', 'DBT skill: ' + skill); });
    renderReport(Onyx.Scanner.scan(''));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
