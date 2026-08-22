// `noacg types` - the graphic types the deployment knows, with what each brings.

import { BridgeClient } from '../bridgeClient.js';
import { EXIT_OK, table, type Out, type ParsedArgs } from '../output.js';

export async function runTypes(_args: ParsedArgs, out: Out): Promise<number> {
  const bridge = await BridgeClient.connect();
  try {
    const types = await bridge.types();
    out.result({ ok: true, types });
    if (out.json) return EXIT_OK;
    out.say(`${types.length} graphic types. A type brings its FIELDS, its state machine's operator EVENTS (buttons) and its runtime;`);
    out.say('scaffold one with `noacg scaffold --type <id> [--design <id>|neutral]`, or author from scratch against the contract (`noacg docs contract`).');
    out.say('');
    out.say(
      table([
        ['type', 'fields', 'events', 'designs', 'neutral'],
        ...types.map((t) => [
          t.id,
          t.fields.map((f) => `${f.key}:${f.kind}${f.role === 'line' ? '' : `(${f.role})`}`).join(' '),
          t.events.map((e) => e.event).join(' ') || '-',
          t.designs.map((d) => d.id).join(' '),
          t.neutral ? 'yes' : 'no',
        ]),
      ]),
    );
    return EXIT_OK;
  } finally {
    await bridge.close();
  }
}
