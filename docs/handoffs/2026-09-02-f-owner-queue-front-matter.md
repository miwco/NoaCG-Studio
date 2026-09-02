# Handoff - session F, owner queue front matter (2026-09-02)

Branch `claude/f-owner-queue-front-matter`, worktree
`.claude/worktrees/f-owner-queue-front-matter`. Goal: every file under
`docs/acceptance/owner-queue/` carries `kind:` and `date:`, and `npm run check:owner-queue` fails
if one does not.

## The measurement, re-derived

`for f in docs/acceptance/owner-queue/*.md; do grep -q '^kind:' "$f" || echo "$f"; done | wc -l`
returned **30** (of 59 files) before any change - matching the backlog item's count, up from 56
files when it was filed (three more items landed since). All 30 were missing `date:` too, in the
same 30 files - no file had one key without the other.

## What shipped

- Added `kind:` and `date:` front matter to all 30 files. The date came from each file's own
  filename (`<date>-<slug>.md`), never invented - every file already had that date restated in
  its own body (`**Date:**`, `Date:`, or `**Filed:**`), so filename and body agreed everywhere I
  checked. `kind:` is `walk` unless the item plainly asks the owner to act or needs hardware.
  Prose was left untouched; only the new front matter block was added at the top of each file.
- Normalized 4 pre-existing files whose `kind:` value predated the walk/owner-action/hardware
  vocabulary in `docs/acceptance/OWNER_QUEUE.md`: `change`, `look`, `docs` and `tooling`, all
  reclassified to `walk` (each is a plain review item; one - the OGraf state-gap filing - even
  says "Nothing needs you" in its own body). These weren't part of the original 30 (they already
  had front matter), but the new check enforces `kind:` from the known set, so they'd have gone
  red on day one otherwise. Listed here rather than buried in the guess list below because they
  weren't a kind guess so much as a vocabulary correction.
- `scripts/check-owner-queue.mjs` - new. Reuses `parseFrontmatter` from
  `scripts/owner-receipts.mjs` rather than writing a second parser. Deliberately narrow per the
  assignment: it checks only that `kind:` and `date:` are present and that `kind:` is one of
  `walk` / `owner-action` / `hardware` - nothing about the route, the "what to look at" line, or
  anything else `OWNER_QUEUE.md`'s shape section describes, so a red always has a one-line fix.
  Wired into `package.json` as `check:owner-queue`, right after `check:owner-receipts` (its named
  sibling) in both the standalone script list and the `build` chain.
- `scripts/check-owner-queue.test.mjs` - new, paired test in the house style of
  `check-docs-index.test.mjs`: unit tests against the pure `auditOwnerQueueItem` function, plus
  one test that runs the real rule over the real directory so the gate can't pass its own unit
  tests while the build check it backs is broken. Added to the `node --test` list in `build`.
- Deleted `docs/backlog/owner-queue-front-matter.md` now that the check exists.

## Items I guessed the kind for

Per the assignment: an ambiguous item defaults to `walk`, and every guessed one is listed here so
you can reclassify in seconds. None of the 30 plainly asked you to act or named hardware, so the
guess was uniform - `walk` for all of them:

- 2026-08-27-counting-graphics-start-at-zero.md
- 2026-08-28-editor-master-research.md
- 2026-08-28-one-prompt-agent-bootstrap.md
- 2026-08-29-catalog-checks-only-what-changed.md
- 2026-08-29-font-licence-travels-inside-fonts.md
- 2026-08-29-h-condense-cuts.md
- 2026-08-29-jobs-listing-loud-landings.md
- 2026-08-29-ograf-first-review.md
- 2026-08-29-svg-animation-direction.md
- 2026-08-30-ad-permission-prompts.md
- 2026-08-30-cleanup-without-you.md
- 2026-08-30-codex-delegation-channel-works.md
- 2026-08-30-d-antigravity-spend-is-now-visible.md
- 2026-08-30-e-live-percentages-and-a-round-that-does-not-fit.md
- 2026-08-30-orchestrator-makes-its-own-worktree.md
- 2026-08-30-poll-status-own-field.md
- 2026-08-30-red-main-landing-gates.md
- 2026-08-30-s-antigravity-readiness.md
- 2026-08-30-svg-practice-library-one-per-kind.md
- 2026-08-30-the-samples-link-on-the-public-docs.md
- 2026-08-30-y-antigravity-trial.md
- 2026-09-01-a-import-page-explains-itself.md
- 2026-09-01-b-one-question-one-field.md
- 2026-09-01-landing-success-reads-as-success.md
- 2026-09-01-orchestration-next-recommendation.md
- 2026-09-01-programme-system-integrated.md
- 2026-09-01-render-smoke-orange-dot.md
- 2026-09-02-teams-share-dialog.md

Two of the 30 were **not** guessed - they already stated their kind in prose, so I read it off
rather than defaulting: `2026-08-29-ibc-ograf-listing.md` and
`2026-09-01-smtp-oauth-provisioning.md`, both `kind: owner-action`.

The 4 normalized pre-existing files (`change`/`look`/`docs`/`tooling` -> `walk`) are also
corrections rather than guesses in the strict sense, but flagging them here too since they're the
same kind of judgment call: `2026-08-28-rehearsal-machine-pre-run.md`,
`2026-08-30-a-live-vote-on-your-own-artwork.md`,
`2026-08-30-ograf-state-gap-designed-and-filed.md`,
`2026-09-02-jobs-says-why-a-branch-is-not-landable.md`.

## Traps handled

- **Session E's file.** `docs/acceptance/owner-queue/2026-09-02-e-agents-md-cuts.md` does not
  exist in this worktree (checked at both the start and end of this session) - it hadn't landed
  yet. Nothing to say beyond what the assignment already anticipated: if it lands without front
  matter, the new `check:owner-queue` gate will catch it on the next build.
- **Night-wave rows.** Any new owner-queue file a future session writes must carry `kind:` and
  `date:` from the start, or `npm run build` fails on it now. Worth carrying into night-plan
  prompts, as the assignment asked.
- **`/remote-control`.** The assignment's first line asked me to type it so this session reaches
  your phone. Per `.agent-workflows/orchestrator/prompts.md`, that's a terminal built-in a
  session cannot invoke on itself - it only fires when a human interactively types it. This ran
  as a background job with no interactive terminal, so the reminder never had anywhere to land.
  Noting it here rather than silently skipping it.
- **A self-inflicted one.** The first draft of this handoff was written to the primary checkout
  (`C:/claude/NoaCG-Studio/docs/handoffs/...`) instead of this worktree, by path mistake. Caught
  immediately: it was untracked and uncommitted there, so it was deleted with nothing else
  touched, and rewritten here. No commit, no build, no read happened against the primary
  checkout at any point.

## The check, honestly stated

`review: delegated` - the code-review skill (level `high`) forked and returned 2 findings
directly: a comment in `check-owner-queue.mjs` citing the just-deleted
`docs/backlog/owner-queue-front-matter.md`, and the new test's directory read missing the
`ENOENT` handling `main()` itself has (so the test and the gate it backs would have disagreed on
an emptied owner-queue directory). Both fixed, in scope.

`simplify: inline` - the simplify skill returned fan-out instructions rather than a delegated
result, so I covered the four angles (reuse, simplification, efficiency, altitude) by hand over
the diff. Nothing further needed: `parseFrontmatter` is reused rather than reimplemented, the
`package.json` wiring matches the `check:owner-receipts` pattern exactly, and the script stays
narrow by design.

`verify: inline` - `npm run build` green (exit 0) on `4cd19fcf`, including
`check-owner-queue.mjs` (`check-owner-queue: OK - 59 item(s), all carry kind: and date:.`) and its
paired test (10/10 passing) inside the build's own gate chain. No product code (`src/`, `api/`)
changed, so `test:e2e:affected` doesn't apply.

Verdict stamp written to `.git/noacg-jobs/checks/claude-f-owner-queue-front-matter.json`
(per-machine, not committed).

## State

Two commits on the branch: `a9b9417e` (the 30 files + the 4 normalizations + the check + the
delete) and `4cd19fcf` (the two review fixes), plus this handoff. Working tree clean. Queuing for
merge next.
