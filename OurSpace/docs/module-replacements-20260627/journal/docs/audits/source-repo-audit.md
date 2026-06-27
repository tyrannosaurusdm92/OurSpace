# Source Repo Audit

No source code from the uploaded repositories was copied into the shipped module. The final module is newly written, dependency-free browser code. The repos were reviewed for feature ideas and then documented here so unused code does not get bundled into the app.

| Repo | Files | Size | License observed | Decision | Concepts kept |
|---|---:|---:|---|---|---|
| 100-days-of-code-master | 104 | 0.28 MB | Unknown / no top-level license found | Not bundled because no clear top-level reuse permission was found. | log-template reference only; not used |
| BulletJournal-master | 1423 | 47.39 MB | GPL family | Not bundled to avoid bringing GPL app code into this site module. | organization/notebook/category concept; no code copied due GPL/full-stack size |
| Journal-AWS-Amplify-Tutorial-master | 411 | 21.55 MB | MIT | Not bundled; concept-only review. | cloud sync concept; no code copied |
| JournalBook-master | 75 | 6.01 MB | MIT | Not bundled; permissive concepts adapted without copying code. | offline-first local persistence idea; simple daily entry navigation concept |
| journal-master | 718 | 112.78 MB | Unknown / no top-level license found | Not bundled because no clear top-level reuse permission was found. | content archive/blog reference; not used for app module |
| journalApp-master | 49 | 0.13 MB | Unknown / no top-level license found | Not bundled because no clear top-level reuse permission was found. | server-side journaling app reference; no code copied |
| journiv-app-main | 455 | 59.15 MB | PolyForm Noncommercial 1.0.0 | Not bundled because license is noncommercial/restrictive. | mood/media-rich private journal feature awareness; no code copied due license |
| mini-diary-master | 197 | 2.59 MB | MIT | Not bundled; permissive concepts adapted without copying code. | small private diary concept; plain export/download workflow idea |
| open-journalism-master | 14 | 4.04 MB | Unknown / no top-level license found | Not bundled because no clear top-level reuse permission was found. | not a journaling app; not used |
| rednotebook-master | 246 | 4.98 MB | GPL family | Not bundled to avoid bringing GPL app code into this site module. | export/readable journal archive concept; tag/search concept |
| sol-journal-master | 66 | 0.79 MB | MIT | Not bundled; permissive concepts adapted without copying code. | PWA/offline sync concept; minimal responsive journaling layout idea |
| tui-journal-main | 81 | 2.43 MB | MIT | Not bundled; permissive concepts adapted without copying code. | folder/tag/search workflow concept; local JSON backend concept |