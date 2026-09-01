# 2026-09-01 - session D - prompt rigor

Branch `claude/d-prompt-rigor`, two commits, both on `.agent-workflows/orchestrator.md` and
nothing else. Build green on the final state; CI green on the first commit with the E2E plan job
itself deciding no shards were needed (workflow-file change, no product code).

## What landed

**The confirmation rule** (section 5, folded into the existing "Every prompt is a PLAN, not a
dispatch" bullet rather than minted beside it). Before a plan ships, ONE PASS over the finished
prompts confirms every fact in them: every `TOUCHES`/`READ` path grepped and seen doing the thing
its row is about, every command found where its kind lives, every quoted rule copied from the file.
Neither a directory listing nor a plausible name counts. It is deliberately a pass rather than a
virtue, because the failure was care running out at the end of a long grounding read, not ignorance
of care - a pass is checkable in one sweep.

**Its consequence, stated plainly**: `TOUCHES` is section 2's collision instrument, so two rows
called disjoint on unconfirmed paths are not disjoint, they are unanalysed. A guessed path is a
defective section 2 wearing the costume of a typo. Section 2's opening line now says the same in a
clause, where the collision analysis is actually done.

**The receiving session's half**, appended to the existing "WHY is a TARGET, not a route" bullet
rather than as a second rule beside it - the review-step check found that bullet already carried
the same shape (correct the route, do the work, say so in the handoff), so the facts now get the
same treatment: the repo outranks the plan, a wrong file name is corrected, and both names go in
the handoff so the planner's error is visible rather than absorbed.

**The spent rule** (section 2's consumed/spent/deferred passage), from the coordinator's mid-task
correction. Spent is a claim about each open ITEM, not about the file: a handoff is spent only when
every open item has been traced to where it now lives and the plan records that trace; the file's
own "what is left" heading is what its author believed on the day, not the test. The reference grep
covers prose mentions ("see the handoff") as well as paths. Deferring costs nothing; a wrong
deletion destroys the only copy, and "git is the archive" only helps a reader who already knows
what to look for. It closes on one shared sentence naming it as the same failure as an unconfirmed
path, so the lesson is stated once rather than twice.

Adapters (`.claude/commands/orchestrator.md`, `.claude/commands/o.md`,
`.agents/skills/orchestrator/SKILL.md`) were read and left alone: all three are pure pointers with
no behavioral content, so nothing in them disagrees with the shared file. Thickening them to
mention the new rule would have broken the thin-adapter contract in `docs/AGENT_WORKFLOWS.md`.

## What it cost

**Net byte change: +940** (68,317 -> 69,257). Two substantive rules were added, together about
2,350 bytes of new contract text, against roughly 1,400 bytes of repayment. What was cut, and why
each was fat rather than reasoning density:

- a whole duplicated paragraph in section 3 ("Nothing in this section is an offer to merge"),
  saying what the pinned "Section 3 is a report, not a pick" paragraph directly below it says;
- the launch-versus-chip rule stated twice in one paragraph in section 2;
- the delegation bullet's triage ("mechanical bulk edits... a bug still failing after two genuine
  attempts") - superseded by the 2026-09-01 capacity-routing ruling in the same section, and the
  review confirmed the phrase now appears nowhere else in `.agent-workflows/`;
- the dead "this replaces the 2026-08-29 one-delegated-row ration" sentence, history of a rule that
  no longer exists;
- one of two back-to-back owner quotes making the same owner-queue point (the prose still records
  that he ruled twice and unprompted);
- the closing sentence of "No exception touches landing", which re-listed what its own section
  opens with; the Rules-section re-explanation of exceptions 3 and 4, now a pointer; a duplicated
  section-6 enumeration of what still waits for the owner; and three shorter restatements.

The instruction-chain byte gate does **not** cover this file - I checked rather than assumed, as
the prompt asked. `checkInstructionChains` in `scripts/check-shared-instructions.mjs` walks
`AGENTS.md` files only. What that script *does* enforce on this file is `CRITICAL_WORKFLOW_MARKERS`:
about 38 literal strings that must appear verbatim in `.agent-workflows/orchestrator.md`, several
of them inside passages I trimmed. Every cut was checked against that list first, and the gate is
green. Anyone cutting bytes here next should read that list before touching a sentence.

(Unrelated, from the same gate's report: `src/components/wizard/AGENTS.md` is at 110,050 of 112,000
bytes, 98.3% of the chain budget. Not mine to fix, and sessions B and C hold that area, but the
next coherence session should know it has 1,950 bytes of headroom.)

## /check

`review: delegated` (7 findings, 7 addressed) - the code-review skill returned findings inline and
named this worktree's branch and merge-base, so it passed the phase-1 scope check.
`simplify: inline` - the skill returned fan-out instructions rather than a result, and in a launched
session those completion notifications route to the launcher, so the four angles were covered here;
2 tightenings applied to my own new text. `verify: inline`, `npm run build` green on the final
state. Verdict stamp written to the job store at `checks/claude-d-prompt-rigor.json`.

The review's findings were substantive, not cosmetic, and one was serious: the confirmation pass as
first written ran *after* the section 2 collision analysis it exists to protect, with nothing
sending a correction back through it - so a corrected path could still ship an unanalysed wave. The
rule now says corrected rows go back through section 2. It also caught that the rule named
`package.json` and `scripts/` as where commands live, which would have returned a false
"does not exist" on `/check` and `/queue-merge` - the two commands in 100% of prompts - and that
the pass contradicted the tiered reading budget in "How to ground it", which now licenses it
explicitly as a routing read.

## The owner's question: "it's a bit worrying that we keep finding them"

Honest read: this is the gate working, and the composition of the findings is the evidence rather
than a reassurance. On this branch 6 of the 7 findings were defects I had introduced in the commit
under review; exactly 1 was pre-existing (the opening line said "two bounded exceptions" where the
section enumerates four - introduced by `cdbe09e6`, unrelated to this work, fixed here because it
sits in a section this change edits). That is not archaeology turning up old debt, it is a review
catching fresh mistakes before they land, which is the outcome the check was widened to produce.
For the 9-finding branch I only have what the contract itself records - nine real issues, eight
fixed, including a Windows-only path bug invisible locally and red on CI - and a Windows-only path
bug is likewise that session's own new code, caught before CI had to say it twice.

Is the first pass getting worse? Nothing available supports that, and two structural facts explain
the counts without it. First, `/check` only became mandatory for every wave session today, so these
are the first branches ever measured; 7 and 9 are the first two data points, not a trend, and there
is no earlier number they are worse than. Second, wave prompts are deliberately big multi-step
assignments now, so one branch carries what used to be two or three sessions' work - findings per
branch rose partly because branch size rose. Findings per unit of work is the number that would
answer him, and nobody has it yet.

The part that genuinely deserves his unease is narrower: the counts say a first pass ships defects
its own author cannot see, and on this branch the most serious finding was a design flaw in the very
rule I was writing to prevent design flaws. But that is an argument for the review leg existing, not
against the work. Worth adding that prose contracts should be expected to score high here
specifically: a contract's defects are cross-references and internal consistency, and 6 of my 7 were
"this sentence now contradicts that section" - the exact class no compiler, lint rule or build gate
can catch, which is why the review leg earns more of its keep on this file than it would on typical
code. The verdict stamps now written per branch make findings-per-branch a real series for the first
time, so in a few weeks this is answerable with a number instead of a feeling.

## What is left

Nothing outstanding on this branch. No owner-queue item: nothing here is observable in the product.
