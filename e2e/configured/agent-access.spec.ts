import { test, expect } from '@playwright/test';
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { dismissWizard, haveCreds, settleSync, signIn, wipeMyGraphics } from './_helpers';

// AGENT ACCESS, live (docs/AGENT_SAVE.md): the whole handoff a coding agent's `noacg login` +
// `noacg save` make, against the real backend, with the CLI's side played by this spec:
//   1. signed in, the consent page names the tool and the permission; Allow mints a one-time
//      code and redirects ONLY to the loopback listener (started here), code in the fragment;
//   2. redeem(code, verifier) mints the key once - a second redeem is refused;
//   3. POST /api/me/graphics with the key -> 201 { id, url }; the record is the studio's own
//      shape, server-stamped (origin noacg-cli);
//   4. the deep link opens the graphic on first load (a miss while signed in runs one sync pass);
//   5. Settings -> Account -> Agent access lists the key; Revoke -> the same key is 401.

/** The loopback listener `noacg login` runs: serves /callback (a page that forwards the fragment)
 *  and resolves with the code it receives. */
function loopback(state: string): Promise<{ port: number; code: Promise<string>; close: () => void }> {
  return new Promise((resolve) => {
    let settle: (code: string) => void = () => undefined;
    const code = new Promise<string>((r) => { settle = r; });
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/callback') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><meta charset="utf-8"><title>cb</title><p id="s">…</p><script>
          fetch('/complete',{method:'POST',body:location.hash.slice(1)}).then(r=>r.text()).then(t=>{document.getElementById('s').textContent=t;});
        </script>`);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/complete') {
        let body = '';
        req.on('data', (c: Buffer) => { body += c.toString(); });
        req.on('end', () => {
          const params = new URLSearchParams(body);
          if (params.get('state') === state && params.get('code')) settle(params.get('code')!);
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end('done');
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ port: (server.address() as AddressInfo).port, code, close: () => server.close() });
    });
  });
}

test.describe('agent access (configured)', () => {
  test.skip(!haveCreds, 'needs E2E_EMAIL/E2E_PASSWORD');
  test.setTimeout(120_000);

  test('consent -> loopback code -> redeem -> save 201 -> deep link -> revoke -> 401', async ({ page, baseURL }) => {
    const origin = baseURL!.replace(/\/+$/, '');
    await signIn(page);
    await dismissWizard(page);
    await settleSync(page);

    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('hex');
    const state = randomBytes(16).toString('base64url');
    const listener = await loopback(state);
    const name = 'Claude Code on E2E';
    try {
      // 1. The consent page, signed in.
      await page.goto(`/app?agent=${state}&port=${listener.port}&name=${encodeURIComponent(name)}&challenge=${challenge}`);
      await expect(page.getByTestId('agent-consent')).toBeVisible();
      await expect(page.getByTestId('agent-consent-permissions')).toContainText('Create graphics in your library');
      await expect(page.getByTestId('agent-consent')).toContainText(`127.0.0.1:${listener.port}`);
      await page.getByTestId('agent-consent-allow').click();
      // The browser lands on the loopback page; the code rode the FRAGMENT and never the query.
      await page.waitForURL((u) => u.hostname === '127.0.0.1' && u.pathname === '/callback', { timeout: 20_000 });
      expect(page.url()).not.toMatch(/[?&]code=/);
      const code = await listener.code;
      expect(code.length).toBeGreaterThan(20);

      // 2. Redeem - once.
      const redeem = await fetch(`${origin}/api/me/agent-keys`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', code, verifier }),
      });
      expect(redeem.status, await redeem.text().catch(() => '')).toBe(201);
      const minted = (await redeem.json()) as { key: string; id: string; name: string; prefix: string; scopes: string[] };
      expect(minted.key.startsWith('noacg_ak_')).toBe(true);
      expect(minted.name).toBe(name);
      expect(minted.scopes).toEqual(['graphics:create']);
      const again = await fetch(`${origin}/api/me/agent-keys`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', code, verifier }),
      });
      expect(again.status).toBe(400);

      // 3. Save: the library record the bridge builds, posted with the key.
      await page.goto('/app');
      await dismissWizard(page);
      const doc = await page.evaluate(async () => {
        const { variantsFor } = await import('/src/templates/catalog.ts');
        const { graphicDoc } = await import('/src/bridge/bridgeApi.ts');
        const template = variantsFor('lower-third')[0].create({});
        return graphicDoc({ ...template, name: 'Agent E2E L3' }, { name: 'Agent E2E L3', origin: { tool: 'noacg-cli', version: 'e2e' } });
      });
      const save = await fetch(`${origin}/api/me/graphics`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${minted.key}` },
        body: JSON.stringify(doc),
      });
      expect(save.status, await save.clone().text()).toBe(201);
      const saved = (await save.json()) as { id: string; url: string };
      expect(saved.url).toContain(`/app#/graphic/${saved.id}`);

      // 4. The deep link opens the graphic on first load (one sync pass on the miss).
      await page.goto(`/app#/graphic/${saved.id}`);
      await expect
        .poll(
          () =>
            page.evaluate(async (id) => {
              const { graphicById } = await import('/src/model/library.ts');
              const { useTemplateStore } = await import('/src/store/templateStore.ts');
              const doc = graphicById(id);
              return { present: !!doc, origin: doc?.origin?.tool ?? null, open: useTemplateStore.getState().saved.graphicId === id, hash: location.hash };
            }, saved.id),
          { timeout: 30_000 },
        )
        .toEqual({ present: true, origin: 'noacg-cli', open: true, hash: `#/graphic/${saved.id}` });

      // 5. Settings lists the key; Revoke ends it.
      await page.getByTestId('account-button').click();
      await page.getByTestId('account-menu').getByRole('menuitem', { name: /Settings/ }).click();
      await expect(page.getByTestId('settings-account')).toBeVisible();
      const row = page.getByTestId('agent-key-row').filter({ hasText: name });
      await expect(row).toBeVisible();
      await expect(row).toContainText(minted.prefix);
      await row.getByTestId('agent-key-revoke').click();
      await expect(row).toHaveCount(0);
      const afterRevoke = await fetch(`${origin}/api/me/graphics`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${minted.key}` },
        body: JSON.stringify(doc),
      });
      expect(afterRevoke.status).toBe(401);
    } finally {
      listener.close();
      // Leave the shared test account as it was found.
      await page.goto('/app').catch(() => undefined);
      await wipeMyGraphics(page).catch(() => undefined);
    }
  });
});
