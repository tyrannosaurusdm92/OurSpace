# Health & Behavior Reference Scanner

This folder contains one merged local-first scanner for behavioral support, physical-health support, DBT skill lookup, and chatbot document referencing.

## What it does

- Scans chatbot conversations for direct support needs and cautious “between the lines” signals.
- Searches built-in DBT and health/accessibility catalog entries.
- Lets you attach the files your host program already possesses.
- Creates a citeable reference pack a chatbot can use before answering.
- Exports scan reports, attached-document indexes, and chatbot prompts.
- Keeps the old scanner idea of threshold-based scoring and structured export, but the visible app is only for behavioral and physical health assistance.

## Start

Open `index.html` in a browser. For best file loading behavior, serve the folder locally:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Referencing attached documents in chatbots

Use the file picker for text-like files, or create a document package from a folder:

```bash
python tools/document_reference_indexer.py /path/to/your/app/files --out exports/reference_package.json
```

Import `exports/reference_package.json` in the browser app, or pass it to your chatbot pipeline.

## Integration files

- `assets/js/scanner-core.js` is the reusable scanner engine.
- `assets/js/health_scanner_bridge.js` exposes a small bridge for chatbot apps.
- `examples/chatbot-integration.js` shows how to pass messages and attached text into the scanner.
- `assets/data/health_scanner_data.js` contains the bundled DBT and health-support reference catalogs.

## Safety note

This is not a diagnostic, treatment, medical, or emergency tool. It should label implied findings as possible, cite documents when it uses them, and direct urgent safety or medical red flags to emergency/crisis/urgent support.
