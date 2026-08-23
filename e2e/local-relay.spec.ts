import { test, expect, type Route, type Page, type BrowserContext } from '@playwright/test';
import { createProject } from './_create';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { relayServe, routeOrigin } from './_relay';

// The LOCAL-CONTROL door (offline local control, no command line): the overlay package
// bundles a localhost relay (two stdlib implementations of protocol v1) + double-click
// launchers, the panel gains a relay SEND transport, and every overlay graphic carries a
// relay RECEIVER that polls the ordered log. The server implementations are conformance-
// tested for real in scripts/local-relay.test.mjs (npm run test:local-relay); THIS spec
// drives both browser ends against an in-spec implementation of the same protocol, so the
// panel's sends and the graphic's receiver are pinned to v1 without spawning a server.

test('the overlay package ships the local-control bundle, and panel drives graphic through the relay protocol', async ({ page, context }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'HTML overlay (OBS / vMix)' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

  // The bundle: relay implementations, launchers per OS, the manifest.
  for (const wanted of ['relay.ps1', 'relay.py', 'Start controller.cmd', 'start-controller.command', 'start-controller.sh', 'payload.json']) {
    expect(names, wanted).toContain(`hairline/${wanted}`);
  }
  const payload = JSON.parse(await zip.file('hairline/payload.json')!.async('string'));
  expect(payload.v).toBe(1);
  expect(payload.graphics[0].file).toBe('hairline.html');

  const graphicHtml = await zip.file('hairline/hairline.html')!.async('string');
  const panelHtml = await zip.file('hairline/controlpanel.html')!.async('string');
  expect(graphicHtml).toContain('== LOCAL RELAY');
  expect(panelHtml).toContain('/relay/ping');

  // ── Drive both ends against an in-spec relay (protocol v1, same shapes the conformance
  //    harness pins on the real servers). ──
  const rows: { id: number; graphic: string; stream: string; msg: unknown }[] = [];
  let head = 0;
  const files = new Map<string, string>([
    ['hairline.html', graphicHtml],
    ['controlpanel.html', panelHtml],
  ]);
  const serve = (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/relay/ping') {
      return route.fulfill({ json: { ok: true, v: 1, head } });
    }
    if (url.pathname === '/relay/head') return route.fulfill({ json: { head } });
    if (url.pathname === '/relay/log') {
      const after = Number(url.searchParams.get('after') ?? '0');
      return route.fulfill({ json: { rows: rows.filter((r) => r.id > after).slice(0, 500), head } });
    }
    if (url.pathname === '/relay/send') {
      const body = route.request().postDataJSON() as { graphic?: string; stream?: string; msg?: unknown; items?: { graphic: string; stream?: string; msg: unknown }[] };
      const items = body.items ?? [body as { graphic: string; stream?: string; msg: unknown }];
      for (const item of items) rows.push({ id: ++head, graphic: String(item.graphic), stream: item.stream || 'program', msg: item.msg });
      return route.fulfill({ json: { head } });
    }
    const file = files.get(url.pathname.replace(/^\//, ''));
    if (file == null) return route.fulfill({ status: 404, body: 'nf' });
    return route.fulfill({ status: 200, contentType: 'text/html', body: file });
  };

  // The "OBS side": the graphic on the relay origin. Its autoplay runs on load; take it off
  // air first so the relay-driven play is unambiguous.
  const graphic = await context.newPage();
  await graphic.route('http://relay-host.local/**', serve);
  await graphic.goto('http://relay-host.local/hairline.html', { waitUntil: 'load' });
  await graphic.evaluate(() => (window as unknown as { stop(): void }).stop());
  await expect
    .poll(async () => graphic.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');

  // The operator side: the panel in "another browser" — a page with NO BroadcastChannel
  // reach (different Playwright context) so only the relay can carry the commands.
  const other = await context.browser()!.newContext();
  const panel = await other.newPage();
  await panel.route('http://relay-host.local/**', serve);
  await panel.goto('http://relay-host.local/controlpanel.html', { waitUntil: 'load' });
  await expect(panel.locator('#status')).toContainText('local relay', { timeout: 6000 });
  // Relay hosting stands the no-listener banner down (its sends are one-way into OBS).
  await panel.waitForTimeout(2800);
  await expect(panel.locator('#nolisten')).toBeHidden();

  await panel.locator('.field', { hasText: 'Name' }).locator('input[type="text"]').first().fill('Via Relay');
  await panel.getByRole('button', { name: '▶ Play' }).click();

  // The graphic's receiver polls the log and applies update + play.
  await expect(graphic.locator('#f0')).toHaveText('Via Relay', { timeout: 6000 });
  await expect
    .poll(async () => graphic.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');

  await panel.close();
  await other.close();
  await graphic.close();
});

test('the production controller: preview shows the cue without airing it, Take airs it, tallies follow the log', async ({ page, context }) => {
  // The exported LOCAL-CONTROL production package's operator surface (the page the launcher
  // opens): cue rundown + verbs + PREVIEW/PROGRAM monitors, everything through relay v1.
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const b64 = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const tpl = variantsFor('lower-third')[0].create({});
    const { doc } = createGraphic(tpl, { name: 'Anchor Strap' });
    const show = shows.createShowNamed('Controller Show');
    shows.addGraphicToShow(show.id, tpl, { graphicId: doc!.id });
    const fresh0 = shows.loadShows().find((s) => s.id === show.id)!;
    // Two cues on the one graphic: Anna, then Ben (the classic lower-third rundown).
    const cue1 = fresh0.cues![0];
    shows.updateShowCue(show.id, cue1.id, { label: 'Anna', values: { f0: 'Anna Andersson' } });
    shows.addShowCue(show.id, fresh0.graphics[0].id, { label: 'Ben', values: { f0: 'Ben Bergman' } });
    const fresh = shows.loadShows().find((s) => s.id === show.id)!;
    const zip = await buildShowZipFor(fresh, 'html-overlay');
    return zip.generateAsync({ type: 'base64' });
  });

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) {
      files.set(n.replace(/^controller_show\//, ''), await zip.file(n)!.async('string'));
    }
  }
  expect([...files.keys()]).toContain('controller.html');
  const manifest = JSON.parse(files.get('payload.json')!) as { graphics: { file: string }[] };
  const graphicFile = manifest.graphics[0].file;
  expect([...files.keys()]).toContain(graphicFile);

  const { serve } = relayServe(files);
  const origin = 'http://ctl-host.local';

  // The "OBS side": the graphic addressed as a PROGRAM stream source — managed, so it must
  // NOT autoplay; it waits for the log.
  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${graphicFile}?stream=program`, { waitUntil: 'load' });
  await air.waitForTimeout(600);
  expect(await air.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

  // The controller.
  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await expect(ctl.locator('#mode')).toContainText('SHOW');
  await expect(ctl.locator('.cue')).toHaveCount(2);

  // → Preview: the PVW monitor's copy plays with Anna; AIR stays dark.
  await ctl.locator('.cue', { hasText: 'Anna' }).click();
  await ctl.locator('#v-preview').click();
  const pvwFrame = ctl.frameLocator('#stage-pvw iframe');
  await expect(pvwFrame.locator('#f0')).toHaveText('Anna Andersson', { timeout: 6000 });
  await expect
    .poll(async () => pvwFrame.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(ctl.locator('.cue', { hasText: 'Anna' })).toHaveClass(/on-pvw/);
  expect(await air.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

  // ⟳ Take: the program source plays with Anna; the cue wears the red tally; the PGM
  // monitor mirrors air.
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f0')).toHaveText('Anna Andersson', { timeout: 6000 });
  await expect
    .poll(async () => air.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(ctl.locator('.cue', { hasText: 'Anna' })).toHaveClass(/on-air/);
  const pgmFrame = ctl.frameLocator('#stage-pgm iframe');
  await expect(pgmFrame.locator('#f0')).toHaveText('Anna Andersson', { timeout: 6000 });

  // Taking Ben on the same graphic REPLACES the layer (same instance, new data).
  await ctl.locator('.cue', { hasText: 'Ben' }).click();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f0')).toHaveText('Ben Bergman', { timeout: 6000 });
  await expect(ctl.locator('.cue', { hasText: 'Ben' })).toHaveClass(/on-air/);

  // The dashboard's shared vocabulary reached the exported page too
  // (docs/PLAYOUT_DASHBOARD.md §5): every cue row states the LAYER its graphic airs on, and the
  // rundown is the only list — there is no separate layer panel on any of the three surfaces.
  await expect(ctl.locator('.cue').first().locator('.sub')).toContainText(/^L\d+ · /);
  await expect(ctl.locator('.cue').first().locator('.lay')).toHaveText(/^L\d+$/);
  // Distinct layers here, so no row wears the clash colour — and the rail's foot, which used to
  // hold the layer panel, is gone entirely.
  await expect(ctl.locator('.cue .lay.clash')).toHaveCount(0);
  await expect(ctl.locator('.rail-foot')).toHaveCount(0);

  // SPACE is Take here as well — and never while a field has focus, which is the guard that
  // matters: the cue's fields are on this same surface.
  //
  // The guard is checked by what the SPACE DID, not by what did not change: "the other cue is
  // still on air" passes on its first poll, before a broken guard's take could possibly have
  // landed, so it proves nothing (it passed with the guard deleted). A space that reaches the
  // input cannot race — a broken guard calls preventDefault and the character never arrives.
  await ctl.locator('.cue', { hasText: 'Anna' }).click();
  const field = ctl.locator('.field input').first();
  await field.click();
  await field.fill('Anna');
  await ctl.keyboard.press('Space');
  await ctl.keyboard.type('A');
  await expect(field).toHaveValue('Anna A');

  // Focus off the fields: now SPACE takes the selected cue.
  await ctl.locator('.verbs').click({ position: { x: 5, y: 5 } });
  await ctl.keyboard.press('Space');
  await expect(ctl.locator('.cue', { hasText: 'Anna' })).toHaveClass(/on-air/);

  // ■■ All out clears air.
  await ctl.locator('#v-allout').click();
  await expect
    .poll(async () => air.locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 })
    .toBe('0');
  await expect(ctl.locator('#live-line')).toContainText('nothing on air');

  await ctl.close();
  await air.close();
});

// ── BOOT RECOVERY over the relay (docs/CLOUD_PLAYOUT.md's recovery discipline, local half) ──
// A browser source reloads: OBS restarts, a machine wakes, someone refreshes the wrong window.
// The graphic used to boot at the log HEAD and come back BLANK - off air, every field at the
// design's own defaults - and stay that way until an operator happened to press something.
// Measured before the fix on this exact walk: a board aired at 89 with its clock at 9:55 came
// back invisible, reading 88 and 10:00, with nine rows sitting unread in the log.
//
// The log IS the history, so the fix is a BOUNDED replay rather than a new report channel:
// start at the last `play` for this graphic and stream, run it off air, settle, come back.

/** Build the Cup Tie package once and serve it over an in-spec relay. */
async function cupTiePackage(page: Page, context: BrowserContext, origin: string) {
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const b64 = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const tpl = variantById('sb09')!.create({});      // House Match Board: 88-84, clock from 10:00
    const { doc } = createGraphic(tpl, { name: 'House Match Board' });
    const show = shows.createShowNamed('Cup Tie');
    shows.addGraphicToShow(show.id, tpl, { graphicId: doc!.id });
    const fresh0 = shows.loadShows().find((s) => s.id === show.id)!;
    shows.updateShowCue(show.id, fresh0.cues![0].id, { label: 'Kick-off' });
    const fresh = shows.loadShows().find((s) => s.id === show.id)!;
    return (await buildShowZipFor(fresh, 'html-overlay')).generateAsync({ type: 'base64' });
  });
  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
  }
  const manifest = JSON.parse(files.get('payload.json')!) as { graphics: { file: string }[] };
  const { serve, rows } = relayServe(files);
  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${manifest.graphics[0].file}?stream=program`, { waitUntil: 'load' });
  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await expect(ctl.locator('#mode')).toContainText('SHOW');
  return { air, ctl, rows };
}

/** What the reloaded source is showing: whether it is on air, and the two live values. */
const airState = (air: Page) =>
  air.evaluate(() => ({
    opacity: getComputedStyle(document.documentElement).opacity,
    score: document.querySelector('#f1')?.textContent ?? null,
    clock: document.querySelector('#f5')?.textContent ?? null,
  }));

test('a relay browser source reloaded mid-show comes back on air, with the score and the real match time', async ({ page, context }) => {
  test.setTimeout(180_000);
  const { air, ctl } = await cupTiePackage(page, context, 'http://relay-recover.local');

  // A show happens: the board airs, a goal is bumped on air, the clock starts.
  await ctl.locator('.cue', { hasText: 'Kick-off' }).click();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f5')).toHaveText('10:00', { timeout: 10_000 });
  await ctl.locator('.field', { hasText: /^F1 · / }).locator('button.step', { hasText: '+' }).click();
  await expect(air.locator('#f1')).toHaveText('89', { timeout: 10_000 });
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Start clock' }).click();
  await expect(air.locator('#f5')).toHaveText('9:55', { timeout: 20_000 });

  // THE RELOAD - and nothing else. No operator touches anything after this point.
  const at = Date.now();
  await air.reload({ waitUntil: 'load' });
  // The receiver HIDES the page only once its relay fetch has answered, so right after `load`
  // the root still reads opacity 1 over the design's own defaults (88, 10:00) - a poll on the
  // opacity alone passed at once and read the pre-replay picture whenever the fetch was slower
  // than the first sample (measured under a busy machine). Wait for the RECOVERED value, which
  // is the thing under test, then for the page to be back on air.
  await expect
    .poll(() => airState(air).then((s) => s.score), { timeout: 15_000, message: 'the goal must survive the reload' })
    .toBe('89');
  await expect.poll(() => airState(air).then((s) => s.opacity), { timeout: 15_000 }).toBe('1');
  const back = await airState(air);

  expect(back.score, 'the goal must survive the reload').toBe('89');
  // The clock kept running: it reads later than it did before the reload, by about the wall
  // time that passed. Asserting a fixed string here would be asserting the clock had STOPPED.
  const elapsed = (Date.now() - at) / 1000;
  const behind = (t: string) => 10 * 60 - ((parseInt(t.split(':')[0], 10) || 0) * 60 + (parseInt(t.split(':')[1], 10) || 0));
  expect(behind(back.clock!)).toBeGreaterThanOrEqual(5);          // never back at the 10:00 seed
  expect(behind(back.clock!)).toBeLessThanOrEqual(5 + elapsed + 2);

  await ctl.close();
  await air.close();
});

test('relay recovery is never watchable, and a graphic that was never on air stays off', async ({ page, context }) => {
  test.setTimeout(180_000);
  const { air, ctl } = await cupTiePackage(page, context, 'http://relay-quiet.local');

  // NOTHING has aired yet. A reload here must recover NOTHING - a graphic that was never
  // played is supposed to be blank, and replaying a show nobody started is worse than blank.
  await air.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3_000);
  expect((await airState(air)).opacity).toBe('1');       // not left hidden by a replay that never ran
  await expect(air.locator('.scoreboard')).toHaveCSS('opacity', '0');

  // Now air it, then take it OFF air, then reload: still blank, because that is the picture
  // the log describes. Recovery restores what was on, never what once was.
  await ctl.locator('.cue', { hasText: 'Kick-off' }).click();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f5')).toHaveText('10:00', { timeout: 10_000 });
  // The take button IS the off switch once its cue is live - the controller relabels it.
  await expect(ctl.locator('#v-take')).toContainText('TAKE OFF', { timeout: 10_000 });
  await ctl.locator('#v-take').click();
  await expect(air.locator('.scoreboard')).toHaveCSS('opacity', '0', { timeout: 10_000 });

  await air.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3_000);
  await expect(air.locator('.scoreboard')).toHaveCSS('opacity', '0');
  expect((await airState(air)).opacity).toBe('1');

  await ctl.close();
  await air.close();
});

test('a scorebug over the relay: the stepper bumps the score on air, and the clock verbs run it', async ({ page, context }) => {
  test.setTimeout(180_000);
  // THE OFFLINE HALF of Phase 4's end-to-end proof. Everything above drives a lower third,
  // whose whole behaviour is "show these words" - a scoreboard is the first exported graphic
  // that has to keep RUNNING after the take, so this covers the two things that make it one:
  // a score bumped from the controller's stepper, and the clock verbs actually starting and
  // holding a clock inside the aired overlay. No Supabase, no hosted log - the bundled local
  // relay, which is what a student running the exported package on one machine actually uses.
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const b64 = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    // sb05 - the house scorebug: counts UP from 0:00, so a running clock is visibly moving
    // rather than merely being reported as running.
    const tpl = variantById('sb05').create({});
    const { doc } = createGraphic(tpl, { name: 'House Scorebug' });
    const show = shows.createShowNamed('Match Night');
    shows.addGraphicToShow(show.id, tpl, { graphicId: doc.id });
    const fresh0 = shows.loadShows().find((s) => s.id === show.id);
    shows.updateShowCue(show.id, fresh0.cues[0].id, {
      label: 'Kick off',
      values: { f0: 'ASHTON', f1: '0', f2: 'MARSKE', f3: '0', f4: '1H' },
    });
    const fresh = shows.loadShows().find((s) => s.id === show.id);
    const zip = await buildShowZipFor(fresh, 'html-overlay');
    return zip.generateAsync({ type: 'base64' });
  });

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    // Strip whatever folder the production's own name produced, rather than one hard-coded
    // slug - the package is named after the show.
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) {
      files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
    }
  }
  const manifest = JSON.parse(files.get('payload.json')!) as { graphics: { file: string }[] };
  const graphicFile = manifest.graphics[0].file;

  const { serve } = relayServe(files);
  const origin = 'http://sport-host.local';

  // The OBS side: the overlay addressed as the program source. Managed, so it waits.
  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${graphicFile}?stream=program`, { waitUntil: 'load' });

  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await ctl.locator('.cue', { hasText: 'Kick off' }).click();
  // Off air the −/+ pair is greyed (docs/PLAYOUT_DASHBOARD.md §7c): it acts on air, so before
  // the take there is nothing for it to act on, and it says so rather than staging in silence.
  await expect(ctl.locator('.field', { hasText: 'Score A' }).locator('button.step').first()).toBeDisabled();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f0')).toHaveText('ASHTON', { timeout: 10_000 });
  await expect.poll(async () => air.locator('.scoreboard').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

  // The bump below ACTS ON AIR, so the precondition has to be stated rather than assumed: the
  // controller learns what is live from the LOG, on its own poll, and a press that lands before
  // that row arrives stages instead of airing - which looks exactly like a broken bump.
  await expect(ctl.locator('.cue', { hasText: 'Kick off' })).toHaveClass(/on-air/, { timeout: 10_000 });

  // THE SCORE, bumped rather than typed. The exported controller renders the number field as
  // −/value/+ (it is a third renderer and deliberately has no operator step-size box, unlike
  // the two React surfaces), so locate the row by its label and press +.
  const scoreRow = ctl.locator('.field', { hasText: 'Score A' });
  const plus = scoreRow.locator('button.step', { hasText: '+' });
  await plus.click();
  // A goal on the LIVE cue airs on the press: this is the ± LIVE NUMBERS bump
  // (docs/PLAYOUT_DASHBOARD.md §7c), the one data write that does not wait for a verb, and it
  // travels as a partial carrying that field alone. The cue keeps the new value in step, so a
  // later ⟳ Take or ✎ Update cannot regress the score. The payload SHAPE is pinned in
  // production-controls.spec.ts; here the point is that the aired board really moved.
  await expect(scoreRow.locator('input[type="number"]')).toHaveValue('1');
  await expect(air.locator('#f1')).toHaveText('1', { timeout: 10_000 });
  await plus.click();
  await expect(air.locator('#f1')).toHaveText('2', { timeout: 10_000 });
  // ✎ Update pushes the whole cue to the live graphic without re-animating the board - the
  // deliberate other half, and it agrees with the bumps rather than undoing them.
  await ctl.locator('#v-update').click();
  await expect(air.locator('#f1')).toHaveText('2', { timeout: 10_000 });

  // THE CLOCK. Its whole point is that it keeps moving with nobody touching it, so the only
  // honest assertion is two reads separated by real seconds - a single frame proves nothing.
  const clockNow = () => air.locator('.scoreboard-clock').textContent();
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Start clock' }).click();
  const started = await clockNow();
  await expect.poll(async () => (await clockNow()) !== started, { timeout: 15_000 }).toBe(true);

  // Held is the other half, and the one an operator notices when it is wrong: after Stop the
  // value must be the SAME across two reads several seconds apart.
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Stop clock' }).click();
  await air.waitForTimeout(1200);            // let any in-flight tick land before sampling
  const held = await clockNow();
  await air.waitForTimeout(2500);
  expect(await clockNow()).toBe(held);

  // Reset returns to the design's own period start, which is what makes a second half one
  // press - and it is 0:00 here because this design counts up from there.
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Reset to period start' }).click();
  await expect.poll(async () => clockNow(), { timeout: 10_000 }).toBe('0:00');
  // The score is DATA and no clock verb touches it: it survived all three.
  await expect(air.locator('#f1')).toHaveText('2');

  await ctl.close();
  await air.close();
});
