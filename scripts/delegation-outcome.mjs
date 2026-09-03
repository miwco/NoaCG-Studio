#!/usr/bin/env node
// THE DELEGATION OUTCOME LEDGER'S ONE WRITER - the machine-readable half of harness routing.
//
//   node scripts/delegation-outcome.mjs --task-class doc-sweep --harness antigravity \
//     --model gemini-3.7-flash-high --outcome clean --label "citation sites, 4/4"
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
// while outcome/cause/defects/retries/redone-by are the comparable part.
//
// THE OUTCOME VOCABULARY, and why it replaced a yes/no (measured 2026-09-03, all eleven lines
// then on the ledger classified by hand - docs/HARNESS_ROUTING.md, "What zero first-pass meant").
// `--first-pass` was a free-form yes/no with no definition anywhere, so it collapsed three
// different things into "no" and the ledger read 0 out of 6 across every pool including our own
// Opus. Six of the ten non-clean rows carried no evidence of a worker shortfall at all. A metric
// that cannot tell a good row from a bad one is worse than none, because routing rests on it.
// So the verdict is now two fields, and both are required:
//
//   --outcome clean     accepted exactly as delivered; review found nothing to change.
//   --outcome reviewed  it landed as the worker wrote it, after ordinary review notes that
//                       changed nothing about the artifact - a citation format, a miscounted
//                       self-report, a tidier sentence. Review finding SOMETHING is what review
//                       is for, so this is a pass. `/check` runs on every row; if a finding
//                       counted against the worker, nothing could ever score.
//   --outcome repaired  the artifact was usable, and another model had to change it before it
//                       could land. This is the column that changes a routing decision.
//   --outcome unusable  no usable artifact came back; the task was done somewhere else.
//
//   --cause worker      the model's own shortfall on the work it was given.
//   --cause prompt      OUR spec or invocation: wrong mode, wrong paths, an undeclared tool set,
//                       a directory walk headless agy auto-denies. This measures the delegating
//                       session, NOT the pool, and the reader excludes it from worker quality.
//   --cause capacity    unavailable, refused, or out of allowance - neither party's quality.
//
// `clean` takes no cause and `reviewed` needs none (both are passes); `repaired` and `unusable`
// require one, because that is the distinction the old yes/no could not carry. `--first-pass yes`
// still works and means `clean`; `--first-pass no` is REFUSED, because it is exactly the value
// that meant three things at once.
//
// BACKFILLING A LANDED SHA: write a second line with the SAME `--label`. The reader collapses
// lines sharing a label, last line winning outright, keeping the FIRST line's timestamp (so the
// task stays in the window it happened in) and treating the task as landed if any line carried a
// sha. A backfill line therefore restates the outcome, which the required flags enforce anyway.

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
 * The four outcomes, best first. `clean` and `reviewed` both mean ACCEPTED AS THE WORKER WROTE
 * IT; the boundary that changes a routing decision is the one below them, where somebody else had
 * to touch the work. The header block above carries each one's definition - keep the two in step.
 */
export const OUTCOMES = ['clean', 'reviewed', 'repaired', 'unusable'];

/** Who the non-clean outcome is evidence about. `prompt` is evidence about us. */
export const CAUSES = ['worker', 'prompt', 'capacity'];

/** Outcomes that mean the worker's own artifact was accepted. */
export const ACCEPTED_OUTCOMES = ['clean', 'reviewed'];

/**
 * What one ledger line's verdict is, for a reader. It lives here beside the vocabulary rather than
 * in the reader for the reason `poolFor` does: the writer owns what its own older lines meant, so
 * one file changes when the vocabulary next does.
 *
 * `firstPass: true` predates `outcome` and was never ambiguous, so it reads as `clean`.
 * `firstPass: false` reads as NOTHING. It meant "the delegation never ran", "someone else had to
 * fix it" and "review found a typo" interchangeably, and all three are on the real ledger, so
 * resolving it to any one of them here would be inventing evidence about a pool. Such a row still
 * counts as a task, is reported as not classified, and enters no rate.
 */
export function legacyVerdict(record) {
  if (OUTCOMES.includes(record.outcome)) {
    return { outcome: record.outcome, cause: record.cause ?? null };
  }
  return { outcome: record.firstPass === true ? 'clean' : null, cause: null };
}

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
    outcome: null, cause: null,
    firstPass: null, reviewFindings: null, defects: null, retries: null,
    redoneBy: null, landedSha: null, notes: null, usage: null, help: false,
  };
  const take = new Map([
    ['--task-class', 'taskClass'], ['--harness', 'harness'], ['--model', 'model'],
    ['--pool', 'pool'], ['--effort', 'effort'], ['--wave', 'wave'], ['--letter', 'letter'],
    ['--label', 'label'], ['--spec-bytes', 'specBytes'], ['--wall-ms', 'wallMs'],
    ['--outcome', 'outcome'], ['--cause', 'cause'],
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

/**
 * The verdict, from `--outcome`/`--cause` or from the legacy `--first-pass`. `--first-pass yes`
 * means `clean`. `--first-pass no` throws, on purpose: it is the single value that used to mean
 * "the delegation never ran", "somebody else had to fix it" and "review noticed a typo" all at
 * once, and every one of those three appeared under it on the real ledger.
 */
export function resolveVerdict(args) {
  if (args.outcome && args.firstPass) {
    throw new Error('pass --outcome or the legacy --first-pass, not both');
  }
  if (!args.outcome) {
    const legacy = String(args.firstPass ?? '').trim().toLowerCase();
    if (legacy === 'yes') return { outcome: 'clean', cause: null };
    if (legacy === 'no') {
      throw new Error('--first-pass no is no longer accepted - it meant three different things. '
        + `Say which: --outcome ${OUTCOMES.slice(1).join(' | ')} (see this script's header)`);
    }
    throw new Error(`--outcome is required, one of ${OUTCOMES.join(', ')}`);
  }
  const outcome = String(args.outcome).trim().toLowerCase();
  if (!OUTCOMES.includes(outcome)) {
    throw new Error(`--outcome must be one of ${OUTCOMES.join(', ')} - got "${args.outcome}"`);
  }
  if (outcome === 'clean') {
    if (args.cause) throw new Error('--cause makes no sense with --outcome clean - nothing went wrong');
    return { outcome, cause: null };
  }
  const cause = String(args.cause ?? '').trim().toLowerCase();
  // `reviewed` is a PASS - the artifact landed as the worker wrote it - so it needs nobody to
  // blame. The two outcomes where something actually went wrong must say who it is evidence
  // about, because that is the whole distinction the old yes/no could not carry.
  if (outcome === 'reviewed' && !cause) return { outcome, cause: null };
  if (!CAUSES.includes(cause)) {
    throw new Error(`--outcome ${outcome} needs --cause, one of ${CAUSES.join(', ')}. `
      + 'A "prompt" cause is evidence about the delegating session, not about the pool');
  }
  return { outcome, cause };
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
  const { outcome, cause } = resolveVerdict(args);
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
    outcome,
    cause,
    // Kept so a line stays greppable and readable next to the eleven that predate the vocabulary.
    // It mirrors `clean` only; the truth is in `outcome`, and the reader prefers that field.
    firstPass: outcome === 'clean',
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

const USAGE = `Usage: node scripts/delegation-outcome.mjs --task-class <c> --harness <h> --model <m> --outcome <o> [--cause <c>] [options]

Appends one delegation outcome to ${'~'}/.noacg/delegation-outcomes.jsonl (NOACG_OUTCOMES_LEDGER
overrides). Write it when the result has been VERIFIED - that is when the outcome is known.

  --task-class <c>       what kind of work (e.g. bulk-edit, comprehension, spec-build, doc-sweep)
  --harness <h>          antigravity | codex | claude
  --model <m>            the pinned model that did the work
  --outcome <o>          clean     accepted exactly as delivered
                         reviewed  landed as written, after ordinary review notes - a PASS
                         repaired  another model had to change it before it could land
                         unusable  no usable artifact came back
  --cause <c>            required on repaired and unusable; clean and reviewed are passes:
                         worker    the model's own shortfall
                         prompt    our spec or invocation - measures US, excluded from pool quality
                         capacity  unavailable, refused, or out of allowance
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
    + `${record.outcome}${record.cause ? ` (${record.cause})` : ''} -> ${target}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
