# Lord Onyx Blepman — Live LLM Framework Fully Merged

This build makes **Lord Onyx Blepman, Emperor of the Voidattude** the sole personality while merging the live LLM framework behind him as infrastructure.

## Run

Windows:

```bat
START_ONYX_WINDOWS.bat
```

macOS/Linux:

```bash
bash START_ONYX_MAC_LINUX.sh
```

Open:

```text
http://127.0.0.1:7869
```

## What changed in this merge

- Onyx remains the only persona.
- Added durable SQLite conversation memory.
- Added explicit long-term memory saving/searching.
- Added uploaded text/document chunk retrieval.
- Added local calculator and current-time tool notes.
- Added OurSpace Google Apps Script backend bridge.
- Added deterministic interactive mood routing for every included Onyx portrait.
- The UI now switches to `thinking` while waiting, then switches to the final Onyx mood returned by the brain.
- The full prior live LLM framework is included under `merged_llm_framework_reference/` for audit/reference, but the active app is Onyx.

## Mood images tested

The automated test matrix verifies these moods route to existing image files:

- advising professor
- caring
- hungry
- judgmental
- listening
- purring
- sleepy
- snuggly
- thinking
- thoughtful

Run tests:

```bash
python -m unittest discover -s tests -v
```

API check:

```text
GET /api/mood-test
```

## Strong model backend

By default Onyx can run locally with his scanner/persona engine. For stronger generation, set one provider in `.env`:

```text
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=...
```

or:

```text
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=...
```

The stronger model receives Onyx's system prompt, retrieved memory/docs, psychiatric/DBT/body-care scanner context, and must answer as Onyx.

## OurSpace backend

The requested backend source is linked here:

```text
https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

After running or deploying `backend.py`, put its real base API URL in `.env` if it is external:

```text
ONYX_FULL_BACKEND_URL=https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

Then Onyx can call the backend actions through `/api/backend/call`.
