# Session W - main goes green

Branch `claude/w-main-green-cdfa2e`, two commits, three files: `e2e/anim-engine.spec.ts`,
`scripts/e2e-affected.mjs`, `scripts/e2e-affected.test.mjs`. No product code, no catalog
baseline. CI green on `13d0568c`, all sixteen jobs.

---

## What was red, and for how long

`main` had failed every CI run since 2026-08-27 morning. One test, always the same one:
`e2e/anim-engine.spec.ts` "parity: infographic measured motion matches the legacy emit, and lands
on the data", four mismatches at the head of the entrance.

```
ig01 @0s:   "87%"     vs "0%"
ig05 @0s:   "124,213" vs "0"
ig04 @0s:   "68"      vs "0"
ig04 @0.4s: "68"      vs "0"
```

Left side is the legacy twin, right side is the emitted representation that ships.

Swept every red run on `main` for 2026-08-28 (`gh run list` plus `--log-failed` on each): sixteen
push runs and the nightly, all this one test, all a single failure. Two runs early in the morning
(04:16, 04:46) also carried `flows.spec.ts:81` waiting on the retired "Soft Stack" design; that
was already fixed on `main` and is absent from every run after 04:57. Nothing else was broken.

## The decision, and why it went this way

The rule the owner walked and accepted on 2026-08-28: **a played graphic must never show its
figure before the count.** A playout server writes the data before it takes the graphic - SPX,
CasparCG and the playout dashboard all call `update()` then `play()` - so a count that empties its
own readout when the count begins leaves the operator's real number on air for the whole head
start, then snaps to zero and counts back up to it.

Three pieces of evidence, and they all point the same way.

1. **The emitted side obeys the rule.** `src/templates/shared/animRuntime.ts:114` adds a segment
   marked `noacgLeadApplied` at 0 rather than at the offset, so the builder positions its own
   contents from `opts.lead` and its opening zero lands on the entrance's first frame. That is the
   `"0%"` in the failure output, and it is correct.
2. **The legacy twin encodes the defect.** The emitted region does
   `tl.add(infographicCountUp('#f0'), 0.4 / animSpeed)`, which positions the whole segment -
   opening zero included - at the head start, leaving the operator's figure on screen until then.
   That is the `"87%"`, and it is the behaviour the fix deliberately removed. The two disagree
   only for `t < lead`, and only on the readout: bars, ring and rows matched at every frame,
   which is exactly what the zero rule predicts, since those are tween targets rather than
   readouts.
3. **The emit must NOT be "fixed" to match.** `6f0b1828` left the `tl.add()` shape untouched on
   purpose and says why: the region parser accepts only a named builder call with an optional
   position, so a second argument there makes the whole template refuse conversion and silently
   ship a legacy region. Changing the emit would trade a stale test expectation for real
   templates regressing to the old behaviour on air.

So the baseline was the wrong side. Every catalog infographic creates as a data block and the
interpreter is what a playout client runs, so nothing a user touches was ever wrong.

## What changed in the spec

`IG_CASES` now carries `zeroRule` beside `times`. `zeroRule` names the frames inside the
pre-count window: there the emitted graphic must already read zero, while every channel except
the readout is still held to full parity against the legacy twin. `times` is the window where the
two are simply equal, unchanged in kind from before. Six of eleven frames moved from one pass to
the other; **no frame left coverage**. A comment above the table states the rule, the divergence
and why the emit cannot change.

`ig04` declares `0.4` in its window as well as `0`: 0.4s is ring-fill's head start and the
boundary frame still belongs to the window, because the legacy segment's opening `set` is
positioned exactly there and has not rendered yet.

The non-readout comparison spreads the shot and blanks the readout rather than listing
`bars`/`ring`/`rows`, so a channel added to `shot()` is covered the day it is added instead of
quietly falling out of the pass. That one came from the simplify phase of `/check` - see below.

## Why it reached main, and the fix for the class

`scripts/e2e-affected.mjs` mapped `anim-engine.spec.ts` from `src/blocks/` only, never from
`src/templates/` - where the emit it reconstructs is authored. So every branch plan for the
count-from-zero fix skipped the one spec that compares the two representations, the branch landed
green, and the nightly found it the next morning. This is the catalog hole of 2026-08-08 one
layer down.

`src/templates/` now selects `anim-engine.spec.ts`, and the mapping is pinned in
`scripts/e2e-affected.test.mjs` by a detector derived from the `presetRegistry` import rather
than from a list, so a second spec that starts building legacy twins is covered the day it is
written. **The pin was proved to fail with the mapping removed**, then restored. The mapping also
closes the same hole for `src/templates/shared/animRuntime.ts`, the interpreter side, which was
equally unreachable.

## Verification

- `npm run build` - green, both commits. Branch stamp read and correct
  (`dist/version.json -> claude/w-main-green-cdfa2e@...`), so the gate ran on this tree.
- `node --test scripts/e2e-affected.test.mjs` - 18 pass, including the new pin.
- `anim-engine.spec.ts` plus `counting-settle.spec.ts` `:queued` - **16 passed**, run twice (once
  before the simplify edit, once after). That is the full `anim-engine` spec, not just the parity
  case, plus `counting-settle` on both settle recipes AND its played path - the gate that owns the
  owner's rule across the whole catalog.
- CI on `13d0568c`: **all 16 jobs green.** Read as the jobs list, not the colour - Build, Factory
  gates, E2E plan, nine E2E shards, Combined E2E report, CI gate. The two `skipped` are the Vercel
  accept and the catalog calibration gate; the latter is correct, the plan reports `catalog:false`
  because no template file changed. The plan's spec list contains `anim-engine.spec.ts`, and the
  parity test is visible running at its new line 683 in shard 1, which passed.

No `docs/acceptance/owner-queue/` item: nothing here is observable in the product. The behaviour
the owner would look at is the count-from-zero fix itself, which he already walked on 2026-08-28.

## The check trial, night one

Ran on this branch. Verdict: **it caught something, small but real.**

- **Review** (`/code-review high`): no findings. Checked that the seek ordering stays monotonic
  across the two loops, that the `landed` snapshot is taken at the same frame as before, that
  `parseFloat` handles `'0%'` / `'0'` / `'124,213'`, and that a `null` readout fails rather than
  passing vacuously.
- **Simplify**: one genuine finding - the non-readout comparison listed its three channels by
  hand, so a channel added to `shot()` would have silently stopped being compared. Fixed, and the
  spec re-run to green afterwards rather than trusting the earlier pass.
- **Verify**: the gate chain above.

One note for the trial's evaluation on 2026-09-04: `/simplify` instructs four parallel agents, and
for a three-file diff that is disproportionate, so the four angles were worked inline. The finding
came out of the simplification angle either way. Whether the fan-out earns itself on a large diff
is still untested.

## Next

Nothing outstanding on this branch. Once it lands, `main` is green and the check trial has a
green baseline to run against.
