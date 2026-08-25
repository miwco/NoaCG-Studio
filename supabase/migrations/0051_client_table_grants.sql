-- Grant the table privileges this schema has only ever INHERITED from Supabase's hosted bootstrap,
-- so `supabase/` stands an instance up on its own rather than on a host that happens to be generous.
--
-- WHAT IS BROKEN. Not one migration in this folder grants a table privilege to `anon` or
-- `authenticated`, and only fourteen name `service_role`. Production works anyway because a hosted
-- Supabase project ships
--
--   alter default privileges in schema public grant all on tables to anon, authenticated, service_role
--
-- so every table a migration creates arrives already granted to all three. This folder's README
-- calls itself "everything a self-hoster needs to stand up their own instance" and documents
-- `supabase start` / `supabase db push` as the way to do it. Follow that on a stack whose default
-- privileges were never set and the schema is inert: `documents` exists, RLS is on, the policies
-- are correct, and every signed-in read comes back
--
--   42501 permission denied for table documents
--   hint: GRANT SELECT ON public.documents TO authenticated;
--
-- with the app showing "Sync error". Measured 2026-08-25: 17 of the 32 configured E2E specs fail
-- exactly that way against a local stack, and none against production. Self-hostability is a
-- product pillar (docs/GOALS.md, the AGPL repo, this folder), so that is a defect in the schema,
-- not a quirk of the runner that found it.
--
-- 0030 and 0028 already wrote down the other half of this mechanism: because the bootstrap grants
-- everything up front, a NARROW grant restricts nothing, and "I only granted two privileges" is not
-- the same statement as "only two privileges exist". This migration is that lesson's mirror image.
-- There the inherited grant was more than a migration meant to give; here it is the only reason the
-- app can read its own rows, and it disappears the moment you leave the host that supplied it. Both
-- come from the same place: privileges the SQL never states.
--
-- WHAT THIS IS NOT. **Grants decide whether a role may touch a table at all; RLS decides WHICH
-- ROWS.** Nothing below widens what anyone can see. Every table here has RLS enabled, and the
-- policies that were already shipped are untouched - a role holding SELECT on `documents` still
-- reads only rows where `auth.uid() = user_id`, and a role holding SELECT on a table with no
-- policies still reads nothing at all.
--
-- A NO-OP ON PRODUCTION, BY CONSTRUCTION. Every privilege granted below is one production already
-- holds (verified against the live project on 2026-08-25 via
-- `information_schema.role_table_grants`), and the migration only ever grants - it revokes nothing,
-- so it cannot narrow what is there. Two consequences worth stating, because both are deliberate:
--
--   * The grants are the NARROWEST set that matches each table's policies, not a copy of
--     production's matrix. Production additionally holds TRUNCATE, REFERENCES and TRIGGER on all of
--     these, and holds every privilege for `anon` on tables where no anon policy exists. Those are
--     bootstrap leftovers that RLS makes inert; reproducing them would be copying an accident.
--   * The self-check therefore asserts only that the intended privileges are PRESENT, never that
--     others are absent. An absence assertion would refuse to apply on production, which is the one
--     database that must not notice this migration at all.
--
-- Tightening what the bootstrap over-granted on production is a separate, deliberate change to a
-- live security record - the same call 0028 made about `admin_audit_log` and `funnel_events`, and
-- left alone for the same reason. It is named here and not done here.
--
-- HOW EACH LINE WAS DECIDED. The RLS policies are the schema's own statement of who may do what, so
-- a client role is granted a privilege exactly where a policy already names that role for that
-- command. A policy without the matching grant can never fire, which is the incoherence this fixes.
--
--   documents, assets            authenticated: the four DML verbs (per-user policies, all four commands)
--   shows, control_shows,        authenticated: the four DML verbs (an owner `for all` policy)
--     community_templates
--   community_reports            authenticated: select, insert (report and read back; never edited)
--   chat_submissions             anon: select, insert (the public submit page + the on-air read)
--                                authenticated: select, update (the owner's moderation queue)
--   control_events               anon: select / authenticated: select, delete
--                                (writes are RPC-only by design - 0008; the owner's DELETE is the
--                                 7-day prune in src/control/hostedControl.ts)
--   render_jobs                  authenticated: select (status polling; the worker writes as the server)
--
-- Every other table in `public` keeps NOTHING for either client role. The ten below are RLS-on with
-- no policies - deny-all, reachable only through SECURITY DEFINER functions (which run as the owner
-- and need no caller grant) or as the server: agent_auth_codes, agent_keys, allowlist,
-- audience_rounds, audience_submissions, audience_votes, chat_blocklist, control_show_identity,
-- moderators, storage_quotas. That posture is unchanged; it simply now survives a host that does
-- not hand `anon` a grant on every new table.
--
-- THE SERVER ROLE. The fourteen tables added from 0010 on already say `revoke all ... from public,
-- anon, authenticated` and `grant ... to service_role`, so they are self-sufficient and are left
-- alone - including the two whose grants are deliberately narrow (`admin_audit_log` and
-- `user_feedback` are append-only by privilege since 0030 and 0028; nothing below names them, so
-- that stays true). The nineteen tables from 0001-0008 and 0035-0050 never named the role at all,
-- and the server reaches many of them with the service key - `api/_lib/adminUsers.ts` reads
-- `documents`, `assets` and `render_jobs`, `api/_lib/agentAccessStore.ts` owns `agent_keys` and
-- `agent_auth_codes` outright (0050: "the service role is the only reader and writer"), and this
-- folder's README tells an operator to retune `storage_quotas` "as the service role". They get the
-- four DML verbs uniformly: service_role is the server's single break-glass identity, it bypasses
-- RLS, and its key is a server secret that never reaches a browser, so there is no per-table
-- boundary for a narrower grant to draw. TRUNCATE is not included - nothing needs it.

-- ── Client roles: exactly what the shipped policies already say they may do ───────────────────────
grant select, insert, update, delete on table public.documents           to authenticated;
grant select, insert, update, delete on table public.assets              to authenticated;
grant select, insert, update, delete on table public.shows               to authenticated;
grant select, insert, update, delete on table public.control_shows       to authenticated;
grant select, insert, update, delete on table public.community_templates to authenticated;
grant select, insert                 on table public.community_reports   to authenticated;
grant select, update                 on table public.chat_submissions    to authenticated;
grant select, delete                 on table public.control_events      to authenticated;
grant select                         on table public.render_jobs         to authenticated;

-- The two anon-facing surfaces: the public show-chat submit page (0003) and the capability-URL
-- readers that tail a production's control log (0008). Both are anon by construction - a viewer on
-- a phone and a CasparCG client hold a slug, never an account.
grant select, insert                 on table public.chat_submissions    to anon;
grant select                         on table public.control_events      to anon;

-- ── The server role, on the nineteen tables that never named it ──────────────────────────────────
grant select, insert, update, delete on table
  public.agent_auth_codes,
  public.agent_keys,
  public.allowlist,
  public.assets,
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
  to service_role;

-- ── Self-check ───────────────────────────────────────────────────────────────────────────────────
-- (a) Every privilege named above is actually held, asserted from the catalog rather than from the
--     fact that the statements ran. This is the half that would have caught the omission in 0001.
-- (b) `authenticated` can really READ `documents` - the exact query whose 42501 is the reported
--     symptom. A grant that is present in the catalog and still refused at runtime is the failure
--     worth spending a role switch on, so the check runs the read instead of trusting (a).
--
-- (b) needs `set local role`, and RESET ROLE is the wrong way back: it restores `session_user`, and
-- a migration does not run as its session user - the CLI connects as a temporary login role and
-- switches to `postgres` to apply the file, so RESET ROLE lands on a role holding no grants and the
-- next statement dies as if this migration had broken something. Capture `current_role` and set it
-- back by name, on the exception path too. (The trap 0042 hit first.)
do $$
declare
  v_role text := current_role;
  v_missing text := '';
  r record;
begin
  -- (a) The intended matrix, stated once more as data so the assertion cannot drift from intent.
  --
  -- One privilege per has_table_privilege() call, deliberately: passing it the comma list returns
  -- true when ANY of the listed privileges is held, not all of them, so a single-call-per-row check
  -- would pass on a role holding nothing but SELECT. (Caught by testing the check against a real
  -- cluster with one privilege revoked - it reported clean.)
  for r in
    select v.role_name, v.table_name, p.privilege
    from (values
      ('authenticated', 'documents',           'select, insert, update, delete'),
      ('authenticated', 'assets',              'select, insert, update, delete'),
      ('authenticated', 'shows',               'select, insert, update, delete'),
      ('authenticated', 'control_shows',       'select, insert, update, delete'),
      ('authenticated', 'community_templates', 'select, insert, update, delete'),
      ('authenticated', 'community_reports',   'select, insert'),
      ('authenticated', 'chat_submissions',    'select, update'),
      ('authenticated', 'control_events',      'select, delete'),
      ('authenticated', 'render_jobs',         'select'),
      ('anon',          'chat_submissions',    'select, insert'),
      ('anon',          'control_events',      'select'),
      ('service_role',  'documents',           'select, insert, update, delete'),
      ('service_role',  'assets',              'select, insert, update, delete'),
      ('service_role',  'render_jobs',         'select, insert, update, delete'),
      ('service_role',  'agent_keys',          'select, insert, update, delete'),
      ('service_role',  'agent_auth_codes',    'select, insert, update, delete'),
      ('service_role',  'storage_quotas',      'select, insert, update, delete')
    ) as v(role_name, table_name, privileges),
    lateral unnest(string_to_array(v.privileges, ', ')) as p(privilege)
  loop
    if not has_table_privilege(r.role_name, 'public.' || r.table_name, r.privilege) then
      v_missing := v_missing || format(' %s(%s on %s)', r.role_name, r.privilege, r.table_name);
    end if;
  end loop;

  if v_missing <> '' then
    raise exception '0051 self-check (a) FAILED: privileges missing after the grants:%', v_missing;
  end if;

  -- (b) The read itself, as the role the app signs in as. No rows are touched and none need to
  --     exist: RLS returns nothing without a JWT, but the PRIVILEGE is checked before the policy,
  --     so a missing grant raises 42501 here and refuses the migration.
  set local role authenticated;
  perform 1 from public.documents limit 1;
  execute format('set local role %I', v_role);
exception when others then
  execute format('set local role %I', v_role);
  raise;
end $$;
