---
kind: walk
date: 2026-08-30
---
# Google's coding agent: one command from you, and the meter that answers "am I paying for nothing"

Date: 2026-08-30

## The route, under a minute

Two things to look at, in a terminal in this repo:

```
npm run harness:usage
npm run harness:usage -- --hours 5
```

That is the new meter. It prints what Claude Code and Codex each cost over a window, from their
own local transcripts - sessions, tokens, and for Codex the percentage of the 5-hour and weekly
subscription windows that was used, with the times they reset. Nothing is sent anywhere; it only
reads files that were already on the disk.

The Codex line is the one you asked for. On the run that built this, the weekly window read 40%
used and the 5-hour window 12%, so the subscription is being used - just not heavily.

`--wave` scopes it to the current wave (it starts from the newest
`docs/handoffs/*wave-plan*.local.md`), `--since <iso>` and `--hours <n>` take any other window,
and `--json` gives the same numbers to a script.

**One number it will never print: Claude Code's own 5-hour window percentage.** That is not in the
transcripts - they carry token usage and no rate-limit event at all. Rather than estimate a
percentage of an allowance nobody has published, the meter says so in place of the number. Codex
has its percentages only because Codex writes them into its own log.

## The one action that needs you

**Run `agy install`.** That is the whole thing. It is the Antigravity CLI's own command for
putting its binary on your PATH, and it edits shell settings, which is why a session should not
run it for you.

```
"C:\Users\ahonemi\AppData\Local\agy\bin\agy.exe" install
```

Then, in a new terminal, this should answer with a model list and no prompt of any kind:

```
agy models
```

And this is the smoke test that proves the headless channel end to end. It costs one small Google
request:

```
agy -p "reply with the single word ready" --output-format text
```

Nothing else is needed. Nothing was installed for you and no credentials were entered.

## What we found out, so you do not have to re-derive it

**Antigravity CLI is already installed and already signed in on this machine.** `agy.exe` is at
`C:\Users\ahonemi\AppData\Local\agy\bin`, version 1.1.22, and `agy models` answers with the full
list (Gemini 3.7/3.6/3.5 Flash, Gemini 3.1 Pro, Claude Sonnet 4.6, Claude Opus 4.6, GPT-OSS 120B)
without asking for a login. It is only missing from PATH, which is what `agy install` fixes.

**It does ship a headless mode**, and a good one: `-p` for a single non-interactive prompt,
`--output-format json` or `stream-json`, `--input-format stream-json` to feed it a stream of turns
on stdin, `--model`, `--effort`, `--mode plan`, `--sandbox`, `--json-schema` for structured
output, `--print-timeout`, and `--dangerously-skip-permissions`. That is the same shape as the
Codex channel, so routing work to it later is a normal piece of work rather than a research
project.

**The Antigravity IDE on your machine is a different product and has no headless path.** It is an
Electron app plus a language server, with no `bin/`, no `.cmd`, no command-line entry - so
anything trying to drive it would have found nothing. The CLI installs somewhere else entirely,
which is why it looked absent.

**Gemini CLI is dead, so it is not the fallback.** Google announced the consolidation at I/O on
2026-05-19 and cut individual accounts off the legacy CLI on 2026-06-18 - no grace period, no
automatic migration, only purchased enterprise Code Assist licences still work. If we ever want a
Google harness, Antigravity CLI is the only one there is.

## If it ever has to be installed fresh

Windows PowerShell:

```
irm https://antigravity.google/cli/install.ps1 | iex
```

macOS or Linux:

```
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Then run `agy` once. It opens a browser for Google sign-in, and after that the session lives in
the OS keyring. Over SSH it prints a URL to open locally and asks for a code back. There is an
API-key alternative that skips the browser - `GEMINI_API_KEY` in the environment plus
`{"modelProvider": "gemini"}` in `~/.gemini/antigravity-cli/settings.json` - but the signed-in
account is what is already working here, so it is not needed.
