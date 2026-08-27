# Session M - the agent door, read by a human

Branch `claude/m-agent-door-docs-ef37d0`, one commit on `c8a0f1c3`. The owner's read on
2026-08-27: the `/docs` section "Coding agents & the CLI" opened by explaining a tool, so a
first-time reader had to learn the CLI before they learned what NoaCG is for. The page must say
**connect once, then your agent handles the NoaCG-specific work**. It is the front door for the
coming custom-control-panel road, so it is load-bearing rather than cosmetic.

## 1. The section leads with what NoaCG adds, not with a tool

`docs.html`, `#claude-code`. The lead is the owner's own paragraph, near-verbatim: an agent can
create the HTML, CSS and JavaScript; NoaCG turns that into something usable on air, with operator
controls, live events, validation and predictable playout behaviour; the CLI is what lets an agent
build to that standard. One extra line follows, on what the graphic then is - a production, its
own operator events, live data - linking to `#dashboard`, `#behaviour` and `#data` rather than
listing features.

Three `h3`s, and the ids are unchanged because they are addresses:

| id | was | is |
|---|---|---|
| `#agent-install` | Install | **Connect NoaCG to your agent** - three blocks of the same shape, two commands each |
| `#agent-loop` | The loop | **Then describe the graphic you want** - scaffold / author / validate / iterate / save, written as what the AGENT does |
| `#agent-setup` | Other agents | **Reference** - manual CLI use, npx vs global, env vars, generated files, `doctor`, the SPX/OGraf package |

Nothing was deleted. Everything that used to be in the install prose is in Reference, and the loop
is no longer a list of commands the reader is implicitly asked to run: it is five things the agent
does, with `noacg login` called out as the one step that needs the human.

## 2. Codex installs in two commands now, and that is measured

The old instruction was: copy `skills/noacg-graphic/` into `~/.codex/skills/` by hand, then
`codex mcp add noacg -- npx -y @noacg/cli mcp`. Both are gone.

`codex plugin` reads the SAME root `.claude-plugin/marketplace.json` that Claude Code reads. So:

```bash
codex plugin marketplace add miwco/NoaCG-Studio
codex plugin add noacg@noacg-studio
```

What was measured on this machine, both against `origin/main` and against a local checkout: the
marketplace resolves to the name `noacg-studio` out of our manifest; `codex plugin add` copies the
whole `cli/plugin/` directory - skill, command and `.mcp.json` - into
`~/.codex/plugins/cache/noacg-studio/noacg/0.2.0/`; and `codex mcp list` then shows the `noacg`
server as **enabled with no `[mcp_servers.noacg]` block in `~/.codex/config.toml`**. Removing the
plugin removes the row, which is how you can tell the plugin is what registered it. Everything
added during the investigation was removed again, on both CLIs.

**Claude Code cannot go below two commands.** `claude plugin install` resolves `plugin@marketplace`
only against a marketplace that is already configured; a repo shorthand in that position fails with
*"Plugin "noacg" not found in marketplace "miwco/NoaCG-Studio""*. There is no URL-install form.
`claude plugin marketplace add` does take `--sparse <paths...>`, which would avoid cloning the
whole repository for a plugin that lives in `cli/plugin/` - **not documented**, because it makes
the copy-paste line longer and stranger for a first-time reader, and the clone is a one-off. Worth
revisiting if anyone complains about install time.

The same change is in `cli/README.md`, `cli/plugin/README.md` and the distribution table in
`docs/AGENT_CLI.md`, with the old manual path kept in both READMEs as the fallback for a Codex
build without `codex plugin`.

## 3. The two Learn pointers that were still owed

From session I's "not done, deliberately" list:

- The wizard's **Import graphic** step, in the ⓘ body beside "Your design"
  (`ImportDesignStep.tsx`) - links to `/docs#svg`.
- **Settings, Playout** (`SettingsDialog.tsx`) - links to `/docs#casparcg`.

Both follow the `/docs#data-api` pattern already on the production Data tab: a last line in a hint,
`target="_blank" rel="noreferrer"`.

Both render in the browser's default light-blue link colour, because the app has **no `a` colour
rule** in `src/styles.css` and the app declares `color-scheme: dark`. The existing `#data-api` link
is the same, so this branch is consistent rather than newly wrong - but in an amber-on-dark UI it
reads as an accident. One CSS rule fixes all three; it is not in this branch because it changes
every hint link app-wide and that is the owner's call. Noted in the owner-queue item.

## 4. The rest of the page

Swept for read-by-humans simplicity as asked, public page and the two CLI READMEs only. It held up:
the graphics, SVG, browser-source, CasparCG, dashboard, audience, behaviour and data sections read
cleanly and are already written against the code. Three small things changed:

- The hero lede said an account is needed "to save from the command line", which is now the wrong
  frame. It says "or to let a coding agent save into your library".
- The SVG intro's "The drawing is not redrawn: the typography and geometry go on air as drawn, and
  export to every target" shifted subject mid-sentence. Split in two.
- A stale empty `<!-- END CREDITS -->` comment block left over from session I's restructure.

One thing deliberately left alone: the CasparCG 2.3.x row in `#casparcg-versions` is a dense wall
of text in a table cell, but every clause in it is load-bearing and rewriting it risks losing
precision. If it is ever reworked, it wants to become prose under the table rather than a shorter
cell.

## Gates

- `npm run build` green, `check:copy` green (zero em-dashes on the page).
- `scripts/check-client-neutral.mjs` needed its `docs.html` ALLOWED entry re-keyed: it stores the
  exact source line, the SPX sentence rewrapped, and the gate correctly asked again. Same reason,
  same fact - one file satisfying two formats at once.
- `/docs` was driven in the browser rather than described: 12 command blocks, 12 copy buttons, the
  first one still `claude plugin marketplace add miwco/NoaCG-Studio` (the spec clicks it and reads
  the clipboard), every in-page anchor resolving, no console errors, no horizontal overflow at
  1920 or at 375. The two in-app links were opened in the real wizard and the real Settings dialog.
- `e2e/docs.spec.ts` gained the two Codex commands beside the two Claude Code ones, for the reason
  the existing pair is pinned: a drift in either half installs nothing, silently.
- `npm run queue -- "npm run test:e2e:focus"` is **j-0106**, waiting on the RAM floor at the time
  of writing. CI is the gate that matters and plans from the push.

## Next

- The **creation-wizard guide** is still the biggest hole in `/docs` - item 1 of
  `docs/backlog/docs-guides-to-write.md`, unchanged by this branch.
- If the owner wants in-app links amber, that CSS rule is a small, self-contained change.
