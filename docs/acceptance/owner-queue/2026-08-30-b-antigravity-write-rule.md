# Antigravity cannot write, and one line in your settings file fixes it

**Date:** 2026-08-30
**Needs:** you, because it is a machine-global permission file and a session must not widen one.

## What is wrong

**Verified against the file on disk at the end of this session**, after another session reported
having cleaned it: it is byte-identical to how this session found it - the three invalid entries
are still there and both `write_file` rules are still in the glob form that matches nothing. So
everything below still applies. Check the file before you edit it, in case that cleanup lands in
between.

`~/.gemini/antigravity-cli/settings.json` grants exactly one capability today: `read_file`.
Every `write_file` is auto-denied, and so is every shell command. That is why the write trial
this branch was meant to run produced no diff at all.

The cause is that a grant TARGET is an anchored regular expression, not a glob. The binary says
so: "Each token in the granted target is matched as a full word (internally treated as an
anchored regular expression: `^(?:pattern)$`)." So the installed rule

```
write_file(C:/claude/NoaCG-Studio/.claude/worktrees/*)
```

reads as "the text `...worktree` followed by any number of `s`" - it matches the folder's own
name and can never match a file inside it. Three more entries are dead for the same reason:
`list_dir(*)`, `grep_search(*)` and `codebase_search(*)` are not actions at all (the CLI log
prints `ignoring invalid allow entry ... unknown action`), and `command(grep)` grants the bare
word `grep`, never `grep -rn foo .`.

## The change

Replace the last two lines of the `allow` array with the regex forms:

```json
"write_file(C:[\\\\/]claude[\\\\/]NoaCG-Studio[\\\\/][.]claude[\\\\/]worktrees[\\\\/].*)",
"write_file(C:[\\\\/]Users[\\\\/]ahonemi[\\\\/]AppData[\\\\/]Local[\\\\/]Temp[\\\\/]claude[\\\\/].*)"
```

This is the SAME scope you already intended - agent worktrees and the scratch directory, nothing
else - written in the form the matcher actually uses. It does not widen the intent; it makes the
existing intent take effect. You may also delete `list_dir(*)`, `grep_search(*)` and
`codebase_search(*)`, which the CLI already ignores.

If you would rather not grant headless writes at all, that is a fine answer too - say so and the
routing table stops treating Antigravity's write path as "blocked" and starts treating it as
"read-only by choice", which is a different row.

## Route to it, under a minute

1. Open `C:\Users\ahonemi\.gemini\antigravity-cli\settings.json`.
2. Swap the two `write_file(...)` lines for the two above.
3. Check it took, from any agent worktree:
   `"C:/Users/ahonemi/AppData/Local/agy/bin/agy.exe" -p "Create a file called agy-write-probe.txt in this directory containing the single word ok. You have no shell." --output-format json`
   A non-empty `.response` and the file on disk means it works. An empty `.response` means it
   still does not - and note that an empty response can come back with `status: SUCCESS` and exit
   code 0, so read the response, not the status.
4. Delete the probe file.

## What to look at

Nothing visual. The thing to confirm is that the file exists after step 3.

## Why it matters

`docs/HARNESS_ROUTING.md` now carries a routing row saying Antigravity cannot be given written
work. That row is a wall, not a preference, and this is the one line that removes it. Until then
its diff quality is unmeasured for the third round running, and the token-saving plan rests on a
harness that can only read.
