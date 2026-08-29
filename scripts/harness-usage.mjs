#!/usr/bin/env node
// THE HARNESS USAGE METER - what each AI harness actually cost over a window.
//
//   node scripts/harness-usage.mjs                    # the last 24 hours
//   node scripts/harness-usage.mjs --hours 5          # the last 5 hours
//   node scripts/harness-usage.mjs --since 2026-08-29T12:00:00Z
//   node scripts/harness-usage.mjs --wave             # since the newest wave plan was written
//   node scripts/harness-usage.mjs --json             # the same numbers, machine-readable
//
// WHY THIS EXISTS. The owner pays for a Codex subscription and cannot tell whether it is being
// used at all. "Am I paying for nothing" is a question about EVIDENCE, and both harnesses already
// write the evidence to disk and nobody reads it. Every future routing decision - which harness
// gets which work - needs numbers rather than impressions, and the first delegation trial
// (2026-08-29) shows why: it FELT like Codex was working for ten minutes, and it had in fact
// written nothing.
//
// WHAT IT READS. Two transcript trees, both local, both append-only, neither of them an API:
//
//   ~/.codex/sessions/<yyyy>/<mm>/<dd>/rollout-*.jsonl   and  ~/.codex/archived_sessions/*.jsonl
//     `token_count` events carrying `info.total_token_usage` (CUMULATIVE for the session) and a
//     `rate_limits` snapshot: `primary` is the 5-hour window, `secondary` the weekly one.
//     BOTH TREES MATTER - Codex moves a session to archived_sessions when it is done with it, so
//     reading only `sessions/` silently loses the finished work, which is most of it.
//
//   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
//     assistant records carrying `message.usage` - input_tokens, cache_creation_input_tokens,
//     cache_read_input_tokens, output_tokens. One directory per cwd, so a wave that ran in six
//     worktrees is spread over six directories; and each agent a session LAUNCHES writes its own
//     file under `<that directory>/<session-id>/subagents/`, which is a second place to look.
//
// FOUR THINGS THAT MAKE A NAIVE READER WRONG.
//
//   1. CLAUDE CODE WRITES THE SAME ASSISTANT RECORD MORE THAN ONCE. A single request can appear
//      two or three times in one file, byte-identical usage and all, and a resumed session copies
//      earlier records forward into the new file. Summing records inflates the answer by roughly
//      2x. `dedupeClaudeRows` keys on `message.id` + `requestId` and counts each request once,
//      ACROSS files, which is why the dedupe happens after every file is read and not inside one.
//
//   2. CODEX'S PER-TURN FIELD DOES NOT SUM TO ITS OWN TOTAL. `last_token_usage` is emitted more
//      often than the cumulative counter advances: over the 88 rollouts on this machine, summing
//      it disagreed with the session's final `total_token_usage` in 46 of them, by up to 30%. So
//      the meter never adds `last_token_usage`. It walks `total_token_usage` - verified monotonic
//      across all 88 - and takes DELTAS, which also gives windowing for free: a session that
//      started before the window contributes only the part that happened inside it.
//
//   3. A PERCENTAGE IS A SNAPSHOT, NOT A RATE. `primary.used_percent` says how full the 5-hour
//      window was at that instant. Two sessions' percentages never add, and a percentage from
//      four hours ago says nothing about now. The meter therefore reports exactly ONE percentage
//      pair - the newest snapshot it found - and stamps it with the time it was taken.
//
//   4. `sessionId` DOES NOT IDENTIFY A SESSION. Every agent a wave launches inherits the parent's
//      `sessionId` and the parent's `gitBranch`, so counting those reports six agents working in
//      six worktrees as one session on one branch. The TRANSCRIPT FILE is the session, and the
//      cwd the file's first record names is the worktree. That also means the branch table shows
//      the LAUNCHING session's branch for such work, which the report says out loud.
//
// WHAT IT CANNOT KNOW. Claude Code's own 5-hour window percentage is not in the transcripts.
// There is no rate-limit event in `~/.claude/projects/**`, so this script cannot report it and
// does not estimate it: token totals are not a percentage of an undisclosed allowance. The Codex
// percentages come from Codex's own `rate_limits` payload, which is why only Codex has them.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/** Token kinds are reported per harness, because the two harnesses do not slice input the same way. */
export const CODEX_KINDS = ['input', 'cachedInput', 'cacheWrite', 'output', 'reasoning', 'total'];
export const CLAUDE_KINDS = ['input', 'cacheWrite', 'cacheRead', 'output', 'total'];

const HOUR_MS = 3_600_000;

// ── Pure decisions ───────────────────────────────────────────────────────────────────────────────

/** Argument parsing, separated from the filesystem so the window logic is testable on its own. */
export function parseArgs(argv) {
  const args = { json: false, wave: false, since: null, until: null, hours: null, top: 12 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[index += 1];
    if (token === '--json') args.json = true;
    else if (token === '--wave') args.wave = true;
    else if (token === '--since') args.since = next();
    else if (token === '--until') args.until = next();
    else if (token === '--hours') args.hours = Number(next());
    else if (token === '--top') args.top = Number(next());
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

/**
 * The window, and the sentence that explains it. `--since` wins, then `--wave`, then `--hours`,
 * and with none of them it is the last 24 hours - because the question "what did today cost" is
 * the one asked most often and should need no flags.
 */
export function resolveWindow(args, { now, wavePlan } = {}) {
  const until = args.until ? Date.parse(args.until) : now;
  if (!Number.isFinite(until)) throw new Error(`--until is not a date: ${args.until}`);

  if (args.since) {
    const since = Date.parse(args.since);
    if (!Number.isFinite(since)) throw new Error(`--since is not a date: ${args.since}`);
    return { since, until, label: `since ${new Date(since).toISOString()}` };
  }
  if (args.wave) {
    if (!wavePlan) {
      throw new Error(
        'no docs/handoffs/*wave-plan*.local.md found, so --wave has no start time. '
        + 'Use --since <iso> or --hours <n>.',
      );
    }
    return {
      since: wavePlan.mtimeMs,
      until,
      label: `since the wave plan ${wavePlan.name} was last written (${new Date(wavePlan.mtimeMs).toISOString()})`,
    };
  }
  const hours = args.hours ?? 24;
  if (!Number.isFinite(hours) || hours <= 0) throw new Error(`--hours must be a positive number: ${args.hours}`);
  return { since: until - hours * HOUR_MS, until, label: `the last ${hours} hour${hours === 1 ? '' : 's'}` };
}

/**
 * JSONL, forgiving. A transcript is written by a live process, so the last line of an open file is
 * routinely half-written; a meter that threw on it would be unusable exactly when it is wanted.
 * Malformed lines are counted and reported rather than swallowed, so a parser that has drifted
 * out of date announces itself instead of quietly reporting less.
 */
export function parseJsonl(text) {
  const records = [];
  let malformed = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed);
      if (value && typeof value === 'object') records.push(value);
      else malformed += 1;
    } catch {
      malformed += 1;
    }
  }
  return { records, malformed };
}

const zeroTokens = (kinds) => Object.fromEntries(kinds.map((kind) => [kind, 0]));

export function addTokens(left, right, kinds) {
  const out = {};
  for (const kind of kinds) out[kind] = (left[kind] ?? 0) + (right[kind] ?? 0);
  return out;
}

/**
 * A delta on a cumulative counter, resilient to a reset. No reset has ever been observed in the
 * 88 rollouts on this machine, but a counter that restarts and is read as a huge negative would
 * silently zero a whole day, so a decrease is treated as "the counter restarted" and the new
 * reading is taken whole.
 */
export function deltaTokens(current, previous, kinds) {
  const reset = kinds.some((kind) => (current[kind] ?? 0) < (previous[kind] ?? 0));
  const out = {};
  for (const kind of kinds) out[kind] = reset ? (current[kind] ?? 0) : (current[kind] ?? 0) - (previous[kind] ?? 0);
  return out;
}

/** One Codex rollout file, reduced to what the meter needs: ordered snapshots and the session's identity. */
export function readCodexSession(text, { file = '' } = {}) {
  const { records, malformed } = parseJsonl(text);
  const session = {
    file,
    sessionId: path.basename(file, '.jsonl') || 'unknown',
    cwd: null,
    originator: null,
    model: null,
    snapshots: [],
    malformed,
  };
  for (const record of records) {
    const payload = record?.payload;
    if (record?.type === 'session_meta' && payload) {
      session.sessionId = payload.session_id ?? payload.id ?? session.sessionId;
      session.cwd = payload.cwd ?? session.cwd;
      session.originator = payload.originator ?? session.originator;
      session.model = payload.model ?? session.model;
      continue;
    }
    if (payload?.type !== 'token_count') continue;
    // A token_count with no `info` is a rate-limit-only heartbeat; it still carries a usable
    // rate_limits payload, so it is kept as a snapshot with no token movement.
    const totals = payload.info?.total_token_usage;
    const at = Date.parse(record?.timestamp ?? '');
    if (!Number.isFinite(at)) continue;
    session.snapshots.push({
      at,
      totals: totals
        ? {
          input: totals.input_tokens ?? 0,
          cachedInput: totals.cached_input_tokens ?? 0,
          cacheWrite: totals.cache_write_input_tokens ?? 0,
          output: totals.output_tokens ?? 0,
          reasoning: totals.reasoning_output_tokens ?? 0,
          total: totals.total_tokens ?? 0,
        }
        : null,
      rateLimits: payload.rate_limits ?? null,
    });
  }
  session.snapshots.sort((left, right) => left.at - right.at);
  return session;
}

/**
 * What this session cost INSIDE the window. Walks the cumulative counter and keeps only the
 * deltas whose reading landed in the window, so a session straddling the boundary contributes
 * exactly its inside part rather than all or nothing.
 */
export function codexWindowUsage(session, window) {
  let previous = zeroTokens(CODEX_KINDS);
  let tokens = zeroTokens(CODEX_KINDS);
  let turns = 0;
  let firstAt = null;
  let lastAt = null;
  for (const snapshot of session.snapshots) {
    if (!snapshot.totals) continue;
    const delta = deltaTokens(snapshot.totals, previous, CODEX_KINDS);
    previous = snapshot.totals;
    if (snapshot.at < window.since || snapshot.at > window.until) continue;
    if (delta.total <= 0) continue;
    tokens = addTokens(tokens, delta, CODEX_KINDS);
    turns += 1;
    if (firstAt === null) firstAt = snapshot.at;
    lastAt = snapshot.at;
  }
  return { tokens, turns, firstAt, lastAt };
}

/**
 * One entry per session id. Archiving a rollout is a MOVE, so a copy in both trees should not
 * happen - but if it ever does, the same tokens would be counted twice with nothing to say so.
 * The richer file wins, since a partial copy is the one that would be left behind.
 */
export function dedupeCodexSessions(sessions) {
  const best = new Map();
  for (const session of sessions) {
    const seen = best.get(session.sessionId);
    if (!seen || session.snapshots.length > seen.snapshots.length) best.set(session.sessionId, session);
  }
  return [...best.values()];
}

/**
 * The newest rate-limit snapshot in the window, across every session. ONE snapshot, never a sum:
 * `used_percent` describes a rolling window shared by every session, so the latest reading is the
 * only one that is still true.
 */
export function latestRateLimits(sessions, window) {
  let best = null;
  for (const session of sessions) {
    for (const snapshot of session.snapshots) {
      if (!snapshot.rateLimits) continue;
      if (snapshot.at < window.since || snapshot.at > window.until) continue;
      if (!best || snapshot.at > best.at) best = { at: snapshot.at, sessionId: session.sessionId, limits: snapshot.rateLimits };
    }
  }
  return best;
}

/** One Claude Code transcript, reduced to billable rows. Dedupe happens later, across all files. */
export function readClaudeRows(text, { file = '' } = {}) {
  const { records, malformed } = parseJsonl(text);
  const rows = [];
  for (const record of records) {
    const usage = record?.message?.usage;
    if (!usage || typeof usage !== 'object') continue;
    const at = Date.parse(record?.timestamp ?? '');
    if (!Number.isFinite(at)) continue;
    const messageId = record.message?.id ?? null;
    const requestId = record.requestId ?? null;
    rows.push({
      at,
      // A record with neither id is unmergeable with anything, so it gets a key of its own rather
      // than colliding with every other id-less record and being counted once for all of them.
      key: messageId || requestId ? `${messageId ?? ''}|${requestId ?? ''}` : `${file}#${rows.length}`,
      // THE TRANSCRIPT FILE IS THE SESSION, not `record.sessionId`. Every agent a wave launches
      // writes its own file under `<parent>/<parent-session-id>/subagents/`, and every one of
      // those records carries the PARENT'S sessionId - so counting sessionIds reports a wave of
      // six agents as one session. `sessionId` is kept for reference and never counted.
      session: file,
      sessionId: record.sessionId ?? path.basename(file, '.jsonl'),
      // The momentary cwd. `attributeProjects` replaces it with the one the session STARTED in,
      // because a session that cds would otherwise be split across a row per subdirectory.
      project: record.cwd ?? path.basename(path.dirname(file)),
      branch: record.gitBranch || '(no branch)',
      model: record.message?.model ?? 'unknown',
      sidechain: record.isSidechain === true,
      tokens: {
        input: usage.input_tokens ?? 0,
        cacheWrite: usage.cache_creation_input_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        total: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)
          + (usage.cache_read_input_tokens ?? 0) + (usage.output_tokens ?? 0),
      },
    });
  }
  return { rows, malformed };
}

/** One row per request. Keeps the earliest sighting, which is the one in the session that made it. */
export function dedupeClaudeRows(rows) {
  const seen = new Map();
  for (const row of [...rows].sort((left, right) => left.at - right.at)) {
    if (!seen.has(row.key)) seen.set(row.key, row);
  }
  return [...seen.values()];
}

/**
 * Give every row of a session the cwd that session STARTED in. Without this, one session that
 * changed directory reports as several projects, each with a fraction of its cost - which reads
 * exactly like several small sessions and is the kind of wrong that never announces itself.
 */
export function attributeProjects(rows) {
  const firstCwd = new Map();
  for (const row of [...rows].sort((left, right) => left.at - right.at)) {
    if (!firstCwd.has(row.session)) firstCwd.set(row.session, row.project);
  }
  return rows.map((row) => ({ ...row, project: firstCwd.get(row.session) ?? row.project }));
}

export function inWindow(rows, window) {
  return rows.filter((row) => row.at >= window.since && row.at <= window.until);
}

/**
 * Group rows into { key, requests, sessions, tokens } buckets, biggest first. Sessions are counted
 * by TRANSCRIPT FILE, which is the only thing that is one per session - see readClaudeRows.
 */
export function groupRows(rows, keyOf, kinds) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, requests: 0, sessions: new Set(), tokens: zeroTokens(kinds) };
      buckets.set(key, bucket);
    }
    bucket.requests += 1;
    bucket.sessions.add(row.session);
    bucket.tokens = addTokens(bucket.tokens, row.tokens, kinds);
  }
  return [...buckets.values()].sort((left, right) => right.tokens.total - left.tokens.total);
}

// ── Formatting ───────────────────────────────────────────────────────────────────────────────────

export function formatCount(value) {
  if (!Number.isFinite(value)) return '-';
  const digits = String(Math.round(Math.abs(value)));
  let out = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) out += ',';
    out += digits[index];
  }
  return (value < 0 ? '-' : '') + out;
}

/** "2h 14m", for a reset time. Deliberately coarse - a rate-limit window is not a stopwatch. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '-';
  const past = ms < 0;
  const minutes = Math.round(Math.abs(ms) / 60_000);
  const text = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  return past ? `${text} ago` : `in ${text}`;
}

export function formatTable(headers, rows, { align = [] } = {}) {
  if (!rows.length) return '  (nothing)';
  const cells = [headers, ...rows].map((row) => row.map((cell) => String(cell ?? '')));
  const widths = headers.map((_, column) => Math.max(...cells.map((row) => row[column].length)));
  const line = (row) => row
    .map((cell, column) => (align[column] === 'right' ? cell.padStart(widths[column]) : cell.padEnd(widths[column])))
    .join('  ')
    .trimEnd();
  return [
    `  ${line(cells[0])}`,
    `  ${widths.map((width) => '-'.repeat(width)).join('  ')}`,
    ...cells.slice(1).map((row) => `  ${line(row)}`),
  ].join('\n');
}

/** Long rows past `top` collapse into one honest "N more" row rather than being dropped. */
export function collapse(buckets, top, kinds) {
  if (buckets.length <= top) return { shown: buckets, rest: null };
  const rest = buckets.slice(top).reduce(
    (acc, bucket) => ({
      key: `(${buckets.length - top} more)`,
      requests: acc.requests + bucket.requests,
      sessions: new Set([...acc.sessions, ...bucket.sessions]),
      tokens: addTokens(acc.tokens, bucket.tokens, kinds),
    }),
    { key: '', requests: 0, sessions: new Set(), tokens: zeroTokens(kinds) },
  );
  return { shown: buckets.slice(0, top), rest };
}

const shortLabel = (value, max = 46) => (value.length <= max ? value : `...${value.slice(-(max - 3))}`);

// ── The filesystem side ──────────────────────────────────────────────────────────────────────────

function listJsonl(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listJsonl(full, out);
    else if (entry.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/** The newest wave plan, which is what `--wave` means by "this wave". */
export function findWavePlan(handoffDir, { readdir = readdirSync, stat = statSync, exists = existsSync } = {}) {
  if (!exists(handoffDir)) return null;
  let best = null;
  for (const name of readdir(handoffDir)) {
    if (!/wave-plan.*\.local\.md$/.test(name)) continue;
    const info = stat(path.join(handoffDir, name));
    if (!best || info.mtimeMs > best.mtimeMs) best = { name, mtimeMs: info.mtimeMs };
  }
  return best;
}

function collectCodex(home, window) {
  const roots = [path.join(home, '.codex', 'sessions'), path.join(home, '.codex', 'archived_sessions')];
  const present = roots.filter((root) => existsSync(root));
  const files = roots.flatMap((root) => listJsonl(root));
  const sessions = [];
  let malformed = 0;
  for (const file of files) {
    // A rollout whose file has not been touched since before the window cannot contain a snapshot
    // inside it. Skipping those keeps a full read of 88 files down to the handful that matter.
    if (statSync(file).mtimeMs < window.since) continue;
    const session = readCodexSession(readFileSync(file, 'utf8'), { file });
    malformed += session.malformed;
    sessions.push(session);
  }
  return { sessions: dedupeCodexSessions(sessions), files: files.length, malformed, roots: present };
}

function collectClaude(home, window) {
  const root = path.join(home, '.claude', 'projects');
  const files = listJsonl(root);
  const rows = [];
  let malformed = 0;
  for (const file of files) {
    if (statSync(file).mtimeMs < window.since) continue;
    const read = readClaudeRows(readFileSync(file, 'utf8'), { file });
    malformed += read.malformed;
    rows.push(...read.rows);
  }
  return { rows: attributeProjects(dedupeClaudeRows(rows)), files: files.length, malformed, root: existsSync(root) ? root : null };
}

// ── Reporting ────────────────────────────────────────────────────────────────────────────────────

function codexReport(collected, window, top) {
  const lines = [];
  const rows = [];
  for (const session of collected.sessions) {
    const usage = codexWindowUsage(session, window);
    if (usage.turns === 0) continue;
    rows.push({ session, usage });
  }
  rows.sort((left, right) => right.usage.tokens.total - left.usage.tokens.total);

  const totals = rows.reduce((acc, row) => addTokens(acc, row.usage.tokens, CODEX_KINDS), zeroTokens(CODEX_KINDS));
  const turns = rows.reduce((acc, row) => acc + row.usage.turns, 0);

  lines.push('CODEX');
  if (!collected.roots.length) {
    lines.push('  no ~/.codex/sessions or ~/.codex/archived_sessions on this machine - nothing to read.');
    return { lines, totals, sessions: 0, turns, rate: null };
  }
  if (!rows.length) {
    lines.push(`  0 sessions, 0 tokens. Codex did no work in this window (${collected.files} rollouts on disk).`);
  } else {
    lines.push(`  ${rows.length} session${rows.length === 1 ? '' : 's'}, ${turns} turns, ${formatCount(totals.total)} tokens.`);
    lines.push('');
    const shown = rows.slice(0, top);
    lines.push(formatTable(
      ['session', 'where', 'turns', 'input', 'cached', 'output', 'reasoning', 'total'],
      shown.map(({ session, usage }) => [
        // 13 characters, not 8: these are UUIDv7s, so the leading bytes are the timestamp and
        // sessions started in the same minute share their first 8 characters exactly.
        session.sessionId.slice(0, 13),
        shortLabel(session.cwd ? path.basename(session.cwd) : '(unknown cwd)', 28),
        formatCount(usage.turns),
        formatCount(usage.tokens.input),
        formatCount(usage.tokens.cachedInput),
        formatCount(usage.tokens.output),
        formatCount(usage.tokens.reasoning),
        formatCount(usage.tokens.total),
      ]),
      { align: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'] },
    ));
    if (rows.length > top) lines.push(`  (${rows.length - top} more sessions not shown)`);
    lines.push('');
    lines.push('  cached is the share of input that was a cache hit. total = input + output.');
  }

  const rate = latestRateLimits(collected.sessions, window);
  lines.push('');
  if (!rate) {
    lines.push('  Rate limits: no snapshot in this window. The percentages below are only written');
    lines.push('  while Codex is running, so a quiet window has none - that is not 0% used.');
  } else {
    const { limits } = rate;
    const stamp = new Date(rate.at).toISOString();
    lines.push(`  Rate limits, as of ${stamp} (plan: ${limits.plan_type ?? 'unknown'}) - a SNAPSHOT, not a sum:`);
    for (const [name, label] of [['primary', '5-hour window'], ['secondary', 'weekly window']]) {
      const entry = limits[name];
      if (!entry) {
        lines.push(`    ${label.padEnd(14)} not reported`);
        continue;
      }
      const minutes = entry.window_minutes ? `${entry.window_minutes} min` : 'unknown length';
      const resetsAt = Number.isFinite(entry.resets_at) ? new Date(entry.resets_at * 1000) : null;
      const reset = resetsAt
        ? `resets ${resetsAt.toISOString()} (${formatDuration(resetsAt.getTime() - window.until)})`
        : 'reset time not reported';
      lines.push(`    ${label.padEnd(14)} ${String(entry.used_percent ?? '?').padStart(5)}% used  [${minutes}]  ${reset}`);
    }
  }
  return { lines, totals, sessions: rows.length, turns, rate };
}

function claudeReport(collected, window, top) {
  const lines = ['CLAUDE CODE'];
  if (!collected.root) {
    lines.push('  no ~/.claude/projects on this machine - nothing to read.');
    return { lines, totals: zeroTokens(CLAUDE_KINDS), rows: [] };
  }
  const rows = inWindow(collected.rows, window);
  const totals = rows.reduce((acc, row) => addTokens(acc, row.tokens, CLAUDE_KINDS), zeroTokens(CLAUDE_KINDS));
  const sessions = new Set(rows.map((row) => row.session)).size;
  const sidechain = rows.filter((row) => row.sidechain).length;

  if (!rows.length) {
    lines.push('  0 sessions, 0 tokens in this window.');
    return { lines, totals, rows };
  }
  lines.push(
    `  ${sessions} session${sessions === 1 ? '' : 's'}, ${rows.length} requests `
    + `(${sidechain} from subagents), ${formatCount(totals.total)} tokens.`,
  );

  const groupings = [['by branch', (row) => row.branch], ['by project', (row) => row.project]];
  for (const [title, keyOf] of groupings) {
    const { shown, rest } = collapse(groupRows(rows, keyOf, CLAUDE_KINDS), top, CLAUDE_KINDS);
    const body = [...shown, ...(rest ? [rest] : [])];
    lines.push('');
    lines.push(`  ${title}`);
    lines.push(formatTable(
      [title.replace('by ', ''), 'sessions', 'reqs', 'input', 'cache write', 'cache read', 'output', 'total'],
      body.map((bucket) => [
        shortLabel(bucket.key),
        formatCount(bucket.sessions.size),
        formatCount(bucket.requests),
        formatCount(bucket.tokens.input),
        formatCount(bucket.tokens.cacheWrite),
        formatCount(bucket.tokens.cacheRead),
        formatCount(bucket.tokens.output),
        formatCount(bucket.tokens.total),
      ]),
      { align: ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'] },
    ));
  }

  const models = groupRows(rows, (row) => row.model, CLAUDE_KINDS);
  lines.push('');
  lines.push('  by model');
  lines.push(formatTable(
    ['model', 'reqs', 'input', 'cache write', 'cache read', 'output', 'total'],
    models.map((bucket) => [
      bucket.key,
      formatCount(bucket.requests),
      formatCount(bucket.tokens.input),
      formatCount(bucket.tokens.cacheWrite),
      formatCount(bucket.tokens.cacheRead),
      formatCount(bucket.tokens.output),
      formatCount(bucket.tokens.total),
    ]),
    { align: ['left', 'right', 'right', 'right', 'right', 'right', 'right'] },
  ));
  lines.push('');
  lines.push('  "branch" is whatever each request recorded, which for a session launched into a');
  lines.push('  worktree is the LAUNCHING session\'s branch - read the project table for which');
  lines.push('  checkout the work actually happened in.');
  lines.push('');
  lines.push('  No 5-hour window percentage exists for Claude Code: the transcripts carry usage,');
  lines.push('  not rate limits. Tokens are not a percentage of an undisclosed allowance, so this');
  lines.push('  meter reports the tokens and refuses to guess the rest.');
  return { lines, totals, rows };
}

const USAGE = `Usage: node scripts/harness-usage.mjs [--since <iso> | --hours <n> | --wave] [--until <iso>] [--top <n>] [--json]

Prints what each AI harness cost over a window: Claude Code and Codex, from their own local
transcripts. With no flags, the last 24 hours.`;

export function main(argv = process.argv.slice(2), { home = homedir(), now = Date.now() } = {}) {
  let args;
  let window;
  try {
    args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    window = resolveWindow(args, { now, wavePlan: findWavePlan(path.join(REPO_ROOT, 'docs', 'handoffs')) });
  } catch (error) {
    process.stderr.write(`harness-usage: ${error.message}\n\n${USAGE}\n`);
    return 2;
  }

  const codex = collectCodex(home, window);
  const claude = collectClaude(home, window);
  const codexOut = codexReport(codex, window, args.top);
  const claudeOut = claudeReport(claude, window, args.top);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      window: { since: new Date(window.since).toISOString(), until: new Date(window.until).toISOString(), label: window.label },
      codex: {
        sessions: codexOut.sessions,
        turns: codexOut.turns,
        tokens: codexOut.totals,
        rateLimits: codexOut.rate
          ? { at: new Date(codexOut.rate.at).toISOString(), ...codexOut.rate.limits }
          : null,
      },
      claudeCode: {
        sessions: new Set(claudeOut.rows.map((row) => row.session)).size,
        requests: claudeOut.rows.length,
        tokens: claudeOut.totals,
        rateLimits: null,
      },
      malformedLines: { codex: codex.malformed, claudeCode: claude.malformed },
    }, null, 2)}\n`);
    return 0;
  }

  const out = [
    `Harness usage - ${window.label}`,
    `${new Date(window.since).toISOString()}  ..  ${new Date(window.until).toISOString()}`,
    '',
    ...claudeOut.lines,
    '',
    ...codexOut.lines,
  ];
  if (codex.malformed || claude.malformed) {
    out.push('', `  Skipped unreadable lines: ${claude.malformed} in Claude Code, ${codex.malformed} in Codex.`);
  }
  process.stdout.write(`${out.join('\n')}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
