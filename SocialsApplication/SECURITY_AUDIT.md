# Security Audit

## Runtime safety stance

`Socials Application` is designed for a trusted small group on localhost or a private LAN. It is not configured as a public internet service.

## Intentionally not included

The runnable app does **not** include:

- account cracking, brute forcing, or password attack logic;
- token scraping, session theft, or credential collection;
- unofficial third-party account automation;
- leaked/proprietary client code;
- code that impersonates Discord, Snapchat, Zoom, Facebook, or other services;
- hidden telemetry or external analytics.

## Current protections

- Static file path traversal is blocked by resolving paths inside `app/`.
- API JSON request body size is limited by `MAX_BODY_MB`.
- Stored text is control-character stripped and length-limited.
- Media uploads are accepted only as image/video/audio data URLs.
- Room passcodes are stored only as SHA-256 hashes in memory for the session.
- Room participants are pruned after inactivity.
- Social updates use Server-Sent Events rather than polling loops.

## Known limitations before public deployment

Add the following before internet exposure:

- real authentication and per-user authorization;
- HTTPS/TLS termination;
- CSRF protection and stronger origin checks;
- rate limiting and upload quota enforcement;
- a durable database with backups;
- encrypted secrets management;
- moderation/admin controls;
- logging and abuse monitoring.

For the requested use case—a small trusted network of friends/loved ones—this package is suitable as a local/LAN starter app.


## Games/presence security notes

Presence is in-memory only and is limited to display name, status, active section, and active game title. It does not authenticate users or expose credentials. The game bridge only passes a selected roster to same-origin iframes and does not modify remote accounts or third-party services.
