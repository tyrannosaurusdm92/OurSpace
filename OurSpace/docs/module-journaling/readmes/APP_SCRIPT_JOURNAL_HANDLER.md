# Optional Google Apps Script Journal Handler

Use this only if your existing Apps Script endpoint does not already handle `journal_save` and `journal_load`.

```javascript
function handleOurSpaceJournal_(payload) {
  var props = PropertiesService.getScriptProperties();
  var key = payload.key || ('journal:' + (payload.profile || 'shared'));

  if (payload.action === 'journal_save') {
    props.setProperty(key, JSON.stringify(payload.data || {}));
    return { ok: true, state: payload.data || null };
  }

  if (payload.action === 'journal_load') {
    var raw = props.getProperty(key);
    return { ok: true, state: raw ? JSON.parse(raw) : null };
  }

  return null;
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents || '{}');
  var journalResult = handleOurSpaceJournal_(payload);
  if (journalResult) {
    return ContentService
      .createTextOutput(JSON.stringify(journalResult))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

If your backend already has a main `doPost`, paste only `handleOurSpaceJournal_` and call it before the default/unknown action response.
