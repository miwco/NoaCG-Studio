// The docs-index gate's RULES, pinned - for the same reason `scripts/e2e-affected.test.mjs`
// pins the planner's: every failure mode here is silent by construction. A gate that reports OK
// over an incomplete map is indistinguishable from a complete one, and the whole point of the
// map is that absence from it means the doc does not exist.
//
// `auditDocsIndex` and `indexedDocs` are pure, so the rules are driven with literal file lists
// and literal README text - no docs/ directory, no fixtures on disk.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auditDocsIndex, indexedDocs } from './check-docs-index.mjs';

const table = (...rows) => ['| Doc | What |', '|---|---|', ...rows.map((r) => `| \`${r}\` | a doc. |`)].join('\n');

test('a doc with no row is reported', () => {
  const { missing } = auditDocsIndex(['A.md', 'B.md'], ['A.md', 'B.md'], table('A.md'));
  assert.deepEqual(missing, ['B.md']);
});

test('a complete map reports nothing at all', () => {
  const r = auditDocsIndex(['A.md', 'B.md'], ['A.md', 'B.md'], table('A.md', 'B.md'));
  assert.deepEqual(r, { missing: [], orphaned: [], duplicated: [] });
});

test('a row naming a file that is not there is reported', () => {
  // What a rename leaves behind. Worse than no row: it sends a reader after a file that moved.
  const { orphaned } = auditDocsIndex(['A.md'], ['A.md'], table('A.md', 'GONE.md'));
  assert.deepEqual(orphaned, ['GONE.md']);
});

test('two rows for one doc are reported', () => {
  // THE MERGE HAZARD. Two branches adding a row for the same doc in different sections merge
  // CLEANLY and leave the map self-contradictory, with nothing else to notice it.
  const { duplicated } = auditDocsIndex(['A.md'], ['A.md'], table('A.md', 'A.md'));
  assert.deepEqual(duplicated, ['A.md']);
});

test('a doc MENTIONED in another row is not counted as indexed', () => {
  // The measurement the backlog item warned about: a substring search over the README counts
  // prose mentions and reports the map as far more complete than it is. Only the FIRST CELL of
  // a table row counts.
  const readme = ['| Doc | What |', '|---|---|', '| `A.md` | see also `B.md` for the rest. |'].join('\n');
  assert.deepEqual(indexedDocs(readme), ['A.md']);
  assert.deepEqual(auditDocsIndex(['A.md', 'B.md'], ['A.md', 'B.md'], readme).missing, ['B.md']);
});

test('a subdirectory row is allowed, and still has to exist', () => {
  const readme = table('A.md', 'acceptance/WALK.md');
  assert.deepEqual(auditDocsIndex(['A.md'], ['A.md', 'acceptance/WALK.md'], readme).orphaned, []);
  assert.deepEqual(auditDocsIndex(['A.md'], ['A.md'], readme).orphaned, ['acceptance/WALK.md']);
});

test('subdirectory docs are NOT required to have a row', () => {
  // handoffs/, backlog/ and acceptance/owner-queue/ are per-session or transient; requiring a
  // row for each would make the gate fire on every session's own handoff.
  const r = auditDocsIndex(['A.md'], ['A.md', 'handoffs/2026-08-30-x.md', 'backlog/y.md'], table('A.md'));
  assert.deepEqual(r.missing, []);
});

// The gate has to be true of the REAL docs/README.md, not only of literals - otherwise it can
// pass its unit tests while the build check it backs is broken.
test('the real docs/README.md is fully indexed', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const readme = readFileSync(`${root}docs/README.md`, 'utf8');
  const rows = indexedDocs(readme);
  assert.ok(rows.length > 60, `expected the map to carry the whole directory, found ${rows.length} rows`);
  assert.match(readme, /check-docs-index\.mjs/, 'the header must name the gate that keeps the map closed');
});
