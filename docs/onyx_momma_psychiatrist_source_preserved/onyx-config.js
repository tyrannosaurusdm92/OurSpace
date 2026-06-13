(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx = global.EmperorOnyx || {};
  Onyx.version = '2026.06.13-psychiatrist-bot-education-merge';
  Onyx.paths = {
    personality:'data/onyx_personality.json', dialogue:'data/onyx_dialogue_bank.json', scanner:'data/scanner_rules.json',
    care:'data/care_micro_actions.json', dbt:'data/dbt_combined_catalog.json', health:'data/health_life_impact_catalog.json', crisis:'data/crisis_support_plan.json', manifest:'data/manifest.json', education:'data/onyx_educational_support_upgrade.json', profile:'data/onyx_profile_info.json', profilePersonality:'data/onyx_personality_reference.json', supportCatalog:'data/onyx_dbt_adhd_support_catalog.json', moodManifest:'data/onyx_mood_manifest.json'
  };
  Onyx.$ = (sel, root=document) => root.querySelector(sel);
  Onyx.$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  Onyx.clean = value => String(value == null ? '' : value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  Onyx.lower = value => Onyx.clean(value).toLowerCase();
  Onyx.sample = list => Array.isArray(list) && list.length ? list[Math.floor(Math.random()*list.length)] : '';
  Onyx.uniq = list => Array.from(new Set((list || []).filter(Boolean)));
  Onyx.escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  Onyx.debounce = (fn, wait=220) => { let t; return (...args) => { clearTimeout(t); t=setTimeout(() => fn(...args), wait); }; };
})(window);
