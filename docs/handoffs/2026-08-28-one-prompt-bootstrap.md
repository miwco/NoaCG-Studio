# One paste-to-agent prompt bootstraps the agent door

**Date:** 2026-08-28 · **Branch:** `claude/sharp-ardinghelli-01eadb`

## What changed

The `/docs` section "Coding agents & the CLI" now leads with a single prompt the reader copies to
their agent. Owner ruling of the same day, recorded in `docs/backlog/one-prompt-agent-bootstrap.md`.

- **`docs.html`** - `#agent-install` becomes "Paste this to your agent and start building": a short
  warning that the agent will run install commands the reader has to approve, then the prompt in a
  `<pre class="prompt">` block, which `src/docs/docs.ts` gives a Copy button like any other block.
  The three per-agent command blocks moved down into `#agent-setup` (Reference) under "The install
  commands, one by one", unchanged. All three anchor ids are untouched.
- **`src/docs/docs.css`** - `pre.prompt`: `white-space: pre-wrap` so prose wraps instead of
  scrolling sideways, extra top padding so the copy button clears the first line, and the amber
  left edge the callouts use to mark the path to take first.
- **`e2e/docs.spec.ts`** - the clipboard proof now targets the prompt block (it was pinned to the
  first `.cmd` in the section, which used to be `claude plugin marketplace add`). It asserts the
  copied text carries all three entrances, the `npx` fallback, and real `<dir>` characters rather
  than the `&lt;dir&gt;` entities the markup holds. The install-routes test additionally pins that
  Reference still carries every command and that the first block is the prompt.
- **`cli/README.md`** - the same prompt as a "Paste this to your agent" quick start above Install.

## The prompt's four steps

1. Install the entrance that matches you (Claude Code / Codex plugin pairs, or a stdio MCP
   registration with command `npx`, arguments `-y @noacg/cli mcp`).
2. Do not wait for it. A plugin only loads in the next session, so use `npx -y @noacg/cli <command>`
   today, starting with `npx -y @noacg/cli docs contract`.
3. Verify with `npx -y @noacg/cli doctor`; stop and report if it does not answer.
4. Tell the user NoaCG is ready and ask what graphic to make.

## Verification

`npm run build` green (`check:copy` included, and the prompt is em-dash free).
`npm run test:e2e:focus:queued` - 12 passed (`docs.spec.ts`, `landing.spec.ts`), including the real
clipboard click on the new block. Drove `/docs` in the preview browser: all three anchors resolve,
the prompt block is the first `.cmd`, it does not scroll sideways at desktop or at 375px, the copy
button does not overlap the text at either width, no console errors.

**Every command in the prompt was run cold on this machine**, in a throwaway directory:

| Command | Result |
|---|---|
| `claude plugin marketplace add miwco/NoaCG-Studio` | added marketplace `noacg-studio` |
| `claude plugin install noacg@noacg-studio` | installed, scope user, v0.2.0 |
| `codex plugin marketplace add miwco/NoaCG-Studio` | added marketplace |
| `codex plugin add noacg@noacg-studio` | installed plugin |
| `npx -y @noacg/cli mcp` (stdio probe) | `initialize` + `tools/list` both answered, server `noacg` 0.2.0 |
| `npx -y @noacg/cli docs contract` | printed the contract |
| `npx -y @noacg/cli doctor` | deployment, browser, bridge version, config dir |
| `npx -y @noacg/cli scaffold --type scoreboard --design neutral` | wrote a package |
| `npx -y @noacg/cli validate` | 0 errors, 3 warnings, readiness rows |

The premise the fallback exists for was confirmed by accident: the plugin installed above did not
become available in the session that installed it.

### What could NOT be verified

**A live agent reasoning through the prompt end to end.** Two attempts, both blocked by the
environment rather than by the prompt:

- A nested `claude -p` in a fresh directory: `Failed to authenticate: OAuth session expired and
  could not be refreshed`. It fails on a bare `echo "say OK" | claude -p` too, so it is the nested
  CLI's auth, not the prompt.
- `codex exec --skip-git-repo-check --sandbox danger-full-access`: reached the model, then
  `ERROR: You've hit your usage limit`.

So the mechanics are proven and the agent-follows-instructions half is not. Codex's limit was said
to reset the same afternoon, which is the cheapest way to close this: re-run

```
cat docs/handoffs/2026-08-28-one-prompt-bootstrap.md  # the prompt is in docs.html
```

or simply paste the prompt from `/docs` into a fresh session, which is what the owner-queue item
asks the owner to try anyway.

## Machine state left behind

The test installed the NoaCG plugin into **both** Claude Code and Codex on this machine (user
scope). Neither was there before. They are the documented installs and the owner is the repo owner,
so they were left in place rather than removed; `claude plugin uninstall noacg@noacg-studio` and
`codex plugin remove noacg@noacg-studio` undo them.

## Next

Nothing pending in this scope. If the owner wants the prompt shortened after reading it, the text
lives in exactly two places: the `<pre class="prompt">` in `docs.html` and the fenced block in
`cli/README.md`. `e2e/docs.spec.ts` pins four phrases from it, so a rewrite updates the spec too.
