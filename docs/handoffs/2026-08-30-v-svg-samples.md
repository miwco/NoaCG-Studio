# The practice library: five samples to twenty-three

**Branch:** `claude/v-svg-samples` · **Files:** `docs/svg-samples/**`, `scripts/svg-samples-check.mjs`

The ask: students should practise the SVG import road on real files, one per kind of graphic,
openable in Illustrator so they can keep working on them. Five files - four of them lower-third
shaped - could not do that, and the import road's own testing was thinner for it.

## What is there now

Twenty-three files. Twenty-one of the catalog's twenty-two kinds have one; `transition` does not,
because a stinger has no artwork to bind and a sample would teach nothing about importing. Two of
the five originals (`illustrator-export.svg`, `outlined-title.svg`) are idiom files rather than
kind files and stayed that way.

Each new file draws a real graphic of its kind and teaches exactly one thing about importing:

- a **small artboard** as a free-floating object - `corner-bug` (320×120), `stream-notification` (520×140)
- a **clock-shaped sample** offering a countdown - `starting-soon`
- a **plain figure** proposing a number field - `infographic`, `poll`, `results-board`, `esports-score`
- a **hidden layer** as a drawn state - `matchup`, `reveal`, `poll`, `esports-score`, `results-board`
- **two languages** as two named sets of fields - `public-info`
- the **fill rule** keeping a camera window transparent - `frame`
- **systematic names** when there are twenty-one fields - `results-board`
- and the two shapes that decide the fit ladder: `alert` and `audience` are stacked,
  start-anchored lines inside one wide panel, so growth defaults ON without asking; the other
  twenty-one hold their layout and shrink.

`docs/svg-samples/README.md` names every file, the kind it stands for and its lesson, and carries
the check table.

## What was measured, and how

**`scripts/svg-samples-check.mjs`** (new, no npm entry - session S owned package.json) runs the
REAL importer over the folder: Rolldown bundles `src/assets/svgImport.ts`, Playwright's Chromium
provides the DOM it needs, and it prints a pass/partial/fail table in a few seconds with no dev
server. It follows `scripts/catalog-emit.mjs`, which solved the same "this module needs a DOM"
problem. `--fail-on fail` makes it a gate. **23 pass, 0 partial, 0 fail.**

Parsing is not the road, so every file was also walked through the app itself, drop zone to export
gate, with the corpus sweep's own instrument (`scripts/svg-import-sweep.mjs`, copied to a
scratchpad and pointed at this folder with an expectation sidecar per file - the corpus itself was
not touched). Expectations were written from the artwork, and the field counts came from a
separate byte-level count of the visible `<text>` layers, never from the importer.

**23 fixtures - 23 pass, 0 partial, 0 fail.** Every file: accepted, the size it draws on, exactly
the fields its artwork carries with the labels it names them, the picture and outline rows it
should offer, the fit-ladder default its lesson claims, no sanitizer notice, the project built,
the live preview kept every drawn element, no console error, and the export gate green.

Every file was also screenshotted at full size and looked at. Two fixes came out of that and are
in the commit:

1. **The picture placeholders were red.** The 1×1 PNG this repo uses everywhere as a test image -
   and which `scorebug.svg` calls "one transparent pixel" - is actually `rgba(255,0,0,0.5)`. At
   54px in the scorebug nobody ever saw it; at 580px in the info card it was a red block. The new
   files carry a genuinely transparent pixel.
2. **The infographic had no title**, leaving a third of its panel empty. It now has a title and a
   source on ONE baseline - deliberately, because a headline alone above a chart would read as a
   strap the panel should widen for, and that panel must not move.

## Grading the delegation

This row was the wave's delegation trial, and the answer is **yes, route this class of work there
again**.

| | |
|---|---|
| What was delegated | authoring 18 new SVG files from a written list, with the rules, the house style, the five existing files as the shape, and eleven hard constraints |
| Spec cost | ~5 minutes to write, 13,145 bytes, one shot, no follow-up |
| Round trip | launched 23:42:41, completed 00:00:35 - **17m54s** |
| Its cost | 4,480,221 tokens (4.43M input, 95.6% cached; 46,451 output) over 234 events. `scripts/harness-usage.mjs` has not landed on `main` yet; the transcript is `~/.codex/sessions/2026/08/29/rollout-2026-08-29T23-42-44-01a04f42-aae7-7f73-b99e-c4d92ad626a2.jsonl` |
| Files usable unedited | **18 of 18** passed parse and field detection on the first run, and 16 of 18 shipped byte-identical. The two edits were a repo-wide wrong pixel it had been told to copy, and one composition judgement |

**What it did better than I would have.** Volume without drift. Eighteen files, each with a
comment block in the existing voice, consistent palette, consistent naming, Illustrator's `_x20_`
escaping throughout, words painted last in every file that draws a state, and both hidden-layer
idioms used across the set as asked. It also checked its own work - it reported per-file field
counts and growth expectations that matched my independent measurement exactly, including the two
files that grow.

**What it did worse.** Nothing structural; two things of taste. It followed the spec's
"use the pixel from scorebug.svg, verbatim" past the point where it should have noticed the result
was a red block - a human drawing a 580px picture slot would have seen it. And it under-composed
where the spec did not name a part: the infographic had no title, and its panel had a third of its
height empty. Both are the same failure - it builds exactly the thing described and does not push
back on the description.

**The measured lesson.** The previous trial's finding was that a line-addressed mechanical edit
costs more to specify than to do. This is the opposite shape and it held: five minutes of
specification bought eighteen minutes of authoring that would have cost me hours, and the
verification - which does NOT move with the delegation - is what caught both defects. Delegate the
long doing; keep the looking.

## Open, for whoever picks this up

- **`scorebug.svg` still carries the half-opaque red pixel** and a comment calling it transparent.
  Left alone on purpose: it is referenced by `e2e/_svg-import.ts`, and session U owned
  `e2e/import-svg.spec.ts` the same night. It is a two-byte-run fix (swap the base64 for the one
  the new files use) and the comment then becomes true. The same wrong pixel is used as a generic
  test image in about eight e2e specs, where it does not matter.
- **`docs/SVG_AUTHORING.md` still says "the four files in `docs/svg-samples/`"** with a four-row
  table. Session U was rewriting that page's voice the same night, so it was not touched here; the
  table needs to become a pointer at `docs/svg-samples/README.md`.
- **`docs.html` links the folder on GitHub** and needs nothing, but a reader would be better served
  by the README's table than by a directory listing.
