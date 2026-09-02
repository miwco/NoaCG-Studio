# Teams stage 3 - the share dialog, the join route, the offline proof

Branch `claude/n-teams-share-dialog`, cut from `origin/main` at `4a781d98`. Five commits.
`docs/TEAMS_PLAN.md` §7 stage 3 and `docs/PROGRAMMES.md` P1 both record it as landed.

## What shipped

A signed-in user can create a team, read out its join code, join one by code or link, see who is
in it, remove members (as owner), rotate the code (as owner), leave, and delete the team. NO
MIGRATION - every verb calls what session G landed in 0053/0054, and the client half is
`src/backend/teams.ts`.

The door is ONE dialog, reached from the production page header and the productions section's
per-card overflow menu. Both, and `#/join-team/<code>`, are gated on one hook,
`useTeamsAvailable()` = `backendConfigured && status === 'signed-in'`.

## The trap that decides this row, named for whoever comes next

**`useAuthState().signedIn` is TRUE offline.** Deliberately - a gate must never trap a user in a
build that has no login. But a team surface reading it would render its door in exactly the build
that must grow zero team UI. That is why the gate is its own hook, why
`src/components/teams/AGENTS.md` opens with it, and why the rule is repeated in
`src/components/home/AGENTS.md`, which is the contract that loads where the two mount points live.

Underneath it, every verb in `src/backend/teams.ts` starts at `getSupabase()`, which is null
offline. Two independent reasons the offline build cannot reach a team.

## What it deliberately does NOT do, and why

**Moving a production into a team is off.** The button is present, disabled, and a sentence above
the footer says why. The move writes `team_productions` and tombstones the personal record; until
stage 4's team-productions list exists, a moved production would leave the personal list and
appear nowhere. That is not a half-built dialog - every ENABLED control works end to end against
the real RPCs. Stage 4 enables the button, swaps it back to primary (today the primary is "Join
code & members", because the loudest control on a screen has to be one that works) and deletes the
`.team-staged` sentence.

Consequently the team CHIP, which §7 lists under stage 3, ships as a component used in the share
dialog (the pick list and the join confirmation) rather than on production cards - there are no
team productions to wear it yet. Stage 4 attaches the same component to the cards and the header.

## The two open questions G left: built as he left them

- **Every member sees the join code** (any member can invite; rotation stays owner-only). The
  dialog says so in as many words.
- **Display names only** - no teammate email appears anywhere.

Neither mockup implied otherwise, so nothing was silently resolved.

## The one deviation from the mockups

Mockup screen 2 shows the code screen but no create FORM, and the owner needs a display name to
appear in the member list at all (`team_join` writes it). So the create form asks for the team
name AND "Your name, as teammates see it", prefilled from the part of the address before the @ and
editable. Everything else follows the mockups, member counts on the pick rows included.

## Evidence

- `npm run build` green (exit 0) after every step.
- **The offline proof**, `e2e/auth.spec.ts` +2 tests: a production has no team door on its page or
  its card and no overflow menu at all; a join link opens no dialog and still lands on Home. Each
  absence is paired with a presence assertion so the surrounding surface is proven to have
  rendered. **Both were checked by breaking their gate and watching them fail** - `useTeamsAvailable`
  forced to `true` fails the first, `JoinTeamDialog`'s `backendConfigured` guard defeated fails the
  second. The selectors live in `e2e/_teams.ts` and are asserted VISIBLE by the configured spec, so
  a typo breaks that one loudly rather than quietly greening these.
- **The signed-in proof**, `e2e/configured/teams.spec.ts`: signed out the door is absent and a join
  link offers an account; signed in it creates a team, reads an 8-character code, rotates it,
  re-joins through the link, gets an unknown code refused by name, and deletes the team. Green
  against the REAL backend. Review shots in `test-results/signed-in/teams-*.png`.
- **CI run 33572872525 green on `cd3aab6e`**, all 9 E2E shards RUN (checked with
  `gh run view --json jobs`). The check-phase fixes were pushed after it as `1a50bed4`; that run
  was still in flight at handoff time - **read it before landing** (`gh run list --branch
  claude/n-teams-share-dialog`).

## /check

- **review: delegated** - the code-review skill, level `high`, forked and returned its findings
  here; scope-checked against this branch's 23 files before acting. 6 findings, all confirmed
  against the surrounding code, all fixed (see the last commit).
- **simplify: inline** - the simplify skill returned background fan-out instructions rather than a
  result, so per `.agent-workflows/check.md` the leg ran inline over its four angles. 4 changes:
  the duplicated display-name suggestion moved into `backend/teams.ts`, the duplicated Escape
  guard into `useEscapeToClose.ts`, the thrice-computed member slice hoisted, and `leave` made
  stable so the Escape listener subscribes once.
- **verify: inline** - build, the offline spec, the live spec, and the CI run above.
- Verdict stamp at `<git-common-dir>/noacg-jobs/checks/claude-n-teams-share-dialog.json`.

## Defects found and fixed that only running it could find

Four from the live walk, six from review. The ones worth knowing about:

1. **A failed fetch read as "you are not in a team yet"** - both list queries answered an error
   with an empty array. That screen's next move is to make a team and hand out its code, so a
   dropped request would have split a class across two teams with nothing on screen having been
   wrong out loud. The same swallow told an owner "Nobody has joined yet" about a team with
   members, from which the obvious conclusion is that the code is broken.
2. **Escape reached both the sign-in card and the dialog under it** - the student who opened a
   teacher's link signed out, pressed "Create a free account" and then Escape lost the join route,
   and the code with it (it lives only in the fragment).
3. **A second join link showed the FIRST team's success screen** - the route stays `join-team`
   from one link to the next, so nothing remounted the dialog.
4. **The share dialog survived navigating away**, leaving a modal and a full-screen backdrop over
   a surface it said nothing about.
5. **It inherited `.wz-modal`'s wizard height** - ~280px of content above ~400px of nothing.
6. **`.destructive` has no global rule**, so Delete team and Leave team looked exactly like Back.

## For the next session

- **Stage 4 is next and needs no schema either**: the team productions list, verb saves over the
  CAS RPC, republish by a member. `docs/TEAMS_PLAN.md` §7's last paragraph carries the two things
  it must know (the CAS token is a millisecond-truncated `timestamptz` - do not re-format it; and
  moving a team production back to personal is ONE statement setting `owner_id` and clearing
  `team_id`). Start by reading `src/components/teams/AGENTS.md`.
- **`src/components/AGENTS.md` was deliberately NOT touched.** The wizard's instruction chain has
  1950 bytes of headroom (98.3%), and the byte-headroom row the owner asked for by name lands
  alone. The area contract is a nested `src/components/teams/AGENTS.md`, which costs that chain
  nothing, and the gate rule is repeated in `src/components/home/AGENTS.md`, which has room and is
  where the door's mount points live. If a pointer line in `src/components/AGENTS.md` is wanted, it
  belongs to the byte-headroom row.
- **UNVERIFIED**: nothing here has been seen by a human. The owner-queue item
  `docs/acceptance/owner-queue/2026-09-02-teams-share-dialog.md` carries the route.
- **UNVERIFIED**: the multi-account story. Everything signed-in was walked by ONE account, so
  "B joins A's team and both see the same member list" is asserted only by migration 0053's own
  self-check, never by a browser. That is stage 5's three-context e2e and is on the plan.
- **Pre-existing, not this row's**: the analytics consent banner is fixed bottom-right at z-index
  1200 and covers a short centred dialog's footer for an undecided visitor. `production-links.spec.ts`
  already recorded it against the Links popover; the teams spec declines it the same way. It is a
  layout finding with two witnesses now.
- The live spec writes to the real backend on the throwaway test account and sweeps every
  `E2E team ` and `Teams walk ` row it can see at the end, so a run that dies mid-way heals on the
  next one rather than needing a human with SQL.

## Landing

Queued via `/queue-merge` as the session's last action. Nothing was merged here.
