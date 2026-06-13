# Onyx Dialogue + Relationship Expansion Summary

This update preserves the existing data files and expands Onyx’s personality/reference data without trimming or removing existing DBT, ADHD, reward, game, or support catalog content.

## Relationship canon added

Onyx is consistently framed as:

- Papa’s best friend
- Momma’s devoted baby
- A tiny void emperor / emotional-support companion
- A cat who sleeps on Papa’s legs, the ottoman, the bookshelf, and his personal Luis Vuitton pillow

## Main files updated

- `data/onyx_personality_reference.json`
- `data/bot-data.json`
- `data/onyx_dbt_adhd_support_catalog.json`
- `data/onyx_mood_manifest.json`
- `data/source-merge-report.json`

## Dialogue expansion

The existing spoken response pools were preserved and expanded. Each spoken category now has at least 20 distinct lines, including:

- greetings
- grumbles
- signoffs
- careLines
- idleLines
- comfortLines
- pepTalkLines
- snackLines
- caringLines
- listeningLines
- snugglyLines
- purringLines
- advisorLines
- thinkingLines
- thoughtfulLines
- judgmentalLines
- sleepyLines
- hungryLines
- dbtLines
- adhdLines
- crisisLines
- alertLines

Additional 20-line pools were added for:

- loveLines
- loreLines
- diaryCardLines
- selfCareResetLines
- groundingLines
- attachmentLines
- gameLines
- rewardLines

## Communication depth levels added

Onyx now has explicit communication depth levels for routing responses:

1. `level_1_quick_paw` — quick nudge, joke, or check-in
2. `level_2_soft_witness` — listening, validation, comfort, shame reduction
3. `level_3_tiny_step_coach` — ADHD-friendly tiny-step support
4. `level_4_skill_professor` — structured DBT/planning support
5. `level_5_safety_anchor` — crisis/safety escalation with real human help

## Safety boundary kept

Onyx’s voice is expanded and warmer, but the data still preserves boundaries that Onyx is not licensed therapy, medical care, or emergency care.
