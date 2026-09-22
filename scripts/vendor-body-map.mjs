/** Dev-only generator: vendors anatomical body-map SVG path data from the
 *  MIT-licensed react-native-body-highlighter dataset into
 *  src/data/bodyMap.generated.ts (committed; runtime never fetches).
 *  Usage: node scripts/vendor-body-map.mjs  — needs network once; output is
 *  deterministic for the pinned SHA, so re-running produces no diff.
 *  To refresh upstream data: bump UPSTREAM_SHA, then re-check the slug
 *  mapping below (the script fails loudly on unknown slugs). */
const UPSTREAM_REPO = "HichamELBSI/react-native-body-highlighter";
const UPSTREAM_SHA = "8ed39ac2ae9cb46fb79d77eedec7e5b029a75174";
const UPSTREAM_LICENSE = "MIT (c) 2022 ELABBASSI Hicham";
const RAW_BASE = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${UPSTREAM_SHA}/`;

/** Upstream slug → app MuscleGroup. Slugs not listed here must be in
 *  NEUTRAL_SLUGS (untracked regions that keep the silhouette complete). */
const MUSCLE_SLUGS = {
  chest: "chest",
  abs: "core",
  obliques: "core",
  deltoids: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  trapezius: "back",
  "upper-back": "back",
  "lower-back": "back",
  quadriceps: "quads",
  adductors: "quads",
  hamstring: "hamstrings",
  gluteal: "glutes",
  calves: "calves",
  tibialis: "calves",
};
/** Mirrors MUSCLE_GROUPS minus `fullbody` (list-only aggregate, no geometry). */
const MUSCLE_ORDER = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];
const NEUTRAL_SLUGS = new Set([
  "head",
  "hair",
  "neck",
  "knees",
  "ankles",
  "feet",
  "hands",
  "forearm",
]);

async function fetchText(relPath) {
  const res = await fetch(RAW_BASE + relPath);
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${relPath}`);
  }
  return res.text();
}

/** Evaluate a fetched upstream data file (TS) by stripping its import and
 *  type annotation, then parsing the remaining JS object literal with the
 *  real JS parser — robust against any path-string content. */
function parseBodyParts(source, exportName) {
  const code = source
    .replace(/^import[^\n]*\n/m, "")
    .replace(new RegExp(`:\\s*BodyPart\\[\\]`), "")
    .replace(`export const ${exportName}`, `const ${exportName}`);
  return new Function(`${code}; return ${exportName};`)();
}

function extractOutlines(jsx) {
  const outlines = {};
  const marker = /accessibilityLabel="male-body-outline-(front|back)"/g;
  let match;
  while ((match = marker.exec(jsx))) {
    const before = jsx.slice(0, match.index);
    const dataAttrs = before.match(/d="([^"]+)"/g);
    if (!dataAttrs) throw new Error(`No outline d= found for ${match[1]}`);
    outlines[match[1]] = dataAttrs.at(-1).slice(3, -1);
  }
  return outlines;
}

function extractViewBoxes(jsx) {
  const match = jsx.match(
    /viewBox = side === "front" \? "([^"]+)" : "([^"]+)"/,
  );
  if (!match) throw new Error("viewBox pattern not found in wrapper");
  return { front: match[1], back: match[2] };
}

const [frontSource, backSource, wrapperSource] = await Promise.all([
  fetchText("assets/bodyFront.ts"),
  fetchText("assets/bodyBack.ts"),
  fetchText("components/SvgMaleWrapper.tsx"),
]);

const musclePaths = Object.fromEntries(
  MUSCLE_ORDER.map((muscle) => [
    muscle,
    {
      front: { left: [], right: [] },
      back: { left: [], right: [] },
    },
  ]),
);
const neutral = { front: [], back: [] };

for (const [file, side] of [
  ["bodyFront", "front"],
  ["bodyBack", "back"],
]) {
  const parts = parseBodyParts(
    file === "bodyFront" ? frontSource : backSource,
    file,
  );
  for (const part of parts) {
    const mapped = MUSCLE_SLUGS[part.slug];
    const paths = {
      left: [...(part.path?.left ?? [])],
      right: [...(part.path?.right ?? [])],
    };
    if (mapped === undefined) {
      if (!NEUTRAL_SLUGS.has(part.slug)) {
        throw new Error(
          `Unknown slug "${part.slug}" (${side}) — map it in ` +
            `MUSCLE_SLUGS or NEUTRAL_SLUGS in scripts/vendor-body-map.mjs`,
        );
      }
      neutral[side].push(...paths.left, ...paths.right);
      continue;
    }
    if (paths.left.length + paths.right.length === 0) {
      throw new Error(`Mapped slug "${part.slug}" has no paths (${side})`);
    }
    musclePaths[mapped][side].left.push(...paths.left);
    musclePaths[mapped][side].right.push(...paths.right);
  }
}

const outline = extractOutlines(wrapperSource);
const viewBox = extractViewBoxes(wrapperSource);

function tsStringArray(paths, indent) {
  if (paths.length === 0) return "[]";
  return (
    `[\n` +
    paths.map((d) => `${indent}  ${JSON.stringify(d)},`).join("\n") +
    `\n${indent}]`
  );
}

const muscleEntries = MUSCLE_ORDER.map(
  (muscle) =>
    `  ${muscle}: {\n` +
    `    front: {\n` +
    `      left: ${tsStringArray(musclePaths[muscle].front.left, "      ")},\n` +
    `      right: ${tsStringArray(musclePaths[muscle].front.right, "      ")},\n` +
    `    },\n` +
    `    back: {\n` +
    `      left: ${tsStringArray(musclePaths[muscle].back.left, "      ")},\n` +
    `      right: ${tsStringArray(musclePaths[muscle].back.right, "      ")},\n` +
    `    },\n` +
    `  },`,
).join("\n");

const out = `/** GENERATED FILE — do not edit by hand.
 *  Run \`node scripts/vendor-body-map.mjs\` to refresh.
 *  Source: ${UPSTREAM_REPO} @ ${UPSTREAM_SHA} (upstream license: ${UPSTREAM_LICENSE};
 *  full text in THIRD_PARTY_NOTICES.md). Back-side paths are authored at
 *  x+724, hence the offset back viewBox. */
import type { MuscleGroup } from "../lib/types.ts";

export type BodySide = "front" | "back";

/** Per-side viewBox: upstream figure art space (1:2 aspect). */
export const BODY_VIEWBOX: Record<BodySide, string> = {
  front: ${JSON.stringify(viewBox.front)},
  back: ${JSON.stringify(viewBox.back)},
};

/** Stroke-only full-body contour per side (upstream "border" layer). */
export const BODY_OUTLINE: Record<BodySide, string> = {
  front: ${JSON.stringify(outline.front)},
  back: ${JSON.stringify(outline.back)},
};

/** Untracked regions (head, hands, feet, forearms, ...) that complete the
 *  silhouette; rendered in the neutral tone. */
export const BODY_NEUTRAL: Record<BodySide, string[]> = {
  front: ${tsStringArray(neutral.front, "  ")},
  back: ${tsStringArray(neutral.back, "  ")},
};

/** Tracked muscle regions keyed by app MuscleGroup, split by hemisphere so
 *  % badges can anchor to one lobe. \`fullbody\` is a list-only aggregate
 *  and has no geometry. */
export const MUSCLE_PATHS: Record<
  MuscleGroup,
  Record<BodySide, { left: string[]; right: string[] }>
> = {
${muscleEntries}
  fullbody: {
    front: { left: [], right: [] },
    back: { left: [], right: [] },
  },
};
`;

const { writeFileSync } = await import("node:fs");
const { dirname, resolve } = await import("node:path");
const { fileURLToPath } = await import("node:url");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(`${repoRoot}/src/data/bodyMap.generated.ts`, out);

const totalPaths =
  Object.values(musclePaths).flatMap((sides) =>
    [sides.front.left, sides.front.right, sides.back.left, sides.back.right].flat(),
  ).length + neutral.front.length + neutral.back.length;
console.log(
  `Wrote src/data/bodyMap.generated.ts ` +
    `(${Object.keys(musclePaths).length} muscle groups, ${totalPaths} paths, ` +
    `${(out.length / 1024).toFixed(1)} KB raw).`,
);
