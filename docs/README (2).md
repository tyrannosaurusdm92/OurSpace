# OurSpace Messenger Plug-in for DBT Chat Pages

This version is corrected to attach to the existing **Chat Bot with DBT Skills** page/section inside these files:

- `dino-nerdzone.html`
- `squishy-cottage.html`

It no longer depends on a separate messenger HTML page. The plug-in loads itself into the matching DBT chat-bot section and keeps all active messenger features in the single embedded module.

## Folder placement

Put this folder beside the two site files:

```text
site-root/
  dino-nerdzone.html
  squishy-cottage.html
  
    css/
    js/
    vendor/
    docs/
    snippets/
    tools/
```

## One-line install

Add this line before `</body>` in both `dino-nerdzone.html` and `squishy-cottage.html`:

```html
<script src="js/ourspace-dbt-chat-attach.js" defer></script>
```

The attach script automatically:

- runs only on `dino-nerdzone.html` and `squishy-cottage.html` by default;
- finds the page/section titled `Chat Bot with DBT Skills`;
- creates the messenger mount inside that existing section;
- loads the scoped CSS, backend bridge, main messenger JS, and bundled face-filter files;
- uses separate local storage keys for the Dino and Squishy pages so their DBT chat data does not overwrite each other;
- avoids restyling the whole site by keeping CSS scoped to the messenger module.

## Optional Windows helper

After placing the folder beside both HTML files, run this from the site root:

```bat
python ourspace_messenger_plugin\tools\apply_plugin_to_html.py
```

That helper inserts the same one-line script into both target files if it is not already present.

## Custom configuration

Add this before the attach script only if you need to override defaults:

```html
<script>
window.OurSpaceDBTChatPluginConfig = {
  titleText: 'Chat Bot with DBT Skills',
  replaceExistingPlaceholder: true,
  messenger: {
    defaultChannel: 'dbt-skills'
  }
};
</script>
<script src="js/ourspace-dbt-chat-attach.js" defer></script>
```

`replaceExistingPlaceholder: true` hides obvious placeholder/filler elements inside the DBT chat section before mounting the messenger.

## Included features

- Mobile-first, desktop-second responsive messenger layout.
- Auto dark-mode with light-mode support through `prefers-color-scheme`.
- Channel creation and direct-message thread creation.
- Main chat with message bubbles, reply helper, local export, and local-first saving.
- Image, GIF, video, audio, link, JSON, ZIP, text, document, and generic file attachments.
- Voice message recording with Web Audio effects.
- Voice effects for recordings and call microphone streams: normal, warm, robot, chipmunk, deep, echo, and monster.
- Browser speech-to-text using `SpeechRecognition` / `webkitSpeechRecognition` when available.
- Sticker creation from typed text or existing conversation messages.
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
  "clientId": "osm_dino_ab12cd",
  "createdAt": "2026-06-15T00:00:00.000Z",
  "data": {
    "id": "msg_...",
    "channelId": "dbt-skills",
    "authorId": "dino",
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

## Pathing policy

The ZIP uses short, Windows-safe names. No absolute paths, drive letters, `node_modules`, generated build folders, or unused legacy app folders are included.
