# Owner queue - what is built and not yet confirmed by a human

The one thing about shipped work that no file in the repo can know: whether the owner has actually
LOOKED at it. Git knows what landed; only a person knows whether it was any good.

**The items are not in this file.** Each one is its own file in [`owner-queue/`](owner-queue/),
named `<date>-<slug>.md`. This file holds the rules they follow and the log of what was dropped.

Run **`/walk`** to go through them in one pass. It reads that directory, takes the owner to each
thing, and records the tick or the feedback. No open `walk` item IS the confirmation that nothing
is waiting.

## Why one file per item

Every session that lands observable work adds an item, and several sessions land in one night. A
shared list means N sessions appending at the same offset, which is a git conflict - and
`auto-merge.mjs` aborts on a conflict and stops, so the branch sits unlanded until a person looks
at it. One file per session cannot collide, so the queue costs a night wave nothing.

## The shape of an item

```markdown
---
kind: walk          # walk | walk-p | owner-action | hardware | agent
date: 2026-08-25    # when it was filed, so /walk can present newest first
serves: now         # OPTIONAL - set it when the work serves docs/GOALS.md ## NOW
---
# Short title

What changed, in one sentence a non-technical reader follows. Route: the URL, the branch or the
exact command - under a minute to reach, or it will not get walked. What to look at: the thing
that might be wrong, not a feature summary. The commit or branch it came from.
```

- `kind: walk` - the owner, at the computer. Five minutes at the desk with the product open.
- `kind: walk-p` - the owner, from his phone. A taste ruling, a preference, a direction call:
  anything he can answer in a sentence without the dev environment in front of him.
- `kind: owner-action` - only he can do it: publish, money, an account we do not hold.
- `kind: hardware` - needs a CasparCG box, an SPX server or real people, and is not "unseen".
- `kind: agent` - an agent settles it by driving the product. Not for him at all.
- `done: true` - kept as a record rather than deleted, for an action whose outcome matters later.
- `answered: true` - optional. Set it when the item captures his feedback AND a later section
  answers it, so the re-look he is owed sorts ahead of items nobody has moved.
- `serves: now` - optional, and the only thing that decides priority. Set it when the item's work
  serves the `## NOW` push in [`../GOALS.md`](../GOALS.md); leave it off otherwise. It lives in the
  item's own front matter rather than in a ranked list here, for the same reason the items do: five
  sessions editing one ordered list at the same offset is a git conflict, and a conflict strands a
  landing. When the push changes, the items that no longer serve it lose the key.

## Which kind does an item get

**Ask who can settle it, not how important it is.** If the item's remaining question is a claim
about the product - does this button do what the item says, does this file arrive with the right
answer, does the number reach the frame - an agent can drive it and confirm it, so the kind is
`agent` and the owner never sees it. If settling it needs a human opinion (taste, a preference,
a direction call) and that opinion fits in a sentence, it is `walk-p`, because the phone is the
cheapest place he can clear it from. If the opinion needs him looking at the screen or driving the
thing himself, it is `walk`. If it costs money, publishes past `main`, or needs an account we do
not hold, it is `owner-action`. If it needs a playout box, a server or an audience, it is
`hardware`. Be honest in both directions: *"does this look good"* is his, and *"does this button
do what the item claims"* is ours. An item that carries both halves is filed for the human half
and the agent half is checked before it is presented, so his minute is spent on the opinion.

### A design default is NOT a taste question (owner, 2026-09-03)

He pushed back on the whole shape of this queue after three walks that were, in his words, *"about
design, the look, and these kinds of issues"*:

> They were sent to me because you think I'm the only one that can answer these, but I want to push
> back on that. You are the almighty AI with all the design books and all the knowledge. This is
> not something that I should just choose how it looks like. There is logic to how this should be
> built, and we need to use that logic. We are not building stuff just the way I want it; it's
> about how people in general want it and what they think is the default.

> So, this mindset we need to teach the orchestrator in the future so it doesn't land this on my
> table when it can fix and figure out these things themselves.

**So "a human opinion is needed" is a much narrower test than it has been read as.** Before filing
anything as `walk-p` or `walk`, ask whether the question has a defensible general answer - what
broadcast graphics conventionally do, what a designer would expect, what most users would call
correct. If it does, **decide it, do it, and say in the item what you decided and why**, so he can
overrule a thing that exists rather than adjudicate a thing that does not. A default is research,
not taste.

What genuinely reaches him: money, direction, product scope, a call between two options that are
both defensible and point the product different ways, and whether a shipped thing is any good. Not
*"which of these should be the default"* when one of them is obviously conventional.

The failure this replaces is real and it was ours: he was asked to rule on the palette collapse,
on the growth default and on the ladder's per-field behaviour, and every one of those had a
defensible answer from ordinary design practice that nobody bothered to derive.

**Only a `kind: agent` item may be deleted on an agent's own verification**, and the commit that
deletes it says what was checked and what was seen. An agent confirming a claim is not the owner
having looked at it, and this queue exists to hold exactly that difference - a deleted item and a
walked one must not read identically afterwards.

### Re-kinding an item, including one filed for him

The filing session picks the kind (`.agent-workflows/walk.md` §4), and that is what makes routing
automatic rather than a triage job. But a kind can be WRONG - filed before the design-default rule
above existed, or filed as `agent` and then found to be unsettleable by one. So re-kinding is
allowed, in both directions, under three conditions, and they exist because the obvious abuse is
real: **a session that may convert `walk` to `agent` and then delete it on its own verification can
empty this queue without anybody looking at anything.**

1. **The re-kind says which half of the test it met**, in the item, above its original text. For
   `walk`/`walk-p` to `agent`: the remaining question is a claim about the product an agent drives,
   or a default with a defensible general answer. For `agent` back to `walk`: what an agent tried
   and why it could not finish.
2. **Re-kinding to `agent` and DELETING that item are separate commits.** The re-kind commit stands
   on its own with its reasoning, so the conversion is reviewable independently of the walk that
   followed it. A single commit that both converts and deletes is the shape this rule refuses.
3. **`owner-action` and `hardware` are never re-kinded.** They need his account, his money or his
   hardware, and no argument about the question's nature changes that.

**A `walk` item whose remaining question is genuinely his is not re-kinded because an agent could
look at the screen.** The test is who can SETTLE it, not who can observe it: *"is this any good"*
and *"is this the product you asked for"* stay his however drivable the route is.

**And an `agent` item no agent can finish is worse than a `walk` item**, because it sits on a list
he is never shown. If a walk attempt fails for an environmental reason rather than a product one,
re-kind it back and say so - that happened on 2026-09-04, when a night session found it could not
judge a 1.34 s entrance in a hidden browser pane throttled to about a frame a second.

## The order the owner sees them in

**The kind decides which list an item is in; three keys decide the order inside it, and none of
them is a judgement made at presentation time** - so two sessions running `/walk` an hour apart
show him the same order.

`/walk` presents `walk-p` before `walk`, because a phone item costs him a sentence and a desk item
costs him five minutes at the machine. Inside each of those two lists the order is **`serves: now`
first, then `answered: true`, then newest `date:`** - all three front-matter keys, defined once in
the shape section above, so nothing here re-derives anything.

**`owner-action` is presented too, as its own short list after the other two**, because every one
of them is a real ask nobody else can do and there have never been more than a handful. Within it,
an item naming a real-world date leads (the OGraf ecosystem listing is against IBC on 12
September). Only **`hardware`** stays a count unless he asks, since it needs a playout box or an
audience rather than a decision. `done: true` is never presented.

**`kind: agent` is presented to the AGENT, never to him.** `/walk` reports how many are open in one
clause and offers to walk them; `/walk agent` walks that list. An agent item nobody ever reads is
worse than no item, because it looks handled - so if the count is not zero, it is a row of work,
not a note.

## How this list stays honest

- **An item goes in when the work lands**, with what to look at and how to reach it in under a
  minute. No item without a route.
- **An item leaves when it is walked** - `/walk` deletes the file. Git holds the history, so
  nothing is lost by removing it.
- **Feedback keeps the item open**, captured verbatim in the file, until the feedback is addressed.
- **Nothing is dropped for being old.** An item waits until the owner walks it, however long that
  takes.

Nothing here is a gate. It is a to-do list.

## Why age no longer drops an item

Until 2026-08-30 a `kind: walk` item older than 7 days was deleted as presumed seen, on the
reasoning that the owner tests most things within a couple of days. **Owner ruling, 2026-08-30:
nothing expires - he will get to all of them** (39 open at the time).

The expiry was solving queue LENGTH by discarding the one thing this queue exists to hold: a
deleted item and a walked item look identical afterwards, so the mechanism quietly biased the
record towards "all confirmed". Length belongs to the owner to pace. He ruled the same day that a
deep queue must not hold other work back either (*"nothing should block stuff"*), so **the queue
neither blocks nor evaporates - it is a list, not a dependency, and it may grow.** Anyone
re-enabling an expiry is turning that trade back on and should have an answer better than
"presumed".

## Dropped

The log of items removed without being walked, kept so a wrong drop is visible rather than silent.
The 7-day expiry that wrote the entry below no longer exists, so nothing is added here except by
an explicit decision to drop something.

**A `kind: agent` item deleted after an agent drove its route is not a drop and does not belong
here.** It was walked - by an agent rather than by him - and the evidence is the commit message,
which the rules above require to say what was checked and what was seen. The distinction matters
in both directions: putting those in this log would bury the real drops, and leaving a genuine
drop out of it is the silence this log exists to break.

- 2026-08-20-ig39-key-figures - dropped 2026-08-28, presumed seen
- 2026-08-30-b-antigravity-write-rule - dropped 2026-08-30, ALREADY DONE. It asked the owner to
  rewrite two `write_file` rules in his Antigravity settings so headless writes would stop being
  denied; he made that change the same afternoon and it was verified working (a write inside the
  granted directory succeeds, one above it is denied). Recorded in `docs/HARNESS_ROUTING.md`. Not a
  presumption - the thing it asked for was checked and found done.

## The standing instruction behind all of it (owner, 2026-09-03, closing the walk)

The rule above says which questions reach him. This says why, in his words, and it is the more
important half:

> One of the most important things from this whole session is that the agent, the orchestrator,
> has to trust itself more. You do know what to do. Search the internet, use logic; all these
> questions that you ask me right now can be answered by an all-knowing AI LLM.

> The goal is not rocket science. The agents need to have more agency and research a problem
> before asking me.

> But I just wish that I don't get questions that I myself would ask an AI to answer, if you know
> what I mean. There are very few questions that you do not know the answer to, trust me.

**The test, and it is the sharpest form of it we have: would he have to ask an AI to answer this?
Then it is not a question for him.** Research it - the web included - decide it, do it, and write
down what you decided and why. He overrules things that exist; he should not be asked to
adjudicate things that do not.

He was explicit that this is not a request to stop talking to him: *"It's easy for me to answer
questions because I can do that on the phone, so questions are fine"*, and *"there are many things
I want to double-check for real, and it's good that they are added to the walk"*. The cost he is
protecting is not his attention, it is his TIME AT A MACHINE - a sentence costs him nothing, and
clicking through menus and drawing SVGs costs him a lot.

And the standard the work is measured against, which is why the agency matters:

> whatever they are doing, we need to catch up. We need to have a graphic creator that can play out
> graphics that I can use with my students and, one day, with the rest of the world.

MXMZ and singular.live ship these capabilities today. A question parked on his desk overnight is a
day we do not catch up.
