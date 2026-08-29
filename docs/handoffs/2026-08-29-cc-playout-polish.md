# Handoff - three playout-walk findings, fixed

Branch `claude/cc-playout-polish`. Written 2026-08-29. Three findings from the owner's morning
walk of the playout surface, in his priority order.

The standing rule for this surface, quoted this morning: *"triple-check that all the changes we
make to the playout client have a clear why... It has to be very, very reliable, and we're going
to be updating and improving it all year."* Every change below has its why in the commit and in
the code's own comments. Nothing here was pushed through on a hunch; the one thing that needed a
judgement call is argued in full in section 1.

---

## 1. A running countdown ignored Update - fixed, and the semantics are now stated

### The repro, before anything was changed

Confirmed by reading the emitted runtime and then by a failing spec, not by guesswork. The shared
countdown engine (`src/templates/shared/clock.ts`) reads its length exactly once, in
`startClock()`. Both `update()` handlers that touch it were gated the same way:

```js
// startingSoon/shared.ts, and near-identically in gameTimers/shared.ts
if (!clockTimer) {           // ...only when the clock is NOT running
  clockSecondsLeft = clockSeconds();
  renderClock();
}
```

So while the graphic was on air the new value was written into the hidden holder and then
ignored until the next `startClock()`. That is exactly what the owner saw on **ss11 "Doors
Open"**: change **Countdown (minutes)** (`f2`), press Update, nothing moves; take it out and back
in and the new time appears. Imported-SVG countdowns were worse - they had no repaint at all, so
even the IDLE preview ignored a changed duration.

### The decision: Update DOES re-arm, and here is the argument

The owner's operator story says a timer's duration is set beforehand and starts on take, and his
expectation on air is that Update re-arms the clock. Those are not actually in tension, and the
recommended reading is the right one:

- **`docs/STATE_MACHINE_SCHEMA.md` forbids data updates causing TRANSITIONS, not data driving
  DISPLAY.** Re-deriving a countdown is not a transition: no state is entered, no timeline plays,
  the graphic does not move. It repaints a number derived from a field, exactly as a name field
  repaints a name. The rule the schema is protecting - "state changes come only from events" -
  is untouched.
- **The intent was already in the code.** The idle repaint above says out loud that the length is
  data that should show up as soon as it is written. The `!clockTimer` gate is the accident, not
  the design.
- **The catalog already disagreed with itself, and the house had already settled this once.**
  `matchClockUpdate` (the sports match clock) and `speakingClockUpdate` (the debate clock) have
  always adopted a changed value on the wire, mid-run. `e2e/sports.spec.ts` even carries the same
  pair of assertions this fix now has - *"an operator can correct the clock on air by typing into
  it"* and *"a score bump on air does not pull the running clock back"*. The countdown was the odd
  one out, and its runtime is the only one that had no answer for the second question.
- **The alternative is worse on air.** Without this, correcting a countdown means taking the
  graphic off and back on - the one thing an operator cannot do to a screen the audience is
  watching.

**The broadcast-safety concern is real, and it is not "should Update re-arm" - it is "must an
unrelated Update NOT re-arm".** If every press restarted the clock, a text correction during a
show would reset the count, which is far more dangerous than the bug being fixed. So the fix is
gated on the clock's OWN fields having changed, compared as raw field TEXT (the derived seconds
are useless for this: a start-time clock derives a different number every second). That guard is
asserted in both directions and mutation-tested - see below.

### What changed

- `src/templates/shared/clock.ts` - new `clockDataUpdated()`: re-derives for a running, paused or
  idle clock, only when `clockFieldSignature()` moved. A running clock re-anchors its deadline; a
  PAUSED clock takes the new length and stays paused (pause is a state, length is data, and
  neither may move the other - hence the new `clockPaused` flag, since "no interval" previously
  meant both "stopped" and "held"); a finished clock drops its `-done` styling but still waits
  for the next Take rather than starting itself.
- `src/templates/startingSoon/shared.ts` and `src/templates/gameTimers/shared.ts` - both
  hand-written repaints replaced by the one call. They had already drifted: one read
  `clockSeconds()` and the other `clockDurationSeconds()`.
- `src/templates/importedDesign/svg.ts` - gains the same call as an `update()` hook when a layer
  is bound as a countdown. It had none.

Because the fix is in the EMITTED runtime, it holds identically in the editor preview, an
exported overlay, the dashboard and under SPX. It covers every starting-soon countdown, all six
game timers, and imported-SVG countdowns.

### The sweep

Every timer engine in the tree was checked:

| Engine | Verdict |
|---|---|
| `shared/clock.ts` (starting soon, game timers, imported SVG) | **was broken, fixed** |
| `shared/matchClock.ts` (sports boards) | already re-derives via `matchClockUpdate` |
| `scoreboards/debateFloor.ts` (dc01) | already re-derives via `speakingClockUpdate` |
| wall-clock painters (bug02, tk05/tk06, specialist LTs, al08) | no duration field, nothing to fix |
| `src/blocks/registry.ts` "Countdown timer" block | **same class of bug, deliberately not fixed** |

That last one is a real divergent copy: it decrements once per tick instead of anchoring to a
deadline, reads its field once inside `startCountdown()`, and hides the field with an inline
`style="display:none"` that the editor's entrance reset undoes (against the catalog-wide rule in
`src/templates/AGENTS.md`). It is an offline AI-stub block that nothing currently calls, so
folding it onto the shared engine is its own change rather than scope on this one. **A background
task is queued for it.**

### Coverage

- `e2e/holding-pack.spec.ts` - drives ss11 directly: on air from 30 minutes, Update with a new
  duration re-arms to it, an Update carrying only a headline leaves the count where it is (read
  back to back so no tick can land between), and a start time set mid-run wins over the duration.
- `e2e/graphic-types.spec.ts` - the paused case on the `countdown` type: a held clock takes a new
  length and does not un-pause itself.

**Both mutation-tested.** Restoring the old `!clockTimer` gate turns the first red at
`expect(r.rearmed).toBe(300)`; dropping the `|| changed` from the paused branch turns the second
red. Neither is vacuous.

### Baselines

`e2e/catalog-baseline.json` moves for exactly 21 designs - gt01-gt06 and the 15 clock-bearing
starting-soon designs. `ss08`/`ss09` (no clock) and `e2e/catalog-render-baseline.json` do not
move at all, which is the evidence that nothing about the drawing changed.

---

## 2. "output not seen lately" with no output configured

The readout is the browser-output renderer's heartbeat, and it was shown on every PUBLISHED
production. Publishing mints the output slug whether or not anybody wants a browser output, so
the slug can never answer "is there an output here" - and a header reading *output not seen
lately* beside a production with no browser source anywhere reads as a fault.

- `Show.outputOpenedAt` (additive optional, no version bump) records that the operator actually
  TOOK the output URL - copied the link, or downloaded the SPX/CasparCG template file, which is
  the same URL in a file. Cleared on unpublish, because a re-publish mints a new slug and the old
  browser source will never report in again.
- The readout appears only when that stamp exists or a renderer has ever reported in.
- Wording says what the state IS; each state carries a hover saying what to DO. One line each:
  `● output connected` / `○ output not answering` / `○ output not loaded yet`.

`e2e/productions.spec.ts` now asserts that published alone is not enough, and that taking the URL
is what makes the line appear with the right words and tooltip.

**One thing to judge on the walk**, flagged in the owner-queue item: forgetting the stamp on
unpublish is a deliberate choice. If he would rather it kept saying something, that is a one-line
change.

---

## 3. + New graphic: left on every surface, and still blue

The 2026-08-28 change fixed the ORDER of the Home / + New graphic pair but left the pair itself
at the far right on three surfaces out of five - which is why the owner found it right-clustered
on the playout page and on Home.

The trio now opens every header, before the bar's `.spacer`: **logo, Home, + New graphic**.

Which control is Home differs by surface, and that is not drift: on Home the crumb beside the
logo says Home (so there is no Home button - you are on it), and on the production dashboard the
logo IS the Home door. The e2e assertion names the Home control per surface rather than assuming
one selector.

It keeps the plain (blue `--bg-3`) button look everywhere. Home's copy was the only one wearing
`primary`, which is amber - the on-air accent (Brand §3). Creating a graphic is not an on-air act,
and the owner ruled *"I like the blue one, it doesn't need to be yellow."*

`e2e/project.spec.ts`'s adjacency test now covers all five surfaces and asserts three things per
surface: the door follows the Home control, the door precedes the spacer, and it is not amber.
**The spacer half is the assertion that was missing** - adjacency alone was satisfied by the pair
sitting together at the far right, which is exactly the state the owner complained about.

One consequence worth a look: on the production dashboard the door moved from beside `■ All out`
to the opposite end of the header. The old comment argued for keeping it far from the panic
control; moving it left keeps that property and improves it.

---

## Gates

- `npm run build` green (typecheck + lint + build + the config/copy checks), stamped
  `claude/cc-playout-polish` - the branch stamp read before trusting it.
- `e2e/catalog-baseline.spec.ts` re-recorded and green (4 passed).
- `e2e/holding-pack.spec.ts`, `e2e/project.spec.ts`, `e2e/graphic-types.spec.ts` - 23 passed.
- Two mutation runs, each red on exactly the intended assertion; source restored and rebuilt.
- `npm run test:e2e:focus:queued` - **800 passed** (16.0m).
- Then, because the review pass edited source WHILE that run was in flight (Vite re-serves the
  changed module, so the tail of a long run is not measuring the tree its head was): a second run
  of `project`, `productions`, `ux`, `layout`, `holding-pack` and `graphic-types` against the
  final committed tree - **62 passed** (2.6m). Do not edit source under a running suite; the
  green is honest here only because it was re-measured.

## The `/check` trial, night two - what it caught

Honest report, since the trial is being evaluated on 2026-09-04.

**The `code-review` skill reviewed the wrong tree.** It forked with the SESSION's cwd
(`C:\claude\NoaCG-Studio`, the main checkout) rather than this worktree, so it reviewed
`main`'s last commit - `78cc0004`, an orchestrator-workflow doc change - and reported five
findings about `.agent-workflows/orchestrator.md` that have nothing to do with this branch. It
was confident and specific about all five, which is what makes this the dangerous shape of
failure: a session that skimmed the output would have concluded its own diff was clean when
nothing had looked at it. **This is worth fixing before the trial ends**: a review that silently
reviews a different branch is worse than no review. Whether the fix is in the skill or in
`.agent-workflows/check.md` (which should state that phase 2 must be scoped to the current
worktree's diff and its output checked for the branch name) is a decision for the trial's owner.

Phases 2 and 3 were therefore done by hand against `git diff $(git merge-base main HEAD)`, per
the workflow's own "Otherwise review the diff directly" branch. **They found four things**, all
fixed and in the second commit:

1. The adjacency assertion had a vacuous path: `el.previousElementSibling === header.querySelector(after)`
   passes when BOTH are null, so a header that lost its Home control entirely would have gone
   green. Now `!!home && …`.
2. The editor and video shells had the pair inserted between the document lockup and its SAVE
   state, splitting "what you are working on" from "is it saved". Moved after `SaveControls` /
   the autosave warning, which also matches the wizard, where the whole `.wz-title` lockup
   precedes Home.
3. The heartbeat's label and its tooltip were two parallel three-way ternaries - the exact shape
   in which a status word and its explanation drift apart. Folded into one `outputHealth()` that
   returns both.
4. `noteShowOutputOpened` broke the alphabetical import block in `ProductionPage.tsx`.

None of those is a bug the build or the suite would have caught, which is the case FOR the
chain. The review phase's tooling is what needs the fix.

---

## The integration run could not be run locally, and why that is acceptable here

After taking `main` in (a conflict on the shared owner-queue item, resolved by keeping the
owner's VERBATIM quotes from `main` and appending what was built), `npm run build` is green on
the integrated sha `175e0220`. **`npm run test:e2e:integration:queued` refused, four times, from
both shells:**

> Blocked: something is already listening on port 5174 - this checkout's offline e2e port.

Port 5174 is the MAIN CHECKOUT's port, and a live session there is using it (`netstat` shows
established connections). **This worktree's port is 5202, and it is free** - `node
scripts/dev-port.mjs` says so. The guard hook resolves the port from the SESSION's cwd, which
for a worktree session is the main checkout, so it refused a run that would never have touched
5174. `--orphans` reports no orphaned dev servers, so there was nothing to clean up and killing
another session's server was not on the table.

Why landing anyway is the honest call rather than a shortcut:

- **`main` brought in zero application source.** All 23 files are docs, handoffs, one new
  standalone script (`scripts/check-ograf-schema.mjs`), a weekly workflow and its package deps.
  Nothing under `src/`, `e2e/` or `api/`. `git diff --name-only 73b2011f main` is the receipt.
- **The build on the integrated sha is green**, and it now includes main's new checks and the
  whole `node --test` battery.
- **The queue's own gate is CI on the integrated sha**, which plans a merge commit from the fork
  point and runs the full plan on a clean checkout - strictly more than the local run.

A background task is queued for the guard bug: it will refuse every worktree session whenever
anybody has a dev server up in the main checkout, which is most of the time.

## One thing the next session will trip over

**`src/components/AGENTS.md` is 49 bytes under the instruction-chain cap.** The chain ending at
`src/components/wizard/AGENTS.md` is 111,951 of 112,000 bytes, and this branch's own first
attempt at recording the header rule there went 442 bytes over and failed `npm run build` -
which is how it was found. Every sentence added to `src/components/AGENTS.md` from now on has to
come out of another one in the same file. The contract's own remedy is in its header: MOVE a
directory's section into that directory rather than writing shorter prose forever. A background
task is queued for it; do not spend a session shaving words.

## What is NOT done

- The `blocks/registry.ts` countdown block (see the sweep table). Background task queued.
- Nobody has watched any of this on a real playout box. Three owner-queue items carry the routes:
  `2026-08-29-update-re-arms-a-running-countdown.md`,
  `2026-08-29-output-heartbeat-only-when-there-is-an-output.md`, and the 2026-08-29 section
  appended to `2026-08-27-new-graphic-from-every-surface.md`.
