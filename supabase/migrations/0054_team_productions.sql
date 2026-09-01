-- Teams, stage 2 of `docs/TEAMS_PLAN.md` §7: the team production itself - the preparation document,
-- the compare-and-swap write path, and the ONE widening of an existing security record that the
-- whole design is built to keep down to one.
--
-- WHAT MOVES AND WHAT DOES NOT. A team production's preparation document lives in a server row
-- OUTSIDE the LWW sync mirror (TEAMS_PLAN §2): personal libraries, personal productions and the ~18
-- per-user RLS predicates are untouched, `SYNC_KINDS` does not grow, and the conflict-copy
-- machinery never sees a team row. What DOES change on an existing table is `control_shows`, and
-- only there: a nullable `team_id`, an OR-branch on its owner policy, and the same OR-branch on the
-- one `control_events` policy that authorizes the publish path's log prune. That pair is the entire
-- "member B republishes" story - publishing is an upsert on `control_shows` keyed by the Show id
-- (src/control/hostedControl.ts publishControlShow), so the row keeps its identity and the four
-- capability slugs handed to CasparCG/OBS never move, whoever republishes.
--
-- WHY THE WRITE PATH IS COMPARE-AND-SWAP AND NOT A POLICY. Whole-document LWW is right for one
-- person's devices racing occasionally and wrong for three students editing one rundown, which is
-- the NORMAL case here: a blind write loses a teammate's cue with nothing on screen, the exact
-- failure the conflict-copy doctrine exists to prevent. So `team_production_save` refuses a stale
-- write and hands back what is actually stored, and the client re-applies its verb.
--
-- That is a doctrine, so it is made STRUCTURAL rather than remembered: there is no UPDATE policy on
-- `team_productions` and `authenticated` holds no UPDATE privilege on it. A permissive UPDATE policy
-- would have left an ordinary PostgREST PATCH sitting beside the CAS function doing exactly the
-- blind write the function exists to refuse. This is TIGHTER than the plan's §3 sketch, which lists
-- update among the member policies; the sketch's own next paragraph is the reason.
--
-- THE OWNER-ONLY RULINGS (TEAMS_PLAN §8), which tighten the draft, and how each is ENFORCED:
--   * Ruling 3, only the team owner deletes a team production. `team_productions` gets an
--     owner-only DELETE policy, and a RESTRICTIVE delete policy on `control_shows` says the same
--     thing about the published half. A restrictive policy is the right shape because it must
--     SUBTRACT from the widened owner policy without touching the personal path at all
--     (`team_id is null` short-circuits it).
--   * Ruling 2, only the owner moves a team production back to personal. Moving out IS deleting the
--     `team_productions` row, so ruling 3's policy carries it - except on the published row, where
--     "move" means editing `control_shows.team_id`. RLS cannot express that: a policy sees the OLD
--     row (USING) or the NEW row (WITH CHECK) and never both, so it cannot say "this column did not
--     change". A BEFORE UPDATE trigger can, and that is what `control_shows_guard_owner` is for.
--
-- THAT TRIGGER IS ALSO WHAT CLOSES THE HOLE THE OR-BRANCH WOULD OTHERWISE OPEN, and it is worth
-- being explicit because it is not obvious: permissive policies are OR-ed, so a teammate updating a
-- team-stamped row passes USING via the team branch, and if that same statement sets
-- `owner_id = auth.uid()` and `team_id = null` it also passes WITH CHECK via the OWNER branch. The
-- row - with its live capability slugs, its pinned output payload and its event log - would have
-- been quietly reassigned to whoever asked. Pinning `owner_id` and `team_id` against anyone who is
-- not the row's current owner is the one statement that makes the widening safe, so it ships in the
-- same migration and its self-check tries the theft.
--
-- TWO DELIBERATE REFINEMENTS TO THE SKETCH'S COLUMNS, both about what happens when a row a foreign
-- key points AT goes away. The sketch writes `updated_by uuid not null references auth.users (id)`
-- and `team_id uuid null references public.teams (id)`, neither with an ON DELETE action, which
-- means NO ACTION: deleting an account would fail while any team production it last touched exists,
-- and deleting a team would fail while any published production still carries its stamp. Every
-- other reference to `auth.users` in this schema cascades for exactly that reason, and cascading is
-- wrong here (an editor leaving must not delete the team's rundown). So `updated_by` is nullable
-- with ON DELETE SET NULL - a null reads as "a former member", which the client already has to
-- handle, because the display name it renders comes from `team_members` and leaving removes that
-- row - and `control_shows.team_id` is ON DELETE SET NULL too: deleting a team unstamps the
-- published production and leaves it with the owner it already had.
--
-- ONE TRAP FOR THE CLIENT WORK (stage 4), recorded where the contract is rather than in a doc
-- nobody re-reads: the CAS token is a timestamptz, and `timestamptz` carries MICROSECONDS while a
-- JavaScript Date carries milliseconds. A client that parses `updated_at` into a Date and sends it
-- back would truncate it, never match, and loop on "somebody else saved" forever. So the column is
-- written already truncated to milliseconds - `date_trunc('milliseconds', clock_timestamp())` - and
-- a Date round-trip is lossless by construction. `clock_timestamp()` rather than `now()` because
-- `now()` is the TRANSACTION timestamp: two saves inside one transaction would write the same token
-- twice and the second would not advance it.

-- ── team_productions: the preparation document, server-resident ──────────────────────────────────
create table if not exists public.team_productions (
  -- = the Show.id, client-supplied, exactly like control_shows (0008). One production, one id,
  -- whichever plane you are looking at it from.
  id          uuid primary key,
  team_id     uuid not null references public.teams (id) on delete cascade,
  -- The Show record: pool copies, cues, datasets, look, data, bindings - the same shape
  -- model/shows.ts normalizes, version stamp included, so one reader serves both planes.
  doc         jsonb not null,
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default date_trunc('milliseconds', now()),
  created_at  timestamptz not null default now()
);
create index if not exists team_productions_team_idx
  on public.team_productions (team_id, updated_at desc);
alter table public.team_productions enable row level security;

-- Grants: the revoke first, then the narrowest set the policies below admit. No UPDATE for
-- `authenticated` - that is the CAS decision above, expressed as a privilege rather than as a
-- convention.
revoke all on table public.team_productions from public, anon, authenticated;
grant select, insert, delete on table public.team_productions to authenticated;
grant select, insert, update, delete on table public.team_productions to service_role;

create policy "team_productions_member_select" on public.team_productions for select to authenticated
  using (public.is_team_member(team_id));

-- Creating one is how a production is shared with a team, so any member may do it; the row must
-- arrive stamped with the acting account, which is what makes "edited by <name>" true from the
-- first write rather than from the first save.
create policy "team_productions_member_insert" on public.team_productions for insert to authenticated
  with check (public.is_team_member(team_id) and updated_by = (select auth.uid()));

-- TEAMS_PLAN §8 ruling 3: owner only. This is also ruling 2 - moving a production back to personal
-- is deleting the team row and writing a personal one.
create policy "team_productions_owner_delete" on public.team_productions for delete to authenticated
  using (exists (
    select 1 from public.teams t where t.id = team_id and t.owner_id = (select auth.uid())
  ));

-- ── team_production_save: the compare-and-swap write ─────────────────────────────────────────────
-- Returns jsonb rather than a RETURNS TABLE deliberately. `RETURNS TABLE (...)` silently creates a
-- variable per column, and six of this table's columns would then shadow themselves inside the body
-- - the 0035 defect that shipped a broken function past every shape check (supabase/AGENTS.md). A
-- single jsonb answer has no OUT names to collide with anything.
--
--   accepted -> { "saved": true,  "updated_at": …, "updated_by": … }
--   refused  -> { "saved": false, "updated_at": …, "updated_by": …, "doc": {…} }
--
-- The refusal carries the CURRENT document, which is the whole point: the client re-applies its
-- verb to what is really stored and retries, and if the verb no longer applies it can say "Ben
-- saved a newer rundown" instead of eating his edit.
create or replace function public.team_production_save(p_id uuid, p_expected timestamptz, p_doc jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user  uuid := (select auth.uid());
  v_row   public.team_productions%rowtype;
  v_stamp timestamptz;
begin
  if v_user is null then
    raise exception 'saving a team production needs a signed-in account' using errcode = '42501';
  end if;
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' then
    raise exception 'a team production document must be a JSON object' using errcode = 'check_violation';
  end if;
  select * into v_row from public.team_productions p where p.id = p_id;
  if v_row.id is null then
    raise exception 'unknown team production' using errcode = 'no_data_found';
  end if;
  -- The membership test is INSIDE the function because the function is definer and RLS therefore
  -- does not apply to it. Leaving it out would have made this RPC a hole straight through every
  -- policy above.
  if not public.is_team_member(v_row.team_id) then
    raise exception 'not a member of the team that holds this production' using errcode = '42501';
  end if;
  if p_expected is null or v_row.updated_at is distinct from p_expected then
    return jsonb_build_object(
      'saved', false,
      'updated_at', v_row.updated_at,
      'updated_by', v_row.updated_by,
      'doc', v_row.doc
    );
  end if;
  update public.team_productions p
     set doc = p_doc,
         updated_by = v_user,
         updated_at = date_trunc('milliseconds', clock_timestamp())
   where p.id = p_id and p.updated_at = p_expected
   returning p.updated_at into v_stamp;
  if v_stamp is null then
    -- The row moved between the read above and this write. Same answer as a stale token: change
    -- nothing, hand back what is really there.
    select * into v_row from public.team_productions p where p.id = p_id;
    return jsonb_build_object(
      'saved', false,
      'updated_at', v_row.updated_at,
      'updated_by', v_row.updated_by,
      'doc', v_row.doc
    );
  end if;
  return jsonb_build_object('saved', true, 'updated_at', v_stamp, 'updated_by', v_user);
end $$;
revoke all on function public.team_production_save(uuid, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.team_production_save(uuid, timestamptz, jsonb) to authenticated;

-- ── control_shows.team_id: the published half learns which team holds it ─────────────────────────
alter table public.control_shows
  add column if not exists team_id uuid references public.teams (id) on delete set null;
create index if not exists control_shows_team_idx on public.control_shows (team_id);

-- ── The ONE widening, written as ALTER rather than DROP + CREATE ─────────────────────────────────
-- ALTER POLICY restates the predicate in place. Dropping and recreating would work too and would
-- leave the table with no owner policy for the width of one statement, inside a transaction nobody
-- else can see - but it would also read, to `db-push`'s classifier and to a human, as a removal
-- followed by something that happens to have the same name.
alter policy "control_shows_owner_all" on public.control_shows
  using ((select auth.uid()) = owner_id
         or (team_id is not null and public.is_team_member(team_id)))
  with check ((select auth.uid()) = owner_id
              or (team_id is not null and public.is_team_member(team_id)));

-- The publish path prunes log rows older than 7 days through this policy (0029 §5), so a member who
-- can republish has to be able to prune, or every republish by a teammate leaves the log growing on
-- a 24/7 output URL. Named in TEAMS_PLAN §3 as widening "the same way", and it is the only other
-- predicate this migration touches.
alter policy "control_events_owner_delete" on public.control_events
  using (exists (
    select 1 from public.control_shows s
    where s.id = show_id
      and ((select auth.uid()) = s.owner_id
           or (s.team_id is not null and public.is_team_member(s.team_id)))
  ));

-- Ruling 3 on the published half: a member may republish, but only the production's owner or the
-- team's owner may take it down. Restrictive, so it subtracts from the widened policy above and
-- leaves every personal row (team_id is null) exactly as it was.
create policy "control_shows_team_delete_owner_only" on public.control_shows
  as restrictive for delete to authenticated
  using (
    team_id is null
    or (select auth.uid()) = owner_id
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = (select auth.uid()))
  );

-- ── The guard trigger: pin `owner_id` and `team_id` against anyone but the row's owner ───────────
-- SECURITY INVOKER (the default) on purpose: it reads OLD and NEW and touches no table, so it needs
-- no elevated privilege, and an invoker function cannot be the accidental definer hole 0041 and 0042
-- had to close. A trigger fires without the caller holding EXECUTE (Postgres checks that at CREATE
-- TRIGGER time), which is why the revoke below costs nothing.
--
-- `auth.uid()` is null for `service_role` and inside every SECURITY DEFINER capability RPC, and the
-- guard stands down there by design: service_role bypasses RLS entirely as the server's break-glass
-- identity, and none of the RPCs writes either column.
create or replace function public.control_shows_guard_owner()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or v_user = old.owner_id then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'only the production owner may change who owns it' using errcode = '42501';
  end if;
  if new.team_id is distinct from old.team_id then
    raise exception 'only the production owner may change which team holds it' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.control_shows_guard_owner() from public, anon, authenticated;
create trigger control_shows_guard_owner before update on public.control_shows
  for each row execute function public.control_shows_guard_owner();

-- ── Self-check: race two writers, and try the theft ──────────────────────────────────────────────
-- The behavioural half needs two real `auth.users` rows and a JWT claim so `auth.uid()` answers; a
-- fresh stack has none and says so rather than failing a migration over an empty table (the shape
-- 0040, 0042, 0044, 0046, 0049 and 0053 all use). RESET ROLE is the wrong way home - a migration
-- does not run as its session user - so `current_role` is captured and set back by name, on the
-- exception path too.
do $$
declare
  v_role   text := current_role;
  v_users  uuid[];
  v_a      uuid;
  v_b      uuid;
  v_team   uuid := gen_random_uuid();
  v_show   uuid := gen_random_uuid();
  v_code   text;
  v_stored text;
  v_stamp  timestamptz;
  v_answer jsonb;
  v_n      int;
  v_ok     boolean;
  v_gated  boolean;
  v_seeded boolean := false;
begin
  -- (a) Structure.
  if not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'control_shows' and c.column_name = 'team_id'
  ) then
    raise exception '0054 self-check (a) FAILED: control_shows.team_id is missing';
  end if;
  if not (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'team_productions') then
    raise exception '0054 self-check (a) FAILED: team_productions has RLS off';
  end if;
  if to_regprocedure('public.team_production_save(uuid, timestamptz, jsonb)') is null then
    raise exception '0054 self-check (a) FAILED: team_production_save is missing';
  end if;
  if not exists (
    select 1 from pg_trigger where tgrelid = 'public.control_shows'::regclass
      and tgname = 'control_shows_guard_owner'
  ) then
    raise exception '0054 self-check (a) FAILED: the ownership guard trigger is not attached';
  end if;
  -- The ALTER POLICY actually took: both widened predicates must now name the membership test, and
  -- the restrictive delete policy must be restrictive rather than permissive.
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'control_shows'
      and p.policyname = 'control_shows_owner_all'
      and p.qual like '%is_team_member%' and p.with_check like '%is_team_member%'
  ) then
    raise exception '0054 self-check (a) FAILED: control_shows_owner_all was not widened';
  end if;
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'control_events'
      and p.policyname = 'control_events_owner_delete' and p.qual like '%is_team_member%'
  ) then
    raise exception '0054 self-check (a) FAILED: control_events_owner_delete was not widened';
  end if;
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'control_shows'
      and p.policyname = 'control_shows_team_delete_owner_only' and p.permissive = 'RESTRICTIVE'
  ) then
    raise exception '0054 self-check (a) FAILED: the owner-only delete policy is missing or permissive';
  end if;

  -- (b) Privileges: present where a policy needs them, absent where the CAS function is the path.
  if not has_table_privilege('authenticated', 'public.team_productions', 'SELECT')
     or not has_table_privilege('authenticated', 'public.team_productions', 'INSERT')
     or not has_table_privilege('authenticated', 'public.team_productions', 'DELETE') then
    raise exception '0054 self-check (b) FAILED: authenticated is missing a privilege its policies need';
  end if;
  if has_table_privilege('authenticated', 'public.team_productions', 'UPDATE') then
    raise exception '0054 self-check (b) FAILED: authenticated can UPDATE team_productions around the CAS function';
  end if;
  if has_table_privilege('anon', 'public.team_productions', 'SELECT')
     or has_table_privilege('anon', 'public.team_productions', 'INSERT')
     or has_table_privilege('anon', 'public.team_productions', 'UPDATE')
     or has_table_privilege('anon', 'public.team_productions', 'DELETE') then
    raise exception '0054 self-check (b) FAILED: anon holds a privilege on team_productions';
  end if;
  if not has_function_privilege('authenticated', 'public.team_production_save(uuid, timestamptz, jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.team_production_save(uuid, timestamptz, jsonb)', 'EXECUTE') then
    raise exception '0054 self-check (b) FAILED: EXECUTE on team_production_save is wrong for a client role';
  end if;

  -- (c) Behaviour. Two accounts, borrowed if the database has them and invented if it is empty -
  -- the shape 0053 explains at length, so that a CI stack and a self-hoster's first boot run this
  -- walk rather than skipping it forever. An instance with a single real account skips; a GoTrue
  -- schema that refuses the synthetic row skips too, instead of failing a migration over it.
  select array_agg(u.id) into v_users from (select id from auth.users order by created_at limit 2) u;
  if coalesce(array_length(v_users, 1), 0) < 2 then
    if coalesce(array_length(v_users, 1), 0) > 0 then
      raise notice '0054 self-check: one auth.users row only, skipping the CAS and publish walk';
      return;
    end if;
    begin
      insert into auth.users (id, instance_id, aud, role, email)
      values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
              'authenticated', 'authenticated', '0054-self-check-a@noacg.invalid'),
             (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
              'authenticated', 'authenticated', '0054-self-check-b@noacg.invalid');
      v_seeded := true;
    exception when others then
      raise notice '0054 self-check: no accounts, and none could be made (%) - skipping the CAS and publish walk', sqlerrm;
      return;
    end;
    select array_agg(u.id) into v_users from (select id from auth.users order by created_at limit 2) u;
  end if;
  v_a := v_users[1];
  v_b := v_users[2];

  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.teams (id, name) values (v_team, '0054 self-check');
  select t.join_code into v_code from public.teams t where t.id = v_team;
  perform * from public.team_join(v_code, 'Self-check A');
  -- `updated_at` is written a second into the past on purpose. Everything below runs inside one
  -- DO block, so a stamp taken from the default and a stamp written by the first save could land in
  -- the SAME millisecond - and then the "stale" save would legitimately match and the race half of
  -- this check would silently prove nothing.
  insert into public.team_productions (id, team_id, doc, updated_by, updated_at)
    values (v_show, v_team, jsonb_build_object('name', 'v1'), v_a,
            date_trunc('milliseconds', clock_timestamp()) - interval '1 second');
  select p.updated_at into v_stamp from public.team_productions p where p.id = v_show;
  if v_stamp is null or v_stamp <> date_trunc('milliseconds', v_stamp) then
    raise exception '0054 self-check (c) FAILED: updated_at % carries sub-millisecond precision', v_stamp;
  end if;

  -- B is not a member yet. Everything must come back empty or refuse.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  select count(*) into v_n from public.team_productions p where p.id = v_show;
  if v_n <> 0 then
    raise exception '0054 self-check (c) FAILED: a non-member can read a team production';
  end if;
  v_ok := false;
  begin
    perform public.team_production_save(v_show, v_stamp, jsonb_build_object('name', 'stolen'));
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception '0054 self-check (c) FAILED: a non-member saved a team production';
  end if;

  -- B joins, and the two writers race. B saves against the current stamp and wins; A saves against
  -- the stamp it read BEFORE B wrote, and must be refused and handed the current document back.
  perform * from public.team_join(v_code, 'Self-check B');
  v_answer := public.team_production_save(v_show, v_stamp, jsonb_build_object('name', 'v2'));
  if v_answer->>'saved' <> 'true' then
    raise exception '0054 self-check (c) FAILED: an up-to-date save was refused: %', v_answer;
  end if;
  if (v_answer->>'updated_at')::timestamptz <= v_stamp then
    raise exception '0054 self-check (c) FAILED: a save did not advance the stamp past %', v_stamp;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  v_answer := public.team_production_save(v_show, v_stamp, jsonb_build_object('name', 'v3'));
  if v_answer->>'saved' <> 'false' then
    raise exception '0054 self-check (c) FAILED: a stale save was accepted: %', v_answer;
  end if;
  if v_answer->'doc'->>'name' <> 'v2' then
    raise exception '0054 self-check (c) FAILED: a refused save did not return the current document: %', v_answer;
  end if;
  select p.doc->>'name' into v_stored from public.team_productions p where p.id = v_show;
  if v_stored <> 'v2' then
    raise exception '0054 self-check (c) FAILED: the refused save wrote anyway (document is %)', v_stored;
  end if;
  -- The refusal carries the stamp the caller now needs; saving against THAT must succeed.
  v_answer := public.team_production_save(v_show, (v_answer->>'updated_at')::timestamptz,
                                          jsonb_build_object('name', 'v3'));
  if v_answer->>'saved' <> 'true' then
    raise exception '0054 self-check (c) FAILED: retrying with the returned stamp was refused: %', v_answer;
  end if;

  -- (d) The published half. The throwaway row is inserted as the APPLYING role so the entitlement
  -- policies on control_shows never decide whether this migration applies; its identity row is
  -- seeded first so the cleanup can remove everything this block brought into existence.
  execute format('set local role %I', v_role);
  insert into public.control_show_identity (id, owner_id, slug)
    values (v_show, v_a, '0054-self-check-' || replace(v_show::text, '-', ''));
  insert into public.control_shows (id, owner_id, title, team_id)
    values (v_show, v_a, '0054 self-check', v_team);

  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.control_shows s where s.id = v_show;
  if v_n <> 1 then
    raise exception '0054 self-check (d) FAILED: a team member cannot see the team production row';
  end if;
  -- Taking it down is owner-only, and B is neither the row owner nor the team owner.
  delete from public.control_shows where id = v_show;
  get diagnostics v_n = row_count;
  if v_n <> 0 then
    raise exception '0054 self-check (d) FAILED: a member deleted a team production row';
  end if;

  -- Republishing writes through the restrictive entitlement policies (0018/0020/0022), which answer
  -- about B's own account. If B is suspended or denied hosted control on this instance the write
  -- half says so and is skipped: those policies are not what this migration changed.
  v_gated := public.is_suspended() or public.feature_denied('control.hosted');
  if v_gated then
    raise notice '0054 self-check (d): the second account is suspended or denied control.hosted, skipping the write half';
  else
    update public.control_shows s set title = '0054 self-check (republished)' where s.id = v_show;
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception '0054 self-check (d) FAILED: a team member cannot republish the team production';
    end if;
    -- The theft: pass WITH CHECK through the owner branch by claiming the row on the way out.
    v_ok := false;
    begin
      update public.control_shows s set owner_id = v_b, team_id = null where s.id = v_show;
    exception when others then
      v_ok := true;
    end;
    if not v_ok then
      raise exception '0054 self-check (d) FAILED: a team member reassigned the production to themselves';
    end if;
    v_ok := false;
    begin
      update public.control_shows s set team_id = null where s.id = v_show;
    exception when others then
      v_ok := true;
    end;
    if not v_ok then
      raise exception '0054 self-check (d) FAILED: a team member moved the production out of the team';
    end if;
  end if;

  -- Cleanup, as the applying role. `teams` cascades to team_members and team_productions;
  -- control_shows and its identity row are removed by name.
  execute format('set local role %I', v_role);
  delete from public.control_shows where id = v_show;
  delete from public.control_show_identity where id = v_show;
  delete from public.teams where id = v_team;
  if v_seeded then
    delete from auth.users where id = any(v_users);
  end if;
exception when others then
  execute format('set local role %I', v_role);
  raise;
end $$;
