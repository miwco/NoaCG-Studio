import { test, expect } from '@playwright/test';
import { createProject } from '../_create';
import { haveCreds, signIn } from './_helpers';

// THE HOSTED CONTROL PAGE SURVIVES ITS OPERATOR'S FIRST TAKE (docs/CLOUD_PLAYOUT.md §3).
//
// The page rebuilds its PROGRAM monitor once on boot, so an operator opening it mid-show sees
// what is really on air instead of an empty box beside a rundown row marked ON AIR. That rebuild
// reads the layers THE RESOLVE reported (`show.liveCue` as `control_show_by_slug` answered it),
// and it is latched by a ref so it can only ever run once.
//
// Both of those are load-bearing, and the round-1 bug is what proves it: keyed on the LIVE
// `liveCue` state instead, the rebuild re-fired the moment the operator's own first take came
// back round the log - a round-trip after the press, with nothing else on screen to explain it.
// On this page it replayed the entrance the follower had just applied (the graphic playing in
// twice); the cockpit had the same shape and a worse ending, snapping to a stale "off" and
// taking the graphic OFF AIR. A first take is the single most common thing an operator does,
// and the class drives this surface from a phone.
//
// THIS CANNOT BE PINNED OFFLINE, which is why it sits here and why it went unverified so long:
// the defect needs a real durable log to come back round. An offline build has no `control_shows`
// row, no `control_events` to follow and no resolve to key on, so the whole mechanism is absent
// rather than merely untested (`e2e/hosted-control.spec.ts` says as much and covers the local
// half only).
//
// WHAT THIS GATES, MEASURED RATHER THAN ASSUMED. It was mutation-tested on 2026-08-21 by putting
// the round-1 bug back (keyed on the live `liveCue` state, ref guard removed) and re-running:
// **it still passed**. So state it plainly - THIS SPEC DOES NOT GATE THE DOUBLE ENTRANCE. On this
// page the re-fired rebuild replays an animation and changes no state the DOM reports: GSAP does
// not visibly tick headless, the monitor's iframes are sandboxed without same-origin so a test
// cannot count what reached them, and the re-applied data equals what is already on air. There is
// no observable left, which is exactly why the defect survived review the first time.
//
// What it DOES gate is the path underneath, none of which had ever run against a real backend:
// a signed-out capability URL resolves, the boot rebuild runs against a real `control_show_by_slug`
// answer, a first take reaches the durable log, comes back round the follower, and leaves the
// layer on air with the monitor still holding it. That also catches the cockpit's ending - a
// rebuild that blanks the monitor or drops the layer - because those ARE state the DOM answers.
//
// Closing the remaining hole needs an observable that does not exist yet (a play counter on the
// stage seam, or a rendered marker the interpreter updates per entrance). Worth doing; not worth
// pretending this file already does it.

test.skip(!haveCreds, 'E2E_EMAIL / E2E_PASSWORD unset — configured-mode spec');

/** Publish nothing behind us: this account is shared by the live suite, and a leftover published
 *  production would still hold its reserved addresses on the next run (migration 0040). */
async function clearPublishedShows(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(async () => {
    const { loadShows, deleteShow } = await import('/src/model/shows.ts');
    const { unpublishControlShow } = await import('/src/control/hostedControl.ts');
    for (const s of loadShows()) {
      if (s.hostedSlug || s.outputSlug) await unpublishControlShow(s.id).catch(() => {});
      deleteShow(s.id);
    }
    const { syncNow } = await import('/src/backend/syncController.ts');
    await syncNow();
  });
}

test('a fresh operator page boots, takes its first cue, and holds it on air', async ({ page, context }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.keyboard.press('Escape'); // the wizard signIn leaves open — not this walk
  await clearPublishedShows(page);

  await createProject(page);
  // The analytics prompt is fixed bottom-right at z-index 1200, which is where the Links
  // popover's foot lands on a laptop viewport - decline it before it covers Publish.
  const consent = page.getByTestId('analytics-consent');
  if (await consent.isVisible().catch(() => false)) {
    await consent.getByRole('button', { name: 'No thanks' }).click();
  }

  const showName = `Recovery Walk ${Date.now()}`;
  await page.getByTestId('dock-tab-control').click();
  const section = page.locator('.panel-section', { hasText: 'Productions' });
  await section.getByPlaceholder('New production name').fill(showName);
  await section.getByRole('button', { name: 'Create', exact: true }).click();
  await section.getByRole('button', { name: '+ Add current' }).click();
  await section.getByTestId('open-production-page').click();
  await expect(page.getByTestId('production-page')).toBeVisible();

  await page.getByTestId('production-publish').click();
  await expect(page.getByTestId('production-mode')).toContainText('SHOW', { timeout: 30_000 });
  await page.locator('.lib-menu-backdrop').click({ position: { x: 5, y: 5 } });

  const slug = await page.evaluate(async (name) => {
    const { loadShows } = await import('/src/model/shows.ts');
    return loadShows().find((x) => x.name === name)?.hostedSlug ?? null;
  }, showName);
  expect(slug, 'publishing must mint a hosted control slug').toBeTruthy();

  // A SEPARATE PAGE is the point: this is the capability URL an operator opens on their phone,
  // signed out, with no memory of the production - exactly the boot the rebuild runs on.
  const op = await context.newPage();
  await op.goto(`/app?control=${encodeURIComponent(slug as string)}`);
  await expect(op.getByTestId('hosted-control-page')).toBeVisible({ timeout: 60_000 });

  // Nothing has ever aired on this production, so the rebuild has nothing to replay and the
  // monitor says so. Establishing this is what makes the assertions after the take mean
  // something: whatever appears below was put there by the TAKE, not by the boot.
  const chip = op.getByTestId('hosted-live-chip');
  const programEmpty = op.getByTestId('hosted-program-stage').locator('.prod-monitor-empty');
  await expect(chip).toContainText('nothing on air');
  await expect(programEmpty).toBeVisible();

  // THE FIRST TAKE OF THE SESSION - the press that used to detonate the rebuild.
  await op.getByTestId('hosted-cues').locator('.pd-cue').first().getByTestId('hosted-select-cue').click();
  await op.getByTestId('hosted-take-cue').click();
  await expect(chip).toContainText('on air:', { timeout: 30_000 });
  await expect(programEmpty).toHaveCount(0);

  // WAIT FOR THE TAKE TO COME BACK ROUND THE LOG. This is the whole timing of the defect: the
  // press is local and optimistic, the regression fires when the row returns over the follower.
  // The action log renders exactly those returned rows, so a row appearing IS the round-trip -
  // a fixed sleep would either race it or outlast the evidence.
  //
  // ATTACHED, not visible: the log is a collapsed <details>, so its rows render hidden until an
  // operator opens it. Asserting visibility here waited out the full timeout on a row that had
  // been in the DOM for thirty seconds.
  await expect(op.getByTestId('hosted-action-log-row').first()).toBeAttached({ timeout: 30_000 });

  // The graphic is still up, and the monitor still has it. Under the round-1 bug the rebuild
  // re-fired here: this page replayed the entrance, and the cockpit's copy snapped to a stale
  // "off" and took the layer off air.
  await expect(chip).toContainText('on air:');
  await expect(programEmpty).toHaveCount(0);

  // And it STAYS - the follower keeps delivering (the report the graphic writes back is itself
  // another row), so a rebuild latched wrongly has more than one chance to fire.
  await expect(chip).toContainText('on air:', { timeout: 10_000 });
  await expect(programEmpty).toHaveCount(0);

  await op.close();
  await clearPublishedShows(page);
});
