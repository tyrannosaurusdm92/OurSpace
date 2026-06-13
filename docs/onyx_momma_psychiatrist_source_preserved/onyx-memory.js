(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  const key = 'emperorOnyx.chat.v1';
  function load(){ try{return JSON.parse(localStorage.getItem(key) || '[]');}catch{return [];} }
  function save(messages){ localStorage.setItem(key, JSON.stringify((messages || []).slice(-80))); }
  function add(role, content, extra={}){ const messages = load(); messages.push({role, content, extra, at:new Date().toISOString()}); save(messages); return messages; }
  function clear(){ localStorage.removeItem(key); }
  Onyx.Memory = {load, save, add, clear};
})(window);
