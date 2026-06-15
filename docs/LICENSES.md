# License Notes

This folder documents licensing decisions for the integrated plug-in.

## Active shipped code

### Original OurSpace Messenger plug-in files
- Files:
  - `index.html`
  - `css/ourspace-messenger.css`
  - `js/ourspace-backend-bridge.js`
  - `js/ourspace-messenger.js`
  - documentation files in `docs/`
- Status: newly written for this plug-in.

### Jeeliz FaceFilter runtime/model
- Files:
  - `vendor/jeeliz/jeelizFaceFilter.js`
  - `vendor/jeeliz/NN_VERYLIGHT_1.json`
  - `vendor/jeeliz/LICENSE-APACHE-2.0.txt`
- License in source package: Apache-2.0.
- Purpose: active face-filter camera support.

## Sources not copied into active code

- React Discord clone: GPL-3.0. Concepts only; no code copied.
- Next.js Messenger clone: MIT. Concepts only; no code copied.
- Matrix STT bot: MIT. Concepts only; no code copied.
- Voice Change-O-Matic: CC0. Concepts only; no code copied.
- WhatsApp clone archive: no clear top-level license found in archive listing; no code copied.
- Snapchat source archive: no clear top-level license found in archive listing; no code copied.

## Why full source apps are absent

The requested output was a plug-in without unused legacy code. Bundling complete old apps would add unused frameworks, duplicate UI approaches, incompatible build systems, and licensing risk. The final zip includes only active code loaded by the plug-in and documentation explaining what was incorporated.
