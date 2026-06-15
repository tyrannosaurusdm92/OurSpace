# OurSpace Messenger Plug-in

A clean, mobile-first messenger plug-in that combines channel chat, direct messages, media sending, browser calling, video calling, voice effects, speech-to-text, sticker creation, configurable chat backgrounds, and face-filter camera tools into one unified interface.

## Install

Copy the whole `ourspace_messenger_plugin` folder into the site, then add this to the page where the messenger should appear:

```html
<link rel="stylesheet" href="ourspace_messenger_plugin/css/ourspace-messenger.css">
<div id="ourspace-messenger-root"></div>
<script src="ourspace_messenger_plugin/vendor/jeeliz/jeelizFaceFilter.js" defer></script>
<script src="ourspace_messenger_plugin/js/ourspace-backend-bridge.js" defer></script>
<script src="ourspace_messenger_plugin/js/ourspace-messenger.js" defer></script>
<script>
window.addEventListener('DOMContentLoaded', function () {
  window.OurSpaceMessenger.init({
    mount: '#ourspace-messenger-root',
    appName: 'OurSpace Messenger',
    mainBackendUrl: 'https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec',
    onyxAlertsBackendUrl: 'https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec',
    faceModelPath: 'ourspace_messenger_plugin/vendor/jeeliz/NN_VERYLIGHT_1.json',
    users: [
      { id: 'william', label: 'William', avatar: '🦖' },
      { id: 'jasper', label: 'Jasper', avatar: '🌙' },
      { id: 'onyx', label: 'Onyx Alerts', avatar: '🐈‍⬛', system: true }
    ],
    defaultChannel: 'home'
  });
});
</script>
```

The included `index.html` is a working demo page using the same configuration.

## Included features

- Mobile-first, desktop-second responsive layout.
- Auto dark-mode with light-mode support through `prefers-color-scheme`.
- Channel creation and direct-message thread creation.
- Main chat with message bubbles, reply helper, local export, and local-first saving.
- Image, GIF, video, audio, link, JSON, ZIP, text, document, and generic file attachments.
- GIF support through file upload, pasted GIF links, or direct GIF URLs.
- Voice message recording with Web Audio effects.
- Voice effects for recordings and call microphone streams: normal, warm, robot, chipmunk, deep, echo, and monster.
- Browser speech-to-text using `SpeechRecognition` / `webkitSpeechRecognition` when available.
- Sticker creation from typed text or existing conversation messages.
- Sticker tray and one-tap sticker sending.
- Audio and video call panel using WebRTC, STUN, local/remote video panes, mute, video toggle, and signal-copy fallback.
- Backend bridge for messages, channels, call signals, and Onyx alerts.
- Chat background image picker with opacity control.
- Face-filter camera studio with bundled Jeeliz runtime/model and canvas fallback filters.
- Local-first offline queue that retries backend sends.

## Backend expectations

The plug-in posts JSON envelopes to the configured Google Apps Script endpoints. It also retries as `FormData` for scripts that expect form posts.

Typical envelope:

```json
{
  "action": "message.create",
  "source": "ourspace_messenger_plugin",
  "clientId": "osm_william_ab12cd",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "data": {
    "id": "msg_...",
    "channelId": "home",
    "authorId": "william",
    "kind": "message",
    "text": "hello",
    "attachments": [],
    "links": []
  }
}
```

Supported actions sent by the plug-in:

- `message.create`
- `message.list`
- `channel.create`
- `call.signal`
- `call.signal.list`
- `onyx.alert`

If the backend does not answer because of CORS, auth, or script-contract differences, the plug-in still saves locally and queues writes.

## Browser notes

Camera, microphone, WebRTC, and speech recognition require a modern browser. Most browsers require HTTPS or localhost for camera/microphone access. Jeeliz face tracking works best when served over HTTP/HTTPS because the model JSON must be fetchable; the canvas fallback still works from a local file preview.

## Folder policy

No full legacy app folders are bundled. Only active plug-in files and the minimal Jeeliz runtime/model used by the face-filter feature are included. Source-app decisions, manifests, audits, and licenses are in `docs/`.
