---
v: 1
source: walk
raised: 2026-09-04
state: unstarted
asked: "the one live-data route a non-technical operator would use is the one route behind Advanced mode"
---
# A spreadsheet link should not need Advanced mode

**Filed:** 2026-09-04, walking
`docs/acceptance/owner-queue/2026-09-02-docs-a-person-wrote.md`. That item asked whether the
`#data` paragraph was a docs fix or a product complaint. It is a product complaint, and this
decides it rather than passing it on: **the control should move, and the docs sentence pointing at
Advanced mode should disappear with it.**

## What the page currently says

`/docs#data` offers three ways to get data into a graphic:

1. **Type it on the dashboard** - no setup, no toggle. *"For most shows nothing else is needed."*
2. **A Google Sheet, or any published CSV** - *"open the graphic in the editor, go to its Rehearse
   panel and paste the link into Live data"*, followed by *"The editor is behind Advanced mode in
   Settings, so switch that on first if you have not."*
3. **The Production Data API** - the production's Data tab, a key, and HTTPS. No toggle.

So routes 1 and 3 are open and route 2 is not, and route 2 is the middle one - the route for
somebody who has outgrown typing and has not written a connector.

## Why that is backwards

The action route 2 asks of the operator is **paste a URL into a box**. Nothing about it is
advanced. What is advanced is the box's ADDRESS: it lives inside the code editor, and the student
release hid the code editor behind a toggle precisely so a non-technical user never has to meet it.

That makes this a placement fault rather than a permissions one, and the product's own contract
already settles it. The root `AGENTS.md` says a non-technical user must be able to *"make a great
graphic AND run it live without ever touching code"*, and that the student release *"demotes only
the VIEW (the editor becomes Advanced mode), never the code."* A capability a non-technical
operator needs, reachable only through the view that was demoted for their benefit, is the
demotion leaking out of presentation and into function.

Nothing about the generated code changes. The polling JavaScript is still appended to the
graphic's own code, still commented, still editable in the editor by anyone who wants it. Only the
door moves.

## Where it should go

**The production page's Data tab**, beside the Production data panel that already holds the API
key. A published sheet is a data source for a graphic in a production in exactly the sense the
Data API is one, and putting them together means all three routes in `#data` live in one place and
none of them behind a toggle.

The one thing to get right: the binding is per-GRAPHIC, not per-production, so the control has to
name which graphic it feeds. The Data tab already works in those terms - its own API example
addresses a graphic by name, `{"graphic": "House Scorebug", ...}` - so the vocabulary is there.

Leave the Rehearse-panel control where it is as well. Someone already in the editor should not
have to leave it, and two doors onto one setting is cheaper than moving a door somebody's habit
depends on.

## The docs edit that goes with it

Delete *"The editor is behind Advanced mode in Settings, so switch that on first if you have
not."* and point route 2 at the Data tab. That sentence is currently doing an honest job of warning
a reader about a wall; when the wall goes, the sentence has to go with it, or the page teaches the
long way round.

---

# A second, smaller thing from the same read

`#browser-source` opens with *"A published production gives you one output URL"* - and how to
publish is taught two sections later, in `#dashboard` (*"Press ▶ Start production in the production
page's header"*). A reader working down the left nav meets the OBS setup before they have been told
how to get the URL to exist.

The section rescues itself in its troubleshooting table (*"A take airs nothing → NOT PUBLISHED
means there is no output to air to, so press ▶ Start production"*), so nobody is stranded, but they
find it as a symptom rather than as a step. **One clause in the opening sentence fixes it**: name
▶ Start production where "published" first appears.

This is worth saying because the rest of that guide reads well cold. The slug is named as
something the studio mints and you never type, the Links button is named as where the URL is
copied from, the four rules come before the steps that depend on them, and the OBS list is
complete and in order. The item's test - a stranger getting from "I published a production" to
"the graphic is in OBS" without asking what a slug is - passes. It is only the word *published*
in its own first line that is assumed rather than taught.
