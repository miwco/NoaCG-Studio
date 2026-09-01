# 2026-09-01 - session G - the teams schema (P1 stages 1 and 2)

Branch `claude/g-teams-schema`, five commits: migrations `0053_teams_and_membership.sql` and
`0054_team_productions.sql`, the doc records in `docs/PROGRAMMES.md` and `docs/TEAMS_PLAN.md`, and
the fixes the pre-merge review found. No product code changed, so CI's E2E plan job correctly
planned zero shards; the real gate for this branch is `configured-suite`, which brings up a fresh
local Supabase stack and applies every migration.

## What landed

**M1, migration 0053 - the principal.** `teams` and `team_members` exactly as the plan's §3 sketch
draws them, plus `is_team_member`, `team_join` and `team_rotate_code`. Joining is a rotatable
capability code resolved by a definer function, not an emailed invitation (SMTP is not provisioned)
and not an INSERT policy - a policy cannot express "holding the code authorizes this" without
admitting reads of every team's code, so `team_members` has no INSERT or UPDATE policy at all and
`authenticated` holds neither privilege on it. Owner and member are the only roles; `role` is a
label for the UI and `teams.owner_id` is the authority every owner-only check reads. A team can
never exist with an owner who is not in it: both branches of the delete policy exclude that case.

**M2, migration 0054 - the shared production.** `team_productions` (the preparation document, a
server row outside the sync mirror), the `team_production_save` compare-and-swap RPC,
`control_shows.team_id`, and the OR-branch on `control_shows_owner_all` plus the same branch on
`control_events_owner_delete`, which is the policy the publish path's log prune goes through.
That pair is the whole "member B republishes and the capability slugs never move" story. Both
`alter policy`, never drop-and-recreate.

**Nothing beyond M1 and M2.** No other per-user predicate is touched. The `control_events` policy is
the one the plan's §3 names as widening "the same way"; without it a teammate's republish would
leave the log growing unbounded on a 24/7 output URL.

## Where the migrations are deliberately different from the sketch

All of it is argued in each file's own header, and summarised in `docs/TEAMS_PLAN.md` §7. Short
form:

- **Tighter.** No UPDATE policy or privilege on `team_productions`, so the CAS function is the only
  write path rather than the recommended one - the sketch lists `update` among the member policies,
  and its own next paragraph is the reason not to. The widened WITH CHECK is a CASE rather than the
  USING expression repeated. A restrictive INSERT policy keeps `owner_id = auth.uid()` true on the
  way in. Deleting a team production is the TEAM owner's call on both planes. Both new tables carry
  0020's suspension absolute, repeated inside the two definer functions because a definer function
  never meets a policy.
- **Repairs.** `updated_by` and `control_shows.team_id` are `on delete set null`; the sketch's bare
  references would have made deleting an account or a team fail outright. The CAS token advances
  strictly.
- **Rulings 2 and 3.** Ruling 3 is a restrictive delete policy on each plane. Ruling 2 needs a
  BEFORE UPDATE trigger, because RLS sees the old row or the new one and never both.

## What the pre-merge review found, and what it cost

`/check`: **review: delegated** (code-review skill at level `high`; it forked and handed its
findings back into this conversation, and both the branch and the file list matched phase 1's
scope). **simplify: inline** - the skill returned background fan-out instructions, which in a
launched session never come back, so the four angles were done here. **verify: inline.**

The review found seven things; six were confirmed and fixed in commit `8e31b649`, and they were
real:

1. **The guard trigger had the wrong principal.** It exempted the row's own owner, but
   `control_shows.owner_id` is whoever published FIRST and any member may be that. A member could
   publish the team production, clear its team stamp, and walk off with the capability slugs, the
   pinned payload and the event log - and the team owner, matching neither branch of the widened
   policy any more, would have been locked out with no path back short of `service_role`. That is
   ruling 2 handed to exactly the wrong account.
2. **The CAS token was not guaranteed to advance.** Two writers holding the same token, with the
   first committing inside the millisecond the row was last written in, would both have matched and
   the second would have overwritten the first in silence - the one failure the function exists to
   prevent.
3. **WITH CHECK repeating USING** let anyone stamp a row they own with any team's uuid, including a
   team they had been removed from.
4. **INSERT was judged by WITH CHECK alone**, and the team branch says nothing about `owner_id`, so
   a member of any team (and anyone can make one) could mint rows attributed to another account.
5. **`create trigger` was not idempotent.**
6. **No suspension gate** on the new write paths, against §5's "the acting user's entitlement gates
   every verb".

The seventh (low) is **accepted, not fixed, and needs no decision**: `authenticated` holds
table-wide UPDATE on `teams`, so a team owner can set their own `join_code` to something guessable
instead of going through `team_rotate_code`. It affects only their own team, only from their own
account, and the precise fix - a column-level grant - is not recognised by
`scripts/client-grants-migration.test.mjs`'s grant regex, so it would have meant editing a shared
build gate at night to close a self-inflicted foot-gun. Recorded here rather than left implicit.

The simplify pass found one thing: my own header had drifted from the file after the review fixes
(it still said "two refinements"). Fixed. No code-shape changes - the self-check duplication
between the two migrations is house style, since a migration is an immutable self-contained file
and the shared alternative would be a persistent database object.

## Evidence - which bar each stage met

Both stages' evidence bars in `docs/TEAMS_PLAN.md` §7 are **met**, and one of them is met in a way
worth writing down, because "the self-check is written" and "the self-check runs" are different
claims and this repo has been burned by the difference (0035).

- **Applies to a fresh local stack:** `configured-suite` run **33556524531** on `8e31b649`, "54
  applied, 54 in the repository", followed by the 32 authenticated specs green. Docker is not
  installed on this laptop, so that CI job is the local stack; a migration that raised would have
  aborted and shown as 52 or 53.
- **The self-checks actually RUN there, rather than skipping.** The house pattern borrows two
  `auth.users` rows and skips when there are none - and a fresh stack has none, so the behavioural
  half would never have run anywhere except production. Both blocks now create two throwaway
  accounts when the users table is EMPTY and remove them in the same transaction; an instance with
  even one real account still skips, and a GoTrue schema that refuses the synthetic row degrades to
  the same skip instead of failing a migration.
- **Proven by a negative control, not asserted.** Run **33554219933** deliberately broke one CAS
  assertion and the fresh-stack job went red with
  `ERROR: 0054 self-check (c) FAILED: an up-to-date save was refused: {"saved": true, "updated_at":
  "2026-09-01T20:17:31.542+00:00", …}`. That output proves the walk executed on a fresh stack, that
  the accounts were really made, and that the millisecond truncation works (three decimals). The
  commit was dropped and the branch force-pushed back to its clean state.
- **The CAS test §7 stage 2 asks for** is inside 0054: two writers, the stale one refused and
  handed the current document, the document unchanged, the retry with the returned stamp accepted,
  and back-to-back saves proving the token advances.
- `scripts/db-push.test.mjs` green, and the classifier accepts both files with zero findings - no
  refusal will reach the owner when the queue applies them. `definer-grants`, `client-grants` and
  `extension-order` green too. `npm run build` green. CI **33556523907** green (Build, Factory
  gates, CI gate; shards correctly skipped - no product code).
- SQL syntax and every plpgsql body were compiled against the real PostgreSQL grammar
  (`pg-query-emscripten`) before each push. That is how the `v_row.updated_at` INTO-target bug was
  caught before it reached a runner.

**UNVERIFIED, stated as such:** nothing in these two stages. What is *out of scope* and therefore
untested is everything the client will do with this - the share dialog, the list, the verb saves -
which is stages 3 to 5.

## What is left, and the tail

**Stage 3 has no schema-side prerequisite.** I checked each verb it needs against what landed:
create a team (insert policy + suspension gate), join (`team_join`), leave (delete policy), remove a
member (same policy), rotate the code (`team_rotate_code`), list my teams (select policy), read the
member list (select policy). All present. Stage 3 is pure client work, so I stopped rather than
starting it.

Two things stage 4 must know, both also recorded in `docs/TEAMS_PLAN.md` §7 so they are not only
here:

- **The CAS token is a `timestamptz` truncated to milliseconds.** It is truncated precisely so a
  JavaScript `Date` round-trip is lossless. Do not re-format it; send back what came back.
- **Moving a team production back to personal is ONE statement** by the team owner that sets
  `owner_id` to themselves AND clears `team_id`. Writing either column alone is refused - by the
  trigger if you clear the stamp without claiming the row, by WITH CHECK if you claim it without
  clearing the stamp.

## For the owner - nothing blocking, two things recorded

Neither needs an answer before stage 3 starts; both are decisions I made inside the ratified plan
and would rather have visible than buried:

1. **Every member of a team can see their team's join code, so any member can invite.** That is the
   capability doctrine followed honestly, and the owner keeps rotation. Hiding one column would
   have meant another RPC. If the autumn class wants teacher-only invites, that is a small
   follow-up migration.
2. **A member cannot unpublish a team production; only the team owner can.** Ruling 3 says deleting
   is owner-only and §6 says unpublishing is half of deleting, so the two planes now agree. The
   cost is that a student who published cannot take their own publish down without the teacher.
   If that reads wrong on the day, it is one policy line.
