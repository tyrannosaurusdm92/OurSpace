# Jasper Squishy Rewards Game Currency Patch

Updated: 2026-06-12T20:23:43.649878+00:00

## Dropdown/source of truth
The game dropdown now uses the actual bundled games in `/games`:

- `angrybirds.html`
- `baconmaydie.html`
- `badicecream3.html`
- `badpiggies.html`
- `bubbleshooter.html`
- `candycrush.html`
- `capybaraclicker.html`
- `ducklife5.html`
- `escapingtheprison.html`
- `fancypantsadventure2.html`
- `flappybird.html`
- `fnaf.html`
- `fnaf4.html`
- `fruitninja.html`
- `minesweeper.html`
- `noobminer.html`
- `plantsvszombies.html`
- `tabletennisworldtour.html`
- `tinyfishing.html`
- `tunnelrush.html`
- `webecomewhatwebehold.html`
- `zombierush.html`

Removed from the dropdown:

- `fnaf2.html`
- `fnaf3.html`
- `theyarecoming.html`

## Rewards
Every bundled game HTML file has this script injected before `</body>`:

```html
<script src="../js/jasper-game-currency-bridge.js"></script>
```

The bridge no longer pays Jasper for logged game time or Onyx time. Rewards are automatic and come from in-game signals instead:

- game launch
- in-game pointer/touch/click/keyboard actions, so even games with no visible score still pay Squishy currency
- score / points / coins / stars / gold / cash / XP changes when those are drawn on canvas, shown in the DOM, or saved in browser storage
- level / wave / round / night progress when detectable
- win / level-complete / achievement signals when detectable
- extra hard-game bonuses for `fnaf.html` and `fnaf4.html`, including night survived / 6 AM, mask, door, light, camera, power, and defensive-action streaks

## Theme
The site theme was re-stabilized with the requested sunset/sunrise orange, butter yellow, starfish pink-orange, soft yellow, cyan, teal, aqua, witchcore/cottagecore palette, and the supplied background URLs.
