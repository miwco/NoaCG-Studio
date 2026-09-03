---
kind: owner-action
date: 2026-08-29
---
# Get NoaCG onto the OGraf ecosystem list

**Date:** 2026-08-29 · **Branch:** `claude/ff-ibc-readiness` · **kind:** owner-action

## What this is

You asked this morning whether we have everything ready to list at IBC. We do, and the checklist
is written. This item is the listing itself - the part nobody else can do, because it is your name
on a pull request and your email to the EBU.

The finding worth knowing before you open it: **there is no official EBU vendor list.**
`ograf.ebu.io` is a README with no vendors page and no submission process. The list broadcasters
actually browse is the independent `ograf.dev` ecosystem directory, which does have a written
process, already lists 30 products including Loopic, Ferryman, CasparCG, BBright and Pixotope, and
does not list us.

## The route, in under a minute

1. Open **`docs/IBC_LISTING_CHECKLIST.md`**.
2. Read sections 1 to 3 (about five minutes) - where the list is, the exact JSON to paste, and what
   is verified true with the proof beside each claim.
3. Work **section 4**, four steps, about 45 minutes total.

## What to look at

- **Section 2 is copy-paste ready.** The ecosystem entry, the one-line description and the pull
  request justification are written out to paste verbatim. Change the wording if you want it in
  your own voice, but check the `type: "oss"` and category calls first - the reasoning for each is
  written beside it.
- **Step 2 is time-critical.** The EBU's open-source meetup at IBC is 12 September and no deadline
  is published for the sign-up form, so it closes when it closes. If you only do one thing today,
  do steps 1 and 2.
- **Section 5** has the answers to the awkward questions, including the honest one: no third party
  has yet reported running a NoaCG package in production.

## What was verified, and what was not

Verified today: our packages validate against all seven of the EBU's published schema files with a
real JSON-Schema engine; our own validator agrees with them across an eight-mutation battery; the
`/ograf` starters still build and validate; 15 OGraf e2e tests pass. That harness had been run by
hand and thrown away twice - it is now `npm run check:ograf-schema`, running weekly.

Not verified: nothing was submitted anywhere, no email was sent, and no NoaCG package has been
through ograf.dev's own 82-rule package checker. That last one is the optional ten-minute step at
the end of section 4, and it is the only one where a third party judges our conformance instead of
us.

## Owner, 2026-09-03: not yet

> We're not gonna list ourselves yet on the OGraf ecosystem, so that we will keep it on my to-do
> list.

Deliberately deferred, not forgotten. The item stays open as an owner action and keeps its
real-world date so it keeps leading that list. Nothing waits on it: P6 may proceed regardless
(`docs/PROGRAMMES.md` - a date is a forecast, never permission to wait).
