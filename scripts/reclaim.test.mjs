// This tool kills processes on a laptop somebody is working on. The allowlist is the entire safety
// argument - there is no detection behind it and there is not going to be - so the test is written
// the way `ram-reclaim.test.mjs` and `db-push.test.mjs` are written: the permitted answers are
// checked one at a time, and the refusing answer is checked for every shape that is not explicitly
// permitted.
//
// The property that matters most is negative, and it is the last three tests: a process on the
// never-touch list is kept no matter what else about it matches. Four sessions were running on this
// machine the night this was written, and a wrong answer here ends one of their nights.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLOWLIST,
  CONFIRM_FIRST,
  NEVER,
  classifyProcess,
  describePlan,
  reclaimPlan,
} from './reclaim.mjs';

/** A process record with everything present, so each test can vary one field and mean it. */
const proc = (over) => ({ pid: 4242, name: 'something', path: 'C:\\Whatever\\something.exe', workingSetBytes: 1024, ...over });

test('every allowlist entry closes on its own, and says why', () => {
  for (const entry of ALLOWLIST) {
    const verdict = classifyProcess(proc({ name: entry.match.name ?? 'node', path: entry.match.pathIncludes ? `C:\\Program Files${entry.match.pathIncludes.replaceAll('/', '\\')}libs\\node.exe` : 'C:\\Vendor\\app.exe' }));
    assert.equal(verdict.action, 'close', `${entry.id} is on the allowlist`);
    assert.equal(verdict.id, entry.id);
    assert.ok(verdict.reason.length > 0, `${entry.id} must carry a reason`);
  }
});

test('the confirmed set is held back until it is explicitly included, and never closes without it', () => {
  for (const entry of CONFIRM_FIRST) {
    const record = proc({ name: entry.match.name });
    const held = classifyProcess(record);
    assert.equal(held.action, 'hold', `${entry.id} waits for a person`);
    assert.match(held.reason, /--include-heavy/, 'the reason must name the flag that includes it');

    const included = classifyProcess(record, { includeHeavy: true });
    assert.equal(included.action, 'close', `${entry.id} closes once it is included`);
  }
});

test('the classifier fails closed on everything it does not name', () => {
  const strangers = [
    proc({ name: 'msedgewebview2' }),
    proc({ name: 'svchost' }),
    proc({ name: 'looks-expensive', workingSetBytes: 8e9 }),
    proc({ name: '' }),
    proc({ name: undefined }),
    proc({ name: 42 }),
    proc({ path: undefined }),
    {},
    null,
    undefined,
  ];
  for (const stranger of strangers) {
    const verdict = classifyProcess(stranger, { includeHeavy: true });
    assert.equal(verdict.action, 'keep', `${JSON.stringify(stranger)} must be kept`);
  }
  assert.match(classifyProcess(proc({ name: 'svchost' })).reason, /not on any list/i);
});

test('a pid that is not a usable pid is kept, however well the name matches', () => {
  const wdDiscovery = ALLOWLIST.find((e) => e.id === 'wd-discovery');
  for (const pid of [undefined, null, 0, -1, 1.5, '4242', Number.NaN]) {
    const verdict = classifyProcess(proc({ ...wdDiscovery.match, pid }));
    assert.equal(verdict.action, 'keep', `pid ${String(pid)} must be kept`);
    assert.match(verdict.reason, /pid/i);
  }
});

test('matching ignores case and separator style, because Windows returns both', () => {
  const spellings = [
    proc({ name: 'WD Discovery' }),
    proc({ name: 'wd discovery' }),
    proc({ name: 'Wd DiScOvErY' }),
  ];
  for (const record of spellings) assert.equal(classifyProcess(record).action, 'close');

  // Win32_Process reports "WD Discovery.exe" where Get-Process reports "WD Discovery". The lists
  // are written without the extension and both spellings have to reach the same answer.
  assert.equal(classifyProcess(proc({ name: 'WD Discovery.exe' })).action, 'close');
  assert.equal(classifyProcess(proc({ name: 'StreamDeck.EXE' })).action, 'close');
  assert.equal(classifyProcess(proc({ name: 'chrome.exe' }), { includeHeavy: true }).action, 'keep');

  const adobeNode = [
    proc({ name: 'node', path: 'C:\\Program Files\\Adobe\\Adobe Creative Cloud Experience\\libs\\node.exe' }),
    proc({ name: 'NODE', path: 'C:/Program Files/Common Files/Adobe/Creative Cloud Libraries/libs/node.exe' }),
  ];
  for (const record of adobeNode) assert.equal(classifyProcess(record).action, 'close', record.path);
});

test('THE NEVER LIST WINS - a repo node process is kept even when an allowlist entry names node', () => {
  // This is the exact shape that made path matching non-negotiable. Thirteen node.exe processes
  // were running when this was measured: two Adobe servers, and eleven of this repo's own dev
  // servers, runners, sweeps and MCP servers. They differ by PATH and by nothing else.
  const ours = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:/Program Files/nodejs/node.exe',
    'c:\\program files\\nodejs\\node.exe',
  ];
  for (const path of ours) {
    const verdict = classifyProcess(proc({ name: 'node', path }), { includeHeavy: true });
    assert.equal(verdict.action, 'keep', path);
    assert.match(verdict.reason, /never/i);
  }
});

test('THE NEVER LIST WINS - no session, browser or dictation process is ever closed', () => {
  for (const entry of NEVER) {
    const record = proc({ name: entry.match.name ?? 'node', path: entry.match.pathIncludes ? `C:${entry.match.pathIncludes.replaceAll('/', '\\')}node.exe` : 'C:\\App\\app.exe' });
    const verdict = classifyProcess(record, { includeHeavy: true });
    assert.equal(verdict.action, 'keep', `${entry.id} must never be closed`);
    assert.match(verdict.reason, /never/i);
  }
  // Named individually as well, so a careless edit to NEVER cannot quietly empty this test.
  for (const name of ['chrome', 'claude', 'Wispr Flow', 'chrome-headless-shell']) {
    assert.equal(classifyProcess(proc({ name }), { includeHeavy: true }).action, 'keep', name);
  }
});

test('THE NEVER LIST WINS - it cannot be defeated by putting a name on both lists', () => {
  // A future edit could add something to the allowlist that is already on the never list. The
  // order of the checks, not the discipline of whoever makes that edit, is what has to hold.
  const overlap = NEVER.map((entry) => entry.match.name).filter(Boolean);
  for (const name of overlap) {
    const verdict = classifyProcess(proc({ name }), { includeHeavy: true });
    assert.equal(verdict.action, 'keep', `${name} is on the never list, whatever else claims it`);
  }
  const allowNames = new Set(ALLOWLIST.concat(CONFIRM_FIRST).map((e) => e.match.name).filter(Boolean));
  for (const name of overlap) {
    assert.ok(!allowNames.has(name), `${name} is on the never list and must not also be listed as closeable`);
  }
});

test('a plan groups the machine into closed, held and kept, and totals each group', () => {
  const records = [
    proc({ pid: 11, name: 'WD Discovery', workingSetBytes: 30 * 1024 * 1024 }),
    proc({ pid: 12, name: 'StreamDeck', workingSetBytes: 64 * 1024 * 1024 }),
    proc({ pid: 13, name: 'ChatGPT', workingSetBytes: 670 * 1024 * 1024 }),
    proc({ pid: 14, name: 'claude', workingSetBytes: 100 * 1024 * 1024 }),
    proc({ pid: 15, name: 'node', path: 'C:\\Program Files\\nodejs\\node.exe', workingSetBytes: 214 * 1024 * 1024 }),
  ];

  const plan = reclaimPlan(records);
  assert.deepEqual(plan.close.map((d) => d.pid), [11, 12]);
  assert.deepEqual(plan.hold.map((d) => d.pid), [13]);
  assert.deepEqual(plan.keep.map((d) => d.pid), [14, 15]);
  assert.equal(plan.closeBytes, (30 + 64) * 1024 * 1024);
  assert.equal(plan.holdBytes, 670 * 1024 * 1024);

  const heavy = reclaimPlan(records, { includeHeavy: true });
  assert.deepEqual(heavy.close.map((d) => d.pid), [11, 12, 13]);
  assert.deepEqual(heavy.hold, []);
  assert.deepEqual(heavy.keep.map((d) => d.pid), [14, 15]);
});

test('an empty machine plans nothing rather than throwing', () => {
  const plan = reclaimPlan([]);
  assert.deepEqual(plan.close, []);
  assert.equal(plan.closeBytes, 0);
  assert.ok(Array.isArray(describePlan(plan)));
});

test('the printed plan says what it would close, and never claims to have closed it', () => {
  const plan = reclaimPlan([
    proc({ pid: 11, name: 'WD Discovery', workingSetBytes: 60 * 1024 * 1024 }),
    proc({ pid: 13, name: 'Antigravity', workingSetBytes: 78 * 1024 * 1024 }),
    proc({ pid: 14, name: 'chrome', workingSetBytes: 1055 * 1024 * 1024 }),
  ]);
  const text = describePlan(plan).join('\n');
  assert.match(text, /would close/i, 'a dry run describes an intention, not an outcome');
  assert.match(text, /WD Discovery/);
  assert.match(text, /60 MB/);
  assert.match(text, /--include-heavy/, 'the held-back set must say how to include it');
  assert.match(text, /chrome/, 'what was kept is named, so the reader can see the tool refused it');
});
