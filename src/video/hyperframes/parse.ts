// Parse a HyperFrames composition document (browser-side; uses DOMParser).
//
// The composition's OWN declarations are the source of truth for its editable inputs:
// `data-composition-variables` on the <html> element (the native HyperFrames variables
// contract) maps onto the shared VideoInput vocabulary, so the Content panel renders the
// same controls for a HyperFrames project as for a Remotion one - and a variable a pro
// hand-writes into the code gets a control exactly like an AI-declared one.

import type { VideoInput, VideoInputType } from '../../model/videoTypes';

/** One declared composition variable, as authored in data-composition-variables. */
export interface HfVariable {
  id: string;
  /** HyperFrames types: string | number | color | boolean | enum, plus NoaCG's 'image'
   *  extension (the value is a project asset's logical name, like a Remotion image input). */
  type: string;
  label?: string;
  default?: string | number | boolean;
  /** enum only: either plain strings or the official { value, label } objects. */
  options?: (string | { value: string; label?: string })[];
  min?: number;
  max?: number;
  step?: number;
}

export interface HfComposition {
  /** The root [data-composition-id] element's declared identity/geometry, or null. */
  root: {
    id: string;
    width: number;
    height: number;
    durationSec: number;
  } | null;
  /** Elements with clip timing (data-start + data-duration), excluding the root. */
  clipCount: number;
  variables: HfVariable[];
  /** data-composition-variables present but not parseable as a JSON array. */
  variablesError: string | null;
}

/** Parse the document. Never throws - a malformed document yields nulls the validator turns
 *  into teaching messages. */
export function parseHyperframesComposition(html: string): HfComposition {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return { root: null, clipCount: 0, variables: [], variablesError: null };
  }

  const rootEl = doc.querySelector('[data-composition-id]');
  const num = (el: Element, attr: string): number => {
    const v = Number(el.getAttribute(attr));
    return Number.isFinite(v) ? v : NaN;
  };
  const root = rootEl
    ? {
        id: rootEl.getAttribute('data-composition-id') ?? '',
        width: num(rootEl, 'data-width'),
        height: num(rootEl, 'data-height'),
        durationSec: num(rootEl, 'data-duration'),
      }
    : null;

  let clipCount = 0;
  if (rootEl) {
    for (const el of rootEl.querySelectorAll('[data-start][data-duration]')) {
      if (el !== rootEl) clipCount++;
    }
  }

  let variables: HfVariable[] = [];
  let variablesError: string | null = null;
  const raw = doc.documentElement.getAttribute('data-composition-variables');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('not an array');
      variables = parsed.filter(
        (v): v is HfVariable => !!v && typeof v === 'object' && typeof (v as HfVariable).id === 'string',
      );
    } catch (e) {
      variablesError = e instanceof Error ? e.message : String(e);
    }
  }

  return { root, clipCount, variables, variablesError };
}

/** The variable types the NoaCG pipeline supports (superset check for validation). */
export const HF_VARIABLE_TYPES = new Set(['string', 'number', 'color', 'boolean', 'enum', 'image']);

function toInputType(t: string): VideoInputType {
  switch (t) {
    case 'number':
      return 'number';
    case 'color':
      return 'color';
    case 'enum':
    case 'boolean':
      return 'select';
    case 'image':
      return 'image';
    default:
      return 'text';
  }
}

/**
 * What the Content panel shows for a HyperFrames project - the counterpart of
 * model/videoInputInfer.ts contentInputs: the CODE decides what is editable (its declared
 * composition variables), and a project input that matches a declared id contributes the
 * value the user already edited (plus any label/options the project carries). A project
 * input whose id the code no longer declares is NOT shown - the code is the source of
 * truth, so removing a variable from the document removes its control.
 */
export function hyperframesContentInputs(declared: VideoInput[], html: string): VideoInput[] {
  const byKey = new Map(declared.map((i) => [i.key, i]));
  return hyperframesInputs(html).map((fromCode) => {
    const project = byKey.get(fromCode.key);
    return project ? { ...fromCode, value: project.value } : fromCode;
  });
}

/**
 * The composition's variables as VideoInputs (each value starting at its default) - the
 * HyperFrames counterpart of the Remotion emit tool's `inputs` array. The code declares
 * them, so the code stays the single source of truth for what is editable.
 */
export function hyperframesInputs(html: string): VideoInput[] {
  const { variables } = parseHyperframesComposition(html);
  return variables
    .filter((v) => HF_VARIABLE_TYPES.has(v.type))
    .map((v) => {
      const type = toInputType(v.type);
      const options =
        v.type === 'boolean'
          ? ['true', 'false']
          : v.options?.map((o) => (typeof o === 'string' ? o : o.value)).filter((o) => typeof o === 'string');
      const fallback = type === 'number' ? 0 : '';
      const def =
        typeof v.default === 'boolean'
          ? String(v.default)
          : type === 'number'
            ? Number(v.default ?? 0) || 0
            : String(v.default ?? fallback);
      return {
        key: v.id,
        type,
        label: v.label || v.id,
        value: def,
        default: def,
        ...(options && options.length > 0 ? { options } : {}),
        ...(v.min != null ? { min: v.min } : {}),
        ...(v.max != null ? { max: v.max } : {}),
        ...(v.step != null ? { step: v.step } : {}),
      };
    });
}
