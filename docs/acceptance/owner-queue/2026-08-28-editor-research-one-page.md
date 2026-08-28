# The editor research: five competitors read, on the authoring axis

**Date:** 2026-08-28 · **Branch:** `claude/editor-logic-research-cce7a4`

## What changed

You said the research matters here - "let's make it even better than they do and then add something
of our own" - so the future editor and custom-logic plans now have something to be written FROM
instead of being designed in a vacuum.

`docs/EDITOR_RESEARCH.md` reads MXMZ, Rive, Singular.live, Loopic and Viz Flowics from their own
public product pages and documentation, on one axis only: how a person draws a graphic, gives it
motion, gives it BEHAVIOUR, binds it to data, and hands it to an operator. It says what each does
best, where each is weak, what "better than they do" would have to mean per axis, and which of
their ideas fit our model versus which would fight it. It ends with five candidate ideas of our
own, each honest about cost.

Two of your sketches are also banked so they stop living only in a chat: `docs/backlog/` now holds
**NoaCG Desktop** (our own local client, CasparCG rented as the engine - parked, sketch kept) and
**video through the playout wrapper** (playing local clips into CasparCG from the dashboard without
video touching the web), the second flagged as a next-wave candidate because it carries your own
"one reason I can't use it in my productions".

Nothing was built. This is reading and writing only.

## The route, in under a minute

1. Open **`docs/EDITOR_RESEARCH.md`**.
2. Read **"The one-page summary"** - it is the second section, five numbered points.

That is the whole ask. Everything below it is the evidence for those five points.

## What to look at

- **Point 1** is the finding that should decide things: nobody in broadcast authors logic at all.
  MXMZ, Singular, Loopic and Flowics all stop at a timeline plus operator fields, and drop to
  JavaScript when behaviour is needed. Does that match what you have seen of them?
- **Point 4** is the cheapest win found: looping. Every competitor makes "animate in, then breathe
  until the operator takes me out" awkward - Loopic's own documentation describes their method's
  defect - and we already have the better model sitting in the data, read-only. One editing
  control closes it.
- **The three candidates named at the end of the summary**, and then the five in §5. If one of them
  is obviously wrong for the product, say which - they are ranked on a guess about what the north
  star asks for, and that ranking is yours to overrule.
- **§4's last paragraph** ("The uncomfortable finding") is the part about our own editor. It agrees
  with you that the node editor did not land as a way to author logic, and it says why - the second
  attempt should not be a third graph.

## Also worth a glance

The two backlog files, if the sketches matter to you as written:
`docs/backlog/noacg-desktop-client.md` and `docs/backlog/video-through-playout-wrapper.md`. The
video one names what is genuinely missing (a file model, a video cue, the operator readout) versus
what already exists - the AMCP agent is shipped, so the transport is close to free.
