// The save door (api/_lib/me/graphics.ts) with no network: who gets in, what shape is stored,
// what the server overwrites, and that the template CODE is never executed on the way through.

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createGraphicsHandler, MAX_SAVE_BODY_BYTES } from './graphics.js';
import { graphicSaveShape, SHAPE_LIMITS } from './graphicShape.js';
import { memoryAgentAccessStore } from '../agentAccessStore.js';
import { sha256 } from '../http.js';
import { newGraphicDoc } from '../../../src/model/graphicDoc.js';
import { AGENT_KEY_PREFIX } from '../../../src/entitlements/permissions.js';
import type { SpxTemplate } from '../../../src/model/types.js';

const ENV = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'AGENT_SAVE_RATE_MAX', 'AGENT_SAVE_USER_RATE_MAX'] as const;
const original = new Map(ENV.map((name) => [name, process.env[name]]));
beforeEach(() => {
  for (const name of ENV) delete process.env[name];
  process.env.AGENT_SAVE_RATE_MAX = '1000';
  process.env.AGENT_SAVE_USER_RATE_MAX = '1000';
});
afterEach(() => {
  for (const [name, value] of original) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const USER = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const KEY = `${AGENT_KEY_PREFIX}${'ab'.repeat(32)}`;

// A template the way the bridge hands it over: the definition literal is PRESENT (the regex
// the guard tests) and deliberately hostile to parsing - if anything on this path ran it,
// `globalThis.__executed` would be set, and the last test checks it never is.
const HTML = `<!doctype html><html><body><script>
window.SPXGCTemplateDefinition = (function(){ globalThis.__executed = true; return { DataFields: [] }; })();
</script><div id="f0"></div></body></html>`;

function template(): SpxTemplate {
  return {
    name: 'Agent L3',
    type: 'lower-third',
    resolution: { width: 1920, height: 1080, label: '1920×1080' },
    fps: 50,
    html: HTML,
    css: ':root{--x:1}',
    js: 'function play(){} function stop(){} function update(d){} function next(){}',
    fields: [{ field: 'f0', ftype: 'textfield', title: 'Name', value: 'Anna' }],
    settings: { playserver: 'OVERLAY' },
    assets: [],
    layers: [],
  } as unknown as SpxTemplate;
}

function doc(overrides: Record<string, unknown> = {}) {
  return { ...newGraphicDoc(template(), { name: 'Agent L3', origin: { tool: 'noacg-cli', version: '0.1.0' } }), ...overrides };
}

let clientCounter = 0;
function post(body: unknown, token: string | null = KEY): Request {
  clientCounter += 1;
  const headers: Record<string, string> = { 'x-forwarded-for': `10.2.${Math.floor(clientCounter / 250)}.${clientCounter % 250}`, 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://noacg.test/api/me/graphics', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

async function seeded() {
  const store = memoryAgentAccessStore();
  await store.createKey({ userId: USER, name: 'Claude Code', keyHash: sha256(KEY), prefix: 'noacg_ak_ababab…', scopes: ['graphics:create'] });
  return store;
}

test('the shape guard admits the bridge record and refuses what is not one', () => {
  assert.equal(graphicSaveShape(doc()).ok, true);
  assert.equal(graphicSaveShape(null).ok, false);
  assert.equal(graphicSaveShape({ ...doc(), version: 2 }).ok, false);
  assert.equal(graphicSaveShape({ ...doc(), type: 'not-a-type' }).ok, false, 'the type must be a real TemplateType');
  assert.equal(graphicSaveShape(doc({ template: { ...template(), html: '<div id="f0"></div>' } })).ok, false, 'no definition marker');
  assert.equal(graphicSaveShape(doc({ template: { ...template(), html: 'x'.repeat(SHAPE_LIMITS.html + 1) + HTML } })).ok, false, 'html cap');
  assert.equal(graphicSaveShape(doc({ template: { ...template(), assets: [{ path: '../etc/passwd', data: 'data:image/png;base64,AA==' }] } })).ok, false, 'asset path escape');
  assert.equal(graphicSaveShape(doc({ template: { ...template(), assets: [{ path: 'images/logo.png', data: 'https://cdn.example/logo.png' }] } })).ok, false, 'assets must be inlined');
  assert.equal(graphicSaveShape(doc({ entries: [{ id: 'e1', label: 'Anna', values: { f0: 1 }, updatedAt: 'now' }] })).ok, false, 'entry values are strings');
  // Narrowing: unknown top-level keys never reach the record; the origin and folder travel.
  const shaped = graphicSaveShape(doc({ evil: 'payload', folder: ' Sports ', origin: { tool: 'noacg-cli', version: '0.1.0' } }));
  assert.ok(shaped.ok);
  assert.equal('evil' in shaped.doc, false);
  assert.equal(shaped.doc.folder, 'Sports');
  assert.deepEqual(shaped.doc.origin, { tool: 'noacg-cli', version: '0.1.0' });
});

test('an anonymous caller is 401, a key without the permission is 403, a revoked key is 401', async () => {
  const store = await seeded();
  const handler = createGraphicsHandler({ store, configured: () => true });
  assert.equal((await handler.fetch(post(doc(), null))).status, 401);
  assert.equal((await handler.fetch(post(doc(), `${AGENT_KEY_PREFIX}unknown`))).status, 401);

  const readOnly = `${AGENT_KEY_PREFIX}${'cd'.repeat(32)}`;
  await store.createKey({ userId: USER, name: 'read only', keyHash: sha256(readOnly), prefix: 'x', scopes: ['graphics:read'] });
  assert.equal((await handler.fetch(post(doc(), readOnly))).status, 403);

  const ok = await handler.fetch(post(doc()));
  assert.equal(ok.status, 201);
  await store.revokeKey(USER, store.keys[0].id);
  assert.equal((await handler.fetch(post(doc()))).status, 401);
});

test('a save is INSERTED under the server\'s id, clock and origin - never the client\'s', async () => {
  const store = await seeded();
  const at = new Date(Date.UTC(2026, 7, 22, 12, 0, 0));
  const handler = createGraphicsHandler({ store, configured: () => true, now: () => at, uuid: () => '11111111-1111-4111-8111-111111111111' });

  const sent = doc({
    id: 'client-chosen-id',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    origin: { tool: 'something-else', version: '9' },
    aiSpec: { secret: true },
    entries: [{ id: 'e1', label: 'Anna', values: { f0: 'Anna Andersson' }, updatedAt: '2026-01-01T00:00:00.000Z' }],
  });
  const res = await handler.fetch(post(sent));
  assert.equal(res.status, 201);
  const body = (await res.json()) as { id: string; url: string };
  assert.equal(body.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(body.url, 'https://noacg.test/app#/graphic/11111111-1111-4111-8111-111111111111');

  assert.equal(store.graphics.length, 1);
  const stored = store.graphics[0];
  assert.equal(stored.userId, USER);
  assert.equal(stored.doc.id, body.id, 'the server uuid, not "client-chosen-id"');
  assert.equal(stored.doc.createdAt, at.toISOString());
  assert.equal(stored.doc.updatedAt, at.toISOString(), 'LWW reads body.updatedAt - a client clock must not win a sync');
  assert.deepEqual(stored.doc.origin, { tool: 'something-else', version: '9' }, 'origin is provenance the client states');
  assert.equal(stored.doc.aiSpec, null, 'AI provenance is never accepted from the wire');
  assert.equal(stored.doc.version, 1);
  assert.equal(stored.doc.packageId, null);
  assert.equal(stored.doc.entries.length, 1, 'prepared entries travel');
  assert.equal(stored.doc.template.fields.length, 1, 'the browser-parsed fields travel as sent');

  // A second save of the same payload is a second record: INSERT, never upsert.
  const again = await handler.fetch(post(sent));
  assert.equal(again.status, 500, 'the pinned uuid collides - the store refuses rather than overwriting');
  assert.equal(store.graphics.length, 1);
});

test('a malformed body is 400, an oversized one 413, and the wrong method 405', async () => {
  const store = await seeded();
  const handler = createGraphicsHandler({ store, configured: () => true });
  assert.equal((await handler.fetch(post('{not json'))).status, 400);
  assert.equal((await handler.fetch(post({ hello: 'world' }))).status, 400);
  const huge = doc({ template: { ...template(), css: 'x'.repeat(MAX_SAVE_BODY_BYTES + 10) } });
  assert.equal((await handler.fetch(post(huge))).status, 413);
  const get = await handler.fetch(new Request('https://noacg.test/api/me/graphics', { headers: { authorization: `Bearer ${KEY}` } }));
  assert.equal(get.status, 405);
  assert.equal((await createGraphicsHandler({ store, configured: () => false }).fetch(post(doc()))).status, 503);
});

test('nothing on the save path executes the template code', () => {
  // The hostile definition above sets a global if anything evaluates it. Every test in this
  // file has run the payload through the guard and the handler by now.
  assert.equal((globalThis as { __executed?: boolean }).__executed, undefined);
});
