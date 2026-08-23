# src/components/auth - the account UI

Loaded alongside the root `AGENTS.md` and `src/components/AGENTS.md` when working in this
directory (Claude reads it via this directory's `CLAUDE.md` import; Codex reads it directly).
Keep it accurate.

Split out of `src/components/AGENTS.md` on 2026-08-22. Add a RULE here; leave the reasoning in
the code's own comments.

## Auth UI (auth/)

useAuthState hook + authUi store + SignInDialog + SignInPrompt + AuthStatus avatar menu
(-> Home / Settings / Sign out). The gating pattern: read `useAuthState().needsSignIn` (true
only when a backend is configured AND the visitor is signed out) and render `SignInPrompt` /
call `useAuthUi().openSignIn(reason)` - never block the app. Signup is OPEN (migration `0006`
made the Before-User-Created hook permissive; restore the 0002 function body to re-close it to
the allowlist). The signup half links the public `/terms` and `/privacy` pages and states that
creating an account agrees to the Terms and acknowledges the Privacy Policy. This is an
acknowledgement, not a separate consent checkbox. No login wall, ever - see the root AGENTS.md
"Auth posture".

ACCOUNT ESSENTIALS (docs/GOALS.md "Student release" step 9): SignInDialog carries a third
'reset' mode ("Forgot your password?" - email only, backend/auth `requestPasswordReset`);
the reset link's return trip is **PasswordRecoveryDialog** (mounted ONCE in App.tsx - the
link can land on any route), which answers the PASSWORD_RECOVERY event backend/auth
`onPasswordRecovery` now surfaces. SettingsDialog's Account section (email + password change
via `updatePassword` + sign out) renders nothing offline and waits through 'loading'. An
EXPIRED session (a signed-in to signed-out transition that was not the user's own Sign out -
backend/auth's consume-once deliberate-sign-out flag, checked in syncController) dispatches
`spx-session-expired`; App.tsx answers with openSignIn + a reason naming that local work is
safe. Offline pins in e2e/auth.spec.ts; the real flows in e2e/configured/account.spec.ts.

AGENT ACCESS (docs/AGENT_SAVE.md): **AgentAccessConsent** is the `?agent=…` QUERY route App.tsx
renders INSTEAD of the studio (beside `?control=`): `noacg login` opened it; it asks ONE
question - allow "<name>" to save graphics to your library? - and hands a one-time code to the
CLI's loopback listener (`backend/agentAccess.ts` parses the request and owns the ONLY redirect
target, `http://127.0.0.1:<port>/callback#…`). Offline = an honest "no backend" card with ZERO
auth UI; signed out = SignInPrompt `offerSignUp` + its own SignInDialog; signed in = the card
naming what the key may do (`PERMISSION_LABELS`) and the local port. Settings → Account grows
**Agent access** (`AgentAccessSection`): live keys with a Revoke each - minted in a terminal,
never here. Pins: e2e/agent-access.spec.ts (offline), e2e/configured/agent-access.spec.ts.
