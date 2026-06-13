# Lord Onyx Blepman — Momma’s DBT + ADHD Emotional Support Void

This build expands Onyx from a personality-only companion into a local-first emotional-support helper for **Momma**, while keeping his full Onyx voice, snuggly default mood, emotion assets, lore, idle behavior, and loving judgmental-care rule.

## What changed

- Default mood remains **Snuggly**.
- Judgmental mode remains restricted to skipped self-care or missing Onyx snack/treat/tribute.
- Onyx now has DBT helper skills, ADHD helper tools, diary-card prompts, grounding support, self-care reset prompts, and crisis-aware safety escalation.
- Jasper’s phone + email alert signup link is built into the sidebar and into Onyx’s alert responses: `https://form.typeform.com/to/trAqvrRG`.
- Chat export now includes installed DBT skill keys, ADHD tool keys, alert signup URL, and the local chat log.
- The app remains browser-only and stores chat locally in the browser.

## Included files

- `emperor_onyx_rulebot.html` — open this in a browser.
- `css/emperor-onyx-rulebot.css` — Onyx interface styling, including new support cards and alert signup styling.
- `js/emperor-onyx-rulebot-data.js` — Onyx personality, lore, moods, DBT/ADHD support data, crisis-safety rules, and alert signup link.
- `js/emperor-onyx-rulebot.js` — chat behavior, mood switching, DBT/ADHD routing, idle lines, local chat saving, and JSON export.
- `assets/onyx-moods/` — all Onyx mood images.
- `json/onyx_personality_reference.json` — readable personality reference.
- `json/onyx_dbt_adhd_support_catalog.json` — standalone support catalog for reuse.
- `json/dbt_skills_catalog.json`, `json/dbt_worksheets_catalog.json`, `json/dbt_combined_catalog.json` — uploaded paraphrased DBT catalog data included for future app integration.

## DBT helper skills added

Onyx can now route messages toward:

- Wise Mind
- Observe / Describe / Participate
- Nonjudgmental Stance
- STOP
- TIPP
- Self-Soothe with Senses
- Radical Acceptance
- Check the Facts
- Opposite Action
- PLEASE vulnerability care
- DEAR MAN
- GIVE + FAST
- Chain Analysis
- DBT Daily Diary Card

These are educational coaching prompts and structured practice helpers. They are not reproduced copyrighted workbook pages and they are not therapy.

## ADHD helper tools added

Onyx can now help with:

- Tiny Task Splitter
- Body Double Mode
- Dopamine Menu
- Transition Bridge
- Reminder Loop
- Shame-Free Reset

The ADHD support is designed around externalizing memory, making tasks visible, making steps tiny, rewarding starts, reducing shame, and supporting task transitions.

## Expanded emotion asset support

Onyx actively uses every unique emotion asset in `assets/onyx-moods/`:

- Caring: soft reassurance, Momma-first protection, no shame.
- Listening: venting support, validation before advice.
- Snuggly: cozy closeness and weighted-blanket energy.
- Advising Professor: glasses/clipboard planning, DBT/ADHD tiny steps.
- Purring: grounding, breathing, nervous-system soothing.
- Thinking: problem processing and brainstorming.
- Thoughtful: kind truth, nuance, careful support.
- Judgmental/Judgemental: loving quality control only for skipped self-care or missing Onyx snack tribute.
- Sleepy: rest permission and leg-blanket supervision.
- Hungry: dramatic wet-food/gravy tribute mode.

## Safety boundary

Onyx can coach skills, grounding, routines, self-care check-ins, and safety nudges. He is not licensed therapy, medical care, medication guidance, or emergency care. If Momma might hurt themself, might hurt someone else, cannot stay safe, or is in immediate danger, the app tells Momma to contact live emergency/crisis support and a trusted person nearby.


## New in this build: mobile games + Jasper rewards

This build merges the uploaded mobile-friendly HTML games into Onyx and adds a shared **Jasper Currency Tracker**:

- `10 copper = 1 silver`
- `10 silver = 1 gold`
- `10 gold = 1 platinum`

The tracker is stored locally in the browser under `jasperCareCurrencyLedger.v1`. It is shared by:

- Onyx chat messages and asking for help
- DBT skills and de-escalation tactics
- Severe ADHD tools, task splitting, body doubling, transition bridges, and shame-free resets
- Journaling and DBT diary cards
- Decompression and nervous-system regulation
- Tiny-step self-care routines
- Mobile game play, game interaction milestones, and stopping before overstimulation

## Tiny-step self-care rewards

Self-care is intentionally split into many tiny rewarded steps so Jasper can earn currency even when a full routine is too much. The included reward catalog covers:

- Brushing teeth
- Quick wipes / low-energy body care
- Cleaning outer ears safely
- Trimming/file nails
- Shower tiny steps
- Bath tiny steps
- Eating a meal or snack that counts
- Drinking a hydrating beverage
- Taking medication exactly as prescribed / logging medication
- Asking for help, talking with Onyx, journaling, grounding, decompression, and returning from games to care

The complete catalog is in:

- `json/jasper_reward_system_catalog.json`
- `js/jasper-reward-catalog-data.js`

## Mobile games

The uploaded mobile-friendly games are included in:

- `games/`

Each game HTML has been injected with:

- `js/jasper-game-currency-bridge.js`

The bridge adds a small overlay inside each game and converts play time, interaction milestones, 5-minute decompression, and regulated stopping into Jasper currency. The original compiled/canvas game internals are not used as the reward source anymore; Jasper currency is the shared reward system.

## Attachment, severe ADHD, and BPD-pattern support

Onyx now includes skill-based support for:

- Underlying reactive attachment / abandonment alarm
- Severe ADHD / executive dysfunction
- Discouraged / Quiet BPD-style states: worthlessness, dependence, loneliness, rejection fear
- Petulant BPD-style states: anger, possessiveness, control urges, relationship dissatisfaction
- Self-destructive BPD-style states: self-hate, risky urges, self-harm/suicidal urge safety routing

This is not diagnosis, licensed therapy, medical treatment, or emergency care. Onyx is a bridge and skills companion while real care is hard to access. If safety is not solid, the app redirects to live emergency/crisis support and a trusted person nearby. In the U.S., the 988 Lifeline can be reached by call, text, or chat 24/7.
