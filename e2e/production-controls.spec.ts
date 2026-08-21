import { test, expect, type Page, type Route } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { createProject } from './_create';
import { relayServe, routeOrigin } from './_relay';

// The production page's GRAPHIC ACTIONS block (docs/PLAYOUT_DASHBOARD.md §8): the machine's
// ⚡ buttons rendered from the metadata that travels inside the template, greyed by the
// structural guard, with the state chip naming what the greying is judged against. All of it
// offline — the verbs drive the local PROGRAM monitor, which is the same renderer the
// published output runs, so what these specs prove is what airs.

/** Create the current editor graphic's production and land on its page. */
async function productionFor(page: Page, name: string): Promise<void> {
  await page.getByTestId('dock-tab-control').click();
  const section = page.locator('.panel-section', { hasText: 'Productions' });
  await section.getByPlaceholder('New production name').fill(name);
  await section.getByRole('button', { name: 'Create', exact: true }).click();
  await section.getByRole('button', { name: '+ Add current' }).click();
  await expect(section.locator('.status-ok')).toContainText('is in the production');
  await section.getByTestId('open-production-page').click();
  await expect(page.getByTestId('production-page')).toBeVisible();
}

test('the production page re-asks for machine state, so a change it did not cause still reaches the chip', async ({ page }) => {
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night');

  const chip = page.getByTestId('machine-state-chip');
  await page.getByTestId('verb-take').click();
  await expect(chip).toHaveText('Question');

  // DRIVE THE MACHINE BEHIND THE PAGE'S BACK. The stage posts one `{cmd:'state'}` after each
  // command it applies, so the page's picture of the machine is only ever as fresh as its own
  // last command. Anything that moves the graphic WITHOUT going through this page — a timer
  // arrow firing in the runtime, another operator's device driving the shared log, or simply a
  // reply that lost the race with the entrance it was asking about — leaves the chip stale,
  // and the ⚡ buttons are greyed against that same stale state (`isEventLegal`).
  //
  // The /output renderer has re-asked every second since it shipped (src/output/main.ts); this
  // surface had no poll at all, which is why a state that arrived wrong stayed wrong until the
  // operator pressed something else. Measured as a red quiz-pilot run whose chip read "Off"
  // through eighteen consecutive polls with no correction ever arriving.
  const handle = await page.locator('[data-testid="program-stage"] iframe').elementHandle();
  const frame = await handle!.contentFrame();
  await frame!.evaluate(() => {
    (window as unknown as { noacgDispatch: (e: string, p?: unknown) => void }).noacgDispatch(
      'select',
      { f6: 'B' },
    );
  });

  // Nobody told the page. It has to ask again — and the chip is what says it did.
  await expect(chip).toHaveText('Answer selected', { timeout: 5_000 });
});

test('a Take pressed a moment after the page opens still airs - and stays aired', async ({ page }) => {
  // EVERY OTHER SPEC HERE TAKES INSTANTLY, and that is what hid this: a real operator opens a
  // production, reads the rundown and presses Take seconds later. The local PROGRAM monitor
  // reports its machine state once a second, so by then the page knew the graphic was "off" -
  // and the boot recovery, which was keyed on `liveCue` MOVING rather than on the wire's own
  // answer, treated the operator's own first Take as a page that had opened onto a live
  // production and replayed `snap` to that stale "off". The graphic aired and went straight
  // back off: black monitor, chip reading Off, every action greyed, nothing said. Offline it
  // was every take, because with no wire `liveCue` can only move locally.
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night');

  // Past the first state poll - the window the old bug needed.
  await expect(page.getByTestId('machine-state-chip')).toHaveText('not on air');
  await page.waitForTimeout(2_000);
  await page.getByTestId('verb-take').click();

  await expect(page.getByTestId('machine-state-chip')).toHaveText('Question');
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await expect(program.locator('.quiz')).toBeVisible();
  // And it is still there after the next few polls - a graphic that airs and then quietly
  // disappears is the same defect wearing a delay.
  await page.waitForTimeout(3_000);
  await expect(page.getByTestId('machine-state-chip')).toHaveText('Question');
  await expect(page.getByTestId('cue-action-select')).toBeEnabled();
});

test('quiz actions on the production page: greying, select/lock, live update keeps the lock, snap recovers the verdict', async ({ page }) => {
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night');

  const actions = page.getByTestId('cue-actions');
  const chip = page.getByTestId('machine-state-chip');
  const select = page.getByTestId('cue-action-select');
  const lock = page.getByTestId('cue-action-lock');
  const judge = page.getByTestId('cue-action-judge');
  const program = page.frameLocator('[data-testid="program-stage"] iframe');

  // The block is there, says it acts ON AIR, and every button is dead until a Take — the
  // graphic is not up, so firing anything would be a lie the runtime happens to swallow.
  await expect(actions).toBeVisible();
  await expect(actions).toContainText('act on air');
  await expect(chip).toHaveText('not on air');
  await expect(select).toBeDisabled();
  await expect(select).toHaveAttribute('title', /not on air — Take the cue first/);
  await expect(lock).toBeDisabled();
  await expect(judge).toBeDisabled();

  // TAKE. The machine enters the Question state; the guard opens exactly the arrows that
  // leave it: select, judge, and lock (the hidden-pick flow seals straight from the
  // question) — while revealChoice stays grey, its only arrow leaving `sealed`.
  await page.getByTestId('verb-take').click();
  await expect(chip).toHaveText('Question');
  await expect(select).toBeEnabled();
  await expect(judge).toBeEnabled();
  await expect(lock).toBeEnabled();
  await expect(page.getByTestId('cue-action-revealChoice')).toBeDisabled();

  // The Selected-answer dropdown renders as SEGMENTED buttons (short constrained choice).
  // Pick B in the cue editor, then fire Select — the value rides as the event's payload.
  await page.getByTestId('cue-field-f6-opt-B').click();
  await select.click();
  await expect(chip).toHaveText('Answer selected');
  await expect(lock).toBeEnabled();
  await expect(program.locator('.quiz-option').nth(1)).toHaveClass(/quiz-sel/);

  // Lock it in: the chip says so, and select GREYS — no select arrow leaves `locked`, and the
  // panel mirrors the machine's structural guard rather than guessing.
  await lock.click();
  await expect(chip).toHaveText('Locked in');
  await expect(select).toBeDisabled();
  await expect(program.locator('.quiz')).toHaveClass(/quiz-locked/);

  // THE RECOVERY-FIDELITY FIX (tracker G9): a live ✎ Update mid-lock must repaint the board
  // from the machine's state, not wipe the selection and the lock while the chip still says
  // "Locked in".
  await page.getByTestId('cue-field-f0').fill('Still locked after an update?');
  await page.getByTestId('verb-update').click();
  await expect(program.locator('#f0')).toHaveText('Still locked after an update?');
  await expect(program.locator('.quiz')).toHaveClass(/quiz-locked/);
  await expect(program.locator('.quiz-option').nth(1)).toHaveClass(/quiz-sel/);

  // Fire the reveal, then SNAP back to "Locked in" — recovery, no animation. The snap fires
  // only the TARGET state's own call (applyLock); the selection belongs to the suppressed
  // intermediate `selected` state, so the highlighted pick can only come back through the
  // data half that rides with the snap (reset is two operations). Asserting quiz-sel here is
  // what proves that update actually went — a snap alone would leave the lock without a pick.
  await judge.click();
  await expect(chip).toHaveText('Reveal');
  await expect(program.locator('.quiz-correct')).toHaveCount(1);
  await page.getByTestId('machine-snap').selectOption({ label: 'Locked in' });
  await expect(chip).toHaveText('Locked in');
  await expect(program.locator('.quiz-correct')).toHaveCount(0);
  await expect(program.locator('.quiz')).toHaveClass(/quiz-locked/);
  await expect(program.locator('.quiz-option').nth(1)).toHaveClass(/quiz-sel/);

  // And back to start: every group to its initial, the visual half of reset.
  await page.getByTestId('machine-snap').selectOption({ label: '⟲ Back to start (visual reset)' });
  await expect(program.locator('.quiz-option.quiz-sel')).toHaveCount(0);
});

test('scorebug actions group by section and drive the clock; a plain lower third shows no actions block', async ({ page }) => {
  await createProject(page, { name: 'Club Scorebug' });
  await productionFor(page, 'Club Match');

  const actions = page.getByTestId('cue-actions');
  await expect(actions).toBeVisible();
  // The machine's controls carry their own sections ("Clock", "Match") — the panel renders
  // them as labelled groups, not one undifferentiated row.
  await expect(actions.locator('h4', { hasText: 'Clock' })).toBeVisible();
  await expect(actions.locator('h4', { hasText: 'Match' })).toBeVisible();

  await page.getByTestId('verb-take').click();
  const start = page.getByTestId('cue-action-clockStart');
  const stop = page.getByTestId('cue-action-clockStop');
  await expect(start).toBeEnabled();
  await expect(stop).toBeDisabled(); // armed: nothing to stop yet — the guard, mirrored

  await start.click();
  await expect(page.getByTestId('machine-state-chip')).toContainText(/running/i);
  await expect(stop).toBeEnabled();
  await expect(start).toBeDisabled();

  // Full time is destructive (one way only) and marked as such.
  await expect(page.getByTestId('cue-action-final')).toHaveClass(/destructive/);
});

test('a match board reaches every one of its controls from the cockpit: both clock verbs, the interval, the crests', async ({ page }) => {
  test.setTimeout(120_000);
  // The scorebug test above covers Start/Stop. This covers what Phase 4 actually promised an
  // operator: the REST of the surface — reset, the interval pair, and the fields a two-team
  // board carries that a strip does not (a period breakdown, club colours, two crests).
  await createProject(page, { name: 'House Match Board' });
  await productionFor(page, 'Cup Tie');

  const chip = page.getByTestId('machine-state-chip');
  await page.getByTestId('verb-take').click();

  // FOUR parallel groups, not one. The quiz pilot had a single group, so nothing until now had
  // ever rendered a chip naming several at once — the label is ~65 characters wide.
  await expect(chip).toContainText('clock:');
  await expect(chip).toContainText('play:');
  await expect(chip).toContainText('result:');
  // And it must stay on ONE line inside the header rather than reflowing the panel.
  const chipLines = await chip.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { wrap: cs.whiteSpace, height: Math.round(el.getBoundingClientRect().height) };
  });
  expect(chipLines.wrap).toBe('nowrap');
  expect(chipLines.height).toBeLessThan(30);

  // THE CLOCK, all three verbs. Reset is the one the scorebug test never reached, and it is
  // the one that makes a second half possible without reloading the graphic.
  const start = page.getByTestId('cue-action-clockStart');
  const stop = page.getByTestId('cue-action-clockStop');
  const reset = page.getByTestId('cue-action-clockReset');
  await expect(reset).toBeDisabled();            // armed already: nothing to reset back to
  await start.click();
  await expect(chip).toContainText('Clock running');
  await expect(reset).toBeEnabled();
  await stop.click();
  await expect(chip).toContainText('Clock stopped');
  await reset.click();
  await expect(chip).toContainText('At period start');
  await expect(reset).toBeDisabled();            // back where it started, and the guard says so

  // THE INTERVAL PAIR, which is a different group and must move on its own: holding the clock
  // for an injury is not half time, so these are separate facts and separate buttons.
  const interval = page.getByTestId('cue-action-interval');
  const resume = page.getByTestId('cue-action-resumePlay');
  await expect(resume).toBeDisabled();
  await interval.click();
  await expect(chip).toContainText('Interval');
  await expect(interval).toBeDisabled();
  await resume.click();
  await expect(chip).toContainText('In play');

  // THE FIELDS. A match board carries a period breakdown, two club colours and two crests, and
  // every one of them has to be editable from here — the crest pickers in particular were
  // rendering with no options at all, so a logo could be set from the hosted page and not from
  // the cockpit, which is exactly the divergence the dashboard contract forbids.
  await expect(page.getByTestId('cue-field-f6')).toBeVisible();          // period breakdown
  await expect(page.getByTestId('cue-field-f7')).toHaveAttribute('type', 'color');
  await expect(page.getByTestId('cue-field-f8')).toHaveAttribute('type', 'color');
  for (const logo of ['cue-field-f9', 'cue-field-f10']) {
    const picker = page.getByTestId(logo);
    await expect(picker).toBeVisible();
    await expect(picker).toHaveJSProperty('tagName', 'SELECT');
    // A brand-new board has no crest uploaded yet, so the honest state is an empty picker
    // that SAYS where pictures come from. That sentence is the proof the cockpit now passes
    // the graphic's picture list at all: the hint only renders when a list was supplied and
    // came back empty, so before this it could not appear however many crests existed.
    await expect(picker.locator('xpath=../..')).toContainText('add one in the editor');
  }

  // And the scores are steppers now, so a goal is one press rather than a retype.
  const scoreA = page.getByTestId('cue-field-f1');
  await expect(scoreA).toHaveAttribute('type', 'number');
  await scoreA.fill('2');
  await page.getByTestId('verb-update').click();
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await expect(program.locator('#f1')).toHaveText('2');
});

test('an audience Q&A cue reveals its answer; switching to a plain cue swaps the actions away honestly', async ({ page }) => {
  // A plain lower third in the library first — the leak check needs a second, machine-less
  // graphic in the same production.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await page.getByTestId('save-graphic').click();
  await page.getByTestId('save-name').fill('Plain Strap');
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-dialog')).toBeHidden();

  await createProject(page, { name: 'House Q&A' });
  await productionFor(page, 'Town Hall');

  const actions = page.getByTestId('cue-actions');
  const answer = page.getByTestId('cue-action-answer');
  await expect(answer).toBeVisible();
  await expect(answer).toBeDisabled();

  await page.getByTestId('verb-take').click();
  await expect(answer).toBeEnabled();
  await answer.click();
  // The answer is a real waypoint on the walk — the event advances it, and once it has been
  // given there is no arrow to fire it again.
  await expect(answer).toBeDisabled();

  // Add the plain lower third to the SAME production and select its cue: the actions block
  // must disappear (no explicit machine — no fake controls), and come back when the Q&A cue
  // is selected again. Nothing leaks between cues.
  await page.getByTestId('add-graphic-pick').selectOption({ label: 'Plain Strap' });
  await page.getByTestId('add-graphic').click();
  const rows = page.getByTestId('cue-list').locator('.pd-cue');
  await expect(rows).toHaveCount(2);
  await rows.nth(1).locator('.pd-cue-label').click();
  await expect(actions).toBeHidden();
  await rows.nth(0).locator('.pd-cue-label').click();
  await expect(actions).toBeVisible();
  await expect(page.getByTestId('cue-action-answer')).toBeVisible();
});

test('± LIVE NUMBERS bumps a figure on air without publishing other staged edits', async ({ page }) => {
  // The podium board is the block's reason to exist: game-show points change on every
  // question, and stepper-then-✎-Update was two presses under pressure. The block itself is
  // generic — any graphic with a `number` field gets it — so this walk is also the podium
  // type's playout proof: per-contestant scores, the spotlight machine beside them.
  await createProject(page, { name: 'House Podiums' });
  await productionFor(page, 'Game Night');

  // Off air: the block renders (the template has number fields), every button waits for Take.
  const block = page.getByTestId('live-numbers');
  await expect(block).toBeVisible();
  const up = page.getByTestId('live-number-f2-up');
  await expect(up).toBeDisabled();
  // The spotlight index is an ⚡ payload field, so it gets NO bump pair — it is set by its own
  // action, and a second road to it would air a value without the state that gives it meaning.
  await expect(page.getByTestId('live-number-f9-up')).toHaveCount(0);

  await page.getByTestId('verb-take').click();
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await expect(program.locator('#f2')).toHaveText('0');

  // Stage an edit that must NOT ride the bump: a half-typed name stays staged.
  await page.getByTestId('cue-field-f1').fill('ZO');

  await expect(up).toBeEnabled();
  await up.click();
  await up.click();

  // The bump aired — just that field. The staged name did not.
  await expect(program.locator('#f2')).toHaveText('2');
  await expect(program.locator('#f1')).toHaveText('MAYA');
  // …and the cue kept the new value, so the next ⟳ Take or ✎ Update cannot regress the score.
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('2');

  // ✎ Update still publishes the whole cue — the staged name goes to air the normal way.
  await page.getByTestId('verb-update').click();
  await expect(program.locator('#f1')).toHaveText('ZO');
  await expect(program.locator('#f2')).toHaveText('2');

  // The podium machine drives beside it: spotlight podium 2, judged by the structural guard.
  await page.getByTestId('cue-field-f9').fill('2');
  await page.getByTestId('cue-action-spotlight').click();
  await expect(page.getByTestId('machine-state-chip')).toContainText('spotlit', { ignoreCase: true });
  await expect(program.locator('.scoreboard-podium-2')).toHaveClass(/scoreboard-podium-spot/);
  // A cleared name collapses its podium — contestant count is content, not a state.
  await page.getByTestId('cue-field-f7').fill('');
  await page.getByTestId('verb-update').click();
  await expect(program.locator('.scoreboard-podium-4')).toHaveClass(/scoreboard-podium-empty/);
});

test('± LIVE NUMBERS on the EXPORTED controller: the bump is a partial, carrying that field alone', async ({ page, context }) => {
  test.setTimeout(180_000);
  // The same rule as the test above, on the surface a show drops to when the network dies -
  // the exported local-control package, driven through the bundled relay. It matters MORE
  // here: this is the fallback an operator reaches for under pressure, and it used to
  // republish the cue's whole value set on every stepper press, so a half-typed name went to
  // air riding a goal.
  //
  // The assertion is the WIRE, not the DOM. What an exported operator surface puts on the
  // relay is the contract every receiver (and the log's own recovery replay) reads; a screen
  // that happens to look right can still be shipping the wrong payload, which is exactly how
  // this survived. So the rows are read straight off the in-spec relay and their SHAPE checked.
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const b64 = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    // sb22 House Podiums: four scores (number) beside a spotlight index (number, but carried
    // as the ⚡ action's PAYLOAD) - both halves of §7c's derivation in one graphic.
    const tpl = variantById('sb22')!.create({});
    const { doc } = createGraphic(tpl, { name: 'House Podiums' });
    const show = shows.createShowNamed('Game Night');
    shows.addGraphicToShow(show.id, tpl, { graphicId: doc!.id });
    const fresh0 = shows.loadShows().find((s) => s.id === show.id)!;
    shows.updateShowCue(show.id, fresh0.cues![0].id, { label: 'Round one' });
    const fresh = shows.loadShows().find((s) => s.id === show.id)!;
    const zip = await buildShowZipFor(fresh, 'html-overlay');
    return zip.generateAsync({ type: 'base64' });
  });

  const zip = await JSZip.loadAsync(b64, { base64: true });
  const files = new Map<string, string>();
  for (const n of Object.keys(zip.files)) {
    // Strip whatever folder the production's own name produced - the package is named after
    // the show, not a hard-coded slug.
    if (!zip.files[n].dir && /\.(html|json)$/.test(n)) files.set(n.replace(/^[^/]+\//, ''), await zip.file(n)!.async('string'));
  }
  const manifest = JSON.parse(files.get('payload.json')!) as { graphics: { file: string }[] };
  const { serve, rows } = relayServe(files);
  const origin = 'http://podium-host.local';

  // The OBS side: the overlay addressed as the program source. Managed, so it waits for the log.
  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${manifest.graphics[0].file}?stream=program`, { waitUntil: 'load' });

  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await expect(ctl.locator('#mode')).toContainText('SHOW');
  await ctl.locator('.cue', { hasText: 'Round one' }).click();

  // OFF AIR the pair is GREYED, not quietly repurposed (docs/PLAYOUT_DASHBOARD.md §7c): a
  // control that acts on air has nothing to act on until the cue is taken, and a press that
  // silently staged instead looked exactly like a bump that did not work.
  const scoreSteps = ctl.locator('.field', { hasText: /^F2 · / }).locator('button.step');
  await expect(scoreSteps.first()).toBeDisabled();
  await expect(scoreSteps.last()).toBeDisabled();
  await expect(scoreSteps.first()).toHaveAttribute('title', /not on air — Take it first/);
  // The exclusion keeps its own meaning: an ⚡ payload field's pair never airs anything, so it
  // stages at all times and greying it would strand the only stepper the field has.
  await expect(ctl.locator('.field', { hasText: /^F9 · / }).locator('button.step').first()).toBeEnabled();

  await ctl.locator('#v-take').click();
  await expect(ctl.locator('.cue').first()).toHaveClass(/on-air/, { timeout: 10_000 });
  await expect(air.locator('#f2')).toHaveText('0', { timeout: 10_000 });
  // …and the take is what enables it, on the controller's own 400 ms log poll.
  await expect(scoreSteps.first()).toBeEnabled({ timeout: 10_000 });

  /** Every PROGRAM `update` this page has sent, newest last. */
  const programUpdates = () =>
    rows.filter((r) => r.stream === 'program' && (r.msg as { t: string }).t === 'update')
      .map((r) => (r.msg as { data: Record<string, string> }).data);

  // Stage an edit that must NOT ride the bump: a half-typed name. Typing STAGES on this
  // surface too - the editor header has always promised "changes push live on ✎ Update".
  const nameRow = ctl.locator('.field', { hasText: /^F1 · / });
  await nameRow.locator('input[type="text"]').fill('ZO');
  await ctl.waitForTimeout(300);
  expect(programUpdates().some((d) => d.f1 === 'ZO')).toBe(false);
  await expect(air.locator('#f1')).toHaveText('MAYA');

  // THE BUMP. One press, one row, one key.
  const scoreRow = ctl.locator('.field', { hasText: /^F2 · / });
  const before = programUpdates().length;
  await scoreRow.locator('button.step', { hasText: '+' }).click();
  await expect.poll(() => programUpdates().length).toBe(before + 1);
  expect(programUpdates()[before]).toEqual({ f2: '1' });
  await scoreRow.locator('button.step', { hasText: '−' }).click();
  await expect.poll(() => programUpdates().length).toBe(before + 2);
  expect(programUpdates()[before + 1]).toEqual({ f2: '0' });

  // The aired board moved and the staged name did not travel with it…
  await expect(scoreRow.locator('input[type="number"]')).toHaveValue('0');
  await expect(air.locator('#f1')).toHaveText('MAYA');
  // …and the cue kept the bumped value, so the next ⟳ Take or ✎ Update cannot regress it.
  await scoreRow.locator('button.step', { hasText: '+' }).click();
  await expect(air.locator('#f2')).toHaveText('1', { timeout: 10_000 });

  // §7c's EXCLUSION: the spotlight index is an ⚡ payload field, so its stepper airs nothing -
  // it is set by its own action, and a second road to it would air a value without the state
  // that gives it meaning. Pressing + there stages, exactly like typing.
  const spotRow = ctl.locator('.field', { hasText: /^F9 · / });
  const beforeSpot = programUpdates().length;
  await spotRow.locator('button.step', { hasText: '+' }).click();
  await ctl.waitForTimeout(400);
  expect(programUpdates().length).toBe(beforeSpot);
  // The ⚡ action is how that number reaches air, carrying the state that explains it.
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Spotlight podium' }).click();
  await expect(air.locator('.scoreboard-podium-1')).toHaveClass(/scoreboard-podium-spot/, { timeout: 10_000 });

  // ✎ Update stays the deliberate other half: the WHOLE value set, staged name included.
  await ctl.locator('#v-update').click();
  await expect(air.locator('#f1')).toHaveText('ZO', { timeout: 10_000 });
  const last = programUpdates()[programUpdates().length - 1];
  expect(last.f1).toBe('ZO');
  expect(Object.keys(last).length).toBeGreaterThan(1);
  expect(last.f2).toBe('1');   // the bump survived the full publish rather than being undone

  await ctl.close();
  await air.close();
});

// ── THE MATCH CLOCK ACROSS A RENDERER RELOAD (docs/SPORTS_PACK.md) ────────────────────────────
// A clock is the one value that keeps moving with nobody commanding it, so a log of what was
// SENT cannot rebuild it. The hosted /output renderer has attached a time origin since
// 2026-08-19; the EXPORT door — the rehearsed backup when the network fails — did not, so a
// browser source reloaded mid-match came back at whatever the last Take carried and re-ran from
// there. Visibly wrong, on air, at the moment something has already gone wrong.
//
// These two cover the two exported operator surfaces a package ships. Both assert against REAL
// ELAPSED TIME or the WIRE rather than a fixed string: the clock is supposed to have kept
// running, so the only honest assertion is that it did.

/** Seconds behind the sb09 board's 10:00 start, from its rendered "M:SS". */
function behindStart(text: string): number {
  const [m, s] = text.trim().split(':');
  return 10 * 60 - ((parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0));
}

test('an exported package recovers a running match clock when the renderer reloads', async ({ page, context }) => {
  test.setTimeout(120_000);
  await createProject(page, { name: 'House Match Board' });
  await page.getByTestId('dock-tab-export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Validate & download/ }).click(),
  ]);
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const files = new Map<string, string>();
  let root = '';
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name].dir) continue;
    if (!root) root = `${name.split('/')[0]}/`;
    files.set(name.replace(root, ''), await zip.file(name)!.async('string'));
  }
  const graphicFile = [...files.keys()].find((n) => n.endsWith('.html') && n !== 'controlpanel.html')!;
  // A plain static host, NOT the relay: this is the BroadcastChannel pairing (the panel and the
  // graphic in one browser), which is the transport that carries the recovery replay.
  const serve = (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || graphicFile;
    const body = files.get(path);
    if (body == null) return route.fulfill({ status: 404, body: 'nf' });
    const ct = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'application/javascript' : 'text/html';
    return route.fulfill({ status: 200, contentType: ct, body });
  };
  const origin = 'http://clock-recovery.local';

  const graphic = await context.newPage();
  await graphic.route(`${origin}/**`, serve);
  await graphic.goto(`${origin}/${graphicFile}`, { waitUntil: 'load' });
  const panel = await context.newPage();
  await panel.route(`${origin}/**`, serve);
  await panel.goto(`${origin}/controlpanel.html`, { waitUntil: 'load' });
  await expect(panel.locator('.state-chip')).toBeVisible();

  // Kick off: the board airs at 10:00 and the clock starts counting down.
  await panel.getByRole('button', { name: '▶ Play' }).click();
  await expect(graphic.locator('#f5')).toHaveText('10:00');
  await panel.getByRole('button', { name: '⚡ Start clock' }).click();
  await expect(graphic.locator('#f5')).toHaveText('9:55', { timeout: 20_000 });

  // THE WIRE IS THE CONTRACT. What makes recovery possible is that the value the panel logged
  // carries the instant it was true — a plain "10:00" is a HELD time and rebuilds nothing.
  const logged = await panel.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)!;
      if (key.startsWith('noacg-log-')) return JSON.parse(localStorage.getItem(key)!) as { data: Record<string, string> };
    }
    return null;
  });
  expect(logged?.data.f5, 'the logged clock value must carry its time origin').toMatch(/^10:00@\d{13}$/);

  // THE RELOAD. The graphic announces itself, the panel rebuilds it from that log, and what
  // comes back must be the MATCH time — not the value the last Take carried.
  const beforeAt = Date.now();
  const before = behindStart((await graphic.locator('#f5').textContent())!);
  await graphic.reload({ waitUntil: 'load' });
  await expect(graphic.locator('#f5')).not.toHaveText('', { timeout: 10_000 });
  await page.waitForTimeout(3_000);
  const elapsed = (Date.now() - beforeAt) / 1000;
  const after = behindStart((await graphic.locator('#f5').textContent())!);
  // It kept running across the reload: the clock advanced by the wall time that passed, ±1.5 s
  // for the second boundary and the reload itself. Before the fix it came back at 10:00, so
  // `after` went BACKWARDS — the assertion fails by a wide margin rather than by a rounding.
  expect(
    after - before,
    `clock went ${before}s -> ${after}s behind the start over ${elapsed}s of real time`,
  ).toBeGreaterThan(elapsed - 1.5);
  expect(after - before).toBeLessThan(elapsed + 1.5);

  await panel.close();
  await graphic.close();
});

test('the EXPORTED CONTROLLER stamps the clock too: the origin rides the wire before the event', async ({ page, context }) => {
  test.setTimeout(180_000);
  // The same package ships two operator surfaces, and an operator who switches between them must
  // not switch behaviour (docs/CONTROL_PANEL_PARITY.md). The controller drives OBS/vMix through
  // the local relay, so the assertion is the WIRE: a screen that looks right can still be
  // shipping a plain value that rebuilds nothing.
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const b64 = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { createGraphic } = await import('/src/model/library.ts');
    const shows = await import('/src/model/shows.ts');
    const { buildShowZipFor } = await import('/src/export/showExport.ts');
    const tpl = variantById('sb09')!.create({});          // House Match Board: f5 counts down from 10:00
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
  const origin = 'http://clock-controller.local';

  const air = await context.newPage();
  await routeOrigin(air, origin, serve);
  await air.goto(`${origin}/${manifest.graphics[0].file}?stream=program`, { waitUntil: 'load' });
  const ctl = await context.newPage();
  await routeOrigin(ctl, origin, serve);
  await ctl.goto(`${origin}/controller.html`, { waitUntil: 'load' });
  await expect(ctl.locator('#mode')).toContainText('SHOW');
  await ctl.locator('.cue', { hasText: 'Kick-off' }).click();
  await ctl.locator('#v-take').click();
  await expect(air.locator('#f5')).toHaveText('10:00', { timeout: 10_000 });

  const before = rows.length;
  await ctl.locator('#editor-events').getByRole('button', { name: '⚡ Start clock' }).click();
  await expect.poll(() => rows.length).toBeGreaterThan(before + 1);
  const sent = rows.slice(before).map((r) => r.msg as { t: string; event?: string; data?: Record<string, string> });
  // ORDER MATTERS: the origin has to be in the document by the time startMatchClock runs, or the
  // runtime mints a local one and the wire's origin is never the one on air.
  expect(sent[0].t).toBe('update');
  expect(sent[0].data!.f5, 'the controller must stamp the clock field').toMatch(/^10:00@\d{13}$/);
  expect(sent[1]).toMatchObject({ t: 'event', event: 'clockStart' });

  // …and it is STAGED into the cue, so the whole value set a later ⟳ TAKE or ✎ Update sends
  // carries the stamped value rather than dragging the running clock back to 10:00.
  const stamped = sent[0].data!.f5;
  const afterEvent = rows.length;
  await ctl.locator('#v-update').click();
  await expect.poll(() => rows.length).toBeGreaterThan(afterEvent);
  const update = rows[rows.length - 1].msg as { t: string; data: Record<string, string> };
  expect(update.data.f5).toBe(stamped);
  // The operator still reads a plain time — the stamp is wire syntax, never something to type past.
  await expect(ctl.locator('.field', { hasText: /^F5 · / }).locator('input[type="text"]')).toHaveValue('10:00');

  await ctl.close();
  await air.close();
});

// ── The desktop scroll model (docs/PLAYOUT_DASHBOARD.md §2) ───────────────────────────────
// Owner report 2026-08-19, from a 1080p monitor: the EDITOR — where scores, names and texts are
// changed mid-show — had its own scrollbar, so operating a graphic with many fields meant
// scrolling a small box inside a page that could not scroll at all. The owner's correction names
// both halves: "I don't mind scrolling the whole page… I also don't want it too small", and "we
// should rather make the preview and program screens a bit smaller… you see what's out all the
// time". So: the PAGE scrolls, nothing is shrunk to fit, and the monitors stay in view.
//
// The cue rail is the ONE exception. A forty-cue rundown has nowhere else to go, so it keeps its
// own scroller — inside a rail that sticks under the header rather than sliding away.
test.describe('the production page scrolls as one page', () => {
  /** The structural half, at the nominal 1080p the report names. */
  test.describe('at 1920x1080', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('nothing between the page and the editor is a scroller, and the monitors are capped', async ({ page }) => {
      await createProject(page, { name: 'Arena Quiz' });
      await productionFor(page, 'Quiz Night');
      await expect(page.getByTestId('cue-editor')).toBeVisible();

      const overflowOf = (sel: string) => page.locator(sel).evaluate((el) => getComputedStyle(el).overflowY);
      // `hidden` counts as a failure here: it is what clipped the editor's own bottom rows.
      expect(await overflowOf('.pd-main')).not.toMatch(/auto|scroll|hidden/);
      expect(await overflowOf('.pd-editor')).not.toMatch(/auto|scroll/);
      expect(await overflowOf('.pd-activity')).not.toMatch(/auto|scroll/);
      // The one exception, and it is deliberate.
      expect(await overflowOf('.pd-cues')).toMatch(/auto|scroll/);

      // The monitors give up the height the editor needed: near 30vh, both still 16:9 and still
      // side by side — smaller, never stacked (§3's rule about air staying beside preview).
      const monitors = await page.locator('.pd-monitors').boundingBox();
      expect(monitors!.height).toBeLessThanOrEqual(1080 * 0.32);
      const pvw = await page.locator('.pd-pvw .pd-frame').boundingBox();
      const pgm = await page.locator('.pd-pgm .pd-frame').boundingBox();
      expect(Math.abs(pvw!.y - pgm!.y)).toBeLessThanOrEqual(2);
      expect(pgm!.x).toBeGreaterThan(pvw!.x + pvw!.width - 2);
      expect(Math.abs(pvw!.width / pvw!.height - 16 / 9)).toBeLessThan(0.05);
      expect(Math.abs(pgm!.width / pgm!.height - 16 / 9)).toBeLessThan(0.05);

      // §3: a horizontal scrollbar on this surface is a layout bug, never an affordance.
      const doc = await page.evaluate(() => ({
        scrollWidth: document.scrollingElement!.scrollWidth,
        clientWidth: document.scrollingElement!.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
    });
  });

  /** The reported case. A 1080p monitor at the 125% Windows scaling this laptop ships with, less
   *  the browser's own chrome, is 1536x814 CSS px — and THAT is where the eight-field quiz did
   *  not fit: .pd-editor was 178px tall over 240px of content and the document could not scroll
   *  a single pixel. Nominal 1920x1080 hid it, which is why the report was not reproducible
   *  from the numbers alone. */
  test.describe('at a scaled 1080p (1536x814)', () => {
    test.use({ viewport: { width: 1536, height: 814 } });

    test('a graphic with eight fields makes the PAGE longer, not the editor scrollable', async ({ page }) => {
      await createProject(page, { name: 'Arena Quiz' });
      await productionFor(page, 'Quiz Night');
      const editor = page.getByTestId('cue-editor');
      await expect(editor).toBeVisible();
      expect(await editor.locator('.field-row').count()).toBeGreaterThanOrEqual(8);

      // The editor shows all of itself — the reported defect, gone.
      expect(await editor.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);

      // Now take the height away: a shorter window (or a graphic with more fields than this
      // one) is where the model has to prove itself. The PAGE grows; the editor still does not.
      await page.setViewportSize({ width: 1536, height: 560 });
      expect(await editor.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      const doc = await page.evaluate(() => ({
        scrollHeight: document.scrollingElement!.scrollHeight,
        clientHeight: document.scrollingElement!.clientHeight,
      }));
      expect(doc.scrollHeight).toBeGreaterThan(doc.clientHeight);

      // Scrolled to the bottom, preview and program are STILL on screen — "you see what's out
      // all the time" — and so is the rundown the next cue is picked from.
      await page.evaluate(() => document.scrollingElement!.scrollTo(0, 10_000));
      await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(0);
      for (const sel of ['.pd-monitors', '.pd-rail']) {
        const box = await page.locator(sel).boundingBox();
        expect(box!.y, `${sel} scrolled away above the fold`).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, `${sel} pushed off the bottom`).toBeLessThanOrEqual(561);
      }
    });
  });
});
