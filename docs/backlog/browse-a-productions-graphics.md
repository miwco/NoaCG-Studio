---
v: 2
source: owner
kind: ask
raised: 2026-09-04
state: unstarted
asked: "it's quite hard to do this because I can't see which graphics are part of which production easily, and that's actually a thing we could improve on. You should be able to browse all the graphics from one production easily somehow, so you can look at them without going into the playout system and play them one by one."
---
# You cannot see which graphics belong to a production without playing them out

**Filed:** 2026-09-04. **Source:** owner, while trying to check a possible teams data leak and
finding he could not answer the question from the interface.

## Why

A production is the unit the product organises work into, and there is no way to look at its
contents. To find out whether a graphic belongs to a production you open the playout system and
play them one at a time. That is a heavy answer to a light question.

The way this surfaced is the argument for it. The owner was asked whether a graphic from an
unshared production was visible to a second account - a question about what belongs to what - and
the only way to answer it was to hunt. A security check that the interface cannot support is a
check that does not get run, and this one only got run because he was willing to do it by hand.

It also compounds the teams finding beside it. Once a second person can see a subset of your
graphics, "which of these are the team's" becomes a question users will ask constantly, and the
product currently cannot answer "which of these are anything's".

## What it would take

A view of one production's graphics: open a production, see its graphics as a browsable set,
without entering playout. The Home surface already lists productions and lists graphics; what is
missing is the relation between them being navigable in the direction production → graphics.

Worth deciding at the same time, since it is the same screen: whether a graphic can belong to more
than one production, and what the view shows for a graphic belonging to none.

## Evidence

- Owner, 2026-09-04, verbatim in the receipt above.
- `docs/backlog/teams-invite-join-code-and-what-a-new-member-sees.md` - the check this blocked.
