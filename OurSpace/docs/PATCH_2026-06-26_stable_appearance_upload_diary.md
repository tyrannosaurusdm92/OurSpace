# Stable appearance/upload + diary patch

Base used: `OurSpace_diary_brandfont_fixed.zip`, because that version preserved the working appearance editor and upload controls.

Changes:
- Kept the working appearance editor/upload scripts as the base.
- Removed the Mood Tracker from DBT / ADHD.
- Embedded William and Jasper diary cards directly into their pages.
- Patched startup code so removed Mood Tracker IDs cannot stop page boot.
- Patched the revision script so it does not overwrite the direct diary card area.
- Limited positive messaging to one affirmation and one marquee per page.
- Replaced positive-message data with the clean William/Jasper lists only.
- Preserved local and backend upload paths for profile images, backgrounds, gallery, and music.

- Removed separate `modules/diary` runtime files because the diary cards are now embedded directly in `william.html` and `jasper.html`.
- Replaced `json/shared/positive_messages.json` with the same clean William/Jasper lists.
