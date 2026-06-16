OurSpace admin-editor update

What changed:
- Restored the old visual profile/page styling by removing the visible white grid/background override and the compact 50% redesign layer.
- Kept invisible 24px snap-grid behavior for dragging/resizing modules.
- Kept module zoom options from 25% through 200%, with 130% as the default.
- Added horizontal and vertical in-module scrollbars for module bodies.
- Added #admin-editor mode with export buttons for default desktop/mobile override zips.
- Added per-module admin controls for font %, button %, content %, width, and height.
- Patched hash parsing so #admin-editor#mobile-game routes to mobile-games.

Use:
- Public pages: normal URLs, no admin controls visible.
- Editor pages: add #admin-editor, then optional in-site hash after it.
  Example: dino-nerdzone.html#admin-editor#mobile-game
- After arranging modules, click Export default desktop override or Export default mobile override.
- Unzip that exported override over your GitHub OurSpace folder. The placeholder default override files are already included so the main module workshop script knows where to load replacements.
