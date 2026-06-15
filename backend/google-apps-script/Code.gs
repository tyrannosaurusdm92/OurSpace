/*******************************************************
 * OurSpace Two-Profile Sign-In + Store Receipt Backend
 * SINGLE FILE: paste into Google Apps Script Code.gs
 *
 * Revised from the attached OurSpace backend to remove outside-app
 * provider/social login actions while keeping local sign-up/sign-in,
 * browser-password-manager-friendly frontend support, sessions,
 * password reset, earnings, cart/purchase records, and receipt emails.
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *******************************************************/

const OURSPACE_CONFIG = {
  APP_NAME: 'OurSpace two-profile sign-in + store receipts',
  DATABASE_PROPERTY_KEY: 'OURSPACE_BACKEND_SPREADSHEET_ID',
  MAX_USERS: 2,
  SESSION_DAYS: 30,
  RESET_CODE_MINUTES: 30,
  MIN_PASSWORD_LENGTH: 8,

  PROFILES: {
    william: {
      profileKey: 'william',
      displayName: 'William / Dino',
      siteName: 'Dino Nerdzone',
      primaryEmail: 'williamsaville92@gmail.com',
      purchaseNotificationRecipient: 'jasperfaye99@gmail.com'
    },
    jasper: {
      profileKey: 'jasper',
      displayName: 'Jasper',
      siteName: 'Squishy Cottage',
      primaryEmail: 'jasperfaye99@gmail.com',
      purchaseNotificationRecipient: 'williamsaville92@gmail.com'
    }
  },

  SHEETS: {
    users: 'Users',
    sessions: 'Sessions',
    resets: 'PasswordResets',
    purchases: 'Purchases',
    earnings: 'Earnings',
    audit: 'AuditLog'
  }
};

function availableActions_() {
  return [
    'setup',
    'health',
    'signup',
    'signin',
    'signout',
    'me',
    'forgotEmail',
    'forgotUsername',
    'requestPasswordReset',
    'resetPassword',
    'recordPurchase',
    'listMyPurchases',
    'recordEarn',
    'listMyEarnings'
  ];
}

function doGet(e) {
  try {
    const payload = parseRequest_(e);
    const action = String(payload.action || '').trim();
    if (action) return jsonResponse_(routeAction_(action, payload));
    return jsonResponse_({
      ok: true,
      app: OURSPACE_CONFIG.APP_NAME,
      message: 'OurSpace backend is online.',
      availableActions: availableActions_()
    });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const payload = parseRequest_(e);
    const action = String(payload.action || '').trim();
    if (!action) return jsonResponse_({ ok: false, error: 'Missing action.' });
    return jsonResponse_(routeAction_(action, payload));
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function routeAction_(action, payload) {
  ensureDatabase_();
  switch (action) {
    case 'setup': return setupBackend_();
    case 'health': return health_();
    case 'signup': return signup_(payload);
    case 'signin': return signin_(payload);
    case 'signout': return signout_(payload);
    case 'me': return me_(payload);
    case 'forgotEmail': return forgotEmail_(payload);
    case 'forgotUsername': return forgotUsername_(payload);
    case 'requestPasswordReset': return requestPasswordReset_(payload);
    case 'resetPassword': return resetPassword_(payload);
    case 'recordPurchase': return recordPurchase_(payload);
    case 'listMyPurchases': return listMyPurchases_(payload);
    case 'recordEarn': return recordEarn_(payload);
    case 'listMyEarnings': return listMyEarnings_(payload);
    default: return { ok: false, error: 'Unknown action: ' + action };
  }
}

function setupBackend_() {
  const ss = ensureDatabase_();
  return {
    ok: true,
    app: OURSPACE_CONFIG.APP_NAME,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    message: 'OurSpace backend setup complete.'
  };
}

function health_() {
  const ss = ensureDatabase_();
  const users = getRows_(OURSPACE_CONFIG.SHEETS.users).filter(function (u) { return String(u.Active) === 'true'; });
  return {
    ok: true,
    app: OURSPACE_CONFIG.APP_NAME,
    databaseReady: true,
    spreadsheetId: ss.getId(),
    activeUserCount: users.length,
    maxUsers: OURSPACE_CONFIG.MAX_USERS,
    profileSlots: Object.keys(OURSPACE_CONFIG.PROFILES),
    outsideAppsRemoved: true
  };
}

/*******************************************************
 * LOCAL AUTH ONLY: SIGN UP / SIGN IN / SESSION
 *******************************************************/

function passwordFromPayload_(payload, primaryField) {
  const fields = primaryField ? [primaryField, 'password', 'localPassword', 'signinPassword', 'newPassword'] : ['password', 'localPassword', 'signinPassword', 'newPassword'];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (payload[field] !== undefined && payload[field] !== null) return String(payload[field]);
  }
  return '';
}

function requirePassword_(password, label) {
  const minimum = Number(OURSPACE_CONFIG.MIN_PASSWORD_LENGTH || 8);
  if (!password || password.length < minimum) {
    throw new Error((label || 'Password') + ' must be at least ' + minimum + ' characters.');
  }
}

function signup_(payload) {
  const email = normalizeEmail_(payload.email);
  const username = normalizeUsername_(payload.username);
  const displayName = cleanText_(payload.displayName || payload.nickname || username || email);
  const password = passwordFromPayload_(payload, 'password');
  const requestedProfileKey = normalizeProfileKey_(payload.profileKey);

  if (!email) throw new Error('Email is required.');
  if (!username) throw new Error('Username is required.');
  requirePassword_(password, 'Password');
  if (!displayName) throw new Error('Display name is required.');

  const profileKey = requestedProfileKey || inferProfileKeyFromEmail_(email);
  if (!profileKey || !OURSPACE_CONFIG.PROFILES[profileKey]) {
    throw new Error('Profile slot is required. Use profileKey "william" or "jasper".');
  }

  const users = getRows_(OURSPACE_CONFIG.SHEETS.users);
  if (users.filter(function (u) { return String(u.Active) === 'true'; }).length >= OURSPACE_CONFIG.MAX_USERS) {
    throw new Error('OurSpace already has 2 permanent users. A third account cannot be created.');
  }
  if (findUserByEmail_(email)) throw new Error('That email is already registered.');
  if (findUserByUsername_(username)) throw new Error('That username is already registered.');
  if (findUserByProfileKey_(profileKey)) throw new Error('That permanent profile slot is already taken.');

  const salt = randomToken_(32);
  const passwordHash = hashPassword_(password, salt);
  const now = isoNow_();
  const user = {
    UserId: makeId_('user'),
    ProfileKey: profileKey,
    DisplayName: displayName,
    Email: email,
    Username: username,
    PasswordSalt: salt,
    PasswordHash: passwordHash,
    CreatedAt: now,
    UpdatedAt: now,
    Active: 'true'
  };

  appendRow_(OURSPACE_CONFIG.SHEETS.users, user);
  appendAudit_('signup', user.UserId, { profileKey: profileKey, email: email, username: username });
  const session = createSession_(user.UserId);
  return {
    ok: true,
    message: 'Signed up successfully.',
    user: safeUser_(user),
    sessionToken: session.SessionToken,
    expiresAt: session.ExpiresAt
  };
}

function signin_(payload) {
  const identifier = normalizeIdentifier_(payload.identifier || payload.email || payload.username);
  const requestedProfileKey = normalizeProfileKey_(payload.profileKey || '');
  const password = passwordFromPayload_(payload, 'password');

  if (!identifier) throw new Error('Email or username is required.');
  requirePassword_(password, 'Password');

  const user = findUserByEmail_(identifier) || findUserByUsername_(identifier) || findUserByProfileKey_(identifier);
  if (!user || String(user.Active) !== 'true') throw new Error('No matching active user found.');
  if (requestedProfileKey && user.ProfileKey !== requestedProfileKey) {
    throw new Error('That sign-in does not belong to the selected profile.');
  }
  const testHash = hashPassword_(password, user.PasswordSalt);
  if (testHash !== user.PasswordHash) throw new Error('Password did not match the selected profile.');

  const session = createSession_(user.UserId);
  appendAudit_('signin', user.UserId, { method: 'password' });
  return {
    ok: true,
    message: 'Signed in successfully.',
    user: safeUser_(user),
    sessionToken: session.SessionToken,
    expiresAt: session.ExpiresAt
  };
}

function signout_(payload) {
  const token = String(payload.sessionToken || '').trim();
  if (!token) return { ok: true, message: 'No session token provided.' };
  const sessions = getRows_(OURSPACE_CONFIG.SHEETS.sessions);
  const session = sessions.find(function (s) { return String(s.SessionToken) === token && String(s.Active) === 'true'; });
  if (session) {
    updateRowById_(OURSPACE_CONFIG.SHEETS.sessions, 'SessionId', session.SessionId, { Active: 'false', UpdatedAt: isoNow_() });
    appendAudit_('signout', session.UserId, {});
  }
  return { ok: true, message: 'Signed out.' };
}

function me_(payload) {
  const auth = requireSession_(payload.sessionToken);
  return { ok: true, user: safeUser_(auth.user), session: { expiresAt: auth.session.ExpiresAt } };
}

/*******************************************************
 * FORGOT EMAIL / USERNAME / PASSWORD RESET
 *******************************************************/

function forgotEmail_(payload) {
  const username = normalizeUsername_(payload.username);
  if (!username) throw new Error('Username is required.');
  const user = findUserByUsername_(username);
  if (!user || String(user.Active) !== 'true') {
    return { ok: true, found: false, message: 'No active user found for that username.' };
  }
  return { ok: true, found: true, email: maskEmail_(user.Email), profileKey: user.ProfileKey };
}

function forgotUsername_(payload) {
  const email = normalizeEmail_(payload.email);
  if (!email) throw new Error('Email is required.');
  const user = findUserByEmail_(email);
  if (!user || String(user.Active) !== 'true') {
    return { ok: true, found: false, message: 'No active user found for that email.' };
  }
  return { ok: true, found: true, username: user.Username, profileKey: user.ProfileKey };
}

function requestPasswordReset_(payload) {
  const identifier = normalizeIdentifier_(payload.identifier || payload.email || payload.username);
  if (!identifier) throw new Error('Email or username is required.');
  const user = findUserByEmail_(identifier) || findUserByUsername_(identifier);
  if (!user || String(user.Active) !== 'true') {
    return { ok: true, message: 'If that account exists, a reset code was sent.' };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const salt = randomToken_(16);
  const codeHash = sha256Hex_(salt + '|' + code);
  const expiresAt = new Date(Date.now() + OURSPACE_CONFIG.RESET_CODE_MINUTES * 60 * 1000).toISOString();

  appendRow_(OURSPACE_CONFIG.SHEETS.resets, {
    ResetId: makeId_('reset'),
    UserId: user.UserId,
    ProfileKey: user.ProfileKey,
    CodeSalt: salt,
    CodeHash: codeHash,
    CreatedAt: isoNow_(),
    ExpiresAt: expiresAt,
    Used: 'false',
    UsedAt: ''
  });

  MailApp.sendEmail({
    to: user.Email,
    subject: 'OurSpace password reset code',
    name: 'OurSpace sign-in',
    body: 'The OurSpace password reset code is: ' + code + '\n\nThis code expires in ' + OURSPACE_CONFIG.RESET_CODE_MINUTES + ' minutes.\n\nIf the reset was not requested, ignore this email.',
    htmlBody: '<h2>OurSpace password reset</h2><p>The reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">' + escapeHtml_(code) + '</p><p>This code expires in ' + OURSPACE_CONFIG.RESET_CODE_MINUTES + ' minutes.</p><p>If the reset was not requested, ignore this email.</p>'
  });

  appendAudit_('requestPasswordReset', user.UserId, {});
  return { ok: true, message: 'If that account exists, a reset code was sent.' };
}

function resetPassword_(payload) {
  const identifier = normalizeIdentifier_(payload.identifier || payload.email || payload.username);
  const code = String(payload.code || payload.resetCode || '').trim();
  const newPassword = passwordFromPayload_(payload, 'newPassword');
  if (!identifier) throw new Error('Email or username is required.');
  if (!code) throw new Error('Reset code is required.');
  requirePassword_(newPassword, 'New password');

  const user = findUserByEmail_(identifier) || findUserByUsername_(identifier);
  if (!user || String(user.Active) !== 'true') throw new Error('No active user found.');

  const resets = getRows_(OURSPACE_CONFIG.SHEETS.resets)
    .filter(function (r) { return r.UserId === user.UserId && String(r.Used) !== 'true'; })
    .sort(function (a, b) { return String(b.CreatedAt).localeCompare(String(a.CreatedAt)); });

  const validReset = resets.find(function (r) {
    const notExpired = new Date(r.ExpiresAt).getTime() > Date.now();
    const hashMatches = sha256Hex_(r.CodeSalt + '|' + code) === r.CodeHash;
    return notExpired && hashMatches;
  });
  if (!validReset) throw new Error('Invalid or expired reset code.');

  const salt = randomToken_(32);
  const passwordHash = hashPassword_(newPassword, salt);
  updateRowById_(OURSPACE_CONFIG.SHEETS.users, 'UserId', user.UserId, { PasswordSalt: salt, PasswordHash: passwordHash, UpdatedAt: isoNow_() });
  updateRowById_(OURSPACE_CONFIG.SHEETS.resets, 'ResetId', validReset.ResetId, { Used: 'true', UsedAt: isoNow_() });
  appendAudit_('resetPassword', user.UserId, {});
  return { ok: true, message: 'Password reset successfully.' };
}

/*******************************************************
 * PURCHASE RECORDING + EMAIL NOTIFICATIONS
 * Kept from the attached backend, with only auth plumbing revised.
 *******************************************************/

function recordPurchase_(payload) {
  let purchaserUser = null;
  let purchaserProfileKey = normalizeProfileKey_(payload.purchaserProfile || payload.profileKey);

  if (payload.sessionToken) {
    const auth = requireSession_(payload.sessionToken);
    purchaserUser = auth.user;
    purchaserProfileKey = purchaserUser.ProfileKey;
  }

  if (!purchaserProfileKey || !OURSPACE_CONFIG.PROFILES[purchaserProfileKey]) {
    throw new Error('Purchaser profile must be "william" or "jasper".');
  }

  if (!purchaserUser) purchaserUser = findUserByProfileKey_(purchaserProfileKey);

  const purchaserProfile = OURSPACE_CONFIG.PROFILES[purchaserProfileKey];
  const recipientEmail = purchaserProfile.purchaseNotificationRecipient;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) throw new Error('Purchase must include at least one item.');

  const items = rawItems.map(function (item, index) {
    const quantity = Number(item.quantity || item.qty || 1);
    const unitCostCopper = Number(item.unitCostCopper || item.costCopper || item.priceCopper || 0);
    const totalCostCopper = Number(item.totalCostCopper || quantity * unitCostCopper || 0);
    return {
      line: index + 1,
      itemId: cleanText_(item.id || item.itemId || ''),
      name: cleanText_(item.name || item.title || 'Unnamed item'),
      quantity: isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitCostCopper: isFinite(unitCostCopper) && unitCostCopper >= 0 ? unitCostCopper : 0,
      totalCostCopper: isFinite(totalCostCopper) && totalCostCopper >= 0 ? totalCostCopper : 0,
      notes: cleanText_(item.notes || item.note || '')
    };
  });

  const calculatedTotalCopper = items.reduce(function (sum, item) { return sum + Number(item.totalCostCopper || 0); }, 0);
  const totalCostCopper = Number(payload.totalCostCopper || calculatedTotalCopper);
  const purchaseId = makeId_('purchase');
  const storeName = cleanText_(payload.storeName || purchaserProfile.displayName + ' Reward Store');
  const purchaseNote = cleanText_(payload.note || payload.notes || '');
  const createdAt = isoNow_();

  const purchase = {
    PurchaseId: purchaseId,
    PurchaserProfile: purchaserProfileKey,
    PurchaserUserId: purchaserUser ? purchaserUser.UserId : '',
    PurchaserDisplayName: purchaserUser ? purchaserUser.DisplayName : purchaserProfile.displayName,
    StoreName: storeName,
    TotalCostCopper: totalCostCopper,
    TotalCostDisplay: formatCurrency_(totalCostCopper),
    ItemsJson: JSON.stringify(items),
    Note: purchaseNote,
    CreatedAt: createdAt,
    EmailSentTo: recipientEmail
  };

  appendRow_(OURSPACE_CONFIG.SHEETS.purchases, purchase);
  sendPurchaseEmail_(purchase, items, recipientEmail);
  appendAudit_('recordPurchase', purchaserUser ? purchaserUser.UserId : purchaserProfileKey, {
    purchaseId: purchaseId,
    purchaserProfile: purchaserProfileKey,
    totalCostCopper: totalCostCopper,
    totalCostDisplay: formatCurrency_(totalCostCopper),
    recipientEmail: recipientEmail
  });

  return {
    ok: true,
    message: 'Purchase recorded and notification email sent.',
    purchaseId: purchaseId,
    emailedTo: recipientEmail,
    totalCostCopper: totalCostCopper,
    totalCostDisplay: formatCurrency_(totalCostCopper),
    receiptText: buildReceiptText_(purchase, items),
    items: items
  };
}

function buildReceiptText_(purchase, items) {
  const lines = [
    String(purchase.StoreName || 'Profile Store') + ' purchase',
    'Purchase ID: ' + purchase.PurchaseId,
    'Purchaser: ' + (purchase.PurchaserDisplayName || purchase.PurchaserProfile),
    'Store: ' + purchase.StoreName,
    'Time: ' + purchase.CreatedAt,
    'Total: ' + purchase.TotalCostDisplay,
    '',
    'Items:'
  ];
  items.forEach(function (item) {
    lines.push('- ' + item.name + ' | Qty: ' + item.quantity + ' | Unit: ' + formatCurrency_(item.unitCostCopper) + ' | Line total: ' + formatCurrency_(item.totalCostCopper) + (item.notes ? ' | Notes: ' + item.notes : ''));
  });
  if (purchase.Note) lines.push('', 'Purchase note:', purchase.Note);
  return lines.join('\n');
}

function sendPurchaseEmail_(purchase, items, recipientEmail) {
  const purchaserName = purchase.PurchaserDisplayName || purchase.PurchaserProfile;
  const subject = String(purchase.StoreName || 'Profile Store') + ' purchase: ' + purchaserName + ' bought rewards';
  const plainLines = buildReceiptText_(purchase, items).split('\n');
  const htmlRows = items.map(function (item) {
    return '<tr>' +
      '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml_(item.name) + '</td>' +
      '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + escapeHtml_(String(item.quantity)) + '</td>' +
      '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml_(formatCurrency_(item.unitCostCopper)) + '</td>' +
      '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml_(formatCurrency_(item.totalCostCopper)) + '</td>' +
      '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml_(item.notes || '') + '</td>' +
    '</tr>';
  }).join('');

  const htmlBody = '<div style="font-family:Arial,sans-serif;line-height:1.45;color:#111;">' +
    '<h2>' + escapeHtml_(String(purchase.StoreName || 'Profile Store')) + ' purchase</h2>' +
    '<p><strong>Purchase ID:</strong> ' + escapeHtml_(purchase.PurchaseId) + '</p>' +
    '<p><strong>Purchaser:</strong> ' + escapeHtml_(purchaserName) + '</p>' +
    '<p><strong>Store:</strong> ' + escapeHtml_(purchase.StoreName) + '</p>' +
    '<p><strong>Time:</strong> ' + escapeHtml_(purchase.CreatedAt) + '</p>' +
    '<p><strong>Total:</strong> ' + escapeHtml_(purchase.TotalCostDisplay) + '</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:900px;">' +
      '<thead><tr style="background:#f0f0f0;">' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>' +
        '<th style="padding:8px;border:1px solid #ddd;">Qty</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Unit cost</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Line total</th>' +
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Notes</th>' +
      '</tr></thead>' +
      '<tbody>' + htmlRows + '</tbody>' +
    '</table>' +
    (purchase.Note ? '<h3>Purchase note</h3><p>' + escapeHtml_(purchase.Note) + '</p>' : '') +
  '</div>';

  MailApp.sendEmail({
    to: recipientEmail,
    subject: subject,
    name: String(purchase.StoreName || 'Profile Store'),
    body: plainLines.join('\n'),
    htmlBody: htmlBody
  });
}

function listMyPurchases_(payload) {
  const auth = requireSession_(payload.sessionToken);
  const purchases = getRows_(OURSPACE_CONFIG.SHEETS.purchases)
    .filter(function (p) { return p.PurchaserUserId === auth.user.UserId || p.PurchaserProfile === auth.user.ProfileKey; })
    .map(function (p) {
      return {
        purchaseId: p.PurchaseId,
        storeName: p.StoreName,
        totalCostCopper: Number(p.TotalCostCopper || 0),
        totalCostDisplay: p.TotalCostDisplay,
        items: safeJsonParse_(p.ItemsJson, []),
        note: p.Note,
        createdAt: p.CreatedAt,
        emailSentTo: p.EmailSentTo
      };
    });
  return { ok: true, purchases: purchases };
}

/*******************************************************
 * EARNED CURRENCY HISTORY
 *******************************************************/

function recordEarn_(payload) {
  let actorUser = null;
  let profileKey = normalizeProfileKey_(payload.profile || payload.profileKey);
  if (payload.sessionToken) {
    const auth = requireSession_(payload.sessionToken);
    actorUser = auth.user;
    profileKey = actorUser.ProfileKey;
  }
  if (!profileKey || !OURSPACE_CONFIG.PROFILES[profileKey]) throw new Error('Earn profile must be "william" or "jasper".');
  if (!actorUser) actorUser = findUserByProfileKey_(profileKey);

  const amount = Math.max(0, Math.floor(Number(payload.amount || payload.totalCopper || payload.rewardCopper || 0)));
  const entry = {
    EarningId: cleanText_(payload.id || payload.earningId) || makeId_('earn'),
    ProfileKey: profileKey,
    UserId: actorUser ? actorUser.UserId : '',
    Source: cleanText_(payload.source || 'site'),
    Label: cleanText_(payload.label || payload.task || payload.reason || 'Earned currency'),
    AmountCopper: amount,
    AmountDisplay: cleanText_(payload.display || formatCurrency_(amount)),
    DetailsJson: JSON.stringify(stripOversizedData_(payload, 20000)),
    CreatedAt: cleanText_(payload.createdAt) || isoNow_()
  };
  const existing = getRows_(OURSPACE_CONFIG.SHEETS.earnings).find(function (row) { return String(row.EarningId) === String(entry.EarningId); });
  if (!existing) appendRow_(OURSPACE_CONFIG.SHEETS.earnings, entry);
  appendAudit_('recordEarn', actorUser ? actorUser.UserId : profileKey, { earningId: entry.EarningId, profileKey: profileKey, amountCopper: amount });
  return {
    ok: true,
    message: existing ? 'Earning was already recorded.' : 'Earning recorded.',
    earning: { earningId: entry.EarningId, profileKey: profileKey, amountCopper: amount, amountDisplay: entry.AmountDisplay, source: entry.Source, label: entry.Label, createdAt: entry.CreatedAt }
  };
}

function listMyEarnings_(payload) {
  const auth = requireSession_(payload.sessionToken);
  const limit = clampNumber_(payload.limit, 1, 500, 200);
  const earnings = getRows_(OURSPACE_CONFIG.SHEETS.earnings)
    .filter(function (row) { return row.UserId === auth.user.UserId || row.ProfileKey === auth.user.ProfileKey; })
    .sort(function (a, b) { return String(b.CreatedAt).localeCompare(String(a.CreatedAt)); })
    .slice(0, limit)
    .map(function (row) {
      return {
        earningId: row.EarningId,
        profileKey: row.ProfileKey,
        source: row.Source,
        label: row.Label,
        amountCopper: Number(row.AmountCopper || 0),
        amountDisplay: row.AmountDisplay,
        details: safeJsonParse_(row.DetailsJson, {}),
        createdAt: row.CreatedAt
      };
    });
  return { ok: true, earnings: earnings };
}

/*******************************************************
 * DATABASE CREATION
 *******************************************************/

function ensureDatabase_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty(OURSPACE_CONFIG.DATABASE_PROPERTY_KEY);
  let ss = null;
  if (spreadsheetId) {
    try { ss = SpreadsheetApp.openById(spreadsheetId); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('OurSpace Backend Database');
    props.setProperty(OURSPACE_CONFIG.DATABASE_PROPERTY_KEY, ss.getId());
  }

  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.users, ['UserId','ProfileKey','DisplayName','Email','Username','PasswordSalt','PasswordHash','CreatedAt','UpdatedAt','Active']);
  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.sessions, ['SessionId','UserId','SessionToken','CreatedAt','UpdatedAt','ExpiresAt','Active']);
  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.resets, ['ResetId','UserId','ProfileKey','CodeSalt','CodeHash','CreatedAt','ExpiresAt','Used','UsedAt']);
  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.purchases, ['PurchaseId','PurchaserProfile','PurchaserUserId','PurchaserDisplayName','StoreName','TotalCostCopper','TotalCostDisplay','ItemsJson','Note','CreatedAt','EmailSentTo']);
  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.earnings, ['EarningId','ProfileKey','UserId','Source','Label','AmountCopper','AmountDisplay','DetailsJson','CreatedAt']);
  ensureSheet_(ss, OURSPACE_CONFIG.SHEETS.audit, ['AuditId','Action','Actor','DetailsJson','CreatedAt']);
  return ss;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const range = sheet.getRange(1, 1, 1, headers.length);
  const existing = range.getValues()[0];
  const hasHeaders = existing.some(function (value) { return String(value || '').trim() !== ''; });
  if (!hasHeaders) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  headers.forEach(function (header) {
    if (existing.indexOf(header) === -1) {
      sheet.getRange(1, existing.length + 1).setValue(header);
      existing.push(header);
    }
  });
  return sheet;
}

function getDb_() { return ensureDatabase_(); }
function getSheet_(sheetName) {
  const ss = getDb_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  return sheet;
}

function getRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  return values.slice(1)
    .filter(function (row) { return row.some(function (cell) { return String(cell || '').trim() !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function appendRow_(sheetName, obj) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (header) { return obj[header] !== undefined ? obj[header] : ''; }));
}

function updateRowById_(sheetName, idField, idValue, patch) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('No rows in ' + sheetName);
  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const idIndex = headers.indexOf(idField);
  if (idIndex === -1) throw new Error('Missing ID field ' + idField + ' in ' + sheetName);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIndex]) === String(idValue)) {
      Object.keys(patch).forEach(function (key) {
        const colIndex = headers.indexOf(key);
        if (colIndex !== -1) sheet.getRange(r + 1, colIndex + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  throw new Error('Could not find row in ' + sheetName + ' where ' + idField + ' = ' + idValue);
}

/*******************************************************
 * USER LOOKUPS + SESSION HELPERS
 *******************************************************/

function findUserById_(userId) { return getRows_(OURSPACE_CONFIG.SHEETS.users).find(function (u) { return String(u.UserId) === String(userId); }) || null; }
function findUserByEmail_(email) { const normalized = normalizeEmail_(email); return getRows_(OURSPACE_CONFIG.SHEETS.users).find(function (u) { return normalizeEmail_(u.Email) === normalized; }) || null; }
function findUserByUsername_(username) { const normalized = normalizeUsername_(username); return getRows_(OURSPACE_CONFIG.SHEETS.users).find(function (u) { return normalizeUsername_(u.Username) === normalized; }) || null; }
function findUserByProfileKey_(profileKey) { const normalized = normalizeProfileKey_(profileKey); return getRows_(OURSPACE_CONFIG.SHEETS.users).find(function (u) { return normalizeProfileKey_(u.ProfileKey) === normalized && String(u.Active) === 'true'; }) || null; }

function createSession_(userId) {
  const session = {
    SessionId: makeId_('session'),
    UserId: userId,
    SessionToken: randomToken_(48),
    CreatedAt: isoNow_(),
    UpdatedAt: isoNow_(),
    ExpiresAt: new Date(Date.now() + OURSPACE_CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    Active: 'true'
  };
  appendRow_(OURSPACE_CONFIG.SHEETS.sessions, session);
  return session;
}

function requireSession_(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) throw new Error('Session token is required.');
  const session = getRows_(OURSPACE_CONFIG.SHEETS.sessions).find(function (s) { return String(s.SessionToken) === token && String(s.Active) === 'true'; });
  if (!session) throw new Error('Invalid session.');
  if (new Date(session.ExpiresAt).getTime() <= Date.now()) {
    updateRowById_(OURSPACE_CONFIG.SHEETS.sessions, 'SessionId', session.SessionId, { Active: 'false', UpdatedAt: isoNow_() });
    throw new Error('Session expired.');
  }
  const user = findUserById_(session.UserId);
  if (!user || String(user.Active) !== 'true') throw new Error('Session user is not active.');
  return { session: session, user: user };
}

/*******************************************************
 * HELPERS
 *******************************************************/

function formatCurrency_(totalCopper) {
  let copper = Math.max(0, Math.floor(Number(totalCopper || 0)));
  const platinum = Math.floor(copper / 1000); copper = copper % 1000;
  const gold = Math.floor(copper / 100); copper = copper % 100;
  const silver = Math.floor(copper / 10); copper = copper % 10;
  const parts = [];
  if (platinum) parts.push(platinum + ' platinum');
  if (gold) parts.push(gold + ' gold');
  if (silver) parts.push(silver + ' silver');
  if (copper) parts.push(copper + ' copper');
  return parts.length ? parts.join(', ') : '0 copper';
}

function hashPassword_(password, salt) { return sha256Hex_(String(salt) + '|ourspace-password|' + String(password)); }
function sha256Hex_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { const v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}
function randomToken_(byteLength) { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, Math.max(0, Number(byteLength || 32) - 32)); }
function makeId_(prefix) { return String(prefix || 'id') + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20); }
function normalizeEmail_(email) { return String(email || '').trim().toLowerCase(); }
function normalizeUsername_(username) { return String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''); }
function normalizeIdentifier_(value) { return String(value || '').trim().toLowerCase(); }
function normalizeProfileKey_(profileKey) { const value = String(profileKey || '').trim().toLowerCase(); if (value === 'dino' || value === 'dino dad' || value === 'william') return 'william'; if (value === 'squishy' || value === 'jasper') return 'jasper'; return value; }
function inferProfileKeyFromEmail_(email) { const e = normalizeEmail_(email); if (e === normalizeEmail_(OURSPACE_CONFIG.PROFILES.william.primaryEmail)) return 'william'; if (e === normalizeEmail_(OURSPACE_CONFIG.PROFILES.jasper.primaryEmail)) return 'jasper'; return ''; }
function cleanText_(value) { return String(value || '').trim(); }
function safeUser_(user) { return { userId: user.UserId, profileKey: user.ProfileKey, displayName: user.DisplayName, email: user.Email, username: user.Username, siteName: OURSPACE_CONFIG.PROFILES[user.ProfileKey] ? OURSPACE_CONFIG.PROFILES[user.ProfileKey].siteName : '' }; }
function maskEmail_(email) { const e = normalizeEmail_(email); const parts = e.split('@'); if (parts.length !== 2) return e; const name = parts[0]; const domain = parts[1]; const maskedName = name.length <= 2 ? name[0] + '*' : name[0] + '***' + name[name.length - 1]; return maskedName + '@' + domain; }
function escapeHtml_(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function safeJsonParse_(value, fallback) { try { return JSON.parse(String(value || '')); } catch (err) { return fallback; } }
function isoNow_() { return new Date().toISOString(); }
function clampNumber_(value, min, max, fallback) { const n = Math.floor(Number(value)); if (!isFinite(n)) return fallback; return Math.max(min, Math.min(max, n)); }

function stripOversizedData_(value, maxJsonLength) {
  const seen = [];
  function clean(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value.length > 5000 ? value.slice(0, 5000) + '…' : value;
    if (typeof value !== 'object') return value;
    if (seen.indexOf(value) !== -1) return '[circular]';
    seen.push(value);
    if (Array.isArray(value)) return value.slice(0, 50).map(clean);
    const out = {};
    Object.keys(value).slice(0, 80).forEach(function (key) { out[key] = clean(value[key]); });
    return out;
  }
  let cleaned = clean(value);
  let json = JSON.stringify(cleaned);
  const max = maxJsonLength || 45000;
  if (json.length > max) cleaned = { warning: 'Original JSON was shortened for Google Sheets cell limits.', preview: json.slice(0, max - 200) };
  return cleaned;
}

function parseRequest_(e) {
  if (e && e.postData && e.postData.contents) {
    const raw = String(e.postData.contents || '').trim();
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (err) {
      const params = {};
      raw.split('&').forEach(function (part) {
        const pieces = part.split('=');
        const key = decodeURIComponent(pieces[0] || '');
        const value = decodeURIComponent((pieces[1] || '').replace(/\+/g, ' '));
        if (key) params[key] = value;
      });
      return params;
    }
  }
  return e && e.parameter ? e.parameter : {};
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

function appendAudit_(action, actor, details) {
  appendRow_(OURSPACE_CONFIG.SHEETS.audit, {
    AuditId: makeId_('audit'),
    Action: action,
    Actor: actor || '',
    DetailsJson: JSON.stringify(details || {}),
    CreatedAt: isoNow_()
  });
}

/*******************************************************
 * FRONTEND PAYLOAD EXAMPLE
 * fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({
 *   action: 'signin', identifier: 'example@email.com', password: 'password123'
 * }) }).then(r => r.json()).then(console.log);
 *******************************************************/
