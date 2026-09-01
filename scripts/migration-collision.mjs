// DOES THIS MIGRATION NUMBER ALREADY BELONG TO SOMEBODY ELSE? - the pure half of that question.
//
// WHY IT EXISTS. A migration number is a SCARCE SLOT with no allocator: whoever writes
// `supabase/migrations/0053_*.sql` claims 0053, and nothing tells the next session that 0053 is
// taken. Two branches that both mint 0053 touch no common file, so `git merge-tree` calls them
// disjoint, `merge-order.mjs` returns `clear`, and both land cleanly - into a ledger holding two
// different 0053s. Every mechanism downstream then disagrees about what 0053 is: `db-push.mjs`
// applies whichever it reads first and refuses onto the drifted ledger afterwards
// (`supabase/AGENTS.md`), and `migration-drift.mjs` compares versions, so it sees one 0053 present
// and reports no drift at all. This is the archetype `scripts/merge-order.mjs` calls a SILENT
// MERGE FILE, and the numbers are the one instance of it a hook can catch at the moment of the
// mistake rather than at the merge.
//
// The git I/O lives in the hook that calls this (`scripts/hooks/warn-edit.mjs`); everything here
// is pure, so both halves of the answer - what counts as a collision, and what to use instead -
// are testable without a repository.

/**
 * The version a migration path claims, or null when the path is not a migration.
 *
 * The filename rule is the Supabase CLI's own (`<digits>_<name>.sql`), the same one
 * `migration-drift.mjs` reads versions by - a looser glob would count a stray `helpers.sql` as a
 * claim on nothing.
 */
export function migrationVersion(relPath) {
  const match = /(?:^|\/)supabase\/migrations\/(\d+)_[^/]*\.sql$/.exec(String(relPath).replaceAll('\\', '/'));
  return match ? match[1] : null;
}

/**
 * The `(sha, path)` pairs in `git log --diff-filter=A --name-only --format=%H` output.
 *
 * One traversal over every ref answers for every branch at once, which matters: this machine
 * routinely carries ninety-odd local branches, and one `git ls-tree` each would cost seconds on
 * the one hook where the session is waiting.
 */
export function parseAddedPaths(text) {
  const pairs = [];
  let sha = null;
  for (const line of String(text).split('\n')) {
    const value = line.trim();
    if (value === '') continue;
    if (/^[0-9a-f]{40}$/.test(value)) {
      sha = value;
      continue;
    }
    if (sha) pairs.push({ sha, path: value });
  }
  return pairs;
}

/**
 * The other places `version` is already claimed, given every migration path ever added anywhere.
 *
 * Compared by PATH rather than by version alone, so re-reading the file you just wrote - or an
 * earlier commit of it, on this same branch - is not a collision with itself. A different NAME on
 * the same number is a collision even inside one branch's history, because the ledger keys on the
 * number and would then hold two rows claiming to be the same migration.
 */
export function collisions(version, ownPath, added) {
  const own = String(ownPath).replaceAll('\\', '/');
  const seen = new Set();
  return added.filter(({ path }) => {
    if (path === own || migrationVersion(path) !== version) return false;
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}

/**
 * The lowest version above everything claimed anywhere, in the four-digit shape this repo uses.
 *
 * The message names it because a collision warning that only says "taken" leaves the session to
 * re-derive the answer from a directory listing that is, by construction, not the whole story.
 */
export function nextFreeVersion(versions) {
  const highest = versions.reduce((max, value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return String(highest + 1).padStart(4, '0');
}
