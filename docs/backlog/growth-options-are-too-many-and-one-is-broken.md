---
v: 1
source: owner
raised: 2026-09-05
state: unstarted
asked: "If you chose 'grows by the same amount', then the text gets misaligned... I feel like this
  option seems unnecessary. I think it might even just be more confusing to get these options...
  when the question becomes long and the box gets bigger, everything else should just move out of
  the way."
---
# "What else moves when the question grows" - five options, one that works, and a question about why there are five

Owner, 2026-09-05, on the growth-follower controls in the SVG import wizard, after importing the
sample quiz board. Verbatim:

> There are the five options on "What else moves when the question becomes longer" and the only one
> that works is the one that says it moves out of the way. If you chose "grows by the same amount",
> then the text gets misaligned. In any case, I feel like this option seems unnecessary. I think it
> might even just be more confusing to get these options, or then I'm not using it correctly, but
> when the question becomes long and the box gets bigger, everything else should just move out of
> the way. "Grows by the same amount" did not make any sense, at least when I tried it, and it
> didn't work out because the text didn't follow the box.

(Dictated, so the first sentence is reconstructed from the rest; the substance is unambiguous and
is repeated three times.)

## Two separate things, and they need separating before anything is built

**A defect.** "Grows by the same amount" moves the box and leaves the text where it was - the text
does not follow its own panel. Whatever the option is for, that is broken rather than confusing,
and it can be fixed on its own without touching the option set.

**A design question he is raising, not asking us to answer:** whether five options should exist at
all. His reasoning is a default worth taking seriously - when a panel grows, the obvious and almost
always correct behaviour is that its neighbours move out of the way, and every other choice is a
special case somebody has to understand before they can dismiss it. A student meets this control on
their first import.

Deciding it is a design default, so it is ours to settle and report rather than his to adjudicate
(`docs/acceptance/OWNER_QUEUE.md`, "A design default is NOT a taste question"). But settle it with
evidence: the options were built for real cases, and the corpus is where the argument is
(`e2e/fixtures/svg-corpus/`). The likely shape of the answer is a sensible default that needs no
decision, with the rest reachable for the one artwork in twenty that needs them - not five equal
choices presented flat to somebody importing their first file.

**Do not break what works.** He was explicit: *"The important thing is that we should not break
anything that already works."* The move-out-of-the-way path is what he found working, and it is the
one every existing corpus graphic is gated on.

## Related, already open

- `docs/backlog/svg-growth-default-across-exporters.md`
- `docs/backlog/the-text-step-breaks-when-you-play-with-it.md` - the same session, and the second
  symptom there (the panel that stopped growing on a second try) may share a cause with this one.
