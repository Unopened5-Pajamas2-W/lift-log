/** Consistency card (spec R8): week streaks, 30-day sessions, weekly average. */
import type { ConsistencyStats } from "../lib/analytics.ts";
import { h } from "../lib/ui.ts";

/** One stat cell; `hot` highlights a live streak. */
function statCell(value: string, label: string, hot = false): HTMLElement {
  return h(
    "div",
    { class: "stat-cell" },
    h("span", { class: hot ? "stat-value hot" : "stat-value" }, value),
    h("span", { class: "stat-label" }, label),
  );
}

/** Render the consistency stats grid; streak cells mute when streak is 0. */
export function renderConsistencyCard(stats: ConsistencyStats): HTMLElement {
  const streak = stats.currentWeekStreak;
  return h(
    "div",
    { class: "card" },
    h("strong", {}, "Consistency"),
    h(
      "div",
      { class: "stat-grid" },
      statCell(
        `${streak} wk`,
        "current streak",
        streak > 0,
      ),
      statCell(`${stats.bestWeekStreak} wk`, "best streak"),
      statCell(String(stats.sessionsLast30Days), "last 30 days"),
      statCell(`${stats.avgSessionsPerWeek8w}/wk`, "trailing 8 weeks"),
    ),
  );
}
