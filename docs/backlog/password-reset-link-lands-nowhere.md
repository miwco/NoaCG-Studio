---
v: 2
source: owner
kind: finding
raised: 2026-09-04
state: unstarted
found: "It arrived, but the link doesn't work. So that we can add to the next wave. It doesn't open up a place where I can redo the password it just goes to the landing page"
---
# The password-reset link drops you on the landing page instead of a page that can reset anything

**Filed:** 2026-09-04. **Source:** owner, walking the first real reset mail after custom SMTP went
live.

## Why

The reset mail now delivers - that half works as of 2026-09-04. What the student gets when they
click it is the public landing page, with no dialog, no explanation and no way back to what they
were doing. A password they cannot reset is the same as a locked account, and a class where a few
students lock themselves out on day one is the failure this whole SMTP job existed to prevent.

There are two separate problems and only the first is a config line.

**The immediate cause is a setting.** `OAUTH_REDIRECT` in `src/backend/auth.ts` is
`window.location.origin + window.location.pathname`, so a reset started from `/app` asks Supabase
to return the user to `https://noacg.studio/app`. When that URL is not in Supabase's redirect
allow-list, Supabase falls back to the Site URL, which is the bare origin - and the code comment
on line 43 already says why that fails: *"NOT the bare origin: that is the public landing page,
which runs no Supabase client."* No client, so the recovery token in the URL is never read.
`docs/DEPLOYMENT.md` step 8 of the Google section names the same allow-list as the thing people
get wrong. Adding `https://noacg.studio/**` to Authentication → URL Configuration fixes the
symptom.

**The design problem survives that fix.** Recovery has no page of its own. It depends on the link
happening to land on a route that boots a Supabase client, then opens a dialog over whatever the
studio was showing. That is fragile in a way a config change does not repair: any future route
change, any redirect, any self-hosted deployment on a different path, and it silently returns to
this exact behaviour with nothing failing loudly. It also reads as unprofessional, which the owner
said in the same breath.

## What it would take

A dedicated recovery route that does one job. It boots the Supabase client, reads the recovery
token, shows the set-a-new-password form, and on success sends the user into the studio signed in.
Then `resetPasswordForEmail` points at that route explicitly rather than at wherever the request
happened to be made from.

Worth doing at the same time, since it is the same page: say something when the token is missing
or expired. Today an expired link and a wrong route look identical, which is a blank page either
way.

## Evidence

- Owner, 2026-09-04, on the first reset mail sent through Resend: it delivered, the link opened
  the landing page, and there was nowhere to set a password.
- `src/backend/auth.ts:43-46` - the comment predicting this exact failure.
- `src/components/auth/PasswordRecoveryDialog.tsx` - the dialog that exists and never opened.
- `docs/DEPLOYMENT.md`, "Google sign-in" step 8 - the allow-list rule, written before this fired.

---

## Second walk, 2026-09-04 - the allow-list fixed half of it, and narrowed the rest

The owner added `https://noacg.studio/**` to Supabase's redirect allow-list and requested a fresh
reset. The link no longer goes to the public landing page. His words:

> the reset link sent me straight to "home". So I'm not prompted to change password, but I can ofc
> now go to my settings and change it. This is not really professional, but it's not urgent either,
> but we need to improve it at some point, so let's add it to the backlog

So the redirect half is settled and the remaining bug is on our side of the door.

**And being signed in is the diagnostic.** `src/App.tsx:45-60` documents the hazard that a boot
decision rewrites `/app#access_token=…&type=recovery` before the Supabase client is constructed,
which destroys the token: *"no session, no PASSWORD_RECOVERY event, and PasswordRecoveryDialog
never opens."* That is NOT what happened here. He arrived with a working session - he could reach
settings and change the password - so the hash survived and `detectSessionInUrl` consumed it. The
`bootMayRewriteUrl` guard did its job.

**Which leaves a subscribe-after-emit race as the likely cause, and it looks unconditional.**
`onPasswordRecovery` (`src/backend/auth.ts:126`) awaits `getSupabase()` and only then calls
`onAuthStateChange`. Constructing the client is what processes the URL and emits
`PASSWORD_RECOVERY`, so the listener attaches after the event it is waiting for has already
fired. `PasswordRecoveryDialog` subscribes from a `useEffect`, which is later still. If this
reading is right the dialog can never open on a cold load, which matches the two walks: the
mechanism has no timing window it wins.

Stated as an inference, not a measurement - nobody has put a breakpoint on it. Confirming it is
five minutes and should be the first step of the row rather than a rewrite.

**What this changes about the fix.** Do not rely on catching the event. At mount, read whether the
current session IS a recovery session (or that the arriving URL carried `type=recovery`) and open
the dialog from that, keeping the event only as a live signal. State beats a broadcast nobody was
listening for. That is a small change and independent of the dedicated-route work above, which
still stands on its own for the expired-token and self-hosting cases.

**Not urgent, by the owner's explicit call.** The workaround is real: a signed-in user changes
their password from settings. The people it fails are the ones who cannot get in at all, which is
who reset exists for.
