# Lift Log — Offline Workout Tracker PWA

Local-first, FitBod-lite weight-lifting tracker. No accounts, no backend, no analytics.
All data stays in IndexedDB on your device; portability is via JSON/CSV file backup.

Spec: `copilot_temp/spec-ios-workout-pwa-20260916.md`

## Stack

- Vite 6 + TypeScript 5 (`strict`), vanilla SPA (hash router)
- Storage: IndexedDB via [`idb`](https://github.com/jakearchibald/idb) (typed, sole runtime dep) + `src/lib/store.ts`
- Charts: [`uplot`](https://github.com/leeoniya/uPlot) (bundled, offline-safe; `src/components/trendChart.ts` is the only importer)
- PWA: service worker generated at build time by [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
  (Workbox precache + offline navigation fallback); update checks are
  manual-only (Settings → Check for updates) and applying an update is
  deferred until no workout is active (`src/sw-register.ts`)
- Pure logic: `metrics.ts` (Epley e1RM, volume, PRs), `recovery.ts` (6-day decay map),
  `suggest.ts` (seeded next-workout + overload prefill), `units.ts`, `timer.ts`, `backup.ts`,
  `analytics.ts` (per-exercise session series, rep-max ladder, muscle split, week streaks)
- Dev-only: `vitest`, `eslint`, `prettier`, `vite-plugin-pwa` (never shipped)

## Setup

```sh
npm install
npm run dev        # local dev
npm test           # unit tests (spec §7 vectors)
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/ (use --https for PWA install testing)
```

## Install on iPhone

1. Deploy `dist/` to any HTTPS static host (GitHub Pages workflow included).
2. Open the URL in Safari → Share → **Add to Home Screen** → Add.
3. Launch Lift Log from the Home Screen (fullscreen, offline-capable).
4. In-app help lives in Settings → Install on iPhone.

## Backup

Settings → Export JSON (full dump) / Export CSV (per-set rows) / Import JSON
(preview counts + confirm, UUID-dedupe merge). Export reminder appears every 5th workout.

## Project layout

- `index.html`, `public/manifest.webmanifest`, `public/icons/`
- `src/main.ts`, `src/app.ts`, `src/styles.css`, `src/sw-register.ts`
- `src/lib/`, `src/components/`, `src/views/`, `src/data/` (84 seeded exercises + 3 templates)
- `tests/unit/` (metrics, recovery, suggest+units, backup, analytics, ui-helpers)
- `scripts/make-icons.mjs` (Node built-ins only)

## Constraints honored

- Production bundle makes zero non-self requests (system font, inline SVG, WebAudio beep, no CDNs).
- Canonical weight unit kg; display converts (default lb, 2.5/5 lb steps).
- Not medical advice: first-run disclaimer gate; "stop if sharp pain" in exercise detail.
- v2 seams (canned programs first, then file-sync/Health): `Template.programId`,
  `SuggestInput.programId`, backup unknown-field passthrough.

## Credits

- Recovery heatmap figure art: path data vendored from
  [`react-native-body-highlighter`](https://github.com/HichamELBSI/react-native-body-highlighter)
  (MIT) via `scripts/vendor-body-map.mjs`; see `THIRD_PARTY_NOTICES.md`.
