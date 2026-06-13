# Momma Psychiatrist Onyx Site Merge Report

This package merges the upgraded Momma-specific Emperor Onyx psychiatrist/DBT/ADHD bot into the one-HTML SquishyRewards site.

## Live entry point

- `index.html` is the only live `.html` file.
- `Emperor_onyx.html` is not included as a second page. The source was preserved as `docs/onyx_momma_psychiatrist_source_preserved/emperor_onyx.html.source.txt`.

## Main changes

- Added `js/onyx-momma-psychiatrist-bridge.js`.
- Patched `js/app.bundle.js` so old Onyx replies delegate to the upgraded Momma psychiatrist bot.
- Patched passive scanning to use the Momma-specific scanner first.
- Copied upgraded data into `/data/` and mirrored active Onyx data into `/json/`.
- Added an Onyx Scanner + Teaching Console module to the support page.

## Safety boundary

Onyx is supportive DBT/ADHD/psychoeducation and safety-triage software. It can bridge support while waiting for care, but it is not licensed therapy, medical care, or emergency care. Critical safety language routes to live-human/emergency/crisis support language.
