# Row Q: receipts that advance, and a shelf that stopped lying about what is undone

Branch `claude/q-receipt-advancement`, from `main` at `1765fcfe`. Five commits. The row served two
backlog items and deleted both of them, which is the convention it exists to enforce:
`receipts-confuse-an-ask-with-a-finding` (his ask) and
`owner-receipts-do-not-advance-when-their-work-lands`.

## What is true now

`node scripts/owner-receipts.mjs` prints two sections. **Owner asks** counts what still stands;
**Findings raised while serving them** is our own bug list, quoted under `found:` rather than
`asked:`, and no plan has to account for one by name. The count went from "42 open, 34 unstarted"
to "35 receipts, 27 standing asks, 3 findings", and the difference is not bookkeeping: eight of the
34 were finished and six more had landed work sitting under `unstarted`.

Receipt format version 2 carries `kind:` (ask | finding), the state `advanced` (work landed, the ask
stands, nobody owns it), `programme:` beside `branch:` for work a programme owns, and
`source: derived` for a file that quotes him without being his ask.

## The decisions I made, and why - argue with these rather than re-deriving them

**`advanced`, not row F's `answered`.** "Answered" is right for
`cloud-sessions-for-stateless-rows`, where a question got a measurement, and wrong for the twelve
others, where nothing was answered and a piece of the work simply landed. `advanced` is true in both
and it reads correctly in a listing. It requires a `note:` naming the commit and what is still
missing, on the same rule that already makes `parked` require one.

**A finding's quote lives under `found:`, not just behind a `kind:` field.** A reader greps the
file, not the schema; leaving his defect report under `asked:` would keep the exact shape he
objected to. `--check` refuses a finding that carries `asked:` at all.

**Borderline rows are filed as ASKS, deliberately.** Printing our bug under his name costs an
argument nobody has; losing a real ask costs the thing the receipt exists to prevent. Only six of
42 were classified as findings, and three of those have since been closed. The three that remain
are `editor-canvas-1920x1880` (his screenshot of a broken editor), `live-vote-fields-that-do-not-work`
("I broke the graphic now") and `signed-in-looks-identical-to-signed-out` ("just a note for us").
**The review pushed back on all three** - they leave the wave plan check's mandatory set, so a plan
that omits them now passes. I kept the classification, because that is exactly what he asked for,
and closed the visibility gap instead: the session-start hook prints the finding count beside the
asks. If he reads the walk item and says one of them was an ask, move it - that is the one
judgement in this that is his.

**A version 1 receipt is NOTED, never refused.** This is the change I would most expect a later
session to want to tighten, so here is the argument. Three branches were in flight while this
landed, and `claude/new-session-54bf87` is carrying four new backlog files written against the old
shape. A strict gate would have turned all of them red on their next merge of main, for a line their
prompts never saw, and the red would have read as their fault.
`scripts/check-owner-queue.mjs` states that rule for its own directory in so many words, and it is
why this landing is order-independent rather than needing to be last.

**The eight served receipts were DELETED, not marked done.** "Landed is not a state" is the existing
convention and `--closed` reads them back out of git. Roughly twenty comments in `src/`, `e2e/` and
`docs/` cite a `docs/backlog/<slug>.md` that no longer exists; that is not a broken link -
`check-contract-freshness.mjs` exempts this directory on purpose - and the backlog README now says
how to read one back. I chose not to rewrite those twenty citations; the review raised it as a low
finding and I judged the churn worse than the paragraph.

## Evidence that exists in no repo file

**The per-receipt survey.** Every one of the 34 unstarted receipts was checked against `origin/main`
one at a time. Verdicts I acted on are in the commits. Three I deliberately did NOT move, and the
reasoning is only here:

- `run-a-real-audience-vote` and `graphics-without-a-ready-made-template` each had exactly one
  bullet of "what it would take" land as a side effect of the scoreboard row (`84cd2e47` published
  the layer conventions in `docs/SVG_AUTHORING.md`). Read strictly by the `asked:` line, both are
  untouched. Left `unstarted` rather than dressing an incidental doc paragraph as progress.
- `style-step-palettes-match-graphic` is `advanced` on part 1 (`59380da0`), but its file was
  REWRITTEN after part 1 landed, so its current text already asks only for what is left. If someone
  reads the note and the body as describing the same thing, they will double-count.

**`fit-ladder-exhaustive-sweep` is `advanced`, not closed, on one missing piece**: `6b6c19d4` landed
the whole-corpus ladder sweep, and nothing runs it on a schedule - no `--ladder` reference exists in
`.github/workflows/`. That is a small, well-shaped row for anyone with a spare slot.

**Rows R and S were live with zero commits when this landed.** I did not mark
`mistake-trigger-hooks` or `more-behaviours-than-poll-and-quiz` `active` on their branches, although
that is what the format wants: a receipt's state is its owning session's to set, and writing it for
them would have put a claim in the file that their landing then has to answer. Those two sessions
should set it themselves when they queue.

## Traps

**The landing preflight can now refuse a branch.** `safe-merge-preflight.mjs` phase 1 fails when a
receipt names the branch in `branch:` and the branch's diff does not touch that file. It is fatal
and it is narrow - it never guesses from a branch NAME, so a receipt nobody marked `active` is
invisible to it. The fix is always one line in one file, and the refusal message lists the four
answers. If it ever fires wrongly, `node scripts/owner-receipts.mjs --serves <branch>` shows the
same reckoning without a landing attached.

**`--serves` and the preflight read deleted receipts back from `main`, not from the working tree.**
They run in the branch's own checkout, where a receipt the branch correctly closed is already gone;
without that read, every successful close was announced as somebody else's file. `receiptsFor` is
where that lives, and a unit test that hand-feeds a receipts array will not catch a regression in it.

**A receipt is invisible to the gate unless somebody marked it `active`.** That is the deliberate
limit, and it is the argument for marking one `active` the moment you pick it up.

## Verification

- `npm run build` green on `e536bd71`, stamped `dist/version.json -> claude/q-receipt-advancement@a54ab99a06`
  on the run before the last commit and re-run green after it.
- `/check`: **review: delegated** (7 findings, 5 fixed, 2 answered in writing above),
  **simplify: inline** (the skill returned fan-out instructions, so the leg was done here - two
  cleanups: one `stillOpen` predicate instead of two copies of the state set, and one git-read
  helper instead of four spawn sites), **verify: build green**, **taste: not applicable** - nothing
  here can move what a graphic looks like. Verdict stamp written.
- `node scripts/e2e-affected.mjs --json` plans mode `none`: no product code changed.
- CI dispatched on the exact sha: run `33963612377` on `e536bd71`. **I did not read its result** -
  it was still queued when this session ended, and the landing gate consumes a run for that sha
  anyway. The push's own run (`33963612895`) was cancelled by the dispatch, which is the documented
  concurrency race in the harmless direction.

## Pointers

- `scripts/owner-receipts.mjs` - the header carries the whole vocabulary and both incidents.
- `docs/backlog/README.md` - "An ask is not a finding", "The states", and how to read a closed
  receipt back out of git.
- `.agent-workflows/queue-merge.md` - "Which receipt does this branch serve?", the four answers.
- `docs/acceptance/owner-queue/2026-09-05-your-asks-and-our-bugs-are-two-lists.md` - the walk.
