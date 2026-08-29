#!/usr/bin/env node
// WHICH DESIGNS DID THIS CHANGE TOUCH - so a catalog run costs what the change cost, not what
// the catalog costs.
//
// The five catalog gates MEASURE a rendered graphic, one browser page at a time, over 500+
// designs. That is right, and it is why they are the only checks that catch a visibly broken
// catalog - but it also means a comment fix in one lower third used to re-measure every design
// in the set. The owner's complaint on 2026-08-28 was exactly this: any template change "takes a
// lot of effort from the computer and everything else", and the catalog only grows.
//
// So this answers WHICH designs, and every gate now takes `--only <ids>`:
//
//   node scripts/catalog-affected.mjs             # the plan, in words
//   node scripts/catalog-affected.mjs --json      # the plan, for a script to consume
//   node scripts/catalog-affected.mjs --ids       # just the ids, comma-separated, for --only
//   node scripts/catalog-affected.mjs <base-ref>  # diff against an explicit base
//
// HOW IT DECIDES, AND WHERE IT FAILS.
//
// WHETHER the catalog is affected at all is not decided here: `scripts/e2e-affected.mjs`
// already owns that question (its CATALOG_TRIGGERS, plus the core escalation), it is tested, and
// CI branches on it. This module imports that answer and adds only WHICH.
//
// WHICH comes from the catalog's own shape. Every design declares itself with a literal
// `id: 'lt01'` inside one file under src/templates, so the id -> file map is read off the source
// rather than curated - a design added, moved or renamed re-maps itself with no list to update.
// A changed template file contributes the designs DECLARED in it.
//
// EVERYTHING ELSE ESCALATES TO THE WHOLE CATALOG, and that is the safety property: a changed
// file that declares no design (a category's `shared.ts`, a preset bank, the type registry, the
// motion runtime, the `:root` contract, fonts, the theme tokens, the bench) is shared machinery
// whose blast radius is the whole set, and a file this script cannot attribute at all is treated
// the same way. Like e2e-affected, it fails toward measuring MORE - the one failure mode with no
// alarm attached is measuring less.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFor as e2ePlanFor } from './e2e-affected.mjs';

/** True only when this file was RUN, not imported (the same guard e2e-affected.mjs carries). */
const isEntrypoint =
  Boolean(process.argv[1]) &&
  resolve(process.argv[1]).replaceAll('\\', '/').toLowerCase() ===
    resolve(fileURLToPath(import.meta.url)).replaceAll('\\', '/').toLowerCase();

const REPO = fileURLToPath(new URL('..', import.meta.url));

function git(...cmd) {
  return execFileSync('git', cmd, { encoding: 'utf8', cwd: REPO }).trim();
}

/**
 * The literal a design declares itself with. `defineVariant({ id: 'lt01', … })` and the
 * type-compiled tables both use it, so one pattern reads the whole catalog.
 *
 * Deliberately NOT a loose search for the id anywhere in the text: a comment naming a sibling
 * design would then attribute that sibling's measurement to this file, and the sibling's own
 * file would still be attributed too - noise in the plan, not safety.
 */
const DECLARATION = /\bid:\s*'([a-z][a-z0-9]*\d)'/gi;

/**
 * id -> the template files that DECLARE it.
 *
 * @param {{ file: string, text: string }[]} sources every tracked file under src/templates
 * @returns {Map<string, string[]>}
 */
export function declaringFiles(sources) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  for (const { file, text } of sources) {
    for (const [, id] of text.matchAll(DECLARATION)) {
      map.set(id, [...(map.get(id) ?? []), file]);
    }
  }
  return map;
}

/** file -> the ids it declares, inverted from the map above. */
function idsByFile(map) {
  /** @type {Map<string, string[]>} */
  const byFile = new Map();
  for (const [id, files] of map) for (const f of files) byFile.set(f, [...(byFile.get(f) ?? []), id]);
  return byFile;
}

/**
 * THE GATES THEMSELVES. A change to what MEASURES the catalog has to be executed over the whole
 * catalog, for the reason e2e-affected gives about its own selector: editing the rule and never
 * running it is how a gate quietly stops measuring what it claims to, and the failure is silent.
 * Their baselines are here too - a re-recorded baseline is a claim about every design in it.
 */
const GATE_FILES =
  /^(scripts\/(catalog-affected|catalog-emit|check-catalog-emit|type-floor|overflow-sweep|field-coverage|numerals|l3-sweep)\.mjs|scripts\/overflow-baseline\.json|e2e\/catalog-baseline\.json|e2e\/catalog-render-baseline\.json|e2e\/catalog-baseline\.spec\.ts|e2e\/catalog\/|playwright\.catalog\.config\.ts)/;

/**
 * THE CLASSIFICATION, as a pure function - testable without a git repository, for the same
 * reason `e2e-affected.planFor` is: its worst failure (naming too few designs) is silent.
 *
 * @param {string[]} changed   repo-relative paths, forward slashes
 * @param {{ declaring: Map<string, string[]>, catalogIds: Set<string>,
 *           triggersCatalog: (file: string) => boolean }} ctx
 * @returns {{ mode: 'none'|'slice'|'full', ids: string[], categories: string[],
 *             escalatedBy: string[], attributed: Record<string, string[]> }}
 */
export function planFor(changed, { declaring, catalogIds, triggersCatalog }) {
  const byFile = idsByFile(declaring);
  const ids = new Set();
  const escalatedBy = [];
  /** @type {Record<string, string[]>} */
  const attributed = {};

  for (const file of changed) {
    if (GATE_FILES.test(file)) {
      escalatedBy.push(file);
      continue;
    }
    // Files that cannot move a catalog measurement at all - docs, the API, the app's own
    // surfaces, most of scripts/. e2e-affected already owns that judgement (CATALOG_TRIGGERS
    // plus its core escalation) and is tested; asking it per file keeps one answer to one
    // question instead of a second list that drifts.
    if (!triggersCatalog(file)) continue;
    // Only files under src/templates can ever name specific designs. Anything else that got the
    // catalog flagged at all (fonts, the theme tokens, blocks/, assets/, the bench, a core file)
    // is machinery with catalog-wide reach.
    if (!file.startsWith('src/templates/') || !file.endsWith('.ts')) {
      escalatedBy.push(file);
      continue;
    }
    const declared = (byFile.get(file) ?? []).filter((id) => catalogIds.has(id));
    if (declared.length === 0) {
      // A category's shared.ts, its index.ts, a preset bank, the type registry - or a file whose
      // designs this script simply could not attribute. Both are the whole catalog.
      escalatedBy.push(file);
      continue;
    }
    // A design declared in more than one file is a shape this map cannot speak for; measure
    // everything rather than guess which file owns it.
    if (declared.some((id) => (declaring.get(id) ?? []).length > 1)) {
      escalatedBy.push(file);
      continue;
    }
    attributed[file] = declared;
    for (const id of declared) ids.add(id);
  }

  if (escalatedBy.length > 0) {
    return { mode: 'full', ids: [], categories: [], escalatedBy, attributed };
  }
  return {
    mode: ids.size > 0 ? 'slice' : 'none',
    ids: [...ids].sort(),
    categories: [],
    escalatedBy: [],
    attributed,
  };
}

// ── reading the repository ──────────────────────────────────────────────────

/** Every tracked file under src/templates, with its text - including deleted ones read from `base`. */
function templateSources(base) {
  const tracked = git('ls-files', 'src/templates').split('\n').filter((f) => f.endsWith('.ts'));
  const sources = [];
  for (const file of tracked) {
    try {
      sources.push({ file, text: readFileSync(join(REPO, file), 'utf8') });
    } catch {
      /* raced with a checkout; the base copy below covers it */
    }
  }
  // A DELETED design file no longer exists in the worktree, so its ids would be unattributable
  // and the plan would escalate. Reading its base copy keeps the attribution, and the emit gate
  // catches the removal itself (an id in the baseline the catalog no longer ships).
  if (base) {
    const atBase = git('ls-tree', '-r', '--name-only', base, 'src/templates').split('\n').filter((f) => f.endsWith('.ts'));
    for (const file of atBase) {
      if (sources.some((s) => s.file === file)) continue;
      try {
        sources.push({ file, text: git('show', `${base}:${file}`) });
      } catch {
        /* unreadable at base: the file simply does not contribute */
      }
    }
  }
  return sources;
}

/** The changed-file list, exactly as e2e-affected computes it: committed since `base` + working tree. */
function changedFiles(base) {
  const committed = git('diff', '--name-only', `${base}...HEAD`).split('\n');
  const working = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', cwd: REPO })
    .split('\n')
    .map((l) => l.replace(/^.{2} /, '').replace(/^.* -> /, '').trim());
  return [...new Set([...committed, ...working])].filter(Boolean).map((f) => f.replace(/\\/g, '/'));
}

/**
 * The plan for the working tree. Async because the authoritative id list comes from the catalog
 * itself (scripts/catalog-emit.mjs), never from a list in this file.
 */
export async function planForWorkingTree({ base = null } = {}) {
  const { catalogIndex } = await import('./catalog-emit.mjs');
  const resolvedBase = base ?? git('merge-base', 'HEAD', 'main');
  const changed = changedFiles(resolvedBase);
  const index = await catalogIndex();
  const catalogIds = new Set(index.map((v) => v.id));
  const categoryById = new Map(index.map((v) => [v.id, v.category]));
  const declaring = declaringFiles(templateSources(resolvedBase));
  const plan = planFor(changed, {
    declaring,
    catalogIds,
    triggersCatalog: (file) => e2ePlanFor([file]).catalog,
  });
  plan.categories = [...new Set(plan.ids.map((id) => categoryById.get(id)).filter(Boolean))].sort();
  return { ...plan, base: resolvedBase, changed };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

/**
 * THE BATTERY FOR A PLAN, as commands to run.
 *
 * It PRINTS them rather than running them, deliberately. Four of the six are on the machine-wide
 * browser-job list (`SWEEP_SCRIPTS`, scripts/command-match.mjs) and belong in the queue one at a
 * time; a wrapper that spawned them would be one process the guard hook cannot see the shape of,
 * and naming the wrapper into that list instead would park this cheap plan behind a live suite
 * for half an hour. So the plan is the product, and the commands go through the same rhythm every
 * other job does (`npm run queue -- "<command>"`).
 *
 * @param {string[]|null} ids  null for a full run
 * @param {string[]} categories
 */
function batteryFor(ids, categories) {
  const only = ids && ids.length ? ` --only ${ids.join(',')}` : '';
  const scope = ids && ids.length ? `NOACG_ONLY_DESIGNS=${ids.join(',')} ` : '';
  return {
    cheap: [`node scripts/check-catalog-emit.mjs${only}`],
    sweeps: [
      `node scripts/type-floor.mjs${only}`,
      `node scripts/overflow-sweep.mjs --baseline${only}`,
      `node scripts/field-coverage.mjs${only}`,
      `node scripts/numerals.mjs${only}`,
    ],
    specs: [`${scope}npm run test:e2e:catalog`],
    look: categories.map((c) => `node scripts/l3-sweep.mjs ./l3-shots ${c}`),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const idsOnly = args.includes('--ids');
  const baseArg = args.find((a) => !a.startsWith('--')) ?? null;

  const plan = await planForWorkingTree({ base: baseArg });

  if (asJson) {
    process.stdout.write(`${JSON.stringify(plan)}\n`);
    return 0;
  }
  if (idsOnly) {
    // Empty for 'none' AND for 'full' - a caller that wants the difference reads --json. A full
    // run is the absence of a scope, which is exactly what an empty --only list must never mean,
    // so the sweeps refuse an empty `--only` rather than sweeping nothing.
    process.stdout.write(`${plan.ids.join(',')}\n`);
    return 0;
  }

  if (plan.mode === 'none') {
    console.log('catalog-affected: nothing in this change can move a catalog measurement - no catalog run needed.');
    return 0;
  }
  if (plan.mode === 'full') {
    console.log('catalog-affected: FULL catalog - these changed files are shared machinery (or could not be attributed to designs):');
    for (const f of plan.escalatedBy) console.log('  -', f);
    if (Object.keys(plan.attributed).length) {
      console.log('  (design files in the same change, covered by the full run:');
      for (const [f, ids] of Object.entries(plan.attributed)) console.log(`     ${f} -> ${ids.join(', ')}`);
      console.log('  )');
    }
  } else {
    console.log(
      `catalog-affected: ${plan.ids.length} design(s) in ${plan.categories.length} categor${plan.categories.length === 1 ? 'y' : 'ies'} - ${plan.ids.join(', ')}`,
    );
    for (const [f, ids] of Object.entries(plan.attributed)) console.log(`  ${f} -> ${ids.join(', ')}`);
  }

  const battery = batteryFor(plan.mode === 'slice' ? plan.ids : null, plan.categories);
  console.log('\n  1. the cheap gate first - seconds, no dev server, run it now:');
  for (const c of battery.cheap) console.log(`       ${c}`);
  console.log('\n  2. the rendered sweeps - one browser job at a time, so enqueue them:');
  for (const c of [...battery.sweeps, ...battery.specs]) console.log(`       npm run queue -- "${c}"`);
  if (battery.look.length) {
    console.log('\n  3. and a look at the result for each affected category (screenshots, never a gate;');
    console.log('     it writes into the out-dir you name, so keep that out of the commit):');
    for (const c of battery.look) console.log(`       ${c}`);
  }
  console.log('');
  return 0;
}

if (isEntrypoint) process.exit(await main());
