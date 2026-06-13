# SquishyRewards boot repair report — June 13, 2026

## What was wrong

The app code itself was mostly present, but startup was fragile. If Jasper's browser had older or corrupted saved data in localStorage, the app could crash during boot before the navigation, time tracker, menus, modules, buttons, store, chat, games, and schedule tools finished binding.

The risky part was `loadState()` in `js/app.js`: it shallow-merged saved browser data over the default state. If any old value was `null`, the wrong type, or from an older site version, later functions such as task rendering, time rows, store rendering, cart rendering, or layout restore could throw a TypeError and stop the whole app.

## Repairs made

- Added saved-data sanitizing/migration in `js/app.js`.
- Arrays are repaired back to arrays: activity, custom tasks, cart, store items, purchases, journals, diary cards, gallery, chat, scanner reports.
- Objects are repaired back to objects: completions, today-added tasks, time rows, layout, media connections, game session, currency.
- Currency is normalized after loading and saving.
- Startup is now divided into safe boot steps, so one optional module cannot stop the whole app from loading.
- Rendering is now divided into safe render steps, so one broken panel cannot stop the clock/nav/store/chat from updating.
- Toast messages now fail safely if the toast host is unavailable.
- Added missing `assets/onyx-moods/` compatibility path for Emperor Onyx mood images.
- Added missing `games/developer_v1.js` compatibility shim for Table Tennis World Tour.
- Added root `.nojekyll` for GitHub Pages.

## Validation results after repair

- Missing HTML references: 0
- Missing CSS references: 0
- JavaScript syntax failures: 0
- JSON parse failures: 0
- Page panels detected: 8 / 8
- Passive scanner VM: passed
- Python scanner validator: passed
- Checkout email present: yes
- Checkout deduction before mailto: yes
- Typeform alert link present: yes
- Emperor Onyx linked: yes
- Game files detected: 22 / 22
- Games without currency bridge: 0

## Browser reset note

This patch should repair bad saved data automatically. If a browser still shows the old broken behavior because GitHub Pages or the browser cached old JavaScript, do a hard refresh after uploading:

- Windows Chrome/Edge: Ctrl + F5
- Or clear site data for the GitHub Pages URL and reload

