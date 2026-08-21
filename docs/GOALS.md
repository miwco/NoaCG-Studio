# Goals

The committed north star. **This file holds only what is NOT done.** A milestone that lands moves
to [`GOALS_ARCHIVE.md`](GOALS_ARCHIVE.md) verbatim - the full shipped record with dates and
rationale, so nothing is lost - and is deleted from here. When the direction changes, rewrite this
file; the archive keeps the history. Keep it under ~200 lines: a roadmap nobody can read in one
sitting steers nothing.

---

## North star

> **One link, live anywhere.**
> Pick a broadcast graphic, make it yours without touching code, and put it on air in five
> minutes - in CasparCG, SPX, OBS, vMix, or whatever the show runs on - from **one output URL**,
> driven by a **control panel inside NoaCG**.

That URL is the product. Everything else serves it: the wizard exists to fill it, the catalog
exists to make it look paid-for, the export adapters exist so it reaches any playout machine, the
control layer exists so a person can drive it live.

The first-named user is a **student or non-technical operator** who runs a real production without
ever seeing code; organizations, channels, streamers and universities follow. A **professional**
keeps full control through **Advanced mode** - the editor, one toggle away, never required. The
generated HTML/CSS/JS is the single source of truth and stays clean and readable; looking at it is
optional. Used in teaching, but it is a production tool, not a code tutorial.

**The binding deadline: students go live by 2026-08-21.** Work that does not serve that date is
not current work.

### What "done right" feels like
- **Fast** - open NoaCG, choose a design, make a production, paste the URL into CasparCG or OBS,
  live in under 5 minutes. No code, no install.
- **Tasteful** - every design looks like a paid MotionArray/Envato asset, not a tutorial demo.
- **Consistent** - graphics made together share one palette and type family across every
  category, usable in a real programme.
- **Yours** - custom colors and imported fonts are first-class; fonts embed in the export.
- **Smooth** - 60 fps, transform/opacity only, professional easing.
- **Reliable** - every export passes the validation gate and plugs straight in.
- **Editable** - a pro can open any generated file and extend it. Nobody has to.

### Anything-goes export (a platform, not an SPX generator)
Many environments - **SPX, CasparCG, OBS, vMix, OGraf**, more over time. SPX stays the canonical
*internal* format and the strictest validation target; every other target is an adapter off that
same source, so breadth costs no rework. Breadth across the live stack, plus automation and remote
control, is the long-term differentiator.

### Operating principles
- **Free forever for the core.** Creating, editing, exporting, controlling, self-hosting - always
  free. No paywall on the workflow.
- **One paid surface, later: hosted AI** for users who will not bring their own key (real compute
  cost). **Bring-your-own-key is always free.**
- **Users, not revenue.** Optimize for adoption and regular use. Money is a later consequence of a
  large, happy user base.
- **No sign-in for its own sake.** The studio - create, customize, export, self-host - never asks
  for an account. It is asked for only where it *buys* something the user wants: their graphics
  and productions saved to their own Home across devices, the persistent cloud output URL, and
  hosted AI allowance.

### Who we are replacing

Three products, and what each one obliges us to build. The long-term goal is to take their
customers, so their proven capabilities are our requirements list.

- **Rive** - a designer-first tool for interactive animation with real state-machine logic,
  embedded through a small runtime. Interactive, state-driven behaviour is what a live graphic
  fundamentally IS, so Rive sets the bar for our state machine and node editor.
- **Singular.live** - cloud broadcast graphics: templates in their cloud, a browser control room,
  output reaching air from their playout. They already do most of what we intend, so the gap we
  have to open is **breadth** - a catalog covering nearly any use case - over equivalent cloud
  playout.
- **Loopic** - HTML broadcast graphics, the closest positioning to ours, with a real editor. Its
  timeline and canvas editing are what our Advanced mode has to beat.
- **MXMZ** (mxmz.com, added 2026-08-20 - named by Yle as the working model) - Dutch cloud
  broadcast-graphics SaaS out of Banijay/Southfields: design in Illustrator/Figma/Canva, import
  the SVG with **every layer auto-exposed** for animation and JSON data binding, browser timeline,
  operator playout with newsroom/sports-data integrations; 200+ channels, from ~$3k/yr. They prove
  the "your own SVG, playable" workflow at broadcast scale, so our SVG import has to match it
  (layers auto-exposed, no renaming ritual) - and beat it on what they lock away: free-forever,
  self-host, export the files anywhere, a catalog and AI they don't have.

---

## NOW - students live in two weeks

### Student release - wizard to live broadcast

*Steps 1-9 shipped 2026-08-04/05; the full text of each is in the archive. Step numbering is cited
from ~80 places in the tree, so it never changes.*

- [x] **1.** Scope locked, one goal and one roadmap - **2.** the student-critical focus suite as
      the per-change gate - **3.** packages removed, Production is the only grouping - **4.**
      editor behind Advanced mode, full-screen wizard - **5.** deterministic customization with
      declared field expansion - **6.** wizard → production → publish → output, complete - **7.**
      two coherent production-ready packs (newsroom, talk-show) - **8.** Home simplified around
      Productions - **9.** account essentials (reset, change, sign out, expiry recovery).
- [ ] **10. Playout hardening + owner acceptance.** History in the archive; what stands today:
      **the HARDWARE half is CLOSED, by the owner, on the school's CasparCG machine (2026-08-19)**
      - *"The hardware is working, everything is working, and playout is working, so that is not a
      concern."* Do not plan a night around re-proving CasparCG playout, and do not read the
      archived "remaining, owner + real hardware" paragraph as owed work.
      **Remaining is the PEOPLE half of `docs/STUDENT_RELEASE_ACCEPTANCE.md`:** the soak, one
      live-suite run against the real project, and the timed first-time-user walks.

### The surface under investment: the WEB PLAYOUT CONTROL PANEL

**Owner direction, 2026-08-19:** *"I'm not going to download any templates right now. I like our
playout system; I don't want to work with the vanilla CasparCG client with these templates. I want
to use our web playout system… The downloadable templates, of course, are going to stay, but we're
going to be working on and concentrating on the online playout control panel."*

The hosted control page and the `/output` browser source are the product's PRIMARY surface, not a
cloud alternative to the export door. Export stays supported and is not where effort goes. This
goes further than the cloud-first decision below: that one settled which door the CLASS runs on,
this settles which door the PRODUCT invests in. Weigh any playout work by what it does for the web
control panel first. The binding design is `docs/PLAYOUT_DASHBOARD.md`, and the three surfaces that
render it must not drift (`docs/CONTROL_PANEL_PARITY.md`).

### Open risks for the deadline
- [ ] **Visual acceptance of the interactive playout plane.** Phases 0-6 of
      `docs/INTERACTIVE_PLAYOUT_PLAN.md` are merged - per-cue contextual controls, the shared data
      foundation, vote-to-air, presenter view, the audience join page - and **none of it has ever
      been looked at by a human**; geometry-only e2e coverage is not acceptance. A student-facing
      surface that has never been seen is the largest unmeasured risk in the release.
      **First pass done 2026-08-08, and it paid for itself immediately:** the audience link 404ed
      on production for every operator who copied it (a `vercel.json` rewrite pointing at
      `/join.html` under `cleanUrls`), and the presenter view rendered as unstyled serif text
      because the join stylesheet ships with the surface it never mounts. Both fixed, both now
      gated. **Second pass done 2026-08-08** over the rest of the plane - contextual cue controls,
      the Data workspace, vote-to-air - and it paid for itself the same way: **the first Take of a
      session aired the graphic and put it straight back off** (the boot recovery treated the
      operator's own take as a page opening onto a live production and snapped to a stale "off"),
      black PROGRAM monitor and every ⚡ action greyed, on every offline take. Every spec took a
      cue instantly, inside the window the bug needed, so the suite was green over it. Fixed and
      pinned by a spec that waits first; two shared-control defects fixed with it. The Data
      workspace's empty state - a sentence over ~950px of nothing, with its ⬇ Blank CSV button
      orphaned on a row of its own - was rebuilt 2026-08-12 around the three doors and the column
      names that would bind. **Still owed: the owner's own eyes**
      (`docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Acceptance pass 2026-08-08").
- [x] **Which door the class runs on: DECIDED 2026-08-08 - CLOUD FIRST, EXPORT AS THE BACKUP.**
      The class publishes and drives the persistent output URL with phone control; the export route
      (files, local relay and controller on the playout machine - the one round 2 proved on real
      hardware) is what a failing network falls back to. One consequence still owed:
      **the accounts exist before the class, not during it**. The other - rehearsing the cloud
      door on real hardware before the export door - was **done by the owner 2026-08-19** and
      closed the hardware half of step 10. Third accepted limitation, unchanged: restyling
      after save means recreating in the wizard or Advanced mode.
- [ ] **What cloud-first pulls forward.** Named here rather than discovered during the class:
      the **hosted control page is now a primary surface** (it was covered by the maintainer's live
      checklist alone, because an offline build cannot drive it) - its own copy of the first-take
      recovery defect is fixed but has never run against a real backend; the unexplained
      **"the CasparCG URL stopped working"** report from acceptance round 2 is a cloud-door report
      and the one mechanism that matched it - unpublishing deleted the row, so re-publishing minted
      a new slug for every link - is **fixed 2026-08-12 by migration 0040**, which reserves a
      production's four addresses for its lifetime and hands them back on re-publish
      (`docs/CLOUD_PLAYOUT.md` §3). **0040 still has to be applied to production**, and until it is,
      an unpublish there still moves every URL. **Migration 0034 was NOT the third one** - it
      has been applied all along and the parking-lot line saying otherwise was stale (see below).
      **And the live suite is now load-bearing.** Run against the real project 2026-08-08: 7 of 18
      passed, then **17 of 18 after repair, 1 flaky** (the renderer showed the aired board later
      than the spec's 30 s and passed on retry and on an isolated re-run - the one thing to watch,
      since "it did not appear" is the failure a class notices). It found one real defect: signed
      in at 1366px the topbar overflowed and hung the ACCOUNT AVATAR off the screen edge. The rest
      was rot from the student release - it only ever runs by hand, so nothing reported any of it.
      **Run it before the class, and again after any change to publish, output or the topbar.**

---

## NEXT - your own graphic, playable (the SVG road)

**Owner direction, 2026-08-20, after the Yle demo - north-star material, wanted working in a few
weeks.** People take pride in graphics they made themselves; the product must let them PLAY OUT
their own work, not only our catalog's. The raster Import Graphic cannot deliver that promise -
erase fails on textured art and AI recreation is "inspired by", never the exact graphic. **SVG is
code**: a layered SVG from Illustrator/Figma imported verbatim, its text and image layers bound to
data fields, IS the user's exact graphic as a playable template - exporting to SPX, CasparCG,
OGraf, OBS like anything else. MXMZ proves this workflow commercially; we do it free and open.
The binding plan is `docs/SVG_IMPORT_PLAN.md`.

- [ ] **SVG import v1**: drop an SVG into the Import door, text layers auto-detected as bindable
      fields (no renaming ritual; layer names prefill labels), map + preview, create - the exact
      graphic becomes an ordinary NoaCG template. Acceptance: a student takes an Illustrator SVG
      to air, unchanged pixels, inside one session.

---

## NEXT - AI that anyone can afford

Three execution tiers behind the one "Create with AI" door. They differ by **capability**, and the
funding model follows the capability - never the other way round. Detail lives in the plan docs;
these are the commitments.

| Tier | Who pays | Price target | What it is | State |
|---|---|---|---|---|
| **NoaCG Lite** | us, free to the user | **100 graphics per €1** (~€0.01 each); measured **$0.00032** | **Promise: a proven catalog design, carrying your brand and your words - reliably, every time.** Grounded in **our catalog**: the model picks a proven design and adapts it. It does not invent a layout. | **its own value gate answered NO 2026-08-14; REVIVED by owner decision 2026-08-15, and the bar is a re-run of that same gate** |
| **NoaCG Pro** | user, a little | **~€10 per 100 graphics** (~€0.10 each); measured **~$0.004 per package** | **Promise: an on-air look designed for your channel, and every graphic of the package built in it - a palette, type voice, accent form and motion character no shipped design carries - rendered by the platform, so the layout is always sound.** The model decides the design LANGUAGE; the platform composes every graphic in it (`docs/NOACG_PRO_PLAN.md` §15). Not "a composition no shipped design uses": composing the panel is the premise three rounds measured to fail, and §15.4 retires it. | **LIVE since 2026-08-15** on hosted deployments (`AI_PRO_ENABLED` + a metering backend; it never asks a user for a key). The package (lower third + sponsor bug + countdown from one generation) shipped 2026-08-16; three consecutive clean owner blind reads (§17/§19/§21) |
| **Bring your own key** | the user's own provider account | whatever that provider charges, shown per model | Any model OpenAI, Anthropic, Google or Hugging Face offers, on the user's key. No NoaCG money, no NoaCG allowance. | shipped |
| **NoaCG Extreme** | subscription | not set - after there is income | The newest frontier models designing directly. Expensive, technically the simplest. | not started, needs income first |

**The price targets are commitments, not observations.** A tier that cannot be served inside its
target is a tier whose ROUTE changes, never one whose price rises: free stays free, and Pro's
number is what makes "a little" a promise rather than a feeling. Both are per finished graphic,
counting every model call a generation makes.

### Owner decision 2026-08-15: Lite and Pro are revived, and the bar is the same gate

**What was decided on 2026-08-14 and what stands today are different things, so both are written
here.** Lite's own value gate (`docs/AI_LITE_BRAND_PLAN.md` §2) FAILED on the owner's blind ballot:
Lite beat the template arm on brand fit while holding the DIY arm on quality on **0 of 8 briefs**,
against a rule needing a clear majority, and the predeclared consequence retired custom AI
generation from this roadmap. That verdict is not being rewritten, and §2 itself is deliberately
left unedited - a plan revised after its own gate answers can no longer be read back against what
it promised.

**The owner reopened it on 2026-08-15.** What changed the answer is evidence, not appetite:

- **Every failure the ballot named was the MARK, and it hit the hand-branded DIY arm too** (§2.2) -
  white ink on a white package, a mark too small beside the name, a backing too big for the text
  in it. A defect both branded arms share is the PLATFORM's, not the model's. Both fixes are now
  built and merged: the mark-legibility gate (`src/validation/markLegibility.ts`, transparent ink
  only) and the mark-SIZE rule (`src/templates/shared/logoSlot.ts`, the strap spends width).
- **Pro's first real hosted generation says the same thing from the other side**
  (`docs/NOACG_PRO_PLAN.md` §16, 2026-08-15). The generation was unusable - but *the panel the
  model designed was good*, and what wrecked the frame was the platform's reconstruction of it.
  Two independent rounds now put the failure in the platform.
- **Students need this in about two weeks**, which is why the question is being answered again
  rather than left closed.

**The bar, owner-chosen: the SAME §2 gate, re-run unchanged.** Same three arms (template, DIY,
Lite), same predeclared pass rule - the Lite arm clearly beats the template arm on brand fit AND is
at least equal to the DIY arm on quality, on a clear majority of briefs, with zero brand-fidelity
defects among accepted results - and the same operationalization already written down in §2.1
("clearly beats" = strictly higher brand fit; "at least equal" = quality no lower; "clear majority"
= more than half the fully judged briefs; "accepted" = would air as-is or after minor edits). The
re-run happens **once the two 2026-08-15 slices running alongside this decision have landed**, so
the round films what the product actually does after them:

  - **a Pro graphic whose baked text could not be erased is BLOCKED** rather than reported usable.
    The compiler already recorded the refusal in a warnings string nothing read, which is how §16's
    unusable generation carried an empty `validation_rule_codes` and a `usable` ledger row; the
    refusal becomes a structured blocking finding that every path - browser, offline stub,
    benchmark - scores through one seam.
  - **Pro Phase A - the platform takes the panel** (`docs/NOACG_PRO_PLAN.md` §15.5). The platform
    owns each graphic type's structure and spacing; the model supplies the design LANGUAGE as
    parameters (palette, type scale and weight, shape and corner language, accent form, density,
    motion character). `applyLogoSlot` and `fillBrandMark` generalised from the mark to the whole
    composition, which kills the remaining layout failures by construction rather than by
    inspection.

**A second FAIL means the retirement stands** - the gate does not get a third reading.

**Nobody should treat the re-run as expensive.** The rig exists: `scripts/ai-lite-value-gate.mjs`
builds the arms, the blind sheet and the verdict, and `--verdict <ballot.jsonl>` applies the rule
above and prints PASS or FAIL with the per-brief rows. The 2026-08-14 Lite arm cost **$0.0069 for
8 cells**; the template and DIY arms are `variant.create()` and cost nothing. The expensive part is
the owner's eyes, and that is the part that decides.

- [ ] **Lite: make it good, then re-run its gate. The price is already solved.** The target was 100
      generations per euro (~€0.01 each); the 2026-08-08 round measures **$0.00032 per generation**
      - thirty times under that ceiling, and unmoved by the transport change
      (`benchmarks/lite/ROUND-2026-08-08-GATEWAY.md`). Route choice is a QUALITY decision, not a
      budget one. What is open is the half that was never about money: machine-valid is not the
      same as good, and the 2026-08-14 ballot said so out loud. Cheap models cannot design a
      broadcast graphic unaided - a measured finding - so Lite never asks them to; the catalog is
      the crutch AND the moat, through adapt-first (`docs/ADAPT_FIRST_PLAN.md`). **This is the gate
      for every other AI goal** - one good graphic must be reliable before anything multiplies it -
      and "good" now has one definition: passing the §2 re-run described above. Two ballot notes
      are still unfixed and belong in the build the re-run films: a rule/underline crossing the
      name on two designs, and a title with no contrast on a light package.
- [ ] **Pro: the design-language tier** (`docs/NOACG_PRO_PLAN.md`). Both earlier premises are
      retired on evidence: reconstruction (§16) and the free-form coder (§21 - four checkpoints
      one-shot ~30% airable against Phase A's 14/15). What runs is Phase A: one text call buys a
      design LANGUAGE, the platform composes the package. Open, in order: the two-round set read
      (`benchmarks/pro/evidence/two-rounds-sets-blind.html`) that pins Pro's route; validating
      the fail-closed custom lane (seven §22.1 gate leaks closed, re-read 21/21 - one clean
      round justifies a validation round, not a ship); the topic card's read into the package.
      Every paid round stays spend-capped and approved separately.
- [ ] **A generated graphic can carry its own STATE MACHINE.** Every tier, not Pro. The platform has
      the engine, the node editor, the control pages and the hosted log - and **no generation path
      asks a model for a machine** (the only mention in `src/ai` is Lite's refusal code). A
      generated clock+scoreboard got six correct fields and zero operator events: its clock engine
      is unreachable, and the dispatcher it invented was silently overridden by the platform's own.
      Prompting cannot fix it - every emit converts through `importAnimData`, which drops a machine
      by construction. The fix is a structured MACHINE stage spliced in deterministically, the way
      `designSpec` works. **The gap between "make a graphic" and "run a show".**
- [ ] **Extreme: frontier models + the subscription that funds them.** After there are users.
      Standing rule until there is income: a NoaCG-funded route must be a CHEAP model on the
      managed transport - Vercel AI Gateway since 2026-08-07, not OpenRouter. The constraint is
      cost, not brand: a frontier model served through that transport is an ordinary fundable
      route once it is affordable; the four DIRECT provider APIs need the user's own key.
- [ ] **A school account earns more AI.** A verified address on a configured school domain
      (`@arcada.fi` first) raises the allowance. No new concept needed: a domain match issues a
      **grant**, which already outranks the plan and carries its own reason and expiry
      (`src/entitlements/contract.ts`). The first honest reason to sign in that is not a paywall.

### Kits, not one graphic at a time
Nobody making a show wants to create graphics one by one. Say which graphics the programme needs,
get all of them in **one unified look**, landing together in one production.

*Catalog kits from the wizard landed 2026-08-08 - one door, a user-editable set, and one look
across it; the full entry is in the archive.*

- [ ] **AI kits** - the same door, with Lite generating the set. **Blocked until Lite passes the
      §2 re-run** (above): it multiplies whatever one generation is worth, so it cannot start while
      that is still the open question.

---

## THEN - the custom road (ordered, unscheduled)

Only after the north star is true for real users. Each step is a direct competitive answer.

1. [ ] **WYSIWYG canvas** - back to the editor: drag, place and restyle your own graphics
       visually, with code still the source of truth underneath. `docs/WYSIWYG_PLAN.md`.
2. [ ] **The node editor as a first-class surface** - state machines and logic drawn as a graph:
       which graphic goes where, on what event, under what guard. The engine and the graph editor
       already exist (`docs/STATE_MACHINE_SCHEMA.md`, `MachineGraph`); what is missing is making
       it a surface a non-programmer uses on purpose. **This is where we meet Loopic head-on, and
       where interactive graphics put us against Rive.**
3. [ ] **Singular.Live class** - professional, deeply customizable graphics for anything: live
       data, automation, multi-operator shows. The last frontier, and the reason the data hub and
       the export platform are built the way they are.

---

## Parking lot

Real work, deliberately not now. Each has a plan doc; none is current until it is pulled up.

- **Cloud playout stages 2-4** (`docs/CLOUD_PLAYOUT.md`): published/draft versions + rollback,
  operator sharing, rate caps; the **NoaCG Data Hub** (connectors writing `update` rows into the
  same command log - a CSV sheet driving a ticker, then a real provider); professional automation
  (real-time streams, sports/timing feeds, the local Bridge, public API, Companion/Stream Deck,
  redundant renderers). Stage 3 is the same goal as the old "data-driven/live content" line.
- ~~Migration 0034 is not yet applied to production~~ - **it is** (checked against the live project
  2026-08-08: the ledger carries 0001-0036, and `control_live_cue_set` was CALLED, not merely
  found - a format-1 row migrates into `{v:2, layers:{…}}` keeping both layers, which is the
  behaviour the shape alone would not have proved). This line was stale; the multi-layer wire half
  is not blocked.
- **Adapt-first paid proofs** (`docs/ADAPT_FIRST_PLAN.md` §6.2/§6.3): shortlist-beats-digest, and
  folding Lite onto the platform placement rule. Both need explicit spend approval.
- **Managed funded AI tier** - quotas, credit weighting, an Auto route. Belongs with Extreme.
- **Payments/subscriptions** - long beta first; separate private repo, Stripe, metered generations.
- **Nightly auto-generated graphics library** (`docs/NIGHTLY_AUTOMATION_PLAN.md`) - committed
  direction, unscheduled.
- **Audience page per-show customisation** and **automatic chat ingestion from YouTube/Twitch into
  the audience plane** (`docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Backlog for the audience plane") -
  both owner-requested on 2026-08-08, both deliberately not started while the plain join page is
  still being accepted. Each is a capability-disclosure or an architecture decision wearing a
  feature's clothes; the doc says which.
- **Video/animation projects** - the parallel Beta shell stays where it is until the north star
  lands.
- **The dedicated preview channel, Home polish** - postponed by the student release, still
  wanted. (Google Fonts import LANDED on 2026-08-16 and moved to `GOALS_ARCHIVE.md`.)

---

## Quality bar (always-on)

- `npm run build` green - the CI gate (typecheck, lint, workflow and instruction checks).
- Every new user-facing flow ships with a Playwright spec **and its entry in the affected-mapper**
  in the same commit, or it only ever runs at night.
- Catalog changes run their gates: `l3-sweep`, `type-floor`, `overflow-sweep`, `field-coverage`,
  `numerals`, `engine-floor`, and the calibration tripwire. The nightly runs them unconditionally.
- Observable behaviour is never called done on a green build alone - it is verified in a browser.
