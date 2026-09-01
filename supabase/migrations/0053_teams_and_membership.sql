-- Teams, stage 1 of `docs/TEAMS_PLAN.md` §7: the principal - a team, who is in it, and the three
-- functions every later policy leans on. ADDITIVE ONLY. Not one existing table, policy, predicate
-- or grant is touched by this file; the single edit to a live security record belongs to M2 and is
-- named there.
--
-- WHAT A TEAM IS FOR. Three students with separate accounts prepare and operate the SAME production
-- without sharing credentials (TEAMS_PLAN §1). A team owns PRODUCTIONS - never libraries. Nothing
-- here widens what anybody can see of anybody else's graphics, assets, agent keys, generations,
-- grants or feedback: the hybrid model exists precisely so that the ~18 per-user RLS predicates
-- stay exactly as written (§2, "why the full team-principal RLS rewrite loses"). This migration
-- adds the principal and stops.
--
-- WHY JOINING IS A CODE AND AN RPC RATHER THAN AN INVITATION AND AN INSERT POLICY. Two reasons,
-- both decisive:
--   * SMTP IS NOT PROVISIONED (docs/DEPLOYMENT.md, "Auth email"), so an email invitation is not a
--     v1 mechanism. The join CODE is; the teacher reads it out or pastes the link in the class
--     chat, which is what a room of students can actually do on the day.
--   * A capability is the product's existing doctrine for exactly this shape. The control, output,
--     join and presenter slugs are all unguessable strings where HOLDING one is the authorization
--     (docs/CLOUD_PLAYOUT.md). The join code is the same idiom with the same minting recipe, and it
--     is ROTATABLE for the same reason - a leaked code is answered by rotating it, not by deleting
--     the team. Rotation touches only who may JOIN; membership rows survive it.
-- An INSERT policy on `team_members` cannot express "holding the code authorizes this", because the
-- code is not a column of the row being inserted and a policy that reads it would have to admit
-- reading every team's code. So the join goes through one SECURITY DEFINER function and
-- `team_members` gets no INSERT policy at all.
--
-- WHO CAN SEE THE JOIN CODE, decided here rather than left to whoever reads the row first. Every
-- member of a team can see their team's row, code included - so any member can invite. That is the
-- capability doctrine followed honestly (a capability held by three people is held by three
-- people), and the owner keeps the answer: rotation is owner-only, and it takes the old code out of
-- circulation for everybody at once. Tightening this later would mean hiding one column behind
-- another RPC; it is recorded as a decision so the later change knows what it is changing.
--
-- ROLES. Owner and member, and no more (TEAMS_PLAN §8 ruling 1 - the teacher is the team owner).
-- `team_members.role` is a LABEL for the UI: the authority is `teams.owner_id`, and every
-- owner-only check below reads that column, never the label. A label that could be edited into
-- authority is the thing this split avoids, which is also why `team_members` has no UPDATE policy -
-- a display name is changed by re-joining with the same code, through the function that decides the
-- role itself.

-- ── teams ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 80),
  -- `default auth.uid()` mirrors control_shows (0008): the client never has to send its own id, and
  -- the INSERT policy below is then a statement about the acting account rather than about a value
  -- the client chose.
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The join capability: 6 random bytes -> 8 URL-safe base64 chars (6 % 3 = 0, so no padding), the
  -- 0029 slug recipe at the length a person can read out loud. `extensions.` is not decoration -
  -- the migration runner's search_path does not carry that schema (supabase/AGENTS.md).
  join_code  text not null unique
             default translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_'),
  created_at timestamptz not null default now()
);
create index if not exists teams_owner_idx on public.teams (owner_id);
alter table public.teams enable row level security;

-- ── team_members ─────────────────────────────────────────────────────────────────────────────────
create table if not exists public.team_members (
  team_id      uuid not null references public.teams (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Snapshotted at join, typed by the member. `auth.users` emails never leave the server (the same
  -- call 0004 and 0017 made for author and actor names), so teammates see the name a member chose
  -- to show them and nothing else.
  display_name text not null check (length(btrim(display_name)) between 1 and 60),
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (team_id, user_id)
);
-- The primary key already indexes (team_id, user_id); this one is for the other direction, which is
-- the hot one: `is_team_member` and "my teams" both start from the acting user.
create index if not exists team_members_user_idx on public.team_members (user_id);
alter table public.team_members enable row level security;

-- ── Grants: the migration's job, not the host's (supabase/AGENTS.md) ─────────────────────────────
-- The revoke first, because a grant alone leaves whatever hosted Supabase's bootstrap handed out
-- and the two statements do not cancel; then the narrowest set each table's own policies admit.
-- `team_members` gets no INSERT and no UPDATE for `authenticated` on purpose - both go through
-- `team_join`, which is the whole point of the code-as-capability design above.
revoke all on table public.teams from public, anon, authenticated;
revoke all on table public.team_members from public, anon, authenticated;
grant select, insert, update, delete on table public.teams to authenticated;
grant select, delete on table public.team_members to authenticated;
grant select, insert, update, delete on table public.teams, public.team_members to service_role;

-- ── is_team_member: the one predicate the team policies share ────────────────────────────────────
-- SECURITY DEFINER because a plain `exists (select 1 from public.team_members …)` written inside
-- `team_members`' own SELECT policy recurses. Definer breaks the cycle by reading the table as its
-- owner, with RLS out of the picture.
--
-- The EXECUTE trap, in the migration that creates the predicate rather than in a later one: a
-- policy expression runs with the QUERYING role's privileges even when the function is definer, so
-- `authenticated` must hold EXECUTE or every statement against these tables dies with
-- `42501 permission denied for function` (supabase/AGENTS.md). `service_role` gets it too - not
-- because a policy will ever be evaluated for that role (it bypasses RLS), but because it already
-- holds SELECT on `team_members` and could answer the same question by reading the table, so the
-- grant hands it nothing new and spares a future server route an outage that reads like a bug.
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team and m.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_team_member(uuid) from public, anon, authenticated;
grant execute on function public.is_team_member(uuid) to authenticated, service_role;

-- ── team_join: holding the code IS the authorization ─────────────────────────────────────────────
-- Resolves the code, writes the membership, answers with the team. Re-joining with the same code
-- updates the display name, which is how a member renames themselves without an UPDATE policy that
-- would also let them rewrite their own role.
--
-- The role is decided HERE, from `teams.owner_id`, so the label can never disagree with the
-- authority. An unknown code raises rather than returning empty: "nothing happened" and "that code
-- is wrong" are different answers to a student staring at a class chat.
create or replace function public.team_join(p_code text, p_display_name text)
returns setof public.teams
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_display_name, ''));
  v_team public.teams%rowtype;
begin
  if v_user is null then
    raise exception 'joining a team needs a signed-in account' using errcode = '42501';
  end if;
  -- TEAMS_PLAN §5: the ACTING user's entitlement gates every verb. A definer function bypasses
  -- RLS, so the restrictive policy below cannot reach this path and the check has to be here -
  -- the same split 0022 made for the capability RPCs.
  if public.is_suspended() then
    raise exception 'this account is suspended' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'a display name is required to join a team' using errcode = 'check_violation';
  end if;
  if length(v_name) > 60 then
    v_name := left(v_name, 60);
  end if;
  select * into v_team from public.teams t where t.join_code = p_code and p_code is not null;
  if v_team.id is null then
    raise exception 'unknown join code' using errcode = 'no_data_found';
  end if;
  insert into public.team_members (team_id, user_id, display_name, role)
  values (
    v_team.id,
    v_user,
    v_name,
    case when v_team.owner_id = v_user then 'owner' else 'member' end
  )
  on conflict (team_id, user_id) do update set display_name = excluded.display_name;
  return query select t.* from public.teams t where t.id = v_team.id;
end $$;
revoke all on function public.team_join(text, text) from public, anon, authenticated;
grant execute on function public.team_join(text, text) to authenticated;

-- ── team_rotate_code: owner-only, and the refusal is the same shape as the miss ──────────────────
-- The ownership test IS the UPDATE's WHERE clause, so a non-owner and a non-existent team take the
-- identical path and the function tells neither of them which they hit. Members are unaffected:
-- rotation gates JOINING, and their rows are already written.
create or replace function public.team_rotate_code(p_team uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_code text;
begin
  if v_user is null then
    raise exception 'rotating a join code needs a signed-in account' using errcode = '42501';
  end if;
  update public.teams t
     set join_code = translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_')
   where t.id = p_team and t.owner_id = v_user
   returning t.join_code into v_code;
  if v_code is null then
    raise exception 'only the team owner may rotate the join code' using errcode = '42501';
  end if;
  return v_code;
end $$;
revoke all on function public.team_rotate_code(uuid) from public, anon, authenticated;
grant execute on function public.team_rotate_code(uuid) to authenticated;

-- ── Policies ─────────────────────────────────────────────────────────────────────────────────────
-- `teams` SELECT names the owner explicitly as well as `is_team_member`, and that is load-bearing
-- rather than belt-and-braces: the moment a team row is inserted its creator has no membership row
-- yet, and a select policy that asked only "are you a member" would hide the team from the account
-- that just made it - including from the `team_join` call that is about to write the first
-- membership.
create policy "teams_select_own" on public.teams for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_team_member(id));

create policy "teams_insert_own" on public.teams for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- Suspension is an absolute (0020): every table a signed-in account can write carries this, and a
-- new one that did not would be the hole the absolute is supposed to close. Creating is the only
-- verb `teams` gains for a client - joining goes through `team_join`, which carries the same test
-- inside itself because a definer function never meets a policy.
create policy "teams_not_suspended_insert" on public.teams
  as restrictive for insert to authenticated
  with check (not (select public.is_suspended()));

-- Renaming the team, and the owner's own path to the code. `with check` repeats the predicate so
-- ownership cannot be handed away by an UPDATE: the row must still belong to the acting account
-- after the write.
create policy "teams_owner_update" on public.teams for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "teams_owner_delete" on public.teams for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "team_members_select_team" on public.team_members for select to authenticated
  using (public.is_team_member(team_id));

-- Leaving and removing, in one policy because they are one statement to the database.
--   * The team owner removes anybody EXCEPT themselves.
--   * A member removes their own row, unless they are the team owner.
-- The exclusion on both branches is what stops a team from existing with an owner who is not in it.
-- An owner who wants out deletes the TEAM, which cascades - the productions go with it, which is
-- the honest reading of "productions stay with the team" (TEAMS_PLAN §6).
create policy "team_members_leave_or_remove" on public.team_members for delete to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = (select auth.uid())
        and t.owner_id <> team_members.user_id
    )
    or (
      team_members.user_id = (select auth.uid())
      and not exists (
        select 1 from public.teams t
        where t.id = team_members.team_id and t.owner_id = team_members.user_id
      )
    )
  );

-- ── Self-check: CALL the functions, and assert ABSENCE as well as presence ───────────────────────
-- A plpgsql body is not resolved at CREATE time (supabase/AGENTS.md, migration 0035): the functions
-- above compile, `to_regprocedure` finds them, the grants read right - and only calling them fails.
-- So the behavioural half below joins, rotates, and then tries the same things AS A NON-MEMBER,
-- which is the half that would notice a policy that admits too much.
--
-- The behavioural half needs two real `auth.users` rows to hang the foreign keys on, and a JWT
-- claim so `auth.uid()` answers. A fresh stack has none, so it says so and skips rather than
-- failing a migration over an empty table - the shape 0040, 0042, 0044, 0046 and 0049 all use. On
-- any database with two accounts (production included) it runs in full, inside the migration's own
-- transaction: a failure rolls the whole file back and `npm run db:push` reports a refusal.
--
-- RESET ROLE is the wrong way home. A migration does not run as its session user - the CLI connects
-- as a temporary login role and switches to `postgres` - so RESET ROLE lands on a role with no
-- grants and the next statement dies looking like this migration broke something. Capture
-- `current_role` and set it back by name, on the exception path too.
do $$
declare
  v_role   text := current_role;
  v_users  uuid[];
  v_a      uuid;
  v_b      uuid;
  v_team   uuid := gen_random_uuid();
  v_code   text;
  v_fresh  text;
  v_role_label text;
  v_n      int;
  v_ok     boolean;
  v_seeded boolean := false;
begin
  -- (a) Structure. The tables exist with RLS on, and the three functions are all definer.
  if not (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'teams')
     or not (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'team_members') then
    raise exception '0053 self-check (a) FAILED: a teams table has RLS off';
  end if;
  if to_regprocedure('public.is_team_member(uuid)') is null
     or to_regprocedure('public.team_join(text, text)') is null
     or to_regprocedure('public.team_rotate_code(uuid)') is null then
    raise exception '0053 self-check (a) FAILED: a team function is missing';
  end if;
  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'teams'
      and p.policyname = 'teams_not_suspended_insert' and p.permissive = 'RESTRICTIVE'
  ) then
    raise exception '0053 self-check (a) FAILED: the suspension gate on teams is missing or permissive';
  end if;
  if not (select bool_and(p.prosecdef) from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('is_team_member', 'team_join', 'team_rotate_code')) then
    raise exception '0053 self-check (a) FAILED: a team function is not SECURITY DEFINER';
  end if;

  -- (b) Privileges, both halves. PRESENT: the policies name `authenticated`, and a policy whose
  -- role holds no grant can never fire. ABSENT: `anon` has no business here at all, and
  -- `authenticated` must not be able to write `team_members` around `team_join`.
  if not has_table_privilege('authenticated', 'public.teams', 'SELECT')
     or not has_table_privilege('authenticated', 'public.teams', 'INSERT')
     or not has_table_privilege('authenticated', 'public.teams', 'UPDATE')
     or not has_table_privilege('authenticated', 'public.teams', 'DELETE')
     or not has_table_privilege('authenticated', 'public.team_members', 'SELECT')
     or not has_table_privilege('authenticated', 'public.team_members', 'DELETE') then
    raise exception '0053 self-check (b) FAILED: authenticated is missing a privilege its policies need';
  end if;
  if has_table_privilege('authenticated', 'public.team_members', 'INSERT')
     or has_table_privilege('authenticated', 'public.team_members', 'UPDATE') then
    raise exception '0053 self-check (b) FAILED: authenticated can write team_members around team_join';
  end if;
  if has_table_privilege('anon', 'public.teams', 'SELECT')
     or has_table_privilege('anon', 'public.teams', 'INSERT')
     or has_table_privilege('anon', 'public.teams', 'UPDATE')
     or has_table_privilege('anon', 'public.teams', 'DELETE')
     or has_table_privilege('anon', 'public.team_members', 'SELECT')
     or has_table_privilege('anon', 'public.team_members', 'INSERT')
     or has_table_privilege('anon', 'public.team_members', 'UPDATE')
     or has_table_privilege('anon', 'public.team_members', 'DELETE') then
    raise exception '0053 self-check (b) FAILED: anon holds a privilege on a teams table';
  end if;
  if not has_function_privilege('authenticated', 'public.is_team_member(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.team_join(text, text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.team_rotate_code(uuid)', 'EXECUTE') then
    raise exception '0053 self-check (b) FAILED: authenticated lacks EXECUTE on a function its policies and flows call';
  end if;
  if has_function_privilege('anon', 'public.is_team_member(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.team_join(text, text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.team_rotate_code(uuid)', 'EXECUTE') then
    raise exception '0053 self-check (b) FAILED: anon holds EXECUTE on a team function';
  end if;

  -- (c) Behaviour. It takes two accounts to tell a member from a stranger, and the foreign keys
  -- need real `auth.users` rows to point at.
  --
  -- A database that already holds accounts (production, or any instance somebody has signed into)
  -- lends its two oldest and nothing is created. A FRESH one - a CI stack, a self-hoster's first
  -- boot - holds none, and there this block makes two throwaway rows of its own and removes them
  -- again, so the walk runs on exactly the instances that would otherwise skip it forever. It never
  -- invents an account on a database that already has one: an instance with a single real user
  -- skips instead, because "the users table is empty" is a fact worth acting on and "it is nearly
  -- empty" is not. If a GoTrue schema this file does not know refuses the synthetic row, the block
  -- degrades to the same skip rather than failing a migration over it.
  select array_agg(u.id) into v_users from (select id from auth.users order by created_at limit 2) u;
  if coalesce(array_length(v_users, 1), 0) < 2 then
    if coalesce(array_length(v_users, 1), 0) > 0 then
      raise notice '0053 self-check: one auth.users row only, skipping the join/rotate walk';
      return;
    end if;
    begin
      insert into auth.users (id, instance_id, aud, role, email)
      values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
              'authenticated', 'authenticated', '0053-self-check-a@noacg.invalid'),
             (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
              'authenticated', 'authenticated', '0053-self-check-b@noacg.invalid');
      v_seeded := true;
    exception when others then
      raise notice '0053 self-check: no accounts, and none could be made (%) - skipping the join/rotate walk', sqlerrm;
      return;
    end;
    select array_agg(u.id) into v_users from (select id from auth.users order by created_at limit 2) u;
  end if;
  v_a := v_users[1];
  v_b := v_users[2];

  -- A creates the team the way the app will: as `authenticated`, through `teams_insert_own`, with
  -- `owner_id` and `join_code` both coming from their defaults. Inserting it as the applying role
  -- would have proved the table and skipped the policy.
  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.teams (id, name) values (v_team, '0053 self-check');
  select t.join_code into v_code from public.teams t where t.id = v_team;
  if v_code is null or length(v_code) <> 8 or v_code ~ '[+/=]' then
    raise exception '0053 self-check (c) FAILED: the minted join code % is not 8 URL-safe chars', v_code;
  end if;

  -- A joins their own team and must come out labelled `owner`.
  perform * from public.team_join(v_code, 'Self-check A');
  select m.role into v_role_label from public.team_members m where m.team_id = v_team and m.user_id = v_a;
  if v_role_label is distinct from 'owner' then
    raise exception '0053 self-check (c) FAILED: team_join labelled the team owner %, not owner', v_role_label;
  end if;
  if not public.is_team_member(v_team) then
    raise exception '0053 self-check (c) FAILED: is_team_member says no to a member';
  end if;
  select count(*) into v_n from public.teams t where t.id = v_team;
  if v_n <> 1 then
    raise exception '0053 self-check (c) FAILED: a member cannot see their own team';
  end if;

  -- B: a stranger. Every one of these must come back empty or refuse.
  perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  if public.is_team_member(v_team) then
    raise exception '0053 self-check (c) FAILED: is_team_member says yes to a non-member';
  end if;
  select count(*) into v_n from public.teams t where t.id = v_team;
  if v_n <> 0 then
    raise exception '0053 self-check (c) FAILED: a non-member can read the team row';
  end if;
  select count(*) into v_n from public.team_members m where m.team_id = v_team;
  if v_n <> 0 then
    raise exception '0053 self-check (c) FAILED: a non-member can read the member list';
  end if;
  update public.teams t set name = 'hijacked' where t.id = v_team;
  get diagnostics v_n = row_count;
  if v_n <> 0 then
    raise exception '0053 self-check (c) FAILED: a non-member updated the team row';
  end if;
  v_ok := false;
  begin
    perform public.team_rotate_code(v_team);
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception '0053 self-check (c) FAILED: a non-member rotated the join code';
  end if;

  -- B holds the code, so B may join - and then sees exactly what a member sees.
  perform * from public.team_join(v_code, 'Self-check B');
  if not public.is_team_member(v_team) then
    raise exception '0053 self-check (c) FAILED: is_team_member says no after team_join';
  end if;
  select count(*) into v_n from public.team_members m where m.team_id = v_team;
  if v_n <> 2 then
    raise exception '0053 self-check (c) FAILED: a joined member sees % of 2 member rows', v_n;
  end if;

  -- A rotates. The new code differs, the old one is dead, and the new one still works.
  perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  v_fresh := public.team_rotate_code(v_team);
  if v_fresh is null or v_fresh = v_code or v_fresh ~ '[+/=]' then
    raise exception '0053 self-check (c) FAILED: rotation returned % for an old code of %', v_fresh, v_code;
  end if;
  v_ok := false;
  begin
    perform * from public.team_join(v_code, 'Self-check A');
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception '0053 self-check (c) FAILED: the rotated-away code still joins';
  end if;
  perform * from public.team_join(v_fresh, 'Self-check A');

  -- Cleanup, as the applying role: the team goes and the membership rows go with it, and any
  -- account this block invented goes too.
  execute format('set local role %I', v_role);
  delete from public.teams where id = v_team;
  if v_seeded then
    delete from auth.users where id = any(v_users);
  end if;
exception when others then
  execute format('set local role %I', v_role);
  raise;
end $$;
