# Integration

## Home page full module

Copy these files into your site asset folders:

- `css/ourspace-visual-player.css`
- `js/ourspace-visual-player.js`

Then paste the contents of `home-visual-module.html` where the visual player should appear on Home.

```html
<link rel="stylesheet" href="css/ourspace-visual-player.css">
<section data-ourspace-visual-player data-profile="shared"></section>
<script src="js/ourspace-visual-player.js" defer></script>
```

Change `data-profile="shared"` to `william`, `jasper`, or another account/profile name if you want separate libraries.

## Compact bridge on other pages

For pages that do not show the full module but may need to pause visual playback when a game loads, paste `global-visual-bridge-snippet.html` before `</body>`.

The visual API becomes available as:

```js
window.OurSpaceVisualPlayer.play();
window.OurSpaceVisualPlayer.pause();
window.OurSpaceVisualPlayer.stop();
window.OurSpaceVisualPlayer.next();
window.OurSpaceVisualPlayer.previous();
```

## Game pause hook

The module automatically pauses video playback if common game elements appear, such as `[data-ourspace-game]`, `[data-game-loaded="true"]`, game iframes, or game canvases.

You can also manually dispatch:

```js
window.dispatchEvent(new CustomEvent('ourspace:game-loaded'));
```

## Pages

Recommended places to include the full visual player:

- Home gallery/player module.
- Store preview gallery if you want downloadable image/video assets.
- Sync page if you want a visible sync/testing surface.

Recommended places to include only the bridge:

- Daily
- Calendar
- DBT / ADHD
- Games
