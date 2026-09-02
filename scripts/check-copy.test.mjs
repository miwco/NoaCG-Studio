// A gate that cannot fail is a hole, and a copy gate is unusually easy to build as one: get the
// scoping wrong and it scans nothing, get the patterns wrong and it matches nothing, and either
// way it prints PASS forever. So every banned phrase is proved to be REJECTED here, and the two
// scoping decisions that make the gate honest - a maintainer comment is out, the same comment
// inside emitted code is in - are pinned as fixtures rather than trusted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, scanSource, tally, compare, visibleText, ruleApplies, SCANNED } from './check-copy.mjs';

const rules = (source, opts) => scanSource(source, opts).map((f) => f.rule);
/** The design-count rule is scoped, so a fixture has to say which file it is pretending to be. */
const readme = (source) => rules(source, { plain: true, file: 'README.md' });

// --- Every banned phrase is actually rejected ---------------------------------------------

test('the em-dash is rejected in a UI string', () => {
  assert.deepEqual(rules("const label = 'Home — your graphics';"), ['em-dash']);
});

test('the em-dash is rejected in all three HTML spellings', () => {
  for (const entity of ['&mdash;', '&#8212;', '&#x2014;']) {
    assert.deepEqual(rules(`<p>Export anywhere ${entity} no lock-in.</p>`, { html: true }), ['em-dash'], entity);
  }
});

test('"seamlessly" is rejected', () => {
  assert.deepEqual(rules("const s = 'It seamlessly connects to your playout.';"), ['seamlessly']);
});

test('"empower" is rejected in every inflection', () => {
  for (const word of ['empower', 'empowers', 'empowered', 'empowering', 'empowerment']) {
    assert.deepEqual(rules(`const s = 'We ${word} the operator.';`), ['empower'], word);
  }
});

test('"elevate" is rejected', () => {
  assert.deepEqual(rules("const s = 'Elevate your broadcast.';"), ['elevate']);
});

test('"delve" is rejected', () => {
  assert.deepEqual(rules("const s = 'Delve into the timeline.';"), ['delve']);
});

test('the "whether you are ..." opener is rejected, straight and curly', () => {
  assert.deepEqual(rules("const s = \"Whether you're a student or a broadcaster\";"), ['whether-youre']);
  assert.deepEqual(rules('const s = `Whether you’re new here or not`;'), ['whether-youre']);
  assert.deepEqual(rules('const s = `Whether you are new here or not`;'), ['whether-youre']);
});

// The owner's ruling, 2026-08-28: "We should never say how many designs we have... we have
// designs that look the same, so let's not try to be smug with the design amount." The number
// used to be in the README so a stale one would argue with the build; the answer that needs no
// syncing at all is to have no number on a public surface in the first place.

test('a design count is rejected, digits or vague quantity', () => {
  assert.deepEqual(readme('507 designs across 22 categories.'), ['design-count']);
  assert.deepEqual(readme('Hundreds of broadcast-grade designs, searchable.'), ['design-count']);
  assert.deepEqual(readme('Over 500 templates, free forever.'), ['design-count']);
  assert.deepEqual(readme('1,200 graphics in the catalog.'), ['design-count']);
  assert.deepEqual(readme('Dozens of kits.'), ['design-count']);
  assert.deepEqual(readme('More than 20 categories to pick from.'), ['design-count']);
});

test("a user's own small count is not a boast about ours", () => {
  // The home stat cards say what is in THIS library. That number is theirs and it is true.
  assert.deepEqual(rules("const s = '3 graphics';", { file: 'src/components/home/HomePage.tsx' }), []);
});

test('a catalog measurement inside emitted template code is evidence, not a boast', () => {
  // src/templates comments carry the numbers a layout rule was decided from, and they ship in
  // every export. Scoping them out is why the rule can stay at a hard zero everywhere else.
  const source = ['export const css = `', '  /* measured across the same 23 designs: zero wrapped lines */', '`;'].join('\n');
  assert.deepEqual(rules(source, { file: 'src/templates/shared/logoSlot.ts' }), []);
});

test('the design-count rule covers every surface that sells the catalog', () => {
  const rule = RULES.find((r) => r.id === 'design-count');
  for (const surface of ['README.md', 'cli/README.md', 'cli/plugin/README.md', 'cli/plugin-mcp/README.md', 'index.html', 'docs.html']) {
    assert.ok(SCANNED.includes(surface), `${surface} is not scanned at all`);
    assert.ok(ruleApplies(rule, surface), `${surface} is scanned but exempt from the count rule`);
  }
  assert.ok(ruleApplies(rule, 'src/docs/docs.ts'));
  assert.ok(ruleApplies(rule, 'src/landing/motion.ts'));
  assert.equal(ruleApplies(rule, 'src/templates/shared/stageFit.ts'), false);
});

test('an unscoped rule applies to every scanned file', () => {
  assert.ok(ruleApplies(RULES.find((r) => r.id === 'em-dash'), 'src/templates/shared/stageFit.ts'));
});

test('ordinary catalog prose with no number passes', () => {
  assert.deepEqual(readme('A catalog that covers a whole show, and keeps growing.'), []);
  assert.deepEqual(readme('Lower thirds, scoreboards, tickers and more.'), []);
});

test('markdown is scanned as plain text, not as JavaScript', () => {
  // A fenced block opens a template literal and a URL opens a line comment under the JS scanner,
  // either of which would silently hide the rest of the README.
  const source = ['```bash', 'npx @noacg/cli save ./x  # https://noacg.studio', '```', '', '507 designs.'].join('\n');
  assert.deepEqual(rules(source, { plain: true, file: 'README.md' }), ['design-count']);
});

test('every rule in the list is covered by a test above', () => {
  // The list and the tests drift apart silently otherwise: a rule added without a fixture is a
  // rule nobody has ever seen reject anything.
  const covered = new Set(['em-dash', 'seamlessly', 'empower', 'elevate', 'delve', 'whether-youre', 'design-count']);
  assert.deepEqual(
    RULES.map((r) => r.id).filter((id) => !covered.has(id)),
    [],
  );
});

// --- Clean copy passes ---------------------------------------------------------------------

test('a plain dash and ordinary words pass', () => {
  assert.deepEqual(rules("const s = 'Home - your graphics, packages and control panels';"), []);
});

test('a "seamless loop" is a term of art, not a tell', () => {
  assert.deepEqual(rules("const s = 'The ticker runs as a seamless loop.';"), []);
});

// --- Scope: whose comment is it ------------------------------------------------------------

test("a maintainer's own line comment is out of scope", () => {
  assert.deepEqual(rules('// The panel dock — resized by the splitter.\nconst n = 1;'), []);
});

test("a maintainer's own block comment is out of scope", () => {
  assert.deepEqual(rules('/* The panel dock — resized by the splitter. */\nconst n = 1;'), []);
});

test('a comment INSIDE emitted code is in scope, because the export ships it', () => {
  const source = ['export const html = `', '  <!-- The label block — the accent moment. -->', '`;'].join('\n');
  assert.deepEqual(rules(source), ['em-dash']);
});

test('emitted CSS and JS comments are in scope too', () => {
  const css = ['export const css = `', '  background: #000; /* near-black — never pure black */', '`;'].join('\n');
  assert.deepEqual(rules(css), ['em-dash']);
  const js = ['export const js = `', '  // rebuild the track — the items render twice', '`;'].join('\n');
  assert.deepEqual(rules(js), ['em-dash']);
});

test('an HTML comment is out of scope, the markup around it is not', () => {
  assert.deepEqual(rules('<!-- nav — the header -->\n<p>Export — anywhere</p>', { html: true }), ['em-dash']);
});

test('code interpolated back into a template literal is code again', () => {
  // `${ ... }` is the file's own source, so a comment in there is a maintainer comment.
  const source = ['export const html = `<p>${', '  // the caption — computed', '  caption', '}</p>`;'].join('\n');
  assert.deepEqual(rules(source), []);
});

test('line numbers point at the source line, not the stripped one', () => {
  const source = ['// a comment', '', "const s = 'Home — here';"].join('\n');
  assert.deepEqual(scanSource(source)[0].line, 3);
});

test('visibleText keeps the line count so the numbers can be trusted', () => {
  const source = ['/* one', '   two', '   three */', 'const n = 1;'].join('\n');
  assert.equal(visibleText(source).split('\n').length, 4);
});

// --- The ratchet ---------------------------------------------------------------------------

test('a tally counts one entry per line per rule', () => {
  const source = ["const a = 'One — two';", "const b = 'Elevate — now';"].join('\n');
  assert.deepEqual(tally(scanSource(source)), { 'em-dash': 2, elevate: 1 });
});

test('a NEW tell is drift', () => {
  assert.deepEqual(compare({ 'a.ts': { 'em-dash': 1 } }, { 'a.ts': { 'em-dash': 2 } }), [
    { file: 'a.ts', rule: 'em-dash', before: 1, after: 2 },
  ]);
});

test('a tell in a file the baseline has never seen is drift', () => {
  assert.deepEqual(compare({}, { 'new.ts': { elevate: 1 } }), [
    { file: 'new.ts', rule: 'elevate', before: 0, after: 1 },
  ]);
});

test('a FIXED tell is drift too - a stale-high baseline hands the room back', () => {
  assert.deepEqual(compare({ 'a.ts': { 'em-dash': 4 } }, {}), [
    { file: 'a.ts', rule: 'em-dash', before: 4, after: 0 },
  ]);
});

test('an unchanged tree is not drift', () => {
  const counts = { 'a.ts': { 'em-dash': 4, elevate: 1 }, 'b.ts': { delve: 2 } };
  assert.deepEqual(compare(counts, structuredClone(counts)), []);
});
