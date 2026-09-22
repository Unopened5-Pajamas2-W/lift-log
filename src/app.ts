/** Hash router + tab shell + first-run disclaimer gate. */
import { renderHistory } from "./views/history.ts";
import { renderProgress } from "./views/progress.ts";
import { renderSettings } from "./views/settings.ts";
import { renderToday } from "./views/today.ts";
import { renderWorkout } from "./views/workout.ts";
import { renderExercises } from "./views/exercises.ts";
import { renderExerciseProgress } from "./views/exerciseProgress.ts";
import { getActiveWorkout, loadSettings, saveSettings } from "./lib/store.ts";
import { go, h } from "./lib/ui.ts";
import { tabIcon, type TabIconName } from "./components/tabIcons.ts";

const TABS = [
  { path: "/today", label: "Today", icon: "today" },
  { path: "/workout", label: "Workout", icon: "workout" },
  { path: "/exercises", label: "Moves", icon: "moves" },
  { path: "/history", label: "History", icon: "history" },
  { path: "/progress", label: "Progress", icon: "progress" },
  { path: "/settings", label: "Settings", icon: "settings" },
] as const satisfies readonly { path: string; label: string; icon: TabIconName }[];

function tabbar(current: string): HTMLElement {
  const nav = h("nav", { class: "tabbar", "aria-label": "Primary" });
  for (const t of TABS) {
    const active =
      current === t.path || (t.path !== "/today" && current.startsWith(t.path));
    const iconWrap = h("span", { class: "tab-icon", "aria-hidden": "true" });
    iconWrap.appendChild(tabIcon(t.icon));
    const a = h(
      "a",
      {
        href: `#${t.path}`,
        ...(active ? { "aria-current": "page" } : {}),
      },
      iconWrap,
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
  // Query string (e.g. the exercises detail's ?from= return path) is not part
  // of the route path; exercise/detail ids never contain "?".
  const qIndex = raw.indexOf("?");
  const rawPath = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const path = rawPath.startsWith("/") ? rawPath : "/today";
  const query = new URLSearchParams(qIndex === -1 ? "" : raw.slice(qIndex + 1));

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
          // ?from= marks the view to return to from the detail Back button.
          query.get("from") ?? undefined,
        ),
      );
    else if (path === "/history") view.appendChild(await renderHistory());
    else if (path.startsWith("/history/"))
      view.appendChild(
        await renderHistory(decodeURIComponent(path.slice("/history/".length))),
      );
    else if (path.startsWith("/progress/exercise/"))
      view.appendChild(
        await renderExerciseProgress(
          decodeURIComponent(path.slice("/progress/exercise/".length)),
          // ?from= marks the view to return to from the drill-in Back button.
          query.get("from") ?? "/progress",
        ),
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
  // Reset scroll only when the previous view left the document scrolled:
  // on standalone iOS a scrollTo on an already-top, non-scrollable document
  // can pan the visual viewport (WebKit bug 323322), shifting the whole
  // screen — fixed tab bar included — and leaving blank space beneath it.
  if (window.scrollY > 0) window.scrollTo({ top: 0 });
}
