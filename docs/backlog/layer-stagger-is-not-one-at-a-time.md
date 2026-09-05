# Layer stagger does not stagger: phantom slots, and the words never take part

**Reported by the owner, 2026-09-05**, during a walk, verbatim:

> a small comment on the animation: if you choose stagger animation, it staggers the background
> graphic, but they're not one at a time, so it doesn't look correct at all. It says it should
> stagger all layers, but it doesn't do it one at a time. The text is also visible from the start,
> which is not how an animation should work. The animation should also stagger the text, and the
> text is in its own fields, the effect should stagger the text also.

Three separate faults sit behind that, and they compound. All three are in the `design-stagger`
preset's emitted entrance (`src/templates/importedDesign/designPresets.ts`) and in what feeds it
(`svgLayerElements` / `svgLayerSelectors`, `src/model/structure.ts`).

## 1. Hidden layers eat the beats — this is the "not one at a time"

`svgLayerElements` collects every top-level `<g>` with a usable id and skips exactly two things:
a group the IMPORT hid (`<prefix>-outlined`, `<prefix>-removed`). It does not skip a group the
DESIGNER hid, which is every drawn moment layer — the whole point of `docs/SVG_AUTHORING.md` §5b
is that you hide them with the eye off, and a bound behaviour then hides them by stylesheet class
instead (`drawnState.ts`, `clearDrawnHiding`).

So on `docs/svg-samples/quiz-board.svg` the stagger walks **19 layers of which 14 are invisible**:
Board, Row A-D, four `selected`, four `correct`, four `wrong`, `Locked in`, Answers. The visible
cascade is Board, four rows, then fourteen dead beats, then the words. It does not read as
one-after-another because most of the beats have nothing in them.

The rule this violates is already written, three lines above the code that breaks it: *"A group
HIDDEN by the import is not a layer - it is not on screen, so a timeline row or a stagger slot for
it would be a phantom."* The principle is right and it was only ever applied to one of the two
ways a layer gets hidden.

## 2. The box fade reveals everything before the cascade starts

The emitted entrance is, in order: `set('.imported-design', {opacity: 1})`, then
`fromTo('.imported-design-box', {opacity: 0}, {opacity: 1, duration: 0.3})`, then the layer
stagger at `-=0.15`. The box holds the text. So every word is fully up 0.3 s in, while the layers
underneath are still arriving. That is exactly "the text is visible from the start", and it is
structural rather than a timing accident: the container that fades in is the container the text
lives in.

## 3. A text field can never be a stagger member

`svgLayerElements` rejects any id matching `^f\d+$` — which is every operator field. A field that
sits inside a named group (the sample's `<g id="Answers">`) rides as one lump with its group; a
field at top level takes no part at all. Either way the words never arrive one at a time, which is
the half the owner asked for explicitly.

## What a fix has to hold

- **Only what is on screen gets a beat.** Extend the phantom rule to the designer's own hiding: the
  `display` attribute, an inline `display`/`visibility`, Illustrator's hidden class
  (`hiddenClasses` in `assets/svgImport.ts`), and a bound drawn-state class.
- **`svgLayerElements` is THE definition of a layer** and the part registry reads it for timeline
  rows too, so widening it to fields would put duplicate rows in the timeline. The stagger's member
  list is a preset concern: build it in the preset config as layers **plus** field selectors, and
  leave the layer definition to mean layers.
- **The emitted shape must stay `stagger: <number>`.** `blocks/animImport.ts` turns a `stagger:`
  into per-layer keyframe offsets and has no object form, so a GSAP `{ amount }` object would not
  round-trip into the timeline dock. Compute the per-member gap at emit time, where the member
  count is known.
- **Nothing may be visible before its own beat.** Whatever the box does, a staggered member starts
  at opacity 0 and arrives on its slot.
- **A design with no visible layers still needs an honest entrance** - the existing whole-unit fade
  fallback, now reachable in one more case (every layer hidden).

## What only a person can settle

How long the cascade should be, and how much each member should overlap the one before. With the
sample board the fix leaves about eleven real members; one-at-a-time with no overlap would run
several seconds, which no broadcast entrance does. Pick numbers, then let the owner watch it -
an agent driving the preview pane cannot judge this, because a pane that is not being composited
throttles `requestAnimationFrame` and stretches the entrance (`.agent-workflows/walk.md`).
