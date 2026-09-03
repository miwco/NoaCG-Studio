#!/usr/bin/env node
// THE ONE WAY THIS REPO CALLS `agy` (Google's Antigravity CLI), and the only place its spend is
// ever recorded.
//
//   npm run agy:read -- --model gemini-3.7-flash-high --label export-target-map "name every export target and its id"
//   npm run agy:read -- --model gemini-3.7-flash-high --prompt-file notes/question.txt --label trial-c
//   npm run agy      -- --model claude-sonnet-4-6 --label pool-b-trial --write --prompt-file spec.txt
//
// `gemini-3.7-flash-high` is the DEFAULT MODEL the owner ruled for on 2026-08-30 (3/3 correct and
// 3.3x faster than gemini-3.1-pro-high on the same question - docs/HARNESS_ROUTING.md). It cannot
// be a real default here because `--model` is required for attribution, see below; pass it.
// Every path in the PROMPT must be absolute, or the run reads an unknown checkout.
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
// THREE REFUSALS, all deliberate:
//
//   1. `--model` is REQUIRED. The agy result object does not name the model that answered, so a
//      call that did not pin one can never be attributed afterwards. The ledger would carry a
//      number with no idea what produced it.
//   2. `--label` is REQUIRED (2026-09-01). The one call ever made on the ruled default model
//      recorded `label: null` - spend nobody can connect to the work it paid for, which defeats
//      the outcome routing the ledger exists to feed (docs/ORCHESTRATION_NEXT.md §6).
//   3. `--dangerously-skip-permissions` is REJECTED, not forwarded. It is in agy's help output;
//      it is a capability, not an instruction.
//
// AND ONE POSTURE (2026-09-01): the call runs `--mode plan` - agy's read-only planning mode -
// unless `--write` is passed, which omits the mode flag and restores exactly the measured write
// path (grants in ~/.gemini/antigravity-cli/settings.json still scope WHERE it may write). The
// machine-global write grants mean a bare call could otherwise edit a worktree nobody asked it
// to; this is the same shape as /rescue, where a run is read-only unless the request says
// otherwise.
//
// AND THE WRITE SCOPE (2026-09-03, owner: Antigravity may be a real implementation worker, and
// its writes must be scoped to the assigned worktree and go through the same review, gate and
// serialized landing as Claude and Codex work). What that is worth saying plainly: agy's own
// permission grants are MACHINE-GLOBAL, so nothing in this wrapper is a sandbox. What it does
// instead is refuse the runs whose blast radius is shared, and make what a write actually did
// visible to the session that has to review it:
//
//   - a write must run in a LINKED WORKTREE. The primary checkout is the landing queue's tree -
//     it is checked out, merged, built and reset during every integration, so a delegate writing
//     there can lose work that is not its own (root AGENTS.md, "Git");
//   - a write must run on a BRANCH that is not `main`, and never on a detached HEAD. That is the
//     whole of "it lands the same way everything else does": whatever it writes sits on a feature
//     branch some Claude row gates, reviews and queues, and reaches `main` through the queue;
//   - and every write run prints the files it changed, from a `git status` taken before and after.
//     A delegated diff nobody read is not reviewed work, and the reviewer needs the file list
//     before the ledger line is worth anything.
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
  const args = { model: null, effort: null, label: null, cwd: null, printTimeout: null, prompt: null, help: false, write: false, readOnly: false };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[index += 1];
    if (token === '--write') args.write = true;
    else if (token === '--read-only') args.readOnly = true;
    else if (token === '--model') args.model = next();
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

/**
 * Which Antigravity USAGE POOL a model bills (owner, 2026-09-01: the subscription carries two -
 * one for the Gemini models, one for the Claude/GPT models `agy models` also lists). The split
 * cannot be verified headlessly (neither pool publishes an allowance), so the ledger records it
 * per call and the evidence accrues either way. An unrecognised family is recorded as its own
 * pool rather than guessed into one of the two.
 */
export function poolForModel(model) {
  if (/^gemini/i.test(model ?? '')) return 'antigravity-gemini';
  if (/^(claude|gpt)/i.test(model ?? '')) return 'antigravity-claude-gpt';
  return 'antigravity-other';
}

/**
 * The argv handed to agy. `--output-format json` is not optional: it is the whole receipt.
 * `--mode plan` is the read-only default posture; `--write` omits the mode flag, which is the
 * exact configuration every measured write ran under - not `--mode accept-edits`, whose behaviour
 * has never been measured here.
 */
export function buildAgyArgs(args) {
  const out = ['-p', args.prompt, '--output-format', 'json', '--model', args.model];
  if (!args.write) out.push('--mode', 'plan');
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
    // Additive fields (2026-09-01): pool and write. Additive optional fields never bump the
    // version (root AGENTS.md rule 6) - a v1 reader that ignores them reads the line correctly.
    pool: poolForModel(args.model),
    write: args.write === true,
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

/**
 * May a WRITE run here? `null` to proceed, or the sentence that refuses it.
 *
 * Pure, so every refusal is pinned by a test rather than discovered by a delegate. `worktree` is
 * `'linked'`, `'primary'` or `null` (not a repository at all); `branch` is the checked-out branch
 * name, or null for a detached HEAD.
 */
export function writeScopeRefusal({ worktree, branch, cwd }) {
  if (worktree === null) {
    return `--write needs a git worktree of this repository, and ${cwd} is not inside one. A `
      + 'delegate that can write outside a checkout has no scope at all.';
  }
  if (worktree === 'primary') {
    return `--write refuses the primary checkout (${cwd}). That tree belongs to the landing queue, `
      + 'which checks out, merges, builds and resets it during every integration, so a write there '
      + 'can destroy work that is not this task\'s. Run the delegation from the row\'s own worktree '
      + 'and pass --cwd if you are calling from elsewhere.';
  }
  if (!branch) {
    return `--write refuses a detached HEAD (${cwd}). A delegated change has to land, and a commit `
      + 'nothing points at cannot be reviewed, gated or queued.';
  }
  if (branch === 'main') {
    return '--write refuses the branch `main`. Delegated work lands exactly the way every other '
      + 'change does: on a feature branch, through review and the gate, and onto main through the '
      + 'queue.';
  }
  return null;
}

/**
 * The paths a run touched, from two `git status --porcelain` readings. Any line the run added or
 * changed counts; a line that only disappeared did too, so both directions are reported.
 *
 * A null reading on either side means the question could not be asked, which is reported as such
 * rather than as "nothing changed" - the reviewer must never be told a delegate wrote nothing on
 * the strength of a failed git call.
 */
export function changedPaths(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string') return null;
  const parse = (text) => new Map(
    text.split('\n').map((line) => line.trimEnd()).filter(Boolean)
      .map((line) => [line.slice(3), line.slice(0, 2)]),
  );
  const start = parse(before);
  const end = parse(after);
  const changed = new Set();
  for (const [file, code] of end) if (start.get(file) !== code) changed.add(file);
  for (const file of start.keys()) if (!end.has(file)) changed.add(file);
  return [...changed].sort();
}

// ── The side-effecting shell ─────────────────────────────────────────────────────────────────────

/** `'linked'`, `'primary'`, or null when the directory is not inside a git repository. */
function worktreeKind(cwd) {
  const run = spawnSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' });
  if (run.status !== 0) return null;
  // A linked worktree's git dir is `<common>/worktrees/<name>`; the primary checkout's is `.git`.
  return /[\\/]worktrees[\\/]/.test(String(run.stdout ?? '').trim()) ? 'linked' : 'primary';
}

/** `git status --porcelain`, or null when git could not answer. Null never reads as "clean". */
function porcelain(cwd) {
  const run = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return run.status === 0 ? String(run.stdout ?? '') : null;
}

function currentBranch(cwd) {
  const run = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' });
  const name = String(run.stdout ?? '').trim();
  return run.status === 0 && name ? name : null;
}

export function appendLedger(record, target) {
  mkdirSync(path.dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(record)}\n`, 'utf8');
}

const USAGE = `Usage: npm run agy:read -- --model <id> --label <what-for> [options] "<prompt>"
       npm run agy      -- --model <id> --label <what-for> --write [options] "<prompt>"

Calls Google's Antigravity CLI and records what it cost, because agy keeps no cumulative usage
anywhere on disk. Read the ledger back with: npm run harness:usage

  --model <id>          REQUIRED. agy's result never names the model that answered, so a call
                        that does not pin one can never be attributed. See \`agy models\`.
  --label <text>        REQUIRED. What the call is for, stored on the ledger line - spend with
                        no label cannot feed outcome routing.
  --write               allow writes. Without it the call runs \`--mode plan\` (read-only). A write
                        run must be in a LINKED WORKTREE on a branch that is not main, and it
                        prints the files it changed so they can be reviewed before they land.
  --read-only           refuse --write outright. \`npm run agy:read\` passes this itself, which
                        is what makes that door safe to pre-approve.
  --effort <level>      low | medium | high
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
    // The armored read-only door: `npm run agy:read` passes --read-only itself, which makes the
    // whole command safe to allowlist - a trailing --write smuggled onto it is refused HERE, in
    // code, because no permission-pattern prefix can exclude a trailing argument
    // (docs/AGENT_WORKFLOWS.md "Permissions", the same reason `git push` stays prompted).
    if (args.readOnly && args.write) {
      throw new Error('this door is read-only: npm run agy:read refuses --write. A writing call is '
        + '`npm run agy -- --write ...`, which deliberately still asks for permission.');
    }
    if (!args.label || !args.label.trim()) {
      throw new Error(
        'a --label is required: one short phrase saying what this call is for. An unlabelled '
        + 'ledger line is spend nobody can connect to the work it paid for, which defeats the '
        + 'outcome routing the ledger feeds (docs/ORCHESTRATION_NEXT.md).',
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
  const branch = currentBranch(cwd);

  // The write scope, checked BEFORE anything is spent. A refusal here costs nothing; the same
  // refusal after the call would have paid for a diff nobody may keep.
  if (args.write) {
    const refusal = writeScopeRefusal({ worktree: worktreeKind(cwd), branch, cwd });
    if (refusal) {
      process.stderr.write(`agy-run: ${refusal}\n`);
      return 2;
    }
  }

  const before = args.write ? porcelain(cwd) : null;
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
    branch,
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

  // What the write actually did, reported whether the run succeeded or not: a run cut off at its
  // print timeout still leaves whatever it had written by then, and that is exactly the case a
  // reviewer would otherwise never be told about.
  if (args.write) {
    const changed = changedPaths(before, porcelain(cwd));
    if (changed === null) {
      process.stderr.write(
        '\nagy-run: git could not be read before or after the run, so the file list is UNKNOWN.\n'
        + `         Check ${cwd} by hand before reviewing anything this call claims.\n`,
      );
    } else if (changed.length === 0) {
      process.stderr.write('\nagy-run: the working tree is unchanged - this write run wrote nothing.\n');
    } else {
      process.stderr.write(
        `\nagy-run: ${changed.length} path(s) changed on ${branch}. Read every one before it lands:\n`
        + `${changed.map((file) => `           ${file}`).join('\n')}\n`,
      );
    }
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
