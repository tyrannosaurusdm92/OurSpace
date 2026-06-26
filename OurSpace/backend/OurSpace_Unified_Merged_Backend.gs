/**
 * OurSpace Unified Backend — merged Apps Script Web App
 * -----------------------------------------------------
 * Generated from three provided backend files:
 *   1) OurSpace Link Share + Private Gift Backend
 *   2) OurSpace/Social compatibility backend
 *   3) OurSpace Site backend
 *
 * Canonical branding: OurSpace.
 * Canonical database: one Google Sheet created by site_ensureDatabase_().
 * Canonical upload folder: one Drive folder created by site_ensureUploadFolder_().
 *
 * Duplicate / near-duplicate feature resolution:
 * - Main OurSpace site auth, sessions, profiles, links, messenger, calls, media, PWA,
 *   purchases, currency, calendar, schedules, tasks, Onyx alerts, and generic records
 *   use the OurSpace Site backend implementation.
 * - Private gift/link-share features use the Link Share implementation, but its tables
 *   are stored in the same OurSpace database and its audit tab was renamed to
 *   LinkShareAuditLog to avoid clashing with the main site AuditLog.
 * - Older social-app compatibility actions are preserved in a compatibility namespace and
 *   use Compat_* sheet tabs inside the same database so older frontends can still call
 *   legacy actions without corrupting the OurSpace two-person site tables.
 *
 * Deployment:
 *   1. Paste this whole file into Apps Script as Code.gs.
 *   2. Run OURSPACE_CREATE_BACKEND_SPREADSHEET once.
 *   3. Optional/private link login: edit and run OURSPACE_SET_PASSCODES_ONCE once,
 *      then erase the plaintext passcodes from that function.
 *   4. Deploy as Web app: Execute as Me; access Anyone with the link.
 */

var OURSPACE_JSONP_CALLBACK = '';

var OURSPACE_MERGED_BACKEND = Object.freeze({
  appName: 'OurSpace Unified Backend',
  version: '2026-06-25.unified.backend',
  canonicalDatabaseProperty: 'OURSPACE_SITE_SPREADSHEET_ID',
  canonicalUploadFolderProperty: 'OURSPACE_SITE_UPLOAD_FOLDER_ID',
  publicProfiles: ['william', 'jasper'],
  colors: { cyan: '#00FFFF', orange: '#CA6309' }
});

var OURSPACE_LINK_SHARE_HEADERS = Object.freeze({
  PublicLinks: ['id', 'ownerKey', 'title', 'label', 'url', 'imageUrl', 'priceNote', 'public', 'sortOrder', 'notes', 'createdAt', 'updatedAt'],
  PurchaseRequests: ['requestId', 'shareId', 'itemId', 'itemTitle', 'itemUrl', 'buyerName', 'buyerEmail', 'buyerNote', 'status', 'createdAt', 'updatedAt'],
  PrivateAddresses: ['memberKey', 'displayName', 'addressJson', 'updatedAt'],
  LinkShareAuditLog: ['time', 'actorKey', 'action', 'detailJson']
});

var OURSPACE_SOCIAL_COMPAT_ACTIONS = Object.freeze([
  'manifest','iceConfig','ice_config','cloud_auth_sign_in','google_auth_sign_in','link_cloud_provider',
  'send_invite_email','deliver_temporary_password','email_temporary_password','create_account','sign_in',
  'request_password_reset','tell_dino_cant_login','update_password','register','state','onlineUsers',
  'heartbeat','presence','profile','post','comment','reaction','message','importHistory','story','exportData',
  'event','file','messengerEnvelope','messengerHistory','save_record','appRecord','list_records','appRecords',
  'save_media_asset','mediaAsset','camera_capture','save_voice_message','voiceMessage','save_video','videoAsset',
  'request_transcription','transcribe_media','save_transcript','update_transcript','save_face_profile','faceProfile',
  'list_face_profiles','match_face_descriptor','recognize_face','save_filter_preset','filterPreset','list_filter_presets',
  'create_call','callCreate','join_call','callJoin','leave_call','callLeave','end_call','callEnd','call_signal',
  'callSignal','poll_call','callPoll','roomJoin','roomHeartbeat','roomLeave','roomSignal','roomChat',
  'roomReaction','roomRaiseHand','roomPoll'
]);

var OURSPACE_LINK_SHARE_ACTIONS = Object.freeze([
  'publicLinks','share','publicPurchaseRequest','whoami','getPublicShareUrl','rotateShareId','savePrivateAddress',
  'getMyPrivateAddress','upsertPublicLink','deletePublicLink','listMyLinks','listPurchaseRequests',
  'updatePurchaseRequestStatus'
]);

function setup() {
  return OURSPACE_CREATE_BACKEND_SPREADSHEET();
}

function OURSPACE_CREATE_BACKEND_SPREADSHEET() {
  var site = site_setup_();
  var ss = site_ensureDatabase_();
  var folder = site_ensureUploadFolder_();
  PropertiesService.getScriptProperties().setProperty(OURSPACE_BACKEND.props.dbId, ss.getId());
  PropertiesService.getScriptProperties().setProperty(OURSPACE_SOCIAL_COMPAT.SPREADSHEET_PROPERTY, ss.getId());
  PropertiesService.getScriptProperties().setProperty(OURSPACE_SOCIAL_COMPAT.FILE_FOLDER_PROPERTY, folder.getId());
  var shareId = link_getOrCreateShareId_();
  ourspace_ensureUnifiedDatabaseAndLinkSheets_();
  social_setup();
  return {
    ok: true,
    app: OURSPACE_MERGED_BACKEND.appName,
    version: OURSPACE_MERGED_BACKEND.version,
    message: 'OurSpace unified backend ready.',
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    uploadFolderId: folder.getId(),
    uploadFolderUrl: folder.getUrl(),
    publicShareId: shareId,
    publicShareUrl: link_publicShareUrl_(),
    actionGroups: {
      site: site_availableActions_(),
      linkShare: OURSPACE_LINK_SHARE_ACTIONS,
      socialCompatibility: OURSPACE_SOCIAL_COMPAT_ACTIONS
    }
  };
}

function OURSPACE_SET_PASSCODES_ONCE() {
  return link_OURSPACE_SET_PASSCODES_ONCE();
}

function OURSPACE_ADD_DEMO_LINK_OPTIONAL() {
  ourspace_ensureUnifiedDatabaseAndLinkSheets_();
  return link_OURSPACE_ADD_DEMO_LINK_OPTIONAL();
}

function doGet(e) {
  var cb = String((e && e.parameter && (e.parameter.callback || e.parameter.jsonp)) || '');
  OURSPACE_JSONP_CALLBACK = cb.replace(/[^A-Za-z0-9_.$]/g, '');
  return ourspace_dispatchGet_(e);
}

function doPost(e) {
  return ourspace_dispatchPost_(e);
}

function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function ourspace_dispatchGet_(e) {
  var action = ourspace_actionFromEvent_(e);
  if (action === 'setup') return site_jsonResponse_(OURSPACE_CREATE_BACKEND_SPREADSHEET());
  if (action === 'mergedHealth' || action === 'healthMerged') return site_jsonResponse_(ourspace_health_());
  if (OURSPACE_LINK_SHARE_ACTIONS.indexOf(action) >= 0) return link_doGet(e);
  if (OURSPACE_SOCIAL_COMPAT_ACTIONS.indexOf(action) >= 0) return social_doGet(e);
  return site_doGet(e);
}

function ourspace_dispatchPost_(e) {
  var payload = ourspace_payloadFromEvent_(e);
  var action = String(payload.action || '').trim();
  if (action === 'setup') return site_jsonResponse_(OURSPACE_CREATE_BACKEND_SPREADSHEET());
  if (action === 'mergedHealth' || action === 'healthMerged') return site_jsonResponse_(ourspace_health_());

  // login/logout existed in multiple source files. Keep passcode/email private link login in Link Share;
  // keep username/password legacy login/register/logout in Social compatibility; keep signin/signout in Site.
  if (action === 'login') {
    if (payload.passcode || payload.memberKey || payload.member_key || payload.email) return link_doPost(e);
    return social_doPost(e);
  }
  if (action === 'logout') {
    if (payload.memberKey || payload.member_key || payload.token || payload.session_token) return link_doPost(e);
    return social_doPost(e);
  }

  if (OURSPACE_LINK_SHARE_ACTIONS.indexOf(action) >= 0) return link_doPost(e);
  if (OURSPACE_SOCIAL_COMPAT_ACTIONS.indexOf(action) >= 0) return social_doPost(e);
  return site_doPost(e);
}

function ourspace_health_() {
  var site = site_health_();
  return {
    ok: true,
    app: OURSPACE_MERGED_BACKEND.appName,
    version: OURSPACE_MERGED_BACKEND.version,
    site: site,
    linkShare: {
      publicShareId: link_getOrCreateShareId_(),
      publicShareUrl: link_publicShareUrl_(),
      privateAddressPublicExposure: false,
      publicRoutesExposeOnlyApprovedLinks: true
    },
    compatibility: {
      legacySocialActionsPreserved: true,
      socialSheetsUseCompatPrefix: true
    }
  };
}

function ourspace_ensureUnifiedDatabaseAndLinkSheets_() {
  var ss = site_ensureDatabase_();
  Object.keys(OURSPACE_LINK_SHARE_HEADERS).forEach(function(name) {
    ourspace_ensureSheetWithHeaders_(ss, name, OURSPACE_LINK_SHARE_HEADERS[name]);
  });
  PropertiesService.getScriptProperties().setProperty(OURSPACE_BACKEND.props.dbId, ss.getId());
  if (!PropertiesService.getScriptProperties().getProperty(OURSPACE_BACKEND.props.shareId)) {
    PropertiesService.getScriptProperties().setProperty(OURSPACE_BACKEND.props.shareId, link_createId_('share'));
  }
  return ss;
}

function ourspace_ensureSheetWithHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    return sheet;
  }
  var width = Math.max(sheet.getLastColumn(), headers.length);
  var current = sheet.getRange(1, 1, 1, width).getValues()[0].map(function(h) { return String(h || '').trim(); });
  var changed = false;
  headers.forEach(function(h, idx) {
    if (!current[idx]) { current[idx] = h; changed = true; }
  });
  if (changed) sheet.getRange(1, 1, 1, current.length).setValues([current]);
  return sheet;
}

function ourspace_actionFromEvent_(e) {
  var p = (e && e.parameter) || {};
  return String(p.action || '').trim();
}

function ourspace_payloadFromEvent_(e) {
  var p = (e && e.parameter) || {};
  var body = {};
  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); }
    catch (_err) { body = {}; }
  }
  if (body && body.payload && typeof body.payload === 'object') body = site_merge_(body, body.payload);
  if (p.payload) {
    try { body = site_merge_(body, JSON.parse(p.payload)); }
    catch (_err2) {}
  }
  return site_merge_(body, p);
}



/* ==========================================================================
 * Canonical OurSpace Site backend (prefixed with site_)
 * ========================================================================== */

/*******************************************************
 * OurSpace SITE backend — Google Apps Script Web App
 * Project name suggestion: site
 *
 * Paste this entire file into a Google Apps Script project named: site
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Frontend contract:
 *   POST JSON or text/plain JSON with { action: "...", ... }
 *   Also accepts form payload={json}.
 *
 * Important boundary:
 *   This backend stores/relays data. Live calls, video calls,
 *   camera capture, filters, and voice changing happen in the browser
 *   through WebRTC, MediaDevices, Canvas/WebGL, MediaRecorder, and
 *   Web Audio. This script stores signaling, call logs, media uploads,
 *   presets, stickers, messages, purchases, currency, preferences, and
 *   PWA/install/app metadata.
 *******************************************************/

const SITE_CONFIG = {
  APP_NAME: 'OurSpace Site Backend',
  VERSION: '2026-06-15.site.v2.receipts-grid-frontend',
  DATABASE_PROPERTY_KEY: 'OURSPACE_SITE_SPREADSHEET_ID',
  DRIVE_FOLDER_PROPERTY_KEY: 'OURSPACE_SITE_UPLOAD_FOLDER_ID',
  SESSION_DAYS: 30,
  MAX_USERS: 2,
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024,
  MIN_PASSWORD_LENGTH: 8,
  ALLOWED_PROFILES: ['william', 'jasper'],
  PROFILES: {
    william: {
      profileKey: 'william',
      displayName: 'William / Dino',
      siteName: 'Dino Nerdzone',
      lineName: 'William',
      defaultPartnerProfile: 'jasper',
      primaryEmail: 'williamsaville92@gmail.com',
      purchaseNotificationRecipient: 'jasperfaye99@gmail.com'
    },
    jasper: {
      profileKey: 'jasper',
      displayName: 'Jasper',
      siteName: 'Squishy Cottage',
      lineName: 'Jasper',
      defaultPartnerProfile: 'william',
      primaryEmail: 'jasperfaye99@gmail.com',
      purchaseNotificationRecipient: 'williamsaville92@gmail.com'
    }
  },
  SHEETS: {
    users: 'Users',
    sessions: 'Sessions',
    profiles: 'Profiles',
    preferences: 'Preferences',
    links: 'ProfileLinks',
    music: 'MusicLinks',
    appEvents: 'AppEvents',
    pwaInstalls: 'PwaInstalls',
    channels: 'MessengerChannels',
    messages: 'MessengerMessages',
    reactions: 'MessengerReactions',
    callSessions: 'CallSessions',
    callSignals: 'CallSignals',
    media: 'MediaUploads',
    gifs: 'GifLibrary',
    stickers: 'Stickers',
    effectPresets: 'EffectPresets',
    voiceMessages: 'VoiceMessages',
    transcripts: 'Transcripts',
    currencyLedger: 'CurrencyLedger',
    purchases: 'Purchases',
    storeCatalog: 'StoreCatalog',
    calendarEvents: 'CalendarEvents',
    scheduleItems: 'ScheduleItems',
    taskCompletions: 'TaskCompletions',
    onyxAlertSubscriptions: 'OnyxAlertSubscriptions',
    genericRecords: 'GenericRecords',
    audit: 'AuditLog'
  }
};

const SITE_HEADERS = {
  Users: ['UserId','ProfileKey','DisplayName','Username','Email','PasswordSalt','PasswordHash','Active','CreatedAt','UpdatedAt','LastSigninAt'],
  Sessions: ['SessionToken','UserId','ProfileKey','CreatedAt','ExpiresAt','Active','ClientId','UserAgent'],
  Profiles: ['ProfileKey','Json','UpdatedAt','UpdatedBy'],
  Preferences: ['PreferenceId','ProfileKey','Scope','Key','Json','UpdatedAt','UpdatedBy'],
  ProfileLinks: ['LinkId','ProfileKey','Label','Url','Category','Sort','Active','CreatedAt','UpdatedBy'],
  MusicLinks: ['MusicId','ProfileKey','Title','Url','Artist','Provider','Notes','Active','CreatedAt','UpdatedBy'],
  AppEvents: ['EventId','ProfileKey','Action','Json','CreatedAt','ClientId'],
  PwaInstalls: ['InstallId','ProfileKey','Platform','DisplayMode','Json','CreatedAt','ClientId'],
  MessengerChannels: ['ChannelId','Name','Kind','ProfileA','ProfileB','Json','Active','CreatedAt','UpdatedAt'],
  MessengerMessages: ['MessageId','ChannelId','FromProfile','ToProfile','Kind','Text','AttachmentIds','StickerId','GifUrl','Json','CreatedAt','DeletedAt'],
  MessengerReactions: ['ReactionId','MessageId','ProfileKey','Reaction','CreatedAt'],
  CallSessions: ['CallId','ChannelId','CallerProfile','CalleeProfile','Mode','Status','Json','StartedAt','UpdatedAt','EndedAt'],
  CallSignals: ['SignalId','CallId','ChannelId','FromProfile','ToProfile','SignalType','Json','CreatedAt','ExpiresAt','ConsumedAt'],
  MediaUploads: ['MediaId','ProfileKey','Kind','FileName','MimeType','SizeBytes','DriveFileId','DriveUrl','PublicUrl','MetaJson','CreatedAt'],
  GifLibrary: ['GifId','ProfileKey','Label','Url','Tags','Json','CreatedAt'],
  Stickers: ['StickerId','ProfileKey','SourceType','Text','MediaId','Url','Json','CreatedAt'],
  EffectPresets: ['PresetId','ProfileKey','Kind','Name','Json','Active','CreatedAt','UpdatedAt'],
  VoiceMessages: ['VoiceId','MessageId','ProfileKey','MediaId','DurationMs','Transcript','Json','CreatedAt'],
  Transcripts: ['TranscriptId','ProfileKey','SourceKind','SourceId','Transcript','Confidence','Engine','Json','CreatedAt'],
  CurrencyLedger: ['LedgerId','ProfileKey','Direction','AmountCopper','Reason','SourceType','SourceId','BalanceAfterCopper','Json','CreatedAt','CreatedBy'],
  Purchases: ['PurchaseId','ProfileKey','StoreName','ItemsJson','TotalCopper','Status','Note','Json','CreatedAt','UpdatedAt'],
  StoreCatalog: ['CatalogId','ProfileKey','Json','UpdatedAt','UpdatedBy'],
  CalendarEvents: ['EventId','ProfileKey','Title','StartAt','EndAt','Recurrence','Category','Source','Json','Active','CreatedAt','UpdatedAt'],
  ScheduleItems: ['ScheduleId','ProfileKey','Title','Respawn','DayOfWeek','TimeOfDay','Category','Json','Active','CreatedAt','UpdatedAt'],
  TaskCompletions: ['CompletionId','ProfileKey','TaskId','Title','RewardCopper','CompletedAt','Json','CreatedBy'],
  OnyxAlertSubscriptions: ['SubscriptionId','ProfileKey','AlertKind','DestinationType','Destination','QuietHoursJson','Active','Json','CreatedAt','UpdatedAt'],
  GenericRecords: ['RecordId','ProfileKey','Bucket','Key','Json','CreatedAt','UpdatedAt','UpdatedBy'],
  AuditLog: ['AuditId','ProfileKey','Action','Json','CreatedAt']
};

function site_doGet(e) {
  try {
    var payload = site_parseRequest_(e);
    var action = String(payload.action || 'health').trim();
    return site_jsonResponse_(site_route_(action, payload));
  } catch (err) {
    return site_jsonResponse_(site_fail_(err));
  }
}

function site_doPost(e) {
  try {
    var payload = site_parseRequest_(e);
    var action = String(payload.action || '').trim();
    if (!action) return site_jsonResponse_({ ok:false, error:'Missing action.' });
    return site_jsonResponse_(site_route_(action, payload));
  } catch (err) {
    return site_jsonResponse_(site_fail_(err));
  }
}

function site_route_(action, payload) {
  site_ensureDatabase_();
  switch (action) {
    case 'setup': return site_setup_();
    case 'health': return site_health_();
    case 'actions': return { ok:true, actions: site_availableActions_(), version:SITE_CONFIG.VERSION };

    case 'signup': return site_authSignup_(payload);
    case 'signin': return site_authSignin_(payload);
    case 'signout': return site_authSignout_(payload);
    case 'me': return site_authMe_(payload);
    case 'bootstrap': return site_authBootstrap_(payload);
    case 'requestPasswordReset': return site_passwordResetRequest_(payload);
    case 'resetPassword': return site_passwordResetComplete_(payload);

    case 'auth.signup': return site_authSignup_(payload);
    case 'auth.signin': return site_authSignin_(payload);
    case 'auth.signout': return site_authSignout_(payload);
    case 'auth.me': return site_authMe_(payload);
    case 'auth.bootstrap': return site_authBootstrap_(payload);

    case 'profile.get': return site_profileGet_(payload);
    case 'profile.save': return site_profileSave_(payload);
    case 'profile.list': return site_profileList_(payload);

    case 'preference.get': return site_preferenceGet_(payload);
    case 'preference.set': return site_preferenceSet_(payload);
    case 'preference.list': return site_preferenceList_(payload);

    case 'link.add': return site_linkAdd_(payload);
    case 'link.list': return site_linkList_(payload);
    case 'link.remove': return site_linkRemove_(payload);
    case 'music.add': return site_musicAdd_(payload);
    case 'music.list': return site_musicList_(payload);

    case 'app.event': return site_appEvent_(payload);
    case 'pwa.install.record': return site_pwaInstallRecord_(payload);
    case 'pwa.manifest.hints': return site_pwaManifestHints_(payload);

    case 'channel.create': return site_channelUpsert_(payload);
    case 'channel.upsert': return site_channelUpsert_(payload);
    case 'channel.list': return site_channelList_(payload);
    case 'message.send': return site_messageSend_(payload);
    case 'message.create': return site_messageSend_(payload);
    case 'message.list': return site_messageList_(payload);
    case 'message.react': return site_messageReact_(payload);
    case 'message.delete': return site_messageDelete_(payload);

    case 'call.create': return site_callCreate_(payload);
    case 'call.update': return site_callUpdate_(payload);
    case 'call.end': return site_callEnd_(payload);
    case 'call.signal.send': return site_callSignalSend_(payload);
    case 'call.signal': return site_callSignalSend_(payload);
    case 'call.signal.list': return site_callSignalList_(payload);
    case 'call.signal.clear': return site_callSignalClear_(payload);

    case 'upload.media': return site_uploadMedia_(payload);
    case 'media.list': return site_mediaList_(payload);
    case 'gif.save': return site_gifSave_(payload);
    case 'gif.list': return site_gifList_(payload);
    case 'sticker.save': return site_stickerSave_(payload);
    case 'sticker.fromText': return site_stickerFromText_(payload);
    case 'sticker.list': return site_stickerList_(payload);
    case 'effect.save': return site_effectSave_(payload);
    case 'effect.list': return site_effectList_(payload);

    case 'voice.message.save': return site_voiceMessageSave_(payload);
    case 'audio.transcript.save': return site_transcriptSave_(payload);
    case 'audio.transcribe.request': return site_transcribeRequest_(payload);

    case 'currency.earn': return site_currencyLedger_(payload, 'earn');
    case 'currency.spend': return site_currencyLedger_(payload, 'spend');
    case 'currency.adjust': return site_currencyLedger_(payload, 'adjust');
    case 'currency.balance': return site_currencyBalance_(payload);
    case 'recordPurchase': return site_purchaseRecordFromSite_(payload);
    case 'purchase.create': return site_purchaseCreate_(payload);
    case 'purchase.list': return site_purchaseList_(payload);
    case 'store.catalog.save': return site_storeCatalogSave_(payload);
    case 'store.catalog.get': return site_storeCatalogGet_(payload);

    case 'calendar.event.upsert': return site_calendarEventUpsert_(payload);
    case 'calendar.event.list': return site_calendarEventList_(payload);
    case 'schedule.item.upsert': return site_scheduleItemUpsert_(payload);
    case 'schedule.item.list': return site_scheduleItemList_(payload);
    case 'task.complete': return site_taskComplete_(payload);

    case 'onyx.alert.subscribe': return site_onyxAlertSubscribe_(payload);
    case 'onyx.alert.subscription.list': return site_onyxAlertSubscriptionList_(payload);

    case 'record.save': return site_recordSave_(payload);
    case 'record.list': return site_recordList_(payload);

    default: return { ok:false, error:'Unknown action: ' + action, actions: site_availableActions_() };
  }
}

function site_availableActions_() {
  return [
    'setup','health','actions',
    'signup','signin','signout','me','bootstrap','requestPasswordReset','resetPassword','auth.signup','auth.signin','auth.signout','auth.me','auth.bootstrap',
    'profile.get','profile.save','profile.list',
    'preference.get','preference.set','preference.list',
    'link.add','link.list','link.remove','music.add','music.list',
    'app.event','pwa.install.record','pwa.manifest.hints',
    'channel.create','channel.upsert','channel.list','message.send','message.list','message.react','message.delete',
    'call.create','call.update','call.end','call.signal.send','call.signal.list','call.signal.clear',
    'upload.media','media.list','gif.save','gif.list','sticker.save','sticker.fromText','sticker.list','effect.save','effect.list',
    'voice.message.save','audio.transcript.save','audio.transcribe.request',
    'currency.earn','currency.spend','currency.adjust','currency.balance','recordPurchase','purchase.create','purchase.list','store.catalog.save','store.catalog.get',
    'calendar.event.upsert','calendar.event.list','schedule.item.upsert','schedule.item.list','task.complete',
    'onyx.alert.subscribe','onyx.alert.subscription.list',
    'record.save','record.list'
  ];
}

/*************** setup / health ***************/
function site_setup_() {
  var ss = site_ensureDatabase_();
  var folder = site_ensureUploadFolder_();
  site_seedDefaultChannels_();
  return { ok:true, app:SITE_CONFIG.APP_NAME, version:SITE_CONFIG.VERSION, spreadsheetId:ss.getId(), spreadsheetUrl:ss.getUrl(), uploadFolderId:folder.getId(), uploadFolderUrl:folder.getUrl() };
}

function site_health_() {
  var ss = site_ensureDatabase_();
  var activeUsers = site_getRows_('Users').filter(function(r){ return String(r.Active) === 'true'; }).length;
  return {
    ok:true,
    app:SITE_CONFIG.APP_NAME,
    version:SITE_CONFIG.VERSION,
    databaseReady:true,
    spreadsheetId:ss.getId(),
    activeUsers:activeUsers,
    maxUsers:SITE_CONFIG.MAX_USERS,
    profiles:SITE_CONFIG.ALLOWED_PROFILES,
    handles: {
      messaging:true,
      callSignaling:true,
      videoCallSignaling:true,
      voiceChangerPresetStorage:true,
      cameraFilterPresetStorage:true,
      gifStorage:true,
      stickerStorage:true,
      mediaUploads:true,
      purchaseCurrencyStorage:true,
      pwaInstallEventStorage:true,
      secureLandingSessionStorage:true
    },
    browserRequiredFor:['live audio/video calls','taking pictures/videos','real-time filters','voice changing','local install bubble','speech recognition unless frontend or external API supplies transcript']
  };
}

/*************** auth ***************/
function site_authSignup_(payload) {
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || payload.profileKey);
  var username = site_cleanKey_(data.username || data.email || profileKey);
  var email = String(data.email || '').trim().toLowerCase();
  var displayName = String(data.displayName || SITE_CONFIG.PROFILES[profileKey].displayName).trim();
  var password = String(data.password || payload.password || '');
  if (password.length < SITE_CONFIG.MIN_PASSWORD_LENGTH) throw new Error('Password must be at least ' + SITE_CONFIG.MIN_PASSWORD_LENGTH + ' characters.');
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var users = site_getRows_('Users');
    var activeUsers = users.filter(function(u){ return String(u.Active) === 'true'; });
    if (activeUsers.length >= SITE_CONFIG.MAX_USERS && !activeUsers.some(function(u){ return u.ProfileKey === profileKey; })) throw new Error('Only two OurSpace profile accounts are allowed.');
    if (users.some(function(u){ return String(u.ProfileKey) === profileKey && String(u.Active) === 'true'; })) throw new Error('Profile already has an active account.');
    if (users.some(function(u){ return String(u.Username).toLowerCase() === username.toLowerCase() && String(u.Active) === 'true'; })) throw new Error('Username already exists.');
    if (email && users.some(function(u){ return String(u.Email).toLowerCase() === email && String(u.Active) === 'true'; })) throw new Error('Email already exists.');
    var salt = site_randomToken_(18);
    var now = site_isoNow_();
    var userId = site_id_('user');
    site_appendRow_('Users', { UserId:userId, ProfileKey:profileKey, DisplayName:displayName, Username:username, Email:email, PasswordSalt:salt, PasswordHash:site_hashPassword_(password, salt), Active:'true', CreatedAt:now, UpdatedAt:now, LastSigninAt:'' });
    site_audit_(profileKey, 'auth.signup', { username:username, email:email });
    return site_makeSession_(userId, profileKey, payload);
  } finally { lock.releaseLock(); }
}

function site_authSignin_(payload) {
  var data = site_data_(payload);
  var identifier = String(data.identifier || data.username || data.email || payload.identifier || '').trim().toLowerCase();
  var profileKey = data.profileKey || payload.profileKey;
  var password = String(data.password || payload.password || '');
  if (!identifier && profileKey) identifier = String(profileKey).toLowerCase();
  var users = site_getRows_('Users').filter(function(u){ return String(u.Active) === 'true'; });
  var user = users.find(function(u){
    return String(u.Username).toLowerCase() === identifier || String(u.Email).toLowerCase() === identifier || String(u.ProfileKey).toLowerCase() === identifier;
  });
  if (!user) throw new Error('Account not found.');
  if (profileKey && String(user.ProfileKey) !== site_normalizeProfile_(profileKey)) throw new Error('This account does not match that profile.');
  if (site_hashPassword_(password, user.PasswordSalt) !== user.PasswordHash) throw new Error('Incorrect password.');
  site_updateRows_('Users', function(r){ return r.UserId === user.UserId; }, function(r){ r.LastSigninAt = site_isoNow_(); r.UpdatedAt = site_isoNow_(); return r; });
  site_audit_(user.ProfileKey, 'auth.signin', { username:user.Username });
  return site_makeSession_(user.UserId, user.ProfileKey, payload);
}

function site_authSignout_(payload) {
  var token = String(payload.sessionToken || site_data_(payload).sessionToken || '').trim();
  if (!token) return { ok:true, signedOut:false };
  site_updateRows_('Sessions', function(r){ return r.SessionToken === token; }, function(r){ r.Active = 'false'; return r; });
  return { ok:true, signedOut:true };
}

function site_authMe_(payload) {
  var session = site_requireSession_(payload);
  return { ok:true, user: site_publicUser_(session.user), session:{ profileKey:session.profileKey, expiresAt:session.row.ExpiresAt } };
}

function site_authBootstrap_(payload) {
  var out = { ok:true, profiles:SITE_CONFIG.PROFILES, signedIn:false, session:null, user:null };
  try {
    var session = site_requireSession_(payload);
    out.signedIn = true;
    out.user = site_publicUser_(session.user);
    out.session = { profileKey:session.profileKey, expiresAt:session.row.ExpiresAt };
  } catch (err) {}
  out.defaultChannels = site_channelList_({ profileKey: out.user ? out.user.profileKey : null, noAuth:true }).channels;
  out.manifestHints = site_pwaManifestHints_(payload).manifestHints;
  return out;
}

function site_makeSession_(userId, profileKey, payload) {
  var now = new Date();
  var expires = new Date(now.getTime() + SITE_CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000);
  var token = site_randomToken_(32);
  site_appendRow_('Sessions', { SessionToken:token, UserId:userId, ProfileKey:profileKey, CreatedAt:now.toISOString(), ExpiresAt:expires.toISOString(), Active:'true', ClientId:String(payload.clientId || ''), UserAgent:String(payload.userAgent || '') });
  var user = site_getRows_('Users').find(function(u){ return u.UserId === userId; });
  return { ok:true, user:site_publicUser_(user), sessionToken:token, expiresAt:expires.toISOString() };
}

function site_requireSession_(payload) {
  var token = String(payload.sessionToken || site_data_(payload).sessionToken || '').trim();
  if (!token) throw new Error('Missing sessionToken.');
  var row = site_getRows_('Sessions').find(function(s){ return s.SessionToken === token && String(s.Active) === 'true'; });
  if (!row) throw new Error('Session not found or signed out.');
  if (new Date(row.ExpiresAt).getTime() < Date.now()) throw new Error('Session expired.');
  var user = site_getRows_('Users').find(function(u){ return u.UserId === row.UserId && String(u.Active) === 'true'; });
  if (!user) throw new Error('User not found.');
  return { row:row, user:user, profileKey:row.ProfileKey, userId:row.UserId };
}

function site_publicUser_(user) {
  return { userId:user.UserId, profileKey:user.ProfileKey, displayName:user.DisplayName, username:user.Username, email:user.Email, siteName:(SITE_CONFIG.PROFILES[user.ProfileKey] || {}).siteName || '' };
}

/*************** profiles/preferences/links ***************/
function site_profileGet_(payload) {
  var profileKey = site_optionalProfile_(payload) || site_requireSession_(payload).profileKey;
  var row = site_latestRow_('Profiles', function(r){ return r.ProfileKey === profileKey; }, 'UpdatedAt');
  return { ok:true, profileKey:profileKey, profile: row ? site_parseJson_(row.Json, {}) : SITE_CONFIG.PROFILES[profileKey] };
}

function site_profileSave_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  if (profileKey !== session.profileKey) throw new Error('Cannot save another profile.');
  site_appendRow_('Profiles', { ProfileKey:profileKey, Json:site_json_(data.profile || data), UpdatedAt:site_isoNow_(), UpdatedBy:session.userId });
  site_audit_(profileKey, 'profile.save', data);
  return { ok:true, profileKey:profileKey };
}

function site_profileList_(payload) {
  return { ok:true, profiles:SITE_CONFIG.PROFILES };
}

function site_preferenceGet_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  var scope = String(data.scope || 'profile');
  var key = String(data.key || 'default');
  var row = site_latestRow_('Preferences', function(r){ return r.ProfileKey === profileKey && r.Scope === scope && r.Key === key; }, 'UpdatedAt');
  return { ok:true, profileKey:profileKey, scope:scope, key:key, value: row ? site_parseJson_(row.Json, null) : null };
}

function site_preferenceSet_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  var prefId = site_id_('pref');
  site_appendRow_('Preferences', { PreferenceId:prefId, ProfileKey:profileKey, Scope:String(data.scope || 'profile'), Key:String(data.key || 'default'), Json:site_json_(data.value !== undefined ? data.value : data), UpdatedAt:site_isoNow_(), UpdatedBy:session.userId });
  return { ok:true, preferenceId:prefId };
}

function site_preferenceList_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  var scope = data.scope ? String(data.scope) : '';
  var rows = site_getRows_('Preferences').filter(function(r){ return r.ProfileKey === profileKey && (!scope || r.Scope === scope); }).map(function(r){ return { id:r.PreferenceId, scope:r.Scope, key:r.Key, value:site_parseJson_(r.Json, null), updatedAt:r.UpdatedAt }; });
  return { ok:true, preferences:rows };
}

function site_linkAdd_(payload) { return site_addListItem_('ProfileLinks', payload, { idField:'LinkId', idPrefix:'link', requiredUrl:true }); }
function site_musicAdd_(payload) { return site_addListItem_('MusicLinks', payload, { idField:'MusicId', idPrefix:'music', requiredUrl:true }); }
function site_linkList_(payload) { return site_listByProfile_('ProfileLinks', payload, function(r){ return String(r.Active) !== 'false'; }); }
function site_musicList_(payload) { return site_listByProfile_('MusicLinks', payload, function(r){ return String(r.Active) !== 'false'; }); }
function site_linkRemove_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var linkId = String(data.linkId || payload.linkId || '');
  site_updateRows_('ProfileLinks', function(r){ return r.LinkId === linkId && r.ProfileKey === session.profileKey; }, function(r){ r.Active='false'; return r; });
  return { ok:true, linkId:linkId, removed:true };
}

function site_addListItem_(sheetName, payload, options) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  if (profileKey !== session.profileKey) throw new Error('Cannot write another profile.');
  if (options.requiredUrl && !String(data.url || '').trim()) throw new Error('Missing URL.');
  var row = { ProfileKey:profileKey, CreatedAt:site_isoNow_(), UpdatedBy:session.userId, Active:'true' };
  row[options.idField] = site_id_(options.idPrefix);
  Object.keys(data).forEach(function(k){
    var headerName = k.charAt(0).toUpperCase() + k.slice(1);
    if (SITE_HEADERS[sheetName].indexOf(headerName) !== -1) row[headerName] = data[k];
  });
  site_appendRow_(sheetName, row);
  return { ok:true, id:row[options.idField], row:row };
}

function site_listByProfile_(sheetName, payload, filterFn) {
  var session = payload.noAuth ? null : site_requireSession_(payload);
  var profileKey = site_optionalProfile_(payload) || (session ? session.profileKey : '');
  var rows = site_getRows_(sheetName).filter(function(r){ return (!profileKey || r.ProfileKey === profileKey) && (!filterFn || filterFn(r)); });
  return { ok:true, rows: rows.map(rowPublic_) };
}

/*************** app/PWA ***************/
function site_appEvent_(payload) {
  var profileKey = site_optionalProfile_(payload) || site_safeSessionProfile_(payload) || '';
  site_appendRow_('AppEvents', { EventId:site_id_('evt'), ProfileKey:profileKey, Action:String(payload.eventAction || payload.actionName || payload.action || 'app.event'), Json:site_json_(payload.detail || site_data_(payload) || payload), CreatedAt:site_isoNow_(), ClientId:String(payload.clientId || '') });
  return { ok:true };
}

function site_pwaInstallRecord_(payload) {
  var profileKey = site_optionalProfile_(payload) || site_safeSessionProfile_(payload) || '';
  var data = site_data_(payload);
  var id = site_id_('install');
  site_appendRow_('PwaInstalls', { InstallId:id, ProfileKey:profileKey, Platform:String(data.platform || payload.platform || ''), DisplayMode:String(data.displayMode || payload.displayMode || ''), Json:site_json_(data), CreatedAt:site_isoNow_(), ClientId:String(payload.clientId || '') });
  return { ok:true, installId:id };
}

function site_pwaManifestHints_(payload) {
  return { ok:true, manifestHints:{ appName:'OurSpace', shortName:'OurSpace', installable:true, startUrl:'./index.html', display:'standalone', iconsExpected:['icon-192.png','icon-512.png'], note:'The install bubble is browser controlled; backend stores install events and preferences.' } };
}

/*************** messenger ***************/
function site_seedDefaultChannels_() {
  var existing = site_getRows_('MessengerChannels');
  if (existing.some(function(c){ return c.ChannelId === 'tin-can-main'; })) return;
  var now = site_isoNow_();
  [
    ['tin-can-main','Tin Can Main','main'],
    ['care-line','Care Line','care'],
    ['store-line','Store / Rewards','store'],
    ['dbt-line','DBT / Grounding','dbt'],
    ['media-line','Photos / Videos / GIFs','media']
  ].forEach(function(c){ site_appendRow_('MessengerChannels', { ChannelId:c[0], Name:c[1], Kind:c[2], ProfileA:'william', ProfileB:'jasper', Json:'{}', Active:'true', CreatedAt:now, UpdatedAt:now }); });
}

function site_channelUpsert_(payload) {
  var session = null;
  try { session = site_requireSession_(payload); } catch (err) { session = null; }
  var data = site_data_(payload);
  var channelId = site_cleanKey_(data.channelId || data.id || site_id_('channel'));
  var existing = site_getRows_('MessengerChannels').some(function(r){ return r.ChannelId === channelId; });
  var row = { ChannelId:channelId, Name:String(data.name || data.title || 'Shared Channel'), Kind:String(data.kind || 'custom'), ProfileA:String(data.profileA || 'william'), ProfileB:String(data.profileB || 'jasper'), Json:site_json_(data), Active:String(data.active !== false), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() };
  if (existing) site_updateRows_('MessengerChannels', function(r){ return r.ChannelId === channelId; }, function(r){ r.Name=row.Name; r.Kind=row.Kind; r.Json=row.Json; r.Active=row.Active; r.UpdatedAt=row.UpdatedAt; return r; });
  else site_appendRow_('MessengerChannels', row);
  return { ok:true, channelId:channelId };
}

function site_channelList_(payload) {
  site_seedDefaultChannels_();
  var rows = site_getRows_('MessengerChannels').filter(function(r){ return String(r.Active) !== 'false'; }).map(rowPublic_);
  return { ok:true, channels:rows };
}

function site_messageSend_(payload) {
  var session = null;
  try { session = site_requireSession_(payload); } catch (err) { session = null; }
  var data = site_data_(payload);
  var fromProfile = site_normalizeProfile_(data.fromProfile || data.authorId || data.profileKey || (session && session.profileKey) || 'william');
  if (session && fromProfile !== session.profileKey) throw new Error('Cannot send as another profile.');
  var toProfile = site_normalizeProfile_(data.toProfile || data.recipientId || SITE_CONFIG.PROFILES[fromProfile].defaultPartnerProfile);
  var messageId = site_id_('msg');
  var channelId = site_cleanKey_(data.channelId || 'tin-can-main');
  site_appendRow_('MessengerMessages', { MessageId:messageId, ChannelId:channelId, FromProfile:fromProfile, ToProfile:toProfile, Kind:String(data.kind || 'text'), Text:String(data.text || ''), AttachmentIds:site_json_(data.attachmentIds || []), StickerId:String(data.stickerId || ''), GifUrl:String(data.gifUrl || ''), Json:site_json_(data), CreatedAt:site_isoNow_(), DeletedAt:'' });
  return { ok:true, messageId:messageId, channelId:channelId, fromProfile:fromProfile, toProfile:toProfile };
}

function site_messageList_(payload) {
  var session = null;
  try { session = site_requireSession_(payload); } catch (err) { session = { profileKey: site_optionalProfile_(payload) || '' }; }
  var data = site_data_(payload);
  var channelId = site_cleanKey_(data.channelId || 'tin-can-main');
  var since = data.since || payload.since || '';
  var limit = Math.min(Number(data.limit || payload.limit || 100), 500);
  var rows = site_getRows_('MessengerMessages').filter(function(r){
    return r.ChannelId === channelId && !r.DeletedAt && (!since || String(r.CreatedAt) > String(since));
  }).sort(function(a,b){ return String(a.CreatedAt).localeCompare(String(b.CreatedAt)); }).slice(-limit).map(messagePublic_);
  return { ok:true, channelId:channelId, messages:rows, serverTime:site_isoNow_(), profileKey:session.profileKey };
}

function site_messageReact_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var rid = site_id_('react');
  site_appendRow_('MessengerReactions', { ReactionId:rid, MessageId:String(data.messageId || ''), ProfileKey:session.profileKey, Reaction:String(data.reaction || ''), CreatedAt:site_isoNow_() });
  return { ok:true, reactionId:rid };
}

function site_messageDelete_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var mid = String(data.messageId || payload.messageId || '');
  site_updateRows_('MessengerMessages', function(r){ return r.MessageId === mid && r.FromProfile === session.profileKey; }, function(r){ r.DeletedAt = site_isoNow_(); return r; });
  return { ok:true, messageId:mid, deleted:true };
}

function site_messagePublic_(r) {
  return { messageId:r.MessageId, channelId:r.ChannelId, fromProfile:r.FromProfile, toProfile:r.ToProfile, kind:r.Kind, text:r.Text, attachmentIds:site_parseJson_(r.AttachmentIds, []), stickerId:r.StickerId, gifUrl:r.GifUrl, data:site_parseJson_(r.Json, {}), createdAt:r.CreatedAt };
}

/*************** calls / WebRTC signaling ***************/
function site_callCreate_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var callId = site_id_('call');
  var callee = site_normalizeProfile_(data.calleeProfile || SITE_CONFIG.PROFILES[session.profileKey].defaultPartnerProfile);
  site_appendRow_('CallSessions', { CallId:callId, ChannelId:site_cleanKey_(data.channelId || 'tin-can-main'), CallerProfile:session.profileKey, CalleeProfile:callee, Mode:String(data.mode || 'video'), Status:'ringing', Json:site_json_(data), StartedAt:site_isoNow_(), UpdatedAt:site_isoNow_(), EndedAt:'' });
  return { ok:true, callId:callId, status:'ringing', note:'Use call.signal.send for WebRTC offer/answer/ICE. Backend does not stream audio/video.' };
}

function site_callUpdate_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var callId = String(data.callId || payload.callId || '');
  var status = String(data.status || 'active');
  site_updateRows_('CallSessions', function(r){ return r.CallId === callId && (r.CallerProfile === session.profileKey || r.CalleeProfile === session.profileKey); }, function(r){ r.Status=status; r.UpdatedAt=site_isoNow_(); r.Json=site_json_(site_merge_(site_parseJson_(r.Json, {}), data)); return r; });
  return { ok:true, callId:callId, status:status };
}

function site_callEnd_(payload) {
  var data = site_merge_(site_data_(payload), { status:'ended' });
  return site_callUpdate_(site_merge_(payload, { data:data }));
}

function site_callSignalSend_(payload) {
  var session = null;
  try { session = site_requireSession_(payload); } catch (err) { session = { profileKey: site_optionalProfile_(payload) || site_normalizeProfile_(site_data_(payload).fromProfile || site_data_(payload).authorId || 'william') }; }
  var data = site_data_(payload);
  var ttlSeconds = Math.min(Number(data.ttlSeconds || 120), 900);
  var expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  var sid = site_id_('sig');
  site_appendRow_('CallSignals', { SignalId:sid, CallId:String(data.callId || ''), ChannelId:site_cleanKey_(data.channelId || 'tin-can-main'), FromProfile:session.profileKey, ToProfile:site_normalizeProfile_(data.toProfile || SITE_CONFIG.PROFILES[session.profileKey].defaultPartnerProfile), SignalType:String(data.signalType || data.type || 'candidate'), Json:site_json_(data.signal || data), CreatedAt:site_isoNow_(), ExpiresAt:expires, ConsumedAt:'' });
  return { ok:true, signalId:sid, expiresAt:expires };
}

function site_callSignalList_(payload) {
  var session = null;
  try { session = site_requireSession_(payload); } catch (err) { session = { profileKey: site_optionalProfile_(payload) || '' }; }
  var data = site_data_(payload);
  var callId = String(data.callId || payload.callId || '');
  var since = String(data.since || payload.since || '');
  var nowMs = Date.now();
  var rows = site_getRows_('CallSignals').filter(function(r){
    return (!callId || r.CallId === callId) && r.ToProfile === session.profileKey && (!since || String(r.CreatedAt) > since) && (!r.ExpiresAt || new Date(r.ExpiresAt).getTime() >= nowMs);
  }).map(function(r){ return { signalId:r.SignalId, callId:r.CallId, channelId:r.ChannelId, fromProfile:r.FromProfile, toProfile:r.ToProfile, signalType:r.SignalType, signal:site_parseJson_(r.Json, {}), createdAt:r.CreatedAt, expiresAt:r.ExpiresAt }; });
  return { ok:true, signals:rows, serverTime:site_isoNow_() };
}

function site_callSignalClear_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var ids = data.signalIds || [];
  site_updateRows_('CallSignals', function(r){ return r.ToProfile === session.profileKey && (ids.length === 0 || ids.indexOf(r.SignalId) !== -1); }, function(r){ r.ConsumedAt=site_isoNow_(); return r; });
  return { ok:true, cleared:ids.length || 'all-visible' };
}

/*************** uploads/media/gifs/stickers/effects/transcripts ***************/
function site_uploadMedia_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var base64 = String(data.base64 || data.dataUrl || '');
  var mimeType = String(data.mimeType || 'application/octet-stream');
  var kind = String(data.kind || 'file');
  var fileName = String(data.fileName || kind + '-' + Date.now());
  if (!base64) throw new Error('Missing base64 or dataUrl.');
  if (base64.indexOf(',') !== -1) base64 = base64.split(',').pop();
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length > SITE_CONFIG.MAX_UPLOAD_BYTES) throw new Error('Upload too large for Apps Script backend. Max bytes: ' + SITE_CONFIG.MAX_UPLOAD_BYTES);
  var blob = Utilities.newBlob(bytes, mimeType, site_safeFileName_(fileName));
  var folder = site_ensureUploadFolder_();
  var file = folder.createFile(blob);
  var id = site_id_('media');
  site_appendRow_('MediaUploads', { MediaId:id, ProfileKey:session.profileKey, Kind:kind, FileName:file.getName(), MimeType:mimeType, SizeBytes:bytes.length, DriveFileId:file.getId(), DriveUrl:file.getUrl(), PublicUrl:file.getUrl(), MetaJson:site_json_(data.meta || {}), CreatedAt:site_isoNow_() });
  return { ok:true, mediaId:id, driveFileId:file.getId(), url:file.getUrl(), sizeBytes:bytes.length, kind:kind };
}

function site_mediaList_(payload) {
  var session = site_requireSession_(payload);
  var data = site_data_(payload);
  var kind = data.kind ? String(data.kind) : '';
  var rows = site_getRows_('MediaUploads').filter(function(r){ return r.ProfileKey === session.profileKey && (!kind || r.Kind === kind); }).slice(-200).map(rowPublic_);
  return { ok:true, media:rows };
}

function site_gifSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), gid=site_id_('gif');
  site_appendRow_('GifLibrary', { GifId:gid, ProfileKey:session.profileKey, Label:String(data.label || ''), Url:String(data.url || ''), Tags:site_json_(data.tags || []), Json:site_json_(data), CreatedAt:site_isoNow_() });
  return { ok:true, gifId:gid };
}
function site_gifList_(payload) { return site_listByProfile_('GifLibrary', payload); }

function site_stickerSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), sid=site_id_('sticker');
  site_appendRow_('Stickers', { StickerId:sid, ProfileKey:session.profileKey, SourceType:String(data.sourceType || 'custom'), Text:String(data.text || ''), MediaId:String(data.mediaId || ''), Url:String(data.url || ''), Json:site_json_(data), CreatedAt:site_isoNow_() });
  return { ok:true, stickerId:sid };
}

function site_stickerFromText_(payload) {
  var data = site_data_(payload);
  data.sourceType = 'text';
  data.text = String(data.text || '').slice(0, 120);
  data.stickerStyle = data.stickerStyle || { shape:'bubble', source:'frontend-rendered' };
  return site_stickerSave_(site_merge_(payload, { data:data }));
}
function site_stickerList_(payload) { return site_listByProfile_('Stickers', payload); }

function site_effectSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), pid=site_cleanKey_(data.presetId || site_id_('preset'));
  site_appendRow_('EffectPresets', { PresetId:pid, ProfileKey:session.profileKey, Kind:String(data.kind || 'camera-filter'), Name:String(data.name || 'Preset'), Json:site_json_(data), Active:String(data.active !== false), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  return { ok:true, presetId:pid, note:'The frontend applies this preset through Web Audio, Canvas, CSS, or WebGL.' };
}
function site_effectList_(payload) { return site_listByProfile_('EffectPresets', payload, function(r){ return String(r.Active) !== 'false'; }); }

function site_voiceMessageSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), vid=site_id_('voice');
  site_appendRow_('VoiceMessages', { VoiceId:vid, MessageId:String(data.messageId || ''), ProfileKey:session.profileKey, MediaId:String(data.mediaId || ''), DurationMs:Number(data.durationMs || 0), Transcript:String(data.transcript || ''), Json:site_json_(data), CreatedAt:site_isoNow_() });
  if (data.transcript) site_transcriptSave_(site_merge_(payload, { data:{ sourceKind:'voice', sourceId:vid, transcript:data.transcript, confidence:data.confidence || '', engine:data.engine || 'frontend' } }));
  return { ok:true, voiceId:vid };
}

function site_transcriptSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), tid=site_id_('transcript');
  site_appendRow_('Transcripts', { TranscriptId:tid, ProfileKey:session.profileKey, SourceKind:String(data.sourceKind || 'audio'), SourceId:String(data.sourceId || data.mediaId || ''), Transcript:String(data.transcript || ''), Confidence:String(data.confidence || ''), Engine:String(data.engine || 'frontend'), Json:site_json_(data), CreatedAt:site_isoNow_() });
  return { ok:true, transcriptId:tid };
}

function site_transcribeRequest_(payload) {
  return { ok:false, needsFrontendOrExternalSpeechApi:true, message:'Apps Script does not include built-in speech-to-text. Use browser SpeechRecognition/MediaRecorder transcript, or connect a Google Cloud Speech-to-Text endpoint/API key and then save with audio.transcript.save.' };
}

/*************** currency / purchases / store ***************/
function site_currencyLedger_(payload, defaultDirection) {
  var session = site_requireSession_(payload), data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  if (profileKey !== session.profileKey) throw new Error('Cannot modify another profile currency.');
  var direction = String(data.direction || defaultDirection);
  var amount = Number(data.amountCopper || data.totalCopper || data.amount || 0);
  if (!isFinite(amount) || amount <= 0) throw new Error('Amount must be positive copper.');
  var current = site_computeBalance_(profileKey);
  var delta = direction === 'spend' ? -amount : amount;
  if (direction === 'adjust') delta = Number(data.deltaCopper || amount);
  var after = current + delta;
  var id = site_id_('ledger');
  site_appendRow_('CurrencyLedger', { LedgerId:id, ProfileKey:profileKey, Direction:direction, AmountCopper:delta, Reason:String(data.reason || ''), SourceType:String(data.sourceType || ''), SourceId:String(data.sourceId || ''), BalanceAfterCopper:after, Json:site_json_(data), CreatedAt:site_isoNow_(), CreatedBy:session.userId });
  return { ok:true, ledgerId:id, profileKey:profileKey, balanceCopper:after, display:site_formatCopper_(after) };
}

function site_currencyBalance_(payload) {
  var session = site_requireSession_(payload);
  var profileKey = site_normalizeProfile_(site_data_(payload).profileKey || session.profileKey);
  return { ok:true, profileKey:profileKey, balanceCopper:site_computeBalance_(profileKey), display:site_formatCopper_(site_computeBalance_(profileKey)) };
}


function site_passwordResetRequest_(payload) {
  var data = site_data_(payload);
  var identifier = String(data.identifier || data.username || data.email || payload.identifier || '').trim().toLowerCase();
  if (!identifier) throw new Error('Missing identifier.');
  var user = site_getRows_('Users').find(function(u){
    return String(u.Active) === 'true' && (String(u.Username).toLowerCase() === identifier || String(u.Email).toLowerCase() === identifier || String(u.ProfileKey).toLowerCase() === identifier);
  });
  if (!user) return { ok:true, emailed:false };
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  site_appendRow_('GenericRecords', { RecordId:site_id_('reset'), ProfileKey:user.ProfileKey, Bucket:'password_reset', Key:code, Json:site_json_({ userId:user.UserId, identifier:identifier, expiresAt:expiresAt, used:false }), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_(), UpdatedBy:'system' });
  if (user.Email) {
    MailApp.sendEmail(user.Email, 'OurSpace password reset code', 'Your OurSpace reset code is: ' + code + '\nThis code expires in 30 minutes.');
  }
  site_audit_(user.ProfileKey, 'auth.passwordReset.request', { identifier:identifier });
  return { ok:true, emailed:!!user.Email };
}

function site_passwordResetComplete_(payload) {
  var data = site_data_(payload);
  var identifier = String(data.identifier || data.username || data.email || payload.identifier || '').trim().toLowerCase();
  var code = String(data.code || payload.code || '').trim();
  var newPassword = String(data.newPassword || data.password || payload.newPassword || '');
  if (!identifier || !code || newPassword.length < SITE_CONFIG.MIN_PASSWORD_LENGTH) throw new Error('Missing reset fields or password is too short.');
  var row = site_latestRow_('GenericRecords', function(r){ return r.Bucket === 'password_reset' && r.Key === code; }, 'CreatedAt');
  if (!row) throw new Error('Reset code not found.');
  var meta = site_parseJson_(row.Json, {});
  if (meta.used) throw new Error('Reset code already used.');
  if (new Date(meta.expiresAt).getTime() < Date.now()) throw new Error('Reset code expired.');
  var user = site_getRows_('Users').find(function(u){ return u.UserId === meta.userId && String(u.Active) === 'true'; });
  if (!user) throw new Error('Account not found.');
  if (identifier && !(String(user.Username).toLowerCase() === identifier || String(user.Email).toLowerCase() === identifier || String(user.ProfileKey).toLowerCase() === identifier)) throw new Error('Reset code does not match that account.');
  var salt = site_randomToken_(18);
  site_updateRows_('Users', function(r){ return r.UserId === user.UserId; }, function(r){ r.PasswordSalt=salt; r.PasswordHash=site_hashPassword_(newPassword, salt); r.UpdatedAt=site_isoNow_(); return r; });
  site_updateRows_('GenericRecords', function(r){ return r.RecordId === row.RecordId; }, function(r){ var m=site_parseJson_(r.Json, {}); m.used=true; m.usedAt=site_isoNow_(); r.Json=site_json_(m); r.UpdatedAt=site_isoNow_(); return r; });
  site_audit_(user.ProfileKey, 'auth.passwordReset.complete', { identifier:identifier });
  return { ok:true, reset:true };
}

function site_purchaseRecordFromSite_(payload) {
  var data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || data.purchaserProfile || data.pageOwner || payload.profileKey || 'william');
  var items = data.items || [];
  var total = Number(data.totalCopper || data.totalCostCopper || items.reduce(function(sum,i){ return sum + Number(i.totalCopper || i.totalCostCopper || i.costCopper || i.unitCostCopper || 0) * Number(i.quantity || 1); }, 0));
  var pid = site_id_('purchase');
  data.profileKey = profileKey;
  data.receiptToProfile = data.receiptToProfile || SITE_CONFIG.PROFILES[profileKey].defaultPartnerProfile;
  data.receiptToEmail = data.receiptToEmail || SITE_CONFIG.PROFILES[profileKey].purchaseNotificationRecipient;
  site_appendRow_('Purchases', { PurchaseId:pid, ProfileKey:profileKey, StoreName:String(data.storeName || data.app || ''), ItemsJson:site_json_(items), TotalCopper:total, Status:String(data.status || 'requested'), Note:String(data.note || ''), Json:site_json_(data), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  site_maybeEmailPurchase_(profileKey, pid, data, total);
  site_audit_(profileKey, 'purchase.record', { purchaseId:pid, totalCopper:total, receiptToProfile:data.receiptToProfile });
  return { ok:true, purchaseId:pid, totalCopper:total, display:site_formatCopper_(total), receiptToProfile:data.receiptToProfile, receiptToEmail:site_maskDestination_(data.receiptToEmail || '') };
}

function site_purchaseCreate_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  if (profileKey !== session.profileKey) throw new Error('Cannot purchase as another profile.');
  var items = data.items || [];
  var total = Number(data.totalCopper || items.reduce(function(sum,i){ return sum + Number(i.totalCopper || i.costCopper || i.unitCostCopper || 0) * Number(i.quantity || 1); }, 0));
  var pid = site_id_('purchase');
  site_appendRow_('Purchases', { PurchaseId:pid, ProfileKey:profileKey, StoreName:String(data.storeName || ''), ItemsJson:site_json_(items), TotalCopper:total, Status:String(data.status || 'requested'), Note:String(data.note || ''), Json:site_json_(data), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  if (data.spendCurrency === true && total > 0) site_currencyLedger_(site_merge_(payload, { data:{ profileKey:profileKey, direction:'spend', amountCopper:total, reason:'Purchase: ' + pid, sourceType:'purchase', sourceId:pid } }), 'spend');
  site_maybeEmailPurchase_(profileKey, pid, data, total);
  return { ok:true, purchaseId:pid, totalCopper:total, display:site_formatCopper_(total) };
}

function site_purchaseList_(payload) { return site_listByProfile_('Purchases', payload); }

function site_storeCatalogSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  site_appendRow_('StoreCatalog', { CatalogId:site_id_('catalog'), ProfileKey:profileKey, Json:site_json_(data.catalog || data), UpdatedAt:site_isoNow_(), UpdatedBy:session.userId });
  return { ok:true, profileKey:profileKey };
}
function site_storeCatalogGet_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload);
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  var row = site_latestRow_('StoreCatalog', function(r){ return r.ProfileKey === profileKey; }, 'UpdatedAt');
  return { ok:true, profileKey:profileKey, catalog:row ? site_parseJson_(row.Json, {}) : {} };
}

/*************** calendar/schedule/tasks ***************/
function site_calendarEventUpsert_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), eid=site_cleanKey_(data.eventId || site_id_('event'));
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  site_appendRow_('CalendarEvents', { EventId:eid, ProfileKey:profileKey, Title:String(data.title || ''), StartAt:String(data.startAt || data.start || ''), EndAt:String(data.endAt || data.end || ''), Recurrence:String(data.recurrence || data.respawn || ''), Category:String(data.category || ''), Source:String(data.source || 'ourspace'), Json:site_json_(data), Active:String(data.active !== false), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  return { ok:true, eventId:eid };
}
function site_calendarEventList_(payload) { return site_listByProfile_('CalendarEvents', payload, function(r){ return String(r.Active) !== 'false'; }); }

function site_scheduleItemUpsert_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), sid=site_cleanKey_(data.scheduleId || site_id_('schedule'));
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  site_appendRow_('ScheduleItems', { ScheduleId:sid, ProfileKey:profileKey, Title:String(data.title || data.task || ''), Respawn:String(data.respawn || data.recurrence || ''), DayOfWeek:String(data.dayOfWeek || ''), TimeOfDay:String(data.timeOfDay || data.time || ''), Category:String(data.category || ''), Json:site_json_(data), Active:String(data.active !== false), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  return { ok:true, scheduleId:sid };
}
function site_scheduleItemList_(payload) { return site_listByProfile_('ScheduleItems', payload, function(r){ return String(r.Active) !== 'false'; }); }

function site_taskComplete_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), cid=site_id_('done');
  var profileKey = site_normalizeProfile_(data.profileKey || session.profileKey);
  site_appendRow_('TaskCompletions', { CompletionId:cid, ProfileKey:profileKey, TaskId:String(data.taskId || ''), Title:String(data.title || data.task || ''), RewardCopper:Number(data.rewardCopper || data.totalCopper || 0), CompletedAt:String(data.completedAt || site_isoNow_()), Json:site_json_(data), CreatedBy:session.userId });
  if (Number(data.rewardCopper || data.totalCopper || 0) > 0) site_currencyLedger_(site_merge_(payload, { data:{ profileKey:profileKey, amountCopper:Number(data.rewardCopper || data.totalCopper), reason:'Task complete: ' + (data.title || data.task || data.taskId), sourceType:'task', sourceId:cid } }), 'earn');
  return { ok:true, completionId:cid };
}

/*************** Onyx alert subscription passthrough storage ***************/
function site_onyxAlertSubscribe_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), sid=site_id_('onyxsub');
  site_appendRow_('OnyxAlertSubscriptions', { SubscriptionId:sid, ProfileKey:session.profileKey, AlertKind:String(data.alertKind || 'general'), DestinationType:String(data.destinationType || 'email'), Destination:String(data.destination || ''), QuietHoursJson:site_json_(data.quietHours || {}), Active:String(data.active !== false), Json:site_json_(data), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_() });
  return { ok:true, subscriptionId:sid };
}
function site_onyxAlertSubscriptionList_(payload) { return site_listByProfile_('OnyxAlertSubscriptions', payload, function(r){ return String(r.Active) !== 'false'; }); }

/*************** generic records ***************/
function site_recordSave_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), rid=site_cleanKey_(data.recordId || site_id_('rec'));
  site_appendRow_('GenericRecords', { RecordId:rid, ProfileKey:site_normalizeProfile_(data.profileKey || session.profileKey), Bucket:String(data.bucket || 'general'), Key:String(data.key || rid), Json:site_json_(data.value !== undefined ? data.value : data), CreatedAt:site_isoNow_(), UpdatedAt:site_isoNow_(), UpdatedBy:session.userId });
  return { ok:true, recordId:rid };
}
function site_recordList_(payload) {
  var session = site_requireSession_(payload), data = site_data_(payload), bucket=String(data.bucket || '');
  var rows = site_getRows_('GenericRecords').filter(function(r){ return r.ProfileKey === session.profileKey && (!bucket || r.Bucket === bucket); }).map(rowPublic_);
  return { ok:true, records:rows };
}

/*************** storage helpers ***************/
function site_ensureDatabase_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SITE_CONFIG.DATABASE_PROPERTY_KEY);
  var ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (err) {} }
  if (!ss) {
    ss = SpreadsheetApp.create('OurSpace Site Backend Database');
    props.setProperty(SITE_CONFIG.DATABASE_PROPERTY_KEY, ss.getId());
  }
  Object.keys(SITE_CONFIG.SHEETS).forEach(function(key){ site_ensureSheet_(SITE_CONFIG.SHEETS[key]); });
  return ss;
}

function site_ensureSheet_(name) {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty(SITE_CONFIG.DATABASE_PROPERTY_KEY));
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var headers = SITE_HEADERS[name] || ['Id','Json','CreatedAt'];
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  else {
    var current = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
    if (String(current[0] || '') !== headers[0]) {
      sh.clear(); sh.appendRow(headers);
    }
  }
  return sh;
}

function site_getRows_(sheetName) {
  var sh = site_ensureSheet_(sheetName);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function(r){ return r.some(function(c){ return c !== ''; }); }).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    return obj;
  });
}

function site_appendRow_(sheetName, obj) {
  var sh = site_ensureSheet_(sheetName);
  var headers = SITE_HEADERS[sheetName] || sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
}

function site_updateRows_(sheetName, predicate, updater) {
  var sh = site_ensureSheet_(sheetName);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return 0;
  var headers = values[0].map(String);
  var count = 0;
  for (var i=1; i<values.length; i++) {
    var obj = {};
    headers.forEach(function(h,j){ obj[h]=values[i][j]; });
    if (predicate(obj)) {
      obj = updater(obj) || obj;
      sh.getRange(i+1,1,1,headers.length).setValues([headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; })]);
      count++;
    }
  }
  return count;
}

function site_latestRow_(sheetName, predicate, dateField) {
  var rows = site_getRows_(sheetName).filter(predicate);
  rows.sort(function(a,b){ return String(b[dateField] || '').localeCompare(String(a[dateField] || '')); });
  return rows[0] || null;
}

function site_ensureUploadFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SITE_CONFIG.DRIVE_FOLDER_PROPERTY_KEY);
  var folder;
  if (id) { try { folder = DriveApp.getFolderById(id); } catch (err) {} }
  if (!folder) {
    folder = DriveApp.createFolder('OurSpace Site Backend Uploads');
    props.setProperty(SITE_CONFIG.DRIVE_FOLDER_PROPERTY_KEY, folder.getId());
  }
  return folder;
}

/*************** utility ***************/
function site_parseRequest_(e) {
  if (!e) return {};
  var p = {};
  if (e.parameter) Object.keys(e.parameter).forEach(function(k){ p[k] = e.parameter[k]; });
  var body = e.postData && e.postData.contents ? e.postData.contents : '';
  if (body) {
    var text = String(body);
    var parsed = null;
    try { parsed = JSON.parse(text); } catch (err) {}
    if (!parsed && p.payload) { try { parsed = JSON.parse(p.payload); } catch (err2) {} }
    if (parsed && typeof parsed === 'object') p = site_merge_(p, parsed);
  } else if (p.payload) {
    try { p = site_merge_(p, JSON.parse(p.payload)); } catch (err3) {}
  }
  if (typeof p.data === 'string') { try { p.data = JSON.parse(p.data); } catch (err4) {} }
  return p;
}

function site_jsonResponse_(obj) {
  var text = JSON.stringify(obj);
  if (OURSPACE_JSONP_CALLBACK) {
    return ContentService.createTextOutput(OURSPACE_JSONP_CALLBACK + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
function site_fail_(err) { return { ok:false, error:String(err && err.message ? err.message : err) }; }
function site_data_(payload) { return payload && typeof payload.data === 'object' && payload.data !== null ? payload.data : payload; }
function site_json_(obj) { return JSON.stringify(obj === undefined ? null : obj); }
function site_parseJson_(text, fallback) { try { return JSON.parse(String(text || '')); } catch (err) { return fallback; } }
function site_merge_(a,b) { var out={}; Object.keys(a||{}).forEach(function(k){out[k]=a[k];}); Object.keys(b||{}).forEach(function(k){out[k]=b[k];}); return out; }
function site_isoNow_() { return new Date().toISOString(); }
function site_id_(prefix) { return prefix + '_' + Utilities.getUuid().replace(/-/g,'').slice(0,18); }
function site_randomToken_(bytes) { return Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'').slice(0, bytes || 16); }
function site_cleanKey_(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100) || site_id_('key'); }
function site_safeFileName_(v) { return String(v || 'file').replace(/[\\/:*?"<>|]+/g,'_').slice(0,160); }
function site_normalizeProfile_(v) { var key=String(v || '').toLowerCase().trim(); if (key === 'dino') key='william'; if (key === 'squishy') key='jasper'; if (SITE_CONFIG.ALLOWED_PROFILES.indexOf(key) === -1) throw new Error('Invalid profileKey: ' + v); return key; }
function site_optionalProfile_(payload) { var v=(site_data_(payload).profileKey || payload.profileKey || payload.profile || ''); return v ? site_normalizeProfile_(v) : ''; }
function site_safeSessionProfile_(payload) { try { return site_requireSession_(payload).profileKey; } catch (err) { return ''; } }
function site_rowPublic_(r) { var out={}; Object.keys(r).forEach(function(k){ if (String(k).match(/Hash|Salt|Token/i)) return; out[k.charAt(0).toLowerCase()+k.slice(1)] = r[k]; }); return out; }
function site_hashPassword_(password, salt) { var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + '::' + String(password)); return Utilities.base64Encode(raw); }
function site_computeBalance_(profileKey) { return site_getRows_('CurrencyLedger').filter(function(r){ return r.ProfileKey === profileKey; }).reduce(function(sum,r){ return sum + Number(r.AmountCopper || 0); }, 0); }
function site_formatCopper_(copper) { var n=Math.round(Number(copper||0)); var sign=n<0?'-':''; n=Math.abs(n); var p=Math.floor(n/1000); n%=1000; var g=Math.floor(n/100); n%=100; var s=Math.floor(n/10); var c=n%10; var parts=[]; if(p)parts.push(p+' platinum'); if(g)parts.push(g+' gold'); if(s)parts.push(s+' silver'); if(c||!parts.length)parts.push(c+' copper'); return sign+parts.join(', '); }
function site_audit_(profileKey, action, detail) { try { site_appendRow_('AuditLog', { AuditId:site_id_('audit'), ProfileKey:profileKey || '', Action:action, Json:site_json_(detail || {}), CreatedAt:site_isoNow_() }); } catch (err) {} }
function site_maskDestination_(value) { var s=String(value||''); return s.replace(/(^.).*(@.*$)/, '$1***$2'); }
function site_maybeEmailPurchase_(profileKey, purchaseId, data, total) {
  try {
    var profile = SITE_CONFIG.PROFILES[profileKey] || {};
    var partnerKey = data.receiptToProfile || profile.defaultPartnerProfile || '';
    var to = data.receiptToEmail || profile.purchaseNotificationRecipient || (SITE_CONFIG.PROFILES[partnerKey] || {}).primaryEmail || '';
    if (!to) return;
    var purchaser = profile.lineName || profile.displayName || profileKey;
    var receiver = (SITE_CONFIG.PROFILES[partnerKey] || {}).lineName || partnerKey || 'partner';
    var items = data.items || [];
    var lines = [];
    lines.push('OurSpace purchase receipt');
    lines.push('Purchase ID: ' + purchaseId);
    lines.push('Purchaser: ' + purchaser + ' (' + profileKey + ')');
    lines.push('Receipt for: ' + receiver + (partnerKey ? ' (' + partnerKey + ')' : ''));
    lines.push('Store: ' + String(data.storeName || data.app || 'OurSpace Store'));
    lines.push('Total: ' + site_formatCopper_(total) + ' / ' + total + ' copper');
    lines.push('');
    lines.push('Items:');
    if (!items.length) lines.push('- No item details supplied.');
    items.forEach(function(item){
      lines.push('- ' + Number(item.quantity || 1) + ' × ' + String(item.name || item.id || 'Item') + ' = ' + Number(item.totalCopper || item.totalCostCopper || 0) + ' copper');
    });
    if (data.note) { lines.push(''); lines.push('Note: ' + String(data.note)); }
    if (data.checkoutText) { lines.push(''); lines.push('Checkout text:'); lines.push(String(data.checkoutText)); }
    MailApp.sendEmail(to, 'OurSpace purchase receipt: ' + purchaser + ' → ' + receiver, lines.join('\n'));
  } catch (err) {}
}



/* ==========================================================================
 * OurSpace private gift/link-share backend (prefixed with link_)
 * ========================================================================== */

/**
 * OurSpace Link Share + Private Gift Backend
 * Google Apps Script / Web App backend
 *
 * What this does:
 * - Keeps the private OurSpace site member-only for exactly two approved people.
 * - Provides one public-facing share page that only shows approved links/items.
 * - Stores private shipping/address information in the backend only.
 * - Never returns address data to public routes, public link pages, public JSON, or buyer emails.
 * - Lets public visitors submit a private gift/purchase request without seeing private site pages.
 *
 * Important privacy note:
 * A Google Apps Script backend cannot force Walmart or another outside retailer to hide an address
 * if a visitor checks out directly on that retailer's website. This backend protects your address
 * by never exposing it publicly. For true direct-to-you shipping without address disclosure, use
 * an official registry/wishlist address-masking feature or have the private OurSpace member fulfill
 * the order from inside the private site.
 *
 * Deploy recommended:
 * 1) Paste this file into Apps Script as Code.gs.
 * 2) Run OURSPACE_CREATE_BACKEND_SPREADSHEET once.
 * 3) Edit passcodes inside OURSPACE_SET_PASSCODES_ONCE, run it once, then erase the passcodes.
 * 4) Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) Use doPost private actions from your OurSpace private site.
 * 6) Share only the URL returned by getPublicShareUrl / action=share&share_id=...
 */

var OURSPACE_BACKEND = Object.freeze({
  appName: 'OurSpace',
  version: '2026-06-25',

  // Only these two people may log into private routes.
  members: [
    { key: 'william', displayName: 'William / Dino', email: 'williamsaville92@gmail.com' },
    { key: 'jasper', displayName: 'Jasper / Squishy', email: 'jasperfaye99@gmail.com' }
  ],

  // Public branding for the shared link page.
  publicShareTitle: 'OurSpace Shared Links',
  publicShareSubtitle: 'Only shared links are visible here. Private OurSpace pages stay locked.',

  // ScriptProperties keys.
  props: {
    dbId: 'OURSPACE_DB_SPREADSHEET_ID',
    shareId: 'OURSPACE_PUBLIC_SHARE_ID',
    passHashPrefix: 'OURSPACE_MEMBER_PASS_SHA256_',
    setupComplete: 'OURSPACE_SETUP_COMPLETE'
  },

  sheets: {
    links: 'PublicLinks',
    requests: 'PurchaseRequests',
    addresses: 'PrivateAddresses',
    audit: 'LinkShareAuditLog'
  },

  sessionHours: 8,
  maxPublicLinks: 500,
  maxRequestsToReturn: 200,

  // Email notifications go to both OurSpace members by default.
  notifyEmails: 'williamsaville92@gmail.com,jasperfaye99@gmail.com'
});

/**
 * FIRST RUN: creates the private spreadsheet database and share id.
 * Run this manually from Apps Script editor before deploying.
 */
function link_OURSPACE_CREATE_BACKEND_SPREADSHEET() {
  // Preserved legacy helper: use the unified OurSpace setup so all three backends share one database.
  return OURSPACE_CREATE_BACKEND_SPREADSHEET();
}

/**
 * SECOND RUN: set private login passcodes.
 * Edit the two placeholder passcodes below, run once, then replace them with placeholders again.
 * The script stores SHA-256 hashes, not plaintext passcodes.
 */
function link_OURSPACE_SET_PASSCODES_ONCE() {
  var WILLIAM_PASSCODE = 'REPLACE_WITH_WILLIAM_PRIVATE_PASSCODE';
  var JASPER_PASSCODE = 'REPLACE_WITH_JASPER_PRIVATE_PASSCODE';

  if (WILLIAM_PASSCODE.indexOf('REPLACE_WITH_') === 0 || JASPER_PASSCODE.indexOf('REPLACE_WITH_') === 0) {
    throw new Error('Edit WILLIAM_PASSCODE and JASPER_PASSCODE first, run once, then erase them again.');
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty(OURSPACE_BACKEND.props.passHashPrefix + 'william', link_sha256Hex_(WILLIAM_PASSCODE));
  props.setProperty(OURSPACE_BACKEND.props.passHashPrefix + 'jasper', link_sha256Hex_(JASPER_PASSCODE));
  link_writeAudit_('system', 'setPasscodes', { members: ['william', 'jasper'] });
  return { ok: true, message: 'Passcodes stored as SHA-256 hashes. Erase plaintext passcodes from this function now.' };
}

/**
 * Optional: add a starter item so the public page is not empty during testing.
 */
function link_OURSPACE_ADD_DEMO_LINK_OPTIONAL() {
  var item = {
    ownerKey: 'shared',
    title: 'Example wishlist link',
    label: 'Wishlist',
    url: 'https://example.com/',
    imageUrl: '',
    priceNote: '',
    public: true,
    sortOrder: 10,
    notes: 'Replace or delete this from the private OurSpace site.'
  };
  return link_upsertPublicLink_({ key: 'system', displayName: 'System' }, item);
}

/**
 * Public/private Web App GET entry.
 */
function link_doGet(e) {
  try {
    var action = String((e && e.parameter && e.parameter.action) || '').trim();

    if (action === 'health') {
      return link_json_({ ok: true, app: OURSPACE_BACKEND.appName, version: OURSPACE_BACKEND.version });
    }

    if (action === 'publicLinks') {
      var shareIdJson = String((e && e.parameter && (e.parameter.share_id || e.parameter.shareId)) || '');
      return link_json_(link_getPublicLinksResponse_(shareIdJson));
    }

    if (action === 'share') {
      var shareId = String((e && e.parameter && (e.parameter.share_id || e.parameter.shareId)) || '');
      return link_html_(link_renderPublicSharePage_(shareId));
    }

    // There is deliberately no private-page GET route.
    return link_html_(link_renderLockedPage_('This OurSpace backend only exposes the shared links page.'));
  } catch (err) {
    return link_html_(link_renderErrorPage_(err));
  }
}

/**
 * Public/private Web App POST entry.
 * Accepts JSON body or normal HTML form posts.
 */
function link_doPost(e) {
  try {
    var payload = link_parsePayload_(e);
    var action = String(payload.action || '').trim();

    if (action === 'login') return link_json_(link_handleLogin_(payload));
    if (action === 'logout') return link_json_(link_handleLogout_(payload));
    if (action === 'publicPurchaseRequest') return link_handlePublicPurchaseRequest_(payload, e);

    // Everything below is private-member only.
    var member = link_requireMember_(payload);

    if (action === 'whoami') return link_json_({ ok: true, member: link_publicMember_(member), publicShareUrl: link_publicShareUrl_() });
    if (action === 'getPublicShareUrl') return link_json_({ ok: true, publicShareUrl: link_publicShareUrl_(), shareId: link_getOrCreateShareId_() });
    if (action === 'rotateShareId') return link_json_(link_rotateShareId_(member));

    if (action === 'savePrivateAddress') return link_json_(link_savePrivateAddress_(member, payload.address || payload));
    if (action === 'getMyPrivateAddress') return link_json_(link_getPrivateAddress_(member));

    if (action === 'upsertPublicLink') return link_json_(link_upsertPublicLink_(member, payload.link || payload));
    if (action === 'deletePublicLink') return link_json_(link_deletePublicLink_(member, payload.itemId || payload.id));
    if (action === 'listMyLinks') return link_json_(link_listLinksForPrivateMember_(member));

    if (action === 'listPurchaseRequests') return link_json_(link_listPurchaseRequests_(member));
    if (action === 'updatePurchaseRequestStatus') {
      return link_json_(link_updatePurchaseRequestStatus_(member, payload.requestId, payload.status));
    }

    return link_json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    var wantsHtml = link_isProbablyFormPost_(e);
    if (wantsHtml) return link_html_(link_renderErrorPage_(err));
    return link_json_({ ok: false, error: link_safeError_(err) });
  }
}

/**
 * Best-effort CORS preflight response for front-end integrations.
 * Apps Script support varies by deployment, so same-origin HTML forms are also supported.
 */
function link_doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/* -------------------------------------------------------------------------- */
/* Private actions                                                             */
/* -------------------------------------------------------------------------- */

function link_handleLogin_(payload) {
  var email = link_normalizeEmail_(payload.email);
  var passcode = String(payload.passcode || payload.password || '');
  var member = link_memberByEmail_(email);
  if (!member) return { ok: false, error: 'Login is restricted to the two OurSpace members.' };

  var expectedHash = PropertiesService.getScriptProperties().getProperty(
    OURSPACE_BACKEND.props.passHashPrefix + member.key
  );
  if (!expectedHash) return { ok: false, error: 'Passcode has not been set for this member yet.' };
  if (link_sha256Hex_(passcode) !== expectedHash) return { ok: false, error: 'Invalid email or passcode.' };

  var token = link_createId_('session') + '.' + link_createId_('token');
  var tokenHash = link_sha256Hex_(token);
  var sessionRecord = {
    key: member.key,
    displayName: member.displayName,
    email: member.email,
    createdAt: new Date().toISOString()
  };

  CacheService.getScriptCache().put(
    'session:' + tokenHash,
    JSON.stringify(sessionRecord),
    OURSPACE_BACKEND.sessionHours * 60 * 60
  );

  link_writeAudit_(member.key, 'login', { email: member.email });

  return {
    ok: true,
    sessionToken: token,
    expiresInHours: OURSPACE_BACKEND.sessionHours,
    member: link_publicMember_(member),
    publicShareUrl: link_publicShareUrl_()
  };
}

function link_handleLogout_(payload) {
  var token = String(payload.sessionToken || payload.session_token || payload.token || '');
  if (token) CacheService.getScriptCache().remove('session:' + link_sha256Hex_(token));
  return { ok: true };
}

function link_savePrivateAddress_(member, addressPayload) {
  var address = link_normalizeAddress_(addressPayload);
  var ss = link_getDb_();
  var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.addresses);
  var rows = link_sheetToObjects_(sheet);
  var rowIndex = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].memberKey === member.key) {
      rowIndex = i + 2;
      break;
    }
  }

  var values = [member.key, member.displayName, JSON.stringify(address), new Date().toISOString()];
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);

  link_writeAudit_(member.key, 'savePrivateAddress', { memberKey: member.key, fields: Object.keys(address) });

  return {
    ok: true,
    message: 'Private address saved. It is available only to logged-in OurSpace members and is never returned by public routes.',
    member: link_publicMember_(member)
  };
}

function link_getPrivateAddress_(member) {
  var ss = link_getDb_();
  var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.addresses);
  var rows = link_sheetToObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].memberKey === member.key) {
      return {
        ok: true,
        member: link_publicMember_(member),
        address: link_parseJsonSafe_(rows[i].addressJson, {}),
        updatedAt: rows[i].updatedAt || ''
      };
    }
  }
  return { ok: true, member: link_publicMember_(member), address: null, updatedAt: '' };
}

function link_upsertPublicLink_(member, linkPayload) {
  var link = link_normalizeLink_(linkPayload);
  var ss = link_getDb_();
  var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.links);
  var rows = link_sheetToObjects_(sheet);
  var now = new Date().toISOString();
  var id = link.id || link_createId_('item');

  var publicCount = 0;
  for (var c = 0; c < rows.length; c++) {
    if (link_isTruthy_(rows[c].public)) publicCount++;
  }
  if (!link.id && publicCount >= OURSPACE_BACKEND.maxPublicLinks) {
    throw new Error('Public link limit reached. Delete old items before adding more.');
  }

  var rowIndex = -1;
  var createdAt = now;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      rowIndex = i + 2;
      createdAt = rows[i].createdAt || now;
      break;
    }
  }

  var values = [
    id,
    link.ownerKey,
    link.title,
    link.label,
    link.url,
    link.imageUrl,
    link.priceNote,
    link.public ? 'TRUE' : 'FALSE',
    link.sortOrder,
    link.notes,
    createdAt,
    now
  ];

  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);

  link_writeAudit_(member.key, 'upsertPublicLink', { id: id, title: link.title, public: link.public });

  return { ok: true, link: link_objectFromHeaders_(link_getHeaders_(sheet), values), publicShareUrl: link_publicShareUrl_() };
}

function link_deletePublicLink_(member, itemId) {
  itemId = String(itemId || '').trim();
  if (!itemId) throw new Error('Missing item id.');
  var ss = link_getDb_();
  var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.links);
  var rows = link_sheetToObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === itemId) {
      sheet.deleteRow(i + 2);
      link_writeAudit_(member.key, 'deletePublicLink', { id: itemId });
      return { ok: true, deleted: itemId };
    }
  }
  return { ok: false, error: 'Item was not found.' };
}

function link_listLinksForPrivateMember_(member) {
  var ss = link_getDb_();
  var rows = link_sheetToObjects_(ss.getSheetByName(OURSPACE_BACKEND.sheets.links));
  rows.sort(sortLinks_);
  return { ok: true, member: link_publicMember_(member), links: rows, publicShareUrl: link_publicShareUrl_() };
}

function link_listPurchaseRequests_(member) {
  var ss = link_getDb_();
  var rows = link_sheetToObjects_(ss.getSheetByName(OURSPACE_BACKEND.sheets.requests));
  rows.sort(function(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
  if (rows.length > OURSPACE_BACKEND.maxRequestsToReturn) rows = rows.slice(0, OURSPACE_BACKEND.maxRequestsToReturn);
  return { ok: true, member: link_publicMember_(member), requests: rows };
}

function link_updatePurchaseRequestStatus_(member, requestId, status) {
  requestId = String(requestId || '').trim();
  status = link_sanitizeString_(status || 'open', 40);
  if (!requestId) throw new Error('Missing request id.');

  var ss = link_getDb_();
  var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.requests);
  var rows = link_sheetToObjects_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].requestId === requestId) {
      var headers = link_getHeaders_(sheet);
      var statusCol = headers.indexOf('status') + 1;
      var updatedCol = headers.indexOf('updatedAt') + 1;
      sheet.getRange(i + 2, statusCol).setValue(status);
      sheet.getRange(i + 2, updatedCol).setValue(new Date().toISOString());
      link_writeAudit_(member.key, 'updatePurchaseRequestStatus', { requestId: requestId, status: status });
      return { ok: true, requestId: requestId, status: status };
    }
  }
  return { ok: false, error: 'Request not found.' };
}

function link_rotateShareId_(member) {
  var newShareId = link_createId_('share');
  PropertiesService.getScriptProperties().setProperty(OURSPACE_BACKEND.props.shareId, newShareId);
  link_writeAudit_(member.key, 'rotateShareId', { shareId: newShareId });
  return { ok: true, shareId: newShareId, publicShareUrl: link_publicShareUrl_() };
}

/* -------------------------------------------------------------------------- */
/* Public actions                                                              */
/* -------------------------------------------------------------------------- */

function link_getPublicLinksResponse_(shareId) {
  if (!link_isValidShareId_(shareId)) return { ok: false, error: 'This shared link is invalid or has been rotated.' };
  var rows = link_publicLinks_();
  return {
    ok: true,
    title: OURSPACE_BACKEND.publicShareTitle,
    subtitle: OURSPACE_BACKEND.publicShareSubtitle,
    links: rows.map(publicLink_),
    count: rows.length
  };
}

function link_handlePublicPurchaseRequest_(payload, e) {
  var shareId = String(payload.share_id || payload.shareId || '').trim();
  if (!link_isValidShareId_(shareId)) throw new Error('This shared link is invalid or has been rotated.');

  var itemId = String(payload.item_id || payload.itemId || '').trim();
  if (!itemId) throw new Error('Missing item id.');

  var item = link_findPublicLinkById_(itemId);
  if (!item) throw new Error('That item is no longer shared.');

  var buyerName = link_sanitizeString_(payload.buyer_name || payload.buyerName || 'Anonymous', 120);
  var buyerEmail = link_normalizeEmail_(payload.buyer_email || payload.buyerEmail || '');
  var buyerNote = link_sanitizeString_(payload.buyer_note || payload.buyerNote || '', 1000);
  if (!buyerEmail) throw new Error('Please include an email so OurSpace can follow up.');

  var requestId = link_createId_('request');
  var now = new Date().toISOString();
  var ss = link_getDb_();
  ss.getSheetByName(OURSPACE_BACKEND.sheets.requests).appendRow([
    requestId,
    shareId,
    item.id,
    item.title,
    item.url,
    buyerName,
    buyerEmail,
    buyerNote,
    'open',
    now,
    now
  ]);

  link_writeAudit_('public', 'publicPurchaseRequest', {
    requestId: requestId,
    itemId: item.id,
    itemTitle: item.title,
    buyerEmail: buyerEmail
  });

  link_sendPurchaseRequestEmails_(requestId, item, buyerName, buyerEmail, buyerNote);

  var response = {
    ok: true,
    requestId: requestId,
    message: 'Request sent. The private address was not shown or emailed to you.'
  };

  if (link_isProbablyFormPost_(e)) {
    return link_html_(link_renderThankYouPage_(response, item));
  }
  return link_json_(response);
}

function link_publicLinks_() {
  var ss = link_getDb_();
  var rows = link_sheetToObjects_(ss.getSheetByName(OURSPACE_BACKEND.sheets.links));
  rows = rows.filter(function(row) { return link_isTruthy_(row.public) && link_safeUrl_(row.url); });
  rows.sort(sortLinks_);
  return rows;
}

function link_findPublicLinkById_(itemId) {
  var rows = link_publicLinks_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === itemId) return rows[i];
  }
  return null;
}

function link_publicLink_(row) {
  return {
    id: row.id,
    ownerKey: row.ownerKey,
    title: row.title,
    label: row.label,
    url: row.url,
    imageUrl: row.imageUrl,
    priceNote: row.priceNote,
    notes: row.notes
  };
}

function link_sendPurchaseRequestEmails_(requestId, item, buyerName, buyerEmail, buyerNote) {
  var subject = 'OurSpace gift request: ' + item.title;
  var body = [
    'A public OurSpace visitor sent a gift/purchase request.',
    '',
    'Request ID: ' + requestId,
    'Item: ' + item.title,
    'Link: ' + item.url,
    'Buyer name: ' + buyerName,
    'Buyer email: ' + buyerEmail,
    'Note: ' + (buyerNote || '(none)'),
    '',
    'Privacy: the saved private address was not included in this email and was not shown publicly.',
    'Open the private OurSpace site and use the logged-in backend route if you need to view saved private fulfillment details.'
  ].join('\n');

  MailApp.sendEmail({
    to: OURSPACE_BACKEND.notifyEmails,
    subject: subject,
    body: body,
    noReply: true
  });

  // Buyer receipt. No address, no private site details.
  MailApp.sendEmail({
    to: buyerEmail,
    subject: 'OurSpace request received: ' + item.title,
    body: [
      'Your OurSpace gift/purchase request was received.',
      '',
      'Request ID: ' + requestId,
      'Item: ' + item.title,
      '',
      'The private shipping/address details were not shared by this system.'
    ].join('\n'),
    noReply: true
  });
}

/* -------------------------------------------------------------------------- */
/* Rendered public pages                                                       */
/* -------------------------------------------------------------------------- */

function link_renderPublicSharePage_(shareId) {
  if (!link_isValidShareId_(shareId)) return link_renderLockedPage_('This shared link is invalid or has been rotated.');

  var links = link_publicLinks_();
  var formAction = ScriptApp.getService().getUrl();
  var cards = links.map(function(item) {
    var image = link_safeUrl_(item.imageUrl)
      ? '<img class="item-img" src="' + link_escAttr_(item.imageUrl) + '" alt="" loading="lazy">'
      : '<div class="item-img placeholder">♡</div>';

    var price = item.priceNote ? '<p class="price">' + link_esc_(item.priceNote) + '</p>' : '';
    var label = item.label ? '<span class="label">' + link_esc_(item.label) + '</span>' : '';
    var notes = item.notes ? '<p class="notes">' + link_esc_(item.notes) + '</p>' : '';

    return [
      '<article class="card">',
      image,
      '<div class="card-body">',
      label,
      '<h2>' + link_esc_(item.title) + '</h2>',
      price,
      notes,
      '<div class="actions">',
      '<a class="open-link" href="' + link_escAttr_(item.url) + '" target="_blank" rel="noopener noreferrer">Open item link</a>',
      '</div>',
      '<details class="request-box">',
      '<summary>Buy / gift privately</summary>',
      '<form method="post" action="' + link_escAttr_(formAction) + '" target="_blank">',
      '<input type="hidden" name="action" value="publicPurchaseRequest">',
      '<input type="hidden" name="share_id" value="' + link_escAttr_(shareId) + '">',
      '<input type="hidden" name="item_id" value="' + link_escAttr_(item.id) + '">',
      '<label>Your name<input name="buyer_name" autocomplete="name" required></label>',
      '<label>Your email<input name="buyer_email" type="email" autocomplete="email" required></label>',
      '<label>Note<textarea name="buyer_note" rows="3" placeholder="Optional"></textarea></label>',
      '<button type="submit">Send private request</button>',
      '</form>',
      '<p class="tiny">This sends a request to OurSpace members. It does not reveal any private address.</p>',
      '</details>',
      '</div>',
      '</article>'
    ].join('');
  }).join('\n');

  if (!cards) {
    cards = '<div class="empty">No links are public right now.</div>';
  }

  return link_baseHtml_(
    link_esc_(OURSPACE_BACKEND.publicShareTitle),
    [
      '<main class="shell">',
      '<header class="hero">',
      '<div class="badge">OurSpace</div>',
      '<h1>' + link_esc_(OURSPACE_BACKEND.publicShareTitle) + '</h1>',
      '<p>' + link_esc_(OURSPACE_BACKEND.publicShareSubtitle) + '</p>',
      '</header>',
      '<section class="grid">' + cards + '</section>',
      '<footer>Private pages, profiles, schedules, stores, addresses, and member tools are not available from this shared link.</footer>',
      '</main>'
    ].join('\n')
  );
}

function link_renderLockedPage_(message) {
  return link_baseHtml_('OurSpace Locked', [
    '<main class="shell locked">',
    '<div class="badge">OurSpace</div>',
    '<h1>Private site locked</h1>',
    '<p>' + link_esc_(message || 'This route is not public.') + '</p>',
    '</main>'
  ].join('\n'));
}

function link_renderThankYouPage_(response, item) {
  return link_baseHtml_('Request sent', [
    '<main class="shell locked">',
    '<div class="badge">OurSpace</div>',
    '<h1>Request sent</h1>',
    '<p>Your request for <strong>' + link_esc_(item.title) + '</strong> was sent.</p>',
    '<p class="tiny">Request ID: ' + link_esc_(response.requestId) + '</p>',
    '<p>No private address was shown or emailed to you.</p>',
    '</main>'
  ].join('\n'));
}

function link_renderErrorPage_(err) {
  return link_baseHtml_('OurSpace Error', [
    '<main class="shell locked">',
    '<div class="badge">OurSpace</div>',
    '<h1>Something went wrong</h1>',
    '<p>' + link_esc_(link_safeError_(err)) + '</p>',
    '</main>'
  ].join('\n'));
}

function link_baseHtml_(title, body) {
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + link_esc_(title) + '</title>'
    + '<style>'
    + ':root{--cyan:#00ffff;--orange:#CA6309;--bg:#090b12;--card:#141829;--ink:#f7fbff;--muted:#b9c2cf;--line:rgba(255,255,255,.16)}'
    + '*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at top left,rgba(0,255,255,.18),transparent 35%),radial-gradient(circle at bottom right,rgba(202,99,9,.22),transparent 40%),var(--bg);color:var(--ink)}'
    + 'a{color:inherit}.shell{width:min(1050px,94vw);margin:0 auto;padding:38px 0 28px}.hero{padding:26px;border:1px solid var(--line);border-radius:28px;background:rgba(20,24,41,.82);box-shadow:0 20px 70px rgba(0,0,0,.35)}'
    + '.badge{display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(0,255,255,.55);color:var(--cyan);border-radius:999px;padding:6px 12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:12px;background:rgba(0,255,255,.08)}'
    + 'h1{font-size:clamp(32px,7vw,62px);margin:14px 0 8px;line-height:1}p{color:var(--muted);line-height:1.55}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:20px}.card{overflow:hidden;border-radius:24px;border:1px solid var(--line);background:rgba(20,24,41,.88);box-shadow:0 16px 45px rgba(0,0,0,.28)}'
    + '.item-img{width:100%;height:175px;object-fit:cover;background:#0d1020;display:grid;place-items:center;font-size:54px;color:var(--cyan)}.card-body{padding:18px}.label{display:inline-block;border:1px solid rgba(202,99,9,.65);color:#ffd7b4;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700}.card h2{margin:10px 0 6px;font-size:22px}.price{font-weight:800;color:var(--cyan)}.notes{white-space:pre-wrap}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.open-link,button{border:0;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;text-decoration:none;background:linear-gradient(135deg,var(--cyan),#ffffff);color:#061014}.request-box{border-top:1px solid var(--line);padding-top:12px;margin-top:8px}.request-box summary{cursor:pointer;font-weight:800;color:#ffd7b4}label{display:grid;gap:6px;margin:10px 0;color:var(--muted);font-weight:700}input,textarea{width:100%;border:1px solid var(--line);border-radius:12px;padding:11px;background:#0d1020;color:var(--ink)}.tiny{font-size:12px}.empty,.locked{padding:26px;border:1px solid var(--line);border-radius:24px;background:rgba(20,24,41,.82)}footer{text-align:center;color:var(--muted);font-size:13px;margin:26px 0}'
    + '</style></head><body>' + body + '</body></html>';
}

/* -------------------------------------------------------------------------- */
/* Database helpers                                                            */
/* -------------------------------------------------------------------------- */

function link_getDb_() {
  return ourspace_ensureUnifiedDatabaseAndLinkSheets_();
}

function link_setupSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function link_getHeaders_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || '').trim(); });
}

function link_sheetToObjects_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var headers = link_getHeaders_(sheet);
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values.map(function(row) { return link_objectFromHeaders_(headers, row); });
}

function link_objectFromHeaders_(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}

function link_writeAudit_(actorKey, action, detail) {
  try {
    var ss = link_getDb_();
    var sheet = ss.getSheetByName(OURSPACE_BACKEND.sheets.audit);
    if (!sheet) return;
    sheet.appendRow([new Date().toISOString(), actorKey || '', action || '', JSON.stringify(detail || {})]);
  } catch (err) {
    // Auditing must never break user actions.
  }
}

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                                */
/* -------------------------------------------------------------------------- */

function link_requireMember_(payload) {
  var token = String(payload.sessionToken || payload.session_token || payload.token || '').trim();
  if (!token) throw new Error('Missing private OurSpace session token.');
  var tokenHash = link_sha256Hex_(token);
  var cached = CacheService.getScriptCache().get('session:' + tokenHash);
  if (!cached) throw new Error('Your private OurSpace session expired. Please log in again.');
  var record = link_parseJsonSafe_(cached, null);
  if (!record || !link_memberByKey_(record.key)) throw new Error('Invalid private OurSpace session.');
  return link_memberByKey_(record.key);
}

function link_memberByEmail_(email) {
  email = link_normalizeEmail_(email);
  for (var i = 0; i < OURSPACE_BACKEND.members.length; i++) {
    if (link_normalizeEmail_(OURSPACE_BACKEND.members[i].email) === email) return OURSPACE_BACKEND.members[i];
  }
  return null;
}

function link_memberByKey_(key) {
  key = String(key || '').toLowerCase();
  for (var i = 0; i < OURSPACE_BACKEND.members.length; i++) {
    if (OURSPACE_BACKEND.members[i].key === key) return OURSPACE_BACKEND.members[i];
  }
  return null;
}

function link_publicMember_(member) {
  return { key: member.key, displayName: member.displayName, email: member.email };
}

/* -------------------------------------------------------------------------- */
/* Validation / normalization                                                  */
/* -------------------------------------------------------------------------- */

function link_normalizeLink_(payload) {
  payload = payload || {};
  var url = link_safeUrl_(payload.url || payload.href || payload.link);
  if (!url) throw new Error('A valid http/https URL is required.');
  var ownerKey = link_sanitizeOwnerKey_(payload.ownerKey || payload.owner || 'shared');
  var title = link_sanitizeString_(payload.title || payload.name || 'Untitled link', 160);
  if (!title) throw new Error('A title is required.');
  return {
    id: link_sanitizeId_(payload.id || payload.itemId || ''),
    ownerKey: ownerKey,
    title: title,
    label: link_sanitizeString_(payload.label || payload.category || 'Links', 80),
    url: url,
    imageUrl: link_safeUrl_(payload.imageUrl || payload.image || ''),
    priceNote: link_sanitizeString_(payload.priceNote || payload.price || '', 80),
    public: payload.public === undefined ? true : link_isTruthy_(payload.public),
    sortOrder: Number(payload.sortOrder || payload.order || 1000) || 1000,
    notes: link_sanitizeString_(payload.notes || payload.description || '', 1000)
  };
}

function link_normalizeAddress_(payload) {
  payload = payload || {};
  var address = {
    recipientName: link_sanitizeString_(payload.recipientName || payload.name || '', 120),
    line1: link_sanitizeString_(payload.line1 || payload.address1 || '', 180),
    line2: link_sanitizeString_(payload.line2 || payload.address2 || '', 180),
    city: link_sanitizeString_(payload.city || '', 100),
    state: link_sanitizeString_(payload.state || payload.region || '', 80),
    postalCode: link_sanitizeString_(payload.postalCode || payload.zip || payload.zipCode || '', 40),
    country: link_sanitizeString_(payload.country || 'US', 80),
    deliveryNotes: link_sanitizeString_(payload.deliveryNotes || payload.notes || '', 800)
  };

  if (!address.recipientName || !address.line1 || !address.city || !address.state || !address.postalCode) {
    throw new Error('Address needs recipientName, line1, city, state, and postalCode.');
  }
  return address;
}

function link_sanitizeOwnerKey_(value) {
  value = String(value || 'shared').toLowerCase().trim();
  if (value === 'william' || value === 'dino') return 'william';
  if (value === 'jasper' || value === 'squishy') return 'jasper';
  return 'shared';
}

function link_sanitizeId_(value) {
  value = String(value || '').trim();
  value = value.replace(/[^a-zA-Z0-9_-]/g, '');
  return value.slice(0, 80);
}

function link_sanitizeString_(value, maxLen) {
  value = String(value === undefined || value === null ? '' : value);
  value = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (maxLen && value.length > maxLen) value = value.slice(0, maxLen);
  return value;
}

function link_normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function link_safeUrl_(url) {
  url = String(url || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return '';
  return url.slice(0, 2000);
}

function link_isTruthy_(value) {
  if (value === true) return true;
  var s = String(value || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

function link_sortLinks_(a, b) {
  var ao = Number(a.sortOrder || 1000) || 1000;
  var bo = Number(b.sortOrder || 1000) || 1000;
  if (ao !== bo) return ao - bo;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

/* -------------------------------------------------------------------------- */
/* Share URL helpers                                                           */
/* -------------------------------------------------------------------------- */

function link_getOrCreateShareId_() {
  var props = PropertiesService.getScriptProperties();
  var shareId = props.getProperty(OURSPACE_BACKEND.props.shareId);
  if (!shareId) {
    shareId = link_createId_('share');
    props.setProperty(OURSPACE_BACKEND.props.shareId, shareId);
  }
  return shareId;
}

function link_isValidShareId_(shareId) {
  return String(shareId || '') === String(link_getOrCreateShareId_());
}

function link_publicShareUrl_() {
  return ScriptApp.getService().getUrl() + '?action=share&share_id=' + encodeURIComponent(link_getOrCreateShareId_());
}

/* -------------------------------------------------------------------------- */
/* Payload / output helpers                                                    */
/* -------------------------------------------------------------------------- */

function link_parsePayload_(e) {
  var payload = {};
  if (e && e.postData && e.postData.contents) {
    var raw = String(e.postData.contents || '');
    var type = String(e.postData.type || '');
    if (/json/i.test(type) || /^\s*[\{\[]/.test(raw)) {
      payload = link_parseJsonSafe_(raw, {});
    }
  }

  if ((!payload || Object.keys(payload).length === 0) && e && e.parameter) {
    Object.keys(e.parameter).forEach(function(k) { payload[k] = e.parameter[k]; });
  }

  if (payload.payload) {
    var nested = link_parseJsonSafe_(payload.payload, null);
    if (nested) payload = nested;
  }

  if (payload.address_json && !payload.address) payload.address = link_parseJsonSafe_(payload.address_json, {});
  if (payload.link_json && !payload.link) payload.link = link_parseJsonSafe_(payload.link_json, {});

  return payload || {};
}

function link_isProbablyFormPost_(e) {
  var type = String((e && e.postData && e.postData.type) || '');
  return type.indexOf('application/x-www-form-urlencoded') > -1 || type.indexOf('multipart/form-data') > -1;
}

function link_json_(obj) {
  var text = JSON.stringify(obj, null, 2);
  if (OURSPACE_JSONP_CALLBACK) {
    return ContentService.createTextOutput(OURSPACE_JSONP_CALLBACK + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function link_html_(markup) {
  return HtmlService.createHtmlOutput(markup)
    .setTitle(OURSPACE_BACKEND.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function link_parseJsonSafe_(text, fallback) {
  try { return JSON.parse(String(text || '')); }
  catch (err) { return fallback; }
}

function link_safeError_(err) {
  return link_sanitizeString_((err && err.message) ? err.message : String(err || 'Unknown error'), 500);
}

/* -------------------------------------------------------------------------- */
/* Crypto / escaping helpers                                                   */
/* -------------------------------------------------------------------------- */

function link_createId_(prefix) {
  return String(prefix || 'id') + '_' + Utilities.getUuid().replace(/-/g, '') + '_' + Date.now().toString(36);
}

function link_sha256Hex_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function link_esc_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function link_escAttr_(value) {
  return link_esc_(value).replace(/`/g, '&#96;');
}

/* -------------------------------------------------------------------------- */
/* Private OurSpace front-end snippets                                         */
/* -------------------------------------------------------------------------- */

/**
 * Private site login example:
 *
 * fetch(SCRIPT_URL, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'text/plain;charset=utf-8' },
 *   body: JSON.stringify({
 *     action: 'login',
 *     email: emailInput.value,
 *     passcode: passcodeInput.value
 *   })
 * }).then(r => r.json()).then(data => {
 *   if (data.ok) localStorage.setItem('ourspace_session_token', data.sessionToken);
 * });
 *
 * Add/update a public link from private OurSpace:
 *
 * fetch(SCRIPT_URL, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'text/plain;charset=utf-8' },
 *   body: JSON.stringify({
 *     action: 'upsertPublicLink',
 *     sessionToken: localStorage.getItem('ourspace_session_token'),
 *     link: {
 *       ownerKey: 'william',
 *       title: 'Example Walmart item',
 *       label: 'Dino wishlist',
 *       url: 'https://www.walmart.com/',
 *       imageUrl: '',
 *       priceNote: '$',
 *       public: true,
 *       sortOrder: 10,
 *       notes: 'Visible on public share page.'
 *     }
 *   })
 * }).then(r => r.json()).then(console.log);
 *
 * Save private address from private OurSpace only:
 *
 * fetch(SCRIPT_URL, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'text/plain;charset=utf-8' },
 *   body: JSON.stringify({
 *     action: 'savePrivateAddress',
 *     sessionToken: localStorage.getItem('ourspace_session_token'),
 *     address: {
 *       recipientName: 'Private recipient name',
 *       line1: 'Private address line 1',
 *       line2: '',
 *       city: 'Private city',
 *       state: 'Private state',
 *       postalCode: 'Private zip',
 *       country: 'US',
 *       deliveryNotes: 'Private notes only members can retrieve.'
 *     }
 *   })
 * }).then(r => r.json()).then(console.log);
 */


/* ==========================================================================
 * OurSpace legacy social-app compatibility backend (prefixed with social_)
 * ========================================================================== */

/**
 * OurSpace Shared Google Apps Script Backend
 * --------------------------------------------------
 * Copy this entire file into a new Google Apps Script project, run social_setup(), then deploy as a Web app.
 * Deploy settings recommended for a private friend/family network:
 *   Execute as: Me
 *   Who has access: Anyone with the link
 *
 * The browser site supplies its own projectId, so this one Apps Script deployment can be reused by
 * multiple separate projects/sites. The backend stores each project separately in the same spreadsheet.
 *
 * Current deployed web app URL embedded in the frontend:
 * https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec
 * Deployment ID:
 * AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA
 *
 * Important architecture note:
 * - Google Apps Script can store messages/files/events, authenticate sessions, enforce the 10-person cap,
 *   and act as a WebRTC signaling mailbox.
 * - Google Apps Script cannot be a WebSocket/SSE/TURN/SFU media server. Camera, filters, audio/video calls,
 *   screen sharing, and screen/audio recording happen in the browser through WebRTC/MediaRecorder/getUserMedia.
 * - This replacement adds backend storage and mailbox/signaling support for those browser features:
 *   Google/cloud identity verification, invite/reset email delivery, call rooms, call signaling,
 *   uploaded voice/video/camera media, transcript records, face descriptor/filter metadata, and generic
 *   multi-user cloud records.
 */

const OURSPACE_SOCIAL_COMPAT = {
  VERSION: 'OurSpace-compat-2.0.0-cloud-realtime-media',
  DINO_EMAIL: 'williamsaville92@gmail.com',
  RESET_CODE_MINUTES: 30,
  MIN_PASSWORD_LENGTH: 4,
  MAX_REGISTERED_USERS_PER_PROJECT: 10,
  MAX_ACTIVE_USERS_PER_PROJECT: 10,
  ACTIVE_WINDOW_MS: 2 * 60 * 1000,
  SESSION_TTL_MS: 12 * 60 * 60 * 1000,
  STORY_MAX_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  STORY_DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,
  MAX_TEXT: 4000,
  MAX_MEDIA_CHARS_IN_SHEET: 40000,
  PUBLIC_DRIVE_FILE_LINKS: true,
  SPREADSHEET_PROPERTY: 'OURSPACE_COMPAT_SPREADSHEET_ID',
  FILE_FOLDER_PROPERTY: 'OURSPACE_COMPAT_UPLOAD_FOLDER_ID',
  GOOGLE_CLIENT_ID_PROPERTY: 'OURSPACE_COMPAT_GOOGLE_CLIENT_ID',
  SPEECH_TO_TEXT_WEBHOOK_PROPERTY: 'OURSPACE_COMPAT_SPEECH_TO_TEXT_WEBHOOK_URL',
  SPEECH_TO_TEXT_API_KEY_PROPERTY: 'OURSPACE_COMPAT_SPEECH_TO_TEXT_API_KEY',
  TURN_CONFIG_JSON_PROPERTY: 'OURSPACE_COMPAT_TURN_CONFIG_JSON',
  MEDIA_MAX_INLINE_CHARS: 40000,
  CALL_EVENT_TTL_MS: 60 * 60 * 1000,
  FACE_MATCH_THRESHOLD: 0.55,
  SHEETS: {
    USERS: ['projectId','userId','username','displayName','salt','passHash','role','avatar','status','createdAt','updatedAt','disabled','email','phone','backupEmailsJson','mustChangePassword','tempCodeSalt','tempCodeHash','tempCodeExpiresAt','resetTokenSalt','resetTokenHash','resetRequestedAt','resetDelivery','resetRequestedBy','lastPasswordChangedAt','lastTemporaryLoginAt'],
    SESSIONS: ['token','projectId','userId','displayName','createdAt','lastSeen','userAgent'],
    PROFILES: ['projectId','id','name','color','status','updatedAt'],
    FEED: ['projectId','id','author','text','media','mediaType','createdAt','reactionsJson','commentsJson'],
    CHANNELS: ['projectId','name','createdAt'],
    MESSAGES: ['projectId','channel','id','author','text','media','mediaType','origin','createdAt','reactionsJson'],
    STORIES: ['projectId','id','author','text','media','mediaType','createdAt','expiresAt','reactionsJson'],
    MESSENGER: ['projectId','id','type','clientId','createdAt','payloadJson','appName'],
    ROOMS: ['projectId','room','passHash','createdAt','updatedAt','participantsJson'],
    SIGNALS: ['projectId','room','id','fromPeer','toPeer','type','payloadJson','createdAt','deliveredJson'],
    EVENTS: ['projectId','id','title','start','end','location','description','createdBy','createdAt','updatedAt','calendarEventId'],
    FILES: ['projectId','id','name','mimeType','size','url','driveFileId','createdBy','createdAt'],
    SETTINGS: ['projectId','projectName','updatedAt','settingsJson'],
    AUDIT: ['at','projectId','action','userId','detailsJson'],
    RESET_REQUESTS: ['projectId','id','accountId','identifier','delivery','target','resetLink','expiresAt','requestedAt','requestedBy','sentToDino','status','detailsJson'],
    AUTH_PROVIDERS: ['projectId','userId','provider','providerUserId','email','displayName','photoUrl','createdAt','updatedAt','lastSignInAt','rawJson'],
    APP_RECORDS: ['projectId','collection','id','owner','createdAt','updatedAt','jsonData'],
    CALLS: ['projectId','callId','room','kind','createdBy','createdAt','updatedAt','status','participantsJson','settingsJson'],
    CALL_EVENTS: ['projectId','callId','room','id','fromPeer','toPeer','type','payloadJson','createdAt'],
    MEDIA_ASSETS: ['projectId','id','kind','owner','room','messageId','name','mimeType','size','url','driveFileId','durationMs','thumbnailUrl','transcript','faceMetaJson','createdAt','updatedAt'],
    VOICE_MESSAGES: ['projectId','id','conversationId','author','mediaId','durationMs','waveformJson','transcript','status','createdAt'],
    VIDEOS: ['projectId','id','author','mediaId','kind','thumbnailUrl','durationMs','transcript','status','createdAt'],
    TRANSCRIPTS: ['projectId','id','mediaId','sourceKind','language','transcript','status','provider','createdBy','createdAt','updatedAt','providerJson'],
    FACE_PROFILES: ['projectId','userId','profileId','label','descriptorJson','modelsVersion','consent','createdAt','updatedAt'],
    FILTER_PRESETS: ['projectId','id','createdBy','name','kind','configJson','thumbnailUrl','createdAt','updatedAt']
  }
};

function social_setup() {
  const ss = social_getSpreadsheet_();
  Object.keys(OURSPACE_SOCIAL_COMPAT.SHEETS).forEach(function(name){ social_getSheet_(name); });
  social_getUploadFolder_();
  return { ok: true, message: 'OurSpace backend ready.', spreadsheetUrl: ss.getUrl(), version: OURSPACE_SOCIAL_COMPAT.VERSION };
}

function social_doGet(e) {
  return social_handleRequest_(e, 'GET');
}

function social_doPost(e) {
  return social_handleRequest_(e, 'POST');
}

function social_handleRequest_(e, method) {
  try {
    social_setup();
    const req = social_normalizeRequest_(e, method);
    const result = social_route_(req);
    return social_output_(result, req.callback);
  } catch (err) {
    return social_output_({ ok: false, error: String(err && err.message ? err.message : err), version: OURSPACE_SOCIAL_COMPAT.VERSION }, (e && e.parameter && e.parameter.callback) || '');
  }
}

function social_normalizeRequest_(e, method) {
  const p = (e && e.parameter) || {};
  let body = {};
  if (method === 'POST' && e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); }
    catch (_err) { body = {}; }
  }
  const payload = body.payload || body || {};
  return {
    method: method,
    action: String(body.action || p.action || payload.action || 'state'),
    projectId: social_cleanSlug_(body.projectId || p.projectId || payload.projectId || 'default-project'),
    projectName: social_cleanText_(body.projectName || p.projectName || payload.projectName || 'OurSpace Project', 160),
    sessionToken: String(body.sessionToken || p.sessionToken || payload.sessionToken || ''),
    callback: String(p.callback || ''),
    payload: social_mergeObjects_(payload, p)
  };
}

function social_route_(req) {
  const action = req.action;
  if (action === 'ping') return { ok: true, version: OURSPACE_SOCIAL_COMPAT.VERSION, now: new Date().toISOString() };
  if (action === 'setup') return social_setup();
  if (action === 'manifest') return social_manifest_(req);
  if (action === 'iceConfig' || action === 'ice_config') return social_iceConfig_(req);

  // Cloud identity and emailed temporary-login support.
  if (action === 'cloud_auth_sign_in' || action === 'google_auth_sign_in') return social_cloudAuthSignIn_(req);
  if (action === 'link_cloud_provider') return social_linkCloudProvider_(req);
  if (action === 'send_invite_email' || action === 'deliver_temporary_password' || action === 'email_temporary_password') return social_sendInviteOrTemporaryPassword_(req);

  // Backend-ready login and recovery actions used by OurSpace_backend_ready_login.html.
  if (action === 'create_account') return social_createAccount_(req);
  if (action === 'sign_in') return social_signInAccount_(req);
  if (action === 'request_password_reset') return social_requestPasswordReset_(req);
  if (action === 'tell_dino_cant_login') return social_tellDinoCantLogin_(req);
  if (action === 'update_password') return social_updatePassword_(req);

  // Backward-compatible aliases from the larger OurSpace backend.
  if (action === 'login') return social_login_(req);
  if (action === 'register') return social_register_(req);
  if (action === 'logout') return social_logout_(req);

  const session = social_requireSession_(req, action === 'state' || action === 'onlineUsers' || action === 'messengerHistory');
  if (action === 'state') return { ok: true, state: social_publicState_(req.projectId) };
  if (action === 'onlineUsers') return { ok: true, onlineUsers: social_onlineUsers_(req.projectId) };
  if (action === 'heartbeat' || action === 'presence') return social_heartbeat_(req, session);
  if (action === 'profile') return social_saveProfile_(req, session);
  if (action === 'post') return social_savePost_(req, session);
  if (action === 'comment') return social_saveComment_(req, session);
  if (action === 'reaction') return social_saveReaction_(req, session);
  if (action === 'message') return social_saveChannelMessage_(req, session);
  if (action === 'importHistory') return social_importHistory_(req, session);
  if (action === 'story') return social_saveStory_(req, session);
  if (action === 'exportData') return social_exportData_(req, session);
  if (action === 'event') return social_saveEvent_(req, session);
  if (action === 'file') return social_saveFile_(req, session);
  if (action === 'messengerEnvelope') return social_messengerEnvelope_(req, session);
  if (action === 'messengerHistory') return { ok: true, envelopes: social_messengerHistory_(req.projectId) };
  if (action === 'save_record' || action === 'appRecord') return social_saveAppRecord_(req, session);
  if (action === 'list_records' || action === 'appRecords') return social_listAppRecords_(req, session);
  if (action === 'save_media_asset' || action === 'mediaAsset' || action === 'camera_capture') return social_saveMediaAsset_(req, session);
  if (action === 'save_voice_message' || action === 'voiceMessage') return social_saveVoiceMessage_(req, session);
  if (action === 'save_video' || action === 'videoAsset') return social_saveVideo_(req, session);
  if (action === 'request_transcription' || action === 'transcribe_media') return social_requestTranscription_(req, session);
  if (action === 'save_transcript' || action === 'update_transcript') return social_saveTranscript_(req, session);
  if (action === 'save_face_profile' || action === 'faceProfile') return social_saveFaceProfile_(req, session);
  if (action === 'list_face_profiles') return social_listFaceProfiles_(req, session);
  if (action === 'match_face_descriptor' || action === 'recognize_face') return social_matchFaceDescriptor_(req, session);
  if (action === 'save_filter_preset' || action === 'filterPreset') return social_saveFilterPreset_(req, session);
  if (action === 'list_filter_presets') return social_listFilterPresets_(req, session);
  if (action === 'create_call' || action === 'callCreate') return social_createCall_(req, session);
  if (action === 'join_call' || action === 'callJoin') return social_joinCall_(req, session);
  if (action === 'leave_call' || action === 'callLeave') return social_leaveCall_(req, session);
  if (action === 'end_call' || action === 'callEnd') return social_endCall_(req, session);
  if (action === 'call_signal' || action === 'callSignal') return social_callSignal_(req, session);
  if (action === 'poll_call' || action === 'callPoll') return social_pollCall_(req, session);
  if (action === 'roomJoin') return social_roomJoin_(req, session);
  if (action === 'roomHeartbeat') return social_roomHeartbeat_(req, session);
  if (action === 'roomLeave') return social_roomLeave_(req, session);
  if (action === 'roomSignal') return social_roomSignal_(req, session);
  if (action === 'roomChat') return social_roomChat_(req, session);
  if (action === 'roomReaction') return social_roomReaction_(req, session);
  if (action === 'roomRaiseHand') return social_roomRaiseHand_(req, session);
  if (action === 'roomPoll') return social_roomPoll_(req, session);
  throw new Error('Unknown action: ' + action);
}

function social_login_(req) {
  const payload = req.payload || {};
  const username = social_cleanUsername_(payload.username);
  const password = String(payload.password || '');
  if (!username || !password) throw new Error('Username and password are required.');
  social_pruneSessions_();
  const users = social_rows_('USERS').filter(function(u){ return u.projectId === req.projectId && String(u.username).toLowerCase() === username.toLowerCase() && String(u.disabled) !== 'true'; });
  if (!users.length) throw new Error('User not found. Use Register for the first setup, or check the username.');
  const user = users[0];
  if (social_hashPassword_(password, user.salt) !== user.passHash) throw new Error('Incorrect password.');
  social_enforceActiveLimit_(req.projectId, '');
  const session = social_createSession_(req.projectId, user.userId, user.displayName, payload.userAgent);
  social_audit_(req.projectId, 'login', user.userId, { username: username });
  return { ok: true, session: session, user: social_publicUser_(user), state: social_publicState_(req.projectId) };
}

function social_register_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const payload = req.payload || {};
    const username = social_cleanUsername_(payload.username);
    const password = String(payload.password || '');
    const displayName = social_cleanText_(payload.displayName || username, 80);
    if (!username || !password || password.length < 6) throw new Error('Username and a password of at least 6 characters are required.');
    const existing = social_rows_('USERS').filter(function(u){ return u.projectId === req.projectId; });
    if (existing.some(function(u){ return String(u.username).toLowerCase() === username.toLowerCase(); })) throw new Error('That username already exists.');
    if (existing.length >= OURSPACE_SOCIAL_COMPAT.MAX_REGISTERED_USERS_PER_PROJECT) throw new Error('This project already has the maximum 10 registered users.');
    social_enforceActiveLimit_(req.projectId, '');
    const salt = social_randomId_('salt');
    const userId = social_randomId_('user');
    const now = new Date().toISOString();
    social_append_('USERS', {
      projectId: req.projectId,
      userId: userId,
      username: username,
      displayName: displayName,
      salt: salt,
      passHash: social_hashPassword_(password, salt),
      role: existing.length ? 'member' : 'admin',
      avatar: payload.avatar || '💬',
      status: 'Around',
      createdAt: now,
      updatedAt: now,
      disabled: 'false'
    });
    social_upsertProfile_(req.projectId, { id: social_cleanSlug_(username), name: displayName, color: '#38bdf8', status: 'Around' });
    const session = social_createSession_(req.projectId, userId, displayName, payload.userAgent);
    social_audit_(req.projectId, 'register', userId, { username: username });
    return { ok: true, session: session, user: { userId: userId, username: username, displayName: displayName, role: existing.length ? 'member' : 'admin' }, state: social_publicState_(req.projectId) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * New backend-ready account system matching the current HTML hooks:
 * create_account, sign_in, request_password_reset, tell_dino_cant_login, update_password.
 *
 * Notes:
 * - The current HTML still performs local password checks until its CONFIG.backendUrl is filled in and
 *   the next HTML pass moves verification fully server-side. These handlers accept those transitional
 *   requests without breaking the page.
 * - Email delivery works through MailApp.
 * - Phone delivery needs either Twilio script properties or a phoneGatewayEmail/carrier email gateway.
 *   Apps Script has no native SMS sender by itself.
 */
function social_createAccount_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const p = req.payload || {};
    const username = social_cleanUsername_(p.username || p.displayName || 'friend');
    const displayName = social_cleanText_(p.displayName || username, 80);
    const email = social_normalizeEmail_(p.email || p.mainEmail || '');
    const phone = social_normalizePhone_(p.phone || p.phoneNumber || p.tel || '');
    const backupEmails = social_parseBackupEmails_(p.backupEmails || p.backupEmailsJson || []);
    const password = String(p.password || p.newPassword || '');

    if (!username) throw new Error('Username is required.');
    if (!email && !phone) throw new Error('Add at least one email address or phone number.');
    if (email && !social_isEmail_(email)) throw new Error('Main email is not valid.');
    if (password && password.length < OURSPACE_SOCIAL_COMPAT.MIN_PASSWORD_LENGTH) throw new Error('Password must be at least ' + OURSPACE_SOCIAL_COMPAT.MIN_PASSWORD_LENGTH + ' characters.');

    const existing = social_rows_('USERS').filter(function(u){ return u.projectId === req.projectId; });
    if (existing.some(function(u){ return social_identifiersMatchUser_(u, email) || social_identifiersMatchUser_(u, phone) || social_identifiersMatchUser_(u, username) || String(u.username || '').toLowerCase() === username.toLowerCase(); })) {
      throw new Error('An account already exists with that email, phone, backup email, or username.');
    }
    if (existing.length >= OURSPACE_SOCIAL_COMPAT.MAX_REGISTERED_USERS_PER_PROJECT) throw new Error('This project already has the maximum 10 registered users.');

    const salt = password ? social_randomId_('salt') : '';
    const userId = social_cleanText_(p.accountId || p.userId || social_randomId_('user'), 120);
    const now = new Date().toISOString();
    const row = {
      projectId: req.projectId,
      userId: userId,
      username: username,
      displayName: displayName,
      salt: salt,
      passHash: password ? social_hashPassword_(password, salt) : '',
      role: existing.length ? 'member' : 'admin',
      avatar: p.avatar || '💬',
      status: 'Around',
      createdAt: p.createdAt || now,
      updatedAt: now,
      disabled: 'false',
      email: email,
      phone: phone,
      backupEmailsJson: JSON.stringify(backupEmails),
      mustChangePassword: password ? 'false' : 'false',
      tempCodeSalt: '',
      tempCodeHash: '',
      tempCodeExpiresAt: '',
      resetTokenSalt: '',
      resetTokenHash: '',
      resetRequestedAt: '',
      resetDelivery: '',
      resetRequestedBy: '',
      lastPasswordChangedAt: password ? now : '',
      lastTemporaryLoginAt: ''
    };
    social_append_('USERS', row);
    social_upsertProfile_(req.projectId, { id: social_cleanSlug_(username), name: displayName, color: '#38bdf8', status: 'Around' });
    social_audit_(req.projectId, 'create_account', userId, { username: username, email: social_maskEmail_(email), phone: social_maskPhone_(phone), backupEmailCount: backupEmails.length, passwordStored: Boolean(password) });
    return { ok: true, user: social_publicUser_(row), passwordStored: Boolean(password), note: password ? 'Account created with server-side password.' : 'Account metadata saved. The next HTML pass should send password to use server-side login.' };
  } finally {
    lock.releaseLock();
  }
}

function social_signInAccount_(req) {
  social_pruneSessions_();
  const p = req.payload || {};
  const identifier = social_cleanText_(p.identifier || p.email || p.phone || p.username || p.accountId || '', 160);
  const password = String(p.password || p.currentPassword || '');
  if (!identifier) throw new Error('Email, phone number, username, or account ID is required.');

  const user = social_findUserByIdentifier_(req.projectId, identifier);
  if (!user) throw new Error('No matching account was found.');
  if (String(user.disabled) === 'true') throw new Error('This account is disabled.');

  // Transitional mirror call from the current local-auth HTML after the browser already verified login.
  if (!password) {
    social_audit_(req.projectId, 'sign_in_client_mirror', user.userId, { identifier: social_maskIdentifier_(identifier), usedTemporaryCode: Boolean(p.usedTemporaryCode) });
    return { ok: true, mirrored: true, user: social_publicUser_(user), note: 'Client-side login event received. Send password in the next HTML pass for server-side sessions.' };
  }

  const normalPasswordMatches = user.passHash && user.salt && social_hashPassword_(password, user.salt) === user.passHash;
  const temporaryCodeMatches = user.tempCodeHash && user.tempCodeSalt && social_hashPassword_(password, user.tempCodeSalt) === user.tempCodeHash && social_isFuture_(user.tempCodeExpiresAt);
  if (!normalPasswordMatches && !temporaryCodeMatches) throw new Error('That password or temporary reset code does not match this account.');

  let updatedUser = user;
  if (temporaryCodeMatches) {
    social_updateRow_('USERS', user._row, { mustChangePassword: 'true', lastTemporaryLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    updatedUser = social_findUserByIdentifier_(req.projectId, identifier) || user;
  }

  social_enforceActiveLimit_(req.projectId, '');
  const session = social_createSession_(req.projectId, updatedUser.userId, updatedUser.displayName || updatedUser.username, p.userAgent);
  social_audit_(req.projectId, 'sign_in', updatedUser.userId, { identifier: social_maskIdentifier_(identifier), temporaryCode: temporaryCodeMatches });
  return { ok: true, session: session, user: social_publicUser_(updatedUser), mustChangePassword: String(updatedUser.mustChangePassword) === 'true' || temporaryCodeMatches, authMethod: temporaryCodeMatches ? 'temporary_code' : 'password', state: social_publicState_(req.projectId) };
}

function social_requestPasswordReset_(req) {
  const p = req.payload || {};
  const identifier = social_cleanText_(p.identifier || p.accountId || p.username || p.email || p.phone || p.target || '', 240);
  const delivery = social_cleanSlug_(p.delivery || p.method || 'email');
  if (!identifier) throw new Error('Account lookup is required.');
  if (['email','phone','dino'].indexOf(delivery) < 0) throw new Error('Reset delivery must be email, phone, or dino.');

  const user = social_findUserByIdentifier_(req.projectId, identifier);
  if (!user) throw new Error('No matching account was found. Use the Dino recovery button for manual help.');

  const reset = social_createResetForUser_(req, user, identifier, delivery, p);
  let result;
  if (delivery === 'email') result = social_sendResetEmail_(req, user, reset, p);
  else if (delivery === 'phone') result = social_sendResetPhone_(req, user, reset, p);
  else result = social_emailDinoRecovery_(req, user, reset, p, 'Dino recovery requested');

  social_logResetRequest_(req.projectId, user.userId, identifier, delivery, result.target || '', reset.resetLink, reset.expiresAt, identifier, result.sentToDino || false, result.status || 'sent', result);
  social_audit_(req.projectId, 'request_password_reset', user.userId, { delivery: delivery, status: result.status, target: social_maskIdentifier_(result.target || '') });
  return {
    ok: true,
    delivery: delivery,
    sent: Boolean(result.sent),
    sentToDino: Boolean(result.sentToDino),
    target: social_maskIdentifier_(result.target || ''),
    expiresAt: reset.expiresAt,
    resetLink: reset.resetLink,
    phoneNeedsSmsProvider: Boolean(result.phoneNeedsSmsProvider),
    message: result.message || 'Reset request processed.'
  };
}

function social_tellDinoCantLogin_(req) {
  const p = req.payload || {};
  const identifier = social_cleanText_(p.identifier || p.accountId || p.username || p.email || p.phone || 'unknown account', 240);
  let user = social_findUserByIdentifier_(req.projectId, identifier);
  if (!user) user = social_createRecoveryStubUser_(req, identifier, p);

  const reset = social_createResetForUser_(req, user, identifier, 'dino', p);
  const result = social_emailDinoRecovery_(req, user, reset, p, 'OurSpace login help needed');
  social_logResetRequest_(req.projectId, user.userId, identifier, 'dino', OURSPACE_SOCIAL_COMPAT.DINO_EMAIL, reset.resetLink, reset.expiresAt, identifier, true, result.status || 'sent_to_dino', result);
  social_audit_(req.projectId, 'tell_dino_cant_login', user.userId, { identifier: social_maskIdentifier_(identifier), sentToDino: true });
  return { ok: true, sentToDino: true, dinoEmail: OURSPACE_SOCIAL_COMPAT.DINO_EMAIL, expiresAt: reset.expiresAt, message: 'Dino has been emailed with the 6 digit temporary reset code.' };
}

function social_updatePassword_(req) {
  const p = req.payload || {};
  const identifier = social_cleanText_(p.accountId || p.userId || p.identifier || p.email || p.phone || p.username || '', 240);
  if (!identifier) throw new Error('Account ID, email, phone, or username is required.');
  const user = social_findUserByIdentifier_(req.projectId, identifier);
  if (!user) throw new Error('No matching account was found.');
  if (String(user.disabled) === 'true') throw new Error('This account is disabled.');

  const newPassword = String(p.newPassword || p.password || '');
  const backupEmails = social_mergeBackupEmails_(social_parseBackupEmails_(user.backupEmailsJson), social_parseBackupEmails_(p.backupEmails || p.backupEmailsJson || []));
  if (newPassword && newPassword.length < OURSPACE_SOCIAL_COMPAT.MIN_PASSWORD_LENGTH) throw new Error('New password must be at least ' + OURSPACE_SOCIAL_COMPAT.MIN_PASSWORD_LENGTH + ' characters.');
  if (p.requireBackupEmail !== false && !backupEmails.length) throw new Error('Add at least one backup email before continuing.');

  const patch = {
    backupEmailsJson: JSON.stringify(backupEmails),
    mustChangePassword: 'false',
    tempCodeSalt: '',
    tempCodeHash: '',
    tempCodeExpiresAt: '',
    resetTokenSalt: '',
    resetTokenHash: '',
    resetRequestedAt: '',
    resetDelivery: '',
    resetRequestedBy: '',
    updatedAt: new Date().toISOString(),
    lastPasswordChangedAt: new Date().toISOString()
  };
  if (newPassword) {
    patch.salt = social_randomId_('salt');
    patch.passHash = social_hashPassword_(newPassword, patch.salt);
  }
  social_updateRow_('USERS', user._row, patch);
  const updatedUser = social_findUserByIdentifier_(req.projectId, identifier) || social_mergeObjects_(user, patch);
  social_audit_(req.projectId, 'update_password', user.userId, { passwordUpdated: Boolean(newPassword), backupEmailCount: backupEmails.length });
  return { ok: true, user: social_publicUser_(updatedUser), passwordUpdated: Boolean(newPassword), backupEmails: backupEmails, mustChangePassword: false };
}

function social_createRecoveryStubUser_(req, identifier, p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    let user = social_findUserByIdentifier_(req.projectId, identifier);
    if (user) return user;
    const email = social_isEmail_(identifier) ? social_normalizeEmail_(identifier) : social_normalizeEmail_(p.email || '');
    const phone = social_normalizePhone_(identifier) || social_normalizePhone_(p.phone || '');
    const username = social_cleanUsername_(p.username || (!email && !phone ? identifier : 'recovery_' + Date.now().toString(36)));
    const userId = social_cleanText_(p.accountId || p.userId || social_randomId_('user'), 120);
    const now = new Date().toISOString();
    const row = {
      projectId: req.projectId,
      userId: userId,
      username: username,
      displayName: social_cleanText_(p.displayName || username || 'Recovery Account', 80),
      salt: '',
      passHash: '',
      role: 'member',
      avatar: '🆘',
      status: 'Recovery needed',
      createdAt: now,
      updatedAt: now,
      disabled: 'false',
      email: email,
      phone: phone,
      backupEmailsJson: JSON.stringify(social_parseBackupEmails_(p.backupEmails || [])),
      mustChangePassword: 'true',
      tempCodeSalt: '',
      tempCodeHash: '',
      tempCodeExpiresAt: '',
      resetTokenSalt: '',
      resetTokenHash: '',
      resetRequestedAt: '',
      resetDelivery: '',
      resetRequestedBy: '',
      lastPasswordChangedAt: '',
      lastTemporaryLoginAt: ''
    };
    social_append_('USERS', row);
    return social_findUserByIdentifier_(req.projectId, userId) || row;
  } finally {
    lock.releaseLock();
  }
}

function social_createResetForUser_(req, user, identifier, delivery, p) {
  const code = (/^\d{6}$/.test(String(p.resetCode || ''))) ? String(p.resetCode) : social_generateSixDigitCode_();
  const token = social_cleanText_(p.resetToken || social_generateToken_(), 160);
  const expiresAt = p.expiresAt || new Date(Date.now() + OURSPACE_SOCIAL_COMPAT.RESET_CODE_MINUTES * 60 * 1000).toISOString();
  const codeSalt = social_randomId_('code');
  const tokenSalt = social_randomId_('token');
  const resetLink = social_cleanText_(p.resetLink || social_buildResetLink_(req, token), 2000);
  social_updateRow_('USERS', user._row, {
    tempCodeSalt: codeSalt,
    tempCodeHash: social_hashPassword_(code, codeSalt),
    tempCodeExpiresAt: expiresAt,
    resetTokenSalt: tokenSalt,
    resetTokenHash: social_hashPassword_(token, tokenSalt),
    resetRequestedAt: new Date().toISOString(),
    resetDelivery: delivery,
    resetRequestedBy: social_cleanText_(identifier, 240),
    mustChangePassword: 'true',
    updatedAt: new Date().toISOString()
  });
  return { code: code, token: token, resetLink: resetLink, expiresAt: expiresAt };
}

function social_sendResetEmail_(req, user, reset, p) {
  const email = social_normalizeEmail_(p.target || p.email || user.email || social_firstBackupEmail_(user));
  if (!email) throw new Error('This account does not have an email or backup email. Use Dino recovery.');
  const subject = 'OurSpace password reset code';
  const body = social_resetMessageBody_(user, reset, 'Use this code or reset link to sign in temporarily.');
  MailApp.sendEmail(email, subject, body);
  return { sent: true, status: 'sent_email', target: email, message: 'Reset code and link sent to email.' };
}

function social_sendResetPhone_(req, user, reset, p) {
  const phone = social_normalizePhone_(p.target || p.phone || user.phone || '');
  if (!phone) throw new Error('This account does not have a phone number. Try email reset or Dino recovery.');
  const message = 'OurSpace reset code: ' + reset.code + '. Temporary password. Link: ' + reset.resetLink + ' Expires: ' + reset.expiresAt;
  const sms = social_sendSmsIfConfigured_(phone, message, p);
  if (sms.sent) return { sent: true, status: sms.status, target: phone, message: 'Reset code sent to phone.' };

  const dino = social_emailDinoRecovery_(req, user, reset, p, 'Phone reset needs Dino delivery');
  return { sent: false, sentToDino: true, status: 'phone_needs_sms_provider_sent_to_dino', target: phone, phoneNeedsSmsProvider: true, message: 'Apps Script needs Twilio or a phone email gateway for real SMS. Dino was emailed the code as fallback.', dino: dino };
}

function social_emailDinoRecovery_(req, user, reset, p, subject) {
  const dinoEmail = social_normalizeEmail_(p.dinoEmail || OURSPACE_SOCIAL_COMPAT.DINO_EMAIL) || OURSPACE_SOCIAL_COMPAT.DINO_EMAIL;
  const body = [
    'Dino, someone cannot log in to OurSpace.',
    '',
    'Project: ' + req.projectId,
    'Account ID: ' + (user.userId || ''),
    'Username: ' + (user.username || ''),
    'Display name: ' + (user.displayName || ''),
    'Email: ' + social_maskEmail_(user.email || ''),
    'Phone: ' + social_maskPhone_(user.phone || ''),
    'Requested by / lookup: ' + social_cleanText_(p.identifier || p.resetRequestedBy || '', 240),
    '',
    'Temporary 6 digit reset code: ' + reset.code,
    'Reset link: ' + reset.resetLink,
    'Code expires: ' + reset.expiresAt,
    '',
    'Give them the 6 digit code. It becomes their temporary password. After they sign in, the site forces a new password and backup emails before the rest of the site opens.'
  ].join('\n');
  MailApp.sendEmail(dinoEmail, subject || 'OurSpace login help needed', body);
  return { sent: true, sentToDino: true, status: 'sent_to_dino', target: dinoEmail, message: 'Dino was emailed the temporary reset code.' };
}

function social_sendSmsIfConfigured_(phone, message, p) {
  const gatewayEmail = social_normalizeEmail_(p.phoneGatewayEmail || '');
  if (gatewayEmail) {
    MailApp.sendEmail(gatewayEmail, 'OurSpace reset code', message);
    return { sent: true, status: 'sent_phone_gateway_email' };
  }

  const props = PropertiesService.getScriptProperties();
  const sid = props.getProperty('TWILIO_ACCOUNT_SID');
  const token = props.getProperty('TWILIO_AUTH_TOKEN');
  const from = props.getProperty('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) return { sent: false, status: 'no_sms_provider' };

  const response = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Messages.json', {
    method: 'post',
    payload: { To: '+' + phone, From: from, Body: message },
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + token) },
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) return { sent: true, status: 'sent_twilio_sms' };
  return { sent: false, status: 'twilio_error_' + code, body: response.getContentText().slice(0, 500) };
}

function social_logResetRequest_(projectId, accountId, identifier, delivery, target, resetLink, expiresAt, requestedBy, sentToDino, status, details) {
  social_append_('RESET_REQUESTS', {
    projectId: projectId,
    id: social_randomId_('reset'),
    accountId: accountId || '',
    identifier: social_cleanText_(identifier || '', 240),
    delivery: social_cleanText_(delivery || '', 40),
    target: social_maskIdentifier_(target || ''),
    resetLink: social_cleanText_(resetLink || '', 2000),
    expiresAt: expiresAt || '',
    requestedAt: new Date().toISOString(),
    requestedBy: social_cleanText_(requestedBy || '', 240),
    sentToDino: sentToDino ? 'true' : 'false',
    status: social_cleanText_(status || '', 120),
    detailsJson: JSON.stringify(details || {})
  });
}

function social_findUserByIdentifier_(projectId, identifier) {
  const raw = String(identifier || '').trim();
  const text = raw.toLowerCase();
  const phone = social_normalizePhone_(raw);
  if (!raw) return null;
  return social_rows_('USERS').find(function(u){
    if (u.projectId !== projectId) return false;
    if (String(u.userId || '') === raw || String(u.userId || '').toLowerCase() === text) return true;
    if (String(u.username || '').toLowerCase() === text) return true;
    if (String(u.email || '').toLowerCase() === text) return true;
    if (phone && social_normalizePhone_(u.phone) === phone) return true;
    const backups = social_parseBackupEmails_(u.backupEmailsJson);
    return backups.indexOf(text) >= 0;
  }) || null;
}

function social_identifiersMatchUser_(u, identifier) {
  const raw = String(identifier || '').trim();
  const text = raw.toLowerCase();
  const phone = social_normalizePhone_(raw);
  if (!raw) return false;
  if (String(u.userId || '') === raw || String(u.userId || '').toLowerCase() === text) return true;
  if (String(u.username || '').toLowerCase() === text) return true;
  if (String(u.email || '').toLowerCase() === text) return true;
  if (phone && social_normalizePhone_(u.phone) === phone) return true;
  return social_parseBackupEmails_(u.backupEmailsJson).indexOf(text) >= 0;
}

function social_normalizeEmail_(value) { return String(value || '').trim().toLowerCase(); }
function social_normalizePhone_(value) { return String(value || '').replace(/[^0-9]/g, '').slice(-15); }
function social_isEmail_(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function social_parseBackupEmails_(value) {
  let raw = value;
  if (Array.isArray(raw)) return social_mergeBackupEmails_(raw);
  if (typeof raw === 'string' && raw.trim().charAt(0) === '[') {
    try { raw = JSON.parse(raw); } catch (_err) {}
    if (Array.isArray(raw)) return social_mergeBackupEmails_(raw);
  }
  return social_mergeBackupEmails_(String(raw || '').split(/[\s,;]+/));
}
function social_mergeBackupEmails_() {
  const out = [];
  Array.prototype.slice.call(arguments).forEach(function(list){
    (Array.isArray(list) ? list : [list]).forEach(function(item){
      const email = social_normalizeEmail_(item);
      if (email && social_isEmail_(email) && out.indexOf(email) < 0) out.push(email);
    });
  });
  return out;
}
function social_firstBackupEmail_(user) { const arr = social_parseBackupEmails_(user.backupEmailsJson); return arr.length ? arr[0] : ''; }
function social_generateSixDigitCode_() { return String(Math.floor(100000 + Math.random() * 900000)); }
function social_generateToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function social_isFuture_(value) { return value && new Date(value).getTime() > Date.now(); }
function social_buildResetLink_(req, token) {
  const p = req.payload || {};
  const base = social_cleanText_(p.frontendBaseUrl || p.page || p.siteUrl || '', 1900);
  if (base) return social_appendQuery_(base, 'reset', token);
  return ScriptApp.getService().getUrl() + '?action=reset&projectId=' + encodeURIComponent(req.projectId) + '&token=' + encodeURIComponent(token);
}
function social_appendQuery_(url, key, value) {
  const joiner = String(url).indexOf('?') >= 0 ? '&' : '?';
  return String(url) + joiner + encodeURIComponent(key) + '=' + encodeURIComponent(value);
}
function social_resetMessageBody_(user, reset, intro) {
  return [
    intro || 'Use this reset code to sign in temporarily.',
    '',
    'Username: ' + (user.username || ''),
    'Temporary 6 digit reset code: ' + reset.code,
    'Reset link: ' + reset.resetLink,
    'Expires: ' + reset.expiresAt,
    '',
    'After signing in, you will be asked to create a new permanent password and add backup emails before entering the site.'
  ].join('\n');
}
function social_maskEmail_(email) {
  email = social_normalizeEmail_(email);
  if (!email || email.indexOf('@') < 0) return '';
  const parts = email.split('@');
  return parts[0].slice(0, 2) + '***@' + parts[1];
}
function social_maskPhone_(phone) {
  phone = social_normalizePhone_(phone);
  if (!phone) return '';
  return phone.length <= 4 ? '***' + phone : '***-***-' + phone.slice(-4);
}
function social_maskIdentifier_(value) {
  const raw = String(value || '').trim();
  if (social_isEmail_(raw)) return social_maskEmail_(raw);
  const phone = social_normalizePhone_(raw);
  if (phone && phone.length >= 7) return social_maskPhone_(phone);
  if (raw.length <= 3) return raw;
  return raw.slice(0, 2) + '***' + raw.slice(-1);
}

function social_logout_(req) {
  if (!req.sessionToken) return { ok: true };
  const sheet = social_getSheet_('SESSIONS');
  const data = social_rows_('SESSIONS');
  data.forEach(function(row){ if (row.token === req.sessionToken) sheet.deleteRow(row._row); });
  return { ok: true };
}

function social_heartbeat_(req, session) {
  if (!session) session = social_requireSession_(req, false);
  social_enforceActiveLimit_(req.projectId, session.token);
  social_updateSessionSeen_(session.token);
  if (req.payload && (req.payload.name || req.payload.status)) {
    social_upsertProfile_(req.projectId, {
      id: social_cleanSlug_(req.payload.id || req.payload.clientId || session.userId),
      name: social_cleanText_(req.payload.name || session.displayName, 80),
      color: req.payload.color || '#38bdf8',
      status: social_cleanText_(req.payload.status || 'Around', 120)
    });
  }
  return { ok: true, user: { clientId: session.userId, name: session.displayName, status: 'online', lastSeen: Date.now() }, onlineUsers: social_onlineUsers_(req.projectId), state: social_publicState_(req.projectId) };
}

function social_saveProfile_(req, session) {
  const p = req.payload || {};
  const profile = social_upsertProfile_(req.projectId, {
    id: social_cleanSlug_(p.id || p.name || session.userId),
    name: social_cleanText_(p.name || session.displayName, 80),
    color: /^#[0-9a-f]{6}$/i.test(String(p.color || '')) ? p.color : '#38bdf8',
    status: social_cleanText_(p.status || 'Around', 120)
  });
  return { ok: true, profile: profile, state: social_publicState_(req.projectId) };
}

function social_savePost_(req, session) {
  const p = req.payload || {};
  const media = social_saveMediaIfNeeded_(req.projectId, p.media, p.mediaType, 'post-media', session.userId);
  const post = {
    projectId: req.projectId,
    id: social_randomId_('post'),
    author: social_cleanText_(p.author || session.displayName || 'Friend', 80),
    text: social_cleanText_(p.text || '', OURSPACE_SOCIAL_COMPAT.MAX_TEXT),
    media: media.url || '',
    mediaType: social_cleanText_(p.mediaType || media.mimeType || '', 120),
    createdAt: new Date().toISOString(),
    reactionsJson: '[]',
    commentsJson: '[]'
  };
  if (!post.text && !post.media) throw new Error('Post text or media is required.');
  social_append_('FEED', post);
  return { ok: true, post: social_publicPost_(post), state: social_publicState_(req.projectId) };
}

function social_saveComment_(req, session) {
  const p = req.payload || {};
  const rows = social_rows_('FEED');
  const row = rows.find(function(x){ return x.projectId === req.projectId && x.id === String(p.postId || ''); });
  if (!row) throw new Error('Post not found.');
  const comments = social_parseJson_(row.commentsJson, []);
  const comment = { id: social_randomId_('comment'), author: social_cleanText_(p.author || session.displayName, 80), text: social_cleanText_(p.text || '', 1200), createdAt: new Date().toISOString() };
  if (!comment.text) throw new Error('Comment text is required.');
  comments.push(comment);
  social_updateRow_('FEED', row._row, { commentsJson: JSON.stringify(comments.slice(-100)) });
  return { ok: true, comment: comment, state: social_publicState_(req.projectId) };
}

function social_saveReaction_(req, session) {
  const p = req.payload || {};
  const type = social_cleanText_(p.type || 'post', 20);
  const id = String(p.id || '');
  const sheetName = type === 'story' ? 'STORIES' : type === 'message' ? 'MESSAGES' : 'FEED';
  const row = social_rows_(sheetName).find(function(x){ return x.projectId === req.projectId && x.id === id; });
  if (!row) throw new Error('Item not found.');
  const reactions = social_parseJson_(row.reactionsJson, []);
  const author = social_cleanText_(p.author || session.displayName, 80);
  const reaction = social_cleanText_(p.reaction || '💙', 16);
  const idx = reactions.findIndex(function(r){ return r.author === author && r.reaction === reaction; });
  if (idx >= 0) reactions.splice(idx, 1);
  else reactions.push({ id: social_randomId_('react'), author: author, reaction: reaction, at: Date.now() });
  social_updateRow_(sheetName, row._row, { reactionsJson: JSON.stringify(reactions.slice(-250)) });
  return { ok: true, item: { id: id, reactions: reactions }, state: social_publicState_(req.projectId) };
}

function social_saveChannelMessage_(req, session) {
  const p = req.payload || {};
  const channel = social_cleanSlug_(p.channel || 'general');
  social_ensureChannel_(req.projectId, channel);
  const media = social_saveMediaIfNeeded_(req.projectId, p.media, p.mediaType, 'message-media', session.userId);
  const message = {
    projectId: req.projectId,
    channel: channel,
    id: social_randomId_('msg'),
    author: social_cleanText_(p.author || session.displayName || 'Friend', 80),
    text: social_cleanText_(p.text || p.content || '', OURSPACE_SOCIAL_COMPAT.MAX_TEXT),
    media: media.url || '',
    mediaType: social_cleanText_(p.mediaType || media.mimeType || '', 120),
    origin: social_cleanText_(p.origin || 'browser', 40),
    createdAt: new Date().toISOString(),
    reactionsJson: '[]'
  };
  if (!message.text && !message.media) throw new Error('Message text or media is required.');
  social_append_('MESSAGES', message);
  return { ok: true, channel: channel, message: social_publicMessage_(message), state: social_publicState_(req.projectId) };
}

function social_importHistory_(req, session) {
  const p = req.payload || {};
  const channel = social_cleanSlug_(p.channel || 'imports');
  social_ensureChannel_(req.projectId, channel);
  const input = p.history || p;
  const arr = Array.isArray(input) ? input : (input.messages || input.data || []);
  let count = 0;
  arr.slice(0, 500).forEach(function(item){
    const text = social_cleanText_(item.text || item.content || item.message || '', OURSPACE_SOCIAL_COMPAT.MAX_TEXT);
    if (!text) return;
    social_append_('MESSAGES', {
      projectId: req.projectId,
      channel: channel,
      id: social_randomId_('msg'),
      author: social_cleanText_(item.author || item.user || session.displayName || 'Imported', 80),
      text: text,
      media: '',
      mediaType: '',
      origin: 'import',
      createdAt: item.createdAt || new Date().toISOString(),
      reactionsJson: '[]'
    });
    count++;
  });
  return { ok: true, channel: channel, imported: count, state: social_publicState_(req.projectId) };
}

function social_saveStory_(req, session) {
  const p = req.payload || {};
  const media = social_saveMediaIfNeeded_(req.projectId, p.media, p.mediaType, 'story-media', session.userId);
  const ttl = Math.max(5 * 60 * 1000, Math.min(Number(p.ttlMs || OURSPACE_SOCIAL_COMPAT.STORY_DEFAULT_TTL_MS), OURSPACE_SOCIAL_COMPAT.STORY_MAX_TTL_MS));
  const story = {
    projectId: req.projectId,
    id: social_randomId_('story'),
    author: social_cleanText_(p.author || session.displayName || 'Friend', 80),
    text: social_cleanText_(p.text || '', 800),
    media: media.url || '',
    mediaType: social_cleanText_(p.mediaType || media.mimeType || '', 120),
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + ttl,
    reactionsJson: '[]'
  };
  if (!story.text && !story.media) throw new Error('Story text or media is required.');
  social_append_('STORIES', story);
  return { ok: true, story: social_publicStory_(story), state: social_publicState_(req.projectId) };
}

function social_saveEvent_(req, session) {
  const p = req.payload || {};
  const operation = social_cleanText_(p.operation || 'create', 20);
  if (operation === 'delete') {
    const sheet = social_getSheet_('EVENTS');
    const rows = social_rows_('EVENTS');
    const row = rows.find(function(x){ return x.projectId === req.projectId && x.id === String(p.id || ''); });
    if (!row) throw new Error('Event not found.');
    sheet.deleteRow(row._row);
    return { ok: true, deleted: p.id, state: social_publicState_(req.projectId) };
  }
  const id = p.id || social_randomId_('event');
  const event = {
    projectId: req.projectId,
    id: id,
    title: social_cleanText_(p.title || 'Untitled event', 160),
    start: social_cleanText_(p.start || '', 80),
    end: social_cleanText_(p.end || p.start || '', 80),
    location: social_cleanText_(p.location || '', 240),
    description: social_cleanText_(p.description || '', 2000),
    createdBy: session.displayName || session.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    calendarEventId: ''
  };
  if (!event.start) throw new Error('Event start date/time is required.');
  const existing = social_rows_('EVENTS').find(function(x){ return x.projectId === req.projectId && x.id === id; });
  if (existing) social_updateRow_('EVENTS', existing._row, event);
  else social_append_('EVENTS', event);
  return { ok: true, event: social_publicEvent_(event), state: social_publicState_(req.projectId) };
}

function social_saveFile_(req, session) {
  const p = req.payload || {};
  const media = social_saveMediaIfNeeded_(req.projectId, p.dataUrl || p.media, p.mimeType || p.mediaType, p.name || 'upload', session.userId, true);
  return { ok: true, file: media };
}

function social_messengerEnvelope_(req, session) {
  const raw = req.payload || {};
  const type = social_cleanText_(raw.type || 'message', 40);
  const allowed = ['hello','history','message','presence','typing','room','call-join','call-signal','call-leave','call-start','call-end','voice-message','video-message','file','sticker','gif','transcript'];
  if (allowed.indexOf(type) < 0) throw new Error('Unsupported messenger envelope type.');
  const envelope = {
    projectId: req.projectId,
    id: social_cleanText_(raw.id || social_randomId_('mp'), 120),
    type: type,
    clientId: social_cleanText_(raw.clientId || session.userId || 'browser', 120),
    createdAt: raw.createdAt || new Date().toISOString(),
    payloadJson: JSON.stringify(raw.payload || {}),
    appName: 'OurSpace Messenger'
  };
  if (type === 'message' || type === 'room' || type.indexOf('call-') === 0 || type === 'typing' || type === 'presence') social_append_('MESSENGER', envelope);
  return { ok: true, envelope: social_publicEnvelope_(envelope) };
}

function social_roomJoin_(req, session) {
  social_enforceActiveLimit_(req.projectId, session.token);
  const p = req.payload || {};
  const roomCode = social_cleanSlug_(p.room || 'room');
  const pass = String(p.pass || '');
  const now = Date.now();
  let room = social_rows_('ROOMS').find(function(x){ return x.projectId === req.projectId && x.room === roomCode; });
  if (!room) {
    social_append_('ROOMS', { projectId: req.projectId, room: roomCode, passHash: social_hashPassword_(pass, 'room:' + roomCode), createdAt: now, updatedAt: now, participantsJson: '[]' });
    room = social_rows_('ROOMS').find(function(x){ return x.projectId === req.projectId && x.room === roomCode; });
  }
  if (room.passHash !== social_hashPassword_(pass, 'room:' + roomCode)) throw new Error('Incorrect room passcode.');
  let participants = social_parseJson_(room.participantsJson, []).filter(function(x){ return now - Number(x.lastSeen || 0) < OURSPACE_SOCIAL_COMPAT.ACTIVE_WINDOW_MS; });
  const peerId = social_cleanText_(p.peerId || session.userId || social_randomId_('peer'), 120);
  if (!participants.some(function(x){ return x.id === peerId; }) && participants.length >= OURSPACE_SOCIAL_COMPAT.MAX_ACTIVE_USERS_PER_PROJECT) throw new Error('This room already has 10 active people.');
  participants = participants.filter(function(x){ return x.id !== peerId; });
  participants.push({ id: peerId, name: social_cleanText_(p.name || session.displayName || 'Guest', 80), joinedAt: now, lastSeen: now, handRaised: false });
  social_updateRow_('ROOMS', room._row, { updatedAt: now, participantsJson: JSON.stringify(participants) });
  social_addRoomEvent_(req.projectId, roomCode, 'participants', participants, 'server', '*');
  return { ok: true, peerId: peerId, participants: participants, room: roomCode };
}

function social_roomHeartbeat_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const participants = social_touchParticipant_(room, p.peerId || p.from, null);
  return { ok: true, participants: participants };
}

function social_roomLeave_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const peerId = String(p.peerId || p.from || '');
  const participants = social_parseJson_(room.participantsJson, []).filter(function(x){ return x.id !== peerId; });
  social_updateRow_('ROOMS', room._row, { updatedAt: Date.now(), participantsJson: JSON.stringify(participants) });
  social_addRoomEvent_(req.projectId, room.room, 'participants', participants, 'server', '*');
  return { ok: true, participants: participants };
}

function social_roomSignal_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const from = social_cleanText_(p.from || p.peerId || session.userId, 120);
  const to = social_cleanText_(p.to || '', 120);
  if (!to) throw new Error('Signal target is required.');
  const signal = social_addRoomEvent_(req.projectId, room.room, 'signal', { from: from, to: to, type: social_cleanText_(p.type || '', 40), payload: p.payload }, from, to);
  return { ok: true, signal: signal };
}

function social_roomChat_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const from = social_cleanText_(p.from || p.peerId || session.userId, 120);
  const sender = social_cleanText_(session.displayName || p.name || 'Guest', 80);
  const message = { id: social_randomId_('roommsg'), from: from, sender: sender, body: social_cleanText_(p.message || '', OURSPACE_SOCIAL_COMPAT.MAX_TEXT), sentAt: Date.now() };
  social_addRoomEvent_(req.projectId, room.room, 'room-chat', message, from, '*');
  return { ok: true, message: message };
}

function social_roomReaction_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const from = social_cleanText_(p.from || p.peerId || session.userId, 120);
  const reaction = { id: social_randomId_('roomreact'), from: from, sender: session.displayName || 'Guest', reaction: social_cleanText_(p.reaction || '👍', 16), sentAt: Date.now() };
  social_addRoomEvent_(req.projectId, room.room, 'room-reaction', reaction, from, '*');
  return { ok: true, reaction: reaction };
}

function social_roomRaiseHand_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const participants = social_touchParticipant_(room, p.peerId || p.from, Boolean(p.raised));
  social_addRoomEvent_(req.projectId, room.room, 'participants', participants, 'server', '*');
  return { ok: true, participants: participants };
}

function social_roomPoll_(req, session) {
  const p = req.payload || {};
  const room = social_findRoom_(req.projectId, p.room);
  const peerId = social_cleanText_(p.peerId || p.from || session.userId, 120);
  const since = Number(p.since || 0);
  const now = Date.now();
  const participants = social_touchParticipant_(room, peerId, null);
  const signals = social_rows_('SIGNALS').filter(function(x){
    return x.projectId === req.projectId && x.room === room.room && Number(x.createdAt) > since && (x.toPeer === '*' || x.toPeer === peerId);
  }).slice(-100).map(function(x){
    return { event: x.type === 'signal' ? 'signal' : x.type, data: social_parseJson_(x.payloadJson, {}), at: Number(x.createdAt) };
  });
  return { ok: true, now: now, participants: participants, events: signals };
}

function social_exportData_(req, session) {
  return {
    ok: true,
    data: social_publicState_(req.projectId),
    envelopes: social_messengerHistory_(req.projectId),
    calls: social_rows_('CALLS').filter(social_byProject_(req.projectId)).map(publicCall_),
    mediaAssets: social_rows_('MEDIA_ASSETS').filter(social_byProject_(req.projectId)).map(publicMediaAsset_),
    voiceMessages: social_rows_('VOICE_MESSAGES').filter(social_byProject_(req.projectId)).map(publicVoiceMessage_),
    videos: social_rows_('VIDEOS').filter(social_byProject_(req.projectId)).map(publicVideo_),
    transcripts: social_rows_('TRANSCRIPTS').filter(social_byProject_(req.projectId)).map(publicTranscript_),
    filterPresets: social_rows_('FILTER_PRESETS').filter(social_byProject_(req.projectId)).map(publicFilterPreset_),
    exportedAt: new Date().toISOString()
  };
}

function social_cloudAuthSignIn_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    social_pruneSessions_();
    const p = req.payload || {};
    const provider = social_cleanSlug_(p.provider || 'google');
    let identity;
    if (provider === 'google') identity = social_verifyGoogleIdToken_(p.idToken || p.credential || p.token || '');
    else identity = social_verifyExternalIdentity_(provider, p);

    const providerUserId = social_cleanText_(identity.providerUserId || identity.sub || '', 240);
    const email = social_normalizeEmail_(identity.email || p.email || '');
    const displayName = social_cleanText_(identity.displayName || identity.name || p.displayName || email.split('@')[0] || 'Friend', 80);
    if (!providerUserId && !email) throw new Error('Cloud sign-in did not return a stable account ID or email.');

    let providerRow = social_rows_('AUTH_PROVIDERS').find(function(row){
      return row.projectId === req.projectId && row.provider === provider && row.providerUserId === providerUserId;
    });
    let user = providerRow ? social_rows_('USERS').find(function(u){ return u.projectId === req.projectId && u.userId === providerRow.userId; }) : null;
    if (!user && email) user = social_findUserByIdentifier_(req.projectId, email);

    if (!user) {
      const existing = social_rows_('USERS').filter(function(u){ return u.projectId === req.projectId; });
      if (existing.length >= OURSPACE_SOCIAL_COMPAT.MAX_REGISTERED_USERS_PER_PROJECT) throw new Error('This project already has the maximum 10 registered users.');
      const now = new Date().toISOString();
      const username = social_cleanUsername_(p.username || email || displayName || ('cloud_' + Date.now().toString(36)));
      const userId = social_randomId_('user');
      const row = {
        projectId: req.projectId,
        userId: userId,
        username: username,
        displayName: displayName,
        salt: '',
        passHash: '',
        role: existing.length ? 'member' : 'admin',
        avatar: identity.photoUrl || p.avatar || '☁️',
        status: 'Around',
        createdAt: now,
        updatedAt: now,
        disabled: 'false',
        email: email,
        phone: social_normalizePhone_(p.phone || ''),
        backupEmailsJson: JSON.stringify(social_parseBackupEmails_(p.backupEmails || [])),
        mustChangePassword: 'false',
        tempCodeSalt: '',
        tempCodeHash: '',
        tempCodeExpiresAt: '',
        resetTokenSalt: '',
        resetTokenHash: '',
        resetRequestedAt: '',
        resetDelivery: '',
        resetRequestedBy: '',
        lastPasswordChangedAt: '',
        lastTemporaryLoginAt: ''
      };
      social_append_('USERS', row);
      user = social_findUserByIdentifier_(req.projectId, userId) || row;
      social_upsertProfile_(req.projectId, { id: social_cleanSlug_(username), name: displayName, color: '#38bdf8', status: 'Around' });
    }
    if (String(user.disabled) === 'true') throw new Error('This account is disabled.');

    social_upsertAuthProvider_(req.projectId, user.userId, provider, providerUserId || email, email, displayName, identity.photoUrl || '', identity.raw || identity);
    social_enforceActiveLimit_(req.projectId, '');
    const session = social_createSession_(req.projectId, user.userId, user.displayName || displayName, p.userAgent);
    social_audit_(req.projectId, 'cloud_auth_sign_in', user.userId, { provider: provider, email: social_maskEmail_(email) });
    return { ok: true, provider: provider, session: session, user: social_publicUser_(user), state: social_publicState_(req.projectId) };
  } finally {
    lock.releaseLock();
  }
}

function social_linkCloudProvider_(req) {
  const session = social_requireSession_(req, false);
  const p = req.payload || {};
  const provider = social_cleanSlug_(p.provider || 'google');
  const identity = provider === 'google' ? social_verifyGoogleIdToken_(p.idToken || p.credential || p.token || '') : social_verifyExternalIdentity_(provider, p);
  const providerUserId = social_cleanText_(identity.providerUserId || identity.sub || identity.email || '', 240);
  if (!providerUserId) throw new Error('Cloud provider did not return an ID to link.');
  social_upsertAuthProvider_(req.projectId, session.userId, provider, providerUserId, social_normalizeEmail_(identity.email || ''), social_cleanText_(identity.displayName || identity.name || '', 80), identity.photoUrl || '', identity.raw || identity);
  social_audit_(req.projectId, 'link_cloud_provider', session.userId, { provider: provider, providerUserId: providerUserId });
  return { ok: true, linked: true, provider: provider };
}

function social_sendInviteOrTemporaryPassword_(req) {
  const session = social_requireSession_(req, false);
  const p = req.payload || {};
  const target = social_normalizeEmail_(p.email || p.target || '');
  if (!target || !social_isEmail_(target)) throw new Error('A valid recipient email is required.');
  const existing = social_rows_('USERS').filter(function(u){ return u.projectId === req.projectId; });
  if (existing.length >= OURSPACE_SOCIAL_COMPAT.MAX_REGISTERED_USERS_PER_PROJECT && !social_findUserByIdentifier_(req.projectId, target)) throw new Error('This project already has the maximum 10 registered users.');

  let user = social_findUserByIdentifier_(req.projectId, target);
  if (!user) {
    const now = new Date().toISOString();
    const username = social_cleanUsername_(p.username || target.split('@')[0]);
    const row = {
      projectId: req.projectId,
      userId: social_randomId_('user'),
      username: username,
      displayName: social_cleanText_(p.displayName || username, 80),
      salt: '',
      passHash: '',
      role: 'member',
      avatar: p.avatar || '💌',
      status: 'Invited',
      createdAt: now,
      updatedAt: now,
      disabled: 'false',
      email: target,
      phone: social_normalizePhone_(p.phone || ''),
      backupEmailsJson: JSON.stringify(social_parseBackupEmails_(p.backupEmails || [])),
      mustChangePassword: 'true',
      tempCodeSalt: '',
      tempCodeHash: '',
      tempCodeExpiresAt: '',
      resetTokenSalt: '',
      resetTokenHash: '',
      resetRequestedAt: '',
      resetDelivery: '',
      resetRequestedBy: '',
      lastPasswordChangedAt: '',
      lastTemporaryLoginAt: ''
    };
    social_append_('USERS', row);
    user = social_findUserByIdentifier_(req.projectId, target) || row;
  }
  const reset = social_createResetForUser_(req, user, target, 'email', p);
  const subject = social_cleanText_(p.subject || 'You are invited to OurSpace', 180);
  const body = [
    'You have been invited to OurSpace.',
    '',
    'Temporary sign-in code/password: ' + reset.code,
    'Reset/sign-in link: ' + reset.resetLink,
    'Expires: ' + reset.expiresAt,
    '',
    'After signing in, create a new permanent password. This private site is limited to 10 people.'
  ].join('\n');
  MailApp.sendEmail(target, subject, body);
  social_audit_(req.projectId, 'send_invite_email', session.userId, { target: social_maskEmail_(target), accountId: user.userId });
  return { ok: true, sent: true, target: social_maskEmail_(target), accountId: user.userId, expiresAt: reset.expiresAt };
}

function social_upsertAuthProvider_(projectId, userId, provider, providerUserId, email, displayName, photoUrl, raw) {
  const now = new Date().toISOString();
  const existing = social_rows_('AUTH_PROVIDERS').find(function(row){ return row.projectId === projectId && row.provider === provider && row.providerUserId === providerUserId; });
  const patch = { projectId: projectId, userId: userId, provider: provider, providerUserId: providerUserId, email: email || '', displayName: displayName || '', photoUrl: photoUrl || '', updatedAt: now, lastSignInAt: now, rawJson: JSON.stringify(raw || {}) };
  if (existing) social_updateRow_('AUTH_PROVIDERS', existing._row, patch);
  else social_append_('AUTH_PROVIDERS', social_mergeObjects_({ createdAt: now }, patch));
}

function social_verifyGoogleIdToken_(idToken) {
  idToken = String(idToken || '').trim();
  if (!idToken) throw new Error('Google ID token is required for cloud auth.');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Google cloud auth token could not be verified.');
  const data = JSON.parse(response.getContentText() || '{}');
  const expectedAud = PropertiesService.getScriptProperties().getProperty(OURSPACE_SOCIAL_COMPAT.GOOGLE_CLIENT_ID_PROPERTY);
  if (expectedAud && data.aud !== expectedAud) throw new Error('Google token audience does not match this OurSpace backend.');
  if (data.email_verified && String(data.email_verified) !== 'true') throw new Error('Google email is not verified.');
  return { provider: 'google', providerUserId: data.sub || '', sub: data.sub || '', email: social_normalizeEmail_(data.email || ''), displayName: data.name || data.email || 'Google user', photoUrl: data.picture || '', raw: data };
}

function social_verifyExternalIdentity_(provider, p) {
  if (!p || !p.providerUserId || !p.providerTokenVerifiedByFrontend) throw new Error('Only Google ID token verification is built in. For other providers, add a provider-specific verification webhook before trusting sign-in.');
  return { provider: provider, providerUserId: social_cleanText_(p.providerUserId, 240), email: social_normalizeEmail_(p.email || ''), displayName: social_cleanText_(p.displayName || p.email || 'Cloud user', 80), photoUrl: social_cleanText_(p.photoUrl || '', 2000), raw: p };
}

function social_iceConfig_(req) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(OURSPACE_SOCIAL_COMPAT.TURN_CONFIG_JSON_PROPERTY);
  let iceServers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (raw) {
    try { iceServers = JSON.parse(raw); }
    catch (_err) { iceServers = iceServers; }
  }
  return { ok: true, iceServers: iceServers, note: 'Apps Script supplies signaling only. Browser WebRTC still needs STUN/TURN for NAT traversal.' };
}

function social_saveAppRecord_(req, session) {
  const p = req.payload || {};
  const collection = social_cleanSlug_(p.collection || 'general');
  const id = social_cleanText_(p.id || social_randomId_('record'), 160);
  const now = new Date().toISOString();
  const payload = p.data !== undefined ? p.data : p.payload;
  const row = social_rows_('APP_RECORDS').find(function(r){ return r.projectId === req.projectId && r.collection === collection && r.id === id; });
  const next = { projectId: req.projectId, collection: collection, id: id, owner: social_cleanText_(p.owner || session.userId, 120), createdAt: row ? row.createdAt : now, updatedAt: now, jsonData: JSON.stringify(payload || {}) };
  if (row) social_updateRow_('APP_RECORDS', row._row, next);
  else social_append_('APP_RECORDS', next);
  social_audit_(req.projectId, 'save_app_record', session.userId, { collection: collection, id: id });
  return { ok: true, record: social_publicAppRecord_(next) };
}

function social_listAppRecords_(req, session) {
  const p = req.payload || {};
  const collection = social_cleanSlug_(p.collection || 'general');
  const records = social_rows_('APP_RECORDS').filter(function(r){ return r.projectId === req.projectId && r.collection === collection; }).slice(-Number(p.limit || 500)).map(publicAppRecord_);
  return { ok: true, collection: collection, records: records };
}

function social_saveMediaAsset_(req, session) {
  const p = req.payload || {};
  const kind = social_cleanSlug_(p.kind || p.mediaKind || 'media');
  const media = social_saveMediaIfNeeded_(req.projectId, p.dataUrl || p.media || p.blobDataUrl, p.mimeType || p.mediaType, p.name || kind, session.userId, true);
  const id = social_cleanText_(p.id || media.id || social_randomId_('media'), 160);
  const now = new Date().toISOString();
  const row = {
    projectId: req.projectId,
    id: id,
    kind: kind,
    owner: social_cleanText_(p.owner || session.userId, 120),
    room: social_cleanSlug_(p.room || p.conversationId || 'general'),
    messageId: social_cleanText_(p.messageId || '', 160),
    name: social_cleanText_(p.name || media.name || kind, 240),
    mimeType: social_cleanText_(p.mimeType || p.mediaType || media.mimeType || '', 120),
    size: Number(media.size || p.size || 0),
    url: social_cleanText_(media.url || p.url || '', 2000),
    driveFileId: social_cleanText_(media.driveFileId || '', 240),
    durationMs: Number(p.durationMs || 0),
    thumbnailUrl: social_cleanText_(p.thumbnailUrl || '', 2000),
    transcript: social_cleanText_(p.transcript || '', 20000),
    faceMetaJson: JSON.stringify(p.faceMeta || p.faceMetadata || {}),
    createdAt: p.createdAt || now,
    updatedAt: now
  };
  social_append_('MEDIA_ASSETS', row);
  social_audit_(req.projectId, 'save_media_asset', session.userId, { kind: kind, id: id, mimeType: row.mimeType, size: row.size });
  return { ok: true, media: social_publicMediaAsset_(row) };
}

function social_saveVoiceMessage_(req, session) {
  const p = req.payload || {};
  const mediaRes = social_saveMediaAsset_(social_mergeRequestPayload_(req, { kind: 'voice', room: p.conversationId || p.room || 'messenger' }), session).media;
  const row = {
    projectId: req.projectId,
    id: social_cleanText_(p.id || social_randomId_('voice'), 160),
    conversationId: social_cleanSlug_(p.conversationId || p.room || 'messenger'),
    author: social_cleanText_(p.author || session.displayName || session.userId, 80),
    mediaId: mediaRes.id,
    durationMs: Number(p.durationMs || mediaRes.durationMs || 0),
    waveformJson: JSON.stringify(p.waveform || []),
    transcript: social_cleanText_(p.transcript || mediaRes.transcript || '', 20000),
    status: social_cleanText_(p.status || 'saved', 40),
    createdAt: new Date().toISOString()
  };
  social_append_('VOICE_MESSAGES', row);
  social_messengerEnvelope_(social_mergeRequestPayload_(req, { type: 'voice-message', payload: { voiceMessage: social_publicVoiceMessage_(row), media: mediaRes } }), session);
  return { ok: true, voiceMessage: social_publicVoiceMessage_(row), media: mediaRes };
}

function social_saveVideo_(req, session) {
  const p = req.payload || {};
  const mediaRes = social_saveMediaAsset_(social_mergeRequestPayload_(req, { kind: p.kind || 'video', room: p.conversationId || p.room || 'videos' }), session).media;
  const row = {
    projectId: req.projectId,
    id: social_cleanText_(p.id || social_randomId_('video'), 160),
    author: social_cleanText_(p.author || session.displayName || session.userId, 80),
    mediaId: mediaRes.id,
    kind: social_cleanSlug_(p.kind || 'video'),
    thumbnailUrl: social_cleanText_(p.thumbnailUrl || mediaRes.thumbnailUrl || '', 2000),
    durationMs: Number(p.durationMs || mediaRes.durationMs || 0),
    transcript: social_cleanText_(p.transcript || mediaRes.transcript || '', 20000),
    status: social_cleanText_(p.status || 'saved', 40),
    createdAt: new Date().toISOString()
  };
  social_append_('VIDEOS', row);
  return { ok: true, video: social_publicVideo_(row), media: mediaRes };
}

function social_requestTranscription_(req, session) {
  const p = req.payload || {};
  const mediaId = social_cleanText_(p.mediaId || '', 160);
  const media = social_rows_('MEDIA_ASSETS').find(function(m){ return m.projectId === req.projectId && m.id === mediaId; });
  if (!media) throw new Error('Media asset not found for transcription.');
  const webhook = PropertiesService.getScriptProperties().getProperty(OURSPACE_SOCIAL_COMPAT.SPEECH_TO_TEXT_WEBHOOK_PROPERTY);
  const id = social_randomId_('tr');
  const now = new Date().toISOString();
  let status = 'queued';
  let providerJson = {};
  let transcript = '';
  if (p.transcript) {
    transcript = social_cleanText_(p.transcript, 20000);
    status = 'complete';
  } else if (webhook) {
    const payload = { projectId: req.projectId, transcriptId: id, mediaId: media.id, mediaUrl: media.url, mimeType: media.mimeType, language: p.language || 'en-US' };
    const headers = {};
    const apiKey = PropertiesService.getScriptProperties().getProperty(OURSPACE_SOCIAL_COMPAT.SPEECH_TO_TEXT_API_KEY_PROPERTY);
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
    const response = UrlFetchApp.fetch(webhook, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), headers: headers, muteHttpExceptions: true });
    providerJson = { responseCode: response.getResponseCode(), response: response.getContentText().slice(0, 2000) };
    status = response.getResponseCode() >= 200 && response.getResponseCode() < 300 ? 'sent_to_provider' : 'provider_error';
  }
  const row = { projectId: req.projectId, id: id, mediaId: media.id, sourceKind: social_cleanSlug_(p.sourceKind || media.kind || 'media'), language: social_cleanText_(p.language || 'en-US', 40), transcript: transcript, status: status, provider: webhook ? 'webhook' : 'browser/manual', createdBy: session.userId, createdAt: now, updatedAt: now, providerJson: JSON.stringify(providerJson) };
  social_append_('TRANSCRIPTS', row);
  if (transcript) social_updateMediaTranscript_(req.projectId, media.id, transcript);
  return { ok: true, transcript: social_publicTranscript_(row), providerConfigured: Boolean(webhook) };
}

function social_saveTranscript_(req, session) {
  const p = req.payload || {};
  const id = social_cleanText_(p.id || social_randomId_('tr'), 160);
  const mediaId = social_cleanText_(p.mediaId || '', 160);
  const now = new Date().toISOString();
  const existing = social_rows_('TRANSCRIPTS').find(function(t){ return t.projectId === req.projectId && t.id === id; });
  const row = { projectId: req.projectId, id: id, mediaId: mediaId, sourceKind: social_cleanSlug_(p.sourceKind || 'media'), language: social_cleanText_(p.language || 'en-US', 40), transcript: social_cleanText_(p.transcript || '', 20000), status: social_cleanText_(p.status || 'complete', 40), provider: social_cleanText_(p.provider || 'browser/manual', 80), createdBy: session.userId, createdAt: existing ? existing.createdAt : now, updatedAt: now, providerJson: JSON.stringify(p.providerJson || {}) };
  if (existing) social_updateRow_('TRANSCRIPTS', existing._row, row);
  else social_append_('TRANSCRIPTS', row);
  if (mediaId && row.transcript) social_updateMediaTranscript_(req.projectId, mediaId, row.transcript);
  social_audit_(req.projectId, 'save_transcript', session.userId, { id: id, mediaId: mediaId, status: row.status });
  return { ok: true, transcript: social_publicTranscript_(row) };
}

function social_updateMediaTranscript_(projectId, mediaId, transcript) {
  const row = social_rows_('MEDIA_ASSETS').find(function(m){ return m.projectId === projectId && m.id === mediaId; });
  if (row) social_updateRow_('MEDIA_ASSETS', row._row, { transcript: transcript, updatedAt: new Date().toISOString() });
}

function social_saveFaceProfile_(req, session) {
  const p = req.payload || {};
  if (p.consent !== true && String(p.consent) !== 'true') throw new Error('Face profile storage requires explicit user consent.');
  const descriptor = social_normalizeDescriptor_(p.descriptor || p.faceDescriptor || []);
  if (!descriptor.length) throw new Error('Face descriptor array is required. The browser face model creates this; Apps Script stores/matches it.');
  const profileId = social_cleanText_(p.profileId || social_randomId_('face'), 160);
  const now = new Date().toISOString();
  const existing = social_rows_('FACE_PROFILES').find(function(f){ return f.projectId === req.projectId && f.profileId === profileId; });
  const row = { projectId: req.projectId, userId: social_cleanText_(p.userId || session.userId, 120), profileId: profileId, label: social_cleanText_(p.label || session.displayName || 'Face profile', 120), descriptorJson: JSON.stringify(descriptor), modelsVersion: social_cleanText_(p.modelsVersion || 'browser-model', 120), consent: 'true', createdAt: existing ? existing.createdAt : now, updatedAt: now };
  if (existing) social_updateRow_('FACE_PROFILES', existing._row, row);
  else social_append_('FACE_PROFILES', row);
  social_audit_(req.projectId, 'save_face_profile', session.userId, { profileId: profileId });
  return { ok: true, faceProfile: social_publicFaceProfile_(row) };
}

function social_listFaceProfiles_(req, session) {
  const p = req.payload || {};
  const profiles = social_rows_('FACE_PROFILES').filter(function(f){ return f.projectId === req.projectId && (!p.userId || f.userId === p.userId); }).map(publicFaceProfile_);
  return { ok: true, faceProfiles: profiles };
}

function social_matchFaceDescriptor_(req, session) {
  const descriptor = social_normalizeDescriptor_((req.payload || {}).descriptor || (req.payload || {}).faceDescriptor || []);
  if (!descriptor.length) throw new Error('Descriptor is required for face matching.');
  const matches = social_rows_('FACE_PROFILES').filter(social_byProject_(req.projectId)).map(function(f){
    const saved = social_normalizeDescriptor_(social_parseJson_(f.descriptorJson, []));
    return { profile: social_publicFaceProfile_(f), distance: social_descriptorDistance_(descriptor, saved) };
  }).filter(function(m){ return isFinite(m.distance); }).sort(function(a,b){ return a.distance - b.distance; });
  const best = matches.length ? matches[0] : null;
  return { ok: true, matched: Boolean(best && best.distance <= OURSPACE_SOCIAL_COMPAT.FACE_MATCH_THRESHOLD), bestMatch: best, matches: matches.slice(0, 10), threshold: OURSPACE_SOCIAL_COMPAT.FACE_MATCH_THRESHOLD };
}

function social_saveFilterPreset_(req, session) {
  const p = req.payload || {};
  const id = social_cleanText_(p.id || social_randomId_('filter'), 160);
  const now = new Date().toISOString();
  const existing = social_rows_('FILTER_PRESETS').find(function(f){ return f.projectId === req.projectId && f.id === id; });
  const row = { projectId: req.projectId, id: id, createdBy: social_cleanText_(p.createdBy || session.userId, 120), name: social_cleanText_(p.name || 'Filter preset', 160), kind: social_cleanSlug_(p.kind || 'face-filter'), configJson: JSON.stringify(p.config || p.faceMeta || {}), thumbnailUrl: social_cleanText_(p.thumbnailUrl || '', 2000), createdAt: existing ? existing.createdAt : now, updatedAt: now };
  if (existing) social_updateRow_('FILTER_PRESETS', existing._row, row);
  else social_append_('FILTER_PRESETS', row);
  return { ok: true, filterPreset: social_publicFilterPreset_(row) };
}

function social_listFilterPresets_(req, session) {
  const p = req.payload || {};
  const kind = p.kind ? social_cleanSlug_(p.kind) : '';
  const filters = social_rows_('FILTER_PRESETS').filter(function(f){ return f.projectId === req.projectId && (!kind || f.kind === kind); }).map(publicFilterPreset_);
  return { ok: true, filterPresets: filters };
}

function social_createCall_(req, session) {
  const p = req.payload || {};
  const callId = social_cleanText_(p.callId || social_randomId_('call'), 160);
  const room = social_cleanSlug_(p.room || p.conversationId || callId);
  const now = Date.now();
  const participants = [{ id: social_cleanText_(p.peerId || session.userId, 120), userId: session.userId, name: social_cleanText_(p.name || session.displayName || 'Caller', 80), role: 'host', audio: p.audio !== false, video: p.video !== false, screen: Boolean(p.screen), joinedAt: now, lastSeen: now }];
  const row = { projectId: req.projectId, callId: callId, room: room, kind: social_cleanSlug_(p.kind || 'video'), createdBy: session.userId, createdAt: now, updatedAt: now, status: 'active', participantsJson: JSON.stringify(participants), settingsJson: JSON.stringify(p.settings || {}) };
  social_append_('CALLS', row);
  social_addCallEvent_(req.projectId, callId, room, 'call-created', { call: social_publicCall_(row) }, 'server', '*');
  social_messengerEnvelope_(social_mergeRequestPayload_(req, { type: 'call-start', payload: { callId: callId, room: room, kind: row.kind } }), session);
  return { ok: true, call: social_publicCall_(row), iceConfig: social_iceConfig_(req).iceServers };
}

function social_joinCall_(req, session) {
  const p = req.payload || {};
  const call = social_findCall_(req.projectId, p.callId, p.room);
  if (call.status !== 'active') throw new Error('This call is not active.');
  const now = Date.now();
  let participants = social_parseJson_(call.participantsJson, []).filter(function(x){ return now - Number(x.lastSeen || 0) < OURSPACE_SOCIAL_COMPAT.SESSION_TTL_MS; });
  const peerId = social_cleanText_(p.peerId || session.userId, 120);
  participants = participants.filter(function(x){ return x.id !== peerId; });
  participants.push({ id: peerId, userId: session.userId, name: social_cleanText_(p.name || session.displayName || 'Caller', 80), role: 'member', audio: p.audio !== false, video: p.video !== false, screen: Boolean(p.screen), joinedAt: now, lastSeen: now });
  social_updateRow_('CALLS', call._row, { updatedAt: now, participantsJson: JSON.stringify(participants) });
  social_addCallEvent_(req.projectId, call.callId, call.room, 'participants', participants, 'server', '*');
  return { ok: true, callId: call.callId, room: call.room, peerId: peerId, participants: participants, iceConfig: social_iceConfig_(req).iceServers };
}

function social_leaveCall_(req, session) {
  const p = req.payload || {};
  const call = social_findCall_(req.projectId, p.callId, p.room);
  const peerId = social_cleanText_(p.peerId || session.userId, 120);
  const participants = social_parseJson_(call.participantsJson, []).filter(function(x){ return x.id !== peerId; });
  social_updateRow_('CALLS', call._row, { updatedAt: Date.now(), participantsJson: JSON.stringify(participants), status: participants.length ? call.status : 'ended' });
  social_addCallEvent_(req.projectId, call.callId, call.room, 'participants', participants, 'server', '*');
  return { ok: true, callId: call.callId, participants: participants, status: participants.length ? call.status : 'ended' };
}

function social_endCall_(req, session) {
  const p = req.payload || {};
  const call = social_findCall_(req.projectId, p.callId, p.room);
  social_updateRow_('CALLS', call._row, { updatedAt: Date.now(), status: 'ended', participantsJson: '[]' });
  social_addCallEvent_(req.projectId, call.callId, call.room, 'call-ended', { endedBy: session.userId, at: Date.now() }, session.userId, '*');
  social_messengerEnvelope_(social_mergeRequestPayload_(req, { type: 'call-end', payload: { callId: call.callId, room: call.room } }), session);
  return { ok: true, callId: call.callId, status: 'ended' };
}

function social_callSignal_(req, session) {
  const p = req.payload || {};
  const call = social_findCall_(req.projectId, p.callId, p.room);
  const from = social_cleanText_(p.from || p.peerId || session.userId, 120);
  const to = social_cleanText_(p.to || '*', 120);
  const event = social_addCallEvent_(req.projectId, call.callId, call.room, social_cleanText_(p.type || 'signal', 60), { from: from, to: to, sdp: p.sdp, candidate: p.candidate, payload: p.payload }, from, to);
  return { ok: true, event: social_publicCallEvent_(event) };
}

function social_pollCall_(req, session) {
  const p = req.payload || {};
  const call = social_findCall_(req.projectId, p.callId, p.room);
  const peerId = social_cleanText_(p.peerId || session.userId, 120);
  const since = Number(p.since || 0);
  const now = Date.now();
  const participants = social_touchCallParticipant_(call, peerId, p);
  const events = social_rows_('CALL_EVENTS').filter(function(e){ return e.projectId === req.projectId && e.callId === call.callId && Number(e.createdAt) > since && (e.toPeer === '*' || e.toPeer === peerId || e.fromPeer === peerId); }).slice(-200).map(publicCallEvent_);
  social_pruneCallEvents_();
  return { ok: true, now: now, call: social_publicCall_(social_findCall_(req.projectId, call.callId, '')), participants: participants, events: events };
}

function social_findCall_(projectId, callId, room) {
  const cleanCallId = social_cleanText_(callId || '', 160);
  const cleanRoom = room ? social_cleanSlug_(room) : '';
  const call = social_rows_('CALLS').find(function(c){ return c.projectId === projectId && ((cleanCallId && c.callId === cleanCallId) || (cleanRoom && c.room === cleanRoom)); });
  if (!call) throw new Error('Call not found.');
  return call;
}

function social_touchCallParticipant_(call, peerId, p) {
  const now = Date.now();
  let participants = social_parseJson_(call.participantsJson, []).filter(function(x){ return now - Number(x.lastSeen || 0) < OURSPACE_SOCIAL_COMPAT.SESSION_TTL_MS; });
  participants.forEach(function(x){
    if (x.id === peerId) {
      x.lastSeen = now;
      if (p.audio !== undefined) x.audio = Boolean(p.audio);
      if (p.video !== undefined) x.video = Boolean(p.video);
      if (p.screen !== undefined) x.screen = Boolean(p.screen);
    }
  });
  social_updateRow_('CALLS', call._row, { updatedAt: now, participantsJson: JSON.stringify(participants) });
  return participants;
}

function social_addCallEvent_(projectId, callId, room, type, payload, fromPeer, toPeer) {
  const row = { projectId: projectId, callId: callId, room: room, id: social_randomId_('callevt'), fromPeer: fromPeer || 'server', toPeer: toPeer || '*', type: type, payloadJson: JSON.stringify(payload || {}), createdAt: Date.now() };
  social_append_('CALL_EVENTS', row);
  social_pruneCallEvents_();
  return row;
}

function social_pruneCallEvents_() {
  const cutoff = Date.now() - OURSPACE_SOCIAL_COMPAT.CALL_EVENT_TTL_MS;
  const sheet = social_getSheet_('CALL_EVENTS');
  social_rows_('CALL_EVENTS').filter(function(r){ return Number(r.createdAt || 0) < cutoff; }).sort(function(a,b){ return b._row - a._row; }).forEach(function(row){ sheet.deleteRow(row._row); });
}

function social_normalizeDescriptor_(value) {
  if (typeof value === 'string') value = social_parseJson_(value, []);
  if (!Array.isArray(value)) return [];
  return value.map(function(n){ return Number(n); }).filter(function(n){ return isFinite(n); });
}

function social_descriptorDistance_(a, b) {
  if (!a.length || !b.length || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

function social_mergeRequestPayload_(req, patch) {
  const out = { method: req.method, action: req.action, projectId: req.projectId, projectName: req.projectName, sessionToken: req.sessionToken, callback: req.callback, payload: {} };
  Object.keys(req.payload || {}).forEach(function(k){ out.payload[k] = req.payload[k]; });
  Object.keys(patch || {}).forEach(function(k){ out.payload[k] = patch[k]; });
  return out;
}

function social_publicAppRecord_(r) { return { collection: r.collection, id: r.id, owner: r.owner, createdAt: r.createdAt, updatedAt: r.updatedAt, data: social_parseJson_(r.jsonData, {}) }; }
function social_publicCall_(c) { return { callId: c.callId, room: c.room, kind: c.kind, createdBy: c.createdBy, createdAt: Number(c.createdAt), updatedAt: Number(c.updatedAt), status: c.status, participants: social_parseJson_(c.participantsJson, []), settings: social_parseJson_(c.settingsJson, {}) }; }
function social_publicCallEvent_(e) { return { id: e.id, callId: e.callId, room: e.room, from: e.fromPeer, to: e.toPeer, type: e.type, payload: social_parseJson_(e.payloadJson, {}), createdAt: Number(e.createdAt) }; }
function social_publicMediaAsset_(m) { return { id: m.id, kind: m.kind, owner: m.owner, room: m.room, messageId: m.messageId, name: m.name, mimeType: m.mimeType, size: Number(m.size || 0), url: m.url, driveFileId: m.driveFileId, durationMs: Number(m.durationMs || 0), thumbnailUrl: m.thumbnailUrl, transcript: m.transcript, faceMeta: social_parseJson_(m.faceMetaJson, {}), createdAt: m.createdAt, updatedAt: m.updatedAt }; }
function social_publicVoiceMessage_(v) { return { id: v.id, conversationId: v.conversationId, author: v.author, mediaId: v.mediaId, durationMs: Number(v.durationMs || 0), waveform: social_parseJson_(v.waveformJson, []), transcript: v.transcript, status: v.status, createdAt: v.createdAt }; }
function social_publicVideo_(v) { return { id: v.id, author: v.author, mediaId: v.mediaId, kind: v.kind, thumbnailUrl: v.thumbnailUrl, durationMs: Number(v.durationMs || 0), transcript: v.transcript, status: v.status, createdAt: v.createdAt }; }
function social_publicTranscript_(t) { return { id: t.id, mediaId: t.mediaId, sourceKind: t.sourceKind, language: t.language, transcript: t.transcript, status: t.status, provider: t.provider, createdBy: t.createdBy, createdAt: t.createdAt, updatedAt: t.updatedAt, providerData: social_parseJson_(t.providerJson, {}) }; }
function social_publicFaceProfile_(f) { return { userId: f.userId, profileId: f.profileId, label: f.label, descriptorLength: social_normalizeDescriptor_(social_parseJson_(f.descriptorJson, [])).length, modelsVersion: f.modelsVersion, consent: String(f.consent) === 'true', createdAt: f.createdAt, updatedAt: f.updatedAt }; }
function social_publicFilterPreset_(f) { return { id: f.id, createdBy: f.createdBy, name: f.name, kind: f.kind, config: social_parseJson_(f.configJson, {}), thumbnailUrl: f.thumbnailUrl, createdAt: f.createdAt, updatedAt: f.updatedAt }; }

function social_publicState_(projectId) {
  social_pruneSessions_();
  social_pruneStories_();
  const profiles = social_rows_('PROFILES').filter(social_byProject_(projectId)).map(function(p){ return { id: p.id, name: p.name, color: p.color, status: p.status }; });
  const feed = social_rows_('FEED').filter(social_byProject_(projectId)).map(publicPost_).sort(byDateDesc_).slice(0, 250);
  const stories = social_rows_('STORIES').filter(social_byProject_(projectId)).filter(function(s){ return Number(s.expiresAt) > Date.now(); }).map(publicStory_).sort(byDateDesc_).slice(0, 120);
  const messages = social_rows_('MESSAGES').filter(social_byProject_(projectId));
  const channels = {};
  social_rows_('CHANNELS').filter(social_byProject_(projectId)).forEach(function(c){ channels[c.name] = []; });
  messages.forEach(function(m){ if (!channels[m.channel]) channels[m.channel] = []; channels[m.channel].push(social_publicMessage_(m)); });
  Object.keys(channels).forEach(function(k){ channels[k] = channels[k].sort(byDateAsc_).slice(-250); });
  if (!channels.general) channels.general = [];
  const events = social_rows_('EVENTS').filter(social_byProject_(projectId)).map(publicEvent_).sort(function(a,b){ return String(a.start).localeCompare(String(b.start)); }).slice(0, 250);
  const calls = social_rows_('CALLS').filter(social_byProject_(projectId)).map(publicCall_).filter(function(c){ return c.status === 'active'; }).slice(-50);
  const mediaAssets = social_rows_('MEDIA_ASSETS').filter(social_byProject_(projectId)).map(publicMediaAsset_).sort(byDateDesc_).slice(0, 250);
  const voiceMessages = social_rows_('VOICE_MESSAGES').filter(social_byProject_(projectId)).map(publicVoiceMessage_).sort(byDateDesc_).slice(0, 250);
  const videos = social_rows_('VIDEOS').filter(social_byProject_(projectId)).map(publicVideo_).sort(byDateDesc_).slice(0, 250);
  const filterPresets = social_rows_('FILTER_PRESETS').filter(social_byProject_(projectId)).map(publicFilterPreset_).slice(-200);
  return { appName: 'OurSpace', profiles: profiles, channels: channels, feed: feed, stories: stories, onlineUsers: social_onlineUsers_(projectId), events: events, calls: calls, mediaAssets: mediaAssets, voiceMessages: voiceMessages, videos: videos, filterPresets: filterPresets, updatedAt: new Date().toISOString() };
}

function social_onlineUsers_(projectId) {
  const cutoff = Date.now() - OURSPACE_SOCIAL_COMPAT.ACTIVE_WINDOW_MS;
  return social_rows_('SESSIONS').filter(function(s){ return s.projectId === projectId && Number(s.lastSeen) >= cutoff; }).slice(0, OURSPACE_SOCIAL_COMPAT.MAX_ACTIVE_USERS_PER_PROJECT).map(function(s){
    return { clientId: s.userId, name: s.displayName, status: 'online', color: '#38bdf8', section: 'site', activeGame: '', activeGameTitle: '', lastSeen: Number(s.lastSeen), connectedAt: Number(s.createdAt) };
  });
}

function social_messengerHistory_(projectId) {
  return social_rows_('MESSENGER').filter(social_byProject_(projectId)).slice(-1000).map(publicEnvelope_);
}

function social_manifest_(req) {
  const short = req.projectName.slice(0, 12) || 'Project';
  return { ok: true, manifest: { name: req.projectName, short_name: short, display: 'standalone', background_color: '#000305', theme_color: '#003C42', description: 'Private small-network OurSpace.', backendVersion: OURSPACE_SOCIAL_COMPAT.VERSION, capabilities: ['password-auth','google-cloud-auth','email-reset','email-invites','permanent-spreadsheet-storage','drive-media-storage','webrtc-signaling-mailbox','voice-message-storage','video-storage','camera-capture-storage','speech-to-text-webhook-or-browser-transcripts','face-descriptor-storage-and-matching','filter-preset-storage'] } };
}

function social_requireSession_(req, optional) {
  social_pruneSessions_();
  if (!req.sessionToken) {
    if (optional) return null;
    throw new Error('Login required.');
  }
  const session = social_rows_('SESSIONS').find(function(s){ return s.token === req.sessionToken && s.projectId === req.projectId; });
  if (!session) {
    if (optional) return null;
    throw new Error('Session expired. Please log in again.');
  }
  social_updateSessionSeen_(session.token);
  return session;
}

function social_createSession_(projectId, userId, displayName, userAgent) {
  const token = social_randomId_('sess');
  const now = Date.now();
  social_append_('SESSIONS', { token: token, projectId: projectId, userId: userId, displayName: displayName, createdAt: now, lastSeen: now, userAgent: social_cleanText_(userAgent || '', 240) });
  return { sessionToken: token, token: token, projectId: projectId, userId: userId, displayName: displayName, createdAt: now, maxActiveUsers: OURSPACE_SOCIAL_COMPAT.MAX_ACTIVE_USERS_PER_PROJECT };
}

function social_updateSessionSeen_(token) {
  const row = social_rows_('SESSIONS').find(function(s){ return s.token === token; });
  if (row) social_updateRow_('SESSIONS', row._row, { lastSeen: Date.now() });
}

function social_enforceActiveLimit_(projectId, currentToken) {
  const active = social_rows_('SESSIONS').filter(function(s){ return s.projectId === projectId && Date.now() - Number(s.lastSeen || 0) < OURSPACE_SOCIAL_COMPAT.ACTIVE_WINDOW_MS; });
  const alreadyActive = active.some(function(s){ return s.token === currentToken; });
  if (!alreadyActive && active.length >= OURSPACE_SOCIAL_COMPAT.MAX_ACTIVE_USERS_PER_PROJECT) throw new Error('This project already has 10 active people. Try again after someone leaves or becomes inactive.');
}

function social_pruneSessions_() {
  const cutoff = Date.now() - OURSPACE_SOCIAL_COMPAT.SESSION_TTL_MS;
  const sheet = social_getSheet_('SESSIONS');
  const rows = social_rows_('SESSIONS').filter(function(r){ return Number(r.lastSeen || 0) < cutoff; }).sort(function(a,b){ return b._row - a._row; });
  rows.forEach(function(row){ sheet.deleteRow(row._row); });
}

function social_pruneStories_() {
  const sheet = social_getSheet_('STORIES');
  const expired = social_rows_('STORIES').filter(function(r){ return Number(r.expiresAt || 0) < Date.now(); }).sort(function(a,b){ return b._row - a._row; });
  expired.forEach(function(row){ sheet.deleteRow(row._row); });
}

function social_upsertProfile_(projectId, p) {
  const profile = { projectId: projectId, id: social_cleanSlug_(p.id || p.name), name: social_cleanText_(p.name || 'Friend', 80), color: /^#[0-9a-f]{6}$/i.test(String(p.color || '')) ? p.color : '#38bdf8', status: social_cleanText_(p.status || 'Around', 120), updatedAt: new Date().toISOString() };
  const existing = social_rows_('PROFILES').find(function(row){ return row.projectId === projectId && row.id === profile.id; });
  if (existing) social_updateRow_('PROFILES', existing._row, profile);
  else social_append_('PROFILES', profile);
  return { id: profile.id, name: profile.name, color: profile.color, status: profile.status };
}

function social_ensureChannel_(projectId, name) {
  const channel = social_cleanSlug_(name || 'general');
  const exists = social_rows_('CHANNELS').some(function(c){ return c.projectId === projectId && c.name === channel; });
  if (!exists) social_append_('CHANNELS', { projectId: projectId, name: channel, createdAt: new Date().toISOString() });
}

function social_findRoom_(projectId, roomCode) {
  const room = social_rows_('ROOMS').find(function(r){ return r.projectId === projectId && r.room === social_cleanSlug_(roomCode || 'room'); });
  if (!room) throw new Error('Room not found.');
  return room;
}

function social_touchParticipant_(room, peerId, handRaised) {
  const now = Date.now();
  const participants = social_parseJson_(room.participantsJson, []).filter(function(x){ return now - Number(x.lastSeen || 0) < OURSPACE_SOCIAL_COMPAT.ACTIVE_WINDOW_MS; });
  participants.forEach(function(p){ if (p.id === peerId) { p.lastSeen = now; if (handRaised !== null && handRaised !== undefined) p.handRaised = handRaised; } });
  social_updateRow_('ROOMS', room._row, { updatedAt: now, participantsJson: JSON.stringify(participants) });
  return participants;
}

function social_addRoomEvent_(projectId, room, type, payload, fromPeer, toPeer) {
  const row = { projectId: projectId, room: room, id: social_randomId_('signal'), fromPeer: fromPeer || 'server', toPeer: toPeer || '*', type: type, payloadJson: JSON.stringify(payload || {}), createdAt: Date.now(), deliveredJson: '[]' };
  social_append_('SIGNALS', row);
  social_pruneSignals_();
  return row;
}

function social_pruneSignals_() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const sheet = social_getSheet_('SIGNALS');
  social_rows_('SIGNALS').filter(function(r){ return Number(r.createdAt || 0) < cutoff; }).sort(function(a,b){ return b._row - a._row; }).forEach(function(row){ sheet.deleteRow(row._row); });
}

function social_saveMediaIfNeeded_(projectId, dataUrl, mimeType, name, createdBy, force) {
  const value = String(dataUrl || '');
  if (!value) return { url: '', mimeType: mimeType || '', id: '' };
  if (!force && value.length <= OURSPACE_SOCIAL_COMPAT.MAX_MEDIA_CHARS_IN_SHEET) return { url: value, mimeType: mimeType || social_guessMime_(value), id: '' };
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { url: value.slice(0, 2000), mimeType: mimeType || '', id: '' };
  const type = mimeType || match[1] || 'application/octet-stream';
  const bytes = Utilities.base64Decode(match[2]);
  const safeName = social_cleanSlug_(name || 'upload') + '-' + Date.now();
  const blob = Utilities.newBlob(bytes, type, safeName);
  const file = social_getUploadFolder_().createFile(blob);
  if (OURSPACE_SOCIAL_COMPAT.PUBLIC_DRIVE_FILE_LINKS) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = OURSPACE_SOCIAL_COMPAT.PUBLIC_DRIVE_FILE_LINKS ? ('https://drive.google.com/uc?export=download&id=' + file.getId()) : file.getUrl();
  const id = social_randomId_('file');
  social_append_('FILES', { projectId: projectId, id: id, name: safeName, mimeType: type, size: bytes.length, url: url, driveFileId: file.getId(), createdBy: createdBy || '', createdAt: new Date().toISOString() });
  return { id: id, name: safeName, mimeType: type, size: bytes.length, url: url, driveFileId: file.getId() };
}

function social_publicPost_(p) { return { id: p.id, author: p.author, text: p.text, media: p.media, mediaType: p.mediaType, createdAt: p.createdAt, reactions: social_parseJson_(p.reactionsJson, []), comments: social_parseJson_(p.commentsJson, []) }; }
function social_publicMessage_(m) { return { id: m.id, author: m.author, text: m.text, media: m.media, mediaType: m.mediaType, origin: m.origin, createdAt: m.createdAt, reactions: social_parseJson_(m.reactionsJson, []) }; }
function social_publicStory_(s) { return { id: s.id, author: s.author, text: s.text, media: s.media, mediaType: s.mediaType, createdAt: s.createdAt, expiresAt: Number(s.expiresAt), reactions: social_parseJson_(s.reactionsJson, []) }; }
function social_publicEnvelope_(e) { return { id: e.id, type: e.type, clientId: e.clientId, createdAt: e.createdAt, payload: social_parseJson_(e.payloadJson, {}), appName: e.appName || 'OurSpace Messenger' }; }
function social_publicEvent_(e) { return { id: e.id, title: e.title, start: e.start, end: e.end, location: e.location, description: e.description, createdBy: e.createdBy, createdAt: e.createdAt, updatedAt: e.updatedAt, calendarEventId: e.calendarEventId }; }
function social_publicUser_(u) { return { userId: u.userId, accountId: u.userId, username: u.username, displayName: u.displayName, role: u.role, avatar: u.avatar, status: u.status, email: u.email || '', phone: u.phone || '', backupEmails: social_parseBackupEmails_(u.backupEmailsJson), mustChangePassword: String(u.mustChangePassword || '') === 'true' }; }

function social_output_(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function social_getSpreadsheet_() {
  return site_ensureDatabase_();
}

function social_getUploadFolder_() {
  return site_ensureUploadFolder_();
}

function social_getSheet_(key) {
  const headers = OURSPACE_SOCIAL_COMPAT.SHEETS[key];
  const ss = social_getSpreadsheet_();
  let sheet = ss.getSheetByName('Compat_' + key);
  if (!sheet) sheet = ss.insertSheet('Compat_' + key);
  const width = headers.length;
  const first = sheet.getRange(1, 1, 1, width).getValues()[0];
  const mismatch = headers.some(function(h, i){ return first[i] !== h; });
  if (mismatch) sheet.getRange(1, 1, 1, width).setValues([headers]);
  return sheet;
}

function social_rows_(key) {
  const sheet = social_getSheet_(key);
  const values = sheet.getDataRange().getValues();
  const headers = OURSPACE_SOCIAL_COMPAT.SHEETS[key];
  if (values.length <= 1) return [];
  return values.slice(1).map(function(row, i){
    const obj = { _row: i + 2 };
    headers.forEach(function(h, c){ obj[h] = row[c]; });
    return obj;
  });
}

function social_append_(key, obj) {
  const sheet = social_getSheet_(key);
  const headers = OURSPACE_SOCIAL_COMPAT.SHEETS[key];
  sheet.appendRow(headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
}

function social_updateRow_(key, rowNumber, patch) {
  const sheet = social_getSheet_(key);
  const headers = OURSPACE_SOCIAL_COMPAT.SHEETS[key];
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const next = headers.map(function(h, i){ return patch[h] !== undefined ? patch[h] : current[i]; });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([next]);
}

function social_audit_(projectId, action, userId, details) {
  social_append_('AUDIT', { at: new Date().toISOString(), projectId: projectId, action: action, userId: userId || '', detailsJson: JSON.stringify(details || {}) });
}

function social_hashPassword_(password, salt) {
  const raw = salt + ':' + String(password || '');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

function social_randomId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20);
}

function social_cleanSlug_(value) {
  const cleaned = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  return cleaned || 'default';
}

function social_cleanUsername_(value) {
  return String(value || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.@-]+/g, '').slice(0, 80);
}

function social_cleanText_(value, limit) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, limit || 4000);
}

function social_parseJson_(value, fallback) {
  try { return JSON.parse(value || ''); }
  catch (_err) { return fallback; }
}

function social_mergeObjects_(a, b) {
  const out = {};
  Object.keys(a || {}).forEach(function(k){ out[k] = a[k]; });
  Object.keys(b || {}).forEach(function(k){ if (out[k] === undefined) out[k] = b[k]; });
  return out;
}

function social_byProject_(projectId) { return function(row){ return row.projectId === projectId; }; }
function social_byDateDesc_(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }
function social_byDateAsc_(a, b) { return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); }
function social_guessMime_(dataUrl) { const m = String(dataUrl || '').match(/^data:([^;]+)/); return m ? m[1] : ''; }