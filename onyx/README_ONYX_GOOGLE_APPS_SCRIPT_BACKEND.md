# Lord Onyx Blepman — Google Apps Script backend build

This package uses **Onyx as the sole personality** and routes live backend calls to deployed Google Apps Script `/exec` endpoints.

## Backend endpoints

Main backend:

```text
https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec
```

Onyx full backend:

```text
https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

## Run options

### Windows local proxy / safest desktop run

Double-click:

```text
START_ONYX_WINDOWS.bat
```

This opens the local UI at `http://127.0.0.1:7869`, calls the Onyx Apps Script backend first, and falls back to the local Onyx brain if Apps Script returns an error page, times out, or gives malformed JSON.

### Static GitHub Pages run

Use the root `index.html` plus the `static/` folder. That page is static-hosting friendly and calls the Onyx Google Apps Script backend directly. If the Apps Script deployment does not allow cross-origin browser reads, use the Windows local proxy instead.

## Expected safe JSON

Every backend action should return JSON like:

```json
{
  "ok": true,
  "action": "chat",
  "data": {
    "reply": "...",
    "mood": "caring",
    "moodImage": "/static/assets/onyx-moods/onyx_caring.png"
  }
}
```

Errors should still return JSON:

```json
{
  "ok": false,
  "action": "chat",
  "error": {"message": "Readable error"},
  "data": {}
}
```

The frontend and local proxy both tolerate legacy/direct shapes too, but safe JSON is the crash-resistant target.
