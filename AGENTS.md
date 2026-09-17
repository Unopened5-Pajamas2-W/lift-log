# AGENTS.md — Lift Log (iOS Workout PWA)

Local-first, FitBod-lite weight-lifting tracker. No accounts, no backend, no analytics. All data stays in IndexedDB on-device; portability is via JSON/CSV file backup.

Spec: `copilot_temp/spec-ios-workout-pwa-20260916.md`.

## Dependencies policy (read carefully)

1. **Production npm runtime dependencies are fine — use them.** Prefer a great pre-existing package over hand-rolling your own version. Do not reinvent the wheel (no custom IndexedDB wrappers, routers, date utils, etc. when a well-maintained OSS package does it better).
2. **Banned: anything that phones home.** No third-party dependencies or code that requires connecting to an external service at runtime — no backends, BaaS, auth, analytics, crash reporting, push services, hosted fonts, or CDN-hosted scripts/styles. The production bundle must make zero non-self network requests.
3. **Bundled deps are the mechanism.** Runtime deps must work fully vendored/bundled by Vite so the app stays installable and offline-capable from any static HTTPS host. If a package needs a CDN or remote fetch to function, do not use it.
4. **Dev dependencies are unrestricted** (test, lint, build tooling never ships).

Note: history (`README.md`, `vite.config.ts`) says "zero runtime deps" — that was the old rule and is superseded by this section. Leave existing hand-rolled code alone unless touching it; use packages for new work.

## Target device (read carefully)

1. **Mobile only — never desktop.** No desktop layouts, wide breakpoints, hover-only interactions, or keyboard-first flows. Touch-sized targets and thumb-reach placement win.
2. **Only device: iPhone 17 Pro Max.** Current Safari (standalone `display: fullscreen` via Add to Home Screen) is the baseline. Do not add workarounds, polyfills, degraded layouts, or testing for older/smaller iPhones, old Safari, or Android.
3. **Consequences:** modern Safari APIs are fair game, `es2022` build target stands, system font + inline SVG + WebAudio (no remote assets).

## Commands

```sh
npm install
npm run dev        # local dev
npm test           # unit tests (spec §7 vectors)
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/ (use --https for PWA install testing)
npm run lint       # eslint src tests scripts
```

Deploy: copy `dist/` to any HTTPS static host (GitHub Pages workflow included). Install: Safari → Share → Add to Home Screen.

## Layout

- `index.html`, `public/manifest.webmanifest`, `public/icons/`, `public/sw.js`, `public/offline.html`
- `src/main.ts`, `src/app.ts`, `src/styles.css`, `src/sw-register.ts`
- `src/lib/` (db, store, metrics, recovery, suggest, units, timer, backup), `src/components/`, `src/views/`, `src/data/` (84 seeded exercises + 3 templates)
- `tests/unit/`, `scripts/make-icons.mjs`

## Conventions

- TypeScript `strict`, vanilla SPA with hash router, hand-rolled Service Worker.
- Canonical weight unit kg in storage; display converts (default lb, 2.5/5 lb steps).
- Offline-first: every view must render usefully with no network after install.
- Backup: Settings → Export JSON (full dump) / Export CSV (per-set rows) / Import JSON with preview counts, confirm, and UUID-dedupe merge. Unknown fields pass through.
- Safety copy: first-run disclaimer gate; exercise detail includes "stop if sharp pain". Not medical advice.
- v2 seams: `Template.programId`, `SuggestInput.programId`.
