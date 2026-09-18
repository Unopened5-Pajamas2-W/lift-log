/** Settings: units, equipment, rest default, backup. */
import { ALL_EQUIPMENT } from "../data/muscles.ts";
import {
  exportJson,
  importJson,
  parseBackup,
  serializeBackup,
  setsToCsv,
  shareOrDownload,
} from "../lib/backup.ts";
import type { RestoreResult } from "../lib/backup.ts";
import {
  allCompletedSets,
  getExercise,
  getWorkout,
  listWorkouts,
  loadSettings,
  saveSettings,
} from "../lib/store.ts";
import { sessionVolume } from "../lib/metrics.ts";
import { displayWeight } from "../lib/units.ts";
import { barInputToKg } from "../lib/plates.ts";
import { fmtDate, go, h, toast } from "../lib/ui.ts";

export async function renderSettings(): Promise<HTMLElement> {
  const root = h("div", {});
  let settings = await loadSettings();

  // Units
  const unitsSel = h("select", { "aria-label": "Units" }) as HTMLSelectElement;
  for (const u of ["lb", "kg"] as const) {
    const o = document.createElement("option");
    o.value = u;
    o.textContent = u === "lb" ? "Pounds (lb)" : "Kilograms (kg)";
    if (settings.units === u) o.selected = true;
    unitsSel.appendChild(o);
  }
  unitsSel.addEventListener("change", async () => {
    try {
      settings = await saveSettings({ units: unitsSel.value as "lb" | "kg" });
      toast(`Units: ${settings.units}`);
    } catch (err) {
      console.error(err);
      toast("Couldn't save — storage unavailable. Retry.");
    }
  });

  // Rest default
  const restInput = h("input", {
    type: "number",
    min: "15",
    max: "600",
    step: "15",
    value: String(settings.restSeconds),
    "aria-label": "Default rest seconds",
  }) as HTMLInputElement;
  restInput.addEventListener("change", async () => {
    const v = Number(restInput.value);
    if (Number.isFinite(v) && v >= 15 && v <= 600) {
      try {
        settings = await saveSettings({ restSeconds: v });
        toast("Rest default saved");
      } catch (err) {
        console.error(err);
        toast("Couldn't save — storage unavailable. Retry.");
      }
    }
  });

  // Bar weight for the plate calculator (stored canonical kg, shown in units)
  const barInput = h("input", {
    type: "number",
    min: "10",
    max: "65",
    step: settings.units === "lb" ? "5" : "2.5",
    value: String(displayWeight(settings.barWeightKg, settings.units)),
    "aria-label": `Bar weight in ${settings.units}`,
  }) as HTMLInputElement;
  barInput.addEventListener("change", async () => {
    const v = Number(barInput.value);
    const kg = Number.isFinite(v) ? barInputToKg(v, settings.units) : NaN;
    if (Number.isFinite(kg) && kg >= 5 && kg <= 30) {
      try {
        settings = await saveSettings({ barWeightKg: kg });
        toast("Bar weight saved");
      } catch (err) {
        console.error(err);
        toast("Couldn't save — storage unavailable. Retry.");
      }
    } else {
      barInput.value = String(
        displayWeight(settings.barWeightKg, settings.units),
      );
    }
  });

  // Equipment multi-select (checkboxes, 44pt targets)
  const equipBox = h("div", {});
  for (const e of ALL_EQUIPMENT) {
    const cb = h("input", {
      type: "checkbox",
      checked: settings.equipment.includes(e) ? true : undefined,
      "aria-label": `Own ${e}`,
    }) as HTMLInputElement;
    cb.addEventListener("change", async () => {
      const next = cb.checked
        ? [...settings.equipment, e]
        : settings.equipment.filter((x) => x !== e);
      try {
        settings = await saveSettings({ equipment: next });
      } catch (err) {
        console.error(err);
        toast("Couldn't save — storage unavailable. Retry.");
      }
    });
    equipBox.appendChild(h("label", { class: "row" }, cb, e));
  }

  root.append(
    h(
      "div",
      { class: "card" },
      h("strong", {}, "Preferences"),
      h("label", {}, "Units (stored as kg, displayed converted)", unitsSel),
      h("label", {}, "Default rest (seconds)", restInput),
      h("label", {}, "Bar weight (for plate math)", barInput),
    ),
    h(
      "div",
      { class: "card" },
      h("strong", {}, "My equipment"),
      h(
        "p",
        { class: "muted" },
        "Suggestions only use checked equipment + bodyweight.",
      ),
      equipBox,
    ),
  );

  // Backup
  const backupCard = h(
    "div",
    { class: "card" },
    h("strong", {}, "Backup (no cloud — files only)"),
  );
  backupCard.appendChild(
    h(
      "div",
      { class: "row" },
      h(
        "button",
        {
          class: "primary",
          onclick: async () => {
            try {
              const b = await exportJson();
              await shareOrDownload(
                `lift-log-backup-${new Date().toISOString().slice(0, 10)}.json`,
                serializeBackup(b),
                "application/json",
              );
              toast("Backup exported");
            } catch (err) {
              console.error(err);
              toast("Export failed — storage unavailable. Retry.");
            }
          },
        },
        "Export JSON",
      ),
      h(
        "button",
        {
          onclick: async () => {
            try {
              const sets = await allCompletedSets();
              const rows: {
                date: string;
                workout: string;
                exercise: string;
                setNumber: number;
                weightKg: number;
                reps: number;
                rpe?: number;
                volume: number;
                completed: boolean;
                isWarmup?: boolean;
              }[] = [];
              const byWorkout = new Map<string, typeof sets>();
              for (const s of sets) {
                if (!byWorkout.has(s.workoutId)) byWorkout.set(s.workoutId, []);
                byWorkout.get(s.workoutId)?.push(s);
              }
              for (const [wid, list] of byWorkout) {
                const w = await getWorkout(wid);
                list.sort((a, b) => a.order - b.order);
                let n = 0;
                for (const s of list) {
                  const ex = await getExercise(s.exerciseId);
                  rows.push({
                    date: new Date(s.createdAt).toISOString(),
                    workout: w?.title ?? wid,
                    exercise: ex?.name ?? s.exerciseId,
                    setNumber: ++n,
                    weightKg: s.weightKg,
                    reps: s.reps,
                    rpe: s.rpe,
                    volume: sessionVolume([s]),
                    completed: s.completed,
                    isWarmup: s.isWarmup,
                  });
                }
              }
              await shareOrDownload(
                `lift-log-sets-${new Date().toISOString().slice(0, 10)}.csv`,
                setsToCsv(rows),
                "text/csv",
              );
              toast("CSV exported");
            } catch (err) {
              console.error(err);
              toast("Export failed — storage unavailable. Retry.");
            }
          },
        },
        "Export CSV",
      ),
    ),
  );
  const fileInput = h("input", {
    type: "file",
    accept: "application/json,.json",
    "aria-label": "Import backup JSON file",
  }) as HTMLInputElement;
  const importPreview = h("div", {});
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const { counts } = parseBackup(text);
      const summary = Object.entries(counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const resultBox = h("div", {});
      importPreview.replaceChildren(
        h(
          "p",
          {},
          `Backup file contains — ${summary}. Import merges by ID (newer rows win).`,
        ),
        h(
          "button",
          {
            class: "primary",
            onclick: async (e) => {
              const btn = e.currentTarget as HTMLButtonElement | null;
              btn?.setAttribute("disabled", "true");
              try {
                const result: RestoreResult = await importJson(text);
                const lines: string[] = [];
                let inserted = 0;
                let updated = 0;
                let skipped = 0;
                let invalid = 0;
                for (const [store, c] of Object.entries(result)) {
                  if (Array.isArray(c)) continue; // unknownStores, handled below
                  inserted += c.inserted;
                  updated += c.updated;
                  skipped += c.skipped;
                  invalid += c.invalid;
                  if (c.inserted + c.updated + c.skipped + c.invalid > 0)
                    lines.push(
                      `${store}: +${c.inserted} new, ${c.updated} updated, ${c.skipped} already newer, ${c.invalid} invalid`,
                    );
                }
                if (result.unknownStores.length > 0)
                  lines.push(
                    `ignored unknown stores: ${result.unknownStores.join(", ")}`,
                  );
                resultBox.replaceChildren(
                  h(
                    "p",
                    {},
                    `Imported — ${inserted} new, ${updated} updated, ${skipped} already newer${invalid > 0 ? `, ${invalid} invalid skipped` : ""}.`,
                  ),
                  h(
                    "ul",
                    {},
                    ...lines.map((l) => h("li", { class: "muted" }, l)),
                  ),
                );
                toast("Import complete. Reloading…");
                window.setTimeout(() => go("/today"), 800);
              } catch (err) {
                console.error(err);
                btn?.removeAttribute("disabled");
                toast(
                  `Import failed: ${err instanceof Error ? err.message : "invalid file"}`,
                );
              }
            },
          },
          "Confirm import",
        ),
        resultBox,
      );
    } catch (err) {
      toast(
        `Import failed: ${err instanceof Error ? err.message : "invalid file"}`,
      );
    }
  });
  backupCard.append(
    h("label", {}, "Import JSON backup", fileInput),
    importPreview,
  );
  const done = await listWorkouts("completed", 1000);
  backupCard.appendChild(
    h(
      "p",
      { class: "muted" },
      `${done.length} completed workouts · last: ${done[0] ? fmtDate(done[0].startedAt) : "—"}`,
    ),
  );
  root.appendChild(backupCard);

  return root;
}
