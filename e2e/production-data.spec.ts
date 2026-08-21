import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import { parkFocusOffControls } from './_keys';

// The production DATA workspace (docs/INTERACTIVE_PLAYOUT_PLAN.md D3/D6): the show's own
// tables, edited on the Data tab, loaded into CUES on the Playout tab by deliberate operator
// action. The load fills a DRAFT — nothing reaches air except through Take.

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

test('a quiz bank authored on the Data tab loads into the cue, airs only on Take, and survives a reload', async ({ page }) => {
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night');

  // ── The Data workspace: create a quiz table (preset columns spell the quiz field titles). ──
  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('production-data')).toBeVisible();
  await expect(page.getByTestId('data-empty')).toBeVisible();
  await page.getByTestId('add-dataset').click();
  const dataset = page.locator('.pd-dataset');
  await expect(dataset).toHaveCount(1);
  await expect(dataset.getByTestId('dataset-name')).toHaveValue('Quiz questions');
  // The preset ships its starter row; fill it, then add a second question.
  const fill = async (rowIndex: number, cells: string[]) => {
    const row = dataset.locator('tbody tr').nth(rowIndex);
    for (let i = 0; i < cells.length; i++) {
      await row.locator('td input').nth(i).fill(cells[i]);
    }
  };
  await fill(0, ['Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Pluto', 'Titan', 'B']);
  await page.getByTestId('add-row').click();
  await expect(dataset.locator('tbody tr')).toHaveCount(2);
  await fill(1, ['Which ocean is the largest?', 'Atlantic', 'Indian', 'Pacific', 'Arctic', 'C']);
  await expect(dataset).toContainText('2 rows');

  // ── Back on Playout, the cue offers the rows — labelled by their question. ──
  await page.getByTestId('tab-playout').click();
  const load = page.getByTestId('cue-load-row');
  await expect(load).toBeVisible();
  await expect(load.locator('option')).toHaveCount(3); // the placeholder + two rows
  await load.selectOption({ label: 'Quiz questions: Which ocean is the largest?' });

  // The load fills the DRAFT: fields update, the local preview settles, air stays untouched.
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Which ocean is the largest?');
  await expect(page.getByTestId('cue-field-f3')).toHaveValue('Pacific');
  await expect(page.getByTestId('cue-field-f5-opt-C')).toHaveClass(/on/);
  const preview = page.frameLocator('iframe[title="Cue preview"]');
  await expect(preview.locator('#f0')).toHaveText('Which ocean is the largest?');
  // The preview must come back SCALED after the Data-tab round trip: the measure effect used
  // to key on the unchanged document, so the remounted frame was never measured and a 1920px
  // document rendered unscaled — DOM text present, picture showing its empty corner.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const iframe = document.querySelector('iframe[title="Cue preview"]')?.getBoundingClientRect();
        const frame = document.querySelector('[data-testid="production-preview"]')?.getBoundingClientRect();
        return iframe && frame ? iframe.width <= frame.width + 1 : false;
      }),
    )
    .toBe(true);
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await expect(page.getByTestId('live-cue-chip')).toContainText('nothing on air');

  // Take airs it — the one door to Program.
  await page.getByTestId('verb-take').click();
  await expect(program.locator('#f0')).toHaveText('Which ocean is the largest?');

  // ── The table is on the Show record: reload, reopen the Data tab, everything is there. ──
  await page.reload();
  await expect(page.getByTestId('production-page')).toBeVisible();
  await page.getByTestId('tab-data').click();
  await expect(page.locator('.pd-dataset tbody tr')).toHaveCount(2);
  await expect(page.locator('.pd-dataset tbody tr').nth(1).locator('td input').first()).toHaveValue(
    'Which ocean is the largest?',
  );

  // The deep link works too: #/production/<id>/data is a real route with real history.
  expect(page.url()).toContain('/data');

  // ── Row and table removal: a row goes at once; a whole table asks twice. ──
  const rows = page.locator('.pd-dataset tbody tr');
  await rows.nth(0).locator('[data-testid^="row-delete-"]').click();
  await expect(rows).toHaveCount(1);
  await page.getByTestId('dataset-delete').click();
  await expect(page.getByTestId('dataset-delete')).toHaveText('Delete table?');
  await page.getByTestId('dataset-delete').click();
  await expect(page.getByTestId('data-empty')).toBeVisible();

  // Back on Playout the load control disappears with the table — no dead select.
  await page.getByTestId('tab-playout').click();
  await expect(page.getByTestId('cue-load-row')).toBeHidden();
});

test('a table whose columns match nothing offers no load control, and columns can be added and renamed', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Plain News');

  await page.getByTestId('tab-data').click();
  await page.getByTestId('new-dataset-kind').selectOption('generic');
  await page.getByTestId('add-dataset').click();
  const dataset = page.locator('.pd-dataset');

  // Generic columns match no lower-third field — the Playout tab offers nothing.
  await page.getByTestId('tab-playout').click();
  await expect(page.getByTestId('cue-load-row')).toBeHidden();

  // Rename a column to the field's TITLE and the binding appears — the words are the wiring.
  await page.getByTestId('tab-data').click();
  await dataset.getByTestId('col-c0').fill('Name');
  await dataset.locator('tbody tr td input').first().fill('Alexandra Riva');
  await page.getByTestId('new-column-name').fill('Title');
  await page.getByTestId('add-column').click();
  await dataset.locator('tbody tr td input').nth(3).fill('Chief Correspondent');

  await page.getByTestId('tab-playout').click();
  const load = page.getByTestId('cue-load-row');
  await expect(load).toBeVisible();
  await load.selectOption({ label: 'Data table: Alexandra Riva' });
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Alexandra Riva');
  await expect(page.getByTestId('cue-field-f1')).toHaveValue('Chief Correspondent');
});

test('a teams table loads one team into the side the operator picked, and leaves the other alone', async ({ page }) => {
  test.setTimeout(120_000);
  // ONE ROW IS ONE TEAM. A two-team board titles its fields "Team A" / "Score A" / "Team B" /
  // …, so a teams row matches none of them literally and the preset used to bind nothing at
  // all. The side picker is what closes that: the operator says which half of the board the
  // next row fills, and the field titles are matched with their side token dropped.
  await createProject(page, { name: 'House Match Board' });
  await productionFor(page, 'Cup Final');

  await page.getByTestId('tab-data').click();
  await page.getByTestId('new-dataset-kind').selectOption('teams');
  await page.getByTestId('add-dataset').click();
  const dataset = page.locator('.pd-dataset');
  await expect(dataset.getByTestId('dataset-name')).toHaveValue('Teams');
  const fill = async (rowIndex: number, cells: string[]) => {
    const row = dataset.locator('tbody tr').nth(rowIndex);
    for (let i = 0; i < cells.length; i++) await row.locator('td input').nth(i).fill(cells[i]);
  };
  // Columns: Team · Score · Team colour · Team logo — every one the sideless half of a real
  // field title, which is what makes them bindable at all.
  await fill(0, ['Ashton United', '2', '#ff0000', '']);
  await page.getByTestId('add-row').click();
  await fill(1, ['Marske Town', '1', '#0000ff', '']);

  await page.getByTestId('tab-playout').click();
  const side = page.getByTestId('cue-load-side');
  await expect(side).toBeVisible();          // a sided board, so the picker is offered

  // Load the first team into side A. B must not move.
  await page.getByTestId('cue-load-side-A').click();
  await page.getByTestId('cue-load-row').selectOption({ label: 'Teams: Ashton United' });
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Ashton United');
  await expect(page.getByTestId('cue-field-f1')).toHaveValue('2');
  // Side B still holds the design's own starting values — this board ships a sample score.
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('AWAY');
  await expect(page.getByTestId('cue-field-f3')).toHaveValue('84');

  // Now the second team into side B. A must survive it — this is the assertion that proves the
  // other side's fields are excluded rather than merely unmatched.
  await page.getByTestId('cue-load-side-B').click();
  await page.getByTestId('cue-load-row').selectOption({ label: 'Teams: Marske Town' });
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('Marske Town');
  await expect(page.getByTestId('cue-field-f3')).toHaveValue('1');
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Ashton United');
  await expect(page.getByTestId('cue-field-f1')).toHaveValue('2');

  // Loading is a DRAFT action: nothing reached air without a Take.
  await expect(page.getByTestId('live-cue-chip')).toContainText('nothing on air');
});

test('a graphic with no sides never grows a side picker, and the quiz binding is untouched', async ({ page }) => {
  // The guard on the gesture: the picker is offered only where A/B fields exist, so a quiz
  // board (whose titles carry "Answer A"… but no standalone side on the fields a row fills)
  // must keep binding exactly as it did before the side rule existed.
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night 2');

  await page.getByTestId('tab-data').click();
  await page.getByTestId('add-dataset').click();
  const dataset = page.locator('.pd-dataset');
  const row = dataset.locator('tbody tr').nth(0);
  const cells = ['Which planet is red?', 'Venus', 'Mars', 'Pluto', 'Titan', 'B'];
  for (let i = 0; i < cells.length; i++) await row.locator('td input').nth(i).fill(cells[i]);

  await page.getByTestId('tab-playout').click();
  await page.getByTestId('cue-load-row').selectOption({ index: 1 });
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Which planet is red?');
  await expect(page.getByTestId('cue-field-f2')).toHaveValue('Mars');
});

test('a graphic on air survives a Data-workspace round trip', async ({ page }) => {
  // THE DEFECT (acceptance pass, 2026-08-06): "go to the Data tab while something is in
  // program, come back to Playout, and the graphic is gone from the dashboard — it's still
  // live on CasparCG." The workspace switch unmounts the monitors, and the rebuilt PROGRAM
  // stage is a blank renderer nobody had told what was on air.
  //
  // The same shape as the Phase 2 defect on this exact round trip (the preview came back
  // unscaled), which is why this asserts the RENDERED PICTURE inside the program iframe rather
  // than the ON AIR chip beside it: the chip was right the whole time the monitor was empty.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Round Trip');

  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  // A value the DESIGN does not ship. Taking the cue as-is proves nothing: a rebuilt stage
  // renders the template's own default text, so an assertion against it passes on a monitor
  // that was never told anything (this spec did exactly that in its first version).
  const AIRED = 'Round Trip Sentinel';
  await page.getByTestId('cue-field-f0').fill(AIRED);
  await page.getByTestId('verb-take').click();
  await expect(program.locator('#f0')).toHaveText(AIRED);
  await expect(page.getByTestId('live-cue-chip')).not.toContainText('nothing on air');

  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('production-data')).toBeVisible();
  await page.getByTestId('tab-playout').click();

  // Back on Playout: the rundown still says ON AIR, and now so does the picture.
  await expect(page.getByTestId('live-cue-chip')).not.toContainText('nothing on air');
  await expect(program.locator('#f0')).toHaveText(AIRED);
  // Not merely present in the markup — the entrance ran, so it is actually visible.
  await expect
    .poll(async () =>
      program.locator('#f0').evaluate((el) => {
        const box = el.closest('[class$="-box"]') ?? el;
        return Number(getComputedStyle(box as Element).opacity);
      }),
    )
    .toBeGreaterThan(0.9);
});

test('a quiz bank imported from CSV loads into a cue and airs — the Phase 2 walk from a file', async ({ page }) => {
  // Phase 7. The parser's own edge cases (quoted commas, quoted newlines, doubled quotes,
  // separators, JSON shapes) are unit-tested in scripts/csv.test.mjs; what is pinned HERE is
  // the walk a user actually does — a file becomes a table, a row becomes a cue, the cue airs.
  // The fixture carries a quoted comma on purpose, so a `split(',')` regression cannot pass.
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Import Night');

  await page.getByTestId('tab-data').click();
  await page.getByTestId('import-dataset').setInputFiles({
    name: 'Quiz bank.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Question,Answer A,Answer B,Answer C,Answer D,Correct answer\n' +
        '"Which of these, exactly, is a planet?",Ganymede,Mars,Europa,Titan,B\n' +
        'Which ocean is the largest?,Atlantic,Indian,Pacific,Arctic,C\n',
    ),
  });

  // It reports what BOUND, not merely what arrived: a table that matches no field imports
  // perfectly and does nothing.
  const note = page.getByTestId('import-note');
  await expect(note).toContainText('Imported 2 rows');
  await expect(note).toContainText('Question');
  await expect(note).toContainText('Correct answer');

  // A real table, named after the file, editable like any other.
  const dataset = page.locator('.pd-dataset');
  await expect(dataset).toHaveCount(1);
  await expect(dataset.getByTestId('dataset-name')).toHaveValue('Quiz bank');
  await expect(dataset.locator('tbody tr')).toHaveCount(2);
  // The quoted comma survived — one cell, not two columns.
  await expect(dataset.locator('tbody tr').first().locator('td input').first()).toHaveValue(
    'Which of these, exactly, is a planet?',
  );

  // ── Load a row into the cue and air it. ──
  await page.getByTestId('tab-playout').click();
  await page.getByTestId('cue-load-next').click();
  await expect(page.getByTestId('cue-field-f0')).toHaveValue('Which of these, exactly, is a planet?');
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await page.getByTestId('verb-take').click();
  await expect(program.locator('#f0')).toHaveText('Which of these, exactly, is a planet?');
  await expect(program.locator('#f2')).toHaveText('Mars');
});

test('the downloaded template is a file the importer accepts, with the columns a cue can bind', async ({
  page,
}) => {
  // The other half of import. What is pinned is the ROUND TRIP: the header the download carries
  // is the header the importer reads back, and its columns bind to the quiz board's fields -
  // which is the whole reason a blank template beats guessing at column names.
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Template Night');
  await page.getByTestId('tab-data').click();

  await page.getByTestId('new-dataset-kind').selectOption('quiz');
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-dataset-template').click(),
  ]).then(([d]) => d);
  expect(download.suggestedFilename()).toBe('quiz-questions-template.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text.trim()).toBe('Question,Answer A,Answer B,Answer C,Answer D,Correct answer');

  // Hand it straight back, with a row typed in as an operator would.
  await page.getByTestId('import-dataset').setInputFiles({
    name: 'Quiz questions.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`${text}Which planet is red?,Venus,Mars,Pluto,Titan,B\r\n`),
  });
  const note = page.getByTestId('import-note');
  await expect(note).toContainText('Imported 1 row');
  // Every column bound - a template that named a column no field answers to would be the one
  // failure this feature exists to make impossible.
  await expect(note).toContainText('Question, Answer A, Answer B, Answer C, Answer D, Correct answer');
});

test('an imported table whose columns match no field says so rather than looking successful', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'No Match');
  await page.getByTestId('tab-data').click();
  await page.getByTestId('import-dataset').setInputFiles({
    name: 'sales.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Region;Revenue\nNorth;12\nSouth;9\n'),
  });
  const note = page.getByTestId('import-note');
  // The semicolon export still parses as two columns — the separator is detected, not assumed.
  await expect(page.getByTestId('col-c0')).toHaveValue('Region');
  await expect(page.getByTestId('col-c1')).toHaveValue('Revenue');
  await expect(note).toContainText('NO column matches');
});

test('a file that is not a table is refused with a reason', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Bad File');
  await page.getByTestId('tab-data').click();
  await page.getByTestId('import-dataset').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(page.getByTestId('import-note')).toContainText('list of rows');
  await expect(page.getByTestId('data-empty')).toBeVisible();
});

test('the empty workspace carries the doors and names the columns that would bind', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Empty Data');
  await page.getByTestId('tab-data').click();

  // With no tables the three doors live INSIDE the empty state - it used to be one grey
  // sentence over most of the screen with the actions parked in a corner of the header.
  const empty = page.getByTestId('data-empty');
  await expect(empty).toBeVisible();
  await expect(empty.getByTestId('add-dataset')).toBeVisible();
  await expect(empty.getByTestId('download-dataset-template')).toBeVisible();
  await expect(page.locator('.pd-data-head .pd-data-actions')).toHaveCount(0);

  // And it answers the surface's one hard question - what do I call my columns? - with this
  // production's own field titles, which is what an imported header is matched against.
  await expect(empty.getByTestId('bindable-columns')).toContainText('Name');
  await expect(empty.getByTestId('bindable-columns')).toContainText('Title');

  // Create a table and the same cluster moves to the header, flush right and unbroken. Asserted
  // as GEOMETRY: `toBeVisible` is blind to a button that wrapped onto a row of its own, which is
  // exactly what the ⬇ Blank CSV button used to do beside a `.spacer` that pushes nothing.
  await page.getByTestId('add-dataset').click();
  await expect(empty).toHaveCount(0);
  const actions = page.locator('.pd-data-head .pd-data-actions');
  await expect(actions).toBeVisible();
  // ONE ROW is measured as the cluster's own HEIGHT, not by comparing the children's tops:
  // they are centred on the line at slightly different heights (a select is a pixel taller than
  // a button), so rounded tops disagree by one pixel on some platforms and read as two rows on a
  // cluster that never wrapped. A wrapped cluster is two control heights plus the gap - far
  // above any rounding.
  const layout = await page.evaluate(() => {
    const head = document.querySelector('.pd-data-head')!.getBoundingClientRect();
    const box = document.querySelector('.pd-data-head .pd-data-actions')!.getBoundingClientRect();
    return { height: Math.round(box.height), rightGap: Math.round(head.right - box.right) };
  });
  expect(layout.height).toBeLessThan(50);
  expect(layout.rightGap).toBeLessThanOrEqual(1);
});

// ── PRODUCTION DATA: the live tree, the bindings, and the rules that make them safe on air
// (docs/PRODUCTION_DATA_PLAN.md). Everything below is Phase 1: local, manual, no API.

/** Add one value to the production's live tree from the Data tab. */
async function addValue(page: Page, path: string, value: string): Promise<void> {
  await page.getByTestId('data-new-path').fill(path);
  await page.getByTestId('data-new-value').fill(value);
  await page.getByTestId('data-add').click();
  await expect(page.getByTestId(`data-row-${path}`)).toBeVisible();
}

/** The pool graphic's name, as the bindings table prints it. */
async function firstGraphicName(page: Page): Promise<string> {
  const heading = await page.locator('.pd-bind-graphic h4').first().textContent();
  return (heading ?? '').trim();
}

test('a bound field takes the LIVE value on air, and an old cue cannot re-air a stale one', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Match Night');

  // ── The playground: a nested tree, typed by what was written rather than by a schema. ──
  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('production-live-data')).toBeVisible();
  await addValue(page, 'match.home.name', 'Finland');
  await addValue(page, 'match.home.score', '1');
  await expect(page.getByTestId('data-row-match.home.score')).toContainText('number');
  // A clock is TEXT - a value box that parsed 12:31 as a number would air 12.
  await addValue(page, 'match.clock', '12:31');
  await expect(page.getByTestId('data-row-match.clock')).toContainText('string');

  // ── Bind the graphic's first field to the name. ──
  const graphicName = await firstGraphicName(page);
  await page.getByTestId(`bind-${graphicName}-f0`).fill('match.home.name');
  await expect(page.getByTestId(`bind-value-${graphicName}-f0`)).toHaveText('Finland');

  // ── On Playout the bound field READS OUT: it is not a cue value, so there is no box to type
  //    a value into that nothing would ever air. ──
  await page.getByTestId('tab-playout').click();
  await expect(page.getByTestId('cue-bound-f0')).toBeVisible();
  await expect(page.getByTestId('cue-field-f0')).toHaveCount(0);
  const preview = page.frameLocator('iframe[title="Cue preview"]');
  await expect(preview.locator('#f0')).toHaveText('Finland');

  // The bound row shares its NEIGHBOUR's box. Asserted as geometry because `toBeVisible` is
  // blind to a row that sits 8px taller than the one beside it - which is exactly what a
  // hand-rolled label did here before it was rebuilt on FieldRow's own `.field-row` structure.
  // The cue fields lay out two across, so the mismatch put the two inputs on different lines.
  const rowBox = await page.evaluate(() => {
    const bound = document.querySelector('[data-testid="cue-bound-f0"]')!.getBoundingClientRect();
    const plainEl = document.querySelector('[data-testid="cue-field-f1"]')!;
    const plain = (plainEl.closest('.field-row') ?? plainEl).getBoundingClientRect();
    const boundInput = document.querySelector('[data-testid="cue-bound-f0"] input')!.getBoundingClientRect();
    const plainInput = (plainEl.matches('input,textarea') ? plainEl : plainEl.querySelector('input,textarea')!).getBoundingClientRect();
    return {
      heightDelta: Math.abs(Math.round(bound.height) - Math.round(plain.height)),
      inputTopDelta: Math.abs(Math.round(boundInput.top) - Math.round(plainInput.top)),
      widthDelta: Math.abs(Math.round(bound.width) - Math.round(plain.width)),
    };
  });
  expect(rowBox.heightDelta).toBeLessThanOrEqual(1);
  expect(rowBox.inputTopDelta).toBeLessThanOrEqual(1);
  expect(rowBox.widthDelta).toBeLessThanOrEqual(1);

  // Take it: air shows the live value.
  const program = page.frameLocator('[data-testid="program-stage"] iframe');
  await page.getByTestId('verb-take').click();
  await expect(program.locator('#f0')).toHaveText('Finland');

  // ── THE RULE THAT MATTERS (plan 2.7): the data moves while this cue sits there prepared,
  //    and taking it AGAIN airs the new value, never the one it was prepared with. ──
  await page.getByTestId('tab-data').click();
  await page.getByTestId('data-value-match.home.name').fill('Sweden');
  await page.getByTestId('tab-playout').click();
  await expect(program.locator('#f0')).toHaveText('Sweden');
  await page.getByTestId('verb-take').click();
  await expect(program.locator('#f0')).toHaveText('Sweden');

  // ── Reload: the live tree is runtime state and survives, and it is NOT on the show record. ──
  await page.reload();
  await expect(page.getByTestId('production-page')).toBeVisible();
  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('data-value-match.home.name')).toHaveValue('Sweden');
  // The seed was never written, because saving one is a deliberate act - this is the whole
  // anti-churn rule (plan 2.1): live values must not touch the synced Show record.
  const onRecord = await page.evaluate(() => {
    const shows = JSON.parse(localStorage.getItem('spx-gfx-shows') ?? '[]') as { name: string; data?: unknown }[];
    return shows.find((s) => s.name === 'Match Night')?.data ?? null;
  });
  expect(onRecord).toBe(null);
});

test('the seed is the reset target, and unbinding hands the field back to the cue', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Seed Show');
  await page.getByTestId('tab-data').click();
  await addValue(page, 'counter', '5');

  // Save as seed, move the value, reset - the seed is what Reset returns to.
  await page.getByTestId('data-save-seed').click();
  await expect(page.getByTestId('data-note')).toContainText('seed');
  await page.getByTestId('data-up-counter').click();
  await expect(page.getByTestId('data-value-counter')).toHaveValue('6');
  await page.getByTestId('data-reset').click();
  await expect(page.getByTestId('data-value-counter')).toHaveValue('5');

  // Clear empties the tree; Reset brings the seed back, so Clear is never a data loss.
  await page.getByTestId('data-clear').click();
  await expect(page.getByTestId('data-empty-live')).toBeVisible();
  await page.getByTestId('data-reset').click();
  await expect(page.getByTestId('data-value-counter')).toHaveValue('5');

  // ── Bind, then UNBIND: the one override gesture (plan 2.7). The cue's own editable field
  //    comes back, which is what makes "manual override = unbind" a complete answer. ──
  const graphicName = await firstGraphicName(page);
  await page.getByTestId(`bind-${graphicName}-f0`).fill('counter');
  await page.getByTestId('tab-playout').click();
  await expect(page.getByTestId('cue-bound-f0')).toBeVisible();
  await page.getByTestId('tab-data').click();
  await page.getByTestId(`unbind-${graphicName}-f0`).click();
  await page.getByTestId('tab-playout').click();
  await expect(page.getByTestId('cue-field-f0')).toBeVisible();
  await expect(page.getByTestId('cue-bound-f0')).toHaveCount(0);
});

test('nested trees, arrays and a missing path each behave as the contract says', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Shapes');
  await page.getByTestId('tab-data').click();

  // A whole payload pasted as JSON - the same shape the future ingress API will accept, which
  // is what makes this panel the API's documentation as well as its playground.
  await page.getByTestId('data-raw-toggle').click();
  await page.getByTestId('data-raw-text').fill(
    JSON.stringify({
      poll: { open: true, options: [{ label: 'Yes', votes: 72 }] },
      headlines: ['First story', 'Second story'],
      drivers: [{ name: 'Driver A', gap: 'LEADER' }],
    }),
  );
  await page.getByTestId('data-raw-apply').click();
  // Nested objects, arrays of objects (indexed paths) and a scalar array as ONE leaf.
  await expect(page.getByTestId('data-row-poll.open')).toBeVisible();
  await expect(page.getByTestId('data-row-poll.options.0.votes')).toBeVisible();
  await expect(page.getByTestId('data-row-drivers.0.gap')).toBeVisible();
  await expect(page.getByTestId('data-value-headlines')).toHaveValue('First story\nSecond story');

  // Malformed JSON is refused with its own reason, and the tree is untouched. (A successful
  // apply CLOSES the panel - the edit is done - so this reopens it.)
  await page.getByTestId('data-raw-toggle').click();
  await page.getByTestId('data-raw-text').fill('{not json');
  await page.getByTestId('data-raw-apply').click();
  await expect(page.getByTestId('data-raw-error')).toBeVisible();
  await expect(page.getByTestId('data-row-poll.open')).toBeVisible();

  // ── A binding to a path that is not there writes NOTHING: the field keeps its own value
  //    rather than going blank on air (plan 2.4, "freeze is not-writing"). ──
  const graphicName = await firstGraphicName(page);
  await page.getByTestId(`bind-${graphicName}-f0`).fill('nothing.here');
  await expect(page.getByTestId(`bind-value-${graphicName}-f0`)).toContainText('no value');
  await page.getByTestId('tab-playout').click();
  const preview = page.frameLocator('iframe[title="Cue preview"]');
  await expect(preview.locator('#f0')).not.toHaveText('');

  // Deleting a value leaves the rest of the tree alone.
  await page.getByTestId('tab-data').click();
  await page.getByTestId('data-delete-poll.open').click();
  await expect(page.getByTestId('data-row-poll.open')).toHaveCount(0);
  await expect(page.getByTestId('data-row-poll.options.0.votes')).toBeVisible();
});

test('one value moves every graphic bound to it, and only the graphics bound to it', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Two Graphics');
  await page.getByTestId('tab-data').click();
  await addValue(page, 'shared.title', 'First');

  // The one binding this pool offers, bound - then the value moves and the preview follows
  // without anything being taken: a data write never plays, stops or takes anything.
  const graphicName = await firstGraphicName(page);
  await page.getByTestId(`bind-${graphicName}-f0`).fill('shared.title');
  await page.getByTestId('tab-playout').click();
  const preview = page.frameLocator('iframe[title="Cue preview"]');
  await expect(preview.locator('#f0')).toHaveText('First');
  await expect(page.getByTestId('live-cue-chip')).toContainText('nothing on air');

  await page.getByTestId('tab-data').click();
  await page.getByTestId('data-value-shared.title').fill('Second');
  await page.getByTestId('tab-playout').click();
  await expect(preview.locator('#f0')).toHaveText('Second');
  // Still nothing on air: state changed, no graphic was played.
  await expect(page.getByTestId('live-cue-chip')).toContainText('nothing on air');
});

test('production data is scoped to its production, never shared between two', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Show One');
  const showOneUrl = page.url();
  await page.getByTestId('tab-data').click();
  await addValue(page, 'shared.value', 'one');

  // A second production, from its own project. Same path, its own tree - the store is keyed by
  // production id, so nothing about "shared.value" is global.
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await productionFor(page, 'Show Two');
  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('production-live-data')).toBeVisible();
  await expect(page.getByTestId('data-row-shared.value')).toHaveCount(0);
  await addValue(page, 'shared.value', 'two');

  // Back to the first by its own URL (deterministic - no card hunting): still 'one'.
  await page.goto(showOneUrl);
  await expect(page.getByTestId('production-page')).toBeVisible();
  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('data-value-shared.value')).toHaveValue('one');
});

test('SPACE on the Data tab cannot put a graphic on air', async ({ page }) => {
  // THE VERB KEYS BELONG TO THE PLAYOUT SURFACE, and only while it is the surface on screen.
  //
  // `usePlayoutVerbKeys` binds in the SHELL, which renders on Data and Audience too - so
  // standing on the Data tab with focus anywhere but an input, SPACE ran Take. No monitors are
  // visible there, so a cue went to air with nothing on screen saying it had. That is the
  // hazard behind the owner's read of the workspaces (2026-08-21): "the buttons that we have
  // and the side pages we have feel a bit dangerous to swap between."
  //
  // THE PROBE IS THE ACTIVITY FEED, and getting here took two wrong ones worth naming, because
  // both are the shape of guard test that cannot fail:
  //   1. Reading `Show.liveCue` - a LOCAL take never writes that field, so the assertion was
  //      green with the guard removed.
  //   2. Pressing every verb key in a row and then asserting nothing aired. `0` is Out, so the
  //      sequence took the cue and took it straight back off. The test cancelled itself.
  // The feed counts what actually reached the wire, one row per command, and it cannot be
  // undone by a later key in the same press sequence.
  await createProject(page, { name: 'Arena Quiz' });
  await productionFor(page, 'Quiz Night');
  const rows = page.getByTestId('action-log-row');
  await expect(rows).toHaveCount(0);

  await page.getByTestId('tab-data').click();
  await expect(page.getByTestId('production-data')).toBeVisible();

  // Space belongs to a focused button by design, so say where focus is rather than inherit it.
  await parkFocusOffControls(page);
  for (const key of ['Space', 'n', 'r', '0', 'u']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
  }
  await expect(rows, 'a verb key pressed on the Data tab reached the wire').toHaveCount(0);

  // …and back on Playout the same key works, so this is a scoping rule and not a dead keymap.
  await page.getByTestId('tab-playout').click();
  await parkFocusOffControls(page);
  await page.keyboard.press('Space');
  await expect(page.getByTestId('live-cue-chip')).not.toContainText('nothing on air');
  await expect(rows).not.toHaveCount(0);
});
