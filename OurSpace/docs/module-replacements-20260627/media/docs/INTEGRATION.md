# Integration notes

## Home page

Place this in the Home page content area:

```html
<section id="ourspace-media-module" class="osm-card" aria-label="OurSpace music and media player"></section>
<link rel="stylesheet" href="css/ourspace-media-player.css">
<script src="js/ourspace-media-player.js" defer></script>
```

## Other pages

Daily, Calendar, DBT / ADHD, Games, Store, and Sync should include:

```html
<link rel="stylesheet" href="css/ourspace-media-player.css">
<script src="js/ourspace-media-player.js" defer></script>
```

Do not add `#ourspace-media-module` on those pages unless you want the full player shown there. Without that element, the script creates only the compact mini-player when a track is selected.

## Games page auto-pause

The module automatically watches for likely game elements when the page name/body data says Games.

Best explicit hook:

```js
window.OurSpaceMedia?.gameLoaded?.('my-game-name');
```

Call that when your game iframe, canvas, or game engine is created. When leaving the game page or closing the game:

```js
window.OurSpaceMedia?.resumeAfterGame?.('my-game-name');
```

For markup-only games, add one of these:

```html
<canvas data-ourspace-game></canvas>
<iframe data-game src="..."></iframe>
```

## Backend URL

The frontend is already wired to the backend URL you gave:

```js
https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec
```

The module works local-first if the backend does not yet support media actions. Metadata sync is sent to the backend; small audio files are attempted as base64 uploads. Large files remain local unless the backend is expanded to receive Drive uploads.
