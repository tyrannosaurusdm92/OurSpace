OurSpace admin editor / transparent grid repair

Changes in this package:
- Removed the legacy css/current and js/current js folders.
- Moved all runtime JavaScript files into /js so the existing HTML/script paths load correctly on GitHub.
- Kept the old profile-page visual design while keeping the logical snap grid invisible.
- Added a hard CSS layer that prevents white grid lines / white page-board overlays from painting over the background images.
- Preserved module dragging, sizing/zoom, collapse, user preference save/restore, in-module scrollbars, and admin-only fine controls.
- #admin-editor now survives page hashes, including #admin-editor#mobile-games.
- Admin runtime exports now generate replacement /css and /js files, not /current folders.
- Added .htm aliases for index, squishy-cottage, and dino-nerdzone so both .html and .htm URLs work.
- Bumped the service worker cache name so GitHub Pages/PWA caching stops serving the older white-grid/current-folder build.

Admin URLs:
- index.html#admin-editor or index.htm#admin-editor
- squishy-cottage.html#admin-editor or squishy-cottage.htm#admin-editor
- dino-nerdzone.html#admin-editor#mobile-games

When exporting defaults from the admin editor, unzip the export over the OurSpace folder and commit the generated css/js replacements.
