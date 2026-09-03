# Routing - which pool does each row's work

Loaded while the prompts are written. **Every row names its POOL** in the wave table and carries
one clause on the kind of thinking the task rewards on its `MODEL` line; `wave-plan-check` refuses
a row without a pool. Routing is a STEP because it was skipped: the 2026-09-01 night wave sent
ten rows to Opus and used the other pools for nothing, not by decision but by omission
(`incidents.md`, "the ten rows that all went to Opus").

## The pools

| POOL | what it is for | how a row reaches it |
| --- | --- | --- |
| `opus` | **the default.** The master's model AND a major implementation pool. Useful engineering stays here; it is never pushed off Opus because a cheaper model exists | the Agent tool, or headless `claude -p` when the effort matters and CLI auth is verified that day |
| `fable` | what the day's direction turns on: consequential architecture, difficult reasoning, UI/UX/design, adversarial review of a big call. Never volume, never residency; `high` is its default effort | the Agent tool with the model named; a plan review runs as an `so` row |
| `sonnet` | genuinely mechanical work with a written recipe and a written verification - a rename, a transcription | the Agent tool |
| `agy-gemini` | Antigravity's Gemini pool, and since 2026-09-03 a real IMPLEMENTATION worker rather than a read-mostly one. **It is the BROAD pool, not a shrinking one - eleven models when last counted. Its newest tier outranks the documented default by VERSION and lost to it on measurement (tie on correctness, 5.3x slower), so the default stands; do not reach past it on version alone.** Used aggressively on the task classes the ledger shows it passes: cross-file comprehension, corpus sweeps, a bounded artifact written to a spec, well-scoped writes in volume | `npm run agy:read` / `npm run agy -- --write`, from inside the Claude row that owns the spec - both doors allowlisted, so neither costs a night a permission prompt |
| `agy-claude-gpt` | Antigravity's second, largely unused pool - same wrapper, separate meter, no `--effort` flag. **Genuinely thin at three models, unlike the Gemini pool above.** Used deliberately for the same classes, so both idle allowances do work | the same wrapper, model pinned |
| `codex` | native Codex: excellent on work that is long to do and short to specify, and externally shared, so its capacity is volatile. Availability-routed, never structural: a Codex row needs the plan-time snapshot to show headroom, and names a fallback pool. Not a wave peer - no loop, no auto-launch - so a `codex/` row is user-started or reached through the `rescue` workflow from inside a Claude row, and is never a follow-on, a continuation or a cohort row. That asymmetry is deliberate; no parallel Codex loop is built to remove it | the `rescue` workflow |

## The step, and when it is done

1. **Read the capacity snapshot** - `npm run harness:usage`: the Codex window percentages when a
   snapshot exists (three-valued: headroom / low / UNKNOWN, and unknown routes like low), what each
   Antigravity pool has been asked lately, and the outcomes table per pool and task class. Write
   one line, `Pools at plan time: ...`, into the wave-state file. That line is the evidence the
   routing was decided on, and the check refuses a plan without it.
2. **For every row, name the pool that does the BULK of the work, and why.** `opus high` needs no
   defence. Move DOWN only for mechanical work with a written recipe; move UP only for the row the
   day turns on. **Delegate when the work is long to do and short to specify** and the ledger shows
   that pool passing that class - a bounded artifact, a sweep, a transcription. Keep on Claude:
   judgement about this product, and anything that must be landed, gated or merged.
3. **A delegated row says so in its prompt**, and the Claude row that owns it still owns the spec,
   the verification and the landing. The prompt declares the delegate's tool set (an `agy` write
   fails on its first tool call otherwise), gives absolute paths, hands over verified payloads, and
   writes the acceptance conditions before delegating.
   **A delegation that returns nothing is a PROMPT defect until proven otherwise**: pass `--write`
   when it must write, give the WORKTREE's absolute paths (`incidents.md`, "the null delegation"),
   and ENUMERATE the files - headless `agy` auto-denies the permission a directory walk needs, so a
   sweep told to walk one returns nothing (see "A sweep must be handed its FILES" in
   `docs/HARNESS_ROUTING.md`). **So a pool's ledger numbers UNDERSTATE it wherever the failure was
   the prompt's** - read a low first-pass rate against the prompts before routing away from a pool.
   **The result is verified by re-deriving it, and a delegated artifact is not verified until the
   gate that consumes it has run**; `node scripts/delegation-outcome.mjs` records the outcome.
   **A WRITE delegation lands like any other work**: the wrapper refuses a write outside a linked
   worktree, on `main` or on a detached HEAD, and prints what it changed; the owning row reads
   every path, gates, checks and queues.
4. **A tier is a floor the receiving session may RAISE, never a ceiling it may quietly lower.**

Done when every row in the table has a pool, every non-Claude pool row names its fallback, the
snapshot line is written, and `node scripts/wave-plan-check.mjs` says so.

## Effort, on the MODEL line

**The line names a rung, and `launch.md` maps each rung to the agent definition that carries it** -
naming a model alone loses the effort. `opus high` is the default and most rows carry it; `opus low` / `opus medium` for settled work
where the reasoning is bookkeeping; `opus xhigh` / `opus max` when one wrong judgement is expensive
AND the evidence is already gathered - deciding, not exploring; `fable high` for the high-value
row; `ultracode` only for a real fan-out over many independent items or a verdict worth adversarial
verification, named on the line. Justify every rung off the default in the same line. The second
half of the line names the KIND of reasoning - *reproduce then measure, never infer* / *adversarial,
default to refuted* / *mechanical, the design is settled* / *design judgement, taste is the output*.

## Where the facts live

Model ids, prices, quotas, which flag which pool accepts, what each pool has been measured to do:
never in this contract. `docs/HARNESS_ROUTING.md` is the append-only judgement with its
measurements, `npm run harness:usage` is spend and availability on each pool's own meter, and the
ledgers under `~/.noacg/` are the numbers. A routing claim with no measurement behind it is an
opinion. The owner rulings that bind, dated so a later one can supersede them: route by available
capacity as well as capability, and never conserve Opus for its own sake (2026-09-01,
`docs/ORCHESTRATION_NEXT.md` section 4); Antigravity's pools first where the task suits them, Codex
last (2026-09-01 evening); Fable for what the day turns on, judged over meaningful engagements and
never by a count of AGREE verdicts (2026-09-01).
