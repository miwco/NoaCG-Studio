---
v: 2
source: owner
kind: ask
raised: 2026-09-05
state: unstarted
asked: "that has to be made very clear: how it finds those states, because it's such a hassle to
  click through 16 boxes... a small warning could pop up if you import a quiz and you have a lot of
  fields that are not automatically mapped. It could then explain how to map them. Also, here we
  should have a button that... automatically arranges the fields based on how they should be."
---
# The mapping step should say how the names work, and offer to do it for you

Owner, 2026-09-05, straight after the sample quiz board worked end to end. The praise is the
finding: the automatic part is worth so much that the manual part now stands out.

> I'm very happy that it automatically knows the different states based on the names of the layers,
> I guess, but that has to be made very clear: how it finds those states, because it's such a
> hassle to click through 16 boxes. How to name fields needs to be clear, and we could have some
> extra information. For example, a small warning could pop up if you import a quiz and you have a
> lot of fields that are not automatically mapped. It could then explain how to map them.
>
> Also, here we should have a button that uses an auto-weight model and just automatically arranges
> the fields based on how they should be.
>
> Of course, if you do it through the CLI, then we should have a very clear workflow for how the
> Codex or Claude Code creates a quiz with all those different layers working correctly
> automatically.

## Four asks, smallest first

1. **Say how the matching works, where the matching happens.** The rules are written well in
   `docs/SVG_AUTHORING.md` §5b, and a student in the Fields step is not reading a document. The
   naming that would have filled a picker belongs beside the picker that stayed empty.
2. **Notice when a lot did not match, and explain.** A quiz whose layers auto-fill leaves nothing to
   do; a quiz whose layers are called "Group 7" leaves sixteen pickers, and today both look the
   same. The number of unmatched moments is already known at that moment - it is the count behind
   the pickers - so the warning costs no new measurement, only a decision about what to say.
3. **A button that fills them in.** He calls it "an auto-weight model"; what he wants is one press
   that arranges the fields the way they should be, instead of sixteen. This is the biggest of the
   four and the one to specify carefully - what it proposes must be visible and reversible, because
   a wrong automatic binding on somebody's own artwork is worse than an empty picker.
4. **The same road for an agent.** A clear CLI workflow so Codex or Claude Code produces a quiz with
   its layers correct, first time. `cli/` has the scaffold verbs and
   `docs/backlog/cli-roadmap.md` is where that belongs; the naming contract it would follow is the
   same §5b table.

## What already exists, and must be read before building any of it

- **The matcher.** The existing auto-binding is what impressed him. Its known gap is recorded in
  `docs/handoffs/2026-09-01-c-svg-state-workflow.md`: an Inkscape board's "A picked" was MISSED
  because the matcher wants "select" while the UI column says PICKED. A wider matcher was proposed
  there and is exactly ask 3's foundation.
- **The ratified ladder.** `docs/SVG_STATES_FROM_ARTWORK.md` §7 and the two mockups under
  `docs/design/svg-states/` - the owner walked and ratified this on 2026-09-03, including the
  neutral default look. Ask 2 is close to the "unassigned moment" wording that design already
  settled: it reads "NoaCG's default look" rather than "- not drawn -".
- **The programme.** P2 (`docs/PROGRAMMES.md`), round 2 = prototypes against the C1-C8 challenge
  set. These four asks are evidence for that round, from the first outside user to walk the whole
  road, and should be read as requirements rather than as a separate feature request.
