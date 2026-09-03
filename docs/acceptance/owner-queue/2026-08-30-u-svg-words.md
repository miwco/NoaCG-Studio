---
kind: walk
date: 2026-08-30
serves: now
---
> **Settled 2026-09-03, on his phone: the voice test passed.** Read cold, he said *"The docs are
> good."* `docs/SVG_AUTHORING.md` and the `/docs` guide need no further work. What is left is the
> half that needs a screen: the new **Exporting the SVG** section under the import drop zone, and
> whether its one visible line tells you what it is for before you open the &#9432;. Re-kinded
> from `walk-p` to `walk` for that reason.

# The SVG words, rewritten, and moved to where the file gets dropped

You read `docs/SVG_AUTHORING.md` and could not use it: *"the text is too difficult ... it reads a
bit like AI."* And the deeper point: *"people are not going to go into the documentation to get
this information. They need it when they are about to upload their SVG."*

Both are answered. No fact was cut; this is a voice rewrite plus a move.

## Route, under a minute - the half that matters most

`/app` -> **New graphic** -> **Import graphic**. Under the drop zone there is now a new section:

> **Exporting the SVG**  named layers, live text, one artboard  &#9432;

Open the &#9432;. It holds four rules and, under "Where Export lives", the exact menu path in
Illustrator, Figma and Inkscape, with the two checkboxes that decide whether the import works.
Same rule as everywhere else on the step: one visible line, the rest behind the dot.

**What to look at:** whether the one visible line is enough to tell you what the section is for
before you open it, and whether the &#9432; answers "what do I do in Illustrator" without sending
you anywhere.

## The other half, if you have another minute

`/docs` -> **Import your own SVG graphic** in the left nav. Same words, same voice, and three
screenshots now: the drop step, your layer names sitting in the field list, and the quiz behaviour
picked on artwork nobody here drew.

`docs/SVG_AUTHORING.md` is the long version, rewritten sentence by sentence. Short words, no
hedging, and the app-by-app export settings kept, because that is the part people actually use.

**What to look at:** read any three paragraphs cold and see whether they sound written or
generated. That is the whole test on this item.

## One thing worth knowing about the screenshots

They are generated, not captured: `node scripts/docs-shots.mjs` drives the running app and writes
`public/docs/*.png`. Re-run it whenever the wizard changes and the pictures are correct again. A
hand-taken screenshot goes stale silently, and no build can fail on a PNG - which is exactly how a
docs page starts teaching the wrong thing.

## Not fixed here, seen while doing it

On the Fields step, the picked / right / wrong dropdowns are narrower than their own values, so
`A selected (hidden)` shows as `A selected (hidde`. Visible in the third screenshot. It belongs to
the mapping step, which another session owns tonight, so it was left alone rather than edited from
outside.

Gates: build green; `e2e/import-svg.spec.ts` pins the new wizard section, `e2e/docs.spec.ts` pins
that all three screenshots decode.
