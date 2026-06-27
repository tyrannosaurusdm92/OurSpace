# Patch 2026-06-27 — Home modules and DBT diary layout

## Completed

- Replaced the visible old Home music player with the attached OurSpace Media Player module.
- Added Home dropdown entries for Profile + Music, Visual Player, and Journal.
- Added a dedicated Home · Visual Player page using the attached visual/gallery player module.
- Added a dedicated Home · Journal page using the attached journaling module.
- Kept Profile + Music as the Home page so the media player remains loaded in the shell.
- Moved the DBT diary card side menu under the diary sheet.
- Moved the reflection boxes and *USED SKILLS scale beside the moved DBT side menu.
- Widened the diary sheet and preserved horizontal/vertical scrolling.
- Copied module docs, audits, licenses, manifests, and backend contracts into docs/module-* folders.
- Updated the service worker cache with the new module CSS/JS files.

## Notes

- The old visible gallery/music/journal panels were removed from Home. Compatibility guards remain in the legacy page script so missing old element IDs do not break the page.
- Media and visual uploads are local-first through IndexedDB; backend sync hooks remain pointed at the supplied OurSpace Apps Script URL.
