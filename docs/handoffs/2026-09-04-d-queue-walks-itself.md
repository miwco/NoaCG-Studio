# The queue walks itself - what was settled, what was re-kinded, what the walk found

**Branch:** `claude/d-queue-walks-itself`. **Date:** 2026-09-04.

## The headline

**The owner's walk lists went from 20 items to 6**, and every one of the six genuinely needs him:
four that ask whether shipped work is any good, two rulings that point the product different ways.
Nothing marked `owner-action` (8) or `hardware` (4) was touched, and neither was anything carrying
`serves: now`.

**And the walk was worth doing for what it caught rather than for what it cleared.** Two items
claimed things that are not true, and one of them is a live on-air defect. Distrusting the file and
driving the product is the whole value of this row.

## READ THIS FIRST: a counting graphic airs a zero

`docs/backlog/a-counting-graphic-airs-a-zero.md`, `state: unstarted`, and **it should be a row in
the next wave rather than a line on a shelf.**

A Rising Total taken to Program reads **€0** and never counts. The panel animates, the text fields
arrive, and the figure is dead for as long as the graphic is on air. Pressing Update repairs it;
the next take breaks it again. Deterministic, reproduced on every take on a plain dev server.

It is a REGRESSION, from the fix that removed the one-frame flash of the old figure - so a
fundraising total has been showing zero on air since `976a96ba`, and the queue item that describes
that fix says the opposite. The suspected mechanism, the reason it is probably the whole counting
class rather than one design, and the sweep list are in the file. **The gate section is the part to
read**: the existing spec already asserts landing, and the reason it did not catch this is that its
oracle reads the expected value out of the same `data-target` the bug corrupts, then skips any
readout whose target parses to zero. Anyone who adds a landing assertion will have written a
redundant test and left the hole open.

`src/templates/` was live under other rows tonight, which is why this is filed rather than fixed.

## Settled and deleted - 15 items

Each one's commit message says what was checked and what was seen, which is where the evidence
lives.

**Driven in the product, on a dev server:** the wizard's exit and re-entry (the door asks first and
names the rundown, Cancel leaves the store holding one migration marker and nothing else, coming
back into a walk replaces rather than duplicates, the header rewind starts a new graphic and the
library gains one instead of losing one); the route flash (`/app` paints Home on its first frame
over three reloads, a production deep link paints the production); the ticker kickers (Market Board
and Index Strip both draw the tag with no markup in the crawl); the vote board's status field (a
Finnish count line does not take the badge down, the status field does, and the pre-field fallback
still works).

**Driven on https://noacg.studio**, which serves `332e8b56`: the consent banner is z-index 80 and a
hit test at the centre of "Add it and go there" returns that button while a hit test on the banner
returns the dialog's backdrop, so the click lands and the notice is behind the dimming; a reset
link's `#access_token` survives the boot in a browser that has made nothing; the editor stage
paints the graphic and Play runs it, which closes the 2026-08-27 blank-stage report.

**Decided rather than asked**, because each had a defensible general answer: the cleanup tool's
refusal wording and its two-hour idle window; the CLI-first, MCP-optional install story and whether
three seconds a verb is acceptable; whether a grouped count reads better than a bare one; the AI
door's caution copy; the delegation ledger's two judgement calls.

**Verified by running it:** the reclaimer's three groups and its refused list; the delegation
outcome report, whose first line now sums and whose rate is stated only over the rows that are
evidence about a worker; the worktree cleanup dry run, which refused every live worktree by name.

## Still open, and why

- **`2026-09-03-rising-total-plays-from-zero.md`** (`agent`) - the on-air zero above. Half the item
  is right: there is no flash of the real figure before the zero. The other half is worse than what
  it replaced.
- **`2026-08-29-space-over-the-stage-plays.md`** - **re-kinded BACK to `walk`.** It went to `agent`
  on 2026-09-03 on the reasoning that whether a key plays a graphic is a fact. An agent then tried
  and could not: a night session drives a hidden browser pane, Chromium throttles
  `requestAnimationFrame` there to about a frame a second, and a 1.34 s entrance is
  indistinguishable from an out. Everything else in that walk succeeded. **One minute at a real
  screen finishes it**: settle a graphic, put the pointer over the stage, tap Space.
- **`2026-08-30-e-live-percentages-...md`** (`agent`) - everything driven and true except one
  surface. The checkbox works both ways (figures dark on "Wait for Show result", 50/25/25 with the
  badge still up on "Update live while voting"); five options against three drawn rows give three
  bars each reading a true 7.7% and **Call the winner marks nothing**, while three rows with the
  third winning marks row three at 81.8%. What is left is the operator's overflow warning, which is
  a production-dashboard surface, and the item carries the two-minute recipe.

## Five things filed, beyond the counting bug

- `an-inline-ticker-kicker-leaks-onto-the-lines-below.md` - a story tagged inline also tags every
  bare line under it, so `DOW JONES` typed under a `MARKET REPORT:` line airs as MARKET REPORT.
  `docs/TICKERS.md` publishes a table promising "one story, tagged SPORT" for that form. The docs
  are right and the parser should follow; the reasoning and the patch are in the file, and the
  patch has to CLOSE the open run as well as tag its own line.
- `the-google-sheet-route-is-behind-the-editor-toggle.md` - of the three live-data routes, the only
  one behind Advanced mode is the spreadsheet, which is the one a non-technical operator wants. The
  action is pasting a URL; what is advanced is the box's address. It should sit in the production's
  Data tab beside the API key. **Decided, not asked.**
- `the-watchdogs-behind-the-ram-reclaimer.md` - the writing the reclaim item offered to do if
  somebody said the word. Adobe about 400 MB, WD about 100 MB, ASUS 23 MB and not worth it, with
  the correction that the two holding the memory are startup entries rather than services.
- `two-unset-harness-knobs-...md` - `--max-budget-usd` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`,
  rescued from a handoff swept while it still had them open.
- `bootstrap-prompt-names-a-failure-doctor-does-not-have.md` - the pasted setup prompt describes a
  `doctor` failure `doctor` does not produce, and npm serves `@noacg/cli` 0.2.0 against a 0.3.0
  checkout, so every reader runs something older than the page is checked against.

## Two contracts changed

- **`docs/acceptance/OWNER_QUEUE.md` now says when re-kinding is legitimate.** This branch converted
  14 items from `walk` to `agent` and then deleted 12 of them, and nothing in the contract said when
  a session may do that - which means any owner item could be converted and deleted by the same
  session, emptying the queue without anybody looking at anything. Three conditions now: the
  re-kind states which half of the test it met, the conversion and the deletion are separate
  commits, and `owner-action` and `hardware` are never converted. Plus the lesson from the Space
  item: an `agent` item no agent can finish is worse than a `walk` item, because it sits on a list
  he is never shown.
- **The owner's design-default ruling reached `.agent-workflows/orchestrator/pushback.md`**, which a
  2026-09-03 handoff assigned to this row and which was the last place it had not landed. It went in
  as one clause rather than a bullet, because **the orchestrator common path was at exactly 640 of
  its 640-line budget** - so two sentences that restated the section's own closing rule came out to
  pay for it. Anyone adding to that file next has no headroom at all.

## Verification

`npm run build` green on `d0fbd50d`, branch-stamped so it gated this branch and not `main`.

`check: review delegated (10 findings, 9 fixed), simplify inline, verify inline` - the verdict stamp
is at `.git/noacg-jobs/checks/claude-d-queue-walks-itself.json`. The simplify skill returned fan-out
instructions rather than a result, so by the workflow's own rule that pass did not run and the four
angles were covered in this context. **No e2e ran and none maps**: the diff is documentation, one
orchestrator workflow file and the owner queue. Observable behaviour was checked by driving the
product, which is this row's entire job.

The review's own catch worth repeating, because it is the shape of thing this row exists to find:
the first draft of the counting backlog file blamed the wrong commit and told the next session to
add a gate that already exists. A confident write-up of a real bug can still send the fix in the
wrong direction.

## What a next session should do

1. **Fix the on-air zero.** It is the most serious thing found tonight and it is a regression.
2. **Walk the Space key** - one minute at a screen, and it closes a report first filed 2026-08-27.
3. Finish the live-percentages overflow warning, two minutes, recipe in the item.
4. The three product findings above are all decided and unstarted; the ticker one is smallest.
