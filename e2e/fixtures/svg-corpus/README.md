# The SVG import corpus

Files shaped the way Illustrator, Figma, Inkscape, Affinity, Sketch, CorelDRAW and an SVGO run
really export, with the paint, geometry and mistakes real designs carry. They exist to answer one
question with a measurement rather than a reading of the code: **does the SVG import road work as
advertised?**

The `family` field groups them by where the file came from (`illustrator`, `figma`, `inkscape`,
`affinity`), except `effects` and `geometry`, which group by what the file is FOR - a paint
feature and a sizing question respectively, whatever drew them.

"As advertised" is `docs/SVG_AUTHORING.md` - the page a designer is handed. Not
`docs/SVG_IMPORT_PLAN.md`, which is the engineering contract, and emphatically not
`src/assets/svgImport.ts`.

## The one rule that makes this corpus worth anything

**An expectation is written from the promise, never from the importer.** Each `<slug>.expect.json`
says what the designer who drew `<slug>.svg` would expect to get. If the importer disagrees, that
is a FINDING. An expectation copied out of the implementation proves only that the implementation
does what it does, which is what every source-level check of this feature already proved while the
question stayed open.

## The shape

Each fixture is a pair:

| File | What it is |
|---|---|
| `<slug>.svg` | the artwork, carrying the byte-idioms of the exporter it names in its leading comment |
| `<slug>.expect.json` | what the designer expects, and why this file is worth having |

```jsonc
{
  "name": "figma-frame-export-lower-third",
  "family": "figma",                  // groups the corpus; `--only figma` sweeps one family
  "exporter": "Figma - Export frame as SVG",
  "story": "one sentence: what was drawn, and how it was exported",
  "idioms": ["the concrete byte-level habits reproduced"],
  "expect": {
    "accepted": true,                 // false = the import should REFUSE and teach the fix
    "width": 1920, "height": 1080,    // the size the door should report
    "textFields": 3,                  // operator text fields expected ON
    "textLabels": ["Name", "Role"],   // expected labels, document order (may be a prefix)
    "imageFields": 0,
    "outlineRows": 0,                 // groups of outlined type offered as a recoverable row
    "noticeAbout": [],                // topics the designer SHOULD be warned about; [] = clean
    "growth": "grow-xy"               // the fit-ladder default: grow-x | grow-xy | grow-y | shrink | null
                                      // (a growable panel proposes the WHOLE ladder - wider, then wrap)
  },
  "whyThisMatters": "which real-world failure this file would catch"
}
```

A refusing fixture adds `"refusalAbout": "<what the message must name>"` and leaves the counts at 0.
`geometry-unescaped-ampersand` is the one, and it is deliberately the ONLY broken file here: the
corpus is about files that should work, and a second unimportable one would only prove XML twice.
What it measures is the SENTENCE - a refusal that names the character beats "damaged, or not an
SVG at all", which sends someone back to re-export a file that was never the problem.

## Running it

A dev server for this checkout must be up. `scripts/dev-port.mjs` prints the port it RESERVED,
which is the right answer when you started the server yourself.

```bash
node scripts/svg-import-sweep.mjs --json sweep.json --shots shots/
```

**In a linked worktree, pass `--base`.** The Claude preview harness allocates its own port and
hands it to Vite, so the reservation and the listening server disagree and the sweep drives a
dead port - which is why the previous session could not run it at all:

```bash
node scripts/svg-import-sweep.mjs --base http://localhost:5186 --json sweep.json
```

It drives Chromium over `/app`, one context per fixture, door to export - so it is **browser
work**: enqueue it (`npm run queue -- "node scripts/svg-import-sweep.mjs"`), never run it beside a
Playwright suite. It is an instrument and exits 0; `--fail-on fail` makes it a gate.

## Where a fixture graduates to

The sweep measures; it does not decide. Once a fixture's answer has been judged correct, it is
pinned with hard assertions in `e2e/import-svg-corpus.spec.ts`, which is the gate. A fixture whose
answer is still a finding stays here as the repro file and is named in the finding.
