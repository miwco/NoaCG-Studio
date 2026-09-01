# North Star 2027 + the programme system - a proposal waiting on your ruling

Date: 2026-09-01

## What changed

You asked for a one-year roadmap and a governance system that keeps the orchestrator moving
through authorized programmes without your availability deciding whether development continues.
The repository audit is done and the proposal is written: `docs/NORTH_STAR_2027.md`. Nothing in it
is active; `docs/GOALS.md` binds alone until you rule.

The short version:

- **Twelve corrections to your brief** came out of the audit (§1) - the largest: issue #48 is a
  prose brief whose questions the ratified OGraf review already answered; Behaviour & Control is
  far more built than assumed (the open problem is the authoring surface both prior attempts
  failed at); and the governance seed already exists in the orchestrator contract, missing only a
  register artifact.
- **The system is one new file**, `docs/PROGRAMMES.md`: programme states
  (IDEA/DESIGN/AUTHORIZED/ACTIVE/DELIVERED/MAINTENANCE), owner-only promotion, scope edges that
  send work back to you mid-flight, and one new rung in the orchestrator's fill order. The 24-hour
  ceiling, daily reports, the walk queue and the landing queue are untouched.
- **Eight programmes** (Teams, Behaviour & Control, Production/Rundown/Media, Data & Automation,
  Agent Platform, OGraf verbatim from the ratified ladder, Creation, Reliability horizontal), each
  with customer-facing acceptance claims and the evidence that proves the claim rather than the
  implementation.
- **"Done" = five maturity rungs per claim**, mapped onto machinery that already exists; four
  named verification build-outs (multi-user e2e, property tests, fault harness, soak).

## The route (about five minutes)

Open `docs/NORTH_STAR_2027.md` and read §1 (the audit corrections), §3 (the governance), and §9
(your decision list - six items). §5 and §6 are the programmes and the year if you want the full
picture.

## What to look at

Whether the corrections match your understanding, whether owner-only promotion plus scope edges is
enough strategic control, and the six §9 decisions - especially Teams design starting now, OGraf
auto-activating on the NOW date, and clip playout as the first Production/Media slice.
