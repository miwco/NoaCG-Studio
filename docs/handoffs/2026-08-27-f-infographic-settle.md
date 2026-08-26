# Handoff - F: the counting readouts, and the settle recipes back in step

**Branch:** `claude/infographic-settle-semantics-848ec7` (the worktree's own branch; the session
brief called it `claude/f-infographic-settle` - same work, and the worktree tooling keys off the
name it was created with, so it was not renamed). One commit, `cd028bf2`, on top of `9063928b`.

Everything below is measured, and the commands to re-measure are in it.

---

## ⚠ SETTLE SEMANTICS MOVED AGAIN. Read this before touching a preview surface.

They moved **one layer down**, not sideways. Neither `preview/settleGraphic.ts` nor the recipe it
states has changed at all - the fix is in the EMITTED runtime, and its effect is that the two
preview recipes are identical again.

- `preview/simulatorRuntime.ts`'s `sim-settle` **no longer diverges**. It was ending on the DATA
  (`update / jump / update`); it now runs `settleGraphic.ts`'s `update / jump / update / jump`
  verbatim. **The editor canvas was the surface paying for that divergence**, and it is the one
  that changes: a credits reel settled at half its viewport there while the Home card beside it
  showed a full frame.
- `templates/infographics/igMotion.ts` and `templates/poll/pollMotion.ts` each gained one
  `tl.set` per readout. Every surface that settles a counting graphic inherits it, everywhere,
  including exports and the browser-output renderer.

If a thumbnail or canvas measurement was taken before this branch lands, re-take it.

---

## What landed

### 1. The defect: seventeen readouts shipped reading zero

Reproduced first, through `composeDocument`'s real serialized bootstrap: **ig01 "Big Stat"
rendered `0%` against its own `data-target="87%"`.** Sweeping the catalog the same way found the
whole class - 17 of the 21 marked readouts that a settled entrance renders:

| designs | readouts wrong |
|---|---|
| ig01, ig04, ig05, ig07 | 6 of 6 |
| ig22, ig23, ig30, ig31, ig34, ig35, ig36 | 11 of 15 |
| pl01…pl05 | 0 of 15 (the count is in a RESULT step, which the entrance settle never runs) |

The cause is C's, exactly as their handoff called it. A settle jumps the entrance to its end with
GSAP's callbacks suppressed. **A tween still writes its target under that jump; a callback does
not.** Each count is a tween over a plain counter object whose digits reach the DOM only from an
`onUpdate`, so the digits never arrived and the readout kept the `'0'` its opening `set` wrote.

### 2. The fix: a readout's final value is a SET, never only a callback

One line per readout, in the emitted runtime rather than in either recipe:

```js
tl.set(el, { textContent: stat.text }, <the count's own end>);
```

A `set` is a zero-duration tween, so it renders under suppression - the same property that caused
the bug, used the other way. Under normal playback it writes exactly what the `onComplete` beside
it already wrote and changes nothing; under a jump it is the only thing that writes. Five sites:
`infographicCountUp`, `infographicBarsGrow`'s per-bar caps, `infographicRingFill`,
`infographicGoalRing`, and `pollBarsGrow`.

**Position matters and appending is wrong in three of the five.** A bar's cap must land at THAT
bar's stagger slot plus its growth, and a ring's figure at the draw's end - not at the end of a
timeline that other bars extend past it. `infographicCountUp` is the one place a bare append is
right, and only because the `set` is added BEFORE the bar sub-timeline extends the count past it.

**Playback is unchanged, and that was measured rather than assumed** (seek the entrance by TIME,
callbacks live - a play in a hidden iframe proves nothing, rAF does not tick there):

```
ig01  0.6s -> 50%   0.9s -> 77%   1.2s -> 85%   1.6s -> 87%
```

The trailing `set` does not win mid-flight. Post-fix, all 21 readouts render their own figure,
with the full text intact - `124,213` and `71.4`, not `124213` and `71` - and each is visible
(`box 333x150, opacity 1, visibility visible` for ig01's, checked because "the text is in the DOM"
is not the same claim as "a card shows it").

### 3. The divergence is gone, and the canvas got better

The two recipes wanted opposite orders because two runtimes wanted opposite things, and both
faults were real. With the readout fixed one layer down, neither needs an ordering favour.
Measured on the EDITOR CANVAS (`{ simulate: true }` + the same `sim-settle` PlayoutSimulator
sends), viewport coverage of the settled credits frame:

| design | canvas, before | canvas, after | thumbnail (unchanged) |
|---|---|---|---|
| cr01 (a roll) | 69% | 69% | 69% |
| cr06 (reel) | 51% | **100%** | 100% |
| cr08 (reel) | 69% | **100%** | 100% |

**C's table was right and its own footnote was the thing to check.** They recorded 51/69 as "one
jump, the finite end" and 100/100 as "two jumps" - the canvas had been sitting on the one-jump row
the whole time, because the second jump is what the divergence gave up. The canvas and the
thumbnails now show the same frame, which is the invariant `settleGraphic.ts` states in its own
first paragraph.

### 4. The missing gate

`e2e/counting-settle.spec.ts`. It sweeps the WHOLE catalog, keeps every design whose **composed
document** carries `data-target`, settles it, and fails on any readout whose text disagrees with
its own data.

- **The design set is DISCOVERED, never listed.** `data-target` is the mark a counting readout
  already carries - it is where the count reads its true figure from - and the scan runs on the
  composed document, so it catches both markup-borne marks and the ones a runtime writes. 44
  designs matched on 2026-08-27 (39 infographics, 5 vote boards), found in under a second. A
  counting design in ANY category is covered the day it lands; a category list nobody remembers to
  update is not what should stand between a broken number and air.
- **It asserts its own discovery**, because a sweep that discovers nothing passes every assertion
  below it: floors of 30 designs and 15 readouts.
- **It reports the whole list, not the first row.** Seventeen of these broke from one change, and
  a gate that names one sends the next reader hunting seventeen separate faults.
- **It runs on BOTH recipes**, and `e2e/end-credits.spec.ts`'s coverage sweep now does too. Two
  copies of a recipe that are only ever measured one at a time are two recipes - which is exactly
  how the divergence lasted as long as it did.

Mapped in `scripts/e2e-affected.mjs` under `^src/templates/` in the same commit.

---

## The settle taste calls C left open - closed, with the why

**(a) Which frame a roll settles ON** (its designed rest pose, or mid-roll where the screen is
fullest). **Not closed here, and not mine to close** - it is a taste question the owner queue
already holds (`2026-08-26-a-settled-graphic-is-not-empty.md`) and both answers are one line.
Left alone deliberately.

**(b) The emitted runtime's own settle still uses `progress(1)`. CLOSED as "not now", and C's
stated reason is NOT the reason.** Their argument was that this is a different question - "is this
step over" rather than "where does this graphic rest". That does not survive contact with
`noacgSnap`, which is *precisely* "where does this graphic rest", in the state machine's own
vocabulary (`docs/STATE_MACHINE_SCHEMA.md`: every state is enterable by transition or by SNAP). A
state whose entry timeline holds a `repeat: -1` child snaps to 1e10 seconds, an arbitrary phase of
the loop, in an export, under SPX and in the browser-output renderer, where no preview recipe
reaches.

It is **reachable today** - `templates/types/ticker.ts` persists a machine and a ticker's marquee
is endless - and currently harmless for the same reason C called luck about the reels: a marquee
renders its items twice and covers the strip at any phase.

The real reason to leave it is the **blast radius**: the fix changes the emitted JavaScript of
every template in the catalog, so it moves both catalog baselines and wants the five catalog gates
behind it. That is its own branch, not a rider on a branch fixing a visible zero. Filed with the
exact patch, the baseline command and the fixture the new spec needs:
`docs/backlog/settle-emitted-runtime-finite-end.md`. **The trigger to do it is the first
machine-bearing design with an endless child in a state entrance whose coverage is not
phase-independent** - a design-review question, which is why it is written down instead of left to
a gate.

**(c) Two copies of one recipe.** Kept as two, because each is serialized into a preview document
by `.toString()` and must be self-contained (a reference to a module-level helper compiles here
and throws `ReferenceError` there). The mechanism that replaces "remember to keep them in step" is
that **both gates now run on both recipes**.

---

## The sweep for the same class elsewhere (the TAIL task)

Grepped every callback that writes to the DOM from a template runtime: `onUpdate` appears in
exactly 5 places and `onComplete` in 6, all in `igMotion.ts` and `pollMotion.ts`, all fixed. The
only other hits are `animRuntime.ts`'s `clearProps` (a settle wants it skipped) and
`streamNotifications/shared.ts` (a `delayedCall`, not a tween callback).

**The other counting surfaces are FINE, and it is worth knowing why rather than that.** A growing
bar's width, a ring's `strokeDashoffset`, a milestone node's `scale`/`opacity` and a cascading
row's `y` are all tween TARGETS - GSAP writes them under a suppressed seek like any other value.
That is the audit line, and it is stated in `igMotion.ts`'s own header and in
`src/templates/infographics/AGENTS.md`: **"does this readout depend on a callback firing", not "is
it a number".** The bars and rings were right the whole time while every figure beside them was
wrong.

`pollMotion.ts` was fixed even though the ENTRANCE settle never reaches it - a poll's count is in
its result step. The editor canvas's `snap` walks every step (`simulatorRuntime.ts`), so a snapped
result reading 0% for every option is the same defect one surface further in.

---

## Verification state

- **`npm run build` GREEN** on the committed tree (typecheck, api typecheck, lint, dep-cruiser,
  the node test suites, the instruction ratchet, `check:copy`, vite build, prerender of 507
  template pages, the secret scan, line endings).
  - The copy-tells gate caught three em-dashes in comments I added and is the reason there are
    none: it counts tells PER FILE against a baseline, so a comment added to a file that already
    has fourteen still fails it.
- **The catalog measurement is in this document and re-runnable** - it is the spec, run against a
  `preview_start` dev server on this worktree's port (5280).
- **CI READ, and it is a verdict: run `33010515567` on `cd028bf2`, nine E2E shards all planned and
  all run, Factory gates green, Catalog calibration gate green, Build green.** Eight of nine shards
  green; **shard 1/9 red on exactly one assertion**, which is the expected baseline drift below and
  nothing else. Jobs listed rather than assumed
  (`gh run view 33010515567 --json jobs -q '.jobs[] | "\(.conclusion)\t\(.name)"'`) - the only
  non-success besides that shard is `skipped  Vercel accepted the commit`.
- **The local spec run is QUEUED and had not drained when this was written** - job `j-0085`,
  `npx playwright test counting-settle end-credits wave2`, waiting behind three other browser jobs
  on a laptop with 1.1 GB free against a 4.0 GB floor. `node scripts/jobs.mjs log j-0085` has its
  output. CI is the stronger verdict and is the one to read; this is the local confirmation, not
  the gate.
- **`e2e/counting-settle.spec.ts` RAN AND PASSED ON CI, both recipes** - shard 2/9, which concluded
  success. Checked by name in the shard logs rather than inferred from a green run, because a new
  spec that was planned but not executed reads exactly like a passing one:
  `chromium › e2e/counting-settle.spec.ts:82:3 › every counting design settles on its real figure
  (thumbnail)` and `… (canvas)`.
- **ONE baseline moved, the drift was READ first, and it is now re-recorded.** CI's
  `catalog-baseline.spec.ts` reported 46 changed fingerprints and the list was exactly the healthy
  one: **`js` on ig01…ig39 and pl01…pl05, and nothing else.** No `html`, no `css`, no other
  category, no variant outside the two runtimes that gained a line. The committed diff is
  **44 insertions, 44 deletions, every one of them a `"js"` line**.
  - **It was re-recorded WITHOUT the recorder, and the equivalence was proved rather than
    assumed** - the queue was deadlocked (five browser jobs against a 4.0 GB free-RAM floor on a
    laptop with 3.3 GB free, and no orphan to kill: the memory is the user's own Chrome). The
    recorder's hash is `sha256(pane).hex.slice(0, 16)`, so the same hash was computed in-page with
    SubtleCrypto over the same `variant.create({})` output. Two checks make that sound: a control
    variant nothing touched (`al01`) came back byte-identical to its committed `html`/`css`/`js`
    triple, proving the in-page hash IS the recorder's; and a SHA-256 over the canonical
    `id|html|css|js` listing of all 509 variants was computed on both sides and compared -
    `73d9f4ea…bc0e` on both, so **every one of the 1,527 entries in the committed file equals what
    the catalog actually emits**, not just the 44 that moved. If you would rather have the
    recorder's own output, `set "UPDATE_CATALOG_BASELINE=1" && npx playwright test catalog-baseline`
    must produce a zero diff against what is committed.
- **`e2e/catalog-render-baseline.json` did NOT move**, which is worth knowing rather than
  assuming: it is computed style and geometry of the settled graphic, the settled text genuinely
  changed from `0%` to `87%`, and its own test passed in the same shard. So the figures' boxes are
  not sized by their digits, and no platform-bound geometry re-record is needed here. Good, because
  that is the re-record `src/templates/AGENTS.md` warns bakes one loaded run's coin flips into the
  committed reference. **Do not pass `UPDATE_RENDER_BASELINE=1` on this branch.**

## What is left

- **Read the CI run on the branch head and land it.** Everything else is done: the fix, the gate,
  the docs and the re-recorded baseline are committed, and the only thing the previous run was red
  on is the baseline this commit records.
- `docs/backlog/settle-emitted-runtime-finite-end.md` - the emitted runtime's own settle, with its
  trigger.
- Owner queue: `docs/acceptance/owner-queue/2026-08-27-stat-cards-show-their-real-number.md`.
  Route is `/app` Home and Browse, search **stat**; what to look at is real figures and no zeros.
