# Session M - the citation rename, and the first Codex delegation trial (2026-08-29)

**Branch:** `claude/m-citation-rename` (one commit, `c0f3006a`, queued for landing)
**Gate:** `npm run build` green on the branch. Stamp read
`[write-version] dist/version.json -> claude/m-citation-rename@6ad4f9b1a2`, so it gated this
branch and not `main`.

Two deliverables: the rename landed, and the Codex trial is graded. **The trial failed, and the
rename was done in Claude Code.** The grading is section 3 and is the part worth reading.

---

## 1. What landed

The "Student release" section moved from `docs/GOALS.md` to `docs/GOALS_ARCHIVE.md` in the
2026-08-22 pivot. Session H repaired eleven citations and counted the rest. This commit repoints
**32 citations across 30 files**, all in comments.

Two forms, matching what session H used:

- **Form A** (31 sites) - the filename token only: `docs/GOALS.md` becomes `docs/GOALS_ARCHIVE.md`,
  the rest of the line byte-identical.
- **Form B** (1 site, `scripts/catalog-sameness.mjs:64`) - the one citation that omitted the
  section name: `docs/GOALS.md step 11` becomes
  `docs/GOALS_ARCHIVE.md "Student release" step 11`.

Files touched: `scripts/` (catalog-sameness, e2e-affected, e2e-lists, nightly-triage), `src/App.tsx`,
`src/app/router.ts`, `src/backend/storage.ts`, six `src/components/` files plus four under
`components/home/`, `components/auth/` and `components/save/`, five `src/model/` files, both
`src/store/` files, two `src/styles/` files, `src/templates/packs.ts`, and
`src/components/home/AGENTS.md`.

### The grep receipt

Re-grepped after the edit for `GOALS\.md[^)]{0,120}[Ss]tudent release`, multiline, whole repo.
Every surviving hit is either in a sibling-owned path or is deliberately correct:

| Where | Sites | Why it survives |
|---|---|---|
| `e2e/**` | 32 in 30 files | excluded - sibling-owned |
| `src/components/wizard/**` | 12 in 5 files | excluded - sibling-owned |
| `.github/workflows/**` | 2 (`ci.yml:189`, `nightly.yml:296`) | excluded - sibling-owned |
| `AGENTS.md:31` | 1 | **already correct** - points "NOW" at GOALS.md and names the archive for the history |
| `docs/NATIVE_PLAYOUT_RESEARCH.md:213` | 1 | **not a citation** - timing prose about the roadmap, not a reference to the moved section |
| `docs/handoffs/2026-08-29-h-coherence-condense.md` | 2 | the historical record of the problem; must not be rewritten |

`src/templates/importedDesign/**`, `src/docs/**` and `scripts/auto-merge.mjs` were on the exclusion
list and turned out to hold **zero** stale citations, so those three exclusions cost nothing.

**46 stale citations remain**, all in the three excluded areas above. Same mechanical change, one
later commit, once those paths are quiet.

### Proof the diff is citation-only

`30 files changed, 32 insertions(+), 32 deletions(-)` - a strict one-for-one line swap. Two checks
beyond eyeballing it:

1. Every added line starts with a comment marker (`//`, `*`, `/*`, `{/*`) or is the one markdown
   bullet in `components/home/AGENTS.md`.
2. Undoing the rename on each added line reproduces its removed counterpart **byte for byte**, all
   32 pairs. So no line changed in any way other than the citation.

No code, no string literal, no test assertion was touched. Before editing, I checked every site was
inside a comment; none was load-bearing, so the trap the task warned about did not fire.

`src/components/home/AGENTS.md` is an instruction-chain file and grew by 8 bytes. That chain totals
78,903 bytes against the 112,000 limit - 33 KB free, so this is a non-issue.

## 2. What the delegation was

Delegated through `/rescue` (which forwards to the `codex:codex-rescue` subagent with
`--background`, then polls). The prompt carried exactly what the task said to hand over and nothing
else:

- the two transformation forms with a literal before/after example of each;
- a **line-addressed site list** - 31 `path:line` entries;
- the exclusion list, named explicitly, including the paths that merely *look* similar;
- hard constraints: comments only, no reflow, no commit, no build, no state-changing git.

**Prompt size: ~3.7 KB, roughly 950 tokens**, of which the site list was ~1.4 KB.

## 3. Grading the trial

### It never produced anything

| | |
|---|---|
| Delegated | 31 sites / 29 files, fully specified |
| Prompt | ~3.7 KB (~950 tokens) |
| Wall time | job started 14:04:18Z; abandoned ~10 min later with **zero bytes written**; ~13 min total including the polling scaffolding |
| Right first try? | **No - it never came back at all** |
| Corrections needed | **All of it.** 100% of the edit was done in Claude Code |

### Why it failed - three distinct defects

**1. `--background` does not actually detach.** The `codex:codex-rescue` subagent forwards the
request and returns immediately, but the Codex launcher process (pid 39112) is a *child of the
subagent's own Bash call*. When the subagent returned, the child was killed. The task output file's
last line is literally `[killed]`. The `/rescue` command exists precisely because "foreground
silently dies past 10 minutes" - this trial shows the background path dies too, and dies in under a
minute.

**2. A killed job stays "running" forever.** `codex-companion.mjs status --all --json` kept
reporting the job as `status: running, phase: starting` with a pid that no longer existed. Nothing
reconciles pid liveness against job status, so **from the status API a killed job is
indistinguishable from a slow one**. I only caught it by running `Get-Process -Id 39112` and getting
nothing back. This is worse than the foreground failure mode it was built to avoid: a foreground
death is at least visible, whereas this presents as a job that is patiently working.

**3. `cancel` is broken on Windows under Git Bash.** `codex-companion.mjs cancel` shells out to
`taskkill /PID <n> /T /F`; MSYS path conversion rewrites `/PID` into `C:/Program Files/Git/PID`, so
it always errors:

```
taskkill /PID /T /F: exit=1: ERROR: Invalid argument/option - 'C:/Program Files/Git/PID'.
```

Run from PowerShell the same command answered `No job found`. **Housekeeping left behind:** the
orphan `task-mtegc034-a92vfm` is still listed as `running` in the companion's job table. Harmless,
but it will confuse the next session that runs `/codex:status`.

### Verdict on task class

**This run says nothing about Codex's competence.** The channel failed before any model work
started, so there is no output to judge. Do not read this as evidence Codex is bad at renames.

There is a separate finding that holds regardless of the harness bug, and it is the more useful one:

> **For a line-addressed mechanical edit, writing the delegation prompt IS the task.**

Enumerating the sites, confirming each was a comment, distinguishing the genuinely stale citations
from the two that were already correct, and settling the exact target form took the large majority
of this session. The edit itself was a single scripted pass that ran in well under a second. A
delegate that needs a complete `path:line` list plus literal before/after examples is being handed
the answer, not the problem - so the doing cost it removes is nearly zero, while the specifying and
verifying costs stay entirely with the delegator.

**Recommended routing for the orchestrator:**

- **Do not route line-addressed mechanical edits to Codex.** Cheaper inline, even with a working
  channel. This trial picked a task that was easy to specify precisely, which is exactly what makes
  it a poor delegation candidate.
- **The classes that would pay** are the ones where the spec is short but the doing is long: a
  same-shape edit whose sites the delegate must *find* itself, a well-specced build spanning many
  files, a bug needing repeated hypothesis/test cycles. That is what the owner's rule 8 already
  names, and this trial does not contradict it.
- **Fix the channel before routing anything real.** Two concrete fixes: the rescue wrapper must
  detach the Codex process from the subagent's Bash lifetime, and `codex-companion` status must mark
  a job dead when its pid is gone. Until both land, **treat a "running" Codex job as unproven** and
  check the pid yourself.

### The verification finding, which is the one that nearly bit

My first enumeration **missed a site**: `src/components/home/AGENTS.md:14`, where the citation wraps
across two lines. The multiline grep that would have found it hit its result cap and truncated, and
I only caught it by separately auditing every `GOALS.md` mention that my citation regex had *not*
matched.

Had the delegation succeeded, Codex would have faithfully edited exactly the 31 sites I listed and
reported complete success - and an incomplete rename would have shipped. The re-grep is what caught
it, not any review of the delegate's work.

So "verify yourself, never trust the delegate" understates it. **The verification has to be
independent of the site list, because the list is the delegator's most likely error.** Re-deriving
the receipt from scratch after the edit is what makes the delegation safe; checking that the
delegate did what it was told does not.

## 4. What is left

1. **The 46 remaining citations** in `e2e/**` (32), `src/components/wizard/**` (12) and
   `.github/workflows/**` (2). Same two forms as above; one commit when those paths are quiet.
2. **The three Codex channel defects** in section 3. Worth a machinery session before Codex is
   routed anything that matters.
3. **The orphaned job entry** `task-mtegc034-a92vfm`, still shown as running.
4. Unrelated and only noted in passing: `scripts/e2e-affected.mjs:316` and `src/ograf/guide.ts:3`
   cite `docs/GOALS.md "the SVG road"`. That heading exists in **both** files now - GOALS.md has
   "Prove the SVG road" as NOW step 1, the archive has the old section - so the citations still
   resolve and I left them. If session G moves that section, they need a second look.
