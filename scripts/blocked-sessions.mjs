#!/usr/bin/env node
/**
 * Which sessions are WAITING on a tool call that never came back?
 *
 * The watch loop in `.agent-workflows/orchestrator.md` could previously only see a branch tip
 * that had stopped moving, and a branch tip is the wrong instrument: a session commits every
 * completed step, so it can work for hours between commits, and it can also stop dead the
 * instant after a commit. On the night of 2026-08-29 one wave session's branch tip last moved
 * at 01:59, the session went on editing files until 05:45, and then stopped mid-tool-call - and
 * nothing anywhere said so, because the loop was watching commits.
 *
 * THE SIGNAL. Claude Code appends every turn to a JSONL transcript as it happens:
 *
 *   ~/.claude/projects/<sanitised-cwd>/<session>.jsonl                    an ordinary session
 *   ~/.claude/projects/<sanitised-cwd>/<session>/subagents/<agent>.jsonl  a wave subagent
 *
 * An assistant turn that calls a tool is written when the CALL is made; the matching
 * `tool_result` is written when the call comes BACK. So a transcript whose last entry is an
 * assistant message containing `tool_use` is, at that moment, a session waiting on that tool.
 * Everything else - a text answer, a tool_result - is a session that is not waiting.
 *
 * WHAT THE WAIT MEANS is deliberately not guessed here, because the transcript cannot tell the
 * three apart, and a check that claimed it could would be worse than one that admits it:
 *
 *   1. a permission prompt with nobody awake to answer it (the case this exists for),
 *   2. a session that was killed, or whose harness died, mid-call,
 *   3. a tool call that is genuinely still running.
 *
 * (3) is what the AGE THRESHOLD removes rather than diagnoses. The shell tool is killed at
 * 600 s, so past ~15 minutes no Bash call is still running; a long agent fork or a slow MCP
 * call can legitimately sit longer, which is why the default is 30 and the number is a flag.
 *
 * All three want the same answer from the loop - REPORT IT, never kill it (orchestrator.md,
 * "The watch loop"). A stalled worker's slot counts as free; its work does not continue.
 *
 * Read-only: it opens transcript files and asks git for branch names. Nothing else.
 *
 * Usage:
 *   node scripts/blocked-sessions.mjs                 # waiting >= 30 min, this repo only
 *   node scripts/blocked-sessions.mjs --minutes 10    # lower the threshold
 *   node scripts/blocked-sessions.mjs --all           # every session, not just this repo's
 *   node scripts/blocked-sessions.mjs --json          # machine-readable
 */

import { open, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PROJECTS = join(homedir(), '.claude', 'projects');
/** How much of a transcript's tail to read. Entries are large; a few hundred KB is many turns. */
const TAIL_BYTES = 256 * 1024;
/** Files untouched for longer than this cannot tell us anything about tonight. */
const LOOKBACK_HOURS = 36;

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const everywhere = argv.includes('--all');
const minutesArg = argv.includes('--minutes') ? Number(argv[argv.indexOf('--minutes') + 1]) : NaN;
const minutes = Number.isFinite(minutesArg) && minutesArg >= 0 ? minutesArg : 30;

/** The repo this checkout belongs to, so every worktree under it counts as "ours". */
const repoRoot = (() => {
  const res = spawnSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' });
  if (res.status !== 0) return process.cwd();
  return resolve(res.stdout.trim(), '..').replaceAll('\\', '/');
})();

/** Every *.jsonl under the projects tree, one level of `subagents/` included. */
async function transcripts() {
  const out = [];
  const cutoff = Date.now() - LOOKBACK_HOURS * 3600_000;
  const walk = async (dir, depth) => {
    if (depth > 3) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p, depth + 1);
      } else if (e.name.endsWith('.jsonl')) {
        try {
          const s = await stat(p);
          if (s.mtimeMs >= cutoff) out.push(p);
        } catch {
          /* vanished between readdir and stat */
        }
      }
    }
  };
  await walk(PROJECTS, 0);
  return out;
}

/** The last complete JSONL entries in a file, newest last. */
async function tailEntries(file) {
  let fh;
  try {
    fh = await open(file, 'r');
    const { size } = await fh.stat();
    const from = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - from);
    await fh.read(buf, 0, buf.length, from);
    const lines = buf.toString('utf8').split('\n');
    if (from > 0) lines.shift(); // the first line is a fragment
    const entries = [];
    for (const line of lines) {
      if (!line || line[0] !== '{') continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        /* a partial final line: the session is mid-write */
      }
    }
    return entries;
  } catch {
    return [];
  } finally {
    await fh?.close();
  }
}

/** What is this session waiting on, if anything? */
function waitingOn(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const role = e?.message?.role;
    if (role !== 'assistant' && role !== 'user') continue; // skip summaries and system lines
    if (role === 'user') return null; // a tool_result or a new instruction: not waiting
    const blocks = Array.isArray(e.message.content) ? e.message.content : [];
    const call = blocks.find((b) => b?.type === 'tool_use');
    if (!call) return null; // the assistant answered in text: the turn is over
    return {
      tool: call.name,
      detail: describeCall(call),
      since: e.timestamp,
      cwd: typeof e.cwd === 'string' ? e.cwd.replaceAll('\\', '/') : '',
      agentId: typeof e.agentId === 'string' ? e.agentId : '',
    };
  }
  return null;
}

function describeCall(call) {
  const i = call.input ?? {};
  const text = i.command ?? i.file_path ?? i.pattern ?? i.description ?? i.url ?? '';
  return String(text).replace(/\s+/g, ' ').slice(0, 110);
}

function branchOf(dir) {
  if (!dir) return '';
  const res = spawnSync('git', ['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  });
  return res.status === 0 ? res.stdout.trim() : '';
}

const now = Date.now();
const found = [];
for (const file of await transcripts()) {
  const w = waitingOn(await tailEntries(file));
  if (!w) continue;
  const since = Date.parse(w.since);
  if (!Number.isFinite(since)) continue;
  const waited = Math.round((now - since) / 60_000);
  if (waited < minutes) continue;
  if (!everywhere && !w.cwd.startsWith(repoRoot)) continue;
  found.push({ ...w, waitedMinutes: waited, branch: branchOf(w.cwd), transcript: file });
}
found.sort((a, b) => b.waitedMinutes - a.waitedMinutes);

if (asJson) {
  console.log(JSON.stringify(found, null, 2));
} else if (found.length === 0) {
  console.log(`No session has been waiting on a tool call for ${minutes}+ minutes.`);
} else {
  console.log(`Sessions waiting on a tool call for ${minutes}+ minutes:\n`);
  for (const f of found) {
    const who = f.agentId ? `agent ${f.agentId}` : f.cwd.split('/').pop();
    console.log(`  ${who}${f.branch ? ` (${f.branch})` : ''}`);
    console.log(`    waiting ${f.waitedMinutes} min on ${f.tool}: ${f.detail}`);
    console.log(`    since ${f.since}  in ${f.cwd}`);
  }
  console.log(
    '\nA wait is one of three things and the transcript cannot tell them apart: a permission\n' +
      'prompt nobody has answered, a session that died mid-call, or a call still running.\n' +
      'Report it and treat the slot as free - never kill the session to find out.',
  );
}
