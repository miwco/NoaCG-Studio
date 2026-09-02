---
v: 1
source: owner
raised: 2026-09-01
state: unstarted
asked: "yes you are allowed to do it. No dates are blocked. - authorizing the OGraf host-page restyle fix before programme P6's entry date"
---
# An OGraf graphic must not restyle the renderer's host page

**Filed:** 2026-09-02, from the 2026-09-01 night-wave plan (row K, never launched).
**Source:** owner authorization by name, 2026-09-01; the defect itself is
`docs/backlog/ograf-checker-83-rules.md` X-04.

## Why

`src/export/targets/ograf.ts` (around line 659) injects the template's CSS verbatim into the light
DOM, and `src/templates/shared/base.ts` (around line 269) emits an `html, body` rule carrying
width, height, overflow, background and font-family. So the last graphic loaded wins the host
page's body, across layers: two NoaCG graphics on two layers fight over the renderer's document.
EBU and Yle are the first renderer customers and OGraf is the canonical interchange contract - a
graphic that restyles its host is not one. The analysis existed only in a handoff that was nearly
deleted on 2026-09-01; it is on `main` again, and this receipt is the durable pointer.

## What it would take

1. Reproduce first: two graphics on two layers, the host body being restyled.
2. Choose between the two candidate fixes - drop the rule, or remap it onto the graphic's element
   plus `display` - with evidence, not preference. The handoff names the regression the first
   risks: the inherited heading font.
3. Fix it, keeping the graphic's own sizing correct in `graphicModule()`; add the e2e case, and
   see it fail on the pre-fix code.
4. Export parity: SPX is the strictest gate and must not move; `base.ts` is shared by the whole
   catalog, so run the affected catalog gates, not only the OGraf specs.
5. Record the owner's date ruling in the P6 row of `docs/PROGRAMMES.md` in the same change.

## Evidence

`docs/handoffs/2026-08-30-n-ograf-checker.md` (the two candidate fixes and their trade-offs),
`docs/backlog/ograf-checker-83-rules.md` X-04, `docs/OGRAF.md`, `docs/OGRAF_FIRST_REVIEW.md`.
