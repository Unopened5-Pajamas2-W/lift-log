# Lift Log

Local-first, offline-capable weight-lifting tracker PWA for iPhone (Add to
Home Screen). No accounts, no backend, no analytics — all data lives in
IndexedDB on-device; portability is via JSON/CSV backup export/import.

## Features

- **Workout logging** — in-place set rows (weight/reps/RPE), warmup ramps
  (8×60% + 3×85% per muscle), rest timer, plate breakdown lines.
- **Programs** — named multi-week routines (5/3/1-style, custom splits) with
  per-day prescribed schemes: exact sets × reps, percent-of-training-max, or
  reps-band double progression. Sessions are scheduled on Today and derived
  from completed history; cycle wraparound is automatic.
- **Progression** — global double-progression engine (reps band → +weight) as
  the default, with optional per-set RPE feeding holds/accelerations/deloads
  (top-set RPE ≥ 9.5 holds; ≤ 7.0 at band top can accelerate; two consecutive
  ≥ 9.5 sessions suggest a 5% deload). Percent prescriptions stay exact and
  are never RPE-adjusted.
- **Progress analytics** — per-exercise session series, rep-max ladder, muscle
  split, week streaks, trend charts (uPlot, offline-bundled).
- **Exercise swap** — ranked substitutes by equipment/recovery; in active
  program sessions the swap keeps the same set scheme.
- **Backup** — Export JSON (full dump, including programs) / Export CSV
  (per-set rows incl. `rpe`) / Import JSON with preview counts and UUID-dedupe
  merge.

## Install on iPhone

1. Deploy `dist/` to any HTTPS static host (GitHub Pages workflow included).
2. Open the URL in Safari → Share → **Add to Home Screen** → Add.
3. Launch from the Home Screen (fullscreen, offline-capable).

## Development

```sh
npm install
npm run dev        # local dev
npm test           # unit tests (vitest)
npm run build      # typecheck + production build → dist/
npm run preview    # serve dist/ (use npm run preview:https for install testing)
npm run lint       # eslint src tests scripts
```

See `AGENTS.md` for stack details, dependency policy, and conventions.
