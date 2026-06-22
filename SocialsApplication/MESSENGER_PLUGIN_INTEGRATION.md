# Messenger Plug-in Integration

This build merges the Messenger Plug-in directly into the site as a native fixed footer messenger rather than a separate module page.

## What is included

- Facebook 2008-style bottom footer chat tabs and minimized dock windows.
- MySpaceIM-inspired friends list, moods, presence, stickers, GIF shortcuts, image/file sending, camera snapshots, voice notes, and call controls.
- Up-to-10-person WebRTC call signaling through the shared messenger envelope backend.
- Static/local fallback through BroadcastChannel and localStorage when no server is running.
- Shared backend endpoints in the existing Node server:
  - `GET /messenger-events` for server-sent messenger events.
  - `GET /api/messenger/history` for recent messenger envelopes.
  - `POST /api/messenger/envelope` for messages, presence, typing, rooms, and call signaling.

## Shared backend direction

This version does not require a separate backend per project. Other projects can use the same Messenger Plug-in files and point to the same shared messenger endpoints. A later central backend can add accounts, project IDs, long-term database storage, object/file storage, TURN, and an SFU such as LiveKit or Jitsi for more reliable large group video.

## Naming

Visible messenger UI uses the name **Messenger Plug-in**. No legacy project-name language is used in the messenger.
