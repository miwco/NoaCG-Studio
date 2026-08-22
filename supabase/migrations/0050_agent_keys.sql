-- Scoped AGENT KEYS + the one-time AUTH CODES that mint them (docs/AGENT_SAVE.md,
-- docs/AGENT_CLI.md P2).
--
-- A coding agent's CLI (`noacg login` -> `noacg save`) saves straight into a user's library
-- over /api/me/graphics. It must not hold the user's session: a session is every account
-- feature the user has, and a credential a CI runner or a shell history can leak has to be
-- SCOPED (it carries a named list of permissions - `graphics:create` and nothing else in v1)
-- and REVOCABLE (one row, one button). The 0047 production data key is the precedent: a
-- dedicated credential, server-presented only, hashed at rest, never a browser capability.
--
-- HOW A KEY IS MINTED WITHOUT EVER TRANSITING THE BROWSER. The CLI opens the consent page
-- in the user's browser with a PKCE challenge (the hash of a verifier only the CLI knows).
-- Consent calls `begin` with the user's JWT, which writes an AUTH CODE row (hashed, 120 s,
-- single use, bound to that challenge) and hands the plaintext code back to the browser, which
-- redirects it to the CLI's loopback listener. The CLI then calls `redeem` with the code AND
-- the verifier; the server consumes the code (atomically, below), checks sha256(verifier) =
-- challenge, mints the key and returns its plaintext ONCE. The key exists only on the CLI's
-- disk and as a hash here. The browser saw a short-lived code; the CLI never saw a session.
--
-- ACCESS POSTURE: both tables have RLS ON and NO POLICIES - the service role is the only
-- reader and writer (the function at api/me, api/_lib/me/agentKeys.ts). Nothing here is a
-- browser capability; the consent page and the Settings list talk to the function, never
-- to these tables. The two RPCs are EXECUTABLE ONLY BY service_role and take their lookup
-- value in the RPC BODY (PostgREST POST), never in a URL query string, so a code hash or key
-- hash never lands in the API gateway's request log - the 0047 rule, for the same reason.

-- ── agent_keys: one row per minted key, hashed ────────────────────────────────────────────────
create table if not exists public.agent_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- What the user called it at consent ("Claude Code on LAPTOP-7"); display only.
  name          text not null default '',
  -- sha256 (hex) of the plaintext `noacg_ak_…` key. The plaintext is never stored.
  key_hash      text not null unique,
  -- The first characters of the plaintext, so the Settings list can say WHICH key without
  -- being able to reconstruct it ("noacg_ak_3f1c9a…").
  prefix        text not null,
  -- The permissions this key carries (src/entitlements/permissions.ts PERMISSION_KEYS). Read
  -- by api/_lib/principal.ts into Principal.granted; a key never carries 'playout:operate'.
  scopes        text[] not null default '{}',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists agent_keys_user_idx on public.agent_keys (user_id);
alter table public.agent_keys enable row level security;
-- No policies on purpose: service role only.

-- ── agent_auth_codes: the one-time handoff between the consent page and the CLI ──────────────
create table if not exists public.agent_auth_codes (
  id          uuid primary key default gen_random_uuid(),
  -- sha256 (hex) of the plaintext code the browser carries to the loopback listener.
  code_hash   text not null unique,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default '',
  scopes      text[] not null default '{}',
  -- PKCE: sha256 (hex) of the CLI's verifier. Redeem must present the verifier.
  challenge   text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists agent_auth_codes_expires_idx on public.agent_auth_codes (expires_at);
alter table public.agent_auth_codes enable row level security;
-- No policies on purpose: service role only.

-- ── agent_code_consume: single use, atomically ───────────────────────────────────────────────
-- One UPDATE … RETURNING marks the code used and hands its binding back in the same statement,
-- so two redeems racing on one code cannot both succeed - the second finds used_at set and
-- returns no row. An expired or unknown code returns no row for the same reason. The PKCE
-- check itself (sha256(verifier) = challenge) happens in the function, AFTER consumption:
-- a wrong verifier still burns the code, which is the intended failure mode for a code that
-- was intercepted.
create or replace function public.agent_code_consume(p_code_hash text)
returns table (user_id uuid, name text, scopes text[], challenge text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
    update public.agent_auth_codes c
       set used_at = now()
     where c.code_hash = p_code_hash
       and p_code_hash is not null
       and c.used_at is null
       and c.expires_at > now()
    returning c.user_id, c.name, c.scopes, c.challenge;
end $$;
revoke execute on function public.agent_code_consume(text) from public, anon, authenticated;
grant execute on function public.agent_code_consume(text) to service_role;

-- ── agent_key_resolve: a presented key -> its principal, and the last-used stamp ─────────────
-- The save path's lookup. Revoked keys resolve to nothing (the only way a revoke takes effect
-- is that this stops answering), and the stamp rides the same statement so "last used" in the
-- Settings list costs no second write.
create or replace function public.agent_key_resolve(p_key_hash text)
returns table (id uuid, user_id uuid, scopes text[])
language plpgsql security definer set search_path = '' as $$
begin
  return query
    update public.agent_keys k
       set last_used_at = now()
     where k.key_hash = p_key_hash
       and p_key_hash is not null
       and k.revoked_at is null
    returning k.id, k.user_id, k.scopes;
end $$;
revoke execute on function public.agent_key_resolve(text) from public, anon, authenticated;
grant execute on function public.agent_key_resolve(text) to service_role;

-- ── Self-check: CALL the bodies and prove the behaviour, not just that the DDL parsed ────────
do $$
declare
  v_count int;
  v_policies int;
begin
  -- Both tables exist with RLS on and NO policies.
  select count(*) into v_count from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('agent_keys', 'agent_auth_codes')
     and c.relrowsecurity;
  if v_count <> 2 then raise exception 'agent_keys / agent_auth_codes missing or RLS off'; end if;
  select count(*) into v_policies from pg_policies p
   where p.schemaname = 'public' and p.tablename in ('agent_keys', 'agent_auth_codes');
  if v_policies <> 0 then
    raise exception 'agent key tables must carry no client policies (service role only)';
  end if;
  -- The unique hash constraints are real.
  if not exists (
    select 1 from pg_indexes i
     where i.schemaname = 'public' and i.tablename = 'agent_keys' and i.indexdef ilike '%unique%key_hash%'
  ) then
    raise exception 'agent_keys.key_hash unique index missing';
  end if;
  if not exists (
    select 1 from pg_indexes i
     where i.schemaname = 'public' and i.tablename = 'agent_auth_codes' and i.indexdef ilike '%unique%code_hash%'
  ) then
    raise exception 'agent_auth_codes.code_hash unique index missing';
  end if;
  -- CALL the consume body: an unknown code answers no row, and the body actually runs.
  select count(*) into v_count from public.agent_code_consume('self-check-no-such-code');
  if v_count <> 0 then raise exception 'agent_code_consume answered an unknown code'; end if;
  select count(*) into v_count from public.agent_code_consume(null);
  if v_count <> 0 then raise exception 'agent_code_consume answered a null code'; end if;
  -- CALL the resolve body: an unknown key answers no row.
  select count(*) into v_count from public.agent_key_resolve('self-check-no-such-key');
  if v_count <> 0 then raise exception 'agent_key_resolve answered an unknown key'; end if;
  select count(*) into v_count from public.agent_key_resolve(null);
  if v_count <> 0 then raise exception 'agent_key_resolve answered a null key'; end if;
  -- The client roles cannot execute either RPC (the 0039/0040 lesson: a definer function in
  -- public is handed EXECUTE to anon/authenticated by default unless revoked).
  if has_function_privilege('anon', 'public.agent_code_consume(text)', 'execute')
     or has_function_privilege('authenticated', 'public.agent_code_consume(text)', 'execute')
     or has_function_privilege('anon', 'public.agent_key_resolve(text)', 'execute')
     or has_function_privilege('authenticated', 'public.agent_key_resolve(text)', 'execute') then
    raise exception 'agent key RPCs are executable by a client role';
  end if;
end $$;
