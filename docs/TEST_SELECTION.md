# Test selection: what runs for a change, and why that is enough

Written 2026-09-04 to the owner's ask: *"truthful timing and intelligent test selection, not simply
adding more runners to compensate for waste. We should never trade away safety, but 'run everything
just in case' should not be the default."*

This is the contract for the first half. `docs/VERIFICATION.md` owns the procedure - which suite to
run and how to read a run; this file owns the QUESTION BEHIND IT: given a change, which specs does
the gate believe it has to run, and what is the argument that the ones it skips are safe to skip.

The mechanism is `scripts/e2e-affected.mjs`. It is a pure function of a changed-file list, so every
claim here can be checked by calling it, and `scripts/e2e-affected.test.mjs` pins the ones that
matter. The rule the whole thing rests on is stated once:

> **A spec that the plan does not select must not be breakable by the change.** Every entry in this
> contract is a claim of that shape, and where the claim cannot be made honestly, the rule
> escalates. The script fails TOWARD running more: a path no rule recognises runs everything.

## What runs, per kind of change

Measured against today's table (147 specs, 99.7 minutes) with sprint focus on, which is how CI runs
it. "Focus set" is the 55-spec, 36.9-minute list in `scripts/e2e-lists.mjs`.

| A change to | plans | why that is enough |
|---|---|---|
| a doc, any `*.md` | nothing | no spec reads one. The carve-out is `docs/svg-samples/`, which three specs load as fixtures, so those three run. |
| `.github/` | nothing | Playwright drives a local dev server and never opens a workflow file. Its real gate is `check:workflows` in `npm run build`, which validates every workflow and composite action against the Actions schema. Running specs could not catch a workflow fault, so running them buys nothing. |
| `.claude/`, `.codex/`, `.agents/`, `.agent-workflows/` | nothing | the agent harness. Same argument as `.github/`, and the same evidence: five tracked non-markdown files across all four, every one of them configuration for the tools a session runs rather than for the product a spec drives. |
| `scripts/*.test.mjs` | nothing | a test cannot change the thing it tests, and each of these is named in the `node --test` block of `npm run build`, so it has a gate that runs on every change. |
| `scripts/` otherwise | nothing | local tooling the app never loads. **The exception list is load-bearing**: `dev-port`, `port-registry`, `e2e-runs`, `e2e-workers`, the three dev-server plugins, `build-player-host`, `e2e-affected` and `e2e-lists` are imported by the Playwright configs or by globalSetup, so a fault in one breaks every spec rather than one flow. They escalate. Measured the hard way on 2026-08-06: a rewrite of `e2e-runs` produced `mode: none` and a green gate that ran zero specs. |
| one `e2e/*.spec.ts` | that spec | the median spec is 0.5 minutes and the heaviest 5.0, so this is usually the cheapest plan the gate can produce. |
| `e2e/_*` (shared helpers) | everything | every spec imports them. |
| `e2e/configured/**` | nothing here | see "the configured tier" below. |
| a wizard step | 37 specs, 36.2 min | the wizard rule names the surfaces the wizard specs drive, plus the components that MOUNT the shared pickers. Wide because the wizard IS the primary creation flow, not because nobody looked: `src/components/AGENTS.md` carries the per-surface split and MAP names the exceptions individually. |
| one catalog design | 46 specs, 45.6 min, plus the catalog calibration gate | the pack specs ITERATE the catalog, so a design added, renamed or re-declared changes what they assert. Six of them were reachable from no template path at all until 2026-08-08, and ten designs landed green because of it. |
| a shared foundation (`src/store`, `src/model`, `src/preview`, `src/validation`, the app shell, the router, `src/styles`, `package-lock.json`) | the focus set (55 specs, 36.9 min) under sprint focus; the full suite otherwise | genuine fan-out. Each is imported by most of the app, so no smaller claim can be made honestly. |
| a path no rule recognises | the focus set under sprint focus; the full suite otherwise | the safe direction. It is also a REPORT: the plan names every unmapped file, and a file that keeps appearing there is a missing MAP rule, not a fact of life. |

## What the audit found

Replayed over the **119 first-parent commits on `main` to 2026-09-04** - every landing, not a
sample:

| | before | after |
|---|---|---|
| plans that run nothing | 68 | 72 |
| plans that run a subset | 51 | 47 |
| plans that run everything | 0 | 0 |
| median planned minutes | 0.0 | 0.0 |
| p75 planned minutes | 36.9 | **12.5** |
| p90 planned minutes | 45.6 | 45.6 |
| plans covering more than 80% of the suite | 3 (3%) | 3 (3%) |
| landings escalating through core/unmapped | 25 | **21** |

**The headline is that "run everything just in case" is already not the default here.** Not one of
119 landings ran the whole suite, 57% ran nothing at all, and 97% ran under 80% of it. The map is
curated per rule with an incident receipt attached to most of them, and the audit did not find a
lazy trigger hiding behind a wide one. What it found was four small ones, and they are fixed above:
eight landings escalated on `.claude/settings.json` or `.codex/config.toml` alone, and one on a test
file for the planner - each running 36.9 minutes of specs to prove something no spec can observe.

The p75 moving from 36.9 to 12.5 minutes is those cases leaving. The p90 is unchanged, and that is
the honest reading: **the wide plans are wide for reasons that survive scrutiny**, and the way to
make them narrower is better MAP rules for `src/templates/` and `src/components/wizard/`, which is
design work per rule rather than a policy change.

## The narrowing that was NOT taken

A branch that has merged `main` is planned from the FORK POINT (`--integration`), so its plan is the
union of both sides. That is why an ordinary landing is the widest plan the gate ever produces: on
`claude/j-fields-step-per-field` the fork-point plan was **116 specs / 88.0 minutes** from 170 changed
files, where the branch's own seven files plan **71 specs / 65.2 minutes**.

There is a real argument for the narrow base. `main` runs the FULL suite on every push, so main's
side already has an independent green verdict; what has not been verified is the COMBINATION, and a
combination can only break a spec that at least one side's map selects. Take the narrow base only
when `main`'s tip carries a recent green full verdict - which `scripts/main-health.mjs` already
answers - and fall back to the union otherwise.

It is not taken here, for two reasons. It overturns a rule in the root `AGENTS.md` that exists
because 71 of the last 120 merge commits would have been planned differently without it, 8 of them
reporting `mode: none` on a combination nothing had run. And its safety rests entirely on MY side's
map having no holes, where the union's extra coverage is exactly the belt against such a hole. That
is a call worth making with its own evidence and its own gate, not as a side effect of a timing fix.
Filed as `docs/backlog/integration-plans-run-both-sides-of-a-merge.md`.

## The configured tier

`e2e/configured/**` is ignored by this planner on purpose: those 32 specs need a real Supabase
backend and a signed-in account, which no ci.yml job has. They are not unowned. `configured-suite.yml`
runs them nightly at 01:10 against a local Supabase stack on the runner, with its own rolling issue
and a guard set built around the one failure mode that matters here - every spec calls
`test.skip(!haveCreds)`, so a job checking only the exit code would be permanently, silently green.
It failed on 2026-09-03 and was green again on 2026-09-04 05:46 (run 33841739638).

Keeping them out of the per-change plan is the right call, and it is a decision rather than an
omission: putting them in would mean standing a Supabase stack up in every gate job, minutes per
job on every change, to reach a surface that already has a nightly verdict and an alarm. What the
per-change gate does instead is SAY SO - a change that touches configured territory sets
`configured` on the plan, which is printed, so the branch that changed it knows what it did not run.

## Where the numbers come from

Selection decides which specs; `scripts/e2e-durations.json` decides how they are spread across
runners and whether that fits. The wall-clock model is `tests x testFactor + jobMinutes`, both terms
recorded from a real CI run - see `docs/VERIFICATION.md` and the header of
`scripts/e2e-durations.mjs`. The two halves meet in one place: when a plan is predicted too close to
the 20-minute job cap, the warning names both remedies, because either the per-job cost has grown or
the plan is selecting more than the change needs.

## Changing this contract

- A new IGNORE entry is the only edit here with no alarm attached. Every other mistake fails toward
  running MORE; a wrong IGNORE runs FEWER specs and nothing goes red. Write the confidence argument
  into the code comment beside it, in the form "no spec can observe this, and here is its real gate".
- A new MAP rule is cheap and reversible. If a file keeps showing up in the plan's `unmapped` list,
  that is the signal to write one.
- Widening CORE is the expensive edit, because it is what makes an ordinary change run the focus
  set. Prefer a MAP rule that names the surfaces, and put a file in CORE only when the honest answer
  to "which specs can this break" is "most of them".
