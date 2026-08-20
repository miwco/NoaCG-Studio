import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { awaitPreviewRebuild } from './_preview';
import { previewFrame } from './_frame';

// The SVG import road, door to export (docs/SVG_IMPORT_PLAN.md P1): a layered
// Illustrator-shaped SVG dropped on the Import door becomes a playable template whose text
// layers are operator fields — the artwork inlined VERBATIM, the typography the designer's.
//
// The fixture (e2e/fixtures/illustrator-lower-third.svg) is deliberately Illustrator-shaped:
// layer names as ids with `_x20_` escapes and the uniquify suffix, data-name carrying the
// original spelling (including a DUPLICATE layer name), one multi-tspan text block, a
// class-based <style>, and two font families — one bundled (Archivo), one not (Neue Machina).

const FIXTURE = fileURLToPath(new URL('fixtures/illustrator-lower-third.svg', import.meta.url));

async function dropSvg(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles(FIXTURE);
}

/** Drop inline SVG markup as a file (the sanitizer and outlined-text cases author their own). */
async function dropSvgMarkup(page: Page, markup: string, name = 'design.svg') {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="import-graphic"]').click();
  await page.locator('.wz-drop input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(markup),
  });
}

/** Create from wherever the walk stands and land in the editor. */
async function createProject(page: Page) {
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    // 20 s: the modal closes once applyGenerated's cold Prettier format resolves (the same
    // cold-module cost import-graphic.spec.ts documents).
    await expect(page.locator('.wz-modal')).toBeHidden({ timeout: 20_000 });
  });
}

test('svg import: the drop is recognised, inventoried, and swaps the walk to the SVG rail', async ({ page }) => {
  await dropSvg(page);

  // The card states what was found — size, text layers, typefaces.
  const card = page.getByTestId('import-svg-card');
  await expect(card).toContainText('960 × 270');
  await expect(page.getByTestId('import-svg-layers')).toContainText('4 text layers');
  await expect(page.getByTestId('import-svg-fonts')).toContainText('Archivo');
  await expect(page.getByTestId('import-svg-fonts')).toContainText('Neue Machina');

  // The rail changed shape: no Prepare, no Place — one mapping step.
  await expect(page.locator('.wz-dot-label')).toHaveText(['Start', 'Design', 'Fields', 'Animation', 'Finish']);

  // The live preview mounts from the drop on — the real template, artwork inlined.
  await expect(page.locator('.wz-side iframe')).toBeVisible();
});

test('svg import: mapping — labels from layer names, all on by default, edits carried to the template', async ({ page }) => {
  await dropSvg(page);
  await page.locator('.wz-next').click();

  // Labels prefill from the layer names: data-name beats the uniquified id ("Title"), an
  // Illustrator-escaped id decodes, a tspan uses its own id, and an unnamed tspan falls back
  // to the nearest named ancestor — here the DUPLICATED "Text Layer" group name.
  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Name');
  await expect(page.getByTestId('map-svg-title-t1')).toHaveValue('Title');
  await expect(page.getByTestId('map-svg-title-t2')).toHaveValue('Location');
  await expect(page.getByTestId('map-svg-title-t3')).toHaveValue('Text Layer');
  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('Alexandra Riva');

  // No naming ritual: every detected text is ON.
  for (const id of ['t0', 't1', 't2', 't3']) {
    await expect(page.getByTestId(`map-svg-row-${id}`).locator('input[type=checkbox]')).toBeChecked();
  }

  // Hovering a row highlights the exact text it binds, on the step's own artwork render.
  await page.getByTestId('map-svg-row-t1').hover();
  await expect(page.getByTestId('map-svg-highlight')).toBeVisible();

  // The typefaces resolve honestly: the bundled match ships, the unknown face warns.
  await expect(page.getByTestId('map-svg-font-Archivo')).toContainText('Bundled');
  await expect(page.getByTestId('map-svg-font-warn-Neue Machina')).toBeVisible();

  // Edit the mapping: drop the clock layer, rename + retype the location.
  await page.getByTestId('map-svg-row-t3').locator('input[type=checkbox]').uncheck();
  await page.getByTestId('map-svg-title-t2').fill('City');
  await page.getByTestId('map-svg-sample-t2').fill('Tampere');

  await createProject(page);

  // The created template: three fields (the clock stayed as drawn), the edited label and
  // sample carried, ids bound in place inside the verbatim SVG.
  const state = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return {
      fields: t.fields.map((f) => `${f.field}:${f.title}`),
      html: t.html,
      css: t.css,
    };
  });
  expect(state.fields).toEqual(['f0:Name', 'f1:Title', 'f2:City']);
  // Bound in place: the SVG's own text nodes carry the ids; the markers are gone; the
  // artwork itself (the backplate the designer drew) survives verbatim.
  expect(state.html).toContain('<svg');
  expect(state.html).toMatch(/<text[^>]*id="f0"/);
  expect(state.html).toMatch(/<tspan[^>]*id="f2"/);
  expect(state.html).not.toContain('data-noacg-candidate');
  expect(state.html).toContain('<rect x="40" y="60" width="880" height="150" rx="10" fill="#10131a"');
  // The clock tspan kept its text and gained no id.
  expect(state.html).toContain('>22:40</tspan>');
  // Fonts: the bundled match ships as @font-face; the unresolved family is stated, not hidden.
  expect(state.css).toContain('fonts/archivo');
  expect(state.css).toContain('UNRESOLVED FONT');
  expect(state.css).toContain('Neue Machina');

  // The graphic actually renders the mapped values, and update() drives the SVG's own nodes.
  const frame = previewFrame(page);
  await expect(frame.locator('#f2')).toHaveText('Tampere');
  await page.getByTestId('dock-tab-data').click();
  await page.locator('.panel-body .field-row', { hasText: 'Name' }).locator('input').first().fill('Miriam Holm');
  await page.getByTestId('dock-body-right').getByRole('button', { name: '⟳ Update' }).click();
  await expect(frame.locator('#f0')).toHaveText('Miriam Holm');
});

test('svg import: overflow-only text fit — a long value condenses, a short one stays exact', async ({ page }) => {
  await dropSvg(page);
  await createProject(page);

  const frame = previewFrame(page);
  await expect(frame.locator('#f0')).toHaveText('Alexandra Riva');
  // The design's own text is untouched: no textLength was applied to anything that fits.
  await expect(frame.locator('#f0')).not.toHaveAttribute('textLength', /./);

  // A much longer name overflows the recorded width — the fit condenses it to EXACTLY the
  // designer's original run (textLength + spacingAndGlyphs), never by default.
  await page.getByTestId('dock-tab-data').click();
  const nameInput = page.locator('.panel-body .field-row', { hasText: 'Name' }).locator('input').first();
  const pushUpdate = () => page.getByTestId('dock-body-right').getByRole('button', { name: '⟳ Update' }).click();
  await nameInput.fill('Alexandra Konstantinopolous-Riva de la Vega');
  await pushUpdate();
  await expect(frame.locator('#f0')).toHaveAttribute('lengthAdjust', 'spacingAndGlyphs');

  // Back to a short value: the fit steps away and the typography is the designer's again.
  await nameInput.fill('Riva');
  await pushUpdate();
  await expect(frame.locator('#f0')).not.toHaveAttribute('textLength', /./);
});

test('svg import: sanitizer — script, handlers, foreignObject, SMIL and network refs never reach the template', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <script>alert('never')</script>
      <foreignObject x="0" y="0" width="100" height="100"><div>html</div></foreignObject>
      <rect x="0" y="0" width="400" height="200" fill="#111" onload="alert('never')"/>
      <image href="https://evil.example/logo.png" x="0" y="0" width="50" height="50"/>
      <text id="Headline" x="20" y="100" font-size="30" fill="#fff">Breaking
        <animate attributeName="opacity" values="0;1" dur="1s" repeatCount="indefinite"/>
      </text>
    </svg>`,
  );

  // The import says what it removed rather than silently altering the file.
  const card = page.getByTestId('import-svg-card');
  await expect(card).toContainText('Script code inside the SVG was removed');
  await expect(card).toContainText('foreignObject block was removed');
  await expect(card).toContainText('SVG-native (SMIL) animation was removed');
  await expect(card).toContainText('References to files on the internet were removed');

  await createProject(page);

  const verdict = await page.evaluate(async () => {
    const [{ useTemplateStore }, { validateTemplate }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/validation/validateTemplate.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    const v = validateTemplate(t);
    return { html: t.html, ok: v.ok, errors: v.errors.map((e) => e.rule) };
  });
  const svgMarkup = verdict.html.match(/<svg[\s\S]*?<\/svg>/i)![0];
  expect(svgMarkup).not.toContain('<script');
  expect(svgMarkup).not.toContain('foreignObject');
  expect(svgMarkup).not.toContain('onload');
  expect(svgMarkup).not.toContain('evil.example');
  expect(svgMarkup).not.toContain('<animate');
  // …and the export gate agrees (its own SVG checks re-verify what the importer stripped).
  expect(verdict.errors).toEqual([]);
  expect(verdict.ok).toBe(true);
});

test('svg import: outlined text gets the honest answer, and still imports as a fixed graphic', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <path d="M10 10 L390 10 L390 190 L10 190 Z" fill="#161a22"/>
      <path d="M40 90 l40 0 l0 30 l-40 0 Z" fill="#fff"/>
    </svg>`,
    'outlined.svg',
  );

  await expect(page.getByTestId('import-svg-nolayers')).toContainText('converted to');
  await page.locator('.wz-next').click();

  // The mapping step names the fix — re-export with real text — rather than a dead checklist.
  const honest = page.getByTestId('map-svg-outlined');
  await expect(honest).toContainText('no text layers');
  await expect(honest).toContainText('export it again');
  await expect(honest).toContainText('fixed graphic');

  // A fixed graphic is still a playable import.
  await createProject(page);
  const fields = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.fields.length;
  });
  expect(fields).toBe(0);
});

test('svg import: the f: layer-name prefix opts the file into an explicit field set', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="f_x3A_Name" x="20" y="80" font-size="30" fill="#fff">Alexandra Riva</text>
      <text id="Watermark" x="20" y="180" font-size="10" fill="#666">station ident</text>
    </svg>`,
    'prefixed.svg',
  );
  await page.locator('.wz-next').click();

  // One layer opted in by name, so only IT defaults on — the prefix is stripped from the
  // label; the unmarked watermark stays part of the artwork unless ticked.
  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Name');
  await expect(page.getByTestId('map-svg-row-t0').locator('input[type=checkbox]')).toBeChecked();
  await expect(page.getByTestId('map-svg-row-t1').locator('input[type=checkbox]')).not.toBeChecked();
});

test('svg import: the export door ships the bound SVG unchanged through the gate', async ({ page }) => {
  await dropSvg(page);
  // Straight to Finish (Next through mapping and animation — the defaults are the promise).
  await page.locator('.wz-next').click();
  await page.locator('.wz-next').click();
  await page.locator('.wz-next').click();

  // The read-back names the fields; the export door saves and opens the window over the wizard.
  await expect(page.locator('.wz-summary, .wz-step')).toContainText('4 editable text layers');
  await page.getByTestId('wz-finish-export').click();
  const win = page.getByTestId('export-window');
  await expect(win).toBeVisible();
  await expect(page.getByTestId('creation-wizard')).toBeVisible();
  await expect(win.locator('input[name="export-target"]')).toHaveCount(6);
  await expect(win.locator('.status-ok')).toContainText('valid and ready to export');

  // The SPX package carries the inline SVG — no asset-path question, single-file targets
  // stay single-file.
  const spxFiles = await page.evaluate(async () => {
    const [{ EXPORT_TARGETS }, { loadAllGraphics }] = await Promise.all([
      import('/src/export/registry.ts'),
      import('/src/model/library.ts'),
    ]);
    const spx = EXPORT_TARGETS.find((t) => t.id === 'spx')!;
    const graphic = loadAllGraphics()[0];
    const zip = await spx.build(graphic.template, { sampleData: {} });
    const html = await zip.files[Object.keys(zip.files).find((f) => f.endsWith('.html'))!].async('string');
    return { files: Object.keys(zip.files), svgInline: html.includes('<svg'), bound: /id="f0"/.test(html) };
  });
  expect(spxFiles.svgInline).toBe(true);
  expect(spxFiles.bound).toBe(true);
});
