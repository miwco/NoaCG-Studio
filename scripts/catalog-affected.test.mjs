// The affected-slice CLASSIFIER, pinned - for the same reason scripts/e2e-affected.test.mjs
// exists. Its worst failure is naming too FEW designs, and that failure is silent by
// construction: the sweeps go green over a slice that never contained the design somebody broke.
//
// So the cases here are realistic changes with an expected verdict for each, and every one of
// them checks the direction the classifier is allowed to be wrong in - toward measuring MORE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { declaringFiles, planFor } from './catalog-affected.mjs';

/** A small stand-in catalog: two lower thirds in their own files, two frames sharing one. */
const SOURCES = [
  { file: 'src/templates/lowerThirds/lt01.ts', text: "export const lt01 = defineVariant({ id: 'lt01', name: 'Hairline' });" },
  { file: 'src/templates/lowerThirds/lt02.ts', text: "export const lt02 = defineVariant({ id: 'lt02', name: 'Slab' });" },
  { file: 'src/templates/lowerThirds/shared.ts', text: 'export function defineVariant(spec) { return spec; }' },
  { file: 'src/templates/lowerThirds/index.ts', text: "import { lt01 } from './lt01';\nexport const LOWER_THIRDS = [lt01, lt02];" },
  {
    file: 'src/templates/frames/structuralLayouts.ts',
    text: "const rows = [{ id: 'fr05' }, { id: 'fr06' }];",
  },
];

const CATALOG_IDS = new Set(['lt01', 'lt02', 'fr05', 'fr06']);
const declaring = declaringFiles(SOURCES);

/** Stands in for e2e-affected's per-file catalog verdict without needing a git repo. */
const triggersCatalog = (file) =>
  /^src\/(templates|blocks|assets)\//.test(file) ||
  /^src\/model\/(fonts|themeTokens)\.ts$/.test(file) ||
  /^src\/(model|store|preview|validation|styles)\//.test(file);

const plan = (changed) => planFor(changed, { declaring, catalogIds: CATALOG_IDS, triggersCatalog });

test('the declaration map reads each design off its own file', () => {
  assert.deepEqual(declaring.get('lt01'), ['src/templates/lowerThirds/lt01.ts']);
  assert.deepEqual(declaring.get('fr05'), ['src/templates/frames/structuralLayouts.ts']);
  assert.equal(declaring.get('lt02').length, 1, 'index.ts imports lt02 but does not declare it');
});

test('one design file -> that design only', () => {
  const p = plan(['src/templates/lowerThirds/lt01.ts']);
  assert.equal(p.mode, 'slice');
  assert.deepEqual(p.ids, ['lt01']);
});

test('two design files -> both designs', () => {
  const p = plan(['src/templates/lowerThirds/lt01.ts', 'src/templates/lowerThirds/lt02.ts']);
  assert.deepEqual(p.ids, ['lt01', 'lt02']);
});

test('a multi-design file -> every design it declares, and nothing else', () => {
  const p = plan(['src/templates/frames/structuralLayouts.ts']);
  assert.deepEqual(p.ids, ['fr05', 'fr06']);
});

test("a category's shared machinery escalates to the whole catalog", () => {
  const p = plan(['src/templates/lowerThirds/shared.ts']);
  assert.equal(p.mode, 'full');
  assert.deepEqual(p.escalatedBy, ['src/templates/lowerThirds/shared.ts']);
});

test('a file that declares no design escalates, even inside a category', () => {
  assert.equal(plan(['src/templates/lowerThirds/index.ts']).mode, 'full');
});

test('shared machinery OUTSIDE src/templates escalates', () => {
  for (const file of [
    'src/blocks/presetRegistry.ts',
    'src/model/fonts.ts',
    'src/model/themeTokens.ts',
    'src/assets/gsap.min.js',
    'src/preview/composeDocument.ts',
    'src/styles/index.css',
  ]) {
    assert.equal(plan([file]).mode, 'full', `${file} must escalate`);
  }
});

test('ONE shared file poisons a slice that would otherwise be narrow', () => {
  // The direction that matters: a change carrying both a design edit and a machinery edit runs
  // the whole catalog, never the design half of it.
  const p = plan(['src/templates/lowerThirds/lt01.ts', 'src/blocks/presetRegistry.ts']);
  assert.equal(p.mode, 'full');
  assert.deepEqual(p.ids, []);
});

test('the gates themselves escalate - editing the rule must execute it over everything', () => {
  for (const file of [
    'scripts/type-floor.mjs',
    'scripts/overflow-sweep.mjs',
    'scripts/field-coverage.mjs',
    'scripts/numerals.mjs',
    'scripts/l3-sweep.mjs',
    'scripts/catalog-affected.mjs',
    'scripts/catalog-emit.mjs',
    'scripts/check-catalog-emit.mjs',
    'scripts/overflow-baseline.json',
    'e2e/catalog-baseline.json',
    'e2e/catalog-render-baseline.json',
    'e2e/catalog-baseline.spec.ts',
    'e2e/catalog/catalog-bench.spec.ts',
    'playwright.catalog.config.ts',
  ]) {
    assert.equal(plan([file]).mode, 'full', `${file} must escalate`);
  }
});

test('a change that cannot move a catalog measurement runs nothing', () => {
  const p = plan(['docs/VERIFICATION.md', 'src/components/AppShell.tsx', 'api/render/start.ts']);
  assert.equal(p.mode, 'none');
  assert.deepEqual(p.ids, []);
});

test('an unknown id declared in a template file is ignored, and the file escalates', () => {
  // A design declared in the source but absent from the built catalog means the two disagree.
  // Attributing the file to nothing and escalating is the safe reading of that.
  const p = planFor(['src/templates/lowerThirds/lt01.ts'], {
    declaring,
    catalogIds: new Set(['lt02']),
    triggersCatalog,
  });
  assert.equal(p.mode, 'full');
});
