# Lord Onyx Blepman — Google Apps Script Live Voidattude Model

This package keeps **Onyx as the only personality** and routes the live backend through the deployed Google Apps Script `/exec` endpoints you provided.

## Backend endpoints wired in

Main backend:

```text
https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec
```

Onyx full backend:

```text
https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

## Start on Windows — safest local-proxy mode

Double-click:

```bat
START_ONYX_WINDOWS.bat
```

This opens the Onyx UI at:

```text
http://127.0.0.1:7869
```

The local `backend.py` is now only a desktop proxy/fallback runner. It calls the Onyx Google Apps Script backend first. If Apps Script throws an error, returns HTML instead of JSON, times out, or is blocked, Onyx falls back to the local merged brain instead of hard-crashing.

## Static GitHub Pages mode

The root `index.html` plus the `static/` folder can be uploaded to GitHub Pages. That static page calls the Onyx Apps Script backend directly.

If GitHub Pages mode shows a backend/CORS error, use the Windows launcher/local proxy mode. Browser-to-Apps-Script CORS behavior depends on the deployment and response headers.

## What this build includes

- Single Onyx personality only.
- Mood/image switching for all 10 portraits.
- Google Apps Script backend config in `.env.example`, `config/`, frontend JS, and local proxy metadata.
- Safe JSON handling for Apps Script non-JSON/error pages.
- SQLite local fallback memory.
- RAG/local knowledge fallback.
- OpenAI-compatible/Ollama optional local fallback model adapters.
- Root `index.html` for static hosting.
- `static/index.html` for local proxy hosting.

## Tested

See:

```text
docs/GOOGLE_APPS_SCRIPT_V5_TEST_REPORT.json
```

Local compile/tests/server/UI assets/mood-image routing passed. External live Apps Script contents could not be fully inspected from the sandbox because the web tool could not safely follow Google’s Apps Script redirect, so verify the deployed scripts themselves in your browser with `?action=health`.
