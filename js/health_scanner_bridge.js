(function(global){
  'use strict';
  function createBridge(options){
    options = options || {};
    var core = global.HealthBehaviorScanner;
    var store = options.store || core.createStore();
    if(options.data) core.loadBuiltIns(store, options.data);
    return {
      store:store,
      addDocument:function(doc){ return core.addDocument(store, doc); },
      importPackage:function(pack){ return core.importPackage(store, pack); },
      scanMessages:function(messages, settings){
        var text = '';
        for(var i=0;i<(messages || []).length;i++){
          var msg = messages[i] || {};
          text += (msg.role || msg.speaker || 'message') + ': ' + (msg.content || msg.text || '') + '\n';
        }
        return core.scan(store, text, settings || {});
      },
      scanText:function(text, settings){ return core.scan(store, text || '', settings || {}); },
      makeReferencePack:function(report){
        var refs = [];
        for(var i=0;i<(report.references || []).length;i++) refs.push({citation:'[' + (i+1) + ']', title:report.references[i].title, source:report.references[i].source, chunkId:report.references[i].chunkId, text:report.references[i].text});
        return {prompt:report.prompt, references:refs, safetyFlags:report.safetyFlags || [], signals:report.signals || [], implied:report.implied || []};
      }
    };
  }
  global.HealthBehaviorScannerBridge = { create:createBridge };
})(window);
