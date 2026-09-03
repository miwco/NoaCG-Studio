---
kind: walk-p
date: 2026-09-03
---
# The instruction files have room again, and one question is left

**Branch:** `claude/a-agents-md-headroom`. Nothing to look at in the product - this is the
contracts, and it is here because one decision is genuinely yours.

**What happened.** `src/components/wizard` had 365 bytes free of its instruction budget, so the
next session to add a paragraph there would have failed the build. The root `AGENTS.md` gave up
13.8 KB, which every one of the 52 instruction chains felt, because it is the file they all load.
The repository map and the ten-page URL table went to `docs/ARCHITECTURE.md`, the incident behind
each git rule went to a new `docs/BRANCHING_AND_LANDING.md`, and two verification rules went back
to `docs/VERIFICATION.md`, which already held their measurements word for word. No rule was
deleted; a script checked that every removed line is present verbatim in the file that received
it. The wizard chain went from 365 bytes free to 9,921, and the ceiling came down from 112,000 to
110,000 so the room cannot quietly refill.

## The question

The wizard chain is still the tightest at 91%, and I could not honestly take it lower.
`src/components/wizard/AGENTS.md` is 50 KB on its own. I checked every file, function and test id
it names against the tree and found nothing that had been deleted, so none of it is stale. And
every file it describes lives in `wizard/` or `wizard/steps/`, so splitting it into a child
contract would make a session load both files instead of one - it moves the bytes without moving
the cost.

So the only things left that would shrink it are a decision you make or a code reorganization.
**Is there anything in the creation wizard you consider settled enough to stop writing down?**
For example: the wizard's own contract still spells out the Pro tier's engine behaviour, the SVG
import flow step by step, and the Browse filter drawer's layout - roughly 12 KB between them, all
of it currently true. Or is the honest answer that the wizard is simply the most complex surface
in the product and its contract is supposed to be the longest?

A one-line answer is enough. Nothing is blocked on it - the room bought today is real.
