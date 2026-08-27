# Handoff - the wizard door, from every surface

Branch `claude/n-wizard-anywhere`. Landed through `/queue-merge`. Everything below is measured.

---

## What the owner asked for

> *"I don't get there fast enough from other views."*

His model of the bar: the **logo** goes to the public front page, **Home** goes to your work, and
a third control makes something new. That model only held on Home and in the editor.

## What changed

**`src/components/NewGraphicButton.tsx` is now THE door to the wizard**, and all five shells mount
it: Home, the SPX editor, the per-graphic control page, the **production dashboard** and the video
shell. It always routes (`#/new`) and always goes through the unsaved-changes guard
(`store/saveActions.ts` `requestSwitch`, a no-op on a clean document).

The five buttons it replaced had already drifted, which is why this is one component and not a
sixth button:

- the **production dashboard had no door at all** - the only route was the rail's
  "＋ New graphic for this production…", below the rundown;
- the **video shell** opened the wizard through the store FLAG (`openGallery()`), not the route,
  so browser Back could not close it;
- **only the editor's** went through the unsaved-changes guard.

`productionId` is the one option: on a production surface the wizard pre-applies that show's look
and preselects it on Finish (the same one-shot `pendingProductionId` the rail button uses).
Standing inside a production, a new graphic that did NOT join it would be the surprise.

### Placement

Adjacent to that surface's Home door where there is one - in **both** editor shells the door is
the control immediately before **Home** (pinned by spec, not by eye). On the production
dashboard, which has no Home button, it is the first control after the spacer: far from
**■ All out**, because a hand reaching for the panic control must never land on navigation. It
stands down under 900px alongside Export, for the same reason Export does - the narrow header is
the operator's, not the author's.

### The Home page button: KEPT, unified

Home's top-right **+ New graphic** stays where it is and stays `primary`. It is the page's main
call to action and Home has no Home button to sit beside. It is the same component now, so the
guard and the routing cannot drift from the other four; only the styling differs. Its testid
(`home-new-project`) and the control page's (`control-new-project`) are unchanged, so no existing
spec moved. Everywhere else the door is `data-testid="new-graphic"`.

## Verification

- `npm run build` green (typecheck, lint, all gates, 369 node tests).
- `e2e/project.spec.ts` gained **"the wizard door is on every /app surface, beside Home"**: it
  seeds a graphic and a show, then walks the door on Home, the control page, the production
  dashboard, the editor and the video shell - visible, routes to `#/new`, and **Back closes it**
  (which is what the video shell could not do before). Then it asserts DOM adjacency to `open-home`
  in both editor shells.
- Ran queued and green: `project` + `flows` (10), `library` + `control` + `productions` + `layout`
  + `advanced-mode` (70), `keyboard` + `timeline-v2` (28), `video-project` (13).
- `scripts/e2e-affected.mjs` gained a MAP row for the new file. AppShell and `styles.css` are
  already CORE so the escalation happened anyway; the row records which specs OWN the door for a
  later refactor that touches only this file. `node --test scripts/e2e-affected.test.mjs` green.

## The play claim - NOT REPRODUCED

The owner said: *"the editor is broken; I don't think you can play a graphic with it right now."*

I could not reproduce it. Every pinned path through **▶ Play** in the editor is green on this
branch:

- `flows.spec.ts:36` is the brief's exact route - wizard -> catalog lower third -> Finish into the
  editor -> **▶ Play** -> asserts the graphic's computed `opacity` reaches `1`. Passes.
- `timeline-v2.spec.ts` + `keyboard.spec.ts`: 28 tests covering the timeline transport, the
  playhead and Space-to-play. All pass.
- By hand at `#/graphic/<id>` in DEFAULT mode: the `.simulator` transport renders with **▶ Play**,
  **■ Stop**, **⟳ Update**, **» Next**, the preview iframe carries the simulator harness, and
  `previewError` is null.

Two things worth knowing before someone chases this again:

1. **A hidden browser pane is not a repro.** Driving the app through a Browser-pane tab that is
   not displayed pauses `requestAnimationFrame` for the whole tab, so the preview's playhead loop
   posts nothing and GSAP does not advance. Play looks dead and is not. Use Playwright (or a
   visible window) to judge motion.
2. **The likeliest reading of the complaint is a surface, not a bug.** In the default studio the
   editor is demoted behind Advanced mode: a saved graphic opens onto its **control page**, whose
   ▶ Play is a different control. If the owner was standing there, "can't play it with the editor"
   is the student release working as designed rather than a defect.

**Needed from the owner: what did you press, on which screen, and what happened?** Nothing bigger
was changed on this claim, per the brief.

## Loose ends (deliberate, none blocking)

- The production rail's "＋ New graphic for this production…" still navigates WITHOUT the
  unsaved-changes guard. Pre-existing; `wizard-kit.spec.ts` walks it. Unifying it would change the
  behaviour that spec relies on, so it was left alone.
- A text-only topbar button measures 31px tall where a sibling carrying an icon or a geometric
  glyph measures 32 (no `line-height` on the global `button` rule, so the line box follows the
  glyphs). Both are vertically centred, so the centres agree exactly. Normalising it means adding
  `line-height` to the global button rule, which moved five buttons on the one page I measured -
  a whole-app change, not this branch's.
- `video-project.spec.ts:116` failed once under 4 workers beside another spec file and passed
  13/13 when run alone. Flake, not a regression from this branch.
