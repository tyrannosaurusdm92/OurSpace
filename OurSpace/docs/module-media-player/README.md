# OurSpace Media Player Module

A drop-in, vanilla JavaScript media player module for the OurSpace site.

It supports:

- audio upload with multiple files
- folder upload where browsers support `webkitdirectory`
- folder creation
- playlist creation
- play, pause, stop, previous, next
- shuffle
- rewind 5 seconds
- fast forward 5 seconds
- current-track download
- selected-library metadata download
- local IndexedDB storage for uploaded audio
- optional metadata/file sync to the supplied Google Apps Script backend
- a mini-player on pages where the full Home module is not mounted
- game auto-pause hooks for the Games page

## Files to install

Copy these into your site:

```text
css/ourspace-media-player.css
js/ourspace-media-player.js
home-media-module.html
```

Optional but useful:

```text
global-bridge-snippet.html
backend/google-apps-script-media-contract.gs
docs/*
```

## Fast install

On the Home page, add the contents of `home-media-module.html` where the media module should appear.

On Daily, Calendar, DBT / ADHD, Games, Store, and Sync pages, include the stylesheet and script from `global-bridge-snippet.html` even when the full module is not shown. This lets the page show a mini-player and lets the player restore the current track/time.

If your site is a single HTML app with page tabs, include the JS/CSS once in the shared shell and keep the Home module section in the Home page panel. Audio will continue while switching tabs because the page is not reloaded.

If your site uses separate HTML files and does full page navigation, browsers do not allow truly gapless playback through a page unload. This module saves track/time/volume and restores them on the next page with a mini-player so the user can resume quickly.
