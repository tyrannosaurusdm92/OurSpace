# Source Audit

The plug-in was created as a unified clean-room integration so the final messenger does not feel like several competing apps stitched together. Full legacy source folders were intentionally not bundled.

## Uploaded sources inspected

### Source-SnapChat-master.zip
- Useful concepts: camera-first UX, capture flow, lenses/filters, flash/toggle camera/tap-to-focus concepts.
- Action taken: concepts were incorporated into the unified Media Studio and face-filter snapshot flow.
- Code copied: no.
- Reason: source is native/mobile Objective-C style code, not directly useful in a browser plug-in; no clear top-level license was present in the archive listing.

### React-Discord-Clone-master.zip
- Useful concepts: channel list, sidebar, active-user/direct-message feel, message area separation.
- Action taken: channel creation, channel rail, direct-message creation, and active conversation layout were implemented in the unified UI.
- Code copied: no.
- Reason: source is GPL-3.0, so copying code would impose GPL obligations on the final plug-in. The final plug-in uses original implementation code instead.

### Watsapp-Clone-master.zip
- Useful concepts: mobile chat bubbles, media-forward chat ergonomics, simple conversation page.
- Action taken: mobile-first bubbles, attachment cards, and fast composer tools were implemented in original CSS/JS.
- Code copied: no.
- Reason: no clear top-level license was present in the archive listing.

### NextJs-Messenger-Clone-main.zip
- Useful concepts: conversation/message actions, seen/message fetch separation, modern messenger layout.
- Action taken: the plug-in has message envelopes, list/create actions, direct threads, and local-first state.
- Code copied: no.
- Reason: Next.js/Prisma/Pusher stack is not needed for a lightweight site plug-in; the active backend is Google Apps Script.

### matrix-stt-bot-main.zip
- Useful concepts: audio-to-text workflow and transcript-as-message behavior.
- Action taken: browser speech recognition inserts transcribed words into the composer. Audio messages can be recorded and attached.
- Code copied: no.
- Reason: source is a Python Matrix bot using server-side faster-whisper; the requested plug-in is browser/site based.

### voice-change-o-matic-gh-pages.zip
- Useful concepts: Web Audio microphone processing and playful voice effects.
- Action taken: original Web Audio graph code implements normal, warm, robot, chipmunk, deep, echo, and monster effects for voice messages and call mic streams.
- Code copied: no.
- Reason: the plug-in uses a new audio pipeline tailored to the messenger/call flow.

### jeelizFaceFilter-master.zip
- Useful concepts: face tracking runtime and neural-net model for browser face filters.
- Action taken: only the active runtime and one lightweight neural-net model were bundled for the face-filter feature.
- Code copied: yes, limited active vendor runtime/model only.
- Included active vendor files:
  - `vendor/jeeliz/jeelizFaceFilter.js`
  - `vendor/jeeliz/NN_VERYLIGHT_1.json`
  - `vendor/jeeliz/LICENSE-APACHE-2.0.txt`
- Reason: face tracking needs a specialized runtime/model. Unused demos, large libraries, and extra models were excluded.

## Legacy code policy

No unused source trees were retained. Unused code was not moved into docs as dead code; docs contain manifests, audits, license notes, and readme content only. This keeps the plug-in clean and avoids preserving legacy code that is not actively loaded.


## DBT page attach correction

- Removed the standalone messenger `index.html` demo page.
- Added `js/ourspace-dbt-chat-attach.js` to mount the plug-in inside the existing `Chat Bot with DBT Skills` sections of `dino-nerdzone.html` and `squishy-cottage.html`.
- Scoped CSS so the plug-in does not restyle the full site body.
- Added a Windows-safe helper script and install snippet.
