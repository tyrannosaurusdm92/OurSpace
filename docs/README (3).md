# Onyx Attach — Dino Nerdzone + Squishy Cottage

This is a Windows-safe web drop-in for attaching Onyx to exactly these files:

- `dino-nerdzone.html` → Onyx profile: `papa` / Dino Dad
- `squishy-cottage.html` → Onyx profile: `momma` / Momma

The uploaded package was an Android/Kotlin Onyx app and did not include either target HTML file. This cleaned package therefore includes a browser Onyx DBT widget and an automatic patcher that updates the real HTML files when placed beside them.

## Use

1. Unzip this folder into the same folder that contains `dino-nerdzone.html` and `squishy-cottage.html`.
2. Double-click `attach_onyx_to_profiles.bat` on Windows.
3. Open each HTML file and go to the “Chat Bot with DBT Skills” page/section.

The patcher creates backups named:

- `dino-nerdzone.html.onyx-bak.html`
- `squishy-cottage.html.onyx-bak.html`

## What gets inserted

The script adds short, clean relative paths:

```html
<link rel="stylesheet" href="onyx/onyx-widget.css" data-onyx-attach="true">
<script defer src="onyx/onyx-widget.js" data-onyx-profile="papa-or-momma" data-onyx-attach="true"></script>
<section id="onyx-dbt-chat" class="onyx-dbt-chat" data-onyx-chat="true" data-onyx-profile="papa-or-momma"></section>
```

## Included Onyx behavior

- DBT skill help: Wise Mind, STOP, TIPP, DEAR MAN, Check the Facts, Opposite Action, Radical Acceptance, Self-Soothe, Diary Card, Chain Analysis.
- Mood image switching: listening, thinking, judgmental, thoughtful, sleepy, hungry, caring, snuggly, purring, advising professor.
- Profile-specific language: Papa/Dino Dad for `dino-nerdzone.html`, Momma for `squishy-cottage.html`.
- Local browser chat memory per profile using `localStorage`.
- A small event bridge: every Onyx reply dispatches `window` event `onyx:message` for future rewards/DBT/game bridges.

## Safety boundary

Onyx provides support, DBT coaching, grounding, organization, and crisis-aware guidance. He is not emergency care or a licensed clinician. For immediate danger or urgent medical symptoms, use real-time emergency/crisis/medical support.
