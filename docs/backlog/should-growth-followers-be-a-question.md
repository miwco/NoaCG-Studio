---
v: 1
source: owner
raised: 2026-09-05
state: unstarted
asked: "I feel like this option seems unnecessary. I think it might even just be more confusing to
  get these options... when the question becomes long and the box gets bigger, everything else
  should just move out of the way."
---
# Should "what else moves when the panel grows" be a question at all?

The DEFECT half of this is fixed (2026-09-05): "Grows by the same amount" wrote a width onto
elements that have none - a text layer, a group - so choosing it silently stopped that layer
following at all. The option is no longer offered to a layer that cannot stretch, and a template
saved with it travels instead.

What remains is the owner's larger point, which is a design question rather than a bug:

> In any case, I feel like this option seems unnecessary. I think it might even just be more
> confusing to get these options, or then I'm not using it correctly, but when the question becomes
> long and the box gets bigger, everything else should just move out of the way.

He is describing a default that is right almost always. A student meets this control on their first
import, and every choice they have to understand before dismissing it is a tax on the one road the
current push cares about.

Settle it with the corpus rather than by taste (`e2e/fixtures/svg-corpus/`): count how many real
graphics need anything other than "moves out of the way", and what breaks for them if the option
goes. The likely shape of the answer is a default that needs no decision, with stretching reachable
for the one artwork in twenty that wants it - a rail drawn down a panel's edge, a band behind a
growing block - rather than two equal choices presented flat.

**Do not break what works**: his words, in the same message. The move-out-of-the-way path is what
he found working, and every corpus graphic is gated on it.

Related: `docs/backlog/svg-growth-default-across-exporters.md`,
`docs/backlog/the-text-step-breaks-when-you-play-with-it.md` (same session; its second symptom, a
panel that stopped growing on a second try, may share a cause).
