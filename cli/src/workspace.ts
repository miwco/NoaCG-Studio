// The workspace on disk <-> the package zip the bridge reads and writes.
//
// A package is a folder (docs/AGENT_CLI.md "The graphic package"): SOURCES the agent edits and a
// GENERATED half NoaCG rebuilds. The bridge speaks zip bytes (it is the studio's own importer and
// exporter), so this module zips a folder into the shape an export has - one top folder named
// after the directory - and unzips an exported package back, stripping that top folder. When it
// writes a regenerated package over an existing workspace it touches ONLY the generated files;
// the sources are the agent's and are never overwritten after the first scaffold.

import JSZip from 'jszip';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** The generated half of a package - the files `noacg validate` may overwrite in a workspace. */
const GENERATED = [/\.ograf\.json$/i, /^graphic\.mjs$/, /^FIELDS\.md$/, /^README\.md$/, /^GETTING-ON-AIR\.md$/, /^controlpanel\.html$/, /^thumbnail\.png$/];

export function isGeneratedFile(relPath: string): boolean {
  const name = relPath.split('/').pop() ?? relPath;
  return !relPath.includes('/') && GENERATED.some((re) => re.test(name));
}

async function walk(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

/** Zip a workspace directory under one top folder (its basename) - the shape of an export. */
export async function zipDirectory(dir: string): Promise<Uint8Array> {
  const abs = path.resolve(dir);
  const top = path.basename(abs);
  const zip = new JSZip();
  for (const rel of await walk(abs)) {
    zip.file(`${top}/${rel}`, await fs.readFile(path.join(abs, rel)));
  }
  return zip.generateAsync({ type: 'uint8array' });
}

/** Read a package argument: a `.zip` file as-is, or a directory zipped. */
export async function readPackageInput(input: string): Promise<{ bytes: Uint8Array; fileName: string; isDirectory: boolean }> {
  const abs = path.resolve(input);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat) throw new Error(`${input}: no such file or directory.`);
  if (stat.isDirectory()) return { bytes: await zipDirectory(abs), fileName: `${path.basename(abs)}.zip`, isDirectory: true };
  if (!/\.zip$/i.test(abs)) throw new Error(`${input}: expected a package directory or a .zip file.`);
  return { bytes: new Uint8Array(await fs.readFile(abs)), fileName: path.basename(abs), isDirectory: false };
}

/** The entries of a package zip, keyed by path with the top folder stripped. */
export async function packageEntries(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const zip = await JSZip.loadAsync(bytes);
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
  // Strip ONE common top folder when every entry shares it (an export's `<slug>/`).
  const firstSegments = new Set(paths.map((p) => p.split('/')[0]));
  const strip = firstSegments.size === 1 && paths.every((p) => p.includes('/')) ? `${[...firstSegments][0]}/` : '';
  const out = new Map<string, Uint8Array>();
  for (const p of paths) out.set(p.slice(strip.length), await zip.files[p].async('uint8array'));
  return out;
}

export interface UnzipOptions {
  /** Write the generated half only (never a source) - for regenerating into an existing workspace. */
  generatedOnly?: boolean;
}

/** Write a package zip into a directory (top folder stripped). Returns the files written. */
export async function unzipTo(bytes: Uint8Array, dir: string, opts: UnzipOptions = {}): Promise<string[]> {
  const abs = path.resolve(dir);
  await fs.mkdir(abs, { recursive: true });
  const written: string[] = [];
  for (const [rel, data] of await packageEntries(bytes)) {
    if (opts.generatedOnly && !isGeneratedFile(rel)) continue;
    const target = path.join(abs, ...rel.split('/'));
    if (!target.startsWith(abs)) continue; // a zip entry escaping the directory is refused
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    written.push(rel);
  }
  return written;
}

/**
 * After a regenerate, drop the generated pair of the package's PREVIOUS name. A package is named
 * by its html (`<title>`, then the SPX definition's description); when that name changes - the
 * agent retitled the graphic, or an older scaffold carried its design's name in the sources - the
 * bridge writes `<new-slug>.html` + `<new-slug>.ograf.json`, and the old pair would stay behind:
 * a folder with two manifests that no renderer and no importer can call one graphic (found
 * 2026-08-22 walking a scaffolded package through validate). Only NoaCG's own generated manifests
 * are touched (`v_noacg.format`), and only the html such a manifest itself points at; nothing
 * else in the folder is ever removed.
 */
export async function removeStaleGenerated(dir: string, written: string[]): Promise<Array<{ file: string; kind: 'manifest' | 'html' }>> {
  const abs = path.resolve(dir);
  const keep = new Set(written);
  const removed: Array<{ file: string; kind: 'manifest' | 'html' }> = [];
  type StaleManifest = { v_noacg?: { format?: string; source?: { html?: string } } };
  for (const name of await fs.readdir(abs)) {
    if (!/\.ograf\.json$/i.test(name) || keep.has(name)) continue;
    let manifest: StaleManifest;
    try {
      manifest = JSON.parse(await fs.readFile(path.join(abs, name), 'utf8')) as StaleManifest;
    } catch {
      continue;
    }
    if (manifest?.v_noacg?.format !== 'noacg-graphic') continue;
    await fs.rm(path.join(abs, name));
    removed.push({ file: name, kind: 'manifest' });
    const html = manifest.v_noacg.source?.html;
    if (html && !html.includes('/') && !keep.has(html) && /\.html?$/i.test(html)) {
      await fs.rm(path.join(abs, html), { force: true });
      removed.push({ file: html, kind: 'html' });
    }
  }
  return removed;
}

/** Is the directory empty or absent (a fresh scaffold target)? */
export async function isEmptyDir(dir: string): Promise<boolean> {
  const abs = path.resolve(dir);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat) return true;
  if (!stat.isDirectory()) throw new Error(`${dir}: exists and is not a directory.`);
  return (await fs.readdir(abs)).length === 0;
}
