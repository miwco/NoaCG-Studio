# I - the invocation defects are on the shelf, not fixed

Branch `claude/i-invocation-defects-filed`. A filing row. The owner asked for the delegation
invocation defects to be fixed in the evening wave; this row exists so that ask survives the session
that heard it, because a continuation prompt printed only in chat does not exist.

**Nothing was fixed.** One new file: `docs/backlog/delegation-invocation-defects.md`. No script, no
contract, no prompt was touched, and no `docs/README.md` row was needed - `check-docs-index.mjs`
exempts subdirectories, and it passes.

## What the file says

It carries an owner receipt (`source: owner`, `raised: 2026-09-03`, `state: unstarted`), and the
`asked:` line is marked as a paraphrase, because the row that launched this session reported the ask
rather than quoting him.

Five measured shapes, six mechanisms, each with where it belongs and the test that would prove it:

1. **A writing task launched read-only** - refuse a read-only call whose prompt declares the
   `write_file` tool. Cheap.
2. **Prompt paths naming a checkout the caller is not standing in** - refuse a path inside the
   primary checkout but outside the caller's own worktree. Cheap.
3. **Missing tool grants** - refuse a run with no `read_file` grant and a write with no `write_file`
   grant; warn on `command`. Cheap, and a sound lower bound rather than complete. Its prompt-shape
   half (3b) can only warn.
4. **`--effort` on a model that rejects it** - refuse for `claude-sonnet-4-6` and
   `claude-opus-4-6-thinking` by model id. Two lines, and the least urgent, because that rejection
   already costs nothing.
5. **A directory walk headless agy auto-denies** - warn only. Not cheap, and worth leaving filed.

All six belong in `scripts/agy-run.mjs`, which already refuses four things on the same reasoning,
and their test home is `scripts/harness-usage.test.mjs`. The acceptance condition is that a
delegation wrong in shapes 1, 2, 4 or 3a's visible half fails before a call is spent and names the
shape, with the warn-only remainder stated rather than hidden.

## What I could not verify, and one thing the evidence got wrong

Everything material in H's handoff checked out against the durable sources: the eleven-row
classification, the seven-in-eleven arithmetic (rows 1, 3, 5, 7, 8, 10, 11), the empty-response
causes in `scripts/agy-run.mjs`, and the `--effort` rejection in `docs/HARNESS_ROUTING.md`. The one
thing I could not verify is the owner's own words, hence the paraphrase marking.

**But the first draft of the mechanisms was wrong in four places, and `/check` caught all four.**
Worth reading before the evening row starts, because each was the obvious idea:

- Requiring an explicit posture flag catches neither reclaim row. Both passed `--read-only`
  explicitly; only the door they went through was wrong.
- Scanning the prompt for the primary checkout's root refuses every CORRECT prompt, because this
  repo's worktrees sit under `.claude/worktrees/` inside that checkout.
- A grant preflight that only guards `--write` runs misses the `svg-growth-default-audit-r2` call,
  which was a read that needed `command`.
- Keying the `--effort` refusal on `poolForModel()` would refuse GPT-OSS models, which are in that
  pool and carry their effort tier in the name.

The lesson for whoever implements this: **each mechanism has to be checked against the specific row
it came from, not against the shape's name.** Three of my four first-draft mechanisms would have
shipped, passed their tests, and never fired on the defect that motivated them.

One limit the implementation should design for rather than discover: the grants that count are the
effective list agy prints in its log, not the settings file a preflight can read.

## State

Two commits, pushed. `npm run build` green on the branch's own stamp both times. CI 33756400997 on
`21c1f6ad` read by job - Build, E2E plan, Factory gates and CI gate all success, shards skipped on
plan `{"mode":"none","specs":[],"base":"a8541ded","changed":1}`, which is correct for a one-file
docs change and not a cancelled replan. The second run covers `02e793a8`.

`/check`: review `delegated` (6 findings, all 6 confirmed against the sources and fixed - four of
them substantive), simplify `inline` (the skill returned background fan-out instructions, which
never deliver in a launched session), verify `inline`. Verdict stamp written, via the scratchpad-
then-`cp` workaround that `docs/backlog/check-verdict-stamp-unwritable-from-isolated-worktree.md`
documents.

## Next

The evening wave implements shapes 1, 2, 4 and 3a in `scripts/agy-run.mjs`, with cases in
`scripts/harness-usage.test.mjs` - including, for shape 2, a case for the worktree path that must
NOT be refused. 3b and shape 5 are a separate, later decision.
