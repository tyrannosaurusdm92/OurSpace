(function(){
  'use strict';
  var core = window.HealthBehaviorScanner;
  var store = core.createStore();
  var $ = function(id){ return document.getElementById(id); };
  var lastReport = null;

  function init(){
    var count = core.loadBuiltIns(store, window.HEALTH_SCANNER_DATA || {});
    store.builtInCount = count;
    bindEvents();
    renderDocs();
    updateThresholdLabel();
  }

  function bindEvents(){
    $('threshold').addEventListener('input', updateThresholdLabel);
    $('scanBtn').addEventListener('click', runScan);
    $('sampleBtn').addEventListener('click', loadSample);
    $('clearConversation').addEventListener('click', function(){ $('conversationInput').value = ''; $('results').className = 'results empty'; $('results').textContent = 'Run a scan to see signals, document references, and a chatbot-ready support prompt.'; setActionState(false); });
    $('clearDocs').addEventListener('click', function(){ clearImportedDocs(); });
    $('downloadIndex').addEventListener('click', function(){ downloadJson('health-behavior-document-index.json', core.exportIndex(store)); });
    $('downloadReport').addEventListener('click', function(){ if(lastReport) downloadJson('health-behavior-scan-report.json', lastReport); });
    $('downloadReferencePack').addEventListener('click', function(){ if(lastReport) downloadJson('chatbot-reference-pack.json', makeReferencePack(lastReport)); });
    $('copyPrompt').addEventListener('click', copyPrompt);
    $('fileInput').addEventListener('change', function(evt){ handleFiles(evt.target.files); evt.target.value = ''; });
    $('packageInput').addEventListener('change', function(evt){ handlePackage(evt.target.files && evt.target.files[0]); evt.target.value = ''; });
    var dz = $('dropZone');
    dz.addEventListener('dragover', function(evt){ evt.preventDefault(); dz.classList.add('dragging'); });
    dz.addEventListener('dragleave', function(){ dz.classList.remove('dragging'); });
    dz.addEventListener('drop', function(evt){ evt.preventDefault(); dz.classList.remove('dragging'); handleFiles(evt.dataTransfer.files); });
  }

  function updateThresholdLabel(){ $('thresholdLabel').textContent = $('threshold').value + '%'; }

  function setActionState(enabled){
    $('copyPrompt').disabled = !enabled;
    $('downloadReport').disabled = !enabled;
    $('downloadReferencePack').disabled = !enabled;
  }

  function clearImportedDocs(){
    var kept = [];
    for(var i=0;i<store.documents.length;i++){
      if(String(store.documents[i].type || '').indexOf('built-in') === 0) kept.push(store.documents[i]);
    }
    store.documents = kept;
    store.importedCount = 0;
    renderDocs();
  }

  function renderDocs(){
    var imported = 0;
    for(var i=0;i<store.documents.length;i++) if(String(store.documents[i].type || '').indexOf('built-in') !== 0) imported++;
    $('docStats').textContent = store.builtInCount + ' built-in health/DBT reference entries loaded; ' + imported + ' attached document(s) imported.';
    var list = $('docList');
    list.innerHTML = '';
    var shown = 0;
    for(var d=store.documents.length-1; d>=0 && shown<25; d--){
      var doc = store.documents[d];
      if(String(doc.type || '').indexOf('built-in') === 0) continue;
      shown++;
      var div = document.createElement('div');
      div.className = 'doc-pill';
      div.innerHTML = '<strong>' + esc(doc.title) + '</strong><small>' + esc(doc.source) + ' • ' + doc.chunks.length + ' reference chunk(s)</small>';
      list.appendChild(div);
    }
    if(!shown){
      var empty = document.createElement('div');
      empty.className = 'doc-pill';
      empty.innerHTML = '<strong>No attached documents yet</strong><small>Use the file picker, folder picker, or import package.</small>';
      list.appendChild(empty);
    }
  }

  function handleFiles(files){
    if(!files || !files.length) return;
    var list = Array.prototype.slice.call(files);
    var sequence = Promise.resolve(0);
    for(var i=0;i<list.length;i++){
      (function(file){ sequence = sequence.then(function(count){ return readFileAsText(file).then(function(text){
        if(!text || text.trim().length < 20) return count;
        core.addDocument(store,{title:file.name,source:file.webkitRelativePath || file.name,type:'attached',text:text});
        store.importedCount++;
        return count + 1;
      }); }); })(list[i]);
    }
    sequence.then(function(){ renderDocs(); });
  }

  function readFileAsText(file){
    return new Promise(function(resolve){
      var reader = new FileReader();
      reader.onload = function(){
        var result = reader.result;
        if(result instanceof ArrayBuffer){ resolve(extractReadableText(new Uint8Array(result), file.name)); }
        else resolve(extractReadableText(String(result || ''), file.name));
      };
      reader.onerror = function(){ resolve(''); };
      if(/\.(txt|md|json|csv|html?|xml|log|js|css)$/i.test(file.name)) reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });
  }

  function extractReadableText(value, name){
    if(typeof value === 'string'){
      if(/\.json$/i.test(name)){
        try{ return JSON.stringify(JSON.parse(value), null, 2); } catch(e){ return value; }
      }
      return value.replace(/\s+/g,' ').trim();
    }
    var decoder = new TextDecoder('utf-8', {fatal:false});
    var raw = decoder.decode(value);
    var chunks = [];
    var re = /\(([^()]{3,300})\)/g, m;
    while((m = re.exec(raw)) && chunks.length < 800){ chunks.push(m[1]); }
    var text = chunks.length ? chunks.join(' ') : raw;
    text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]+/g,' ').replace(/\s+/g,' ').trim();
    var letters = (text.match(/[A-Za-z]/g) || []).length;
    if(letters < 40) return '';
    return text;
  }

  function handlePackage(file){
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var pack = JSON.parse(String(reader.result || '{}'));
        core.importPackage(store, pack);
        renderDocs();
      }catch(e){ alert('The package JSON could not be read.'); }
    };
    reader.readAsText(file);
  }

  function loadSample(){
    $('conversationInput').value = 'User: I keep saying I am fine, but I have not showered in days. Standing long enough to cook hurts, and the stairs make me scared I will fall. I feel lazy and like a burden, so I keep avoiding asking for help. Bot: Would a tiny care step and a safer shower plan help right now?';
  }

  function runScan(){
    var text = $('conversationInput').value;
    if(!text.trim()){ loadSample(); text = $('conversationInput').value; }
    lastReport = core.scan(store, text, {threshold:$('threshold').value, mode:$('referenceMode').value, focus:$('supportFocus').value});
    renderReport(lastReport);
    setActionState(true);
  }

  function renderReport(report){
    var root = $('results');
    root.className = 'results';
    root.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'result-grid';
    root.appendChild(grid);
    addCard(grid, 'Safety flags', renderTags(report.safetyFlags, true) || '<p class="muted">No urgent safety or medical red-flag phrases crossed the selected threshold.</p>');
    addCard(grid, 'Direct signals', renderSignals(report.signals));
    addCard(grid, 'Possible between-the-lines signals', renderImplied(report.implied));
    addCard(grid, 'DBT support options', renderDbt(report.dbt));
    addCard(grid, 'Document references', renderReferences(report.references), true);
    addCard(grid, 'Chatbot-ready prompt', '<div class="prompt-box">' + esc(report.prompt) + '</div>', true);
  }

  function addCard(parent, title, html, full){
    var node = document.createElement('article');
    node.className = 'result-card' + (full ? ' full' : '');
    node.innerHTML = '<h3>' + esc(title) + '</h3><div class="card-body">' + html + '</div>';
    parent.appendChild(node);
  }

  function renderTags(list, compact){
    if(!list || !list.length) return '';
    var html = '<div class="tag-list">';
    for(var i=0;i<list.length;i++) html += '<span class="tag ' + esc(list[i].level || 'low') + '">' + esc(list[i].label) + ' <span class="score">' + esc(list[i].score) + '%</span></span>';
    html += '</div>';
    if(!compact){
      for(var j=0;j<list.length;j++) html += '<div class="evidence">' + esc(list[j].evidence || '') + '</div>';
    }
    return html;
  }

  function renderSignals(list){
    if(!list || !list.length) return '<p class="muted">No direct signals crossed the selected threshold.</p>';
    var html = renderTags(list, false);
    for(var i=0;i<list.length;i++){
      if(list[i].support && list[i].support.length){
        html += '<p><strong>Support direction:</strong> ' + esc(list[i].support.join(' ')) + '</p>';
      }
    }
    return html;
  }

  function renderImplied(list){
    if(!list || !list.length) return '<p class="muted">No indirect signal found.</p>';
    var html = '';
    for(var i=0;i<list.length;i++){
      html += '<div class="citation"><strong>' + esc(list[i].label) + '</strong> <span class="score">' + esc(list[i].score) + '%</span><br><small>' + esc(list[i].rationale) + '</small></div>';
    }
    return html;
  }

  function renderDbt(list){
    if(!list || !list.length) return '<p class="muted">No DBT suggestion generated.</p>';
    var html = '';
    for(var i=0;i<list.length;i++){
      html += '<div class="citation"><strong>' + esc(list[i].topic) + '</strong><br><small>Search phrase: ' + esc(list[i].query) + '</small></div>';
    }
    return html;
  }

  function renderReferences(list){
    if(!list || !list.length) return '<p class="muted">No references found. Try importing more attached documents or changing the reference style.</p>';
    var html = '';
    for(var i=0;i<list.length;i++){
      html += '<div class="citation"><strong>[' + (i+1) + '] ' + esc(list[i].title) + '</strong><br><small>' + esc(list[i].source) + ' • ' + esc(list[i].chunkId) + ' • score ' + esc(list[i].score) + '</small><p>' + esc(list[i].text.slice(0,450)) + (list[i].text.length>450?'…':'') + '</p></div>';
    }
    return html;
  }

  function makeReferencePack(report){
    var refs = [];
    for(var i=0;i<report.references.length;i++){
      refs.push({citation:'[' + (i+1) + ']', title:report.references[i].title, source:report.references[i].source, chunkId:report.references[i].chunkId, text:report.references[i].text});
    }
    return {schema:'chatbot-reference-pack-v1',createdAt:new Date().toISOString(),prompt:report.prompt,references:refs,scanSummary:{signals:report.signals,implied:report.implied,safetyFlags:report.safetyFlags}};
  }

  function copyPrompt(){
    if(!lastReport) return;
    navigator.clipboard.writeText(lastReport.prompt).then(function(){ $('copyPrompt').textContent = 'Copied'; setTimeout(function(){ $('copyPrompt').textContent = 'Copy chatbot prompt'; }, 1400); });
  }

  function downloadJson(name, obj){
    var blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]; });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
