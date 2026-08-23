# Agent round 2026-08-22 - the verdict

The owner's blind read happened 2026-08-23 against the published gallery (25 cards, opaque ids,
no arms). This file joins that read with the measured half (`RESULTS.md`) and states what
changes. The full round stays archived at `C:\claude\noacg-bench-archive\agent-round-2026-08-22\`.

## The blind read, in one line

**Every one of the 25 graphics was airable, and the owner could not separate the arms visually.**
Direct quotes: "they all look good", "I could air any of these", "I cannot say what is better" -
and the owner declined to score visuals rather than force differences that were not there. That
non-result IS the round's central visual finding: with a frontier coding agent in the loop,
design guidance (arm E) and a dedicated design skill (arm D) produced nothing the owner could
see, while the measured half says arm D paid the most for it (5.7 validate rounds and 88 min
against the round's 2.5-4.2 elsewhere).

The read also outranks the whole earlier API route: "All the graphics are so much better than
through the Create with AI and the API... I did not understand how important the harness
actually was."

Specific notes from the read (arm attribution impossible - the dictated ids did not match the
key, and it does not change the verdict):

- **Two-sided boards must give both sides EQUAL space.** On a scoreboard frame the longer team
  name took more width than the shorter one. The owner's rule: never size the graphic by the
  name; fix the two columns, then wrap or shrink a long name inside its own side. (The same
  card's long-values frame held its size, which the owner called "the way to go".)
- A live-vote card read as "too much information for a broadcast screen" (the graphic itself
  fine) - density is a brief/taste axis the validator does not measure.
- Lower-third nits: name-to-title spacing a touch large on one; an accent corner whose bottom
  stroke was thicker than its side stroke read as possibly-a-mistake; per-line shaded boxes and
  accent-over-title were noted as taste, not faults.

## The decision (what the skill recommends by default)

1. **The skill stays CONTRACT-ONLY, and free authoring stays the default.** The round was built
   to catch design guidance earning a place in the default skill; it did not. `design-notes.md`
   stays optional and off by default. No taste, motion or composition doctrine enters the skill.
2. **One recommendation is sharpened, on the actions evidence:** when a brief needs operator
   ACTIONS and a registered type carries them, START from the type scaffold. In the measured
   half the scaffold arms carried (and extended) the machine every time, while free-authoring
   arms shipped the state as extra fields on 4 of the 7 typed-action cells (scoreboard A/D/E,
   countdown A) - a validator-clean graphic whose operator cannot do what the brief asked.
   The skill's loop already says this; its wording now says it as a rule of thumb rather than
   an aside, and step 4 tells the agent to check `inspect` against what the operator NEEDS.
3. **Agent-authored machines are now an evidenced question, not a hypothetical.** All five
   novel-brief cells authored a working machine from scratch - `switch`/`penalty`/`reset` on
   the control panel, zero category code, validator clean. That is the exact evidence the
   plan's Future item ("agent-authored machines - after the measured round shows the validator
   holds") was waiting for. Blessing it in the skill is the owner's call, not this round's.

## Why the agent route beats the API route (the owner's question, written down)

The API route (Lite/Pro) sends one prompt to a cheap model through a fixed pipeline: bounded
repair rounds, no eyes, no tools, our harness doing all the seeing and fixing. The agent route
inverts every one of those:

- **The loop is closed by the agent itself.** It renders, LOOKS at the frame (`--screenshots`),
  reads the validator's teaching lines, edits, and repeats until IT would air the result -
  2-8 cycles in this round, chosen by need, not by a pipeline constant.
- **A frontier model with tools** writes the code - the same class of model that produced our
  best hand-made graphics - where the funded tiers are cost-bound to cheap models by policy.
- **The platform contributes exactly its comparative advantage**: the contract, the validator,
  the bench, the operator surface, playout - and stays silent on the look. The earlier API
  harness had to encode taste as prompt doctrine; here taste lives in the agent.
- **The economics flip.** ~$2-10 of the USER'S OWN agent per graphic (this round: ~$5.2/cell
  notional) versus our funded $0.0003-0.004 - unaffordable as a hosted tier, free to us as a
  BRIDGE. That is the product hypothesis the plan states, now measured.

What the funded tiers can BORROW from this (proposed next study, not started): diff the round's
winning cells against Lite/Pro output on the same briefs - concretely which decisions the
closed loop fixed (overflow handling, spacing, hierarchy) - and see which of them the platform
can enforce or compose deterministically, which is the only way they reach a cheap-model tier.

## Filed follow-ups (owner findings, not this branch's work)

- Two-sided EQUAL-SPACE rule: candidate for a bench warning (`bench-side-balance`) measuring
  side-width asymmetry on A/B-token boards, and for the neutral scoreboard scaffold's CSS.
- Density guidance for information-heavy briefs is a brief-writing concern, not a validator one.
- The gallery cannot show MOTION or the feel of OPERATING; if the owner wants a second look,
  the archive's packages can be driven live (entrance strips, control-panel walk) on request.
