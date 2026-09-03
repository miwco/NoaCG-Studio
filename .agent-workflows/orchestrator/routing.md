# Routing - which pool does each row's work

Loaded while the prompts are written. **Every row names its POOL** in the wave table and carries
one clause on the kind of thinking the task rewards on its `MODEL` line; `wave-plan-check` refuses
a row without a pool. Routing is a STEP because it was skipped: the 2026-09-01 night wave sent
ten rows to Opus by omission, and the next two waves left Codex idle while Claude ran 2.7 billion
tokens in 48 hours (`incidents.md`, "the ten rows that all went to Opus" and "the reserve that was
never drawn on"). Capacity is a routing input, never a fallback.

## The pools

| POOL | what it is for | how a row reaches it |
| --- | --- | --- |
| `opus` | **the default.** The master's model AND a major implementation pool. Useful engineering stays here; it is never pushed off Opus because a cheaper model exists - and it is the SCARCE pool: one Claude row costs about 80-180 M tokens, mostly cache reads, so a row moved elsewhere buys that back | the Agent tool, or headless `claude -p` when the effort matters and CLI auth is verified that day |
| `fable` | what the day's direction turns on: consequential architecture, difficult reasoning, UI/UX/design, adversarial review of a big call. Never volume, never residency; `high` is its default effort | the Agent tool with the model named; a plan review runs as an `so` row |
| `sonnet` | genuinely mechanical work with a written recipe and a written verification - a rename, a transcription | the Agent tool |
| `codex` | **the second full implementation pool, AVAILABLE BY DEFAULT** (owner, 2026-09-03) unless the wave's invocation says Codex is off limits that wave. `gpt-5.6-sol` at `high` is the norm and the owner values it: work that is long to do and short to specify, a well-specced build across many files, a bug that survived two genuine attempts. Its meter is shared with the owner's other projects, so a Codex row names a fallback pool and the snapshot decides how many rows, never whether. Not a wave peer - no loop, no auto-launch - so a `codex` row runs through the `rescue` workflow from inside the Claude row that owns its spec, verification and landing; that Claude row is CHEAP while it waits, which is the whole economy | the `rescue` workflow from the owning Claude row; a `codex/` branch is user-started |
| `agy-gemini` | Antigravity's Gemini pool, and since 2026-09-03 a real IMPLEMENTATION worker rather than a read-mostly one. **The BROAD pool - eleven models when last counted. Its newest tier outranks the documented default by VERSION and lost to it on measurement (tie on correctness, 5.3x slower), so the default stands; do not reach past it on version alone.** Used aggressively on the task classes the ledger shows it passes: cross-file comprehension, corpus sweeps, a bounded artifact written to a spec, well-scoped writes in volume | `npm run agy:read` / `npm run agy -- --write`, from inside the Claude row that owns the spec - both doors allowlisted, so neither costs a night a permission prompt |
| `agy-claude-gpt` | Antigravity's second, largely unused pool - same wrapper, separate meter, no `--effort` flag. **Genuinely thin at three models**, and older than the frontier; that is current evidence, not a reason to leave it idle. Used deliberately for the same classes, so both idle allowances do work | the same wrapper, model pinned |

## The step, and when it is done

1. **Read the capacity snapshot** - `npm run harness:usage`: the Codex window percentages when a
   snapshot exists (three-valued: headroom / low / UNKNOWN, and unknown routes like low), what each
   Antigravity pool has been asked lately, the outcomes table per pool and task class, and the
   capability observations the installed build has not been seen to back. **The only percentages
   it prints are Codex's; Claude Code has no meter.** Write one line, `Pools at plan time: ...`,
   into the wave-state file. The check refuses a plan without it, and prints an ECONOMY note when
   the line gives Claude a percentage or shows Codex headroom no row draws on.
2. **For every row, name the pool that does the BULK of the work, and why.** `opus high` needs no
   defence. Move DOWN only for mechanical work with a written recipe; move UP only for the row the
   day turns on. **Delegate when the work is long to do and short to specify** and the ledger shows
   that pool passing that class - a bounded artifact, a sweep, a transcription, a specced build.
   Codex takes such a row whenever the snapshot shows headroom; a wave that leaves it idle says
   why in section 4. Keep on Claude: judgement about this product, and anything that must be
   landed, gated or merged.
3. **A delegated row says so in its prompt**, and the Claude row that owns it still owns the spec,
   the verification and the landing. The prompt declares the delegate's tool set, gives the
   WORKTREE's absolute paths, ENUMERATES the files (headless `agy` auto-denies a directory walk),
   hands over verified payloads, and writes the acceptance conditions before delegating.
   **A delegation that returns nothing is a PROMPT defect until proven otherwise**, and the shapes
   that produced most of them are now REFUSED at the door by `scripts/agy-run.mjs`'s preflight,
   each refusal naming its shape; `harness:usage`'s `ours` column counts what still gets through.
   **The result is verified by re-deriving it, and a delegated artifact is not verified until the
   gate that consumes it has run**; `scripts/delegation-outcome.mjs` records the outcome and
   cause, and a WRITE lands like any other work: the owning row reads every changed path, gates,
   checks and queues.
4. **A tier is a floor the receiving session may RAISE, never a ceiling it may quietly lower.**

Done when every row in the table has a pool, every non-Claude pool row names its fallback, the
snapshot line is written, `node scripts/wave-plan-check.mjs` says so, and every economy note it
printed is answered in section 4.

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
ledgers under `~/.noacg/` are the numbers. **A claim about what a tool can or cannot do is an
observation about one build**: it lives in `scripts/harness-capabilities.json` with its version,
and the meter names the ones the installed build has not been seen to back - re-probe those,
never route on them. A routing claim with no measurement behind it is an opinion. The owner
rulings that bind, dated so a later one can supersede them: route by available capacity as well
as capability, never conserve Opus for its own sake (2026-09-01, `docs/ORCHESTRATION_NEXT.md`
section 4); **Codex available by default, GPT Sol high valued, Antigravity graded by results**
(2026-09-03, `docs/OWNER_RULINGS.md`, superseding "Antigravity first, Codex last"); Fable for what
the day turns on, judged over meaningful engagements, never by a count of AGREE verdicts (2026-09-01).
