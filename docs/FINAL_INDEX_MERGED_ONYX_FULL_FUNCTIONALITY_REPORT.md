# Final index-merged Onyx + full functionality report

Date: 2026-06-13

## Runtime simplification

- `index.html` is now the single live GitHub Pages entry point.
- `Emperor_onyx.html` has been merged into the Onyx/DBT support page and removed as a runtime dependency.
- The live page loads one combined app runtime: `js/app.bundle.js`.
- The live page loads the full-functionality upgrade layer: `js/jcc-full-functionality-upgrade.js`.
- The live page loads one mobile-first main stylesheet plus the upgrade stylesheet:
  - `css/styles.css`
  - `css/jcc-full-functionality-upgrade.css`

## Onyx merge

The useful Onyx content from the former full-screen page is now inside the main support page as the “Merged Emperor Onyx Full Companion” module. The main chat now treats Onyx as the primary DBT/ADHD/support personality and no longer tells the user to open a separate companion page.

## Module/window behavior

- Modules are movable by their headers.
- Modules collapse into bubbles.
- Each page receives Collapse Page, Expand Page, and Reset Modules controls.
- The floating Onyx support window is movable and collapsible.
- External site portal windows have Back to site, Bubble, and Open in new tab controls.

## Navigation tracker

- The time tracker and currency tracker are moved into the navigation dropdown.
- When the navigation bar is hidden, the tracker hides with it to make mobile scrolling easier.

## DBT diary / journal exports

- DBT diary card exports as PDF and PNG image.
- Journals export as TXT and PDF.
- Existing DOCX journal export remains available.

## Today’s schedule

- Today’s Schedule now has a task search module.
- Tasks can be searched, added to today, removed/hidden from today, or completed directly from that page.

## Games

- The game module has a top bar with Take over screen, Site home, Save + exit game, and Open game tab controls.
- Collapsing or closing the game module calls the save/quit flow.
- Game HTML files are intentionally not included in this slim ZIP; the existing GitHub `games/` folder should remain in the repo.

## Checkout and alerts

- Store checkout still deducts earned Squishy currency and opens/copies the caregiver request.
- Checkout also posts the cart/order payload to the provided Zapier webhook.
- Alert signup has a direct form that posts to the same Zapier webhook with `notifyEmail`/`send_to` set to `williamsaville92@gmail.com`.
- If the webhook is blocked by the browser or network, the site opens a mailto fallback.

## GitHub note

Keep archival source folders outside the live GitHub Pages root unless needed for provenance. The live app does not need `sources_original_unmodified` to load.
