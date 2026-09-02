# Handoff - session C, OGraf host page (2026-09-02)

Branch `claude/c-ograf-host-page`, worktree `.claude/worktrees/c-ograf-host-page`. Row: an
exported OGraf graphic must not restyle the renderer's host page. Owner-authorized by name on
2026-09-01 ahead of P6's entry date.

## What shipped

- `579da11a` - the failing cases first: two `e2e/ograf-conformance.spec.ts` tests mount an
  exported Graphic in a minimal renderer page served from the package's origin. Red on the
  pre-fix code: host body read back `1920px / 1080px / hidden / transparent / Inter`, paragraph
  margins zeroed and box-sizing flipped.
- `5f2545bb` - the fix in `src/export/targets/ograf.ts`. The decision: re-address the
  stylesheet to the graphic's element rather than drop the page rules (dropping them loses the
  heading font the designs inherit from `body`). `scopeCssToGraphic` rewrites `html`/`body`/
  `:root` to `:where([data-noacg-graphic="<manifest id>"])`, `*` to the element and its
  subtree, and nests every other rule under it - `:where()` so specificity is unchanged inside
  the graphic and a renderer's own rule on the element still wins. The element is the canvas:
  `display: block; position: relative; width/height at the authored resolution; overflow:
  hidden` (`GRAPHIC_BOX_CSS`), the same containing-block treatment the editor's authoring mode
  gives the body. The offline frame gets the same box. The scoped `document` now answers
  `body` and `documentElement` with the element, which closes three reads that were reaching
  the host page (`importedDesign/stretch.ts` `--scale` and `body.clientWidth`, the
  `stageFit.ts` probe). `src/ograf/guide.ts` and `docs/OGRAF.md` say where `:root` went;
  checker row X-04 records what shipped.
- `a0c30ea1` - a third test sweeps every catalog design's CSS through the rewriter (10,835
  rules, none left addressing the document) and pins the rewriter's exact output on a
  hand-written sheet; the frame comparison's bound is calibrated; backlog receipt deleted;
  `docs/PROGRAMMES.md` P6 carries the owner's date ruling; owner-queue item written.
- `210d92ed` - `origin/main` (A's landing) merged in, clean.

## Evidence held here and in no repo file

- Rendered comparison (step 3): the mounted Graphic against the studio's own document
  (`composeDocument`), same browser, same ground, 1920x1080 clip. Fixed code: **0 differing
  pixels**. Mutation - the inherited `font-family` dropped from the remapped body rule, i.e.
  the "delete the body rule" alternative: **10,204 differing pixels**. Bound set at 1,000.
  Both runs were in this session, queued form, and the mutation was reverted through an edit
  (the exporter matched its commit before the sweep ran: `ograf.ts == HEAD`).
- The mutation was first attempted with a `sed` regex whose parentheses lost their escaping;
  it matched nothing and measured 0 - caught because 0 could not be the mutated value. A
  `git checkout -- ograf.ts` to undo it also threw away the then-uncommitted fix, which was
  re-applied from the session's own edits and typechecked before the commit. Lesson for the
  next mutation: edit and revert through the editor, never through git, and commit the fix
  before mutating it.
- Specs run, all queued form: `ograf-conformance` new tests ("own page", "same frame",
  "rewriter is exact") - red, then green, 12-14 s each run. Then `npm run test:e2e:integration:queued` from the fork point on the merged tree: 94 passed in 1.4 min over bridge, control, exports, local-relay, offline, ograf-conformance, ograf-contract, ograf-starters, package, production-gate, shows, template-pack-10 (plus hosted-control from main's side). Its "configured deployment" note points at A's teams spec on main, not at this branch's files.
- CI run 33636927586 on `210d92ed`: success. Jobs that ran: Build, Factory gates, E2E plan, E2E 1/2 (subset), E2E 2/2 (subset), Combined E2E report, CI gate; skipped by plan: Vercel accepted the commit, Catalog calibration gate.
- `npm run build` on the merged tree `210d92ed`: green (stamp
  `claude/c-ograf-host-page@210d92edbb`, prerender 502 pages, secret scan OK).

## Traps

- `npm run check:ograf-schema` dies on import in a shared tree (ajv 6 installed, ^8 declared);
  this worktree ran `npm install` first. Not touched by this branch.
- The machine's browser guard widened mid-session (D's landing): wrapped Playwright spellings
  are refused; the `:queued` forms stay exempt and are all this session used.
- Chromium paints a srcdoc iframe opaque when the host's and the document's `color-scheme`
  disagree. The renderer fixture carries `<meta name="color-scheme" content="dark">` to match
  `composeDocument`'s meta, or the reference frame is a white stage.
- The in-test CSS walk blanks string contents before reading preludes; the expected selector
  must be blanked the same way (its attribute value is a string). First run reported every
  rule as a leak for that reason.

## UNVERIFIED

- No round against SuperFly.tv's ograf-server on this branch: no renderer on this machine.
  The minimal host page in the spec stands in for it. The 2026-08-18 round's findings were
  all the same shape, so the next renderer round should include this one.
- A renderer whose viewport is smaller than the authored canvas now sees the graphic laid out
  against its own 1920x1080 element (clipped at the element's edge) rather than against the
  viewport. That is the "element is the canvas" decision, made on purpose: `renderRequirements`
  declares the canvas, and a renderer that sizes layers itself overrides the zero-specificity
  box with any rule of its own. Not measured on a real renderer.

## Needs the owner

Nothing blocking. The owner-queue item is
`docs/acceptance/owner-queue/2026-09-02-c-ograf-host-page.md`.

## Pointers

Commits `579da11a`, `5f2545bb`, `a0c30ea1`, merge `210d92ed`. Check stamp:
review: inline (the code-review skill answered "the finders are running" - a later notification that never reaches a launched session), simplify: inline (the skill returned fan-out instructions), verify: inline (build + integration plan + CI on `210d92ed`, nothing changed after). Stamp at `.git/noacg-jobs/checks/claude-c-ograf-host-page.json`.. Queue: /queue-merge is the session's last action after this commit, so the job id cannot be in this file - `npm run jobs` shows it..
