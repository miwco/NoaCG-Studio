---
v: 1
source: measurement
raised: 2026-09-04
state: unstarted
found-by: node scripts/svg-import-sweep.mjs --ladder
---
# "The panel gets wider" grows the background on any full-frame export

**Filed:** 2026-09-04, from the first corpus-wide run of the fit-ladder sweep.

## What was measured

On `figma-centred-title-card` the graphic's whole growth table is one row, and the element it
names is the **1920x1080 background rect**:

```
rules:   [{"el":"g0","axis":"x","safe":0.04}]
stamped: [{"tag":"rect","stamp":"g0","w":1920,"h":1080}]
```

So picking "the panel gets wider" on that file widens the frame's own backdrop, which is already
the frame. Nothing visible happens at any value, on any length. The sweep reports it as
`"g0" stayed 1920 px wide` on every long value of `grow-x` and `grow-xy`, and it recurs across the
corpus wherever a file has a full-frame background rect - which is every frame-sized export, and
that is most of what a student draws.

## Why it happens

`MapSvgFieldsStep.tsx`, the growth-defaults effect: when `proposeBannerGrowth` finds no banner -
a title card is not a banner, and it is right not to call one - growth is defaulted OFF and the
shape is remembered as the fallback

```ts
{ on: false, shapeId: banner ?? svg.shapes[0]?.id ?? null }
```

`svg.shapes` is **widest-first**, so `shapes[0]` on a frame-sized export is the background. The
fallback is only ever meant to be the shape the control shows while growth is off; switching the
control on then turns that placeholder into the rule.

The same commit's own comment records the neighbouring version of this bug being fixed for boards
("left the proposal at `svg.shapes[0]` - the board's own BACKPLATE"). This is the remaining half:
the fallback when there is no banner at all.

## What the fix probably is

The shape a longer value would grow is **the panel the bound lines actually sit in** -
`panelsHoldingText` already measures exactly that, in the same effect, for a different purpose. A
shape that fills the frame is never that panel; it is the artwork's ground. Two candidate rules,
either of which would close it:

1. fall back to the panel holding the first bound line rather than to `shapes[0]`;
2. refuse a shape that is within a pixel or two of the frame on both axes - growing the ground is
   never what the control means.

## Why it is not fixed here

`src/components/wizard/` was owned by another session on the night this was measured. The finding
is the sweep's, and the sweep is in `scripts/svg-import-sweep.mjs --ladder`: re-run it on
`figma-centred-title-card` after a fix and the eight `"g0" stayed 1920 px wide` lines go.
