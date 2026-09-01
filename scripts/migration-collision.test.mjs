// The migration-number collision check has the same two silent failure directions every guard in
// this repo has, and neither announces itself:
//
//   too eager - a session is told its number is taken when it is not, and renumbers away from a
//               perfectly good slot. Two shapes cause it: the file re-reading its own earlier
//               commit, and a non-migration file under the same directory.
//   too shy   - two branches keep one number, merge cleanly, and the drifted ledger is found by
//               `npm run db:push` refusing, with both already on `main`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collisions,
  migrationVersion,
  nextFreeVersion,
  parseAddedPaths,
} from './migration-collision.mjs';

test('a migration path yields its version, and nothing else does', () => {
  assert.equal(migrationVersion('supabase/migrations/0053_teams.sql'), '0053');
  assert.equal(migrationVersion('supabase\\migrations\\0053_teams.sql'), '0053');
  assert.equal(migrationVersion('C:/claude/NoaCG-Studio/supabase/migrations/0053_teams.sql'), '0053');

  // The CLI's filename rule is `<digits>_<name>.sql`. Everything else in that directory claims
  // no number, and calling it a claim would report collisions that do not exist.
  assert.equal(migrationVersion('supabase/migrations/helpers.sql'), null);
  assert.equal(migrationVersion('supabase/migrations/0053_teams.sql.bak'), null);
  assert.equal(migrationVersion('supabase/config.toml'), null);
  assert.equal(migrationVersion('src/model/0053_teams.sql'), null);
});

test('the all-refs listing is read as (commit, path) pairs', () => {
  const output = [
    'a'.repeat(40),
    '',
    'supabase/migrations/0052_inherited_grants_tightened.sql',
    'supabase/migrations/0051_client_table_grants.sql',
    '',
    'b'.repeat(40),
    '',
    'supabase/migrations/0053_teams.sql',
    '',
  ].join('\n');

  assert.deepEqual(parseAddedPaths(output), [
    { sha: 'a'.repeat(40), path: 'supabase/migrations/0052_inherited_grants_tightened.sql' },
    { sha: 'a'.repeat(40), path: 'supabase/migrations/0051_client_table_grants.sql' },
    { sha: 'b'.repeat(40), path: 'supabase/migrations/0053_teams.sql' },
  ]);
  assert.deepEqual(parseAddedPaths(''), []);
});

test('another branch holding the number is a collision', () => {
  const added = [
    { sha: 'a'.repeat(40), path: 'supabase/migrations/0053_teams.sql' },
    { sha: 'b'.repeat(40), path: 'supabase/migrations/0052_inherited_grants_tightened.sql' },
  ];
  const clash = collisions('0053', 'supabase/migrations/0053_flake_ledger.sql', added);
  assert.deepEqual(clash.map((c) => c.path), ['supabase/migrations/0053_teams.sql']);
});

test('a file is never a collision with itself, however many commits carry it', () => {
  // The traversal reports every commit that ADDED a path, and a rebased or cherry-picked branch
  // adds the same path more than once. Reporting that as a collision would tell a session its own
  // migration is taken - the "too eager" failure, arriving on the most ordinary branch shape.
  const own = 'supabase/migrations/0053_teams.sql';
  const added = [
    { sha: 'a'.repeat(40), path: own },
    { sha: 'b'.repeat(40), path: own },
    { sha: 'c'.repeat(40), path: 'supabase/migrations/0052_inherited_grants_tightened.sql' },
  ];
  assert.deepEqual(collisions('0053', own, added), []);
  assert.deepEqual(collisions('0053', 'supabase\\migrations\\0053_teams.sql', added), []);
});

test('the same path from two sources is reported once', () => {
  // The hook asks twice on purpose - the working tree and every ref - and a migration that is both
  // on disk and committed appears in both answers. One number, one line.
  const own = 'supabase/migrations/0053_flake_ledger.sql';
  const other = 'supabase/migrations/0053_teams.sql';
  const clash = collisions('0053', own, [
    { sha: null, path: other },
    { sha: 'a'.repeat(40), path: other },
  ]);
  assert.equal(clash.length, 1);
});

test('the number to use instead is the lowest above everything claimed anywhere', () => {
  assert.equal(nextFreeVersion(['0051', '0052', '0053']), '0054');
  // A number claimed on a branch nobody has merged still counts - that is the whole point.
  assert.equal(nextFreeVersion(['0052', '0060']), '0061');
  assert.equal(nextFreeVersion([]), '0001');
  assert.equal(nextFreeVersion(['0009']), '0010');
});
