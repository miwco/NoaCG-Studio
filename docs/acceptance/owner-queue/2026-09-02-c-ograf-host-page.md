---
kind: agent
date: 2026-09-02
---
# An exported OGraf graphic no longer restyles the renderer's page

**Date:** 2026-09-02
**Branch:** `claude/c-ograf-host-page`
**Closes:** `docs/backlog/ograf-host-page-restyle.md` (deleted), checker row X-04 in
`docs/backlog/ograf-checker-83-rules.md`

## What changed

`graphic.mjs` used to inject the template's stylesheet into the renderer's light DOM as it was
written for SPX, where the template owns the page. Its `html, body` rule forced the host page
to 1920x1080, hid its overflow, made it transparent and changed its font; the `*` reset zeroed
every margin on the page. Two graphics on two layers, and the last one loaded won.

Now the template's stylesheet is re-addressed to the graphic's own element before injection:
`html`, `body` and `:root` become the element, `*` its subtree, and every other rule is nested
under it at zero specificity - and the export refuses, browser-parsed, if any rule would still
address the document. The element is authored-size: a 1920x1080 block, `position: relative`,
clipped; a renderer places and scales that box itself (it does not yet read
`renderCharacteristics`). The template's own `document.body` / `documentElement` resolve to
it. A `<style>` block inside the MARKUP (an imported SVG's own) is not covered yet; see
`docs/backlog/ograf-markup-inline-styles.md`.

The rendering decision this row existed to make: remap onto the element rather than drop the
page rules. Dropping them loses the heading font the designs inherit from `body`. The
comparison test proves the remap keeps the frame: zero differing pixels against the studio's
own document, where the dropped-font alternative measures in the thousands.

## Route (under a minute)

1. `npm run dev`, open `/app`, create a project from "Lower thirds" > "Hairline".
2. Panel dock > Export > "OGraf (EBU) export" > "Validate & download". Unzip.
3. Open `hairline/graphic.mjs`. Search for `GRAPHIC_BOX_CSS` and `TEMPLATE_CSS`: every rule
   starts with `:where([data-noacg-graphic="noacg-hairline"])`; there is no bare `body`,
   `html`, `:root` or `*` left in the injected CSS.
4. The live proof is the spec, if you want to see it run:
   `npm run test:e2e:queued -- e2e/ograf-conformance.spec.ts -g "own page|same frame"`
   (two tests, about 15 s once the queue lets it start). The second one paints the studio's
   document and the mounted graphic over the same ground and counts differing pixels.
5. Optional, with a renderer: load the package into SuperFly.tv's ograf-server
   (`docs/OGRAF.md`, "What an external renderer said"). The renderer page keeps its own
   layout after the graphic mounts, and the graphic sits in a 1920x1080 box of its own.

## What to look at

- The Hairline name airs in Inter, not in the fallback face - that is the thing the "drop
  the body rule" fix would have lost.
- In the renderer's devtools, the host `<body>` keeps its own computed size, overflow,
  background and font after a load.
- `/ograf` (the free starters page) still downloads; the starter guide's "Change the look"
  section now says where the `:root` block went.

## Not in this change

- No renderer round was run against ograf-server on this branch (no renderer on this
  machine); the conformance spec's minimal host stands in for it. UNVERIFIED against a real
  renderer until the next round.
