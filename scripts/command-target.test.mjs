// WHICH CHECKOUT A COMMAND ACTS ON. Getting this wrong is silent in both directions, which is why
// it is pinned here rather than checked by hand:
//
//   too local  - the answer comes from the session's own directory, so a worktree run is judged
//                against the main checkout's busy port and refused. Four integration runs were
//                refused that way on 2026-08-29 while the port they would have used sat free.
//   too eager  - a path that merely appears in an argument is taken for a target, and the guard
//                starts judging a command against a checkout it will never touch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changesDirTo, checkoutRoot, commandCheckout, devPortOverride, normalizeDir, targetDir } from './command-target.mjs';

const repoRoot = normalizeDir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));

test('a cd chain decides where the work happens, in both shells', () => {
  assert.equal(changesDirTo('cd C:/repo/wt'), 'C:/repo/wt');
  assert.equal(changesDirTo('cd "C:/path with spaces/wt"'), 'C:/path with spaces/wt');
  assert.equal(changesDirTo('pushd /c/repo/wt'), '/c/repo/wt');
  assert.equal(changesDirTo('Set-Location -Path C:/repo/wt'), 'C:/repo/wt');
  assert.equal(changesDirTo('sl C:/repo/wt'), 'C:/repo/wt');

  // Not a move, or a move we deliberately do not follow.
  assert.equal(changesDirTo('npm run build'), null);
  assert.equal(changesDirTo('cd'), null);
  assert.equal(changesDirTo('cd -'), null);
  assert.equal(changesDirTo('echo cd C:/repo'), null);
});

test('the target is the cd target, not the directory the command was typed in', () => {
  // THE DEFECT THIS MODULE EXISTS FOR. A session sitting in the main checkout drives a worktree
  // by absolute path all day; judging that command against the session's own root reads the
  // wrong port, the wrong index and the wrong branch.
  assert.equal(targetDir('cd C:/repo/wt && npm run test:e2e', 'C:/repo'), 'C:/repo/wt');
  assert.equal(targetDir('cd C:/repo/wt; npm run test:e2e:integration', 'C:/repo'), 'C:/repo/wt');
  // A relative move resolves against the base, and the LAST move wins.
  assert.equal(targetDir('cd wt && npm run test:e2e', 'C:/repo'), 'C:/repo/wt');
  assert.equal(targetDir('cd wt && cd ../other && npm run test:e2e', 'C:/repo'), 'C:/repo/other');
  // Nothing said: the base is the answer.
  assert.equal(targetDir('npm run test:e2e', 'C:/repo'), 'C:/repo');
  assert.equal(targetDir('git status', 'C:/repo/wt'), 'C:/repo/wt');
});

test('an absolute path the command names for what it runs is a target too', () => {
  assert.equal(targetDir('node C:/repo/wt/scripts/l3-sweep.mjs shots quiz', 'C:/repo'), 'C:/repo/wt');
  assert.equal(targetDir('node C:\\repo\\wt\\scripts\\type-floor.mjs', 'C:/repo'), 'C:/repo/wt');
  assert.equal(targetDir('npm --prefix C:/repo/wt run test:e2e', 'C:/repo'), 'C:/repo/wt');
  assert.equal(targetDir('npx playwright test --config C:/repo/wt/playwright.catalog.config.ts', 'C:/repo'), 'C:/repo/wt');

  // A RELATIVE path names no target - it resolves against the base we already have, and reading
  // it as one would invent a claim the command never made.
  assert.equal(targetDir('node scripts/l3-sweep.mjs shots quiz', 'C:/repo/wt'), 'C:/repo/wt');
  assert.equal(targetDir('npx playwright test --config=playwright.catalog.config.ts', 'C:/repo/wt'), 'C:/repo/wt');
});

test('a queued payload names no target - it is an argument', () => {
  // The payload's own pieces reach the segmenter looking like invocations (see
  // command-match.mjs). They must not steer the answer either.
  const cmd = 'cd C:/repo/wt && npm run queue -- "cd C:/repo/other && npx playwright test x"';
  assert.equal(targetDir(cmd, 'C:/repo'), 'C:/repo/wt');
});

test('git turns a directory into the checkout root, and says nothing about a non-checkout', () => {
  // Inside this worktree, any subdirectory resolves to the worktree root - which is the whole
  // point: a linked worktree is its own root, not the primary checkout.
  assert.equal(checkoutRoot(repoRoot), repoRoot);
  assert.equal(checkoutRoot(join(repoRoot, 'scripts')), repoRoot);
  assert.equal(checkoutRoot(join(repoRoot, 'no-such-directory-4f2a')), null);
  assert.equal(checkoutRoot(''), null);

  // End to end: a command that moves into a subdirectory of this checkout is still about this
  // checkout, and one that says nothing is about the base.
  assert.equal(commandCheckout('cd scripts && npm run test:e2e', repoRoot), repoRoot);
  assert.equal(commandCheckout('npm run test:e2e', repoRoot), repoRoot);
  // A target outside every checkout falls back to the base's root rather than to nothing.
  assert.equal(commandCheckout('cd C:/no-such-directory-4f2a && npm run test:e2e', repoRoot), repoRoot);
});

test('a DEV_PORT the command sets for itself is the port it will use', () => {
  // DEV_PORT overrides every other resolution at runtime (scripts/dev-port.mjs), so a judgement
  // about which port a command uses has to read it. The segmenter strips exactly this prefix
  // before matching invocations, which is why it is taken from the raw text.
  assert.equal(devPortOverride('DEV_PORT=5300 npm run test:e2e'), 5300);
  assert.equal(devPortOverride('set DEV_PORT=5300&& npm run test:e2e'), 5300);
  assert.equal(devPortOverride('$env:DEV_PORT = "5300"; npm run test:e2e'), 5300);
  assert.equal(devPortOverride('npm run test:e2e'), null);
  assert.equal(devPortOverride('grep -n DEV_PORT docs/DEV_PORTS.md'), null);
});
