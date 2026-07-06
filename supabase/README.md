# `supabase/` — the open backend for self-hosters

This folder is everything a self-hoster needs to stand up their own instance of the **open**
features (auth, cloud persistence, remote realtime control). It is deliberately part of the
AGPL-3.0 repo: schema and RLS are not secrets, and withholding them would break self-hostability.

**What is NOT here (by design):** billing, the metered AI gateway, and social-ingestion edge
functions, plus all secrets (`service_role` key, Stripe, social API keys). Those live in a separate
private repo and are wired into the hosted instance at deploy time only. The app talks to them over
a stable HTTP contract, never by importing their code. See `../docs/ERA5_PLAN.md`.

> **Status: code-first (Era 5.0).** These migrations and config are written and reviewed but not yet
> applied against a live project in this repo's CI (the app runs fully offline without them). The
> per-phase "live-verify" checklists in `docs/ERA5_PLAN.md` are the maintainer's runbook for
> validating auth/RLS/realtime against a real Supabase.

## Stand up an instance

```bash
# Local stack (needs Docker):
supabase start          # applies migrations/ + seed.sql
# or push to a hosted project:
supabase link --project-ref <your-ref>
supabase db push        # applies migrations/ (schema + RLS + auth hook)
```

Then point the app at it via `.env` (see `../.env.example`):

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>   # public; RLS is the real boundary
VITE_REQUIRE_AUTH=true                    # force login (hosted closed beta); omit for open/offline
```

With those unset, the app runs in pure offline localStorage mode — no login, no sync, exports
unchanged.

## Contents

- `config.toml` — project settings for the open features. Auth is **invite-only**: the
  Before-User-Created hook (`enforce_allowlist`) is the gate. Google OAuth needs
  `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` in the deploy env.
- `migrations/0001_documents.sql` — `documents` + `assets` tables, per-user RLS, the `updated_at`
  trigger, and the private `user-assets` Storage bucket + its RLS. Binaries live in Storage, not in
  `body` jsonb.
- `migrations/0002_auth_allowlist.sql` — the `allowlist` table and the `enforce_allowlist` auth
  hook. Add invitees with `insert into allowlist (email) values ('…');` (service_role / SQL editor).
- `seed.sql` — local-dev-only allowlist seed.

Migrations are ordered by filename and are **immutable once shipped** — change the schema by adding
a new migration, never by editing an applied one.

## Verifying live (maintainer checklist)

The app is built code-first: `npm run build` + offline E2E prove the offline path and the pure sync
logic, but the server paths below need a real project. Do these once after connecting:

**Auth (5.1)**
1. With `VITE_REQUIRE_AUTH=true` and your `.env` pointing at the project, `npm run dev` → you should
   see the login screen (not the app).
2. Add your email to the allowlist (`insert into allowlist (email) values ('you@…');`), then sign up
   / sign in with email+password → the app appears; the topbar shows your email + "Sign out".
3. Sign up with a NON-allowlisted email → it must be rejected with the private-beta message. (This
   confirms the `enforce_allowlist` hook is wired — Authentication → Hooks in the dashboard.)

**Cloud sync (5.2a)**
4. Signed in, open 📦 Packets, save a graphic into a packet → the topbar sync pill goes
   "Syncing…" → "Synced". In the dashboard, Table Editor → `documents` shows a `packet` row owned by
   your user.
5. Sign in as the SAME user in another browser/profile → the packet appears (pull works).
6. Delete the packet on one device → after sync it disappears on the other (tombstone propagates),
   and the `documents` row has `deleted = true`.
7. **RLS isolation (the security check):** sign in as a SECOND user → they must NOT see the first
   user's packets, and the `documents`/`assets` selects return only their own rows. (RLS, not the
   UI, is the boundary.)

If any of 3 or 7 fail, stop and fix the policy/hook before inviting testers — those are the security
guarantees.
