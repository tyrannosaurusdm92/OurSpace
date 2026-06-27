/* OurSpace Visual Player backend contract helper
   Add these ideas to your existing Google Apps Script web app if it does not
   already accept generic JSON POST actions. The front-end posts text/plain JSON
   to avoid browser preflight issues. */

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var packet = JSON.parse(raw);
    if (packet.module === 'visual-player') return handleOurSpaceVisualPlayer(packet);
    return jsonOut({ ok: true, ignored: true, module: packet.module || '' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) });
  }
}

function handleOurSpaceVisualPlayer(packet) {
  var props = PropertiesService.getScriptProperties();
  var key = 'ourspace.visual.' + (packet.profile || 'shared') + '.events';
  var existing = [];
  try { existing = JSON.parse(props.getProperty(key) || '[]'); } catch (err) { existing = []; }
  existing.push({
    action: packet.action,
    deviceId: packet.deviceId,
    sentAt: packet.sentAt,
    receivedAt: new Date().toISOString(),
    payload: packet.payload || {}
  });
  props.setProperty(key, JSON.stringify(existing.slice(-500)));
  return jsonOut({ ok: true, action: packet.action, count: existing.length });
}

function doGet(e) {
  var profile = e && e.parameter && e.parameter.profile || 'shared';
  var props = PropertiesService.getScriptProperties();
  var key = 'ourspace.visual.' + profile + '.events';
  var events = [];
  try { events = JSON.parse(props.getProperty(key) || '[]'); } catch (err) { events = []; }
  return jsonOut({ ok: true, profile: profile, events: events });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
