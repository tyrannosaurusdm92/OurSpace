# Unused code audit

No uploaded repository source code was copied into the runtime module. The following categories were intentionally excluded and documented here instead of being bundled into the app:

- React scaffolds and package locks
- Django apps, migrations, templates, and SQLite databases
- GraphQL/Apollo client code
- Node/Express backend servers
- Supabase schemas/hotfix scripts
- Cloudinary/Google Cloud/Cloud Run deployment docs
- demo media, artist images, social preview images, and unrelated branding
- Python audio conversion/transcoding utilities
- stem separation tooling and ffmpeg wrappers
- cookie-consent and SEO files unrelated to the OurSpace media module

Reason: these files would bloat the app, add unused dependencies, or conflict with the current OurSpace HTML/Google Apps Script architecture.
