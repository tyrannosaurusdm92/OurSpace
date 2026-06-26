# DBT Diary Card Fillable HTML Sheets — William + Jasper

Contents:
- `jasper_dbt_adhd_caregiver_diary_card.html`
- `william_dbt_disability_guilt_diary_card.html`
- `README.txt`

No `index.html` is included, so there is no shared launcher page linking the two diary cards.

Updates in this version:
- Expanded the left skills side menu so labels and checkboxes have more room.
- Added more padding around buttons, form controls, cells, labels, notes, and text blocks.
- Fixed word wrapping with safer wrapping rules for long skill names, headers, buttons, and cells.
- Restyled William's sheet with the cyan-centric palette.
- Restyled Jasper's sheet with the sunrise cottagecore/witchcore palette.
- Enforced the design rule: core readable UI uses Lightest Background + Darkest Text or Darkest Background + Lightest Text. Medium/accent colors are used only as borders, focus rings, scrollbars, highlights, and decorative identity accents.
- Kept the diary cards modular: each file is wrapped in a `.dbt-diary-module` section and avoids full-page app assumptions, so it can be embedded into an existing William/Jasper page.
- PNG export now captures the diary module without the control buttons and includes the skills side menu.

Privacy:
- Browser saving uses localStorage on the current device/browser.
- William and Jasper use separate storage keys.
- Exported TXT/PNG files are ordinary files; store privately.

Latest update:
- Bottom before/after urge fields are now full-width stacked rows with visible Before/After labels so long prompts do not cover input areas.
- Cleaned internal notes about fields that are not part of your site.
