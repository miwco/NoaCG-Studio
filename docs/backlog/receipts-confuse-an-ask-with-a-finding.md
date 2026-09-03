---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "distinguish between things I explicitly asked for and bugs/findings that arose while pursuing those asks. Those can absolutely remain work, but don't turn them into owner requirements retroactively"
---
# A receipt records what he wants; a bug he happened to find is not a requirement

**Filed:** 2026-09-03, reviewing the receipts list with him.

## Why

`node scripts/owner-receipts.mjs` prints every row the same way, under the heading `asked:`. So a
bug he reported in passing, a question he raised and explicitly declined to answer, and a thing he
actually wants all read identically - as owner requirements. Reviewing the list he caught it:

> Also distinguish between things I explicitly asked for and bugs/findings that arose while
> pursuing those asks. Those can absolutely remain work, but don't turn them into owner
> requirements retroactively.

The concrete case that exposed it, corrected the same day: a row claimed he asked for the
instruction-chain gate to fail at 99%. He never said 99. The number was ours, invented while doing
the headroom work he DID ask for, and it had been sitting under his name for two days. Once a
figure is written as an owner requirement, nobody argues with it again - which is exactly the
damage.

Rows in the folder today that look like findings rather than asks, and should be reclassified
when the mechanism exists: `live-vote-fields-that-do-not-work`, `dropping-several-files-at-once`,
`editor-canvas-1920x1880`, `counting-playout-remnants`, `ticker-kicker-consistency`. Each is real
work and stays; none is a thing he asked for.

## What it would take

1. A field on the receipt saying which it is - a want, or something found while serving one -
   with the ask keeping its quote either way, since provenance is still worth holding.
2. `owner-receipts.mjs` lists them separately, and the plan check only insists a plan mention the
   wants.
3. Reclassify the existing rows, which is a read of about forty short files.
4. `OWNER_TELL` in that script currently treats "owner walk" in a body as proof of an ask; it has
   to stop conflating the two, or the reclassification cannot pass its own gate.

The receipt format carries `v: 1`, so this is a version bump with a migration on read, per root
`AGENTS.md` principle 6.

## Evidence

His correction, verbatim above. The corrected row is
`docs/backlog/instruction-gate-refuses-before-a-chain-fills.md`, which now carries no receipt and
says in its own text that the threshold is an engineering choice open to argument.

## A second, smaller flaw found while making the correction

`OWNER_TELL` scans the first fifteen lines of a body for phrases like "owner ask" and refuses the
file if it has no receipt. It therefore fires on a row whose whole point is to say *this was never
an owner ask* - the correction above tripped it, and the only way past was to move the correction
below line fifteen. A net that catches denials is a net that teaches people to bury them.

Whoever takes this row should make the tell read the claim rather than the keyword, or accept an
explicit `source: derived` that says the provenance out loud instead of leaving it to a regex.
