# Handoff - the 2026-08-29 day wave, closed clean, and what the next orchestrator carries

Written by the closing orchestrator session so nothing lives only in its chat. Plain language on
purpose: the owner reads this too.

## What landed today (all through the queue, nothing refused unresolved)

- **Walk branch** - the owner's morning verdicts recorded, the style-rename parked for a quiet
  day, and three orchestration rules added (subagent launches are the standard, reports speak
  plainly, a guard quirk noted).
- **CC, playout polish** - a running countdown now picks up a changed time when Update is
  pressed (and ONLY when its own fields changed - an unrelated update never touches the clock;
  both directions are regression-tested). The confusing "output not seen lately" text appears
  only when an output actually exists, and explains itself. The + New graphic button sits left
  of the spacer, beside Home, on every surface - and stays blue.
- **DD, SVG fitting round two** - the owner's three complaints were one root bug: the growth
  cap measured from the wrong edge of the frame, which made line-wrapping mathematically
  impossible. Now: widen first, then WRAP with the panel growing UPWARD (the on-air edge never
  moves) using margins measured from the designer's own artwork, shrink truly last. Proven on
  the owner's exact test file.
- **EE, faster template checks** - checking a one-design change now takes 56 seconds instead of
  15 minutes (16x), with the full sweep still running nightly so nothing hides. Its scoping was
  adversarially reviewed and three "measures less and says nothing" bugs were fixed before
  landing.
- **FF, IBC readiness** - the surprise: there is NO official EBU vendor list; the list
  broadcasters browse is ograf.dev/ecosystem (community-run, submission by pull request), where
  six competitors are listed and we are not. Our schema conformance is now checked automatically
  every week. docs/IBC_LISTING_CHECKLIST.md has everything ready to paste.

## The questionnaire the next orchestrator asks the owner (decisions taken on his behalf)

1. CC decided a countdown's Update RE-ARMS the clock when the clock's own fields changed, and
   never otherwise. (The house precedent in sports clocks agreed.) Keep or veto?
2. DD decided wrapping "buys" room by growing the panel upward, away from the on-air edge - and
   changed the import default to the FULL ladder (widen-wrap-shrink) instead of widen-only.
   The default change is the taste call DD itself flagged. Keep or narrow?
3. CC decided the output-health text is hidden until an output has ever been opened. Keep?
4. The whole wave was auto-launched as subagents while the owner was away - the first fully
   hands-off day wave. Comfortable as the norm?

## Needs the owner (in order)

1. **TIME-CRITICAL: the IBC steps** - docs/IBC_LISTING_CHECKLIST.md section 4, about 45
   minutes total: the ecosystem pull request, the EBU pitch-session signup (the event is
   2026-09-12 - do the signup THIS WEEK), the working-group email, the optional EBU README PR.
2. **/walk** - countdown update on air, fitting round three (his gradient file), the readout
   and button re-look, the catalog-checks speedup item, and the IBC checklist read.
3. The ladder-default taste call (questionnaire item 2).

## Watch, resolved and open

- student-rehearsal spec timeout: CLEARED - DD re-ran it 2/2 green; it was machine contention.
- video-project spec: one timeout seen once in a contended run - watch, don't chase; a real
  regression fails twice.

## For the next wave (the durable list is memory `wave-leftovers-2026-08-27`)

- TOP machinery fix: the cwd-resolution class, now four confirmed members in one day - the
  code-review skill reviews the WRONG TREE from worktrees (three confirmations), the
  integration guard blocks worktree sessions on the main checkout's dev server, worktrees
  cannot run the sweep, and two queue-spawn quirks DD recorded. One rule fixes them: every tool
  resolves paths and ports from the worktree it targets, never the session's cwd.
- CC's three chips are wave rows now (owner dismisses the chips): two fold into the fixes
  above; the third is an unwired AI countdown block in src/blocks/registry.ts carrying the
  stale-clock bug - fix or delete.
- The instruction files sit ~100 bytes from their size cap - the second coherence session
  condenses them before an emergency addition fails.
- /check trial day two: hand-reviews caught real defects in three sessions; keep the trial,
  and note the review SKILL itself is the wrong-tree bug above.
- Still open from earlier: proving rounds (credits first), ProductionPage phases 2+ (daylight),
  the quality-review-breach investigation, the editor blank-stage small session, the parked
  style-rename (quiet day).
