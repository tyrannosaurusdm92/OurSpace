SquishyRewards Local Games Setup
================================

1. Put all game files here:
   C:\Users\Public\Documents\SquishyRewards\Games

2. Upload jasper-game-currency-bridge.local-launcher.js to your GitHub repository.

3. Include it from your index.html, ideally before </body>:
   <script src="js/jasper-game-currency-bridge.local-launcher.js"></script>

4. On the computer that has the games, double-click:
   Start SquishyRewards Localhost.bat

5. Open:
   https://tyrannosaurusdm92.github.io/SquishyRewards/index.html

Default game URLs use:
   http://127.0.0.1:8787/Games/fnaf.html

If your games are inside folders instead, use the launcher dropdown:
   game/index.html
or:
   game/

Timed game rewards are automatic. Jasper does not need to press a manual “played a game” button.

Game rewards are stored in the launcher ledger under:
   jasperCareCurrencyLedger.v1

and mirrored into the main SquishyRewards currency tracker under:
   jasper-squishy-care-cottage-v3

The browser cannot reliably open C:\ files directly from GitHub Pages, so localhost is used as the safe local bridge.
