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

// Nothing about a broadcaster's graphic may be MANDATORY. The roll declared logo: 'built-in',
// which renders the wizard's checkbox ticked AND disabled - so a broadcaster who does not want a
// logo slot could not export without one. It defaults ON, because a closing roll conventionally
// ends on a mark; the point is that it can be switched off.
test('the closing logo is a default, not a requirement', async ({ page }) => {
  await enableAdvancedMode(page);
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Credits & thanks');
  await pickDesign(page, 'Classic Roll');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields

  const logo = page.getByRole('checkbox').first();
  await expect(logo).toBeChecked();
  await expect(logo).toBeEnabled();
  await logo.uncheck();

  await finishIntoEditor(page);
  await expect(page.locator('.wz-modal')).toBeHidden();

  // No field, and no markup or styling for a slot the graphic does not have.
  const built = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return {
      fields: t.fields.map((f) => f.field),
      logoInHtml: t.html.includes('id="f2"'),
      logoInCss: t.css.includes('.credits-logo'),
      logoInJs: t.js.includes('credits-logo'),
    };
  });
  expect(built).toEqual({ fields: ['f0', 'f1'], logoInHtml: false, logoInCss: false, logoInJs: false });

  // The roll still signs off - the hairline and the year are not the logo's dependants.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.credits-end .credits-year')).toBeVisible();
  await expect(frame.locator('.credits-logo-slot')).toHaveCount(0);
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

// A SETTLED credit roll must have names on screen. Every surface that shows a graphic without
// a playback gesture - a Home card, a library thumbnail, the operator's preview before the
// first take - drives it to rest with preview/settleGraphic.ts, and "at rest" for a roll or a
// reel is not `progress(1)`: every credits design carries an ambient background drift with
// `repeat: -1`, which makes GSAP report the whole timeline's duration as its infinity sentinel.
// The two designs whose travel is ITSELF endless (the credits-loop reel, cr06 and cr08) landed
// at an arbitrary phase of that loop and settled to a COMPLETELY EMPTY frame on every one of
// those surfaces. Nothing measured it, so nothing said so.
test('every credits design settles with its names ON SCREEN', async ({ page }) => {
  test.setTimeout(120_000);
  await enableAdvancedMode(page);
  await page.goto('/app');
  await page.keyboard.press('Escape');

  const covered = (await page.evaluate(`(async () => {
    const { CATALOG } = await import('/src/templates/catalog.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const out = [];
    for (const variant of CATALOG['end-credits']) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-4000px;top:0;width:1920px;height:1080px;';
      document.body.appendChild(f);
      // The REAL bootstrap - composeDocument serializes settleGraphic into the document, so
      // this measures the shipped recipe rather than a copy of it.
      await new Promise((res) => { f.onload = res; f.srcdoc = composeDocument(variant.create({}), { settleWithData: '{}' }); });
      await new Promise((r) => setTimeout(r, 220));
      const w = f.contentWindow;
      const box = w.document.querySelector('.credits-box');
      const track = w.document.querySelector('#credits-track');
      let pct = null;
      if (box && track) {
        const b = box.getBoundingClientRect(); const t = track.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(b.bottom, t.bottom) - Math.max(b.top, t.top));
        pct = b.height > 0 ? Math.round((overlap / b.height) * 100) : 0;
      }
      out.push({ id: variant.id, pct });
      f.remove();
    }
    return out;
  })()`)) as { id: string; pct: number | null }[];

  expect(covered.length).toBeGreaterThan(10);
  for (const design of covered) {
    // A number, not a truthy check: 0 is exactly the failure this exists for.
    expect(design.pct, design.id).not.toBeNull();
    expect(design.pct, design.id).toBeGreaterThan(20);
  }
});
