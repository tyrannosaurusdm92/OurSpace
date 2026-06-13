(function(global){
  'use strict';
  const Onyx = global.EmperorOnyx;
  function evidence(text, phrases){
    const c = Onyx.clean(text); const low = c.toLowerCase();
    for(const p of phrases || []){ const idx = low.indexOf(String(p).toLowerCase()); if(idx >= 0) return c.slice(Math.max(0, idx-90), Math.min(c.length, idx + String(p).length + 120)); }
    return c.slice(0,260);
  }
  function detectLayer(text, rules, base){
    const low = Onyx.lower(text);
    return (rules || []).map(rule => {
      const hits = (rule.phrases || []).filter(p => low.includes(String(p).toLowerCase()));
      if(!hits.length) return null;
      return {key:rule.key,label:rule.label,level:rule.level,hits,score:Math.min(99, base + hits.length*5),evidence:evidence(text,hits)};
    }).filter(Boolean).sort((a,b) => b.score-a.score);
  }
  function riskFrom(primary, secondary){
    if(primary.some(x => x.level === 'critical')) return 'critical';
    if(primary.length) return 'high';
    if(secondary.length) return 'elevated';
    return 'routine';
  }
  function scan(text){
    const layers = ((Onyx.data && Onyx.data.rules && Onyx.data.rules.layers) || Onyx.Data.fallback.rules.layers);
    const primary = detectLayer(text, layers.primary, 84);
    const secondary = detectLayer(text, layers.secondary, 66);
    const tertiary = detectLayer(text, layers.tertiary, 52);
    const risk = riskFrom(primary, secondary);
    const query = [text].concat(primary, secondary, tertiary).map(x => typeof x === 'string' ? x : [x.label, ...(x.hits || [])].join(' ')).join(' ');
    const matches = { health:Onyx.Data.search('health', query, 4), dbt:Onyx.Data.search('dbt', query, 4), care:Onyx.Data.search('care', query, 4), education:Onyx.Data.search('education', query, 4), profileSupport:Onyx.Data.search('profileSupport', query, 3) };
    const report = {schema:'emperor-onyx-background-scan-v2',createdAt:new Date().toISOString(),risk,layers:{primary,secondary,tertiary},matches,conversationPreview:Onyx.clean(text).slice(0,800)};
    Onyx.lastScan = report;
    global.dispatchEvent(new CustomEvent('emperor-onyx-scan',{detail:report}));
    return report;
  }
  function promptContext(report){
    const lines = ['[Emperor Onyx passive context]', 'Risk: '+(report && report.risk || 'routine'), 'Respond with low-shame, trauma-sensitive, disability-aware, educational support. Explain patterns gently, then offer one tiny step.'];
    ['primary','secondary','tertiary'].forEach(layer => (report.layers[layer] || []).slice(0,5).forEach(s => lines.push(`${layer}: ${s.label} (${s.score}%) — ${s.evidence}`)));
    if(report.risk === 'critical') lines.push('Safety language present: prioritize immediate safety and human/emergency support over ordinary coaching.');
    return lines.join('\n');
  }
  Onyx.Scanner = {scan, promptContext};
})(window);
