# Mobile backend and multi-device auth patch

Locked backend URL:

`https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec`

Applied fixes:

- Lowercase `ourspace.html` is included for the GitHub Pages route.
- Login/signup/signout are cloud-first and use the locked backend URL.
- Browser-local accounts are only used as a migration fallback, not as the required source of truth.
- Sessions are stored per device and backend sessions are appended, not single-device. Signing in on a phone does not sign out laptop/tablet sessions.
- Backend calls use readable POST/GET first, JSONP GET fallback for mobile/CORS, and opaque write fallback for non-auth writes.
- Messenger now pulls `message.list` on a timer and merges backend messages so William and Jasper can see messages across devices when the backend is reachable.
- Included backend file has JSONP response support for the site/link-share JSON endpoints; keep the same deployment URL when redeploying.
- Onyx frontend remains hidden; the included backend functions are reserved.
