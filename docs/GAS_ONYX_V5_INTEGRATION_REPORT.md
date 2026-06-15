# OurSpace Google Apps Script + Onyx V5 Integration Report

Generated: 2026-06-15 11:54:11 UTC

## Backend configuration

Main OurSpace backend:

```text
https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec
```

Onyx full backend:

```text
https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

All old Apps Script URLs that were still present in active HTML/JS/JSON/Markdown were replaced.

## What changed

- Replaced the old `/onyx/` widget/data package with the uploaded **Lord Onyx Blepman Google Apps Script v5** static package.
- Kept Onyx embedded inside the two correct profile-page modules instead of giving him a separate page requirement:
  - `data-module-id="onyx-image"` = **Onyx V5 Mood + Status Module**
  - `data-module-id="onyx-chat"` = **Papa's Best Friend Onyx Chat** on Dino, **Momma Helper Onyx Chat** on Squishy
- Added a new `/onyx/onyx-widget.js` wrapper that talks to the Onyx full Google Apps Script endpoint directly with safe JSON handling.
- Added a new `/onyx/onyx-widget.css` style layer for the v5 embedded module UI.
- Added image-mood helper controls inside the Onyx chat module.
- Synced mood selection between the mood picture module and chat module.
- Added local safe fallback responses so the Onyx widget does not hard-crash if Apps Script returns HTML, non-JSON, an error page, or times out.
- Added `/js/ourspace-gas-app.js` for landing-zone and phone/PWA app behavior events:
  - landing zone open
  - app launch
  - app installed
  - install prompt available
  - app online/offline
  - page/hash change
  - visibility change
- Updated store checkout in both profile pages to submit purchase requests to the main Google Apps Script backend first.
- Store checkout now queues locally and downloads a backup TXT if the backend rejects the request or returns non-JSON.
- Updated `assets/js/config.js`, messenger bridge URLs, and service worker cache assets.
- Added `assets/js/config.js` and `assets/js/backend-bridge.js` to `index.html` so the landing/sign-in page can use the new main Apps Script backend.

## Test summary

Detailed test output is stored at:

```text
docs/GAS_ONYX_V5_INTEGRATION_TEST_RESULTS.json
```

Checks performed:

- Required file presence: passed.
- Dino and Squishy Onyx module placement/profile checks: passed.
- Old backend URL removal from active text files: passed.
- JavaScript syntax checks with `node --check`: passed.
- Inline profile-page JavaScript syntax checks: passed.
- Local HTML `src`/`href` path checks: passed.
- Service worker cache asset existence check: passed.
- Onyx upgraded mood/data asset check: passed.

The sandbox did not keep a local loopback HTTP server reachable long enough for a live browser-style HTTP smoke test, so that one is marked skipped rather than passed.
