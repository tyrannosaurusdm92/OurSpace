# Social Application Shared Google Apps Script Backend

This build includes `google_apps_script/social_application_backend.gs`, embeds the deployed `/exec` URL into the frontend, and includes a copyable standalone Apps Script file beside the final zip.

## What the Apps Script backend does

- Login/register with salted password hashes.
- Google Password Manager friendly sign-in on the site through normal `username` and `current-password` fields.
- One backend deployment shared by every project through a per-site `projectId`.
- Enforces a 10 active-person cap per project to reduce exposure, quota use, and browser overload.
- Stores feed posts, comments, reactions, channels, stories, events, Messenger Plug-in envelopes, presence, room participants, and WebRTC signaling data.
- Stores uploaded media/files in Google Drive when they are too large for a sheet cell.
- Provides polling endpoints for calls/video chat signaling because Apps Script cannot provide WebSockets or server-sent events.

## What stays in the browser

Apps Script cannot be a WebRTC media server. Camera, filters, microphone, screen share, screen recording, local recording export, and live call media are handled by the browser. Apps Script stores session/signaling/file/event data that lets those browser features coordinate across users.

## Deploy steps

1. Go to Google Apps Script and create a new project.
2. Paste the full contents of `social_application_backend.gs` into `Code.gs`.
3. Save.
4. Run `setup()` once and approve permissions for Sheets/Drive.
5. Deploy → New deployment → Web app.
6. Use:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
7. Copy the `/exec` URL.
8. This build already embeds your deployed `/exec` URL in `app/social-backend-config.js`. Use **Backend connected** only if you need to replace it or type `LOCAL` for offline testing in one browser.
9. Register the first user. The first user becomes `admin`; projects are limited to 10 registered users and 10 active users.

## App icon behavior

The frontend creates a project-specific PWA manifest at runtime. Click **Install app icon**, name the current project, then use the browser's install/add-to-home-screen prompt.

## Privacy note

Large files are saved to Drive. This script uses link-viewable Drive URLs for large media so browsers can display them in chats/posts/stories. Keep this for trusted small groups only, or switch `PUBLIC_DRIVE_FILE_LINKS` to `false` and handle private file retrieval separately.
