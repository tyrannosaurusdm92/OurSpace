# Full Merge Report

## What changed in this pass

1. The full-emotion psychiatry app is no longer only preserved as source. Its Python engine is imported into the active `onyx_brain` package.
2. Psychiatry, DBT, ADHD, autism, trauma, disability, physical-health, accommodations, mobility, daily-living, relationship/community, work/school/financial, and emergency-risk JSONs were copied into `static/data/psychiatry/` and indexed by the live engine.
3. The chat endpoint now uses this pipeline:
   - detect Onyx profile/mood/risk
   - retrieve relevant support/health/accessibility chunks
   - compose local Onyx draft
   - optionally send the scan context to a stronger OpenAI-compatible or Ollama model
   - return mood image, suggestions, profile, risk, and answer
4. The UI now supports Papa/Momma relational mode, suggestions, local chat memory, knowledge stats, mood chips, and stronger “thinking” feedback.
5. The old app sources remain under `source_projects/`, but the runtime is now unified around one Onyx brain.

## Active runtime files

- `server.py` dependency-free standard-library server
- `app.py` optional Flask server
- `onyx_brain/engine.py` full merged coordinator
- `onyx_brain/psychiatry_engine.py` imported full-emotion support engine
- `onyx_brain/llm_adapters.py` OpenAI-compatible/Ollama adapter
- `prompts/onyx_system_prompt.md` singular Onyx prompt
- `static/index.html`, `static/js/onyx.js`, `static/css/onyx.css` live interface
