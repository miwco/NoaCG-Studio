#!/usr/bin/env node
// WHAT THIS MACHINE IS HOLDING FOR NOTHING, AND HOW TO GET IT BACK.
//
//   npm run reclaim                              names what it would close, frees nothing
//   npm run reclaim -- --apply                   closes the allowlist, reports what came back
//   npm run reclaim -- --apply --include-heavy   also closes the Codex app and Antigravity
//
// This is a 16 GB laptop and the number of sessions a wave can run is set by free RAM, nothing
// else. The job queue refuses to start work below a 4 GB floor (`POLICY.freeMemFloorMb` in
// `jobs-store.mjs`), and it is routinely refused by memory that no process is doing anything
// with: an Adobe helper tree with two bundled node servers of its own, a drive-discovery service
// for a drive nobody has plugged in, a Stream Deck daemon, an ASUS toy. Three hundred megabytes
// of nothing, on a machine where three hundred megabytes decides whether a gate starts.
//
// AND THEN THE FIRST REAL RUN SAID SOMETHING BETTER, which is why the dry run leads. Most of that
// three hundred megabytes is watchdogged: closing WD Discovery and the Creative Cloud helper held
// for about ten seconds before their services put them back, larger, and left the machine 570 MB
// WORSE than before the kill. So the useful output of this tool is mostly the list, not the kills.
// It says which memory would stay free (Stream Deck, and the two heavy apps behind the second
// flag) and which would come straight back, and it declines to count the second kind as won.
//
// THIS IS NOT `ram-reclaim.mjs`, WHICH SITS BESIDE IT. That module is about WRECKAGE - processes
// a detector has proved orphaned, closed automatically once the runner has been starved for a
// quarter of an hour. This one is about background apps that are not orphaned at all: they are
// running exactly as their vendors intended, and they are worth nothing here. The two have
// opposite safety arguments, which is why they are two files rather than one list.
//
// THE SAFETY ARGUMENT IS THE ALLOWLIST AND NOTHING ELSE, AND IT IS NOT AN OVERSIGHT.
//
// There is no reliable "is this app in use" signal on Windows. `MainWindowHandle` reads 0 even for
// apps with a visible window - the Codex app runs eleven processes and reports zero main windows -
// so `CloseMainWindow()` is not available either, and neither is any of the usual politeness. Any
// cleverer rule is a rule that guesses, and what it guesses wrong about is somebody's work. So
// safety here comes from a short, curated, human-audited list of things that hold no unsaved state
// and restart on demand, and from nothing else. Do not replace this with a heuristic - not idle
// time, not CPU, not window count, not "processes over N megabytes". A session that does has built
// the wrong tool, and the test next door is written to catch it.
//
// MATCHING IS BY EXECUTABLE PATH, NOT BY PROCESS NAME. Measured here on 2026-09-02: thirteen
// `node.exe` processes were running. Two were Adobe's bundled servers, at
//   C:\Program Files\Adobe\Adobe Creative Cloud Experience\libs\node.exe
//   C:\Program Files\Common Files\Adobe\Creative Cloud Libraries\libs\node.exe
// and eleven were this repository's own work under C:\Program Files\nodejs\node.exe - two Vite dev
// servers, the job runner, a queued e2e suite, a field-coverage sweep, two MCP servers. A rule
// that matched on the name `node` would have killed all eleven and ended four sessions' night.
// That is the whole reason the never-touch list is checked before anything else.
//
// The design note, including what is deliberately NOT done yet, is docs/backlog/ram-reclaimer.md.

import { spawnSync } from 'node:child_process';

/**
 * One rule. `match` is `{ name }`, `{ pathIncludes }` or both, and an entry matches a process only
 * when EVERY condition it declares holds - so `{ name: 'node', pathIncludes: '/adobe/' }` is the
 * two Adobe servers and never anything else called node.
 *
 * `why` is printed. It has to survive being read by somebody deciding whether to trust the tool,
 * so it says what the thing is and what closing it costs, not what tier it sits in.
 *
 * `returns` is MEASURED, not assumed, and it exists because the first real run of this tool taught
 * it. Closing WD Discovery and the Creative Cloud helper freed 341 MB for about ten seconds: both
 * have service watchdogs that relaunched them immediately, and they came back HEAVIER than they
 * went - WD Discovery from 60 MB to 339 MB, the Creative Cloud helper from 72 MB to 474 MB, since
 * a cold start allocates before it settles. Stream Deck stayed closed. So a tool that reported
 * only what it killed would have claimed a win on the two entries where it made things worse.
 * A dry run says which is which, and the caller decides.
 */

/**
 * Closed by `--apply`. Every entry is a helper or daemon that holds no unsaved state and comes
 * back on demand or at the next login. Adding one means being able to say that sentence about it
 * and meaning it.
 */
export const ALLOWLIST = Object.freeze([
  {
    id: 'adobe-cc-ui-helper',
    match: { name: 'Creative Cloud UI Helper' },
    returns: 'watchdog',
    why: "Adobe's Creative Cloud tray helper - it holds nothing, and Adobe Desktop Service puts it straight back",
  },
  {
    id: 'adobe-node-servers',
    match: { name: 'node', pathIncludes: '/adobe/' },
    returns: 'watchdog',
    why: 'the two node servers Creative Cloud bundles for itself, restarted by Creative Cloud on demand',
  },
  {
    id: 'wd-discovery',
    match: { name: 'WD Discovery' },
    returns: 'watchdog',
    why: 'Western Digital drive discovery - it finds drives, and its service restarts it within seconds',
  },
  {
    id: 'asus-virtual-pet',
    match: { name: 'AsusVirtualPet' },
    returns: 'unmeasured',
    why: 'the ASUS virtual pet, which is a cartoon',
  },
  {
    id: 'stream-deck',
    match: { name: 'StreamDeck' },
    returns: 'stays-closed',
    why: 'the Elgato Stream Deck daemon - the buttons stop until it is reopened, and it does not come back on its own',
  },
]);

/**
 * Named by the dry run, closed only when `--include-heavy` is passed as well.
 *
 * These are worth more memory than the whole allowlist put together, and that is exactly why they
 * are not in it: somebody may have a conversation open in either, and no program on this operating
 * system can tell. Neither is needed to delegate work - `agy-run.mjs` spawns `agy.exe` from PATH
 * and `codex-rescue.mjs` spawns its own codex app-server, both verified by running the binaries -
 * so what is at stake is a person's open window, not the machinery.
 */
export const CONFIRM_FIRST = Object.freeze([
  {
    id: 'codex-app',
    match: { name: 'ChatGPT' },
    returns: 'stays-closed',
    why: 'the Codex desktop app (OpenAI.Codex ships as ChatGPT.exe) - around 700 MB across eleven processes',
  },
  {
    id: 'antigravity-editor',
    match: { name: 'Antigravity' },
    returns: 'stays-closed',
    why: 'the Antigravity editor - delegation runs through agy.exe on PATH and does not need it open',
  },
]);

/**
 * Refused whatever else claims them, and checked FIRST.
 *
 * Most of this list is redundant with failing closed, and it is written out anyway. The point is
 * that it survives a careless edit to the two lists above: the day somebody adds `node` to the
 * allowlist by name because two Adobe servers annoyed them, this is what keeps every dev server,
 * job runner, sweep and MCP server in the repository alive. Redundancy is the feature.
 *
 * A Claude session's children need no rule of their own. The node ones run from
 * C:\Program Files\nodejs and are covered by the path entry; the rest - shells, console hosts -
 * are on no list at all, so failing closed keeps them.
 */
export const NEVER = Object.freeze([
  { id: 'chrome', match: { name: 'chrome' }, why: 'the browser someone is using' },
  { id: 'chrome-headless', match: { name: 'chrome-headless-shell' }, why: 'a running suite drives these' },
  { id: 'claude-session', match: { name: 'claude' }, why: 'a live session, and closing one is its own decision' },
  { id: 'wispr-flow', match: { name: 'Wispr Flow' }, why: 'dictation, which the owner uses for most of what he writes' },
  {
    id: 'repo-node',
    match: { pathIncludes: '/program files/nodejs/' },
    why: "this repository's own dev servers, runners, sweeps and MCP servers all live here",
  },
]);

/** Windows spells paths both ways and cases them freely. A safety answer may not depend on either. */
const normalizePath = (value) => (typeof value === 'string' ? value.replaceAll('\\', '/').toLowerCase() : '');

/** `Win32_Process` says "WD Discovery.exe" where `Get-Process` says "WD Discovery". Same answer. */
const normalizeName = (value) =>
  typeof value === 'string' ? value.toLowerCase().replace(/\.exe$/, '').trim() : '';

/** Does this entry claim this process? Every declared condition, or no match at all. */
function matches(entry, record) {
  const { name, pathIncludes } = entry.match;
  if (name !== undefined && normalizeName(record.name) !== normalizeName(name)) return false;
  if (pathIncludes !== undefined && !normalizePath(record.path).includes(pathIncludes.toLowerCase())) return false;
  return true;
}

const find = (list, record) => list.find((entry) => matches(entry, record)) ?? null;

/**
 * What may be done about one process.
 *
 * THE ORDER OF THESE CHECKS IS THE SAFETY PROPERTY, so it is written out rather than arranged for
 * brevity: an unusable pid first, then the never-touch list, then the two closeable lists, then
 * keep. Every branch that is not an explicit permission ends in `keep`, which is what makes an
 * unrecognised process safe by construction rather than by anybody remembering to think about it.
 *
 * @returns {{ action: 'close' | 'hold' | 'keep', id: string | null, reason: string, returns: string | null }}
 */
export function classifyProcess(record, { includeHeavy = false } = {}) {
  if (!record || typeof record !== 'object') {
    return { action: 'keep', id: null, returns: null, reason: 'not a process record - nothing is closed on a guess' };
  }
  if (!Number.isInteger(record.pid) || record.pid <= 0) {
    return { action: 'keep', id: null, returns: null, reason: 'no usable pid, so there is nothing safe to address' };
  }

  const never = find(NEVER, record);
  if (never) return { action: 'keep', id: never.id, returns: null, reason: `never closed: ${never.why}` };

  const allowed = find(ALLOWLIST, record);
  if (allowed) return { action: 'close', id: allowed.id, returns: allowed.returns, reason: allowed.why };

  const heavy = find(CONFIRM_FIRST, record);
  if (heavy) {
    if (includeHeavy) return { action: 'close', id: heavy.id, returns: heavy.returns, reason: heavy.why };
    return { action: 'hold', id: heavy.id, returns: heavy.returns, reason: `${heavy.why}. Pass --include-heavy to close it` };
  }

  return { action: 'keep', id: null, returns: null, reason: 'not on any list, and this tool only closes what it names' };
}

/** A working set that is not a number counts as nothing, rather than poisoning every total. */
const bytesOf = (record) =>
  typeof record?.workingSetBytes === 'number' && Number.isFinite(record.workingSetBytes) && record.workingSetBytes > 0
    ? record.workingSetBytes
    : 0;

/**
 * The whole machine, sorted into what would be closed, what is held back for a person, and what
 * was kept. Pure: it enumerates nothing and closes nothing, which is what lets the test drive
 * every decision with literal objects.
 */
export function reclaimPlan(records, { includeHeavy = false } = {}) {
  const plan = { close: [], hold: [], keep: [], closeBytes: 0, holdBytes: 0, staysClosedBytes: 0 };
  for (const record of records ?? []) {
    const { action, id, reason, returns } = classifyProcess(record, { includeHeavy });
    plan[action].push({ pid: record?.pid ?? null, name: record?.name ?? '(unnamed)', bytes: bytesOf(record), id, reason, returns });
  }
  plan.closeBytes = plan.close.reduce((sum, entry) => sum + entry.bytes, 0);
  plan.holdBytes = plan.hold.reduce((sum, entry) => sum + entry.bytes, 0);
  // The number that is actually worth anything. Everything with a watchdog is back within seconds,
  // and bigger, so counting it as reclaimed would be the tool flattering itself.
  plan.staysClosedBytes = plan.close
    .filter((entry) => entry.returns === 'stays-closed')
    .reduce((sum, entry) => sum + entry.bytes, 0);
  return plan;
}

const mb = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** What happens after the kill, in one column, because it changes whether closing is worth doing. */
const RETURN_TAG = Object.freeze({
  'stays-closed': 'stays closed',
  watchdog: 'comes back    ',
  unmeasured: 'unmeasured    ',
});
const tag = (returns) => RETURN_TAG[returns] ?? '              ';

/**
 * The lines a dry run prints.
 *
 * It describes an INTENTION and must never read as an outcome - "would close", never "closed" -
 * because the default run frees nothing and a reader who misreads that will go looking for memory
 * that is still exactly where it was. The kept group is printed in full on purpose: the tool
 * refusing to touch Chrome and your sessions is the thing worth seeing, and a summary that showed
 * only the kills would hide the only evidence that the refusals work.
 */
export function describePlan(plan) {
  const lines = [];

  if (plan.close.length === 0) {
    lines.push('Nothing on the allowlist is running. There is no memory here to take back.');
  } else {
    lines.push(`Would close ${plan.close.length} process(es), holding ${mb(plan.closeBytes)}:`);
    for (const entry of plan.close) {
      lines.push(`  ${mb(entry.bytes).padStart(7)}  ${tag(entry.returns)}  pid ${entry.pid}  ${entry.name} - ${entry.reason}`);
    }
    lines.push(`  Of that, ${mb(plan.staysClosedBytes)} stays free. The rest has a watchdog and is back within seconds, larger.`);
  }

  if (plan.hold.length > 0) {
    lines.push('');
    lines.push(`Held back for you, ${mb(plan.holdBytes)} in ${plan.hold.length} process(es):`);
    for (const entry of plan.hold) lines.push(`  ${mb(entry.bytes).padStart(7)}  pid ${entry.pid}  ${entry.name} - ${entry.reason}`);
  }

  if (plan.keep.length > 0) {
    lines.push('');
    lines.push(`Kept, ${plan.keep.length} process(es) - this list is the safety argument, so read it:`);
    const byReason = new Map();
    for (const entry of plan.keep) {
      const bucket = byReason.get(entry.reason) ?? [];
      bucket.push(entry);
      byReason.set(entry.reason, bucket);
    }
    for (const [reason, entries] of byReason) {
      const names = [...new Set(entries.map((e) => e.name))].sort();
      const shown = names.slice(0, 8).join(', ') + (names.length > 8 ? `, and ${names.length - 8} more` : '');
      lines.push(`  ${mb(entries.reduce((sum, e) => sum + e.bytes, 0)).padStart(7)}  ${reason}`);
      lines.push(`           ${shown}`);
    }
  }

  return lines;
}

// Everything below is the CLI. It is the only part that touches the machine.

const USAGE = `Usage: npm run reclaim [-- --apply] [--include-heavy]

  (no flags)        name what would be closed and free nothing
  --apply           close the allowlist and report what came back
  --include-heavy   also treat the Codex app and Antigravity as closeable
  --help            this text

Safety is a curated allowlist, not detection. What it will and will not close is written out in
scripts/reclaim.mjs, and docs/backlog/ram-reclaimer.md says why it is built that way.`;

/** Run PowerShell without a shell string, so nothing here is ever interpreted twice. */
function powershell(command) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`PowerShell failed: ${result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`}`);
  }
  return result.stdout;
}

/** Every process on the machine, in this module's own record shape. */
function enumerateProcesses() {
  const json = powershell(
    'Get-CimInstance Win32_Process | Select-Object ProcessId,Name,WorkingSetSize,ExecutablePath | ConvertTo-Json -Compress',
  );
  const parsed = JSON.parse(json);
  // ConvertTo-Json hands back a bare object rather than an array when exactly one row matched.
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map((row) => ({
    pid: Number(row.ProcessId),
    name: row.Name,
    path: row.ExecutablePath,
    workingSetBytes: Number(row.WorkingSetSize),
  }));
}

/** Free physical memory in bytes. Win32_OperatingSystem reports kilobytes. */
function freeMemoryBytes() {
  const value = powershell('(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory').trim();
  return Number(value) * 1024;
}

/**
 * Close one process tree. `/T` because these apps run as trees and half a tree is worse than none;
 * `/F` because there is no graceful path - see the header on MainWindowHandle.
 *
 * THREE OUTCOMES, NOT TWO, and the third one is why: WD Discovery runs five processes, and the
 * `/T` on the first of them took the other four with it. Those four then reported "not found",
 * and the first run of this called them failures - four alarming lines and a total that left their
 * memory out, for a reclaim that had worked perfectly. A process that is already gone is the
 * outcome asked for, so it is counted as freed and said quietly.
 */
function close(pid) {
  const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { encoding: 'utf8', shell: false });
  if (result.error) return { outcome: 'failed', message: result.error.message };
  if (result.status === 0) return { outcome: 'closed', message: '' };
  const message = (result.stderr || result.stdout || '').trim().split('\n')[0];
  if (/not found/i.test(message)) return { outcome: 'gone', message };
  return { outcome: 'failed', message };
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }
  if (process.platform !== 'win32') {
    console.error(`reclaim: this tool only knows Windows, and this is ${process.platform}. Nothing was done.`);
    return 1;
  }

  const apply = argv.includes('--apply');
  const includeHeavy = argv.includes('--include-heavy');

  const plan = reclaimPlan(enumerateProcesses(), { includeHeavy });
  const before = freeMemoryBytes();
  console.log(`Free physical memory: ${mb(before)}.`);
  console.log('');
  console.log(describePlan(plan).join('\n'));

  if (!apply) {
    console.log('');
    console.log('Nothing was closed. Add --apply to act on the first list.');
    return 0;
  }

  console.log('');
  let freedBytes = 0;
  let staysFreeBytes = 0;
  let freed = 0;
  let failures = 0;
  for (const entry of plan.close) {
    const result = close(entry.pid);
    if (result.outcome === 'failed') {
      // Owned by somebody this account cannot touch, most likely. The rest continue: one refusal
      // is one process, not a reason to leave the other three hundred megabytes behind.
      failures += 1;
      console.log(`  could not close pid ${entry.pid}  ${entry.name} - ${result.message}`);
      continue;
    }
    freed += 1;
    freedBytes += entry.bytes;
    if (entry.returns === 'stays-closed') staysFreeBytes += entry.bytes;
    const how = result.outcome === 'gone' ? 'already gone with its parent' : 'closed';
    console.log(`  ${how.padEnd(26)} pid ${entry.pid}  ${entry.name}`);
  }

  const after = freeMemoryBytes();
  console.log('');
  console.log(`Freed ${freed} of ${plan.close.length} process(es), holding ${mb(freedBytes)}.`);
  if (failures > 0) console.log(`${failures} could not be closed and are named above.`);
  console.log(`Of that, ${mb(staysFreeBytes)} stays free; the rest is watchdogged and will be back within seconds.`);
  console.log(`Free physical memory went from ${mb(before)} to ${mb(after)}, a change of ${mb(after - before)}.`);
  console.log('That last number moves for every other reason too, so it is what the machine did, not what this tool did.');
  return 0;
}

// Only when RUN. Importing this module for its plan must never enumerate or close anything.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href) {
  process.exitCode = main(process.argv.slice(2));
}
