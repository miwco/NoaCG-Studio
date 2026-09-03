---
v: 1
source: owner
raised: 2026-09-03
state: unstarted
asked: "I want a memory system that is smaller, current, internally consistent, and reliably surfaces the instructions that actually matter... audit and consolidate them yourself, then interview me only where you find genuine ambiguity or conflicts."
---
# Drain the memory store down to its charter

**Filed:** 2026-09-03. **Source:** owner ruling. The ARCHITECTURE landed the same day
(`docs/MISTAKE_TRIGGERS.md` "Memory: the weakest trigger", the rewritten `MEMORY.md` header, and
the extended `~/.claude/hooks/memory-audit.mjs`). **This item is the migration, not the design.**

## Why

The physics are fixed; the store is not. Measured 2026-09-03 by the upgraded audit hook:

| | now | target |
|---|---|---|
| corpus | **168 KB / 49 entries** | 40 KB |
| entries claiming the retired `exit: never` | **41** | at most 6, each with a real `holds-while:` |
| entries declaring `strength:` | **0 of 49** | all |
| `[[link]]` targets that do not exist | **42** | 0 |
| index | 61 lines (over its 60 ceiling before the header grew) | under |

**A manual cleanup has already been tried and did not hold.** 203 entries were archived on
2026-08-25; nine days later the store was back to 49 entries and 168 KB, about five a day. So the
drain only pays off underneath the new rules - do the routing, not another cull.

## What it would take

Order matters; step 1 is what makes the rest safe.

1. **Map the graph before deleting anything.** `landing-is-serialized` has six inbound `[[links]]`
   and its content is already in root `AGENTS.md`; deleting the file naively creates six more
   dangling links, which is the fault being fixed. Deletion is a GRAPH operation: repoint inbound
   links at the live entry or at the repo doc that now holds the fact, then remove.
2. **Route by the charter, entry by entry.** For each: can it fire at a MOMENT? If yes it is a
   hook, a gate, or the contract that loads there - move the content and delete the memory. If no,
   it stays and gets `decided:`, `strength:` and `holds-while:`. Verified duplicates found so far,
   both safe once their links are repointed: `commit-message-style` and `landing-is-serialized`
   (both fully covered by root `AGENTS.md`).
3. **Drain the eight dated receipt files** - `owner-decisions-2026-08-08/27/29/30`,
   `wave-leftovers-2026-08-27`, `operator-stories-2026-08-27`, `open-threads`,
   `next-wave-candidate-rows`. These are meeting minutes: live rulings buried inside dead detail,
   which is exactly where a lapsed opinion later reads as a standing rule. `MEMORY.md` was already
   tracking one supersession in PROSE inside an index line ("machines bullet superseded"). Extract
   each live ruling to its own subject entry; delete the receipt. Git keeps the minutes.
4. **Fix the 42 dangling links** as a sweep once 1-3 are done, since those steps change the set.
5. **Re-run the hook until it is quiet.** It reports every one of these numbers, so "done" is a
   measurement rather than a feeling.

## Interview, not review

The owner ruled he will not read every file: *"interview me only where you find genuine ambiguity
or conflicts."* So a session doing this asks him ONLY where routing is genuinely undecidable, one
line each, batched as `kind: walk-p` owner-queue items ("is this still relevant?", "does this newer
rule replace this older one?"). **Ambiguity never blocks the drain** - route it, mark
`strength: preference` so it cannot bind, and ship the rest.

Two entries already checked and NOT ambiguous, recorded so they are not re-litigated:
`one-orchestrator-at-a-time` and `ai-gallery-sameness-verdict` are both well written, state their
why, their evidence and their own revisit test. The store's problem is systemic, not per-file - do
not arrive expecting to find bad memories.

## Evidence

- `node ~/.claude/hooks/memory-audit.mjs` - every number in the table above.
- `C:\claude\memory-archive-2026-08-25\` - 203 files, the cleanup that did not hold.
- `docs/MISTAKE_TRIGGERS.md` "Memory: the weakest trigger" - the charter, the precedence order and
  the chip-rule incident that showed a recorded, loaded, agreed-with rule can still never fire.
