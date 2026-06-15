# OurSpace Games Only Currency Bridge

This package contains the 23 bundled HTML games, the game reward override, the play-to-win adapter, and the private in-site currency ledger code.

## Open

Start with `index.html`.

## Included runtime pieces

- `games/` — 23 bundled games.
- `js/ourspace-game-reward-override.js` — iframe/game-side detector and reward sender.
- `js/ourspace-play-to-win-adapter.js` — private currency adapter for game reward calls.
- `js/ourspace-currency-core.js` — parent-side ledger and iframe reward listener.
- `js/currency.js` and `js/portal-storage.js` — profile currency helpers and local browser storage.
- `json/ourspace_game_reward_rules.json` — reward rules and per-game overrides.
- `json/ourspace_allowed_game_ids.json` — allowlist of the 23 bundled games.
- `data/currency-system.json` — currency conversion and reward scale.

## Currency scale

- 10 copper = 1 silver
- 10 silver = 1 gold
- 10 gold = 1 platinum

The currency is private in-site currency only. It does not include wallets, withdrawals, cashouts, crypto, NFTs, or real-money payout behavior.
