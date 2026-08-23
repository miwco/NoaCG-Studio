// `noacg validate` - the gate, the bench, the regeneration.
//
// For a NoaCG / SPX package: normalize an authored ANIMATION region into NoaCG's keyframe data
// (the studio's own conversion), run the static gate + the live runtime bench on the deployment's
// bridge, print every finding as a teaching line plus the readiness rows, optionally shoot the
// off / on-air / stress frames - and, when the input is a directory, REGENERATE the package from
// the sources (the OGraf manifest + component, FIELDS.md, README.md, controlpanel.html), so the
// workspace stays a valid OGraf + SPX package. The sources are rewritten only where the platform
// normalized them (the converted ANIMATION region, the project-format meta, the receiver tag, the
// stylesheet's asset hop) and each such change is reported.
//
// For a third-party OGraf package: manifest + package conformance, then the OGraf host drives it
// (ografBench.ts) and every non-2xx ReturnPayload is an error.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BridgeClient, type BridgeValidation, type SpxTemplate } from '../bridgeClient.js';
import { ografBench } from '../ografBench.js';
import { EXIT_FINDINGS, EXIT_OK, flagBool, flagString, UsageError, type Out, type ParsedArgs } from '../output.js';
import { shoot } from '../screenshot.js';
import { packageEntries, readPackageInput, removeStaleGenerated, unzipTo } from '../workspace.js';

const STATE_WORD: Record<string, string> = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', untested: 'UNTESTED' };

export function describeValidation(v: BridgeValidation): string {
  const lines: string[] = [];
  lines.push(`${v.ok ? 'OK' : 'FAIL'} - ${v.merged.errors.length} error(s), ${v.merged.warnings.length} warning(s)`);
  if (v.text) lines.push(v.text);
  lines.push('');
  lines.push(`Readiness: ${v.readiness.map((r) => `${r.label} ${STATE_WORD[r.state] ?? r.state}`).join(' · ')}`);
  lines.push(`Engines:   ${v.engineHeadline}`);
  if (v.benchSkipped) lines.push(`Bench:     skipped - ${v.benchSkipped}`);
  if (v.unclaimed.length) lines.push(`Other:     ${v.unclaimed.map((u) => `${u.rule}: ${u.message}`).join('; ')}`);
  return lines.join('\n');
}

async function sourcesOf(dir: string, template: SpxTemplate): Promise<Record<string, string | null>> {
  const read = async (p: string) => fs.readFile(path.join(dir, p), 'utf8').catch(() => null);
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  const html = entries.find((n) => /\.html?$/i.test(n) && !/^controlpanel\.html$/i.test(n)) ?? `${template.name}.html`;
  return { [html]: await read(html), 'css/template.css': await read('css/template.css'), 'js/template.js': await read('js/template.js') };
}

export async function runValidate(args: ParsedArgs, out: Out): Promise<number> {
  const input = args._[1];
  if (!input) throw new UsageError('validate needs a package directory or .zip.');
  const bench = flagBool(args, 'bench', true);
  const houseContract = flagBool(args, 'house-contract', true);
  const shotsDir = flagString(args, 'screenshots');
  const { bytes, fileName, isDirectory } = await readPackageInput(input);
  const bridge = await BridgeClient.connect();
  try {
    const pkg = await bridge.readPackage(bytes, fileName);
    const report: Record<string, unknown> = { kind: pkg.kind };

    // ── A third-party OGraf Graphic ───────────────────────────────────────────
    if (!pkg.imported) {
      const read = pkg.ograf!;
      out.log(`${input}: a third-party OGraf Graphic (${String(read.manifest.id ?? '?')}) - manifest conformance + host bench`);
      const files = await packageEntries(bytes);
      const result = await ografBench(bridge, read, files, { screenshot: !!shotsDir });
      const errors = [...read.errors.map((e) => `ograf-manifest: ${e}`), ...result.errors];
      if (shotsDir && result.screenshot) {
        await fs.mkdir(path.resolve(shotsDir), { recursive: true });
        await fs.writeFile(path.join(path.resolve(shotsDir), 'onair.png'), result.screenshot);
      }
      Object.assign(report, { ok: errors.length === 0, errors, steps: result.steps, contract: read.contract, manifest: read.manifest });
      out.result(report);
      out.say(`${errors.length ? 'FAIL' : 'OK'} - ${errors.length} error(s)`);
      for (const e of errors) out.say(`- ERROR ${e}`);
      out.say(`Host: ${result.steps.map((s) => `${s.action} -> ${s.statusCode}`).join(', ')}`);
      out.say(`Operator surface: ${read.contract.descriptors.length} input(s), ${read.contract.buttons.length} button(s), steps ${read.contract.steps.count}`);
      return errors.length ? EXIT_FINDINGS : EXIT_OK;
    }

    // ── A NoaCG / SPX package ─────────────────────────────────────────────────
    const before = isDirectory ? await sourcesOf(path.resolve(input), pkg.imported.template) : {};
    const normalized = await bridge.normalize(pkg.imported.template);
    const template = normalized.template;
    const validation = await bridge.validate(template, { bench, houseContract });
    Object.assign(report, { ok: validation.ok, validation, normalize: { converted: normalized.converted, dataRegion: normalized.dataRegion, note: normalized.note }, stale: pkg.imported.noacg?.stale ?? false });

    let thumbnail: { png: Uint8Array; width: number; height: number } | undefined;
    if (shotsDir) {
      const dir = path.resolve(shotsDir);
      await fs.mkdir(dir, { recursive: true });
      const size = { width: template.resolution.width, height: template.resolution.height };
      const shots: Record<string, string> = {};
      for (const state of ['off', 'onair', 'stress'] as const) {
        const html = await bridge.compose(template, state);
        const file = path.join(dir, `${state}.png`);
        const png = await shoot(bridge.bench, bridge.origin, html, file, size);
        shots[state] = file;
        if (state === 'onair') thumbnail = { png, ...size };
      }
      report.screenshots = shots;
    }

    const changes: string[] = [];
    if (isDirectory) {
      const dir = path.resolve(input);
      // A validate without --screenshots keeps the thumbnail an earlier one wrote: the manifest's
      // `thumbnails` points at thumbnail.png, and regenerating without it would drop the entry
      // while the file stayed behind.
      if (!thumbnail) {
        const kept = await fs.readFile(path.join(dir, 'thumbnail.png')).catch(() => null);
        if (kept) thumbnail = { png: new Uint8Array(kept), width: template.resolution.width, height: template.resolution.height };
      }
      const zip = await bridge.exportPackage(template, thumbnail ? { thumbnail } : {});
      const written = await unzipTo(zip, dir);
      const newHtml = written.find((f) => /\.html?$/i.test(f) && !f.includes('/') && !/^controlpanel\.html$/i.test(f));
      for (const { file, kind } of await removeStaleGenerated(dir, written)) {
        changes.push(kind === 'manifest'
          ? `${file} (removed: the generated manifest of the package's previous name)`
          : `${file} (removed: the package is now named by its html${newHtml ? ` - its content lives in ${newHtml}` : ''})`);
      }
      const after = await sourcesOf(dir, template);
      for (const [file, text] of Object.entries(after)) {
        if (before[file] !== null && before[file] !== undefined && text !== before[file]) {
          changes.push(file === 'js/template.js' && normalized.converted ? `${file} (ANIMATION region converted to NoaCG keyframe data)` : `${file} (normalized to the package layout)`);
        }
      }
      report.regenerated = true;
      report.sourceChanges = changes;
    }

    out.result(report);
    out.say(describeValidation(validation));
    if (normalized.converted) out.say(`Normalize: ${normalized.note}`);
    else if (!normalized.dataRegion) out.say(`Normalize: ${normalized.note}`);
    if (report.screenshots) out.say(`Screenshots: ${Object.values(report.screenshots as Record<string, string>).join(', ')}`);
    if (isDirectory) {
      out.say(`Regenerated the package in ${path.resolve(input)}${pkg.imported.noacg?.stale ? ' (the generated half was stale - written from other sources than the ones on disk)' : ''}.`);
      for (const c of changes) out.say(`  changed: ${c}`);
    }
    return validation.ok ? EXIT_OK : EXIT_FINDINGS;
  } finally {
    await bridge.close();
  }
}
