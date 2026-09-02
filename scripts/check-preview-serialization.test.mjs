// Both halves of scripts/check-preview-serialization.mjs. The DENY half is the one that matters:
// a gate that has only ever been seen to pass is a gate nobody knows is wired up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { blankComments, doorRange, findViolations } from './check-preview-serialization.mjs';

function fixture(name, source) {
  const dir = mkdtempSync(join(tmpdir(), 'noacg-serialization-'));
  const file = join(dir, name);
  writeFileSync(file, source, 'utf8');
  return file;
}

test('a hand-written ${fn.toString()} binding is refused', () => {
  const file = fixture('compose.ts', [
    'const tag = `<script>',
    '  var killAllTimelines = ${killAllTimelines.toString()};',
    '</script>`;',
  ].join('\n'));
  const found = findViolations([file]);
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 2, 'the line number points at the binding, not at the file');
});

test('prose describing the hazard is not the hazard', () => {
  const file = fixture('notes.ts', [
    '// Never hand-write ${fn.toString()} into a document.',
    '/** Every `${fn.toString()}` goes through serializeHelper. */',
    'export const x = 1;',
  ].join('\n'));
  assert.deepEqual(findViolations([file]), []);
});

test('blanking a comment keeps every offset and line break', () => {
  const source = '/* a\nb */const x = 1;\n';
  const blanked = blankComments(source);
  assert.equal(blanked.length, source.length);
  assert.equal(blanked.split('\n').length, source.split('\n').length);
  assert.ok(blanked.includes('const x = 1;'));
});

test('the door range steps over the parameter list\'s own braces', () => {
  const source = [
    'function serializeHelper(fn: { name: string; toString(): string }, alias: string): string {',
    '  return `var ${fn.name} = ${fn.toString()};`;',
    '}',
    'const other = `${runSimCommand.toString()}`;',
  ].join('\n');
  const range = doorRange(source);
  assert.ok(range, 'the range is found at all');
  const inside = source.indexOf('${fn.toString()}');
  const outside = source.indexOf('${runSimCommand.toString()}');
  assert.ok(inside > range[0] && inside < range[1], 'the door body is inside the range');
  assert.ok(outside > range[1], 'a sibling emission is outside it');
});
