import { test, expect } from '@playwright/test';

// Era 5.2: the sync engine's merge policy is pure and must be provably correct offline. This drives
// reconcile()/runSync() directly (the "logic check without UI" path) with crafted records and an
// in-memory provider — no backend needed. The LIVE Supabase round-trip is maintainer-verified.

test('sync engine: reconcile + runSync behave correctly', async ({ page }) => {
  await page.goto('/');

  const results = await page.evaluate(async () => {
    const { reconcile, runSync } = await import('/src/backend/sync.ts?t=' + Date.now());

    const rec = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({
      kind: 'packet' as const,
      id,
      updatedAt,
      body: { id, name: id, updatedAt, ...extra },
      ...extra,
    });

    // In-memory StorageProvider that just stores whatever StoredRecords it's given.
    const mem = (seed: any[] = []) => {
      const store = new Map<string, any>(seed.map((r) => [r.kind + ':' + r.id, r]));
      return {
        store,
        async list(kind: string) {
          return [...store.values()].filter((r) => r.kind === kind);
        },
        async get(kind: string, id: string) {
          return store.get(kind + ':' + id) ?? null;
        },
        async put(r: any) {
          store.set(r.kind + ':' + r.id, r);
        },
        async remove(kind: string, id: string) {
          store.delete(kind + ':' + id);
        },
      };
    };

    const out: { name: string; pass: boolean; got?: unknown }[] = [];
    const check = (name: string, pass: boolean, got?: unknown) => out.push({ name, pass, got });

    const T0 = '2026-01-01T00:00:00.000Z';
    const T1 = '2026-02-01T00:00:00.000Z';
    const T2 = '2026-03-01T00:00:00.000Z';

    // 1. new local record → push
    let p = reconcile([rec('a', T1)], [], T0);
    check('new-local pushes', p.toRemote.length === 1 && p.toLocal.length === 0 && p.conflicts.length === 0);

    // 2. new remote record → pull
    p = reconcile([], [rec('b', T1)], T0);
    check('new-remote pulls', p.toLocal.length === 1 && p.toRemote.length === 0);

    // 3. equal timestamps → no-op
    p = reconcile([rec('c', T1)], [rec('c', T1)], T0);
    check('equal is no-op', p.toRemote.length === 0 && p.toLocal.length === 0 && p.conflicts.length === 0);

    // 4. LWW: local newer, remote unchanged since last sync (since=T1) → push local
    p = reconcile([rec('d', T2)], [rec('d', T1)], T1);
    check('LWW local-newer pushes', p.toRemote.length === 1 && p.conflicts.length === 0);

    // 5. LWW: remote newer, local unchanged since last sync → pull remote
    p = reconcile([rec('e', T1)], [rec('e', T2)], T1);
    check('LWW remote-newer pulls', p.toLocal.length === 1 && p.conflicts.length === 0);

    // 6. true conflict: BOTH changed since last sync (since=T0, a real prior baseline) → remote
    //    wins, local kept as copy
    p = reconcile([rec('f', T1)], [rec('f', T2)], T0);
    check('conflict keeps both', p.toLocal.length === 1 && p.conflicts.length === 1);

    // 6b. FIRST sync (since=EPOCH): the same divergence must be pure LWW, NOT a spurious conflict
    const EPOCH = '1970-01-01T00:00:00.000Z';
    p = reconcile([rec('f2', T1)], [rec('f2', T2)], EPOCH);
    check('first-sync no spurious conflict', p.toLocal.length === 1 && p.conflicts.length === 0);

    // 7. delete propagates: local tombstone newer than remote live record → push the tombstone
    p = reconcile([rec('g', T2, { deleted: true })], [rec('g', T1)], T1);
    check('delete propagates', p.toRemote.length === 1 && p.toRemote[0].deleted === true);

    // 8. conflict where the loser is a tombstone → no meaningless "conflicted copy" of a delete
    p = reconcile([rec('h', T1, { deleted: true })], [rec('h', T2)], T0);
    check('delete-loser makes no copy', p.toLocal.length === 1 && p.conflicts.length === 0);

    // 9. runSync round-trip: push one local + pull one remote, then idempotent second run
    localStorage.removeItem('spx-gfx-sync');
    const local = mem([rec('L', T1)]);
    const remote = mem([rec('R', T1)]);
    const r1 = await runSync(local as any, remote as any);
    const remoteHasL = remote.store.has('packet:L');
    const localHasR = local.store.has('packet:R');
    check('runSync pushes+pulls', r1.pushed === 1 && r1.pulled === 1 && remoteHasL && localHasR);
    const r2 = await runSync(local as any, remote as any);
    check('runSync idempotent', r2.pushed === 0 && r2.pulled === 0 && r2.conflicts === 0);

    // 10. ids must be valid UUIDs (cloud documents.id is a uuid PK — a non-UUID poisons sync)
    const { uuid } = await import('/src/model/id.ts?t=' + Date.now());
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    check('uuid() is valid v4', [uuid(), uuid(), uuid()].every((u: string) => re.test(u)));

    return out;
  });

  const failures = results.filter((r) => !r.pass);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  expect(results.length).toBe(12);
});
