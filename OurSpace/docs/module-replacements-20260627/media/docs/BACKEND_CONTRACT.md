# Backend contract

The JavaScript module sends JSON payloads to the supplied Google Apps Script URL.

## `saveMediaLibrary`

Request payload:

```json
{
  "app": "OurSpace",
  "module": "media-player",
  "action": "saveMediaLibrary",
  "payload": {
    "schemaVersion": 1,
    "folders": [],
    "playlists": [],
    "tracks": [],
    "playback": {}
  }
}
```

Expected response:

```json
{ "ok": true, "library": {} }
```

## `listMediaLibrary`

GET request with `action=listMediaLibrary`. If `callback` is supplied, return JSONP:

```js
callbackName({ ok: true, library: { folders: [], playlists: [], tracks: [] } });
```

## `uploadTrack`

Small files are sent as a base64 data URL. Large files send metadata only, because Apps Script and browser memory can struggle with large base64 payloads.

Request payload:

```json
{
  "action": "uploadTrack",
  "payload": {
    "track": { "id": "track-id", "title": "Song", "size": 123 },
    "binaryIncluded": true,
    "file": {
      "name": "song.mp3",
      "type": "audio/mpeg",
      "size": 123,
      "dataUrl": "data:audio/mpeg;base64,..."
    }
  }
}
```

Expected response:

```json
{
  "ok": true,
  "track": {
    "id": "track-id",
    "remoteUrl": "https://...",
    "downloadUrl": "https://..."
  }
}
```

## CORS / Apps Script note

The module uses a normal POST first. If browser CORS blocks the readable response, it retries with `mode: "no-cors"` so writes can still be sent as opaque requests. Reads use JSONP for Apps Script compatibility.
