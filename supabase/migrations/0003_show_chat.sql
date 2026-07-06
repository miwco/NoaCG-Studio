-- Era 5.4 Show Chat: a PUBLIC send-in queue → human moderation → a graphic.
-- OPEN feature (self-host friendly): schema + RLS + a BEFORE INSERT abuse trigger, no Edge Function,
-- no social API keys, no Redis — the whole feature is this one migration. See docs/ERA5_PLAN.md.
--
-- Roles (RLS is the boundary): `anon` (publishable key) may only INSERT pending messages into an OPEN
-- show and cannot read the queue; the authenticated OWNER may SELECT/UPDATE their own show's rows
-- (moderation); the unattended graphic reads (as anon) only rows the owner promoted to 'on_air', for a
-- show whose UUID is an unguessable capability. Realtime Postgres Changes re-checks RLS per event.

-- ── shows: a chat room owned by an authenticated owner. slug is an unguessable capability. ──────────
create table if not exists public.shows (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug        text not null unique default encode(gen_random_bytes(9), 'base64'),
  title       text not null default 'Show chat',
  is_open     boolean not null default true,     -- owner can close submissions
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists shows_owner_idx on public.shows (owner_id);
alter table public.shows enable row level security;

create trigger shows_set_updated_at before update on public.shows
  for each row execute function public.set_updated_at();   -- reuse 0001's trigger fn

-- Owner manages their own shows. There is NO anon SELECT on shows — the public submit page resolves
-- slug → id via the SECURITY DEFINER function below, so owner_id is never exposed.
create policy "shows_owner_all" on public.shows for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create or replace function public.show_by_slug(p_slug text)
returns table (id uuid, title text, is_open boolean)
language sql security definer set search_path = '' stable as $$
  select s.id, s.title, s.is_open from public.shows s where s.slug = p_slug;
$$;
grant execute on function public.show_by_slug(text) to anon, authenticated;

-- Whether a show accepts submissions. SECURITY DEFINER so the anon INSERT policy below can check
-- is_open WITHOUT an anon SELECT on shows (a policy subquery runs as the caller's role, and anon
-- cannot read shows — checking it directly would always fail).
create or replace function public.show_accepts(p_show uuid)
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.shows s where s.id = p_show and s.is_open);
$$;
revoke execute on function public.show_accepts(uuid) from public;
grant execute on function public.show_accepts(uuid) to anon, authenticated;

-- ── chat_submissions: the moderation queue. ────────────────────────────────────────────────────────
create table if not exists public.chat_submissions (
  id           uuid primary key default gen_random_uuid(),
  show_id      uuid not null references public.shows (id) on delete cascade,
  author       text not null,
  message      text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'on_air')),
  created_at   timestamptz not null default now(),
  moderated_at timestamptz
);
create index if not exists chat_show_status_idx on public.chat_submissions (show_id, status, created_at);
alter table public.chat_submissions enable row level security;

-- (1) ANON may INSERT only, into an OPEN show, as 'pending'. No anon SELECT policy ⇒ anon can't read
--     the queue at all. Length caps here back up the trigger (defence in depth).
create policy "chat_anon_insert" on public.chat_submissions for insert to anon
  with check (
    status = 'pending'
    and char_length(author) between 1 and 40
    and char_length(message) between 1 and 280
    and public.show_accepts(show_id)   -- SECURITY DEFINER — see note above
  );

-- (2) OWNER may SELECT + UPDATE (moderate) their own show's rows. UPDATE needs USING and WITH CHECK.
create policy "chat_owner_select" on public.chat_submissions for select to authenticated
  using (exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())));
create policy "chat_owner_update" on public.chat_submissions for update to authenticated
  using (exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.shows s where s.id = show_id and s.owner_id = (select auth.uid())));

-- (3) GRAPHIC read path: only rows the owner promoted to air. The graphic always filters
--     show_id=eq.<uuid> on the wire; the show UUID is the unguessable capability. on_air rows are
--     already broadcast publicly, so a blanket anon read of on_air is safe.
create policy "chat_public_read_on_air" on public.chat_submissions for select to anon
  using (status = 'on_air');

-- ── abuse control: BEFORE INSERT trigger (no Edge Function, no Redis). ──────────────────────────────
-- The wordlist lives in a table so a self-hoster edits it without a redeploy. Profanity masking is a
-- COURTESY pre-filter, never the safety boundary — the human moderation queue is.
create table if not exists public.chat_blocklist (word text primary key);
alter table public.chat_blocklist enable row level security;   -- RLS on, no policy ⇒ admin-only

create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recent int;
  bad text;
begin
  new.author  := btrim(left(coalesce(new.author, ''), 40));
  new.message := btrim(left(coalesce(new.message, ''), 280));
  if new.author = '' or new.message = '' then
    raise exception 'author and message are required';
  end if;
  -- rate window: cap per show per 10s (racy, but fine for a chat queue; the human gate is the limit)
  select count(*) into recent from public.chat_submissions
    where show_id = new.show_id and created_at > now() - interval '10 seconds';
  if recent >= 5 then
    raise exception 'too many submissions — slow down' using errcode = 'check_violation';
  end if;
  -- courtesy profanity mask from the editable blocklist
  for bad in select word from public.chat_blocklist loop
    new.message := regexp_replace(new.message, bad, repeat('*', char_length(bad)), 'gi');
  end loop;
  return new;
end $$;

-- The guard is a TRIGGER function only — it must not be callable via the REST RPC API. The trigger
-- still fires it (triggers ignore the EXECUTE grant).
revoke execute on function public.chat_guard() from anon, authenticated, public;

create trigger chat_submissions_guard before insert on public.chat_submissions
  for each row execute function public.chat_guard();

-- ── Realtime: stream changes on the queue (owner moderation UI + the graphic subscribe to this). ────
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_submissions'
  ) then
    alter publication supabase_realtime add table public.chat_submissions;
  end if;
end $$;
