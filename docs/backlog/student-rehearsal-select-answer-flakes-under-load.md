# The quiz rehearsal's "Select answer" assertion fails under load and passes alone

**Filed:** 2026-09-05. **Source:** measurement, during an unrelated branch's verification run.

## Why

A spec that fails under load and passes in isolation takes shards red for reasons that have
nothing to do with the change being tested, and the cost lands on whoever is holding an unrelated
branch at the time. It cost this one a full re-run to rule out. Worse, it is the STUDENT
REHEARSAL - the spec that covers the two graphics the 2026-09-12 production is decided on - so
the one place we least want a red we learn to ignore.

The failure signature also says this is a real race rather than a slow assertion, which means it
can bite a student in the product, not only the suite.

## What it would take

`e2e/student-rehearsal.spec.ts:229`:

```
await expect(air.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
```

fired after clicking "Select answer". Playwright retried 17 times and every retry resolved the
element as `class="st12 imported-design-qstate"` - the `qon` class never arrived at all. That is
the tell: not a state arriving late, which a retry would have caught, but one that never arrives.
`e2e/AGENTS.md` names this class of bug directly - a gesture a handler can silently DISCARD, where
a click guarded by asynchronously-arriving state returns early and produces a missing result
rather than an error.

So the route is fault injection, not repetition. `--repeat-each` cannot reproduce it on this
laptop and a green repeat proves nothing. Find the path behind "Select answer" that can return
early, force its condition with a temporary source patch, and check the signature matches down to
the assertion and line. Fix the cause, then mutation-test by re-injecting the patch. A longer
timeout is not a fix here unless the state can be shown to arrive late rather than never.

## Evidence

- 2026-09-05, branch `claude/w-signed-in-state`, commit 88ddd64c, whose only source change is a
  comment in `src/styles/auth.css` - so the branch cannot be the cause.
- `npm run test:e2e:focus:queued`, 6 workers: 1 failed, 467 passed.
- The same spec file re-run alone on the same commit, 2 workers: 2 passed, 26.1s.
- A second full `test:e2e:affected` run on the same branch also ended `suite FAILED (exit 1)` with
  its catalog gate passing (35 passed), so this is not a one-off. CI's nine shards were green on
  the same tree, which is the shape to expect: the window is narrower on a clean runner than on
  this laptop under load.
- `e2e/AGENTS.md`, "A gesture a handler can silently DISCARD" and "A race you cannot reproduce is
  FAULT-INJECTED, never repeated harder".
