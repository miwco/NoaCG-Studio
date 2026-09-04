// The arithmetic and the two patterns behind `npm run check:catalog-cost`.
//
// This check exists to give the owner a number he can act on - it is what lifted the cap on the
// weekly drawing cadence - so the ways it can be quietly wrong are worth pinning. Both of the
// ones already paid for are here: the id scan missed every design because the minifier uses
// BACKTICKS, and a dynamic import was counted as a static one would be. Neither made the check
// fail; each made it report the opposite of the truth, confidently.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QUOTES, RENDERED, SPECS, STATIC_IMPORT, SWEEPS, slope } from './catalog-cost.mjs';

test('the slope reproduces both points it was fitted to', () => {
  // The whole claim of the CI half is that this line passes through two real measurements. If it
  // does not reproduce them, the projection at 600 designs is decoration.
  assert.equal(Math.round(SWEEPS.at(RENDERED.designs)), RENDERED.sweeps.full);
  assert.equal(Math.round(SWEEPS.at(1)), Math.round(RENDERED.sweeps.one));
  assert.equal(Math.round(SPECS.at(RENDERED.designs)), RENDERED.specs.full);
  assert.equal(Math.round(SPECS.at(1)), Math.round(RENDERED.specs.one));
});

test('the slope is per design, and one design costs only the fixed part', () => {
  const s = slope({ full: 100, one: 10 }, 10); // 9 more designs cost 90 s
  assert.equal(s.perDesign, 10);
  assert.equal(s.at(1), 10);
  assert.equal(s.at(10), 100);
  assert.equal(s.at(20), 200);
});

test('a design id is found however the minifier quoted it', () => {
  // THE BUG THIS PINS: the first version looked for "lt01" and 'lt01' only, and the bundler emits
  // id:`lt01`. It reported that no chunk in the build carried the catalog, which is the opposite
  // of the truth and reads exactly like good news.
  const found = (text) => QUOTES.some((q) => text.includes(`${q}lt01${q}`));
  assert.ok(found('var co=k({id:`lt01`,category:`lower-third`})'), 'backtick, which is what ships');
  assert.ok(found('{ id: "lt01" }'));
  assert.ok(found("{ id: 'lt01' }"));
  assert.ok(!found('// Sibling of lt01 Hairline'), 'a bare mention in a comment is not a declaration');
});

test('the import scan takes static edges and leaves dynamic ones', () => {
  // "First payload" means what the page pulls WITHOUT asking. `/app` reaches its catalog chunk
  // through `await import(...)` after boot; counting that as eager would report the studio's
  // 1.7 MB as unavoidable and hide the two pages where it genuinely is.
  const specs = (text) => [...text.matchAll(STATIC_IMPORT)].map(([, s]) => s);
  assert.deepEqual(specs('import{a as b}from"./chunk-A.js";'), ['./chunk-A.js']);
  assert.deepEqual(specs('import"./side-effect.js";'), ['./side-effect.js']);
  assert.deepEqual(specs('const {e}=await import(`./App-Des.js`);'), []);
  assert.deepEqual(specs('m.f=["assets/App-Des.js"]'), [], 'a preload manifest entry is not an import');
  assert.deepEqual(specs('import x from"./a.js";const y=await import("./b.js");from"./c.js"'), [
    './a.js',
    './c.js',
  ]);
});

test('the recorded measurement names the runs it came from', () => {
  // Not a style rule: this number decides how much drawing the catalog can absorb, and a figure
  // with no provenance cannot be re-derived or challenged.
  assert.ok(RENDERED.runs.length >= 2, 'a slope needs at least two points');
  assert.match(RENDERED.measured, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(RENDERED.designs > 1);
});
