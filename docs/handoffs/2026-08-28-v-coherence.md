# Session V - coherence and bookkeeping

Branch `claude/v-coherence-cfb824`, docs and workflow contracts only. The first coherence pass
since the cadence landed on 2026-08-27.

---

## The coherence verdict

### 1. Cold-read test

**Answerable from root `AGENTS.md` + `docs/GOALS.md` alone: what the product is (fast), what the
current push is (fast), what is deliberately parked (slow, now fixed).**

The parked answer was the weak one. `docs/GOALS.md` has three co-equal `## NEXT` sections, a
`## THEN` and a `## Parking lot`, and nothing anywhere says that all of them are parked - a reader
infers it from section order, and a well-written parked plan reads exactly like work to start. The
root `AGENTS.md` now states it outright. That is a one-clause fix for a defect that could have
cost a whole session, had one gone and started an OGraf-first push off a good-looking heading.

### 2. Contradictions - four fixed, all the same one

The owner retired "AI never authors machines" on 2026-08-27, and four docs still carried it as
standing law: `CONTROL_PANEL_PARITY.md` (twice - it was the "binding owner decision it serves"),
`SVG_IMPORT_PLAN.md`, `AI_LITE_BRAND_PLAN.md`. Each now says the part that is still true -
behaviour comes from the graphic's type, which stays the default and the cheap path - and names
the supersession. Left alone, these would have taught the opposite of the owner's decision to
everyone who read them, which is the exact failure the cadence exists to catch.

`AI_LITE_PLAN.md` claimed **LIVE** status against a deadline that passed on 2026-08-21, and cited
a category count the root `AGENTS.md` map no longer carries. Fixed to say what it is: doctrine and
four owner decisions, not a schedule.

### 3. Orphans and dangling references

One orphan, deleted: `docs/YLE_DEMO_REHEARSAL.md`, a script for one 2026-08-18 sitting, referenced
by nothing, whose "do not promise it" table listed the data API as not built. It has been built
since. Two backlog files cited handoffs by filename; handoffs get consumed, so those citations were
built to break, and they now name the work instead.

A reference sweep over every `*.md` in `docs/` found nothing else genuinely broken - the other
thirty-odd hits resolve to `benchmarks/` round files, to files an exporter writes into a package
(`FIELDS.md`, `FONT_LICENSES.md`, `GUIDE.md`), or to skills the doc is proposing rather than citing.

**One left, out of scope here:** `src/docs/AGENTS.md` cites
`docs/handoffs/2026-08-26-b-docs-polish.md`, which is consumed and gone. Another worktree owned
that file on 2026-08-27, so it was not touched.

### 4. The byte ratchet - deliberately NOT tightened

`project_doc_max_bytes` stays at 112000. The tightest chain (`src/components/wizard/AGENTS.md`) is
at **95.3%** with 5208 bytes free, and the next two are at 93%. The ratchet is already biting; the
headroom is not real. Another worktree was editing that exact file, so tightening now would have
refused their build after a merge for a rule they never saw change. Next pass: re-measure, and
tighten only if that chain has actually shrunk.

### 5. GOALS drift - REPORTED, not edited

- **`docs/GOALS.md` is 431 lines against the ~200-line cap the root `AGENTS.md` declares.** More
  than double. The archive mechanism exists and is used; the file is still growing faster than it
  drains, largely because the `## NOW` items now carry long walk-feedback narratives inline.
- **`docs/GOALS.md:266` still says the agent-authored-machine gate "is now armed".** It was
  answered on 2026-08-27 - blessed, and wider than asked. The line is stale.
- Three sections named `## NEXT` with no order between them (see §1).

Direction is the owner's; these are reported rather than edited, per the cadence.

---

## What's next

1. **Give `auto-merge.mjs` the temporary-worktree carve-out** -
   `docs/backlog/auto-merge-needs-the-temporary-worktree.md`. **Why:** a branch left behind by a
   closed session passes the entire merge preflight and is then refused, so it can never land
   through the queue. `claude/editor-blank-stage-note` has failed this way twice and will fail
   every retry; every future closed-session branch hits the same wall. The root `AGENTS.md`
   already documents the behaviour - only the mechanical path lacks it.
2. **Fix `docs/GOALS.md:266`, and decide what to do about its length** - the armed-gate line is
   now false, which is the same defect class this pass spent its time on. **Why:** GOALS is one
   of the two files the cold-read test runs on, so a false line there is expensive out of
   proportion to its size. The length is a direction call for the owner.
3. **Repair the dangling handoff citation in `src/docs/AGENTS.md`** once that file is free.
   **Why:** it is the contract for the public docs page, and it cites a file that no longer
   exists.
4. *(Optional)* **Run the credits proving round** - now unblocked, and named first by the owner.
   **Why:** `docs/CONTROL_PANEL_ROAD.md` §8 has the story and the five-step round written down,
   and credits is the exemplar the whole per-type road is calibrated against.

## Pasteable prompt

```
Pick up from the coherence pass on branch claude/v-coherence-cfb824, queued for landing.
That branch is docs-only: it transferred the owner's 2026-08-27 control-panel decisions and
the per-type operator stories into docs/CONTROL_PANEL_ROAD.md, retired the superseded
"AI never authors machines" rule in four docs, and ran the first coherence pass.

The best next step is a MECHANISM fix, not a doc fix:
docs/backlog/auto-merge-needs-the-temporary-worktree.md. scripts/auto-merge.mjs passes the
whole merge preflight for a branch with no worktree and then refuses it, so a closed
session's branch can never land through the queue. The root AGENTS.md already documents the
intended behaviour (the flow creates a TEMPORARY worktree and removes that same one at the
end, never another, never with --force); only the mechanical path lacks it. Removal has to
happen on the failure paths too, and npm run test:worktree-safety is where the regression
test belongs. claude/editor-blank-stage-note is the branch stuck behind it - one handoff
file, nothing at risk, but it does not clear on its own.

Two smaller things, both reported by the coherence pass and neither started:
- docs/GOALS.md:266 says the agent-authored-machine gate "is now armed". It was answered on
  2026-08-27. GOALS is one of the two files the cold-read test runs on, so a false line
  there is expensive. Its length (431 lines against a ~200 cap) is a direction call -
  report it, do not unilaterally cut it.
- src/docs/AGENTS.md cites docs/handoffs/2026-08-26-b-docs-polish.md, which is consumed and
  gone. Another worktree owned that file on 2026-08-27; check it is free first.

Constraints: read .agent-workflows/orchestrator.md "The coherence cadence" before any
follow-up coherence work - its cold-read item now carries a readability lens too. The merge
rules are in the root AGENTS.md "Git" section; work reaches main only through /queue-merge,
run by the session that owns the branch.

Trap worth an extra line: every markdown file in this repo is CRLF. A scripted exact-match
replacement must normalize line endings before matching and write them back, or every
multi-line match silently misses.
```

**State of the branch:** `claude/v-coherence-cfb824`, five commits, working tree clean, pushed.
CI run 33117029455 green on `4aebb4a5` - Factory gates, Build and the E2E plan all passed; the
E2E shards were skipped, correctly, because the whole branch is markdown. Nineteen files touched:
`AGENTS.md`, `.agent-workflows/orchestrator.md`, `docs/CONTROL_PANEL_ROAD.md`,
`docs/CONTROL_PANEL_PARITY.md`, `docs/SVG_IMPORT_PLAN.md`, `docs/AI_LITE_PLAN.md`,
`docs/AI_LITE_BRAND_PLAN.md`, `docs/YLE_DEMO_REHEARSAL.md` (deleted), five consumed handoffs
(deleted), two backlog files repaired, one new backlog file, and three owner-queue files.

**Blocks nothing. Blocked by nothing.** The GitHub topics were applied directly and are already
live, so they do not wait on the merge either.

## Bottom line

`NOT SAFE TO ARCHIVE YET` - the branch is committed, pushed and green, but queued for landing
rather than contained in `main`. Once the queue lands it, nothing is lost: every follow-up is
written down in the prompt above and in the backlog file.
