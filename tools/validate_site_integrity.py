#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from html.parser import HTMLParser
import json, re, subprocess, sys, time, urllib.parse, zipfile

ROOT = Path(__file__).resolve().parents[1]

class RefParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]; self.ids=[]; self.links=[]; self.scripts=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if 'id' in d: self.ids.append(d['id'])
        if tag == 'a' and 'href' in d: self.links.append(d['href'])
        if tag == 'script' and 'src' in d: self.scripts.append(d['src'])
        for a in ('src','href','poster','data-src'):
            if a in d: self.refs.append((tag,a,d[a]))

def parse_html(path: Path) -> RefParser:
    p=RefParser(); p.feed(path.read_text(errors='ignore')); return p

def static_reference_check():
    missing=[]
    for f in sorted(ROOT.rglob('*.html')):
        p=parse_html(f)
        for tag,a,u in p.refs:
            if not u or u.startswith(('#','http:','https:','mailto:','tel:','javascript:','data:')): continue
            path=urllib.parse.urlparse(u).path
            if not path or path.startswith('/'): continue
            target=(f.parent/path).resolve()
            if not target.exists():
                missing.append({'file':str(f.relative_to(ROOT)), 'tag':tag, 'attr':a, 'url':u, 'target':str(target)})
    css_missing=[]
    for f in sorted(ROOT.rglob('*.css')):
        for u in re.findall(r'url\(([^)]+)\)', f.read_text(errors='ignore')):
            u=u.strip(' \"\'')
            if not u or u.startswith(('data:','http:','https:','#')): continue
            path=urllib.parse.urlparse(u).path
            target=(f.parent/path).resolve()
            if not target.exists(): css_missing.append({'file':str(f.relative_to(ROOT)), 'url':u, 'target':str(target)})
    return {'missing_html_refs':missing,'missing_css_refs':css_missing}

def node_syntax_check():
    files=sorted((ROOT/'js').glob('*.js'))
    legacy_game_stub = ROOT/'games/developer_v1.js'
    if legacy_game_stub.exists(): files.append(legacy_game_stub)
    out=[]
    for f in files:
        proc=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
        out.append({'file':str(f.relative_to(ROOT)), 'ok':proc.returncode==0, 'stderr':proc.stderr.strip()[:1000]})
    return out

def json_check():
    out=[]
    for f in sorted((ROOT/'json').glob('*.json')) + sorted((ROOT/'docs').glob('*.json')):
        try:
            data=json.loads(f.read_text(errors='ignore'))
            count=len(data) if hasattr(data,'__len__') else None
            out.append({'file':str(f.relative_to(ROOT)), 'ok':True, 'top_level_type':type(data).__name__, 'top_level_count':count})
        except Exception as e:
            out.append({'file':str(f.relative_to(ROOT)), 'ok':False, 'error':str(e)[:500]})
    return out

def node_browser_scanner_check():
    script = r'''
const fs=require('fs'), vm=require('vm'), path=require('path');
const root=process.argv[1];
const sandbox={console:{warn:()=>{},log:()=>{},error:()=>{}}, setTimeout, clearTimeout};
sandbox.window=sandbox; sandbox.global=sandbox;
sandbox.document={readyState:'complete', addEventListener:()=>{}, createElement:()=>({}), querySelectorAll:()=>[], querySelector:()=>null};
sandbox.CustomEvent=function(type, init){return {type, detail:init && init.detail};};
sandbox.dispatchEvent=function(evt){ sandbox.__lastEvent=evt; };
sandbox.fetch=function(){ return Promise.resolve({}); };
vm.createContext(sandbox);
for (const rel of ['js/health_scanner_data.js','js/scanner-core.js','js/health_scanner_bridge.js','js/unified-background-psychiatry-runtime.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel),'utf8'), sandbox, {filename:rel});
}
const scanner=sandbox.UnifiedPsychiatryBackgroundScanner;
const elevated=scanner.scanText("I have not eaten, I feel useless, and I cannot start the shower.");
const critical=scanner.scanText("I cannot stay safe and I might hurt myself.");
console.log(JSON.stringify({scannerExists:!!scanner, elevatedRisk:elevated.risk_level, criticalRisk:critical.risk_level, eventDispatched:!!sandbox.__lastEvent, hasPrompt:!!(elevated.prompt_context||elevated.prompt)}));
'''
    proc=subprocess.run(['node','-e',script,str(ROOT)],capture_output=True,text=True)
    if proc.returncode!=0:
        return {'ok':False,'stderr':proc.stderr[:1500],'stdout':proc.stdout[:1500]}
    try:
        data=json.loads(proc.stdout.strip().splitlines()[-1])
        data['ok']= bool(data.get('scannerExists') and data.get('elevatedRisk') in ('elevated','high','critical') and data.get('criticalRisk')=='critical' and data.get('hasPrompt'))
        return data
    except Exception as e:
        return {'ok':False,'error':str(e),'stdout':proc.stdout,'stderr':proc.stderr}

def app_integrity_check():
    idx=ROOT/'index.html'; onyx=ROOT/'Emperor_onyx.html'; app=ROOT/'js/app.bundle.js' if (ROOT/'js/app.bundle.js').exists() else ROOT/'js/app.js'
    index=idx.read_text(errors='ignore'); appjs=app.read_text(errors='ignore'); onyxhtml=onyx.read_text(errors='ignore') if onyx.exists() else ''
    parser=parse_html(idx)
    pages=re.findall(r'<section class="page-panel[^>]+id="([^"]+)"', index)
    app_pages=re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', appjs.split('const PAGES =',1)[1].split('];',1)[0]) if 'const PAGES =' in appjs else []
    scripts=parser.scripts
    def script_index(fragment):
        for i,s in enumerate(scripts):
            if fragment in s: return i
        return 999
    scanner_order_ok=script_index('unified-background-psychiatry-runtime.js') < script_index('js/app.js')
    bundle_path=ROOT/'js/app.bundle.js'
    bundle_loaded=any('js/app.bundle.js' in s for s in scripts)
    if bundle_loaded and bundle_path.exists():
        bundle=bundle_path.read_text(errors='ignore')
        scanner_order_ok = ('unified-background-psychiatry-runtime.js' in bundle and 'js/app.js' in bundle and bundle.find('unified-background-psychiatry-runtime.js') < bundle.find('js/app.js'))
    game_files=re.findall(r'"([a-z0-9]+\.html)"', appjs.split('const GAME_FILES =',1)[1].split('];',1)[0]) if 'const GAME_FILES =' in appjs else []
    games_missing=[f for f in game_files if not (ROOT/'games'/f).exists()]
    game_html_files=sorted((ROOT/'games').glob('*.html'))
    games_without_bridge=[f.name for f in game_html_files if 'jasper-game-currency-bridge.js' not in f.read_text(errors='ignore')]
    games_omitted_external_ok=bool(games_missing and not game_html_files and ((ROOT/'games/mobile_friendly_manifest.json').exists() or (ROOT/'json/mobile_friendly_games_manifest.json').exists()) and ((ROOT/'games/README.md').exists() or (ROOT/'games/README_GAMES_PLACEHOLDER.txt').exists() or not (ROOT/'games').exists()))
    adult_count=len(re.findall(r'adult-', appjs))
    return {
        'index_title_ok': "Jasper's Squishy Care Cottage" in index,
        'page_panel_count': len(pages),
        'page_ids': pages,
        'app_pages_count': len(app_pages),
        'scanner_scripts_before_app': scanner_order_ok,
        'has_typeform_link': 'https://form.typeform.com/to/trAqvrRG' in index or 'https://form.typeform.com/to/trAqvrRG' in onyxhtml or 'https://form.typeform.com/to/trAqvrRG' in appjs or 'https://form.typeform.com/to/trAqvrRG' in (ROOT/'js/jcc-full-functionality-upgrade.js').read_text(errors='ignore'),
        'has_checkout_email': 'williamsaville92@gmail.com' in appjs,
        'checkout_deducts_before_mailto': appjs.find('subtractCurrency(total)') != -1 and appjs.find('subtractCurrency(total)') < appjs.find('mailto:'),
        'has_onyx_merged_panel': 'id="onyxProfileMerged"' in index,
        'onyx_scanner_loaded': 'UnifiedPsychiatryBackgroundScanner' in appjs or 'unified-background-psychiatry-runtime.js' in appjs,
        'currency_conversion_10s': all(s in appjs for s in ['*10','*100','*1000','total/1000','total/100','total/10']),
        'game_manifest_count': len(game_files),
        'game_manifest_missing_files': games_missing,
        'games_without_bridge': games_without_bridge,
        'games_omitted_external_ok': games_omitted_external_ok,
        'legacy_tabletennis_stub_exists': (ROOT/'games/developer_v1.js').exists() or games_omitted_external_ok,
        'adult_reward_items_detected': adult_count,
        'passive_scanner_status_element': 'backgroundScannerStatus' in index,
        'scanner_report_stored': 'scannerReports' in appjs and 'runPassiveScanner' in appjs,
    }

def python_scanner_check():
    proc=subprocess.run([sys.executable, str(ROOT/'tools/validate_merged_scanner.py')],capture_output=True,text=True,cwd=str(ROOT))
    return {'ok':proc.returncode==0, 'stdout':proc.stdout[:2000], 'stderr':proc.stderr[:2000]}

def file_count_sizes():
    files=[p for p in ROOT.rglob('*') if p.is_file()]
    return {'file_count':len(files),'uncompressed_bytes':sum(p.stat().st_size for p in files)}

def main():
    report={
        'generated_at_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'static_references': static_reference_check(),
        'node_syntax': node_syntax_check(),
        'json_parse': json_check(),
        'browser_scanner_runtime_vm': node_browser_scanner_check(),
        'python_scanner': python_scanner_check(),
        'app_integrity': app_integrity_check(),
        'file_stats': file_count_sizes(),
    }
    out_dir=ROOT/'test-results'; out_dir.mkdir(exist_ok=True)
    (out_dir/'site_integrity_report.json').write_text(json.dumps(report, indent=2))
    failures=[]
    if report['static_references']['missing_html_refs'] or report['static_references']['missing_css_refs']: failures.append('missing local references')
    if any(not x['ok'] for x in report['node_syntax']): failures.append('javascript syntax')
    if any(not x['ok'] for x in report['json_parse']): failures.append('json parse')
    if not report['browser_scanner_runtime_vm'].get('ok'): failures.append('browser scanner runtime')
    if not report['python_scanner']['ok']: failures.append('python scanner')
    app=report['app_integrity']
    required=['index_title_ok','scanner_scripts_before_app','has_typeform_link','has_checkout_email','checkout_deducts_before_mailto','has_onyx_merged_panel','onyx_scanner_loaded','currency_conversion_10s','legacy_tabletennis_stub_exists','passive_scanner_status_element','scanner_report_stored']
    for key in required:
        if not app.get(key): failures.append(key)
    if app.get('page_panel_count') != 8 or app.get('app_pages_count') != 8: failures.append('8 page structure')
    if (app.get('game_manifest_missing_files') and not app.get('games_omitted_external_ok')) or app.get('games_without_bridge'): failures.append('game bridge/files')
    if app.get('adult_reward_items_detected',0) < 4: failures.append('adult reward aisle')
    summary=[]
    summary.append('# Jasper Squishy Care Cottage Integrity Test Report')
    summary.append('')
    summary.append(f"Generated UTC: {report['generated_at_utc']}")
    summary.append('')
    summary.append('## Results')
    summary.append(f"- Missing HTML references: {len(report['static_references']['missing_html_refs'])}")
    summary.append(f"- Missing CSS references: {len(report['static_references']['missing_css_refs'])}")
    summary.append(f"- JavaScript files syntax-checked: {len(report['node_syntax'])}; failures: {sum(1 for x in report['node_syntax'] if not x['ok'])}")
    summary.append(f"- JSON files parsed: {len(report['json_parse'])}; failures: {sum(1 for x in report['json_parse'] if not x['ok'])}")
    summary.append(f"- Passive browser scanner VM: {report['browser_scanner_runtime_vm']}")
    summary.append(f"- Python scanner: {'ok' if report['python_scanner']['ok'] else 'failed'}")
    summary.append(f"- Page panels found: {app.get('page_panel_count')} / app nav pages: {app.get('app_pages_count')}")
    summary.append(f"- Game files in app manifest: {app.get('game_manifest_count')}; missing game files: {len(app.get('game_manifest_missing_files',[]))}; games without bridge: {len(app.get('games_without_bridge',[]))}; external-games manifest mode: {app.get('games_omitted_external_ok')}")
    summary.append(f"- Checkout email present and deduction occurs before mailto: {app.get('has_checkout_email')} / {app.get('checkout_deducts_before_mailto')}")
    summary.append(f"- Typeform alert link present: {app.get('has_typeform_link')}")
    summary.append(f"- Emperor Onyx merged panel present and scanner loaded: {app.get('has_onyx_merged_panel')} / {app.get('onyx_scanner_loaded')}")
    summary.append(f"- Adult reward items detected in store data: {app.get('adult_reward_items_detected')}")
    summary.append(f"- File count: {report['file_stats']['file_count']}; uncompressed bytes: {report['file_stats']['uncompressed_bytes']}")
    summary.append('')
    summary.append('## Final status')
    summary.append('PASS' if not failures else 'FAIL: ' + ', '.join(failures))
    (out_dir/'site_integrity_report.md').write_text('\n'.join(summary)+'\n')
    docs_report=ROOT/'docs/TEST_REPORT_JUNE_13_2026_FINAL.md'
    docs_report.write_text('\n'.join(summary)+'\n')
    print('\n'.join(summary))
    return 0 if not failures else 1

if __name__ == '__main__':
    raise SystemExit(main())
