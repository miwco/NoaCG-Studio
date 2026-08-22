// READING an OGraf v1 package - ours or anybody's.
//
// The exporter beside this file writes packages; this is the other direction, and it reads two
// kinds with one function:
//
//  * a NoaCG DUAL package (export/noacgPackage.ts): the manifest carries `v_noacg` with the
//    graphic's type and pointers at the editable SPX-layout sources, so the package re-imports
//    as the SpxTemplate it was exported from (model/importTemplate.ts does that half - the zip
//    importer reads `v_noacg` itself, because the model layer may not import this file);
//  * a THIRD-PARTY OGraf Graphic: no sources NoaCG can edit, but a manifest that already states
//    the operator contract - `schema` (fields), `customActions` (buttons), `stepCount` - which
//    control/ografContract.ts turns into the same descriptors and buttons every NoaCG control
//    surface renders. That is how a Graphic NoaCG has never seen gets an operator surface
//    without a category and without a second control system.
//
// It VALIDATES as it reads: the manifest against the spec's own rules (the exporter's gate,
// `ografSchema.ts`) and the package against the files the manifest names. A reader that trusted
// a manifest it did not check would make the Import door the one ungated entry into the app.
//
// Pure over a file map: the caller (the /bridge page, a CLI) hands in the package's files keyed
// by package-relative path; nothing here touches a zip, the network or the DOM.

import { ografContract, type OgrafControlContract } from '../../control/ografContract';
import { sourceHash } from '../../model/contentHash';
import { TEMPLATE_TYPE_LABELS, type TemplateType } from '../../model/types';
import type { NoacgVendorBlock } from './ograf';
import { validateOgrafManifest, validateOgrafPackage } from './ografSchema';

/** The files of a package, keyed by path relative to the package root (POSIX separators). */
export type PackageFiles = ReadonlyMap<string, string | Uint8Array>;

export interface OgrafPackageRead {
  /** The manifest's path inside `files`. */
  manifestPath: string;
  manifest: Record<string, unknown>;
  /** Manifest + package conformance findings (`ografSchema.ts`); empty = conformant. */
  errors: string[];
  /** NoaCG's vendor block when the package is ours, shape-checked; null for a stranger's. */
  noacg: NoacgVendorBlock | null;
  /** True when `noacg.source` files are present and hash differently from `noacg.sourceHash`:
   *  the generated half was written from other sources than the ones shipped. */
  stale: boolean;
  /** Every file path relative to the manifest's directory. */
  files: string[];
  /** The operator surface the manifest describes (control/ografContract.ts). */
  contract: OgrafControlContract;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Find the package's manifest: the shallowest `*.ograf.json`. */
export function findManifestPath(paths: Iterable<string>): string | null {
  const candidates = [...paths]
    .filter((p) => p.toLowerCase().endsWith('.ograf.json'))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  return candidates[0] ?? null;
}

/** The `v_noacg` block, or null when absent or not shaped like ours. */
export function readNoacgVendorBlock(manifest: Record<string, unknown>): NoacgVendorBlock | null {
  const v = manifest.v_noacg;
  if (!isRecord(v) || v.format !== 'noacg-graphic' || v.version !== 1) return null;
  if (typeof v.type !== 'string' || !(v.type in TEMPLATE_TYPE_LABELS)) return null;
  const source = isRecord(v.source)
    && typeof v.source.html === 'string' && typeof v.source.css === 'string' && typeof v.source.js === 'string'
    ? { html: v.source.html, css: v.source.css, js: v.source.js }
    : undefined;
  return {
    format: 'noacg-graphic',
    version: 1,
    type: v.type as TemplateType,
    ...(source ? { source } : {}),
    sourceHash: typeof v.sourceHash === 'string' ? v.sourceHash : '',
    generator: typeof v.generator === 'string' ? v.generator : '',
  };
}

const text = (v: string | Uint8Array | undefined): string =>
  v === undefined ? '' : typeof v === 'string' ? v : new TextDecoder().decode(v);

/**
 * Read a package. Returns null when there is no manifest at all (not an OGraf package); a
 * manifest that does not parse or does not validate comes back WITH its errors, because "what is
 * wrong with it" is the answer a CLI user or an agent needs.
 */
export function readOgrafPackage(files: PackageFiles): OgrafPackageRead | null {
  const manifestPath = findManifestPath(files.keys());
  if (!manifestPath) return null;
  const dir = manifestPath.includes('/') ? manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1) : '';
  const relative = [...files.keys()].filter((p) => p.startsWith(dir)).map((p) => p.slice(dir.length));
  const empty = (errors: string[]): OgrafPackageRead => ({
    manifestPath,
    manifest: {},
    errors,
    noacg: null,
    stale: false,
    files: relative,
    contract: ografContract({}),
  });

  let manifest: unknown;
  try {
    manifest = JSON.parse(text(files.get(manifestPath)));
  } catch (e) {
    return empty([`${manifestPath}: not readable JSON (${e instanceof Error ? e.message : String(e)}).`]);
  }
  if (!isRecord(manifest)) return empty([`${manifestPath}: the manifest must be a JSON object.`]);

  const errors = [...validateOgrafManifest(manifest), ...validateOgrafPackage(manifest, relative)];
  const noacg = readNoacgVendorBlock(manifest);
  let stale = false;
  if (noacg?.source && noacg.sourceHash) {
    const read = (p: string) => text(files.get(`${dir}${p}`));
    stale = sourceHash({ html: read(noacg.source.html), css: read(noacg.source.css), js: read(noacg.source.js) }) !== noacg.sourceHash;
  }
  return { manifestPath, manifest, errors, noacg, stale, files: relative, contract: ografContract(manifest) };
}
