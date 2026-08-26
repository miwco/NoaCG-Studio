// The gate turns a disagreement between two git commands into a verdict, and it fails in both
// directions: miss a phantom and the tree stays confusingly dirty through a landing, call real
// uncommitted work a phantom and the build tells somebody their change is an encoding artefact.
//
// The first version read `git diff --numstat` for rows of `0 0` and found nothing at all, because
// the clean filter means a phantom produces no diff row to be zero. These fixtures are the shapes
// the real commands print - the status side listing a file the diff side does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { findPhantoms, unquote } from './check-line-endings.mjs';

test('modified in status, absent from diff, is a phantom', () => {
  assert.deepEqual(findPhantoms(' M public/packs/fight-night.noacgpack.json\n', ''), [
    'public/packs/fight-night.noacgpack.json',
  ]);
});

test('an ordinary edit appears in BOTH and is not one', () => {
  const porcelain = ' M src/store/templateStore.ts\n';
  assert.deepEqual(findPhantoms(porcelain, 'src/store/templateStore.ts\n'), []);
});

test('a staged change is not a phantom - the index has already accepted it', () => {
  // First column staged, second column clean. `git diff` compares the WORKING TREE to the index
  // and so says nothing about it, which must not read as an artefact.
  assert.deepEqual(findPhantoms('M  src/store/templateStore.ts\n', ''), []);
});

test('an untracked file is not a phantom', () => {
  assert.deepEqual(findPhantoms('?? scripts/new-thing.mjs\n', ''), []);
});

test('a deleted file is not a phantom', () => {
  assert.deepEqual(findPhantoms(' D docs/OLD.md\n', ''), []);
});

test('one real edit does not hide a phantom beside it', () => {
  const porcelain = ' M src/store/templateStore.ts\n M e2e/catalog-baseline.json\n?? scratch.txt\n';
  assert.deepEqual(findPhantoms(porcelain, 'src/store/templateStore.ts\n'), ['e2e/catalog-baseline.json']);
});

test('a quoted path is compared as git prints it, in both commands', () => {
  const porcelain = ' M "src/a b.ts"\n';
  assert.deepEqual(findPhantoms(porcelain, '"src/a b.ts"\n'), []);
  assert.deepEqual(findPhantoms(porcelain, ''), ['"src/a b.ts"']);
  assert.equal(unquote('"src/a b.ts"'), 'src/a b.ts');
});

test('a staged rename that was then edited compares its DESTINATION, not the arrow', () => {
  // `RM` is what `git mv` plus an in-place edit produces, and `git diff --name-only` prints only
  // the destination. Comparing the whole `old -> new` field called every moved file a phantom,
  // which failed the build for the one commit shape that moves files.
  const porcelain = 'RM src/ai/liteClient.ts -> src/ai/lite/client.ts\n';
  assert.deepEqual(findPhantoms(porcelain, 'src/ai/lite/client.ts\n'), []);
  assert.deepEqual(findPhantoms(porcelain, ''), ['src/ai/lite/client.ts']);
});

test('a clean tree has no phantoms', () => {
  assert.deepEqual(findPhantoms('', ''), []);
});
