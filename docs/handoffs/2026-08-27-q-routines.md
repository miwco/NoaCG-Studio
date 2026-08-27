# Handoff: the feedback digest is parked, and three routines run on time instead

Session Q, 2026-08-27. Branch `claude/feedback-digest-routines-d7a916`.

## What is true now

**The nightly mail digest is parked, not deleted.** It needed a Gmail app password and four
repository secrets, and that setup is five minutes nobody has spent. `.github/workflows/feedback-digest.yml`
stays scheduled and stays inert-green - with the secrets absent it prints a notice and exits 0, so
it costs nothing and turns on the day somebody sets them. The owner-queue item asking for those
secrets is gone; leaving an owner action open indefinitely is how a queue stops being read.

**The reminder moved into Claude Code as three scheduled routines**, written down in
`docs/ROUTINES.md` (59 lines) and listed in `docs/README.md`:

| Task id | Cadence | What it does |
|---|---|---|
| `weekly-feedback-and-freshness` | Mondays 09:45 | `npm run feedback:count` + `npm run check:freshness`, both read out in chat, plus the one action: open `/admin` |
| `monthly-competitor-review` | 1st, 10:00 | MXMZ, Loopic, Singular.Live, Flowics, SPX/CasparCG/OGraf - what shipped, what it means, **what we need before their users could switch** |
| `monthly-quality-review` | 15th, 10:00 | three to seven ranked refactoring proposals about the SOURCE, each with a measured cost |

They live at `~/.claude/scheduled-tasks/<id>/SKILL.md`, which is per machine and not in this repo -
`docs/ROUTINES.md` is the durable record of what they are for. All three are read-only: they report
and stop, they never edit, commit or start work.

The weekly slot avoids the daily 09:10 CI report and the Monday 09:24 Codex check. The quality
review's scope is stated explicitly against the coherence session (`.agent-workflows/orchestrator.md`)
because two reviews that overlap get read as one and then neither gets read: that one owns the
written surface, this one owns code and hands any doc defect straight over.

## `npm run feedback:count`

`scripts/feedback-digest.mjs --count` answers the one question a weekly reminder needs - how much
came in over 168 hours, how much is negative, how much carried a written note, how much is still at
status `new` - and the privacy property is structural rather than editorial:

- **The message column is never requested.** `COUNT_SELECT_COLUMNS` is the mail digest's list minus
  `message`, and everything left is a timestamp or a closed vocabulary. The one fact it wants about
  written notes comes back as a PostgREST `count=exact` row count with zero rows attached, so no
  rewrite of the printing could leak a sentence. Asserted in `scripts/feedback-digest.test.mjs`
  (26 tests now, part of `npm run build`) against a deliberately hostile fake server that answers
  with a `message` column nobody asked for.
- **Only the Supabase pair is required.** The parked SMTP secrets are not, which is precisely what
  lets the reminder work while the mail half waits. A missing pair THROWS here rather than exiting
  green, because unlike the scheduled job somebody is standing there waiting for a number.
- It reads `.env` through `scripts/read-dotenv.mjs`, so a linked worktree with no `.env` of its own
  answers from the main checkout.

Verified live against the real project: an empty week reports as such, and a 20000-hour window
returns 6 rows, 4 negative, 1 with a written note.

One incidental fix: the direct-invocation path now sets `process.exitCode` instead of calling
`process.exit()`. Exiting the instant the promise settled tore the event loop down under an open
undici keep-alive socket and aborted with a libuv assertion and exit 127 - a green run reporting
failure.

## Also in this branch

- `docs/backlog/staging-drift-mechanism.md` - the proposal extracted from the g-handoff before it
  was deleted: name `noacg-staging` in `migration-drift.mjs`, then let the landing push it, and keep
  the management API out of Actions because the repository is public.
- Six consumed handoffs deleted (`g` through `l`). `a-browse-and-find`, `f-infographic-settle` and
  `lower-third-shapes` stay - the first two belong to session O, the third is deferred.
- Owner-queue item `2026-08-27-standing-routines.md`.

## What the owner should do

Nothing is blocked. One click is worth making: **Run now** on each of the three tasks in the
Scheduled sidebar, once. Tool approvals granted during a run are stored on the task and reused, so
pre-approving them stops the first real run stalling on a permission prompt with nobody there. The
competitor review needs it most - it uses web search.

## What a next session might do here

The routines are new and their cadences are a guess. After a month there will be evidence: if the
weekly feedback count is zero every Monday, the routine should say so itself and propose dropping to
fortnightly rather than waiting to be noticed. The two monthly reviews are the ones to judge on
output - a review that produces nothing actionable twice running is a prompt problem, not a quiet
month, and the prompt is one file away.
