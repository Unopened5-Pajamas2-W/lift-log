/** Programs: list, create/edit (weeks → days → items with schemes),
 *  duplicate, archive, delete, activate. Mobile-only layout, 44pt targets.
 *  The editor mutates a local Program copy in place and re-renders; Save
 *  persists. Weeks are fully editable (label + §7.2 phase tag); the phase
 *  drives session-prefill transforms (intro −25% volume, deload −40% sets). */
import {
  deleteProgram,
  getProgram,
  listExercises,
  listPrograms,
  listWorkouts,
  loadSettings,
  saveProgram,
  saveSettings,
  uuid,
} from "../lib/store.ts";
import {
  describePrescription,
  duplicateProgram,
  fractionalVolume,
  nextProgramSession,
  programChecks,
  resolveProgramItem,
} from "../lib/programs.ts";
import type { ExpandContext } from "../lib/programs.ts";
import type {
  Program,
  ProgramItem,
  Units,
} from "../lib/types.ts";
import { displayWeight, toKg } from "../lib/units.ts";
import { go, h, toast } from "../lib/ui.ts";

/** Weeks × days summary, e.g. "4 weeks × 3 days". */
function programSummary(p: Program): string {
  const days = p.weeks[0]?.days.length ?? 0;
  return `${p.weeks.length} week${p.weeks.length === 1 ? "" : "s"} × ${days} day${days === 1 ? "" : "s"}`;
}

/** --- List view --- */
export async function renderPrograms(): Promise<HTMLElement> {
  const root = h("div", {});
  root.appendChild(
    h(
      "p",
      { class: "muted" },
      "Multi-week routines that schedule your sessions.",
    ),
  );
  const settings = await loadSettings();
  const activeId = settings.activeProgramId;
  const [programs, done] = await Promise.all([
    listPrograms(true),
    listWorkouts("completed", 1000),
  ]);
  const programWorkouts = done.filter((w) =>
    programs.some((p) => p.id === w.programId),
  );

  root.appendChild(
    h(
      "div",
      { class: "row" },
      h(
        "button",
        { class: "primary grow", onclick: () => go("/programs/new") },
        "+ New program",
      ),
    ),
  );
  if (programs.length === 0) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "No programs yet"),
        h(
          "p",
          { class: "muted" },
          "Create one (try PPL ×3) or activate the seeded Strength Base example to see scheduled sessions on Today.",
        ),
      ),
    );
  }
  // Active program first, then the rest alphabetically.
  const sorted = [
    ...programs.filter((p) => p.id === activeId),
    ...programs.filter((p) => p.id !== activeId),
  ];
  for (const p of sorted) {
    const isActive = p.id === activeId;
    const slot =
      isActive && (p.weeks[0]?.days.length ?? 0) > 0
        ? nextProgramSession(p, programWorkouts)
        : null;
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row" },
          h("strong", { class: "grow" }, p.name),
          isActive ? h("span", { class: "badge" }, "Active") : null,
        ),
        p.description
          ? h("p", { class: "muted" }, p.description)
          : h("p", { class: "muted" }, programSummary(p)),
        p.isArchived ? h("p", { class: "muted" }, "Archived") : null,
        slot
          ? h(
              "p",
              { class: "muted" },
              slot.cycleComplete
                ? `Cycle ${slot.cycleCount + 1} begins — Week 1 Day 1`
                : `Next: Week ${slot.weekIndex + 1} · Day ${slot.dayIndex + 1}${slot.cycleCount > 0 ? ` · Cycle ${slot.cycleCount + 1}` : ""}`,
            )
          : null,
        h(
          "div",
          { class: "row" },
          isActive
            ? h(
                "button",
                {
                  onclick: async () => {
                    try {
                      await saveSettings({ activeProgramId: undefined });
                      go("/programs");
                    } catch (err) {
                      console.error(err);
                      toast("Couldn't deactivate — storage unavailable. Retry.");
                    }
                  },
                },
                "Deactivate",
              )
            : h(
                "button",
                {
                  class: "primary",
                  onclick: async () => {
                    try {
                      await saveSettings({ activeProgramId: p.id });
                      go("/programs");
                    } catch (err) {
                      console.error(err);
                      toast("Couldn't activate — storage unavailable. Retry.");
                    }
                  },
                },
                "Activate",
              ),
          h("button", { onclick: () => go(`/programs/${p.id}`) }, "Edit"),
          h(
            "button",
            {
              onclick: async (e) => {
                const btn = e.currentTarget as HTMLButtonElement | null;
                btn?.setAttribute("disabled", "true");
                try {
                  const copy = duplicateProgram(p, uuid());
                  await saveProgram(copy);
                  go(`/programs/${copy.id}`);
                } catch (err) {
                  console.error(err);
                  btn?.removeAttribute("disabled");
                  toast("Couldn't duplicate — storage unavailable. Retry.");
                }
              },
            },
            "Duplicate",
          ),
          h(
            "button",
            {
              onclick: async () => {
                try {
                  await saveProgram({
                    ...p,
                    isArchived: !p.isArchived,
                    updatedAt: Date.now(),
                  });
                  go("/programs");
                } catch (err) {
                  console.error(err);
                  toast("Couldn't archive — storage unavailable. Retry.");
                }
              },
            },
            p.isArchived ? "Unarchive" : "Archive",
          ),
          h(
            "button",
            {
              class: "danger",
              onclick: async () => {
                if (
                  !window.confirm(
                    `Delete program "${p.name}"? Workouts already logged keep their history.`,
                  )
                )
                  return;
                try {
                  await deleteProgram(p.id);
                  go("/programs");
                } catch (err) {
                  console.error(err);
                  toast("Couldn't delete — storage unavailable. Retry.");
                }
              },
            },
            "Delete",
          ),
        ),
      ),
    );
  }
  return root;
}

/** Canonical kg ↔ display input helper (fixed weights + training maxes). */
function kgInput(
  label: string,
  kg: number | undefined,
  units: Units,
  onInput: (kg: number | undefined) => void,
): HTMLInputElement {
  const input = h("input", {
    type: "number",
    inputmode: "decimal",
    step: "any",
    min: "0",
    "aria-label": label,
    value: kg != null ? String(displayWeight(kg, units)) : "",
  }) as HTMLInputElement;
  input.addEventListener("input", () => {
    const raw = input.value.trim();
    onInput(raw === "" ? undefined : toKg(Number(raw), units));
  });
  return input;
}

function numInput(
  label: string,
  value: number,
  onInput: (n: number) => void,
): HTMLInputElement {
  const input = h("input", {
    type: "number",
    inputmode: "numeric",
    min: "1",
    "aria-label": label,
    value: String(value),
  }) as HTMLInputElement;
  input.addEventListener("input", () => {
    const n = Number(input.value);
    if (Number.isFinite(n) && n >= 1) onInput(Math.round(n));
  });
  return input;
}

/** RPE input (0.5 steps, meaningful range 5–10; blank = none). */
function rpeInput(
  label: string,
  value: number | undefined,
  onInput: (v: number | undefined) => void,
): HTMLInputElement {
  const input = h("input", {
    type: "number",
    inputmode: "decimal",
    step: "0.5",
    min: "5",
    max: "10",
    "aria-label": label,
    value: value != null ? String(value) : "",
  }) as HTMLInputElement;
  input.addEventListener("input", () => {
    const raw = input.value.trim();
    if (raw === "") {
      onInput(undefined);
      return;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 5 && n <= 10) onInput(n);
  });
  return input;
}

/** Scheme editor for one item: segmented kind picker + per-kind fields.
 *  Prescriptions are RPE/RIR bands (doc §2.3); %1RM loads are a starting
 *  gauge that self-corrects on logged RPE, never a rigid target. */
function schemeEditor(
  item: ProgramItem,
  units: Units,
  rerender: () => void,
): HTMLElement {
  const kind = item.scheme?.kind ?? "none";
  const wrap = h("div", { class: "scheme-editor" });
  const seg = h(
    "div",
    { class: "segmented", role: "group", "aria-label": "Scheme type" },
  );
  for (const opt of [
    { v: "none", label: "Auto" },
    { v: "sets-reps", label: "Sets×Reps" },
    { v: "percent", label: "% gauge" },
    { v: "double", label: "Reps band" },
  ]) {
    seg.appendChild(
      h(
        "button",
        {
          type: "button",
          "aria-pressed": String(kind === opt.v),
          onclick: (e) => {
            for (const b of seg.querySelectorAll("button"))
              b.setAttribute("aria-pressed", String(b === e.currentTarget));
            if (opt.v === "none") {
              delete item.scheme;
              delete item.trainingMaxKg;
            } else if (opt.v === "sets-reps") {
              item.scheme = { kind: "sets-reps", sets: 3, reps: 8 };
            } else if (opt.v === "percent") {
              item.scheme = {
                kind: "percent",
                sets: [{ pct: 0.8, reps: 5 }],
                rpe: { min: 6, max: 8 },
              };
              item.trainingMaxKg = item.trainingMaxKg ?? 100;
            } else {
              item.scheme = {
                kind: "double",
                sets: 3,
                minReps: 8,
                maxReps: 12,
                rpeCeiling: 8,
              };
            }
            rerender();
          },
        },
        opt.label,
      ),
    );
  }
  wrap.appendChild(seg);
  const s = item.scheme;
  if (!s) {
    wrap.appendChild(
      h("p", { class: "muted" }, "Auto: app suggests weight and reps."),
    );
    return wrap;
  }
  if (s.kind === "sets-reps") {
    const fixed = kgInput(
      "Fixed weight (blank = suggested)",
      s.weightKg,
      units,
      (kg) => {
        if (item.scheme?.kind === "sets-reps") item.scheme.weightKg = kg;
      },
    );
    const fixedWrap = h("label", {}, "Weight (blank = suggested)", fixed);
    const setsRepsScheme = s;
    wrap.append(
      h(
        "div",
        { class: "row" },
        h("label", {}, "Sets", numInput("Sets", setsRepsScheme.sets, (n) => {
          if (item.scheme?.kind === "sets-reps") item.scheme.sets = n;
        })),
        h("label", {}, "Reps", numInput("Reps per set", setsRepsScheme.reps, (n) => {
          if (item.scheme?.kind === "sets-reps") item.scheme.reps = n;
        })),
      ),
      fixedWrap,
      h(
        "label",
        {},
        "Target RPE (optional)",
        rpeInput("Target RPE", setsRepsScheme.rpe, (v) => {
          if (item.scheme?.kind !== "sets-reps") return;
          if (v === undefined) delete setsRepsScheme.rpe;
          else setsRepsScheme.rpe = v;
        }),
      ),
    );
  } else if (s.kind === "percent") {
    const tm = kgInput("Training max (kg)", item.trainingMaxKg, units, (kg) => {
      item.trainingMaxKg = kg;
    });
    wrap.append(h("label", {}, "Training max", tm));
    // Anchor picker: static training max, or the running e1RM (§7.2 back-offs).
    const ofSeg = h(
      "div",
      { class: "segmented", role: "group", "aria-label": "Percent anchor" },
    );
    const of = s.of ?? "tm";
    for (const opt of [
      { v: "tm", label: "of training max" },
      { v: "e1rm", label: "of e1RM" },
    ]) {
      ofSeg.appendChild(
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String(of === opt.v),
            onclick: (e) => {
              for (const b of ofSeg.querySelectorAll("button"))
                b.setAttribute("aria-pressed", String(b === e.currentTarget));
              if (item.scheme?.kind === "percent") item.scheme.of = opt.v as "tm" | "e1rm";
            },
          },
          opt.label,
        ),
      );
    }
    wrap.appendChild(ofSeg);
    const listEl = h("div", {});
    const pctScheme = s;
    const renderSets = (): void => {
      listEl.replaceChildren();
      if (item.scheme?.kind !== "percent") return;
      pctScheme.sets.forEach((ps, i) => {
        const setRef = pctScheme.sets[i];
        if (!setRef) return;
        const pctInput = h("input", {
          type: "number",
          inputmode: "decimal",
          step: "any",
          min: "0",
          max: "1",
          "aria-label": `Set ${i + 1} percent`,
          value: String(ps.pct),
        }) as HTMLInputElement;
        pctInput.addEventListener("input", () => {
          if (item.scheme?.kind !== "percent") return;
          const n = Number(pctInput.value);
          if (Number.isFinite(n) && n >= 0 && n <= 1) setRef.pct = n;
        });
        const repsIn = numInput(`Set ${i + 1} reps`, ps.reps, (n) => {
          if (item.scheme?.kind !== "percent") return;
          setRef.reps = n;
        });
        listEl.appendChild(
          h(
            "div",
            { class: "row" },
            h("label", {}, `% (0–1)`, pctInput),
            h("label", {}, "Reps", repsIn),
            h(
              "button",
              {
                "aria-label": `Remove set ${i + 1}`,
                onclick: () => {
                  if (item.scheme?.kind !== "percent") return;
                  item.scheme.sets.splice(i, 1);
                  rerender();
                },
              },
              "−",
            ),
          ),
        );
      });
    };
    renderSets();
    const rpeMin = rpeInput("RPE band min", s.rpe?.min, (v) => {
      if (item.scheme?.kind !== "percent") return;
      if (v === undefined) {
        delete item.scheme.rpe;
        rerender();
        return;
      }
      item.scheme.rpe = { min: v, max: item.scheme.rpe?.max ?? v };
    });
    const rpeMax = rpeInput("RPE band max", s.rpe?.max, (v) => {
      if (item.scheme?.kind !== "percent") return;
      if (v === undefined) {
        delete item.scheme.rpe;
        rerender();
        return;
      }
      item.scheme.rpe = { min: item.scheme.rpe?.min ?? v, max: v };
    });
    wrap.append(
      listEl,
      h(
        "button",
        {
          onclick: () => {
            if (item.scheme?.kind !== "percent") return;
            const last = item.scheme.sets[item.scheme.sets.length - 1];
            item.scheme.sets.push({ pct: last?.pct ?? 0.65, reps: last?.reps ?? 5 });
            rerender();
          },
        },
        "+ Add prescribed set",
      ),
      h(
        "div",
        { class: "row" },
        h("label", {}, "RPE band min", rpeMin),
        h("label", {}, "RPE band max", rpeMax),
      ),
      h(
        "p",
        { class: "muted" },
        "The band is the prescription; % weights are a starting gauge that self-corrects ~2% per 0.5 RPE off-target.",
      ),
    );
  } else {
    wrap.append(
      h(
        "div",
        { class: "row" },
        h("label", {}, "Sets", numInput("Sets", s.sets, (n) => {
          if (item.scheme?.kind === "double") item.scheme.sets = n;
        })),
        h("label", {}, "Min reps", numInput("Min reps", s.minReps, (n) => {
          if (item.scheme?.kind === "double") item.scheme.minReps = n;
        })),
        h("label", {}, "Max reps", numInput("Max reps", s.maxReps, (n) => {
          if (item.scheme?.kind === "double") item.scheme.maxReps = n;
        })),
      ),
      h(
        "label",
        {},
        "Advance RPE ceiling",
        rpeInput("Advance RPE ceiling", s.rpeCeiling ?? 8, (v) => {
          if (item.scheme?.kind !== "double") return;
          if (v === undefined) delete item.scheme.rpeCeiling;
          else item.scheme.rpeCeiling = v;
        }),
      ),
      h(
        "p",
        { class: "muted" },
        "First set hits max reps within the ceiling → +weight; misses correct ~4%/rep; grinding at ≤1 RIR steps back.",
      ),
    );
  }
  return wrap;
}

/** --- Editor view (new or existing) --- */
export async function renderProgramEditor(
  id?: string,
): Promise<HTMLElement> {
  const root = h("div", {});
  const isNew = !id || id === "new";
  const program: Program = isNew
    ? {
        id: uuid(),
        name: "",
        weeks: [{ label: "Week 1", days: [{ name: "Day 1", items: [] }] }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    : ((await getProgram(id)) ?? {
        id: uuid(),
        name: "Missing program",
        weeks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
  const settings = await loadSettings();
  const units = settings.units;
  const exercises = await listExercises(true);
  const exById = new Map(exercises.map((e) => [e.id, e]));

  root.appendChild(
    h(
      "div",
      { class: "row" },
      h("button", { onclick: () => go("/programs") }, "‹ Programs"),
    ),
  );

  const nameInput = h("input", {
    type: "text",
    "aria-label": "Program name",
    placeholder: "Program name",
    value: program.name,
  }) as HTMLInputElement;
  nameInput.addEventListener("input", () => {
    program.name = nameInput.value;
  });
  const descInput = h("input", {
    type: "text",
    "aria-label": "Program description",
    placeholder: "Description (optional)",
    value: program.description ?? "",
  }) as HTMLInputElement;
  descInput.addEventListener("input", () => {
    if (descInput.value === "") delete program.description;
    else program.description = descInput.value;
  });
  root.append(h("div", { class: "card" }, nameInput, descInput));

  function save(): void {
    void (async () => {
      if (program.name.trim() === "") {
        toast("Give the program a name first.");
        return;
      }
      try {
        program.updatedAt = Date.now();
        await saveProgram(program);
        toast("Program saved.");
        go("/programs");
      } catch (err) {
        console.error(err);
        toast("Couldn't save — storage unavailable. Retry.");
      }
    })();
  }

  // Weeks are first-class: tab row, per-week label + §7.2 phase picker, and
  // per-week day tabs. The phase drives session-prefill transforms.
  const weekTabRow = h("div", { class: "row" });
  const weekHead = h("div", {});
  const dayTabRow = h("div", { class: "row" });
  const itemsHost = h("div", {});
  const footerHost = h("div", {});
  let currentWeekIdx = 0;
  let currentDayIdx = 0;

  const PHASES: { v: "intro" | "volume" | "load" | "peak" | "deload"; label: string }[] = [
    { v: "intro", label: "Intro" },
    { v: "volume", label: "Volume" },
    { v: "load", label: "Load" },
    { v: "peak", label: "Peak" },
    { v: "deload", label: "Deload" },
  ];

  function renderItems(): void {
    const week = program.weeks[currentWeekIdx];
    if (!week) return;
    const day = week.days[currentDayIdx];
    if (!day) return;
    itemsHost.replaceChildren();
    // Plan-level resolved preview (no engine context — engine-dependent
    // prescriptions resolve in sessions).
    const previewCtx: ExpandContext = {
      units,
      exerciseById: exById,
      phase: week.phase,
    };
    day.items.forEach((item, i) => {
      const ex = exById.get(item.exerciseId);
      const resolved = resolveProgramItem(item, previewCtx);
      const preview =
        ex && resolved && describePrescription(resolved, units);
      const row = h(
        "div",
        { class: "card program-item" },
        h(
          "div",
          { class: "row" },
          h("strong", { class: "grow" }, ex?.name ?? "Missing exercise"),
          h(
            "button",
            {
              "aria-label": `Remove exercise ${i + 1}`,
              onclick: () => {
                day.items.splice(i, 1);
                rerender();
              },
            },
            "−",
          ),
        ),
        preview ? h("p", { class: "muted" }, preview) : null,
        ex
          ? null
          : h(
              "p",
              { class: "muted" },
              "Exercise missing from the library — remove it, or keep it (missing items are skippable in sessions).",
            ),
      );
      row.appendChild(schemeEditor(item, units, rerender));
      itemsHost.appendChild(row);
    });
    const sel = h("select", {
      "aria-label": `Add exercise to ${day.name || "day"}`,
    }) as HTMLSelectElement;
    for (const e of exercises) {
      if (e.isArchived) continue;
      const o = document.createElement("option");
      o.value = e.id;
      o.textContent = `${e.name} (${e.equipment})`;
      sel.appendChild(o);
    }
    itemsHost.appendChild(
      h(
        "div",
        { class: "row" },
        sel,
        h(
          "button",
          {
            onclick: () => {
              if (!sel.value) return;
              day.items.push({ exerciseId: sel.value });
              rerender();
            },
          },
          "+ Add exercise",
        ),
      ),
    );
  }

  /** Per-week dose meter (§3.1 fractional counting) + soft guardrails. */
  function renderFooter(): void {
    footerHost.replaceChildren();
    const rows = [...fractionalVolume(program, currentWeekIdx, exById).values()]
      .filter((r) => r.fractional > 0)
      .sort((a, b) => b.fractional - a.fractional);
    if (rows.length > 0) {
      const meter = h(
        "p",
        { class: "muted" },
        "Weekly fractional sets (1.0 primary / 0.5 secondary, ≥4-rep sets):",
      );
      const ul = h("ul", {});
      for (const r of rows) {
        const dose =
          r.fractional > 10
            ? "hypertrophy dose — strength plateaus ~5 sets/lift (doc §3.3)"
            : "strength band (doc §3.3)";
        ul.appendChild(
          h(
            "li",
            {},
            `${r.muscle}: ${Number(r.fractional.toFixed(1))} (${dose}); heaviest session ${Number(r.perSessionMax.toFixed(1))}; ${r.exposures}×/week`,
          ),
        );
      }
      footerHost.append(h("strong", {}, "Dose (this week)"), meter, ul);
    }
    const checks = programChecks(program, exById);
    if (checks.length > 0) {
      const ul = h("ul", {});
      for (const c of checks)
        ul.appendChild(h("li", { class: c.level === "warn" ? "warn" : "muted" }, c.message));
      footerHost.append(h("strong", {}, "Guardrails"), ul);
    }
  }

  function renderWeekHead(): void {
    const week = program.weeks[currentWeekIdx];
    if (!week) return;
    const labelInput = h("input", {
      type: "text",
      "aria-label": "Week label",
      placeholder: "Week label",
      value: week.label,
    }) as HTMLInputElement;
    labelInput.addEventListener("input", () => {
      week.label = labelInput.value;
    });
    const phaseSeg = h(
      "div",
      { class: "segmented", role: "group", "aria-label": "Phase" },
    );
    for (const p of PHASES) {
      phaseSeg.appendChild(
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String((week.phase ?? "volume") === p.v),
            onclick: (e) => {
              if (!program.weeks[currentWeekIdx]) return;
              program.weeks[currentWeekIdx]!.phase = p.v;
              for (const b of phaseSeg.querySelectorAll("button"))
                b.setAttribute("aria-pressed", String(b === e.currentTarget));
              renderItems();
              renderFooter();
            },
          },
          p.label,
        ),
      );
    }
    weekHead.replaceChildren(
      h("label", {}, "Week label", labelInput),
      h("p", { class: "muted" }, "Phase — intro weeks run ~75% volume; deload weeks cut sets ~40% (loads and RPE stay)."),
      phaseSeg,
    );
  }

  function rerender(): void {
    currentWeekIdx = Math.max(0, Math.min(currentWeekIdx, program.weeks.length - 1));
    const week = program.weeks[currentWeekIdx];
    if (!week) return;
    currentDayIdx = Math.min(currentDayIdx, week.days.length - 1);
    weekTabRow.replaceChildren();
    program.weeks.forEach((w, wi) => {
      weekTabRow.appendChild(
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String(wi === currentWeekIdx),
            onclick: () => {
              currentWeekIdx = wi;
              currentDayIdx = 0;
              rerender();
            },
          },
          w.label || `Week ${wi + 1}`,
        ),
      );
    });
    dayTabRow.replaceChildren();
    week.days.forEach((d, di) => {
      dayTabRow.appendChild(
        h(
          "button",
          {
            type: "button",
            "aria-pressed": String(di === currentDayIdx),
            onclick: () => {
              currentDayIdx = di;
              rerender();
            },
          },
          d.name || `Day ${di + 1}`,
        ),
      );
    });
    renderWeekHead();
    renderItems();
    renderFooter();
  }

  if (program.weeks[0]) {
    root.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Weeks"),
        weekTabRow,
        weekHead,
        dayTabRow,
        itemsHost,
        h(
          "div",
          { class: "row" },
          h(
            "button",
            {
              onclick: () => {
                const week = program.weeks[currentWeekIdx];
                if (!week) return;
                const copy = structuredClone(week);
                copy.label = `${week.label || "Week"} copy`;
                program.weeks.splice(currentWeekIdx + 1, 0, copy);
                currentWeekIdx += 1;
                rerender();
              },
            },
            "+ Duplicate week",
          ),
          h(
            "button",
            {
              onclick: () => {
                if (program.weeks.length <= 1) {
                  toast("A program needs at least one week.");
                  return;
                }
                program.weeks.splice(currentWeekIdx, 1);
                currentWeekIdx = Math.max(0, currentWeekIdx - 1);
                rerender();
              },
            },
            "− Remove this week",
          ),
        ),
        h(
          "div",
          { class: "row" },
          h(
            "button",
            {
              onclick: () => {
                const week = program.weeks[currentWeekIdx];
                if (!week) return;
                week.days.push({
                  name: `Day ${week.days.length + 1}`,
                  items: [],
                });
                currentDayIdx = week.days.length - 1;
                rerender();
              },
            },
            "+ Add day",
          ),
          h(
            "button",
            {
              onclick: () => {
                const week = program.weeks[currentWeekIdx];
                if (!week) return;
                if (week.days.length <= 1) {
                  toast("A program needs at least one day.");
                  return;
                }
                week.days.pop();
                rerender();
              },
            },
            "− Remove last day",
          ),
        ),
        footerHost,
      ),
    );
    rerender();
  } else {
    root.appendChild(
      h("div", { class: "card" }, h("p", {}, "This program has no weeks.")),
    );
  }

  root.appendChild(
    h(
      "div",
      { class: "sticky-actions" },
      h(
        "button",
        { class: "primary grow", onclick: () => save() },
        isNew ? "Create program" : "Save changes",
      ),
    ),
  );
  return root;
}
