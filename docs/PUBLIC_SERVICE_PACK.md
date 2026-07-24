# The public-service pack — tickers, alerts and public information

**Status: shipped.** 29 templates across three categories, built on the existing ticker
runtime, the shared preset bank, the state-machine model and the six export targets. Nothing
here is a second engine.

- **Tickers** (10 new, `tk11`–`tk20`) — news and headline crawls, market and results tickers,
  upper and lower strips, a bilingual crawl, an emergency crawl, and two rotators.
- **Alerts** (10, `al01`–`al10`) — a new category: breaking news, weather warnings, emergency
  instructions, technical and status notices.
- **Public information** (9, `pi01`–`pi09`) — a new category: official notices, numbered
  instructions, municipal / health notices, source labels, disclaimers, and two-language panels.

Contracts: `src/templates/alerts/shared.ts`, `src/templates/publicInfo/shared.ts`,
`src/templates/tickers/shared.ts`. Machines: `src/templates/types/alertLevel.ts`,
`src/templates/types/publicNotice.ts`, `src/templates/types/ticker.ts`.
Tests: `e2e/public-service.spec.ts` (behaviour), `e2e/bench.spec.ts` (the calibration
tripwire, now covering both new categories), `e2e/catalog-baseline.spec.ts` (source + render).

---

## 1. The two rules this pack is built to satisfy

**A static strip is not a ticker.** Every graphic in the `ticker` category either TRAVELS
(a measured marquee: `tickerMarquee` slides the track by its own set-width, `repeat: -1`,
`ease: 'none'`) or ROTATES (one item at a time, advanced by a real state-machine timer). A
strip that merely sits still lives in `alert` or `public-info` — which is where the technical
notice, the disclaimer band and the public-notice panel are. `e2e/public-service.spec.ts`
asserts the travel, its direction, its repeat, its ease and its response to the speed knob
against the live graphic, so "it renders" cannot pass for "it moves".

**An alert state must be genuine if claimed.** Six of the ten alerts carry a four-level
severity machine: real parallel-group states, real transitions, real control-page buttons,
real keyframes. The other four carry no flag, no machine and no buttons, because a technical
fault, a service note, a breaking strap and a standby card each have exactly one level. The
spec checks both halves — that the six have states and buttons, and that the four have
neither.

---

## 2. Capability matrix

Legend — **Motion**: `marquee` = measured endless travel · `rotate` = machine-timed item
cycle · `preset` = the shared entrance/exit bank. **States**: the operator events the graphic
answers to (all of them appear as control-page buttons, greyed by the structural guard).

### Tickers (category `ticker`, prefix `ticker`, type `ticker` where stated)

| id | Name | Family | Motion | States / events | Fields | Default zone | Notes |
|----|------|--------|--------|-----------------|--------|--------------|-------|
| tk11 | Headline Crawl | minimal | marquee | — | items, label, source | bottom-center | Two fixed caps frame the travel |
| tk12 | Upper Crawl | minimal | marquee | — | items, label | **top-center** | Accent edge on the UNDERSIDE; slimmer type |
| tk13 | Results Rail | sport | marquee | — | results, label, round | bottom-center | `HOME 2 - 1 AWAY` → score lifted into a chip |
| tk14 | Market Board | minimal | marquee | — | instruments, label, session | bottom-center | Delta carries arrow **+** sign **+** colour |
| tk15 | Public Notice Crawl | minimal | marquee | — | notices, label, source | bottom-center | Fully opaque, largest crawl type, permanent source cap |
| tk16 | Breaking Crawl | minimal | marquee + loop | — | lines, label | bottom-center | Live dot: 1.8 s yoyo loop, floor 0.35 — never a strobe |
| tk17 | Bilingual Crawl | minimal | marquee | — | items, label, source | bottom-center | `EN \| XX` split at the first pipe; equal weight |
| tk18 | Status Rotator | minimal | rotate (type `ticker`) | `pause` `resume` `skip` | statuses, label | bottom-center | `Service — status` split into a name column |
| tk19 | Advisory Rotator | noacg | rotate (type `ticker`) | `pause` `resume` `skip` | advisories, label | bottom-center | Full-size type; a notice read in full |
| tk20 | Split Deck | noacg | marquee | — | crawl items, label, top story | bottom-center | Fixed top deck over a travelling lower deck |

### Alerts (category `alert`, prefix `alert`)

| id | Name | Family | Motion | States / events | Fields | Default zone | Notes |
|----|------|--------|--------|-----------------|--------|--------------|-------|
| al01 | Signal Alert | minimal | preset | `advisory` `watch` `warning` `emergency` | headline, detail, source | bottom-center | The reference band; type `alert-level` |
| al02 | House Alert | noacg | preset | same four | headline, detail, source | bottom-center | Void panel, mono severity flag |
| al03 | Frost Alert | glass | preset | same four | headline, detail, source | bottom-left | Contained panel for a busy picture |
| al04 | Volt Alert | sport | preset | same four | headline, detail, source | bottom-center | Leaning flag, word stood back up |
| al05 | Weather Warning | minimal | preset | same four | warning, area+validity, source | bottom-right | Flag as a full-width CAP |
| al06 | Civil Emergency | minimal | preset | same four | hazard, instruction, source | mid-center | Interrupt card; instruction never dimmed |
| al07 | Technical Notice | minimal | preset | **none** | notice, reassurance | bottom-center | Pale, calm; one level, so no ladder |
| al08 | Service Status | glass | preset | **none** | service, status | bottom-left | Live "as of HH:MM" stamp (30 s repaint) |
| al09 | Breaking Banner | minimal | preset | **none** | kicker, headline, attribution | bottom-center | Kicker is an editable field, not a state |
| al10 | Standby Notice | noacg | preset | **none** | status, statement, when | mid-center | `logo: optional` |

**The severity ramp** (fixed, palette-independent, every pair ≥ 5:1 contrast, always spelled
out as well as coloured):

| Level | Word | Fill | Ink |
|-------|------|------|-----|
| 1 | Advisory | `#1f5fa8` | `#ffffff` |
| 2 | Watch | `#e0a11a` | `#0b0d11` |
| 3 | Warning | `#e0621a` | `#0b0d11` |
| 4 | Emergency | `#cf2f2f` | `#ffffff` |

The level graph is COMPLETE — every level reaches every other one directly, so an operator can
escalate two steps or stand straight down. The change is a hard CUT plus one short
acknowledgement dip (a double dip at Emergency); see §4 for why it cannot be a cross-fade.

### Public information (category `public-info`, prefix `public-info`)

| id | Name | Family | Motion | States / events | Fields | Default zone | Notes |
|----|------|--------|--------|-----------------|--------|--------------|-------|
| pi01 | Public Notice | minimal | preset | — | heading, notice, issuer | bottom-center | The category's reference design; `logo: optional` |
| pi02 | Emergency Instructions | minimal | preset | — | heading, 3 steps, issuer | mid-center | CSS-counter numbering; **step mode reveals one instruction per Continue** |
| pi03 | Source Label | minimal | preset | — | source, qualifier | bottom-right | The smallest graphic; 19 px legibility floor |
| pi04 | Disclaimer Strip | minimal | preset | — | disclaimer, reference | bottom-center | Small print at the floor, not below it |
| pi05 | Municipal Notice | glass | preset | — | heading, notice, reference, issuer | mid-right | Reference + deadline in a chip of its own |
| pi06 | Health Advisory | glass | preset | — | heading, advice, helpline, issuer | bottom-left | Helpline in its own high-contrast band |
| pi07 | Bilingual Panel | minimal | preset | — | 2 × (heading + notice), issuer | bottom-center | Side by side, equal weight, neutral keyline |
| pi08 | Language Rotator | noacg | preset + machine | `lang1` `lang2` `hold` `resume` | 2 × (heading + notice), issuer | bottom-center | Type `public-notice`; 7 s auto-swap |
| pi09 | Notice Rotator | minimal | preset + machine | same four | same | bottom-center | Type `public-notice` |

---

## 3. What was verified, and how

Every claim below is an assertion in `e2e/public-service.spec.ts` unless stated otherwise.

| Requirement | How it is checked |
|---|---|
| **Speed** | The same crawl built at speed 1 and 1.5; the 1.5× track covers > 1.25× the ground in the same window. |
| **Loops** | The live GSAP tween on `#ticker-track` reports `repeat === -1` and `ease === 'none'`; the item set is rendered twice (4 authored → 8 in the track), which is what makes one set-width of travel seamless. |
| **Item lengths** | A 230-character single notice and a 40-item list through a crawl: the box stays inside the frame, the track is wider than its window, and the viewport clips. The same long notice through a ROTATOR does the opposite on purpose: it wraps, the strip grows, and the item stays inside the box. |
| **Multilingual text** | The bilingual crawl splits two translated items and passes an untranslated one through whole; Japanese text survives intact; the item ink is the primary colour, not the dimmed one. |
| **Alert states** | The four levels walked up, down, and two steps at a time. After each event the machine pointer AND the picture agree; exactly one slab is ever painted; the visible level is spelled out and its fill is the expected value. A `stop()`/`play()` replay and a `noacgSnap(null)` visual reset both return to the resting level. |
| **State honesty** | All ten alerts: the six with a flag have four level states and four control buttons; the four without have no machine and no buttons. |
| **Language machine** | Auto-swap with no input; `hold` freezes for longer than a whole cycle; `resume` moves to the OTHER language; the operator can pick directly; `lang1` is structurally illegal exactly while language 1 is up (the same `eventLegality` a control page greys from). |
| **Save / load** | Three machine-bearing graphics saved to the library, the page RELOADED, then read back from storage: still valid, still carrying their groups, their state counts and their control events. |
| **Exports** | All six targets × three graphics = 18 packages. Each builds, carries a code file, loads nothing off the network, and every relative reference it makes resolves to a file inside the package (the dangling-reference class). The severity blocks, the language columns and the ticker track all survive packaging. |
| **Canonical validation** | `validateTemplate` clean (0 errors, 0 warnings) on all 29 — including `validateMachine`, which would error on a timer armed against a timeline that never ends. |
| **Runtime bench** | `e2e/bench.spec.ts`'s calibration tripwire now runs `alert` and `public-info` too: all 29 pass overlap, overflow, stress, hidden-on-stop, binding and the house editability contract. |
| **Category sweeps** | `node scripts/l3-sweep.mjs <dir> alert` (10/10 clean), `public-info` (9/9), `ticker` (20/20, twice). |
| **Baselines** | Source + render baselines re-recorded. No PRE-EXISTING entry moved — the diff is additions only, which is what proves the shared assembler changes were additive. |
| **Look** | `node scripts/pack8-shots.mjs <dir>` renders all 29 settled over a video-like backdrop, plus the severity ramp and the rotator's second language. |

Four real defects were found this way and fixed — two by the spec, two by looking at the
frames:

1. **The resting severity level was never painted.** `.alert-flag > div { opacity: 0 }` is a
   child selector and outranked the one-class `.alert-level-1 { opacity: 1 }` resting rule, so
   a visual reset landed on a blank flag. Caught by the `noacgSnap(null)` assertion.
2. **The severity flag could overflow its own slab.** The level blocks are absolutely
   positioned and contribute nothing to the flag's width, so raising the text size grew the
   word past a slab that never grew with it. `min-width` now follows `--type-scale` as well as
   `--scale`.
3. **al09's grid placed nothing.** Every line the assembler emits is wrapped in an
   `.alert-mask`, so the MASKS are the grid's children — `grid-column` on the spans inside
   them did nothing, and the breaking strap rendered as a stacked column with a centred
   headline. The placement rules moved to positional mask selectors. Nothing mechanical could
   have caught this: the graphic validated, benched and rendered; it was simply the wrong
   picture.
4. **The rotating tickers inherited centred text.** The root's anchor-zone rule sets
   `text-align` from the zone, so a bottom-CENTER rotator centred its item — which turns the
   status rotator's fixed name column into a ragged edge that lines up with nothing. Both
   rotators now set `text-align: left` on their slot. (The four EXISTING rotators, tk07–tk10,
   are deliberately left as they are: changing the shared rotate CSS would move shipped
   designs, which is not this pack's business.)

And one flaky check was fixed in passing: the ticker sweep's marquee-movement test sampled the
transform once at 500 ms — exactly where the half-second fade-in ends — so under load it
reported working marquees as dead, and the failing set changed every run. It polls now.

---

## 4. Design decisions worth knowing

**Why the severity change is a cut and the language change is a fade.** A state's entry
timeline applies each track's FIRST keyframe as a hard `set` at time 0
(`shared/animRuntime.ts` `buildStepTimeline`). A fade is therefore only honest when every
route into the state leaves the layers at the same starting values. With four severity levels
there are three possible predecessors and no truthful single "from", so any fade-out we
authored would first flash a level the graphic is not at — hence the cut. With two languages
there is exactly one predecessor per state, and the graph is authored to KEEP it that way
(there is deliberately no `lang1` arrow out of the entrance), so the fade is correct by
construction.

**Why the two-language rotator has two hold states.** Holding must remember which language it
froze, or resuming cannot know which one to fade to — and a wrong guess is the blink the whole
design avoids. `hold-1` / `hold-2` are pose-only states driven by the same two events, so the
operator still sees exactly two buttons.

**Why the four severity levels are four elements.** A level has to be readable as a WORD:
colour alone fails colour-blind viewers and washed-out encodes, and "red means the worst one"
is a convention nobody is obliged to know. Text is not an animatable property, so the honest
shape is four stacked blocks cross-cut by opacity — each a real registry part
(`model/structure.ts` numbers them like the quiz's answer rows), each with a real editable
track on the timeline.

**Why the emergency level does not pulse.** A looping attention track was designed and
dropped. A repeat makes a state's timeline endless, which would forbid any timer transition
from it (`validateMachine` errors on exactly that), and a flashing warning graphic is a
photosensitivity hazard before it is a taste question. Emergency gets a stronger one-shot beat
instead. The one loop in the pack — tk16's live dot — is 1.8 s, yoyo, floored at 0.35 opacity,
on a 14 px dot, and it is authored as ordinary animation data so the timeline can see it, slow
it, or remove it.

**Why alerts and public information are different categories.** An info card is editorial: the
programme chose to show it. A public-information panel is obligatory, and that changes how it
is drawn — it never omits its source, it never dims the line that asks the viewer to act, and
it is sized to be read once, at speed, by someone who did not choose to read it. An alert adds
urgency on top of that, and urgency is a format, not a style: it leads with a severity flag and
is read in one glance.

---

## 5. Infrastructure limitations

These are constraints of the platform the pack sits on, not defects in the pack. They are
listed because the honest answer to "can it do X" is sometimes no.

1. **Operator events must be bare JS identifiers.** The runtime resolves an event name without
   an expression evaluator (the no-eval posture is absolute), and the shape gate enforces
   `/^[A-Za-z_$][A-Za-z0-9_$]*$/`. So `language-1` is not a legal event and the machine uses
   `lang1`; the operator-facing label comes from `machine.controls` instead. Any future
   type with a hyphenated concept hits the same wall.

2. **A state's entry timeline always starts from a fixed pose.** See §4. This is the single
   biggest constraint on state-driven design: a state entered from several predecessors can
   only CUT or animate a property none of its predecessors touched. Cross-fades are available
   only where the graph is authored so that every route in leaves the same pose.

3. **A parallel group resting at its initial state replays nothing.** So the resting pose has
   to be established twice — once in CSS and once in the entrance step — or a replay keeps
   whatever was last on air. Both new categories carry a `…RestRefine` for exactly this
   (`alertLevelRestRefine`, `piLanguageRestRefine`). A future type with a parallel group needs
   its own, and nothing mechanical will remind the author.

4. **A timer never arms on a timeline that never ends.** This is why the rotating tickers are
   a separate preset from the marquees rather than a flag on them, and why the emergency level
   cannot both pulse and carry a timer. `validateMachine` reports it, so it fails loudly.

5. **Severity words are markup, not fields.** The four level words are hard-coded English in
   the emitted HTML. They ARE editable — the code is the source of truth and the machine keys
   off the class, not the word — but a non-English broadcaster edits the HTML rather than
   typing into the Data panel, and the wizard offers no localisation step.

6. **The two-language designs carry no `lang` attribute.** A correct `lang` would help screen
   readers, font fallback and hyphenation, but the operator can put any language in either
   column, so a hard-coded attribute would be wrong more often than right. Nothing in the field
   model can express "this field's language" today.

7. **Promotion flattens a design's field labels.** A design compiled by a graphic type takes
   the TYPE's field labels, so al05 shows "Headline / Detail / Source" in the wizard where the
   design means "Warning / Area and validity / Source". `TypeDesign.samples` overrides the
   VALUES but not the labels. Both affected designs carry a `semantics` note; the fix is a
   `labels` escape hatch beside `samples`, which is a change to `graphicType.ts` and out of
   scope here.

8. **A rotator's hold time is baked at create.** The ticker type's 3.2 s and the notice type's
   7 s are speed-relative constants in the type declaration. An operator can scale everything
   with the speed knob, but there is no per-graphic "hold each item for N seconds" field —
   that would need a data-driven timer, which the schema does not have (`after` is a literal).

9. **The ticker assembler's third field is positional.** `f2` appears only when a variant
   declares three suggested lines, and the design decides where it goes. There is no way for
   an operator to ADD a cap to a two-field ticker from the Data panel; the data-driven
   categories keep the definition-only add path.

10. **`counter()` output is invisible to script.** pi02's instruction numbers are drawn by a
    CSS counter, and `getComputedStyle(el, '::before').content` returns the specified
    `counter(instruction)` rather than the resolved digit. The spec therefore checks the
    mechanism (reset, increment, painted chip size) and the digits are confirmed by eye in the
    shot script. No test can read them directly.

11. **Packs are not extended.** `src/templates/packs.ts` maps the 60 reference formats onto 12
    packs, and `validatePacks` requires each format to be claimed exactly once. Adding
    `alert-level` or `public-notice` to the Newsroom pack is pure config, but it changes what
    an existing pack ships, so it is left as a deliberate follow-up rather than folded in here.
