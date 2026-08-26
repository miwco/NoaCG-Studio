# Handoff - hosted-latency, and what the last 48 hours of email actually was

Session G, 2026-08-26. Branch `claude/ci-health-night-5a3e31`.

## The short version

`hosted-latency` went red for a reason that had nothing to do with latency, and the obvious
diagnosis was wrong. **Staging was not behind. It had caught up.** The job's latency probe read
`public.documents` with only the anon API key, which worked solely through the table grant hosted
Supabase's bootstrap hands every new table - the grant 0052 deliberately revokes. The probe is
fixed to query as a signed-in user. Nothing was applied to any database.

## What was measured, and how

The brief's lead was that migrations 0051 and 0052 landed on production on 2026-08-25 while staging
is kept current by hand, and nobody did it. That is a good hypothesis and it is false. Both ledgers,
read through the management API:

| | ledger | last entries | `anon`/`authenticated` grants in `public` |
|---|---|---|---|
| production `kprolrchuldgfrzspthy` | 52 | …0050, 0051, 0052 | 10 rows |
| staging `garafohbzmsybtysxphb` | 52 | …0050, 0051, 0052 | the same 10 rows |

Identical. Somebody had already pushed both migrations to staging.

The failing step was the latency probe, and its message says so exactly:

```
/rest/v1/documents?select=id&limit=1 answered 401 …
{"code":"42501","hint":"Grant the required privileges to the current role with:
 GRANT SELECT ON public.documents TO anon;"}
```

Reproduced from this laptop against staging, before changing anything:

```
ANON ONLY        -> 401  42501 permission denied for table documents
ANON + USER JWT  -> 200  [{"id":"39bbc813-…"}]
```

The timeline settles it. The probe's one healthy reading - ~245 ms, run 32852705499, 2026-08-25
13:20 UTC - was taken while staging was still two migrations behind, so `anon` could still read
`documents`. The scheduled run at 03:37 the next morning was the first after staging caught up.
**The green run was the wrong one.**

## The fix

`.github/workflows/hosted-latency.yml`: the probe now sends the signed-in JWT that the preceding
step already mints (exported to `GITHUB_ENV`, masked), so it queries as `authenticated` on
`documents` - the path a user's sync really takes, on the table whose latency defect the whole job
exists to watch. The timed loop sends the same headers as the guard that proves the request does
work, because the two drifting apart is how a probe starts measuring a refusal again. The failure
message now points at the grants rather than at latency.

This is the third mistake in that one line (the first measured `/rest/v1/` and timed twenty 401s;
the second was this one). It has been immune to the previous two guards because both of those check
the request the probe makes, and the thing that changed was the database underneath it. What makes
this version stickier than a comment: `authenticated` holding SELECT on `documents` is asserted by
0052's own self-check `(c)`, so a migration that took it away could not apply.

## The email classification, refreshed

`docs/VERIFICATION.md` §"What a red run means, and what actually emails" now carries the last 48
hours (2026-08-24 20:00 - 2026-08-26 20:00 UTC): 307 runs, 243 green, 35 cancelled, 25 failed, and
**27 `CheckSuite` threads in the inbox** that reconcile exactly - 25 failures plus attempt 1 of two
runs a re-run turned green. Every cause is in a table there with its status. Three are closed as of
this session: the `configured-suite` service-role iteration, `nightly-drift`'s schedule alarm
(#44), and `hosted-latency` (#45).

**One earlier claim was wrong and is corrected in place.** The doc inferred "about 61 emails, of
which 26 were issue traffic". Read out of the inbox instead, the window contains **zero `Issue`
notification threads** despite five rolling issues opened and five comments; widening to 2026-08-20
returns exactly one, whose `reason` is `comment` on an issue the owner had replied to themselves.
The repo carries no watch subscription. So bot-filed rolling issues cost this account nothing, and
**every email in the window was a `ci_activity` `CheckSuite` thread** - GitHub saying a run the
owner triggered went red. The withheld-repeat-comment work was still right, but it is not where the
remaining noise is. ~13 emails a day, about half of them a branch telling its author their own push
is red.

## The mechanism this is missing (not built - deliberately)

`scripts/migration-drift.mjs` and the automatic `db:push` both aim at the single project
`VITE_SUPABASE_URL` names. **`noacg-staging` is outside both**, so it is kept current by somebody
remembering, exactly as `hosted-latency.yml`'s header admits. That header says the symptom of
forgetting is the suite failing loudly. This session found the other half: **staging catching UP can
also turn the job red**, when a probe or a spec leans on a privilege a migration is about to remove.
The two are indistinguishable from the email, and both surface only when a scheduled run goes red up
to twelve hours later.

The proposal, for whoever picks it up:

1. **Name staging in the drift check.** `migration-drift.mjs` reads one ref from
   `VITE_SUPABASE_URL`; give it a second, declared ref (a project ref is not a secret - the URL is
   public) and report both. It already runs in the safe-merge preflight, where the token lives, and
   it already never fails its caller. That turns "staging is behind" from a twice-weekly red run
   into a line a person sees at landing time.
2. **Then let the landing push staging too.** `auto-merge.mjs` calls `db:push` once a branch reaches
   `origin/main`; the same call against the staging ref keeps the two databases in step by
   construction, and `db-push.mjs`'s classifier gives it the same refusals. This needs `db:push` to
   accept a target ref, which it does not today.
3. **Do not put any of this in Actions.** The management API needs an ACCOUNT-WIDE personal access
   token, this repository is public, and that is the trade the whole staging setup was built to
   avoid. Standing rule, stated in `hosted-latency.yml`'s own header and in
   `docs/VERIFICATION.md`.

Worth noting that step 2 alone would not have prevented this failure - it would have caused it
sooner, which is the point: the probe was wrong either way, and a same-day red is a far cheaper
place to find that out than a scheduled run reading like a hosted regression.

## Verification

- `npm run check:workflows` - 9 validated.
- `npm run build` - green.
- The probe fix verified against staging from this laptop before pushing (the 401/200 pair above),
  then `hosted-latency` dispatched on the branch: **run 33009345645, green** - and green for a
  reason, not merely green. Both facts read: **35 passed** with a clean verdict from
  `configured-verdict.mjs`, and a real measurement of **~335 ms/request**, taken from a query that
  returned an actual row. Issue #45 closed itself on that run.
- **The latency baseline restarts at 2026-08-26 and this is written into the workflow's own
  summary.** ~335 ms is not a regression against the ~245 ms of 2026-08-25: the earlier number was
  an anon request with no JWT, so it skipped token verification and evaluated the RLS predicate
  against no user. The request changed; the database did not. Do not read the step as a slowdown,
  and do not draw a threshold across it.
- Nothing was written to any database. The main checkout is linked to production; this worktree was
  never linked to anything.

## One more CI-health fault, found by being bitten by it

Landing this branch was refused once, and the cause was the landing procedure's own advice. Written
into `.agent-workflows/queue-merge.md`, because a trap belongs in the contract that loads where it
fires rather than in a handoff nobody re-reads.

`auto-merge.mjs`'s `waitForCi` takes `gh run list --limit 1` - the NEWEST run for the sha, which is
the dispatch you were just told to make - and hands it to `gh run watch --exit-status`. That
**returns immediately on a run still `pending` with zero jobs.** Phase 3 then classifies a run that
has not started and refuses with `run concluded ""; no "CI gate" job`, which reads exactly like a
red suite. On `j-0088` the dispatch was created 27 seconds after the push and the landing was
refused inside the same minute. Nothing was changed by the refusal.

The advice "dispatch as soon as the push line appears" is what makes this likely: it puts the
dispatch inside the same ten-second tick the gate is polling on. The doc now says to confirm
`gh run view <id> --json jobs -q '.jobs | length'` is non-zero, and that a refusal is answered by
re-queueing once the run is green - the second attempt needs no dispatch, because a finished green
run for the tip already exists.

**The durable fix is one function and it is not built here**: `waitForCi` should skip a run with no
jobs and poll until `conclusion` is non-null, rather than trusting `gh run watch` to block. That is
a change to the shared landing path, it wants its own branch and its own test in
`scripts/auto-merge.test.mjs`, and doing it inside a session about hosted-latency would be the
wrong place for it.

## Open

- Issue #45 "Hosted-latency suite is red" closes automatically on the first green run of the fixed
  workflow.
- The next scheduled `hosted-latency` is Sunday 02:40 UTC. That run, on `main`, is the one that
  proves the fix in the shape the owner's email comes from.
- Two CI runs on `claude/c-credits-tickers-roll-602e6b` (32984222302, 32985391450) have been
  `queued` since 2026-08-26 15:09 and 15:31 - five hours at the time of writing, neither started nor
  cancelled. Not investigated here; they do not email, because a run with no conclusion sends no
  thread. Flagged because a run that never starts also never delivers a verdict, which is the shape
  `docs/VERIFICATION.md` calls "costs a per-commit verdict, nothing else".
