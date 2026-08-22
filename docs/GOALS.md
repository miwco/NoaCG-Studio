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
>
> And when the catalog does not have what the show needs: **draw your own graphic, give it the
> behaviour the show needs, and play that out the same way** - still without code.

That URL is the product. Everything else serves it: the wizard exists to fill it, the catalog
exists to make it look paid-for, the export adapters exist so it reaches any playout machine, the
control layer exists so a person can drive it live.

**The core question - what NoaCG is actually trying to solve** (owner, 2026-08-22). Drawing a
graphic without code is the easier half; the hard half is **giving it LOGIC, and then CHANGING that
logic**, without code. A quiz that locks an answer and then reveals it is one set of rules - and the
next producer wants no lock at all, just an immediate reveal. Two surfaces have been tried at this
and neither landed as a way a non-programmer authors logic: the **canvas editor** and the **node
editor**. The question stays open, it gets attacked from several angles rather than one, and it has
no hard date. It is also the thing that decides whether NoaCG is usable by productions bigger than
one school, so nothing here is a side quest.

The first-named user is a **student or non-technical operator** who runs a real production without
ever seeing code; organizations, channels, streamers and universities follow. A **professional**
keeps full control through **Advanced mode** - the editor, one toggle away, never required. The
generated HTML/CSS/JS is the single source of truth and stays clean and readable; looking at it is
optional. Used in teaching, but it is a production tool, not a code tutorial.

**The binding deadline: students run a real production with their OWN graphics by 2026-09-12.**
Work that does not serve that date is not current work.

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
Many environments - **SPX, CasparCG, OBS, vMix, OGraf**, more over time. SPX is the canonical
*internal* format and the strictest validation target **today**; every other target is an adapter
off that same source, so breadth costs no rework. Breadth across the live stack, plus automation and
remote control, is the long-term differentiator. **The long-run direction is OGraf-first** - see
"NEXT - OGraf-first, not SPX-first"; nothing about the contract moves until that is costed.

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
  self-host, export the files anywhere, a catalog and AI they don't have. **Researched properly
  2026-08-22: `docs/COMPETITOR_MXMZ.md`.** The headline: nothing public shows them authoring LOGIC
  at all - they train the designer for a day on a keyframe timeline, keep the OPERATOR as the
  non-technical one, and hand-build a control panel per sport. Attachable behaviours are the gap
  their architecture has no place to put.

---

## NOW - students make their OWN graphics, and play them out

**The student release closed 2026-08-22.** The owner ran it on the school's hardware and accepted
the player system - *"I have tried the hardware, and we have a player system that we can use. So
that goal is now reached."* Steps 1-11, the deadline they carried and the acceptance history are in
[`GOALS_ARCHIVE.md`](GOALS_ARCHIVE.md), "The student release (closed 2026-08-22)". Student accounts
are settled too: students make their own, and nothing is owed there.

**The goal that replaces it, owner 2026-08-22:**

> A student draws **their own graphic** - any graphic, not a lower third - gives it **the behaviour
> their show needs**, and plays it out from the dashboard. **Without writing a line of code.**

**The date is 2026-09-12**, three weeks out, and it is a real production with real students on it
rather than a rehearsal. Two graphics decide it, because they are what the class actually runs: a
**QUIZ** with the lock-answer / reveal-answer behaviour the platform already has, and a
**SCOREBOARD** with score + / score -. **The student draws the graphic; we supply the behaviour.**
Both behaviours exist in shipped catalog templates today - what does not exist is a way to put them
on a graphic somebody else drew.

- [ ] **1. Prove the SVG road, with eyes on it.** SVG import v1 is merged
      (`docs/SVG_IMPORT_PLAN.md`) and **nobody has walked it**: a layered Illustrator/Figma SVG in,
      text layers auto-detected as bindable fields, map, preview, create, and the exact graphic is
      an ordinary NoaCG template that exports and airs. The owner walks it first, because whether
      the workflow is CLEAR is the half no test can answer. Everything below assumes it holds.
- [ ] **2. Attach BEHAVIOUR to a graphic somebody else drew.** The open question of the three
      weeks, and the one with no design yet. The engine is there - a graphic is data fields plus
      parallel state groups in one `NOACG_ANIM` block, events are structural, control pages are
      generated from the machine (`docs/STATE_MACHINE_SCHEMA.md`, `docs/CONTROL_LAYER.md`) - and an
      imported SVG arrives with fields and no machine. So the question is narrow and answerable:
      **how does a student pick "this is a quiz" and get the quiz behaviour bound to their own
      artwork?** A named behaviour applied to a graphic (the graphic-type registry already models
      "a machine this type needs", `docs/GRAPHIC_TYPES.md`) is the shape to try first. Write the
      plan doc before writing code.
- [ ] **3. The two graphics, walked as a student would.** Draw a quiz and a scoreboard in
      Illustrator, import, bind, attach the behaviour, put both in one production, and run them
      from the dashboard - lock, reveal, +1, -1 - with the operator never seeing code. That walk is
      the acceptance test for the whole goal, and it is the rehearsal for 2026-09-12.

**Deliberately NOT in the three weeks: CUSTOMIZING that behaviour.** Owner, 2026-08-22 - *"what if
I don't want to be able to lock it? I just want to reveal it immediately."* Same question one level
up, soft deadline, and the north star note above says why it is the one that matters most. For the
class, our behaviour used as-is is enough.

### The playout dashboard

The binding design is `docs/PLAYOUT_DASHBOARD.md`; the three surfaces that render it must not drift
(`docs/CONTROL_PANEL_PARITY.md`). **Owner, 2026-08-22: the dashboard is accepted as it stands** -
*"looks good for right now… the buttons on the right are totally fine."* The vertical-budget re-lay
specified after the 2026-08-21 read (verb bar into the column beside PROGRAM, "what is left"
instead of the flat `26vh` monitor cap) is therefore **not current work**; it stays written down in
`docs/PLAYOUT_DASHBOARD.md` §2 for when a real window makes it hurt again.

- [ ] **Drop the Preview verb.** Owner, 2026-08-22: *"Preview does not seem to have a function."*
      The code agrees - the `preview` verb runs `selectCue(selectedCue.id)` on the cue that is
      already selected, so it is a no-op by construction, because **selection IS the preview
      gesture** (§2). Remove the button and the `P` key from all three surfaces and the keymap.
- [ ] **Re-take has to justify its place, and the owner should decide knowing why it exists.**
      Owner: *"why can't you just press take again?"* Because TAKE is a TOGGLE (owner decision,
      2026-08-06): pressing it on a live cue takes it OFF. Re-take is how the NEXT row goes onto a
      layer that is already up - load the row, `R` - **which is exactly how the quiz bank walks**,
      so it is load-bearing for the goal above. If the toggle changes, this changes with it.
- [ ] **OPEN, and the owner's to answer: does SPACE go to preview first?** *"You press space to
      take it to the preview, and then press it again for it to go to the program."* It would
      replace the selection-is-preview rule and re-open what TAKE means, so it is a change to §2
      rather than a button. Either way the owner has ruled that **it is the same button** - no
      separate Preview control returns.

---

## NEXT - OGraf-first, not SPX-first

**Owner direction, 2026-08-22.** Yle is part of the EBU and is our closest partner, so the long-run
position is that **NoaCG is an OGraf player and OGraf is the first-class format** - SPX becomes one
system among many rather than the centre. **Nothing changes today**: OGraf export already conforms
(`docs/OGRAF.md`, externally validated), SPX stays the canonical internal format and the strictest
validation gate, and flipping that is a rework nobody has costed. What is owed first is
understanding: how the OGraf ecosystem actually works and what "OGraf-first" would mean for the
template contract, written down before any code moves.

**The Yle thread, same date.** Demo day already happened; the owner re-contacts in a few weeks, and
in roughly a month Yle would try NoaCG inside one of their own productions. **Nothing is owed
now.** The one thing to expect: the Yle building runs a strict network, so the first real question
will be which ports and hosts it blocks - answer that when they report it, do not design for it in
advance.


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

Lite's value gate FAILED on the owner's blind ballot on 2026-08-14, and the owner reopened it the
next day on evidence rather than appetite: every failure the ballot named was **the MARK**, and it
hit the hand-branded DIY arm too, so the defect was the platform's and not the model's - a reading
Pro's first hosted generation independently confirmed. Both platform fixes are merged (the
mark-legibility gate and the mark-size rule). **The full argument, the verdict it overturned and the
operationalized pass rule live in `docs/AI_LITE_BRAND_PLAN.md` §2/§2.1/§2.2** and are deliberately
not restated here.

What binds:

- **The bar is that SAME §2 gate, re-run unchanged** - same three arms (template, DIY, Lite), same
  predeclared rule, re-run once the two 2026-08-15 slices have landed (blocking a Pro graphic whose
  baked text cannot be erased, and Pro Phase A where the platform takes the panel).
- **A second FAIL means the retirement stands.** The gate does not get a third reading.
- **The re-run is not expensive.** `scripts/ai-lite-value-gate.mjs` builds the arms, the blind sheet
  and the verdict; the 2026-08-14 Lite arm cost **$0.0069 for 8 cells** and the other two arms are
  `variant.create()` and cost nothing. The expensive part is the owner's eyes.


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

0. [ ] **TEAMS - several people holding ONE production.** Owner, 2026-08-21: *"someone can edit
       the spreadsheet, someone can steer the queue, someone can attach an API… if we have many
       students working on one project, it's never just one person doing this all."* This is a
       class requirement rather than a nicety: the whole teaching case is a group running a show
       together. The capability model already splits WHAT a person may do - control, output, join
       and presenter are four separate URLs - and has no concept of WHO, so two students cannot
       hold the same production under their own accounts. Backend, entitlements and a migration;
       numbered 0 because it is the one item here the deadline case actually leans on.

1. [ ] **WYSIWYG canvas** - back to the editor: drag, place and restyle your own graphics
       visually, with code still the source of truth underneath. `docs/WYSIWYG_PLAN.md`.
       **Tried once and it did not land** (owner, 2026-08-22), so a second attempt starts by
       saying what was wrong with the first rather than rebuilding it.
2. [ ] **The node editor as a first-class surface** - state machines and logic drawn as a graph:
       which graphic goes where, on what event, under what guard. The engine and the graph editor
       already exist (`docs/STATE_MACHINE_SCHEMA.md`, `MachineGraph`); what is missing is making
       it a surface a non-programmer uses on purpose. **This is where we meet Loopic head-on, and
       where interactive graphics put us against Rive.** **Also tried once, also did not land as a
       way to AUTHOR logic** (owner, 2026-08-22). Items 1 and 2 are the two attempts the north
       star's core question refers to: neither is the answer yet, and the answer is not assumed to
       be a third editor - the question gets attacked from several angles.
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
- **The live suite runs against the real project before a class, and again after any change to
  publish, output or the topbar.** It only ever runs by hand, so nothing reports the rot it finds -
  the 2026-08-08 run went 7 of 18 before repair and caught a topbar overflow that hung the account
  avatar off the screen edge at 1366px. Carried over from the student release, which is closed.
