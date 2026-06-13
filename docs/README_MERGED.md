# Fully merged psychiatrist / DBT / ADHD support bot workspace

This folder preserves every uploaded source ZIP and every extracted source tree, then adds a shared passive scanner layer that can run behind chatbot conversations.

## Structure

- `source_zips_original/` — exact copies of every uploaded ZIP, preserved for rollback.
- `sources_original_unmodified/` — extracted originals, not patched.
- `merged_system/source_trees_linked_and_patched/` — working copies with integration hooks added.
- `merged_system/psychiatry_merge/` — Python primary/secondary/tertiary scanner package.
- `merged_system/assets/js/` — browser background scanner runtime, built from the uploaded health-behavior scanner.
- `merged_system/assets/typescript/` — Next/TypeScript scanner helper for the SideJot chat API.
- `merged_system/data/` — merged DBT, health impact, and scanner reference JSON assets.
- `integration_patches_applied/` — patch notes and exact integration snippets.
- `MERGE_MANIFEST.json` — complete manifest of preserved input ZIPs, added files, patched files, and validation checks.

## Three-layer system

1. **Primary system**: immediate safety, self-harm language, harm-to-others language, urgent medical red flags, acute dysregulation.
2. **Secondary system**: DBT routing, ADHD/executive-function support, trauma/attachment cues, shame/self-attack, self-care blocks, mobility/pain/fatigue barriers.
3. **Tertiary system**: masked distress, caregiver/support context, pattern tracking, accommodations, reference retrieval, care-plan hints.

## Passive behavior

The scanner is not a visible button. Browser apps load:

```html
<script src="/assets/js/health_scanner_data.js"></script>
<script src="/assets/js/scanner-core.js"></script>
<script src="/assets/js/health_scanner_bridge.js"></script>
<script src="/assets/js/unified-background-psychiatry-runtime.js"></script>
```

The runtime patches `fetch()` and form submissions so messages are scanned before chatbot responses. It attaches `_psychiatryBackgroundReport` and `_psychiatryPromptContext` to JSON payloads when possible.

Python apps can use:

```python
from psychiatry_merge import get_default_scanner
scanner = get_default_scanner()
report = scanner.analyze_text(user_message)
augmented_message = scanner.build_augmented_message(user_message, report)
response = scanner.enrich_response(existing_bot_response, report)
```

The original bot function signatures are preserved; the scanner augments context and post-processes safety-critical replies without deleting psychiatric/personality/mental-health code.
