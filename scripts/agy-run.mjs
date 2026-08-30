#!/usr/bin/env node
// THE ONE WAY THIS REPO CALLS `agy` (Google's Antigravity CLI), and the only place its spend is
// ever recorded.
//
//   npm run agy -- --model gemini-3.1-pro-high "name every export target and its id"
//   npm run agy -- --model gemini-3.1-flash --prompt-file notes/question.txt --label trial-c
//   npm run agy -- --model gemini-3.1-pro-high --effort high --cwd ../other-worktree "..."
//
// WHY A WRAPPER AT ALL. `agy` is the only one of the three harnesses that keeps NO cumulative
// usage anywhere on disk. Codex writes `token_count` events into its rollouts and Claude Code
// writes `message.usage` into its transcripts, so `scripts/harness-usage.mjs` can read both after
// the fact. `~/.gemini/antigravity-cli/` holds a conversation store, an annotation, a metadata
// cache and logs, and a text scan of all of them finds no token field at all (measured
// 2026-08-30, docs/HARNESS_ROUTING.md). There is no `agy usage` subcommand and no headless quota
// surface either. Per-run usage exists on stdout, once, and then it is gone. So the money's worth
// is unanswerable unless the CALL captures its own receipt - which is this script.
//
// WHERE THE LEDGER LIVES, AND WHY. `~/.noacg/agy-usage.jsonl`, overridable with
// `NOACG_AGY_LEDGER`. Deliberately OUTSIDE the repository:
//
//   - a worktree is disposable. Ignored files die with it (`.agent-workflows/cleanup-worktrees.md`
//     exists because that loss is real), and this is the one record of spend that cannot be
//     re-derived from anything;
//   - spend is per MACHINE, not per checkout. A ledger in the tree would be one ledger per
//     worktree, so the answer to "what did Antigravity cost today" would depend on where you
//     stood;
//   - an ignore rule is a thing to forget. A path outside the repo cannot be committed by
//     accident, so there is no rule to keep in step;
//   - it matches the other two harnesses. `harness-usage.mjs` already reads `~/.codex` and
//     `~/.claude` off `homedir()`, and the third reader is the same shape because the third
//     source sits in the same place.
//
// One JSON line per call, append-only, `v: 1`. A FAILED call is recorded too: a run whose tools
// were all auto-denied still spends ~18 K input tokens, and a meter that hid those would flatter
// the harness exactly where it is being judged.
//
// TWO REFUSALS, both deliberate:
//
//   1. `--model` is REQUIRED. The agy result object does not name the model that answered, so a
//      call that did not pin one can never be attributed afterwards. The ledger would carry a
//      number with no idea what produced it.
//   2. `--dangerously-skip-permissions` is REJECTED, not forwarded. It is in agy's help output;
//      it is a capability, not an instruction.
//
// AND ONE TRAP THIS SCRIPT EXISTS TO CATCH: `status: SUCCESS` with exit code 0 and an EMPTY
// `response` is agy's way of saying it produced no answer at all. Two causes are known, both
// measured on this machine, and they need different fixes:
//
//   - every tool call auto-denied. There is no prompt to answer in print mode, so a tool with no
//     allow-rule is refused silently. Only `read_file`, `command` and `write_file` are real grant
//     actions - `list_dir`, `grep_search` and `codebase_search` are accepted into the settings
//     file and then dropped as invalid, which only the agy log ever says;
//   - `--print-timeout` (default 5m) reached mid-task. Nothing is returned and everything is
//     billed: one such run here cost 202 K input and 1.56 M cache reads for an empty string.
//
// Both are FAILURES here, and the elapsed time picks which diagnosis leads.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEDGER_VERSION = 1;

/** Windows caps a command line near 32 K, and the prompt is one argument of it. */
export const MAX_PROMPT_CHARS = 30_000;

/** The ledger path, so the meter and the wrapper can never disagree about it. */
export function ledgerPath({ env = process.env, home = homedir() } = {}) {
  return env.NOACG_AGY_LEDGER || path.join(home, '.noacg', 'agy-usage.jsonl');
}

// ── Pure decisions ───────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { model: null, effort: null, label: null, cwd: null, printTimeout: null, prompt: null, help: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[index += 1];
    if (token === '--model') args.model = next();
    else if (token === '--effort') args.effort = next();
    else if (token === '--label') args.label = next();
    else if (token === '--cwd') args.cwd = next();
    else if (token === '--print-timeout') args.printTimeout = next();
    else if (token === '--prompt') args.prompt = next();
    else if (token === '--prompt-file') args.promptFile = next();
    else if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--dangerously-skip-permissions') {
      throw new Error('--dangerously-skip-permissions is refused here. It is a capability, not an instruction.');
    } else if (token.startsWith('-')) throw new Error(`unknown argument: ${token}`);
    else positional.push(token);
  }
  if (positional.length > 1) {
    throw new Error(`expected one prompt, got ${positional.length}. Quote it, or use --prompt-file.`);
  }
  if (positional.length === 1) {
    if (args.prompt || args.promptFile) throw new Error('the prompt was given twice');
    args.prompt = positional[0];
  }
  return args;
}

/**
 * Where the agy executable is. `AGY_BIN` overrides everything.
 *
 * On Windows the name that answers to `agy` on PATH is usually a LAUNCHER - a Git Bash shim with
 * no extension, or a one-line `.cmd` - and the real binary is the `.exe` beside it. This search is
 * extension-major rather than directory-major on purpose: **every `.exe` on PATH is preferred to
 * any launcher anywhere on it**, because only a real executable can be spawned without a shell,
 * and node's `shell: true` on Windows joins argv with spaces before handing it to `cmd.exe` -
 * which tears a multi-word prompt into separate arguments. A launcher-only install is refused with
 * that reason rather than silently mangled.
 */
export function agyCandidates({ env = process.env, platform = process.platform } = {}) {
  if (env.AGY_BIN) return [env.AGY_BIN];
  const windows = platform === 'win32';
  const separator = windows ? ';' : ':';
  const extensions = windows ? ['.exe', '.cmd', '.bat'] : [''];
  // The joiner follows the PLATFORM ARGUMENT, not the host. Bare `path.join` would build
  // `C:\dir/agy.exe` when this is exercised for Windows from anywhere else - which is invisible on
  // the machine it describes and shows up only under a Linux CI runner.
  const join = windows ? path.win32.join : path.posix.join;
  const dirs = (env.PATH || env.Path || '').split(separator).filter(Boolean);
  // agy's own installer puts the binary here, and a process that started before the installer ran
  // has a stale PATH - which is exactly the case a long-lived agent session is in.
  if (windows && env.LOCALAPPDATA) dirs.push(join(env.LOCALAPPDATA, 'agy', 'bin'));
  return extensions.flatMap((extension) => dirs.map((dir) => join(dir, `agy${extension}`)));
}

export function resolveAgy({ env = process.env, platform = process.platform, exists = existsSync } = {}) {
  for (const candidate of agyCandidates({ env, platform })) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** The argv handed to agy. `--output-format json` is not optional: it is the whole receipt. */
export function buildAgyArgs(args) {
  const out = ['-p', args.prompt, '--output-format', 'json', '--model', args.model];
  if (args.effort) out.push('--effort', args.effort);
  if (args.printTimeout) out.push('--print-timeout', args.printTimeout);
  return out;
}

/**
 * agy's duration grammar, as `--print-timeout` takes it: "5m", "300s", "1h30m", or bare seconds.
 * A non-positive result falls back rather than being taken literally: zero would make the timeout
 * test below (`elapsed >= timeout - 5`) true for every run, so every empty response would be
 * diagnosed as a timeout - including the denials, which need the opposite fix.
 */
export function parseDuration(text, fallback) {
  if (text === null || text === undefined || text === '') return fallback;
  const raw = String(text).trim();
  const positive = (value) => (Number.isFinite(value) && value > 0 ? value : fallback);
  if (/^\d+(\.\d+)?$/.test(raw)) return positive(Number(raw));
  const units = { h: 3600, m: 60, s: 1 };
  let total = 0;
  let matched = false;
  for (const [, value, unit] of raw.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/gi)) {
    total += Number(value) * units[unit.toLowerCase()];
    matched = true;
  }
  return matched ? positive(total) : fallback;
}

/** agy's own default for --print-timeout. A run that stops here returns nothing and bills anyway. */
export const DEFAULT_PRINT_TIMEOUT_SECONDS = 300;

const DENIAL_HINT = 'In print mode there is nothing to answer a permission prompt with, so every '
  + 'tool call it was not pre-allowed to make was auto-denied. Add what it needs to the "allow" '
  + 'list in ~/.gemini/antigravity-cli/settings.json - and note that only read_file, command and '
  + 'write_file are real grant actions there: list_dir, grep_search and codebase_search are '
  + 'ignored as invalid, which the agy log says and the JSON result does not.';

const TIMEOUT_HINT = 'It ran for the whole of its --print-timeout and was cut off mid-task, which '
  + 'returns an empty response rather than an error. Raise it (--print-timeout 15m) or ask for '
  + 'less. The tokens were spent: a timed-out run on this machine cost 202 K input and 1.56 M '
  + 'cache reads and returned nothing.';

/**
 * The result object agy printed, reduced to a verdict. `status: SUCCESS` IS NOT THE VERDICT.
 *
 * An empty `.response` means the run produced no answer, and it reports success with exit code 0
 * either way. Two causes have been seen on this machine, and they need different fixes, so the
 * elapsed time picks between them: a run cut off at its `--print-timeout` lands on the boundary,
 * anything shorter was denied its tools. Both are named whichever way it goes, because the
 * boundary is a heuristic and a wrong diagnosis sends someone editing the wrong file.
 */
export function classifyResult(result, { elapsedSeconds = 0, timeoutSeconds = DEFAULT_PRINT_TIMEOUT_SECONDS } = {}) {
  if (!result || typeof result !== 'object') {
    return { ok: false, failure: 'agy printed no JSON result object on stdout.' };
  }
  // A REPORTED status must be read BEFORE the empty-response guess, not after it. An errored run
  // has an empty response too, so testing the response first would answer "your permissions are
  // wrong" to a quota failure and throw away the only true sentence agy produced about it.
  if (result.status && result.status !== 'SUCCESS') {
    const detail = typeof result.error === 'string' && result.error.trim() ? ` - ${result.error.trim()}` : '';
    return { ok: false, failure: `agy reported status ${result.status}${detail}` };
  }
  const response = typeof result.response === 'string' ? result.response : '';
  if (!response.trim()) {
    const timedOut = elapsedSeconds >= timeoutSeconds - 5;
    return {
      ok: false,
      timedOut,
      failure: `agy returned an EMPTY response after ${elapsedSeconds.toFixed(1)}s. `
        + (timedOut ? TIMEOUT_HINT : DENIAL_HINT)
        + `\n           The other known cause: ${timedOut ? DENIAL_HINT : TIMEOUT_HINT}`,
    };
  }
  return { ok: true, failure: null };
}

/**
 * One ledger line. The four token counts are kept SEPARATE and unsummed, because agy's own
 * `total_tokens` is input + output only - it excludes thinking and cache reads, and cache reads
 * are the largest of the four by an order of magnitude. Any single number here would be a
 * different number depending on which two fields somebody happened to add.
 *
 * No prompt or response text is stored, only their lengths: the ledger is a spend record, and a
 * spend record that quietly accumulates the content of every question asked is a different thing.
 */
export function ledgerRecord({ args, result, verdict, at, cwd, branch, exitCode, durationMs }) {
  const usage = (result && typeof result.usage === 'object' && result.usage) || {};
  const number = (value) => (Number.isFinite(value) ? value : null);
  return {
    v: LEDGER_VERSION,
    at: new Date(at).toISOString(),
    harness: 'antigravity',
    model: args.model,
    effort: args.effort ?? null,
    label: args.label ?? null,
    cwd,
    branch,
    conversationId: result?.conversation_id ?? null,
    status: result?.status ?? null,
    ok: verdict.ok,
    failure: verdict.failure,
    exitCode,
    // agy's own float when it gave one; the wall clock this process measured otherwise, so a run
    // that died before printing anything still contributes its real duration.
    durationSeconds: number(result?.duration_seconds) ?? Number((durationMs / 1000).toFixed(3)),
    turns: number(result?.num_turns),
    promptChars: args.prompt.length,
    responseChars: typeof result?.response === 'string' ? result.response.length : 0,
    usage: {
      input: number(usage.input_tokens) ?? 0,
      output: number(usage.output_tokens) ?? 0,
      thinking: number(usage.thinking_tokens) ?? 0,
      cacheRead: number(usage.cache_read_tokens) ?? 0,
    },
  };
}

/**
 * The receipt out of agy's stdout. agy prints one JSON object there - but a Go binary is free to
 * print a warning line before it or a stray line after it, and losing the receipt to either would
 * record a call that cost 200 K input tokens as costing nothing. That is the exact loss this
 * script exists to prevent, so it tries four readings before giving up, cheapest first: the whole
 * buffer, the span from the first `{` to the last `}` (which survives noise on both sides), each
 * line on its own (NDJSON, or the object printed among log lines), and finally every suffix
 * starting at a `{`. The largest successful parse is the answer.
 */
export function parseAgyStdout(stdout) {
  const text = String(stdout ?? '').trim();
  if (!text) return null;
  const attempt = (candidate) => {
    if (!candidate || candidate[0] !== '{') return null;
    try {
      const value = JSON.parse(candidate);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  };

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  const candidates = [text, first !== -1 && last > first ? text.slice(first, last + 1) : null];
  for (const candidate of candidates) {
    const parsed = attempt(candidate);
    if (parsed) return parsed;
  }
  // Line by line, then suffix by suffix. Both are last resorts, so the widest match wins: a
  // fragment of the object would parse and carry no usage.
  const spans = [
    ...text.split('\n').map((line) => line.trim()),
    ...[...text.matchAll(/\{/g)].map((match) => text.slice(match.index)),
  ].sort((left, right) => right.length - left.length);
  for (const span of spans) {
    const parsed = attempt(span);
    if (parsed) return parsed;
  }
  return null;
}

// ── The side-effecting shell ─────────────────────────────────────────────────────────────────────

function currentBranch(cwd) {
  const run = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' });
  const name = String(run.stdout ?? '').trim();
  return run.status === 0 && name ? name : null;
}

export function appendLedger(record, target) {
  mkdirSync(path.dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(record)}\n`, 'utf8');
}

const USAGE = `Usage: npm run agy -- --model <id> [options] "<prompt>"

Calls Google's Antigravity CLI and records what it cost, because agy keeps no cumulative usage
anywhere on disk. Read the ledger back with: npm run harness:usage

  --model <id>          REQUIRED. agy's result never names the model that answered, so a call
                        that does not pin one can never be attributed. See \`agy models\`.
  --effort <level>      low | medium | high
  --label <text>        a note stored on the ledger line, e.g. what the call was for
  --cwd <dir>           working directory for the call (default: this process's)
  --print-timeout <d>   passed through to agy (its default is 5m)
  --prompt <text>       the prompt, if you would rather not use a positional argument
  --prompt-file <path>  read the prompt from a file

Ledger: ~/.noacg/agy-usage.jsonl (override with NOACG_AGY_LEDGER).`;

export function main(argv = process.argv.slice(2), { env = process.env, home = homedir() } = {}) {
  let args;
  try {
    args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (args.promptFile) {
      if (args.prompt) throw new Error('the prompt was given twice');
      args.prompt = readFileSync(args.promptFile, 'utf8');
    }
    if (!args.prompt || !args.prompt.trim()) throw new Error('no prompt. Give one as an argument or with --prompt-file.');
    // The prompt travels as one argv value, and Windows caps a whole command line near 32 KB. Past
    // that, spawn fails with an opaque error - so it is refused here with a readable one instead.
    if (args.prompt.length > MAX_PROMPT_CHARS) {
      throw new Error(
        `the prompt is ${args.prompt.length} characters. It is passed to agy as a single command-line `
        + `argument, which the operating system caps near ${MAX_PROMPT_CHARS}. Shorten it, or point `
        + 'the prompt at files for agy to read instead of pasting them in.',
      );
    }
    if (!args.model) {
      throw new Error(
        'a pinned --model is required. agy\'s JSON result does not say which model answered, so '
        + 'an unpinned call lands in the ledger as a cost nobody can attribute.',
      );
    }
  } catch (error) {
    process.stderr.write(`agy-run: ${error.message}\n\n${USAGE}\n`);
    return 2;
  }

  const binary = resolveAgy({ env });
  if (!binary) {
    process.stderr.write(
      'agy-run: no agy executable found on PATH. Install Antigravity CLI, or point AGY_BIN at it.\n',
    );
    return 2;
  }
  if (/\.(cmd|bat)$/i.test(binary)) {
    process.stderr.write(
      `agy-run: ${binary} is a launcher, not the executable. Running it needs a shell, and a shell\n`
      + '         re-splits the prompt on spaces. Point AGY_BIN at the real agy.exe.\n',
    );
    return 2;
  }

  const cwd = args.cwd ? path.resolve(args.cwd) : process.cwd();
  const startedAt = Date.now();
  const run = spawnSync(binary, buildAgyArgs(args), {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;

  const result = parseAgyStdout(run.stdout);
  const verdict = run.error
    ? { ok: false, failure: `agy could not be run: ${run.error.message}` }
    : classifyResult(result, {
      elapsedSeconds: durationMs / 1000,
      timeoutSeconds: parseDuration(args.printTimeout, DEFAULT_PRINT_TIMEOUT_SECONDS),
    });

  const record = ledgerRecord({
    args,
    result,
    verdict,
    at: startedAt,
    cwd,
    branch: currentBranch(cwd),
    exitCode: run.status ?? null,
    durationMs,
  });
  const target = ledgerPath({ env, home });
  try {
    appendLedger(record, target);
  } catch (error) {
    // A ledger that cannot be written must not swallow an answer that was already paid for.
    process.stderr.write(`agy-run: could not append to ${target}: ${error.message}\n`);
  }

  if (verdict.ok) {
    process.stdout.write(`${result.response.replace(/\n?$/, '\n')}`);
    // A success carrying no recognisable usage would go onto the ledger as four zeros, and the
    // meter would then report the harness as free - which is indistinguishable from a genuinely
    // cheap window. If agy ever renames these fields, this line is what says so.
    if (!result.usage || typeof result.usage !== 'object') {
      process.stderr.write(
        '\nagy-run: WARNING - the result carried no `usage` object, so this call is on the ledger '
        + 'as zero tokens.\n         It was not free. agy may have changed its result shape; check '
        + 'scripts/agy-run.mjs against it.\n',
      );
    }
    process.stderr.write(
      `\nagy ${args.model}: ${record.turns ?? '?'} turn(s), ${record.durationSeconds}s, `
      + `in ${record.usage.input} / out ${record.usage.output} / thinking ${record.usage.thinking} `
      + `/ cache read ${record.usage.cacheRead} tokens. Recorded in ${target}\n`,
    );
    return 0;
  }

  if (run.stderr) process.stderr.write(String(run.stderr));
  process.stderr.write(`agy-run: ${verdict.failure}\n`);
  process.stderr.write(`agy-run: the attempt is still on the ledger - it cost tokens either way (${target}).\n`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
