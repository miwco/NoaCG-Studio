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
Many environments - **SPX, CasparCG, OBS, vMix, OGraf**, more over time - each an adapter off one
source, so breadth costs no rework. SPX is the canonical internal format and the strictest gate
**today**; the long-run direction is OGraf-first (below), and nothing moves until that is costed.

### Operating principles
- **Free forever for the core.** Creating, editing, exporting, controlling, self-hosting. No
  paywall on the workflow, ever.
- **One paid surface, later: hosted AI** for users who will not bring their own key (real compute
  cost). **Bring-your-own-key is always free.**
- **Users, not revenue.** Money is a later consequence of a large, happy user base.
- **No sign-in for its own sake.** An account is asked for only where it *buys* something: saved
  graphics and productions across devices, the persistent cloud output URL, hosted AI allowance.

### Who we are replacing

Four products, and what each obliges us to build - their proven capabilities are our requirements
list.

- **Rive** - designer-first interactive animation with real state-machine logic. State-driven
  behaviour is what a live graphic fundamentally IS, so Rive sets the bar for our machine and node
  editor.
- **Singular.live** - cloud graphics, browser control room, their playout reaching air. They do
  most of what we intend, so our gap to open is **breadth** over equivalent cloud playout.
- **Loopic** - HTML broadcast graphics, closest positioning to ours. Its timeline and canvas
  editing are what Advanced mode has to beat.
- **MXMZ** (mxmz.com - named by Yle as the working model; researched 2026-08-22 in
  `docs/COMPETITOR_MXMZ.md`) - they prove the "your own SVG, playable" workflow at broadcast
  scale, so our SVG import has to match it: every layer auto-exposed, no renaming ritual. We beat
  them on what they lock away (free-forever, self-host, export anywhere, a catalog and AI) and on
  the gap their architecture has no place to put: **nothing public shows them authoring LOGIC at
  all** - a designer trained for a day on a keyframe timeline, and a control panel hand-built per
  sport.

---

## NOW - students make their OWN graphics, and play them out

**The student release closed 2026-08-22** on the owner's hardware run - *"we have a player system
that we can use."* Steps 1-11 and the acceptance history are in
[`GOALS_ARCHIVE.md`](GOALS_ARCHIVE.md). Student accounts are settled: students make their own.

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
- [ ] **2. Attach BEHAVIOUR to a graphic somebody else drew.** The question was how a student
      picks "this is a quiz" and gets that behaviour bound to their own artwork, when an imported
      SVG arrives with fields and no machine. **Both cases now work** - walked in a browser, pinned
      by `e2e/import-svg-behaviour.spec.ts` (2026-08-22), designed in
      `docs/GRAPHIC_BEHAVIOUR_PLAN.md` §10, shipped detail in the archive. **What is left is the
      OWNER WALK**, which is what decides whether a student can find any of it.
- [ ] **3. The two graphics, walked as a student would.** Draw a quiz and a scoreboard in
      Illustrator, import, bind, attach the behaviour, put both in one production, and run them
      from the dashboard - lock, reveal, +1, -1 - with the operator never seeing code. That walk is
      the acceptance test for the whole goal, and it is the rehearsal for 2026-09-12.

**From the owner's walk of the SVG road, 2026-08-25.** The canvas itself was accepted outright -
*"I like that it's only one canvas... It works great"* - and everything below is about the WORDS
around it. The full verbatim feedback is in the two `docs/acceptance/owner-queue/` items.

- [x] **4. ONE LINE PER THING, and an ⓘ for the rest.** *"There's kind of a lot of text in this
      fields page. I would like that there will be less text and it would be so intuitive so you
      don't have to read that much."* The rule he stated: **everything automatically visible is ONE
      LINE**, and anything more sits behind a small eye/ⓘ per section that also says *why this
      section is here at all* - the quiz behaviour block reads as random without it. This is the
      mapping step's information design, not a copy trim, and the same rule applies to every wizard
      step. A documentation page is wanted eventually, with no illusions about it: *"no one wants
      to read documentation. They just want everything to work."*
      **Built 2026-08-26** (`SectionHead.tsx`): every mapping-step section, the Animation step
      and the Import Design step are one line + ⓘ carrying the why; Finish/Entry/Fields/Style
      already read one-line-per-thing. Not yet swept: the raster Prepare/Place steps and the AI
      step. Awaiting the owner's walk (owner-queue).
- [x] **5. "What travels with it" must explain itself, or not be asked.** The one thing on the walk
      he could not understand: *"my brain does not really understand how I choose what travels with
      it. What am I choosing?"* Two problems under it, and the second is the deeper one:
      - the picker offers **fields**, so clicking under a lower third only ever hits text layers -
        he asked, reasonably, whether he was meant to add all three fields, and what that would do;
      - he expects the ordinary case to need no question at all: *"of course that text should be
        able to become longer and the background should grow with it. I don't know why we need to
        choose them."* The declared set exists because geometry cannot tell a strap pinned to the
        frame from a caption that should move (`docs/SVG_IMPORT_PLAN.md` §6c) - but if the common
        case has to be authored by hand, **the default is wrong, not the reader**. Make the
        ordinary lower third work with nothing chosen, and ask only where it is genuinely ambiguous.
      His bar, worth quoting on any surface: *"If I can't automatically understand what it is, it's
      probably not good enough yet."*
      **Built 2026-08-26** (docs/SVG_IMPORT_PLAN.md §3): the ordinary lower third defaults to
      GROW, measured off the artwork (containment + arrangement, never size-against-frame); a
      scorebug, quiz or full-frame backplate keeps shrink; the follower list renders only where
      something would actually move, and named groups joined the canvas picker so "pick what
      travels" can reach a layer. E2E-pinned both ways; awaiting the owner's walk (owner-queue).
- [x] **6. SPEED must visibly change the preview, or not be a control.** The animations and the
      easing list are accepted and liked - *"I think they look good. Nice job... for once I can see
      a difference with the easing"* - but **Speed does nothing visible on most presets**: *"if it
      doesn't work in the preview, it will not impress the customer... Even if it would work in real
      life, it's as bad."* His own hypothesis to test first: speed may only show once an EASE is on
      (slide + bounce is where he could see it), which would mean Speed silently does nothing at the
      default. The standing rule he restated: **"we can't show buttons if they're not working."**
      **Measured 2026-08-26** (his hypothesis tested, verdict in the owner-queue item): the knob
      always reached the data - a universal-bank entrance genuinely ran 1.07 / 0.80 / 0.53 s -
      so nothing was broken; a ±33% step compared from memory across two replays is simply below
      the noticing threshold on a smooth curve, and bounce reads because its RHYTHM changes, not
      its duration. The buttons now write 0.6 / 1 / 1.8 (≈1.33 / 0.80 / 0.44 s on the same
      entrance), on every surface that offers the knob. Awaiting the owner's eyes (owner-queue).

**Deliberately NOT in the three weeks: CUSTOMIZING that behaviour.** Owner, 2026-08-22 - *"what if
I don't want to be able to lock it? I just want to reveal it immediately."* Same question one level
up, soft deadline, and the north star note above says why it is the one that matters most. For the
class, our behaviour used as-is is enough.

### The playout dashboard

The binding design is `docs/PLAYOUT_DASHBOARD.md`; the three surfaces that render it must not drift
(`docs/CONTROL_PANEL_PARITY.md`). **Accepted as it stands, owner 2026-08-22** (archive); the
vertical-budget re-lay is deferred, not dropped - `docs/PLAYOUT_DASHBOARD.md` §2. One amendment
since: the verb block must stay **two columns wide with TAKE spanning them, at every window size** -
*"it can't just be one small column that you can miss"* - so a tall window spends its spare height
on the buttons, never by collapsing them into one narrow stack.

- [x] **Drop the Preview verb.** Done on `claude/playout-dashboard-cue-editor-beccdf`, but on TWO
      surfaces, not three. On the in-app and hosted pages the verb ran `selectCue` on the cue
      already selected - a no-op, because **selection IS the preview gesture** (§2); button and
      `P` key are gone from both and from the keymap. The EXPORTED controller keeps its
      `→ Preview`: there it is not a no-op but `takeTo('preview')`, a real second output stream
      (`docs/CONTROL_LAYER.md` - Preview and Take are one command list a `stream` apart).
- [ ] **Re-take has to justify its place, and the owner should decide knowing why it exists.**
      Owner: *"why can't you just press take again?"* Because TAKE is a TOGGLE (owner decision,
      2026-08-06): pressing it on a live cue takes it OFF. Re-take is how the NEXT row goes onto a
      layer that is already up - load the row, `R` - **which is exactly how the quiz bank walks**,
      so it is load-bearing for the goal above. If the toggle changes, this changes with it.
      That explanation was given on 2026-08-22 and the owner did not ask for its removal; the
      box stays open because only they can close it.
- [ ] **OPEN, and the owner's to answer: does SPACE go to preview first?** *"You press space to
      take it to the preview, and then press it again for it to go to the program."* It would
      replace the selection-is-preview rule and re-open what TAKE means, so it is a change to §2
      rather than a button. Either way the owner has ruled that **it is the same button** - no
      separate Preview control returns.

---

## NEXT - OGraf-first, not SPX-first

**Owner direction, 2026-08-22.** Yle is EBU and our closest partner, so the long-run position is
that **NoaCG is an OGraf player and OGraf is the first-class format** - SPX becomes one system
among many rather than the centre. **Nothing changes today**: OGraf export already conforms
(`docs/OGRAF.md`, externally validated), SPX stays the canonical internal format and the strictest
gate, and flipping that is a rework nobody has costed. What is owed first is understanding - how
the ecosystem works, what "OGraf-first" costs the template contract - written before code moves.

**The Yle thread, same date. Nothing is owed now**: demo day happened, the owner re-contacts in a
few weeks, and in roughly a month Yle would try NoaCG inside one of their own productions. Expect
one question - their building runs a strict network, so which ports and hosts it blocks. Answer
that when they report it; do not design for it in advance.


## NEXT - coding agents make NoaCG graphics (the agent door)

**Shipped 2026-08-22** (`docs/AGENT_CLI.md`, `docs/AGENT_SAVE.md`; the archive entry has the
detail): a user's Claude Code, Codex or any MCP client designs a graphic the way it works best and
NoaCG is the BRIDGE - the contract, the tools (`noacg` CLI + MCP server, the `/bridge` page), the
validation and the destination (`noacg save` into the library with a scoped key). The workspace is
one folder that is an OGraf package and the SPX package; the skill is contract-only by default.

*The measured round ran 2026-08-22 and was blind-read and decided 2026-08-23
(`benchmarks/agent/rounds/2026-08-22/VERDICT.md`): all 25 cells airable, arms visually
indistinguishable, the skill stays contract-only with free authoring as the default, and
"actions come from a type" is the one sharpened rule.*

- [ ] **Publish** - `npm publish` of `noacg`, the marketplace entry live. Owner's call.
- [ ] **Agent-authored machines - the owner gate is now armed.** All five novel-brief cells
      authored a working machine from scratch (operator buttons, zero category code, validator
      clean). Decide whether the skill blesses an authored machine when no type fits, and what
      extra validation that path needs.
- [ ] **What the funded tiers can borrow** - diff the round's winning cells against Lite/Pro on
      the same briefs; which closed-loop fixes can the platform enforce deterministically.
- **Future, so the directions are not forgotten:** arbitrary graphic backends (graphic-authored
  actions + machines, validated; the control layer already renders any explicit machine);
  OGraf-native graphics in the library (package hosting + an OGraf host in preview/output);
  `/output` as an OGraf renderer (Server API, stable 2026-08-13); `noacg add --production`
  (`productions:attach`); live playout as its own consented permission; remote MCP on the site
  over Supabase OAuth 2.1; a design-agent ecosystem (the look pluggable, the contract NoaCG's);
  `--replace <id>`, Realtime on `documents`, `noacg export <target>`, a browserless `types`,
  keychain storage, a sandboxed bench iframe.

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

Lite's value gate FAILED on the owner's blind ballot 2026-08-14 and was reopened the next day on
evidence: every failure it named was **the MARK**, and it hit the hand-branded arm too, so the
defect was the platform's. The argument is in the archive; the rule it operationalizes is
`docs/AI_LITE_BRAND_PLAN.md` §2/§2.1/§2.2. What binds:

- **The bar is that SAME §2 gate, re-run unchanged** - same three arms (template, DIY, Lite), same
  predeclared rule, re-run once the two 2026-08-15 slices have landed (blocking a Pro graphic whose
  baked text cannot be erased, and Pro Phase A where the platform takes the panel).
- **A second FAIL means the retirement stands.** The gate does not get a third reading.
- **The re-run is cheap** - `$0.0069` of model spend; the expensive part is the owner's eyes.


- [ ] **Lite: make it good, then re-run its gate. The price is already solved** - **$0.00032 per
      generation** measured 2026-08-08, thirty times under the ceiling and unmoved by the transport
      change, so route choice is a QUALITY decision, not a budget one. What is open was never about
      money: machine-valid is not good, and the 2026-08-14 ballot said so. Cheap models cannot
      design a broadcast graphic unaided, so Lite never asks them to - the catalog is the crutch
      AND the moat (`docs/ADAPT_FIRST_PLAN.md`). **This is the gate for every other AI goal**, and
      "good" has one definition: passing the §2 re-run above. Two ballot notes are still unfixed
      and belong in the build the re-run films - a rule/underline crossing the name on two designs,
      and a title with no contrast on a light package.
- [ ] **Pro: the design-language tier** (`docs/NOACG_PRO_PLAN.md`). Both earlier premises are
      retired on evidence: reconstruction (§16) and the free-form coder (§21 - four checkpoints
      one-shot ~30% airable against Phase A's 14/15). What runs is Phase A: one text call buys a
      design LANGUAGE, the platform composes the package. Open, in order: the two-round set read
      (`benchmarks/pro/evidence/two-rounds-sets-blind.html`) that pins Pro's route; validating
      the fail-closed custom lane (seven §22.1 gate leaks closed, re-read 21/21 - one clean
      round justifies a validation round, not a ship); the topic card's read into the package.
      Every paid round stays spend-capped and approved separately.
- [ ] **A generated graphic can carry its own STATE MACHINE.** Every tier, not Pro. The platform
      has the engine, the node editor, the control pages and the hosted log - and **no generation
      path asks a model for a machine**. A generated clock+scoreboard got six correct fields and
      zero operator events: its clock engine unreachable, its invented dispatcher silently
      overridden. Prompting cannot fix it - every emit converts through `importAnimData`, which
      drops a machine by construction. The fix is a structured MACHINE stage spliced in
      deterministically, the way `designSpec` works. **The gap between "make a graphic" and "run a
      show".**
- [ ] **Extreme: frontier models + the subscription that funds them.** After there are users.
      Standing rule until there is income: a NoaCG-funded route must be a CHEAP model on the
      managed transport (Vercel AI Gateway, not OpenRouter). The constraint is cost, not brand -
      a frontier model on that transport is fundable once it is affordable; the four DIRECT
      provider APIs need the user's own key.
- [ ] **A school account earns more AI.** A verified address on a configured school domain
      (`@arcada.fi` first) issues a **grant**, which already outranks the plan and carries its own
      reason and expiry (`src/entitlements/contract.ts`) - no new concept needed. The first honest
      reason to sign in that is not a paywall.

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

0. [ ] **TEAMS - several people holding ONE production.** Owner, 2026-08-21: *"if we have many
       students working on one project, it's never just one person doing this all."* A class
       requirement, not a nicety - the whole teaching case is a group running a show together. The
       capability model splits WHAT a person may do (control, output, join, presenter are four
       URLs) and has no concept of WHO, so two students cannot hold one production under their own
       accounts. Backend, entitlements and a migration; numbered 0 because the deadline case leans
       on it.
1. [ ] **WYSIWYG canvas** - drag, place and restyle visually, code still the source of truth
       (`docs/WYSIWYG_PLAN.md`). **Tried once and it did not land** (owner, 2026-08-22), so a
       second attempt starts by saying what was wrong with the first.
2. [ ] **The node editor as a first-class surface** - logic drawn as a graph: which graphic goes
       where, on what event, under what guard. The engine and the graph editor exist
       (`docs/STATE_MACHINE_SCHEMA.md`, `MachineGraph`); what is missing is a surface a
       non-programmer uses on purpose. **Where we meet Loopic head-on and Rive on interactivity.**
       **Also tried once, also did not land as a way to AUTHOR logic.** Items 1 and 2 are the two
       attempts the north star's core question refers to - the answer is not assumed to be a third
       editor.
3. [ ] **Singular.Live class** - professional, deeply customizable graphics: live data, automation,
       multi-operator shows. The last frontier, and why the data hub and export platform are built
       the way they are.

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
- **Audience page per-show customisation** and **chat ingestion from YouTube/Twitch into the
  audience plane** (`docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Backlog for the audience plane") - both
  owner-requested 2026-08-08, both held while the plain join page is still being accepted. Each is
  a capability-disclosure or an architecture decision wearing a feature's clothes.
- **Account infrastructure before real students** (`docs/DEPLOYMENT.md`, "Auth email" and
  "Google sign-in") - two provisioning jobs, no code in either, both owner-only because they
  need accounts we hold rather than anything in this repo. **Custom SMTP**: the built-in
  Supabase sender is a testing facility capped at a handful of mails an hour, so
  password-reset delivery is unreliable until a real provider is attached; the SPF/DKIM
  verification is the part with weeks of lead time. **Google sign-in**: the code and the
  button already ship, and `[auth.external.google]` is wired - what is missing is a Google
  Cloud OAuth client and its credentials on the hosted project. The button is HIDDEN
  (`GOOGLE_SIGN_IN_ENABLED`) until then, so provisioning ends with flipping that flag. Owner
  asked for both 2026-08-24; step-by-step for each is written down, waiting to be executed.
- **Video/animation projects** - the parallel Beta shell stays where it is until the north star
  lands.
- **The dedicated preview channel, Home polish** - postponed by the student release, still wanted.

---

## Quality bar (always-on)

The full procedure is `docs/VERIFICATION.md`; what this file adds is the one bar nothing there
enforces.

- **The live suite runs against the real project before a class, and again after any change to
  publish, output or the topbar.** It only ever runs by hand, so nothing reports the rot it finds -
  the 2026-08-08 run went 7 of 18 before repair and caught a topbar overflow that hung the account
  avatar off the screen edge at 1366px. Carried over from the student release, which is closed.
