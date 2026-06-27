# OurSpace Visual Player Module

A clean drop-in photo/video player for OurSpace. It was built as a vanilla JavaScript module so it can be embedded directly into existing HTML pages without React, Django, Laravel, Joomla, WordPress, Go, Jekyll, or Eleventy runtime dependencies.

## Included features

- Photo and video uploading with multi-file support.
- Folder creation and folder upload support using `webkitdirectory` where browsers allow it.
- Playlist creation and checked-item playlist assignment.
- Play, pause, stop, previous, next, shuffle, rewind 5 seconds, fast forward 5 seconds.
- Photo slideshow playback using the same play/pause/stop/seek controls.
- Video playback using an internal video element and custom controls.
- Download current item or individual gallery items.
- Local-first storage through IndexedDB for real uploaded files.
- Backend sync queue pointed to the supplied Apps Script URL:
  `https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec`
- Responsive, portrait-friendly layout styled to fit the OurSpace cyan/orange visual language.

## Files

- `visual-player-demo.html` — standalone demo page.
- `home-visual-module.html` — small snippet for the Home page.
- `global-visual-bridge-snippet.html` — script/style bridge for pages that need API access.
- `css/ourspace-visual-player.css` — module styling.
- `js/ourspace-visual-player.js` — module logic.
- `backend/google-apps-script-visual-contract.gs` — optional Apps Script contract helper.
- `docs/` — audits, licenses, manifest, integration notes, backend contract, and test report.

## Storage note

Browsers cannot keep large uploaded videos reliably in normal `localStorage`, so this module uses IndexedDB. The backend sync queue sends metadata, thumbnails, folders, playlists, and small files under 2 MB inline. Large videos remain local unless your Apps Script backend is expanded to accept Drive uploads or chunked file storage.
