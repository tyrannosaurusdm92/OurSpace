# OurSpace Journaling Module

A clean, embeddable journaling module for OurSpace. It supports:

- folder creation
- category creation
- manual journal entries
- TXT upload and reading
- DOCX upload and reading in modern browsers
- entry naming and saving
- localStorage safety saves
- Google Apps Script backend sync adapter using the provided endpoint
- single-entry TXT download
- full journal JSON download/import
- responsive portrait-first layout

## Files to copy into your site

```text
assets/css/journal-module.css
assets/js/docx-lite-reader.js
assets/js/journal-module.js
```

Then add this where the module should appear:

```html
<link rel="stylesheet" href="assets/css/journal-module.css">

<div
  id="ourspace-journal-root"
  data-ourspace-journal-auto
  data-profile="william"
  data-backend-url="https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec">
</div>

<script src="assets/js/docx-lite-reader.js"></script>
<script src="assets/js/journal-module.js"></script>
```

Change `data-profile` to `william`, `jasper`, or whatever account/profile name your site already stores. If you omit it, the module tries to use existing OurSpace profile/account values and then falls back to `shared`.

## Standalone preview

Open `journal-module.html` in a browser to test the module by itself.

## Backend behavior

The module posts JSON-as-text to the provided Google Apps Script URL using actions:

- `journal_save`
- `journal_load`

If the backend is offline, missing the journal handler, or blocked by CORS, entries still save locally and can be downloaded as JSON. See `docs/readmes/BACKEND_CONTRACT.md` for the expected backend payload.

## Source repo handling

Uploaded repos were audited and documented. No third-party source code was copied into the final shipped module. See:

- `docs/audits/source-repo-audit.md`
- `docs/licenses/license-notes.md`
- `docs/manifests/source-repo-manifest.json`
- `docs/readmes/UNUSED_CODE.md`
