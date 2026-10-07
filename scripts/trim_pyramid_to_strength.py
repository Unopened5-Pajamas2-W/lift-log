# trim_pyramid_to_strength.py
"""Build docs/strength-pyramid-3rd-ed-trimmed.md from the raw PDF-extracted book.

Pipeline (deterministic, single-purpose):
1. Slice the source into verified keep-bands (section-level selection).
2. Drop per-line junk: purchase stubs, running headers/footers, chapter
   opener pyramid diagrams.
3. Collapse figure scatter-art into one-line prose gloss placeholders.
4. Suppress chapter REFERENCES lists inside the Level keep-bands.
5. Strip in-text numeric citation markers like [7], [5-7], [11, 12].
6. Whitespace hygiene.
Emits a manifest mapping output sections to source line ranges.
"""

import json
import re
import sys
from pathlib import Path
from typing import Sequence

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "docs" / "source_docs_for_strength_science_master" / "corpus" / (
    "The Muscle and Strength Pyramid - Training - PDF v3.1.5.md"
)
OUT = REPO / "docs" / "strength-pyramid-3rd-ed-trimmed.md"
MANIFEST = REPO / "copilot_temp" / "trim_manifest.json"

# Keep-bands: (first_line, last_line) inclusive, 1-indexed, verified by grep.
KEEP_BANDS: Sequence[tuple[int, int]] = [
    # Level 1 Adherence: conditions through interference effect (skip opener junk)
    (824, 1168),
    # Level 1 Injury section body through its end (skip REFERENCES)
    (1169, 1262),
    # Level 2: dose summary table through exercise/muscle mapping table end
    (1600, 3843),
    # Level 3: progression concept through Changing Volume end (skip REFERENCES)
    (4228, 6456),
    # Level 4: strength selection principles through exercise order end
    (6958, 8263),
    # Level 5: rest-period content through recommendations end
    (8662, 9209),
    # Level 6: tempo content through technique summary end
    (9386, 9785),
    # Guide to Program Building: Steps 1-6, matrices, warm-up, dual athletes
    (10053, 11662),
    # Abbreviations and key definitions
    (11800, 12139),
]

# --- per-line junk patterns -------------------------------------------------
RE_PURCHASE = re.compile(r"^Purchased by The Awesome Jared Christensen")
RE_HEADER = re.compile(r"^THE MUSCLE & STRENGTH PYRAMID: TRAINING$")
# "LEVEL 2. VOLUME AND INTENSITY • 27" and bare "GUIDE TO PROGRAM BUILDING" pages
RE_FOOTER = re.compile(
    r"^(?:LEVEL [1-6]\. [A-Z][A-Z &]* • \d+"
    r"|INTRODUCTION • \d+"
    r"|GUIDE TO PROGRAM BUILDING • \d+"
    r"|FINAL WORDS • \d+"
    r"|ABOUT THE AUTHORS • \d+"
    r"|LIST OF ABBREVIATIONS AND KEY DEFINITIONS • \d+)$"
)
# page-number-first footer: "12 • LEVEL 1. ADHERENCE" / "III" / "1"
RE_PAGE_FIRST = re.compile(r"^(?:\d+ • LEVEL [1-6]\. [A-Z][A-Z &]*|[IVXLC]+|\d+)$")

# chapter-opener diagram clusters start at a bare digit line and end right
# before the chapter intro paragraph that follows the "Purchased by"/header
# junk lines. They contain the level name line (e.g. "adherence").
OPENER_LEVEL_NAMES = {
    "adherence",
    "volume & intensity",
    "progression",
    "exercise selection",
    "rest periods",
    "tempo",
}

# --- figure scatter collapse ------------------------------------------------
RE_BARE_NUM = re.compile(r"^-?\d+(?:[.\d]*\s*)?$")

FIGURE_GLOSSES: tuple[tuple[int, int, str], ...] = (
    (1917, 2010,
     "Figure 2.4 (meta-regression curves): strength rises sharply with weekly "
     "sets and plateaus by ~5 sets/lift; hypertrophy keeps rising but less "
     "efficiently through ~30 sets/muscle. Efficiency breakpoints: strength "
     "1-2 sets very high ROI, 3-4 high, 5 moderate; hypertrophy ~10 high, "
     "~18-19 modest, ~30 poor."),
    (2258, 2281,
     "Figure 2.5 (practical inverted-U): gains rise with volume to a plateau, "
     "then decrease via drifting RIR, poorer exercise selection, frequent "
     "deloads and aches, then regress via injury/burnout."),
    (2790, 2810,
     "Figure 2.6 (RIR vs strength gain): at a matched load, 1RM gains are "
     "statistically flat across ~0-8 RIR - proximity to failure has no "
     "meaningful independent effect on strength."),
    (3408, 3445,
     "Figure 2.9 (frequency vs strength): the big jump is going from 1 to 2 "
     "weekly exposures per lift; beyond that, diminishing returns."),
    (3476, 3500,
     "Figure 2.10 (frequency vs hypertrophy): no meaningful relationship "
     "once volume is equated - the independent effect is negligible."),
)


def is_opener_cluster(lines: Sequence[str], idx: int) -> bool:
    """Detect a chapter-opener pyramid-diagram line run around idx.

    Heuristic: a bare single digit line followed within a few lines by the
    level-name word and surrounded by page junk.
    """
    if idx >= len(lines) or not RE_PAGE_FIRST.fullmatch(lines[idx].strip()):
        return False
    window = lines[idx: idx + 30]
    saw_level_name = False
    for text in window[:28]:
        stripped = text.strip()
        if RE_PURCHASE.match(stripped) or RE_HEADER.match(stripped):
            break
        if stripped.lower() in OPENER_LEVEL_NAMES:
            saw_level_name = True
            break
    if not saw_level_name:
        return False
    # must be page-boundary junk adjacent (before or after window)
    around = lines[max(0, idx - 3): idx + 32]
    return any(
        RE_PURCHASE.match(t.strip()) or RE_HEADER.match(t.strip()) for t in around
    )


def strip_citations(text: str) -> str:
    """Remove in-text numeric citation markers."""
    text = re.sub(r"\s*\[\d+(?:\s*[-–,]\s*\d+)*(?:\s*,\s*\d+)*\]", "", text)
    # trailing space + period cleanup: "lifters [7]." -> "lifters."
    text = re.sub(r"\s+([.,;:])", r"\1", text)
    return text


def clean_band(
    lines: Sequence[str], start: int
) -> list[tuple[str, int]]:
    """Filter one keep-band; return (clean_text, source_line_number) pairs."""
    out: list[tuple[str, int]] = []
    i = 0
    n = len(lines)
    in_figure = False
    while i < n:
        text = lines[i].strip()
        src_no = start + i
        # figure gloss replacement windows
        gloss = next(
            (g for lo, hi, g in FIGURE_GLOSSES if lo <= src_no <= hi), None
        )
        if gloss is not None:
            if not in_figure:
                out.append((gloss, lo := src_no))  # noqa: F841
                in_figure = True
            i += 1
            continue
        in_figure = False
        if not text:
            out.append(("", src_no))
            i += 1
            continue
        if RE_PURCHASE.match(text) or RE_HEADER.match(text) or RE_FOOTER.match(text):
            i += 1
            continue
        if RE_PAGE_FIRST.fullmatch(text) and is_opener_cluster(lines, i):
            i += 1
            continue
        if text.lower() in OPENER_LEVEL_NAMES and src_no < 8100:
            # bare level-name line inside an opener cluster
            neighbors = lines[max(0, i - 3): i + 4]
            if any(
                RE_PURCHASE.match(n.strip()) or RE_HEADER.match(n.strip())
                for n in neighbors
            ) and any(RE_PAGE_FIRST.fullmatch(x.strip()) for x in neighbors):
                i += 1
                continue
        out.append((strip_citations(text), src_no))
        i += 1
    return out


def suppress_references(
    pairs: Sequence[tuple[str, int]], band_start: int, band_end: int
) -> list[tuple[str, int]]:
    """Drop numbered reference-list lines between REFERENCES and page junk.

    In this PDF extraction the reference list ends at the running footer /
    purchase-stub lines that already get dropped; a numbered citation line
    pattern (e.g. '12.' or 'Huiberts') would still leak, so drop lines from
    a REFERENCES heading until the next non-reference-looking content.
    Reference list lines are either 'N.' alone, wrapped citation text, or a
    page footer. We drop until we hit a heading-like uppercase line that is
    not citation text, or the end of the band.
    """
    out: list[tuple[str, int]] = []
    skipping = False
    for text, src_no in pairs:
        if not text:
            if not skipping:
                out.append((text, src_no))
            continue
        if re.fullmatch(r"REFERENCES", text):
            skipping = True
            continue
        if skipping:
            # citation entries start with 'N.' or a number-dot line
            is_num_dot = re.fullmatch(r"\d{1,2}\.", text)
            if is_num_dot:
                continue
            # a run of citation body text: keep skipping until we hit a
            # heading-like line (>= 2 uppercase words, no lowercase sentence)
            words = text.split()
            upper_words = sum(
                1 for w in words if w[:1].isupper() or w[:1].isdigit()
            )
            heading_like = (
                len(words) >= 2
                and all(w[0].isupper() or not w[0].isalpha() for w in words)
                and len(text) < 60
            )
            if heading_like:
                skipping = False
                out.append((text, src_no))
            continue
        out.append((text, src_no))
    return out


def collapse_blanks(lines: Sequence[str]) -> list[str]:
    out: list[str] = []
    blanks = 0
    for text in lines:
        if not text:
            blanks += 1
            if blanks >= 2:
                continue
            out.append("")
        else:
            blanks = 0
            out.append(text)
    return out


def main() -> int:
    lines = SRC.read_text(encoding="utf-8").splitlines()
    sections: list[dict] = []
    for band_start, band_end in KEEP_BANDS:
        band = lines[band_start - 1: band_end]
        filtered = suppress_references(
            clean_band(band, band_start), band_start, band_end
        )
        texts = [t for t, _ in filtered]
        texts = collapse_blanks(texts)
        sections.append(
            {"source_lines": [band_start, band_end], "text": texts}
        )
    OUT.write_text("\n".join(t for s in sections for t in s["text"]) + "\n", encoding="utf-8")
    MANIFEST.write_text(
        json.dumps(
            [
                {"source_lines": s["source_lines"], "output_line_count": len(s["text"])}
                for s in sections
            ],
            indent=2,
        ),
        encoding="utf-8",
    )
    total = sum(len(s["text"]) for s in sections)
    print(f"wrote {OUT} ({total} lines from {len(sections)} bands)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
