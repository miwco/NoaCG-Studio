# OGraf export (EBU Open Graphics, v1)

NoaCG Studio exports any graphic as an **OGraf v1 Graphic** - the EBU's open standard for
web-based broadcast graphics. This page is for the engineer who has to load one of our packages
into their renderer: what we emit, what maps to what, and where the limits are.

## The free starters page (`/ograf`)

**<https://noacg.studio/ograf>** hands out six curated catalog graphics as free OGraf starter
packages - the shareable answer to "we want editable base templates to teach our staff on"
(the Yle ask, 2026-08-20; `docs/GOALS.md` "the SVG road"). It is a public, indexable page
(`ograf.html` + `src/ograf/`, vanilla TS): the card copy is static, and each download is built
**by the real exporter at click time** - `ografTarget.build()` on `variant.create()` - so a
starter can never drift from what the product ships, and every package passes the same
schema gate below on its way out. The one addition over an ordinary export is **GUIDE.md**
(`src/ograf/guide.ts`): the modification walkthrough - how to load it, drive its data, restyle
the `:root` contract, and edit the `NOACG_ANIM` motion - generated from the template itself.
The starters are exported with LIVE intent (the post-production gate rightly refuses
content-driven motion such as the ticker's crawl). Pinned by `e2e/ograf-starters.spec.ts`,
including that every named card still resolves against the catalog - a design rename must
break that spec, not the page.

- Specification: <https://ograf.ebu.io/v1/specification/docs/Specification.html>
- Manifest schema: <https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json>
- Spec version targeted: **v1**. There is no vendor dialect - a package is plain OGraf. The one
  NoaCG-specific thing a manifest may carry is the standard's own extension mechanism:
  `v_`-prefixed vendor fields. Every export writes a per-property `v_noacg.kind` hint inside
  `schema` (the control kind the property came from, since the JSON-schema type is a 3-way
  collapse) and a per-action `v_noacg` (the button's section / destructive flag / adjust deltas); the **dual
  graphic package** (`src/export/noacgPackage.ts`, docs/AGENT_CLI.md) additionally writes a root
  `v_noacg` block naming the graphic TYPE, the editable SPX-layout SOURCES shipped beside the
  component, and their content hash. Any renderer ignores all of it; NoaCG's reader
  (`src/export/targets/ografImport.ts`, `src/model/importTemplate.ts`) uses it to re-import the
  package losslessly and to tell a stale generated half from a fresh one.

The same package is also the **LiveOS (NetOn.Live)** export; that target is this package with
NetOn.Live install steps in its README, because the LiveOS HTML5 graphics engine is
OGraf-compliant.

## What is in the package

```
<graphic>/
  <graphic>.ograf.json     the manifest (the entry point)
  graphic.mjs              default-exports the Graphic Web Component class
  lib/gsap.min.js          bundled GSAP (no CDN, ever)
  lib/lottie.min.js        only when the graphic uses a Lottie animation
  fonts/*.woff2            every face the CSS references
  images/*                 the graphic's own assets, at the paths its markup uses
  FIELDS.md                the data contract: id -> field -> type -> default
  FONT_LICENSES.md         OFL 1.1 + the per-font copyright notices
  README.md                how to load it
```

Everything is referenced relatively and nothing is fetched from the network at runtime. The
package is validated before it is written: an invalid manifest, or a manifest naming a file the
package does not contain, fails the export rather than shipping.

## The manifest

| Field | What we emit |
| --- | --- |
| `$schema` | the exact OGraf v1 schema URL |
| `id` | `noacg-<slug>` - a legal custom element name (see below) |
| `version` | `"1.0.0"` |
| `name` / `description` | the graphic's name and its SPX template description |
| `main` | `"graphic.mjs"` |
| `supportsRealTime` | `true` unless the export was made post-production-only |
| `supportsNonRealTime` | `true` when the export declares post-production intent (see below) |
| `stepCount` | the number of steps on the graphic's default path |
| `schema` | one property per data field, keyed by its SPX id (`f0`, `f1`, …) |
| `customActions` | one action per operator event the graphic's state machine declares |
| `actionDurations` | play/stop/update durations in ms, read off the graphic's own timeline |
| `renderRequirements` | the authored resolution and frame rate, as `ideal` constraints |

**`schema`** is the public state model. Each property carries `type` (`string`, `number` or
`boolean`, from the field type), `title` (the operator-facing label), a `default` typed to match,
`enum` for a dropdown, and `hidden: true` for an SPX hidden field. The keys are ids, not labels -
`FIELDS.md` in the package is the table that translates them.

**`renderRequirements`** states the canvas the graphic was designed for as `ideal`, never `exact`.
It is a declaration, not a refusal: the graphic scales, and an exact constraint would tell a
1080p renderer to reject a 4K-authored graphic that would have rendered fine.

**`actionDurations`** are measured, not estimated. Our timeline is data (`NOACG_ANIM`), so the
entrance, each step, and the exit all have a known length; the value is speed-corrected into
milliseconds. Custom actions are declared `-1` (dynamic) because how long one takes depends on
which state the machine is in when it fires. A graphic whose motion is hand-written GSAP that we
cannot read emits no `actionDurations` at all - the spec's answer to "unknown" is silence, not a
guess.

## The Graphic Web Component

`graphic.mjs` default-exports a class extending `HTMLElement`. It embeds the graphic's own
runtime unchanged - the same `play()` / `stop()` / `update()` / `next()` an SPX host would call -
and maps the OGraf actions onto it.

| OGraf | What happens |
| --- | --- |
| `load({data, renderType, renderCharacteristics})` | injects the CSS + markup into the element (light DOM), loads GSAP, runs the graphic's own script, applies `data`. Resolves when the graphic is ready for actions. |
| `playAction({goto, delta, skipAnimation})` | first call plays the entrance (step 0); further calls walk the default path with `next()`. Returns `currentStep`, or `undefined` once the graphic has gone to the end. |
| `stopAction({skipAnimation})` | plays the exit. |
| `updateAction({data, skipAnimation})` | writes the changed fields. Data never causes a state change - that is a house rule and an OGraf one. |
| `customAction({id, payload, skipAnimation})` | fires that operator event through the graphic's own serial event queue. An unknown id answers `400`. |
| `dispose()` | kills tweens, clears the element. |
| `goToTime({timestamp})` | non-real-time only - see below. |
| `setActionsSchedule({schedule})` | non-real-time only - see below. |

Contract details worth knowing:

- **Every method returns a `ReturnPayload`** - `{statusCode, statusMessage?, currentStep?}` -
  and never rejects. An action before `load()` resolves, or after `dispose()`, answers `409`; an
  internal failure answers `500` with the message. A renderer can log a status code; it cannot
  log an unhandled promise rejection.
- **Concurrent calls are honoured, in arrival order.** The spec requires a Graphic to accept an
  action while a previous one is still pending. All actions run through one internal chain, so
  two updates issued back to back land in the order they were sent rather than racing.
- **`skipAnimation` lands the action instantly.** The action still happens; it just arrives at
  its settled frame with no tween. The graphic's own runtime does this natively (it composes any
  state's pose with animation callbacks suppressed), so a skipped play is pixel-identical to a
  finished one.
- **Steps are our default path.** A NoaCG graphic is a state machine whose main group has an
  ordered walk; step `i` of that walk owns timeline `i`. That walk *is* the OGraf step model, and
  it is the same ordered walk SPX and CasparCG drive with Continue - one contract, three hosts.
  A graphic with a branching machine still degrades to that walk: an operator who only ever
  presses play/next/stop gets a coherent graphic.
- **Custom actions are structurally guarded.** An event only fires if the author drew that arrow
  from the state the graphic is currently in. An illegal event is dropped along with its payload;
  the action still answers `200`, because "the operator pressed a button that does nothing right
  now" is not a transport error. The returned `currentStep` tells you where the graphic actually
  is.

## Non-real-time (offline) rendering

Export the graphic with post-production intent and the manifest advertises
`supportsNonRealTime: true`, which obliges `goToTime()` and `setActionsSchedule()`. Seeks are
deterministic: each one rebuilds an isolated document and replays the schedule against a virtual
clock, so asking for 5.6 s, then 0.12 s, then 5.6 s again gives the identical frame all three
times.

That mode is gated by a conservative compatibility check, and the export is refused with the
reason if the graphic uses anything a virtual clock cannot own: wall-clock CSS animations,
`Math.random()`, Web Animations API calls, `<video>`/`<audio>`, a live network dependency, or a
timeline we cannot read. Better a refusal at export than a render farm producing frames that
disagree with each other.

## Known limits

- **`thumbnails` only where a raster exists.** The spec allows a preview image per Graphic. The
  in-app export does not rasterise one, so hosts that show a preview tile show a placeholder
  there; the `noacg` CLI's `validate --screenshots` (docs/AGENT_CLI.md) shoots the settled on-air
  frame and writes it into the dual package as `thumbnail.png` + the manifest's `thumbnails[0]`.
- **No `author`.** A graphic in NoaCG has no author field to fill it from; adding the tool's own
  name there would misdescribe what the field means.
- **`id` is `noacg-<slug>`**, not a reverse-DNS name and not the bare slug. The spec only says an
  id is any unicode except `/`, but a renderer may register the Graphic as
  `customElements.define(manifest.id, class)` - SuperFly.tv's OGraf server does - and the HTML
  standard requires such a name to start with an ASCII lowercase letter and to contain a hyphen.
  The prefix supplies the hyphen whatever the design is called, survives a name that starts with
  a digit, keeps the id clear of HTML's reserved element names, and gives the namespace the
  spec's reverse-DNS recommendation is really after. Folder and file names keep the plain slug,
  the way SPX and CasparCG expect. **Uniqueness comes from the NAME, not from a separate id
  register.** No two CATALOG designs share a name (five pairs had drifted together by
  2026-08-19 and were renamed; `e2e/catalog-baseline.spec.ts` holds the rule), but a production
  reaches two same-named graphics the ordinary way - by adding one design twice, which is what
  a show does the moment it needs two straps of one look. The
  whole-show export resolves that by suffixing the graphic's name (`House Ident 2`) before any
  target packages it, and the id derives from that same renamed template - so the folder, the
  file and the manifest id carry the suffix together (`house_ident_2/`, `noacg-house-ident-2`).
  Keep the id derived from `template.name`: giving it its own source would let the folder and
  the id disagree, and a repeat id makes a renderer's `customElements.define(manifest.id, class)`
  throw before the second graphic is ever mounted. Pinned by `e2e/ograf-conformance.spec.ts`.
- **Custom action durations are `-1`.** Honest rather than wrong: the length depends on the
  machine's current state.
- **Light DOM, not shadow DOM.** The graphic's markup is injected into the element directly so
  its own `getElementById` lookups behave exactly as under SPX. Host page CSS that targets bare
  element selectors could therefore reach into a graphic; our own CSS is class-scoped per graphic.
- **One instance of a given DESIGN per document.** Several *different* graphics in one document
  are fine, which is the arrangement a Web Component renderer actually uses: each Graphic runs
  against a `document` scoped to itself, so its `getElementById('fN')` lookups cannot reach a
  neighbour's identically-named field, and disposing one leaves the others running. Two instances
  of the *same* design still collide, because the design's motion is keyed on its own class names
  and those are shared by both copies. Give the second copy its own document or frame.
- **`graphic.mjs` is an ES module**, so a renderer must load the package over `http(s)` - browsers
  refuse module imports over `file://`. Our single-file targets (CasparCG, OBS/vMix, H2R) are the
  ones that run from a bare file on disk.

## What an external renderer said

Conformance checked against our own reading of the spec proves only that we read it the way we
wrote it. On **2026-08-18** an exported package was loaded into a renderer nobody here wrote:

- **SuperFly.tv's [OGraf Simple Rendering System](https://github.com/SuperFlyTV/ograf-server)**,
  the "play OGraf Graphics in a browser" server the EBU's own repository README points at. Built
  from source and run locally: package uploaded through its zip endpoint, the renderer page opened
  in a browser, and every action driven through the server's HTTP control API rather than by
  calling our class directly.
- Separately, every manifest the catalog can emit - **1470 of them**, each design in all three
  export intents - was validated against the **EBU's published JSON-Schema files** with a real
  JSON-Schema engine (ajv, draft 2020-12) instead of our transcription of them.

### What it refused, and what changed

Three defects. Every one of them passed our own gate, and two were invisible rather than loud.

1. **The manifest `id` was not a legal custom element name.** The renderer registers a Graphic
   with `customElements.define(manifest.id, class)`, and the HTML standard requires such a name to
   start with an ASCII lowercase letter and contain a hyphen. Our ids were the graphic's slug -
   lowercase with underscores - so the load failed with
   `"hairline" is not a valid custom element name` before the Graphic was ever mounted. **No NoaCG
   package could load in that renderer at all.** The spec does not say an id must be usable this
   way, but every example graphic the EBU ships has a hyphen in its id, and the reverse-DNS form
   the spec recommends has one too. Ids are now `noacg-<slug>`, and the export gate refuses an id
   `customElements.define` would reject.
2. **Bundled fonts and images resolved against the renderer's directory, not the package.** A
   Graphic is a component inside somebody else's document, so the injected CSS's
   `url("fonts/inter.woff2")` was requested from `/renderer/renderer-layer/fonts/inter.woff2`.
   It 404'd, `font-display: swap` painted the fallback, and the graphic aired in Arial with no
   error anywhere - `document.fonts` reported `Inter: error` and nothing else did. Under SPX and
   CasparCG that same relative path is correct, because there the template *is* the document,
   which is why nothing local had ever caught it. Every relative reference in the injected CSS and
   markup is now resolved against the package's own URL before injection.
3. **Two graphics in one document wrote into each other.** The renderer mounts every layer as a
   Web Component in one document - the arrangement the standard exists for. Our field convention
   is one element per field addressed as `getElementById('fN')`, and those ids are the same in
   every design, so `document.getElementById('f0')` answered with whichever graphic came first:
   updating the Public Notice on layer 1 rewrote the Hairline on layer 0, while the notice's own
   field kept its default. The prior claim here - that different designs cannot collide because
   each carries its own class prefix - was true of the CSS and false of the fields. Each Graphic's
   runtime now runs against a `document` scoped to its own element (the template's code is
   unchanged; only the `document` it sees is), and `dispose()` no longer kills tweens
   document-wide.

### What it confirmed

With those fixed, driven entirely through the external server's API:

- `load` with data, `playAction` walking the default path (`currentStep` 0, then 1, then absent
  once the graphic has gone past the end), `updateAction`, `stopAction`, and `customAction` for a
  graphic whose machine declares `escalate` / `standDown` - all answering `200`.
- `skipAnimation` accepted on play, stop and custom actions.
- An unknown custom action answered **`400`** and our own message came back through the foreign
  host verbatim: `This graphic defines no custom action "no-such-action".`
- The bundled Inter face fetched from inside the package and reported `loaded`.
- Two different graphics on two layers updated independently, each keeping its own field values.
- All 1470 manifests valid against the EBU's schema files. The ajv harness was mutation-tested
  first, so "0 rejected" is a result and not a harness that accepts anything: a vendor field
  without the `v_` prefix, a missing `main`, a `default` typed against its property, a `null`
  where a number belongs, an unknown constraint key, a fractional duration and `stepCount: -2`
  were each rejected with the expected message.

### 2026-08-22: the dual package, in the same renderer

The agent door's workspace (`docs/AGENT_CLI.md` - one folder that is the SPX package AND an OGraf
package, the manifest carrying `v_noacg`) was put through the same server: scaffolded and validated
by the `noacg` CLI against a dev server, zipped, uploaded through the zip endpoint, the renderer
page opened in a browser, every action driven through the HTTP control API. Upload `200` and the
graphic listed as `noacg-football-scoreboard`; the served manifest carried `name`, three
`customActions` (then `flag`, `clearFlag`, `final`; the scoreboard type now exports `goalA`/`goalB`/`clearFlag`/`final`, the goals carrying their score as a schema property and the `+1` as `v_noacg.adjust`) and the `v_noacg` block untouched; `load` with data,
`updateAction`, `playAction`, all three custom actions, `stopAction` and `clear` answered `200`;
the unknown action answered `400` with our message; the frame showed the updated score in the
bundled Inter, so the package-relative font resolved from inside the package. The SPX-layout
sources beside the manifest are simply ignored by the renderer, as the design intends. The walk
also found the bug the gate could not: a scaffold named with `--name` carried the design's own
name in its sources, so the first `validate` regenerated under a second slug and the folder held
two manifests - fixed at the source (the name now lives in `<title>` and the definition), with the
CLI removing a previous name's generated pair when the graphic is retitled.

Two things this round could **not** settle. The renderer drops a Graphic's instance when the layer
is cleared, so it never calls an action after `dispose()` - the `409` for that case remains our own
guarantee rather than something this host exercised. And the community **OGraf DevTool** could not
be run here: it serves graphics through a Service Worker, which the browser used for this round
would not register.

## How conformance is checked

Not by review. `src/export/targets/ografSchema.ts` transcribes the published JSON Schema (all
seven files of it) into a validator, and it runs on every OGraf and LiveOS export before the
manifest is written. `e2e/ograf-conformance.spec.ts` then proves three things on every CI run:

1. every graphic in the catalog produces a manifest with zero violations, in all three export
   intents;
2. the validator actually refuses the mistakes the spec is strict about (an un-prefixed vendor
   field, a `default` typed against its property, a duplicate action id, a duration for an action
   that does not exist, a `main` the package does not contain) **and the ones a renderer is strict
   about that the schema is not** - an id `customElements.define` would reject;
3. a real exported package, served over HTTP and driven like a renderer would drive it, honours
   the lifecycle - including `skipAnimation`, concurrent calls, and the status codes for calling
   an action too early or after `dispose()`;
4. that package's injected CSS points at the package for its fonts and images rather than at the
   host page, and two different graphics mounted in one document leave each other's fields alone.

Items 2 and 4 exist because an external renderer found what the transcription could not: a rule
the schema does not encode is still a rule the operator sees broken. The external round itself is
not automated - it is a hand check whose result is the section above, to be repeated when the
generated Web Component or the manifest changes shape.
