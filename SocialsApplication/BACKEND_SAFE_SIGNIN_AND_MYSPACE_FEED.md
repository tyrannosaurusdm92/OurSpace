# Backend-safe sign-in and retro feed update

This build changes only the browser-side Socials Application app. It preserves the deployed Google Apps Script backend contract.

## Backend URL

`https://script.google.com/macros/s/AKfycbzL5BoWZsDaTQGzLE-AvoubKyVsEanUGNSwrNyKP7wEw3pK4-2KOw2LVfKejtwyNnvK/exec`

## Backend actions still used

- `login`
- `register`
- `logout`
- `heartbeat`
- `state`
- `profile`
- `post`
- `comment`
- `reaction`
- existing message, story, room, event, and export actions

No new backend endpoints are required.

## Sign-in changes

The app now opens to a full-page sign-in gate based on the attached `Socials Application.html` structure. The app shell, tabs, feed, messenger, rooms, games, docs, and events remain hidden until sign-in succeeds. The password field uses normal `autocomplete="current-password"` and has a show/hide button so browser password managers can save and autofill credentials.

The "Sign In / Create Account" button first attempts the existing `login` action. If the backend says the user was not found, it uses the existing `register` action. The backend still owns real authentication.

The forgot-password panel does not call a fake endpoint. The current backend does not expose a password reset action, so the panel explains that resetting must happen through the backend data owner or by creating a new account if the small-circle limit allows it.

## Retro MySpace-style feed

The Feed tab is now split into two parts:

1. Profile/editor column
2. Facebook-style friend feed column

Users can paste MySpace-style layout CSS/HTML. The profile preview renders inside a sandboxed iframe so custom layout code cannot break the rest of the site. Script tags, inline event handlers, `javascript:` URLs, iframe/object/embed tags, and `data:text/html` are stripped before preview/public display.

## How profile layouts sync without backend changes

The backend profile schema only stores name, status, and color. To avoid changing the backend, profile layout/design data is published as a hidden feed post with the marker:

`[[SOCIALS_PROFILE_LAYOUT_V1]]`

The frontend reads the latest marker post per author, hides those marker posts from the visible timeline, and uses them to render each person's profile when their name is clicked.

## Backend text-size protection

The existing backend stores post text with a 4000-character limit. The frontend keeps the full profile layout code in the browser for local editing and trims only the backend-shared profile marker if a pasted layout is too large for the current backend field.
