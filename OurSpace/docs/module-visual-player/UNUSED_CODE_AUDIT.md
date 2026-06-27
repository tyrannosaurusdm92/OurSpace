# Unused Code Audit

No source project code was copied into the production module. The uploaded projects were used only for review and design decisions.

## Not imported

- React/Vite app code from `memoirsofher-main.zip` because the site module needs direct HTML embedding.
- Static demo video/media assets from `VideoGallerySite-main.zip` because they would bloat the site.
- Bootstrap/theme/font bundles from `Lx-Gallery-master.zip` because OurSpace already has its own visual system.
- Go server/static generator code from `gogallery-master.zip` because this module must run in the browser.
- Eleventy build templates from `eleventy-photo-gallery-main.zip` because OurSpace is not being rebuilt through Eleventy.
- Django app/backend code from `django-photo-gallery-master.zip` because the requested backend is Apps Script.
- Jekyll/Liquid layouts from `jekyll-photos-master.zip` because the site uses direct HTML modules.
- Joomla/PHP plugin code from `ozio-master.zip` because it is CMS-specific and GPL-copyleft.
- WordPress/Vimeo plugin code from `vimeography-master.zip` because it is CMS/Vimeo-specific and GPL-copyleft.
- Laravel/PHP app code from `Video_Gallery_Laravel-master.zip` because it requires a Laravel server stack.

## What replaced them

A new vanilla module was created with:

- `js/ourspace-visual-player.js`
- `css/ourspace-visual-player.css`
- HTML snippets and docs

This keeps the app lighter and avoids shipping unused framework code.
