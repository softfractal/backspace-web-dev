# backspace — web dev build

Three pages over one shared chrome pair. Static files — no build step,
no dependencies.

## Run

From this folder:

```
python3 -m http.server 8080
```

then open http://localhost:8080/ (redirects to `home.html`).
Any static server works (`npx serve`, VS Code Live Server, nginx).
Opening `home.html` directly from the file system also works in
current browsers — the server is just the cleaner path.

## What you are looking at

- **The black stage is intentional.** Scene content (video / bake /
  still) is a pending decision and mounts later at a marked seam —
  the current deliverable is the interface: navigation, input
  machine, glow system, cursor, i18n and cross-page routing.
- `home.html` — main menu (HARDWARE / SOFTWARE / COMMUNITY / SUPPORT),
  utility cluster, film strip. Drive it with the mouse, the wheel, or
  W/S/A/D + Enter/Esc; hover and keyboard are the same cursor.
- `software.html`, `community.html` — section pages on the shared
  away-nav (top-left corner capsule). COMMUNITY carries the social
  row behind a third-party confirmation overlay (slug URLs are
  placeholders until the accounts exist).
- Esc walks back exactly one level per press, page boundaries
  included. Denied input shakes — nothing fails silently.
- Sound events are wired but silent (sample files pending). EN is the
  only populated locale; the picker is live and other locales fall
  back by design.

## Layout

| path | role |
|---|---|
| `home.html` / `software.html` / `community.html` | the pages (thin files) |
| `shared/bs-chrome.css` · `shared/bs-chrome.js` | the shared chrome: tokens, glow law, input engine, i18n, routing |
| `assets/` | fonts (self-hosted), cursors, icons, imagery |
| `backspace_home.html` | frozen pre-factoring build, kept as the certified reference — not linked |
| `index.html` | redirect stub to `home.html` for server roots |
