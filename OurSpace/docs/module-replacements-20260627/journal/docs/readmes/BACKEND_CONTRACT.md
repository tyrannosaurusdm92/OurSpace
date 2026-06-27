# Backend Contract

The module uses the provided Google Apps Script endpoint:

```text
https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec
```

It sends `POST` requests with `Content-Type: text/plain;charset=utf-8` so Apps Script can read `e.postData.contents` without preflight complications.

## Save payload

```json
{
  "module": "ourspace_journal",
  "action": "journal_save",
  "profile": "william",
  "key": "journal:william",
  "data": {
    "version": 1,
    "profile": "william",
    "folders": [],
    "categories": [],
    "entries": []
  },
  "updatedAt": "2026-06-27T00:00:00.000Z",
  "source": "OurSpace Journaling Module"
}
```

## Load payload

```json
{
  "module": "ourspace_journal",
  "action": "journal_load",
  "profile": "william",
  "key": "journal:william",
  "data": null
}
```

## Expected load response

Any of these response shapes work:

```json
{ "ok": true, "state": { "version": 1, "entries": [] } }
```

```json
{ "ok": true, "data": { "version": 1, "entries": [] } }
```

```json
{ "version": 1, "entries": [] }
```

The frontend always keeps a local copy first, so backend failures do not erase entries.
