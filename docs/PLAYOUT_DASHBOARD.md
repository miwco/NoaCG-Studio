# The playout dashboard — one operator surface, three deployments

Binding design contract for the surface an operator drives a production from. Owner-specified
2026-08-05; reference designs `re-design/4a-playout-desktop.png` + `4b-playout-phone.png`, and
the four INTERACTIVE blueprints in §8a. Three surfaces render it and **must not diverge**:

| Deployment | Code | Wire |
|---|---|---|
| In-app production page | `src/components/home/ProductionPage.tsx` | local (preview) + hosted log (air) |
| Hosted control page | `src/components/HostedControlPage.tsx` | hosted log |
| Exported controller | `src/control/productionControllerHtml.ts` | the bundled local relay |

Before this contract they were three different products: the exported one had PREVIEW/PROGRAM
monitors and a blue accent, the hosted one had no monitors at all and stacked one tall card per
graphic, the in-app one had a single preview and reordered layers with arrows. A student who
learned one could not operate another.

## 1. What the operator is doing (the 90% case)

**Choose a cue → look at it on PREVIEW → it is right → TAKE.** That is the job. Everything on
the surface serves it.

- **Selecting a cue in the rundown puts it on PREVIEW.** No separate "load" step: selection IS
  the preview gesture. Nothing about that touches air.
- **PREVIEW is a check of the graphic you are about to air**, not a viewport onto "the next
  item". It answers one question: is this the right graphic with the right words?
- **TAKE airs what is on preview.** It is the loudest control on the page and the only red one.
- Going straight to air is allowed (take without looking) — the gate is a courtesy, not a lock.
- Replacing a live graphic with a new one is the same gesture, which is why a rundown row can
  read ON AIR while another reads PVW.

## 2. Layout — desktop

Two columns. **The PAGE is the only scroller; every block on it is content-sized.**

```
┌ header ───────────────────────────────────────────────────────────────────────┐
│ ▤ Show name  ● SHOW  00:42:17        ● output connected · N layers            │
│                                         [Publish/links]  [Export…]  [■ All out]│
├───────────────────────────────── main ──────────────────┬─── cue rundown ─────┤
│  ● PREVIEW  <cue name>        ● PROGRAM — ON AIR   L1   │  ⣿ 1 Presenter strap │
│  ┌───────────────┐            ┌───────────────┐         │      after the intro │
│  │  amber frame  │            │   red frame   │         │             L1 ON AIR│
│  └───────────────┘            └───────────────┘         │  ⣿ 2 Topic card  PVW │
│  [→ Preview P] [⟳ TAKE SPACE] [✎ Update U] [» Next N]   │  …                   │
│  [■ Out 0]                          on air: ● <graphic> │                      │
│  ┌ EDITING PREVIEW CUE · <name> ─── switch to on-air ▾┐ │                      │
│  │ F0 · KICKER   F1 · TITLE   F2 · SUBTITLE           │ │                      │
│  │ [⚡ event] [⚡ event]                                │ │                      │
│  └────────────────────────────────────────────────────┘ ├──────────────────────┤
│  ▸ ACTIVITY  20:14:02  ⟳ Take · Presenter strap         │ [+ from library][+ …]│
└─────────────────────────────────────────────────────────┴──────────────────────┘
```

- **THE SCROLL MODEL (owner report 2026-08-19).** The surface used to be locked to the viewport,
  so a graphic with many fields could not make the page longer and the **editor** — the pane an
  operator changes scores, names and texts in mid-show — grew its own scrollbar instead.
  Measured on a 1080p monitor at 125% scaling (1536×814 CSS px) with an eight-field quiz:
  `.pd-editor` was 178px tall over 240px of content, `.pd-activity` 14 over 20, and the document
  could not scroll by a single pixel. Scrolling that little box during a show is the complaint.
  The rule now, in the owner's own words — *"I don't mind scrolling the whole page… I also don't
  want it too small"*:
  - **Nothing is shrunk to fit.** A complex graphic is allowed to make a long page.
  - **The page scrolls; no pane does.** `.pd-main`, `.pd-editor`, `.pd-actions`, `.pd-activity`,
    `.pd-data` and `.pd-audience` are all content-sized, with no `overflow` of their own.
  - **What must never leave the screen is STICKY**, not small: the header (■ All out is the
    panic control), the monitors, and the cue rail.
  - **Two exceptions, both because they have nowhere else to go:** the cue list inside the
    sticky rail (a forty-cue rundown), and the `⋯` / links popovers.
  - The phone breakpoint keeps its own viewport-locked shell, because its verb bar is pinned to
    the bottom of the screen; `.pd-body` is the scroller under it. Same idea, one level down.

  **Measured before and after**, same production and graphic, driven for the acceptance pack:

  | | monitor block | the editor | the page |
  |---|---|---|---|
  | 1920×1080 | 442px (41%) → **323px (30%)** | fit either way | did not need to scroll |
  | 1536×814 | 334px (41%) → **254px (31%)** | 62px hidden → **0** | could not scroll → did not need to |
  | 1536×560 | 334px (60%) → **188px (34%)** | 62px hidden → **0** | could not scroll → **scrolls 165px** |

  A VISUAL ACCEPTANCE PACK exists for this change (the contract is in
  `docs/INTERACTIVE_PLAYOUT_PLAN.md`, "Verification contract"): five before/after pairs from the
  real app — the reported size, nominal 1080p, scrolled to the bottom of a short window, the Data
  tab, and the phone — with the repeat-by-hand sequence. It asked two things: whether the capped
  monitors are now too small to judge a graphic by, and whether the space they free to the right
  of PROGRAM reads as sized or as unfinished.

  **READ BY THE OWNER 2026-08-21. Both questions answered, and the read opened three more.**

  - **At 1536×814 the cap is RIGHT** — *"The gap and monitors are not too small; I think they're
    fine."* The empty column is accepted for now: *"Right now, I can't come up with anything for
    that area, so it's fine."* This size is settled; do not re-open it without a new complaint.
  - **At 1920×1080 the cap is WRONG, and it is the opposite complaint** — *"that actually looks
    pretty bad… I think that it has too much empty room at the bottom and the monitors are
    unnecessarily small."* A flat `26vh` answers the 814px window and wastes the 1080p one: the
    monitor block is 323px with over 500px of page below it doing nothing. **The rule the cap
    should express is not a fraction of the viewport, it is what is LEFT** — the monitors take the
    room nothing else needs, floored and ceilinged. Owner's tie-breaker when they compete:
    *"if the graphic needs controls, I would rather have the controls big than the monitors too
    big."*
  - **…but sizing off leftover room must not make the monitors twitch.** *"it's also important
    that the program and preview monitors don't jump between scales depending on what graphic we
    are looking at."* That is a constraint on the fix AND a defect that already exists: the cap is
    a grid track of `--pd-monitor-h * min(--pd-ar, 16/9)`, and `--pd-ar` is the PREVIEWED
    GRAPHIC's own ratio — so selecting a 9:16 or square cue narrows both monitors today. Whatever
    replaces the flat `vh` has to be computed per PRODUCTION (the pool's worst case), never per
    cue, or it trades one twitch for another.
  - **At 1536×560 the verb bar scrolling under the sticky monitors is a real hazard** — *"I think
    it's a bit scary that you scroll the monitors on top of the take buttons… I think the buttons
    should be visible."* Correct by this document's own §2 rule: what must never leave the screen
    is STICKY, not small — and the verb bar is the one block that carries TAKE and Out. It is
    currently neither sticky nor protected.
  - **The proposed answer to both, from the owner: put the verb bar in the empty column beside
    PROGRAM.** *"the buttons would fit to the right of the monitors."* It is one change that
    spends the dead width, takes the bar out of the vertical stack (so the monitors can grow into
    the height it frees at 1080p), and makes the bar part of the sticky monitor block instead of
    something that scrolls away. Treat it as a BREAKPOINT, not a move: below the width where a
    verb stack fits beside PROGRAM the bar returns underneath. `■ All out` stays in the header
    regardless — it is the panic control and its distance from the others is deliberate.
  - **A MINIMUM SUPPORTED SIZE is sanctioned** — *"we don't have to fit everything on any size. We
    can have a minimum that we need to use."* The number itself is still an owner decision.

  None of this is built. It is a layout change to `ProductionPage.tsx`, `HostedControlPage.tsx`,
  `productionControllerHtml.ts` and the `.pd-*` rules — all three surfaces, in one session, with
  the pack's `scroll`/`hosted`/`controller` sections re-run as its evidence.

  **Where that read was done: `docs/acceptance/owner-pack/index.html` §2** (rebuilt 2026-08-21 by
  `node scripts/acceptance-pack.mjs`). It carries both questions verbatim over frames of the real
  app at 1536×814, 1536×560 and 1920×1080, on **all three surfaces**. Each frame carries the
  geometry read off the live document at capture time, which reproduces the table above and adds
  the number the second question is actually about: the empty width beside the PROGRAM frame is
  **378px at 1536×814, 612px at 1536×560, 516px at 1920×1080**.

  **The three surfaces are now MEASURED not to diverge, not argued not to.** The hosted control
  page reports the identical geometry to the in-app page at both sizes — 254px / 31% / 378px at
  1536×814, 188px / 33% / 612px at 1536×560, no pane with a scrollbar of its own on either. It
  needs Supabase env plus a publish, which an offline checkout has by design, so the pack's
  `hosted` section builds the ordinary bundle with the env pointed at a stub origin and answers
  0008's RPCs from memory with the production's own `buildPanelSpec`/`buildOutputPayload`. It is
  captured OPENING onto a show already on air — the hosted page's own case — because the log
  follower tail-fills only when Realtime reports SUBSCRIBED, so nothing after the open moves in
  that rig, and the frame says so rather than implying otherwise. What it proves is the LAYOUT;
  the server side stays the live checklist's job.
- **Monitors are 16:9, side by side, equal, and CAPPED near 30vh** — owner, same report: *"we
  should rather make the preview and program screens a bit smaller… you see what's out all the
  time"*. Uncapped they took 41% of the height (442px of 1080). The cap is expressed as a grid
  TRACK WIDTH, not as a height: a frame is `width: 100%` with the graphic's own `aspect-ratio`,
  so clamping its height directly would letterbox the picture inside a box the component
  measured for something else. The track width that keeps both monitors under the cap is
  `--pd-monitor-h * min(preview ratio, 16/9)`, where `--pd-ar` carries the preview graphic's own
  ratio as a bare number. The pair stays flush LEFT, sharing an edge with the TAKE button and the
  editor card below.
  **KNOWN DEFECT, found in the 2026-08-21 owner read (§2 above), not yet fixed:** because
  `--pd-ar` is the PREVIEWED cue's ratio and not the production's, selecting a non-16:9 cue
  narrows BOTH monitors — the "monitors don't jump between scales depending on what graphic we
  are looking at" rule, broken by the mechanism that enforces the cap. The cap has to be derived
  from the production's own worst case, not from whatever is on preview this second. PVW wears the amber frame, PGM the red one. PGM's header carries the layer
  badge of what is up.
- **A monitor is a monitor: `pointer-events: none` on its iframe.** A click that lands inside
  moves focus into a document that does not listen for the verb keys, so SPACE, N and 0 go dead
  with nothing on screen saying why. The exported controller always did this; the React surfaces
  did not, and the capped monitors are what put a monitor under the pointer where a gap used to
  be.
- **The verb bar shows its keyboard shortcuts** as chips: Preview `P`, TAKE `SPACE`, Re-take `R`,
  Update `U`, Next `N`, Out `0`, and `↑`/`↓` walk the rundown. `■ All out` lives in the header,
  away from the others, because it is the panic control.
- **The TAKE control is a TOGGLE, and the button IS the key** (owner decision, acceptance pass
  2026-08-06 — "put something on and take takes it off; it should go in and out with space" —
  corrected 2026-08-07 after a production: `SPACE` took a live cue OFF while the button beside
  it RE-TOOK, so one surface had two behaviours and the label read wrong to a hand already on
  the key). Following SPX, one control turns a graphic on and off: it reads **⟳ TAKE `SPACE`**
  off air and **■ TAKE OFF `SPACE`** while that cue is live, and the click does exactly what the
  press does. `0` means Out from either state.
- **RE-TAKE is a SECONDARY control** — Take on a cue that is already live: it sends the cue's
  current values and replays the entrance, which is the graphic's own reset. That makes it the
  gesture for airing the NEXT row onto a layer that is already up (load the row, `R`), which is
  how the quiz bank walks. Its own button and its own key, never the primary button's live state. Like every other verb it stays in place and greys out when it
  does not apply, so nothing on the bar moves sideways at the moment a cue goes live.
- **`↑`/`↓` walk the rundown**, selecting a cue exactly as clicking it does (to PREVIEW; nothing
  airs). With the toggle, that makes the whole surface operable from the keys alone — which is
  also what makes a **Stream Deck** work today, since one is a keyboard emulator by default. A
  dedicated plugin (WebSocket, live button state) is a separate project and is not started.
- **The keymap is ONE module, `src/components/playoutKeys.ts`**, read by both React surfaces
  (the exported controller carries its own copy because it ships without React). Written twice,
  it diverged: until 2026-08-18 the **hosted control page had no verb keys at all** — the page a
  class operates from was the one where `↑`/`↓` did nothing — and its TAKE re-took a live cue
  instead of taking it off, the exact behaviour §2 says one surface must never wear twice. A new
  key or a changed meaning goes in that module and in the controller's `keydown` block, never in
  a surface.
- **The editor edits the PREVIEW cue by default** and says so ("changes air on ⟳ Take"). A
  switch offers the ON-AIR cue instead, where ✎ Update pushes edits live.
- **An edit to the ON-AIR cue says it has not been sent.** Data never airs by itself — that is
  the staged-vs-take rule and it does not change — so the surface has to say when what is on
  screen is ahead of what is on air: the fate line names how many changes are waiting and ✎
  Update wears an amber dot. It compares against what was last SENT, never against the stored
  cue, since those legitimately differ. **On the hosted page "last sent" is read off the WIRE**,
  so an update somebody else aired clears the warning here too - the same fact, from the only
  source a shared surface can trust.
- **Activity is one collapsed line** at the bottom; it expands. Both React surfaces carry it, and
  it earns its place most on the HOSTED one: that is the multi-operator surface, where "did that
  take go, or was that somebody else?" is a real question. Those rows were already arriving there
  to drive PROGRAM and were being thrown away.
- **A production DATA row loads into the edited cue** where the Data workspace has a table whose
  column names match this graphic's field titles (`control/cueData.ts` - one matcher, including
  the A/B side gesture). The in-app page matches LIVE against the show; the hosted page renders
  rows the same matcher resolved AT PUBLISH TIME, which is the freshness contract its cues and
  entries already have: edit a dataset, publish changes.

## 3. Layout — phone

One column: header (name · mode · All out) → the two monitors side by side, small → the cue list
(large touch rows) → the editor for the selected cue → **a fixed bottom bar: ⟳ TAKE · » Next ·
■ Out**. The monitors stay side by side on a phone: seeing preview and air together is the whole
point of the surface, and stacking them would put air below the fold.

**No visible scrollbar chrome on any pane, on any surface.** The page scrolls with the browser's
own bar; the cue list scrolls without one. No horizontal scrollbar may ever appear — a surface
that scrolls sideways is a layout bug, not a scrolling affordance.

## 4. The cue rundown

One row per cue: drag handle, number, **bold label**, the operator note (or the graphic name)
under it, the **layer badge**, and the ON AIR / PVW tag. Full-width label — reorder, duplicate
and delete live behind the row's `⋯`, never as four permanent buttons that crush the name.

- **Every cue carries its own field values.** The same lower third is a different person at cue
  2 and cue 7; that is what a cue IS.
- **The cue's title is editable here**, in the operator surface — mislabelling "Guest lower
  third" as "Host lower third" is a live-show mistake and must be fixable without leaving.
- Reorder is a DRAG, not arrow buttons.
- **THE RUNDOWN IS THE ONLY LIST** of what a production holds (owner decision 2026-08-17, on the
  layer list this replaced): every pool graphic is present in it, named and wearing its layer, so
  nothing about the production hides in a second list. Two rules keep that true rather than
  merely tidy, and both live in the row's `⋯`:
  - **Removing a graphic's LAST cue removes the graphic** (`model/shows.ts` removeShowCue), and
    the menu item says so before it is pressed. Otherwise a pool graphic with no cues appears
    nowhere and still ships in the published payload, still loading as an iframe on its own layer
    — an orphan the operator could neither see nor reach.
  - **"Remove graphic and its N cues"** is the one gesture for taking a graphic out of the
    production, offered only where it differs from the item above (2+ cues). Both removals take
    the graphic OFF AIR first: the output page follows the log, not the payload, so a live pool
    entry deleted from under it would keep rendering with nothing left able to stop it.
  A removal that destroys typed content asks twice — the pictures graphic carries the uploads
  themselves, so its wording names the count ("Also deletes 3 pictures — confirm?").
- The rail's foot is how graphics GET IN: the library picker, `＋ New graphic for this
  production…`, `＋ Add pictures…`. Nothing else belongs there.

## 5. Layers — an explicit number, not an ordering game

**A pool graphic carries a layer NUMBER the operator types** (CasparCG layers 1–100), edited
beside the graphic's content, where the decision is actually made.

**They are DISTINCT by construction.** Counting starts at 20 — the first graphic is 20, the next
21, the next 22 — because two graphics on one layer replace each other on air and there is no
reason to begin from a state the operator then has to repair. Most productions never touch the
number; one that wants a particular stack just types it.

This replaces derived-from-pool-order layers and the ↑/↓ reorder buttons, which made the layer
an accident of ordering.

**There is no layer LIST** (owner decision, 2026-08-17: *"you should just be able to change the
layer from the actual options … that would free more space for our rundown"*). A panel in the
rail's corner listed the same graphics the rundown already lists, to show a number the operator
edits beside the graphic's content anyway — so the rundown gets that room. Each row wears its
graphic's layer, and every job the list had is somewhere the operator was already looking:
removal in the row's `⋯` (§4), what is up in the ON AIR tags and the header's `· N layers`, the
paint order in the number itself.

A duplicate can still be typed deliberately, so **the surface says when one exists** rather than
letting it be discovered live: the editor flags it inline with a one-click move to the next free
number, and **every rundown row on the shared number wears the warning colour**, naming its
partner on hover. Both rows, not just the one being edited — the point is which two graphics are
about to replace each other. All three surfaces mark it the same way.

## 6. What is NOT here

- **No Rehearse mode.** Preview is local and always available, published or not: choosing a cue
  shows it, ▶/■ drive it, and none of that reaches air. A separate rehearsal mode was a second
  way to do what the surface already does, and the one mistake it could cause — believing you
  were rehearsing while you were live — disappears with it.
- No per-graphic card stack. The editor follows the SELECTION.
- **No layer list** — see §5. The rundown is the only list of what a production holds.

## 7. Publishing and the links live here

If this surface replaces the production dashboard, it carries the dashboard's two jobs:
**Publish / republish**, and both capability links — the **output URL** (the browser source) and
the **control page URL** (to operate from another device). They belong in the header's menu, one
click from the operator, never on a page they have to navigate away to.

**ONE LINE PER CAPABILITY, the explanation behind its own ▸.** The panel grew a paragraph under
every row and became a page: five explanations between five rows put the CONTROL PAGE — the link
a class operates from — below an account of an SPX file most of them never download. So each
row's help collapses (`LinkRow`, ProductionPage.tsx), and the arrow sits in the same column down
the panel so it is found rather than hunted. Two rules the shape has to keep:

- **The audience row's help opens by default.** Every other explanation describes something
  PRIVATE; this one says "public", and that is the one omission here that could reach air.
- **A secondary capability is QUIET, never hidden.** The SPX template file is a smaller, dimmer
  row directly under the output URL it is a second form of — it belongs to the one playout host
  that cannot take a link, so it must stay findable without competing with the links copied
  every show. Same for the readable-name field. Hiding either behind a "more" would trade one
  crowded panel for a lost control.

## 7b. The ⚡ GRAPHIC ACTIONS block, in the operator's words

Two of its controls were unreadable to their first real operator (acceptance pass, 2026-08-06),
so both explain themselves ON the surface — a control that needs a document read to be understood
is a control that will not be used.

- **The ⚡ buttons fire the graphic's own beats on the layer that is on air, immediately.** They
  are not cue verbs: nothing here waits for a Take. Where a beat needs data it carries values
  from the selected cue, so the field is typed above first — and each button's tooltip names
  that field by its OPERATOR TITLE, never as `f7`. That is what makes an action like the quiz's
  **Show audience result** legible: it airs the "Audience results" field you typed above (a
  hidden holder like "34 | 52 | 9 | 5"), painted as a chip on each answer row. The percentages
  are DATA the whole time; the state is only what shows them.
- **"Snap to state…" is the RECOVERY picker**, not a way to drive a graphic. It jumps the live
  graphic straight to a state with NO animation, and it rides with a re-send of the cue's values
  because recovery is two operations (`docs/STATE_MACHINE_SCHEMA.md`: reset the visual state and
  reset the data are never conflated, and a lone snap replays intermediate states with
  suppressed callbacks, so call-painted looks need the trailing data write). Use it when air and
  the dashboard have got out of step — a renderer restart, a missed press. Normal operation is
  the ⚡ actions and » Next.
- **Both React surfaces carry the whole block** — header, snap, section grouping, help line.
  The hosted page used to render the ⚡ buttons as one flat row with no snap at all, which put
  the recovery control on every surface EXCEPT the one being operated from a phone, away from
  the machine running the renderer. Sections come from `controlModel.ts controlSections`, the
  author's own `machine.controls` metadata, grouped identically by all three deployments.

## 7c. The ± LIVE NUMBERS block — the one data write that airs immediately

Under the ⚡ actions, same doctrine, opposite direction: the ⚡ buttons are STATE that carries
data, these are DATA with no state at all. One press bumps a `number` field on the live graphic
— a score, a goal total, a stock count — as a **PARTIAL update carrying just that field**,
mirrored into the edited cue so the cue and the air never drift. Partial is the load-bearing
word: ✎ Update sends the cue's whole value set, so riding it would also publish every other
staged edit, and a score bump must never air a half-typed name. Receivers write exactly the
fields a message carries and the logs merge partial data, so recovery replays it correctly
(`docs/CONTROL_LAYER.md`).

Three derivation rules, all template-driven (no category is ever consulted):

- Any graphic with an operator-visible `number` field gets the block — scoreboards, podium
  boards, goal meters — with no per-graphic code.
- A number field an ⚡ event carries as PAYLOAD is excluded (the podium's spotlight index, a
  focused row): it is set by its own action, and a second road to it would air a value without
  the state that gives it meaning.
- The buttons enable only while the edited cue is the one on air — the same legality wording as
  the ⚡ buttons ("Take the cue first").

**All three deployments carry it** — `ProductionPage`, `HostedControlPage` (the cloud-first
surface a class drives from a phone) and the EXPORTED production controller, the fallback a show
drops to when the network dies. The exported page has no separate block: it is a third renderer
under the one-control doctrine, so its number field's own −/+ pair IS the block — same partial,
same exclusion, and the same "only while the edited cue is the one on air", greying off air with
"This cue is not on air — Take it first" and carrying the *act on air* mark beside the field's
name. It briefly staged off air instead, which is the one thing this control must never do: a
second meaning with no feedback at all, where the figure moved on screen and nothing said it had
not aired. An excluded (⚡ payload) field's pair is never greyed — it stages at all times, and
greying it would strand the only stepper that field has.

Two things follow from that on the exported page, and both were wrong before it carried the
rule: EDITING A FIELD STAGES (it used to push the whole value set on every keystroke of a live
cue, so a name reached air letter by letter, while the editor's own header promised "changes
push live on ✎ Update"), and a cue that is on both streams shows the STAGED version on PVW while
PGM keeps what is aired.

Pinned by `e2e/production-controls.spec.ts`: "± LIVE NUMBERS bumps a figure on air" for the
React surfaces, and "± LIVE NUMBERS on the EXPORTED controller" for the package — that one reads
the rows off the relay and asserts the PAYLOAD SHAPE, because what an exported surface puts on
the wire is the contract, and a screen that looks right can still ship the wrong payload.

## 8. Built to grow (interactive graphics)

The area under the monitors is deliberately not full. Interactive graphics — polls, Q&A, chat
highlights, audience questions — bring operator actions that are not "play this cue": approve a
question, push a poll result, promote a message. Those arrive as **modules under the verb bar,
scoped to the selected graphic**, alongside the state machine's own event buttons (which already
work this way — "graphic-specific actions travel with the graphic").

An **incoming feed** lands in the same region: a module that shows what viewers sent and puts
approved items into a cue. The audience plane that feeds it is built (the `/join` page and the
production's Audience workspace - `docs/INTERACTIVE_PLAYOUT_PLAN.md` Phases 5-6); the standalone
showchat surface lives at `src/showchat/`. Keep the region's height flexible and its contents
graphic-scoped; do not fill it with chrome.

## 8a. The interactive blueprints — what §8's modules actually look like

Four approved mockups landed 2026-08-09 and no doc referenced them, so they are named here.
Read them before building anything in the §8 region; the vocabulary is binding, the pixel detail
is not (the two quiz frames already disagree over field numbering and whether the actions sit in
one row or a two-column block — treat that as drawing, not as contract).

| File | What it specifies |
|---|---|
| `playout-control-panel-blueprint-vision.png` | The whole picture: the dashboard unchanged, plus the FOUR other operator views and the data-flow between them. |
| `playout-control-panel-quiz-example.png` | The quiz cue's field editor + its ⚡ ACTIONS block. |
| `playout-control-panel-poll-example.png` | The live-vote cue: Poll / Results / Chat tabs, per-option vote counts, a CONTROLS column, live chat beside it. |
| `playout-control-panel-audience-question-example.png` | The Q&A cue: original submission vs BROADCAST VERSION, approve / reject / edit, and a questions queue. |

**The founding rule, in the owner's words on the vision frame:** *"Your current playout view stays
the core. We add power underneath and to the side, not on top of it. We don't break what works.
We extend it."* And, on the flow diagram: *"Nothing bypasses the operator. Everything becomes a
cue."* Both restate contracts this doc already holds (§1, and the staged-vs-take rule) — which is
the useful signal: the blueprints are an EXTENSION of this surface, not a redesign of it.

The four other operator views it names — Data Hub, Audience Inbox, Public Participation Page,
Presenter View — are `docs/INTERACTIVE_PLAYOUT_PLAN.md`'s planes, largely shipped
(`ProductionDataWorkspace`, `ProductionAudienceWorkspace`, `/join`, the presenter view). Nothing
here asks for a new plane; it asks for the CUE EDITOR to show the right controls per graphic type.

### Two places the blueprints and the shipped contracts disagreed — DECIDED 2026-08-09

Both were decisions rather than defects, so they went to the owner. The rulings:

1. **The graphic's STATE: the blueprint's PLACEMENT, §7b's SEMANTICS.** The quiz frames put a
   `QUIZ STATE` dropdown (reading "Waiting for contestant", "Question card") in the field editor
   beside F0–F6, where §7b says in as many words that *"Snap to state… is the RECOVERY picker, not
   a way to drive a graphic"*.
   **Ruled:** show the state where the blueprint puts it — a labelled row in the field editor, in
   the author's words — but jumping to one stays a RECOVERY action and is labelled as such.
   **Why the drawing does not win outright:** driving by picking from a list skips the arrows, and
   the structural guard is the model's central claim — after `lock` there is no `select` arrow, so
   a late pick is *impossible* rather than refused (`docs/STATE_MACHINE_SCHEMA.md` §3). A free
   dropdown would make that guard cosmetic, and the ⚡ buttons' greying would stop being the whole
   truth about what can happen. Normal driving remains the ⚡ actions and » Next.
2. **A per-play TIMER value: NO second clock.** The quiz frames carry a `TIMER (SEC)` stepper as
   an operator field; the state model says a timer transition's delay is authored data ON THE
   ARROW, and both timer types decline a per-play field in their own files (`types/livePoll.ts`:
   *"the window's length is AUTHORED data on the arrow … not a field the operator sets per play"*).
   **Ruled:** the arrow stays authoritative, and the real need behind the drawing is answered
   instead — **an armed timer must be VISIBLE**. Today the live vote closes itself after 20 s with
   nothing on any operator surface saying it will, which is the actual complaint
   (`CONTROL_PANEL_PARITY.md` §5.5); ending a window early stays the manual button that already
   exists ("Close voting"). Not built yet — it is the open item those sections now point at.
