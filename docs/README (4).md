# OurSpace Two-Profile Login

This revision restyles the sign-in page after the attached luxury landing-page layout while using the whimsical seascape background URL and matching palette accents.

## Profiles

- Jasper: Squishy Cottage
- William: Dino Nerdzone

Each profile page checks the stored session before staying open.

## Store

Each profile page uses its own profile-based store name: Squishy Store for Jasper and Dino Store for William.

## Backend

The Google Apps Script backend remains in `backend/google-apps-script/Code.gs`. Cart and receipt purchase submission still uses the `recordPurchase` action.

## Password fields

Browser password saving remains enabled through normal `autocomplete` fields and the Credential Management bridge. Password fields include Show/Hide buttons.

## Background image

The sign-in page uses:

`https://wallpapers.com/images/high/whimsical-seascape-with-smiling-tree-at-twilight-g0u5e1g3tzskk7bp.webp`

## Files changed in this revision

- `index.html`
- `dino-nerdzone.html`
- `squishy-cottage.html`
- `assets/css/ourspace-auth.css`
- `assets/css/ourspace-store.css`
- `assets/js/ourspace-store.js`
- `assets/js/config.js`

## Fonts

The CSS keeps the requested font assignments and local paths. Font binaries are not bundled in this returned zip; place Magic School and Morris Roman local font files in `assets/fonts/` using the filenames listed there.

## Latest font and login changes

- Landing page title is 25% smaller.
- Landing/page titles use Magic School.
- Subtitles use Morris Roman.
- Typing, buttons, labels, fields, and other text use Comic Sans.
- White/cream text has a thick black outline and subtle reflective shadow.
- Login background is set to contain so the whole image is visible.
- Store titles are profile-based.
