/** Settings: units, equipment, rest default, backup, install help, privacy. */
import { renderInstallHelp } from "../components/installHelp.ts";
import { ALL_EQUIPMENT } from "../data/muscles.ts";
import {
  exportJson,
  importJson,
  parseBackup,
  serializeBackup,
  setsToCsv,
  shareOrDownload,
} from "../lib/backup.ts";
import {
  allCompletedSets,
  getExercise,
  getWorkout,
  listWorkouts,
  loadSettings,
  saveSettings,
} from "../lib/store.ts";
import { sessionVolume } from "../lib/metrics.ts";
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
    settings = await saveSettings({ units: unitsSel.value as "lb" | "kg" });
    toast(`Units: ${settings.units}`);
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
      settings = await saveSettings({ restSeconds: v });
      toast("Rest default saved");
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
      settings = await saveSettings({ equipment: next });
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
            const b = await exportJson();
            await shareOrDownload(
              `lift-log-backup-${new Date().toISOString().slice(0, 10)}.json`,
              serializeBackup(b),
              "application/json",
            );
            toast("Backup exported");
          },
        },
        "Export JSON",
      ),
      h(
        "button",
        {
          onclick: async () => {
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
                });
              }
            }
            await shareOrDownload(
              `lift-log-sets-${new Date().toISOString().slice(0, 10)}.csv`,
              setsToCsv(rows),
              "text/csv",
            );
            toast("CSV exported");
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
      importPreview.replaceChildren(
        h(
          "p",
          {},
          `Backup contains — ${summary}. Import merges by ID (duplicate-safe).`,
        ),
        h(
          "button",
          {
            class: "primary",
            onclick: async () => {
              const result = await importJson(text);
              toast(
                `Imported (${Object.values(result).reduce((a, b) => a + b, 0)} rows merged). Reloading…`,
              );
              window.setTimeout(() => go("/today"), 800);
            },
          },
          "Confirm import",
        ),
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

  root.appendChild(renderInstallHelp());
  root.appendChild(
    h(
      "div",
      { class: "card" },
      h("strong", {}, "Privacy"),
      h(
        "p",
        { class: "muted" },
        "Your data never leaves this device except when you tap Export. No accounts, no analytics, no tracking — verified by a same-origin Content Security Policy.",
      ),
    ),
  );
  return root;
}
