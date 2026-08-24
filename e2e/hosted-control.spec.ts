import { test, expect } from '@playwright/test';
import { createProject } from './_create';

// Hosted control ENTRIES (docs/CONTROL_LAYER.md + docs/SAVED_CONTENT_MODEL.md §4): a show's
// published `panel` spec carries every graphic's saved entries, so the hosted ?control= page
// can offer them as a read-only switcher.
//
// Publishing and operating need a real backend, which this suite deliberately does not have
// (offline-pinned) — the hosted page itself is covered by the maintainer's live checklist.
// What is pinned here is the half that runs locally and decides whether an operator sees
// their rundown rows at all: which library record a show graphic's entries come from.

test('a saved graphic carries its entries into the show it is added to', async ({ page }) => {
  await createProject(page, 'Hairline');

  // Save it, then build two entries on its control panel — the operator's rundown rows.
  await page.getByTestId('save-graphic').click();
  await page.getByTestId('save-name').fill('Presenter lower third');
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-graphics').click();
  const row = page.locator('.lib-row', { hasText: 'Presenter lower third' });
  await row.getByTestId('row-menu').click();
  await row.getByTestId('open-control').click();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  await page.getByTestId('add-entry').click();
  await page.getByTestId('entry-field-f0').fill('Anna Andersson');
  await page.getByTestId('entry-field-f1').fill('Presenter');
  await page.getByTestId('add-entry').click();
  await page.getByTestId('entry-field-f0').fill('Michael Smith');
  await expect(page.locator('.control-entry')).toHaveCount(2);

  // Back into the editor (the document keeps its library link) and into a show.
  await page.getByTestId('control-open-editor').click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Presenter lower third');
  await page.getByTestId('dock-tab-control').click();
  const shows = page.locator('.panel-section', { hasText: 'Productions' });
  await shows.getByPlaceholder('New production name').fill('Evening Show');
  await shows.getByRole('button', { name: 'Create', exact: true }).click();
  await shows.getByRole('button', { name: '+ Add current' }).click();
  await expect(shows.locator('.status-ok')).toContainText('is in the production');

  // The show's copy records WHICH library graphic it came from — the link the panel follows
  // (a name match would pass here by luck; this pins the id).
  const link = await page.evaluate(async () => {
    const { loadShows } = await import('/src/model/shows.ts');
    const { graphicById } = await import('/src/model/library.ts');
    const id = loadShows()[0].graphics[0].graphicId ?? null;
    return { id, name: id ? graphicById(id)?.name : null };
  });
  expect(link.name).toBe('Presenter lower third');

  // The published panel spec — what the hosted page renders from — carries both entries.
  const panel = await page.evaluate(async () => {
    const { buildPanelSpec } = await import('/src/control/hostedControl.ts');
    const { loadShows } = await import('/src/model/shows.ts');
    return buildPanelSpec(loadShows()[0]);
  });
  expect(panel).toHaveLength(1);
  expect(panel[0].entries.map((e) => e.label)).toEqual(['Anna Andersson', 'Michael Smith']);
  expect(panel[0].entries[0].values.f1).toBe('Presenter');
  // Never the template payload — the spec stays the operator's view of the graphic.
  expect(Object.keys(panel[0])).toEqual(['name', 'fields', 'js', 'images', 'entries', 'dataRows']);
});

test('a production dataset publishes the rows its graphics can load', async ({ page }) => {
  // The hosted control page never sees the show record, only what publishing wrote — so the
  // Data workspace's other half (loading a row into a cue) reaches it as PUBLISHED rows,
  // matched by the same `control/cueData.ts` the in-app page runs live. Before this the hosted
  // page had no data loading at all, on the surface a class actually operates from.
  await createProject(page, 'Hairline');

  const spec = await page.evaluate(async () => {
    const { buildPanelSpec } = await import('/src/control/hostedControl.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { setFieldTitle } = await import('/src/blocks/edit.ts');
    // Name the first two fields so a table can bind to them by title.
    let template = useTemplateStore.getState().template;
    template = setFieldTitle(template, 'f0', 'Name');
    template = setFieldTitle(template, 'f1', 'Role');
    const show = {
      id: 'show-data-1',
      name: 'Data Show',
      updatedAt: new Date().toISOString(),
      graphics: [
        { id: 'copy-1', name: 'Guest strap', type: template.type, savedAt: new Date().toISOString(), template },
      ],
      datasets: [
        {
          id: 'ds1',
          name: 'Guests',
          kind: 'roster',
          columns: [
            { key: 'c0', label: 'Name' },
            { key: 'c1', label: 'Role' },
          ],
          rows: [
            { id: 'r1', values: { c0: 'Anna Andersson', c1: 'Presenter' } },
            { id: 'r2', values: { c0: 'Ben Berg', c1: 'Reporter' } },
          ],
        },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return buildPanelSpec(show as any)[0].dataRows;
  });

  // One row per table row (no A/B sides on a lower third), labelled by the first non-empty
  // cell, with the values already resolved against the FIELD IDS.
  expect(spec.map((r: { label: string }) => r.label)).toEqual(['Guests: Anna Andersson', 'Guests: Ben Berg']);
  expect(spec[0].side).toBeNull();
  expect(spec[0].values).toEqual({ f0: 'Anna Andersson', f1: 'Presenter' });
});

test('entries resolve by library id, fall back to a unique name, and never guess', async ({ page }) => {
  await createProject(page, 'Hairline');

  const result = await page.evaluate(async () => {
    const { createGraphic, newEntry } = await import('/src/model/library.ts');
    const { buildPanelSpec } = await import('/src/control/hostedControl.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const template = useTemplateStore.getState().template;

    const linked = createGraphic(template, {
      name: 'Presenter lower third',
      entries: [newEntry('Anna Andersson', { f0: 'Anna Andersson' })],
    }).doc;
    // Two library graphics sharing a name: no unique match, so no entries may be guessed.
    createGraphic(template, { name: 'Twin', entries: [newEntry('Left', { f0: 'Left' })] });
    createGraphic(template, { name: 'Twin', entries: [newEntry('Right', { f0: 'Right' })] });

    const show = (graphics: unknown[]) =>
      ({ id: 'show-1', name: 'Evening Show', graphics, updatedAt: new Date().toISOString() });
    const copy = (name: string, graphicId?: string) => ({
      id: `copy-${name}-${graphicId ?? 'none'}`,
      name,
      type: template.type,
      savedAt: new Date().toISOString(),
      template,
      ...(graphicId ? { graphicId } : {}),
    });

    const spec = (graphics: unknown[]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildPanelSpec(show(graphics) as any).map((g) => g.entries.map((e) => e.label));

    return {
      byId: spec([copy('Renamed in the show', linked.id)]),
      byName: spec([copy('Presenter lower third')]),
      ambiguous: spec([copy('Twin')]),
      staleLink: spec([copy('Presenter lower third', 'not-a-record')]),
      unknown: spec([copy('Never saved')]),
    };
  });

  // The id wins even when the show's copy was renamed…
  expect(result.byId).toEqual([['Anna Andersson']]);
  // …an older copy with no link resolves by its unique name…
  expect(result.byName).toEqual([['Anna Andersson']]);
  // …and an ambiguous name, a stale link, or an unsaved graphic publishes nothing.
  expect(result.ambiguous).toEqual([[]]);
  expect(result.staleLink).toEqual([[]]);
  expect(result.unknown).toEqual([[]]);
});

// ── THE HOSTED RECEIVER'S BOOT, offline ──────────────────────────────────────────────────
//
// The block appended to a graphic whose production has a hosted control page (hostedReceiver.ts)
// is plain generated JS talking to two addresses: the REST RPCs and the Realtime socket. Both
// can be answered in-spec, so the discipline that decides whether a published graphic survives a
// bad minute IS pinnable offline - it had simply never been pinned, and the defects below rode a
// year of releases on the plane real productions publish onto.
//
// Load is not how this family reproduces. Injecting the dropped request is, and it is
// deterministic in one run - the technique local-relay.spec.ts uses for the local half.

/** A graphic reduced to what a receiver touches: the SPX globals, and a record of what ran. */
const receiverHost = (block: string) => `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="f0"></div>
<script>
window.__applied = [];
window.SPXGCTemplateDefinition = { DataFields: [{ field: 'f0', ftype: 'textfield' }] };
function update(json) {
  var d = {};
  try { d = JSON.parse(json || '{}'); } catch (e) { d = {}; }
  window.__applied.push('update:' + (d.f0 === undefined ? '' : d.f0));
  if (d.f0 !== undefined) document.getElementById('f0').textContent = d.f0;
}
function play() { window.__applied.push('play'); }
function stop() { window.__applied.push('stop'); }
function next() { window.__applied.push('next'); }
</script>
<script>${block}</script>
</body></html>`;

/** The receiver block for a fixed capability, generated by the real exporter. */
async function receiverBlock(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/app');
  await page.keyboard.press('Escape');
  return page.evaluate(async () => {
    const { hostedReceiverBlock } = await import('/src/control/hostedReceiver.ts');
    return hostedReceiverBlock({ ref: 'bootref', key: 'anon-key', slug: 'cap-slug', graphic: 'Board' });
  });
}

test('a hosted graphic whose boot resolve is dropped still comes back on air', async ({ page, context }) => {
  test.setTimeout(120_000);
  // THE RESOLVE IS THE ONE REQUEST THE WHOLE AIRING HANGS ON: it carries the show id (no id, no
  // subscription), the log baseline and the graphic's own last report. It used to be asked once,
  // with a failure swallowed into null and read as the answer a REVOKED slug gives - so a single
  // dropped request left the graphic dead for the whole show, silently, and nothing would ever
  // wake it. Here the first two attempts fail; the airing must survive them.
  const html = receiverHost(await receiverBlock(page));

  let resolves = 0;
  const graphic = await context.newPage();
  await graphic.routeWebSocket('wss://bootref.supabase.co/**', () => {
    /* joined and silent: this test is about the boot, not about live rows */
  });
  await graphic.route('https://bootref.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'control_show_by_slug') {
      resolves += 1;
      if (resolves <= 2) return route.abort('failed');
      return route.fulfill({
        json: [{ id: 'show-1', last_event_id: 7, live: { Board: { data: { f0: 'RECOVERED' } } } }],
      });
    }
    return route.fulfill({ json: [] });
  });
  await graphic.route('http://hosted-boot.local/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html }),
  );

  await graphic.goto('http://hosted-boot.local/board.html', { waitUntil: 'load' });
  // The graphic rebuilds from its own last report only once the resolve finally answers.
  await expect(graphic.locator('#f0')).toHaveText('RECOVERED', { timeout: 30_000 });
  expect(resolves, 'the dropped attempts must be retried, not concluded from').toBeGreaterThan(2);

  await graphic.close();
});

test('a hole in the hosted log is filled from the log, not papered over by the row that revealed it', async ({ page, context }) => {
  test.setTimeout(120_000);
  // A row arriving with rows missing in front of it means the socket dropped some. The receiver
  // used to APPLY that row and then fill the tail - but applying it pushed the cursor past the
  // gap, so the tail's older rows came back and were dropped as duplicates. The gap closed on
  // paper while the commands inside it never ran: here that is the PLAY, so the board would have
  // taken its new score without ever coming on air.
  const html = receiverHost(await receiverBlock(page));

  const log = [
    { id: 1, graphic: 'Board', msg: { t: 'play' } },
    { id: 2, graphic: 'Board', msg: { t: 'update', data: { f0: 'B' } } },
    { id: 3, graphic: 'Board', msg: { t: 'update', data: { f0: 'C' } } },
  ];
  // The three rows are written only AFTER the receiver's join-time tail fill has come back
  // empty. Without that the first version of this test proved nothing: the fill that runs on
  // every (re)connect had already delivered all three, so the live row was a duplicate and the
  // hole path never ran - it passed with the defect put back, which is how it was caught.
  const visible: typeof log = [];
  let tailReads = 0;
  let socket: import('@playwright/test').WebSocketRoute | null = null;

  const graphic = await context.newPage();
  await graphic.routeWebSocket('wss://bootref.supabase.co/**', (ws) => {
    socket = ws;
  });
  await graphic.route('https://bootref.supabase.co/**', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'control_show_by_slug') {
      // Nothing reported yet, and the baseline is the log's start: everything below is a gap.
      return route.fulfill({ json: [{ id: 'show-1', last_event_id: 0, live: {} }] });
    }
    if (name === 'control_tail') {
      const after = Number((route.request().postDataJSON() as { p_after?: number }).p_after ?? 0);
      tailReads += 1;
      return route.fulfill({ json: visible.filter((r) => r.id > after) });
    }
    return route.fulfill({ json: [] });
  });
  await graphic.route('http://hosted-hole.local/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html }),
  );

  await graphic.goto('http://hosted-hole.local/board.html', { waitUntil: 'load' });
  // The join-time fill has run and found nothing…
  await expect.poll(() => tailReads, { timeout: 30_000 }).toBeGreaterThan(0);
  expect(await graphic.evaluate(() => (window as unknown as { __applied: string[] }).__applied)).toEqual([]);
  // …now the show happens, and only the LAST of its three rows reaches the socket: rows 1 and 2
  // are the ones a dropped connection eats. That is the hole.
  visible.push(...log);
  socket!.send(JSON.stringify({ event: 'postgres_changes', payload: { data: { record: log[2] } } }));

  // All three run, in log order. Under the old code this read ['update:C'] alone: the row that
  // revealed the hole was applied first and the two it was hiding were then dropped.
  await expect
    .poll(() => graphic.evaluate(() => (window as unknown as { __applied: string[] }).__applied), { timeout: 30_000 })
    .toEqual(['play', 'update:B', 'update:C']);

  await graphic.close();
});
