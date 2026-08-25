# supabase - migrations, policies and the remote ledger

Loaded alongside the root `AGENTS.md` when working in this directory. `supabase/README.md` covers
what the folder is and how a self-hoster stands an instance up; this file holds the rules that are
only learnable by getting them wrong against a real database.

## Grants are the migration's job, not the host's

**A migration must grant table privileges explicitly.** Until `0051_client_table_grants.sql`
(2026-08-25) not one migration granted anything to `anon` or `authenticated`, and only fourteen
named `service_role` - yet production worked, because hosted Supabase's bootstrap runs
`alter default privileges in schema public grant all on tables to anon, authenticated,
service_role`. A local `supabase start` has no such bootstrap, so every signed-in read came back
`42501 permission denied for table documents` and the app showed "Sync error": 17 of 32 configured
specs failed that way. Self-hostability is a stated pillar, so a schema that only works on the
vendor's default privileges is a product defect, not a test-environment quirk.

Verify with `information_schema.role_table_grants` on a LOCAL stack, never on production - the
hosted project's answer is the one that hides the omission.

## A policy expression runs with the QUERYING role's privileges

The caller must hold EXECUTE on every function a policy names, **even a `SECURITY DEFINER` one**.
Revoking a predicate does not quietly make the policy fall back to denying - the whole statement
fails with `42501 permission denied for function`. `is_suspended` is called by nine restrictive
policies on every write, so revoking it would have denied documents, assets, community publishes,
control shows and uploads to every signed-in user.

The instinctive fix for "this function is exposed" is `revoke execute`. For anything a policy
references, that is an outage. Change the function's SHAPE instead - dropping the `uuid` argument
removed the probe while keeping the grant the policies need.

## A migration must never change the session role

`supabase db push` connects as an unprivileged `cli_login_postgres` and elevates with
`SET SESSION ROLE postgres`. A `RESET ROLE` inside a migration drops the session back down, and
the CLI then cannot write `supabase_migrations.schema_migrations` - the whole migration rolls back
on `permission denied for schema supabase_migrations`, an error that looks entirely unrelated to
what you changed.

## A self-check proves SHAPE, never behaviour - so CALL the thing

Migration 0035 shipped `audience_open_round` broken and every gate said yes. Its body closed the
previous round with an unqualified `where ... closed_at is null`, while the function's own
`RETURNS TABLE` declares an OUT parameter named `closed_at` - so every call failed at runtime with
`42702 column reference "closed_at" is ambiguous`.

Nothing caught it because **a plpgsql body is not resolved at CREATE time.** The function
compiles, `to_regprocedure` finds it, `pg_get_function_result` reports the right columns, the
grants are right; 0035's self-check asserted all of that and passed. Only calling it fails.

- In a self-check, CALL it: insert a throwaway row against a real owner, run the function, assert
  the effect, delete the row (that is what 0036 does). Shape checks are still worth having - they
  are just not evidence that it works.
- In any `RETURNS TABLE` plpgsql function, **table-qualify every column reference in the body**.
  `RETURNS TABLE (...)` silently creates a variable per column; six of that function's seven OUT
  names were also columns of the table it writes.
- **Never edit an applied migration to fix it.** 0035 stayed exactly as applied; 0036 is the fix.

## Apply migrations with `db push`, never the MCP tool

The remote ledger keys each migration by the four-digit `version` parsed from the filename
(`0017_admin_roles.sql` -> version `0017`, name `admin_roles`), and `db push` decides what is
pending by diffing that column against this folder.

The Supabase MCP `apply_migration` tool mints its OWN timestamp version (`20260730062721`) and
stuffs the whole filename into `name`. The schema change lands correctly, and then **the damage is
silent and deferred**: everything works until the next `db push`, which sees those files as
pending and re-runs them against the live database. `create policy` and `create trigger` have no
`if not exists`, so it fails partway through. `list_migrations` looks fine in between, because it
prints whatever is in the table.

Confirm with `supabase migration list --linked` - every row should read `local == remote`. A row
with an empty `remote`, or a bare timestamp with an empty `local`, is drift. Repair by UPDATEing
`version`/`name` in place to match the filenames, in one transaction with a post-check that fails
unless every version is four digits. Never re-run the migration to "fix" the ledger.

## Two branches must never mint the same number

The loser is SILENTLY SKIPPED by `db push`, which still reports success.
`node scripts/merge-order.mjs` detects this across every branch ahead of `main` and returns
`hold`; renumber the UNAPPLIED one.
