import { test, expect, type Page } from '@playwright/test';
import { createProject, enableAdvancedMode, finishIntoEditor } from './_create';
import { chooseType, pickDesign } from './_browse';

// END CREDITS - the promise is that a credit roll is ONE field (docs/END_CREDITS.md). A show
// with five camera operators must not add five fields to the template: the whole list is pasted
// into a single textarea, in the studio or later in whatever is driving the graphic, and the
// template parses it at runtime.
//
// The parser's own rules are unit-tested against the EMITTED JavaScript
// (scripts/credits-parser.test.mjs). What only a browser can answer is the half those tests
// cannot see: that the parsed groups actually reach the DOM as one role over its people, and
// that the emphasis the Style step offers is the one the graphic ships with.

// Deliberately shares NOTHING with any design's own sample: a fixture that overlapped would
// let a paste that never landed pass every assertion below.
const PASTE = [
  '# CREW',
  'Sound: Ingrid Vasquez',
  'Camera Operators:',
  'Dara Nkemelu',
  'Elin Kristiansen',
  'Tomas Halvorsen',
  '',
  'With thanks to everyone who gave a Saturday to this',
].join('\n');

/** Paste the whole credit list into f0 the way an operator does - a field value written from
 *  outside the graphic, then an update() through the control path. */
async function pasteCredits(page: Page, text: string) {
  await page.evaluate(async (value: string) => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const store = useTemplateStore.getState();
    store.setSampleValue('f0', value);
    store.sendControl('update');
  }, text);
}

test('the whole credit roll is one field, and one role can credit five people', async ({ page }) => {
  await createProject(page, 'Classic Roll');

  // ONE field for the list. Two more exist and are not per-person: the year line and the logo.
  const fields = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.fields.map((f) => `${f.field}:${f.ftype}:${f.title}`);
  });
  expect(fields).toEqual(['f0:textarea:Credits', 'f1:textfield:Year / copyright', 'f2:filelist:Logo']);

  await pasteCredits(page, PASTE);
  const frame = page.frameLocator('iframe.preview-frame');

  // "Camera Operators:" over three names is ONE block holding one role and three names - the
  // shape a repeated "Camera Operator | Name" pairing could never produce.
  const group = frame.locator('.credits-group', { hasText: 'Camera Operators' });
  await expect(group.locator('.credits-role')).toHaveText('Camera Operators');
  await expect(group.locator('.credits-name')).toHaveText(['Dara Nkemelu', 'Elin Kristiansen', 'Tomas Halvorsen']);

  // A marked heading is a heading…
  await expect(frame.locator('.credits-heading')).toHaveText(['CREW']);
  // …and the sentence a roll ends on is NOT one. It used to be, because headings were promoted
  // by position, which set it in accent capitals at kicker size.
  await expect(frame.locator('.credits-entry')).toHaveText([
    'With thanks to everyone who gave a Saturday to this',
  ]);
});

test('a list pasted with no marks at all still reads as names', async ({ page }) => {
  await createProject(page, 'Classic Roll');
  await pasteCredits(page, 'Anna Lind\nBengt Ohlsson\nCecilia Ruiz');

  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.credits-entry')).toHaveText(['Anna Lind', 'Bengt Ohlsson', 'Cecilia Ruiz']);
  await expect(frame.locator('.credits-heading')).toHaveCount(0);
});

test('the same text lays out as columns in the column design', async ({ page }) => {
  // The format says what the content IS, never how it is arranged - so switching design never
  // means retyping the credits. cr02 puts the role beside its names instead of above them.
  await createProject(page, 'Column Roll');
  await pasteCredits(page, PASTE);

  const frame = page.frameLocator('iframe.preview-frame');
  const row = frame.locator('.credits-row', { hasText: 'Camera Operators' });
  await expect(row.locator('.credits-role')).toHaveText('Camera Operators');
  await expect(row.locator('.credits-names .credits-name')).toHaveCount(3);

  // Beside, not above: the role's column ends where the names' column begins.
  const role = await row.locator('.credits-role').boundingBox();
  const name = await row.locator('.credits-name').first().boundingBox();
  expect(role!.x + role!.width).toBeLessThanOrEqual(name!.x);
});

// The promise is only kept if the SURFACE keeps it. The template had one field from the start;
// what the wizard DREW was a row-per-line grid with an ✕ on every line and "+ Add a row" under
// it - one box per person, and no way to paste a roll in at all, since sixty lines have nowhere
// to go in a single-line input. That is the shape this category exists to avoid, and it shipped
// because nothing asserted on this step.
test('the Fields step is one paste box, not a field per person', async ({ page }) => {
  await enableAdvancedMode(page);
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Credits & thanks');
  await pickDesign(page, 'Classic Roll');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields

  const paste = page.getByTestId('list-paste-editor');
  await expect(paste).toBeVisible();
  // Not the ticker's rows grid: no per-line inputs, and nothing offering to add a line.
  await expect(page.getByTestId('list-rows-editor')).toHaveCount(0);
  await expect(page.getByTestId('list-row-add')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Add a line' })).toHaveCount(0);

  // A real roll pastes in WHOLE - the case a row grid cannot express at any length.
  const roll = [
    '# CREW',
    'Camera Operators:',
    ...Array.from({ length: 40 }, (_, i) => `Operator Number ${i + 1}`),
  ].join('\n');
  await paste.fill(roll);
  await expect(paste).toHaveValue(roll);

  await finishIntoEditor(page);
  await expect(page.locator('.wz-modal')).toBeHidden();

  // …and it is still ONE field on the other side, holding all 40 names under one role.
  const fields = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.fields.map((f) => `${f.field}:${f.ftype}`);
  });
  expect(fields).toEqual(['f0:textarea', 'f1:textfield', 'f2:filelist']);

  const frame = page.frameLocator('iframe.preview-frame');
  const group = frame.locator('.credits-group', { hasText: 'Camera Operators' });
  await expect(group.locator('.credits-name')).toHaveCount(40);
});

test('the Style step picks which line of a credit is the loud one', async ({ page }) => {
  await enableAdvancedMode(page);
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Credits & thanks');
  await pickDesign(page, 'Classic Roll');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields
  await page.getByRole('button', { name: 'Next →' }).click(); // Style

  const emphasis = page.getByTestId('wz-style-choice-emphasis');
  await expect(emphasis).toBeVisible();
  // The design's own answer is the one highlighted before anything is touched.
  await expect(emphasis.locator('button[data-value="role"]')).toHaveClass(/active/);
  await emphasis.locator('button[data-value="name"]').click();

  await finishIntoEditor(page);
  await expect(page.locator('.wz-modal')).toBeHidden();
  await pasteCredits(page, PASTE);

  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.credits-box')).toHaveClass(/credits-box--emph-name/);
  // The choice is real type, not just a class: the name is now the bigger of the two.
  const px = (value: string) => parseFloat(value);
  const group = frame.locator('.credits-group', { hasText: 'Camera Operators' });
  const roleSize = px(await group.locator('.credits-role').evaluate((el) => getComputedStyle(el).fontSize));
  const nameSize = px(await group.locator('.credits-name').first().evaluate((el) => getComputedStyle(el).fontSize));
  expect(nameSize).toBeGreaterThan(roleSize);
});
