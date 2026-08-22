// `noacg pack` - several graphics as one `.noacgpack.json` production file for the studio's
// Import door (docs/GRAPHICS_PACKS.md): the same wire entry the save API takes, per graphic.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BridgeClient } from '../bridgeClient.js';
import { EXIT_OK, flagList, flagString, UsageError, type Out, type ParsedArgs } from '../output.js';
import { readPackageInput } from '../workspace.js';

export async function runPack(args: ParsedArgs, out: Out): Promise<number> {
  const inputs = args._.slice(1);
  const outFile = flagString(args, 'out');
  if (!inputs.length) throw new UsageError('pack needs one or more package directories or .zip files.');
  if (!outFile) throw new UsageError('pack needs --out <file.noacgpack.json>.');
  const layers = flagList(args, 'layer').map((n) => Number(n));
  const name = flagString(args, 'name') ?? path.basename(outFile).replace(/\.noacgpack\.json$/i, '').replace(/\.json$/i, '');
  const bridge = await BridgeClient.connect();
  try {
    const graphics: Record<string, unknown>[] = [];
    for (const [i, input] of inputs.entries()) {
      const { bytes, fileName } = await readPackageInput(input);
      const pkg = await bridge.readPackage(bytes, fileName);
      if (!pkg.imported) throw new UsageError(`${input}: only NoaCG/SPX packages can join a pack (a third-party OGraf Graphic has no NoaCG sources).`);
      const layer = layers.length === 1 ? layers[0] + i : layers[i];
      graphics.push(await bridge.packEntry(pkg.imported.template, Number.isFinite(layer) ? { layer } : {}));
    }
    const pack = { format: 'noacg-pack', version: 1, name, description: '', graphics };
    await fs.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
    await fs.writeFile(path.resolve(outFile), `${JSON.stringify(pack, null, 2)}\n`);
    out.result({ ok: true, file: path.resolve(outFile), graphics: graphics.length });
    out.say(`Wrote ${path.resolve(outFile)} with ${graphics.length} graphic(s) - import it on the studio's Home > Productions > Import a package.`);
    return EXIT_OK;
  } finally {
    await bridge.close();
  }
}
