---
v: 1
source: session
raised: 2026-09-03
state: active
branch: -
asked: "the rule that a wave's rows must not share an e2e-affected set landed in the contract; the CHECK that enforces it did not"
---

# Make `wave-plan-check` refuse a wave whose rows share an e2e-affected set

**The gap.** `.agent-workflows/orchestrator/collisions.md` already carries the rule: a row's
forecast `TOUCHES` is compared against the other rows', and an intersection is a collision
(`incidents.md` "two dialogs"). What it does not catch is the case the rule was extended to cover -
**two rows whose `TOUCHES` sets are disjoint but whose `e2e-affected` sets intersect.** Those rows
look independent to every check we have and are not: they plan the same specs, so they queue the
same browser-driving work, and on a RAM-bound laptop that is the collision that actually costs the
night.

**Why it is written down here rather than done.** The rule landed on 2026-09-03; the check did not,
because `scripts/wave-plan-check.mjs` was outside that session's exception list. It was then carried
only in a handoff, and handoffs are consumed - this file exists so the mechanism is not lost when
the handoff is. It is the one item from `2026-09-03-o-orchestrator-owns-it.md` that had no home
anywhere else.

**What the check should do.** For each pair of rows in the plan, derive the specs each row's
`TOUCHES` set maps to (`scripts/e2e-affected.mjs` already does the mapping) and refuse the plan when
two rows share a spec while their `TOUCHES` sets are disjoint - the disjoint case specifically,
because an overlapping `TOUCHES` is already refused as an ordinary collision and would otherwise be
reported twice. A wave that genuinely needs the overlap carries a ruling line, the same escape the
existing collision rule uses.

**Traps for whoever picks this up**, from the session that raised it:

- `incidents.md` headings are cited by exact string from the contract. Renaming one breaks nothing
  mechanically and misleads every later reader. Two citations point at "two dialogs".
- `scripts/check-shared-instructions.mjs` pins several rule phrases VERBATIM as critical markers
  (`CRITICAL_WORKFLOW_MARKERS`). Condensing a section containing one fails the build with a clear
  message - that is the mechanism working, not a bug to route around.
- **The orchestrator's common path is at 639/640 lines.** Any rule added to an every-plan module
  has to move text out in the same change. Budget for it before writing the prose.
