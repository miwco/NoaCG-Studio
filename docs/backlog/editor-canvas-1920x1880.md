---
v: 2
source: owner
kind: finding
raised: 2026-08-29
state: unstarted
found: "screenshot of the failing editor showing `headline · 1920x1880 · 25 fps` in the header and in the resolution chip (owner's machine, not a paraphrase - the number is off the screenshot)"
---
# A graphic came up in the editor at 1920x1880

**Filed:** 2026-09-02. **Source:** owner screenshot 2026-08-29, split out of
`editor-blank-stage.md` when that report's actual cause was found and fixed.

## Why

1880 is not a project format this app offers. A design composed for a 1080-tall frame inside an
1880-tall canvas is a layout nothing here has ever been measured against, and the number reached
both the header and the resolution chip, so whatever produced it produced a *persisted* value, not
a display glitch. If a resolution can drift by roundtrip, saved graphics can drift silently, and
the 2026-09-12 student production is a room full of saved graphics.

The reason it is filed rather than chased: it was the leading hypothesis for the blank editor
stage, and it was wrong. The blank stage reproduced on the deployed site at an ordinary 1920x1080,
on a plain catalog House Strap made through the wizard, and its cause was a minified-name mismatch
in `preview/composeDocument.ts` (fixed 2026-09-02, `claude/a-play-in-production`). So 1880 is now
an unexplained observation with no known symptom attached to it, which is exactly what the shelf
is for.

## What it would take

Nothing until a graphic with that resolution exists to look at. Two cheap reads when one does:

- Does `1920x1880` survive a save/load roundtrip, or is it produced by one? `model/layout.ts`
  carries the versioned format and its migration-on-read, so a roundtrip test is a few lines.
- Is the header/chip reading `template.resolution` or a project-format record that can disagree
  with it? Two sources that can differ is the shape that produces a number nobody chose.

Otherwise: ask the owner for the graphic. A screenshot names a value; the saved record explains it.

## Evidence

The owner's 2026-08-29 screenshot: header `headline · 1920x1880 · 25 fps`, the resolution chip
repeating it, zoom 100%, backdrop `Trans`, document `Saved` and `Synced`. Everything else in that
screenshot is accounted for by the composeDocument bug and is not evidence of anything here.
