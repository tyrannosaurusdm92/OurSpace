# Patch 2026-06-27 — DBT layout and module replacements

## DBT / ADHD page
- Reflowed the diary card so the main weekly diary sheet uses the full width first.
- Moved the DBT skills side menu below the sheet.
- Placed the reflection fill boxes, used-skills scale, and session fields beside the moved side menu.
- Kept the diary card vertically and horizontally scrollable.

## Home modules
- Replaced the old music player card with the attached OurSpace Media Player module.
- Replaced the old gallery card with the attached OurSpace Visual Player module.
- Replaced the old simple journal card with the attached OurSpace Journaling module.
- Copied runtime module assets into `assets/modules/`.
- Copied source docs/contracts into `docs/module-replacements-20260627/`.

## Compatibility
- Guarded the old gallery/music handlers so removed legacy controls do not throw errors.
- Updated page-state events so the media player can detect Games and pause.
- Added new module runtime files to the service worker cache list.
