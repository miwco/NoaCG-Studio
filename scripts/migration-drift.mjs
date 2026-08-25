#!/usr/bin/env node
// Does PRODUCTION hold every migration this repository has?
//
// WHY THIS EXISTS. Migrations live in the repo, but nothing applies them: `supabase db push` is a
// deliberate human act. On 2026-08-25 that gap showed itself - 0051_client_table_grants.sql landed
// on main, was verified against a local stack and against CI, and sat UNAPPLIED on production for
// hours. Nothing anywhere would have said so; it was found by running `supabase migration list`
// for an unrelated reason. A gap that only a coincidence closes is not closed.
//
// WHY IT IS NOT A CI JOB. The migration ledger lives in `supabase_migrations.schema_migrations`,
// which PostgREST does not expose, so reading it remotely needs the Supabase MANAGEMENT API and a
// personal access token. That token is ACCOUNT-WIDE - it enumerates every organisation and
// project, and the same API deletes them - and this repository is public. Putting it in Actions
// would hand a credential far more dangerous than anything the suite was carefully kept away from
// (docs/VERIFICATION.md, configured-suite). So the check runs LOCALLY, where the token already
// lives in .env, at the moment a human is about to land something.
//
// IT NEVER FAILS THE CALLER. Absent credentials, an offline laptop, a slow API: all report and
// exit 0. A check that blocks a landing because someone is on a train is a check people delete.
//
//   node scripts/migration-drift.mjs          # human-readable
//   node scripts/migration-drift.mjs --json   # one JSON line, for the preflight
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 15_000;

/**
 * Where a .env might be. THE PRIMARY CHECKOUT IS IN THIS LIST ON PURPOSE: `.env` is gitignored, so
 * a linked worktree does not have one, and this check's whole point is to run from a worktree
 * during safe-merge. Looking only beside the script would make it skip in exactly the place it was
 * added for - a check that is always "not checked" is worse than no check, because it reads as
 * reassurance.
 */
function envCandidates() {
  const paths = [path.join(ROOT, '.env')];
  try {
    // `--git-common-dir` is the SHARED .git; its parent is the primary working tree. In the
    // primary checkout this resolves to the same file already listed, which is harmless.
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (common) paths.push(path.join(path.dirname(common), '.env'));
  } catch {
    // Not a git checkout, or an old git without --path-format: the local .env is all we have.
  }
  return paths;
}

/** Read a key from the nearest .env WITHOUT pulling in a dependency, and without exporting it into
 *  the environment - the value is used for one fetch and then forgotten. */
function fromEnvFile(key) {
  if (process.env[key]) return process.env[key];
  let text;
  for (const candidate of envCandidates()) {
    try {
      text = readFileSync(candidate, 'utf8');
      break;
    } catch {
      // try the next one
    }
  }
  if (text === undefined) return '';
  // Last assignment wins, matching how a shell would source the file.
  let value = '';
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match && match[1] === key) value = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return value;
}

/**
 * The project this repository calls production, taken from the URL the CLIENT is built against.
 *
 * Deliberately NOT `supabase/.temp/project-ref`: that is the CLI's LINK state, it is per-checkout,
 * and a worktree linked to a staging project would make this check quietly answer about the wrong
 * database - which is exactly the kind of confident wrong answer this script exists to prevent.
 */
function productionRef() {
  const url = fromEnvFile('VITE_SUPABASE_URL');
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(url || '');
  return match ? match[1] : '';
}

/** Migration versions on disk, using the CLI's own filename rule (`<digits>_<name>.sql`). A glob
 *  would also count a stray helpers.sql and report drift that does not exist. */
function localVersions() {
  let names;
  try {
    names = readdirSync(path.join(ROOT, 'supabase', 'migrations'));
  } catch {
    return [];
  }
  return names
    .map((name) => /^([0-9]+)_.*\.sql$/.exec(name))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();
}

/**
 * The ledger, over the management API.
 *
 * An explicit AbortController with a timer this function CLEARS, rather than
 * `AbortSignal.timeout()`: that helper leaves a live libuv handle behind, and exiting while it is
 * closing aborts the process on Windows - `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`
 * and exit code 127, with the correct answer already printed above it. A caller reading the exit
 * code would have seen a hard failure from a check that had just succeeded.
 */
async function remoteVersions(ref, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'select version from supabase_migrations.schema_migrations order by version' }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`management API answered ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body)) throw new Error(body?.message || 'unexpected response shape');
    return body.map((row) => String(row.version)).sort();
  } finally {
    clearTimeout(timer);
  }
}

/** Decide, without printing or exiting - so the shape is testable and the process ends naturally. */
async function drift() {
  const local = localVersions();
  if (local.length === 0) return { status: 'skipped', detail: 'no migrations found on disk' };

  const ref = productionRef();
  const token = fromEnvFile('SUPABASE_ACCESS_TOKEN');
  if (!ref || !token) {
    return {
      status: 'skipped',
      detail: !ref ? 'VITE_SUPABASE_URL is not set (no .env?)' : 'SUPABASE_ACCESS_TOKEN is not set',
    };
  }

  try {
    const remote = await remoteVersions(ref, token);
    const have = new Set(remote);
    const missing = local.filter((v) => !have.has(v));
    return missing.length
      ? { status: 'drift', missing, local: local.length, remote: remote.length, ref }
      : { status: 'ok', local: local.length, remote: remote.length, ref };
  } catch (error) {
    // Offline, throttled, token expired: say so and stand down. Reporting "unknown" is honest;
    // reporting "fine" would be the failure this script is named after.
    return { status: 'skipped', detail: error instanceof Error ? error.message : String(error) };
  }
}

const result = await drift();
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result));
} else if (result.status === 'drift') {
  console.error(`Production is missing ${result.missing.length} migration(s): ${result.missing.join(', ')}`);
  console.error('Apply them from the MAIN checkout (which is linked to production): npx supabase db push --linked');
} else if (result.status === 'ok') {
  console.log(`Production holds all ${result.local} migration(s).`);
} else {
  console.log(`Migration drift not checked: ${result.detail}`);
}
// No process.exit: this check never fails its caller, and letting node end on its own is what
// keeps that true on Windows.
