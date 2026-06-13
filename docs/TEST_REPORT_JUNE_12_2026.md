# Jasper's Care Cottage Update + Test Report

## Updates completed

- Replaced the top navigation/time/currency layout with the new Jasper's Care Cottage dropdown navigation and always-visible tracker.
- Replaced Support mood images with the transparent-background versions from the newer uploaded Support package.
- Set Support image rendering to `object-fit: contain` so transparent PNGs are not cropped.
- Rebuilt the currency system to normalize through copper-value math:
  - 10 copper = 1 silver
  - 10 silver = 1 gold
  - 10 gold = 1 platinum
- Added cross-frame game currency support:
  - each mobile game now loads `js/jasper-game-currency-bridge.js`
  - game rewards post back into the main Jasper currency tracker
  - game play rewards normalize into platinum/gold/silver/copper
- Store checkout now uses Jasper order language and opens a prefilled email request to `williamsaville92@gmail.com`.
- Store checkout deducts rewards, clears the cart, and saves purchase history before opening the email request.
- Added small step rewards for store planning/add-to-cart.
- Added automatic rewards for saving DBT diary cards, saving journals, and using Support chat support when those linked tasks are due.

## Automated checks run

Browser-style checks were run with a headless Chromium harness using inline-loaded site files because this sandbox blocks direct browser navigation. The functional tests passed:

- Page loads with no fatal page errors.
- New global nav appears with 8 links.
- Persistent time/currency tracker appears.
- All 8 in-site pages open through navigation.
- Currency normalizes 1781 copper as 1 platinum, 7 gold, 8 silver, 1 copper.
- Task completion adds rewards.
- Weekly and monthly task filters render.
- Weekly/as-needed tasks can be added to today's schedule.
- Today's schedule renders routine tasks.
- Support chat responds to DBT/ADHD support messages.
- DBT skill search works.
- DBT diary card saves to history.
- Journal saves to history.
- Mobile game selector lists 14 games.
- Game iframe receives selected game path.
- Game currency bridge adds rewards into the main tracker.
- By-aisle store add-to-cart works.
- Checkout preview uses Jasper order language.
- Checkout deducts currency, clears cart, and saves purchase history.
- Save/export/import controls exist.
- No browser console errors were found during the core test run.

## Static checks run

- `node --check app.js` passed.
- All 14 game HTML files include the game currency bridge.
- All 11 Support mood PNG files are RGBA transparent-background images.

## Note about email

The checkout flow opens a prefilled `mailto:` email to `williamsaville92@gmail.com`. A fully static HTML site cannot silently send email by itself without a backend or an approved third-party form/email service, so the verified behavior is: deduct rewards, save purchase history, clear cart, and open the prefilled email request.

## Serotonin + Support Lore Revision
- Replaced the Support personality source with the updated Momma-centered Support  lore.
- Expanded the Serotonin page lore renderer to show relationship text, trained commands, pet names, treats, favorite things to steal, habits, and traits.
- Updated chat responses to pull from the new greetings, comfort, pep talk, snack, grumble, signoff, care, and idle line pools.
- Added intent handling for lore/who-are-you and love/good-boy responses.
