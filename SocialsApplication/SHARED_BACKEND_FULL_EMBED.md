# Shared Backend Full Embed

This build has the deployed Google Apps Script backend embedded into the site through `app/social-backend-config.js`:

```text
https://script.google.com/macros/s/AKfycbzL5BoWZsDaTQGzLE-AvoubKyVsEanUGNSwrNyKP7wEw3pK4-2KOw2LVfKejtwyNnvK/exec
```

Deployment ID:

```text
AKfycbzL5BoWZsDaTQGzLE-AvoubKyVsEanUGNSwrNyKP7wEw3pK4-2KOw2LVfKejtwyNnvK
```

## How every project can share the same backend

Every request includes a `projectId` and `projectName`. If a future project does not explicitly set them, the bridge derives a project ID from that site's host, path, and title. This lets multiple unrelated projects use the same Apps Script deployment while keeping their data separated in the same backing spreadsheet.

Future project pages can override the automatic project identity before loading `social-shared-backend.js`:

```html
<script>
  window.SOCIAL_APPLICATION_PROJECT_ID = 'belavados-campaign-site';
  window.SOCIAL_APPLICATION_PROJECT_NAME = 'Belavadös Campaign Site';
</script>
<script src="social-backend-config.js"></script>
<script src="social-shared-backend.js"></script>
```

## Built-in backend bridge

`app/social-shared-backend.js` is now a reusable mini-SDK. It exposes:

- `SocialSharedBackend.login()` / `register()` / `logout()`
- `SocialSharedBackend.request(action, payload)`
- `SocialSharedBackend.api('/api/post', options)`
- `SocialSharedBackend.startStatePolling()`
- `SocialSharedBackend.startRoomPolling()`
- `SocialSharedBackend.startHeartbeat()`
- `SocialSharedBackend.ensureSession()`
- `SocialSharedBackend.promptInstall()`

It also installs a safe fetch bridge for known local API routes. That means a future project can include only one feature, such as the messenger, events/calendar, rooms, or feed, and calls to known `/api/...` endpoints will still route to the shared Apps Script backend.

## Feature coverage

| Feature | Shared backend behavior |
|---|---|
| Login/register | Stored by project with salted password hashes |
| Google Password Manager | Normal username/current-password fields are used |
| Presence | Session heartbeat + 10 active-person project cap |
| Feed | Posts, comments, media, and reactions |
| Channels | Channel messages, media, reactions, import/export data |
| Camera & Stories | Stories and feed posts sync to backend; camera/filter processing stays in browser |
| Files/images/audio | Data URLs saved to Sheets when small; large media saved to Drive by the Apps Script backend |
| Messenger Plug-in | Footer tabs, friends panel, message envelopes, typing/presence, call signaling history |
| Rooms/calls/video | Apps Script stores room membership and WebRTC signaling; browser handles live media |
| Screen recording | Browser records/export locally; metadata/chat/transcripts remain available through the room tools |
| Events/calendar | Events create/delete/list through the shared backend |
| Games | Presence pulls live users; saved sessions also log into the backend `game-sessions` channel |
| PWA app icon | Runtime manifest uses the current project name so each hosted project can install separately |

## Important limitation

Google Apps Script is request/response based. It is not a WebSocket, TURN, or SFU media server. Calls, video, camera, filters, screen sharing, recording, and audio capture happen in the browser. The Apps Script backend stores identity, permissions, presence, files, events, messages, room participants, and WebRTC signaling mailboxes.

