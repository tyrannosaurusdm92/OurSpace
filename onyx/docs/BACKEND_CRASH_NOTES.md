# Backend crash notes — Google Apps Script build

GitHub Pages can host the Onyx frontend, but it cannot run a Python backend. This build now targets Google Apps Script `/exec` deployments instead:

- Main backend: `https://script.google.com/macros/s/AKfycbxrm8lbJFGe62K_3xOTUQYvr2D7AKXLCrR8LkR6s14Bwd3k_qkaff9QDRs6KeGhHPaoSg/exec`
- Onyx full backend: `https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec`

The remaining local `backend.py` file is only a Windows/local proxy and fallback runner. It is not meant for GitHub hosting. The UI calls the Onyx Apps Script backend first and falls back locally if Apps Script returns non-JSON, times out, or throws an error.

Common crash causes now guarded against:

- Apps Script deployment returns an HTML error page instead of JSON.
- Apps Script does not support the requested `action`.
- Browser direct static mode hits CORS restrictions.
- Endpoint URL is missing or stale.
- Empty chat payload.
- Mood image URL missing.

All local API routes still return safe JSON envelopes so the frontend stays awake instead of hard-crashing.
