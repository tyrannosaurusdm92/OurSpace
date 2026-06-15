# Chatbot layout, module zoom, and personalization repair

This patch corrects the Onyx/Messenger page layout, true module zoom behavior, and user-specific replacement copy.

## Main changes

- Reworked the Chat Bot with DBT Skills page default layout to match the requested visual map:
  - left top: Profile + External Links
  - left bottom: Messenger
  - right top: DBT Skill Prompt
  - right middle: Onyx Auto Face + Status
  - right bottom: Onyx Chat
- Added a module layout version migration so old messy saved coordinates are cleared once after this update.
- Kept modules draggable and collapsible.
- Repaired the size dropdown so 25%, 50%, 75%, and 100% scale module contents like a zoom control, including text, buttons, inputs, and embedded widgets.
- Removed manual Onyx mood picking from the image module. Onyx now displays a program-selected face based on conversation/backend mood logic.
- Replaced generic/filler helper copy with William-specific Dino Nerdzone language and Jasper-specific Squishy Cottage language.
- Kept Google Apps Script backend URLs configured for the main site and Onyx backend.

## Notes

The live Apps Script endpoints were not called from the static test script. Browser-side/live backend behavior still needs to be verified after uploading to GitHub Pages.
