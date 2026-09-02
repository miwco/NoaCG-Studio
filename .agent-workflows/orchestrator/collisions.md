# The collision pass - what can run at once

Done when every pair of rows is either disjoint in `TOUCHES` and `MINTS` or carries a ruling
below, and `node scripts/wave-plan-check.mjs` finds no slot minted twice.

**File overlap is the expensive failure, and a file list alone does not find it** - nor does a
list of paths nobody confirmed, which is not yet a file list at all (`prompts.md`, the
confirmation pass). Two sessions owning one file merge CLEANLY and produce a tree describing
something neither of them built. Do a deliberate pass across every `TOUCHES` set - and then across
the collisions a `TOUCHES` diff calls disjoint.

## The collisions a file diff calls disjoint

- **A scarce shared slot.** Two sessions minting migration `0036`; two re-recording
  `scripts/overflow-baseline.json`; two adding an e2e spec and so both editing
  `scripts/e2e-lists.mjs` / `scripts/e2e-affected.mjs`; two moving a landed goal out of
  `docs/GOALS.md` into `docs/GOALS_ARCHIVE.md`; two touching `package.json`. Different filenames,
  disjoint sets, clean merge, wrong result. **The plan ALLOCATES these up front** - A takes 0036,
  B takes 0037, C owns the baseline re-record - and each is named in that session's `MINTS`.
- **A renamed or re-signatured shared export.** One session changes it, another writes callers.
  Any session that renames or re-signatures something shared is **sequential by construction**,
  whatever the file sets say.
- **A build gate.** **A GATE LANDS ALONE** (the rule is in the core file; the incident that paid
  for it is `incidents.md` "the copy gate landed mid-wave"). An allowlist note in a prompt does
  not cover this - the builder may rightly choose a better design than the planner named.
- **A backlog item filed by a LIVE session is not free work.** An item filed today by a session
  still holding the file it names reads like an unowned task and is the exact opposite. Before
  turning any backlog item into a prompt, check who filed it and whether that session is still
  live - `node scripts/worktree-activity.mjs` names the file, and the item's own git history names
  the branch. If the filing session still holds that file, the work is that session's continuation
  or it waits. Never a second row. Evidence: `incidents.md` "the docs-index backlog item".

**When two sessions do collide on one file, the planner says which version WINS - the later-landing
session resolves with judgement, not with a merge.** A collision settled by whoever happens to
merge second, with no ruling from the plan, is how a clean merge produces a tree describing
something neither branch built. Worked example: `incidents.md` "the docs-index backlog item".

## The machine's limits

**The laptop holds 3-4 CONCURRENT sessions, weighted by what each needs** (~1 GB per session
across hidden child processes): a browser-driving session costs a full slot, a docs/plan session
roughly half. A wave larger than the ceiling is planned as COHORTS - the extra rows carry
`START on slot free`, and the watch loop launches them as landings free capacity. Capacity
succession is NOT a dependency edge: cohorts stay order-free, and any cohort ordering is correct.
This is how a big wave runs all night without the owner starting sessions by hand.

**RAM is a shared resource like the browser slot and the merge queue.** A wave where every session
queues a full catalog battery at once starves the landings. The plan names which sessions carry
heavy local batteries and staggers or trims them: only the AFFECTED gates, cheapest first, and
verification CI can prove stays in CI. Jobs waiting politely on the queue's RAM floor is the
system working; the machine glugging is not.

**One browser-driving job per MACHINE, not per worktree** (root `AGENTS.md`; the override lives
there too). The per-change gate belongs to CI, so the only work needing the laptop's browser is
what CI cannot do - in-browser visual acceptance, the catalog gates (`l3-sweep`, `type-floor`,
`overflow-sweep`, `field-coverage`, `numerals`, `test:e2e:catalog`), benches, and render smoke.
Order those cheapest-first and tell the user to use the `:queued` form of any e2e script.

## The two files every session appends to

These are append-only lists, so N sessions writing at the same offset is a git conflict, and
`auto-merge.mjs` aborts on a conflict and stops - the branch then sits until a person looks at it.
Both are solved the same way, by giving each session its own FILE rather than its own line:

- **the owner queue** - one file per item under `docs/acceptance/owner-queue/`, named
  `<date>-<letter>-<slug>.md`. Never a shared list (root `AGENTS.md` rule 7).
- **the handoff** - one file per session at `docs/handoffs/<date>-<letter>-<slug>.md`, so the
  morning report can collect every session's handoff without the user opening any of them.

## Consuming the handoff folder

**Handoff files are CONSUMED, not archived - git is the archive.** A new plan classifies every
file in `docs/handoffs/` it read, one line each under `## Handoffs` in the wave-state file:
**consumed** (a prompt in section 5 was written from it), **spent** (nothing left worth a prompt -
every open item traced, never invented work), **deferred** (machine-continuable, not this wave -
it stays, and section 4 says why), or **owner** (its open items need a person and have gone to
needs-you or an owner-queue item). `node scripts/handoff-drain.mjs` prints every file with its
class and flags the unclassified and the long-deferred; the plan check refuses a plan while any
file is unclassified. Consumed, spent and owner files are DELETED by the wave itself: exactly one
session's prompt carries the line "delete these handoff files in your first commit: <list>", so
the deletion lands with the successor work, distinct file deletions cannot conflict, and this
session still changes nothing.

**But SPENT is a claim about each open ITEM, not about the file.** A handoff is spent only when
every item it leaves open has been traced to where it now lives - a landed commit, a backlog file,
a contract, an owner-queue item - and the plan records that trace; the file's own "what is left"
heading is what its author believed on the day, not the test. The reference grep covers PROSE
mentions ("see the handoff") as well as paths, because the path grep is the one that feels
sufficient and is not. Deferring costs nothing; a wrong deletion costs the analysis, because the
planner is destroying the only copy and "git is the archive" only helps a reader who already knows
what to look for. Same failure as an unconfirmed path in the prompts: a plausible answer accepted
without the one check that would have falsified it.
