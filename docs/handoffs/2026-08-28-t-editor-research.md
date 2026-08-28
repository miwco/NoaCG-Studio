# Session T - the editor and logic research

Branch `claude/editor-logic-research-cce7a4`, one commit (`722c1f92`) on `e497aab6`. Documentation
only; no product code changed. The owner's ask, 2026-08-27: *"here the research is very important
... let's make it even better than they do and then add something of our own."* The editor rebuild
must not be designed in a vacuum, and the two playout sketches must not live only in a chat.

## 1. What landed

| File | What it is |
|---|---|
| `docs/EDITOR_RESEARCH.md` | Five competitors read on the AUTHORING axis, the comparison, what beating them means per axis, the map onto our model, five candidate ideas of our own |
| `docs/backlog/noacg-desktop-client.md` | The NoaCG Desktop sketch - parked, sketch kept |
| `docs/backlog/video-through-playout-wrapper.md` | Local video through the playout dashboard into CasparCG - flagged next-wave candidate |
| `docs/acceptance/owner-queue/2026-08-28-editor-research-one-page.md` | Route: read the one-page summary, second section |

`docs/EDITOR_RESEARCH.md` is deliberately scoped to ONE axis - how a person draws a graphic,
animates it, gives it behaviour, binds it to data, and hands it to an operator. It does not
duplicate `docs/COMPETITORS.md`, which is the capability matrix and adds no new research. It reads
MXMZ, Rive, Singular.live, Loopic and Viz Flowics from their own public product pages and
documentation, dated 2026-08-28, with every source URL listed and every unresearched hole named.

## 2. The findings that should shape a plan

1. **Nobody in broadcast authors LOGIC.** MXMZ, Singular.live, Loopic and Viz Flowics all stop at
   "a timeline with an In and an Out, plus fields an operator types into", and every one of them
   drops to JavaScript where behaviour is needed (Loopic Actions, Singular composition scripting).
   The only product with real visual logic authoring is **Rive**, which is not a broadcast product.
   This is not a gap we are closing; it is a fork we are already on the far side of.
2. **Rive is the bar on authoring feel, and we match it on model in several places.** Their state
   machine LAYERS are our parallel groups, solving the same state-explosion problem the same way.
   What they have that we do not: transitions as a first-class object with **Duration, Exit Time,
   Pause Source When Exiting, Allow Exit During Transition**, and **listeners** (target /
   listen-to / action) as a no-code interaction door.
3. **Looping is the market's weakest spot and our cheapest win.** Loopic's documented method is a
   nested composition with a `detachedPlayhead` checkbox plus a hand-typed `this.goToAndPlay(0);`
   frame action - and their own docs name the resulting defect (elements vanish with no out
   animation). Singular has no loop concept at all. **We already have the better model in the
   data**: `AnimStep.loops[selector][prop] = { repeat, yoyo, repeatDelay }`, validated, serialized,
   and drawn truthfully in `StepTimeline.tsx` (a finite repeat ends where it really ends).
   **It is READ-ONLY in the UI** - the comment at `StepTimeline.tsx:525` says so outright. The
   whole gap is one editing affordance.
4. **Singular's control nodes are the one operator idea worth borrowing.** Click an underlined
   property, name it, and the control app UI is generated from it. We reach the same place from the
   machine side already; their GESTURE is better than ours.
5. **What must be refused, and why:** Rive's condition expressions (breaks "no expression language,
   ever" and "data updates never cause transitions"), blend states (a second motion model where
   `dynamics` already covers the broadcast cases), Loopic's detached playhead (a second clock kills
   the determinism argument), and scripting-as-the-answer (concedes the only axis where we are
   alone). §4 argues each.

**The uncomfortable finding, §4's last paragraph:** our machine graph is a more capable logic
surface than anything in broadcast, and it sits behind the mode the owner steers people away from.
`docs/GOALS.md` THEN item 2 already says it did not land as a way to AUTHOR logic. The research adds
the WHY - Rive's graph works because its user accepts being taught a graph, and ours does not - and
concludes the second attempt should not be a third graph.

## 3. What a next session could do with this

Nothing here is authorized to be built by this document, and the 2026-09-12 production still owns
the calendar. In rough order of value per unit of work:

- **Loop authoring in the timeline** (§5 candidate 2). The smallest real win in the file: the data
  model, serializer, validator and truthful drawing all shipped; what is missing is a control on
  the loop tail and a spec. One session could finish it.
- **Fill the two `UNRESEARCHED` blocks in `docs/COMPETITORS.md`.** That file says two of its four
  blocks are mostly empty and that filling one is a half-day. This session's research answers a
  large part of the Loopic and Singular blocks and was deliberately kept out of that file to stay
  in scope. Copying the verdicts across is cheap and makes the matrix honest.
- **Exit time on a transition** (§5 candidate 5). One additive optional field on `AnimTransition`,
  one check in the dispatch loop, no version bump - and it answers a real broadcast problem
  ("do not let the operator's next event cut the entrance in half") that has no answer today.
- **The behaviour library** (§5 candidate 1) is the large one and is the north star's core question
  restated. It should not start from this doc alone.
- **Size the video wrapper** (`docs/backlog/video-through-playout-wrapper.md`). The transport is
  nearly free - `noacg caspar agent` already exposes a generic `/amcp` endpoint - so the work is a
  file model, a video cue, an operator readout and the honest degrade. It carries the owner's own
  "one reason I can't use it in my productions", which outranks everything else in that folder.

## 4. Verification

`npm run build` green on the tree as committed (typecheck, lint, build, all the config gates,
507 prerendered template pages). Docs-only change, so there is nothing observable in the product to
run a suite against; the owner-queue item is a READING route, not a UI walk. CI was started on the
pushed branch (`gh run list --branch claude/editor-logic-research-cce7a4`).

## 5. Lesson learned, applied next wave

**Read the repo's own contracts before judging the competitor.** The first pass of this research
was going to file our node editor as a plain GAP against Rive. Reading
`docs/STATE_MACHINE_SCHEMA.md` §6a instead showed a surface with materialize-on-edit, timeline
lensing onto branch states, derived timeline levels and structural refusal of illegal deletes -
richer than anything the competitors ship. The finding flipped from "we are behind" to "we are
ahead and nobody can reach it", which is a completely different piece of work. Next wave: when an
axis touches our own code, read the nested `AGENTS.md` and the contract doc BEFORE writing the
verdict, not after.
