# 2026-09-01 - session O - the orchestrator contract rebuilt as a modular system

Branch `claude/orchestrator-skill-redesign-a416a6`. Owner-asked, owner-approved: he read the
complete new core file before it was queued.

## What landed

**The procedure is now one always-loaded core plus nine phase-loaded modules.** The single file
had reached 924 lines, every line read on every invocation. The core is 171 lines and holds the
operating model, the safety boundary and its four exceptions, the input priority order, the seven
output sections, the rules that fire while a plan is being written, and a routing table. The rest
moved to `.agent-workflows/orchestrator/`:

| module | lines | loaded when |
|---|---|---|
| `prompts.md` | 188 | writing section 5 |
| `incidents.md` | 156 | you want the evidence behind a rule, or are recording new evidence |
| `night.md` | 139 | a night wave |
| `collisions.md` | 138 | writing section 2 |
| `coherence.md` | 88 | phasing a project, the weekly coherence session, applying a lesson |
| `recovery.md` | 82 | a row came back substantially wrong |
| `grounding.md` | 66 | first, before any other read |
| `report.md` | 51 | producing section 7 |
| `pushback.md` | 28 | writing section 4 |

**The split is by DEPTH, not topic.** A rule that must fire before its module would be loaded
keeps its one sentence in the core and its mechanics in the module - that is why "A GATE LANDS
ALONE" and "QUEUE is mandatory" appear in both, and why nothing else does.

**Two files are new content rather than moved text.**

- **`recovery.md`** answers the owner's second ask: repair, or rewind and redo. It splits on one
  structural fact - has it landed. Unlanded work lives on a branch in its own worktree, so
  discarding it costs the tokens already spent and nothing else; landed work is reverted through
  the queue and never rewritten. The test is three signals, any two of which mean rewind (the fix
  list growing rather than shrinking, a repair that needs to know why the first attempt did what
  it did, more than half the window spent on corrections), plus one sufficient alone - the
  assignment was misread. Mechanics: keep the findings, discard the code; `git branch -m` to
  `-abandoned` rather than delete; fresh worktree off current `main`; a corrected assignment is
  the one required artifact; one rewind per assignment. It is safe inside an orchestrator session
  because a rewind reduces to this session's only verb - write a better prompt, launch a fresh row
  - and never reaches into the failed worktree.
- **`incidents.md`** collects the dated incidents that paid for each rule. Narrative
  justification written inline beside the rules was the single largest source of the old file's
  length, and it is the part a planner never needs and a rule-changer always does.

**The self-improvement loop no longer inflates the contract.** The old "every wave improves this
file" had no counterweight. Four mechanisms replace it, all in `coherence.md`: the lesson edits
the module that owns the rule; the evidence goes to `incidents.md`, not into the rule's paragraph;
a new rule names what it replaced or shrank; and all three properties are gated rather than
trusted.

**The gate.** `scripts/check-shared-instructions.mjs` now treats a canonical workflow and its
module directory as ONE contract - pinned markers and `scripts/` references may live in either, so
splitting the file cannot silently drop a pinned rule and moving a rule between modules needs no
gate edit. `MODULAR_WORKFLOW_LINE_LIMITS` declares the core's limit (orchestrator: 200), and the
gate refuses the three ways a modular contract rots back into one file with extra steps: a core
over its limit, a module nothing links to, and a link to a module that does not exist.

**Cross-references repaired**, in three files that pointed at sections which moved:
`.agent-workflows/check.md`, `docs/ROUTINES.md`, `scripts/wave-tick.mjs`. `docs/AGENT_WORKFLOWS.md`
gained the modular-workflow pattern in "Canonical sources" and in "Adding or changing a workflow".

## What it cost

**Always-loaded lines: 924 -> 171, an 82% cut.** Total across core + modules: **1094**, up 170,
and the growth is entirely the two new files. Nothing that existed was deleted for size.

## `/check` result

- **review: `inline`.** The real risk in a split is a rule silently lost, so the review was a
  mechanical rule-loss diff: every bolded run of 25+ characters in the pre-split file (176 unique
  phrases) checked for verbatim presence across the new core + modules, then every reported miss
  read by hand to separate rewording from loss. Three genuine findings, all fixed:
  1. Section 3 had lost the operational half of its rule - *where* the safe-merge workflow has to
     run when someone says "merge A" to this session (that branch's own worktree, the only place
     its gate can run). Restored.
  2. The `/check`-in-every-session rule moved to `prompts.md` without the evidence that widened
     it from night-only. Added to `incidents.md` as "the branch that /check found nine issues on".
  3. The core's own opening said "a rule that belongs in a module and gets restated here is a
     defect" while the core deliberately restates about a dozen rules. Self-contradictory as
     written; rewritten to state the actual principle (split by depth, one sentence up front,
     mechanics in the module).
- **simplify: `inline`.** Duplication between core and modules was audited pair by pair against
  the depth rule above; every remaining repeat is a one-line rule whose mechanics live in exactly
  one module. Nothing else in the diff earned an edit.
- **verify: `inline`.** `npm run build` green, with the branch stamp checked
  (`[write-version] dist/version.json -> claude/orchestrator-skill-redesign-a416a6@…`) rather than
  assumed. Then all three new gate failure modes were NEGATIVE-TESTED by mutation - core padded to
  211 lines, an unlinked `orphan.md` added, `report.md` renamed in the routing table - and each
  produced its own message; the tree was restored and re-checked clean after every one. That test
  found a fourth defect: the summary line printed "9 module(s), all linked" *while the gate was
  failing on linkage*. A status line that stays reassuring during a failure trains readers to skip
  it, so the summary is now suppressed unless the module checks passed. Re-tested both ways.

## What is UNVERIFIED

- **No test file for the new gate logic.** `scripts/check-shared-instructions.mjs` has no
  `*.test.mjs` sibling, and adding one requires editing `package.json`'s build chain, which
  session F owns this wave. The three failure modes were proven by mutation by hand (above), which
  is evidence but not a regression test. Candidate row for the next wave.
- The gate enforces the 200-line limit for `orchestrator` only. Other workflows can adopt it by
  adding a row to `MODULAR_WORKFLOW_LINE_LIMITS`; none has been assessed for whether it should.

## What is left

Nothing blocking. Two candidate rows, both small:

1. The gate test above.
2. `docs/AGENT_WORKFLOWS.md` "Instruction size" still discusses only the Codex byte chain; the
   modular line limit is a second size mechanism now and that section does not mention it.
