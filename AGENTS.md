# AGENTS.md — Lift Log (iOS Workout PWA)

Local-first, FitBod-lite weight-lifting tracker. No accounts, no backend, no analytics. All data stays in IndexedDB on-device; portability is via JSON/CSV file backup.

**Strictly personal use — built for Jared alone.** Tailor freely to his preferences and setup. Accessibility features (e.g. VoiceOver support, ARIA labeling, screen-reader testing) are entirely out of scope.

**Primary goal: strength progress, not hypertrophy.** The app's metrics, suggestions, and progression logic should center on strength gains (e.g. e1RM, rep-max ladders, progressive overload) rather than muscle size or bodybuilding-style volume as the main objective.

**Jared is an intermediate lifter.** Programs, templates, and progression logic should be tailored to an intermediate level — not beginner-style session-to-session linear jumps, and not advanced specialization. Assume meaningful training age with developed technique on main lifts; overload comes in slower, wave-like increments.

## Features

- **Workout logging** — in-place set rows (weight/reps/RPE), warmup ramps
  (master doc §10.4, keyed to the working set: ≤6-rep sets → 8@40% → 4@60% →
  2@80% → 1@90%; ≥7-rep sets → 5@40% → 4@60% → 2@80% → 1@85%), rest timer,
  plate breakdown lines.
- **Programs** — named multi-week routines (5/3/1-style, custom splits) with
  per-day prescribed schemes: exact sets × reps, percent-of-anchor (static
  training max or the running e1RM) carrying an RPE band, or reps-band double
  progression. Prescriptions are RPE/RIR bands; %1RM loads show back as a
  starting gauge only. Weeks carry §7.2 phase tags (intro/volume/load/peak/
  deload) that drive prefill transforms: intro runs ~75% of volume; deload
  cuts sets ×0.6 while keeping loads, RPE, and frequency. Sessions are
  scheduled on Today and derived from completed history; cycle wraparound is
  automatic; the §8.3 weekly 5-item check-in offers a reactive deload week.
- **Progression** — autoregulated double progression (§6.3): the first working
  set drives it — band top within the RPE ceiling → +one increment; set-1 miss
  corrects ~4%/rep; grinding at ≤1 RIR at the band bottom steps back ~5%; two
  consecutive ≥ 9.5 top sets → 5% deload; ≤ 7.0 at band top accelerates.
  Banded percent loads are a starting gauge that recalibrates ~2% per 0.5 RPE
  outside the band (§2.3) — the stored prescription never changes. e1RM comes
  from one calculator everywhere (§6.5): Epley for multi-rep sets, corpus RPE
  chart for RPE-logged singles.
- **Progress analytics** — per-exercise session series, rep-max ladder, muscle
  split, week streaks, trend charts (uPlot, offline-bundled).
- **Exercise swap** — ranked substitutes by equipment/recovery; in active
  program sessions the swap keeps the same set scheme.
- **Backup** — Export JSON (full dump, including programs) / Export CSV
  (per-set rows incl. `rpe`) / Import JSON with preview counts and UUID-dedupe
  merge.

## Stack

- Vite 6 + TypeScript 5 (`strict`), vanilla SPA (hash router)
- Storage: IndexedDB via [`idb`](https://github.com/jakearchibald/idb) (typed) + `src/lib/store.ts`
- Charts: [`uplot`](https://github.com/leeoniya/uPlot) (bundled, offline-safe; `src/components/trendChart.ts` is the only importer)
- PWA: service worker generated at build time by [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
  (Workbox precache + offline navigation fallback); update checks are
  manual-only (Settings → Check for updates) and applying an update is
  deferred until no workout is active (`src/sw-register.ts`)
- Pure logic: `metrics.ts` (Epley e1RM, volume, PRs), `recovery.ts` (6-day decay map),
  `suggest.ts` (seeded next-workout + overload prefill), `units.ts`, `timer.ts`, `backup.ts`,
  `analytics.ts` (per-exercise session series, rep-max ladder, muscle split, week streaks),
  `progression.ts`, `programs.ts`
- Dev-only: `vitest`, `eslint`, `prettier`, `vite-plugin-pwa` (never shipped)

## Dependencies policy (read carefully)

1. **Production npm runtime dependencies are fine — use them.** Prefer a great pre-existing package over hand-rolling your own version. Do not reinvent the wheel (no custom IndexedDB wrappers, routers, date utils, etc. when a well-maintained OSS package does it better).
2. **Banned: anything that phones home.** No third-party dependencies or code that requires connecting to an external service at runtime — no backends, BaaS, auth, analytics, crash reporting, push services, hosted fonts, or CDN-hosted scripts/styles. The production bundle must make zero non-self network requests.
3. **Bundled deps are the mechanism.** Runtime deps must work fully vendored/bundled by Vite so the app stays installable and offline-capable from any static HTTPS host. If a package needs a CDN or remote fetch to function, do not use it.
4. **Dev dependencies are unrestricted** (test, lint, build tooling never ships).

Note: history (`vite.config.ts`) says "zero runtime deps" — that was the old rule and is superseded by this section. Leave existing hand-rolled code alone unless touching it; use packages for new work.

## Target device (read carefully)

1. **Mobile only — never desktop.** No desktop layouts, wide breakpoints, hover-only interactions, or keyboard-first flows. Touch-sized targets and thumb-reach placement win.
2. **Only device: iPhone 17 Pro Max.** Current Safari (standalone `display: fullscreen` via Add to Home Screen) is the baseline. Do not add workarounds, polyfills, degraded layouts, or testing for older/smaller iPhones, old Safari, or Android.
3. **Jared's device settings (must be accounted for in all UI work):**
   - Display & Brightness → Display Zoom: **"Larger Text"** (not "Default") — the viewport is smaller than a Default-zoom iPhone 17 Pro Max.
   - Text size: **6th largest of 7** (Dynamic Type) — text is rendered large; always support/inherit Dynamic Type, never hard-code font sizes that break it.
   - Layout consequences: assume less horizontal space and larger text than default. Watch for overflow, wrapping, truncation, and squeezed rows/columns; prefer vertical stacking and flexible widths over fixed-size multi-column layouts.
4. **Consequences:** modern Safari APIs are fair game, `es2022` build target stands, system font + inline SVG + WebAudio (no remote assets).

## Commands

```sh
npm install
npm run dev        # local dev
npm test           # unit tests (spec §7 vectors)
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/
npm run preview:https # serve dist/ over HTTPS (PWA install testing)
npm run lint       # eslint src tests scripts
```

Deploy: copy `dist/` to any HTTPS static host (GitHub Pages workflow included).

## Install on iPhone

1. Deploy `dist/` to any HTTPS static host (GitHub Pages workflow included).
2. Open the URL in Safari → Share → **Add to Home Screen** → Add.
3. Launch Lift Log from the Home Screen (fullscreen, offline-capable).

## Backup

Settings → Export JSON (full dump) / Export CSV (per-set rows) / Import JSON
(preview counts + confirm, UUID-dedupe merge). Export reminder appears every 5th workout.

## Credits

- Recovery heatmap figure art: path data vendored from
  [`react-native-body-highlighter`](https://github.com/HichamELBSI/react-native-body-highlighter)
  (MIT) via `scripts/vendor-body-map.mjs`; see `THIRD_PARTY_NOTICES.md`.

## Verification

After making changes, run the quality gates (`npm run build`, `npm test`, `npm run lint`) **and** preview locally: `npm run preview`, then open the served URL in your local browser and actually exercise the changed views/flows to confirm they render and behave correctly before reporting done.

## Layout

- `index.html`, `public/manifest.webmanifest`, `public/icons/` (SW + Workbox runtime are generated into `dist/` at build time by vite-plugin-pwa)
- `src/main.ts`, `src/app.ts`, `src/styles.css`, `src/sw-register.ts`
- `src/lib/` (store via idb, metrics, recovery, suggest, units, timer, backup, analytics), `src/components/`, `src/views/`, `src/data/` (82 seeded exercises + 3 templates; `src/data/programs.json` is generated by `scripts/gen-programs.mjs`)
- `tests/unit/`, `scripts/make-icons.mjs`
- `docs/strength-science.md` — strength-science master reference; consult before changing
  programs, progression logic, or any training-related surface. Archived sources live in
  `docs/source_docs_for_strength_science_master/` (`synthesis/`, `corpus/`, `research/`).

## Conventions

- TypeScript `strict`, vanilla SPA with hash router; SW generated by vite-plugin-pwa (Workbox), updates deferred until no workout is active (`src/sw-register.ts`).
- Canonical weight unit kg in storage; display converts (default lb, 2.5/5 lb steps).
- Offline-first: every view must render usefully with no network after install.
- Backup: Settings → Export JSON (full dump) / Export CSV (per-set rows) / Import JSON with preview counts, confirm, and UUID-dedupe merge. Unknown fields pass through.
- Safety copy: first-run disclaimer gate; exercise detail includes "stop if sharp pain". Not medical advice.
- Versioning: increment the `package.json` version on every push (baked into the build as `__APP_VERSION__`, shown in Settings → App updates).
- v2 seams: `Template.programId`, `SuggestInput.programId`.
