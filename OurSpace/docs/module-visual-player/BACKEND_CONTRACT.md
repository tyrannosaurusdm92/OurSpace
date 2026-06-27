# Backend Contract

The module posts JSON to:

`https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec`

The body is sent as `text/plain;charset=utf-8` so Google Apps Script can receive it without requiring a CORS preflight.

## Envelope

```json
{
  "app": "OurSpace",
  "module": "visual-player",
  "action": "upsertAsset",
  "profile": "shared",
  "deviceId": "device-...",
  "sentAt": "2026-06-27T00:00:00.000Z",
  "payload": {}
}
```

## Actions

- `upsertFolder`
- `upsertPlaylist`
- `upsertAsset`
- `deleteAssets`
- `updateSettings`

## Large file handling

Apps Script is not a good direct transport for large videos unless you add chunking or Google Drive upload support. This module therefore:

1. Stores all uploaded files locally in IndexedDB.
2. Syncs metadata, thumbnails, folders, playlists, and settings to the backend queue.
3. Inlines small files up to 2 MB as a data URL.
4. Leaves large video bytes local until your backend supports Drive/chunk handling.

See `backend/google-apps-script-visual-contract.gs` for a minimal event-log implementation.
