// The guard on the harness usage meter is these cases, not the prose in harness-usage.mjs.
//
// A usage meter fails SILENTLY: a number that is twice too big, or a window that quietly counts a
// whole session because part of it fell inside, reads exactly like a correct one. So the cases
// pinned here are the four ways the real transcripts are shaped to mislead a naive reader:
//
//   - Claude Code writes the same assistant record two or three times, in one file and again in a
//     resumed session's file, so the dedupe has to be global and keyed on the request;
//   - Codex's `last_token_usage` does not sum to its own `total_token_usage`, so the meter walks
//     cumulative deltas and a session straddling the window contributes only its inside part;
//   - a percentage is a snapshot shared by every session, so exactly one is ever reported;
//   - a live transcript's last line is routinely half-written, and a meter that throws on it is
//     useless at the moment it is wanted.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attributeProjects,
  CLAUDE_KINDS,
  CODEX_KINDS,
  codexWindowUsage,
  collapse,
  dedupeClaudeRows,
  dedupeCodexSessions,
  deltaTokens,
  findWavePlan,
  formatCount,
  formatDuration,
  formatTable,
  groupRows,
  inWindow,
  latestRateLimits,
  parseArgs,
  parseJsonl,
  readClaudeRows,
  readCodexSession,
  resolveWindow,
} from './harness-usage.mjs';
import {
  CLAUDE_TRANSCRIPT,
  CLAUDE_TRANSCRIPT_RESUMED,
  CODEX_ROLLOUT,
  CODEX_ROLLOUT_NO_RATE_LIMITS,
} from './harness-usage-fixtures.mjs';

const at = (iso) => Date.parse(iso);
const WHOLE_DAY = { since: at('2026-08-30T00:00:00Z'), until: at('2026-08-30T23:59:59Z') };

// ── Malformed input must never throw ─────────────────────────────────────────────────────────────

test('a half-written last line is skipped and counted, not thrown on', () => {
  const { records, malformed } = parseJsonl(CODEX_ROLLOUT);
  assert.equal(malformed, 1);
  assert.equal(records.length, 5);
});

test('blank lines are not malformed', () => {
  assert.deepEqual(parseJsonl('\n\n  \n'), { records: [], malformed: 0 });
});

test('a JSON scalar on its own line is malformed, not a record', () => {
  assert.equal(parseJsonl('7\n"text"\nnull').malformed, 3);
});

// ── Codex ────────────────────────────────────────────────────────────────────────────────────────

test('a Codex rollout yields its session identity and ordered snapshots', () => {
  const session = readCodexSession(CODEX_ROLLOUT, { file: 'rollout-x.jsonl' });
  assert.equal(session.sessionId, '01a04e5d-d6db-73c0-8c39-441a50539c50');
  assert.equal(session.cwd, 'C:\\claude\\NoaCG-Studio');
  assert.equal(session.malformed, 1);
  assert.equal(session.snapshots.length, 3);
  assert.deepEqual(session.snapshots.map((snap) => snap.totals?.total ?? null), [1050, null, 3120]);
});

test('a token_count with a null info is kept for its rate limits and moves no tokens', () => {
  const session = readCodexSession(CODEX_ROLLOUT);
  const heartbeat = session.snapshots[1];
  assert.equal(heartbeat.totals, null);
  assert.equal(heartbeat.rateLimits.primary.used_percent, 8);
  // The two real snapshots are 1050 then 3120 cumulative, so the whole session is 3120 - not
  // 1050 + 2070 + something for the heartbeat.
  assert.equal(codexWindowUsage(session, WHOLE_DAY).tokens.total, 3120);
});

test('cumulative deltas mean a session straddling the window contributes only its inside part', () => {
  const session = readCodexSession(CODEX_ROLLOUT);
  const usage = codexWindowUsage(session, { since: at('2026-08-30T11:30:00Z'), until: at('2026-08-30T23:00:00Z') });
  assert.equal(usage.turns, 1);
  assert.equal(usage.tokens.total, 2070);
  assert.equal(usage.tokens.input, 2000);
  assert.equal(usage.tokens.output, 70);
  assert.equal(usage.tokens.reasoning, 20);
});

test('a window with no snapshots in it reports zero, not the session total', () => {
  const usage = codexWindowUsage(readCodexSession(CODEX_ROLLOUT), { since: at('2026-08-31T00:00:00Z'), until: at('2026-08-31T23:00:00Z') });
  assert.equal(usage.turns, 0);
  assert.equal(usage.tokens.total, 0);
  assert.equal(usage.firstAt, null);
});

test('a session that never reached the model has no snapshots and no rate limits', () => {
  const session = readCodexSession(CODEX_ROLLOUT_NO_RATE_LIMITS, { file: 'rollout-y.jsonl' });
  assert.equal(session.snapshots.length, 0);
  assert.equal(codexWindowUsage(session, WHOLE_DAY).tokens.total, 0);
  assert.equal(latestRateLimits([session], WHOLE_DAY), null);
});

test('exactly one rate-limit snapshot is reported - the newest, never a sum', () => {
  const sessions = [readCodexSession(CODEX_ROLLOUT), readCodexSession(CODEX_ROLLOUT_NO_RATE_LIMITS)];
  const latest = latestRateLimits(sessions, WHOLE_DAY);
  assert.equal(new Date(latest.at).toISOString(), '2026-08-30T12:00:00.000Z');
  assert.equal(latest.limits.primary.used_percent, 11);
  assert.equal(latest.limits.secondary.used_percent, 40);
  assert.equal(latest.limits.plan_type, 'plus');
});

test('a rate-limit snapshot outside the window is not reported', () => {
  const window = { since: at('2026-08-30T10:30:00Z'), until: at('2026-08-30T11:30:00Z') };
  assert.equal(latestRateLimits([readCodexSession(CODEX_ROLLOUT)], window).limits.primary.used_percent, 8);
});

test('a decreasing cumulative counter is read as a restart, not as negative usage', () => {
  const delta = deltaTokens({ total: 40, input: 30, output: 10 }, { total: 900, input: 800, output: 100 }, ['total', 'input', 'output']);
  assert.deepEqual(delta, { total: 40, input: 30, output: 10 });
});

test('the same session id in both trees is counted once, richest file winning', () => {
  const thin = { sessionId: 'a', snapshots: [1] };
  const full = { sessionId: 'a', snapshots: [1, 2, 3] };
  assert.deepEqual(dedupeCodexSessions([thin, full, { sessionId: 'b', snapshots: [] }]).map((s) => s.snapshots.length), [3, 0]);
});

// ── Claude Code ──────────────────────────────────────────────────────────────────────────────────

test('a Claude transcript yields one row per usage record, duplicates included', () => {
  const { rows, malformed } = readClaudeRows(CLAUDE_TRANSCRIPT, { file: 's1.jsonl' });
  assert.equal(malformed, 1);
  // req_A three times, req_C, req_D. The user record and the assistant record with no usage are
  // not rows at all.
  assert.equal(rows.length, 5);
  assert.equal(rows.filter((row) => row.key === 'msg_A|req_A').length, 3);
});

test('deduping is what stops the answer being several times too big', () => {
  const { rows } = readClaudeRows(CLAUDE_TRANSCRIPT, { file: 's1.jsonl' });
  const raw = rows.reduce((sum, row) => sum + row.tokens.total, 0);
  const deduped = dedupeClaudeRows(rows);
  assert.equal(deduped.length, 3);
  // req_A is 1032 tokens written three times; req_C is 62 and req_D is 10.
  assert.equal(raw, 3168);
  assert.equal(deduped.reduce((sum, row) => sum + row.tokens.total, 0), 1104);
});

test('a request copied into a resumed session is deduped ACROSS files', () => {
  const first = readClaudeRows(CLAUDE_TRANSCRIPT, { file: 's1.jsonl' }).rows;
  const second = readClaudeRows(CLAUDE_TRANSCRIPT_RESUMED, { file: 's2.jsonl' }).rows;
  const deduped = dedupeClaudeRows([...first, ...second]);
  assert.equal(deduped.filter((row) => row.key === 'msg_A|req_A').length, 1);
  // Kept in the session that made it, which is the earlier sighting.
  assert.equal(deduped.find((row) => row.key === 'msg_A|req_A').sessionId, 's1');
  assert.equal(deduped.length, 4);
});

test('a record with neither message id nor requestId is never merged with another', () => {
  const text = [
    '{"type":"assistant","timestamp":"2026-08-30T10:00:00.000Z","message":{"usage":{"input_tokens":1,"output_tokens":1}}}',
    '{"type":"assistant","timestamp":"2026-08-30T10:00:01.000Z","message":{"usage":{"input_tokens":1,"output_tokens":1}}}',
  ].join('\n');
  const { rows } = readClaudeRows(text, { file: 'x.jsonl' });
  assert.equal(dedupeClaudeRows(rows).length, 2);
});

test('the four token kinds are read straight through and summed into a total', () => {
  const row = dedupeClaudeRows(readClaudeRows(CLAUDE_TRANSCRIPT).rows).find((entry) => entry.key === 'msg_A|req_A');
  assert.deepEqual(row.tokens, { input: 2, cacheWrite: 100, cacheRead: 900, output: 30, total: 1032 });
});

test('subagent records are counted, and marked as subagent work', () => {
  const rows = dedupeClaudeRows(readClaudeRows(CLAUDE_TRANSCRIPT).rows);
  assert.equal(rows.filter((row) => row.sidechain).length, 1);
  assert.equal(rows.find((row) => row.sidechain).model, 'claude-fable-5');
});

test('rows are windowed by their own timestamp', () => {
  const rows = dedupeClaudeRows(readClaudeRows(CLAUDE_TRANSCRIPT).rows);
  const kept = inWindow(rows, { since: at('2026-08-30T10:30:00Z'), until: at('2026-08-30T12:00:00Z') });
  assert.deepEqual(kept.map((row) => row.key), ['msg_C|req_C']);
});

test('a session that cds mid-run is ONE project row, under the cwd it started in', () => {
  const text = [
    '{"type":"assistant","requestId":"r1","timestamp":"2026-08-30T10:00:00.000Z","sessionId":"s","cwd":"C:\\\\wt","message":{"id":"m1","usage":{"input_tokens":1,"output_tokens":1}}}',
    '{"type":"assistant","requestId":"r2","timestamp":"2026-08-30T10:01:00.000Z","sessionId":"s","cwd":"C:\\\\wt\\\\docs","message":{"id":"m2","usage":{"input_tokens":1,"output_tokens":1}}}',
  ].join('\n');
  const rows = readClaudeRows(text, { file: 'C:\\projects\\encoded\\s.jsonl' }).rows;
  assert.equal(groupRows(rows, (row) => row.project, CLAUDE_KINDS).length, 2, 'unattributed rows split - this is the bug');
  const grouped = groupRows(attributeProjects(rows), (row) => row.project, CLAUDE_KINDS);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].key, 'C:\\wt');
  assert.equal(grouped[0].requests, 2);
});

test('two agents of one wave are two sessions, even though they share a sessionId', () => {
  // Every agent a wave launches writes its own transcript under the PARENT session's directory,
  // and every record in it carries the parent's sessionId. Counting sessionIds reports a wave of
  // six agents as one session, in one worktree, which is the opposite of what the meter is for.
  const record = (file, cwd) => readClaudeRows(
    `{"type":"assistant","requestId":"r-${cwd}","timestamp":"2026-08-30T10:00:00.000Z","sessionId":"parent","cwd":"${cwd}","message":{"id":"m-${cwd}","usage":{"input_tokens":1,"output_tokens":1}}}`,
    { file },
  ).rows;
  const rows = attributeProjects([
    ...record('C:\\p\\parent\\subagents\\agent-one.jsonl', 'A'),
    ...record('C:\\p\\parent\\subagents\\agent-two.jsonl', 'B'),
  ]);
  assert.equal(new Set(rows.map((row) => row.sessionId)).size, 1, 'the sessionId really is shared');
  assert.equal(new Set(rows.map((row) => row.session)).size, 2);
  const grouped = groupRows(rows, (row) => row.project, CLAUDE_KINDS);
  assert.deepEqual(grouped.map((bucket) => bucket.sessions.size), [1, 1]);
});

test('grouping counts distinct sessions, not requests', () => {
  const rows = dedupeClaudeRows([
    ...readClaudeRows(CLAUDE_TRANSCRIPT, { file: 's1.jsonl' }).rows,
    ...readClaudeRows(CLAUDE_TRANSCRIPT_RESUMED, { file: 's2.jsonl' }).rows,
  ]);
  const branches = groupRows(rows, (row) => row.branch, CLAUDE_KINDS);
  assert.deepEqual(branches.map((bucket) => bucket.key), ['claude/s-harness-usage', 'main']);
  assert.equal(branches[0].sessions.size, 1);
  assert.equal(branches[0].requests, 3);
  assert.equal(branches[1].tokens.total, 12);
});

// ── The window ───────────────────────────────────────────────────────────────────────────────────

const NOW = at('2026-08-30T12:00:00Z');

test('with no flags the window is the last 24 hours', () => {
  const window = resolveWindow(parseArgs([]), { now: NOW });
  assert.equal(new Date(window.since).toISOString(), '2026-08-29T12:00:00.000Z');
  assert.equal(window.until, NOW);
  assert.match(window.label, /last 24 hours/);
});

test('--hours and --since and --until are read', () => {
  assert.equal(resolveWindow(parseArgs(['--hours', '5']), { now: NOW }).since, NOW - 5 * 3_600_000);
  assert.equal(resolveWindow(parseArgs(['--since', '2026-08-01T00:00:00Z']), { now: NOW }).since, at('2026-08-01T00:00:00Z'));
  assert.equal(resolveWindow(parseArgs(['--until', '2026-08-02T00:00:00Z']), { now: NOW }).until, at('2026-08-02T00:00:00Z'));
});

test('--since wins over --wave and --hours, so an explicit answer is never overridden', () => {
  const window = resolveWindow(parseArgs(['--since', '2026-08-01T00:00:00Z', '--wave', '--hours', '3']), { now: NOW, wavePlan: { name: 'w.md', mtimeMs: 1 } });
  assert.equal(window.since, at('2026-08-01T00:00:00Z'));
});

test('--wave uses the wave plan mtime, and says so when there is no plan', () => {
  const window = resolveWindow(parseArgs(['--wave']), { now: NOW, wavePlan: { name: 'two-waves-wave-plan.local.md', mtimeMs: at('2026-08-30T08:00:00Z') } });
  assert.equal(window.since, at('2026-08-30T08:00:00Z'));
  assert.match(window.label, /two-waves-wave-plan\.local\.md/);
  assert.throws(() => resolveWindow(parseArgs(['--wave']), { now: NOW }), /wave-plan.*local\.md/);
});

test('a bad date and an unknown flag are refused rather than silently defaulted', () => {
  assert.throws(() => resolveWindow(parseArgs(['--since', 'yesterday']), { now: NOW }), /not a date/);
  assert.throws(() => resolveWindow(parseArgs(['--hours', '-2']), { now: NOW }), /positive/);
  assert.throws(() => parseArgs(['--nope']), /unknown argument/);
});

test('the newest wave plan wins, and a non-plan local handoff is not one', () => {
  const stats = { 'a-wave-plan.local.md': 10, 'b-wave-plan.local.md': 20, 'notes.local.md': 99, 'x.md': 100 };
  const plan = findWavePlan('docs/handoffs', {
    exists: () => true,
    readdir: () => Object.keys(stats),
    stat: (full) => ({ mtimeMs: stats[full.split(/[\\/]/).pop()] }),
  });
  assert.deepEqual(plan, { name: 'b-wave-plan.local.md', mtimeMs: 20 });
  assert.equal(findWavePlan('nope', { exists: () => false }), null);
});

// ── Formatting ───────────────────────────────────────────────────────────────────────────────────

test('counts group in threes regardless of the machine locale', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(1000), '1,000');
  assert.equal(formatCount(470149931), '470,149,931');
  assert.equal(formatCount(Number.NaN), '-');
});

test('a reset time reads as a duration, and a past one says so', () => {
  assert.equal(formatDuration(33 * 60_000), 'in 33m');
  assert.equal(formatDuration(2 * 3_600_000 + 14 * 60_000), 'in 2h 14m');
  assert.equal(formatDuration(-60_000), '1m ago');
});

test('a table pads to its widest cell and an empty one says nothing rather than printing a header', () => {
  const table = formatTable(['a', 'bb'], [['xxx', '1']], { align: ['left', 'right'] });
  assert.deepEqual(table.split('\n'), ['  a    bb', '  ---  --', '  xxx   1']);
  assert.equal(formatTable(['a'], []), '  (nothing)');
});

test('rows past the cut collapse into one row that still carries their tokens', () => {
  const buckets = groupRows(
    ['a', 'b', 'c'].map((key, index) => ({
      branch: key, session: key, tokens: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, total: (index + 1) * 10 },
    })),
    (row) => row.branch,
    CLAUDE_KINDS,
  );
  const { shown, rest } = collapse(buckets, 1, CLAUDE_KINDS);
  assert.deepEqual(shown.map((bucket) => bucket.key), ['c']);
  assert.equal(rest.key, '(2 more)');
  assert.equal(rest.tokens.total, 30);
  assert.equal(rest.sessions.size, 2);
  assert.deepEqual(collapse(buckets, 9, CLAUDE_KINDS).rest, null);
});

test('the two harnesses do not share a token vocabulary, and neither borrows the other', () => {
  assert.ok(CODEX_KINDS.includes('cachedInput') && !CODEX_KINDS.includes('cacheRead'));
  assert.ok(CLAUDE_KINDS.includes('cacheRead') && !CLAUDE_KINDS.includes('cachedInput'));
});
