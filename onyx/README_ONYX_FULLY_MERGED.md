**Latest merge:** see `README_ONYX_LIVE_LLM_MERGED.md` for the live LLM framework + interactive mood image integration.

# Lord Onyx Blepman — Fully Merged Live Model

Run `START_ONYX_WINDOWS.bat` on Windows, or `python server.py` from this folder.

This version merges the earlier live VLM/chat/personality package with the full-emotion psychiatry app into one active runtime:

- `onyx_brain/engine.py` is the single coordinator.
- `onyx_brain/psychiatry_engine.py` is now part of the active response path.
- `static/data/psychiatry/` contains the DBT, psychiatric, physical-health, disability, mobility, daily-living, accommodations, relationship/community, work/school/financial, and emergency-risk JSON knowledge.
- `prompts/onyx_system_prompt.md` defines the singular Onyx persona for any connected LLM.
- `static/assets/onyx-moods/` drives the live mood portrait changes.
- `source_projects/OnyxPsychiatryUnifiedApp_full_emotion_android_source/` preserves the Android full-emotion source inside this merged package.

## Using a stronger model

Copy `.env.example` to `.env`, then set either OpenAI-compatible settings or Ollama settings. The local scanner still runs first; the LLM receives the Onyx mood/profile/skill/health scan as context before writing the final answer.

## Main endpoints

- `/` live Onyx chat UI
- `/api/chat` merged chat route
- `/api/scan` raw local psychiatric/health scan
- `/api/persona` mood/persona/knowledge info
- `/api/live-stream-turn` stream-agent compatible turn endpoint
- `/api/image-mood` Onyx mood picker using provided mood portraits/context
