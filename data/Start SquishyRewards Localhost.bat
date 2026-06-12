@echo off
title SquishyRewards Local Game Server
cd /d "C:\Users\Public\Documents\SquishyRewards"
echo Starting SquishyRewards local game server...
echo.
echo Keep this window open while Jasper plays.
echo.
echo Local games URL:
echo http://127.0.0.1:8787/Games/
echo.
echo GitHub launcher:
echo https://tyrannosaurusdm92.github.io/SquishyRewards/index.html
echo.
py -3 -m http.server 8787 --bind 127.0.0.1
pause
