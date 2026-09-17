/** Hash router + tab shell + first-run disclaimer gate. */
import { renderHistory } from "./views/history.ts";
import { renderProgress } from "./views/progress.ts";
import { renderSettings } from "./views/settings.ts";
import { renderToday } from "./views/today.ts";
import { renderWorkout } from "./views/workout.ts";
import { renderExercises } from "./views/exercises.ts";
import { getActiveWorkout, loadSettings, saveSettings } from "./lib/store.ts";
import { go, h } from "./lib/ui.ts";

const TABS = [
  { path: "/today", label: "Today", icon: "☀" },
  { path: "/workout", label: "Workout", icon: "🏋" },
  { path: "/exercises", label: "Moves", icon: "📖" },
  { path: "/history", label: "History", icon: "🕘" },
  { path: "/progress", label: "Progress", icon: "📈" },
  { path: "/settings", label: "Settings", icon: "⚙" },
] as const;

function tabbar(current: string): HTMLElement {
  const nav = h("nav", { class: "tabbar", "aria-label": "Primary" });
  for (const t of TABS) {
    const active =
      current === t.path || (t.path !== "/today" && current.startsWith(t.path));
    const a = h(
      "a",
      {
        href: `#${t.path}`,
        ...(active ? { "aria-current": "page" } : {}),
      },
      h("span", { "aria-hidden": "true" }, t.icon),
      h("span", {}, t.label),
    );
    nav.appendChild(a);
  }
  return nav;
}

function disclaimerGate(onAccept: () => void): HTMLElement {
  return h(
    "div",
    { class: "card" },
    h("strong", {}, "Train safe"),
    h(
      "p",
      {},
      "Strength training carries injury risk. This app is not medical advice — consult a qualified professional, stop if you feel sharp pain, and learn complex lifts with a coach.",
    ),
    h(
      "button",
      {
        class: "primary",
        onclick: async () => {
          await saveSettings({ disclaimerAccepted: true });
          onAccept();
        },
      },
      "I understand — continue",
    ),
  );
}

function titles(path: string): string {
  if (path.startsWith("/workout")) return "Workout";
  if (path.startsWith("/exercises")) return "Exercises";
  if (path.startsWith("/history")) return "History";
  if (path.startsWith("/progress")) return "Progress";
  if (path.startsWith("/settings")) return "Settings";
  return "Today";
}

export async function renderApp(shell: HTMLElement): Promise<void> {
  const raw = location.hash.replace(/^#/, "") || "/today";
  const path = raw.startsWith("/") ? raw : "/today";

  const settings = await loadSettings();
  shell.replaceChildren();
  const head = h(
    "header",
    { class: "topbar" },
    h("h1", {}, `Lift Log · ${titles(path)}`),
  );
  const view = h("main", { id: "view" });
  shell.append(head, view, tabbar(path.split("/").slice(0, 2).join("/")));

  if (!settings.disclaimerAccepted) {
    view.appendChild(disclaimerGate(() => void renderApp(shell)));
    return;
  }

  window.onbeforeunload = null;
  try {
    if (path === "/today" || path === "/")
      view.appendChild(await renderToday());
    else if (path === "/workout") {
      const active = await getActiveWorkout();
      view.appendChild(
        active
          ? await renderWorkout(active.id)
          : await renderWorkout(undefined),
      );
    } else if (path.startsWith("/workout/"))
      view.appendChild(
        await renderWorkout(decodeURIComponent(path.slice("/workout/".length))),
      );
    else if (path === "/exercises") view.appendChild(await renderExercises());
    else if (path.startsWith("/exercises/"))
      view.appendChild(
        await renderExercises(
          decodeURIComponent(path.slice("/exercises/".length)),
        ),
      );
    else if (path === "/history") view.appendChild(await renderHistory());
    else if (path.startsWith("/history/"))
      view.appendChild(
        await renderHistory(decodeURIComponent(path.slice("/history/".length))),
      );
    else if (path === "/progress") view.appendChild(await renderProgress());
    else if (path === "/settings") view.appendChild(await renderSettings());
    else go("/today");
  } catch (err) {
    console.error(err);
    const storageFailed =
      (err instanceof DOMException &&
        ["QuotaExceededError", "VersionError", "InvalidStateError"].includes(
          err.name,
        )) ||
      (err instanceof Error &&
        /indexeddb|quota|versionchange|blocked|storage/i.test(err.message));
    view.appendChild(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Something went wrong"),
        h(
          "p",
          { class: "muted" },
          storageFailed
            ? "Storage unavailable — your last change may not have saved. Free up space or close other Lift Log tabs, then retry."
            : err instanceof Error
              ? err.message
              : "Unknown error. Your previously saved data is still in IndexedDB.",
        ),
        h("button", { onclick: () => go("/today") }, "Back to Today"),
      ),
    );
  }
  document.getElementById("view")?.scrollIntoView({ block: "start" });
}
