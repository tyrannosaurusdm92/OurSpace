# OurSpace restart revision patch — 2026-06-26

## Backend
- Locked frontend helper layer to the supplied backend URL.
- Added a cross-device sync wrapper around local app state using `preference.set` / `preference.get`.
- Sync bundle includes profile/home state, backgrounds, uploaded media references, appearance settings, presets, journal entries, combined wellness entries, currency, ledger, messenger thread, and embedded diary-card local storage keys.
- Per-device sessions are preserved; sign-out still only clears the current device.

## Uploads
- Added backend upload attempts for profile images, background images/GIFs, gallery media, and music files.
- Local DataURL saving remains as fallback so uploads still appear immediately on the device.
- When backend upload returns a URL, the URL is saved into the synchronized state for other signed-in devices.

## Appearance Editor
- Removed the old layout-code user interface.
- Added `assets/ourspace-revision-20260626.css` and `assets/ourspace-revision-20260626.js`.
- Added a safe per-page Appearance Editor with background URL/file upload, GIF support, position, size, repeat, attachment, opacity, color pickers, HEX inputs, presets, load/reset, and sync.

## Readability
- Added a global black-text + white-outline readability layer.
- Store inventory, aisles, buttons, currency labels, lists, tables, headings, nav, and generated items are forced readable by default.
- Currency text now uses PP / GP / SP / CP labels.

## Home
- Removed Useful Links, Welcome, Quick Notes, Current Focus, Media Shelf, and Project Board modules.
- Added a larger Journal Entry module.
- Imported positive messages and marquees, filtering out Onyx entries.

## DBT / ADHD
- Copied the personalized diary cards into `modules/diary/`.
- Replaced the old diary card section with a combined Mood Tracker + Diary Cards module.
- Reordered DBT / ADHD as: Saved entries, Mood Tracker + Diary Cards, Skill Menu.

## Tasks
- Added additional weekly/monthly kindness-first disability-aware chores and care tasks for bathroom cleaning, therapy/admin, wheelchair/oxygen support, MCAS-safe cleaning, and spine-kindness chore splitting.

## PWA
- Bumped service-worker cache to `ourspace-pwa-v11-appearance-sync-diary`.
- Added new revision assets, positive message data, and diary modules to the cache list.
