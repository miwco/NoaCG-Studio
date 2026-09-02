---
kind: agent
date: 2026-08-30
---
# Google's coding agent, actually run: what it got right, what it got wrong, and the two commands it still needs from you

Date: 2026-08-30

## The route, under a minute

Open **`docs/HARNESS_ROUTING.md`** and read the table at the top. That is the whole answer to
"which harness should do which work", and from now on it is the file every session adds to when it
learns something about routing - Claude Code, Codex and Antigravity each have a section, and
nobody rewrites the earlier entries.

Then read the two graded trials under "Antigravity (Google) - first trial, 2026-08-30". Both were
run tonight against this repository, read-only.

- **Comprehension: it passed clean.** Asked cold to list every export target with its exact id and
  label, state the `ExportTarget` interface field by field, and say exactly which targets share the
  self-contained-HTML composer, it got all of it right in 99 seconds and one turn - and noticed on
  its own that the LiveOS target gets its package by delegating to the OGraf one.
- **Generation: it passed, and then oversold itself.** It wrote a gate script it had never seen the
  like of, and the script ran correctly first time, caught all three fault classes when they were
  injected, and handled the nasty edge case in `src/styles/index.css` - a comment containing the
  literal words `@import ...`, which a naive version would have counted. But it also skipped the
  sibling test file every real gate here has, and its own header comment claims the gate "runs in
  `npm run build`", which is not true of anything. **The code was better than its claims about the
  code.** That is the thing to remember about it.

Nothing it produced was committed. The script it wrote lives only in a scratch directory.

## The two actions that need you

**1. `agy install`** - still owed from last night's item, unchanged. It puts the binary on PATH and
edits shell settings, which is why a session should not run it.

```
"C:\Users\ahonemi\AppData\Local\agy\bin\agy.exe" install
```

**2. Decide whether to install the read-only permission file.** This is new, and it is the one
thing standing between us and routing real work to Antigravity.

Headless `agy` cannot use a single tool - it cannot even read one file - unless an allow-rule
exists first. There is no prompt to answer in print mode, so every tool call is silently denied and
the run reports `SUCCESS` with an empty answer. Tonight's trials worked only because this file was
created, used, and then **deleted again**:

`C:\Users\ahonemi\.gemini\antigravity-cli\settings.json`

```json
{
  "permissions": {
    "allow": ["read_file(*)", "list_dir(*)", "grep_search(*)", "codebase_search(*)"],
    "deny": ["write_file(*)", "command(*)"]
  }
}
```

It was not left in place, and the reason is specific rather than cautious: that file is
machine-global, and it is **unknown whether the `deny` half also applies to your interactive `agy`
sessions**. If it does, leaving it there would quietly stop your own Antigravity CLI from writing
files, and you would find out at the worst moment. Either you say the `deny` lines are fine, or the
allow-only version goes in without them, or every session keeps paying the setup cost by hand. Any
of the three is a decision, not a default.

The alternative the CLI itself suggests - `--dangerously-skip-permissions` - is not on the table
and no session will use it.

## What it costs, so the answer is not a feeling

Free at the subscription, and on Google's meter rather than ours - which is the entire point while
Claude's limits are the binding constraint. Each of the two real trials burned about 170 K input
tokens and 1.2 M cache reads over about 90 seconds.

**But nothing on disk records that.** Unlike Codex, which writes its own rate-limit percentages
into its logs, Antigravity keeps no running total anywhere - the numbers exist only on stdout, in
the JSON of the run that produced them, and vanish if nobody catches them. So `npm run
harness:usage` can never grow an Antigravity reader the way it has Codex and Claude ones; anything
that meters it has to record each call as it makes it. The exact field paths are written down in
`docs/HARNESS_ROUTING.md` for whoever builds that.
