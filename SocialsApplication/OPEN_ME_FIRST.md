# Open the Socials Application

Use this GitHub Pages URL after uploading this package to the `LifeHelpers` repository:

```text
https://tyrannosaurusdm92.github.io/LifeHelpers/SocialsApplication/app/index.html
```

The root `index.html` in this package redirects to the app, so this shorter URL should also work after deployment:

```text
https://tyrannosaurusdm92.github.io/LifeHelpers/
```

Fixes included in this patched package:

- Root `index.html` redirect added.
- `SocialsApplication/index.html` redirect added.
- PWA manifest `start_url` changed from `/` to `./index.html` so an installed app icon opens this app instead of the domain root.
- Games manifest loading changed from `/games_manifest.json` to `games_manifest.json` so it works from the app folder on GitHub Pages.
