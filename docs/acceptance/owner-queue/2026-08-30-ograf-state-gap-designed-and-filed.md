---
kind: walk-p
date: 2026-08-30
done: true
---
> **Settled 2026-09-03 without him.** The item says so itself: nothing needs him. The EBU issue is
> already public at <https://github.com/ebu/ograf/issues/82> and reading it is optional, not a
> decision. His standing ruling that EBU/YLE outreach waits for a real production on working OGraf
> playout is untouched by the filing.

# The OGraf state gap - designed around, and filed with EBU in your name

**Both halves you asked for on 2026-08-30 exist.** The design is
`docs/OGRAF_STATE_IN_FIELDS.md`: because OGraf v1 gives a graphic no way to speak - no events, no
subscription, and `ReturnPayload.result` undeclared on every GraphicInstance action response - a
behaviour's operator-visible state is modelled as data the **controller owns and the graphic
obeys**, mirrored into a hidden field the runtime writes into the artwork and also reads back, so a
controller never has to ask because it wrote the value itself. It works on the standard exactly as
it is today, it names its own expiry, and it is honest that the tally crosses completely, the
open/closed status crosses well at the price of one prohibition, and **legality cannot be expressed
at all**.

**The issue went out under `miwco` and is worth reading, because it is public in your name:**
**<https://github.com/ebu/ograf/issues/82>**

It is purely technical - three artefacts in their repo disagreeing, exact files and lines, one
concrete thing a controller cannot learn, and the smallest additive fix. It pitches NoaCG nowhere,
invites nobody, and mentions no roadmap; your standing ruling that EBU/YLE **outreach** waits for a
real production on working OGraf playout is untouched.

**The route (under a minute).** Open the issue link above and read it - that is the half only you
can judge. Then `docs/OGRAF_STATE_IN_FIELDS.md` §4 if you want the design's honest self-assessment
of what it does and does not solve.

**One thing to know before reading the issue.** Re-verifying the gap line by line before filing
found the earlier research round had overstated it: `result` is **undeclared**, not dropped - the
reference server forwards it as vendor pass-through, and nothing forbids that. The issue says so
explicitly rather than claiming more than is true, and the four in-repo docs that said "dropped" are
corrected. The design's conclusion did not change: an undocumented channel one server happens to
forward is not one a second controller can be written against.

**Nothing needs you.** No product code changed this round, and the design is what the poll already
does, written down and generalised.
