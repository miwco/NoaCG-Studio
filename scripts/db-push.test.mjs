// The guard on `npm run db:push` is this classifier, not the prose that describes it.
//
// `scripts/db-push.mjs` applies pending migrations to the hosted project unattended. The only thing
// standing between that and a `drop table documents` is `classifyStatement`, so the dangerous cases
// are FIXTURES here rather than sentences there. Two halves, and both matter:
//
//   1. The dangerous shapes are refused, and the near-misses that read like them are not. `for
//      delete` in a policy, `on delete cascade` in a column, `grant delete` and the word "drop" in
//      a comment all look exactly like the real thing to a regex - and a guard that cries wolf on
//      the ordinary migration is a guard somebody switches off.
//   2. Every migration in the repository classifies with no UNKNOWN statement. The classifier fails
//      CLOSED, so an unrecognised statement shape refuses the push; that is only tolerable if the
//      recognised set actually covers what this project's migrations do. This half is what keeps it
//      covering them as more are written - a new statement shape fails HERE, at build time, rather
//      than at the moment somebody is trying to land something.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { classifyMigration, classifyStatement, normalize, splitStatements } from './db-push.mjs';

const verdict = (sql, created = []) => classifyStatement(sql, new Set(created)).verdict;
const reasons = (sql, created = []) => classifyStatement(sql, new Set(created)).reasons.map((r) => r.id);

// ── The lexer: a statement this cannot see whole is a statement it cannot judge ───────────────────

test('splits on semicolons outside quotes, comments and dollar-quoted bodies', () => {
  const sql = `
    create table a (id int);
    -- a comment with ; in it
    /* a /* nested */ block ; comment */
    insert into a values (1);
    do $$ begin perform 1; perform 2; end $$;
    select 'a ; b', "col;name" from a;
  `;
  const parts = splitStatements(sql);
  assert.equal(parts.length, 4);
  assert.match(parts[0].raw, /create table a/);
  assert.match(parts[2].raw, /do \$\$/);
  // The DO block is ONE statement, not three: a body split into pieces would be classified in
  // pieces, and the pieces of a dangerous body look harmless.
  assert.match(parts[2].raw, /perform 2/);
});

test('a dollar-quote with a tag closes only on the same tag', () => {
  const sql = `create function f() returns void language plpgsql as $fn$ begin perform $$x$$; end $fn$;`;
  assert.equal(splitStatements(sql).length, 1);
});

test('normalize keeps quoted identifiers but blanks string contents', () => {
  const { code } = normalize(`insert into t values ('drop table documents')`);
  assert.equal(code, "insert into t values ('')");
  assert.match(normalize(`alter table "documents" drop column "x"`).code, /alter table documents drop column x/);
});

test('a comment mentioning a dangerous verb is prose, not a statement', () => {
  assert.equal(verdict('-- we never drop or truncate anything\ncreate index i on t (c)'), 'safe');
  assert.equal(verdict('/* dropping this would lose data */ grant select on table public.t to anon'), 'safe');
});

// ── The dangerous set ────────────────────────────────────────────────────────────────────────────

test('DROP of an object is refused, in every spelling', () => {
  assert.equal(verdict('drop table public.documents'), 'dangerous');
  assert.equal(verdict('drop table if exists public.documents cascade'), 'dangerous');
  assert.equal(verdict('alter table public.documents drop column body'), 'dangerous');
  assert.equal(verdict('alter table public.documents drop body'), 'dangerous');
  assert.equal(verdict('drop policy "documents_select_own" on public.documents'), 'dangerous');
  assert.equal(verdict('drop function public.is_moderator()'), 'dangerous');
  assert.equal(verdict('drop index if exists public.assets_user_idx'), 'dangerous');
  assert.deepEqual(reasons('drop table public.documents'), ['drop']);
});

test('DROP DEFAULT and DROP NOT NULL relax a constraint and remove no object', () => {
  assert.equal(verdict('alter table public.documents alter column name drop default'), 'safe');
  assert.equal(verdict('alter table public.documents alter column name drop not null'), 'safe');
});

test('TRUNCATE, DELETE FROM, a type change and a rename are refused', () => {
  assert.equal(verdict('truncate table public.control_events'), 'dangerous');
  assert.equal(verdict('delete from public.control_events where created_at < now()'), 'dangerous');
  assert.equal(verdict('alter table public.assets alter column bytes type bigint'), 'dangerous');
  assert.equal(verdict('alter table public.assets alter column bytes set data type bigint'), 'dangerous');
  assert.equal(verdict('alter table public.assets rename to attachments'), 'dangerous');
  assert.equal(verdict('alter table public.assets rename column bytes to size_bytes'), 'dangerous');
});

test('turning RLS off, changing an owner and setting a database option are refused', () => {
  assert.equal(verdict('alter table public.documents disable row level security'), 'dangerous');
  assert.equal(verdict('alter function public.is_moderator() owner to postgres'), 'dangerous');
  // `db reset` wipes schemas but NOT database settings, so this outlives every reset and quietly
  // does a later fix's work for it (supabase/AGENTS.md).
  assert.equal(verdict("alter database postgres set search_path to 'public, extensions'"), 'dangerous');
});

test('a dangerous statement hidden in a dollar-quoted body is still found', () => {
  assert.equal(verdict('do $$ begin drop table public.documents; end $$'), 'dangerous');
  assert.equal(verdict('do $$ begin delete from public.documents; end $$'), 'dangerous');
  assert.equal(
    verdict('create function f() returns void language plpgsql as $$ begin drop table public.assets; end $$'),
    'dangerous',
  );
  // …but prose and message strings inside a body are not SQL.
  assert.equal(
    verdict("do $$ begin -- never drop this\n  raise exception 'refusing to truncate'; end $$"),
    'safe',
  );
});

test('a DO block runs now; a function body runs later, so only the DO block is judged on rows', () => {
  // The retention crons are functions that delete old rows on a schedule (0037, 0039). Creating
  // one removes nothing - the deleting happens later, on rows that do not exist yet - so treating
  // a function body's DELETE as a push-time loss would refuse every retention migration forever.
  assert.equal(
    verdict('create function public.prune() returns void language sql as $$ delete from public.control_events where created_at < now() - interval \'14 days\' $$'),
    'safe',
  );
  // A DO block executes during the push, so the same statement inside one is a real deletion.
  assert.equal(verdict('do $$ begin delete from public.control_events; end $$'), 'dangerous');
  // The schema rules still reach a function body: what it will DROP is not future behaviour a
  // later migration can undo by adding one.
  assert.equal(
    verdict('create function public.f() returns void language sql as $$ drop table public.documents $$'),
    'dangerous',
  );
});

test('a self-check that inserts a throwaway row and deletes it again is the documented shape', () => {
  // supabase/AGENTS.md: "a self-check proves SHAPE, never behaviour - so CALL the thing", which
  // means insert a row against a real owner, run the function, assert the effect, delete the row.
  const selfCheck = `do $$
    begin
      insert into public.control_shows (id, owner_id, title) values ('…', '…', 'self-check');
      perform public.control_show_by_slug('x');
      delete from public.control_shows where id = '…';
    end $$`;
  assert.equal(verdict(selfCheck), 'safe');
  // Deleting from a table the block never inserted into is not that shape, and is not excused.
  const sweep = `do $$
    begin
      insert into public.control_shows (id) values ('…');
      delete from public.documents where user_id is null;
    end $$`;
  assert.equal(verdict(sweep), 'dangerous');
});

test('drop-and-recreate is a replacement; a bare drop is a removal', () => {
  // A trigger, a policy and a constraint have no `create or replace`, so redefining one means
  // dropping it first. Net, nothing is removed - and refusing this shape would make the override
  // the normal path.
  const replaced = `
    drop trigger if exists t_updated_at on public.t;
    create trigger t_updated_at before update on public.t for each row execute function public.set_updated_at();
  `;
  assert.equal(classifyMigration('9999', 'replace', replaced).blocked, false);
  const removed = `drop trigger if exists t_updated_at on public.t;`;
  assert.equal(classifyMigration('9999', 'remove', removed).blocked, true);
});

// ── The near-misses: shapes that read like the dangerous set and are not ──────────────────────────

test('the word "delete" as a privilege, a policy command or an FK action is not a DELETE', () => {
  assert.equal(verdict('grant select, insert, update, delete on table public.documents to authenticated'), 'safe');
  assert.equal(verdict('create policy "d" on public.assets for delete to authenticated using (true)'), 'safe');
  assert.equal(verdict('create table t (doc uuid references public.documents (id) on delete cascade)'), 'safe');
});

test('the ordinary migration vocabulary passes', () => {
  assert.equal(verdict('create table if not exists public.t (id uuid primary key)'), 'safe');
  assert.equal(verdict('create index if not exists t_idx on public.t (id)'), 'safe');
  assert.equal(verdict('alter table public.t enable row level security'), 'safe');
  assert.equal(verdict('alter table public.t add column extra text not null default \'\''), 'safe');
  assert.equal(verdict('create policy "p" on public.t for select to authenticated using (true)'), 'safe');
  assert.equal(verdict('create or replace function public.f() returns int language sql as $$ select 1 $$'), 'safe');
  assert.equal(verdict('comment on table public.t is \'a table\''), 'safe');
  assert.equal(verdict('create extension if not exists pgcrypto with schema extensions'), 'safe');
  assert.equal(verdict('insert into public.storage_quotas (bucket) values (\'user-assets\')'), 'safe');
  assert.equal(verdict('update public.plans set label = \'Free\' where key = \'free\''), 'safe');
});

// ── REVOKE: the rule that decides whether the lock-down idiom is noise or a finding ───────────────

test('a REVOKE on an object the same migration created removes nothing', () => {
  const sql = `
    create table public.new_table (id uuid primary key);
    revoke all on table public.new_table from public, anon, authenticated;
    grant select, insert on table public.new_table to service_role;
  `;
  // This is the idiom every table from 0010 on uses. If it refused, the guard would refuse almost
  // every migration that adds a table, and the override would become routine.
  assert.equal(classifyMigration('9999', 'new_table', sql).blocked, false);
});

test('a REVOKE on a pre-existing object is refused, and says which', () => {
  const sql = `revoke truncate, references, trigger on table public.documents from anon, authenticated;`;
  const result = classifyMigration('9999', 'tighten', sql);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.findings[0].reasons.map((r) => r.id), ['revoke']);
  assert.match(result.findings[0].reasons[0].why, /documents/);
  assert.match(result.findings[0].reasons[0].why, /anon, authenticated/);
});

test('a REVOKE listing several new tables clears every one of them, not just the first', () => {
  // Each object after a comma arrives with a leading space, so a name that keeps its `public.`
  // prefix misses what the migration created and the lock-down idiom starts refusing itself.
  const sql = `
    create table public.a (id uuid primary key);
    create table public.b (id uuid primary key);
    revoke all on table public.a, public.b from public, anon, authenticated;
  `;
  assert.equal(classifyMigration('9999', 'two_tables', sql).blocked, false);
});

test('a REVOKE naming one new table and one old one is refused for the old one', () => {
  const sql = `
    create table public.new_table (id uuid primary key);
    revoke all on table public.new_table, public.documents from anon;
  `;
  assert.equal(classifyMigration('9999', 'mixed', sql).blocked, true);
});

test('REVOKE ... ON ALL TABLES IN SCHEMA cannot be limited to this migration', () => {
  const sql = `
    create table public.new_table (id uuid primary key);
    revoke all on all tables in schema public from anon;
  `;
  assert.equal(classifyMigration('9999', 'sweeping', sql).blocked, true);
});

test('a REVOKE of function EXECUTE follows the same rule', () => {
  const created = `
    create function public.f() returns int language sql as $$ select 1 $$;
    revoke all on function public.f() from public, anon, authenticated;
  `;
  assert.equal(classifyMigration('9999', 'definer', created).blocked, false);
  // Revoking EXECUTE on a predicate a policy names is an OUTAGE, not a hardening
  // (supabase/AGENTS.md) - exactly the class that must reach a human.
  assert.equal(verdict('revoke execute on function public.is_suspended() from authenticated'), 'dangerous');
});

// ── Fail closed ──────────────────────────────────────────────────────────────────────────────────

test('an unrecognised statement shape refuses rather than passing', () => {
  const result = classifyStatement('cluster public.documents using documents_pkey');
  assert.equal(result.verdict, 'unknown');
  assert.deepEqual(result.reasons.map((r) => r.id), ['unrecognised']);
});

test('an empty or comment-only statement is not a finding', () => {
  assert.equal(verdict('   '), 'safe');
  assert.equal(verdict('-- just a note'), 'safe');
});

// ── The repository's own migrations ───────────────────────────────────────────────────────────────

const dir = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(dir)).filter((f) => /^[0-9]+_.*\.sql$/.test(f)).sort();

test('every shipped migration parses into statements this guard can judge', async () => {
  const unrecognised = [];
  for (const file of files) {
    const [, version, name] = /^([0-9]+)_(.*)\.sql$/.exec(file);
    const result = classifyMigration(version, name, await readFile(new URL(file, dir), 'utf8'));
    for (const finding of result.findings) {
      if (finding.verdict === 'unknown') unrecognised.push(`${file}:${finding.line} ${finding.excerpt}`);
    }
  }
  assert.deepEqual(
    unrecognised,
    [],
    'These statements are neither recognised as safe nor matched by a danger rule, so db-push would\n' +
      'refuse them and every migration behind them. Either add the shape to SAFE_VERBS in\n' +
      'scripts/db-push.mjs (with a reason it cannot lose anything) or give it a danger rule:\n  ' +
      unrecognised.join('\n  '),
  );
});

test('the migrations that reshape a live security record are the ones flagged', async () => {
  const flagged = [];
  for (const file of files) {
    const [, version, name] = /^([0-9]+)_(.*)\.sql$/.exec(file);
    const result = classifyMigration(version, name, await readFile(new URL(file, dir), 'utf8'));
    if (result.blocked) flagged.push(file);
  }
  // Not a fixed list - a newly flagged migration is a real event, not a test to update blindly.
  // What this asserts is the RATIO: if most of the catalog were flagged, the override would be the
  // normal path and the guard would mean nothing. Six of fifty-one flag today, and every one is a
  // change to a live security record or a real row deletion: 0020, 0041 and 0042 revoke EXECUTE on
  // functions that already existed, 0030 makes the audit log append-only by revoking from
  // service_role, 0037 deletes funnel rows outright, and 0040's self-check deletes from a table a
  // trigger - not the block itself - had filled.
  assert.ok(
    flagged.length <= files.length / 4,
    `${flagged.length} of ${files.length} migrations are flagged; the override is supposed to be ` +
      `rare:\n  ${flagged.join('\n  ')}`,
  );
});
