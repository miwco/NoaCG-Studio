# Session G - route transition flash

**Branch:** `claude/g-route-transition-flash`
**Commits:** `7865c2c2` (the fix, the spec, the receipts), `7da3ce18` (the check's fixes), plus
the regression fix below.

## What the goal was, and whether it is true

Opening the studio no longer paints a screen the boot was never going to land on. The owner's
2026-08-28 report is closed for the `/app` boot; the in-app half of it did not reproduce, and I
say below exactly what I measured rather than folding it into the same story.

## The reproduction, which took most of the session

The receipt's hypothesis was "a mount / z-order / route-swap ordering defect in the shell". **That
is refuted.** Every in-app route swap is atomic: `editor -> production`, `production -> home`,
`home -> wizard`, `wizard -> production`, `production -> editor`, measured on a production build
at 6x CPU throttle with a real document open and a real production, recording per animation frame
which surface roots were in the DOM and which element was on top at the middle of the viewport.
Not one of them showed an intermediate state. Two instruments agreed: the per-frame log and a CDP
`Page.startScreencast` filmstrip, which emits a frame per compositor commit and so cannot miss a
painted state.

What DOES flash is the **boot**, and the first three attempts missed it because they were run on a
fresh profile. The defect needs a profile that has already made something, which is every profile
except a first-ever visit. Measured on a production build at 4x throttle:

| boot | before | after |
|---|---|---|
| `/app`, default mode, has a saved project | `["editor", "home"]` | `["home"]` |
| `/app`, default mode, first-ever visit | editor painted, then the wizard | wizard only |
| `/app#/production/<id>` deep link | `["wizard", "production"]` | `["production"]` |
| `/app`, advanced mode | `["editor"]` | `["editor"]` (correct already) |
| `/app#/new`, `/app#/home` | already clean | unchanged |

The `["editor", "home"]` row is the owner's sentence in data: a full frame of the canvas editor,
on top, on a boot whose destination was always Home. Screenshot evidence of that exact frame, and
of the same boot afterwards, is in the scratchpad under `scratchpad/flash/evidence/` (the
`boot-before-*` and `boot-after-*` filmstrips, each with a `frames.json` carrying the per-frame
log). It is outside the repo on purpose - it is 40-odd MB of PNGs.

## The cause, and why it is one cause

`src/App.tsx` chose the boot surface inside a `useEffect`. An effect runs after the first commit
has been painted, so the surface the first render picked is on screen for at least one frame. A
bare `/app` still parses as `{view:'editor'}`, so the first render was `<AppShell/>` - the whole
canvas editor, Monaco and all - and the redirect to Home arrived a frame later. The same effect
carried the "a deep link must not open under the startup wizard" suppression, which is why the
production deep link flashed the wizard.

The file already kept this rule for OPENING the wizard, and its own comment explains why an effect
cannot carry that write. The redirect half had simply been left behind. It now happens in
`decideBootRoute()` at module load, before React renders at all.

## What the check found, and what it changed

`review: delegated` (code-review, high, 8 findings, 7 fixed). `simplify: inline` - the skill
returned fan-out instructions rather than a result, which `.agent-workflows/check.md` says means
the leg has not run, so I covered its four angles here. `verify: build green, specs below.`

The review's high finding is worth reading, because deciding at module load made an existing bug
certain rather than merely likely. Supabase runs the implicit flow with `detectSessionInUrl` on,
so Google sign-in and every password-reset link come back to
`/app#access_token=...&type=recovery`. `parseRoute` reads an unrecognised fragment as the editor,
so the redirect rewrote it to `#/home` - destroying the token before the Supabase client was ever
constructed, which means no session, no `PASSWORD_RECOVERY` event, and a reset dialog that never
opens. The redirect now runs only for a genuinely bare boot. I proved the guard is load-bearing by
running the assertion against the pre-guard commit: the fragment came back as `#/home`.

The other one worth naming: the spec would not have run on the merge gate. CI sets
`E2E_SPRINT_FOCUS`, which turns a CORE escalation into the focus list, and `src/App.tsx` is CORE -
so a later branch could move the boot decision back into an effect and still go green. The spec is
in `scripts/e2e-lists.mjs`'s `FOCUS` now.

## The regression I caused, and how I found it

The first CI run failed five tests across `layout.spec.ts`, `motion-presets.spec.ts` and
`wizard-logo.spec.ts`. `main` was green at my merge base, so they were mine.

I had also made `bootedOnWizard` read the RESOLVED boot route rather than the URL the reader
arrived on. That looks tidier and is a behaviour change nobody asked for: it takes the
under-surface off a first-visit `/app`, so `.topbar` no longer exists there - and that boot is
what several specs bootstrap through (`e2e/_create.ts` says "both shells render a `.topbar`"). It
now reads the arrival URL again, captured before `decideBootRoute` is allowed to rewrite it. The
flash is gone either way, because the route already says `new` when the first render happens, so
the surface under the wizard is Home rather than the editor.

## The gate

`npm run build` green. `route-transition-flash.spec.ts` plus the three specs my change broke, run
locally. CI on the final sha is the authority - **read which jobs ran**, not just the colour.

## What I did not fix

- **The in-app `editor -> playout` swap.** It is atomic on this build, before and after, at 6x
  throttle. If it still looks wrong to the owner when he walks it, that is a different defect from
  the one this branch closed, and the owner-queue item says so in his own terms rather than
  claiming his second route was fixed.
- **The wizard's step deep link.** Sweeping for the same SHAPE - a mount effect deciding which
  whole screen renders - turned up three more instances, all in `CreationWizard`'s step selection:
  a boot onto `#/new/step/<name>` or a template page's `#/new/<designId>` paints the Entry step for
  a frame before jumping. Filed with its Why, its three line numbers and its fix shape in
  `docs/backlog/wizard-step-deep-link-flash.md`. Left alone because `CreationWizard.tsx` is a hot,
  heavily-commented file with three interlocking step effects and it sat outside this branch's
  agreed touch set - it wants its own branch and its own suite run, not a blind edit at the end of
  a long session.
- The sweep also cleared everything else it looked at: no other mount effect in `src/` decides
  which top-level surface renders.

## The instrument, if you need it again

`e2e/route-transition-flash.spec.ts` installs a MutationObserver before the first commit and
records every surface the first time it enters the DOM. That matters: a one-frame defect can be
missed by sampling - rAF, screenshots, a screencast - but a screen has to be INSERTED to be
painted, so an insertion record cannot report a false negative. Point the same recorder anywhere a
"which screen appeared first" question comes up.

## Safe to archive

Yes, once the branch lands. Nothing is left running: the dev server and the dist server this
session started are both stopped, and the queued suite job was cancelled deliberately (it was
running against a working tree I was still editing, so its verdict would have been meaningless).
