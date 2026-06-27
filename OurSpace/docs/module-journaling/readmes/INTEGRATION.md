# Integration Notes

## Auto-mount integration

Add the stylesheet to the page head:

```html
<link rel="stylesheet" href="assets/css/journal-module.css">
```

Add the module root wherever the journal should appear:

```html
<div
  id="ourspace-journal-root"
  data-ourspace-journal-auto
  data-profile="william"
  data-backend-url="https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec">
</div>
```

Add scripts before the closing body tag:

```html
<script src="assets/js/docx-lite-reader.js"></script>
<script src="assets/js/journal-module.js"></script>
```

## Manual mount integration

```html
<div id="ourspace-journal-root"></div>
<script src="assets/js/docx-lite-reader.js"></script>
<script src="assets/js/journal-module.js"></script>
<script>
  OurSpaceJournal.mount('#ourspace-journal-root', {
    profile: 'william',
    backendUrl: 'https://script.google.com/macros/s/AKfycbwL1e8Gv-o0wC8kAhseMwoNhs97OBvCfCB5FV4zwNnCRa9jYWbYwm2B-wYwUOjlnjg_vA/exec'
  });
</script>
```

## Site profile detection

If `profile` is not provided, the module checks:

1. `document.body.dataset.profile`
2. `document.body.dataset.user`
3. `document.body.dataset.accountName`
4. `window.OurSpaceAuth.profile`
5. `window.OurSpaceAuth.userName`
6. `window.OurSpaceAuth.accountName`
7. localStorage keys used by earlier OurSpace builds
8. `shared`

This lets the journal sync by account/profile name across devices when the backend handler stores by the supplied `key`.
