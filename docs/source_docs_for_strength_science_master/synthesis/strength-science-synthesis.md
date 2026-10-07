# The Science of Strength Gains — Synthesis

Four independent research agents, one per source, ran in parallel on 2026-09-25:

1. **Stronger by Science** (Greg Nuckols et al.) — author-run meta-analyses plus cited literature
2. **Muscle & Strength Pyramid, 3rd ed.** (Eric Helms / 3DMJ: Helms, Morgan, Valdez) — expert framework plus one RCT
3. **Peer-reviewed literature** — Schoenfeld, Grgic, Androulakis-Korakakis, Ralston, Zourdos, Pelland, ACSM 2026 (via PubMed / Europe PMC / Frontiers full text)
4. **Renaissance Periodization** (Mike Israetel) — expert model, cross-referenced against the same meta-analyses

This document synthesizes their reports into a single evidence ledger, then maps it to concrete
programming rules and app-encoding implications for Lift Log. Per-source detail lives in the
subagent outputs; claims below are tagged with evidence tier. Evidence-tier key:

- **MA/SR** — meta-analysis or systematic review (highest)
- **RCT** — randomized controlled trial
- **MR** — meta-regression (dose-response modeling)
- **Exp** — expert consensus/model from a named, credibility-vetted source

## Key citation anchors

| Study                                                                        | Role                                                 | Evidence               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------- |
| Ralston et al. 2017, _Sports Med_ (PMID 28755103)                            | Weekly set volume → 1RM strength                     | MA                     |
| Grgic et al. 2018, _Sports Med_ (PMID 29470825)                              | Training frequency → strength                        | MA                     |
| Grgic et al. 2022, _J Sport Health Sci_ (PMID 33497853)                      | Failure vs non-failure                               | SR/MA                  |
| Wu et al. 2026, _BMC Sports Sci Med Rehabil_ (PMID 42410632)                 | Failure vs non-failure (dynamic strength)            | MA                     |
| Lasevicius et al. 2018, _Eur J Sport Sci_ (PMID 29564973)                    | Load range 20–80% 1RM, volume-equated                | RCT                    |
| Schoenfeld et al. 2019, _MSSE_ (PMID 30153194)                               | 1/3/5 sets per session: strength vs hypertrophy      | RCT                    |
| Currier et al. 2026, _MSSE_ — ACSM Position Stand (PMID 41843416)            | Overview of 137 SRs, >30k participants               | Overview of reviews    |
| Androulakis-Korakakis et al. 2020, _Sports Med_ (PMID 31797219)              | Minimum effective training dose (METD)               | MA                     |
| Androulakis-Korakakis et al. 2021, _Front Sports Act Living_ (PMID 34527945) | METD intervention series; meaningful-gain thresholds | Mixed methods, small n |
| Zourdos et al. 2016, _JSCR_ (PMID 26049792)                                  | RIR-based RPE scale validation                       | Validation study       |
| Helms et al. 2018, _Front Physiol_ 9:247                                     | RPE vs %1RM loading (DUP, 8 wk)                      | RCT                    |
| Halperin et al. 2022, _Sports Med_                                           | RIR self-report accuracy                             | MA                     |
| Pelland et al. 2025, _Sports Med_ (PMID 41343037)                            | Resistance-training dose response (67 studies)       | MR                     |
| Robinson et al. 2024, _Sports Med_ (PMID 38970765)                           | Proximity-to-failure dose response                   | MR                     |
| Grgic et al. 2018, _Sports Med_ (PMID 28933024)                              | Rest intervals → strength                            | SR                     |
| Nuckols frequency MA (strongerbyscience.com/training-frequency)              | 13 volume-matched studies on frequency               | Author-run MA          |
| Moesgaard et al. 2022, _Sports Med_ (PMID 35044672)                          | Periodized vs non-periodized, volume-equated         | SR/MA                  |

---

## 1. What drives strength gains

**Finding: six factors determine maximal strength; only two are trainable.** Muscle size, fiber
type, segment lengths, motor learning/neuromuscular efficiency, motivation/arousal/fatigue, and
muscle origins/insertions — of these, **muscle size and motor learning** are the trainable levers.
_(Exp — SBS "Size vs. Strength"; medium confidence)_

**Finding: early strength gains are almost entirely neural.** In new lifters, hypertrophy explains
as little as ~2% of the variance in strength gains (Ahtiainen r=0.157; Erskine r=0.14–0.15).
Normalized muscle force rises ~17% (±11%) in the first two months and is the strongest early
predictor (r=0.79). For trained lifters, size matters much more: LBM→squat/bench r=0.59–0.68
(Baker); elite powerlifters' strength vs fat-free mass r=0.86–0.95 (Brechue & Abe).
_(Individual studies + correlations; medium confidence)_

**Practical model (Nuckols):** neural adaptations are **force multipliers** on top of contractile
tissue. You can gain strength with near-zero hypertrophy short-term, but long-term maximal strength
requires building the muscle engine too. Training style shapes the strength-per-size ratio: heavy
training yields more strength per unit of muscle.

**Finding: strength is highly specific.** To load type, velocity, ROM, and stability. In Mitchell
et al. 2012, 80% vs 30% 1RM groups grew similarly in isometric MVC and power, but the 80% group
gained far more 1RM — the 1RM gap is substantially **motor learning of the tested lift**.
_(Exp synthesis of primary studies; medium confidence)_

## 2. Load and intensity

**Finding: heavier loads win for 1RM.** Of 16 studies comparing heavy (~85%+ 1RM, sets of ≤5) vs
lighter loads, all but one favored heavy loads for 1RM gains. Light loads (30–60%) can match
hypertrophy at high volumes but do not build 1RM as well. _(SBS quantitative review; medium-high)_

**Finding: ~80% 1RM is the strength-specific threshold.** Lasevicius 2018 (volume-equated
20/40/60/80% 1RM, 12 wk): all loads ≥40% built strength, 80% was superior for both strength and
CSA, 20% was suboptimal. ACSM 2026 Position Stand: strength is enhanced by **lifting ≥80% 1RM,
full ROM, 2–3 sets, first in the session, ≥2 sessions/week**. _(RCT + overview of 137 SRs; high)_

**Finding: the "hypertrophy range" is not magic, and heavy training grows muscle nearly as well.**
The classic 6–15 rep range assumption is not supported when volume is equated; 30–85% 1RM covers
the usable spectrum for growth (growth roughly halves only at 20% 1RM). For a strength app this
means heavy main work and moderate-load accessory work are compatible.
_(Nuckols pooled analysis + cited RCTs; medium-high)_

**METD (minimum effective dose):** a single set of 6–12 reps at 70–85% 1RM, 2–3×/week, to
volitional failure, produces statistically significant (but suboptimal) 1RM gains over 8–12 weeks
_(MA; Androulakis-Korakakis 2020)_. The practical intervention version: **~3–6 working sets of
1–5 reps per week per lift, spread over 1–3 sessions, >80% 1RM at RPE 7.5–9.5**. Notably, in the
2021 series, adding just **2 back-off sets of 3 reps at ~80% of the day's top single** produced the
highest probability of a meaningful PL-total gain (+33.7 kg, 99.6% probability) — **heavier
back-offs beat more reps at lighter loads despite less total volume**. _(Small Bayesian arms
(n=9–16); medium confidence, directional)_

## 3. Volume

**Finding: strength's volume dose-response is shallow and plateaus early.**

- Ralston 2017 (MA, 9 studies, 61 groups): <5 sets/wk ES 0.82 vs >10 sets ES 1.01 — a **small**
  difference (ES 0.18); for multi-joint 1RM specifically, high-vs-low ES 0.14, CI crossing zero
  (p=0.06). _(MA; high for existence, modest magnitude)_
- Pelland 2025 (MR, 67 studies): volume increases both strength and hypertrophy with diminishing
  returns — **much steeper for strength than hypertrophy**; fractional counting of indirect sets
  fit best. _(MR; high)_
- Schoenfeld 2019 RCT: 1/3/5 sets per session all gained similar 1RM on squat and bench while
  hypertrophy showed a clear volume dose-response — **the sharpest divergence between the two
  goals**. _(RCT; high)_

**Practical dose:** floor **3 sets/lift/week**, sweet spot **5–10**, treat >10 weekly sets as
hypertrophy dose rather than strength dose. RP agrees: 2–4 sets per session per muscle are
"excellent for strength enhancements" but suboptimal for hypertrophy.

## 4. Frequency

**Finding: frequency helps strength, but mostly via volume.** Grgic 2018 (MA, 22 studies): effect
sizes rise with frequency (1/2/3/4+×/wk: ES 0.74 → 1.08, p=0.003), but **in volume-equated studies
the effect is null** (p=0.421). _(MA; high)_

**Counterpoint — an independent frequency effect may exist:** Nuckols' own MA (13 volume-matched
studies) found ~20–23% faster gains at higher frequency, with **upper-body pressing the standout**
(3+ days/week beat 1–2 days by +0.64%/wk, d=0.93; a low-frequency group never out-gained a
high-frequency group by >10%). Lower body: trivial (+0.26%/wk, ns). Pelland 2025 also found
frequency's effect on strength was the one consistently identifiable effect in that model
(posterior probability 100%), while hypertrophy frequency effects were compatible with negligible.
_(Author-run MA + MR; medium-high)_

**Resolution:** schedule each main lift **2–3×/week** with volume distributed across sessions;
extra sessions should be **low-effort, lighter-load** (3–4 RIR) quality-practice sessions, not more
failure work. Skill practice of the lift is a first-class reason to increase frequency.

## 5. Proximity to failure (RIR)

**Finding: failure is not needed for strength — and slightly hurts at non-equated volumes.**

- Grgic 2022 (MA, 15 studies): failure vs non-failure — no significant difference for strength
  (ES −0.09); in volume-non-equated studies, non-failure was **superior** (ES −0.32).
- Wu 2026 (MA, 20 studies, 556 participants): **non-failure superior for dynamic strength**
  (SMD 0.24, p=0.01); no difference for isometric strength, hypertrophy, endurance, or power.
  _(MA ×2; high)_

**Finding: effort self-report is reliable enough to program with.** RIR ratings are accurate to
~1 rep on average (Halperin 2022, MA of 414 participants); trained lifters predict 1 and 3 RIR
with mean absolute error ~0.65 reps (Refalo 2024). Accuracy degrades on sets >12 reps.
_(MA + single study; medium-high)_

**Finding: RIR-based RPE is a validated scale** (Zourdos 2016: RPE 10 = 0 RIR, RPE 9 = 1 RIR, …)
with strong inverse velocity–RPE relationship in experienced lifters (r=−0.88). _(Validation study)_

**Prescription defaults (converged):** working sets at **1–3 RIR**; beginners **≥3 RIR** with
technical-breakdown (not failure) as the cutoff; extra frequency sessions at 3–4 RIR; failure only
as an occasional block-end AMRAP or on safe accessory work. Helms: RIR is a _function of load_ —
heavy technique days may sit at RPE 5–6 (80–85% for 1–3 reps) to build skill with minimal fatigue.

## 6. Progressive overload

**Finding: overload is operationalized three ways.** (a) load progression at fixed reps (most
common; ACSM 2026 "progressive RT"), (b) double progression (reps at fixed load, then load step),
(c) RPE/RIR-anchored autoregulation. The METD series shows the mechanism is partly **skill
practice with heavy loads on the tested movement** — better transfer than equal volume elsewhere.
_(Expert synthesis + supporting trials; medium)_

**Autoregulation beats fixed %1RM for strength (slightly).** Helms 2018 RCT: both groups gained;
small effects favored RPE-autoregulated loading (squat ES 0.50, ~79% probability). Graham &
Cleather 2021 (12 wk): autoregulating groups ended up training at higher average %1RM → small
significant strength advantage. RP's synthesis agrees; their stance: autoregulate **reactively,
not proactively**. _(2 RCTs; medium)_

**Double progression trigger (converged rule):** increase load when the first set reaches the top
of the rep range while still inside the RIR ceiling; hold or step back ~5% when sets grind at
≤1 RIR at the bottom of the range. Helms' correction rule: **~4% load change per rep off the RPE
target**. E1RM should be estimated from 2–5RM performances for trend tracking — never used as a
rigid prescription target, because reps-at-%1RM varies hugely between individuals (6–26 reps at
70% 1RM in trained lifters, per Nuzzo 2024 MR).

**Progression-rate realism:** gains follow a linear-log decay with training age. Beginners: add
load weekly until sets grind (2–6 months typical). Intermediates: target small PRs every **4
weeks**, then 8, then 12. Meaningful-gain thresholds: **1–2.5% per lift per ~6-week block for
advanced lifters** (coach consensus, METD survey n=137); any positive change counts for beginners.
Elite reference point: ~0.15 kg/day of PL total (Latella 2020 15-year cohort).

## 7. Rest intervals

**Finding: longer rest preserves set quality and strength outcomes.** Grgic 2018 SR (23 studies,
491 participants): short rests (<60 s) can still produce robust gains, but **>2 min is required to
maximize strength in trained individuals**; 60–120 s suffices for untrained. Acute work (Rosa
2023): the largest rep-performance gap is 1 min vs 2–3 min; 2 vs 3 min is trivial.
_(SR + acute RCT; medium)_

**Defaults:** **3–5 min** for heavy compound sets, **1.5–2 min** for isolation/accessories, ≥2 min
whenever training near failure. Helms frames rest as lowest-priority: rest as long as needed to
hit the next set well.

## 8. Periodization

**Finding: periodized beats non-periodized modestly; the advantage is largely load confounding.**
Nuckols' review of ~25 studies: periodized training ~22% faster (d=0.23–0.30); undulating (DUP)
beat linear for trained lifters (~28% faster, d=0.56–0.76) but showed no difference for novices.
Crucially, when volume, average intensity, AND peak intensity were all matched, gains were
identical — much of the "periodization advantage" is simply **heavier-load practice**. Moesgaard
2022 corroborates: volume-equated periodization effects are small. Bench-press gains dominate the
evidence; squat gains may drown out program effects via practice alone.
_(Author-run synthesis + MAs; medium-high)_

**Finding: phasic structure + autoregulated progression is the expert-default.** Helms' 3rd-edition
Strength Progression System:

| Phase      | Main lifts                                                               | Secondary lifts                                                  | Length  |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------- |
| **Volume** | 1–3 singles/lift/wk, RPE 5→8                                             | 10–20 sets/wk per muscle, 6–20 reps, 0–3 RIR, double progression | 6–12 wk |
| **Load**   | 2–4 singles/lift/wk, RPE 6→9; 2 back-off sets/single, 5→3 reps (~80–85%) | 5–10 sets/wk, tapering −1–2 sets every 1–2 wk                    | 4–8 wk  |
| **Peak**   | 2–5 singles/lift/wk, RPE 7–10; 0–3 back-off sets, 4→2 reps (~85%)        | 0–4 sets/wk, decreasing                                          | 2–4 wk  |

Main-lift volume short-term ceiling ~5 sets/lift/wk; variation lifts count 0.5 sets. Frequency
2–6×/lift/wk with 1–2 direct sets per session. 3rd edition dropped wave loading as "unnecessarily
complicated." _(Exp; medium)_

**RP's mesocycle model** (hypertrophy-first in public sources, same engine): 4-week accumulation
with RIR ladder **4 → 3 → 2 → 1**, deload week, then restart at MEV with (ideally) fresh
exercises. Meso length shrinks with training age: beginner up to 8 wk, intermediate 4–8, advanced
3–6. _(Exp; medium — specific numbers are model-derived)_

**Do not over-index on scheme magic:** the app's value is the feedback loop (rep performance →
load/set adjustments), not exotic weekly structures. _(Moesgaard 2022)_

## 9. Deloads and fatigue management

**Finding: deloads are reactive tools, not calendar fixtures.** Helms' weekly self-check (from
overtraining research): yes-answers to dread of training, worse sleep, stagnating/decreasing
loads, worse stress, worse aches. **0–1 yes → carry on; 2+ → deload.** Standard deload: **cut sets
~30–50%, keep normal loads and proximity to failure, keep frequency** (contrast: a pre-competition
taper cuts volume ~50–80% while keeping >85% work). No data exists on an "optimal" deload.
_(Exp; medium)_

**RP's automatic trigger:** failure to match the previous week's reps (despite adequate rest) →
recovery week or deload. Their deload reduces both volume and intensity toward maintenance volume.
_(Exp; medium)_

**SBS angle:** failure training produces larger, longer-lasting performance decrements than
volume-matched non-failure training; consecutive-day training showed no downside in three studies;
chronic stress roughly doubles recovery time from lifting. Deloads are one fatigue-management tool
among several — managing proximity to failure is the primary one.

## 10. Hypertrophy's supporting role

Strength-specific volume is small, but **muscle is the long-term engine**. For trained users:
accessory/hypertrophy work at **10–20 sets/muscle/week** (6–15+ reps, 1–3 RIR, double
progression) during volume phases, tapering during intensification, ~0 at peak. Exercises rotate
**between mesocycles only** (hold constant within a meso for technique momentum); prefer high
stimulus-to-fatigue-ratio exercises (stable setup, full ROM) for accessories. Avoid heavy
secondary work for the same muscles the day before main-lift training.

---

## Divergences between sources (and resolutions)

| Question                                           | Position A                                | Position B                                                                       | Resolution                                                                           |
| -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Frequency for strength                             | Grgic 2018: null when volume-equated      | Nuckols MA / Pelland 2025: independent effect, esp. pressing (+0.6%/wk at 3+/wk) | 2–3×/lift/week with distributed volume; extra sessions light and pressing-biased     |
| RIR cutoffs                                        | Robinson 2024: gains continue to ~0–3 RIR | RP ladder 4→1 across a meso                                                      | Default 1–3 RIR; 3–4 RIR for light sessions; exact cutoffs are model-derived         |
| RP per-lift MEV/MRV (2–4 / 8–14 sets per big lift) | expert model                              | —                                                                                | Unverified against the paywalled strength book — use as soft ranges, never hard-code |
| Periodization scheme                               | Nuckols: DUP > linear for trained (d≈0.6) | Moesgaard 2022 / Helms: volume-equated effects small                             | Structure is fine; the feedback loop matters more than the scheme                    |

## Uncertainty flags

- METD intervention numbers come from small quasi-randomized Bayesian arms (n=9–16) —
  exploratory, wide HDIs.
- The ≥80% 1RM threshold derives from trained male cohorts; beginners progress well at 60–75%.
- No >16-week RCTs on frequency, periodization style, or double-progression vs fixed progression
  in genuinely advanced lifters.
- RP's per-lift landmark values and the Delphi deload guidance are expert consensus, not trial-validated.
- Hypertrophy-as-mechanism-of-strength is questioned (Loenneke 2019 hypothesis paper; weak
  short-term correlations) — flagged low, treated as an open question.

---

## App-encoding implications for Lift Log

Rules the progression/suggestion logic can encode, each traceable to a section above:

1. **Progression engine (default): RIR-anchored double progression.** Promote load one plate step
   (~2.5 kg / 5 lb) when the top of the rep range is hit at ≥2 RIR; hold or demote ~5% at ≤1 RIR.
   §6
2. **Beginner lane:** simple linear progression (load added weekly) while session-to-session
   progression still works; graduate to the phase/double-progression system on stall. §6, §8
3. **Optional RIR field on set logging** — the single highest-leverage data addition. Enables the
   progression trigger, fatigue guards, and deload triggers. §5
4. **METD-style top-set protocol for intermediates:** heavy single/top set + 2 back-off sets of 3
   @ ~80% of the top-set load — the highest-probability-of-meaningfulness protocol found. §2
5. **Per-lift dose windows:** main work 3–8 reps @ 75–85% 1RM (RPE 7–8, occasional RPE 9.5
   singles); weekly sets floor 3, sweet spot 5–10, >10 = hypertrophy dose. §2, §3
6. **Accessory work:** 6–15 reps, 1–3 RIR, 10–20 sets/muscle/week in volume phases, tapering
   toward intensification/peak. §10
7. **Frequency:** each main lift 2–3×/week; distribute volume; add light (3–4 RIR) pressing
   sessions first if frequency is being raised. §4
8. **Rest timer defaults:** 3 min compounds, 2 min accessories. §7
9. **Meaningful-gain gates:** % of current e1RM per 6-week block (1–2.5% advanced; anything
   positive for beginners) — not fixed kg. §6
10. **Reactive deload triggers:** consecutive failed-matching-reps sessions or the weekly
    5-item self-check → cut sets 30–50%, keep loads and frequency. §9
11. **Strength-first framing:** keep metrics centered on e1RM and rep-max ladders; treat volume as
    the supporting engine, not the headline.
