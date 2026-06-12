// Compatibility shim for older Onyx Helper Bot code.
// The merged Squishy + Onyx data now lives in js/onyx-personality-data.js.
(function(){
  'use strict';
  window.EMPEROR_ONYX_PERSONALITY_DATA = window.EMPEROR_ONYX_PERSONALITY_DATA || {};
  window.EMPEROR_ONYX_RULEBOT_DATA = window.EMPEROR_ONYX_PERSONALITY_DATA;
})();
