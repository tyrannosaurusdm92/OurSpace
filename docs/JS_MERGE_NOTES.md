# Squishy + Support JS merge notes

Updated: 2026-06-12

## Structure

- `app.js` stays at the site root.
- Merged Support/Squishy support files live in `/js/`.
- The old temporary source folders `js (support)` and `js (squishy)` were removed from this cleaned package.

## `/js/` files

- `support-personality-data.js` — preferred merged data file. This keeps Squishy Helper Support's newer personality voice and relationship details, plus the richer DBT/ADHD/attachment support catalog and 22-game list.
- `support-support-rulebot-data.js` — compatibility shim for older Support files. It points older code at the merged data rather than overwriting it.
- `support-support-rulebot.js` — legacy Support rulebot engine kept for reference/future standalone use.
- `jasper-reward-catalog-data.js` — Support reward catalog data.
- `support-rewards-games.js` — optional legacy reward helper updated to recognize current Squishy chat IDs/data attributes. It is kept in `/js/` but not loaded by default to avoid duplicate reward listeners with `app.js`.
- `jasper-game-currency-bridge.js` — stronger Support game bridge. It rewards in-game actions, score/coin/star/gold/XP changes, wins/levels/waves, and FNAF survival actions. It does not reward passive time logging.

## HTML load order

`index.html` now loads:

1. `./js/support-personality-data.js`
2. `./js/support-support-rulebot-data.js`
3. `./js/jasper-reward-catalog-data.js`
4. `./app.js` from the root

`jasper-game-currency-bridge.js` belongs in game pages / game injection, not the main index page.
