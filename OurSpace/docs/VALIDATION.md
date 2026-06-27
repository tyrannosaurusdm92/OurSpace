# Validation Notes

Checks performed in the sandbox:
- Zip extracted and repacked without dropping files.
- Runtime catalog JSON parsed successfully.
- Added weekly/monthly task IDs are unique and present in both tasks/care where appropriate.
- User-facing text search did not find reserved backend module references in HTML/catalog/runtime assets.
- Manifest JSON parsed successfully and points to the GitHub Pages OurSpace route.
- Service worker references only files that exist in this replacement folder at build time or the generated lowercase entry.
- Inline scripts from `OurSpace.html`, `ourspace.html`, `william.html`, and `jasper.html` were extracted and passed Node syntax checks.
- Backend Apps Script source is included under `backend/` but reserved actions are intentionally not exposed in the front-end action selector.

Browser rendering is not available in this sandbox environment, so device-mode testing is represented by static responsive CSS checks plus syntax/cache/manifest validation.


## 2026-06-26 mobile/backend sign-in patch
- Locked frontend backend URL to `https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec`.
- Changed frontend backend calls from JSON POST to simple `text/plain` POST with GET fallback to reduce mobile browser/CORS/preflight failures.
- Fixed login-page JavaScript duplicate `const password` declaration.
- Moved server-side account creation to the profile-claim step so signup sends `profileKey` and creates the real backend account instead of only a browser-local account.
- Sign-in now uses backend `auth.signin` and stores the returned session token per device.
- Backend sessions are per-device tokens; the frontend does not sign out other devices, and sign-out only invalidates the current device token.
- Existing browser-local accounts can migrate to the backend on the next successful sign-in from that browser.

## 2026-06-26 mobile backend + multi-device pass

Validated locally after patch:

- `OurSpace.html`, `ourspace.html`, `william.html`, and `jasper.html` inline JavaScript syntax passes `node --check` after script extraction.
- `assets/*.js` and `service-worker.js` pass `node --check`.
- Included `backend/OurSpace_Unified_Merged_Backend.gs` passes JavaScript syntax check when copied to `.js` for parser validation.
- All `.json` files and `manifest.webmanifest` parse successfully.
- `ourspace.html` is present for the published GitHub Pages route.
- Service worker cache bumped to `ourspace-pwa-v10-mobile-cloud-auth`.
- Only the locked backend URL is present in code/docs.
- Frontend uses backend auth/session tokens and no longer requires a device-local desktop account before phone/tablet login.
- Backend sessions are per-device tokens; signout sends only the current token.

Live backend note: I attempted to open the Apps Script URL from the sandbox web tool, but the request timed out there. The app files were therefore validated statically and patched to use POST, GET, JSONP, and opaque write fallbacks for mobile browser differences.

## Restart revision validation — 2026-06-26
- Verified zip source was patched from the uploaded full app bundle.
- Verified service worker cache paths exist.
- Verified JSON files parse successfully.
- Verified new revision JavaScript parses with Node.
- Verified inline JavaScript in `william.html`, `jasper.html`, `OurSpace.html`, and `ourspace.html` parses with Node.
- Verified the old layout-code UI text is not present in William/Jasper page HTML.
- Verified positive message JSON was imported with Onyx entries filtered out.
- Verified personalized diary card HTML files are present under `modules/diary/`.


## 2026-06-26 Diary full integration + clean positive messages

Validated after the diary/positive-message patch:

- `william.html` and `jasper.html` no longer contain the visible Mood Tracker module.
- DBT / ADHD page order is now Saved DBT / ADHD Entries, Diary Cards, Skill Menu.
- Diary cards are embedded through `assets/ourspace-diary-cards-embedded.js`; runtime no longer fetches or iframes `modules/diary/*.html`.
- Standalone runtime diary-card HTML files were removed from `modules/diary/`.
- Clean William/Jasper positive affirmations and marquees were written into `assets/ourspace-positive-messages.js` and profile JSON files.
- Positive affirmation + marquee blocks are injected into every in-app page.
- Login/home route receives the same positive-message banner through `assets/ourspace-positive-global.js`.
- Service-worker cache bumped to `ourspace-pwa-v13-diary-integrated-positive`.
- Checked JavaScript syntax for new/revised assets and inline page scripts.
- Parsed all JSON files successfully.
- Checked service-worker cached paths; no missing files.
- Confirmed runtime files no longer contain the removed/corrupted Onyx phrases or Mood Tracker labels.
