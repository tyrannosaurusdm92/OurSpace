# Source audit and merge decisions

The uploaded projects were inspected and treated as references. The final module is newly written vanilla HTML/CSS/JS and does not copy framework source files into the app.

## react-music-player-and-uploader-main.zip

- Status: not directly used.
- Reason: the React app was mostly default Create React App scaffold in the inspected `src` folder.
- Kept idea: simple upload/player goal.
- Not copied: React scaffold, logo assets, yarn lock, tests.

## nebula_records-main.zip

- Status: referenced for popup/preview-player behavior and static-site friendliness.
- Kept idea: a small persistent bottom player with current track metadata.
- Not copied: branding, catalogue pages, Supabase files, release assets, artist assets, cookie consent files.

## music-uploader-master.zip

- Status: not directly used.
- Reason: it is a Python conversion/uploader toolkit, not a browser module for OurSpace.
- Kept idea: filename normalization and the importance of metadata organization.
- Not copied: Python CLI, conversion tools, ffmpeg wrappers, database utilities.

## React-GraphQL-Songs-master.zip

- Status: not directly used.
- Reason: Django/GraphQL/React stack would add a separate backend and framework dependency that does not match the current OurSpace HTML/Apps Script setup.
- Kept idea: track records as structured metadata.
- Not copied: Django app, GraphQL schema, Apollo client, Docker files.

## Made-Infinite-main.zip

- Status: referenced for player control behavior.
- Kept ideas: fixed player, shuffle mode, stop, next/previous, seek, volume, download behavior, upload progress concept.
- Not copied: React/MUI/Framer code, Node server, Google Cloud/Cloudinary setup, stem separation, deployment files.

## Viberr-Music-Player-master.zip

- Status: referenced for library organization.
- Kept idea: album/song listing and per-song audio controls as a concept.
- Not copied: Django project, SQLite database, templates, bundled media files.

## Final architecture decision

The final module uses:

- vanilla JS for compatibility with the current site
- IndexedDB for uploaded audio blobs
- localStorage for fast current-playback restore
- optional Apps Script sync using the supplied backend URL
- no external package manager
- no CDN dependency
- no iframe requirement
