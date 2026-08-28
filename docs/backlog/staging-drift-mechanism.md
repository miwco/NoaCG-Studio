# Keep `noacg-staging` in step with production by construction, not by remembering

**Filed:** 2026-08-27. **Source:** the CI-health session of 2026-08-27, which found this while
diagnosing a red `hosted-latency` run. Its handoff has since been consumed; `git log` is the record.

## Why

`scripts/migration-drift.mjs` and the automatic `db:push` both aim at the single project
`VITE_SUPABASE_URL` names. **`noacg-staging` is outside both**, so it is current only while somebody
remembers to push it, exactly as `hosted-latency.yml`'s own header admits.

The header says the symptom of forgetting is the suite failing loudly. Session G found the other
half: **staging catching UP can also turn a job red**, when a probe or a spec leans on a privilege a
migration is about to remove. That is what happened - `0052` revokes the anon grant hosted
Supabase's bootstrap hands every new table, and the latency probe had been reading `documents` with
the anon key alone. From the email the two causes are indistinguishable, and both surface only when
a scheduled run goes red up to twelve hours later.

## What it would take

1. **Name staging in the drift check.** `migration-drift.mjs` reads one ref; give it a second,
   declared ref (a project ref is not a secret - the URL is public) and report both. It already runs
   in the safe-merge preflight, where the token lives, and it already never fails its caller. That
   turns "staging is behind" from a twice-weekly red run into a line a person sees at landing time.
2. **Then let the landing push staging too.** `auto-merge.mjs` calls `db:push` once a branch reaches
   `origin/main`; the same call against the staging ref keeps the two in step by construction, with
   `db-push.mjs`'s classifier giving it the same refusals. This needs `db:push` to accept a target
   ref, which it does not today.
3. **Do not put any of this in Actions.** The management API needs an ACCOUNT-WIDE personal access
   token and this repository is public - the trade the whole staging setup was built to avoid.
   Standing rule, stated in `hosted-latency.yml`'s header and in `docs/VERIFICATION.md`.

Step 2 alone would not have prevented the failure that prompted this. It would have caused it
sooner, which is the point: the probe was wrong either way, and a same-day red is a far cheaper
place to find that out than a scheduled run reading like a hosted regression.

## Evidence

Both ledgers read through the management API on 2026-08-26 stood at 52 entries with the same ten
`anon`/`authenticated` grants - staging was NOT behind, which is why the obvious diagnosis was
wrong. The probe reproduced 401 on the anon key and 200 with a signed-in JWT against the same row.
Full measurement in the handoff named above (in git history from 2026-08-27).
