# Handoff - h: no dead controls

**Branch:** `claude/h-no-dead-controls` · **Date:** 2026-09-02 · worktree `agent-aff7e4239ab6c8bd0`

Two owner receipts from the 2026-08-28 walk, both about the wizard's Style step offering things
it cannot change. Both are answered. The branch is queued for landing.

## What changed

**The palette bug (the one he called a bug).** Reproduced first, on "Frosted Panel" (card03,
glass, no accent): switching the package from Orchid to Mint changed exactly one thing in the
whole composed preview document, the `--accent` declaration in `:root`, which no rule in that
graphic reads. Frost, Orchid and Mint were one option under three names.

The cause is wider than the accent. The `:root` style contract declares all four colour roles
whether or not a design paints with them, so their presence proves nothing. Measured over all
504 catalog designs: 11 never read `--accent`, 13 never `--text-color`, 97 never `--panel-bg`,
126 never `--text-dim`.

`cssPaintsWith` (`src/blocks/cssVars.ts`) answers whether anything outside `:root` reads a role,
following the alias chain so `--label-color: var(--accent)` counts, and stripping CSS comments
first. The Style step uses it to set the swatch bar's role, collapse packages that differ only in
roles the design ignores, and list only the painted roles under Custom. Deduplication touches 11
designs; 493 keep all fourteen packages.

It is deliberately conservative: a rule that reads a role but matches no element in this
particular draft still counts as painted, because the element arrives when the user adds the
field. Erring this way costs an option that is merely hard to see; erring the other way would
hide a control that works.

**The size questionnaire.** Measured in the browser: moving the viewing target from TV to Mobile,
or the floor from standard to safe, leaves the composed document byte-identical on the template
path. `ViewingControls` is gone from the catalog walk's Style step and stays on the AI step
(where it rides the prompt) and in the editor's Style panel (where a project is re-measured);
the warnings it governs are still drawn on the export panel and the publish sheet. The reasoning,
including why "make it warn here" was rejected, is in `docs/DESIGN_RULES_PLAN.md` §8 with the
veto path named: if the owner wants it back on the walk, Finish is the right home, not Style.

## Verified

- `npm run build` green, twice, most recently on the final tree.
- **CI run 33696289343 fully green on `2e42a2b0`**, this branch's final code state: all nine E2E
  shards ran the FULL suite, plus Build, Factory gates, the Catalog calibration gate and the CI
  gate. Run 33692552213 was the same, green, on the earlier `f4f950aa`.
- Two intermediate runs (33692426006, 33695305937) show as `cancelled`: an ordinary push cancels
  the run in flight and plans only its own diff, which is the trap the root AGENTS.md names. Both
  were replaced by an explicit `gh workflow run ci.yml`, which is what the two green runs are.
- `node scripts/check-catalog-emit.mjs` PASS, 504 designs byte-identical. That is why the five
  rendered catalog sweeps `catalog:affected` names were not run: they measure the render of
  exactly those bytes, and no design's bytes moved.
- Browser: the bug reproduced before the fix and the fix confirmed after, both by reading the
  wizard's own composed preview document across a package change. All twelve packages Frosted
  Panel still offers build twelve different documents.
- The local queued job `j-0382` was still blocked behind another checkout's 58-minute run when
  this was written. CI covers strictly more, so it is the verdict; read `j-0382` if it matters.

## `/check`

- **review: delegated.** The code-review skill ran at level `high`, returned findings on this
  branch's own files, and all five were confirmed against the surrounding code before acting.
  Fixed: (1) a design painting neither an accent nor a panel rendered every package as the same
  rectangle - pi04 "Disclaimer Strip" would have shown eight pixel-identical chips - so the bar
  now carries the loudest painted role and names it in `data-swatch-ink`; (2) `cssPaintsWith`
  counted a `var()` inside a CSS comment as a use, and three shipped designs already write such
  comments; (3) two stale `AGENTS.md` contracts; (4) no memoization on a per-render four-scan
  computation; (5) the spec committed with CRLF.
- **simplify: inline.** The skill returned fan-out instructions rather than a result, so the pass
  was done here over its four angles. Changes: the deduplication map lost a branch and a
  mutation, and the Custom chip's fallback now previews the package its own button would hand
  you. Noted and not taken: `PALETTE_ROLES` duplicates the membership of `PALETTE_VARS` and the
  labels of `STYLE_TERMS`' palette group, but the wizard words two of them differently from the
  editor, and unifying them changes user-visible copy - out of scope for a behaviour-preserving
  pass. A cross-reference comment names the coupling instead.
- **verify:** build green, catalog emit green, CI green on the sha carrying the feature.

## What the next session should know

- **The residue the owner has to rule on.** With the bar showing text instead of an accent, nine
  of the twelve packages Frosted Panel offers are still a dark panel with a white bar and cannot
  be told apart by eye. They are not dead - each builds a measurably different graphic - but they
  differ by two or three units of 255 and a percent of alpha. Collapsing those needs a perceptual
  threshold, which is a taste call. It is written up as the opening of part 2 in
  `docs/backlog/style-step-palettes-match-graphic.md`.
- **The deeper fix that was deliberately not taken.** `rootVarsCss` could stop emitting a role
  the design does not read, the way it already omits `--type-scale`. That would move every
  design's emitted bytes, break the catalog baseline, and remove the extension point a user needs
  to add an accent later in the editor. Reading the CSS at the point of offer keeps the blast
  radius at one component.
- **The wizard instruction chain is at 1226 bytes free** (98.9% of the limit). This branch spent
  244 of them and put the new contract in `src/blocks/AGENTS.md` instead, where the mechanism
  lives. The next thing that needs a paragraph there will not fit; the headroom row the
  orchestrator is holding should land before then.
- `src/components/wizard/AGENTS.md` is shared prose and three sibling sessions were in that
  directory tonight. This branch touched two sentences in it. Watch for a conflict.

## Owner queue

`docs/acceptance/owner-queue/2026-09-02-style-step-no-dead-controls.md` (`kind: walk-p`) - the
route is Frosted Panel then Frosted Card on the Style step, under a minute, and it names the two
judgements he can veto in one read.

## Safe to archive

Yes, once the branch has landed. Nothing here is waiting on a person.
