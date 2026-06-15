# Merge report

## Source of truth for Onyx

`onyx_personality_expanded_data.zip` was treated as the main canon source because it contains:

- Onyx personality JSON
- DBT/ADHD/support catalogs
- service voice summaries
- Onyx mood manifest
- ten Onyx mood portraits

## How the other uploads were merged

- `live-stream-chat-ai-agent-main.zip` → represented by `/api/live-stream-turn` and integration notes for stream overlays.
- `shannon-language-model-main.zip` → represented by `onyx_brain/markov.py`, a small Shannon/Markov-inspired local flavor engine.
- `liveproject-dlsm-master.zip` → preserved under `source_projects/` as training/reference notebooks and source.
- `live-vlm-webui-main.zip` → preserved under `source_projects/` and referenced in `integrations/vision_model_bridge_notes.md` for webcam/VLM expansion.
- `DocuMind-Vision_Language_Model---Live-Project-main.zip` → preserved under `source_projects/`; merged app includes safe `/api/image-mood` workflow without claiming false visual analysis.

## New merged layer

The new merged layer is the runnable `app.py` + `onyx_brain` + web UI. It keeps Onyx as one singular personality: a black cat who was once human, royal and attitude-heavy, but loving, snuggly, emotionally attuned, and helpful.

## Files intentionally not copied

Runtime cache folders, `.git` folders, `node_modules`, and Python `__pycache__` directories were not copied into the final ZIP because they are generated artifacts and can break portability. Source code, docs, assets, and data were preserved.
