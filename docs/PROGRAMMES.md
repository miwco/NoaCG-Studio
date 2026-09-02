# Programmes - the register

**What this is.** The authorization ledger for long-running programmes: the durable, cross-wave
record of what the owner has authorized the orchestrator to advance without per-step permission.
Ratified by the owner 2026-09-01 with amendments; the argument, the acceptance claims and the
evidence model live in `docs/NORTH_STAR_2027.md`. `docs/GOALS.md` stays the owner's concise
immediate steering document; this file carries the year's authorized work and its state.

**The rules** (`docs/NORTH_STAR_2027.md` §3 is the full contract):

- States: IDEA -> DESIGN -> AUTHORIZED -> ACTIVE -> DELIVERED -> MAINTENANCE. Research is legal
  from IDEA, design sessions from DESIGN, product code only from ACTIVE.
- **Only the owner writes AUTHORIZED**, and the row cites the ruling (date + where it is
  recorded). An AUTHORIZED programme flips ACTIVE by itself when its written entry condition
  becomes true - the flip is recorded here in the same commit as the first work it permits.
- **Scope edges send an ACTIVE programme back to the owner mid-flight**: a new persisted format or
  migration beyond the ratified plan, a new public page/URL, real-money spend, an external account
  or anything published past `main`, a security-boundary change, a change to a stated doctrine.
- **Reopening is automatic**: a red gate mapped to one of a programme's claims, or owner feedback
  naming its surface, reopens the relevant stage and returns the programme to ACTIVE.
- **Never mark a major capability complete because its implementation exists** (owner,
  2026-09-01). A claim advances only when its evidence rung is satisfied:
  implemented -> machine-verified -> scenario-proven -> owner-accepted -> production-proven.
  Owner acceptance is held for the major customer promises and never blocks other work.

| id | programme | state | now / next gate |
|---|---|---|---|
| P1 | Teams | **ACTIVE** (ratified 2026-09-01) | stages 1-3 landed (migrations 0053/0054, then the share dialog 2026-09-02); stage 4 is the team productions list. §8 rulings bind (owner-only move/delete tightens the draft) |
| P2 | Behaviour & Control | DESIGN - round 1 done, owner-read | shortlist M1 recipes + M4 sentence board accepted by the owner 2026-09-01 ("we can go with these"); round 2 = prototypes against the C1-C8 set, plus the states-from-artwork picture (`docs/SVG_STATES_FROM_ARTWORK.md`) awaiting the owner's ladder ruling |
| P3 | Production, Rundown & Media | DESIGN; clip slice AUTHORIZED | clip playout by reference first; slice ACTIVE on the NOW date |
| P4 | Data & Automation | IDEA | design in Q1 windows; data-tree Phase 3 convergence before any connector |
| P5 | Agent Platform | AUTHORIZED per item | the GOALS agent-door boxes; each new key scope and the npm publish are owner actions |
| P6 | OGraf & Interoperability | AUTHORIZED | ACTIVE on 2026-09-12 (the NOW date); the ladder is GOALS.md "NEXT - OGraf-first", unchanged |
| P7 | Creation & Advanced Editor | DESIGN - failure analysis owner-confirmed | the owner read and confirmed the WYSIWYG_PLAN.md analysis 2026-09-01; attempt two spec'd as testable requirements, gated on P2 findings; Jul-Aug 2027 stays proving, not discovering |
| H0 | Reliability (horizontal) | AUTHORIZED | stages attach where first needed; owns the soak driver and the fault harness |

## P1 Teams

State: **ACTIVE** - the owner ratified `docs/TEAMS_PLAN.md` and answered all five §8 questions
on 2026-09-01 (mockups accepted; owner/member roles; owner-only move AND delete - a tightening
of the draft; team bytes on the owner's quota; SMTP/OAuth provisioning starting the same week,
tracked as an owner-action queue item). The model: server-authoritative team productions as a
hybrid - personal libraries, the per-user RLS predicates and LWW sync untouched; graphics enter
by pool-copy. Implementation follows the plan's stages in order; every migration beyond the
plan's M1/M2 is a scope edge. The NOW push (2026-09-12) still outranks it for machine capacity.
Claim: `docs/NORTH_STAR_2027.md` §5 P1. Non-claim v1: simultaneous co-editing of one graphic.
Scope edges: every migration (the RLS surface is the product's security boundary); SMTP/OAuth
provisioning (owner accounts).

**Stages 1 and 2 landed 2026-09-01** - `supabase/migrations/0053_teams_and_membership.sql` (teams,
membership, `is_team_member` / `team_join` / `team_rotate_code`) and `0054_team_productions.sql`
(the shared rundown document, the compare-and-swap save, `control_shows.team_id`, and the one
widened owner policy plus the trigger that keeps it from being a hijack). Both are the plan's
ratified M1/M2 and nothing beyond them; the four places they tighten or repair the §3 sketch are
listed at the end of TEAMS_PLAN §7. Evidence: both apply to a fresh local Supabase stack in CI
with their self-checks running, the CAS race and the non-member refusals are asserted inside the
migrations themselves, and the classifier accepts both without a refusal.

**Stage 3 landed 2026-09-02** - the share dialog, `#/join-team/<code>`, the team chip and
`src/backend/teams.ts`, with no migration: every verb it calls already existed. A signed-in user
creates a team, hands out its join code, joins one, sees who is in it and leaves; MOVING a
production into a team is deliberately still off, because the team productions list that would
show a moved production is stage 4's. Evidence: `npm run build`; an offline build asserted to
grow zero team UI in `e2e/auth.spec.ts`, with both new tests checked by breaking their gate and
watching them fail; and `e2e/configured/teams.spec.ts` walking create -> code -> rotate -> join by
link -> unknown code refused -> delete against the real backend, green. Stage 4 (team production
list, verb saves over CAS, republish by a member) is next and also needs no schema.

## P2 Behaviour & Control

State: DESIGN, as a standing research thread (owner, 2026-09-01 - "the search for the right model
starts now"; do not defer serious exploration). Research rounds, prototypes and challenge
scenarios run continuously beside other programmes' implementation.
**Round 1 done 2026-09-01: `docs/BEHAVIOUR_AUTHORING_RESEARCH.md`** - node-editor failure
analysis, six authoring moments, five candidates judged against the structural doctrine,
shortlist of two (M1 behaviour recipes; M4 sentence board - composing as ladder rungs, not
competitors), the standing 8-brief challenge-graphic set (C1-C8), clickable mockups in
`docs/design/behaviour-authoring/`. Round 2: prototype the shortlist against the challenge set
with a non-programmer proxy; the doc's round-2 plan states the ACTIVE evidence gate.
**Round-2 input (2026-09-01): `docs/SVG_STATES_FROM_ARTWORK.md`** - the owner's imported-quiz
finding driven fresh, his three routes judged (defaults / assigned layers / layer names - a
ladder, not competitors), one recommendation (a default treatment under the drawn-state
mechanism), the student-facing artwork contract, and mockups in `docs/design/svg-states/`.
Decisions §7 of that doc are the owner's.
Entry to ACTIVE (implementation): evidence a candidate surface works, plus the owner's ruling.
Doctrine (owner, 2026-09-01): "no expression language, ever" stands. The requirement is
conditional/state-dependent behaviour through structural states, transitions, events and guards;
reopen the doctrine only if concrete required behaviour proves impossible or materially worse
under the structural model.
Claims: `docs/NORTH_STAR_2027.md` §5 P2.

## P3 Production, Rundown & Media

State: DESIGN; the clip-playout slice is AUTHORIZED (owner, 2026-09-01) and flips ACTIVE on the
NOW date. Clip playout by reference (`docs/backlog/video-through-playout-wrapper.md`): NoaCG
sends the file reference, CasparCG plays it; media never travels through the web. Audio beds the
same way; then rundown v2 and the scripted-show scenario driver (with H0).
Claim (owner-amended, 2026-09-01): the operator runs graphics + stills + video + audio through
the NoaCG rundown and reaches REAL SDI/NDI through CasparCG or other proven infrastructure -
proven as the NoaCG workflow end to end, never assumed from the engine's own capability.
Scope edges: any parallel cue/control system (forbidden by doctrine); show-model changes the
GOALS dashboard boxes hold open (Re-take, SPACE) are the owner's.

## P4 Data & Automation

State: IDEA (design in Q1 windows). Order fixed by the audit: data-tree Phase 3 convergence
first (two data models coexist; a third is forbidden), then the Data Hub as already designed in
the GOALS parking lot, then the fault-injection harness, then Companion-class integration.
Invariants: writes describe state, never graphic commands; ordering is the conflict resolution;
a playout-command API is a new consented permission, not an extension of the data key.
Claims: `docs/NORTH_STAR_2027.md` §5 P4. MOS/NLE: kept possible, not built.

## P5 Agent Platform

State: AUTHORIZED per item - the open agent-door boxes in GOALS.md "NEXT - coding agents" are the
stage list, and the direction pool is `docs/backlog/cli-roadmap.md`.
Owner actions, each its own ruling: the npm publish; every new key scope
(`productions:attach`, cues, data, playout); agent-authored machine blessing.
Architecture rule: one capability, multiple interfaces - bridge functions before CLI features.
Claims: `docs/NORTH_STAR_2027.md` §5 P5, proven by recurring novel-brief benchmark rounds.

## P6 OGraf & Interoperability

State: AUTHORIZED (ratified 2026-08-29, `docs/OGRAF_FIRST_REVIEW.md`); entry condition the NOW
date (2026-09-12), per the owner's 2026-08-30 sequencing ruling - flips ACTIVE then. First tenant
of this register; nothing about it is redesigned here. The entry date gates NEW ladder work, not
a defect in what already ships: on 2026-09-01 the owner authorized the OGraf host-page fix
(checker row X-04) by name ahead of it - "No dates are blocked" - and it landed 2026-09-02.
Stage list: the ladder in `docs/GOALS.md` "NEXT - OGraf-first", verbatim, in its dependency
order. Outreach stays gated behind working playout (owner, 2026-08-29 evening).
Owner actions: the GSAP written clarification; the ecosystem-listing PR and any EBU contact
(gated); Yle's production trial.

## P7 Creation & Advanced Editor

State: DESIGN (owner-amended, 2026-09-01: design/research begins early, not in Jul-Aug).
Incremental creation/import/preset work continues under existing plans. **The required failure
account is written (2026-09-01): `docs/WYSIWYG_PLAN.md` "Why attempt one did not land"** - the
editor was a destination no task led into, judged through front-door defects; what landed
(one-canvas SVG, marquee) was task-entered gestures on the user's own artwork; attempt two is
eight testable requirements, dependent on P2 findings, scheduled so
build -> real use -> rejection/improvement -> retest completes before August 2027 - the final
two months are proving and hardening.
AI-tier gates stay exactly as GOALS.md holds them; this programme does not touch AI sequencing.
Claims: `docs/NORTH_STAR_2027.md` §5 P7.

## H0 Reliability (horizontal)

State: AUTHORIZED with this register. Stages attach where first needed rather than waiting:
the soak/scenario driver (first consumer: P3's scripted show), the generalized fault-injection
harness (first consumer: P4), version/rollback drills on published productions (cloud playout
stages 2-4 as designed), late-year hardware-loop automation investigation.
Claim (owner-amended, 2026-09-01): includes the P3 professional-output proof - the 24-hour soak
runs the NoaCG workflow against real outputs, and "the engine supports it" is never the evidence.
