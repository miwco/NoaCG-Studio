#!/usr/bin/env node
// A function serialized into a preview document with `.toString()` must be bound under the name
// the BUNDLER gave it, not under the name this repo's source spells.
//
// The failure this gate exists for is invisible in every environment a developer or the e2e suite
// can reach. `.toString()` returns a function's source AS THE BUNDLER LEFT IT. `npm run dev`
// serves the original identifiers, so a serialized `runSimCommand` calling `killAllTimelines(w)`
// finds the helper composeDocument.ts bound under that spelling. `vite build` MINIFIES both, so
// the same emitted body reads `Q(w)` while the document still binds `killAllTimelines` — and
// composeDocument wraps every command in `try { … } catch (e) {}`, so the `ReferenceError` is
// swallowed. On https://noacg.studio that silently killed the editor's whole simulator: the stage
// never settled (blank canvas) and Play, Stop, Next, scrub and snap all did nothing. Both e2e
// configs run `npm run dev`, so no spec could ever have seen it. Measured and fixed 2026-09-02;
// this gate is what keeps it fixed.
//
// The rule is the ONE DOOR: composeDocument.ts's `serializeHelper` is the only place allowed to
// interpolate a function's source into a document, because it is the only place that emits the
// `fn.name` binding the bundle's own call sites need. Anything else writing `${fn.toString()}`
// into a template literal is the old bug being retyped, so this refuses it.
//
// Scans SOURCE, not `dist/`: the mistake is made in a source file, the artifact only hides it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The one function allowed to interpolate a serialized function body into a document. */
const DOOR_FILE = join(root, 'src', 'preview', 'composeDocument.ts');
const DOOR_NAME = 'serializeHelper';

/** `${something.toString()}` inside a template literal — the shape that ships the hazard. */
const SERIALIZED = /\$\{\s*([A-Za-z_$][\w$.]*)\s*\.toString\(\)\s*\}/g;

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Blank out comment bodies, keeping every offset and newline, so prose describing the hazard
 * (this file, and composeDocument.ts's own explanation) is not mistaken for the hazard. Blunt on
 * purpose: it only has to be right about where `${…toString()}` sits.
 */
export function blankComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

/** The character range of `serializeHelper`'s own body, where the interpolation IS the point. */
export function doorRange(text) {
  const start = text.indexOf(`function ${DOOR_NAME}(`);
  if (start < 0) return null;
  // Step over the parameter list first: its type annotations carry braces of their own, and
  // matching from the first `{` would close the range on `{ name: string; … }`.
  let parens = 0;
  let i = text.indexOf('(', start);
  for (; i < text.length; i++) {
    if (text[i] === '(') parens++;
    else if (text[i] === ')' && --parens === 0) break;
  }
  let depth = 0;
  for (let j = text.indexOf('{', i); j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}' && --depth === 0) return [start, j];
  }
  return null;
}

export function findViolations(files) {
  const violations = [];
  for (const file of files) {
    const text = blankComments(readFileSync(file, 'utf8'));
    const allowed = file === DOOR_FILE ? doorRange(text) : null;
    for (const match of text.matchAll(SERIALIZED)) {
      if (allowed && match.index > allowed[0] && match.index < allowed[1]) continue;
      const line = text.slice(0, match.index).split('\n').length;
      violations.push({ file: relative(root, file), line, expr: match[0] });
    }
  }
  return violations;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-preview-serialization.mjs')) {
  const violations = findViolations(sourceFiles(join(root, 'src')));
  if (violations.length === 0) {
    console.log('[check:preview-serialization] ok - every serialized helper goes through serializeHelper');
    process.exit(0);
  }
  console.error('[check:preview-serialization] a function body is interpolated into a document by hand:\n');
  for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.expr}`);
  console.error(`
A minified build renames that function, so its own call sites inside the emitted source use a
name the document never binds, and composeDocument's try/catch hides the ReferenceError. Route it
through composeDocument.ts's ${DOOR_NAME}(fn, alias) instead, which binds fn.name as well.`);
  process.exit(1);
}
