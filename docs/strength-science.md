# Strength Science — Master Reference

Single ground truth for strength-training science in this repo. Consult this before changing
programs, progression logic, or any other training-related surface of the app. It synthesizes
two evidence families — the repo's 7-file source corpus and the published-literature and
expert-model findings compiled in `docs/source_docs_for_strength_science_master/synthesis/strength-science-synthesis.md` — into one document.
It contains no app-implementation rules; app implications are specified separately against
this document.

Built 2026-10-05. Corpus sources: the 7 files in `docs/source_docs_for_strength_science_master/corpus/strength_only/`.
External-literature sources: the anchor set in `docs/source_docs_for_strength_science_master/synthesis/strength-science-synthesis.md` (the three
most load-bearing citations spot-checked against PubMed/Europe PMC on 2026-10-05).

## How to read this document

- Each subsection leads with a **Verdict** (what to do/believe), then **Evidence** with source
  anchors, then **Caveats**. Anchors cite a slug + printed section for corpus sources, e.g.
  `(PYR §L2 Intensity)`, or author/year/journal/PMID for external sources.
- **Evidence tiers** used in tags:
  - **MA/SR** — meta-analysis or systematic review (highest)
  - **MR** — meta-regression / dose-response modeling
  - **RCT** — randomized or controlled trial
  - **Validation/Reliability** — scale/measure validation or reliability study
  - **Cohort** — large observational datasets
  - **Diss/Preprint** — dissertation, unpublished thesis, or preprint (evidence exists but
    hasn't passed peer review; treat as directional)
  - **Exp** — expert model/coaching synthesis from a named, credibility-vetted source
  - **Stub** — MASS video article surviving only as abstract + references (no transcript);
    claims limited to what the abstract states
- **Conflict policy**: when sources disagree, evidence tier decides first, then recency
  (fresher source wins and the superseded position is noted), then consensus breadth. Where
  the corpus restates a study that the published literature covers in this document, the
  published figures govern (e.g., the Pelland 2024 preprint → Pelland 2025 published, §3.2).
  Genuinely unresolved conflicts are listed in §11 and Appendix A rather than flattened.
  Nothing outside the two evidence families was added — where both are silent, this document
  says so.
- **Maintenance**: re-synthesize if the Pyramid publishes a revision, new _Best of MASS_
  volumes are added to the corpus, a major guideline (e.g. the ACSM Position Stand) is
  updated, or §11 items resolve. Sections carry confidence labels; treat single-source/expert-only
  claims as the first to revisit.

## Sources

| Slug    | Work                                                                | Authors                          | Nature                                       | Evidence horizon                                       |
| ------- | ------------------------------------------------------------------- | -------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| MASS-18 | _The Best of MASS 2017–2018_ (strength-filtered digest)             | Helms, Nuckols, Zourdos          | Structured reviews of named studies          | ~2016–2017                                             |
| MASS-19 | _The Best of MASS 2018–2019_ (digest)                               | Helms, Nuckols, Zourdos          | 2 full study reviews + stubs                 | ~2016–2018                                             |
| MASS-20 | _The Best of MASS 2019–2020_ (digest)                               | Helms, Nuckols, Zourdos, Trexler | 3 full articles + 2 stubs                    | ~2016–2019                                             |
| MASS-21 | _The Best of MASS 2020–2021_ (digest)                               | Helms, Nuckols, Zourdos, Trexler | 2 full study reviews                         | ~2016–2020                                             |
| MASS-22 | _The Best of MASS 2021–2022_ (digest)                               | Helms, Nuckols, Zourdos, Trexler | 4 full articles                              | ~2016–2021                                             |
| JRN     | _The Journey_ (strength-filtered extract)                           | Greg Nuckols (Strengtheory/SBS)  | Complete phase-map guide; informal citations | ~2015–2016                                             |
| PYR     | _The Muscle & Strength Pyramid: Training_, 3rd ed. v3.1.5 (extract) | Helms, Morgan, Valdez (3DMJ)     | Full programming treatise                    | ~2025 (cites 2024–25 meta-regressions, some preprints) |

All files are pre-filtered (`strength_by_lifting_only`): hypertrophy-exclusive and nutrition
content was removed upstream. See Appendix C for per-file filtering notes, Appendix B for the
coverage matrix and exclusion register.

**External literature and expert models** (compiled in `docs/source_docs_for_strength_science_master/synthesis/strength-science-synthesis.md`;
per-source research detail is archived alongside it). Corpus slugs are not assigned to these —
they are cited by author/year/PMID throughout:

| Study                                                                        | Role                                                                                                            | Evidence               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Ralston et al. 2017, _Sports Med_ (PMID 28755103)                            | Weekly set volume → 1RM strength                                                                                | MA                     |
| Pelland et al. 2025, _Sports Med_ (PMID 41343037)                            | Volume/frequency dose response (67 studies); published version of the preprint the corpus cites as Pelland 2024 | MR                     |
| Robinson et al. 2024, _Sports Med_ (PMID 38970765)                           | Proximity-to-failure dose response                                                                              | MR                     |
| Nuzzo et al. 2024, _Sports Med_                                              | Reps allowed at each %1RM                                                                                       | MR                     |
| Grgic et al. 2018, _Sports Med_ (PMID 29470825)                              | Training frequency → strength                                                                                   | MA                     |
| Grgic et al. 2018, _Sports Med_ (PMID 28933024)                              | Rest intervals → strength                                                                                       | SR                     |
| Grgic et al. 2022, _J Sport Health Sci_ (PMID 33497853)                      | Failure vs non-failure                                                                                          | SR/MA                  |
| Wu et al. 2026, _BMC Sports Sci Med Rehabil_ (PMID 42410632)                 | Failure vs non-failure (dynamic strength)                                                                       | MA                     |
| Lasevicius et al. 2018, _Eur J Sport Sci_ (PMID 29564973)                    | Load range 20–80% 1RM, volume-equated                                                                           | RCT                    |
| Schoenfeld et al. 2019, _MSSE_ (PMID 30153194)                               | 1/3/5 sets per session: strength vs hypertrophy                                                                 | RCT                    |
| Currier et al. 2026, _MSSE_ (PMID 41843416) — ACSM Position Stand            | Overview of 137 SRs, >30,000 participants                                                                       | Overview of reviews    |
| Androulakis-Korakakis et al. 2020, _Sports Med_ (PMID 31797219)              | Minimum effective training dose (METD)                                                                          | MA                     |
| Androulakis-Korakakis et al. 2021, _Front Sports Act Living_ (PMID 34527945) | METD intervention series; meaningful-gain thresholds                                                            | Mixed methods, small n |
| Zourdos et al. 2016, _JSCR_ (PMID 26049792)                                  | RIR-based RPE scale validation                                                                                  | Validation             |
| Helms et al. 2018, _Front Physiol_ 9:247                                     | RPE vs %1RM loading (DUP, 8 wk)                                                                                 | RCT                    |
| Graham & Cleather 2019 (via MASS-20) & 2021 (12-wk trial)                    | Autoregulated vs fixed-% loading                                                                                | RCT                    |
| Halperin et al. 2022, _Sports Med_                                           | RIR self-report accuracy                                                                                        | MA                     |
| Rosa et al. 2023                                                             | Acute rep performance by rest length                                                                            | Acute RCT              |
| Moesgaard et al. 2022, _Sports Med_ (PMID 35044672)                          | Periodized vs non-periodized, volume-equated                                                                    | SR/MA                  |
| Mitchell et al. 2012                                                         | Heavy vs light load: 1RM vs size/isometric/power                                                                | RCT                    |
| Ahtiainen; Erskine; Baker                                                    | Neural-vs-size correlates of strength gains                                                                     | Individual studies     |
| Nuckols, "Training frequency" MA (strongerbyscience.com)                     | 13 volume-matched frequency studies                                                                             | Author-run MA          |
| Nuckols, load & periodization quantitative reviews (Stronger by Science)     | ~16 heavy-vs-light studies; ~25 periodization studies                                                           | Author-run synthesis   |
| Latella et al. 2020                                                          | 15-year competitive powerlifting cohort                                                                         | Cohort                 |
| Loenneke et al. 2019                                                         | Hypertrophy-as-mechanism-of-strength hypothesis                                                                 | Hypothesis paper       |
| Renaissance Periodization (Mike Israetel)                                    | Mesocycle model, deload triggers, MEV/MRV ranges                                                                | Exp                    |

---

## 0. Operating rules (TL;DR) and the Pyramid overlay

### 0.1 The convergent operating rules

These are the rules the corpus converges on. Each maps to the section that owns its evidence.

1. Strength = skill + tissue. Prioritize heavy, high-quality practice of the target lifts and
   enough muscle to support long-term force. (§1)
2. Load is the strongest trainable lever for 1RM. Strength-specific work lives in the ~80%+
   1RM zone; 60–79% is secondary; <60% is essentially out of the strength driver seat. The
   ACSM 2026 Position Stand converges: strength is enhanced by lifting ≥80% 1RM, full ROM,
   2–3 sets, first in the session, ≥2 sessions/week. (§2)
3. Prescribe by RPE/RIR bands, never exact %1RM targets; reps-at-%1RM vary hugely between
   lifters (6–26 reps at 70% 1RM in trained squatters). Show %1RM back as a gauge only. (§2)
4. Main lifts: 1–2 direct working sets per session, spread over 2–3+ sessions/week. (§3, §4)
5. Strength's volume dose-response is shallow: ~5 sets/lift/week is the short-term plateau;
   long-term dose is 5–10 fractional sets/muscle/week; beyond ~10 weekly sets you're buying
   hypertrophy, not strength. (§3)
6. Stay farther from failure while accumulating volume (compounds ~3–5 RIR); 0–2 RIR belongs
   to high-intensity (>85%), low-volume, and peaking work. (§5)
7. Failure is a selective tool — isolation work, a session's final main-lift set, the last
   session before your longest break — not a default. The newest MAs add: failure is not
   needed for strength and slightly hurts at non-equated volume (Grgic 2022; Wu 2026). (§5)
8. Progress via double progression (reps band → load step) with a ~4%/rep load-correction
   rule; autoregulation modestly beats fixed-percentage loading. (§6)
9. Expect PRs at a realistic cadence: weekly as a novice, every ~4 weeks as a new
   intermediate, every ~12 weeks late in the intermediate phase — and gate "meaningful" in %
   of current 1RM per block, not kg (1–2.5% per ~6-week block for advanced lifters). (§6)
10. Track e1RM trends from daily singles or 2–5RM sets — max testing forces deloads, and
    e1RM is never a rigid prescription target. Corpus daily-max data show strong short-term
    gains but are unproven long-term. (§6, §7.4)
11. Structure programs in phases: volume → load → peak, each followed by an intro week or
    deload before the next. (§7, §8)
12. Deload reactively, not by calendar: a 5-item weekly self-check (2+ yes → deload); cut
    sets 30–50%, keep loads, proximity, and frequency. (§8)
13. Overtraining syndrome essentially doesn't happen from lifting alone; triage recovery
    environment (sleep, energy availability, protein) before touching dose. (§8)
14. Order microcycles so the hardest specific work is done fresh; put the least-fatiguing
    session (moderate singles) between the high-volume day and any AMRAP day. (§7)
15. Accessories carry the long-term muscle work; rest ≥2 min on heavy compounds (3–5 min
    typical), 1.5–2 min on accessories (≥90 s floor); tempo rules exist to avoid doing it
    wrong. (§10)
16. A minimal high-specificity protocol — a heavy top single plus 2 back-off sets of 3 at ~80%
    of the day's top — produced the highest probability of a meaningful powerlifting-total
    gain in the METD series; viable as a low-volume fallback day or a peaking kernel. (§2.2)

_(Confidence: High — each rule traces to convergent, multi-source evidence below.)_

### 0.2 Pyramid overlay — prioritization and escalation order

The Pyramid's framework orders variables by impact; use it as the escalation order when
something isn't working (fix the lowest broken tier first). About 80% of progress comes from
the bottom four levels; tiers 5–6 exist mostly to avoid doing it wrong.

| Tier                  | Covers                                                                 | Role when something is broken                    | Body § |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| 1. Adherence          | Realistic, Enjoyable, Flexible planning; schedule, disruptions, injury | First check — can the plan actually be followed? | §10.5  |
| 2. Volume & intensity | Sets, load, proximity to failure, frequency                            | The dose — is it right?                          | §2–§5  |
| 3. Progression        | Overload, autoregulation, deloads, plateaus                            | Is it actually progressing?                      | §6–§8  |
| 4. Exercise selection | Specificity, variations, feasibility, order                            | Right lifts?                                     | §9     |
| 5. Rest periods       | Straight-set minimums; time-saving techniques                          | Recovery between sets                            | §10.2  |
| 6. Lifting tempo      | Rep speed, pauses                                                      | Doing it wrong?                                  | §10.3  |

Training variables are interdependent (volume/intensity/frequency share one level), so this is
an escalation heuristic, not a strict ranking. _(PYR §Introduction)_

---

## 1. Foundations: what strength is and what moves it

### 1.1 The determinants of strength

**Verdict:** maximal strength is determined by six factors — muscle size, fiber type, segment
lengths, motor learning/neuromuscular efficiency, motivation/arousal/fatigue, and muscle
origins/insertions. Only **muscle size** and **motor learning** are meaningfully trainable, so
both deserve programmatic investment.

**Evidence (JRN §Intermediate Training):**

- Fiber type is a near red herring for maximal strength: type I vs type II max force per
  cross-sectional area differs by ≤10% (~4% between extreme 70%-dominant outliers); power
  output peaks at 30–60% 1RM and is low at maximal loads, so maximal strength is not
  power-dependent; elite powerlifters (avg squat/DL ~285 kg, bench ~170 kg) carry
  general-population fiber ratios (Fry 2003).
- Segment lengths usually vary <10% between people, and one lift's disadvantage is another's
  advantage ("weight classes are height classes in disguise").
- Origins/insertions matter more than segment lengths: muscles attach only 2–4 in from
  joints, so small origin shifts change leverage a lot — e.g., a 1-inch-lower hamstring
  origin (vs ~3 in average) ≈ ~33% more hip-extension torque.
- Elite performance correlates with fat-free mass per unit height; FFM correlates strongly
  with squat/bench/DL (r = 0.86–0.95, Brechue & Abe 2002; Lovera & Keogh 2015: successful
  powerlifters have more muscle per unit height with similar segment lengths).

**Caveats:** fiber-type force-per-area figures come from single-study-era estimates
(JRN, informal citations); the practical conclusion (fiber type barely matters for 1RM) is
also asserted independently in MASS-20. BF%/leverage framing is practitioner heuristics.

### 1.2 Neural gains first, muscle for the long game

**Verdict:** early strength gains are mostly neural (skill, coordination, motor learning);
long-term maximal strength requires building the muscle engine. Train for both from the
start; expect different timecourses.

**Evidence:**

- JRN: novice gains are primarily neural; typical novice phase 2–6 months, exiting when
  week-to-week load additions grind; first-timer muscle may grow +10–20% while squat climbs
  on neural improvements.
- MASS-20 (Suarez article): ~70% of strength variance can be explained by muscle size
  (Trezise 2016) — the explicit reason to keep volume/muscle-building blocks in a strength
  plan rather than maxing exclusively.
- PYR §L2 Volume: "Long-term strength gains require hypertrophy" — strength's _long-term_
  practical dose (5–10 sets/muscle/week) is hypertrophy-flavored; short-term strength
  benefits plateau around ~5 heavy sets/lift/week.
- Quantified neural-first data (via the synthesis run): in new lifters, hypertrophy explains
  as little as ~2% of the variance in strength gains (Ahtiainen r=0.157; Erskine r=0.14–0.15),
  while normalized muscle force rises ~17% (±11%) in the first two months and is the strongest
  early predictor (r=0.79). For trained lifters size matters far more: LBM correlates with
  squat/bench at r=0.59–0.68 (Baker), rising to r=0.86–0.95 in elite powerlifters (§1.1).
- Practical model (Nuckols, via the synthesis run): neural adaptations are force multipliers
  on top of contractile tissue — strength can rise with near-zero hypertrophy short-term, but
  long-term maximal strength needs the muscle engine too; heavy training yields more strength
  per unit of muscle gained.

**Caveats:** Trezise 2016 is a single knee-extensor prediction study; MASS-20 itself hedges
that no long-term causal evidence ties hypertrophy to strength gain magnitude. Short-term
correlation claims (neural dominance) are directional. Hypertrophy-as-mechanism-of-strength
is questioned outright (Loenneke 2019 hypothesis paper; weak short-term correlations) —
flagged low, treated as an open question (§11.3).

### 1.3 Specificity and transfer

**Verdict:** strength is specific — to movement pattern, load, velocity, ROM, and stability —
and transfer is asymmetric: complex lifts transfer outward/downward, simple lifts don't
transfer inward. Training the tested lift (plus close variants) is non-negotiable; but
specific heavy work has a low ceiling (~5 fractional sets/lift/week — §3.2, §9.1), so most
extra volume belongs in supporting work.

**Evidence (PYR §L4):** specificity is multidimensional (movement × load), not a spectrum;
complex lifts are specificity-sensitive and transfer outward (squat training improves squat
AND leg press) but simple lifts don't transfer inward (leg-press-only improves leg press
only). ~(cited transfer experiment; Helms coaching anecdotes flagged "not proof")

- Mitchell 2012 (via the synthesis run): 80%-1RM and 30%-1RM groups grew similarly in
  isometric MVC and power, but the 80% group gained far more 1RM — much of the 1RM gap is
  motor learning of the tested lift.

### 1.4 Individuality is the wild card

**Verdict:** response to identical training varies enormously. Autoregulation (§6) is the
general solution; fixed presets are starting points.

**Evidence:**

- 0–250% strength-gain range in 12 weeks across individuals (Hubal 2005, cited in
  MASS-19 §Interpretation).
- RFD adaptation is highly individual (Peltonen 2018, reviewed in MASS-19): some lifters
  respond to strength blocks, others to power blocks, some not at all — yet 1RM gains were
  similar across responder types (+12.4/+15.2/+16.1% leg press).
- Velocity profiles differ 0.1–0.2 m/s between lifters at the same %1RM (MASS-20 §VBT
  Interpretation); femur length does not predict squat velocity (r=0.02), training age does
  (MASS-18 §VBT Interpretation).

### 1.5 Phase map: novice → intermediate → advanced

**Verdict:** phases are defined by _limiting factors_, not strength standards; switch
training style when the current style stops delivering, and per-lift transitions are
legitimate.

**Evidence (JRN):**

- Limiters per phase — Novice: buy-in/adherence, movement proficiency, body & muscular
  awareness, work capacity. Intermediate: muscle mass, trainability/recovery. Advanced:
  lift mastery, joint health, competition skill.
- Novice protocol: 60–80% 1RM loads, RIR ≥3 with technical-breakdown cutoff (stop the
  moment form changes), 2–4 sessions/lift/week (practice frequency; muscle protein
  synthesis elevated 36–48 h in novices), bodyweight/isolation work for awareness.
- Exit rule: when week-to-week load additions grind (2–6 months), move to intermediate
  training — per-lift.
- Intermediate (the app's target lifter): main lifts at 75–85%, rarely <70% or >90% outside
  peaking; variations to push hard without overuse; main-lift volume low-to-moderate at
  ≥1–2 RIR; accessories carry volume (6–15 reps, 2–3×/week, 4–6 sets/session, 40–70 total
  reps/session); PR cadence 4 → 8 → 12-week blocks; simple 3–4-week peaks; phase length
  3–8 years, exiting when yearly muscle gain falls below ~3–5 lb.
- Advanced: coordination trainable at 80–85%; rate coding engages at roughly 80–85% of max
  force, so mastery work needs heavier loads; offseason = high frequency/volume, relatively
  low intensity, variation via close variants; meet prep compresses volume to raise intensity
  (last ~6 weeks very conservative with accessories; last 4–6 weeks maximize high-quality
  85–95% work, fresh); compete ~2×/year.

_(Confidence: Medium — JRN is the sole full statement of the phase map; its load bands
converge with PYR §L2–§L3 and MASS-20 templates.)_

---

## 2. Load and intensity

### 2.1 Load drives strength

**Verdict:** higher loads → greater 1RM gains, with a dose-response that keeps rising into
the heavy zone. The strength-relevant intensity ladder is ≥80% > 60–79% > <60% 1RM.

**Evidence:**

- PYR §L2 Intensity: load shows a linear dose-response to 1RM gain (meta-analytic,
  Lopez 2022 + Carvalho 2022); RIR/proximity has ≈ negligible independent effect on strength
  at fixed load (Robinson 2024 MR) — the load itself is the driver.
- MASS-20 §VBT (Dorrell) article cites Schoenfeld 2017: intensity is the primary driver of
  strength gains (vs load volume).
- JRN: intermediate band 75–85% of max with very little below 70% or above 90% except meet
  peaking; PYR strength recommendation: 1–8RM (~80%+ 1RM) with RIR ~7–0 as dictated by load.
- Heavy-vs-light tally (Nuckols quantitative review, via the synthesis run): of 16 studies
  comparing heavy (~85%+ 1RM, sets of ≤5) with lighter loads, all but one favored heavy loads
  for 1RM gains; light loads (30–60%) can match hypertrophy at high volumes but do not build
  1RM as well.
- Lasevicius 2018 RCT (volume-equated 20/40/60/80% 1RM, 12 wk): all loads ≥40% built
  strength; 80% was superior for both strength and CSA; 20% was suboptimal.
- ACSM 2026 Position Stand (Currier 2026; overview of 137 SRs, >30,000 participants):
  voluntary strength is enhanced by lifting ≥80% 1RM, through a complete ROM, for 2–3 sets,
  first in the session, at ≥2 sessions/week.
- The classic "hypertrophy range" is not magic (Nuckols pooled analysis + cited RCTs, via the
  synthesis run): when volume is equated, 30–85% 1RM covers the usable growth spectrum —
  growth roughly halves only at ~20% 1RM. Heavy main work and moderate-load accessory work
  are compatible (§10.1).

**Caveats:** the load dose-response evidence skews male (Ralston's MA inclusion was adult
males 18–60 — MASS-18); the PYR-cited MRs average ~10-week studies with ~40% untrained
subjects. Beginners progress fine at 60–75% (JRN novice band, §1.5); the ≥80% threshold
likewise derives from trained cohorts. "Intensity" here means load, not effort.

### 2.2 Where the strength zone lives

**Verdict:** most working volume ≥80% 1RM zone (sets of 1–8); heavier-than-90% work is for
peak/skill, not volume; sub-70% work is supporting, not strength-driving.

**Evidence:**

- PYR §L2 Intensity: "very high loads (≥90%)" section — daily-max data: heavy singles alone
  produced small gains; adding 2×3 back-offs at 80% of the daily max produced meaningful
  total gains. The same protocol family is explicitly analyzed in the METD intervention
  series (Androulakis-Korakakis 2021, PMID 34527945): single + 2 back-off sets of 3 at ~80%
  of the day's top single produced the highest probability of a meaningful powerlifting-total
  gain (+33.7 kg, 99.6% probability) — **heavier back-offs beat more reps at lighter loads
  despite less total volume**. (Small Bayesian arms, n=9–16 — exploratory, wide HDIs; §11.1.)
- METD floor (Androulakis-Korakakis 2020, PMID 31797219 — MA): a single set of 6–12 reps at
  70–85% 1RM, 2–3×/week, to volitional failure produces statistically significant but
  suboptimal 1RM gains over 8–12 weeks. The practical intervention version: ~3–6 working
  sets of 1–5 reps per week per lift, spread over 1–3 sessions, >80% 1RM at RPE 7.5–9.5.
- MASS-20 §Periodization: heavy single @8 RPE (~88–92% 1RM) before volume work ~1×/week as
  year-round specificity insurance.
- MASS-21 §Application: maximizing 1RM requires working up to ≥90% 1RM; a single at 90% is
  already ~2 RIR; competition prep may use 0–1 RIR singles (RPE 9–9.5).
- PYR §L2 reps-allowed table (framing only): 100%→1; 95%→2–4; 90%→3–6; 85%→5–9; 80%→8–12;
  75%→9–15; 70%→11–18.

**Caveats:** reps-allowed rows are population averages with huge individual spread (§2.3).

### 2.3 The prescribing interface: RPE/RIR, not exact percentages

**Verdict:** prescribe load as RPE/RIR ranges; use %1RM to frame, gauge, and communicate —
not as a rigid target.

**Evidence:**

- PYR §L2 Intensity: %1RM is for framing/progress-gauging, not prescription — because
  reps-at-%1RM varies hugely (well-trained squatters: 6–26 reps at 70% 1RM — Cooke 2019,
  via PYR §L2; the corpus's reps-allowed table comes from Nuzzo 2024 MR).
  Estimate 1RM from a 2–5RM performance, not a 1RM test.
- MASS-20 §RPE Guide: same spread reported (6–28 avg 16±4; 6–26 avg 14±4 at 70% 1RM);
  RPE-selected loads beat fixed-% prescriptions over 8–12 weeks (Helms 2018; Graham &
  Cleather 2019) because average intensity drifts higher under autoregulation.
- Helms dissertation (via MASS-18 §VBT Interpretation): RPE-autoregulated 8-week prescription
  beat %1RM prescription for squat/bench gains.

**The scale (Zourdos 2016 — the corpus's RPE/RIR standard, cross-referenced against velocity;
PYR §L2 + MASS-20 §RPE Guide):**

| RPE | RIR meaning                                   |
| --- | --------------------------------------------- |
| 10  | 0 RIR (momentary failure)                     |
| 9.5 | 0 RIR, but a heavier load was possible        |
| 9   | 1 RIR                                         |
| 8.5 | 1–2 RIR                                       |
| 8   | 2 RIR                                         |
| 7.5 | 2–3 RIR                                       |
| 7   | 3 RIR                                         |
| 5–6 | 4–6 RIR                                       |
| ≤4  | effort rating only — RIR no longer meaningful |

- RPE and RIR are interchangeable at RPE ≥5.
- **Accuracy:** average underestimation ~1 rep; error grows on sets >12 reps and at higher
  RIR (Halperin 2022, via PYR §L2). High-rep error direction is benign — lifters believe
  they're closer to failure than they are (MASS-20: 5.15±2.92 reps off at 70% 1RM intra-set
  calls). Low-rep/heavy sets are strikingly accurate in trained lifters.
- **Self-calibration drill** (MASS-20): call RPE mid-set, then continue to failure; practice
  on ≥80% 1RM sets at expected ~7 RPE.
- **Risk case:** autoregulating heavy singles — a mis-rated 8 (actually 9) can prompt an
  overreach. Coach's fix: prescribe a load known to be an 8-RPE single, with an optional
  second rep to prove failure isn't close (MASS-20 §Accuracy).

**Load-correction rules:**

- PYR §L2 / §L3 double progression: adjust load ~4% per rep off the RPE target (2 RIR off ≈ 8%).
- MASS-20 §RPE guide, missed-RPE adjustment chart (Helms dissertation; target band 6–8 RPE):
  actual RPE 1 → +20%; 2 → +16%; 3 → +12%; 4 → +8%; 5 → +4%; 6–8 → lifter's choice; 8.5 → −2%;
  9 → −4%; 9.5 → −6%; 10 → −8%. Rule of thumb: ~2% per 0.5 RPE outside the band.

### 2.4 Velocity as an optional interface

**Verdict:** velocity-based training is a validated alternative to percentage/RPE loading,
but it's an optional refinement — RPE/RIR captures the same job with less apparatus, and
velocity is unreliable at maximal loads.

**Evidence:**

- Reliability (Banyard 2017, reviewed in MASS-18): ACV/mean propulsive velocity are reliable
  at 20–90% 1RM but NOT at 100% (CV ~18–19% at 1RM); peak velocity is reliable everywhere.
- Cross-study anchor: ACV at 100% 1RM ≈ 0.23–0.26 m/s; 1RM @90% ≈ 0.34 m/s ≈ RPE 8–9.
- Velocity–RPE equivalents (squat, MASS-18): 4×8@70% = RPE 5–7 = 0.40–0.70 m/s; 3×1@80% =
  RPE <5 = 0.55–0.75 m/s; 5×3@85% = RPE 7–9 = 0.30–0.45 m/s. (Ladder source: unpublished
  master's thesis, n=58 — weakest evidence class in corpus.)
- Dorrell 2019 RCT (MASS-20): VBT group gained ~50% more summed 1RM with 5.9% less volume
  load — but the article itself flags the magnitude as confounded (per-rep velocity feedback
  doubles as external cueing + maximal-intent enforcement; short study; group targets).
- Complementarity (MASS-18): velocity ignores technique error; RPE captures it. Warm-up
  RPE @85% may predict the day's 1RM better than velocity (3-person case series).

**Caveats:** velocity tools require equipment the app can't assume; treat all velocity
prescriptions as optional refinements (§11).

---

## 3. Volume

### 3.1 How to count volume

**Verdict:** count fractional sets, cap per-session volume, and stop using volume-load as a
cross-lift metric.

**Evidence (PYR §L2 Volume; §L2 Frequency):**

- Fractional counting: full set for the tested lift/primary muscle; half set (0.5) for
  other exercises training the same muscles.
- Pelland 2025 MR: fractional counting of indirect sets had the strongest relative evidence
  in the 67-study dose-response model — independent corroboration of the fractional rule.
- A heavy set must last ≥4 reps to fully count toward hypertrophy stimulus (PYR; some
  passages frame it as ~4–5); strength sets of 1–5 reps count as direct strength work, not
  hypertrophy volume.
- Per-session cap: never exceed ~11 fractional sets per muscle per session (Remmert 2025
  MR — preprint; fitted model).
- Volume-load (sets × reps × load) is "not particularly informative" except
  within-person/same-lift comparisons (PYR §L2; echoed in JRN's impulse framing).

### 3.2 Dose-response: shallow, plateauing early

**Verdict:** strength gains improve with weekly volume up to ~5 sets/lift/week, then
flatten. The first weekly set is the minimum effective dose; the second roughly doubles the
gain rate.

**Evidence:**

- MASS-18 §Volume article (Ralston 2017 MA, 9 studies, 61 groups): ≥5 vs <5 sets/exercise/week
  — significant (p=0.003) but small (ΔES 0.18; framed another way, <5 sets/wk ES 0.82 vs
  > 10 sets ES 1.01; exercise-specific 1RM sub-analysis ES 0.14, p=0.06). Nuckols' reframe:
  > ~20–25% faster gains. Data stop at 10 sets/exercise/week; the degradation point is unknown.
- PYR §L2 Volume (Pelland 2025 MR — published version of the preprint the corpus cites as
  Pelland 2024; PMID 41343037): 1 weekly set/lift = minimum effective dose; 2 sets ≈ doubles
  the rate; 3–4 sets high efficiency; ~5 sets/lift/week = the short-term plateau. The
  published model: volume raises both strength and hypertrophy with diminishing returns —
  **much steeper (more pronounced) for strength than for hypertrophy**. Authors' caveats:
  studies average ~10 weeks, ~40% untrained subjects, higher-volume studies had fewer direct
  sets → the plateau "might be a bit exaggerated" for trained lifters; long-term practical
  dose 5–10 fractional sets/muscle/week.
- Schoenfeld 2019 RCT (PMID 30153194; 1/3/5 sets per session): all three doses gained similar
  1RM on squat and bench while hypertrophy showed a clear volume dose-response — the sharpest
  observed divergence between the two goals.
- Trained-lifter corroboration (PYR §L2): powerlifters gained meaningfully for 6–12 weeks on
  3–6 heavy weekly sets of 1–5 reps; 1–3 sets plateaued ~2 months; a 15,000-lifter
  1-set-to-failure dataset (Steele, via PYR §L2) plateaued within 1–2 years at ≤+50%.
- Career-shape anchor (PYR §L2, Latella 9000+ powerlifters): ~+10% competition total in
  year 1, then ~9 more years for the next +10%.
- MASS-18 framing nuance: volume's _absolute_ effect on strength is "similar to, if not
  larger than" its absolute effect on hypertrophy, but the _relative_ advantage of more
  volume is 33–60% larger for hypertrophy.

**Caveats:** the plateau-vs-monotone question is genuinely contested (Appendix A); the
reconciled framing below carries the authors' own hedges.

### 3.3 Practical dose

**Verdict:** floor ~3 sets/lift/week in practice; 3–5 sets/lift/week captures short-term
strength; 5–10 fractional sets/muscle/week is the long-term dose; >10 weekly sets/lift is a
hypertrophy decision, not a strength one.

**Evidence:** PYR §L2 Volume practical table (above) + MASS-18's "higher volume matters more
as training age rises" + PYR dose rule: "Do enough to progress, not as much as possible; add
volume only when plateaued and everything else is dialed in."

Practical inverted-U (PYR §L2): even where research shows no downturn, excess volume causes
deload spirals, injury, and burnout in practice. Hypertrophy context (PYR §L2): minimum ED
4 sets/muscle/wk; practical 10–20; ~30 ceiling; >30 likely plateau.

### 3.4 Changing volume

**Verdict:** adjust volume by relative moves (±20%), not absolute prescriptions; add volume
only when recovery is sound and everything else is dialed in.

**Evidence (PYR §L3 plateau rules; §8.6 flowchart):** −20% across the board if chronically
under-recovered despite fixes; +20% (global or targeted) only if recovered, technically
sound, and still stalled. PYR calls the +20% addition research-supported; the −20% cut it
frames as a starting point — both are expert guidelines, not trial-derived numbers.

---

## 4. Frequency

### 4.1 What frequency does

**Verdict:** for strength, per-lift frequency has a real (if modest) dose-response — the
biggest jump is 1→2 exposures/week — but its main job is distributing volume into tolerable
sessions. Extra sessions should be low-effort quality practice (3–4 RIR, lighter loads),
biased toward pressing — not more failure work.

**Evidence:**

- PYR §L2 Frequency (Pelland 2024 modeling): biggest jump at 1→2 sessions/lift/week (modeled
  gain rate ~13% → ~17%), diminishing returns through 6×/week.
- MASS-21 §Application: 2–3×/week superior to 1×/week for strength (Grgic 2018 MA).
- Grgic 2018 MA (PMID 29470825; 22 studies): effect sizes rise with frequency (1/2/3/4+×/wk:
  ES 0.74 → 1.08, p=0.003), but in volume-equated studies the effect is null (p=0.421).
- Independent-effect counterpoint (Nuckols' own MA of 13 volume-matched studies, via the
  synthesis run): ~20–23% faster gains at higher frequency, with upper-body pressing the
  standout (3+ days/week beat 1–2 days by +0.64%/wk, d=0.93; no low-frequency group ever
  out-gained a high-frequency group by >10%); lower-body effect trivial (+0.26%/wk, ns).
- Pelland 2025 MR: frequency's effect on strength was the one consistently identifiable
  effect in the model (posterior probability 100%); hypertrophy's was compatible with
  negligible.
- PYR §L2: hypertrophy's independent frequency effect ≈ negligible when training doses are
  equated — frequency is a volume-distribution tool.
- MASS-18 §Deadlift-fatigue article: macro periodization can be identical across lifts while
  weekly frequency/volume differ; repeated bout effect lets frequency be raised gradually.

### 4.2 Practical bands

**Verdict:** 2–6×/lift/week; 1–2 direct working sets per main lift per session; never exceed
~11 fractional sets/muscle in a session; scale session count to weekly volume.

**Evidence (PYR §L2):** recommendations as above; frequency-by-volume table: 4–10 weekly
sets → 1–2×; 11–20 → 2–3×; 21–30 → 3+. JRN: 2–4×/lift/week in the novice phase.

### 4.3 Skill retention

**Verdict:** ≥2 exposures/lift/week for skill retention; one can be light and low-effort
(e.g., 3×1 @80%) — quality practice is a first-class reason to raise frequency.

**Evidence (PYR §L2 Frequency; §4.1 distribution evidence; §7.3 ordering findings).**

### 4.4 Deadlift note

**Verdict:** deadlift frequency can sit below squat frequency for comfort and practicality —
not because deadlifts are proven more fatiguing.

**Evidence (MASS-18 §Deadlift-fatigue article):** high-intensity (95% 1RM) deadlifts showed
no greater acute central/peripheral fatigue than squats (8×2 crossover, MVIC/VA/EMG
equivalent); 3×/wk squat + 1×/wk DL still gained +9.21%/+7.14% over 8 weeks; acute testing
didn't capture weekly time-course or posterior-chain stress, so weekly fatigue may still
differ. "The best way to improve the deadlift is to deadlift" (Hales 2009).

---

## 5. Proximity to failure

### 5.1 What training to failure costs

**Verdict:** failure is not required for strength, and habitual failure costs recovery and
next-session quality.

**Evidence:**

- MASS-19 (Pareja-Blanco 2018 crossover): every failure condition (even 4(4) @90% 1RM)
  dropped vertical jump at 24h (−4.4% to −7.2%); none of the non-failure conditions showed a
  statistically significant decline (raw values dipped slightly, non-significantly). At 48h,
  ≥6-rep failure protocols still ~−4%; non-failure <−0.7%. CK elevated 48h in all failure
  conditions.
- Failure's fatigue cost isn't just tonnage: 5(10) ≈ 4(4) in volume load, but failure still
  slowed recovery (MASS-19 §Interpretation).
- Watkins 2017 (via MASS-19/22): an 8% VJ drop predicted a 28% drop in squat reps at 80% 1RM
  (r=0.65) — i.e., failed sets measurably degrade the next session's work capacity.
- Failure ≠ more strength: Davies et al. 2016 meta (via MASS-19/21 §Application).
- Grgic 2022 SR/MA (PMID 33497853; 15 studies): failure vs non-failure — no significant
  difference for strength (ES −0.09); in volume-non-equated studies non-failure was
  **superior** (ES −0.32).
- Wu 2026 MA (PMID 42410632; 20 studies, 556 participants): non-failure superior for dynamic
  strength (SMD 0.24, p=0.01); no difference for isometric strength, hypertrophy, endurance,
  or power.
- MASS-20 §RPE guide: fatiguing 1RM tests themselves force deloads — prefer e1RM tracking (§6.5).

### 5.2 What proximity buys (and doesn't)

**Verdict:** for 1RM, load dominates and proximity adds ~nothing independently; for
hypertrophy, gains are comparable across a wide RIR range at moderate loads. Stop sets
short of failure in volume work; approach failure only when intensity is high or volume is
low.

**Evidence:**

- PYR §L2 (Robinson 2024 MR): RIR's independent effect on strength ≈ negligible at fixed
  load; load dose-response is the driver (§2.1).
- Velocity-loss series (strongest corpus evidence): stopping squat sets at 20% velocity loss
  (≈ ~2–4+ RIR) produced +4.6% greater squat 1RM than stopping at 40% VL (≈ failure on half
  the sets) in 8 weeks, despite less volume load (Pareja-Blanco 2017, via MASS-20/21);
  pull-ups: 25% VL beat 50% VL by ~5% (Sánchez-Moreno, via MASS-21).
- Andersen 2021 (MASS-22, volume-equated 15% vs 30% VL ≈ ~5–10 RIR vs ~1–4 RIR): identical
  strength and muscle-thickness gains; RFD unchanged from pre to post in both legs; power
  output fell in both.
- Zourdos' 13-study compilation (via MASS-22): VL of 10/15/20/25% each beat ≥40% for 1RM at
  50–85% 1RM.
- MASS-21 (Santanielo 2020): failure leg (13.6% more reps, 11.5% more volume) gained no more
  strength (1RM ES 0.18, trivial) and no more hypertrophy (CSA ES 0.27) than the ~1.5–1.6 RIR
  leg.
- Helms dissertation (via MASS-21): 4–5 RIR ≈ 2–3 RIR for growth over 8 weeks.
- The two newest failure MAs (Grgic 2022; Wu 2026) square with Robinson 2024: load dominates,
  and at non-equated volumes training off failure slightly wins (Wu 2026; §5.1) — proximity
  has no independent strength payoff worth its fatigue cost.

**Caveats (stated in MASS-21/22 themselves):** VL studies are 12/13 not volume-equated and
dominated by one lab's Smith-machine squat; individual variability is enormous (Klemp, via
MASS-22: squat 1RM −3.5% to +18.6%); short-ROM movements may need closer-to-failure work (Kilgallon
2021 counterexample); synergist stimulus at low-RIR bench is unknown. Goto 2005 and Karsten
counter-findings are discounted in-article (cluster artifact; weekly frequency).

### 5.3 The RIR-by-context matrix

**Verdict (converged defaults):**

| Context                                     | Effort                                                      |
| ------------------------------------------- | ----------------------------------------------------------- |
| Novice main lifts                           | ≥3 RIR, technical-breakdown cutoff (stop when form changes) |
| Accumulation/volume blocks, compounds       | ~3–5 RIR                                                    |
| Extra-frequency / quality-practice sessions | 3–4 RIR, lighter loads                                      |
| High-intensity work (>85% 1RM)              | 0–2 RIR (a 90% single is already ~2 RIR)                    |
| Isolation/assistance                        | 1–2 RIR typical; failure acceptable, esp. late sets         |
| Peaking blocks                              | approach 0–1 RIR on singles (RPE 9–9.5); volume minimal     |

**Evidence:**

- PYR §L2 exercise-class RIR ladder (hypertrophy work): lower free-weight compounds 4–8 reps
  @ 4–2 RIR; lower machine/upper pressing 4–12 @ 4–1; machine pressing/pulling 6–15 @ 3–0;
  isolation 8–20 @ 2–0 (final sets to failure optional). Sequence example: squats/deadlifts
  4–6 @ 3–4 RIR or 6–8 @ 2–3; leg press 6–8 @ 2–3 or 8–12 @ 1–2; isolation 8–12/12+ @ 0–2.
- MASS-21 §Application: compounds ~4–5 RIR on high-frequency programs is a floor-estimate
  heuristic, not an optimality claim; "save your 0–2 RIR sets for high-intensity and
  low-volume training" (Zourdos).
- MASS-22: ≥5 RIR appears sufficient for hypertrophy in 4 of 5 VL studies (exercise- and
  ROM-bounded caveats above).
- JRN: novices RIR ≥3 with technical cutoff; intermediates ≥1–2 RIR on main lifts.
- Periodized effort rule (MASS-19/21/22): farther from failure when accumulating, closer
  when peaking; habitual 5RPE training "leaves strength on the table."
- Weekly stratification (MASS-21 §Application): early-week/high-volume sessions keep main
  lifts and high-damage exercises (RDLs, flys, skull crushers) far from failure; assistance
  at 1–2 RIR; late-week: last main-lift set may go to failure, assistance 0–2 RIR.
- Helms (via the synthesis run): RIR is a function of load — heavy technique days may sit at
  RPE 5–6 (80–85% 1RM for 1–3 reps) to build skill with minimal fatigue.

### 5.4 Velocity-loss as the precise non-failure stop rule

**Verdict:** if you need an objective stop rule (no velocity sensor assumed), RPE bands are
the corpus's app-native equivalent; if velocity is available, calibrate an absolute target
velocity, not a % threshold.

**Evidence (MASS-20/22):**

- 15–30% VL window ≈ ~3–5+ RIR at 50–85% 1RM; beats ≥40% VL for 1RM.
- %VL drifts into failure across sets (first-rep velocity decay: 0.70→0.60 m/s @70% 1RM);
  MASS-20 argues RPE stops dominate %VL thresholds for this reason.
- Absolute-velocity method (MASS-22): one set to failure @~75% 1RM calibrates your RIR–
  velocity relationship; then stop sets at an absolute m/s target (stable across loads).
- Explosive/jump adaptations: keep sets ≤20% VL.

### 5.5 Where failure belongs

**Verdict:** use failure deliberately: isolation/assistance (esp. late-week), the final set
of a main lift, the last session before your longest break. Keep technique tight at 10 RPE —
breakdown is a known cost. Enjoyment justifies strategically placed failure work; effort
targets are not all-or-none.

**Evidence (MASS-19 §Application; MASS-21 §Application; PYR §L2).**

---

## 6. Progression and autoregulation

### 6.1 What overload actually is

**Verdict:** overload is stimulus above what you're _currently adapted to_ — not a number
exceeding last week's. Performance rising _confirms_ overload happened; the program's job is
to set conditions where it can.

**Evidence (PYR §L3):** "it is not what you previously lifted that determines overload, but
what you are currently adapted to"; "if you are able to progress, it's because overload
occurred."

### 6.2 Progression models

**Verdict:** three operationalizations, in order of training status — (a) load progression at
fixed reps (novice), (b) double progression (intermediate default), (c) RPE/RIR-anchored
autoregulation layered on top. Autoregulation modestly beats fixed-percentage loading for
strength: both corpus RCTs found autoregulated loading trains at a higher average intensity
and produced greater 1RM gains (Helms 2018; Graham & Cleather 2019, via MASS-20 §RPE guide).

**Evidence:**

- Helms 2018 + Graham & Cleather 2019 (via MASS-20 §RPE guide): allowing lifters to pick
  load by RPE led them to train at a higher average intensity, which led to greater 1RM
  strength.
- Helms dissertation (via MASS-18): RPE prescription beat %1RM prescription (squat/bench).
- Graham & Cleather 2021 (12-wk trial, via the synthesis run): autoregulating groups trained
  at a higher average %1RM and finished with a small significant strength advantage — same
  direction as the 2019 result above.
- RP's synthesis agrees (via the synthesis run): autoregulate **reactively** (respond to
  logged performance), not proactively (pre-planned arbitrary changes).
- MASS-20 §Periodization: near-max work 2×/week ≈ volume training in novices (Mattocks 2017) — beginners don't need elaborate autoregulation.

### 6.3 Autoregulated double progression — the spec

**Verdict (converged rule):** pick a rep range + RIR ceiling. Advance load one increment
when the first set reaches the rep-range top while still inside the RIR ceiling; correct load
~4% per rep when the first set misses low; step back one load increment (~4–6%) when sets
grind at ≤1 RIR at range bottom.

**Evidence:**

- PYR §L3 (autoregulated double progression, all hypertrophy + secondary work): stop at RIR
  ceiling; same load for remaining sets; set-1 miss → ~4%/rep correction; increase load when
  set 1 hits rep-top at RIR-top; trends across sessions; intermediates ~5 sessions per load
  jump (novices faster, advanced ~2×); deliberately exceeding the planned increment based on
  feel is encouraged — strength and rep-endurance recover at different rates.
- MASS-20 §RPE guide: same trigger structure; prescribe bands (e.g., 4×8 @6–8 RPE), not exact
  targets.
- MASS-20 §Progression via RPE: lower average RPE → bigger load bump; repeat a fixed
  prescription until average RPE falls (3×10 @avg 9 → repeat → avg 8 → add load or a set;
  build to 5×10 @avg 8; reset to 3×10 +2.5 kg).

### 6.4 RPE stops and accessory accumulation schemes

**Verdict:** autoregulate _volume_ with RPE stops (per-set or per-session caps) rather than
velocity-loss thresholds; for accessories without 1RMs, use total-rep targets.

**Evidence (MASS-20 §RPE guide):**

- Per-set stop: fixed load; stop the set at target RPE (~7–8 in volume blocks; ~9 when doing
  2–4 reps @85–90%).
- Per-session stop: fixed reps @ fixed load; add sets until session-RPE cap (~8.5); hard caps
  5 sets (volume) / 3 sets (intensity blocks). Built-in progression: hold load until all
  target sets land under the cap, then raise load.
- Preferred over velocity-loss stops: first-rep velocity decays across sets, so a fixed %VL
  drifts toward failure by set 4.
- Total-rep / rest-pause for accessories: load ≈ 12–15RM; sets to 8–9 RPE; accumulate a
  total-rep threshold (e.g., 35: 11+9+8+7); 20–30 s rests (less next-48h fatigue than
  failure); progress when the threshold is hit in fewer sets.
- Session RPE (Foster 2001): 0–10, logged ~30 min post-workout, tracks global fatigue.

### 6.5 Tracking progress without maxing

**Verdict:** estimate 1RM from 2–5RM sets or daily prescribed singles; never prescribe
rigidly against e1RM; progress shows up as the same load at lower RPE (or more volume at the
same cap).

**Evidence:**

- PYR §L2: estimate 1RM from a 2–5RM, not a 1RM test; PYR §L3 Strength Progression System:
  every session opens with a single at prescribed RPE on each main lift (≤5 lifts), producing
  a running e1RM trend — always the same calculator.
- MASS-20 §Tracking: 1 rep @9 RPE ≈ 95% → daily 1RM = load / 0.95. Progress: 150 kg single
  moves from RPE 9 to RPE 7 → projected 1RM ~172.5 kg. Volume analog: 3×8@105 kg ≤8 RPE →
  weeks later 6×8@105 kg (last set @7).
- Avoiding fatiguing max tests also avoids the deload they force (MASS-20 §Tracking).

### 6.6 Progression-rate realism

**Verdict:** set promotion cadences by training status, and gate "meaningful progress" in
relative terms (block-to-block %), not fixed kg.

**Evidence:**

- JRN: PR cadence escalates 4 → 8 → 12-week cycles across the intermediate phase; a 12-week
  PR cadence should hold through bulks; simple 3–4-week peaks.
- PYR §L3 training status: novice adds each session/week (6 months–years); intermediate
  gains reps in the 10–20 range week-to-week or load month-to-month in low-rep ranges;
  advanced gains a rep or two monthly or small load increases over longer spans. Most
  lifters reach intermediate by year 1; some stay intermediate through years 4–5.
- Career anchor (PYR §L2, Latella cohort): ~+10% year 1, next +10% over ~9 years; Hubal
  (MASS-19): 0–250% individual range.
- Meaningful-gain gate (coach consensus via the METD survey, n=137; synthesis run): 1–2.5%
  per lift per ~6-week block for advanced lifters; any positive change counts for beginners.
- Elite reference point (Latella 2020 15-year cohort): ~0.15 kg/day of powerlifting total.

---

## 7. Program architecture and periodization

### 7.1 What periodization evidence actually supports

**Verdict:** periodized modestly beats non-periodized training; the benefit is largely
_variation_ (non-static dose) plus _linearity_ (volume ↓ / intensity ↑ as the goal
approaches) plus heavier-load practice timed near the goal. Don't over-index on scheme
magic — dose, frequency, progression, and ordering do the work.

**Evidence:**

- Williams 2017 meta (via MASS-20 §Specificity article): periodized > non-periodized for
  strength.
- Nuckols' review of ~25 periodization studies (via the synthesis run): periodized training
  ~22% faster (d=0.23–0.30); undulating (DUP) beat linear for trained lifters (~28% faster,
  d=0.56–0.76) but showed no difference for novices; when volume, average intensity, AND
  peak intensity were all matched, gains were identical — much of the "periodization
  advantage" is simply heavier-load practice.
- Moesgaard 2022 (via PYR §L3; 35 studies, ~1000 participants): periodized > non-periodized
  for 1RM regardless of model; undulating > in trained lifters; benefits plausibly from
  variation + test-time specificity.
- Corroborating null (ACSM 2026 Position Stand, via the synthesis run): periodization "did
  not consistently impact training outcomes" across 137 reviewed SRs.
- PYR's own caveat: periodization's positive effects "can't be confidently attributed to
  their specific structure" — they may simply reflect performing specific training close to
  the test. Bench-press gains dominate the periodization evidence; squat gains may drown out
  program effects via practice alone.
- MASS-20 framing: "periodization = long-term trends; programming = today's sets/reps."

### 7.2 Phasic architecture: the Strength Progression System (PYR §L3)

**Verdict:** the corpus's flagship strength architecture runs volume → load → peak phases,
with daily prescribed singles generating a running e1RM trend.

**Spec (PYR §L3):**

- Every session opens with one single at prescribed RPE on each main lift (≤5 lifts); track
  e1RM trend with the same calculator throughout.
- **Volume phase (6–12 wk):** 1–3 singles/lift/wk, RPE 5→8; secondary lifts 10–20 sets/wk
  per main-lift muscle group, mostly 6–20 reps @ 0–3 RIR, autoregulated double progression;
  favor low-stress non-specific exercises (machines) over high-volume competition lifts.
  e1RM: novice ↑ weekly; intermediate ↑ across phase; advanced maintain.
- **Load phase (4–8 wk):** 2–4 singles/lift/wk, RPE 6→9; after each single, 2 back-off sets
  of 3–5 reps @ 5–8 RPE (~80–85% of the day's e1RM), stepping reps 5→4→3 linearly; secondary
  volume halved (5–10 sets/wk), stepping −1–2 sets every 1–2 wk; use close variants (SSB,
  high-bar, block pulls, medium-grip bench) if main-lift volume isn't tolerable. e1RM:
  novice weekly; intermediate every 2–3 wk; advanced over phase.
- **Peak phase (2–4 wk** — 2 if volume+load totaled 10–12 wk, 3 if 13–15, 4 if 16+**):**
  2–5 singles/lift/wk at 7–10 RPE; back-offs shrink 4→2 reps (~85%); secondary 0–4 sets/wk.
  Final two weeks: w/o −2 ordered SBD ~9–10 RPE → SB ~8–9 → bench-only ~7–8 → SBD opener
  practice at planned openers (~90–92% 1RM / ~8 RPE) with 1×2 back-offs. w/o −1: drop the
  bench-only day; singles 7–8 then 6–7 RPE; final SBD 1–2 days out is a primer (singles at
  4–5 RPE only).
- **Sequencing:** Volume → deload → Load; Load (or Peak) → intro week → Volume. Intro cycle:
  ~75% of planned volume, slightly farther from failure (PYR §L3).
- The Pyramid's 3rd edition dropped wave loading as "unnecessarily complicated." Main-lift
  volume ceiling ~5 sets/lift/week short-term (§3.2); variation lifts count 0.5 sets (§3.1).

### 7.3 Microcycle ordering and year-round specificity

**Verdict:** schedule for freshness: hardest specific work when freshest; insert the
least-fatiguing session between heavy volume and AMRAP days; keep a heavy single (~8 RPE) in
the plan year-round.

**Evidence:**

- Zourdos 2016 DUP ordering (PYR §L3): placing a light singles day between the high-volume
  day and the heavy AMRAP day produced bigger 1RM gains than the reverse.
- MASS-20 §Periodization: heavy single @8 RPE (~88–92% 1RM) before volume work ~1×/week;
  within-week DUP (10/8/6 or wider 10/6/2 undulation) keeps heavy-ish work in volume blocks.
- PYR §L2 scheduling: avoid heavy same-muscle secondary work the day before main-lift work.
- MASS-22 §Flexible templates: default weekly order — moderate-RPE Mon, low-RPE Wed, high-RPE
  Fri; or high-volume Mon → power/low-volume Wed → strength/moderate Fri (power in the middle
  gives 48-h priming — Tsoukos 2018 / Zourdos 2016 DUP ordering, via MASS-22; Peltonen's
  responder data, §1.4, supports individualizing power work).

### 7.4 Corpus program templates

**Zourdos integrated DUP blocks (MASS-20 Table 6)** — %1RM prescriptions with RPE bands:

- Volume block 1 (5–8 wk): squat 3×10@65% (5–7 RPE) → 4×8@70% → 4×6@75%; bench same;
  deadlift 8×1@75% → 4×1@85%; assistance 3–5 sets, 15–20 → 10–15 → 6–10 reps @ 5–8 RPE.
- Volume block 2 (5–8 wk): squat 3×8@72.5% → 3×6@77.5% → 4×4@82.5% (6–8 RPE); deadlift
  7×1@80% → 3×1@87.5%; assistance 12–15 → 8–12 → 6–8 reps.
- Intensity block (3–5 wk): squat/bench 3×5@80% (7–9 RPE) → 3×3@85–87.5% → double @9 RPE;
  deadlift 3×1@85% → 1×1@87.5% → 3×1@90%; assistance 10–12 → 8–10 → 6–8 @ 7–9 RPE.
- Average RPE rises as volume falls.

**Daily-max template (MASS-20 Table 5)** — high-frequency autoregulation:

- Mon: squat single @9–9.5 + 3×8@70%.
- Wed: bench single @9–9.5 + 3×8@70%; deadlift single @9–10 + 4×5@70%.
- Fri: squat single @9–9.5 + 3×5@77.5%.
- Sat: bench single @9–9.5 + 3×5@77.5%; deadlift single @9–10 + 4×2@80%.
- Context: daily maxing works short-term (+10.8/9.5/5.8% squat in 37 days, 220→241 kg) but
  is unproven long-term; sustainability warning is the operative guidance (MASS-20).

### 7.5 Splits and scheduling

**Verdict:** pick days/week first; most lifters (≈90%) do well with 3–5 days/week and 2–4
exposures/lift/week; match weekly volume to the time budget honestly.

**Evidence (PYR §Guide):**

- Frequency matrix (Table 7.1): days/week (2–6) ↔ main-lift weekly frequency (1.5–6), with
  combined S/B and B/D sessions; assistance sharing musculature adds 0.5 to a lift's
  frequency count.
- Volume tiers by time commitment (PYR Table 7.4): 4–8 sets/muscle (~1–2.5 h/wk);
  9–12 (~3–4.5 h); 13–16 (~5–6.5 h); 17–20 (~7–8.5 h); 21–30 (~9+ h, specialization). PYR
  frames total stimulus as rising across the tiers while average stimulus per set is highest
  at the 4–8 tier.
- JRN intermediate: accessories 2–3×/week per muscle/movement; 4–6 sets/session; advanced
  offseason variants target specific weaknesses.
- Main-lift load/RPE prescriptions have no cheat sheet — dictated by phase and peak
  proximity (PYR §Guide).

### 7.6 Flexible templates

**Verdict:** default to a fixed weekly order with a pre-built flex option; full flexibility
only pays under extreme life stress or demanding training, and never fixes chronic fatigue.

**Evidence (MASS-22 §Flexible templates):**

- Flexible-vs-fixed RCTs: no performance advantage (Walts 2021 null; 1 of 7 tests favored
  flexibility across 3 studies; McNamara & Stearne's leg-press outlier was all-sets-to-
  failure in a rotation design) — but flexible groups dropped out less (12.5% vs 31%,
  Colquhoun 2017).
- Use flexibility only when training is extremely demanding, life schedule exhaustive, or
  gym access inconsistent.
- Architecture: fixed weekly order + permanent "flex option" slot (low-volume power day or
  low-RPE assistance day); miss 1 day → shift everything one day; miss 2 → repeat the week.
- Monthly scaling: 6 high / 6 moderate / 6 low RPE days per month; under stress scale to
  4 / 8 / 12.
- Chronically fatigued → cut volume or proximity to failure, not add flexibility.

### 7.7 The RP mesocycle model (secondary architecture)

**Verdict:** RP's engine — hypertrophy-first in their public sources, same autoregulated
structure — runs shorter accumulation blocks with an RIR ladder and a performance-based
deload trigger. Treat it as a complementary model to the SPS (§7.2), not a competing dogma;
its specific numbers are model-derived and unverified against the paywalled strength book
(§11.1).

**Spec (RP, via the synthesis run):**

- ~4-week accumulation block with an RIR ladder **4 → 3 → 2 → 1** across weeks, a deload
  week, then restart at MEV with (ideally) fresh exercises.
- Mesocycle length shrinks with training age: beginner up to 8 wk; intermediate 4–8;
  advanced 3–6.
- RP's per-lift landmark values (MEV/MRV ≈ 2–4 / 8–14 sets per big lift) are **soft ranges —
  never hard-code them**.
- Deload trigger: failure to match the previous week's reps, despite adequate rest (§8.3).

_(Exp; medium confidence — specific numbers are model-derived.)_

---

## 8. Fatigue management: deloads, tapers, plateaus

### 8.1 The model

**Verdict:** performance = fitness − fatigue; fatigue is managed primarily through
proximity-to-failure control, with deloads/tapers as deliberate amplifiers.

**Evidence:** PYR §L3 (fitness-fatigue model); JRN (Banister impulse-response framing;
Yerkes-Dodson for arousal). Fatigue signs to watch (PYR §L3): worse sleep, dreading the gym,
declining loads/reps, worse aches, more illness.

### 8.2 Overtraining syndrome reality check

**Verdict:** true OTS (months-long decline) has essentially never been demonstrated from
lifting alone; "overtraining" complaints in lifters are usually under-fueling or life
stress.

**Evidence (PYR §L3):** Grandou 2020 systematic review found no clear case of OTS induced by
resistance training; the closest candidate is Fry's extreme 2-week daily-max protocol;
underfed-lifter "OTS" is low energy availability. Preserved strength does not license more
volume — secondary symptoms (mood, motivation, sleep, aches) surface first, and the typical
overdose trajectory ends in injury or motivational collapse.

### 8.3 Reactive deloads

**Verdict:** deload reactively — when the weekly self-check (or a performance-based trigger,
§7.7) says so — never by calendar; the deload cuts sets, not intensity.

**Spec (PYR §L3):**

- Trigger: weekly 5-item check — dreading the gym / sleep worse / loads or reps decreasing /
  stress worse / aches worse. 0–1 yes → continue; 2+ → deload.
- Standard deload: cut sets ~30–50% across all exercises; keep loads, RIR, and frequency.
- Targeted deloads for localized regions: e.g., drop squats/deadlifts for lumbar soreness
  while keeping the rest.
- Never deload deeper than needed — complete rest >3 days can drop strength; no data exists
  on an "optimal" deload (§11.5).
- RP's automatic trigger (via the synthesis run): failure to match the previous week's reps,
  despite adequate rest, → recovery week or deload; their deload reduces both volume and
  intensity toward maintenance volume. Compatible with the self-check above — one is
  performance-based, the other subjective; both are reactive.
- SBS angle (via the synthesis run): failure training produces larger, longer-lasting
  performance decrements than volume-matched non-failure training; chronic stress roughly
  doubles recovery time from lifting — triage the recovery environment first (§10.7).
  Deloads are one fatigue-management tool among several — managing proximity to failure is
  the primary one (§5).
- Coleman 2024 (PYR): a pre-planned full week-5 off in a hard 9-week program gave no benefit
  and slightly worse strength/soreness → no automatic monthly deloads.

### 8.4 Tapers

**Verdict:** pre-competition/attempt peaking cuts volume 50–80% while keeping (or slightly
raising) load; expect ~+2–4% strength from the taper; most people need only a simple 3–4-week
peak (JRN). Length scales to accumulated fatigue: days to weeks.

**Evidence (PYR §L3 taper section; JRN §Intermediate Training).**

### 8.5 Intro cycles

**Verdict:** at the start of a new higher-volume/lower-intensity phase, run ~75% of planned
volume, slightly farther from failure.

**Evidence (PYR §L3 introductory cycles; §7.2 sequencing).**

### 8.6 Plateau flowchart (full decision tree)

**Verdict:** diagnose before dosing: confirm the plateau, check foundations, check recovery,
then move dose.

**Spec (PYR §L3 + §Guide "When Progress Plateaus"):**

1. Confirm you're actually plateaued relative to training-status expectations (§6.6).
2. Foundation gates — any "no" means fix it and rerun a mesocycle: sleeping 7+ h; not in an
   energy deficit; protein ≥1.6 g/kg/day (0.7 g/lb); honest RPE rating (neither over- nor
   under-rating); lifts/muscles trained ≥2×/week; exercise selection/ROM/tempo appropriate
   and consistent.
3. Recovery check (fatigue checklist, §8.3): 0–1 yes → likely recovering; 2+ → not.
   Not recovering → light week; if fatigue returns quickly, permanently cut volume ~20% or
   reorganize.
4. Recovering and still stalled → increase dose ~20% (global or targeted) or fix technique.
5. Joint pain only → switch to 12–20-rep sets, or BFR limbs at 20–30% 1RM @ 0–3 RIR
   (~7/10 wrap tightness).

### 8.7 Ready-day triage

**Verdict:** if readiness varies, downgrade the session — don't skip structure. The
best-supported readiness gate for lifting is the warm-up itself.

**Spec:**

- Warm-up RPE triage (MASS-20 §Flexible templates): after warming to 80–85% 1RM, rate RPE
  against your personal norm @85% (assumed ~6): ≥8 → light day; 5–7 → moderate; <5 → heavy.
- Vertical jump (MASS-22 §Determining readiness): best-validated lower-body gate — e.g.,
  ~1.5 cm drop → easier session; Watkins 2017 r=0.65 link to rep performance.
- HRV: failed to improve strength gains or track lifting recovery; pre-workout
  well-being/recovery Likert scales: unproven for acute strength decisions (MASS-20/22).
- PRS-style 0–10 self-rating: a "7" day probably doesn't need a session change; use
  intra-session RPE to adjust (MASS-22).

---

## 9. Exercise selection and technique

### 9.1 Transfer rules and the specific-dose ceiling

**Verdict:** train the competition lifts + a small set of close, targeted variants; ~5
fractional sets/lift/week captures the maximal benefit of specific training — surplus heavy
specific volume has opportunity cost.

**Evidence (PYR §L4):** transfer is asymmetric (§1.3); González-Badillo 2006 (volume-equated
junior weightlifters; 46 vs 93 vs 184 heavy 90–100% 1RM reps over 10 weeks): no significant
differences — low/moderate groups gained more overall. Invest surplus volume in supporting
work.

### 9.2 Variations

**Verdict:** vary within relevance: close variants let you train hard without overuse, and
varied practice can beat single-exercise routines early on.

**Evidence:** PYR §L4 (contextual interference, Fonseca 2014; variation must stay relevant);
PYR §L3 (SSB, high-bar, block pulls, medium-grip bench as close variants); JRN (paused/front
squat, close-grip/pin bench, deficit or opposite-stance DL).

### 9.3 Weak-point toolkit

**Verdict:** target visible bottlenecks with the tool that matches the fault; don't pause
exactly at the visible sticking point.

**Evidence (PYR §L4; Helms coaching anecdotes flagged "not proof"; MASS-20 stub abstract):**

- Pauses: help control/position; pin/pause builds active force in the trained region (pin
  squats ↑1RM same as back squats, PYR §L6). Pausing _at the visible stall_ is logically
  flawed — the stall follows the force deficit; braking isn't the missing force.
- Isometrics at force deficits: plausible, but hard to locate without lab tools.
- Technique-punishing variants: front squat punishes squat-morning; deficit/paused DL at
  mid-shin for bar drift (Helms anecdotes).
- Accommodating resistance (bands/chains): no average benefit (2022 meta, ~500
  participants); possibly useful near lockout or for equipped lifters.
- Power/speed work: individually responsive — some responders, some not (Peltonen 2018 via
  MASS-19; sustained in MASS-22).
- Grip/recoverability targeting: heavy rack holds; sumo swap for recoverability (anecdotes).

### 9.4 Feasibility (PLATE) and exercise order

**Verdict:** choose exercises that are Pain-free (or at least not Painful), Loadable,
Available, Time-efficient, and Enjoyable; run multi-joint free-weight exercises first;
strength is slightly better when an exercise is performed first in a session.

**Evidence (PYR §L4; exercise-order meta 2021, 11 studies; hypertrophy indifferent).**

### 9.5 Technique philosophy and practice

**Verdict:** there is no universal "correct" form — meet your sport's standards, maximize
1RM, stay pain-free, and be _consistent_ (consistent tempo/ROM makes progress measurable).
Lift concentrically with maximal intent.

**Evidence:**

- PYR §L6 (technique summary; slow concentrics impair strength gains, Hermes & Fry 2023,
  625 participants; muscles ~40% stronger eccentrically).
- JRN (purposeful practice: pre-set visualization, one cue per set, post-set analysis, video
  review with per-lift camera heights).

_(Sticking-point mechanics: the corpus's "Sticking Points" video (MASS-20) survives only as
an abstract — mechanism claims beyond the above are Stub-tier.)_

---

## 10. Supporting levers

### 10.1 Hypertrophy: the long-term engine (not the goal)

**Verdict:** strength-specific volume is small, but muscle is the engine for long-term
force. Give accessories a real dose in volume phases; taper them through intensification;
near-zero at peak.

**Evidence:**

- Dose (PYR §L3 SPS; §L2): 10–20 sets/muscle/week, mostly 6–20 reps @ 0–3 RIR in volume
  phases; halve (5–10 sets) in the load phase; 0–4 sets in the peak.
- RIR ladder by exercise class (PYR §L2; §5.3 table).
- Selection (PYR §L2/L4): high stimulus-to-fatigue ratio — stable setup, full ROM, loads
  heavy enough that sets last ≥4–5 reps (>~30% 1RM); JRN's joint-protection rationale for
  accessory choice (6–15 reps, 4–6 sets/session, 40–70 reps/session, 2–3×/week).
- Scheduling (PYR §Guide): avoid heavy same-muscle secondary work the day before main-lift
  work; sequence example in §5.3.
- Rotation cadence (via the synthesis run): rotate accessory exercises **between mesocycles
  only** — hold selections constant within a mesocycle for technique momentum.
- Journal anchor: MASS-20 (Zourdos's explicit reason for periodized volume blocks over
  max-only training: muscle size explains ~70% of strength variance — hedged).

### 10.2 Rest periods

**Verdict:** rest until ready. Heavy compounds ≥2 min minimum, 3–5 min typical; accessories
1.5–2 min typical (≥90 s floor); near-failure sets need more. Time-saving techniques are
safe when they preserve total volume.

**Spec (PYR §L5):**

- Main strength lifts: rest until ready, ≥2 min minimum (Grgic 2018 review), often 3–5+;
  acceptable set-to-set drift ~1–2 reps/RIR (the diagnostic for too-short rest).
- Dose numbers (Grgic 2018 SR — 23 studies, 491 participants; synthesis run): short rests
  (<60 s) can still produce robust gains, but >2 min is required to maximize strength in
  trained individuals; 60–120 s suffices for untrained. Acute work (Rosa 2023): the largest
  rep-performance gap is 1 min vs 2–3 min; 2 vs 3 min is trivial.
- Hypertrophy: ≥90 s average; more for strong lifters and lower-body compounds.
- Antagonist- and peripheral-paired supersets preserve (sometimes beat) straight-set
  performance; ~+1 RPE cost; ~2 min between supersets; compound pairs need a 3–5-min cycle,
  isolation pairs 1–2 min; never pair lower-body compounds with other big lifts.
- Drop sets: −~20% load per drop; ~13 drop sets ≈ 10 straight sets (Sødal 2023); counting
  rule: 4 drop sets (incl. initial) = 3 straight sets; biggest time savings.
- Rest-pause: 20-s mini-rests, same load, until target total reps; similar adaptations when
  volume matched (Enes 2021 — most strength gain came from doing most reps at the heaviest
  load); impractical for heavy squats; more fatigue than straight sets.
- Longo 2022: rest structure matters only insofar as it changes total volume.

### 10.3 Lifting tempo

**Verdict:** lower the bar as fast as control allows; lift concentrically with maximal
intent; intentionally slow concentrics impair strength; pauses trade acute performance for
positional strength.

**Spec (PYR §L6):** eccentric under control but fast (strength context); hypertrophy
eccentric 1–4 s, total rep duration ≤8 s (poorer hypertrophy beyond 8 s: Schoenfeld 2015;
Moreno-Villanueva 2022); slow-eccentric 3–6 s makes light loads more stimulative when
pain/fatigue limits heavy work; pin/pause work builds active force in the sticking region;
supramaximal eccentrics not advised without specialist setup (Buskard 2018: small
non-significant edge, higher damage/injury risk); mind-muscle connection only for
light/isolation work.

### 10.4 Warm-up and PAPE

**Verdict:** skip mandatory static stretching; warm with ascending ramp sets; a PAPE set can
buy 1–2 extra working reps.

**Spec (PYR §Warming up):**

- Static stretching: no independent injury-prevention effect (2025 meta, 15 trials,
  > 9000 participants); pre-training static can blunt strength/power; brief (<60 s)
  > not-to-discomfort static is harmless; static-then-dynamic ordering preserves/increases
  > performance; foam rolling ~60 s modest help.
- Full-ROM lifting ≈ stretching for ROM gains (2023 meta, 55 studies) — warm-up sets with
  increasing ROM usually suffice.
- Template: optional 5-min general aerobic; 3–5-min dynamic drills (7–10 min if no general
  warm-up); ascending ramp (1–2-min rests): ≤6-rep working sets → 5–10 reps ≤40%, 3–5 @~60%,
  1–3 @~80%, 1 @90%; ≥6-rep sets → 5–10 @40%, 4–6 @60%, 2–4 @80%, 1–2 @85–90%. PYR notes the
  most consistent benefit comes from 1–2 warm-up sets at a moderate load (60–80% of the
  working weight).
- PAPE: 1–2 sets of 1–3 reps @ 85–90% 1RM, 5–15 min before working sets → ~+1–2 reps to
  failure (range 1–7 when present); daily prescribed singles double as PAPE.
- Machines need no warm-up beyond the first exercise for that muscle.

### 10.5 Adherence, missed workouts, injury

**Verdict:** the plan must be Realistic, Enjoyable, Flexible ("REF yourself"); missed
workouts are resumptions, not make-ups; treat pain as information, not damage.

**Spec (PYR §L1; JRN behavioral sections):**

- Missed workouts: resume where you left off; don't cram doubles into hard phases; 3
  consecutive training days produce gains similar to spaced sessions.
- Injury rates/1000 h: bodybuilding 0.24–1.0; powerlifting 1.0–4.4; weightlifting 2.4–3.3;
  CrossFit 3.1; strongman 4.5–6.1; Highland Games 7.5 (basketball 8.5–11.1).
- Red flags → professional: radiating pain, bruising, dizziness, nausea. Pain is an
  unreliable tissue-damage signal (imaging ≠ symptoms in low-back pain).
- Joint-pain workarounds: 12–20-rep sets; BFR limbs at 20–30% 1RM @ 0–3 RIR (~7/10 wrap).
- Adherence tactics (JRN): community accountability, enjoyment-first exercise selection,
  deliberate commitment devices.

### 10.6 Concurrent training and cardio

**Verdict:** moderate cardio does not meaningfully blunt strength gains; interference is a
niche concern managed by mode, dose, and timing.

**Spec:**

- Meta (Schumann 2021, via MASS-22; 43 studies, 1,090 subjects): max strength SMD −0.06
  (nil), hypertrophy −0.01 (nil), explosive strength −0.28 (real, small).
- Care needed only when: recovery is compromised (poor sleep, high stress, calorie
  deficit); endurance is already near your recovery limit; lifting volume is already at your
  limit; or the goal is explosive/power (then limit endurance).
- Timing: lift first when adjacent (MASS-21); cardio after lifting, or ≥3 h separation, or
  different days (PYR §L1); separation by ~24 h minimizes interference (MASS-22).
- Mode: cycling beats running (Wilson 2012 via MASS-21/22); steady-state cycling 30 min at
  50–60% VO2max 2×/wk shows no measurable negative (Dolan 2015); HIIT can attenuate gains
  and sprint damage lasts 48–72 h (Sabag 2018 + article); cycling sprints beat running
  sprints.
- Running 1–2×/week, a few miles, is fine if not immediately before lifting or ~24 h before
  a heavy lower-body day.
- Interference workarounds (MASS-21): 15-minute lifting micro-sessions spread through the
  week; only assistance work after cardio.
- Boundary claim: lower-body lifting volume drops ~25% when lifted 4 h after aerobic work,
  still impaired at 8 h (Sporer & Wenger 2003) — dose matters.

### 10.7 Work capacity and recovery environment (corpus-bounded)

**Verdict:** treat sleep, energy availability, and protein as gates on progress, not
optimization targets; the corpus states thresholds and moves on.

**Evidence:** PYR plateau gates (sleep ≥7 h; no energy deficit; protein ≥1.6 g/kg/day);
JRN work-capacity block (protein ~1.8 g/kg; aerobic-base via resting-HR heuristic; body-fat
guardrails as practitioner heuristics; cutting novices can still gain at ~1% BW/week
deficit). Nutrition detail is out of scope here (Appendix C).

### 10.8 Attentional focus and mind-muscle

**Verdict:** cue externally ("push the floor away") when strength is the goal; internal
focus can inhibit heavy-lift performance; mind-muscle connection is for light/isolation work
only.

**Evidence:** Grgic 2021 meta (via MASS-22): acute strength SMD 0.34 (external > internal,
p<0.001, 7 studies); longitudinal SMD 0.32 overall, 0.47 lower-body (3 studies — tentative).
PYR §L6: internal focus can inhibit heavy-lift strength; mind-muscle useful only for
light/isolation work.

---

## 11. Open questions, limits, and corpus-internal supersessions

### 11.1 Evidence-quality limits inherited from the corpus

- **Preprints/peer-review gaps:** the Pelland volume/frequency dose-response work (the PYR's
  headline volume numbers) was a preprint at PYR's writing and is now published (Pelland 2025,
  PMID 41343037 — treated at full MR tier here); Remmert 2025 (per-session cap) remains a
  preprint; Helms's RPE-vs-%1RM dissertation and the Cooke velocity ladder are
  non-peer-reviewed (dissertation/thesis).
- **Small-n / single-lab:** velocity-loss thresholds rest almost entirely on one lab's
  Smith-machine squat series (12/13 studies not volume-equated); responder typologies
  (Peltonen) are tiny-n; attentional-focus longitudinal base is 3 studies; Santanielo and
  Andersen are within-subject designs with n≈10–14; METD intervention numbers come from
  small quasi-randomized Bayesian arms (n=9–16) — exploratory, wide HDIs
  (Androulakis-Korakakis 2021).
- **Horizon:** no >16-week RCTs on frequency, periodization style, or progression models in
  genuinely advanced lifters; volume/frequency studies average ~10 weeks with ~40% untrained
  participants (PYR authors' caveat).
- **Cohort skew:** the ≥80% 1RM strength threshold (Lasevicius 2018; ACSM 2026) derives from
  trained, mostly male cohorts; beginners progress well at 60–75% (§2.1).
- **Expert-derived numbers:** taper −50–80% / deload −30–50% sets / ±20% volume moves /
  ~4%/rep correction are expert-derived, not trial-derived (PYR states this explicitly); RP's
  per-lift MEV/MRV landmarks and Delphi-derived deload guidance are likewise expert consensus,
  not trial-validated (§7.7, §8.3).

### 11.2 Stub-limited topics (no transcript in corpus)

- _Assistance Work in Periodization and Loading Options_ (MASS-18)
- _Program Troubleshooting_ (MASS-19)
- _All About Plus Sets_ (MASS-20) — abstract: "utility… oftentimes overused"
- _Sticking Points — What Do We Know?_ (MASS-20)

### 11.3 Contested claims (see Appendix A)

- Volume: monotone dose-response (Ralston) vs early plateau (Pelland) — reconciled as
  short-term ~5 sets/lift vs long-term 5–10/muscle, with authors' own hedges; Schoenfeld 2019
  (1/3/5 sets) corroborates the flat-strength/graded-hypertrophy split.
- Effort: anti-failure absolutism (MASS-19) → load-dependent nuance (MASS-21/22, PYR); the
  newest MAs add a small dynamic-strength edge for non-failure at non-equated volume
  (Grgic 2022; Wu 2026).
- Frequency: volume-equated null (Grgic) vs real-but-modest independent effect for strength
  (Nuckols MA; Pelland 2025, posterior 100%) — resolved as "distribution tool with modest
  strength effect."
- Hypertrophy as the mechanism of strength: size→strength correlations are strong
  cross-sectionally in trained/elite lifters but weak short-term (Loenneke 2019 open
  question) — treated as an open question (§1.2).
- Percent vs RPE prescribing: MASS-20 ships percent templates; PYR argues RPE/RIR —
  resolved as RPE/RIR interface with %1RM as scaffold/gauge.
- Deload timing: calendar-based (early MASS framing) vs reactive (PYR, Coleman 2024).

### 11.4 Superseded / informal items inside the corpus (tag, don't trust)

- JRN (~2015–16, informal citations): bulking to 20–22% BF before cutting; "very little work
  below 70%" for intermediates (fresher PYR corpus stance allows >30% 1RM supporting work);
  fiber-type force estimates; MPS-window figures. All carry Exp(informal)-tier provenance in
  Appendix C.
- CK/hormonal fatigue markers (MASS-19): weak proxies.
- Willoughby 1993 (MASS-20): illustrative classic, weak standalone support.

### 11.5 What the corpus is silent on

- Bar-velocity measurement (no consumer-grade input assumed anywhere); stress quantification
  beyond "roughly manages recovery"; women-specific loading (Santanielo's cohort is all
  male; Andersen's is 7 women/3 men); long-term periodization comparisons beyond 35-study
  meta-regression scope; per-exercise volume caps for isolation work beyond the PYR ladder;
  an "optimal" deload prescription — no data exists on deload magnitude (§8.3).

---

## Appendix A. Source divergences and resolutions

| Question                                           | Position A                                                                                                         | Position B                                                                                 | Resolution                                                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volume dose-response                               | Ralston 2017 (MASS-18): ≥5 sets/exercise/wk beats <5; monotone to 10                                               | Pelland 2025 MR (PYR, published): ~5 sets/lift/wk = short-term plateau                     | Floor ~3; 3–5 short-term; 5–10 fractional/muscle long-term; >10 = hypertrophy dose; Schoenfeld 2019 corroborates the flat-strength/graded-hypertrophy split. Both carry hedge caveats |
| Effort/proximity                                   | Train off failure (MASS-19; velocity-loss series)                                                                  | RIR ≈ negligible independent effect on strength; load drives (PYR/Robinson 2024)           | Load-dependent bands: 3–5 RIR accumulation, 0–2 RIR >85%/peak; failure selective; non-failure carries a small dynamic-strength edge at non-equated volume (Grgic 2022; Wu 2026)       |
| Per-lift frequency                                 | 2–4×/lift (JRN); repeated-bout gradual raising (MASS-18)                                                           | 2–6× fractional with 11-set session cap (PYR)                                              | 2–3+ sessions; distribute volume; comfort sets DL lower                                                                                                                               |
| Independent frequency effect                       | Grgic 2018: null when volume-equated (p=0.421)                                                                     | Nuckols MA / Pelland 2025: real, esp. pressing (+0.64%/wk at 3+/wk; posterior 100%)        | 2–3×/lift/week with distributed volume; extra sessions light and pressing-biased                                                                                                      |
| RIR cutoffs                                        | Robinson 2024: gains continue to ~0–3 RIR                                                                          | RP RIR ladder 4→1 across a meso                                                            | Default 1–3 RIR; 3–4 RIR for light sessions; exact cutoffs are model-derived                                                                                                          |
| RP per-lift MEV/MRV (2–4 / 8–14 sets per big lift) | Expert model                                                                                                       | —                                                                                          | Unverified against the paywalled strength book — soft ranges only, never hard-coded                                                                                                   |
| Prescribing interface                              | Percent-of-max templates with RPE bands (MASS-20)                                                                  | RPE/RIR primary; %1RM impractical as prescription (PYR)                                    | RPE/RIR ranges; %1RM gauge/scaffold only                                                                                                                                              |
| Periodization value                                | Periodized > non (Williams 2017; Zourdos DUP ordering; Nuckols ~25-study review: ~22% faster, DUP ~28% in trained) | Volume-equated effects small; variation+linearity are the drivers (Moesgaard 2022)         | Phase structure yes; feedback loop and practice timing > scheme magic                                                                                                                 |
| Deload policy                                      | Deload after fatiguing blocks/tests (MASS-19/20)                                                                   | Reactive 5-item check; no calendar deloads; >3-day rest drops strength (PYR, Coleman 2024) | Reactive default; deload = sets −30–50%, keep load/frequency                                                                                                                          |
| Velocity vs RPE                                    | VBT ~50% bigger gains (Dorrell 2019)                                                                               | Feedback confound; unreliable at 100% 1RM; RPE equivalent (sources' own hedges)            | RPE/RIR app-native; velocity optional refinement                                                                                                                                      |
| Flexibility                                        | Flexible templates aid adherence (Colquhoun 2017)                                                                  | Performance advantage ~nil (Walts 2021); flexibility ≠ fatigue fix                         | Fixed order + pre-built flex slot; flexibility only under high stress                                                                                                                 |

## Appendix B. Coverage matrix and exclusion register

Every corpus topic maps to a body section or is consciously excluded with a reason. The
external-literature family gets its own mapping table below (identities in Sources).

| Corpus topic                                                                                               | Source  | Body §                      |
| ---------------------------------------------------------------------------------------------------------- | ------- | --------------------------- |
| Volume → strength dose-response                                                                            | MASS-18 | §3.2, §3.3                  |
| Squat vs deadlift fatigue; DL frequency                                                                    | MASS-18 | §4.4                        |
| VBT reliability; velocity–RPE equivalents; readiness branching                                             | MASS-18 | §2.4, §8.7                  |
| Failure/non-failure recovery time-course; VJ heuristic                                                     | MASS-19 | §5.1, §5.3, §8.7            |
| RFD responder taxonomy; power formats                                                                      | MASS-19 | §1.4, §7.3                  |
| Program troubleshooting                                                                                    | MASS-19 | Stub (§11.2)                |
| VBT autoregulation RCT; velocity-stop critique                                                             | MASS-20 | §2.4, §6.4                  |
| Specificity; periodization; DUP template; daily-max template                                               | MASS-20 | §1.3, §7.1–§7.4             |
| RPE/RIR complete guide (scale, bands, stops, tracking, corrections)                                        | MASS-20 | §2.3, §5.3, §6.3–§6.5, §8.7 |
| Plus sets                                                                                                  | MASS-20 | Stub (§11.2)                |
| Sticking points                                                                                            | MASS-20 | Stub (§11.2)                |
| Proximity-to-failure reframing; weekly RIR stratification                                                  | MASS-21 | §5.2, §5.3                  |
| Interference trial; cardio mode/dose/timing                                                                | MASS-21 | §10.6                       |
| Flexible templates; readiness metric hierarchy                                                             | MASS-22 | §7.6, §8.7                  |
| Velocity-loss comprehensive review; peak-intensity principle                                               | MASS-22 | §5.2, §5.4                  |
| Attentional focus meta                                                                                     | MASS-22 | §10.8                       |
| Concurrent-training meta (43 studies)                                                                      | MASS-22 | §10.6                       |
| Strength framework (4 factors); phase limiters; novice protocol                                            | JRN     | §1.1, §1.5                  |
| Six lifting-difference factors; leverage/insertion analysis                                                | JRN     | §1.1                        |
| Intermediate/advanced implementation; PR cadence; peaking                                                  | JRN     | §1.5, §6.6, §7.5            |
| Recovery multipliers (sleep/stress); arousal model                                                         | JRN     | §8.1, §10.7                 |
| L1 Adherence (REF; missed workouts; injury; BFR)                                                           | PYR     | §10.5                       |
| L2 Volume (fractional; dose-response; practical table)                                                     | PYR     | §3.1–§3.4                   |
| L2 Intensity (specificity ladder; %1RM framing; RIR ladder)                                                | PYR     | §2.1–§2.3, §5.3             |
| L2 Frequency (dose; tables; skill retention)                                                               | PYR     | §4.1–§4.3                   |
| L3 Progression (status; fitness-fatigue; deloads; tapers; intro cycles; SPS; double progression; plateaus) | PYR     | §6–§8                       |
| L4 Exercise selection (transfer; 5-set ceiling; variations; PLATE; order)                                  | PYR     | §9.1–§9.4                   |
| L5 Rest periods (minimums; supersets; drop sets; rest-pause)                                               | PYR     | §10.2                       |
| L6 Lifting tempo (eccentric; intent; pauses; technique)                                                    | PYR     | §10.3, §9.5                 |
| Guide to program building (matrix; tiers; day-before rule)                                                 | PYR     | §7.5                        |

**External literature → body sections:**

| External source                                         | Body §                 |
| ------------------------------------------------------- | ---------------------- |
| Ralston 2017                                            | §3.2, Appendix A       |
| Pelland 2025                                            | §3.1, §3.2, §4.1       |
| Robinson 2024                                           | §2.1, §5.2             |
| Grgic 2018 (frequency)                                  | §4.1                   |
| Grgic 2018 (rest)                                       | §10.2                  |
| Grgic 2022; Wu 2026                                     | §5.1, §5.2, Appendix A |
| Lasevicius 2018                                         | §2.1                   |
| Schoenfeld 2019                                         | §3.2                   |
| Currier 2026 (ACSM Position Stand)                      | §0.1, §2.1, §7.1       |
| Androulakis-Korakakis 2020/2021 (METD)                  | §2.2, §6.6             |
| Zourdos 2016                                            | §2.3                   |
| Nuzzo 2024                                              | §2.3                   |
| Helms 2018; Graham & Cleather 2019/2021                 | §2.3, §6.2             |
| Halperin 2022                                           | §2.3                   |
| Rosa 2023                                               | §10.2                  |
| Moesgaard 2022                                          | §7.1                   |
| Mitchell 2012                                           | §1.3                   |
| Nuckols author-run MAs (frequency, load, periodization) | §2.1, §4.1, §7.1       |
| Latella 2020                                            | §3.2, §6.6             |
| Ahtiainen; Erskine; Baker                               | §1.2                   |
| Loenneke 2019                                           | §1.2, §11.3            |
| Renaissance Periodization                               | §7.7, §8.3, §10.1      |

**Exclusion register (deliberate omissions + why):**

- _App-encoding implications_ from the synthesis inputs — out of scope here by charter;
  specified separately against this document.
- _Slimani 2017 (mental training), Hurst 2019 (placebo), Scarpelli/Aube (individualized
  volume)_ — cited by archived synthesis drafts in this repo but not load-bearing for any
  rule in this document; revisit if needed.
- _Nutrition programming_ (protein distribution, glycogen, deficits beyond the plateau
  gates) — outside the strength scope; upstream filter removed most of it.
- _MASS video-transcript bodies_ — not retained in the corpus files (§11.2).
- _Lengthened partials / Wolf 2025_ — hypertrophy-exclusive; cut by the filter.
- _Women-specific programming_ (fatigue/blood-flow article) — removed by the filter as
  non-lifting; the corpus's remaining cohorts are mostly male (noted in §11.5).

## Appendix C. Source identities and filtering notes

1. **MASS-18** — _The Best of MASS 2017–2018_, Helms/Nuckols/Zourdos. Digest kept 3 full
   study-review articles + 1 video stub from a ~90-page book. Each article = Key Points →
   Purpose/Questions → Subjects/Methods → Findings → Interpretation → Application → Next
   Steps → References.
2. **MASS-19** — _The Best of MASS 2018–2019_. Two full articles + 1 stub; page gaps prove
   heavy filtering; figure/table data survives as text dumps; roundtable links reduced to
   placeholders.
3. **MASS-20** — _The Best of MASS 2019–2020_. Kept: velocity autoregulation, specificity/
   periodization, RPE/RIR complete guide, plus-sets + sticking-points stubs; dropped:
   processed food/overeating, FFMI potential, placebo, vitamin D, delayed hypertrophic
   supercompensation.
4. **MASS-21** — _The Best of MASS 2020–2021_. Only 2 of 10 pieces survived, both Zourdos:
   proximity-to-failure (Santanielo 2020), cardio interference (Kilen 2020). File omits the
   book's TOC and reviewer letter.
5. **MASS-22** — _The Best of MASS 2021–2022_. Four complete articles kept (flexible
   templates; proximity/velocity loss; attentional focus; concurrent training).
6. **JRN** — _The Journey_ (Nuckols, ~2015–2016). Strength-filtered extract; text ends at
   p.50 — trailing recovery/nutrition chapters absent; infographics survive as OCR text.
   Informal citations (no footnotes).
7. **PYR** — _The Muscle & Strength Pyramid: Training_, 3rd ed. v3.1.5 (Helms, Morgan,
   Valdez). All six levels + program-building guide + warm-up chapter + references kept;
   hypertrophy-exclusive subsections cut (page gaps at L2 pp. 40–42/59–63; L3 pp. 129–133;
   L4 pp. 160–174; Guide pp. 226–228/236–237/248–251). Newest sources 2024–2025 (some
   preprints) — the corpus's freshest and most programmatic source.
8. **External literature family** — the published studies and expert models compiled in
   `docs/source_docs_for_strength_science_master/synthesis/strength-science-synthesis.md` (four research-agent runs over Stronger by Science,
   the Muscle & Strength Pyramid 3rd ed., peer-reviewed literature via PubMed/Europe PMC,
   and Renaissance Periodization). Citation anchors live in the Sources section; the three
   most load-bearing PMIDs (Pelland 2025, Currier/ACSM 2026, Wu 2026) were spot-checked
   against PubMed on 2026-10-05.
