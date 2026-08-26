# Handoff - the agent door, round two

Paste this into a fresh session. It is self-contained. Everything it claims was measured on
2026-08-26 on branch `claude/agent-door-round-two-177d3b`, and the commands to re-measure are in
it.

---

## What this session did

Three things, all landed on the branch:

1. **One public vocabulary for the agent door.** Four names had grown for one artifact and one
   capability. There is now one of each, written into `docs/AGENT_CLI.md` as a table near the top
   and applied everywhere a user or an agent reads it.
2. **The OGraf claim is measured, not asserted.** "One folder that is simultaneously a valid SPX
   package and an EBU OGraf v1 Graphic" now has a mechanical check behind it, and `docs/OGRAF.md`
   answers the owner's question about playing a NoaCG production on an OGraf renderer with
   verified steps.
3. **The MCP entrance has offline tests.** It had none that run in CI.

## 1. The vocabulary (do not drift from this)

| Name | Means |
|---|---|
| **the agent door** | the CAPABILITY: a coding agent makes a graphic that is genuinely NoaCG-playable and puts it in a library |
| **the NoaCG CLI** | the ARTIFACT: one npm package `@noacg/cli`, one command `noacg`. Every verb lives here |
| **the three entrances** | the plugin (Claude Code / Codex), the MCP server (`noacg mcp`), the terminal (`noacg <cmd>`) |
| **the `noacg-graphic` skill** | the CONTRACT TEXT all three carry. Not an entrance, not design guidance |

Never write "the CLI and the MCP server" as though they were two things to pick between: `noacg
mcp` runs the same package.

**One deliberate deviation from the brief.** The brief said to describe "plugin / skill / MCP
server" as the three entrances. The accurate set is **plugin / MCP server / terminal**, because
the terminal is how an agent that only runs shell commands reaches the door, and the skill is text
that all three carry rather than a way in. Written that way, with the skill's place stated
explicitly in the same table. If the owner prefers the original triple, it is a table edit in
`docs/AGENT_CLI.md` "One name for each thing" and one paragraph each in `cli/README.md` and
`docs.html`.

Files carrying the vocabulary now: `docs/AGENT_CLI.md`, `cli/README.md`, `cli/plugin/README.md`,
`cli/src/index.ts` (header comment + `--help`), `cli/package.json`, both plugin manifests,
`.claude-plugin/marketplace.json`, `cli/skill/noacg-graphic/SKILL.md` (+ its generated and adapter
copies), and the `/docs` page's agents section in `docs.html`.

## 2. What was verified about OGraf, and how to repeat it

Both checks ran against a dev server on this branch. Neither is automated yet - see "What is left"
below.

**Check A: the manifest against the EBU's PUBLISHED schemas.** All seven schema files fetched from
`ograf.ebu.io` and loaded into ajv (draft 2020-12), rather than `src/export/targets/ografSchema.ts`'s
transcription of them. A CLI-produced package's manifest was **valid**. The harness was
mutation-tested in the same run, and seven of eight deliberate breakages were rejected.

**The one that was not rejected is a finding worth keeping:** a **duplicate `customActions` id
passes the published schema**, because JSON Schema cannot express uniqueness across a keyed array.
Our own validator catches it and must keep catching it - a renderer registering actions by id
would silently lose one. This is recorded in `docs/OGRAF.md`.

To repeat check A:

```bash
curl -sS https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json -o schema.json
```

then fetch the four `$ref` targets it names and their two transitive refs (seven files total),
load them all into ajv with `strict: false`, and validate any `*.ograf.json`. Mutate the manifest
before you trust the result.

**Check B: the OGraf half driven as a stranger's package.** Take a dual package, delete the SPX
sources and the root `v_noacg` block, leaving the manifest, `graphic.mjs`, `js/gsap.min.js` and
`fonts/`. `noacg validate` then reads it through the THIRD-PARTY OGraf path - the code that knows
nothing about NoaCG templates - and drives the lifecycle in the OGraf host. Result: nine actions
(`load`, `updateAction`, four `customAction`s, `playAction`, `stopAction`, `dispose`), **every one
`200`**, and the on-air frame painted in the package's own bundled Inter.

```bash
node scripts/dev-port.mjs                                   # this checkout's port
npm --prefix cli run build
NOACG_URL=http://localhost:<port> node cli/dist/index.js scaffold --type scoreboard --design neutral --out /tmp/dual
NOACG_URL=http://localhost:<port> node cli/dist/index.js validate /tmp/dual
# then strip /tmp/dual to its OGraf half in a copy, and:
NOACG_URL=http://localhost:<port> node cli/dist/index.js validate /tmp/ograf-only --screenshots /tmp/shots
```

Start the dev server with the preview tools, never a raw shell command - a guard hook refuses it.

**Also verified, for the "download the template" steps now in `docs/OGRAF.md`:** the `/ograf` page
builds a real package at click time (`hairline-ograf.zip`, entries captured), and the studio's
export route is Finish → **Export it** → **OGraf (EBU) export** → **Validate & download**, with
the button naming the chosen target back at you.

**The honest answer that section gives, and the one to argue with if it is wrong:** NoaCG is the
authoring and packaging side; the renderer owns loading, cueing and data. NoaCG's control page and
`/output?production=<slug>` are the OTHER playout route and do not drive an OGraf renderer. A
production export is one folder per graphic, not a rundown - the cue order and layers stay in
NoaCG.

## 3. What hardened, and why that area

**The weakest verified area was the MCP entrance, and it was chosen for one reason: it had zero
tests that run in CI.** `unit.test.mjs` covers the terminal entrance thoroughly; everything about
the MCP server lived in `smoke.test.mjs`, which skips itself whenever no bridge answers. So the
surface an installed plugin actually talks to could change shape and every green run would have
said nothing.

`cli/test/mcp.test.mjs` (new, 8 tests, offline) drives a real MCP client against `noacg mcp` over
stdio with `NOACG_URL` pointed at a closed port. It pins the tool set, the absence of `caspar`
(a rule that was prose only), every tool's title/description/arguments, the server's name and
version, and that `noacg_docs` plus the `noacg://docs/<topic>` resources answer with no
deployment, no browser and no key. **Mutation-tested before landing:** renaming one tool and
dropping one required argument each failed three of the eight.

Three real defects fixed alongside it:

- `cli/src/commands/validate.ts`: the third-party OGraf branch wrote `onair.png` and never named
  it - not in the text output, not in `--json`. A caller could not tell "no frame written" from
  "a frame written somewhere". It now reports it both ways, matching the NoaCG branch.
- `cli/src/index.ts`: `return e instanceof UsageError ? EXIT_USAGE : EXIT_USAGE` - a dead ternary
  where the exit-code decision was supposed to be. Collapsed, with the actual rule written down.
- `cli/src/mcp.ts`: a dead exported `scratchDir()`, a stray `export { fs }`, and the two imports
  that existed only for them.

## What is left

**Nothing is blocking.** In rough order of value:

1. **Automate check A.** The ajv-against-published-schemas harness was built in a scratch
   directory and thrown away; only its RESULT is in `docs/OGRAF.md`. It would make a good weekly
   report next to `check:freshness` (time-driven, not a gate - it fetches from `ograf.ebu.io`, and
   a gate that reaches the network fails on the wrong days). The mutation set is listed in
   `docs/OGRAF.md`.
2. **Em dashes in exported package text.** Every OGraf package NoaCG hands out carries them in
   text a customer and a renderer read - the manifest's per-action `description` is
   `Goal — fires the "goalA" event.` in every graphic with operator events, including all six free
   starters on the public `/ograf` page. `scripts/check-copy.mjs` does not scan `src/export`, so
   nothing catches it. Left alone deliberately: it is outside this session's declared touch set
   and belongs with `docs/backlog/copy-tells-drain.md`. A background task was filed for it.
3. **The `409`-after-`dispose` probe.** `docs/OGRAF.md` still records that no external host has
   exercised it. The CLI's own `ografBench` could drive one action after `dispose()` on any
   third-party package and check for a 4xx. Not done here because it would start FAILING packages
   over a rule worth confirming against the spec text first, and a false failure on somebody
   else's graphic is worse than a missing check.
4. **`noacg mcp` still has no offline test for a tool that needs the bridge.** The seven tools'
   SHAPES are pinned; their behaviour on a live deployment is `smoke.test.mjs` only. A fake bridge
   would close that, and is a bigger piece of work than tonight's.

## Verification state

- `npm --prefix cli test` - 57 tests, 52 pass, 5 skipped (the bridge tier, correctly skipping).
- `npm run build` - the root gate.
- The owner-queue item is `docs/acceptance/owner-queue/2026-08-26-agent-door-one-name.md`; the
  route is the `/docs` page's "Coding agents & the CLI" section.
- Version stayed at **0.2.0**. Nothing was published, and the owner's npmjs.com trusted-publisher
  step is still the one thing standing between a tag and a release (`docs/AGENT_CLI.md`,
  "Releasing to npm").
