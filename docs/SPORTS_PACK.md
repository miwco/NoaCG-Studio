# The sports pack

Twenty production graphics across five graphic types, in all four style families, covering what a
live sports broadcast actually puts on air — from a district-league phone stream to a stadium
show.

Companion docs: **`GRAPHIC_TYPES.md`** (what a type declares and the six promotion gates),
**`STATE_MACHINE_SCHEMA.md`** (the machine the stateful types carry),
**`PACK_TAXONOMY.md`** (how the discipline packs sit in the taxonomy),
**`DESIGN_LANGUAGE.md`** (the taste bar each family is judged against).

---

## 1. What shipped

| Type | Category | Designs (noacg · sport · glass · minimal) | Machine |
|---|---|---|---|
| **Scorebug** | scoreboard | sb05 · sb06 · sb07 · sb08 | parallel `clock` / `play` / `result` |
| **Match board** | scoreboard | sb09 · sb10 · sb11 · sb12 | parallel `clock` / `play` / `result` |
| **Match status** | scoreboard | sb13 · sb14 · sb15 · sb16 | one `status` group, three states |
| **Match event** | scoreboard | sb17 · sb18 · sb19 · sb20 | main path + `held` branch + auto-clear timer |
| **Fixtures & results** | infographic | ig26 · ig27 · ig28 · ig29 | – (derived) |

The matrix is full: every type ships in every family, so any pack may pick any family and
`resolvePack` never hits an empty cell.

### Three types were dropped rather than shipped

An earlier draft also declared `lineup`, `standings` and `stat-compare` (sixteen designs). While
this pack was in flight, main shipped the **competition pack**, which already covers all three:

| dropped | main already ships | main's carries |
|---|---|---|
| `lineup` | **`roster`** (rs01–rs03) | a spotlight the caster moves |
| `standings` | **`standings`** (st01–st04) | a highlighted row and a final state |
| `stat-compare` | **`head-to-head`** (h201–h203) | a side the operator can highlight |

`standings` was a straight id collision; the other two would have been near-identical second
types for the same graphic. Main's live on the `results-board` prefix with the `comp-*` presets,
so "porting" this pack's designs onto them would have meant re-authoring every selector, field
contract and preset — for looks main mostly already has. **One graphic, one type** is the premise
the registry rests on, so they were dropped.

Two genuine gaps remain in main's matrix and are worth a follow-up: `roster` and `head-to-head`
have **no glass design** (rs01–rs03 and h201–h203 cover sport, noacg and minimal only).

### Coverage against the brief

| Asked for | Where it lives |
|---|---|
| Compact scorebugs | **Scorebug** (sb05–sb08) |
| Full scoreboards | **Match board** (sb09–sb12) |
| Score + clock | Scorebug and Match board — the clock is a field, the clock GROUP runs it |
| Period / half / quarter / set | The `period` field, plus the Match board's repeating breakdown |
| Team names, logos and colours | Names are fields on every board; two `color` fields on all eight two-team designs; two `filelist` crest slots on the Match board |
| Local / amateur boards | The **minimal** column throughout — sb08, sb12, sb16, sb20, ig29 — plus the `club-sports` pack |
| Match status | **Match status** (sb13–sb16), the `status` group |
| Final scores | The same type's `final` state — a result is a status, not a separate graphic |
| Substitutions and penalties | **Match event** (sb17–sb20) |
| Player / team stats | Main's **`head-to-head`** (h201–h203) — see the dropped-types note above |
| Lineups and rosters | Main's **`roster`** (rs01–rs03) |
| Standings | Main's **`standings`** (st01–st04) |
| Results | **Fixtures & results** (ig26–ig29) |
| Upcoming match | Fixtures with no score typed; a single row reads as a next-match board |
| Match centre | Assembled as a RUNDOWN, not one graphic — see §6 |

---

## 2. The capability matrix

Every shared type the pack uses or extends, and what it gained. "Extended" means the existing
contract grew an optional seam; "used unchanged" means the pack is a consumer only.

| Shared type / module | Status | What the pack uses | What it gained |
|---|---|---|---|
| `GraphicType` (`types/graphicType.ts`) | **extended** | structure · fields · machine · controls · capabilities · designs | `TypeMachine.main.edges` — main-group arrows that are neither a path rename nor a branch's own, for the match-event auto-clear timer. Main invented the identical seam independently for its transition type; on merge this pack took main's version. |
| `TypeField` roles | used unchanged | `line` (visible), `data` (colours, crests, the repeating source), `hidden` (none) | – |
| `TypeField.kind` | used unchanged | `text` · `lines` · `color` · `image` | – |
| `TypeGroup` (parallel groups) | used unchanged | `clock` (3 states) · `play` · `result` · `status` | – |
| `TypeBranch` | used unchanged | the match event's pose-only `held` | – |
| `TypeEdge` (`trigger: 'timer'`) | used unchanged | the match event's 7-second auto-clear | – |
| `TypeControlEvent` | used unchanged | 6 clock/match buttons, 3 status buttons, 2 card buttons | – |
| `assembleScoreboard` (`scoreboards/shared.ts`) | **extended** | the whole scoreboard scaffold, score-pop, data-region conversion | `SbDesign.fields` (design-owned SPX fields), `.popFields` (which fields pop), `.lineCount` (masks the presets choreograph), `.runtimeExtraJs` (design-owned JS outside the marked region). All optional; a design declaring none emits byte-identically. |
| `assembleInfographic` (`infographics/shared.ts`) | used unchanged | design-owned fields + `runtimeExtraJs` were already the contract | – |
| `shared/clock.ts` (countdown engine) | used unchanged | not used — a match clock is a different instrument (see §3) | – |
| **`shared/matchClock.ts`** | **new** | the sports clock: up or down, start/stop/reset, operator-correctable, state markers | – |
| `infographics/dataRuntimes.ts` | used unchanged | the doctrine and the agenda/poll runtimes | a pointer to its sports sibling |
| **`infographics/sportsRuntimes.ts`** | **new** | the fixtures/results repeating-data rebuild | – |
| **`scoreboards/boardRuntimes.ts`** | **new** | team-colour lift onto `--team-a` / `--team-b`, the period breakdown rebuild | – |
| `lowerThirds/animPresets.ts` | used unchanged | slide family · mask-wipe · line-reveal · snap-stinger · pop-spring · blur-in · fade · flip-3d | – |
| `infographics/igPresets.ts` | used unchanged | `rows-cascade` · `bars-grow` | – |
| `infographics/igMotion.ts` | used unchanged | `infographicRowsCascade` · `infographicBarsGrow` — both measured from the rendered rows | – |
| `shared/base.ts` `setFieldValue` | used unchanged | text into text, image paths into `<img id="fN">`, `.has-image` on the parent | – |
| `model/themeTokens.ts` | used unchanged | panel blur/radius/shadow/keyline, accent weight/glow/ink, label face/tracking/colour, display weight/tracking | – |
| `model/wizard.ts` `CATEGORIES` | **updated** | discovery placement | scoreboard `plannedCount` 2 → 20, infographic bumped for the fixtures boards, both descriptions rewritten |
| `templates/packs.ts` | **extended** | pack config over the filled matrix | 9 discipline packs; Match Day widened to the sports types; `formats: []` documented for discipline packs |
| `export/registry.ts` (6 targets) | used unchanged | SPX · HTML overlay · h2r · CasparCG · OGraf · LiveOS | – |
| `control/` (the control layer) | used unchanged | fields → inputs, machine events → buttons, structural guard → greying | – |
| `validation/validateTemplate.ts` | used unchanged | the export gate, run on all 20 | – |
| `blocks/animMachine.ts` | used unchanged | `deriveMachine` · `validateMachine` · `spxSteps` · `allOperatorEvents` | – |
| `templates/shared/animRuntime.ts` | used unchanged | the NOACG_ANIM interpreter + the machine engine | – |
| `model/library.ts` · `packets.ts` | used unchanged | save / load / packages — a sports graphic is an ordinary `GraphicDoc` | – |

Nothing in the editor, the timeline, the Inspector, the canvas or the exporters needed a change:
the pack is 32 ordinary catalog variants and 8 ordinary type declarations.

---

## 3. The four decisions worth defending

### The clock is an instrument, not a countdown

`shared/clock.ts` counts a fixed number of minutes down to zero and stops. A match clock is a
different thing, and the difference is what the pack's own runtime (`shared/matchClock.ts`)
exists for:

- **It counts both ways.** Football counts up to 45:00; basketball, ice hockey and handball
  count down and the period ENDS when the clock does. The direction is a DESIGN decision
  (`data-count` on the clock element), so an operator can never pick the wrong one.
- **The operator owns the value.** The clock element IS a data field, so typing `43:12` into
  the control page re-seeds the running clock. Every live clock drifts from the stadium's, and
  one that cannot be corrected stops being trusted. Without the re-seed, the next tick a second
  later would overwrite the correction and the fix would look broken.
- **Reset is a separate operation, and it never assumes zero.** `resetMatchClock` returns to the
  element's own `data-start`, so a period that runs from 12:00 resets to 12:00 — the same "reset
  is two operations" rule the state machine holds for visual state and data.

### The clock group has three states, not two

`armed` · `running` · `stopped`. The third one is not decoration: before kick-off and after a
reset the clock sits at the period's starting value and is not running, which is a different
fact from being paused mid-period. Without it, starting the second half means reloading the
graphic. A parallel group's initial state never plays its timeline at `play()`, so arming costs
nothing on air.

### Everything a sport differs about is DATA

There is no football scorebug and no tennis scorebug. There is one scorebug, and the sport is
what the operator types:

- the period is a field (`1H`, `Q4`, `SET 3`, `ROUND 5`);
- the clock's direction is a design choice, so the four family designs already cover both;
- the period-by-period breakdown is ONE repeating field, `label | home | away` — which is
  identical for basketball's quarters, ice hockey's periods and tennis's sets;
- a fixtures row and a result row differ only by whether a score was typed, so one board serves
  the weekend preview and the round-up.

This is the state model's "parameterize with data, not states" rule applied one level up, to
the catalog itself. Eight types cover eight sports because the sports differ in their data, not
in their machines.

### The amateur column is designed, not degraded

sb08, sb12, sb16, sb20 and ig29 are the same TYPES as the stadium designs,
with the same fields and the same machines — drawn for different conditions:

- **full club names, not three-letter codes**, because a district league has no codes;
- **no blur, no glow, no gradient**, because those cost quality at the bitrates a club stream
  actually goes out at, and the graphic is often re-encoded again by whoever screenshots it;
- **an empty crest is the normal state**, so the placeholder is a deliberate mark in the club's
  colour rather than a gap.

An amateur club is not offered a lesser scorebug. It is offered the same one, drawn for its own
conditions.

---

## 4. The repeating-data contract

Every list graphic in the pack uses the canonical system (`infographics/dataRuntimes.ts` holds
the doctrine, `sportsRuntimes.ts` the pack’s own shape):

| Board | Source shape | Optional parts |
|---|---|---|
| Fixtures | `when \| home \| result \| away` | the result (its absence IS the fixture state) |
| Match board periods | `label \| home \| away` | – |

One hidden textarea, one item per line. A weekend's fixtures are not a field per match, and a
period breakdown is not a field per quarter — which is what keeps both editable live from a
control page on a phone. Each runtime escapes operator text before it reaches `innerHTML`, and
SKIPS a malformed line rather than rendering an empty row: a half-typed row must not reach air.

The fixtures rows land in `#infographic-rows`, one direct child per item, which is exactly what
the shared `rows-cascade` builder measures — so no new motion code was needed.

---

## 5. What is tested

`e2e/sports.spec.ts`, 13 tests. `e2e/graphic-types.spec.ts` already covers the shape bar for all
five types; this file covers what is specific to a live sports graphic.

| Test | What it pins |
|---|---|
| five types, twenty designs, every family cell | the matrix stays full, so packs never hit an empty cell |
| the clock runs, holds, resets | both directions; a held clock does not drift; reset returns to the PERIOD's start, not zero |
| the operator can correct the clock on air | a typed value re-seeds the tick, and counting continues FROM it |
| a counting-down period stops itself at zero | and restarting a spent clock is a no-op, not negative time |
| state groups move independently | a score change moves no pointer; three events in one tick land in three groups; the result group refuses a repeat |
| the status card walks live → interval → full time | and refuses to walk back |
| the event card holds and clears | `hold` takes it out of the auto-clear timer's reach; `next` clears it |
| rapid score updates | 40 updates in one tick all land, the last wins, and no score is left frozen mid-pop |
| long club names | the three fixed strips do not change height AT ALL under a 36-character name; nothing leaves the frame |
| a missing crest | shows the placeholder, not a broken image, and set-then-cleared returns cleanly |
| the repeating boards rebuild | valid rows render, markup is escaped to text, junk lines are skipped, an empty source empties the board |
| export | all 20 designs through all 6 targets |
| machine pairing | every machine-bearing design ships a machine-aware interpreter and derived steps |

Two real defects were found by writing these and fixed:

- **`text-wrap: balance` silently defeats `white-space: nowrap`.** The scoreboard assembler's own
  `.scoreboard-mask > span` rule sets it, and it resolves to `text-wrap-mode: wrap` at one
  specificity step above a plain class — so long club names wrapped and grew the fixed strips by
  ~56px mid-match, looking exactly as though the nowrap had never been written.
  `clipOneLineCss()` in `scoreboards/scorebugShared.ts` is the fix, and documents the trap.
- **The fixed-strip guarantee was per-field, not unconditional.** Clipping only the team name
  left the period, the clock and the score able to wrap. A strip that is only fixed for some of
  its fields is a weaker promise than it looks; all four are now clipped.

Also run: `npm run build` (typecheck + lint + dependency-cruiser + build), the full Playwright
suite, and both catalog baselines re-recorded. The RENDER baseline — the one that must not move —
gained 32 entries and changed none, so no existing graphic's look shifted. The SOURCE baseline
moved on exactly four pre-existing entries (sb01–sb04) and only their `js`, from the match-clock
extraction; their html and css are byte-identical.

---

## 6. The match centre, and what is deliberately NOT here

A match centre is not one graphic. On air it is a sequence — the versus card for the fixture,
the match board for the state, main's roster and head-to-head boards, the fixtures board for
the rest of the round — and the product already has the unit for that: a **rundown** (`model/shows.ts`,
`docs/CONTROL_LAYER.md`), which gives the set one aggregated control page.

So the pack ships the PARTS and the packs that bundle them, rather than a single board that
would duplicate four existing graphics and be worse than each. The upcoming-match hero is the
existing **versus card** (vs01 / vs02), which already carries two team names, two logo slots and
an event/date line; it is listed as an `extras` entry on the football, racket-sports and
combat-sports packs for exactly that reason.

Not attempted, and why:

- **A live data feed.** Nothing here polls an API. Every value is typed or pushed through
  `update()`, which is what makes the graphics work identically in the editor, under SPX, in an
  OBS overlay and in the hosted control page. A feed adapter is a separate concern that belongs
  outside the template.
- **Sport-specific scoring logic.** No template computes a tennis tie-break, a handball
  suspension countdown or a cricket run rate. The operator types what is true. A graphic that
  guessed at competition rules would be wrong for most competitions, and silently.
- **Automatic ordering.** Fixture rows keep the order they were pasted in, for the same reason:
  a board that re-ordered on a guess would be confidently wrong.

---

## 7. The discipline packs

Nine new packs in `templates/packs.ts`: `football`, `ice-hockey`, `basketball`, `handball`,
`racket-sports`, `motorsport`, `athletics`, `combat-sports`, `club-sports`. Match Day was widened
from the old generic scoreboard to all eight sports types.

Each is the same five types cut for one sport's habits — which clock direction, whether score is
kept in periods or sets, how its clock runs — plus the supporting
graphics that sport uses, in a fitting default family (sport for the stadium codes, glass for the
indoor and individual ones, minimal for club and school).

They declare **no reference formats**, on purpose. The reference sheet counts FORMATS, and it has
one row for "Sports broadcast / match coverage" and one for "Local sports / amateur sports" —
both already owned by Match Day. A tennis kit is not a new format; it is the same format cut for
a sport that keeps score in sets. Claiming a format twice is a taxonomy error the pack validator
catches, and inventing rows the sheet does not have would make its count meaningless.
