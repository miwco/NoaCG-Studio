---
source: owner
raised: 2026-08-28
state: unstarted
asked: "Rising Total still shows the full number on take, snaps to zero, counts up - small, backlog, not urgent, but sweep for siblings"
---
# Counting playout remnants: Rising Total still flashes its figure

Owner walk 2026-08-28: the 2026-08-28 class fix (opts.lead in the four igMotion builders)
missed at least one member - **Rising Total** still shows the full number on take, snaps to
zero, counts up. Poll ring and Doors Open countdown verified correct. Owner: small, backlog,
not urgent - but sweep for siblings: extend e2e/counting-settle.spec.ts's PLAYED path so its
discovery catches whatever mechanism Rising Total counts through (it evidently is not the
data-target scan's shape). Fix design + mechanism, re-verify the three the owner named.
