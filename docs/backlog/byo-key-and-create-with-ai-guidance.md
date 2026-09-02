---
v: 1
source: owner
raised: 2026-08-26
state: unstarted
asked: "steer users to their own Claude Code - better and cheaper - before any key entry"
---
# Steer users to their own coding agent before asking them for a key

**Filed:** 2026-08-26. **Source:** owner ruling, in session.

The owner's words: **steer users to their own Claude Code - better and cheaper - before any key
entry.** Today "Create with AI" opens with a tier picker whose Custom/BYO path asks a
non-technical person for an API key, and nothing anywhere tells the user that they may already own
a better route to the same graphic.

## Why

Three separate reasons, and each would be enough on its own:

1. **It is honestly the better result.** Somebody with a Claude Code subscription already has a
   frontier model and an agent loop. The `noacg` CLI and MCP server exist precisely so that agent
   can scaffold, validate, bench, screenshot and save into their library (`docs/AGENT_CLI.md`).
   That path beats a single hosted generation and it beats a BYO key wired into our wizard.
2. **It is cheaper for them.** They are paying for it already. Asking for a second credential and
   a second bill for a worse answer is the wrong recommendation, and we are the ones who know it.
3. **A key-entry field is a wall.** The product's whole posture is that there is no login wall
   (root `AGENTS.md`, "Auth posture"). A key box on the one door marked AI is the same wall with a
   different sign, and it is the first thing a curious user hits.

The gate for entering a key should be "I have one and I want to use it", never "this is how you
get an AI graphic here".

## What it would take

Copy and ordering, not architecture:

- The AI entry card and its settings sheet name the agent route FIRST, with the one command to
  install the skill, and the key field second and clearly optional.
- `/docs` gets the same ordering. The agent-door guide exists; it is not what a user meets first.
- Nothing hosted changes. Lite stays the zero-setup path for somebody with no agent at all.

The work is deciding the wording, then applying it in three or four places. Wording is the hard
half: it must not read as "go away and use something else".

## Evidence

- Owner, 2026-08-26, in session: users' own Claude Code is "better and cheaper" than key entry.
- `docs/AGENT_CLI.md` - the CLI, the MCP server and the shipped `noacg-graphic` skill are already
  built and published; this is a signposting gap, not a capability gap.
- `docs/ADMIN.md` §10 and the memory entry `model-cost-policy` - frontier models are only ever on
  the user's OWN key, which is the same principle stated from the cost side.
