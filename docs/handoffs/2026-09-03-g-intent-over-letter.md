# G - intent over letter

**Branch:** `claude/g-intent-over-letter`, merge-base `d7cc0854`, commits `e1599ba2` and
`6e1cfbfc` plus this handoff. Queued for landing; nothing here needs the owner.

**What was wrong.** The orchestrator turned a number that appeared only in a receipt's own rough
sketch into a binding owner requirement, told a row to name the deviation loudly, and had the row
file it to the owner queue as a decision to ratify or overrule. The owner had never picked the
number. The rule against this half-existed - the core already said a tentative opinion is not a
requirement - but it was scoped to his LIVE words and never reached a frozen artifact.

## The exact wording, both halves

The rule is one bullet in the core's "rules that are never module-deep", because it fires while
the wave table is written, before any module loads. Verbatim:

> **INTENT BINDS, THE DETAIL DOES NOT** - unless the owner made that detail the point, and this
> reaches FROZEN ARTIFACTS as much as his live words. A number in a backlog slug, a paraphrase in a
> receipt's `asked:` line, an implementation sketch in an old handoff, a wording in a title: each is
> paraphrase twice over, so each is EVIDENCE OF INTENT and never a specification. A row that serves
> the intent better by other means DOES, and says so - that is the assignment, not a deviation from
> it, and "better" is measured against what he WANTED, never against what a row would rather build.
> **The detail binds where he made it the point:** a taste ruling, a named date, a figure he
> arrived at himself, an explicit "it must be X". Where you genuinely cannot tell, serve the intent
> and REPORT - never stop to ask, and never file the difference as a decision he owes an answer to.

The counter-half is inside the same bullet on purpose. The obvious wrong version of this rule is a
licence to ignore him, and a rule that only loosens is worse than the literalism it replaces. Two
clauses do that work and should survive any future edit: the named list of things that DO bind
(taste ruling, named date, a figure he arrived at himself, an explicit requirement), and *"better"
is measured against what he WANTED, never against what a row would rather build*.

**The consequence, in `orchestrator/pushback.md`** (section 4's owner), because the queue item is
the part that actually reached him: a detail being served by other means is one line of news in
section 4, and **never in the owner queue as a decision he must ratify or overrule** - that queue
records what he must SEE, it is not a ballot.

**The row-facing half, in `orchestrator/prompts.md`**, attached to the pinned "WHY is a TARGET, not
a route" bullet, since row F did exactly what it was told: a detail quoted into a prompt is
evidence of intent, and the planner says so IN THE ROW, so the row reports the difference in its
handoff rather than writing it up as an owner decision.

## What was moved out to make room

Both budgets were at the ceiling: core 192/200, common path 639/640. **The common path is 639/640
before and after** - every added line was paid for, not banked, and the core sits at 197/200. What
paid for it, all prose compression with no rule removed:

- core: the section-6 tentative-opinion paragraph folded into the new bullet (it was the same rule,
  stated twice at different scopes); the meta paragraph on the DEPTH split, exception 4, the
  receipt paragraph, section 1, section 3 and the ORDER-FREE bullet each one line tighter.
- `collisions.md` -7, `grounding.md` -4, `prompts.md` -3, `pushback.md` -2, all rewording.

**The next line added to any of the six common-path files fails the build.** That is now a gate,
not a warning, and this branch leaves it with one line of slack.

## Also in this branch

- `docs/backlog/README.md`: `asked:` and the filename are evidence of intent, never a
  specification - so the next planner reading a receipt does not repeat this.
- `docs/OWNER_RULINGS.md`, new `owner-decisions-2026-09-03`: the ruling verbatim, plus the two
  autonomy quotes the core and pushback cite (they were pointers to text that existed nowhere).
- `docs/acceptance/owner-queue/2026-09-03-the-budget-fails-loudly.md`: rewritten as news. The
  decision framing and the pull-quote are gone; the 4,096-byte reserve stands, he answered it.
- `orchestrator/incidents.md`: "the 99% that nobody asked for".
- `docs/HARNESS_ROUTING.md` + `orchestrator/routing.md` (asked for mid-task by the coordinator):
  headless `agy` auto-denies the permission a directory walk needs, so a sweep must be handed an
  explicit file list; and a pool's ledger numbers understate it wherever the failure was the
  prompt's. Corrected while writing it: **both** of E's sweeps failed to that auto-deny, not one,
  so both 0/2 first-pass entries for `gemini-3.8-flash-high` are prompt defects.
- `docs/backlog/agents-md-byte-headroom.md` step 4: the source of the whole incident. Its `asked:`
  line never said 99% - the number was in this file's own "What it would take" sketch, which is
  explicitly rough shape. Step 4 still read as an open instruction saying 99%, now corrected to
  what landed and why.

## Where I found the same literalism and did NOT fix it

- **Nowhere else that is currently live**, from a scan of `docs/backlog/` for numbers hardened into
  slugs. Two candidates, both fine: `editor-canvas-1920x1880.md` is the counter-rule working
  correctly - its `asked:` says *"not a paraphrase - the number is off the screenshot"*, so the
  number IS the point; `ograf-checker-83-rules.md` counts an external tool's rules and already
  calls that tool "evidence, not authority".
- **Not audited:** `docs/handoffs/` and the older sections of `docs/OWNER_RULINGS.md` for
  implementation sketches that a future planner could read as specification. The rule now covers
  them prospectively; nobody has swept them.

## Verification

- `npm run build` green on `6e1cfbfc` - branch stamp confirmed `claude/g-intent-over-letter`, not
  `main`.
- CI run **33748535386** on `e1599ba2`, read BY JOB: Factory gates, Build, E2E plan and CI gate all
  `success`. The E2E shards are `skipped` and that is a real verdict, not the cancelled-run trap -
  the plan measured from fork point `d7cc0854`, saw all 11 changed files, and returned
  `mode:"none", specs:[]` because a contracts-only diff maps to no specs. The second commit is
  docs-only in the same way; no product code changed on this branch at all.
- `check: review delegated (high), simplify inline, verify inline`. Review returned six findings,
  all six confirmed against the files and fixed - it caught that compressing prose had broken
  citations, which is the one failure a contract cannot afford. Simplify returned background
  fan-out instructions rather than a result, so that leg ran in this context over its four angles
  and changed two things.
- **The verdict stamp was NOT written.** It belongs at
  `<git-common-dir>/noacg-jobs/checks/claude-g-intent-over-letter.json`, and this session is
  worktree-isolated, so writes to the shared checkout's `.git` are refused. The stamp is
  per-machine state and never committed, so nothing in the branch depends on it - but the landing
  path cannot see this check, and any worktree-isolated session hits the same wall. Worth a
  mechanism if the stamp is ever meant to gate landing.
