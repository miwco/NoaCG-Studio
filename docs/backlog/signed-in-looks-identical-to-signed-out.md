---
v: 2
source: owner
kind: finding
raised: 2026-09-04
state: unstarted
found: "it is actually quite confusing to use NoaCG when you're not logged in because it looks exactly like you would be logged in. It's like there's no difference between being logged in or not. If it works, it's fine. I don't have a really good reason for people to be logged in, but just a note for us that we should keep that in mind."
---
# You cannot tell whether you are signed in, and the product never says why you would be

**Filed:** 2026-09-04. **Source:** owner, after the reset-link walk.

## Why

This is deliberate in origin and the owner is not asking to undo it. The open studio is a pillar:
create, preview, export and local saves work with no account, and `e2e/auth.spec.ts` pins that an
offline build grows zero auth UI. The consequence he noticed is that the signed-out studio is
visually identical to the signed-in one, so a user has no way to know which state they are in.

Two costs follow, and they point in opposite directions, which is why this is a note rather than a
task with an obvious answer.

Someone who believes they are signed in can do a session of work and never learn that none of it
synced. That is the expensive one, and it is worse for a student on a shared machine.

The second is the one the owner named himself: *"I don't have a really good reason for people to
be logged in."* If the product cannot say what an account is for at the moment it asks, the honest
fix may be to ask less often rather than to signal harder. Cloud sync, community and show chat are
real answers; none of them is visible at the moment the question comes up.

He explicitly did not rule on it: *"If it works, it's fine... just a note for us that we should
keep that in mind."* So this is filed to be weighed, not to be built.

## What it would take

The cheap half is a persistent, quiet indication of state - the account control saying which state
it is in rather than only offering the action. That is small and does not touch the pillar.

The real half is a decision nobody has made: what is an account FOR, said in one sentence, at the
moment we ask for one. That is product scope and it is the owner's call. Worth pairing with the
question of when we ask at all, since a prompt that cannot justify itself is the thing he was
reacting to.

## Evidence

- Owner, 2026-09-04, verbatim in the receipt above.
- `AGENTS.md`, "Auth posture (the open studio)" - the pillar this must not break.
- `src/components/auth/SignInPrompt.tsx` and `AuthStatus.tsx` - where the state is surfaced today.
