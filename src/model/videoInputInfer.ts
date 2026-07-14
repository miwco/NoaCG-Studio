// Read a composition's editable inputs OUT OF ITS CODE.
//
// The AI declares its inputs alongside the module it emits (tools.ts emit_remotion_module),
// but the code is the source of truth - so a pro who opens Composition.tsx and writes
// `fields.subtitle ?? 'Live tonight'` has created an editable input just as surely as the AI
// would have, and the Content panel must show it. This module is the reader: it finds every
// value the composition takes from its `fields` prop together with the fallback the code
// itself declares, and describes it in the shared input vocabulary.
//
// What counts as an input is exactly what the house contract already requires of generated
// code (prompts.ts): a `fields` read with a `??` fallback, so the module still renders
// standalone. A read with no literal fallback is deliberately IGNORED - without the default
// there is nothing to show in the panel, nothing to reset to, and no way to type the control.
// That keeps this a reader of the contract rather than a second, looser one.
//
// The values themselves live in the project's declared inputs; a merely-inferred input is
// adopted there the moment the user edits it (store setInputValue upserts). Until then it
// simply mirrors the code, and the code's own `?? default` is what renders.

import type { VideoInput, VideoInputType } from './videoTypes';

/** `assets[String(fields.logo ?? '')]` - an IMAGE input: the value names a project asset. */
const IMAGE_READ = /assets\s*\[\s*String\(\s*fields\.([A-Za-z_$][\w$]*)\s*\?\?\s*(['"])(.*?)\2\s*\)\s*\]/g;

/** `fields.headline ?? 'Top Story'` / `fields['score'] ?? 3` - any read with a literal default. */
const FIELD_READ =
  /fields(?:\.([A-Za-z_$][\w$]*)|\[\s*(['"])([A-Za-z_$][\w$]*)\2\s*\])\s*\?\?\s*(?:(['"])(.*?)\4|(-?\d+(?:\.\d+)?))/g;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Turn a camelCase key into a human label: `accentColor` -> `Accent color`. */
function humanize(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function typeOf(value: string | number): VideoInputType {
  if (typeof value === 'number') return 'number';
  return HEX.test(value) ? 'color' : 'text';
}

/**
 * Every editable input the composition's code declares, in source order. A key read more than
 * once is reported once (the first read wins - the same rule the module's own fallback follows
 * as you read it top to bottom).
 */
export function inferInputsFromTsx(tsx: string): VideoInput[] {
  const found = new Map<string, VideoInput>();
  const add = (key: string, value: string | number, type: VideoInputType) => {
    if (!found.has(key)) {
      found.set(key, { key, type, label: humanize(key), value, default: value });
    }
  };

  // Image reads FIRST: `fields.logo ?? ''` inside an assets[...] lookup is an asset name, not
  // a piece of text, and the general pattern below would otherwise claim it as one.
  for (const m of tsx.matchAll(IMAGE_READ)) add(m[1], m[3], 'image');

  for (const m of tsx.matchAll(FIELD_READ)) {
    const key = m[1] ?? m[3];
    const value = m[6] != null ? Number(m[6]) : m[5];
    if (key && value !== undefined) add(key, value, typeOf(value));
  }

  return [...found.values()];
}

/**
 * What the Content panel shows: every input the code reads, DECLARED ones first and unchanged.
 *
 * A declared input wins outright - it carries the AI's label, its select options, and its
 * number bounds, none of which a `?? default` in the code can express. Anything the code reads
 * but nobody declared is appended, described from the code alone. So the panel is always the
 * union: what the AI meant to expose, plus whatever a human went on to write by hand.
 */
export function contentInputs(declared: VideoInput[], tsx: string): VideoInput[] {
  const byKey = new Set(declared.map((i) => i.key));
  return [...declared, ...inferInputsFromTsx(tsx).filter((i) => !byKey.has(i.key))];
}
