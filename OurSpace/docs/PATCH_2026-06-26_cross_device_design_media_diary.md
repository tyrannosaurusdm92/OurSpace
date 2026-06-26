# Patch 2026-06-26 — cross-device design/media sync, readability, diary cards

Locked backend URL, unchanged:
https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec

## Changes
- Added backend-backed profile-state sync for per-user design state, MySpace/site CSS, profile image metadata, gallery media metadata, music metadata, page backgrounds, wishlist/cart/home state, events, and custom game metadata.
- Added backend media upload calls for profile images, gallery images/videos, page background images, and MP3 uploads. Large uploads are sent to the existing backend media endpoint; oversized or failed uploads stay local instead of breaking the page.
- Fixed missing modal helpers that caused several buttons to do nothing.
- Added a global MySpace Code / Site Styling modal reachable from every page toolbar.
- Added black text with white outline styling across the app to protect readability against pale backgrounds and custom theme colors.
- Updated currency display labels to PP / GP / SP / CP.
- Added personalized William/Jasper diary-card HTML files to the home pages.
- Removed the DBT/ADHD page diary-card module.
- Removed Useful Links, Welcome, Quick Notes, Current Focus, and Media Shelf modules from home.
- Added marquees and positive-message cards using the supplied positive message JSON, with character-specific/Onyx-related entries filtered from the message/marquee data.
- Bumped service-worker cache and added diary-card/positive-message assets to the PWA cache list.

## Validation
- Checked JavaScript syntax for william.html and jasper.html.
- Checked service-worker JavaScript syntax.
- Checked manifest JSON syntax.
- Checked all JSON files parse.
- Confirmed lowercase and uppercase login routes remain present.
- Confirmed no old backend URL is used in frontend files.
