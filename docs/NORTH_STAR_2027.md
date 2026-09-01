# North Star 2027 - the credible platform, and the programme system that builds it

**Status: PROPOSAL (2026-09-01). Nothing here is authorized.** This document answers the owner's
2026-09-01 brief: audit the proposed one-year direction against the repository, correct it, and
design the governance that lets the orchestrator keep verified work moving through August 2027
without the owner's availability deciding whether development continues. Until the owner ratifies
it, `docs/GOALS.md` binds alone and nothing below may be started. The decisions the owner is being
asked to make are collected in §9.

---

## 1. The audit - where the brief and the repository disagree

The brief was reviewed against the tree, `docs/GOALS.md`, the ratified OGraf review, the
orchestrator contract, the verification machinery and GitHub. Corrections, in order of consequence:

1. **Issue #48 is not a plan.** It is a single prose brief (opened 2026-08-31, no checklist, no
   comments), and its ten pre-implementation questions were already answered and ratified two days
   earlier in `docs/OGRAF_FIRST_REVIEW.md` (owner, 2026-08-29, four amendments). The tracked OGraf
   ladder lives in `docs/GOALS.md` "NEXT - OGraf-first" - eight rungs, zero checked. The roadmap
   below adopts that ladder verbatim; nothing about OGraf is redesigned here. GitHub Issues are
   otherwise unused for feature work in this repo (every other issue is a bot-filed CI alert), so
   the canonical home for this roadmap is a doc, with #48 becoming a pointer (§8).
2. **Behaviour & Control is far more built than the brief assumes.** Shipped: the versioned state
   machine model with groups, events, timers and structural guards (`docs/STATE_MACHINE_SCHEMA.md`),
   the node editor (`MachineGraph` over pure mutators), one control generator rendering five
   operator surfaces (`docs/CONTROL_LAYER.md`), graphic types that declare machines, and
   behaviour-attach onto imported artwork (pinned by `e2e/import-svg-behaviour.spec.ts`). What is
   genuinely unsolved is exactly what `docs/GOALS.md` calls "the core question": a surface a
   non-programmer uses to AUTHOR and CHANGE logic. Both prior attempts (canvas editor, node editor)
   failed at that, and GOALS.md rules that "the answer is not assumed to be a third editor". The
   programme is therefore research-shaped at its heart, not build-shaped.
3. **One doctrine collision.** The brief lists "conditions" among behaviour capabilities;
   `docs/STATE_MACHINE_SCHEMA.md` rules "no expression language, ever" - guarding is structural.
   `data-condition` triggers exist, parse, and deliberately never fire. Enabling conditional logic
   is a change to a stated invariant and is reserved to the owner inside the Behaviour programme's
   design stage; it is not assumed by this roadmap.
4. **Teams matches owner intent and is genuinely absent.** Already THEN item 0 in GOALS.md
   ("several people holding ONE production", owner 2026-08-21, "numbered 0 because the deadline
   case leans on it"). No team/org/membership table exists in any of the 52 migrations; every RLS
   policy is `auth.uid() = user_id`; entitlements resolve for one uid; sync is last-write-wins with
   conflict copies. One nuance the brief misses: capability URLs already let several people
   OPERATE one production today - the gap is shared ownership and preparation under named accounts,
   and the acceptance claim in §5 is scoped to that.
5. **Production/Rundown/Media is half-built.** Cue rundown, layer stack, staged-vs-take, the
   persistent `/output` renderer, per-graphic boot recovery and stills all shipped. Absent: video
   and audio in productions, and timed/automated rundown advance. The designed path for clips
   (`docs/backlog/video-through-playout-wrapper.md`) is reference playout - NoaCG sends the file
   reference, CasparCG plays it; media never travels through the web. The owner has named clip
   playout the one reason he cannot use productions for his own shows - it is the highest-value
   small slice in the whole brief.
6. **"Playout infrastructure" mostly dissolves.** SDI/NDI output through CasparCG exists today
   (DeckLink consumer, native NDI); what is missing is hardware PROOF, which is already a standing
   owner-queue item. Own-renderer/desktop work stays parked on the 2026-08-16 ruling ("own the
   client and the agent, rent the engine forever"), with `docs/NATIVE_PLAYOUT_RESEARCH.md` as the
   dossier for the day it reopens. No separate programme is warranted; the proof work lands in
   Reliability and the OGraf ladder tail.
7. **The governance seed already exists and lacks only an artifact.** `.agent-workflows/`
   `orchestrator.md` "Big projects are phased" already grants ratify-once-then-run: the owner
   ratifies a concrete picture once, then phases chain without per-step checks. What is missing is
   any record of WHICH pictures are ratified, what stage each is at, and what evidence advances
   them - so the licence is currently unusable across sessions. §3 builds exactly that record and
   nothing else; the lifecycle the brief proposed collapses into it almost unchanged.
8. **The autonomy mechanics must not be the ones the brief implies.** The 24-hour unattended
   ceiling and "the report is the checkpoint - the loop can extend a wave, never extend itself"
   are load-bearing owner protections. They stay. Continuous work does not come from longer
   chains; it comes from every new wave finding legitimate next stages in the programme register.
   Each wave still reports daily; the alignment questionnaire remains the cheap after-the-fact
   veto. This satisfies "never idle because the owner is busy" without re-opening "the day that
   went happily in the wrong direction".
9. **The maturity model maps almost one-to-one onto existing machinery** (§4). The genuine holes,
   in priority order: multi-user tests against a real backend (zero `newContext` uses in
   `e2e/configured/`), a soak harness (nothing runs longer than ~45 minutes), property-based tests
   (absent; the machine mutators and the event queue are the natural first home), and a reusable
   fault-injection harness (the doctrine exists, the injections are per-spec and ad-hoc). True
   pixel regression is a smaller gap than the brief assumes - geometry/computed-style fingerprints
   already gate the catalog; extend the render-smoke pixel-read pattern only where geometry is
   blind (color, theming).
10. **Concurrency is machine-bound, not ambition-bound.** The laptop holds 3-4 sessions
    (~1 GB each), one browser-driving job, one orchestrator (soft rule after the 28-stranded-commit
    collision), and merge cost is the measured bottleneck. Two to three ACTIVE programmes beside
    the owner's NOW push is the realistic ceiling; eight is not.
11. **Prerequisite housekeeping.** GOALS.md stands at 419 lines against its own ~200 budget and
    the fix is already filed (`docs/backlog/goals-over-its-own-budget.md`). Slimming it (archive
    the landed prose, restate the budget once) should land before the register adds any lines to
    the planning surface.
12. **Two live sequencing facts the brief could not know.** Yle expects to try NoaCG inside one of
    their productions roughly a month out, and the owner ruled playout-before-any-outreach - so
    OGraf activates early (its design cost is already paid), not sixth. And the class that needs
    Teams is THIS autumn, so Teams design starts immediately even while implementation waits for
    the NOW date.

Everything else in the brief survives contact: the one-year scope, the reuse-not-rebuild posture,
agent addressability as an architectural requirement, MOS/NLE as kept-possible-not-built, and
"test the claim, not the implementation" - which the repo already practices (the catalog gates
measure the rendered graphic; the external OGraf renderer round found three defects our own gates
passed).

---

## 2. North Star 2027

The GOALS.md north star ("One link, live anywhere") stays word-for-word. This extends its horizon:

> **By August 2027, NoaCG is a credible open professional graphics and playout platform** - the
> serious alternative for organisations that want open, standards-based, customizable live
> graphics: broadcasters, schools, sports organisations, NGOs, streamers.
>
> A production team can create any live graphic - from NoaCG designs, imported artwork, AI, or
> code - edit it visually, animate it, give it arbitrary behaviour without programming, receive a
> generated control surface and customize it, build a rundown carrying graphics, stills, video and
> audio, connect live data, automate through APIs, work as a team, and play out through browser
> workflows, CasparCG, OGraf infrastructure and professional SDI/NDI paths - and trust it during a
> real broadcast, including crashes, reconnects and old versions.
>
> Coding agents are first-class users of every one of those capabilities: **one capability,
> multiple interfaces** - the visual UI, the CLI/MCP door, the public API and NoaCG's own AI all
> drive the same platform functions, never parallel implementations. The `/bridge` page already
> works this way; new capabilities keep the pattern.
>
> OGraf remains the canonical interchange and playout contract exactly as ratified; NoaCG never
> differentiates on the format - the moat is authored behaviour, the generated control layer, the
> agent door, the catalog, and free-forever/self-hostable. Mature engines (CasparCG, GStreamer,
> existing OGraf implementations) are rented, not rebuilt; local software exists only where a
> concrete requirement (SDI/NDI, large media) demands it. Replay/slow-motion/EVS-class work stays
> outside the year.

---

## 3. The programme system (governance)

**A programme is a ratified long-running body of work the orchestrator may advance without asking.**
The register `docs/PROGRAMMES.md` (created on ratification, §8) is the single artifact. It is
in-repo, versioned, never consumed - the durable cross-wave state that handoffs, wave-state files
and the backlog deliberately are not.

### States

| State | Meaning | Who moves it there |
|---|---|---|
| IDEA | Filed thought. Research allowed, implementation not. Lives in `docs/backlog/` as today; the register only lists it when promotion is plausible. | anyone |
| DESIGN | A plan doc is being written: goal, why, user journey, architectural fit, risks, test strategy, acceptance claims, stages. Research and design sessions allowed; product code not. | owner names the candidate; sessions do the design work |
| AUTHORIZED | The owner has ratified the plan doc's picture, with entry conditions if any ("after the NOW date", "after branch X lands"). The register row cites the ruling: date + receipt, same convention as GOALS.md carve-outs. | **owner only** |
| ACTIVE | Entry conditions met. The orchestrator may plan waves from the programme's stage list: implement, fix, consume handoffs, verify, advance stages - no per-step permission. | owner, or automatically when an AUTHORIZED programme's entry condition becomes true (the register row says which) |
| DELIVERED | Every acceptance claim has reached scenario-proven; owner walks may still be pending (walks never block, so they cannot gate this state either). | orchestrator, citing evidence |
| MAINTENANCE | Delivered, with reopen triggers armed: a red gate mapped to one of its claims, owner feedback naming its surface, or new evidence (a failed challenge scenario) reopens the relevant stage and the programme returns to ACTIVE. | automatic |

**Programmes never self-authorize.** Only the owner writes AUTHORIZED. A session may write a new
IDEA/DESIGN row; it may never promote one. The two harness-enforced hard edges (permission posture,
merge-safety verdicts) are untouched - "owner ratification does not reach it" stays true.

**Scope edges - what sends an ACTIVE programme back to the owner mid-flight.** Ratification covers
the plan doc's picture. Outside it, and named per-programme in the register: a new persisted format
or migration beyond the plan, a new public page/URL, real-money spend, an external account or
publication past `main`, a security-boundary change, and any change to a stated doctrine (the
no-expression-language rule, the free-core rule, client-neutrality). Everything inside the picture
- including reordering stages, adding a discovered stage of the same kind, and all defect work -
is the orchestrator's to do.

### What changes in the existing system, and what pointedly does not

- **`docs/GOALS.md` NOW/NEXT/THEN survives unchanged as the owner's push.** One sentence is added
  to its gate rule: a section governed by an ACTIVE programme in `docs/PROGRAMMES.md` is unparked
  to exactly the extent that register row states. This generalizes the carve-out mechanism the
  OGraf section already uses; the anti-raid purpose survives because only the owner activates.
- **The orchestrator fill order gains one rung**: owner feedback, then handoffs, then GOALS `## NOW`,
  **then the next stages of ACTIVE programmes**, then backlog items serving NOW. "Never invent work
  to fill a wave" survives - a register stage is not invented work. Grounding gains one cheap read
  (two greps over `docs/PROGRAMMES.md`, like the GOALS reads).
- **Untouched**: the 24-hour ceiling, "the report is the checkpoint", continuation bounds, the
  follow-on rule, queue-merge as the declaration of done, the landing queue, the walk queue as a
  record-never-a-gate, the backlog's graduate-or-die contract (with one wording amendment: an item
  may graduate into a programme stage as well as into NOW), and the ask-test.
- **Relation to `docs/ORCHESTRATION_NEXT.md`** (its status lives in that doc): fully compatible
  and mutually reinforcing - its verdict-artifact and outcome-ledger machinery supply harder
  evidence for register gates, and the register gives its "which pictures are ratified" question
  a home. Neither depends on the other landing first.

---

## 4. Evidence: how "done" works

Five maturity rungs per **claim** (not per feature). The brief's vocabulary survives review; every
rung already has machinery behind it:

| Rung | Meaning | Existing machinery |
|---|---|---|
| implemented | capability exists in code | `npm run build` gate, factory checks |
| machine-verified | deterministic automated evidence of the functional requirements | CI affected-plan + shards, nightly FULL, the five catalog gates, migration tests, conformance gates |
| scenario-proven | realistic end-to-end use succeeds, including adversarial and NOVEL cases | `e2e/configured/` against a real stack, hosted-latency, render-smoke pixel reads, external-renderer rounds, bench rounds with blind reads |
| owner-accepted | the owner has personally verified the customer-facing claim where judgment matters | `docs/acceptance/owner-queue/` + `/walk` - non-blocking by owner law |
| production-proven | survived real production use | class productions, Yle trials, `deploy-verify`, feedback digest |

Rules that make the rungs mean something:

- **Test the claim, not the implementation.** Every programme's stages exist to advance named
  acceptance claims (§5); a stage with no claim behind it is scope creep. "A node editor exists"
  is never evidence; "a non-programmer defined behaviour on an unfamiliar graphic and operated it"
  is.
- **Challenge scenarios are mandatory for general capabilities.** The verifying scenario must not
  be the development example. The pattern exists (novel-brief agent bench cells, the foreign
  OGraf fixture corpus, the hostile vision bench) and becomes a standing requirement: Behaviour
  proven on a graphic class it was not built around, SVG import on files outside `docs/svg-samples/`,
  data integrations on feeds with faults the connector author did not pick.
- **A human-found defect class becomes a permanent oracle.** Already repo practice (mutation-tested
  guards, the e2e trap doctrine, gates born from incidents); the register makes it a checklist
  line on every reopened stage: what oracle now catches this class.
- **Owner acceptance is parallel, never serial.** Claims advance to scenario-proven without the
  owner; the walk queue receives one item per claim when its evidence is complete; other
  programmes and later stages never wait on a pending walk. Owner feedback reopens - it does not
  pre-block.
- **New verification machinery is built inside programmes, on the existing stack** - never as a
  parallel architecture. The year's four build-outs, each owned by the programme that needs it
  first: multi-context configured e2e (Teams), the property-test harness on machine mutators and
  the event queue (Behaviour), the reusable fault-injection harness (Data), and the soak/scenario
  driver (Reliability). Hardware-loop automation (DeckLink capture cards, NDI loopback, captured
  frames) is investigated inside Reliability late in the year; until then hardware claims ride the
  existing owner-queue hardware items.

---

## 5. The programmes

Seven programmes plus one horizontal. Each entry: claim(s), what exists, first stages, owner-only
items. Proposed initial states in §7. Every programme obeys the iteration shape the brief asks
for: small slice, machine verification, realistic scenario, adversarial check, inspect failures,
improve - the wave system already works this way; the register only supplies the next slice.

### P1 Teams
**Claim:** three students with separate accounts prepare and operate the same production - same
graphics, same rundown - without sharing credentials or coordinating whose personal account holds
the show. **Non-claim (v1):** simultaneous co-editing of one graphic; LWW plus conflict copies
stays, made visible.
**Exists:** capability-URL operating (four slugs per production), per-user RLS on ~18 tables,
entitlements per uid, moderated community copies. **Absent:** any WHO concept.
**First stages:** design doc settling the model (team principal in RLS vs server-authoritative
productions - the audit leans server-authoritative for team-owned productions, since published
slugs already live server-side and LWW cannot carry shared ownership); migration + RLS rewrite
with the existing migration-test pattern; multi-context configured e2e (three authenticated
contexts, the named hole); simple-by-default UX - a solo user never sees team machinery.
**Owner-only:** ratify the design; custom SMTP + Google OAuth provisioning (already parked,
becomes urgent with real multi-account classes); the three-student walk.

### P2 Behaviour & Control
**Claims:** (a) a non-programmer takes a graphic they did not make, gives it the behaviour their
show needs - states, operator actions, timers, independent groups - receives a generated control
surface, and operates it live without code; (b) the next producer CHANGES that behaviour (remove
the lock; reveal immediately) without code; (c) the control surface is customizable without
forking the generator's parity across its five renderers.
**Exists:** everything listed in audit §1.2. **Open:** the authoring surface (both attempts
failed), behaviour customization (explicitly deferred out of the NOW push), control customization
(`docs/backlog/control-panel-road-v2-brief.md`), and the deferred machine-model extensions
(external events, interruption priorities - schema-ready, consciously unbuilt).
**First stages:** a research round that starts from why the canvas and node editors failed
(GOALS.md demands this); candidate surfaces prototyped against CHALLENGE graphics (a debate
clock, an auction board - behaviours the quiz/scoreboard work never touched); the property-test
harness on `machineEdit` mutators, the event queue and snap recovery; then the chosen surface,
then customization. The structural-guard doctrine holds unless the owner changes it (§1.3).
**Owner-only:** taste rulings on candidate surfaces; the claim-(a) walk on an unfamiliar graphic.

### P3 Production, Rundown & Media
**Claim:** an operator runs a complete ordinary show - graphics, stills, video clips, audio beds,
sequenced cues across layers - from one NoaCG production, on CasparCG or browser outputs,
replacing the CasparCG-Client-style operating experience, and recovers cleanly from a mid-show
renderer restart.
**Exists:** cue rundown, layer stack, staged-vs-take, `/output` recovery, stills, the parity-bound
dashboard. **Absent:** clips, audio, timed advance.
**First stages:** clip playout by reference (the designed `filelist` pattern - the owner's own
named blocker; media never travels through the web); audio beds the same way; rundown v2
(sequences, timed advance where the show model warrants it - never a parallel control system:
data prepares, the operator's verbs air things); the scripted-show scenario driver (a 90-minute
show as a spec). Interactive-playout phases 1-7 are Implemented-not-Verified: verification debt
is a stage here, not new build.
**Owner-only:** the show-model rulings GOALS.md already holds open (Re-take, SPACE-to-preview);
the full-show walk.

### P4 Data & Automation
**Claim:** a live external source (CSV/HTTP/feed) drives on-air graphics through the production
data API with operator override always winning, and an external system (Companion/Stream Deck
class) automates a real show through a documented, stable API.
**Exists:** the data API with per-production keys, the server data tree + bindings, datasets,
CSV/JSON import. Invariants that bind every stage: writes describe state, never graphic commands;
ordering is the conflict resolution; connectors are one more writer of the same log.
**First stages:** Phase 3 convergence (client follows the server tree; retire the second data
model - the audit found two coexisting models and forbids a third); then the Data Hub exactly as
already designed in the parking lot (a CSV sheet driving a ticker, then a real provider); the
reusable fault-injection harness (malformed feeds, stalls, floods, out-of-order writes); then
Companion-class integration. A playout-command API is a NEW consented permission and a scope edge,
not an extension of the data key. MOS/newsroom: kept possible by the log architecture, not built.
**Owner-only:** any paid data-provider account; the live-data walk.

### P5 Agent Platform
**Claim:** a coding agent builds and airs a complete production - graphics, behaviour, cues, data
bindings - through the CLI/MCP against the documented contract, without a human in the loop, and
a recurring benchmark with novel briefs proves it did not overfit to the examples.
**Exists:** the shipped door - `noacg` CLI, 7 MCP tools, the bridge, scoped keys
(`graphics:create` only), dual SPX/OGraf packages, one measured 25-cell round.
**First stages:** `npm publish` (owner call, already on GOALS); scope widening one permission at a
time (`productions:attach`, cues, data bindings - each a security design, per `docs/AGENT_SAVE.md`);
bridge functions before CLI features (one capability, multiple interfaces - the bridge IS the
pattern); the standing benchmark made recurring with novel briefs; agent-authored machines
(GOALS.md says "the owner gate is now armed"); eventually diagnose-and-repair against `validate`
output.
**Owner-only:** the publish; each new key scope; the agentic-creation walk.

### P6 OGraf & Interoperability
**Adopted verbatim** - the ratified GOALS.md ladder IS this programme and becomes the register's
first tenant with zero redesign: CasparCG hardware acceptance; GDD alignment; the interop suite
(scripted external-renderer round + the foreign-fixture corpus already specified in
`docs/OGRAF_FIRST_REVIEW.md`); untrusted-package isolation; import v1; playout on the existing
output architecture; the Server API facade; then outreach, gated exactly as ruled. Claims are the
ladder's own: foreign packages operate in NoaCG; NoaCG packages operate in independent systems
(already proven twice against ograf-server); `/output` speaks the Server API; NoaCG is a visible
ecosystem member. Never differentiate on the format.
**Owner-only:** the GSAP written clarification; the ecosystem-listing PR and any EBU contact (both
gated); Yle's production trial.

### P7 Creation & Advanced Editor
**Claim:** a designer brings real artwork in (layered SVG, Figma/Illustrator exports), refines it
visually, animates it, and never needs code - while a professional keeps the full editor.
**Exists:** wizard, Timeline v2 complete, SVG import v1 shipped and awaiting the owner's walk, the
adapt-first AI tiers with their own binding gates (Lite §2 re-run, Pro's spend-capped rounds - the
AI gates stay exactly as GOALS.md holds them; this programme does not touch AI sequencing).
**First stages:** SVG depth (declared followers, per-layer stagger - the shipped plan's own
remainder); import-corpus challenge rounds beyond `docs/svg-samples/`; the WYSIWYG second attempt,
which by repo law starts with a written account of why the first failed, and should wait for P2's
research findings - the two share the failed-surface history. An After-Effects-class timeline is
deliberately late-year: presets cover most motion; behaviour cannot be preset-covered, which is
why P2 outranks this.
**Owner-only:** taste walks; the import-your-own-artwork walk (already queued).

### H0 Reliability (horizontal)
**Claim:** a representative production runs 24 hours while automated operators update data,
trigger graphics, play media, reconnect clients and deliberately restart components - zero
unrecovered failures.
**Exists:** boot watchdog, per-graphic output recovery, durable-store health, versioning-with-
migration doctrine, fail-closed db-push, deploy-verify. **Absent:** soak, generalized fault
harness, any run longer than 45 minutes.
**Stages:** the soak/scenario driver (build once, parameterize per programme - P3's scripted show
is its first consumer); scheduled fault rounds from the per-spec injection doctrine; performance
budgets where they earn their keep (the repo deliberately refused a hosted-latency threshold once;
re-arguing that needs new evidence, not restating); version/rollback drills on published
productions (cloud playout stages 2-4, already designed); late-year: the hardware-loop
investigation (§4). Every other programme's recovery claims execute through this harness rather
than growing private ones.

---

## 6. The year

Planning order, not serialized implementation. Concurrency ceiling: the NOW push plus two to
three ACTIVE programmes (audit §1.10). Dates assume ratification in early September; everything
after Q1 is direction, re-cut at each quarter boundary by the owner against evidence.

| Window | The push | ACTIVE programmes (target) | Key exits |
|---|---|---|---|
| Sep 2026 | GOALS NOW: students' own graphics, 2026-09-12 | none new - P1 and P2 in DESIGN; GOALS.md slim-down lands; register lands if ratified | the class production; Teams design ratified |
| Oct-Dec 2026 | class productions keep running | **P1 Teams**, **P6 OGraf** (rungs 1-5), P3 first slice (clips by reference) | three-student claim scenario-proven; OGraf import v1; clip playout airing; Yle trial happens on whatever is true then |
| Jan-Mar 2027 | - | **P6** (playout + Server API), **P3** (rundown v2 + scenario driver), **P4** (Phase 3 convergence, Data Hub), P2 research rounds running throughout | OGraf playout claim; outreach unlocks per the ruling; full-show scenario green |
| Apr-Jun 2027 | - | **P2** (chosen surface + customization), **P4** (connectors, Companion), **P5** (scope widening, recurring bench) | behaviour claim (a) scenario-proven; automation claim; agent production claim |
| Jul-Aug 2027 | - | **H0** (24h soak, hardware loop investigation), **P7** (WYSIWYG second attempt, informed by P2), P6 ecosystem presence | the 24-hour claim; the year's owner walk set; North Star review + next-year cut |

P2 runs as a continuous research thread from September (design sessions are legal in DESIGN state)
precisely because it is the highest-uncertainty item; committing it to a quarter would repeat the
optimism the brief warns about. H0 stages attach to whichever programme needs them first rather
than waiting for Q4 - the table shows where its own claim lands.

---

## 7. Proposed initial register states (owner to confirm each)

| Programme | Proposed state | Entry condition |
|---|---|---|
| P6 OGraf | AUTHORIZED (already ratified 2026-08-29) | the NOW date, as already ruled - flips ACTIVE 2026-09-12 |
| P1 Teams | DESIGN now; AUTHORIZED on plan ratification | implementation after the NOW date |
| P3 Production/Rundown/Media | DESIGN (clip-slice plan exists in backlog) | after the NOW date |
| P2 Behaviour & Control | DESIGN (standing research thread) | surface build waits on research findings + owner ruling |
| P4 Data & Automation | IDEA -> DESIGN in Q1 windows | Phase 3 design first |
| P5 Agent Platform | AUTHORIZED-adjacent (the door shipped; GOALS already lists its next steps) | scope items individually, per key-scope edge |
| P7 Creation | DESIGN late | WYSIWYG attempt gated on P2 findings |
| H0 Reliability | AUTHORIZED with the register | stages attach on demand |

---

## 8. Integration plan - the exact edits, once ratified

Ordered; items 2-4 are one small branch each; item 5 waits for in-flight work.

1. **Create `docs/PROGRAMMES.md`** - the register: one table (id, programme, state, ratified-by,
   current stage, next evidence gate) plus one short section per programme (stage checklist with
   evidence links, scope edges, reopen triggers, claim pointers into this doc). Budget ~80 lines;
   the argument and the claims stay HERE so the register stays cheap to grep at wave grounding.
2. **`docs/GOALS.md`**: add the one carve-out sentence to the gate rule (§3); execute
   `docs/backlog/goals-over-its-own-budget.md` steps 1-2 in the same series (archive landed prose,
   restate the budget once). The NEXT-OGraf ladder body moves nowhere - the register row points at
   it.
3. **`docs/README.md`**: index rows for this doc and the register (this branch already adds the
   first).
4. **Issue #48**: edit the body to a pointer at this document and the register; keep it open as
   the single external North Star reference; never track state there (the tracker is bot-alert
   territory; docs are the system of record).
5. **`.agent-workflows/orchestrator.md`**: the fill-order rung, the grounding read, and pointing
   "Big projects are phased" at the register. **Deferred** until the three stranded branches and
   the live orchestration-architecture branch land - that file is the repo's most collision-prone
   prose and the one-orchestrator lesson was paid for two days ago. The register works read-only
   for human-planned waves in the meantime.
6. **`docs/backlog/README.md`**: the one-word amendment (graduate into GOALS "NOW" **or a
   programme stage**).
7. **Memory**: nothing - the repo carries all of this; memory holds only owner rulings, which the
   register now records in-repo where they auto-load.

---

## 9. What the owner is asked to decide

1. Ratify the North Star statement (§2) - or edit it; it becomes the standing preamble the
   register points at.
2. Ratify the programme system (§3): states, owner-only promotion, scope edges, the one-sentence
   GOALS carve-out, the fill-order rung.
3. Confirm or amend the programme boundaries (§5) and initial states (§7) - in particular:
   Teams design starting now, OGraf auto-activating on the NOW date, and clip playout as P3's
   first slice.
4. Rule on the year table's Q1 (§6); later quarters are re-cut quarterly and need no ruling now.
5. Name any claim in §5 whose owner-accepted rung you want to hold personally beyond the listed
   walks - the walk queue carries one item per claim either way.
6. The GOALS.md line budget (goals-over-its-own-budget step 2): is ~200 still the number?

Everything else in this document is reversible detail the programmes themselves will refine.
