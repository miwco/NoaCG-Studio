// Which CHECKOUT a running Playwright process belongs to. This is the load-bearing part of the
// cross-worktree guard: `activeRuns({ exclude: me })` uses it to decide whether a run is someone
// else's, so getting it wrong fails in both directions - attribute my own run elsewhere and the
// queue waits for me to finish before letting me start, attribute someone else's to me and the
// collision the guard exists to prevent goes through unnoticed.
//
// Every "real" case below is a command line copied verbatim from `Get-CimInstance Win32_Process`
// on this machine while suites were actually running.
//
// The cases are split by platform, because the root is normalised with `path.resolve` and that
// is platform-specific by design: on Linux a Windows path is not absolute, so resolve() prepends
// the cwd and `C:\claude\NoaCG-Studio` comes back as `<cwd>/C:/claude/NoaCG-Studio`. That is
// correct - and irrelevant, because rootOfCommand only ever sees command lines produced by the
// platform it is running on. Asserting a Windows shape on ubuntu tests nothing real and fails.
// The ARGUMENT-SPLITTING cases, which are the actual logic, are platform-neutral and always run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockingRuns,
  orphanedDevServers,
  rootOfCommand,
  sameRoot,
  selfAndAncestors,
} from './e2e-runs.mjs';

const onlyWindows = { skip: process.platform !== 'win32' };
const onlyPosix = { skip: process.platform === 'win32' };

test('the main checkout, launched through the .bin shim', onlyWindows, () => {
  const cmd = '"node"   "C:\\claude\\NoaCG-Studio\\node_modules\\.bin\\\\..\\@playwright\\test\\cli.js" test advanced-mode.spec.ts';
  assert.equal(rootOfCommand(cmd), 'C:/claude/NoaCG-Studio');
});

test('a linked worktree, launched with an absolute node path', onlyWindows, () => {
  const cmd =
    '"C:\\Program Files\\nodejs\\node.exe" C:\\claude\\NoaCG-Studio\\.claude\\worktrees\\creative-vocabulary-test-ff7b6d\\node_modules\\playwright\\lib\\worker\\workerProcessEntry.js';
  assert.equal(
    rootOfCommand(cmd),
    'C:/claude/NoaCG-Studio/.claude/worktrees/creative-vocabulary-test-ff7b6d',
  );
});

test('the node interpreter\'s own path is never mistaken for the checkout', onlyWindows, () => {
  // "C:\Program Files\nodejs\node.exe" comes FIRST and contains no node_modules, so the scan
  // has to walk past it rather than anchor on the first drive letter it sees.
  const cmd = '"C:\\Program Files\\nodejs\\node.exe" C:\\repo\\node_modules\\@playwright\\test\\cli.js test';
  assert.equal(rootOfCommand(cmd), 'C:/repo');
});

test('a checkout path containing spaces survives, because it is quoted', onlyWindows, () => {
  const cmd = '"node" "C:\\Users\\First Last\\My Repo\\node_modules\\@playwright\\test\\cli.js" test';
  assert.equal(rootOfCommand(cmd), 'C:/Users/First Last/My Repo');
});

test('a posix invocation resolves too', onlyPosix, () => {
  assert.equal(
    rootOfCommand('/usr/bin/node /home/dev/proj/node_modules/@playwright/test/cli.js test'),
    '/home/dev/proj',
  );
});

// ── Platform-neutral: the argument splitting itself, which is the actual logic ──────────────
// Asserted on the SHAPE of the answer rather than on an absolute path, so the same assertions
// hold wherever they run. This is the regression the rewrite exists for, so it must not be a
// case that silently skips on the platform CI happens to use.

test('a path is never glued across two separate arguments', () => {
  // The bug this replaced: a regex allowed to cross whitespace produced
  // ".../sleeper.mjs 60000 C:/claude/NoaCG-Studio" - two unrelated arguments as one path.
  const root = rootOfCommand(
    'node /tmp/sleeper.mjs 60000 /srv/checkout/node_modules/@playwright/test/cli.js test',
  );
  assert.ok(root, 'a root should be found');
  assert.ok(root.endsWith('/srv/checkout'), `expected the checkout argument, got ${root}`);
  assert.ok(!root.includes('sleeper'), `a preceding argument leaked into the path: ${root}`);
  assert.ok(!root.includes('60000'), `a preceding argument leaked into the path: ${root}`);
});

test('the argument before the checkout never contributes, even when it looks like a path', () => {
  const root = rootOfCommand('/usr/bin/node /opt/tools/runner.mjs /srv/checkout/node_modules/x/cli.js test');
  assert.ok(root.endsWith('/srv/checkout'), `got ${root}`);
  assert.ok(!root.includes('runner.mjs'), `got ${root}`);
});

test('a command with no node_modules has no root, rather than a wrong one', () => {
  // Returning null means the process is IGNORED. That is the safe direction for a non-run;
  // inventing a root would put a phantom checkout in the guard's refusal message.
  assert.equal(rootOfCommand('node scripts/dev-port.mjs'), null);
  assert.equal(rootOfCommand(''), null);
  // node_modules with nothing before it is not a checkout either.
  assert.equal(rootOfCommand('node node_modules/@playwright/test/cli.js test'), null);
});

// ── Identifying your OWN run when the root cannot ───────────────────────────────────────────
// A linked worktree has no node_modules, so `npx playwright` there runs the MAIN checkout's CLI
// and rootOfCommand attributes the run to the main checkout. `exclude: <worktree>` then never
// matches its own run, and the queue in e2e/_offline-guard.ts waits out its whole 30-minute cap
// behind the very process doing the waiting. Ancestry is what survives that.

test('a worktree run really does resolve to the MAIN checkout (the reason ancestry exists)', () => {
  const cmd = '"node" "/repo/node_modules/.bin/../@playwright/test/cli.js" test some.spec.ts';
  const root = rootOfCommand(cmd);
  assert.ok(root.endsWith('/repo'), `got ${root}`);
  assert.ok(!sameRoot(root, '/repo/.claude/worktrees/feature-x'), 'the worktree is not its own root here');
});

test('selfAndAncestors walks the parent chain', () => {
  const procs = [
    { pid: 40, ppid: 30, command: 'node cli.js test' },
    { pid: 30, ppid: 20, command: 'node npx-cli.js' },
    { pid: 20, ppid: 1, command: 'node shell' },
    { pid: 99, ppid: 1, command: 'node unrelated' },
  ];
  assert.deepEqual([...selfAndAncestors(40, procs)], [40, 30, 20, 1]);
  assert.ok(!selfAndAncestors(40, procs).has(99));
});

test('selfAndAncestors terminates on a cycle and on an unknown pid', () => {
  // A recycled pid can make the table describe a loop; the walk must not hang on it.
  const cyclic = [
    { pid: 7, ppid: 8, command: 'node a' },
    { pid: 8, ppid: 7, command: 'node b' },
  ];
  assert.deepEqual([...selfAndAncestors(7, cyclic)], [7, 8]);
  assert.deepEqual([...selfAndAncestors(1234, [])], [1234]);
});

test('roots compare case-insensitively and across slash spellings', onlyWindows, () => {
  // Windows is case-insensitive and the same checkout gets spelled both ways by different
  // launchers; if these did not compare equal, a run would never be recognised as its own.
  assert.ok(sameRoot('C:\\claude\\NoaCG-Studio', 'c:/claude/noacg-studio'));
  assert.ok(!sameRoot('C:/claude/NoaCG-Studio', 'C:/claude/NoaCG-Studio/.claude/worktrees/x'));
});

// ── WHO GOES FIRST when two runs start together ──
// A Playwright CLI sitting in its globalSetup WAITING looks exactly like one driving a browser,
// so before `blockingRuns` two simultaneous starts each queued behind the other and both sat out
// the 30-minute cap. The property every case below defends is the same one: whatever the pair,
// the two runs must reach OPPOSITE verdicts, computed independently from the same table.

/** Both sides of a pair, judged the way each one's own globalSetup would. */
function verdicts(runs) {
  return runs.map((self) => blockingRuns(runs, self).length === 0);
}

test('two runs started in the same second: exactly one proceeds', () => {
  const t = 1_700_000_000_000;
  const runs = [
    { pid: 200, kind: 'run', startedAt: t },
    { pid: 100, kind: 'run', startedAt: t },
  ];
  assert.deepEqual(verdicts(runs), [false, true], 'the lower pid goes first, the other waits');
});

test('an earlier run is yielded to whatever the pids say', () => {
  const t = 1_700_000_000_000;
  // The lower pid started LATER here, so a pid-only rule would let the newcomer barge in front
  // of work already under way.
  const runs = [
    { pid: 100, kind: 'run', startedAt: t + 60_000 },
    { pid: 200, kind: 'run', startedAt: t },
  ];
  assert.deepEqual(verdicts(runs), [false, true]);
});

test('starts within the POSIX rounding window count as simultaneous', () => {
  // `ps -o etimes` reports whole elapsed SECONDS, so the same process yields a startedAt that
  // wobbles by up to a second depending on when the table was read. Without the slack the two
  // sides could disagree about who started first and stall again.
  const t = 1_700_000_000_000;
  const runs = [
    { pid: 300, kind: 'run', startedAt: t + 1_400 },
    { pid: 150, kind: 'run', startedAt: t },
  ];
  assert.deepEqual(verdicts(runs), [false, true], 'settled by pid, not by the wobbling clock');
});

test('an unreadable start time still yields a decision, and the same one on both sides', () => {
  const runs = [
    { pid: 900, kind: 'run', startedAt: null },
    { pid: 800, kind: 'run', startedAt: 1_700_000_000_000 },
  ];
  assert.deepEqual(verdicts(runs), [false, true]);
});

test('a sweep is always yielded to, however late it started', () => {
  // A sweep has no globalSetup and never waits for anyone, so it can only ever be real work in
  // progress - ordering it against a run would starve the run for no reason.
  const t = 1_700_000_000_000;
  const sweep = { pid: 999, kind: 'sweep', startedAt: t + 600_000 };
  const self = { pid: 1, startedAt: t };
  assert.deepEqual(blockingRuns([sweep], self), [sweep]);
});

test('three simultaneous runs queue in a stable order rather than all proceeding', () => {
  const t = 1_700_000_000_000;
  const runs = [
    { pid: 30, kind: 'run', startedAt: t },
    { pid: 10, kind: 'run', startedAt: t },
    { pid: 20, kind: 'run', startedAt: t },
  ];
  assert.deepEqual(verdicts(runs), [false, true, false], 'exactly one proceeds');
  // And the queue behind it is FIFO by the same order, so nobody is starved.
  assert.equal(blockingRuns(runs, runs[0]).length, 2, 'pid 30 waits for both');
  assert.equal(blockingRuns(runs, runs[2]).length, 1, 'pid 20 waits only for pid 10');
});

test('a run never blocks on itself', () => {
  const self = { pid: 42, kind: 'run', startedAt: 1_700_000_000_000 };
  assert.deepEqual(blockingRuns([self], self), []);
});

// ── THE DEV SERVER A KILLED RUN LEAVES BEHIND ──
// Playwright starts the dev server as a child of its own CLI, through an npm script and a
// `cmd /c` shim, so killing the CLI frees the RAM and leaves the PORT held - and the guard hook
// then refuses every following run until somebody finds it by hand. The tables below are the
// shape captured from this machine with one leftover and one live server side by side: the
// leftover's chain broke at its own npm supervisor, the live one ran up to explorer.exe.

const REPO = 'C:/claude/NoaCG-Studio';
const viteCmd = (root) => `"node" "${root}\\node_modules\\.bin\\\\..\\vite\\bin\\vite.js"`;
const NPM_SUPERVISOR = '"node" "npm-cli.js" ' + 'run ' + 'dev';

/** server -> cmd shim -> the npm supervisor -> whatever owned the run. */
function serverTree({ pid, root, ownerPid, extra = [] }) {
  return [
    { pid, ppid: pid + 1, name: 'node.exe', command: viteCmd(root) },
    { pid: pid + 1, ppid: pid + 2, name: 'cmd.exe', command: 'cmd.exe /d /s /c vite' },
    { pid: pid + 2, ppid: ownerPid, name: 'node.exe', command: NPM_SUPERVISOR },
    ...extra,
  ];
}

test('a dev server whose launch chain lost its owner is an orphan', () => {
  // ownerPid 900 is the killed Playwright CLI: absent from the table.
  const procs = serverTree({ pid: 100, root: `${REPO}\\.claude\\worktrees\\feature-x`, ownerPid: 900 });
  const found = orphanedDevServers(procs, REPO);
  assert.equal(found.length, 1);
  assert.equal(found[0].pid, 100);
  // The shims are as unowned as the server, so they are reaped with it - children first.
  assert.deepEqual(found[0].chain, [100, 101, 102]);
});

test('a dev server still owned by a live session is left alone', () => {
  // The same tree, but the chain runs up into a real desktop session rather than ending nowhere.
  const procs = serverTree({
    pid: 200,
    root: `${REPO}\\.claude\\worktrees\\feature-y`,
    ownerPid: 800,
    extra: [{ pid: 800, ppid: 4, name: 'explorer.exe', command: 'C:\\Windows\\Explorer.EXE' }],
  });
  assert.deepEqual(orphanedDevServers(procs, REPO), []);
});

test('an unrelated Vite project on the same machine is nobody else\'s business', () => {
  const procs = serverTree({ pid: 300, root: 'C:\\work\\some-other-app', ownerPid: 900 });
  assert.deepEqual(orphanedDevServers(procs, REPO), []);
});

test('the MAIN checkout\'s own server counts, not just a worktree\'s', () => {
  const procs = serverTree({ pid: 400, root: REPO.replaceAll('/', '\\'), ownerPid: 900 });
  assert.equal(orphanedDevServers(procs, REPO).length, 1);
});

test('a recycled pid that makes the chain loop does not hang the walk', () => {
  const procs = [
    { pid: 500, ppid: 501, name: 'node.exe', command: viteCmd(`${REPO}\\.claude\\worktrees\\z`) },
    { pid: 501, ppid: 502, name: 'cmd.exe', command: 'cmd.exe /d /s /c vite' },
    { pid: 502, ppid: 501, name: 'node.exe', command: NPM_SUPERVISOR },
  ];
  assert.equal(orphanedDevServers(procs, REPO).length, 1);
});

test('an empty process table reports nothing rather than guessing', () => {
  // The POSIX case and the "could not read the machine" case both land here; every caller of
  // this module fails OPEN by design.
  assert.deepEqual(orphanedDevServers([], REPO), []);
});
