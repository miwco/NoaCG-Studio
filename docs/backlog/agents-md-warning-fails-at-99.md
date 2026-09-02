---
v: 1
source: owner
raised: 2026-09-01
state: unstarted
asked: "give the AGENTS.md byte budget real headroom, then make the warning fail loudly - step 4 of the headroom ask, split out on 2026-09-02 because a build gate cannot be promised as a wave's last landing"
---
# Make the shared-instruction warning FAIL at 99%

**Filed:** 2026-09-02, split out of `docs/backlog/agents-md-byte-headroom.md` (step 4 of that
receipt) once steps 1-3 landed. **Lands ALONE.** It tightens a gate every branch meets, so it must
not share a wave with anything.

## Why it is a separate row

`npm run check:shared-instructions` prints a warning past 80% of `project_doc_max_bytes` and only
FAILS past 100%. The warning is advisory, so a chain can drift to 98.7% - which is where
`src/components/wizard/AGENTS.md` sits today - and the first branch to add a paragraph wears a
failure that is not its own. A hard refusal at 99% turns that into a refusal the author can see
before pushing.

It cannot ride in a wave. The gate must land only once the headroom exists, and a wave cannot
promise which of its branches lands last: `docs/backlog/wave-last-landing-unenforceable.md` records
that measurement, taken 2026-09-02. Landing this while any chain is still near the limit red-gates
every branch in flight, which is the exact failure the headroom work exists to prevent.

## Precondition, and how to check it

**Every chain must be under 99% with room to spare before this lands.** Run the check and read its
own numbers. On 2026-09-02 that precondition was NOT met: nine chains still printed the 80%
warning and `src/components/wizard/AGENTS.md` had 1470 bytes free. That chain has no relocation
left in it (the reasoning is in the headroom receipt), so this row waits on either the owner's
ruling in `docs/acceptance/owner-queue/2026-09-02-e-agents-md-cuts.md` or a reorganization of
`src/components/wizard/`.

## What it would take

1. Confirm the precondition against the check's own output, never a figure from a plan.
2. Fail the check past 99% of the limit, keeping the 80% report as the advisory it is.
3. Land it alone, and re-run the check on `main` afterwards.
