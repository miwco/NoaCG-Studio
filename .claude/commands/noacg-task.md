Start a scoped piece of work in NoaCG Studio with the repo's standing conventions already
applied, so they don't have to be restated each session.

Task: $ARGUMENTS

Do not just print a plan for the user to execute - carry out the setup yourself, report
what you find, and stop whenever reality disagrees with the happy path.

## 1. Land on a feature branch

- `git rev-parse --abbrev-ref HEAD` and `git worktree list`. **If the session starts on
  `main`, branch first** - `main` is only ever touched when the user asks for it in that
  message, from any checkout.
- If the task is substantial and parallel work is likely, create a worktree rather than
  branching in place; several are typically active at once.
- Report the branch and checkout you settled on, and this checkout's dev port
  (`node scripts/dev-port.mjs`).

## 2. Read the contracts that govern the work

The root `CLAUDE.md` carries the product identity and the non-negotiables. The binding
per-area detail lives in nested `CLAUDE.md` files - **read the ones covering the areas this
task touches before editing them**, including from outside that directory:

| Touching | Read |
| --- | --- |
| template/SPX types, fields, element identity | `src/model` |
| the wizard catalog, `:root` style contract, easings | `src/templates` |
| `applyTemplate`, undo, editor UI state | `src/store` |
| blocks, the timeline engine, animation data | `src/blocks` |
| the SPX generation harness, prompts, routing | `src/ai` |
| export targets and packaging | `src/export` |
| render manifests, schedules, tier limits | `src/render` |
| the landing page's motion system | `src/landing` |
| the React app, docks, inspector, wizard, video shell | `src/components` |

Also binding before generating or judging any template: `docs/DESIGN_LANGUAGE.md` (taste and
motion) and `docs/GOALS.md` (north star).

State which ones you read, and name any contract in them that constrains this task.

## 3. Plan, then check in

Give a short plan: what changes, which files, what could break, and how it will be verified.
Get a go-ahead before starting anything that touches a shared contract, the export gate, or
the AI harness. For a narrowly scoped change, proceed and say so.

## 4. Verify - a green build is not enough

- `npm run build` (typecheck + lint + build) is the CI gate; the tree stays lint-clean, so
  fix findings properly instead of adding eslint-disable comments.
- **If the behaviour is observable, observe it.** There is no unit-test suite. Use the E2E
  suite for user-facing flows (`npm run test:e2e`, or `npm run test:e2e:affected` for the
  inner loop - the full suite is the merge gate), and add a spec for any new flow.
- For template work, sweep the affected category: `node scripts/l3-sweep.mjs <shots-dir>
  <category>`.
- Never mark work done on a green build alone.

## 5. Commit and stop

Commit each completed, verified step to the **feature branch** with a message that explains
the actual change and reads as human-written - no chat/session language, no planning
codenames, no agent or AI mentions, and never a `Co-Authored-By` trailer. Don't commit
`dist/`.

Then report what you did and what you verified, and **stop**. Do not merge, push to `main`,
or run a safe-merge - the user decides when work lands, after they know it is safe.
