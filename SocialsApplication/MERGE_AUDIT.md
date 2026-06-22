# Socials Application Merge Audit

## Goal

Create one open-source social media alternative for a small private network of friends and loved ones, named **Socials Application**, with a Windows-friendly shallow folder structure and no odd duplicated code.

## Inputs reviewed

| Input package | Safe ideas merged into runtime | Kept as documentation only |
| --- | --- | --- |
| `Discord_Merged_Package.zip` | Channel list, local message store shape, history import/export, emoji reactions, channel UI patterns | Discord bot/Activity-specific integration code and upstream license/audit notes |
| `SnapMerge_windows_friendly_safe_merge.zip` | Camera, filters, draggable overlays, text stickers, gallery, expiring story model, safe local media handling | Risky/leaked/account-automation source references already excluded by that package; upstream manifests and license notes |
| `zoom-unified-suite.zip` | WebRTC rooms, SSE signalling, room chat, hand raise, reactions, recording export, notes, transcript import, lightweight meeting analysis/export | External meeting-service-specific unused references and upstream manifests/license notes |

## Deduplication decisions

- One Node.js server (`server.js`) replaces separate Discord/Snap/Zoom local servers.
- One browser app (`app/index.html`, `app/styles.css`, `app/app.js`) replaces separate frontends.
- One shared `data/socials-data.json` store handles posts, channels, profiles, and stories.
- WebRTC room state remains in memory because it is session-only and should not bloat persistent social data.
- Duplicate import/export helpers, media rendering helpers, static file servers, and reaction/chat logic were merged into shared functions.
- Runtime dependencies were reduced to **zero external npm dependencies**.

## Runtime feature matrix

| Feature | Status |
| --- | --- |
| Social feed | Included |
| Posts with image/video/audio data URLs | Included, size-limited by server body limit |
| Comments and emoji reactions | Included |
| Named channels | Included |
| JSON channel export/import | Included |
| Camera capture | Included |
| Filters/stickers/text overlays | Included |
| Stories | Included; default 24-hour expiry |
| Local gallery | Included; browser localStorage |
| WebRTC video/audio rooms | Included |
| Screen share | Included where browser supports it |
| Room chat/reactions/hand raise | Included |
| Meeting notes/transcript import/exports | Included |
| Public social network hardening | Not included; add auth/HTTPS/database before public hosting |

## Excluded from runnable app

- Credential cracking/brute forcing.
- Token scraping or account automation.
- Leaked/proprietary client code.
- Third-party service impersonation.
- Large upstream source trees that would duplicate code or create license contamination.
- External vendor/dependency folders.

## Result

The final app is a compact, original implementation that uses the best safe concepts from the source packages while keeping upstream source documentation and license evidence in `docs/`.


## Mobile games integration

- Added `app/games/` with the offline keep-set single-file HTML games.
- Added `app/games_manifest.json` for the runtime launcher.
- Added `app/app-games.js` as a standalone Socials Games module instead of mixing all launcher code into the core social/camera/rooms script.
- Added `/api/presence` and `/api/online-users` for live active-user roster support.
- Copied the mobile game source docs into `docs/mobile-games/`.
