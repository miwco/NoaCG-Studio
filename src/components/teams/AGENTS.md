# src/components/teams - the team surfaces

Loaded alongside `src/components/AGENTS.md` when working in this directory (Claude reads it via
this directory's `CLAUDE.md` import; Codex reads it directly). The design it implements is
`docs/TEAMS_PLAN.md` §6, and the mockups it was built from are in `docs/design/teams/`.

## The gate is one hook, and reading the wrong thing is the trap

Every team surface asks `useTeamsAvailable()` - `backendConfigured && status === 'signed-in'`.
Nothing here may test the auth state itself, for one reason:

**`useAuthState().signedIn` is TRUE offline.** That is deliberate (`components/auth/AGENTS.md`):
a gate can never trap a user in a build that has no login at all. But it means a team surface
that read `signedIn` would render its door in exactly the build that must grow ZERO team UI -
the repo's oldest rule, pinned by `e2e/auth.spec.ts`, which is a stage-3 evidence bar rather
than a nicety (`docs/TEAMS_PLAN.md` §7).

Signed out with a backend renders NOTHING - not a `SignInPrompt`, which is the pattern
everywhere else. §6: "a user who never opens the door never sees the word team anywhere." The
ONE exception is `JoinTeamDialog`: somebody arriving on a teacher's `#/join-team/<code>` has
already been told teams exist, so that surface gates on `backendConfigured` alone and offers the
ACCOUNT leading (`offerSignUp`) - a student clicking that link usually has none yet.

Underneath both, `src/backend/teams.ts` starts every verb at `getSupabase()`, which is null
offline. Two independent reasons the offline build cannot reach a team is the point, not
redundancy.

## What is here

- **`teamsUi.ts`** - which production's share dialog is open. A module store because the door is
  reached from two SIBLINGS (Home's production card menu, the production page header) and the
  dialog mounts ONCE in `App.tsx`. Two mount points would put two dialogs on screen.
- **`ShareWithTeamDialog.tsx`** - the one door: three screens (`pick`, `create`, `team`) in one
  dialog because they are one errand. It fetches teams AND every member row it can see on open
  (RLS scopes both), so the pick list's member counts and the team screen's list come from one
  query rather than one per row.
- **`JoinTeamDialog.tsx`** - route-driven, mounted by `App.tsx` on `#/join-team/<code>`.
- **`TeamChip.tsx`** - one component so the amber-outlined chip is identical in every place a
  thing belongs to a team. Stage 4 attaches it to team production cards and the production
  header.
- **`useTeamsAvailable.ts`** - the gate above.

## Three things that were defects, so do not undo them

- **A dialog belongs to the surface it was opened from.** `ShareWithTeamDialog` lives in a module
  store and mounts at App level, so nothing else takes it down on a route change: it closed over
  a surface it said nothing about, backdrop and all. It now compares the route's HASH (the store
  writes a fresh object on every sync) and closes when it changes.
- **A new code is a new errand.** The route stays `join-team` from one link to the next, so
  `JoinTeamDialog` is not remounted; without resetting on the code, somebody who joined one team
  and followed a classmate's link to another read the FIRST team's success screen.
- **`.wz-modal` is sized for the WIZARD** (`height: min(960px, 94vh)`). A borrower that sets only
  a width gets a full-height sheet with its content in the top fifth. `.team-dialog` overrides
  `height`, the same way Settings and the save dialog do. And `.destructive` has NO global rule -
  every surface writes its own - so a delete control without one looks like every other button.

## Stage 3 is not the whole feature

Moving a production INTO a team is stage 4 (`docs/TEAMS_PLAN.md` §7), which is why the primary
action on the pick screen is disabled and a `.team-staged` sentence says so. Stage 4 enables it,
swaps it back to primary, and deletes that sentence. Do not ship the button enabled before the
team productions list exists: a moved production would leave the personal list and appear
nowhere.
