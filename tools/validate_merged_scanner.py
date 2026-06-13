from pathlib import Path
import json, sys, py_compile
root = Path(__file__).resolve().parents[1]
checks = []
for rel in ['tools/psychiatry_merge/scanner.py']:
    p = root / rel
    py_compile.compile(str(p), doraise=True)
    checks.append({'file': rel, 'status': 'compiled'})
sys.path.insert(0, str(root / 'tools'))
from psychiatry_merge import get_default_scanner
scanner = get_default_scanner()
report = scanner.analyze_text('I am fine but I have not eaten and I feel useless and stuck.')
assert report['layers']['secondary'], 'Expected secondary support signals'
checks.append({'scanner_refs_loaded': len(scanner.references), 'risk': report['risk_level'], 'status': 'ok'})
print(json.dumps({'status': 'ok', 'checks': checks}, indent=2))
