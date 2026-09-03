// The weekly measurement's guard: each proxy it prints is pinned here with the case that must
// count and the case that must not, because a number that quietly drifts is worse than none.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMMITS_SHOWN,
  commonPathLines,
  decisionsIn,
  improvementsFrom,
  parseArgs,
  poolCounts,
  questionsIn,
  summarise,
  SYSTEM_PATHS,
} from './orchestrator-week.mjs';

test('the window defaults to a week and refuses a nonsense length', () => {
  assert.deepEqual(parseArgs([]), { days: 7, json: false, help: false });
  assert.equal(parseArgs(['--days', '14', '--json']).days, 14);
  assert.throws(() => parseArgs(['--days', 'soon']), /positive number/);
  assert.throws(() => parseArgs(['--weeks']), /unknown argument/);
});

test('decisions are DECIDED: lines, with the older inline wording counted apart', () => {
  const plan = [
    '10. The alignment questionnaire',
    '- DECIDED: an agent-verified queue item of kind agent is deleted with its evidence.',
    '  - **DECIDED:** the byte reserve is 4,096 bytes, not a percentage.',
    '- 20:35 RULING taken on the owner\'s behalf, for the morning report: ...',
    '- a line that merely mentions the word decided in passing',
  ].join('\r\n');
  assert.deepEqual(decisionsIn(plan), { decided: 2, legacy: 1 });
  assert.deepEqual(decisionsIn(''), { decided: 0, legacy: 0 });
});

test('a handoff asks the owner when its needs section has content, and not when it says nothing', () => {
  assert.equal(questionsIn('## Needs the owner\n\nnothing - every item traced.\n'), 0);
  assert.equal(questionsIn('Needs the owner: nothing. The upgrade still waits on him.'), 0);
  assert.equal(questionsIn('**Needs you**: whether the grouped count looks better at speed.'), 1);
  assert.equal(questionsIn('- **Needs you** - approve the 0.3.0 publish.'), 1, 'the wrap-up bullet shape');
  assert.equal(questionsIn('- **Needs you** - nothing.'), 0);
  assert.equal(questionsIn('## Needs the owner\n\n- the vertical alignment, either is fine\n- publish 0.3.0\n\n## Next\n- more'), 2);
  assert.equal(questionsIn('## Needs the owner\n\nOne bare sentence asking for a walk.\n'), 1);
  assert.equal(questionsIn('# A handoff with no such section\n\n## What is left\n- things'), 0);
});

test('rows per pool count a two-pool row once for each pool', () => {
  const rows = [{ pool: 'opus' }, { pool: 'agy-claude-gpt + opus' }, { pool: 'codex' }, { pool: '' }];
  assert.deepEqual(poolCounts(rows), { opus: 2, 'agy-claude-gpt': 1, codex: 1 });
});

test('git log lines become sha and subject, tabs in a subject kept', () => {
  assert.deepEqual(improvementsFrom('9daf5b28\tRefuse a bad delegation\n\nc6028b54\tA\tB\n'), [
    { sha: '9daf5b28', subject: 'Refuse a bad delegation' },
    { sha: 'c6028b54', subject: 'A\tB' },
  ]);
});

test('the common path is the core plus the every-plan modules, exactly as the gate counts it', () => {
  const core = [
    '# core', '', '| Load | When |', '| --- | --- |',
    '| [`orchestrator/grounding.md`](orchestrator/grounding.md) | first (*every plan*) |',
    '| [`orchestrator/night.md`](orchestrator/night.md) | a night wave |',
    '| [`orchestrator/routing.md`](orchestrator/routing.md) | routing (*every plan*) |',
    '',
  ].join('\n');
  const modules = { 'grounding.md': 'a\nb\nc\n', 'night.md': 'x\n'.repeat(50), 'routing.md': 'r\n' };
  const result = commonPathLines(core, modules);
  assert.deepEqual(result.marked, ['grounding.md', 'routing.md']);
  assert.equal(result.core, 7);
  assert.equal(result.total, 7 + 3 + 1);
  // A marked module the tree does not hold counts nothing rather than throwing.
  assert.equal(commonPathLines(core, { 'grounding.md': 'a\n' }).total, 8);
});

test('the page prints every section from the facts, with absent meters named rather than zeroed', () => {
  const lines = summarise({
    window: { since: '2026-08-27T00:00:00.000Z', until: '2026-09-03T00:00:00.000Z', days: 7 },
    usage: {
      claudeCode: { sessions: 161, requests: 12382, tokens: { total: 2699046208 }, byModel: [{ model: 'claude-opus-5', requests: 10954, tokens: { total: 2403816249 } }] },
      codex: { sessions: 4, tokens: { total: 2099102 }, rateLimits: null },
      antigravity: { calls: 8, failedCalls: 4, tokens: { input: 601940, output: 83786 } },
      delegationOutcomes: { tasks: 12, quality: { accepted: 0, attributable: 1, ours: 0 } },
      capabilities: [{ id: 'x', standing: 'holds' }, { id: 'claude-launched-session-gets-no-subagent-notifications', standing: 'unverified' }],
    },
    waves: [
      { name: '2026-09-02-night-wave-plan.local.md', rows: [{ pool: 'opus' }, { pool: 'agy-claude-gpt + opus' }], decisions: { decided: 0, legacy: 1 } },
      { name: '2026-09-03-day-wave-plan.local.md', rows: [{ pool: 'codex' }], decisions: { decided: 3, legacy: 0 } },
    ],
    handoffs: [{ name: 'docs/handoffs/a.md', asks: 2 }, { name: 'docs/handoffs/b.md', asks: 0 }],
    queueItems: [{ kind: 'walk' }, { kind: 'agent' }, { kind: null }],
    landed: { count: 18, branches: [] },
    skill: { commits: [{ sha: '9daf5b28', subject: 'Refuse a bad delegation' }], commonPathNow: { core: 198, marked: [], total: 640 }, commonPathThen: { core: 197, marked: [], total: 639 } },
  });
  const page = lines.join('\n');
  assert.match(page, /# Orchestrator week - 2026-08-27 \.\. 2026-09-03/);
  assert.match(page, /\| claude-opus-5 \| 10,954 \| 2,403,816,249 \|/);
  assert.match(page, /snapshot absent \(no Codex session ran\)/);
  assert.match(page, /Rows planned off Claude .*: 2 of 3/);
  assert.match(page, /Claude tokens per landed branch: 149,947,012/);
  assert.match(page, /DECIDED: lines in the wave plans\): 3, plus 1 in the older inline wording/);
  assert.match(page, /Handoffs added: 2; carrying an ask for the owner: 1 \(2 items\) - a\.md/);
  assert.match(page, /by kind: walk 1, agent 1, unknown 1/);
  assert.match(page, /unverified on the installed builds: 1 \(claude-launched-session-gets-no-subagent-notifications\)/);
  assert.match(page, /640 lines now, 639 at the window's start; core 198 lines/);
  assert.match(page, /9daf5b28 Refuse a bad delegation/);
});

test('a busy week lists the first commits and counts the rest', () => {
  const commits = Array.from({ length: COMMITS_SHOWN + 3 }, (_, index) => ({ sha: `s${index}`, subject: `change ${index}` }));
  const page = summarise({
    window: { since: '2026-08-27T00:00:00.000Z', until: '2026-09-03T00:00:00.000Z', days: 7 },
    usage: null, waves: [], handoffs: [], queueItems: [], landed: { count: 0, branches: [] },
    skill: { commits, commonPathNow: { core: 1, marked: [], total: 1 }, commonPathThen: null },
  }).join('\n');
  assert.match(page, new RegExp(`\\(merges excluded\\): ${COMMITS_SHOWN + 3}`));
  assert.match(page, /\(3 more - git log/);
  assert.ok(!page.includes(`s${COMMITS_SHOWN} change`));
  assert.match(page, /no reading at the window's start/);
});

test('the system paths name files that exist, so a rename does not silently empty the commit list', async () => {
  const { existsSync } = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  for (const entry of SYSTEM_PATHS) {
    assert.ok(existsSync(path.join(root, entry)), `${entry} does not exist`);
  }
});
