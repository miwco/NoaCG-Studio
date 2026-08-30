# Session F - the tools that fail open

Branch: `claude/f-gates-fail-closed`. Four commits plus a merge of `main`, all gated.

Three tools that answered a wrong input by quietly doing the expensive thing now stop and say so.
Nothing here changes what any of them does when the input is right - two of the three were proved
byte-identical on the good path before the bad path was closed.

**The one sentence for the next session:** the planner refuses an argument it does not recognise
instead of running all 1179 tests, the render-smoke image fixture is a PNG that actually decodes,
and `docs/README.md` is a complete map with a build gate holding it complete - but the backlog item
that asked for the third one lives on `claude/a-coherence-round`, which has not landed, so **that
branch has to delete the item and its now-false "map is INCOMPLETE" warning when it lands**.

## 1. `scripts/e2e-affected.mjs` - an unrecognised flag

**Before.** Arguments were filtered with `startsWith('--')` and the flags were then never looked at
again. Anything unrecognised was dropped on the floor. The flags people mistype are the PLAN-ONLY
ones, which is what made this the most expensive fail-open in the repo: `--print` is not `--list`,
so `listOnly` stayed false and the plan RAN.

Reproduced before touching it, without launching anything - the planner's own exported `runsFor`
was asked what the plan an ignored flag leaves in place would spawn:

```
Plan left in place when --print is silently ignored: {"mode":"full","specs":[],"catalog":true}
  WOULD SPAWN: npx playwright test                                     (suite)
  WOULD SPAWN: npx playwright test --config=playwright.catalog.config.ts   (catalog gate)
```

`playwright test` with no spec arguments is not "no tests", it is every test.

**Now.** An unrecognised argument prints what it was, prints the accepted flags, and exits 2.
Single-dash arguments count as flags rather than base refs (no git ref may begin with `-`, so `-h`
reaching `git diff` was only ever a confusing crash), and a second positional is refused instead of
being silently dropped in favour of the first. `--help` prints the same usage and exits 0.

Parsing is an exported pure `parseArgs`, so the refusal is pinned without a git repo, a browser or a
minute on the clock - the same reason `planFor` and `runPlan` are exported.

**Which direction it moves the per-merge CI tier: NEITHER.** This changes what the planner refuses,
never what it plans. Proved rather than asserted - the pre-change file was extracted from `HEAD` and
run beside the new one over `--json --all`, `--json --integration <ref>`, `--json --focus` and bare
`--json`; all four outputs are byte-identical.

**The accepted set is the callers', not mine.** `package.json` passes `--focus` and `--integration`;
`ci.yml` passes `--json`, `--all` and `--integration`. A test reads both files and asserts every flag
it finds is accepted, so a caller that invents a flag fails in `npm run build` rather than turning
`main` red - and it asserts the four known ones are still passed, so a caller LOSING one is visible
too.

One follow-on found by `/check` and fixed here: `scripts/command-match.mjs` classified the new
`--help` as a command that starts a Playwright suite, so the one-browser-job-per-machine guard would
have refused it. That is the worst moment to refuse it - `--help` is what a session types right after
the planner rejects a flag, and answering a refusal with a second refusal is how someone stops asking.

## 2. The render-smoke image fixture - a PNG that does not decode

**Before.** `scripts/make-remotion-manifest.mjs` embedded a data URL commented as "a 2x2 orange PNG".
It was not decodable, and it was not orange. Verified by parsing the bytes read out of the file:

```
IHDR: 2x2 depth 8 rgb
  chunk IHDR len=13 crc=OK
  chunk IDAT len=17 crc=BAD
  - IDAT: CRC mismatch - stored 05d42c27, computed 9218b8b1
  -  IEN: declared length 369098752 runs past end of file (5 bytes left)
  - IDAT will not inflate: unexpected end of file
```

The declared IDAT length ran on into IEND. Raw-inflating the payload past its broken adler32 shows
what it actually carried: `1 255 255 255 0 0 0 0 0 0 0 0 0 2 0 0 ...` - a truncated pair of 4-wide
white-and-black scanlines, not four orange pixels. `scripts/render-smoke.mjs:84` feeds this manifest
to the real render service to exercise the image-input and asset-delivery paths; browsers and the
renderer read malformed PNGs leniently and draw whatever falls out, so that leg never failed. It just
stopped testing what it claims to test.

**Now.** A real 8-bit RGB 2x2 of `#f6a623`, the fixture's own accent. Minted with every chunk length
and CRC computed, then verified by re-decoding the base64 as written into the file: three well-formed
chunks, all CRCs matching, IDAT inflating to exactly the 14 bytes a 2x2 RGB image needs, all four
pixels `f6 a6 23`. The manifest's shape is unchanged.

**No spec was exercising a "not a decodable image" path deliberately** - this one is a positive
fixture and its comment always claimed a valid orange PNG.

**Left for a session with a budget:** confirming the rendered frame now carries the orange dot needs a
paid `render-smoke` run against the real render service. Not run here.

**The class is now clear across the whole tree.** A sweep of every tracked text file - decoding each
embedded base64 PNG and checking every chunk CRC and the inflated size against IHDR - found three
defective: `e2e/sync.spec.ts`, `e2e/video-project.spec.ts` (both fixed by `claude/b-harness-delegation`,
which landed mid-session) and this one. After the merge and this fix: **15 embedded PNGs checked, 0
defective.**

## 3. `docs/README.md` - a map that said it was complete

**Before.** The file opens "The map of this directory" and carried 59 rows for 110 files. A map that
claims completeness and is 54% complete sends a cold reader away believing a file does not exist, so
the session re-derives something already measured or writes a second doc on the same subject. Among
the 51 with no row: `VERIFICATION.md`, `GOALS.md`, `CLOUD_PLAYOUT.md`, `OGRAF.md`,
`SVG_IMPORT_PLAN.md`, `INTERACTIVE_PLAYOUT_PLAN.md`, `JOB_RUNNER_PLAN.md` - several cited as binding
from `AGENTS.md` files.

**Now.** All 51 have a row, each classified by reading its own header into the section it belongs in,
so a finished plan stops reading as open. **The map was completed rather than the warning kept**: a
warning stops the wrong inference, a list is the instrument.

`scripts/check-docs-index.mjs` joins `npm run build` and keeps it that way. Three rules, all failing
closed:

- **missing** - a top-level `docs/*.md` with no row;
- **orphaned** - a row naming a file that is not there (what a rename leaves behind, and worse than
  no row: it sends a reader after a file that moved);
- **duplicated** - two rows naming one doc. This is the merge hazard specifically: two branches
  adding a row for the same doc in different sections merge CLEANLY and leave the map
  self-contradictory with nothing to notice it.

Subdirectories are exempt on purpose - `backlog/` has its own README contract, `handoffs/` is one file
per session, `acceptance/owner-queue/` is transient - and the success line says "top-level" so it
cannot be read as a claim the gate does not make. It asks `git ls-files --cached --others
--exclude-standard` rather than reading the directory, the way `check-shared-instructions.mjs` does,
so the local and CI verdicts agree; reading the directory made a scratch note fail the local build as
missing, and the obvious remedy then failed CI as orphaned.

`scripts/check-docs-index.test.mjs` pins all three rules plus the measurement trap the backlog item
warned about: a doc MENTIONED in another row's prose must not count as indexed, because a substring
search over the README reports the map as far more complete than it is.

## The one thing this branch could NOT close, and who has to

**Step 4 - retiring `docs/backlog/docs-index-is-incomplete.md` - was not possible here.** That file
does not exist on `main`; it lives only on `claude/a-coherence-round`, which is still pending (its own
last commit records a live ordering block). The same branch adds a paragraph to `docs/README.md`
saying **"This map is INCOMPLETE, and nothing gates it"**, which this branch has just made false in
both halves.

So, for whoever lands `claude/a-coherence-round`:

1. delete `docs/backlog/docs-index-is-incomplete.md` - it has graduated, not lingered;
2. drop its "This map is INCOMPLETE" paragraph from `docs/README.md`.

The two branches' `docs/README.md` edits are in different regions and should merge textually - the
danger is not a conflict, it is a clean merge that leaves a false warning above a complete map. Its
two added rows (`LOGO_SLOT.md`, `LOWER_THIRD_SHAPES_BRIEF.md`) are not duplicated here, and if a
future merge ever does duplicate a row the new gate now fails on it.

## `/check`

- **review: delegated.** Scope-checked against this worktree's branch and merge-base before use -
  it named `claude/f-gates-fail-closed` and the seven files phase 1 computed. Three findings, each
  verified independently before acting, all three fixed in `74f40ce3`: the `--help` guard
  misclassification (confirmed by probing `invokesE2e`), the docs gate reading the filesystem
  instead of git, and a success line that overstated what it had checked.
- **simplify: inline.** The skill returned fan-out instructions rather than a result, so the leg was
  done here over its four angles. Two changes applied: the planner asks its parsed flag Set directly
  instead of rebuilding an argv array to call `.includes` on (a second, looser copy of "was this flag
  given" beside the validated one is the copy that drifts), and the index audit counts rows once
  instead of answering "indexed" and "indexed twice" from separate passes. Reuse angle checked
  against the sibling gates: the `git ls-files` call and the `isEntrypoint` + `process.exit(main())`
  shape match `check-shared-instructions.mjs` and `check-copy.mjs`.
- **verify: build.** `npm run build` green on the final state, branch stamp checked
  (`[write-version] dist/version.json -> claude/f-gates-fail-closed@...`) so it gated this branch and
  not `main`.

**No browser job was run from this session, deliberately.** The planner is a pure function over a
file list and is tested as one; another session's full offline suite was live for part of this
session and the guard hook correctly blocked the one command that would have overlapped it.

## Gate

- **33312449145** on `806a3623` (the first three commits): success, and **all nine E2E shards ran** -
  `E2E plan`, `Build`, `Factory gates`, `E2E 1..9/9 (subset)` and `CI gate` all green. That is the run
  covering the fixture, the argument gate and the docs map.
- **33313001937** on `74f40ce3` (the `/check` commit) was queued at handoff time. It plans from
  `806a3623`, so it is the verdict on the three review fixes specifically - read its jobs rather than
  its top line.

## Next

Nothing outstanding on this branch. The two open threads are the `claude/a-coherence-round` cleanup
above, and the paid `render-smoke` confirmation of the replaced pixel.
