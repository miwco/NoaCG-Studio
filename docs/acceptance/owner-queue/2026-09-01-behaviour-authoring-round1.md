# Behaviour authoring research, round 1 - three clickable models to feel out

Date: 2026-09-01
Kind: walk

## What changed

P2's standing research thread produced its first round: `docs/BEHAVIOUR_AUTHORING_RESEARCH.md` -
the node-editor failure analysis (ranked causes, not vibes), six candidate interaction models for
how a non-programmer authors and CHANGES a graphic's logic, a shortlist of two for round-2
prototyping (behaviour recipes + the sentence board), the eight-brief challenge-graphic set that
becomes the standing evaluation bar, and three clickable mockups. "No expression language, ever"
held everywhere - each candidate's assessment says where the temptation was and how it was
refused.

## The route (about five minutes)

Open the three mockups - each is one self-contained file, double-click or use the artifact link:

- `docs/design/behaviour-authoring/recipes.html` - pick a recipe, toggle "Require Lock before
  Reveal" OFF and watch the Lock button leave the operator panel.
  <https://claude.ai/code/artifact/95424d4a-268a-4611-aedb-1735dd07d621>
- `docs/design/behaviour-authoring/sentence-board.html` - the quiz as sentences; delete the two
  Lock sentences and add a reveal-from-picked one via the three-question flow.
  <https://claude.ai/code/artifact/84402755-4561-428d-b422-9bfa367c5e88>
- `docs/design/behaviour-authoring/panel-first.html` - the auction panel with SOLD missing; add
  the button and watch the machine read-back grow.
  <https://claude.ai/code/artifact/313fe9bd-5007-4468-af1e-86c43f9d1dca>

Then skim `docs/BEHAVIOUR_AUTHORING_RESEARCH.md` §3 (the shortlist argument) and §4 (the eight
challenge briefs) if you want the reasoning.

## What to look at

Which of the three ways of saying "when the operator presses X, Y happens" you can automatically
understand - your own bar. The panel buttons in every mockup are live: press them and watch the
greying. Round 2 wires the two shortlisted models to the real machine and tests them against the
challenge briefs with someone who did not build them.

Your read STEERS round 2 - it does not block it. The research thread continues either way; a
taste verdict here saves a round of prototyping in the wrong direction.
