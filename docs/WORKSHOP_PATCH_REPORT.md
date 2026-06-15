# OurSpace Workshop Patch Report

## Scope
This patch focuses on the current workshop goals:
- make the Messenger module behave like a real movable/collapsible module,
- add module-level sizing controls,
- add optional carousel/slide mode for larger multi-part modules,
- add Progressive Web App files for GitHub Pages home-screen install support.

## Main fixes

### Messenger
- Fixed the malformed Messenger module class from `modulelarge wide tall` to `module large wide tall` in both profile pages.
- Added a safety repair in `js/ourspace-module-workshop.js` so any future `modulelarge` typo is corrected at runtime.
- Loaded the Jeeliz face-filter vendor script before the messenger where available.
- Updated `js/ourspace-messenger.js` so the configured `storageKey` is respected. Dino and Squishy messenger state no longer has to collide in one shared default localStorage key.
- Added a graceful backend-bridge fallback so the messenger can still open locally if the backend bridge script fails or is delayed.

### Modules
- Added `css/ourspace-module-workshop.css`.
- Added `js/ourspace-module-workshop.js`.
- Every module now receives a size dropdown with 25%, 50%, 75%, and 100% options.
- Module width and module-body font scale together based on the selected size.
- Size, collapsed state, position, carousel mode, and carousel slide index are saved in the same per-profile/per-page localStorage layout key.
- Larger modules with multiple direct content sections can use optional `Slides` mode with previous/next controls.
- The original drag-and-collapse system remains intact; this patch layers on top of it rather than replacing it.

### PWA / app install support
- Added `manifest.webmanifest` in the site root.
- Added `service-worker.js` in the site root.
- Added `css/ourspace-pwa.css` and `js/ourspace-pwa.js`.
- Added app icons in `/icons/` using the existing Onyx artwork.
- Added PWA manifest, apple touch icon, theme-color, install prompt, and offline badge support to:
  - `index.html`
  - `dino-nerdzone.html`
  - `squishy-cottage.html`

## GitHub Pages placement
For a project repository named `OurSpace`, upload the contents so this file is reachable at:

`https://tyrannosaurusdm92.github.io/OurSpace/manifest.webmanifest`

The main app should load from:

`https://tyrannosaurusdm92.github.io/OurSpace/`

All new PWA paths are relative, so they should work under the `/OurSpace/` project path.

## Important note
The service worker intentionally does not pre-cache every large game HTML file during install. It caches the app shell and core profile data first, then fetches games network-first when opened. This avoids making mobile install fail from trying to cache huge game files all at once.
