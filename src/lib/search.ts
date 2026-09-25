/** Exercise search: token-based matching over name + aliases, with ranked scoring. */
import type { Exercise } from "./types.ts";

/** Normalize a string to lowercase word tokens (punctuation dropped). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(Boolean);
}

/** Does `token` appear as a whole word in `text`? */
function tokenIn(token: string, tokens: string[]): boolean {
  return tokens.includes(token);
}

/**
 * Score an exercise against a search query; higher is better, -1 = no match.
 *
 * Rules (deliberately not overly broad):
 * - Empty/whitespace query matches everything with score 0.
 * - Every query token must hit somewhere in name/aliases (AND semantics).
 * - A token hits if it is a whole word of the name or of any alias, OR a
 *   prefix of a whole word (so "pressdown" hits "pressdown"→"pressdown",
 *   "inc" hits "incline"). Bare substring-only hits across word boundaries
 *   ("curl" ⊂ "scrunch") do not count.
 * - Exact multi-token phrase inside the name scores highest; tokens spread
 *   between name and aliases score lowest.
 */
export function matchExercise(ex: Exercise, query: string): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;

  const nameTokens = tokenize(ex.name);
  const nameText = " " + ex.name.toLowerCase() + " ";
  const aliasList = ex.aliases ?? [];
  const aliasTokenLists = aliasList.map((a) => tokenize(a));
  const aliasTexts = aliasList.map((a) => " " + a.toLowerCase() + " ");

  // Every query token must hit somewhere (name or any alias).
  for (const q of qTokens) {
    const inName =
      tokenIn(q, nameTokens) || nameTokens.some((t) => t.startsWith(q));
    const inAlias =
      aliasTokenLists.some((ts) => tokenIn(q, ts)) ||
      aliasTokenLists.some((ts) => ts.some((t) => t.startsWith(q)));
    if (!inName && !inAlias) return -1;
  }

  // Exact phrase (all tokens, in order) within name — best.
  const phrase = qTokens.join(" ");
  if (nameText.includes(` ${phrase} `) || nameText.includes(` ${phrase}`)) {
    return 100 + (nameText.trim() === phrase ? 20 : 0);
  }
  // Exact phrase within an alias — near-best (only when name misses).
  if (aliasTexts.some((t) => t.includes(` ${phrase} `))) return 90;

  const allInName = qTokens.every(
    (q) =>
      tokenIn(q, nameTokens) || nameTokens.some((t) => t.startsWith(q)),
  );
  if (allInName) return 80;

  const allInOneAlias = aliasTokenLists.some(
    (ts) =>
      qTokens.every((q) => tokenIn(q, ts) || ts.some((t) => t.startsWith(q))),
  );
  if (allInOneAlias) return 70;

  // Tokens split between name and aliases — weakest acceptable match.
  return 50;
}

/**
 * Search a list of exercises; matched results are ranked best-first.
 * Empty query returns all exercises unranked (stored order).
 */
export function searchExercises<T extends Exercise>(
  exercises: T[],
  query: string,
): T[] {
  const needle = query.trim();
  if (!needle) return exercises;
  const scored: { ex: T; score: number }[] = [];
  for (const ex of exercises) {
    const score = matchExercise(ex, needle);
    if (score >= 0) scored.push({ ex, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name),
  );
  return scored.map((s) => s.ex);
}
