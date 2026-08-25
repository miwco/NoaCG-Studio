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

import { planMigrationPush } from './auto-merge.mjs';

const source = await readFile(new URL('./auto-merge.mjs', import.meta.url), 'utf8');

// ── The decision ─────────────────────────────────────────────────────────────────────────────────

test('production already holding every migration is the quiet case', () => {
  // Nearly every landing. It must say nothing, or the useful lines drown.
  assert.deepEqual(planMigrationPush(JSON.stringify({ status: 'ok', local: 52, remote: 52 })), { action: 'skip' });
});

test('a missing migration is pushed, and the report rides along', () => {
  const drift = { status: 'drift', missing: ['0052'], ref: 'kprolrchuldgfrzspthy', local: 52, remote: 51 };
  const decision = planMigrationPush(JSON.stringify(drift));
  assert.equal(decision.action, 'push');
  assert.deepEqual(decision.drift.missing, ['0052']);
});

test('--no-db-push stands down before reading anything', () => {
  // For a machine that must never write to the hosted project. It has to win over a real drift
  // report, not merely over a quiet one.
  const drift = JSON.stringify({ status: 'drift', missing: ['0052'], ref: 'x' });
  assert.deepEqual(planMigrationPush(drift, { noDbPush: true }), { action: 'skip' });
});

test('an unreadable report is REPORTED, never read as "production is fine"', () => {
  // migration-drift.mjs never fails its caller, so empty output means it did not run at all.
  // Treating that as healthy is the exact failure it is named after.
  for (const broken of ['', 'not json', '<html>500</html>']) {
    const decision = planMigrationPush(broken);
    assert.equal(decision.action, 'report', `"${broken}" must not be read as healthy`);
    assert.match(decision.message, /npm run db:push/);
  }
});

test('no token or no network says so once, and does not push', () => {
  const decision = planMigrationPush(JSON.stringify({ status: 'skipped', detail: 'SUPABASE_ACCESS_TOKEN is not set' }));
  assert.equal(decision.action, 'report');
  assert.match(decision.message, /SUPABASE_ACCESS_TOKEN is not set/);
});

// ── The order, and what a failure may cost ───────────────────────────────────────────────────────

test('the migration push happens only after the branch is on origin/main', () => {
  // If this ever ran earlier, a migration could be applied for a landing that then refused - and
  // production would be running schema that is on nobody's main.
  const pushedToOrigin = source.indexOf("'push', 'origin', 'main'");
  const appliedMigrations = source.indexOf('applyPendingMigrations();');
  assert.ok(pushedToOrigin > 0 && appliedMigrations > 0, 'both steps must still exist');
  assert.ok(
    appliedMigrations > pushedToOrigin,
    'applyPendingMigrations() must come after the push to origin/main, not before',
  );
});

test('nothing in the migration push can fail the landing', () => {
  const body = source.slice(source.indexOf('function applyPendingMigrations()'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  // The merge is already pushed by this point. A refusal here is the guard working, and an error
  // is still not a failed landing - so this function must never hand back a failing exit code.
  assert.doesNotMatch(fn, /\breturn\s+refuse\b/, 'refuse() ends the job as a failure');
  assert.doesNotMatch(fn, /process\.exit/, 'exiting here abandons a landing that already happened');
  assert.doesNotMatch(fn, /\bthrow\b/, 'a throw here would surface as a failed landing');
});

test('the landing is recorded before the push is attempted', () => {
  // The landed ledger is what SessionStart and `npm run jobs` read to say a session is done. A
  // slow or hanging push must not be able to delay that answer.
  assert.ok(
    source.indexOf('recordLanding({') < source.indexOf('applyPendingMigrations();'),
    'recordLanding() must come first',
  );
});

test('importing the module does not land anything', () => {
  // The tests above import it. The entry guard is what keeps that from merging a branch, so it is
  // pinned rather than trusted.
  assert.match(source, /if \(process\.argv\[1\] && resolve\(process\.argv\[1\]\) === fileURLToPath\(import\.meta\.url\)\)/);
  const guard = source.indexOf('resolve(process.argv[1]) === fileURLToPath(import.meta.url)');
  assert.ok(guard > 0 && source.indexOf('await main();') > guard, 'main() must run inside the guard');
});
