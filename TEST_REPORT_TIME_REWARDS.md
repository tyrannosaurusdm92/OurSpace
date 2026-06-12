# SquishyRewards Test Report

Generated from automated static/package tests in the sandbox. Browser-network testing against localhost was blocked by this sandbox environment, so the checks below verify syntax, references, packaging, and reward logic directly from source files.

- ✅ **JavaScript syntax: app.js**
- ✅ **JavaScript syntax: js/jasper-game-currency-bridge.local-launcher.js**
- ✅ **JavaScript syntax: js/onyx-personality-data.js**
- ✅ **JSON parse: data/bot-data.json**
- ✅ **JSON parse: data/dbt/dbt_combined_catalog.json**
- ✅ **JSON parse: data/dbt/dbt_skills_catalog.json**
- ✅ **JSON parse: data/dbt/dbt_worksheets_catalog.json**
- ✅ **JSON parse: data/mobile_friendly_manifest.json**
- ✅ **JSON parse: data/onyx_mood_manifest.json**
- ✅ **JSON parse: data/onyx_personality_reference.json**
- ✅ **JSON parse: data/source-merge-report.json**
- ✅ **index.html local asset references exist**
  - 8 references checked
- ✅ **index.html loads launcher from js/ folder**
- ✅ **index.html loads stylesheet from data/ folder**
- ✅ **index.html loads manifest from data/ folder**
- ✅ **Mobile Games has launcher mount**
- ✅ **Old manual mini-game reward button removed**
- ✅ **Old gameSelect removed**
- ✅ **Old gameFrame removed**
- ✅ **app.js listens for local timed game reward event**
- ✅ **app.js bindGames no longer uses old lowercase games path**
- ✅ **app.js still handles postMessage game rewards**
- ✅ **Launcher contains exact expected game list**
  - found=['theyarecoming', 'tinyfishing', 'zombierush', 'fnaf4', 'fnaf3', 'fnaf2', 'fnaf', 'minesweeper', 'noobminer', 'tabletennisworldtour', 'badicecream3', 'candycrush', 'capybaraclicker', 'flappybird']
- ✅ **Included test game exists in uploaded zip: Games/theyarecoming.html**
- ✅ **Included test game exists in uploaded zip: Games/tinyfishing.html**
- ✅ **Included test game exists in uploaded zip: Games/zombierush.html**
- ✅ **Included test game exists in uploaded zip: Games/fnaf4.html**
- ✅ **Included test game exists in uploaded zip: Games/fnaf3.html**
- ✅ **Included test game exists in uploaded zip: Games/fnaf2.html**
- ✅ **Included test game exists in uploaded zip: Games/fnaf.html**
- ✅ **Included test game exists in uploaded zip: Games/minesweeper.html**
- ✅ **Included test game exists in uploaded zip: Games/noobminer.html**
- ✅ **Included test game exists in uploaded zip: Games/tabletennisworldtour.html**
- ✅ **Included test game exists in uploaded zip: Games/badicecream3.html**
- ✅ **Included test game exists in uploaded zip: Games/candycrush.html**
- ✅ **Included test game exists in uploaded zip: Games/capybaraclicker.html**
- ✅ **Included test game exists in uploaded zip: Games/flappybird.html**
- ✅ **Launcher default points to localhost Games folder**
- ✅ **Launcher mirrors rewards into main site currency via CustomEvent**
- ✅ **No manual/non-time game reward trigger: Claim 5-min decompress**
- ✅ **No manual/non-time game reward trigger: manualClaim**
- ✅ **No manual/non-time game reward trigger: Mobile game interaction milestone**
- ✅ **No manual/non-time game reward trigger: Opened local Games folder index**
- ✅ **No manual/non-time game reward trigger: Checked local game server**
- ✅ **No manual/non-time game reward trigger: Stopped game while still regulated**
- ✅ **No manual/non-time game reward trigger: Launched ${game.title}**
- ✅ **Minute playtime reward is present**
- ✅ **Five-minute playtime bonus is present**
- ✅ **Tab fallback does not earn timed rewards**
- ✅ **Stop button does not award currency**
- ✅ **GitHub package without Games has no file above 13,212 KB**
  - []
- ✅ **Root .nojekyll exists**

## Important runtime note
Timed rewards count while the game is launched inside the SquishyRewards page iframe. The tab fallback opens the game but intentionally does not earn timed play currency, because a separate tab cannot be reliably measured from the GitHub page.
