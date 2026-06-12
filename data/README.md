# Mobile-Friendly HTML Games

This folder contains only the games from `Offline-HTML-Games-Pack-master.zip` that passed a mobile-friendliness code audit.

## How to run

Open `index.html` in a browser, or upload the whole folder to GitHub Pages / any static host and open `index.html`.

The actual games are in `games/`. The source game files were copied as-is from your upload. Most are single-file offline HTML games with the game code/assets embedded.

## Included games (14)

- `badicecream3.html` — Has a mobile viewport, Apple mobile-web-app tags, and bundled virtual joystick/mobile touch overlay code.
- `candycrush.html` — Has a mobile viewport and explicit touch/pointer input handling.
- `capybaraclicker.html` — Has a device-width viewport and tap/click gameplay style suitable for phones.
- `flappybird.html` — Has a mobile viewport and explicit touchstart/touchend/touchmove support.
- `fnaf.html` — Has a mobile viewport and tap/click-style launcher/game surface.
- `fnaf2.html` — Has a mobile viewport and tap/click-style launcher/game surface.
- `fnaf3.html` — Has a mobile viewport and tap/click-style launcher/game surface.
- `fnaf4.html` — Has a mobile viewport and explicit touch events/mobile-friendly control code.
- `minesweeper.html` — Has a device-width viewport and tap/click board controls.
- `noobminer.html` — Has a locked mobile viewport and tap/click canvas gameplay.
- `tabletennisworldtour.html` — Has Apple mobile-web-app support, mobile viewport metadata, and mobile/environment detection.
- `theyarecoming.html` — Has a device-width mobile viewport, touch/pointer focus handling, and mobile-device CSS switching.
- `tinyfishing.html` — Has a locked mobile viewport and Apple mobile-web-app tags; gameplay is tap/click friendly.
- `zombierush.html` — Has a locked mobile viewport and touch-action disabled on the game canvas/body for touch play.

## Excluded / needs desktop or manual mobile testing (16)

These were left out because they lacked a reliable mobile viewport/touch-control signal, looked keyboard/mouse-heavy, or need manual device testing before calling them mobile-friendly:

- `angrybirds.html`
- `backrooms.html`
- `baconmaydie.html`
- `badparenting.html`
- `badpiggies.html`
- `bitlife.html`
- `bubbleshooter.html`
- `crazycattle3D.html`
- `ducklife5.html`
- `escapingtheprison.html`
- `fancypantsadventure2.html`
- `fruitninja.html`
- `plantsvszombies.html`
- `subwaysurferssanfrancisco.html`
- `tunnelrush.html`
- `webecomewhatwebehold.html`

## Note

This was a code-level audit, not a physical-device playtest. If a specific excluded game matters, it can likely be wrapped or patched later with a mobile viewport and on-screen controls, but I did not alter the original game files in this mobile-friendly pack.
