# 2026-09-01 - session K - containment is not a landing

Branch `claude/k-followon-trigger`, one commit. Opened by the orchestrator session under its own
contract carve-out, hours after that contract landed, because using it found a hole in it.

## The defect

`.agent-workflows/orchestrator/night.md` told a night wave to fire a follow-on when its trigger
branch had landed, and gave the check as:

    git fetch && git merge-base --is-ancestor <branch> origin/main

**A branch that has never committed is trivially an ancestor of `origin/main`.** So that check
returns true the moment the branch is CREATED, and a follow-on keyed on it would launch against
work that does not exist.

Measured, not reasoned: at 00:20 row H had been launched and had committed nothing, and

    claude/h-orchestration-guardrails   commits-ahead=0   tip=e9cc60d8
    origin/main = e9cc60d8

so the ancestor check reported a session that had done no work as having landed.

## What is actually true

`scripts/wave-tick.mjs` was right all along and needed no change: it emits `LANDED` on the
TRANSITION (`branch.landed && before && !before.landed`, line ~106) - a branch it previously saw
AHEAD of main and now sees contained. Containment on its own means landed OR empty, and only the
previous tick separates them. The prose was the wrong half, and prose is what a session follows
when it checks a trigger by hand at 03:00.

`night.md` now says so, and `incidents.md` carries the case as "the empty branch that read as
landed" - including the part worth keeping beyond this bug: **the fallback a session reaches for
when it distrusts an instrument needs the same scrutiny as the instrument.** This ancestor check
was adopted as a manual cross-check the same night, precisely because `landingStateFor` was
misreporting landings (row J), and it had its own defect.

## Blast radius tonight: none

No follow-on was mis-fired. H was the wave's only follow-on and its trigger, `claude/f-worktree-preview`,
genuinely had commits when the trigger was checked - verified from the job log
(`auto-merge: landed claude/f-worktree-preview`) rather than from containment alone. The hole was
one unlucky timing away from firing H against an empty branch.

## `/check` result

- **review: `inline`.** Both factual claims in the new text were tested rather than asserted. That
  an empty branch passes the ancestor check: demonstrated on H above. That `wave-tick.mjs` keys on
  the transition: read at `deltaBetween`, line ~106. That `git rev-list --count origin/main..<branch>`
  returning 0 is ambiguous: confirmed against both arms the same minute - H (0, empty) and
  `claude/g-teams-schema` (0, genuinely landed as `bf23479a`).
- **simplify: `inline`.** Two markdown files, one rule clause and one incident entry. Nothing to
  dedupe; the rule cites the incident rather than restating it, which is the pattern the rebuild
  established earlier tonight.
- **verify: `inline`.** `npm run build` green, `dist/version.json` confirming it gated
  `claude/k-followon-trigger` rather than another tree. The modular gate still reports core
  171/200 lines, 9 modules, all linked.

## What is left

Nothing. The rule this fixes is prose, so there is no test to add - which is itself the honest
weakness: the contract's other two size and linkage properties are gated by
`check-shared-instructions.mjs`, and its correctness claims are not. A gate that could catch a
false claim in a contract is not obviously buildable and no attempt is filed.
