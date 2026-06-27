/**
 * Optional OurSpace Media Player backend adapter contract.
 * Use only if the current Apps Script backend does not already support these actions.
 * The frontend is already pointed at:
 * https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec
 *
 * Expected actions:
 * - saveMediaLibrary: stores folders/playlists/track metadata/playback state.
 * - listMediaLibrary: returns stored metadata, JSONP-compatible if callback is supplied.
 * - uploadTrack: stores metadata and, optionally, a small base64 dataUrl file.
 *
 * Recommended: store actual large audio files in Drive and store Drive file URLs in track.remoteUrl/downloadUrl.
 */

const OURSPACE_MEDIA_PROP_KEY = 'OURSPACE_MEDIA_LIBRARY_V1';
const OURSPACE_MEDIA_FOLDER_NAME = 'OurSpace Media Uploads';

function doGet(e) {
  const action = String(e.parameter.action || 'listMediaLibrary');
  const callback = String(e.parameter.callback || '');
  let result = { ok: true };
  try {
    if (action === 'listMediaLibrary') result.library = getOurSpaceMediaLibrary_();
    else result = { ok: false, error: 'Unknown media action: ' + action };
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  return outputOurSpaceMedia_(result, callback);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData && e.postData.contents || '{}');
  } catch (err) {
    body = {};
  }
  const action = body.action || '';
  const payload = body.payload || {};
  let result = { ok: true };
  try {
    if (action === 'saveMediaLibrary') {
      saveOurSpaceMediaLibrary_(payload);
      result.library = getOurSpaceMediaLibrary_();
    } else if (action === 'uploadTrack') {
      result.track = saveOurSpaceMediaTrack_(payload);
    } else {
      result = { ok: false, error: 'Unknown media action: ' + action };
    }
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  return outputOurSpaceMedia_(result, '');
}

function getOurSpaceMediaLibrary_() {
  const raw = PropertiesService.getScriptProperties().getProperty(OURSPACE_MEDIA_PROP_KEY);
  if (!raw) return { schemaVersion: 1, folders: [], playlists: [], tracks: [], playback: null, updatedAt: 0 };
  return JSON.parse(raw);
}

function saveOurSpaceMediaLibrary_(library) {
  const safe = {
    schemaVersion: 1,
    folders: Array.isArray(library.folders) ? library.folders : [],
    playlists: Array.isArray(library.playlists) ? library.playlists : [],
    tracks: Array.isArray(library.tracks) ? library.tracks : [],
    playback: library.playback || null,
    updatedAt: Date.now()
  };
  PropertiesService.getScriptProperties().setProperty(OURSPACE_MEDIA_PROP_KEY, JSON.stringify(safe));
}

function saveOurSpaceMediaTrack_(payload) {
  const library = getOurSpaceMediaLibrary_();
  const track = payload.track || {};
  const file = payload.file || null;
  if (file && file.dataUrl) {
    const folder = getOrCreateOurSpaceMediaFolder_();
    const match = String(file.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const bytes = Utilities.base64Decode(match[2]);
      const blob = Utilities.newBlob(bytes, mime, file.name || track.originalName || 'audio.mp3');
      const driveFile = folder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      track.backendId = driveFile.getId();
      track.remoteUrl = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(driveFile.getId());
      track.downloadUrl = track.remoteUrl;
    }
  }
  const tracks = Array.isArray(library.tracks) ? library.tracks : [];
  const existingIndex = tracks.findIndex(t => t.id === track.id);
  if (existingIndex >= 0) tracks[existingIndex] = Object.assign({}, tracks[existingIndex], track);
  else tracks.push(track);
  library.tracks = tracks;
  saveOurSpaceMediaLibrary_(library);
  return track;
}

function getOrCreateOurSpaceMediaFolder_() {
  const folders = DriveApp.getFoldersByName(OURSPACE_MEDIA_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(OURSPACE_MEDIA_FOLDER_NAME);
}

function outputOurSpaceMedia_(data, callback) {
  const json = JSON.stringify(data);
  const text = callback ? `${callback}(${json});` : json;
  const mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(text).setMimeType(mime);
}
