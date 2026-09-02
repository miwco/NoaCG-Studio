#!/usr/bin/env node
// THE WAVE PLAN CHECK - is this wave-state file ready to launch from?
//
//   node scripts/wave-plan-check.mjs                 # the newest fresh plan in docs/handoffs/
//   node scripts/wave-plan-check.mjs --plan <path>
//   node scripts/wave-plan-check.mjs --json
//
// WHY. The orchestrator contract carried its readiness rules as prose - every row names its files,
// scarce slots are allocated once, every prompt ends on QUEUE, every handoff is classified, every
// path is confirmed - and each rule failed at least once in its first week without anything saying
// so at the moment it failed. Two of the failures were the kind a file diff cannot see: a row that
// named the wrong file (so two rows called disjoint were unanalysed), and ten rows that all went to
// one worker pool because no rule asked the planner to choose. This script asks. It reads the plan
// the orchestrator writes anyway (`docs/handoffs/<date>-<day|night>-wave-plan.local.md`) and
// refuses the shapes the contract forbids, so readiness is a verdict rather than a feeling.
//
// WHAT IT CHECKS, each a named problem in the output:
//   - a `## Wave table` with the columns L, goal, START, TOUCHES, MINTS, POOL, browser;
//   - letters unique; START one of `now`, `on <branch> landing`, `on slot free`;
//   - POOL from the vocabulary below, and a row on a non-Claude pool names its fallback;
//   - no scarce slot minted by two rows;
//   - every TOUCHES entry that looks like a path exists (or is marked `(new)`), globs by prefix;
//   - every letter has a prompt block opening `SESSION <L>` whose last keyword line is QUEUE;
//   - a `Pools at plan time:` line - the capacity snapshot the routing decision was made on;
//   - every tracked handoff file classified under `## Handoffs` (scripts/handoff-drain.mjs);
//   - every unstarted owner receipt mentioned by slug somewhere in the plan
//     (scripts/owner-receipts.mjs) - a plan may hold or defer one, never fail to see it.
//
// It judges nothing about whether the rows are the RIGHT rows; that stays the master's. It only
// refuses a plan whose shape hides a decision that was not made.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { drain, handoffFiles, newestWavePlan, parseHandoffSection } from './handoff-drain.mjs';
import { readReceipts } from './owner-receipts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/** The worker pools a row may name. The two Antigravity pools are billed separately (owner, 2026-09-01). */
export const POOLS = Object.freeze(['opus', 'fable', 'sonnet', 'agy-gemini', 'agy-claude-gpt', 'codex']);
export const CLAUDE_POOLS = Object.freeze(['opus', 'fable', 'sonnet']);
export const PROMPT_KEYS = /^(SESSION|BRANCH|MODEL|POOL|START|TOUCHES|MINTS|GOAL|WHY|READ|DO|CORE|TAIL|TRAPS|GATE|CHECK|QUEUE)\b/;
const REQUIRED_COLUMNS = ['letter', 'goal', 'start', 'touches', 'mints', 'pool', 'browser'];

function columnKey(header) {
  const text = header.trim().toLowerCase();
  if (text === 'l' || text === '#' || text === 'letter') return 'letter';
  return text;
}

/** The wave table as rows keyed by column name. */
export function parseWaveTable(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const problems = [];
  const start = lines.findIndex((line) => /^#{1,6}\s+wave table\b/i.test(line));
  if (start < 0) return { rows: [], columns: [], problems: ['no "## Wave table" section'] };
  let header = null;
  const rows = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line)) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
    if (!header) {
      header = cells.map(columnKey);
      continue;
    }
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const row = { raw: line };
    header.forEach((key, position) => {
      row[key] = cells[position] ?? '';
    });
    rows.push(row);
  }
  if (!header) return { rows: [], columns: [], problems: ['the wave table has no header row'] };
  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) problems.push(`the wave table lacks a ${column.toUpperCase()} column`);
  }
  return { rows, columns: header, problems };
}

/** Every fenced or dashed prompt block, keyed by the letter on its `SESSION <L>` line. */
export function parsePromptBlocks(text) {
  const blocks = new Map();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let current = null;
  const close = () => {
    if (!current) return;
    const keyLines = current.lines.filter((line) => PROMPT_KEYS.test(line.trim()));
    const lastKey = keyLines.length ? keyLines[keyLines.length - 1].trim().split(/\s+/)[0] : null;
    blocks.set(current.letter, { lines: current.lines, lastKey, text: current.lines.join('\n') });
    current = null;
  };
  for (const line of lines) {
    const opening = line.match(/^\s*SESSION\s+([A-Z]{1,2})\b/);
    if (opening) {
      close();
      current = { letter: opening[1], lines: [line] };
      continue;
    }
    if (!current) continue;
    if (/^```/.test(line.trim()) || /^---\s*SESSION\b/.test(line.trim()) || /^#{1,6}\s+/.test(line)) {
      close();
      continue;
    }
    current.lines.push(line);
  }
  close();
  return blocks;
}

/**
 * TOUCHES entries that are paths, and whether each exists. An entry is a path when it has a
 * directory separator or a file extension and no spaces; free text ("the AGENTS.md chain") is
 * skipped rather than guessed at, and `(new)` marks a file the row will create.
 */
export function touchProblems(row, exists) {
  const problems = [];
  const entries = (row.touches ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
  for (const entry of entries) {
    if (/\(new\)/i.test(entry)) continue;
    const token = entry.replace(/`/g, '').split(/\s+/)[0];
    if (!token || /\s/.test(entry.replace(/`/g, '')) && !/^[\w.@/*-]+$/.test(token)) continue;
    const looksLikePath = token.includes('/') || /\.[A-Za-z0-9]{1,6}$/.test(token);
    if (!looksLikePath || !/^[\w.@/*-]+$/.test(token)) continue;
    const star = token.indexOf('*');
    const probe = star >= 0 ? token.slice(0, star).replace(/\/$/, '') : token;
    if (probe && !exists(probe)) problems.push(`row ${row.letter}: TOUCHES names ${token}, which does not exist (mark it (new) if the row creates it)`);
  }
  return problems;
}

/**
 * The whole verdict, from the plan text plus injected facts so the pure part is testable.
 * `exists(relativePath)`, `handoffs` (from handoff-drain), `receipts` (from owner-receipts).
 */
export function checkPlan(text, { exists, handoffs = [], receipts = [], now = Date.now() } = {}) {
  const problems = [];
  const table = parseWaveTable(text);
  problems.push(...table.problems);
  const blocks = parsePromptBlocks(text);
  const seenLetters = new Set();
  const mints = new Map();
  for (const row of table.rows) {
    const letter = (row.letter ?? '').trim();
    if (!/^[A-Z]{1,2}$/.test(letter)) {
      problems.push(`a row has no letter: ${row.raw.trim().slice(0, 60)}`);
      continue;
    }
    if (seenLetters.has(letter)) problems.push(`letter ${letter} is used by two rows`);
    seenLetters.add(letter);
    const start = (row.start ?? '').trim().toLowerCase();
    if (!(start === 'now' || start.startsWith('now ') || start.startsWith('now (') || /^on\s+\S+\s+landing\b/.test(start) || /^on slot free\b/.test(start) || /^when\b/.test(start))) {
      problems.push(`row ${letter}: START must be now, "on <branch> landing" or "on slot free" - got "${row.start}"`);
    }
    const pools = (row.pool ?? '').split(/[+,/]/).map((pool) => pool.trim().toLowerCase()).filter(Boolean);
    if (pools.length === 0) problems.push(`row ${letter}: no POOL - every row names the pool that does its work (${POOLS.join(', ')})`);
    for (const pool of pools) {
      if (!POOLS.includes(pool)) problems.push(`row ${letter}: POOL "${pool}" is not one of ${POOLS.join(', ')}`);
    }
    const block = blocks.get(letter);
    if (pools.some((pool) => POOLS.includes(pool) && !CLAUDE_POOLS.includes(pool))) {
      const named = /\bfallback\b/i.test(row.raw) || /\bfallback\b/i.test(block?.text ?? '');
      if (!named) problems.push(`row ${letter}: a non-Claude pool must name its fallback pool (in the row or the prompt)`);
    }
    for (const mint of (row.mints ?? '').split(',').map((mint) => mint.trim()).filter((mint) => mint && mint !== '-')) {
      const key = mint.toLowerCase();
      if (mints.has(key)) problems.push(`rows ${mints.get(key)} and ${letter} both mint ${mint}`);
      else mints.set(key, letter);
    }
    if (exists) problems.push(...touchProblems({ ...row, letter }, exists));
    if (!block) problems.push(`row ${letter}: no prompt block opens with "SESSION ${letter}"`);
    else if (block.lastKey !== 'QUEUE') problems.push(`row ${letter}: the prompt's last keyword line is ${block.lastKey ?? 'missing'}, not QUEUE`);
  }
  for (const letter of blocks.keys()) {
    if (!seenLetters.has(letter)) problems.push(`prompt block SESSION ${letter} has no wave-table row`);
  }
  if (!/^\s*(?:[-*]\s*)?(?:\*\*)?pools at plan time\s*(?:\*\*)?:/im.test(text)) {
    problems.push('no "Pools at plan time:" line - quote npm run harness:usage for the snapshot the routing was decided on');
  }
  const rows = drain(handoffs, parseHandoffSection(text), { now });
  for (const row of rows.filter((entry) => entry.flag === 'UNCLASSIFIED')) {
    problems.push(`handoff ${row.name} is not classified under "## Handoffs" (consumed | spent | deferred | owner)`);
  }
  for (const receipt of receipts.filter((entry) => entry.receipt && entry.state === 'unstarted')) {
    if (!text.includes(receipt.slug)) {
      problems.push(`unstarted owner receipt ${receipt.slug} (${receipt.ageDays ?? '?'} days) is not mentioned - plan it, hold it or defer it, in writing`);
    }
  }
  return { problems, rows: table.rows.length, pools: [...new Set(table.rows.flatMap((row) => (row.pool ?? '').split(/[+,/]/).map((p) => p.trim().toLowerCase()).filter(Boolean)))] };
}

export function main(argv = process.argv.slice(2), { root = REPO_ROOT, now = Date.now() } = {}) {
  const planFlag = argv.indexOf('--plan');
  const planPath = planFlag >= 0 ? path.resolve(root, argv[planFlag + 1] ?? '') : newestWavePlan(root, now);
  if (!planPath || !existsSync(planPath)) {
    console.error('No fresh wave plan found in docs/handoffs/ (expected <date>-<day|night>-wave-plan.local.md); pass --plan <path>.');
    return 1;
  }
  const verdict = checkPlan(readFileSync(planPath, 'utf8'), {
    exists: (relative) => existsSync(path.join(root, ...relative.split('/'))),
    handoffs: handoffFiles(root),
    receipts: readReceipts(root, { now }),
    now,
  });
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ plan: planPath, ...verdict }, null, 2));
    return verdict.problems.length ? 1 : 0;
  }
  if (verdict.problems.length) {
    console.error(`\nWave plan NOT ready - ${path.basename(planPath)} (${verdict.problems.length} problem(s)):\n`);
    for (const problem of verdict.problems) console.error(`  - ${problem}`);
    console.error('');
    return 1;
  }
  console.log(`Wave plan OK: ${path.basename(planPath)} - ${verdict.rows} row(s), pools ${verdict.pools.join(', ') || 'none'}; every handoff classified, every unstarted owner receipt mentioned.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
