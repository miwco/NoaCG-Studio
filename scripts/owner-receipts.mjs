#!/usr/bin/env node
// THE OWNER RECEIPT - owner-raised work that survives a forgetful planner.
//
//   node scripts/owner-receipts.mjs            # every open receipt, unstarted and oldest first
//   node scripts/owner-receipts.mjs --check    # validate the receipts (part of `npm run build`)
//   node scripts/owner-receipts.mjs --closed   # receipts deleted from git history, i.e. landed
//   node scripts/owner-receipts.mjs --json
//
// WHY THIS EXISTS. On 2026-09-01 the owner asked for a row by name (the AGENTS.md byte headroom),
// the plan held it for the night wave, the night wave was replanned by a different session, and
// the row was never launched. Nothing in the repository knew it had been asked for: the ask lived
// in a chat, a memory file and a gitignored wave plan, each of which a later planner may never
// read. A task the owner raised must be knowable from the repository alone - who raised it, when,
// what was actually asked, and whether it is unstarted, active, parked or superseded - and every
// plan must see the unstarted ones with their age. This script is that receipt.
//
// WHAT A RECEIPT IS. Not a second issue tracker: it is the existing `docs/backlog/` file with a
// small front matter block on top (docs/backlog/README.md, "Owner receipts"):
//
//   ---
//   source: owner
//   raised: 2026-09-01
//   state: unstarted          # unstarted | active | parked | superseded
//   branch: claude/x-thing    # required while active
//   note: why parked, or what superseded it   # required for parked and superseded
//   asked: >-
//     the owner's own words, or a paraphrase marked as one
//   ---
//
// Landed is not a state: the file is deleted in the commit that lands the work, exactly as the
// backlog README already says ("graduate or die"), and `--closed` reads those deletions back out
// of git so a landed receipt is still findable. A file whose Source line credits the owner but
// carries no front matter FAILS `--check`: the point is that an owner ask cannot sit in the
// backlog without a receipt, and a convention nothing checks is a wish.
//
// Read-only except for stdout. Never edits a backlog file, never touches git state.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

export const BACKLOG_DIR = 'docs/backlog';
export const STATES = Object.freeze(['unstarted', 'active', 'parked', 'superseded']);

/**
 * A backlog file whose provenance line credits the owner. Matched against the first lines of the
 * body so a receipt-less owner ask is caught rather than merely tolerated. The tells are the
 * phrasings the folder actually uses today; a new phrasing that slips past this is a smaller
 * failure than an owner ask with no receipt, which is why the front matter is the contract and
 * this regex is only the net under it.
 */
export const OWNER_TELL =
  /\*\*Source:\*\*[^\n]*\bowner\b(?![-/])|\*\*Why \(owner|\bOwner (?:ruling|walk|accepted|ask|sketch)|\bowner (?:ruling|sketch|feedback|walk)\b|Reported by the owner|Owner-asked/i;

/** Front matter as `{ data, body }`, or null when the text does not open with a `---` block. */
export function parseFrontmatter(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  const data = {};
  for (let index = 1; index < end; index += 1) {
    const match = lines[index].match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    const value = rawValue.replace(/\s+#.*$/, '').trim();
    if (value === '>-' || value === '>' || value === '|' || value === '|-') {
      const folded = [];
      while (index + 1 < end && /^\s+/.test(lines[index + 1])) {
        index += 1;
        folded.push(lines[index].trim());
      }
      data[key] = folded.join(value.startsWith('>') ? ' ' : '\n').trim();
    } else {
      data[key] = value.replace(/^(['"])(.*)\1$/, '$2').trim();
    }
  }
  return { data, body: lines.slice(end + 1).join('\n') };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function ageDays(raised, now) {
  const at = Date.parse(`${raised}T00:00:00`);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, Math.floor((now - at) / 86_400_000));
}

/**
 * One file read as a receipt. Returns null for a file that is not owner-sourced at all;
 * otherwise a record whose `problems` array says what `--check` would refuse.
 */
export function receiptFrom(name, text, { now = Date.now() } = {}) {
  const parsed = parseFrontmatter(text);
  const slug = name.replace(/\.md$/, '');
  const title = (parsed?.body ?? text).split('\n').find((line) => line.startsWith('# '))?.slice(2).trim() ?? slug;
  if (!parsed || parsed.data.source !== 'owner') {
    const head = (parsed?.body ?? text).split('\n').slice(0, 15).join('\n');
    if (OWNER_TELL.test(head)) {
      return { slug, title, source: 'owner', receipt: false, problems: ['credits the owner but carries no receipt front matter (source/raised/state/asked)'] };
    }
    return null;
  }
  const { data } = parsed;
  const problems = [];
  if (!DATE.test(data.raised ?? '')) problems.push('raised: must be a YYYY-MM-DD date');
  if (!STATES.includes(data.state)) problems.push(`state: must be one of ${STATES.join(', ')}`);
  if (!data.asked) problems.push('asked: is required - what the owner actually asked, in their words or a marked paraphrase');
  if (data.state === 'active' && !data.branch) problems.push('branch: is required while active');
  if ((data.state === 'parked' || data.state === 'superseded') && !data.note) problems.push(`note: is required when ${data.state} - why, or by what`);
  return {
    slug,
    title,
    source: 'owner',
    receipt: true,
    raised: data.raised ?? null,
    ageDays: DATE.test(data.raised ?? '') ? ageDays(data.raised, now) : null,
    state: data.state ?? null,
    branch: data.branch ?? null,
    note: data.note ?? null,
    asked: data.asked ?? '',
    problems,
  };
}

/** Every `.md` in the backlog except its README, read as receipts. */
export function readReceipts(root = REPO_ROOT, { now = Date.now() } = {}) {
  const dir = path.join(root, ...BACKLOG_DIR.split('/'));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
    .map((name) => receiptFrom(name, readFileSync(path.join(dir, name), 'utf8'), { now }))
    .filter(Boolean);
}

const STATE_ORDER = { unstarted: 0, active: 1, parked: 2, superseded: 3 };

/** Unstarted first and oldest first, so the line a planner must not miss is the first line. */
export function sortReceipts(receipts) {
  return [...receipts].sort((a, b) => {
    const order = (STATE_ORDER[a.state] ?? 9) - (STATE_ORDER[b.state] ?? 9);
    if (order !== 0) return order;
    return (b.ageDays ?? -1) - (a.ageDays ?? -1);
  });
}

export function formatReceipts(receipts) {
  const valid = receipts.filter((receipt) => receipt.receipt && receipt.problems.length === 0);
  if (valid.length === 0) return ['No open owner receipts in docs/backlog/.'];
  const lines = [`Owner receipts (${valid.length} open, ${valid.filter((r) => r.state === 'unstarted').length} unstarted):`];
  for (const receipt of sortReceipts(valid)) {
    const age = receipt.ageDays === null ? '?' : `${receipt.ageDays}d`;
    const where = receipt.state === 'active' ? ` on ${receipt.branch}` : receipt.note ? ` - ${receipt.note}` : '';
    lines.push(`  ${receipt.state.padEnd(10)} ${age.padStart(4)}  ${receipt.slug}${where}`);
    lines.push(`             asked: ${receipt.asked.length > 140 ? `${receipt.asked.slice(0, 137)}...` : receipt.asked}`);
  }
  return lines;
}

/** Receipts deleted from the backlog, read out of git history - the landed ones. */
export function closedReceipts(root = REPO_ROOT, { limit = 50 } = {}) {
  const log = spawnSync(
    'git',
    ['log', `--max-count=${limit}`, '--diff-filter=D', '--name-only', '--format=%h|%cs|%s', '--', BACKLOG_DIR],
    { cwd: root, encoding: 'utf8' },
  );
  if (log.status !== 0) return [];
  const closed = [];
  let current = null;
  for (const line of log.stdout.split('\n')) {
    if (line.includes('|')) {
      const [sha, date, ...subject] = line.split('|');
      current = { sha, date, subject: subject.join('|') };
    } else if (current && line.startsWith(`${BACKLOG_DIR}/`) && line.endsWith('.md')) {
      const before = spawnSync('git', ['show', `${current.sha}^:${line}`], { cwd: root, encoding: 'utf8' });
      if (before.status !== 0) continue;
      const receipt = receiptFrom(path.basename(line), before.stdout);
      if (receipt?.receipt) closed.push({ ...receipt, closedBy: current.sha, closedOn: current.date, subject: current.subject });
    }
  }
  return closed;
}

export function main(argv = process.argv.slice(2), { root = REPO_ROOT, now = Date.now() } = {}) {
  const json = argv.includes('--json');
  const receipts = readReceipts(root, { now });
  if (argv.includes('--check')) {
    const failures = receipts.flatMap((receipt) => receipt.problems.map((problem) => `${BACKLOG_DIR}/${receipt.slug}.md: ${problem}`));
    if (failures.length > 0) {
      console.error(`\nOwner receipts check failed (${failures.length}):\n`);
      for (const failure of failures) console.error(`  - ${failure}`);
      console.error('\nSee docs/backlog/README.md, "Owner receipts".\n');
      return 1;
    }
    console.log(`Owner receipts OK: ${receipts.length} receipt(s), ${receipts.filter((r) => r.state === 'unstarted').length} unstarted.`);
    return 0;
  }
  if (argv.includes('--closed')) {
    const closed = closedReceipts(root);
    if (json) console.log(JSON.stringify(closed, null, 2));
    else if (closed.length === 0) console.log('No closed owner receipts in git history.');
    else for (const receipt of closed) console.log(`  ${receipt.closedOn}  ${receipt.closedBy}  ${receipt.slug}  (${receipt.subject})`);
    return 0;
  }
  if (json) {
    console.log(JSON.stringify(sortReceipts(receipts), null, 2));
    return 0;
  }
  for (const line of formatReceipts(receipts)) console.log(line);
  const broken = receipts.filter((receipt) => receipt.problems.length > 0);
  if (broken.length > 0) {
    console.log(`  ${broken.length} file(s) fail --check: ${broken.map((r) => r.slug).join(', ')}`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
