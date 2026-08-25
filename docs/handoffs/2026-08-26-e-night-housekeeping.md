# Night housekeeping - five leftovers paid

`claude/night-housekeeping-ad0d97`, 2026-08-26. Five named debts from landed sessions, each one
verified. Nothing here is a new feature and nothing changes what the product does.

## What changed

**1. The landing half of `scripts/auto-merge.mjs` is tested.** That script lands every queued
branch on this machine unattended, and only its migration decisions were covered. Its refusals
are the entire design and none of them was exercised.

Three decisions came out of `main()` as pure functions - `planOrderDecision`,
`planPreconditions`, `landWithRetries` - and `attemptLanding` now takes its git and CI commands
through injected dependencies that default to the real ones. Behaviour is unchanged; what is new
is that a test can drive a whole landing pass over fake commands and assert **how far it got
before it stopped**, which is the part that matters: a red gate must never reach the
fast-forward, a conflicted branch must never be pushed for CI, a fast-forward git declines must
never be pushed to origin, and a failed push to `origin/main` must not be recorded as a landing.

Also covered: the turn-order answers the queue depends on (blocked by a branch that is itself
still waiting means requeue, not fail), `--accept` clearing only the collision kind a person
named, the queued-commit pin outranking a dirty tree, and the retry on a moved main stopping
after three passes. 31 tests, mutation-checked - breaking the `--ff-only` merge or the
"main is the verified commit" check fails three of them.

**2. `docs/SPORTS_PACK.md` and `docs/CLOUD_PLAYOUT.md` no longer misdescribe the local relay.**
Both said a relay-driven browser source boots at the log HEAD and recovers nothing until an
operator acts. That is the behaviour boot recovery replaced. `control/localReceiver.ts` replays
the current airing off air, bounded by the last `play` for that graphic and stream, from a
baseline in localStorage or a full walk from row 0 when there is none - so a reloaded source
comes back with its text, scores and clock, the clock at match time because the logged value
carries the origin stamp. Following from the head is only the five-consecutive-failed-reads
branch. The per-plane table's reload column for the local relay changed from "on the next Take or
✎ Update" to "fixed (bounded replay)".

**3. A dc01 owner-queue item exists** -
`docs/acceptance/owner-queue/2026-08-25-a-debate-clock-that-survives-a-reload.md`. The debate
clock's reload recovery was verified by spec and by mutation and never watched by a person, which
repo rule 7 says needs a route. Route: publish a production with the dc01 debate board, open its
`/output` URL, Switch, wait, reload.

**4. The advisor baseline is re-recorded**, 102 -> 100. Read the diff before accepting it: the
only change is the two `unused_index` findings on `agent_auth_codes_expires_idx` and
`agent_keys_user_idx` that the linter no longer reports. Nothing new appeared and nothing else
drifted.

**5. The `storage-row-check@example.com` fixture account is gone from STAGING**
(`garafohbzmsybtysxphb`, `noacg-staging` - confirmed by project lookup before touching anything,
because `.env` points at production by design). Checked first: no `admin_users` row, no storage
objects, and zero rows in every table with a foreign key to `auth.users`, including the one
`NO ACTION` reference (`community_templates.reviewed_by`) that could have blocked. Deleted
through the Auth admin API with staging's own service key, fetched from the Management API -
never the production key in `.env`. Verified: zero rows matching afterwards. No repo file changed.

## Verified

`npm run build` green (the new tests are in its `node --test` list). Pushed; CI run 32898680541
green on `ce579248`, and the jobs read rather than assumed: Build, Factory gates and the CI gate
all ran; the E2E shards are `mode: none` with an empty spec list, planned from the fork point
`c68ef9f2` over all six changed files - scripts, docs and the advisor baseline map to no spec. So
the skip is the classifier answering, not a run that planned only its own last push.

## Next

Nothing follows from this. The branch is queued for landing.
