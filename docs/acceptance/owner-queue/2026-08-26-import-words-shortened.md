---
kind: walk
date: 2026-08-26
---
# The import path's words, rewritten short

You accepted the structure — *"I like that the long texts are now behind this i button"* — and
not the words: *"the actual texts themselves are still way too long. It feels AI-generated, and
it's not just the em dashes; it just needs to be more caveman style and not an epic drama."*

Every user-facing string on the import path is rewritten: the one-line summaries, every body
behind an ⓘ, the drop-zone copy, the row tooltips and the warnings. No em dashes, no build-up,
mostly one sentence where there were two.

Route, under a minute: `/app` -> Create -> Import graphic. Read the ⓘ on the Design step, then
drop any SVG, press Next, and open every ⓘ on the mapping step.

One correction you called out by name: the shrink option said *"Shrinks to fit the space you
drew"* and you never drew anything — the importer found your text layers. It now says *The text
gets smaller*, and the sections say what actually happens rather than what somebody wishes had.

Scope, deliberately: this is PRODUCT copy only. Code comments, `AGENTS.md` and `docs/` keep their
reasoning density — different reader, different rule — so do not read a long comment in a diff as
this pass having been skipped.

What to look at: whether any of it still reads as written by a machine. If a specific line does,
name it and I will cut it rather than rewrite it.
