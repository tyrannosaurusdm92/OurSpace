# GitHub Size / Compression Notes

## sources_original_unmodified
The live GitHub Pages site does **not** need `sources_original_unmodified`. That folder is archival/provenance material: original upstream source copies, patch references, and preserved source history. Keep it in a separate archive branch, release ZIP, Google Drive/Dropbox folder, or local backup instead of the deployed Pages branch.

## Smaller support data layout
For the runtime site, keep these compact active folders:

- `index.html`
- `css/`
- `js/`
- `json/`
- `assets/onyx-moods/`
- `docs/` for reports/manifests only

The support catalog files are already compacted into JSON/JS. Duplicate `/data` mirrors are not required for the app to run.

## Games
The actual game HTML folders are not included in this ZIP. The launcher shell was changed, but the individual game source files were not changed. Keep the existing `games/` folder already on GitHub; upload this ZIP over the repo without deleting that folder.

## Strongest GitHub strategy
Use the main GitHub Pages branch for runtime files only. Put large archives (`sources_original_unmodified`, original source trees, game source packs, unmodified PDFs) in GitHub Releases or a separate backup branch.
