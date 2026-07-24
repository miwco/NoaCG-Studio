# Template catalog audit - July 2026

Status: **§6 item 1 (the type floor) and item 2 (the automated gate) are done** - see §7. Every
other finding still stands as written.

Scope: every variant in `src/templates` as of `main` @ `93208ea` (387 catalog entries, 386 with
derived metadata; `imp01` is the import stub). Method: the whole catalog rendered through
`composeDocument` into 1920x1080 iframes, `play()` called, settled 2.4 s, then (a) screenshotted as
per-category contact sheets and eyeballed, and (b) measured programmatically for painted footprint
and computed type size. Facet totals come from `allTemplateMeta()`. Competitor claims come from
vendor pages, cited at the end.

---

## 1. What is actually in the catalog

387 variants across 22 wizard categories, mapping onto 26 taxonomy browse categories. **No browse
category is empty** and no variant failed to render or threw - the catalog is structurally healthy.

Distribution across the browse taxonomy:

| Heavy | n | | Thin | n |
|---|---|---|---|---|
| lower-third | 82 | | sponsor | 2 |
| bug | 41 | | map | 2 |
| scoreboard | 27 | | caption | 3 |
| reveal | 24 | | frame | 4 |
| poll-quiz | 22 | | transition | 4 |
| info | 20 | | cta | 5 |
| question | 20 | | progress | 5 |
| ticker | 20 | | stats | 5 |
| alert | 16 | | product | 6 |
| holding | 13 | | timer | 6 |
| credits | 12 | | title | 8 / list 8 / quote 9 |

Two thirds of the catalog sits in six categories. The thin end is not random: **`frame`,
`transition`, `progress`, `cta` and `sponsor` are exactly the categories that streaming-overlay
vendors lead with** (see §5).

### 1.1 Design count vs variant count

Grouping variants by a structural signature (category + subtype + structure + field schema +
capabilities), 387 variants reduce to **135 distinct designs**. 59 groups are pure style re-skins -
the same design in noacg / volt / frost / clean - covering **200 variants**.

The single largest group is 23 lower thirds that are all "name + role, 2 fields, multi-step".

This measure is coarse: it cannot see that `lt01 Hairline`, `lt02 Underline` and `lt08 Frosted Card`
really are different treatments. But the contact sheets confirm the direction - browsing lower
thirds shows page after page of small dark pill on the left with white text. The catalog reads
smaller than 387.

### 1.2 Facet hygiene

- **153 of 386 variants claim all 60 programme formats.** The format facet therefore cannot
  discriminate for 40% of the catalog. `fitness`, `meditation` and `nature-cam` match only 32
  non-universal templates each; `news-live` and `weather` match 96.
- `plannedCount` in `src/model/wizard.ts` is stale in three places: lower-third says 86 (89 exist),
  info-card says 18 (58 exist), game-timer says 4 (6 exist).
- `live-data` capability is claimed by exactly **1** template in 387.

---

## 2. The biggest quality problem: everything is too small

This is measured, not an impression.

| category | n | median painted width | median smallest type | variants with type < 20 px |
|---|---|---|---|---|
| lower-third | 89 | **22 %** of frame | 17 px | 60 / 89 |
| scoreboard | 20 | 26 % | **14 px** | 16 / 20 |
| esports-score | 7 | 42 % | **12 px** | 7 / 7 |
| results-board | 9 | 35 % | **12 px** | 9 / 9 |
| audience | 20 | 39 % | 13 px | 20 / 20 |
| infographic | 29 | 29 % | 18 px | 24 / 29 |
| info-card | 58 | 36 % | 18 px | 32 / 58 |
| corner-bug | 36 | 12 % | 12 px | 35 / 36 |
| ticker | 20 | 96 % | 16 px | 15 / 20 |
| alert | 10 | 78 % | 15 px | 8 / 10 |
| holding | 13 | 33 % | 24 px | 1 / 13 |
| reveal / matchup / versus | 24 | 100 % | 14-38 px | 22 / 24 |

**283 of 387 variants (73 %) contain at least one text element under 20 px at 1080p. 154 (40 %) go
under 16 px. 47 go to 12 px or below.** Across the catalog there are 816 individual text nodes under
20 px.

Twelve pixels at 1080p is roughly 1.1 % of frame height. On a phone-sized stream window that is not
small type, it is invisible type. On a 1080-line broadcast chain after compression it smears. The
usual working floor for on-air secondary text is 20-24 px at 1080, and 28-32 px for anything a
viewer must read quickly.

Footprint is the same story. Lower-third painted width runs 9 % / 19 % / 22 % / 26 % / 42 % across
the min / p25 / median / p75 / max. A broadcast name strap normally occupies 30-45 % of frame width.
A league standings board at 35 % width (`results-board`) is about half the size it should be. The
scorebugs at 26 % are defensible; their 12 px team-name type is not.

Categories that got this right: **tickers** (96 % width, correct by construction), **alerts**
(78 %), **holding screens** (24 px floor), **reveals / versus / matchup** (full frame).

### 2.1 Second-order visual findings from the contact sheets

- **Holding and break screens have no background.** `ss03`, `ss04`, `ss07`, `ss09`, `ss12`, `ss13`
  render a small card floating on transparency. A "starting soon" graphic is a full-frame scene -
  in OBS the user sees their desktop behind it. Only `ss01`, `ss05`, `ss08`, `ss10`, `ss11` fill
  the frame. Same issue makes `frame` category `fr01` four thin corner brackets and nothing else.
- **The catalog is a visual monoculture.** 137 templates use `backdrop-filter` (the glass panel),
  only 24 use any gradient, 4 use SVG, 0 use canvas, 1 uses `mix-blend-mode`. Nearly every graphic
  is a dark rounded rectangle with a coloured accent bar. There is no photography, no cut-out
  imagery, no texture, no depth, no illustrated shape language.
- Suspected defects worth a look: `bug04 Hairline Bug`, `bug12 Signal Live` and `bug16 Clear Mark`
  render as an almost-invisible outline or a single dash; `cr02 Column Roll` and `cr08 Donor Wall`
  paint a flat mid-grey rectangle that reads as unstyled placeholder rather than design.
- **9:16 and 1:1 are declared but not designed for.** `ASPECTS` offers vertical and square, and
  templates do render at 1080x1920 without breaking - but they keep landscape proportions and sit
  as small islands in a tall frame. A vertical-first live product (TikTok, Shorts, vertical sports)
  cannot use the catalog as-is.

Not measured in this pass: title-safe / action-safe margin compliance, and text-on-background
contrast ratios. Both are worth adding as automated gates (§6).

---

## 3. Do the categories make sense?

Mostly yes. The 26-category taxonomy is coherent, every category is populated, subtypes read
cleanly, and the merge history shows the right instinct (the public-service pack folded onto
existing tiles rather than inventing new ones). Specific issues:

1. **`alert` means two different things.** The taxonomy's `alert` is a broadcast advisory - breaking
   news, weather warning, civil emergency. In the streaming world "alert" means a new follower /
   subscriber / donation / raid notification. A streamer searching "alerts" today lands on a civil
   emergency card. That vocabulary collision needs a decision: either a separate `stream-alert`
   category or an alias that routes the streaming term somewhere sensible.
2. **`sponsor` with 2 templates is a hole, not a category.** Sponsorship is the main reason amateur
   and local sports broadcasts exist at all, and sponsor rotation is a headline feature for LIGR
   and Flowics. Two panels is not a serious offering.
3. **`frame` (4) and `transition` (4) are placeholders.** These are top-three SKUs for every stream
   pack vendor.
4. **Wizard category names and taxonomy tile names still diverge** in places (the wizard has
   "Game show timer", "Versus cards", "Live votes"; the taxonomy has "Timers & clocks", "Reveals &
   matchups", "Polls, voting & quizzes"). `8c8ab2f` aligned two of them; the rest are still split.

---

## 4. Animation: what exists and what is missing

49 presets over 9 motion styles: `reveal`, `slide`, `wipe`, `flip`, `blur`, `pop`, `scale`, `loop`,
`roll`. Intensity spread is healthy (159 subtle / 186 medium / 41 strong).

What the vocabulary cannot currently express - each of these is a standard broadcast or stream move:

| missing | where it matters |
|---|---|
| **Character / word stagger, typewriter, text scramble-decode** | titles, openers, kinetic-type segments; the single most-cited 2026 motion trend |
| **Digit odometer / rolling counter** | scores, donation totals, vote counts, clocks (`count-up` tweens a value but the digits do not roll) |
| **SVG stroke draw-on** | frames, maps, underlines, chart axes, tournament brackets (only 4 templates use SVG at all) |
| **Light sweep / specular shine** | the standard "premium" pass across a sports lower third |
| **Particle / confetti / burst** | winner reveals, goal moments, milestone hits |
| **Glitch, RGB split, scanline** | esports and gaming, where it is the house style |
| **Morph between states** | one graphic changing shape rather than swapping out |
| **Path / arc motion, parallax depth** | anything that should feel 3D without being 3D |
| **Elastic squash-and-stretch** | `pop-spring` is the only springy option |
| **Ambient / idle loops on full-frame scenes** | holding screens currently sit still |

There is also **no video layer at all**: no WebM/MOV alpha playback in a template, which is how the
rest of the industry ships stinger transitions. The four CSS stingers are the whole offering.

---

## 5. What competitors have that we do not

Two distinct markets, and the catalog is currently aimed at neither end fully.

### Broadcast platforms (Singular.live, Viz Flowics, Loopic, LIGR, H2R)

| they have | we have |
|---|---|
| **Flowics: 80+ native data connectors**, Google Sheets, RSS, REST, WebSocket, JSON push | 1 template with a `live-data` capability, no connector layer |
| **Singular: Data Streams, REST API, sub-second data, composition scripting, SDK** | no public API, no data streams |
| **MOS support** for newsroom rundowns (Flowics) | rundowns exist internally (`shows.ts`), no MOS |
| **NDI / SDI output** (Singular Recast, Flowics) | HTML/browser-source only |
| **Aspect-ratio adaptive graphics** (Singular) | aspect presets exist, templates do not adapt |
| **QR / second-screen audience interactivity** (Flowics) | `cta` category has 5 templates, `qr` capability unfiltered |
| **Social content curation, live comments on air** (Flowics) | showchat send-in exists and is genuinely good |
| **Flowics ships 140+ ready templates** | **387** - we already win on count |
| **Loopic: After Effects / Lottie import** | Lottie player bundled; no AE pipeline |
| Loopic exports CasparCG, SPX, LiveOS, H2R, OGraf | same six targets, plus OBS/vMix overlay - **we match or beat this** |

### Stream-overlay vendors (OWN3D ~900 overlays, Nerd or Die, Visuals by Impulse, StreamSpell, Kudos)

Their standard pack contents, and our coverage:

| pack component | our coverage |
|---|---|
| Animated **follower / sub / donation / raid alerts** | **none** - our `alert` is a news advisory |
| **Stinger transitions** (WebM alpha video, multi-colour) | 4 CSS-only |
| **Webcam frames** (16:9 and 4:3) | 4 |
| Scene screens (starting / BRB / ending) | 13, but many have no background |
| **Chat box overlay** | none |
| **Recent-events list / activity feed** | none |
| **Goal bars** (follower, sub, donation) | 5 in `progress` |
| **Emote wall / viewer engagement widgets** | none |
| Stream panels (offline banner, profile panels) | none |
| **One-click install for OBS / Streamlabs / StreamElements** | manual export |
| Stream Deck icon sets | none |
| Matching **sound design** on alerts | none |

Nobody in either camp offers what we do: real editable HTML as the source of truth, a state machine,
a generated control page, and six export adapters, free. That is the moat. The gap is that the
catalog does not yet cover the two audiences' actual shopping lists.

---

## 6. How to become the number one graphics provider

Ordered by impact per unit of work. Items 1-3 are quality debt on what already exists; 4-7 are new
surface.

1. **Fix the type-size and footprint floor across the catalog.** Add a `--type-scale` derived minimum
   and re-record baselines. Target: no text under 20 px at 1080 outside `corner-bug`, and a
   category-appropriate minimum footprint (lower thirds ≥ 32 % width, standings/results ≥ 50 %,
   quiz boards ≥ 55 %). This is the difference between "looks like a demo" and "looks like a paid
   asset", and it touches every screenshot a prospective user ever sees.
2. **Make the readability gate automated.** The video pipeline already has a contrast and
   readability probe (`src/video/validate.ts`, `textChecks.js`). Port the same two checks - minimum
   effective type size and text/background contrast - into `validateTemplate` or the l3 sweep, so a
   new pack cannot land under the floor. Add title-safe margin checking at the same time.
3. **Give full-coverage graphics a real background, and break the glass monoculture.** Holding
   screens, frames and reveals need designed full-frame scenes with ambient motion. Introduce
   gradient meshes, texture, cut-out imagery and at least one non-rectangular shape language so the
   catalog stops looking like one designer's single idea repeated 387 times.
4. **Ship the streaming pack the whole market expects:** event alerts (follower / sub / donation /
   raid) with a queue and sound hooks, a chat box, an activity feed, goal bars, an emote wall, and
   20-30 webcam frames. This is the largest addressable audience we currently serve worst, and every
   component is inside our existing state-machine model.
5. **Add a data layer.** Even a small one closes the biggest platform gap: Google Sheets, a JSON/REST
   poller, and an RSS reader bound to `FieldDescriptor`s, plus sponsor rotation as a first-class
   scheduled behaviour. Flowics sells 80 connectors; three good ones plus "bring your own URL" would
   cover most real use.
6. **Grow the animation vocabulary** with the ten missing classes in §4, and add a real video layer so
   stinger transitions can ship as alpha WebM like everyone else's.
7. **Make vertical a first-class aspect,** not a resolution option - reflowing layouts for 9:16 and
   1:1. Vertical live is where the audience growth is, and no incumbent has solved it well.

Two things to keep doing, because they are already ahead of the field: the export breadth
(six targets including OGraf beats Loopic's five and every stream vendor's zero), and the fact that
every graphic is real, readable, editable code rather than a locked scene.

---

## 7. What has been fixed since this audit was written

**The type floor (§6 item 1) and its gate (§6 item 2).**

Each design whose smallest type sat under its category floor was scaled proportionally: every
scale-aware px literal in the file multiplied by `floor / smallest`, so internal ratios - and the
comments citing them - stay true, and the graphic gains footprint at the same time. Literals at or
above 999 px are left alone: those are anchored to the frame (a near-full-width strip, a 16:9
camera window, the `999px` pill), and scaling them pushed graphics off screen. Four camera frames
and seven strip designs are whole-geometry frame-anchored, so they took a type-only lift.

Measured before -> after, at 1920x1080:

| | before | after |
|---|---|---|
| variants with text under 20 px | 283 / 387 | 37 (all corner bugs, whose floor is 16) |
| variants with text under 16 px | 154 | 1 (the imported-design stub, exempt) |
| individual text nodes under 20 px | 816 | 38 |
| lowest type in the catalog | 8 px | 16 px |

Median smallest type by category: lower-third 17 -> 20, scoreboard 14 -> 20, esports-score 12 -> 20,
results-board 12 -> 20, audience 13 -> 20, poll 13 -> 20, public-info 15 -> 20, infographic 18 -> 20.

Footprint moved as a side effect, without being targeted: esports-score 42 -> 72 % of frame width,
results-board 35 -> 48 %, poll 28 -> 45 %, scoreboard 26 -> 34 %, lower-third 22 -> 25 %. §2's
footprint minimums are therefore still **not** met for lower thirds - that remains a per-category
design pass, because arithmetic scaling alone produces absurd headlines.

`scripts/type-floor.mjs` is the gate: it renders the catalog, fails on any text under its category
floor, and groups violations by CSS rule so one fix clears many variants. It carries one known
exception (`cr09`, whose board shrinks to fit with no lower bound of its own) and one exempt
category (`imported-design`, where the type is the user's).

Verified with: the gate green, `npm run build` green, an overflow sweep showing no graphic escaping
the 1920x1080 frame that did not already do so (tickers and credit crawls scroll past the edge by
design), and a visual pass over the changed categories.

Still open from §6: footprint minimums, backgrounds on full-coverage graphics, the streaming pack,
the data layer, the animation vocabulary, and vertical.

## Sources

- [Singular.live features](https://www.singular.live/features)
- [Viz Flowics](https://www.flowics.com/)
- [Loopic](https://www.loopic.io/)
- [LIGR Systems](https://www.ligrsystems.com/)
- [NewBlue Captivate Sport](https://newbluefx.com/sport/)
- [Nerd or Die overlay templates](https://nerdordie.com/resources/twitch-overlay-templates/)
- [StreamSpell](https://www.streamspell.com/)
- [StreamScheme: best Twitch alerts 2026](https://www.streamscheme.com/best-twitch-alerts/)
- [H2R Graphics](https://h2r.graphics/)
- [SPX Graphics OGraf integrations](https://www.spx.graphics/ograf)
- [Motion graphics trends 2026](https://www.criticatv.com/motion-graphics-trends-how-visual-storytelling-is-evolving-in-2026/)
