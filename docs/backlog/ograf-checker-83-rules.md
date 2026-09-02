# The ograf.dev 83-rule package checker: the private pass, per rule

**Filed:** 2026-08-29. **Run:** 2026-08-29, all six `/ograf` starter packages plus one
post-production package. **Source:** the OGraf ecosystem research round
(`docs/OGRAF_ECOSYSTEM.md` §1d).

## Why this exists

The community's de-facto definition of a *complete* OGraf package is Felipe Iasi's 83-rule
checker at <https://ograf.dev/check> (MIT, <https://github.com/ficosta/ograf>) - it checks well
past the EBU schemas (lifecycle timing, shadow-DOM compatibility, relative-URL safety,
README/LICENSE/preview presence, font licensing, 14 sandboxed runtime rules). The EBU schema
stays the export gate; this is the polish-and-credibility layer above it, and the tool is
**evidence, not authority** - it is one person's project and says so in its own footer.

**The contribution half - a CI-runnable `npx` form of the rules - is OUTREACH and stays gated**
behind working OGraf playout per the owner's 2026-08-29 ruling (`docs/OGRAF_ECOSYSTEM.md` §5).
This pass was private: nothing was listed, submitted, or reported to anyone. Safe to repeat -
the checker is **fully client-side**. Its only outbound request is a read-only GET of the
published EBU schema; the zip is unpacked with JSZip in the page, the runtime sandbox serves the
bytes from an in-memory service worker, and sharing a report encodes it into the URL *fragment*,
which never reaches a server.

## How to repeat it

```bash
node scripts/ograf-starters-emit.mjs --unpack               # the six starters, as the page builds them
node scripts/ograf-starters-emit.mjs --usage post-production   # the only packages that declare non-real-time
```

Then drop each zip on <https://ograf.dev/check> and press **Run in sandbox** for the runtime
rules. The emit script exists because the page builds packages at CLICK time, which is right for
the page and useless for checking; it runs the real exporter through Rolldown + one Chromium
page, in seconds, and it serves `public/` over HTTP so the bundled fonts are actually fetched
(see its header - an about:blank page silently produces fontless packages).

## The result

| | before | after |
|---|---|---|
| errors (static) | 0 | **0** |
| warnings | 6, or 8 with custom actions | **3** |
| info | 7 | 7 |
| runtime errors | 0, or one per custom action | unchanged - see R-12 |

Identical on all six starters. Three warnings were fixed at the source; the three that remain,
and every info, are argued below rather than patched around.

### What changed (three fixes, each right on its own merits)

1. **`fonts/FONT_LICENSES.md`, not a root `FONT_LICENSES.md`** (`src/export/common.ts`). Fixed
   S-07 **and** A-03 - both rules scan for a licence path *under `fonts/`* and cannot see a root
   file, so every NoaCG folder package read as an unlicensed font drop while carrying a perfectly
   good notice one directory up. The move is what OFL 1.1 §2 actually wants: the licence binds to
   the redistributed font software, so it should survive somebody lifting `fonts/` into another
   project. Applies to every folder package, SPX included.
2. **`schema: null` on a custom action that takes no parameters** (`src/export/targets/ograf.ts`).
   Fixed M-06. Not a concession to the tool - the **published** EBU schema
   (`lib/action.json`) says it in words: *"If the action does not require any parameters, set this
   to null."* We were omitting the field, which leaves a host unable to tell an action that needs
   no input from one whose author forgot to describe it.
3. **`async` on the eight generated lifecycle methods** (`src/export/targets/ograf.ts`). Fixed
   C-04. Behaviour was already conformant - every method returned `_serial()`'s Promise - so this
   makes the contract legible in the signature instead of only to a reader who follows `_serial`.

Verified after the change: all twelve rebuilt manifests still pass our export gate, and
`schema: null` is accepted by the published schema file quoted above, not merely by our
transcription of it.

## The 83 rules, one by one

Verdict vocabulary: **pass** - the checker reported it green. **n/a** - the rule's precondition
does not occur in our packages (it emits nothing). **argued** - it fired and we are not changing
the export; the reason is in the note. **fixed** - it fired and the export changed.

### Manifest (M, 19)

| Rule | Verdict | Note |
|---|---|---|
| M-01 missing manifest | pass | |
| M-02 not valid JSON | pass | |
| M-03 schema violation | pass | validated against the LIVE EBU schema the checker fetches, agreeing with our own gate |
| M-04 customAction missing `name` | pass | Match Strip / House Hold; n/a for the four without actions |
| M-05 duplicate customAction id | n/a | our validator refuses these before export (`e2e/ograf-conformance.spec.ts` item 2) |
| M-06 customAction has no schema | **fixed** | now emits `schema: null` - the spec's own words for "takes no parameters" |
| M-07 no `description` | pass | we emit the template description |
| M-07 no `author` | **argued** | a graphic in NoaCG has no author to fill it from, and writing the tool's name there would misdescribe the field (`docs/OGRAF.md` "Known limits"). Info only |
| M-07 no `thumbnails` | **argued** | see S-06 - a browser cannot rasterise the graphic at click time |
| M-07 no `license` | **argued** | see S-05 |
| M-08 `main` not in package | pass | |
| M-09 valid semver | pass | `1.0.0` |
| M-10 `$schema` not current | pass | we emit the exact published URL, and `check:ograf-schema` watches it weekly |
| M-11 no supported render mode | n/a | every export declares at least one |
| M-12 `id` contains a slash | pass | |
| M-12 `id` not reverse-domain | **argued** | see below - the recommendation is a trap as usually written |
| M-13 `main` not `.js`/`.mjs` | pass | `graphic.mjs` |
| M-14 `stepCount` below minimum | pass | |
| M-15 `author` has no `name` | n/a | no `author` |
| M-16 duplicate/dangling actionDuration | pass | |
| M-17 unsatisfiable render requirement | pass | we declare `ideal`, never `min`/`max` |
| M-18 thumbnail format/existence | n/a | no `thumbnails` |
| M-19 manifest filename | pass | `<slug>.ograf.json` at the package root |

### Data schema / GDD (G, 16)

| Rule | Verdict | Note |
|---|---|---|
| G-00 well-formed | **pass** | the single green finding that stands for all of G-01..G-15 - field types, gddType constraints and defaults all check out, on every package |
| G-01..G-15 | n/a | none fired. G-00 is emitted only when zero other G findings were produced, so this is a positive result rather than silence |

Worth recording: we do not yet emit `gddType` at all (the review's §5 item 1). The GDD rules that
police `gddType` therefore cannot fire, which is why this category is quiet rather than proven.
When `gddType` adoption lands, G-03..G-08 and G-11 become live and this row must be re-run.

### Package structure (S, 10)

| Rule | Verdict | Note |
|---|---|---|
| S-01 single top-level folder | pass | |
| S-02 main module not declared | pass | |
| S-03 referenced asset missing | pass | |
| S-04 README present | pass | exact-name match, and ours is `README.md` |
| S-05 no LICENSE at root | **argued** | info only. A licence file at the root of an EXPORT would assert a licence over the user's own graphic, which is not ours to declare - and the package also carries bundled GSAP, so a blanket `MIT` would be wrong about its own contents. The fonts' licence, which we DO owe, now travels in `fonts/`. A curated `/ograf` starter is the one case where we could honestly ship one; that is a product decision, in the handoff |
| S-06 no preview image | **argued** | see the preview note below |
| S-07 fonts without a licence file | **fixed** | |
| S-08 OS junk | pass | |
| S-09 large file | n/a | nothing over 1 MB |
| S-10 multiple manifests | pass | one |

### Graphic module (C, 9)

| Rule | Verdict | Note |
|---|---|---|
| C-01 default export extends HTMLElement | pass | |
| C-02 six lifecycle methods | pass | |
| C-03 self-registers customElements.define | pass | we never do - the renderer picks the tag |
| C-04 non-async lifecycle methods | **fixed** | |
| C-05 top-level document/window access | **argued** | FALSE POSITIVE, see below |
| C-06 asset URLs from `import.meta.url` | pass | `PACKAGE_BASE`, the fix the 2026-08-18 renderer round forced |
| C-07 external / bare-module imports | pass | none - GSAP is loaded from inside the package |
| C-08 relative asset URL inside innerHTML | pass | every reference is absolutised against the package before injection |
| C-09 non-real-time pair when declared | pass | verified on the post-production package: both methods present |

### Styling (X, 10)

**Read this row before reading the table.** The checker's styling rules scan `.css` files plus
any `<style>` block *inside the main module*. Our package has no `.css` file, and the module
contains exactly one `<style>` - the one inside `OFFLINE_DOCUMENT`, the isolated iframe document
used only for non-real-time seeks. So **every X finding below was made against a document the
graphic wholly owns**, and none of them was made against `TEMPLATE_CSS`, the stylesheet that is
actually injected into a renderer's page. The checker cannot see that one, because it is a JSON
string rather than markup.

| Rule | Verdict | Note |
|---|---|---|
| X-00 no stylesheet | pass | |
| X-01 `position: fixed` | pass | |
| X-02 remote `@import` | pass | nothing is fetched from the network, ever |
| X-03 remote `@font-face` | pass | |
| X-04 `body` selector | **fixed 2026-09-02** | The finding as located (the offline document) was correct; the same concern was real for the injected light-DOM CSS the checker never inspected, and that is what shipped: `scopeCssToGraphic` in `src/export/targets/ograf.ts` re-addresses the package's stylesheet from the document to the graphic's own element (`html, body` and `:root` become the element, `*` its subtree, every other rule nested under it at zero specificity), the element is the 1920x1080 canvas (`display: block; position: relative; overflow: hidden`), and the template's `document.body` / `documentElement` resolve to it. Host page untouched and the frame pixel-identical to the studio's, both pinned by `e2e/ograf-conformance.spec.ts`. Owner-authorized 2026-09-01 ahead of P6's entry date ("No dates are blocked") |
| X-05 font-family without generic fallback | **argued** | FALSE POSITIVE: the only declaration is `font-family: var(--font-heading)`, and `--font-heading` resolves to `"Inter", Arial, sans-serif`. The checker does not resolve `var()` |
| X-06 `!important` | pass | |
| X-07 no positioned elements | pass | |
| X-08 `@font-face` portability | **argued** | info. Advisory about Shadow DOM; we mount in light DOM deliberately (`docs/OGRAF.md` "Known limits"), and in the offline document the graphic owns the whole page |
| X-09 relative `@import` | pass | |

### Assets (A, 5)

| Rule | Verdict | Note |
|---|---|---|
| A-01 preview image not 16:9 | n/a | no preview image ships |
| A-02 preview over 500 KB | n/a | |
| A-03 shipped font has no licence | **fixed** | same fix as S-07 |
| A-04 consider WebP | n/a | |
| A-05 unrecognised extension | pass | |

### Runtime (R, 14) - which ones actually executed

The sandbox is opt-in behind a consent click. It ran on all six live packages and on one
post-production package. **Eight of the fourteen produced a verdict**; the rest emit nothing
unless something goes wrong, so their silence is the pass.

| Rule | Executed? | Verdict |
|---|---|---|
| R-01 module did not import | ran, silent | the module imported on every package |
| R-02 `load()` 2xx | **yes** | **pass**, 12-19 ms |
| R-03 `playAction()` 2xx + numeric `currentStep` | **yes** | **pass**, ~1 ms, `currentStep: 0` |
| R-04 `updateAction()` 2xx | **yes** | **pass**, <1 ms |
| R-05 `stopAction()` 2xx | **yes** | **pass**, ~1 ms |
| R-06 unknown customAction returns 4xx | **yes** | **pass** - but see R-12: this rule cannot fail for anyone |
| R-07 `dispose()` 2xx | **yes** | **pass**, <1 ms |
| R-08 uncaught errors | ran, silent | none |
| R-09 unhandled rejections | ran, silent | none - the `_serial` chain's whole purpose |
| R-10 per-call timing + return | **yes** | info, one per call; every return exactly the documented `ReturnPayload` |
| R-11 call slower than budget | ran, silent | nothing came near a budget (loosest 5000 ms, ours <20 ms) |
| R-12 each declared customAction succeeds | **yes** | **error - argued, a defect in the harness. See below** |
| R-13 `setActionsSchedule()` 2xx | **yes**, post-production only | **pass** |
| R-14 `goToTime()` 2xx | **yes**, post-production only | **error - argued. See below** |

## The three findings we are NOT changing, argued

### R-12: the harness passes the action id in the wrong place

Every declared custom action fails, on every package that has one, with our own message coming
back through the checker: `This graphic defines no custom action "undefined"`.

The checker calls, from `apps/dev/src/components/check/RuntimePanel.tsx`:

```js
customAction("<id>")  ->  { payload: { action: ca.id, data: ca.defaultData } }
```

The published EBU v1 specification defines:

```ts
customAction: (params: { id: string; payload: unknown; skipAnimation?: boolean } & VendorExtend)
  => Promise<ReturnPayload | undefined>
```

The id is a **top-level `id`**, not `payload.action`. The harness sends no `id` at all, so a
spec-conformant Graphic sees `undefined` and correctly answers 400. **There is no way to pass
R-12 without reading the action id out of a place the standard does not put it**, and doing that
would mean our graphics accept an action id from two sources - exactly the kind of quiet
vendor dialect the "no vendor dialect" rule in `docs/OGRAF.md` exists to prevent.

The same defect makes **R-06 vacuous**: it asserts that an unknown action returns 4xx, but the
harness never sends a valid id to any graphic, so every graphic returns 4xx and every graphic
passes. Our 400 is right for the right reason; the rule did not test it.

This is the single most useful thing the pass found, and it is a contribution candidate the day
outreach opens. It is not one today.

### R-14: the harness omits a `load` parameter the spec requires

`goToTime()` answers 409 with `goToTime() requires load({renderType:"non-realtime"}).` The
smoke sequence calls `load({ data })`. The spec's signature is:

```ts
load: (params: { data: unknown; renderType: "realtime" | "non-realtime";
                 renderCharacteristics: RenderCharacteristics } & VendorExtend) => ...
```

`renderType` carries no `?` - it is required. We default a missing one to `realtime` (forgiving
rather than refusing the load outright), and then refuse a seek against a real-time mount, which
is the honest answer: the non-real-time path rebuilds an isolated document against a virtual
clock, and running it after a real-time load would produce frames that disagree with each other -
the exact failure `docs/OGRAF.md` says the post-production gate exists to prevent. Defaulting to
`non-realtime` instead would mis-load the package in every real-time host that also omits the
parameter, which is a far worse trade. R-13 (`setActionsSchedule`) passes because it does not
depend on the render type.

### C-05: a text-position heuristic, not a fact about the module

The rule slices the source at the first `class ... extends HTMLElement` and greps the part before
it for `document.` or `window.`. Everything it matches in `graphic.mjs` is inside a function body
(`ensureGsap`, `scopedDocument`, and the template's own runtime inside `initTemplate`), none of
which runs at import time. The statements that DO execute on import are two function
declarations, some string constants, and `new URL('./', import.meta.url)`. The rule's stated
concern - "the module runs as soon as it is imported, possibly before the renderer has attached
the element" - does not apply.

Moving the helpers below the class would silence it, and that is precisely why we are not doing
it: it would be a reordering performed to defeat a scanner, at the cost of the readable
helpers-then-class order the generated code is meant to have.

### M-12: reverse-domain ids, and why the recommendation is a trap

Info-level: the spec *recommends* reverse-domain ids. Ours are `noacg-<slug>`, and that is not an
oversight - it is the fix for a defect a real renderer found on 2026-08-18, when no NoaCG package
could load anywhere because SuperFly.tv's server does `customElements.define(manifest.id, class)`
and the HTML standard requires such a name to start with an ASCII lowercase letter **and contain
a hyphen**. A reverse-domain id written the obvious way - `studio.noacg.hairline` - has no hyphen
and throws before the graphic is ever mounted. The checker's own example
(`com.your-company.noacg-hairline`) happens to contain one, which hides the trap. Our prefix
supplies the hyphen whatever the design is called, survives a name starting with a digit, and is
the namespace the recommendation is really after in the only shape a browser can register.
Changing it would also break re-import and every renderer registration for no functional gain.

### The preview image (S-06, M-07 thumbnails, A-01)

Not a disagreement - a limit, already recorded in `docs/OGRAF.md`. A `/ograf` package is built in
the browser at click time, and a page cannot rasterise a cross-document iframe, so there is
nothing to put in `preview.png`. The `noacg` CLI's `validate --screenshots` already shoots the
settled on-air frame into the dual package as `thumbnail.png` + `thumbnails[0]`, so the capability
exists where a real renderer is available. Shipping previews with the starters is a product
decision, sized in the handoff.

## Still open

- The checker cannot join CI (browser-only, no npm package, no CLI), so this pass is a hand
  check. The `npx` form is the contribution, and it is gated.
- `npm run check:ograf-schema` could not be run locally in this worktree: `package.json` declares
  `ajv@^8.20.0` but only `ajv@6.15.0` is installed in the shared tree, so the script dies on
  import. CI installs cleanly; a local run needs `npm install` first.
