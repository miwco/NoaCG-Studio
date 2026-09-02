// `auto-merge.mjs` lands branches unattended and, since 2026-08-25, applies whatever migration
// production is missing afterwards. That second half is the only thing in the whole landing path
// that writes to a live database, so the decisions around it are pinned here.
//
// Two shapes of test, because two different things can go wrong:
//
//   1. The DECISION - when to push, when to stand down, when to say so out loud. Pure, so it is
//      tested directly.
//   2. The ORDER and the BLAST RADIUS - that the push happens strictly after the branch is on
//      origin/main, and that nothing about it can turn a successful landing into a failed job.
//      Those are properties of the source, so they are asserted against the source. A unit test
//      cannot reach them without performing a real merge.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  attemptLanding,
  landWithRetries,
  planMigrationPushes,
  planOrderDecision,
  planPreconditions,
  giveUpOnCi,
  waitForCi,
} from './auto-merge.mjs';

const source = await readFile(new URL('./auto-merge.mjs', import.meta.url), 'utf8');

// ── The decision ─────────────────────────────────────────────────────────────────────────────────

/** A drift report shaped the way migration-drift.mjs writes one: production at the top level. */
const report = (production, staging = { status: 'ok', local: 52, remote: 52, ref: 'garafohbzmsybtysxphb' }) =>
  JSON.stringify({ ...production, staging });

test('both projects holding every migration is the quiet case', () => {
  // Nearly every landing. It must say nothing at all, or the useful lines drown.
  assert.deepEqual(planMigrationPushes(report({ status: 'ok', local: 52, remote: 52 })), []);
});

test('a missing migration is pushed, and the report rides along', () => {
  const drift = { status: 'drift', missing: ['0052'], ref: 'kprolrchuldgfrzspthy', local: 52, remote: 51 };
  const [target, ...rest] = planMigrationPushes(report(drift));
  assert.deepEqual(rest, [], 'a healthy staging adds nothing');
  assert.equal(target.action, 'push');
  assert.equal(target.label, 'production');
  assert.deepEqual(target.drift.missing, ['0052']);
});

test('staging is pushed on its own, and never before production', () => {
  // The case that prompted this: staging sat two migrations behind while production was current,
  // and only the twice-weekly hosted suite said so - a day late, reading like a latency defect.
  const stagingBehind = { status: 'drift', missing: ['0053', '0054'], ref: 'garafohbzmsybtysxphb', local: 54, remote: 52 };
  const staged = planMigrationPushes(report({ status: 'ok', local: 54, remote: 54 }, stagingBehind));
  assert.deepEqual(staged.map((t) => t.label), ['staging']);
  assert.deepEqual(staged[0].drift.missing, ['0053', '0054']);

  // And when both are behind, the one with users on it goes first: a staging failure must never
  // stand between a landing and production.
  const both = planMigrationPushes(
    report({ status: 'drift', missing: ['0054'], ref: 'kprolrchuldgfrzspthy' }, stagingBehind),
  );
  assert.deepEqual(both.map((t) => t.label), ['production', 'staging']);
});

test('a drift report from before staging existed still pushes production', () => {
  // A stale report - an older checkout's script, a cached line - has no `staging` key at all.
  // Reading that as "staging is behind" would push migrations at a project nobody named.
  const targets = planMigrationPushes(JSON.stringify({ status: 'drift', missing: ['0052'], ref: 'kprolrchuldgfrzspthy' }));
  assert.deepEqual(targets.map((t) => t.label), ['production']);
});

test('--no-db-push stands down before reading anything', () => {
  // For a machine that must never write to a hosted project. It has to win over a real drift
  // report, not merely over a quiet one.
  const drift = report({ status: 'drift', missing: ['0052'], ref: 'x' }, { status: 'drift', missing: ['0052'], ref: 'y' });
  assert.deepEqual(planMigrationPushes(drift, { noDbPush: true }), []);
});

test('an unreadable report is REPORTED, never read as "the projects are fine"', () => {
  // migration-drift.mjs never fails its caller, so empty output means it did not run at all.
  // Treating that as healthy is the exact failure it is named after.
  for (const broken of ['', 'not json', '<html>500</html>']) {
    const [decision, ...rest] = planMigrationPushes(broken);
    assert.equal(decision.action, 'report', `"${broken}" must not be read as healthy`);
    assert.match(decision.message, /npm run db:push/);
    assert.deepEqual(rest, [], 'one unreadable report is one message, not two');
  }
});

test('no token or no network says so once per project, and does not push', () => {
  const detail = 'SUPABASE_ACCESS_TOKEN is not set';
  const targets = planMigrationPushes(report({ status: 'skipped', detail }, { status: 'skipped', detail }));
  assert.deepEqual(targets.map((t) => t.action), ['report', 'report']);
  for (const target of targets) assert.match(target.message, /SUPABASE_ACCESS_TOKEN is not set/);
});

// ── The order, and what a failure may cost ───────────────────────────────────────────────────────

test('nothing in the migration push can fail the landing', () => {
  const body = source.slice(source.indexOf('function applyPendingMigrations()'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  // The merge is already pushed by this point. A refusal here is the guard working, and an error
  // is still not a failed landing - so this function must never hand back a failing exit code.
  assert.doesNotMatch(fn, /\breturn\s+refuse\b/, 'refuse() ends the job as a failure');
  assert.doesNotMatch(fn, /process\.exit/, 'exiting here abandons a landing that already happened');
  assert.doesNotMatch(fn, /\bthrow\b/, 'a throw here would surface as a failed landing');
});

test('the landing is recorded before the migration push is attempted', () => {
  // The landed ledger is what SessionStart and `npm run jobs` read to say a session is done. A
  // slow or hanging push must not be able to delay that answer.
  assert.ok(
    source.indexOf('recordLanding(entry);') < source.indexOf('applyPendingMigrations();'),
    'recordLanding() must come first',
  );
});

// ── Turn order: land, wait for a turn, or refuse ────────────────────────────────────────────────
//
// The queue's whole value is that several branches can be declared finished at once. Reading a
// "you are behind another branch" as a FAILURE would mean the owner queues five, three fail, and
// he re-queues them by hand - the manual tracking the queue exists to remove.

test('a clear verdict is the licence to land', () => {
  assert.deepEqual(planOrderDecision({ severity: 'clear', reasons: [] }), {
    action: 'proceed',
    message: 'merge-order: clear',
  });
});

test('no verdict at all is a refusal, never a silent pass', () => {
  assert.equal(planOrderDecision(null).action, 'refuse');
});

test('blocked by a branch that is itself QUEUED means requeue, not fail', () => {
  // The queue will land the blocker, so deferring genuinely resolves - this is the
  // queue-five-at-once case the deferral mechanism exists for.
  const decision = planOrderDecision(
    { severity: 'hold', reasons: [{ kind: 'stacked', text: 'sits on top of the other branch' }], landFirst: 'claude/first' },
    { isAheadOfMain: (b) => b === 'claude/first', isQueuedForLanding: (b) => b === 'claude/first' },
  );
  assert.equal(decision.action, 'blocked');
  assert.match(decision.message, /claude\/first is still ahead of main/);
});

test('a blocker NOBODY queued refuses at once instead of burning deferrals', () => {
  // Deferring is a bet that the queue itself will land the blocker. With no landing queued for
  // it the bet cannot pay: this used to spin through the whole deferral budget in minutes and
  // then vanish - queue empty, branch "not queued", indistinguishable from unfinished work.
  const decision = planOrderDecision(
    { severity: 'hold', reasons: [{ kind: 'stacked', text: 'sits on top of the other branch' }], landFirst: 'claude/first' },
    { isAheadOfMain: (b) => b === 'claude/first', isQueuedForLanding: () => false },
  );
  assert.equal(decision.action, 'refuse');
  assert.match(decision.message, /claude\/first/);
  assert.match(decision.message, /NO landing is queued/);
  assert.match(decision.message, /--accept <kind>/);
});

test('one queued blocker among several is enough to keep waiting', () => {
  // The queued one lands, the verdict is recomputed next turn, and only then does the unqueued
  // remainder refuse - refusing now would fail a landing that real progress is coming for.
  const decision = planOrderDecision(
    { severity: 'hold', reasons: [{ kind: 'stacked', text: 'x' }], blockedBy: ['claude/queued', 'claude/idle'] },
    { isAheadOfMain: () => true, isQueuedForLanding: (b) => b === 'claude/queued' },
  );
  assert.equal(decision.action, 'blocked');
});

test('the same verdict is a REFUSAL once the blocker has landed', () => {
  // Nothing is coming to unblock it any more, so putting it back in the queue would spin forever.
  const decision = planOrderDecision(
    { severity: 'hold', reasons: [{ kind: 'stacked', text: 'sits on top of the other branch' }], landFirst: 'claude/first' },
    { isAheadOfMain: () => false },
  );
  assert.equal(decision.action, 'refuse');
  assert.match(decision.message, /land claude\/first first/);
  assert.match(decision.message, /--accept <kind>/);
});

test('--accept clears the kind a person weighed, and only that kind', () => {
  const verdict = {
    severity: 'hold',
    reasons: [
      { kind: 'shared-registry', text: 'both edit the graphic-type registry' },
      { kind: 'duplicate-migration', text: 'both mint 0053' },
    ],
  };
  assert.equal(planOrderDecision(verdict, { accept: ['shared-registry', 'duplicate-migration'] }).action, 'proceed');

  // A blanket override is exactly what this must not become: accepting the registry collision
  // cannot also wave through a duplicate migration number sitting in the same verdict.
  const partial = planOrderDecision(verdict, { accept: ['shared-registry'] });
  assert.equal(partial.action, 'refuse');
  assert.match(partial.message, /duplicate-migration/);
  assert.doesNotMatch(partial.message, /shared-registry/);
});

test('an accepted kind does not make a waiting blocker land early', () => {
  // `--accept` answers a named collision. It says nothing about turn order, so a blocker that is
  // still ahead of main must still send this back to the queue.
  const decision = planOrderDecision(
    { severity: 'hold', reasons: [{ kind: 'stacked', text: 'x' }, { kind: 'shared-registry', text: 'y' }], blockedBy: ['claude/other'] },
    { accept: ['shared-registry'], isAheadOfMain: () => true, isQueuedForLanding: () => true },
  );
  assert.equal(decision.action, 'blocked');
});

// ── Preconditions: the queued commit, the worktrees, the dirty trees ────────────────────────────

const PIN = 'a'.repeat(40);
const MOVED = 'b'.repeat(40);
const CLEAN = { branch: 'claude/x', mainWorktree: '/wt/main', branchWorktree: '/wt/x' };

test('the pinned commit is the whole point of queueing, so a moved branch refuses', () => {
  const decision = planPreconditions({ ...CLEAN, expectSha: PIN, currentSha: MOVED });
  assert.equal(decision.action, 'refuse');
  assert.match(decision.message, /has moved since it was queued \(aaaaaaaa -> bbbbbbbb\)/);
  assert.match(decision.message, /Queue it again when it is done/);
});

test('the pin is checked BEFORE the trees, because it outranks how clean they are', () => {
  // A dirty tree is fixable on the spot; "this is not the work that was queued" is not, and
  // reporting the lesser fact first sends a person to fix the wrong thing.
  const decision = planPreconditions({ ...CLEAN, expectSha: PIN, currentSha: MOVED, isDirty: () => true });
  assert.match(decision.message, /has moved since it was queued/);
});

test('an unpinned branch is landed as it stands', () => {
  assert.deepEqual(planPreconditions({ ...CLEAN }), { action: 'proceed', temporaryWorktree: null });
});

test('a branch with no worktree gets a temporary one, the way the human flow does', () => {
  // Refusing here meant a closed session's finished branch could never land through the queue -
  // and the listing then called it "not queued". Full coverage lives in worktree-safety.test.mjs.
  const decision = planPreconditions({ ...CLEAN, branchWorktree: null, temporaryWorktreeBase: '/repo/.claude/worktrees' });
  assert.equal(decision.action, 'proceed');
  assert.equal(decision.temporaryWorktree.action, 'create');
});

test('main checked out nowhere refuses too', () => {
  assert.match(planPreconditions({ ...CLEAN, mainWorktree: null }).message, /main is checked out nowhere/);
});

test('either side being dirty refuses, and says WHICH side', () => {
  const onMain = planPreconditions({ ...CLEAN, isDirty: (wt) => wt === '/wt/main' });
  assert.match(onMain.message, /main's worktree is dirty \(\/wt\/main\)/);
  const onBranch = planPreconditions({ ...CLEAN, isDirty: (wt) => wt === '/wt/x' });
  assert.match(onBranch.message, /claude\/x's worktree is dirty \(\/wt\/x\)/);
});

// ── The landing itself ───────────────────────────────────────────────────────────────────────────
//
// This is the half that touches main, at night, with nobody watching. Every command it issues
// comes through injected deps, so each refusal below is exercised for real - what it returns AND,
// which matters more, how far it got before it stopped.

const MAIN_SHA = 'm'.repeat(40);
const VERIFIED = 'v'.repeat(40);

/**
 * Drive one `attemptLanding` pass over fake commands.
 *
 * `fail` holds substrings of the command lines that should come back non-zero; `calls` is every
 * command in the order it was issued, which is how "it stopped before touching main" is asserted.
 */
async function land({ fail = [], ci = true, noWait = true, mainAfterMerge = VERIFIED } = {}) {
  const calls = [];
  const landed = [];
  let merged = false;
  const fails = (label) => fail.some((f) => label.includes(f));

  const run = (cmd, args) => {
    const label = [cmd, ...args].join(' ');
    calls.push(label);
    if (fails(label)) return { status: 1 };
    if (label.includes('merge --ff-only')) merged = true;
    return { status: 0 };
  };
  const git = (args) => {
    const label = args.join(' ');
    calls.push(`git ${label}`);
    return label === 'rev-parse main' ? (merged ? mainAfterMerge : MAIN_SHA) : VERIFIED;
  };

  const log = console.log;
  const err = console.error;
  console.log = () => {};
  console.error = () => {};
  let outcome;
  try {
    outcome = await attemptLanding('/wt/main', '/wt/x', {
      branch: 'claude/x',
      noWait,
      run,
      git,
      waitForCi: async () => ci,
      afterLanding: (entry) => landed.push(entry),
    });
  } finally {
    console.log = log;
    console.error = err;
  }
  return { outcome, calls, landed, reached: (needle) => calls.some((c) => c.includes(needle)) };
}

test('a clean landing fast-forwards main, pushes it, and only then records', async () => {
  const { outcome, calls, landed } = await land();
  assert.equal(outcome, 0);
  assert.deepEqual(landed.map((e) => e.sha), [VERIFIED]);
  assert.equal(landed[0].branch, 'claude/x');

  // The merge into main is `--ff-only` and nothing else, ever: git itself then refuses unless the
  // branch already contains main, which is the last line of defence against a moved target.
  const intoMain = calls.filter((c) => c.startsWith('git -C /wt/main merge'));
  assert.deepEqual(intoMain, ['git -C /wt/main merge --ff-only claude/x']);

  // And the ledger line is written strictly after origin/main has it - a migration applied for a
  // landing that then refused would leave production on schema that is on nobody's main.
  assert.ok(
    calls.indexOf('git -C /wt/main push origin main') < calls.length,
    'the push to origin/main must have happened',
  );
});

test('a conflict integrating main aborts and stops, changing nothing on main', async () => {
  const { outcome, calls, landed, reached } = await land({ fail: ['merge --no-edit main'] });
  assert.equal(outcome, 1);
  assert.ok(calls.includes('git -C /wt/x merge --abort'), 'the half-merge must be aborted');
  assert.ok(!reached('push origin claude/x'), 'a conflicted branch must not be pushed for CI');
  assert.ok(!reached('merge --ff-only'), 'main must not be touched');
  assert.deepEqual(landed, []);
});

test('a red or damaged CI run stops before main is touched', async () => {
  const { outcome, landed, reached } = await land({ fail: ['--phase 3'] });
  assert.equal(outcome, 1);
  assert.ok(!reached('merge --ff-only'), 'a red gate must never reach the fast-forward');
  assert.deepEqual(landed, []);
});

test('CI that never appears is not read as a pass', async () => {
  const { outcome, reached } = await land({ ci: false, noWait: false });
  assert.equal(outcome, 1);
  assert.ok(!reached('--phase 3'), 'without a run there is nothing for phase 3 to judge');
  assert.ok(!reached('merge --ff-only'));
});

test('--no-wait skips only the WAIT, never the verdict', async () => {
  // The gate is phase 3 reading the run, not the wait. Skipping the wait must still leave the
  // verdict in place, or `--no-wait` would quietly become "land without CI".
  const { outcome, reached } = await land({ noWait: true });
  assert.equal(outcome, 0);
  assert.ok(reached('--phase 3'), 'phase 3 still judges the run');
});

test('main moving while the gate ran is reported as main-moved, not as a failure', async () => {
  const { outcome, reached } = await land({ fail: ['--phase 4'] });
  assert.equal(outcome, 'main-moved');
  assert.ok(!reached('merge --ff-only'), 'the target moved - nothing may be merged into it');
});

test('a fast-forward git refuses is a hard stop', async () => {
  const { outcome, landed, reached } = await land({ fail: ['merge --ff-only'] });
  assert.equal(outcome, 1);
  assert.ok(!reached('push origin main'), 'a refused fast-forward must not be pushed');
  assert.deepEqual(landed, []);
});

test('main not being the verified commit after the merge blocks the push', async () => {
  // The belt to the fast-forward's braces: whatever main ended up at, it is only pushed when it
  // is EXACTLY the commit CI went green on.
  const { outcome, landed, reached } = await land({ mainAfterMerge: 'z'.repeat(40) });
  assert.equal(outcome, 1);
  assert.ok(!reached('push origin main'), 'an unverified main must never reach origin');
  assert.deepEqual(landed, []);
});

test('a failed push to origin/main is not recorded as a landing', async () => {
  // main is landed locally and a person has to finish it. Recording it would tell SessionStart the
  // session is done and would let the migration push run for a landing nobody else can see.
  const { outcome, landed } = await land({ fail: ['push origin main'] });
  assert.equal(outcome, 1);
  assert.deepEqual(landed, []);
});

// ── Waiting for CI: dispatch instead of hoping, and which run to act on ─────────────────────────
//
// The verified sha is a merge commit this job just pushed, so its run arrives by GitHub's push
// webhook - which ran 28-40 minutes late on 2026-08-26, spending the whole wait budget on hope
// and refusing in words that read as a tree fault. And the run it did find could be the wrong
// one: `--limit 1` with no workflow filter once watched a deploy-verify run and handed phase 3
// a CI run still in flight, which refused a real landing.

/** Drive waitForCi over a scripted sequence of run listings, recording what it did. */
async function waitOver(listings, { ticks = 8, graceTicks = 3 } = {}) {
  const events = [];
  const said = [];
  let call = 0;
  const log = console.log;
  console.log = (line) => said.push(line);
  let ok;
  try {
    ok = await waitForCi('v'.repeat(40), {
      branch: 'claude/x',
      ticks,
      graceTicks,
      listRuns: () => listings[Math.min(call++, listings.length - 1)],
      watchRun: (id) => {
        events.push(`watch ${id}`);
        return { status: 0 };
      },
      dispatchRun: () => {
        events.push('dispatch');
        return { status: 0 };
      },
      sleep: async () => events.push('sleep'),
    });
  } finally {
    console.log = log;
  }
  return { ok, events, said };
}

test('no run appearing gets one DISPATCHED after the grace period, exactly once', async () => {
  const { ok, events } = await waitOver([[]], { ticks: 6, graceTicks: 3 });
  // The dispatch changes HOW it waits, never whether it gates: with nothing conclusive by the
  // end of the budget this is still a refusal.
  assert.equal(ok, false);
  assert.deepEqual(events.filter((e) => e === 'dispatch'), ['dispatch'], 'dispatched once, not per tick');
  // Grace first: ticks 0-2 are the webhook's, the dispatch comes at tick 3.
  assert.equal(events.indexOf('dispatch'), 3, 'three sleeps of grace before the dispatch');
});

test('a run appearing within the grace period means no dispatch at all', async () => {
  const { ok, events } = await waitOver([
    [],
    [{ databaseId: 7, status: 'in_progress', conclusion: '' }],
    [{ databaseId: 7, status: 'completed', conclusion: 'success' }],
  ]);
  assert.equal(ok, true);
  assert.ok(!events.includes('dispatch'), 'the webhook delivered - nothing to dispatch');
  assert.ok(events.includes('watch 7'));
});

test('a same-second tie with a cancelled push run watches the LIVE run, not the shell', async () => {
  // The ci.yml concurrency group is the ref, so a dispatch cancels the late push run - and when
  // both share a createdAt second, `gh run list` order is arbitrary and used to hand back the
  // cancelled one. databaseId is strict creation order, so the tie is broken there.
  const tie = [
    { databaseId: 100, status: 'completed', conclusion: 'cancelled' },
    { databaseId: 101, status: 'in_progress', conclusion: '' },
  ];
  const { ok, events } = await waitOver([
    tie,
    [tie[0], { databaseId: 101, status: 'completed', conclusion: 'success' }],
  ]);
  assert.equal(ok, true);
  assert.deepEqual(events.filter((e) => e.startsWith('watch')), ['watch 101'], 'the cancelled shell is never watched');
});

test('a red run is conclusive - the wait ends and phase 3 gives the verdict', async () => {
  const { ok, events } = await waitOver([[{ databaseId: 5, status: 'completed', conclusion: 'failure' }]]);
  assert.equal(ok, true, 'true means "a run exists to judge", never "it passed"');
  assert.ok(!events.includes('dispatch'), 'a verdict exists - re-running it would be retrying a refusal');
});

test('nothing but cancelled shells never reads as a run worth returning on', async () => {
  // A cancelled run proves nothing either way, so the wait keeps going - dispatching a real run
  // meanwhile - and gives up as a refusal if nothing conclusive ever arrives.
  const { ok, events } = await waitOver([[{ databaseId: 9, status: 'completed', conclusion: 'cancelled' }]], {
    ticks: 5,
    graceTicks: 3,
  });
  assert.equal(ok, false);
  assert.ok(events.includes('dispatch'));
  assert.ok(!events.some((e) => e.startsWith('watch')), 'a completed shell is nothing to watch');
});

test('a watch returning instantly still costs a tick - the budget cannot burn in seconds', async () => {
  // `gh run watch` returns immediately on a run still pending with zero jobs (j-0088). The
  // listing is the truth and the sleep is unconditional, so a stuck-pending run spends the
  // budget in ten-second ticks - ten minutes of patience - rather than spinning it away.
  const { ok, events } = await waitOver([[{ databaseId: 7, status: 'queued', conclusion: '' }]], { ticks: 4 });
  assert.equal(ok, false);
  assert.equal(events.filter((e) => e === 'sleep').length, 4, 'every tick sleeps');
  assert.equal(events.filter((e) => e === 'watch 7').length, 4, 'and every tick re-checks the listing first');
});

test('the run listing is filtered to ci.yml, so a deploy-verify run can never be watched', () => {
  // The default listRuns is what production uses; the filter lives in its gh arguments.
  // Normalised, because the working tree may hold CRLF and a match-assertion on a mis-sliced
  // body would fail here (a doesNotMatch would pass vacuously, which is worse).
  const normalised = source.replace(/\r\n/g, '\n');
  const body = normalised.slice(normalised.indexOf('export async function waitForCi'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.match(fn, /'--workflow', 'ci\.yml'/);
  assert.match(fn, /databaseId,status,conclusion/);
});

// ── The retry bound ─────────────────────────────────────────────────────────────────────────────

test('only main moving retries, and the retry is bounded', async () => {
  const err = console.error;
  const log = console.log;
  console.error = () => {};
  console.log = () => {};
  try {
    let tries = 0;
    const outcome = await landWithRetries(3, () => {
      tries += 1;
      return 'main-moved';
    });
    // Unbounded, this is a machine that looks busy all night and lands nothing.
    assert.equal(tries, 3);
    assert.equal(outcome, 1, 'giving up is a refusal, so the runner does not re-queue it forever');

    let second = 0;
    const landedOnRetry = await landWithRetries(3, () => {
      second += 1;
      return second === 1 ? 'main-moved' : 0;
    });
    assert.equal(landedOnRetry, 0);
    assert.equal(second, 2, 'a pass that succeeds stops the loop');

    // Every other outcome stops dead - a refusal is a person's cue, and retrying it would turn
    // "anything needing judgement stops" into "anything needing judgement is tried three times".
    let refusals = 0;
    assert.equal(await landWithRetries(3, () => { refusals += 1; return 1; }), 1);
    assert.equal(refusals, 1);
  } finally {
    console.error = err;
    console.log = log;
  }
});

test('a blocked landing exits with its own code, distinct from a failure', () => {
  // The runner reads 3 as "not my turn yet - put me back in the queue". Sharing an exit code with
  // a real failure would drop those landings on the floor.
  assert.match(source, /const BLOCKED_EXIT = 3;/);
  assert.match(source, /outcome === 'blocked' \? BLOCKED_EXIT : outcome/);
});

test('no module-level const is declared after the entry guard', () => {
  // `await main()` runs mid-module-evaluation, so a const declared after the guard is still in
  // its temporal dead zone during a REAL landing - and only a real landing: tests import, which
  // evaluates the whole module before any call. j-0102 crashed exactly this way on 2026-08-27
  // (DISPATCH_GRACE_TICKS, referenced by waitForCi's defaults), after the push and before the
  // CI wait. Function declarations hoist; consts must be initialised above the guard.
  const guard = source.indexOf('await main();');
  assert.ok(guard > 0, 'the entry guard must exist');
  assert.ok(
    source.indexOf('const DISPATCH_GRACE_TICKS') < guard,
    'DISPATCH_GRACE_TICKS must initialise before main() can run',
  );
  assert.doesNotMatch(
    source.slice(guard),
    /^const /m,
    'a top-level const after the entry guard is dead until main() has already run - declare it above the guard',
  );
});

test('importing the module does not land anything', () => {
  // The tests above import it. The entry guard is what keeps that from merging a branch, so it is
  // pinned rather than trusted.
  assert.match(source, /if \(process\.argv\[1\] && resolve\(process\.argv\[1\]\) === fileURLToPath\(import\.meta\.url\)\)/);
  const guard = source.indexOf('resolve(process.argv[1]) === fileURLToPath(import.meta.url)');
  assert.ok(guard > 0 && source.indexOf('await main();') > guard, 'main() must run inside the guard');
});

test('a wait that runs out says WHICH way, because the three answers ask for different things', () => {
  // One sentence for every way the wait can end is the reason this class of refusal read as a
  // fault in the branch. Red never reaches here at all - a red run is conclusive, and phase 3
  // gives that verdict.
  const sha = 'abcdef1234567890';

  const never = giveUpOnCi({ live: null, cancelled: null }, sha);
  assert.match(never, /no CI run ever appeared/);
  assert.match(never, /abcdef12/, 'the commit is in the sentence - a reader goes and looks');

  const cancelled = giveUpOnCi({ live: null, cancelled: { databaseId: 42, conclusion: 'cancelled' } }, sha);
  assert.match(cancelled, /every CI run on abcdef12 was cancelled \(newest 42\)/);
  assert.match(cancelled, /not red/, 'cancelled means look again, never a verdict');

  // A run STILL GOING is the commonest way the budget ends and the least like a fault. Calling
  // it cancelled would be the original defect in a new coat, so it gets its own sentence - and
  // it outranks a cancelled shell seen earlier in the same wait.
  const live = giveUpOnCi({ live: { databaseId: 77 }, cancelled: { databaseId: 42 } }, sha);
  assert.match(live, /run 77 on abcdef12 was still going/);
  assert.doesNotMatch(live, /cancelled/, 'a running run is not a cancelled one');
  assert.doesNotMatch(live, /no CI run ever appeared/);

  assert.equal(new Set([never, cancelled, live]).size, 3, 'three facts, three sentences');
});

test('the give-up reads the WHOLE wait, so one failed listing cannot erase what was seen', async () => {
  // `listRuns` answers a failed `gh` with [], deliberately. Reading only the last tick meant a
  // single rate-limited listing after fifty-nine ticks of watching a real run reported that no
  // run had ever appeared - sending the reader to look for something they had been watching.
  const live = [{ databaseId: 88, status: 'in_progress', conclusion: '' }];
  const { said } = await waitOver([live, live, live, []], { ticks: 4, graceTicks: 2 });
  assert.match(said.at(-1), /run 88 .* was still going/);

  // And the same for a run still in flight at the very end - the case the repo already has a
  // test for (a run stuck `queued` for the whole budget, measured on j-0088).
  const { said: stuck } = await waitOver([live], { ticks: 3, graceTicks: 2 });
  assert.match(stuck.at(-1), /still going/);
  assert.doesNotMatch(stuck.at(-1), /cancelled/);
});
