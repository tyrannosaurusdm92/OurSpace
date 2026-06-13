# Full Functionality Upgrade Report — June 13, 2026

## Main changes

- Added `css/jcc-full-functionality-upgrade.css` and `js/jcc-full-functionality-upgrade.js` as a compatibility layer over the working mobile-first app bundle.
- Kept `js/app.bundle.js` as the primary runtime, but exposed a small `window.JCC_APP` API so the upgrade layer can safely use the real app state, task library, currency system, rendering, game quit/save routine, and export helpers.
- Moved the persistent time/currency tracker into the navigation dropdown so it hides with the nav and stays out of the scrolling area.
- Added reset/collapse/expand controls to every page heading.
- Added a searchable Today task module for adding, hiding, removing, and completing tasks directly from Today's Schedule.
- Added support for hiding automatic daily/weekday tasks for the current day only.
- Added journal PDF export while keeping TXT and DOCX exports.
- Renamed diary card image export to `Export Image (PNG)` and kept diary card PDF export.
- Added an in-site external portal with a Back to Cottage button for social/media/store/alert links.
- Added game shell controls: take over screen, site home, save + exit, and open game tab.
- Added same-origin in-game home button injection when browser permissions allow it.
- Added parent-level game home overlay for mobile fullscreen mode.
- Added save/quit calls when the game module collapses, the app is hidden, or the page is leaving.
- Added Typeform/Trueform alert signup buttons in navigation and Onyx support.
- Improved checkout by copying the order text when possible, downloading a TXT backup order file, deducting in-site currency, and opening an email to `williamsaville92@gmail.com`.
- Expanded hidden-risk detection inside Onyx support replies for language like worthlessness, burden, giving up, unsafe alone, self-destruction, numbness, dissociation, and wanting to disappear.

## Static hosting limitation

GitHub Pages cannot send email directly without an email service or backend. This build makes checkout as safe as possible for a static site: it opens the caregiver email request, copies the body where the browser allows, and downloads a TXT backup. To make email truly automatic, connect a verified backend/form service later.

## Games

Game HTML files are intentionally omitted from this ZIP. Keep the existing `/games/*.html` files on GitHub. The app manifest still points to them, and validation passes in external-games manifest mode.

## Validation

- Missing HTML references: 0
- Missing CSS references: 0
- JavaScript syntax failures: 0
- JSON parse failures: 0
- Passive scanner VM: pass
- Python scanner: pass
- 8 page panels / 8 app nav pages: pass
- Game files omitted external manifest mode: pass
- Checkout email present: pass
- Typeform alert link present: pass
- Final validator status: PASS
