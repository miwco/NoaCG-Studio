---
v: 1
source: owner
raised: 2026-08-26
state: unstarted
asked: "\"I like the new docs\" - the next guides on the /docs shelf, in the order they earn their place (paraphrase of the 2026-08-26 walk)"
---
# The next /docs guides, in the order they earn their place

**Filed:** 2026-08-27. **Source:** the owner's walk of `/docs` on 2026-08-26 ("I like the new
docs"), plus the /docs shelf restructure this file was written beside (in `git log` on
2026-08-27; the handoff that described it has since been consumed).

## Why

The page now has a shelf that new guides slot into: `#graphics` holds one guide per graphic kind,
and the left nav stays main-topics-only. That makes "write another guide" cheap, which is exactly
why it needs a stated order. The owner's constraint is the binding half of this file:

> only the most important information on the left

**Do not inflate the docs.** A guide earns its place by answering a question a reader actually
arrives with, and every one that does not is nav weight paid by every reader who wanted a different
page. Four kinds are documented because each asks for its content in a shape nobody would guess.
A lower third does not, and it does not get a guide.

## What it would take

One guide is roughly an afternoon: run the flow, write it, pin its load-bearing line in
`e2e/docs.spec.ts`, and hold the voice in `src/docs/AGENTS.md`.

**Tactically, in order:**

1. **The creation wizard, end to end.** The most-used surface on the product and the least
   documented: Entry, Browse, Fields, Style, Animation, Finish, and the fact that Finish can export
   without the editor ever opening. `#getting-started` currently compresses all of it into three
   list items. This is the one guide a first-time reader most needs and it is not a graphic kind,
   so it belongs beside `#svg` under "Make a graphic".
2. **Countdowns and clocks.** A timer's content is a duration, not a line of text, and the input-only
   hidden field is the shape a reader will otherwise misuse. Goes in the `#graphics` shelf.
3. **Bringing artwork in that is not an SVG.** Logos, pictures, Lottie files: what is embedded, what
   travels into an export, and what a missing font does. Today this is spread across the SVG guide
   and nowhere else.
4. **Exporting for each target.** Six targets exist and the page documents playing them, not
   choosing between them. A short "which package do I want" page, not six pages.

**Deliberately not on this list:** one guide per catalog design, an AI page (that work is
postponed), and anything about the editor beyond what Advanced mode already implies.

## Evidence

- Owner walk, 2026-08-26: the docs home was accepted, with end credits and tickers as top-level
  nav entries named as the confusion. That restructure landed; this file is what stops the same
  mistake being made again with the next four guides.
- `src/docs/AGENTS.md` holds the voice and the structure rules a new guide has to satisfy.
- The 2026-09-12 student production is the reader this list is ordered for: someone who has to make
  a graphic and play it out, not someone reading for interest.
