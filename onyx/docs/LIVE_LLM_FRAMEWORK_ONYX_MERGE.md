# Live LLM Framework Merged into Onyx

This package uses **Lord Onyx Blepman** as the sole personality. The former `OnePersonalityLiveLLM` framework has been merged behind Onyx as infrastructure, not as a second assistant identity.

## What was merged

- Persistent SQLite conversations and long-term memory: `onyx_brain/live_memory.py`
- Uploaded-text RAG/document chunks: `onyx_brain/live_memory.py`
- Local tool loop for calculator/current time: `onyx_brain/live_memory.py`
- Strong model adapter remains in `onyx_brain/llm_adapters.py`
- Auditable original framework source copied to `merged_llm_framework_reference/`
- One-personality config: `config/onyx_single_personality_llm.json`
- Interactive mood image controller: `static/js/onyx.js`
- OurSpace Google Apps Script backend adapter: `onyx_brain/backend_bridge.py`

## Sole personality rule

Every generated answer routes through `prompts/onyx_system_prompt.md`. Any stronger model connected through OpenAI-compatible or Ollama endpoints receives Onyx's scanner context and must answer as Onyx.

## Mood switching

The UI switches to `thinking` immediately while Onyx is processing. The final mood is returned by `/api/chat` and selected by `OnyxBrain.choose_interactive_mood()`.

Covered moods:

- `advising_professor`
- `caring`
- `hungry`
- `judgmental`
- `listening`
- `purring`
- `sleepy`
- `snuggly`
- `thinking`
- `thoughtful`

Run:

```bash
python -m unittest discover -s tests -v
```

or open:

```text
/api/mood-test
```

## OurSpace backend

The user-provided backend source is:

```text
https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

Live calls now use Google Apps Script /exec URLs in `.env`:

```text
ONYX_FULL_BACKEND_URL=https://script.google.com/macros/s/AKfycbwy_5_ZEsSmN5WqcuLtxfPFz1ITyz6IHxPnpEBPIVOtsa7k6Rb60O-u6gJdPNF_tjaR/exec
```

Then Onyx can call:

- `setup`
- `health`
- `signup`
- `signin`
- `signout`
- `me`
- `forgotEmail`
- `forgotUsername`
- `requestPasswordReset`
- `resetPassword`
- `recordPurchase`
- `listMyPurchases`
- `recordEarn`
- `listMyEarnings`
