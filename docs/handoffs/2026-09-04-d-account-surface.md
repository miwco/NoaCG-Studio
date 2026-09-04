# D - password recovery has a route, and the topbar says which state it is in

Branch `claude/d-account-surface` (renamed from the worktree's auto-generated
`worktree-agent-a40d1b70c3d2443a7` at the start of the row).

## What the reproduction actually showed, and where it changed the plan

I could not click a mail, so I walked the RETURN LEG for real instead: minted a live recovery
link for the e2e account through Supabase's admin `generate_link`, then followed the
`/auth/v1/verify` redirect with redirects disabled and read the `Location` header. Two things
came out of it.

**The allow-list half really is settled for `/app`.** `redirect_to=https://noacg.studio/app`
comes back as a 303 to `https://noacg.studio/app#access_token=<922 chars>&expires_at=…&
expires_in=3600&refresh_token=…&sb=&token_type=bearer&type=recovery`. That is what the link
carries, and it matches the owner's second walk exactly. My first run of that probe put
`redirect_to` under `options` (where the supabase-js client wants it, not where the REST endpoint
does), it was silently dropped, and the Location came back as the bare Site URL - which looks
identical to an allow-list rejection. Worth knowing: **that probe fails silently in the shape of
the bug it is testing for.**

**What I could NOT measure is whether the allow-list also accepts the query form**
`https://noacg.studio/app?recovery=1`. The classifier stopped the probe after the first few runs
(reasonably - it reads a service-role key), and Supabase's own docs do not settle it: `**`
"matches any sequence of characters" and `?` is not one of its separators, so it should match,
but "should" is not a measurement. **This changed the design.** Pointing `resetPasswordForEmail`
at a URL I cannot prove is allow-listed risks a Site-URL fallback, which is the owner's original
bug. So the route does not depend on the query surviving:

- `resetPasswordForEmail` points at `?recovery=1`, as the row asked.
- App.tsx opens the recovery page on EITHER key: that query, or a `type=recovery` fragment -
  which Supabase appends to every reset link, including every one already sent.
- and `index.html` now forwards a recovery fragment that lands on the landing page into
  `/app?recovery=1`. That closes the failure class rather than the failure: even a rejected
  allow-list entry, on any deployment including a self-hosted one, cannot swallow a reset link
  any more. Pinned by `e2e/landing.spec.ts`.

The one thing left for the owner is therefore a confirmation, not a task, and it shows in the
first ten seconds of the walk: `docs/acceptance/owner-queue/2026-09-04-password-reset-has-a-route.md`.

## The race, confirmed at source rather than guessed

The backlog's inference was right and the mechanism is worse than "a race": in
`@supabase/auth-js` 2.110.2, `initialize()` opens `_pendingInitNotifications`, `_initialize()`
enqueues `PASSWORD_RECOVERY` while reading the URL, and the queue is flushed ONCE after
`initializePromise` settles. There is no replay. So whether a listener registered from a React
effect sees the event depends on which unrelated module happened to construct the client first -
`subscribeAuth` awaits `getSession()`, which awaits `initializePromise`, so if the topbar got
there first the flush is already done. **A listener was never the right mechanism.**
`src/backend/recoveryLink.ts` reads the arriving URL at module load instead, and
`onPasswordRecovery` is deleted with a comment at its old site saying why it must not come back.

## What Codex produced, and what I repaired

Delegated through `/rescue` (`gpt-5.6-sol`, effort high, `--write`), a 9,555-byte brief with the
acceptance conditions fixed before launch: `recoveryLink.ts`, `PasswordRecoveryPage.tsx`, the
`auth.ts` redirect, the dialog's state read. Round trip about nine minutes, run fully in parallel
with my own half - I took App.tsx, the CSS, both e2e halves and the landing forward, which kept
the offline pin (the thing most likely to break) in my hands and left no file contested.

**Every line it wrote was kept, and nothing it wrote was wrong.** Its self-reported green build
was really green. The repairs after it were gaps in MY spec, not its work: the full-screen surface
had no way back to the studio, and no `document.title`, so a reset link opened a tab labelled
"NoaCG Studio - Editor". Ledgered as `repaired / prompt` (cause `prompt` measures us, and is
excluded from pool quality) with `--defects 0`. On this evidence the Codex path paid: the spec
took about as long to write as the code would have, but it ran while I worked, and what came back
needed reading rather than rewriting.

## What review then found, and what changed

`/code-review high` returned seven findings; five were real and are fixed.

- **The landing forward missed rejected links.** A refused link carries no `type` at all -
  `#error=access_denied&error_code=otp_expired&…` - so my first regex missed exactly the case
  with the worst ending. It keys on the error fragment too now, which is safe there because every
  other auth redirect this app asks for names `/app`, never the bare origin.
- **"This link cannot be used" was being said where it is not known.** A real token that yields
  no session may just be `readSessionBounded` giving up after 6 s on a network that black-holes
  `*.supabase.co` - the Yle failure class. The page keeps three cases apart now (refused /
  could-not-check / no token at all), and the could-not-check card offers the reload FIRST,
  because asking for a new link travels the same blocked path and looks like it worked.
- **The topbar word was not free.** `app-shell.css` records the signed-in bar at 24px over at
  1366 before its 1400px step; an unconditional ~88px would very likely have re-broken the
  single-row contract `signed-in-ux.spec.ts` pins, with every offline spec still green because
  `e2e/configured/**` is outside the affected plan. So: the account NAME hides at that same
  1400px step, the signed-out word survives to 1240 - **measured**, editor bar, one row at 1366,
  1280 and 1250 - and `CONFIGURED_TRIGGERS` now names `AuthStatus.tsx` and the three stylesheets
  so a future width change at least gets REPORTED.
- **The 12ch cap would have clipped "Not signed in"** to "Not signed i…". The cap now applies
  only to the variable half, the account name.
- **The dialog was unreachable.** With the page owning every `type=recovery` load, nothing could
  reach `PasswordRecoveryDialog` or `onPasswordRecovery`. Both deleted.

Findings 2 (allow-list) is the one above that the design now routes around rather than fixes.

## /check

`review: delegated` - `/code-review high`, forked and handed its findings straight back, so the
pass really ran. Scope-checked against the merge-base diff before I acted on any of it; seven
findings, five fixed (above), one routed around by design, one covered by the deletion.

`simplify: inline` - the simplify skill returned instructions to fan out into four background
agents, which by the workflow's own four-branch rule means the delegated pass did NOT run, so
the four angles were covered here. Three things: the card wrapper was written out three times and
is now one `Frame` (the shape `AgentAccessConsent` already uses), the two ways out of the page
share one `studioUrl()`, and a redundant fragment went. The `origin + pathname` duplication is
wider than this diff (`teams.ts`, `HomePage`, `ModerationPanel` all spell it out) so it is
reported here rather than edited.

`verify: inline`, `taste: not applicable` - nothing here can move what a graphic looks like.
Stamp at `<git-common-dir>/noacg-jobs/checks/claude-d-account-surface.json`. Writing it needs the
two-step `Write`-then-plain-`cp` from `docs/backlog/check-verdict-stamp-unwritable-from-isolated-worktree.md`;
that backlog note is still accurate and its workaround still works.

## Verification

- `npm run build`: green, branch-stamped `claude/d-account-surface`.
- Offline pins by hand: `auth.spec.ts` + `landing.spec.ts`, 11 passed.
- The full 9-shard CI suite, asked for with `gh workflow run` rather than left to an incremental
  push plan, because a push plans from the PREVIOUS push and the run in flight gets cancelled -
  both happened here (run 33899717051 was cancelled by the next push). Run **33902142273**, on
  `72a92321`, is the verdict: `conclusion=success`, and reading its job list rather than its
  badge, all nine `E2E n/9 (full)` shards plus Build, Factory gates and the catalog calibration
  gate really ran. Only "Vercel accepted the commit" is skipped, which is what a
  `workflow_dispatch` does.
- A local `test:e2e:affected` was started and then STOPPED at 14 minutes: the plan for this diff
  resolves to the whole offline suite (`src/App.tsx` and `src/styles/` reach nearly everything),
  which is exactly what CI had just run green on the same commit across nine shards. Killed
  rather than left to orphan a dev server. Nothing local-only was lost.
- Browser, against the real hosted project (dev server in this worktree, `.env.local` with the
  two public VITE vars, removed afterwards): the expired card with Supabase's own sentence, the
  could-not-check card and its retry, the set-a-new-password form and its mismatch refusal, the
  pre-route fragment key routing an old-style link to the page, the "Back to the studio" link,
  the tab title, and the signed-out topbar word at three widths.
- Not done: the happy-path SAVE against a live recovery session. It needs a real token and would
  change the shared e2e account's password; the same `updatePassword` call is already covered by
  `e2e/configured/account.spec.ts`. The form was driven up to the submit.

## What is left

- `e2e/configured/anonymous.spec.ts` grew three tests (the state word plus its width pin, the
  dead-link card, the pre-route fragment key) that need `VITE_SUPABASE_URL` and so run only in
  the configured tier, not in CI. They were written from behaviour I drove by hand; nobody has
  run them as a suite.
- The account question the backlog's second half asks - *what is an account FOR, said in one
  sentence, at the moment we ask* - is untouched and is still the owner's call. This row did the
  cheap half only, as scoped.

## Pointers

`src/backend/recoveryLink.ts`, `src/components/auth/PasswordRecoveryPage.tsx`, the branch in
`src/App.tsx` after the `?agent=` one, the forward at the top of `index.html`, and the contract
in `src/components/auth/AGENTS.md` which now says out loud that a recovery listener must not come
back.
