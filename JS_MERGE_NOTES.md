# Squishy + Onyx JS merge notes

Updated: 2026-06-12

## Structure

- `app.js` stays at the site root.
- Merged Onyx/Squishy support files live in `/js/`.
- The old temporary source folders `js (onyx)` and `js (squishy)` were removed from this cleaned package.

## `/js/` files

- `onyx-personality-data.js` — preferred merged data file. This keeps Squishy Helper Onyx's newer personality voice and relationship details, plus the richer DBT/ADHD/attachment support catalog and 22-game list.
- `emperor-onyx-rulebot-data.js` — compatibility shim for older Onyx files. It points older code at the merged data rather than overwriting it.
- `emperor-onyx-rulebot.js` — legacy Onyx rulebot engine kept for reference/future standalone use.
- `jasper-reward-catalog-data.js` — Onyx reward catalog data.
- `onyx-rewards-games.js` — optional legacy reward helper updated to recognize current Squishy chat IDs/data attributes. It is kept in `/js/` but not loaded by default to avoid duplicate reward listeners with `app.js`.
- `jasper-game-currency-bridge.js` — stronger Onyx game bridge. It rewards in-game actions, score/coin/star/gold/XP changes, wins/levels/waves, and FNAF survival actions. It does not reward passive time logging.

## HTML load order

`index.html` now loads:

1. `./js/onyx-personality-data.js`
2. `./js/emperor-onyx-rulebot-data.js`
3. `./js/jasper-reward-catalog-data.js`
4. `./app.js` from the root

`jasper-game-currency-bridge.js` belongs in game pages / game injection, not the main index page.
