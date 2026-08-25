-- Take back the table privileges nobody ever granted: make production's matrix equal what 0051
-- STATES, and remove a table that has never held a row.
--
-- WHAT 0051 LEFT NAMED AND NOT DONE. 0051 wrote down the grants this schema had only ever inherited
-- from hosted Supabase's bootstrap
--
--   alter default privileges in schema public grant all on tables to anon, authenticated, service_role
--
-- and deliberately granted the NARROWEST set each table's own RLS policies already admit, rather
-- than copying production's matrix - "reproducing them would be copying an accident". It could only
-- grant, never revoke, so it asserted that the intended privileges are PRESENT and never that
-- others are ABSENT. That kept it a no-op on the one database that must not notice it, and it left
-- production holding the accident. Its header named the remainder and did not do it, "the same call
-- 0028 made about `admin_audit_log` and `funnel_events`". This is that remainder.
--
-- MEASURED ON PRODUCTION, 2026-08-25, via `information_schema.role_table_grants`: `anon` and
-- `authenticated` each hold DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE and UPDATE on all
-- nineteen tables created between 0001 and 0050 - including `anon` on `documents`, `agent_keys` and
-- `allowlist`, none of which has an anon policy. The fourteen tables added from 0010 on hold none of
-- it, because each of those said `revoke all … from public, anon, authenticated` at creation.
--
-- WHY THIS IS SAFE, AND WHY IT IS NOT MERELY COSMETIC. Every one of those tables has RLS enabled, so
-- a privilege with no matching policy already returns nothing - the accident is inert TODAY. It is
-- worth removing anyway because inert is a property of the policies, not of the grant: the day
-- somebody adds a permissive policy to one of these tables for a signed-in reader, `anon` inherits
-- the reach of that policy too, with nothing in the SQL to say it should. A grant nobody chose is a
-- decision waiting to be made by accident.
--
-- The four ways this could have broken something, each checked rather than assumed:
--
--   * A POLICY EXPRESSION RUNS AS THE QUERYING ROLE, so a policy that reads another table needs the
--     caller to hold SELECT on it (supabase/AGENTS.md). Three do: `chat_submissions`' owner
--     policies read `shows`, and `control_events_owner_delete` reads `control_shows`. All three are
--     `authenticated`, and 0051 grants `authenticated` SELECT on both tables, so the reads survive.
--     No policy on a `public` table is evaluated for `anon` against a table anon loses here, and no
--     `storage.objects` policy reads a `public` table at all.
--   * THE PREDICATE FUNCTIONS. `is_moderator`, `is_suspended`, `feature_denied`, `show_accepts` and
--     `storage_within_quota` read `moderators`, `user_accounts`, `user_grants`, `plans`, `shows` and
--     `storage_quotas`. All five are SECURITY DEFINER (checked against the live catalog:
--     `pg_proc.prosecdef` is true for each), so they run as the owner and need no caller grant.
--     `is_suspended` and `feature_denied` already prove this on production every day - they read
--     tables from 0010 on, which revoked `authenticated` at creation.
--   * A SECURITY INVOKER FUNCTION reachable by a client role would read as its caller. There is
--     exactly one - `set_updated_at`, a trigger function that assigns `new.updated_at` and touches
--     no table.
--   * FOREIGN KEYS. `chat_submissions.show_id` references `shows`, and an anon INSERT fires that
--     check. Referential-integrity triggers run as the owner of the REFERENCED table, not as the
--     inserting role, so the check is unaffected. (The `REFERENCES` privilege being revoked here is
--     the right to CREATE a foreign key, not the enforcement of one.)
--
-- WHAT IS DELIBERATELY LEFT ALONE. `service_role` keeps TRUNCATE, REFERENCES and TRIGGER. It is the
-- server's single break-glass identity, it bypasses RLS entirely, and its key is a server secret
-- that never reaches a browser - so TRUNCATE hands it no reach that DELETE does not already. More
-- to the point, `admin_audit_log` and `user_feedback` are append-only BY PRIVILEGE (0030, 0028), and
-- a sweeping revoke against `service_role` is exactly the kind of statement that would quietly
-- reshape those two. Nothing below names the role.
--
-- ── public.assets: the dedupe index that was never wired ─────────────────────────────────────────
--
-- 0001 created `assets` as "one row per embedded font/image, pointing at a Storage object", with
-- `content_hash` commented as the "dedupe key (the 6 bundled fonts upload once, not per-graphic)".
-- Measured on production 2026-08-25: **0 rows**, against 294 `documents` rows and 23 objects holding
-- 9.1 MB in the `user-assets` bucket. Nothing has ever written it.
--
-- The obvious reading - "dedupe was never wired, so every graphic re-uploads its fonts and that is a
-- real egress cost against the 50 MB/account sizing in supabase/README.md" - is WRONG, and the
-- evidence says why. Dedupe was wired; it just never needed a table. `externalizeAssets`
-- (src/backend/assets.ts) uploads each asset to the key `${uid}/${contentHash(data)}` and replaces
-- the inline data-URL with a `spx-storage:` sentinel, so identical bytes for one user always land on
-- the same object no matter how many graphics embed them. The bundled fonts do upload once. And the
-- 50 MB ceiling does not read this table either: `storage_within_quota` (0039) sums
-- `storage.objects` directly. So there is no egress cost and no accounting gap.
--
-- What the table WOULD have bought is a document-to-object back-reference, for reclaiming orphaned
-- objects when a document is deleted - which is genuinely missing today, and is the reason to keep
-- looking at this. But it does not need this table either: `documents.body` already carries every
-- storage key it references, as those same sentinels, so the orphan set is
-- `storage.objects` minus the sentinels in `documents`. The table is a denormalized index of data
-- that is already stored twice over, and it has never been the source of truth for anything.
--
-- Its one reader is `api/_lib/adminUsers.ts`, which sums `bytes` for a user's "Cloud storage"
-- figure on the /admin user detail - a number that is therefore structurally 0 for every account,
-- on a project holding 9.1 MB. That is worse than no number. The table goes, and the same commit
-- points that read at the `user-assets` bucket, where the bytes actually are. Nothing enforces on
-- the figure (`storageBytes` is in OBSERVE_ONLY_LIMITS; the ceiling is the RESTRICTIVE storage
-- policy from 0039), so this changes what an operator SEES and nothing about what anyone may do.
--
-- Reclaiming orphans is still not built. It is a job for a retention cron reading `documents.body`
-- and `storage.objects`, and it is named here and not done here.

-- ── The table that never held a row ──────────────────────────────────────────────────────────────
-- `if exists` so a self-hoster who never applied 0001, or applied it after this, is unaffected.
-- Nothing references it: no foreign key points at it, and the one reader moves to Storage in the
-- same commit.
drop table if exists public.assets;

-- ── Take the inherited matrix back to what 0051 states ───────────────────────────────────────────
-- `revoke` then `grant`, in that order, inside the one transaction `supabase db push` wraps each
-- migration in. On a stack that only ever ran 0051 this is a round trip to the same place: the
-- revoke removes 0051's grants and the grants below put back exactly the same set. On production it
-- removes what the bootstrap added and leaves 0051's set standing. Either way the END STATE is the
-- matrix, stated once, rather than a diff against whatever the host happened to do.
--
-- `public` is in the revoke list for completeness, not because it holds anything: production shows
-- no PUBLIC grant on any of these tables. Revoking from PUBLIC does not touch a role's own grant.
revoke all on table
  public.agent_auth_codes,
  public.agent_keys,
  public.allowlist,
  public.audience_rounds,
  public.audience_submissions,
  public.audience_votes,
  public.chat_blocklist,
  public.chat_submissions,
  public.community_reports,
  public.community_templates,
  public.control_events,
  public.control_show_identity,
  public.control_shows,
  public.documents,
  public.moderators,
  public.render_jobs,
  public.shows,
  public.storage_quotas
  from public, anon, authenticated;

-- ── …and put back exactly what the shipped policies say each role may do ─────────────────────────
-- Identical to 0051's client half, minus `assets`. Kept as literal statements rather than folded
-- into a loop: this list IS the security record, and a reader must be able to check it by reading.
grant select, insert, update, delete on table public.documents           to authenticated;
grant select, insert, update, delete on table public.shows               to authenticated;
grant select, insert, update, delete on table public.control_shows       to authenticated;
grant select, insert, update, delete on table public.community_templates to authenticated;
grant select, insert                 on table public.community_reports   to authenticated;
grant select, update                 on table public.chat_submissions    to authenticated;
grant select, delete                 on table public.control_events      to authenticated;
grant select                         on table public.render_jobs         to authenticated;

-- The two anon-facing surfaces: the public show-chat submit page (0003) and the capability-URL
-- readers that tail a production's control log (0008).
grant select, insert                 on table public.chat_submissions    to anon;
grant select                         on table public.control_events      to anon;

-- ── Self-check ───────────────────────────────────────────────────────────────────────────────────
-- Three assertions, and the middle one is the whole reason this migration exists.
--
-- (a) PRESENCE: every privilege the matrix names is held. Same shape as 0051's, and the same trap:
--     ONE privilege per has_table_privilege() call, because passing it a comma list returns true
--     when ANY of the listed privileges is held.
-- (b) ABSENCE: `anon` and `authenticated` hold NOTHING ELSE on any table in `public`. 0051 could
--     not assert this - an absence assertion would have refused to apply on production, which was
--     the one database it had to leave untouched. Here it is the point, and it is also the guard
--     against the next table arriving with the bootstrap's grants attached and nobody noticing.
-- (c) RUNTIME: the read still works as the role the app signs in as. A catalog that says the grant
--     is there and a statement that is still refused is the failure worth spending a role switch
--     on - and after a revoke it is the failure most worth checking.
--
-- (c) needs `set local role`, and RESET ROLE is the wrong way back: it restores `session_user`, and
-- `supabase db push` connects as a temporary login role holding no grants, so RESET ROLE lands
-- there and the next statement dies looking like this migration broke something. Capture
-- `current_role` and set it back by name, on the exception path too. (The trap 0042 hit first.)
do $$
declare
  v_role    text := current_role;
  v_missing text := '';
  v_extra   text := '';
  r record;
begin
  -- (a) The intended matrix, stated once more as data so the assertion cannot drift from intent.
  for r in
    select v.role_name, v.table_name, p.privilege
    from (values
      ('authenticated', 'documents',           'select, insert, update, delete'),
      ('authenticated', 'shows',               'select, insert, update, delete'),
      ('authenticated', 'control_shows',       'select, insert, update, delete'),
      ('authenticated', 'community_templates', 'select, insert, update, delete'),
      ('authenticated', 'community_reports',   'select, insert'),
      ('authenticated', 'chat_submissions',    'select, update'),
      ('authenticated', 'control_events',      'select, delete'),
      ('authenticated', 'render_jobs',         'select'),
      ('anon',          'chat_submissions',    'select, insert'),
      ('anon',          'control_events',      'select')
    ) as v(role_name, table_name, privileges),
    lateral unnest(string_to_array(v.privileges, ', ')) as p(privilege)
  loop
    if not has_table_privilege(r.role_name, 'public.' || r.table_name, r.privilege) then
      v_missing := v_missing || format(' %s(%s on %s)', r.role_name, r.privilege, r.table_name);
    end if;
  end loop;

  if v_missing <> '' then
    raise exception '0052 self-check (a) FAILED: the matrix is missing:%', v_missing;
  end if;

  -- (b) Nothing beyond it. Read from the catalog rather than from the statements above, so a
  --     privilege that arrived by any route at all - a bootstrap default, a hand-run grant, a
  --     future migration that forgets - shows up here.
  select string_agg(format(' %s(%s on %s)', g.grantee, lower(g.privilege_type), g.table_name), '')
    into v_extra
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.grantee in ('anon', 'authenticated')
    and not exists (
      select 1
      from (values
        ('authenticated', 'documents',           'select, insert, update, delete'),
        ('authenticated', 'shows',               'select, insert, update, delete'),
        ('authenticated', 'control_shows',       'select, insert, update, delete'),
        ('authenticated', 'community_templates', 'select, insert, update, delete'),
        ('authenticated', 'community_reports',   'select, insert'),
        ('authenticated', 'chat_submissions',    'select, update'),
        ('authenticated', 'control_events',      'select, delete'),
        ('authenticated', 'render_jobs',         'select'),
        ('anon',          'chat_submissions',    'select, insert'),
        ('anon',          'control_events',      'select')
      ) as v(role_name, table_name, privileges),
      lateral unnest(string_to_array(v.privileges, ', ')) as p(privilege)
      where v.role_name = g.grantee
        and v.table_name = g.table_name
        and p.privilege = lower(g.privilege_type)
    );

  if v_extra is not null and v_extra <> '' then
    raise exception
      '0052 self-check (b) FAILED: privileges no migration granted are still held:%', v_extra;
  end if;

  -- (c) The read itself, as the role the app signs in as, and as the role a phone on the join page
  --     is. No rows are touched and none need to exist: RLS returns nothing without a JWT, but the
  --     PRIVILEGE is checked before the policy, so a missing grant raises 42501 here and refuses
  --     the migration rather than the next user's request.
  set local role authenticated;
  perform 1 from public.documents limit 1;
  perform 1 from public.control_shows limit 1;   -- what control_events_owner_delete's policy reads
  perform 1 from public.shows limit 1;           -- what chat_submissions' owner policies read
  execute format('set local role %I', v_role);

  set local role anon;
  perform 1 from public.chat_submissions limit 1;
  perform 1 from public.control_events limit 1;
  execute format('set local role %I', v_role);
exception when others then
  execute format('set local role %I', v_role);
  raise;
end $$;
