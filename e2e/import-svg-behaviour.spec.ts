import { test, expect, type Page, type Route } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import nodePath from 'node:path';
import JSZip from 'jszip';
import { settleDurableWrites } from './_durable';
import { relayServe, routeOrigin } from './_relay';
import { bindEveryTextLayer, dropSvg, intoProduction, QUIZ_SVG, SCORE_SVG, SCOREBUG_SVG, VOTE_SVG } from './_svg-import';
import { openWorkspace } from './_workspace';

// IMPORTED ARTWORK THAT BEHAVES (docs/GRAPHIC_BEHAVIOUR_PLAN.md).
//
// The two September cases, each walked the way a person walks it: drop the SVG on the Import
// door, map it, add it to a production, and drive it from the operator's own controls.
//
//  1. THE PLAIN SCOREBOARD needs no behaviour at all, and this spec exists partly to keep that
//     true. A numeric SVG layer becomes an `ftype: number` field, and every control surface
//     renders a number field as a ± stepper with no per-template code (src/control/controlModel.ts).
//     The assertions below are therefore about the GENERIC pipeline: the stepper reaches the live
//     cue, a bump is a partial single-field update (so the entrance never replays), and the
//     figure survives a reload. That road did not go away when the score BEHAVIOUR shipped
//     (case 4) - it is still what a board with no behaviour bound gets, and it is still the
//     typed-correction road on a board that has one.
//  2. THE QUIZ is the pilot. Its machine and its buttons are the catalog answer board's, reused;
//     what is new is that the drawn STATES are the designer's own layers, shown and hidden by
//     the machine. The assertions reach inside the on-air renderer and read which of those
//     layers is actually lit.
//  3. THE LIVE VOTE is the third behaviour (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12) and the first one
//     that reaches OUTSIDE the graphic: the counts come from the audience plane, which has
//     counted votes since Phase 6 and had nowhere to put them on artwork somebody drew. The walk
//     is therefore the whole join — drop, bind, open a vote, drive votes through the offline
//     provider's simulator, stage the counts, take the cue, and read the bars in the renderer.
//  4. THE SCORE TRACKER is the fourth (docs/backlog/scoreboard-behaviour.md), and it is the other
//     half of what 2026-09-12 needs. What is new about it is the OPERATOR'S three verbs rather
//     than the paint: one press adds a point AND plays the designer's flash, one takes both back,
//     one starts a new game. So its walk drives all three from the dashboard and reads both the
//     figures and the drawn layers in the renderer - a scoreboard that says the wrong number is
//     the only failure this graphic can really have.
//
// The first two fixtures are the SHIPPED SAMPLES (docs/svg-samples/) rather than copies: the
// files a designer is handed are the files the tests walk, so the two cannot drift. The vote
// board and the four-team score board are corpus fixtures (e2e/fixtures/svg-corpus/), because
// neither is offered as a sample.


/**
 * FRAMES FOR A HUMAN, off by default.
 *
 * `NOACG_SHOTS=<dir> npx playwright test import-svg-behaviour` writes one PNG per beat of the
 * walk there. A green assertion says the class is on the right layer; it does not say the board
 * LOOKS right, and this pilot's whole question is what a state looks like on somebody else's
 * artwork — so the frames exist to be looked at, and the suite stays fast when nobody is.
 */
const SHOTS = process.env.NOACG_SHOTS ?? '';
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

/** The offline walk starts from a cold /app; the live one arrives already signed in, which is
 *  why the shared helper does not navigate. */
async function openImportDoor(page: Page, fixture: string) {
  await page.goto('/app');
  await dropSvg(page, fixture);
}

test('imported scoreboard: a numeric layer is a ± stepper that acts on air, and survives a reload', async ({ page }) => {
  await openImportDoor(page, SCOREBUG_SVG);

  await bindEveryTextLayer(page);
  await expect(page.getByTestId('map-svg-fields')).toContainText('7 of 7');

  await shot(page, '1-scoreboard-mapping');
  await intoProduction(page, 'Match scorebug', 'Saturday Match');
  await settleDurableWrites(page);

  // The scores arrived as NUMBER fields, so the panel offers them as steppers — the generic
  // control model doing it, with nothing in this template asking for it.
  const live = page.getByTestId('live-numbers');
  await expect(live).toContainText('Home score');
  await expect(live).toContainText('Away score');

  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  // Two up, one down, from the LIVE controls.
  const homePlus = live.getByTestId('live-number-f1-up');
  const awayMinus = live.getByTestId('live-number-f2-down');
  await homePlus.click();
  await homePlus.click();
  await awayMinus.click();

  const home = page.getByTestId('cue-field-f1');
  const away = page.getByTestId('cue-field-f2');
  await shot(page, '2-scoreboard-bumped');
  await expect(home).toHaveValue('4'); // drawn as 2
  await expect(away).toHaveValue('0'); // drawn as 1

  // THE ENTRANCE MUST NOT REPLAY. A bump is a partial update carrying one field, so the log
  // records updates and nothing else — one "Played in" for the take, and no second one.
  // Scoped to the ROWS: the collapsed summary repeats the newest line, so an unscoped text
  // match counts the latest entry twice.
  const log = page.getByTestId('action-log-row');
  await expect(log.filter({ hasText: 'Updated 1 field' })).toHaveCount(3);
  await expect(log.filter({ hasText: 'Played in' })).toHaveCount(1);

  // And the figures are the production's, not the session's. A bump edits the cue DRAFT, which
  // flushes into the Show record on a 300 ms idle (ProductionPage `editDraft`) — so the wait is
  // for the debounce first and the disk second, exactly as production-persistence.spec.ts does.
  // Reloading inside that window is what a dropped laptop does, and the score would be the
  // aired one rather than the stored one.
  await page.waitForTimeout(300);
  await settleDurableWrites(page);
  await page.reload();
  await expect(page.getByTestId('cue-field-f1')).toHaveValue('4');
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('0');
});

test('imported score board: four teams are proposed, and one press adds a point and plays the flash', async ({ page }) => {
  // TWO OR MORE TEAMS, DISCOVERED FROM THE ARTWORK (owner, 2026-09-03: "a simple score tracker
  // with two or more teams"). Every scoreboard this suite walked before this one had two, so
  // nothing measured whether four rows survive the door - and four is the shape the 2026-09-12
  // production actually needs, because it is a class quiz with four groups rather than a match.
  test.slow(); // the import, a production, a take, and eight presses read in the renderer
  await openImportDoor(page, SCORE_SVG);

  // THE PROPOSAL (draft.ts proposeScoreBinding). A designer who named layers the way
  // docs/SVG_AUTHORING.md section 5b tells them to opens this step with every picker filled. It
  // is an accelerator, never a gate - each of these is a select the author can change.
  await expect(page.getByTestId('map-svg-behaviour-kind')).toHaveValue('score');
  await expect(page.getByTestId('map-svg-score-count')).toHaveValue('4');
  for (const at of [0, 1, 2, 3]) {
    const n = at + 1;
    await expect(page.getByTestId(`map-svg-score-name-${at}`).locator('option:checked')).toHaveText(`Team ${n}`);
    await expect(page.getByTestId(`map-svg-score-figure-${at}`).locator('option:checked')).toHaveText(`Score ${n}`);
    // The flashes are switched off in the file, which is how a reader tells a moment from base
    // artwork in a list of groups.
    await expect(page.getByTestId(`map-svg-score-flash-${at}`).locator('option:checked')).toHaveText(
      `Flash ${n} (hidden)`,
    );
  }
  await expect(page.getByTestId('map-svg-score-final').locator('option:checked')).toHaveText('Full time (hidden)');

  // NOTHING IS TAKEN AWAY FROM THE OPERATOR, which is the difference from the vote board. A
  // team's name and its figure are things somebody TYPES and bumps, so all nine layers stay
  // fields - and the step must not claim otherwise.
  await expect(page.getByTestId('map-svg-poll-driven')).toHaveCount(0);
  await expect(page.getByTestId('map-svg-fields')).toContainText('9 of 9');

  await shot(page, '15-score-mapping');
  await intoProduction(page, 'Class quiz board', 'Friday Quiz');
  await settleDurableWrites(page);

  // THE BUTTONS ARE THE MACHINE'S, and the SECTION is the designer's own word for that team -
  // the survey's label finding (docs/SCORE_CONTROL_SURVEY.md §5): every product writes the signed
  // amount on the key and lets the column say whose it is.
  const actions = page.getByTestId('cue-actions');
  for (const n of [1, 2, 3, 4]) await expect(actions).toContainText(`Team ${n}`);
  await expect(actions).toContainText('New game');
  await expect(actions).toContainText('Full time');
  await expect(actions).toContainText('Clear flash');

  // …and the SCORES ARE STILL ± STEPPERS beside them. That is the survey's second correction
  // road - typing the true score, for when the operator has lost track rather than fumbled - and
  // it exists here for free precisely because the behaviour did NOT take the fields over.
  await expect(page.getByTestId('live-numbers')).toContainText('Score 1');

  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  const air = page.frameLocator('[data-testid="program-stage"] iframe');
  const flashOn = (n: number) => expect(air.locator(`#s-flash-${n}`)).toHaveClass(/imported-design-son/);
  const flashOff = (n: number) => expect(air.locator(`#s-flash-${n}`)).not.toHaveClass(/imported-design-son/);

  // Nothing is lit on arrival: every drawn state starts hidden and the entrance is not a verdict.
  for (const n of [1, 2, 3, 4]) await flashOff(n);
  await expect(air.locator('#s-final')).not.toHaveClass(/imported-design-son/);

  // ── ONE PRESS IS A POINT AND A MOMENT ───────────────────────────────────────────────────────
  //
  // The figure rides the SAME press as the flash (`adjust`), so the machine applies both together
  // or neither - the owner's 2026-08-23 ruling, "no reason to play the goal animation if the
  // number doesn't change", reaching artwork somebody else drew. Read in three places, because
  // any two of them can agree while the third is the one the audience sees: the operator's own
  // box, the drawn figure on air, and the drawn moment.
  await page.getByTestId('cue-action-score1').click();
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('1');
  await expect(air.locator('#f2')).toHaveText('1');
  await flashOn(1);
  await shot(page, '16-score-team-one');

  // WHICH ROW FLASHED IS DATA, NOT A STATE (scoreBehaviour.ts). There is one Flash state and the
  // row is read from the figure that moved, so a point for team three moves the flash to three -
  // a machine with a state per team would have needed four near-identical states, which
  // docs/STATE_MACHINE_SCHEMA.md forbids in as many words.
  await page.getByTestId('cue-action-score3').click();
  await expect(page.getByTestId('cue-field-f6')).toHaveValue('1');
  await flashOn(3);
  await flashOff(1);

  // A second point while the flash is still up is the SELF-TRANSITION: it replays the moment and
  // bumps again, rather than being dropped by the guard.
  await page.getByTestId('cue-action-score3').click();
  await expect(page.getByTestId('cue-field-f6')).toHaveValue('2');
  await flashOn(3);

  // ── THE CORRECTION TAKES THE FLASH DOWN WITH THE POINT ──────────────────────────────────────
  //
  // Operators mis-press, and a press that should not have happened has to leave nothing of itself
  // behind - the point AND the moment - or the operator is left pressing a second button to
  // finish undoing the first.
  await page.getByTestId('cue-action-unscore3').click();
  await expect(page.getByTestId('cue-field-f6')).toHaveValue('1');
  await expect(air.locator('#f6')).toHaveText('1');
  for (const n of [1, 2, 3, 4]) await flashOff(n);
  await shot(page, '17-score-corrected');

  // Full time is the match's own end, and it is the designer's own plate.
  await page.getByTestId('cue-action-final').click();
  await expect(air.locator('#s-final')).toHaveClass(/imported-design-son/);
  await shot(page, '18-score-full-time');

  // ── NEW GAME IS ONE PRESS, AND IT REACHES THE CUE ───────────────────────────────────────────
  //
  // This is what `MachineControl.set` was added for. `payload` rides a field at whatever it
  // reads and `adjust` rides it moved by a delta; neither can say "make it zero". Written instead
  // as a runtime call it would have zeroed the graphic and left the operator's boxes reading 1
  // and 1 - so the next ✎ Update would put the old score straight back on air. Both halves are
  // asserted for exactly that reason: the boxes AND the renderer.
  await page.getByTestId('cue-action-newGame').click();
  for (const f of ['f2', 'f4', 'f6', 'f8']) await expect(page.getByTestId(`cue-field-${f}`)).toHaveValue('0');
  await expect(air.locator('#f2')).toHaveText('0');
  await expect(air.locator('#f6')).toHaveText('0');
  // …and the board is live again, with nothing left of the last game.
  await expect(air.locator('#s-final')).not.toHaveClass(/imported-design-son/);
  for (const n of [1, 2, 3, 4]) await flashOff(n);
  await shot(page, '19-score-new-game');

  // THE FIGURES ARE THE PRODUCTION'S, NOT THE SESSION'S - the same debounce-then-disk wait the
  // stepper walk above makes, because a press that only aired would be lost by a dropped laptop.
  await page.getByTestId('cue-action-score2').click();
  await expect(page.getByTestId('cue-field-f4')).toHaveValue('1');
  await page.waitForTimeout(300);
  await settleDurableWrites(page);
  await page.reload();
  await expect(page.getByTestId('cue-field-f4')).toHaveValue('1');
});

test('imported score board: NEW GAME zeroes the scores on the EXPORTED controller too', async ({ page, context }) => {
  test.setTimeout(180_000);
  // PARITY IS THE POINT (docs/CONTROL_PANEL_PARITY.md §4). The exported controller ships without
  // controlModel.ts, so it carries its OWN copy of the payload rule - and `set` is the third
  // member of that rule, added for this graphic. A reset that works in the cockpit and not in the
  // package is a reset a class loses on the night the network dies, which is exactly when they
  // are operating from the package.
  //
  // Asserted on the WIRE and on the controller's own box, the way the catalog board's `adjust` is
  // (e2e/production-controls.spec.ts): one row, the event carrying every score at zero, and the
  // number boxes moved with it so a later ⟳ TAKE cannot put the old game back.
  await openImportDoor(page, SCORE_SVG);
  await intoProduction(page, 'Class quiz board', 'Package Night');
  await settleDurableWrites(page);

  const b64 = await page.evaluate(async (production) => {
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const fresh = shows.loadShows().find((s) => s.name === production)!;
    return (await buildShowZipFor(fresh, 'html-overlay')).generateAsync({ type: 'base64' });
  }, 'Package Night');

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) {
      files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
    }
  }
  const manifest = JSON.parse(files.get('payload.json')!) as { graphics: { file: string }[] };
  const { serve, rows } = relayServe(files);
  const origin = 'http://package-night.local';

  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${manifest.graphics[0].file}?stream=program`, { waitUntil: 'load' });
  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await ctl.locator('.cue').first().click();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });

  const programEvents = () =>
    rows
      .filter((r) => r.stream === 'program' && (r.msg as { t: string }).t === 'event')
      .map((r) => r.msg as { event: string; payload?: Record<string, string> });

  // Two points on two different teams, so the reset has something real to undo.
  const events = ctl.locator('#editor-events');
  await events.getByRole('button', { name: '⚡ +1' }).first().click();
  await expect(air.locator('#f2')).toHaveText('1', { timeout: 10_000 });
  await events.getByRole('button', { name: '⚡ +1' }).nth(2).click();
  await expect(air.locator('#f6')).toHaveText('1', { timeout: 10_000 });

  await events.getByRole('button', { name: '⚡ New game' }).click();
  const reset = programEvents()[programEvents().length - 1];
  expect(reset.event).toBe('newGame');
  // EVERY score rides, not only the two that moved: the wire says what the board should read, so
  // a renderer that missed an earlier press still lands on the same game.
  expect(reset.payload).toEqual({ f2: '0', f4: '0', f6: '0', f8: '0' });
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });
  await expect(air.locator('#f6')).toHaveText('0', { timeout: 10_000 });

  // …and the controller's own boxes moved with it, which is the half a runtime-only reset loses:
  // a ⟳ re-take must not put the old score back.
  await ctl.locator('#v-update').click();
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });
  await expect(air.locator('#f6')).toHaveText('0', { timeout: 10_000 });

  // The THIRD operator surface - the standalone `controlpanel.html` that ships with a CasparCG
  // package - is a different export target and holds its own third copy of this rule. It gets its
  // own walk below rather than a source check here.

  await ctl.close();
  await air.close();
});

test('imported score board: NEW GAME zeroes the scores on the STANDALONE panel too', async ({ page, context }) => {
  // THE THIRD RENDERER OF THE ONE-CONTROL DOCTRINE (docs/CONTROL_PANEL_PARITY.md). The CasparCG
  // package's own panel ships without controlModel.ts, exactly as the show controller does, so
  // `set` is written out by hand in three places and this is the third. The rule these walks
  // enforce is not "the code looks the same" - it is that the same press does the same thing on
  // every surface a class might be sitting in front of.
  await openImportDoor(page, SCORE_SVG);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden({ timeout: 20_000 });

  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'CasparCG export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const files = new Map<string, string>();
  // The package folder is named after the graphic, so the prefix is stripped rather than assumed.
  for (const n of Object.keys(zip.files)) {
    if (!zip.files[n].dir) files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
  }
  const graphicFile = [...files.keys()].find((n) => n.endsWith('.html') && !n.includes('controlpanel'))!;
  const serve = (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || graphicFile;
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'nf' });
    const ct = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'text/html';
    return route.fulfill({ status: 200, contentType: ct, body });
  };
  const origin = 'http://score-panel.local';

  const air = await context.newPage();
  await air.route(`${origin}/**`, serve);
  await air.goto(`${origin}/${graphicFile}`, { waitUntil: 'load' });
  const panel = await context.newPage();
  await panel.route(`${origin}/**`, serve);
  await panel.goto(`${origin}/controlpanel.html`, { waitUntil: 'load' });
  await expect(panel.locator('#status')).toContainText('connected');

  await panel.getByRole('button', { name: '▶ Play' }).click();
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });

  // Two points on two teams. The panel's own box moves with each press - it is the operator's
  // only view of the figure they just aired, and the next press counts from it.
  const box = (field: string) => panel.locator(`.field[data-key="${field}"] .num-input`);
  const plus = panel.getByRole('button', { name: '⚡ +1' });
  await plus.first().click();
  await expect(air.locator('#f2')).toHaveText('1', { timeout: 10_000 });
  await expect(box('f2')).toHaveValue('1');
  await plus.nth(2).click();
  await expect(air.locator('#f6')).toHaveText('1', { timeout: 10_000 });

  await panel.getByRole('button', { name: '⚡ New game' }).click();
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });
  await expect(air.locator('#f6')).toHaveText('0', { timeout: 10_000 });
  // …and BOTH boxes came back, which is the half a runtime-only reset loses: with the panel still
  // reading 1, its next ⟳ Update would put the finished game straight back on air.
  await expect(box('f2')).toHaveValue('0');
  await expect(box('f6')).toHaveValue('0');

  await panel.close();
  await air.close();
});

test('imported quiz: drawn layers are proposed from their names, and the operator drives select → lock → reveal', async ({ page }) => {
  await openImportDoor(page, QUIZ_SVG);

  // THE PROPOSAL (draft.ts proposeQuizBinding): a designer who named layers the obvious way
  // opens this step with every picker already filled. It is an accelerator, never a gate —
  // each of these is a select the author can change.
  const behaviour = page.getByTestId('map-svg-behaviour');
  await expect(behaviour).toBeVisible();
  await expect(page.getByTestId('map-svg-behaviour-kind')).toHaveValue('quiz');
  await expect(page.getByTestId('map-svg-quiz-count')).toHaveValue('4');
  for (const [at, letter] of ['A', 'B', 'C', 'D'].entries()) {
    await expect(page.getByTestId(`map-svg-quiz-answer-${at}`)).toContainText(`Answer ${letter}`);
    // The drawn states, matched by letter and state word off the layer NAMES.
    for (const state of ['selected', 'correct', 'wrong']) {
      const picker = page.getByTestId(`map-svg-quiz-${state}-${at}`);
      await expect(picker.locator('option:checked')).toContainText(`${letter} ${state === 'selected' ? 'selected' : state}`);
    }
  }
  await expect(page.getByTestId('map-svg-quiz-locked').locator('option:checked')).toContainText('Locked in');

  await shot(page, '3-quiz-mapping');
  await intoProduction(page, 'Olympics quiz', 'Quiz Night');
  await settleDurableWrites(page);

  // THE BUTTONS ARE THE MACHINE'S. Nothing here is declared per template: every operator event
  // an arrow carries became a button, and the audience event — whose branch this pilot drops —
  // is simply absent rather than dead.
  const actions = page.getByTestId('cue-actions');
  await expect(actions).toContainText('Select answer');
  await expect(actions).toContainText('Lock it in');
  await expect(actions).toContainText('Reveal correct');
  await expect(actions).not.toContainText('audience');

  // Set the answer key and the pick, then take it to air.
  // Few enough options that the control model renders a segmented picker rather than a select.
  await page.getByTestId('cue-field-f5-opt-C').click();
  await page.getByTestId('cue-field-f6-opt-B').click();
  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  // The PROGRAM renderer is what the audience sees. `frameLocator` reaches into it through CDP
  // even though the iframe carries no allow-same-origin (see e2e/_frame.ts).
  const air = page.frameLocator('[data-testid="program-stage"] iframe');
  const lit = () => air.locator('.imported-design-qstate.imported-design-qon');

  await page.getByRole('button', { name: /Select answer/ }).click();
  await expect(lit()).toHaveCount(1);
  await expect(air.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await shot(page, '4-quiz-selected');

  await page.getByRole('button', { name: /Lock it in/ }).click();
  await expect(air.locator('#q-lock')).toHaveClass(/imported-design-qon/);
  // The pick stays up through the lock — two states showing, which is the moment itself.
  await expect(air.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await shot(page, '5-quiz-locked');

  await page.getByRole('button', { name: /Reveal correct/ }).click();
  // C is the key: its row lights, the other three take the wrong treatment.
  await expect(air.locator('#q-cor-3')).toHaveClass(/imported-design-qon/);
  for (const row of [1, 2, 4]) {
    await expect(air.locator(`#q-wrong-${row}`)).toHaveClass(/imported-design-qon/);
  }
  await expect(air.locator('#q-cor-1')).not.toHaveClass(/imported-design-qon/);
  await shot(page, '6-quiz-revealed');
});

test('imported vote board: a real audience round moves the bars the designer drew', async ({ page }) => {
  // THE JOIN (docs/GRAPHIC_BEHAVIOUR_PLAN.md §12). Every piece under this shipped separately —
  // the audience plane counts votes (Phase 6), the catalog has a live-vote arc, the importer
  // binds behaviour to artwork — and the one thing that did not exist was the join between them,
  // so a poll only worked on a board WE drew. What is pinned here is that join, end to end.
  test.slow(); // the import, a production, a second tab for the audience workspace, and a take
  await openImportDoor(page, VOTE_SVG);

  // THE PROPOSAL, as for the quiz: a designer who named layers the obvious way opens this step
  // with every picker filled. It is an accelerator — each of these is a select they can change,
  // and a file naming nothing proposes nothing.
  await expect(page.getByTestId('map-svg-behaviour-kind')).toHaveValue('poll');
  await expect(page.getByTestId('map-svg-poll-count')).toHaveValue('3');
  for (const at of [0, 1, 2]) {
    const n = at + 1;
    await expect(page.getByTestId(`map-svg-poll-label-${at}`).locator('option:checked')).toHaveText(`Option ${n}`);
    await expect(page.getByTestId(`map-svg-poll-bar-${at}`).locator('option:checked')).toHaveText(`Bar ${n}`);
    await expect(page.getByTestId(`map-svg-poll-value-${at}`).locator('option:checked')).toHaveText(`Percent ${n}`);
    // The winner marks are switched off in the file, which is how a reader tells a moment from
    // base artwork in a list of groups.
    await expect(page.getByTestId(`map-svg-poll-winner-${at}`).locator('option:checked')).toHaveText(
      `Winner ${n} (hidden)`,
    );
  }
  await expect(page.getByTestId('map-svg-poll-badge').locator('option:checked')).toHaveText('Vote badge');
  await expect(page.getByTestId('map-svg-poll-total').locator('option:checked')).toHaveText('Total votes');

  // A LAYER THE VOTE DRIVES STOPS BEING A FIELD, and the step says so rather than letting the
  // reader discover a field missing from the control page. Two writers on one node is a graphic
  // whose operator watches their own typing be overwritten.
  await expect(page.getByTestId('map-svg-poll-driven')).toContainText('Question');
  await expect(page.getByTestId('map-svg-poll-driven')).toContainText('Option 1');

  await shot(page, '10-vote-mapping');
  await intoProduction(page, 'Members vote', 'Club AGM');
  await settleDurableWrites(page);

  // THE BUTTONS ARE THE CATALOG LIVE VOTE'S, compiled from the arc this board carries — and the
  // catalog's automatic 20-second window is deliberately NOT one of its arrows here, because a
  // real audience votes over minutes and an arrow nobody drew must not close the vote under the
  // operator.
  const actions = page.getByTestId('cue-actions');
  await expect(actions).toContainText('Close voting');
  await expect(actions).toContainText('Show result');
  await expect(actions).toContainText('Call the winner');

  // ── The vote itself, from the audience workspace ────────────────────────────────────────────
  const audience = await openWorkspace(page, 'audience');
  await audience.getByTestId('audience-round-question').fill('Which way should the club vote?');
  await audience.getByTestId('audience-round-options').fill('Keep the crest\nNew crest\nPut it to members');
  await audience.getByTestId('audience-round-open').click();
  await expect(audience.getByTestId('audience-round-live')).toHaveText('Which way should the club vote?');

  // Votes arrive. The simulator is the LOCAL provider's, present exactly where simulating is
  // meaningful — which is what lets this whole walk run with no backend.
  await audience.getByTestId('audience-simulate-votes').click();
  await expect(audience.getByTestId('audience-tally-0')).toHaveText('2', { timeout: 10_000 });

  // THE PERCENTAGES WAIT FOR SHOW RESULT UNLESS THIS PRODUCTION SAYS OTHERWISE — off, and the
  // checkbox that turns it on (owner ruling, 2026-08-30: *"Usually people will use it just to
  // show the results… we should give that possibility to those who want it"*). OFF BY DEFAULT IS
  // AS MUCH THE CONTRACT AS ON-BY-CHOICE, so it is asserted before anything is ticked.
  await expect(audience.getByTestId('audience-live-figures')).not.toBeChecked();

  // STAGING WRITES A CUE AND STOPS. That is the structural half of "nothing viewer-written airs
  // without an operator": the counts are ordinary field values on an ordinary cue, and the board
  // this one found is the imported one — matched by the field TITLES the behaviour owns.
  await audience.getByTestId('audience-round-stage').click();
  await expect(audience.getByTestId('audience-note')).toContainText('Take it');
  const staged = await audience.evaluate(async () => {
    const { loadShows } = await import('/src/model/shows.ts');
    const cue = loadShows()[0].cues?.find((c) => c.label.startsWith('Vote —'));
    return cue ? cue.values : null;
  });
  expect(Object.values(staged ?? {})).toContain('Keep the crest | 2\nNew crest | 1\nPut it to members | 1');
  // …and the live-figures field is written on EVERY stage, not only when it is on: a production
  // that unticks the box mid-round has to be able to take the percentages back off air, which a
  // value written in one direction only cannot say. Empty is the board's own default.
  expect(staged?.f5).toBe('');
  await settleDurableWrites(audience);

  // Back on the rundown — the cue was written from the other tab, so this one re-reads it.
  await page.reload();
  await expect(page.getByTestId('production-page')).toBeVisible({ timeout: 20_000 });
  await page.locator('.pd-cue', { hasText: 'Vote —' }).getByTestId('select-cue').click();
  await page.getByTestId('verb-take').click();
  await expect(page.getByTestId('action-log')).toContainText('Took');

  const air = page.frameLocator('[data-testid="program-stage"] iframe');

  // THE ROUND'S OWN WORDING IS ON THE DESIGNER'S LAYERS. Nothing was typed into a field for this:
  // the options came from the round, through the wire, into the layers the pickers named.
  await expect(air.locator('#p-opt-1')).toHaveText('Keep the crest');
  await expect(air.locator('#p-opt-3')).toHaveText('Put it to members');
  await expect(air.locator('#p-q')).toHaveText('Which way should the club vote?');

  // …AND THE BAR MOVED, WITHOUT A TRANSITION. Data never causes a state change, so the growth
  // happens inside the state the board is already in: 2 of 4 votes is half the length the
  // designer drew, and the drawn length is what 100% means on this board.
  await expect
    .poll(async () => Math.round(Number(await air.locator('#p-bar-1').getAttribute('width'))), { timeout: 10_000 })
    .toBe(500);
  await expect
    .poll(async () => Math.round(Number(await air.locator('#p-bar-2').getAttribute('width'))))
    .toBe(250);

  // The badge is up because the vote is open, and the figures are NOT — they are the result's
  // beat, exactly as on a catalog vote board.
  await expect(air.locator('#p-open')).toHaveClass(/imported-design-pon/);
  await expect(air.locator('#p-val-1')).not.toHaveClass(/imported-design-pon/);
  await shot(page, '11-vote-open');

  // EVERYTHING A FOREIGN CONTROLLER NEEDS IS IN A FIELD. Over the OGraf Server API a graphic's
  // action responses carry a step and a status string and nothing of the graphic's own state, so
  // machine state does not cross that boundary and fields are the only thing that does
  // (docs/OGRAF_STATE_IN_FIELDS.md). The counts ride the Options field; whether the vote is still
  // running rides a field of its OWN. Editing that ONE FIELD closes the board's VOTE NOW badge,
  // with no event dispatched.
  // Update, not Take: typing into a live cue edits the draft, and the operator sends it. That is
  // the ordinary field road, which is the point — nothing about this is a poll mechanism.
  const count = page.getByTestId('cue-field-f3');
  const status = page.getByTestId('cue-field-f4');
  await expect(count).toHaveValue(/voting open/);
  await expect(status).toHaveValue('open');

  // ── ONE FIELD, ONE FACT ─────────────────────────────────────────────────────────────────────
  //
  // THE COUNT LINE IS COPY A HUMAN READS, AND NOTHING OBEYS ITS WORDING. The status used to ride
  // INSIDE it — the dashboard wrote "4 votes · voting closed" and the graphic's runtime pattern-
  // matched the word back out — so a station writing its own language, or an operator rewording
  // the line while rehearsing, got a board saying VOTE NOW straight through a closed vote, on
  // air, with nothing anywhere reporting the fault (docs/OGRAF_STATE_IN_FIELDS.md R7). Both
  // halves of this pair fail on that shape: the reworded line must not move the badge, and the
  // token must close the vote while the sentence beside it says the opposite in Finnish.
  await count.fill('4 ääntä · äänestys suljettu');
  await page.getByTestId('verb-update').click();
  // The line has to LAND before "the badge did not move" means anything: #p-open is already lit,
  // so asserting it alone would pass just as well if the update never reached the renderer at
  // all. #p-total is the designer's own layer, written from this very field, so waiting on it is
  // what makes the badge assertion below a real one.
  await expect(air.locator('#p-total')).toHaveText('4 ääntä · äänestys suljettu');
  await expect(air.locator('#p-open')).toHaveClass(/imported-design-pon/);

  await status.selectOption({ value: 'closed' });
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-open')).not.toHaveClass(/imported-design-pon/);

  // …and it follows the data rather than latching: the machine is still in the voting state, so
  // a controller that puts the vote back on gets its badge back. Pressing Close voting is the
  // sticky one, because that leaves the state.
  await status.selectOption({ value: 'open' });
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-open')).toHaveClass(/imported-design-pon/);

  // THE OLD SENTENCE STILL CLOSES A BOARD THAT STATES NOTHING ELSE. A board saved or exported
  // before the status field existed carries only the count line, and a board that suddenly
  // ignored its own status line would be a worse failure than the one above — so an unstated
  // status falls back to reading the line, exactly as it always did.
  await status.selectOption({ value: '' });
  await count.fill('4 votes · voting closed');
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-open')).not.toHaveClass(/imported-design-pon/);

  await count.fill('4 votes · voting open');
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-open')).toHaveClass(/imported-design-pon/);

  // ── THE FIGURES, LIVE OR HELD ───────────────────────────────────────────────────────────────
  //
  // The owner's ruling of 2026-08-30: most shows put a vote board up to REVEAL a result, so the
  // percentages are the result's beat and the board stays a question until the operator answers
  // it — and a show that wants the numbers moving on air ticks one checkbox. Both directions are
  // pinned, because "off by default" is the half a future change is most likely to lose.
  //
  // It rides a FIELD, exactly like the status above and for the same wire reason: machine state
  // does not cross the OGraf boundary and fields do. So this is an ordinary field update, which
  // is also the point — a data write, firing no transition, with the board still in `voting`.
  const figures = page.getByTestId('cue-field-f5');
  await expect(figures).toHaveValue('');
  await expect(air.locator('#p-val-1')).not.toHaveClass(/imported-design-pon/);
  await figures.selectOption({ value: 'live' });
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-val-1')).toHaveClass(/imported-design-pon/);
  await expect(air.locator('#p-val-1')).toHaveText('50%');
  // The vote is still open and still says so — turning the figures on is not the result.
  await expect(air.locator('#p-open')).toHaveClass(/imported-design-pon/);
  await shot(page, '11b-vote-live-figures');

  // …and it follows the field back off, so a production can change its mind without a reload.
  await figures.selectOption({ value: '' });
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-val-1')).not.toHaveClass(/imported-design-pon/);

  // Closing takes the badge and nothing else: a closed vote still shows what came in.
  await page.getByRole('button', { name: /Close voting/ }).click();
  await expect(air.locator('#p-open')).not.toHaveClass(/imported-design-pon/);
  await expect.poll(async () => Math.round(Number(await air.locator('#p-bar-1').getAttribute('width')))).toBe(500);

  await page.getByRole('button', { name: /Show result/ }).click();
  await expect(air.locator('#p-val-1')).toHaveClass(/imported-design-pon/);
  await expect(air.locator('#p-val-1')).toHaveText('50%');
  await expect(air.locator('#p-val-2')).toHaveText('25%');
  await shot(page, '12-vote-result');

  // The winner is the designer's own arrow, and only the leader gets it — a tie would get none.
  await page.getByRole('button', { name: /Call the winner/ }).click();
  await expect(air.locator('#p-win-1')).toHaveClass(/imported-design-pon/);
  await expect(air.locator('#p-win-2')).not.toHaveClass(/imported-design-pon/);
  await shot(page, '13-vote-called');

  // ── THE ROUND THAT DOES NOT FIT THE BOARD ───────────────────────────────────────────────────
  //
  // A student draws three rows and the show runs a five-option round. Every figure the board
  // paints is still TRUE — each row's share of the WHOLE vote, which is why three bars visibly
  // fail to fill the board — but the row that WON can be one the designer never drew, and the
  // board used to say nothing about that. It aired as a plausible three-way dead heat on a vote
  // that was a landslide, and the winner mark simply never appeared, with no explanation anywhere.
  //
  // Two things answer it and neither invents artwork. The winner is never called on a row that
  // was not drawn — silence beats a mark on the best of the rows that happened to fit. And the
  // OPERATOR is told, through the channel that already exists for a value the design cannot hold
  // (`noacgTextOverflow()`), naming the field that overflowed: Options.
  //
  // Asserted from the CALLED state on purpose: the winner has already been called on this board,
  // so what is being pinned is the repaint — the same data write that brings the bigger round in
  // is what has to take the now-wrong mark back off.
  await count.fill('13 votes · voting open');
  await page
    .getByTestId('cue-field-f2')
    .fill('Keep the crest | 1\nNew crest | 1\nPut it to members | 1\nAsk the committee | 1\nAbolish the crest | 9');
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-val-1')).toHaveText('7.7%');   // its true share of all 13 votes
  // "Abolish the crest" took 9 of the 13 and is not on this board, so NO row is marked.
  for (const row of [1, 2, 3]) {
    await expect(air.locator(`#p-win-${row}`)).not.toHaveClass(/imported-design-pon/);
  }
  await expect(page.getByTestId('cue-overflow')).toContainText('Options', { timeout: 15_000 });
  await expect(page.getByTestId('cue-overflow')).toContainText('too long for the design');
  await shot(page, '14-vote-overflow');

  // The warning is a REPORT, not a latch: a round that fits again clears it, and the winner —
  // now a row the designer did draw — is marked exactly as before.
  await page.getByTestId('cue-field-f2').fill('Keep the crest | 1\nNew crest | 1\nPut it to members | 9');
  await count.fill('11 votes · voting open');
  await page.getByTestId('verb-update').click();
  await expect(air.locator('#p-win-3')).toHaveClass(/imported-design-pon/);
  await expect(page.getByTestId('cue-overflow')).toBeHidden({ timeout: 15_000 });
});

test('imported quiz: the behaviour survives the export and runs standalone from a file', async ({ page }, testInfo) => {
  // EXPORT IS WHERE AN IMPORTED GRAPHIC STOPS BEING OURS. Everything above runs inside the app;
  // this asserts the same board works as a folder on a playout machine, with no NoaCG around it.
  // Driven over file:// on purpose — the trap this catches is a reference that silently resolves
  // in the dev server and dangles on disk (docs/VERIFICATION.md).
  await openImportDoor(page, QUIZ_SVG);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden({ timeout: 20_000 });

  await page.getByTestId('dock-tab-export').click();
  await page.locator('.issue', { hasText: 'CasparCG export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));

  // The graphic's own HTML, whatever the package called the folder.
  const htmlPath = Object.keys(zip.files).find((n) => n.endsWith('.html') && !n.includes('controlpanel'))!;
  expect(htmlPath).toBeTruthy();
  const html = await zip.file(htmlPath)!.async('string');

  // THE DRAWN STATES TRAVELLED: the designer's layers, our ids, the rules that hide them, and
  // the paint that shows them — all inside the one file.
  for (const id of ['q-sel-1', 'q-sel-2', 'q-sel-3', 'q-sel-4', 'q-cor-3', 'q-wrong-1', 'q-lock']) {
    expect(html).toContain(`id="${id}"`);
  }
  expect(html).toContain('.imported-design-qstate');
  expect(html).toContain('function revealAnswer');
  // THE MACHINE TRAVELLED: it lives in the template's own data block, so the arcs and their
  // operator events are in the file rather than in a registry the playout machine cannot ask.
  expect(html).toContain('"machine"');
  for (const event of ['select', 'lock', 'judge']) expect(html).toContain(`"event": "${event}"`);

  // Unpack the whole package and run the graphic the way CasparCG does: as a local file.
  const dir = testInfo.outputPath('caspar');
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const target = nodePath.join(dir, name);
    mkdirSync(nodePath.dirname(target), { recursive: true });
    writeFileSync(target, await entry.async('nodebuffer'));
  }
  // Listening BEFORE the navigation, or the check could never fire — which is the shape of a
  // guard that passes for the wrong reason.
  const missing: string[] = [];
  page.on('requestfailed', (r) => missing.push(r.url()));
  await page.goto(pathToFileURL(nodePath.join(dir, htmlPath)).href);

  const lit = () => page.locator('.imported-design-qstate.imported-design-qon');
  await page.evaluate(() => {
    const w = window as unknown as { play?: () => void; update?: (d: string) => void };
    w.play?.();
    w.update?.(JSON.stringify({ f5: 'C', f6: 'B' }));
  });
  // Nothing is lit until a state says so — the entrance is not a verdict.
  await expect(lit()).toHaveCount(0);

  const fire = (event: string) =>
    page.evaluate((e) => {
      (window as unknown as { noacgDispatch?: (n: string) => void }).noacgDispatch?.(e);
    }, event);

  await fire('select');
  await expect(page.locator('#q-sel-2')).toHaveClass(/imported-design-qon/);
  await fire('lock');
  await expect(page.locator('#q-lock')).toHaveClass(/imported-design-qon/);
  await fire('judge');
  await expect(page.locator('#q-cor-3')).toHaveClass(/imported-design-qon/);
  await expect(page.locator('#q-wrong-1')).toHaveClass(/imported-design-qon/);
  await shot(page, '7-quiz-exported-standalone');

  // Nothing reached for the network or for a file the package does not carry.
  expect(missing).toEqual([]);
});

test('imported board: copy the design cannot hold is WARNED about on the cue editor, never clipped', async ({ page }) => {
  // THE SECOND HALF OF THE OWNER'S FIT RULING (2026-08-23, docs/SVG_IMPORT_PLAN.md §3): a value
  // longer than the design was drawn for fills the panel, wraps into the room the artwork has
  // and shrinks to the readability floor - and past that it is WARNED ABOUT, never cut and never
  // allowed to reshape the artwork. The ladder shipped with only the first half built: the
  // runtime knew (noacgTextOverflow()) and no operator surface read it, so a too-long title
  // floored at 55% and ran off the board with nothing said before air.
  //
  // The warning is measured on the CUE EDITOR because that is where the value is typed. It comes
  // from the PREVIEW monitor's own report - the rendered graphic is the only thing that can
  // answer whether copy fits, which is why no source check stands in for this.
  await openImportDoor(page, QUIZ_SVG);
  await intoProduction(page, 'Overflow quiz', 'Warning Night');
  await settleDurableWrites(page);

  const question = page.getByTestId('cue-field-f0');
  const note = page.getByTestId('cue-overflow');

  // A question the board holds says nothing. The guard has to be verified quiet before it is
  // verified loud, or "it warns" would also be true of a surface that always warns.
  await question.fill('Which city hosted the first modern Olympics?');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);

  // …and one no size can hold does. 400 characters is the value the ladder floors at 55% of the
  // drawn size (e2e/import-svg.spec.ts measures that end of it); here the claim is that the
  // operator is TOLD, in the box they are typing into and once at the top of the editor.
  await question.fill('A'.repeat(400));
  await expect(note).toContainText('too long for the design');
  await expect(note).toContainText('Question');
  await expect(page.getByTestId('cue-field-over-f0')).toBeVisible();
  await shot(page, '8-overflow-warned');

  // The copy is whole in the graphic - warned about, not trimmed to make the warning go away.
  const air = page.frameLocator('[data-testid="production-preview"] iframe');
  await expect(air.locator('#f0')).toHaveText('A'.repeat(400));

  // Shortening it clears the warning, so it tracks the value rather than latching on the cue.
  await question.fill('Which city?');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);
});

test('imported board: the EXPORTED CONTROLLER carries the same warning, in the same words', async ({ page, context }) => {
  test.setTimeout(180_000);
  // PARITY IS THE POINT (docs/CONTROL_PANEL_PARITY.md §4): a warning only the in-app cockpit
  // shows is a warning a class operating from the exported package never sees, and the package
  // is the surface a show drops to when the network dies. This page ships without React, so its
  // copy of the sentence is BAKED from the same constants (controlModel.ts) rather than written
  // again - and only a driven controller can prove the baked half actually paints.
  //
  // It reads its own PREVIEW monitor: those frames are ordinary same-origin pages the controller
  // built, so the answer comes from the running graphic exactly as it does in the app.
  await openImportDoor(page, QUIZ_SVG);
  await intoProduction(page, 'Overflow quiz', 'Relay Night');
  await page.getByTestId('cue-field-f0').fill('A'.repeat(400));
  await expect(page.getByTestId('cue-overflow')).toContainText('too long for the design');
  await settleDurableWrites(page);

  const b64 = await page.evaluate(async (production) => {
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const fresh = shows.loadShows().find((s) => s.name === production)!;
    const zip = await buildShowZipFor(fresh, 'html-overlay');
    return zip.generateAsync({ type: 'base64' });
  }, 'Relay Night');

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    // The package folder is named after the production, not a fixed slug. Text files only -
    // the relay helper serves strings, and a single-file overlay carries its assets inline.
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) {
      files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
    }
  }
  const { serve } = relayServe(files);
  const origin = 'http://relay-overflow.local';

  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });

  // Nothing is on PREVIEW yet, so nothing is claimed. Quiet before loud, here too.
  await expect(ctl.locator('#ed-over')).toBeHidden();

  await ctl.locator('.cue').first().click();
  await ctl.locator('#v-preview').click();
  await expect(ctl.frameLocator('#stage-pvw iframe').locator('#f0')).toHaveText('A'.repeat(400), {
    timeout: 10_000,
  });

  // …and once the graphic is up with the copy it cannot hold, the operator is told - by the
  // summary and by the box, the same two places the app says it.
  await expect(ctl.locator('#ed-over')).toContainText('too long for the design', { timeout: 10_000 });
  await expect(ctl.locator('.field-over .over-mark')).toBeVisible();
  await shot(ctl, '9-overflow-warned-controller');
});
