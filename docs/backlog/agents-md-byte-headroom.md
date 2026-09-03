---
v: 1
source: owner
raised: 2026-09-01
state: active
branch: claude/e-agents-md-headroom
asked: "give the AGENTS.md byte budget real headroom - asked for by name; for the next few months the owner is the authority on what gets condensed or removed from any AGENTS.md: propose the cuts, he rules"
---

**2026-09-02 - steps 1-3 done; steps 4 and the wizard chain remain.** Relocation took the chains
printing the 80% warning from 17 to 9 and the tightest TEMPLATE chain from 92.1% to 85.9%, by
giving all nineteen template categories and four `src/ai` subdirectories their own contract. The
proposed deletions are `docs/acceptance/owner-queue/2026-09-02-e-agents-md-cuts.md`, awaiting the
owner's ruling. Two things are NOT done. **`src/components/wizard/AGENTS.md` still has 1470 bytes
free (98.7%) and no relocation left in it** - its step and shell rules share `draft.ts`,
`WizardPreview` and `CreationWizard` state, and its files already sit in `steps/`, where moving
deeper buys nothing; only a ruled deletion or a code reorganization moves it. And **step 4 below
became its own row**, because a build gate cannot be promised as a wave's last landing
(`docs/backlog/wave-last-landing-unenforceable.md`).

**2026-09-03 - the headroom and the loud failure both landed.** The root contract gave up 11,343
bytes, every one of the 52 chains felt it, and the ceiling ratcheted 112,000 -> 110,000; the wizard
chain went from 365 bytes free to 9,708. `scripts/check-shared-instructions.mjs` now FAILS the
build once a chain has less than 4 KB free. What remains of this receipt is the owner's ruling on
the wizard cuts, which is why it is still open.
**2026-09-04 - all four ruled cuts are applied, and the 85% target is measurably out of reach.**
The wizard chain went 100,292 -> 97,549 bytes (91.2% -> 88.7%), the templates chains 79.5% ->
77.2%. That is the whole of what the ruling buys, and the shortfall is a measurement, not a
shortcut: a sentence-coverage pass over the rewritten Import/SVG block found **4 of its 54
sentences** present in `docs/SVG_IMPORT_PLAN.md` or `docs/IMPORT_MVP.md`, and all four are rules
the ruling says to keep. The wizard's contract is not restating those plans; it states rules they
do not hold. **So the four cuts are done and this receipt's byte ask is not reachable from them.**
What is still true from 2026-09-03 stands: the file is not stale, and it has no split, because a
child contract under `wizard/` loads on TOP of it rather than instead of it. The remaining levers
are a code reorganization that moves the import steps out from under this contract, or content
`src/components/AGENTS.md` gives up - and neither is a byte problem, so neither should be started
to make a percentage. **The percentage is retired as the measure; free bytes is the measure**, and
the chain now has 12,451 free where it had 365 on 2026-09-02.

# Give the AGENTS.md instruction chains real headroom, then make the warning fail loudly

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row F, never launched).
**Source:** owner ask by name, 2026-09-01. **Lands ALONE, or as a wave's designated last landing** -
it tightens a gate every branch meets.

## Why

`npm run check:shared-instructions` prints the tightest Codex instruction chains against
`project_doc_max_bytes` and marks any past 80%. On 2026-09-01 seventeen chains printed that
warning, which is why nobody reads it, and it has already red-gated one branch: two siblings each
added a few hundred bytes to contracts on one chain, and the one that integrated second wore a
failure that was not its own. Headroom is bought by MOVING content off a shared ancestor into the
one nested contract whose files it describes (`docs/AGENT_WORKFLOWS.md`, "Instruction size"); a
sentence a session never needed stops loading for every sibling.

## What it would take

1. Re-measure first: run the check and quote its own numbers - never a figure from a plan.
2. Buy headroom by moving root and shared sections into the nested contracts where they fire.
   No taste ruling is needed for a move.
3. Propose deletions, do not take them: one owner-queue item listing each proposed cut and what
   is lost. The owner rules (his 2026-09-01 ruling above).
4. Only once the bought headroom is comfortable, make the warning FAIL. Failing the check before
   the headroom exists red-gates every branch in flight, which is the failure this row exists to
   prevent. **Done 2026-09-03, at a 4,096-byte reserve rather than the 99% this step first
   sketched** - the ceiling only ratchets down, so a percentage tightens on whoever just cut a
   chain, and 99% of 110,000 leaves about four paragraphs to work in. The 99% was this file's own
   rough shape and was never the owner's ask; reading it as one cost him a decision he should not
   have been asked for (`.agent-workflows/orchestrator/incidents.md`, "the 99% that nobody asked
   for").

## Evidence

The check's own report is the measurement; on 2026-09-02 the tightest chains were the
`src/templates/*` category contracts at 84-86% of the budget, because every category loads the
67 KB `src/templates/AGENTS.md`. Memory `next-wave-candidate-rows` row 1 carried this ask until
this receipt replaced it.

## RULED, owner 2026-09-03: a contract points at the file that owns a rule

Asked whether `src/components/wizard/AGENTS.md` should keep its restatements of the Pro tier
engine and the SVG import flow, or point at the files that own them:

> point at the files that own them

**This settles the proposed deletions.** Four of the five were the same shape - a decision written
down twice - and the ruling covers all of them:

1. The Browse storefront's Option A decision, stated in `src/templates/AGENTS.md` and again in the
   wizard's Browse block -> keep the wizard's, since the step is where it is drawn; the templates
   copy becomes a pointer.
2. THE STAGE's two measurement narratives, whose own first line already names
   `docs/FOOTPRINT_STABILITY.md` as the full contract -> keep the rule, the exceptions, the
   mechanism and the gate names; the stories become a pointer.
3. The wizard's Import-graphic and SVG block, which cites `docs/SVG_IMPORT_PLAN.md` sections and
   then restates them -> keep every rule and every "this is what broke" line; the step-by-step
   narrative becomes section pointers.
4. The wizard's Pro engine restatement, which the file itself says belongs to `src/ai/AGENTS.md`
   -> keep the door, the package question and the two rules that live outside the step; cut the
   engine description.

The fifth was never a deletion: the root trims landed 2026-09-03 by MOVING the prose.

**The reason to record, because it outlives these four cuts:** the argument is correctness, not
size. Two copies of one decision drift, and then a session reads the stale one. A contract states
the rules its own directory owns and points at the file that owns anything else. Size is the
symptom that made it visible.

**Still true and not overruled:** the wizard is the most complex surface in the product and its
contract is supposed to be the longest. Settled rules stay written down. Only duplication goes.

The work is row E in `docs/handoffs/2026-09-03-next-wave-svg-and-style-rulings.md`.

### And what a contract may forget - owner, 2026-09-03

On the four things the 2026-08-29 condense pass deleted with no other home (a commit sha, the size
of a file before it was split, a command name, and the job-runner weights):

> No. Leave all four out. The historical details don't affect current behavior, and the two
> operational facts already live in the docs where a session would need them.

**Two tests, and they are the general rule:** does it change what someone does now, and would the
session that needs it already be in the file that holds it. Trivia about our own history fails the
first. An operational fact stated in the doc a session opens to do that work passes the second, so
the contract does not need a second copy.

This is the same rule as "point at the file that owns it", applied to deletion instead of
relocation.
