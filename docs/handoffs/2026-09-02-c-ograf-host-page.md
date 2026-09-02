# Handoff - session C, OGraf host page (2026-09-02)

Branch `claude/c-ograf-host-page`, worktree `.claude/worktrees/c-ograf-host-page`. Row: an
exported OGraf graphic must not restyle the renderer's host page. Owner-authorized by name on
2026-09-01 ahead of P6's entry date. The orchestrator ran the rewind test against this row after
its /check and ruled repair, not rewind; the scope was then cut to the core below.

## What shipped

- `579da11a` - the failing cases first: `e2e/ograf-conformance.spec.ts` mounts an exported
  Graphic in a minimal renderer page served from the package's origin. Red on the pre-fix code:
  host body read back `1920px / 1080px / hidden / transparent / Inter`, paragraph margins zeroed,
  box-sizing flipped.
- `5f2545bb` - the fix in `src/export/targets/ograf.ts`. The decision: re-address the stylesheet
  to the graphic's element rather than drop the page rules (dropping them loses the heading font
  the designs inherit from `body`). `scopeCssToGraphic` rewrites `html`/`body`/`:root` to
  `:where([data-noacg-graphic="<manifest id>"])`, `*` to the element and its subtree, and nests
  every other rule under it - `:where()` so specificity inside the graphic is unchanged and a
  renderer's own rule on the element still wins. The element is the canvas (`GRAPHIC_BOX_CSS`:
  `display: block; position: relative`, the authored box, `overflow: hidden`), the same
  containing-block treatment the editor's authoring mode gives the body. The scoped `document`
  answers `body` and `documentElement` with the element.
- `a0c30ea1` - catalog sweep, calibrated frame bound, backlog receipt deleted, owner-queue item.
- `210d92ed` - `origin/main` (A's landing) merged, clean.
- `592891dc` - first handoff.
- `b6afe4d8` - what /check found, repaired: the FAIL-CLOSED EXPORT GATE (`assertScopedCss`:
  the scoped sheet is parsed by the browser's own parser; the export refuses if a rule would still
  address the document or if the rewrite lost a rule), the two leaks (a comment with an apostrophe
  in a selector list; a brace inside an unquoted `url()`), case-insensitive type selectors,
  `html > body` / `html.dark body` / `body + .x` heads, `:is()`/`:where()` at the head, document
  tokens elsewhere (`.a :not(body)`), `@starting-style`; list-level whitespace; one
  `_claimCanvas(css)` for both mount paths writing ONE stylesheet; one sentinel. Spec: the
  catalog sweep folded into the manifest sweep (one boot, the 180 s budget it already has), the
  mount tests folded into one, the exact fixture holds every shape above and the gate is shown
  refusing. Docs narrowed (below); `src/export/AGENTS.md` names the third mechanism; eight
  backlog receipts.

## The check, honestly stated

Legs and modes: `review: delegated` (angle A line-by-line, B removed-behaviour, C cross-file - all
routed to the orchestrator and relayed), `simplify: delegated` (relayed), `reuse`, `conventions`,
`efficiency`, `altitude`: delegated (relayed). The skill invocations themselves returned "the
finders are running" and fan-out instructions; the results reached this session through the
orchestrator, which is the expected route for a launched session. `verify: inline` - build,
conformance spec, integration plan and CI, this session, on the shas named below.

Applied: A1-A6, B4, B5, B6, C3, AL2, simplify 1-5, reuse 2 and 4, conventions 1-4,
efficiency 1 and 2. Not applied, filed as backlog with the case in each file:
- `docs/backlog/ograf-markup-inline-styles.md` (AL1/B1): only `template.css` is scoped; a
  `<style>` inside imported-SVG markup is injected as written. The current push's road. Needs a
  fixture the catalog sweep cannot produce (`importedDesign` throws on `create({})`).
- `docs/backlog/ograf-body-remap-measurement-frames.md` (C1): CAUSED BY THIS BRANCH - the body
  remap splits `stretch.ts`'s measurement across two frames when a renderer offsets its stage.
- `docs/backlog/ograf-child-combinator-holder.md` (C2): `body > .x` matches nothing under the
  holder div; the exact fixture no longer pins the child form.
- `docs/backlog/ograf-render-characteristics-box.md` (AL4/B2): the box is authored-size and
  `load()` ignores `renderCharacteristics`; the manifest's `ideal` promise holds only if the
  renderer scales the box. The rendering decision, stated plainly in OGRAF.md and the owner-queue
  item rather than deferred: authored-size today, a renderer places and scales it.
- `docs/backlog/ograf-scoped-document-members.md` (AL5): the proxy's member list has no gate.
- `docs/backlog/css-rule-walker-shared.md` (reuse 1): fifth hand-rolled walker; hoisting adds
  import edges outside this row.
- `docs/backlog/ograf-e2e-mount-helper.md` (reuse 3 + efficiency 3): nine inline mount
  sequences, and a Node-side `pixelmatch`/`pngjs` comparison - both outside this row's files.
- AL6: checked, no action - the design-id attribute is the right key; a per-instance id would not
  lift the one-instance-per-design limit (GSAP string selectors resolve through the real document).
- Efficiency 4: checked and clean - the walkers are linear, the lead regex cannot backtrack
  catastrophically, scoping runs once per export.

AL3 (the boundary should be a shadow root or an iframe, not a parser) is the orchestrator's
design row. The evidence from here: with `root = this.shadowRoot` every `scopedDocument` member
works unchanged, the only rewrite left is `html|body|:root -> :host`, and a missed shape degrades
to a lost rule inside the graphic instead of a restyled renderer; it also closes the INBOUND leak
(host CSS reaching in), which this branch leaves as it was. The counter-argument is Chromium
ignoring `@font-face` inside a shadow tree (checker X-08); the answer is lifting `@font-face`
rules into `document.head` once per design id, the way `ensureGsap` lifts its script. GSAP,
Lottie, `getComputedStyle` and `document.fonts` work on shadow trees. On the altitude report's
claim that `:where()` WIDENS the inbound leak: it does not. `:where()` contributes zero
specificity, so `p {}` was (0,0,1) before and `:where([x]) p` is (0,0,1) after; a host `.layer p`
at (0,1,1) beat it both times. The inbound leak is pre-existing and unchanged; no case was found
where the rewrite lowers a selector's specificity.

## Evidence held here and in no repo file

- Rendered comparison: the mounted Graphic against the studio's own document
  (`composeDocument`), same browser, same ground, 1920x1080 clip. Fixed code: **0 differing
  pixels**. Mutation - the inherited `font-family` dropped from the remapped body rule, i.e. the
  "delete the body rule" alternative: **10,204 differing pixels**. Bound 1,000. Mutation reverted
  through an edit; the exporter matched its commit before the sweep ran.
- A first mutation attempt used a `sed` regex whose parentheses lost their escaping; it matched
  nothing and measured 0 - caught because 0 could not be the mutated value. A
  `git checkout -- ograf.ts` to undo it also threw away the then-uncommitted fix, re-applied from
  the session's own edits. Edit and revert through the editor, never through git, and commit the
  fix before mutating it.
- Conformance spec on `b6afe4d8`'s tree: 10 passed (16.9 s), queued form, after two reds that
  were mine (the first `<style>` in the element was the box rule, so the existing font test read
  the wrong sheet - hence one stylesheet from `_claimCanvas`; and the gate refused
  `:is(S, S .x) .y`, hence the head-pseudo criterion).
- Earlier, on `210d92ed`: `npm run test:e2e:integration:queued` 94 passed in 1.4 min over bridge,
  control, exports, local-relay, offline, ograf-conformance, ograf-contract, ograf-starters,
  package, production-gate, shows, template-pack-10 (plus hosted-control from main's side); CI
  run 33636927586 success - Build, Factory gates, E2E plan, E2E 1/2 and 2/2 (subset), Combined
  E2E report, CI gate ran; Vercel and the catalog calibration gate skipped by plan. On the final
  sha: `4ac6230e` (D's landing merged in, clean): `npm run build` green (stamp `claude/c-ograf-host-page@4ac6230e6c`), `npm run test:e2e:integration:queued` 454 passed in 6.5 min (the plan widened to the whole affected set because D's landing touched `package.json`). CI on the pushed sha: read after the push, recorded by the queue job - see `npm run jobs`.
- `npm run build` on `210d92ed` green (stamp `claude/c-ograf-host-page@210d92edbb`).

## Traps

- `npm run check:ograf-schema` dies on import in a shared tree (ajv 6 installed, ^8 declared);
  this worktree ran `npm install` first. Not touched by this branch.
- The machine's browser guard widened mid-session (D's landing): wrapped Playwright spellings are
  refused; the `:queued` forms stay exempt and are all this session used.
- Chromium paints a srcdoc iframe opaque when the host's and the document's `color-scheme`
  disagree; the renderer fixture carries `<meta name="color-scheme" content="dark">`.
- `assertScopedCss` needs `CSSStyleSheet` and throws where there is none: every package path is
  in a browser (the app, the bridge page, the starters emitter drives Chromium), and the
  `check:ograf-schema` script never builds a module. A future Node caller of `graphicModule`
  will hit that error by design - the gate is fail-closed, not skip-when-absent.
- Chrome serializes `:where([data-noacg-graphic="x"])` back exactly, which the gate's
  `startsWith(self)` relies on; a renderer's parser is not involved (the gate runs at export).

## UNVERIFIED

- No round against SuperFly.tv's ograf-server on this branch: no renderer on this machine. The
  minimal host page in the spec stands in for it; the next renderer round should include this.
- A renderer whose viewport differs from the authored canvas: not measured on a real renderer
  (`docs/backlog/ograf-render-characteristics-box.md`).

## Needs the owner

Nothing blocking. Owner-queue item: `docs/acceptance/owner-queue/2026-09-02-c-ograf-host-page.md`.

## Pointers

Commits `579da11a`, `5f2545bb`, `a0c30ea1`, merge `210d92ed`, `592891dc`, `b6afe4d8`, and the
docs commit carrying this file. Check stamp `.git/noacg-jobs/checks/claude-c-ograf-host-page.json`.
`/queue-merge` is the session's last action after this commit, so the job id is in `npm run jobs`.
