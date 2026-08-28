# Landing machinery: the six defects of 2026-08-28

Branch `claude/bb-landing-machinery`, queued for landing 2026-08-29. All seven items from the
night-wave brief are in, each with a regression test that fails on the old behaviour.

## What changed, and where the test is

1. **A branch with no worktree lands.** `auto-merge.mjs` makes ONE temporary worktree at
   `.claude/worktrees/auto-merge-tmp-<branch>`, lands there, and removes that same path - never
   another, never `--force`. It still refuses when the path is taken by something git does not
   know about, and when no base directory is given. A worktree a killed run left registered is
   adopted and removed rather than blocking that branch for ever.
   Tests: `scripts/worktree-safety.test.mjs` (`npm run test:worktree-safety`), including one that
   makes and removes a real worktree over a real repo.
2. **A landing chained behind a FAILED landing runs** once the predecessor is terminal - landings
   are order-free and each re-verifies itself. A non-landing whose dependency died is written off
   with the reason on it instead of waiting for a state that will never arrive.
   Test: `scripts/jobs-store.test.mjs`.
3. **A landing that gave up stays loud.** `npm run jobs` prints why it stopped (killed at its cap,
   process vanished, still blocked, a refusal and its exit code) and the exact re-queue command; a
   cancelled landing reads WITHDRAWN. "Not queued" never describes a branch that was queued.
   Test: `scripts/jobs-store.test.mjs` (`landingStateFor` / `landingRow`).
4. **Foreground waits are bounded.** The guard hook refuses a poll loop over the queue (bash and
   PowerShell shapes), and `node scripts/jobs.mjs wait <id>` gives up after 30 minutes and points
   at the handoff. Tests: `scripts/command-match.test.mjs`, `scripts/jobs-store.test.mjs`.
5. **A job that needs a dev server nobody started fails in its first second**, naming the checkout
   to start it in, instead of burning its slot on ERR_CONNECTION_REFUSED. Fails OPEN when the
   port cannot be worked out. Tests: `scripts/jobs-store.test.mjs`, `scripts/command-match.test.mjs`.
6. **Aging in the landing order.** A branch that has waited more than 12 hours outranks cheaper
   work; ancestry, the structural check and silent collisions still outrank age. The tradeoff is
   written in `merge-order.mjs` where the order is computed. Test: `scripts/merge-order.test.mjs`.
7. **RAM reclaimer.** A runner starved for 15 minutes closes processes a named detector has
   already proved orphaned, reports what it freed, and NAMES what holds the rest. It closes
   NOTHING while any browser work is live anywhere on the machine - a catalog sweep drives
   Chromium through the playwright library, so it has no CLI and its shells look exactly like a
   killed run's. Closing a session stays human. New: `scripts/ram-reclaim.mjs`, tested like
   `db-push.test.mjs` in `scripts/ram-reclaim.test.mjs` (in `npm run build`).

## THE RUNNER RESTART CAVEAT - read this first

**A live runner keeps the `jobs.mjs` / `jobs-store.mjs` it started with until it exits.** These
need the next runner to bite (the current one exits after 60 s idle, and the next `add` starts a
fresh one):

- defect 2 (the dependency release and the write-off),
- defect 5 (the dev-server precheck),
- defect 7 (the reclaimer),
- the `giveUpReason` the runner records on a failed job.

These bite immediately, because they are read per invocation: the guard hook (defect 4), the
`jobs` listing (defect 3 - though a job that failed under the OLD runner has no recorded reason
and falls back to its exit code), `jobs.mjs wait`, `merge-order` (defect 6), and `auto-merge`
itself (defect 1), which the queue spawns fresh for each landing.

## Verification

- `npm run build` green on this branch (`[write-version] … claude/bb-landing-machinery`), twice:
  once before the review round and once after.
- A dry-run landing through the changed code: `node scripts/auto-merge.mjs --branch
  claude/bb-landing-machinery --dry-run` - PREFLIGHT OK, 9 passed, stops before the first state
  change. The temporary-worktree branch of that path could not be dry-run against a real
  worktree-less branch (there is none right now), so it is covered by the real-git test instead.
- `/check` ran (trial night one) and **earned its place**: it found ten things, of which one was
  serious - the reclaimer would have killed a live catalog SWEEP's browser shells, because the
  orphan detectors only stand down for a Playwright CLI and a sweep has none. It also caught an
  unbounded `wait` on a non-numeric timeout, jobs vanishing from the listing between the schedule
  and the write-off, and the PowerShell loop shape sailing past the new guard. All fixed in
  `d8ec92ec`; the simplify pass removed a duplicated dependency list and stopped the reclaimer
  enumerating every process on the machine five times a minute.
- CI was running on `d8ec92ec` when this was written; the landing gates on its own integrated sha
  regardless.

## Not done / left for later

- `DEV_SERVER_DEPENDENT_SCRIPTS` is a hand-kept list of 40 script names. The review's better idea
  is a marker the scripts carry themselves (`@requires-dev-server` in the header, or a shared
  helper they import) so the list is derived. Worth doing when someone next adds a script to it.
- `dependencyDecision` releases a dead dependency on `kind === 'merge'`. The general property is
  "this job re-verifies its own preconditions, so `--after` is turn, not permission" - a per-job
  flag would say that better. Left as a kind check because `schedule` already special-cases
  `merge` three times for the same reason.
- The poll-loop guard recognises shell syntax, which is a widening surface. The durable half is
  the bounded `jobs.mjs wait`; the guard is the nudge towards it.
