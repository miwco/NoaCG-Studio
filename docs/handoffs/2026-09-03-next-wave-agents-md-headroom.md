# Next wave, first row: room in the contracts

Written by the orchestrator session of 2026-09-03 after the memory-architecture work landed. It is
here rather than only in chat because a continuation prompt printed in chat dies with the session
that wrote it - `.agent-workflows/orchestrator/prompts.md` says the handoff file is the one channel
the next orchestrator reads.

## Why this is the first row

Two landed items are blocked behind it, and one of them is a build failure waiting to happen:

- **`src/components/wizard` has 365 bytes free of 112,000.** The next session to add a paragraph
  under that directory fails `npm run build`. Two sessions in two days (2026-09-02 rows E and H)
  already filed their new contract in a different directory to dodge the ceiling, which disperses
  the rules instead of shortening them.
- **Phase 2 of `docs/backlog/memory-store-drain.md` cannot start.** Ten memory entries are marked
  `(route)` because they are contract-shaped rules with nowhere to land while every chain is full.

Full argument and the shrinking-mechanism design:
`docs/backlog/instruction-files-need-a-shrinking-mechanism.md`.

## The measurements, so the row does not re-derive them

Taken 2026-09-03 from `npm run check:shared-instructions`. The wizard chain is 111,635 of 112,000
and is three files:

| file | bytes | paid by |
|---|---|---|
| root `AGENTS.md` | 34,853 | **all 52 chains** |
| `src/components/AGENTS.md` | 26,556 | 10 chains |
| `src/components/wizard/AGENTS.md` | 51,633 | 1 chain |

Root's two largest sections are `## Git` (8,828) and `## Architecture map` (7,677). Ten chains sit
over 80%. Section sizes of any contract:

```
awk '/^## /{if(n)printf "%6d  %s\n", c, n; n=$0; c=0} {c+=length($0)+1} END{printf "%6d  %s\n", c, n}' AGENTS.md | sort -rn
```

## Three findings that decide the approach

1. **The leverage is in the SHARED PREFIX.** A byte off root relieves 52 chains; a byte off the
   wizard's own file relieves one. Root is 35 KB paid 52 times.
2. **Splitting a leaf into a CHILD directory buys the child nothing** - it loads parent AND child.
   The 2026-09-02 template split worked because eight SIBLINGS each stopped paying for the other
   seven. Almost all wizard work is in `steps/`, so a wizard -> steps split moves bytes without
   moving cost. Check the fan-out before any split.
3. **The ceiling is a ratchet.** `.codex/config.toml` says so in its own header: it only goes down,
   and raising it hides the problem it exists to surface. Already 120,000 -> 112,000.

## The authority question, already settled

`docs/backlog/agents-md-byte-headroom.md` says the owner is the authority on what gets condensed.
**Superseded by his 2026-09-03 ruling**: *"exactly the kind of problem I expect you to solve
autonomously... You do not need my permission to start that cleanup. If there are genuinely
ambiguous content decisions, put simple questions in the walk."* Do not stall on him. An
unjudgeable section becomes a one-line `kind: walk-p` owner-queue item quoting it, and the rest of
the work ships in the same commit.

## The prompt

```
SESSION A - room in the contracts
BRANCH claude/a-agents-md-headroom
MODEL  opus high - editorial judgement against a hard byte budget; the risk is losing a binding
       rule while making a number look better, not the arithmetic
POOL   opus
START  now
TOUCHES AGENTS.md, src/components/AGENTS.md, src/components/wizard/AGENTS.md, docs/ARCHITECTURE.md,
        docs/README.md, and any AGENTS.md/CLAUDE.md pair you split. THIS ROW OWNS EVERY AGENTS.md
        IN THE WAVE - no sibling row may edit one.
MINTS  every AGENTS.md + docs/README.md
GOAL   `npm run check:shared-instructions` reports the tightest chain at or under 85% of
       project_doc_max_bytes, with no rule lost - and `src/components/wizard`, which has 365 bytes
       free today, has thousands.
WHY    A contract that does not fit is a contract that does not fire. The next session to add a
       paragraph under src/components/wizard fails the build, and two sessions in two days already
       filed their new contract in the wrong directory to dodge the ceiling - that is the disease,
       because it disperses the rules rather than shortening them. It also blocks other work:
       phase 2 of docs/backlog/memory-store-drain.md cannot finish until ten contract-shaped rules
       have somewhere to land.
       AUTHORITY: docs/backlog/agents-md-byte-headroom.md says the owner is the authority on what
       gets condensed. That is SUPERSEDED by his 2026-09-03 ruling - "exactly the kind of problem I
       expect you to solve autonomously... You do not need my permission to start that cleanup. If
       there are genuinely ambiguous content decisions, put simple questions in the walk." So do
       not stall on him. A section whose relevance you genuinely cannot judge becomes a one-line
       `kind: walk-p` owner-queue item quoting it, and THE REST OF THE WORK SHIPS IN THE SAME
       COMMIT.
READ   .codex/config.toml (the budget's own header - read it before touching the number),
       docs/backlog/instruction-files-need-a-shrinking-mechanism.md,
       docs/handoffs/2026-09-02-e-agents-md-headroom.md (the method that worked, and its honest note),
       docs/MISTAKE_TRIGGERS.md "Four places a lesson can live".
DO     1. MEASURE FIRST and write the numbers down. `npm run check:shared-instructions` prints every
          tight chain. Already measured 2026-09-03, do not re-derive: the wizard chain is 111,635 of
          112,000 and is three files - root AGENTS.md 34,853 bytes, src/components/AGENTS.md 26,556,
          src/components/wizard/AGENTS.md 51,633. Section sizes of any contract:
          awk '/^## /{if(n)printf "%6d  %s\n", c, n; n=$0; c=0} {c+=length($0)+1} END{printf "%6d  %s\n", c, n}' AGENTS.md | sort -rn
       2. CUT THE SHARED PREFIX FIRST - that is where the arithmetic is. Root AGENTS.md is paid by
          all 52 chains, src/components/AGENTS.md by 10, the wizard's own file by one. Root's two
          largest sections are `## Git` (8,828 bytes) and `## Architecture map` (7,677). The
          architecture map is REFERENCE, not a rule that fires mid-edit, and docs/ARCHITECTURE.md
          already exists to hold it - moving it behind a pointer takes ~7 KB off every chain in the
          repo.
       3. Apply the principle rather than shrinking by feel: THE RULE THAT MUST FIRE STAYS INLINE;
          THE REFERENCE MATERIAL BEHIND IT BECOMES A POINTER. docs/DESIGN_LANGUAGE.md and
          docs/TEXT_BOX_BINDING.md are already used that way. A pointer costs ~80 bytes instead of
          6 KB, and the honest trade is that it fires only when followed - which is exactly why the
          rule stays and the explanation goes.
       4. Then src/components/AGENTS.md, then the wizard leaf, same way.
       5. Move prose VERBATIM. Extract it programmatically rather than retyping, then diff every
          removed line against its new home and state in the handoff that you did.
       6. Re-measure and publish before/after per chain, as the 2026-09-02 session did.
CORE   Steps 1-3. Seven kilobytes off the shared prefix is worth more than a perfect wizard file.
TRAPS  DO NOT RAISE project_doc_max_bytes. Its own header says it is a ratchet that only goes down
       and that raising it hides the problem it exists to surface. It has already gone 120,000 ->
       112,000. Lowering it at the end, to bank the headroom you just bought, is the RIGHT move.
       DO NOT TRIM TO GET A NUMBER UNDER A LINE. The 2026-09-02 session refused to do that and was
       right: it left a chain 21 bytes over rather than game the measurement, and said so.
       SPLITTING A LEAF INTO A CHILD DIRECTORY BUYS THE CHILD NOTHING - it loads parent AND child.
       The template split worked because eight SIBLINGS each stopped paying for the other seven.
       Almost all wizard work is in steps/, so a wizard -> steps split moves bytes without moving
       cost. Check the fan-out before any split.
       check-shared-instructions PINS SEVERAL RULE PHRASES VERBATIM as critical markers; condensing
       a section containing one fails the build with a clear message. That is the mechanism working
       - it caught two edits on 2026-09-03 - so read the failure, keep the phrase, condense around it.
       Any new docs/ file needs a row in docs/README.md or check-docs-index fails.
       agents-md-warning-fails-at-99 is NOT this row. A loud failure before headroom exists turns
       every wizard row red; it lands after, alone, as a gate.
GATE   npm run build (check:shared-instructions is in it), then push and read the CI run - check
       WHICH jobs ran. Commit each verified step.
QUEUE  Then, as your LAST THREE actions and in this order:
       1. run /check (review, simplify, verify) on the branch - name each leg's mode. If /check
          spawns subagents, collect their results from FILES at paths you choose; a session never
          receives its own subagents' completion notifications;
       2. write docs/handoffs/<date>-a-agents-md-headroom.md with the before/after table per chain,
          what you moved, and any section you could not judge;
       3. run /queue-merge. Do not commit after queueing. Never merge into main yourself.
       File an owner-queue item with kind:, date: and the branch named. Update
       docs/backlog/instruction-files-need-a-shrinking-mechanism.md and
       docs/backlog/memory-store-drain.md with what is now unblocked.
       Never end a turn waiting on something that cannot wake you.
```

## For the planner

Give this row the whole `AGENTS.md` surface. Every other row will eventually want to touch one, and
shared-prose collisions are what stranded 28 commits across three branches on 2026-09-01. Either
chain the other rows behind it or forbid them those files; the prompt claims them explicitly.

`agents-md-warning-fails-at-99` is the natural follow-on and lands alone, after headroom exists.
