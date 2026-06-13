# Jasper's Squishy Care Tracker

This is a static, mobile-first 8-page self-care, DBT, journaling, serotonin gallery, mini-game, reward currency, and helper-bot site.

## Pages

1. Calendar
2. Today's Schedule
3. Chat Bot with DBT Skills
4. DBT Daily Cards
5. DBT Journaling
6. Mobile Games
7. Serotonin
8. Squishy Store

## Included features

- In-browser saving with localStorage.
- Export/import of the full local save JSON.
- High-value Copper, Silver, Gold, and Platinum reward tracker.
- Auto-add task rewards and automatic hard-day/daily bonuses.
- Live second-by-second Eastern Time tracker using America/New_York, showing UTC-4 or UTC-5 depending on DST.
- Daily reset at 12:00 AM Eastern.
- Journal saving plus TXT and DOCX export.
- Daily diary card saving plus PDF and PNG export.
- Local image upload gallery for the Serotonin page.
- Typeform reminder sign-up: https://form.typeform.com/to/trAqvrRG
- Browser inactivity watcher with optional browser notifications.
- Dropdown game selector that loads the included mobile-friendly game HTML files.
- Helper bot available on the chatbot page and as a floating bot across the site.
- DBT data copied from the uploaded Squishy Care Chatbot bundle.

## How to run

Open `index.html` in a browser. For best results with the full DBT JSON catalog, upload the folder to GitHub Pages or run a local static server because some browsers restrict `fetch()` from `file://` pages.

Example local server command from inside this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Static-site email reminder note

A static HTML site cannot send automated emails on its own. The site includes the Typeform sign-up link for email reminders and includes browser-based local inactivity alerts.


## Revision notes

- Squishy Store now uses Shop by Aisle grouping with list-style rewards split into individual items.
- Support quick support now sleeps in the bubble and wakes into listening/support moods when opened.
- Expanded Support mood images are copied into assets/support-assets-removed and mapped by filename.
