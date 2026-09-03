# Make the shared-instruction check refuse before a chain is full

**Filed:** 2026-09-02, split out of `docs/backlog/agents-md-byte-headroom.md` once its first steps
landed. **Lands ALONE.** It tightens a gate every branch meets, so it must not share a wave with
anything.

## Why it is a separate row

`npm run check:shared-instructions` prints a warning past 80% of `project_doc_max_bytes` and only
FAILS past 100%. The warning is advisory, so a chain can drift to the ceiling and then the first
branch to add a paragraph wears a failure that is not its own. A hard refusal short of the limit
turns that into something the author sees before pushing.

It cannot ride in a wave. The gate must land only once the headroom exists, and a wave cannot
promise which of its branches lands last: `docs/backlog/wave-last-landing-unenforceable.md` records
that measurement. Landing this while any chain is near the limit red-gates every branch in flight,
which is the exact failure the headroom work exists to prevent.

## Provenance, corrected 2026-09-03 - this row carries no receipt, deliberately

It used to claim he asked for a failure at 99%. **He did not.** What he asked for is headroom in
the instruction files, and that receipt lives on `docs/backlog/agents-md-byte-headroom.md` where it
stays. The 99% figure and the idea of a hard gate are ours, derived while doing the work he did
ask for. In his words:

> 99% is not my requirement. We just established that I never said 99; it came from the
> receipt/backlog itself. Remove that as an owner ask and keep only the actual underlying goal of
> preserving AGENTS.md headroom.

So the threshold below is an engineering choice, open to being argued down or replaced, and nobody
should defend it as a requirement.

## Precondition, and how to check it

**Every chain must be comfortably clear of the limit before this lands.** Run the check and read
its own numbers, never a figure from a plan. On 2026-09-03 the tightest chain
(`src/components/wizard/AGENTS.md`) sat at 91.2% with 9,708 bytes free, down from 365 bytes that
morning, and the ceiling came down from 112,000 to 110,000. The cuts ruled on 2026-09-03
(`docs/backlog/agents-md-byte-headroom.md`, "RULED") are expected to take that chain under 85%.

## What it would take

1. Confirm the precondition against the check's own output.
2. Pick the threshold and say why in the code comment. Refusing at 99% of a ceiling that is itself
   a ratchet may be too late to help anyone; the useful refusal is the one that fires while there
   is still room to act.
3. Keep the 80% report as the advisory it is.
4. Land it alone, and re-run the check on `main` afterwards.
