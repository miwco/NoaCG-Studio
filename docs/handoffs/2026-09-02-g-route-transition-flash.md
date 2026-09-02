# Session G - route transition flash

**Branch:** `claude/g-route-transition-flash`
**Commits:** `7865c2c2` (the fix), `7da3ce18` (the URL guard), `17e84ffa` (the under-surface revert), `6d04e0cc` (merge of main), `8c0e5dac` (scope reduced to what CI proves).
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

## The CI round, and what it cost

The first queued landing was REFUSED, correctly: `auto-merge` phase 3 read the CI run on the
integrated sha, found it red, and changed nothing. That is the mechanism working - a red branch
never touched main.

Three CI rounds, and the useful part is what each one ruled out:

1. `7865c2c2` - five failures across `layout`, `motion-presets`, `wizard-logo`. main was green at
   the merge base, so they were mine.
2. `7da3ce18` - `layout` PASSED, `motion-presets` and `wizard-logo` still failed. Those two wait
   for `.topbar` after a bare `/app`, which my `bootedOnWizard` change had removed.
3. `6d04e0cc` - `motion-presets` and `wizard-logo` fixed by reverting that; `layout` failed again.

So the two halves are in tension, and they meet on the SAME question: which surface renders under
the wizard on a first-ever visit. Home underneath gives `.topbar` (specs 2 and 3 happy) and breaks
`layout`; nothing underneath fixes `layout` and breaks the other two.

**I could not reproduce the `layout` failure here.** The file passed, the single test passed, and
a reduction of that exact walk passed both WITH and WITHOUT the fix I had reasoned my way to -
which is what proved the hypothesis wrong instead of confirming it. The CI log rules out a race:
27 retries over 60 s means a stuck state, not a timing window.

Rather than ship a guess at an unreproduced failure, the branch now settles only the two boots
that are measured and pinned, and the first-ever visit goes back to exactly what it did before.
The remaining frame is filed in `docs/backlog/first-visit-boot-flash.md` with the full trail,
including the dead end, so the next session does not re-derive it.

---

# Adoption, 2026-09-03: why the branch could not land, and what fixed it

Written by the session that picked the branch up after its author finished. The account above is
left exactly as it was; this section only adds what was found.

## The failure, named

`layout.spec.ts:171` was not failing because of which surface renders under the wizard. **The
wizard never closed.** The interception CI reported - Home's `Open dashboard` button clicked into
`.gallery-backdrop.wz-full` for 60 s - is the startup wizard sitting on top of Home with nobody
left to close it.

The mechanism, in one sentence: `decideBootRoute` reads `window.location.hash` when App.tsx's
MODULE is evaluated, React's first render is a later moment, and a URL that moves inside that
window leaves the boot decision describing a page the reader has already left.

Spelled out. `galleryOpen` starts `true` on a profile with no autosaved project, so the startup
wizard is mounted from the first render and is owned by no route. On `main` the boot effect closed
it late but correctly: it read `useRouter.getState().route` at first-effect time and, for any route
that was neither `editor` nor `new`, called `closeGallery()`. This branch moved that half into
`decideBootRoute` at module load. `main.tsx` imports App only after awaiting the durable store and
then renders a concurrent root, so mounting the whole studio sits between the two moments. On the
phone walk (`goto('/app')`, seed a graphic and a show, `goto('/app#/home')`) the second navigation
lands inside that window on a slow runner. `decideBootRoute` had judged `/app`; the surviving
effect returns early at `if (route.view !== 'editor') return`; `routedWizard.current` is therefore
never set, so the routed-wizard effect does not close it either. Nothing does.

That also answers the question `docs/backlog/first-visit-boot-flash.md` posed as the place to
start - "why leaving `#/new` does not close a boot-opened wizard on CI". On that walk the route was
never `#/new` at all.

## Reproduced first, on this laptop

The author's reduction passed here because the window is milliseconds on a fast machine. Widen it
deliberately and it is deterministic: 8x CPU throttling, `goto('/app', { waitUntil: 'commit' })`,
and the second `goto` fired the moment `window.__noacgBootStage` reads `mounted` - `main.tsx` sets
that flag when `render()` is CALLED, and a concurrent root paints after it, so the flag marks the
start of the window exactly. Measured before the fix: `{"hash":"#/home","wzFull":1,"home":true}` -
Home rendered, wizard on top. The same walk under throttling but WITHOUT the boot-window timing
passed, which is why the shape mattered rather than the load.

## The fix

`src/App.tsx`, the routed-wizard effect's `else` branch. It closed only a wizard the ROUTE opened;
it now also closes a startup wizard sitting over a routed surface, read from the LIVE route. One
rule instead of two copies, evaluated before paint, and it holds whichever order module load and
the navigation land in. It cannot catch an in-app wizard by mistake: every door into the wizard
(Home's empty hint, the production page, `NewGraphicButton`, a template page's deep link)
navigates to `#/new` first, so a wizard open on any other route is only ever that boot.

Pinned by a new case in `e2e/route-transition-flash.spec.ts` that fails on the pre-fix commit.

## `/check`

`review: delegated` (code-review, high, 3 findings, 2 fixed). `simplify: inline` - the skill
returned fan-out instructions, which `.agent-workflows/check.md` says means the leg has not run.
`verify: build green; layout, auth and the boot specs green locally; CI green.`

The review's high finding is worth reading. The first-visit redirect - the one boot decision still
made from an effect - **writes the URL and did not ask the guard `decideBootRoute` asks**. A
browser with no autosaved project has `galleryOpen` true, so a password-reset link opened on a new
device had `#access_token=…` replaced with `#/new` one frame after the module-load guard had
carefully left it alone: no session, no `PASSWORD_RECOVERY` event, the dialog never opens. The bug
predates this branch (the old effect did the same), but the branch claims in its own comments to
have fixed exactly this. Both writers now share one predicate, `bootMayRewriteUrl`. The existing
fragment spec seeded an autosaved project first, which is precisely the branch that cannot reach
the bug, so the unseeded case is pinned beside it.

The review's second finding is filed, not fixed: refusing to rewrite a hash the app does not own
also refuses to move OFF it, so an auth return lands on the canvas editor rather than Home - the
surface the student release hides. It is the second half of the same fix, it ripples into the new
stranded-wizard rule, and it has no coverage today, so it is
`docs/backlog/auth-return-lands-in-the-editor.md` with the fix shape and the two traps in it.

## What is still open

- The FIRST-EVER visit still flashes the editor for a frame on its way to the wizard. It is
  unchanged, and `docs/backlog/first-visit-boot-flash.md` is updated: the obstacle that stopped the
  author moving it was this same stranded wizard, not the under-surface the revert blamed, so the
  move is available again.
- `student-rehearsal.spec.ts:110` failed once in the local integration run (a quiz state class,
  `#q-sel-2` missing `imported-design-qon`) and passed on its own immediately after, with CI green
  twice. A flake under a loaded laptop, not this branch - but it is the second time that spec has
  been slow-sensitive, so it is worth a look if it recurs.
