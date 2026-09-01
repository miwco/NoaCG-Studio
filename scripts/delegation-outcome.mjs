#!/usr/bin/env node
// THE DELEGATION OUTCOME LEDGER'S ONE WRITER - the machine-readable half of harness routing.
//
//   node scripts/delegation-outcome.mjs --task-class doc-sweep --harness antigravity \
//     --model gemini-3.7-flash-high --first-pass yes --label "citation sites, 4/4"
//
// docs/HARNESS_ROUTING.md holds the JUDGEMENT about which harness suits which work; this ledger
// holds the MEASUREMENTS that judgement rests on. The two exist because grades used to live only
// in prose - and in handoff files, which get consumed: the best grading table ever produced
// (18/18 usable SVGs, 4.48 M tokens through the Codex channel, 2026-08-30) survives only in git
// history because its handoff was swept. An entry with no evidence is an opinion; this file is
// where the evidence stops evaporating.
//
// One JSON line per DELEGATED OR REVIEWED TASK - not per call (the agy ledger already counts
// calls). The delegating session writes the line when it has verified the result, because that is
// the moment first-pass/defects/retries are known; `--landed-sha` may be added later by writing a
// second line with the same label (the reader keeps the last word per label when asked to).
//
// The ledger lives OUTSIDE the repository at ~/.noacg/delegation-outcomes.jsonl
// (NOACG_OUTCOMES_LEDGER overrides), for exactly the agy ledger's reasons (scripts/agy-run.mjs
// header): worktrees are disposable, spend and outcomes are per machine, and a path outside the
// tree has no ignore rule to forget. Read it back with: npm run harness:usage
//
// The metric this feeds (docs/ORCHESTRATION_NEXT.md §6): verified useful work produced per scarce
// capacity consumed - never raw token counts compared across providers. So `usage` is free-form
// per harness (each meter counts differently and the counts are never summed across harnesses),
// while first-pass/defects/retries/redone-by are the comparable part.

import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// appendLedger is the agy ledger's own append - one implementation for both ledgers, so a
// durability fix to one can never silently miss the other.
import { appendLedger, poolForModel } from './agy-run.mjs';

export const OUTCOMES_VERSION = 1;

export function outcomesLedgerPath({ env = process.env, home = homedir() } = {}) {
  return env.NOACG_OUTCOMES_LEDGER || path.join(home, '.noacg', 'delegation-outcomes.jsonl');
}

export const HARNESSES = ['antigravity', 'codex', 'claude'];

/**
 * The pool a task billed. The two Antigravity pools are the owner-stated split the routing turns
 * on (docs/ORCHESTRATION_NEXT.md §4), derived from the model family; the other two harnesses each
 * have one pool. An explicit --pool always wins, for the day a harness grows a split this rule
 * does not know.
 */
export function poolFor(harness, model, explicit) {
  if (explicit) return explicit;
  if (harness === 'antigravity') return poolForModel(model);
  if (harness === 'codex') return 'codex';
  return 'claude-max';
}

export function parseArgs(argv) {
  const args = {
    taskClass: null, harness: null, model: null, pool: null, effort: null,
    wave: null, letter: null, label: null, specBytes: null, wallMs: null,
    firstPass: null, reviewFindings: null, defects: null, retries: null,
    redoneBy: null, landedSha: null, notes: null, usage: null, help: false,
  };
  const take = new Map([
    ['--task-class', 'taskClass'], ['--harness', 'harness'], ['--model', 'model'],
    ['--pool', 'pool'], ['--effort', 'effort'], ['--wave', 'wave'], ['--letter', 'letter'],
    ['--label', 'label'], ['--spec-bytes', 'specBytes'], ['--wall-ms', 'wallMs'],
    ['--first-pass', 'firstPass'], ['--review-findings', 'reviewFindings'],
    ['--defects', 'defects'], ['--retries', 'retries'], ['--redone-by', 'redoneBy'],
    ['--landed-sha', 'landedSha'], ['--notes', 'notes'], ['--usage', 'usage'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') args.help = true;
    else if (take.has(token)) args[take.get(token)] = argv[index += 1];
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

/** One ledger line, validated. Throws with the reason on anything the routing cannot use. */
export function outcomeRecord(args, { at = Date.now() } = {}) {
  const need = (name, value) => {
    if (!value || !String(value).trim()) throw new Error(`--${name} is required`);
    return String(value).trim();
  };
  const harness = need('harness', args.harness);
  if (!HARNESSES.includes(harness)) {
    throw new Error(`--harness must be one of ${HARNESSES.join(', ')} - got "${harness}"`);
  }
  const firstPassRaw = need('first-pass', args.firstPass).toLowerCase();
  if (!['yes', 'no'].includes(firstPassRaw)) throw new Error('--first-pass takes yes or no');
  const count = (name, value) => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${name} must be a non-negative integer`);
    return parsed;
  };
  let usage = null;
  if (args.usage) {
    try {
      usage = JSON.parse(args.usage);
    } catch {
      throw new Error('--usage must be a JSON object of that harness\'s own counts');
    }
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
      throw new Error('--usage must be a JSON object of that harness\'s own counts');
    }
  }
  return {
    v: OUTCOMES_VERSION,
    at: new Date(at).toISOString(),
    taskClass: need('task-class', args.taskClass),
    harness,
    pool: poolFor(harness, args.model, args.pool),
    model: need('model', args.model),
    effort: args.effort ?? null,
    wave: args.wave ?? null,
    letter: args.letter ?? null,
    label: args.label ?? null,
    specBytes: count('spec-bytes', args.specBytes),
    wallMs: count('wall-ms', args.wallMs),
    firstPass: firstPassRaw === 'yes',
    reviewFindings: count('review-findings', args.reviewFindings),
    defects: count('defects', args.defects),
    retries: count('retries', args.retries),
    redoneBy: args.redoneBy ?? null,
    landedSha: args.landedSha ?? null,
    notes: args.notes ?? null,
    usage,
  };
}

export const appendOutcome = appendLedger;

const USAGE = `Usage: node scripts/delegation-outcome.mjs --task-class <c> --harness <h> --model <m> --first-pass <yes|no> [options]

Appends one delegation outcome to ${'~'}/.noacg/delegation-outcomes.jsonl (NOACG_OUTCOMES_LEDGER
overrides). Write it when the result has been VERIFIED - that is when first-pass is known.

  --task-class <c>       what kind of work (e.g. bulk-edit, comprehension, spec-build, doc-sweep)
  --harness <h>          antigravity | codex | claude
  --model <m>            the pinned model that did the work
  --first-pass <yes|no>  did the verified result need no repairs
  --pool <p>             billing pool; derived from harness+model when omitted
  --effort <e>           reasoning effort the task ran at
  --wave <w> --letter <l> the wave and row this belonged to
  --label <text>         ties this line to the ledger/rollout entries that paid for it
  --spec-bytes <n> --wall-ms <n>
  --review-findings <n> --defects <n> --retries <n>
  --redone-by <model>    who had to repair it, when someone did
  --landed-sha <sha>     the landed result, once it lands
  --usage <json>         that harness's OWN counts, unsummed (never compared across harnesses)
  --notes <text>

Read it back: npm run harness:usage`;

export function main(argv = process.argv.slice(2), { env = process.env, home = homedir(), at = Date.now() } = {}) {
  let record;
  try {
    const args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    record = outcomeRecord(args, { at });
  } catch (error) {
    process.stderr.write(`delegation-outcome: ${error.message}\n\n${USAGE}\n`);
    return 2;
  }
  const target = outcomesLedgerPath({ env, home });
  appendOutcome(record, target);
  process.stdout.write(`recorded: ${record.harness}/${record.pool} ${record.model} ${record.taskClass} `
    + `first-pass=${record.firstPass ? 'yes' : 'no'} -> ${target}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
