---
source: owner
raised: 2026-08-30
state: parked
note: "the harness safety classifier refused an agent building it (orchestrator incidents, 'the two classifier refusals'); the owner starts it in a session he opens, and until then the plain push stays behind a prompt"
asked: "pre-approve exactly the safe git push shape that no text prefix can express - we want autonomous agents, but scope it as narrowly as you can so we don't put ourselves at any extra risk"
---
# A narrow pre-approval for the safe `git push` shape

**Filed:** 2026-09-02, from the 2026-08-30 owner rulings (memory `owner-decisions-2026-08-30`,
ruling 3). **Source:** owner ruling, 2026-08-30 morning.

## Why

Every `git push` in a wave session is a permission prompt, and a wave may not depend on a prompt
being answered (`.agent-workflows/orchestrator/launch.md`). No allowlist prefix can express the
safe shape: a prefix pattern cannot exclude `--force`, `--delete` or a `main` refspec appended to
it (`docs/AGENT_WORKFLOWS.md`, "Permissions"). So the safe shape needs a PreToolUse hook that
parses the push - current branch, to `origin`, no force, no delete, never `main` - and allows
exactly that.

## What it would take

A hook in `scripts/hooks/` with a pure matcher in `scripts/command-match.mjs` and tests for every
refusal shape, registered in the tracked `.claude/settings.json`. The 2026-08-30 attempt to launch
this as a wave row was refused by the harness safety classifier, correctly: an autonomous agent
widening the machine's permission posture is what that check exists to stop, and owner
ratification does not reach it. The owner starts it himself, in a session he opens.

## Evidence

`.agent-workflows/orchestrator/incidents.md`, "the two classifier refusals" (2026-08-30). The
queue's own landing job pushes for a session, so the prompt now bites mainly on a session's
pre-check push and on the rare hand push.
