import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { awaitPreviewRebuild } from './_preview';
import { elementPoint } from './_canvas';
import { settleDurableWrites } from './_durable';
import { previewFrame } from './_frame';
import { intoProduction, SCOREBUG_SVG } from './_svg-import';

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

  // Hovering a row highlights the exact text it binds — on the PREVIEW, the step's one canvas.
  await page.getByTestId('map-svg-row-t1').hover();
  await expect(page.getByTestId('wz-preview-highlight')).toBeVisible();

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

test('svg import: overflow-only text fit — a long value shrinks, a short one stays exact', async ({ page }) => {
  await dropSvg(page);
  await createProject(page);

  const frame = previewFrame(page);
  const name = frame.locator('#f0');
  await expect(name).toHaveText('Alexandra Riva');
  // The design's own text is untouched: nothing is applied to a value that fits.
  const drawnSize = await name.evaluate((el) => getComputedStyle(el).fontSize);

  // A much longer name overflows the budget — and the answer is a SMALLER line of the
  // designer's own type, never a squeezed one: condensing to the drawn width distorted
  // tracking and glyph shapes, so one extra letter visibly broke the typeface.
  await page.getByTestId('dock-tab-data').click();
  const nameInput = page.locator('.panel-body .field-row', { hasText: 'Name' }).locator('input').first();
  const pushUpdate = () => page.getByTestId('dock-body-right').getByRole('button', { name: '⟳ Update' }).click();
  await nameInput.fill('Alexandra Konstantinopolous-Riva de la Vega');
  await pushUpdate();
  const fitted = await name.evaluate((el) => {
    const node = el as unknown as SVGTextContentElement;
    return {
      size: parseFloat(getComputedStyle(node).fontSize),
      length: node.getComputedTextLength(),
      textLength: node.getAttribute('textLength'),
    };
  });
  expect(fitted.size).toBeLessThan(parseFloat(drawnSize));
  expect(fitted.textLength).toBeNull();
  // …and it fits THE ROOM THE DESIGN GIVES IT — the panel it was drawn in, not the width of the
  // designer's own words, which would leave most of a banner empty and shrink anyway.
  const room = await name.evaluate(
    () => (window as unknown as { svgFitRoom: Record<string, { width: number }> }).svgFitRoom.f0.width,
  );
  expect(fitted.length).toBeLessThanOrEqual(room + 1);

  // Back to a short value: the fit steps away and the typography is the designer's again.
  await nameInput.fill('Riva');
  await pushUpdate();
  await expect(name).toHaveCSS('font-size', drawnSize);
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

test('svg import: bound text and top-level groups are registry parts — selectable and animatable', async ({ page }) => {
  await dropSvg(page);
  await createProject(page);

  // The part registry (model/structure.ts) names the SVG's own layers: the bound text nodes
  // as lines (channel 'rise' — SVG text has no mask to slide in), and the top-level named
  // groups as blocks, labelled with the same words the mapping step used (data-name over the
  // decoded id — both "Text Layer" groups carry their duplicated design name honestly).
  const parts = await page.evaluate(async () => {
    const [{ getTemplateParts }, { useTemplateStore }] = await Promise.all([
      import('/src/model/structure.ts'),
      import('/src/store/templateStore.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    return getTemplateParts(t.html, t.fields).map((p) => `${p.selector}|${p.kind}|${p.label}|${p.channel}`);
  });
  expect(parts).toContain('#f0|line|Name|rise');
  expect(parts).toContain('#f2|line|Location|rise');
  expect(parts).toContain('#Backplate|block|Backplate|rise');
  expect(parts).toContain('#Details|block|Text Layer|rise');
  // The whole-unit parts are still there — the design presets animate the box, as before.
  expect(parts).toContain('.imported-design-box|panel|Design|rise');
  expect(parts).toContain('.imported-design-art|image|Artwork|rise');

  // A canvas click on the text selects THAT layer (the innermost part wins over the groups
  // and the artwork around it), and the chip speaks the field's name.
  const point = await elementPoint(page, '#f0');
  await page.mouse.click(point.x, point.y);
  await expect(page.getByTestId('selection-chip')).toContainText('Name');

  // Its timeline row exists too — per-layer motion (the P2 stagger) has a real target.
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toBeVisible();
});

test('svg import: a picture layer binds as a filelist field — swap by value, empty restores the artwork', async ({ page }) => {
  await dropSvg(page);
  await page.locator('.wz-next').click();

  // Pictures are offered OFF by default — inside a design they are usually the artwork.
  const row = page.getByTestId('map-svg-image-i0');
  await expect(page.getByTestId('map-svg-image-title-i0')).toHaveValue('Crest');
  await expect(row.locator('input[type=checkbox]')).not.toBeChecked();
  await row.locator('input[type=checkbox]').check();

  await createProject(page);

  // The picture field lands AFTER the text fields, as a real SPX filelist.
  const field = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    const f = t.fields[4];
    return { ...f, bound: /<image[^>]*id="f4"/.test(t.html) };
  });
  expect(field.ftype).toBe('filelist');
  expect(field.title).toBe('Crest');
  expect(field.bound).toBe(true);

  // update() swaps the node's href; an empty value restores the picture the designer drew.
  const frame = previewFrame(page);
  const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await frame.locator('body').evaluate((_, red) => {
    (window as unknown as { update: (d: string) => void }).update(JSON.stringify({ f4: red }));
  }, RED);
  await expect(frame.locator('#f4')).toHaveAttribute('href', RED);
  await frame.locator('body').evaluate(() => {
    (window as unknown as { update: (d: string) => void }).update(JSON.stringify({ f4: '' }));
  });
  await expect(frame.locator('#f4')).toHaveAttribute('href', /^data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/);
});

test('svg import: the f: layer-name prefix names a field without switching the others off', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="f_x3A_Name" x="20" y="80" font-size="30" fill="#fff">Alexandra Riva</text>
      <text id="Watermark" x="20" y="180" font-size="10" fill="#666">station ident</text>
    </svg>`,
    'prefixed.svg',
  );
  await page.locator('.wz-next').click();

  // The prefix names the field (it is stripped from the label) and guarantees it is on. It is
  // NOT a filter: one layer exported as `f:Name` used to turn every unmarked text OFF, which
  // read as detection having missed them — the owner's first walk found six of seven rows
  // unticked on a scorebug whose only marked layer was the competition strap. Unticking one
  // row costs a click; finding six that were never offered costs the feature.
  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Name');
  await expect(page.getByTestId('map-svg-row-t0').locator('input[type=checkbox]')).toBeChecked();
  await expect(page.getByTestId('map-svg-row-t1').locator('input[type=checkbox]')).toBeChecked();
});

test('svg import: an Inkscape file is labelled by its layer names, not its serial ids', async ({ page }) => {
  // Illustrator and Figma write the layer's NAME into `id`; Inkscape writes a serial number
  // there ("text123") and keeps the name in `inkscape:label`. Read the id first and every row
  // reads "text123" — the one word the designer chose, on the layer ABOVE, never surfaces.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 400 200">
      <g inkscape:groupmode="layer" id="layer1" inkscape:label="Presenter name">
        <text id="text123" x="20" y="80" font-size="30" fill="#fff"><tspan id="tspan124" x="20" y="80">Alexandra Riva</tspan></text>
      </g>
      <g inkscape:groupmode="layer" id="layer2" inkscape:label="Role">
        <text id="text125" x="20" y="140" font-size="18" fill="#b7bcc4">Chief Correspondent</text>
      </g>
    </svg>`,
    'inkscape.svg',
  );
  await page.locator('.wz-next').click();

  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Presenter name');
  await expect(page.getByTestId('map-svg-title-t1')).toHaveValue('Role');
});

test('svg import: text a designer switched off, or parked in a symbol, is never offered as a field', async ({ page }) => {
  // Two ways a file carries copy nobody can see: a HIDDEN layer (a draft the designer turned
  // off, exported as display:none) and a DEFINITION (<symbol>/<defs>, which paints only where
  // a <use> copies it — so binding the original by id is not a promise this import can keep).
  // Both used to arrive as operator fields for invisible text.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <defs><symbol id="Badge"><text id="In_x20_symbol" x="0" y="0">Never shown</text></symbol></defs>
      <g id="Old_x20_draft" style="display:none"><text id="Draft_x20_copy" x="20" y="40">Draft copy</text></g>
      <g id="Retired" display="none"><text id="Retired_x20_line" x="20" y="60">Retired line</text></g>
      <use href="#Badge" x="300" y="20"/>
      <text id="Headline" x="20" y="120" font-size="30" fill="#fff">Alexandra Riva</text>
    </svg>`,
    'hidden-layers.svg',
  );

  await expect(page.getByTestId('import-svg-layers')).toContainText('1 text layer');
  // The symbol's text is DRAWN by the <use> below it, so the file says why it is not a field —
  // silence there reads as a layer the import simply missed.
  await expect(page.getByTestId('import-svg-card')).toContainText('reusable symbol');
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Headline');
  await expect(page.getByTestId('map-svg-row-t1')).toHaveCount(0);
});

test('svg import: a kerned headline is ONE field, and two labels on one baseline are two', async ({ page }) => {
  // A <tspan> means two different things. Illustrator writes one per LINE for a multi-line
  // block, and one per KERNED RUN whenever the type carries tracking - several on one baseline.
  // The run reading turned this headline into three fields ("A" / "lexandra" / " Riva"); the
  // baseline reading merged the two placed labels below it into one. The gap tells them apart.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">
      <text id="Headline" font-size="48" fill="#fff"><tspan x="40" y="120">A</tspan><tspan x="78" y="120">lexandra</tspan><tspan x="240" y="120"> Riva</tspan></text>
      <text id="Footnote" font-size="18" fill="#b7bcc4"><tspan x="40" y="200">Helsinki</tspan><tspan x="300" y="200">Live</tspan></text>
    </svg>`,
    'kerned.svg',
  );

  await expect(page.getByTestId('import-svg-layers')).toContainText('3 text layers');
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('Alexandra Riva');
  await expect(page.getByTestId('map-svg-sample-t1')).toHaveValue('Helsinki');
  await expect(page.getByTestId('map-svg-sample-t2')).toHaveValue('Live');
  await expect(page.getByTestId('map-svg-row-t3')).toHaveCount(0);

  // AND THE MERGED FIELD KEEPS ITS PLACE. Illustrator put the position on the RUNS, so the
  // <text> this field binds had no x and no y of its own: the first write replaced the runs
  // and the headline snapped to the SVG origin, off the panel — a field that changed nothing
  // anybody could see. The run's position is hoisted onto the text at import.
  const headline = page.getByTestId('map-svg-stage').locator('[data-noacg-candidate="t0"]');
  await expect(headline).toHaveAttribute('x', '40');
  await expect(headline).toHaveAttribute('y', '120');
  // Judged where the reader judges it — in the preview, running the real update(). Measured
  // AGAINST THE FOOTNOTE drawn at the same x, so the entrance animation (which moves the whole
  // box) cancels out and what is left is the headline's own place inside the artwork.
  const offsetFromFootnote = async () => {
    const frame = page.frameLocator('.wz-side iframe');
    const [a, b] = await Promise.all([frame.locator('#f0').boundingBox(), frame.locator('#f1').boundingBox()]);
    return { x: a!.x - b!.x, y: a!.y - b!.y };
  };
  await expect(page.frameLocator('.wz-side iframe').locator('#f0')).toHaveText('Alexandra Riva');
  const drawnAt = await offsetFromFootnote();
  await page.getByTestId('map-svg-sample-t0').fill('Mika Virtanen');
  await expect(page.frameLocator('.wz-side iframe').locator('#f0')).toHaveText('Mika Virtanen');
  await expect.poll(async () => Math.abs((await offsetFromFootnote()).x - drawnAt.x)).toBeLessThan(1);
  // The baseline is the same; the box top can differ by a glyph's ascender between two words.
  expect(Math.abs((await offsetFromFootnote()).y - drawnAt.y)).toBeLessThan(4);
});

test('svg import: layer names that repeat are numbered, so no two fields read the same', async ({ page }) => {
  // A layer name is a designer's private note; it becomes an OPERATOR'S label. Three rows
  // reading "Name" is a control page nobody can use without clicking each one.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">
      <g id="Name"><text x="20" y="60" font-size="24" fill="#fff">Alexandra Riva</text></g>
      <g id="Name" data-name="Name"><text x="20" y="110" font-size="24" fill="#fff">Jonas Berg</text></g>
      <g id="Role"><text x="20" y="160" font-size="18" fill="#b7bcc4">Correspondent</text></g>
    </svg>`,
    'repeated-names.svg',
  );
  await page.locator('.wz-next').click();

  await expect(page.getByTestId('map-svg-title-t0')).toHaveValue('Name');
  await expect(page.getByTestId('map-svg-title-t1')).toHaveValue('Name 2');
  // A name that appears once is left exactly as the designer wrote it.
  await expect(page.getByTestId('map-svg-title-t2')).toHaveValue('Role');
});

test('svg import: text on a path binds the path run, and keeps its curve when an operator types', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <defs><path id="curve" d="M20 150 Q200 40 380 150"/></defs>
      <text id="Arc" font-size="24" fill="#fff"><textPath href="#curve">Around the bend</textPath></text>
    </svg>`,
    'text-on-path.svg',
  );
  await page.locator('.wz-next').click();
  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('Around the bend');
  await createProject(page);

  // The field id is on the <textPath>, not the <text>: update() writes textContent, and writing
  // it on the <text> would REPLACE the textPath element — the first typed word would straighten
  // the curve the designer drew. The check is the live document, after an update.
  const shape = await page.evaluate(async () => {
    const [{ useTemplateStore }, { validateTemplate }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/validation/validateTemplate.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    const doc = new DOMParser().parseFromString(t.html, 'text/html');
    const bound = doc.getElementById('f0');
    return {
      tag: bound?.tagName.toLowerCase() ?? null,
      href: bound?.getAttribute('href') ?? null,
      errors: validateTemplate(t).errors.map((e) => e.rule),
    };
  });
  expect(shape.tag).toBe('textpath');
  expect(shape.href).toBe('#curve');
  // …and the export gate reads that binding as bound (rule 'svg-binding' checks the id exists).
  expect(shape.errors).toEqual([]);
});

test('svg import: a wrapped source line becomes one clean sample, unless the file preserved it', async ({ page }) => {
  // A pretty-printed export wraps a long line across several SOURCE lines. The renderer
  // collapses that whitespace and nothing on screen shows it — but the raw text becomes the
  // FIELD'S DEFAULT VALUE, where a run of newlines and indentation is real.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Body" x="20" y="80" font-size="20" fill="#fff">
        Breaking news from
        the capital
      </text>
      <text id="Spaced" xml:space="preserve" x="20" y="140" font-size="20" fill="#fff">A   B</text>
    </svg>`,
    'wrapped-source.svg',
  );
  await page.locator('.wz-next').click();

  await expect(page.getByTestId('map-svg-sample-t0')).toHaveValue('Breaking news from the capital');
  // …and a file that asked for its spacing to be literal keeps it.
  await expect(page.getByTestId('map-svg-sample-t1')).toHaveValue('A   B');
});

test('svg import: a PostScript font name finds the bundled face, and ships under its own name', async ({ page }) => {
  // Illustrator writes PostScript names, so a file set in Archivo Bold asks for "Archivo-Bold".
  // Matched literally that finds nothing, and the graphic goes to air in a substitute face.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Name" x="20" y="90" font-size="34" font-family="Archivo-Bold" fill="#fff">Alexandra Riva</text>
      <text id="Role" x="20" y="140" font-size="20" font-family="JetBrainsMono-Regular" fill="#b7bcc4">Correspondent</text>
    </svg>`,
    'postscript-fonts.svg',
  );
  await page.locator('.wz-next').click();

  // Both rows resolve, and each says WHICH bundled face it is — the design never mentions
  // "Archivo" anywhere, so a bare tick would be a claim the reader cannot check.
  await expect(page.getByTestId('map-svg-font-ok-Archivo-Bold')).toContainText('(Archivo)');
  await expect(page.getByTestId('map-svg-font-ok-JetBrainsMono-Regular')).toContainText('(JetBrains Mono)');
  await expect(page.getByTestId('map-svg-font-warn-Archivo-Bold')).toHaveCount(0);

  await createProject(page);

  // The @font-face is declared under the name the ARTWORK asks for, over the bundled file: a
  // face declared as "Archivo" answers nothing in an SVG whose own CSS says "Archivo-Bold".
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).toContain('font-family: "Archivo-Bold"');
  expect(css).toContain('fonts/archivo.woff2');
  expect(css).toContain('font-family: "JetBrainsMono-Regular"');
  expect(css).not.toContain('UNRESOLVED');
});

test('svg import: the Google door is offered only for a family Google actually has', async ({ page }) => {
  // A licensed face is not on Google, so the button's only outcome there is an error — which
  // reads as the product being broken rather than as the font being private. The family list is
  // a local module, so the step can answer before anyone clicks.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Name" x="20" y="90" font-size="34" font-family="Gotham" fill="#fff">Alexandra Riva</text>
      <text id="Role" x="20" y="140" font-size="20" font-family="Lato" fill="#b7bcc4">Correspondent</text>
    </svg>`,
    'licensed-font.svg',
  );
  await page.locator('.wz-next').click();

  await expect(page.getByTestId('map-svg-font-nogoogle-Gotham')).toBeVisible();
  await expect(page.getByTestId('map-svg-font-google-Gotham')).toHaveCount(0);
  // Lato IS on Google, so its row keeps the door.
  await expect(page.getByTestId('map-svg-font-google-Lato')).toBeVisible();
});

test('svg import: the last screen before Create names a typeface that will not travel', async ({ page }) => {
  // The one way a pixel-exact import stops being pixel-exact is a family that ships with
  // nothing. It is never a blocker - the designer may know the playout machine has it - but it
  // was stated only on the mapping step, which "Next" walks straight past.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Name" x="20" y="90" font-size="34" font-family="Archivo" fill="#fff">Alexandra Riva</text>
      <text id="Role" x="20" y="140" font-size="20" font-family="Gotham-Book" fill="#b7bcc4">Correspondent</text>
    </svg>`,
    'one-missing-font.svg',
  );
  await page.locator('.wz-next').click();
  await page.locator('.wz-next').click();
  await page.locator('.wz-next').click();

  const summary = page.locator('.wz-finish-summary');
  await expect(summary).toContainText('Typefaces');
  await expect(summary).toContainText('1 embedded');
  await expect(summary).toContainText('Gotham-Book');
});

test('svg import: outline rows are ranked — a word of glyphs leads, an icon is badged artwork', async ({ page }) => {
  // "A group of paths" describes outlined copy AND every icon in the file, so a Figma export
  // can bury the one row that is the headline under a dozen crests. The measured shapes tell
  // them apart: a word is several glyphs standing on one baseline in a wide box.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">
      <g id="Crest" fill="#fff"><path d="M20 20h60v60H20z"/><path d="M35 35h30v30H35z"/></g>
      <g id="Headline" fill="#fff">
        <path d="M100 120 h20 v80 h-20 Z M100 120 h60 v18 h-60 Z"/>
        <path d="M180 120 h20 v80 h-20 Z"/>
        <path d="M240 120 h20 v80 h-20 Z M300 120 h20 v80 h-20 Z M220 120 l20 0 l60 80 l-20 0 Z"/>
        <path d="M360 120 h20 v80 h-20 Z M360 120 h60 v18 h-60 Z"/>
        <path d="M440 120 h20 v80 h-20 Z M440 182 h50 v18 h-50 Z"/>
      </g>
    </svg>`,
    'ranked-outlines.svg',
  );
  await page.locator('.wz-next').click();

  // The word's row leads, whatever the drawing order was.
  const rows = page.locator('[data-testid^="map-svg-outline-o"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toHaveAttribute('data-testid', 'map-svg-outline-o1');

  // The icon is still offered — a two-letter logotype really can be text — but it says what it
  // measured as, so the reader can skip it.
  await expect(page.getByTestId('map-svg-outline-artwork-o0')).toBeVisible();
  await expect(page.getByTestId('map-svg-outline-artwork-o1')).toHaveCount(0);
});

test('svg import: Inkscape flowed text is called out, since no browser draws it', async ({ page }) => {
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <flowRoot id="flowRoot10"><flowRegion><rect x="20" y="20" width="200" height="60"/></flowRegion><flowPara id="flowPara12">Paragraph copy</flowPara></flowRoot>
      <text id="Headline" x="20" y="120" font-size="30" fill="#fff">Alexandra Riva</text>
    </svg>`,
    'flowed.svg',
  );

  // The copy is already missing from the picture before we look at it, so the card says so and
  // names the fix rather than leaving a designer hunting for a lost paragraph.
  await expect(page.getByTestId('import-svg-card')).toContainText('flowed text');
  await expect(page.getByTestId('import-svg-card')).toContainText('Convert to Text');
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

test('svg import: outlined text — a glyph-shaped group becomes a placed live field over its own box', async ({ page }) => {
  // A file whose type was converted to outlines: a backplate group, one group of six glyph
  // shapes on a shared baseline (one with a descender) named "Name", and a two-path mark.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <g id="Backplate">
        <rect x="10" y="10" width="380" height="180" fill="#161a22"/>
        <rect x="10" y="10" width="6" height="180" fill="#f6a623"/>
      </g>
      <g id="Name">
        <path d="M60 80 h20 v40 h-20 Z" fill="#ffffff"/>
        <path d="M85 80 h20 v40 h-20 Z" fill="#ffffff"/>
        <path d="M110 80 h20 v40 h-20 Z" fill="#ffffff"/>
        <path d="M135 80 h20 v50 h-20 Z" fill="#ffffff"/>
        <path d="M160 80 h20 v40 h-20 Z" fill="#ffffff"/>
        <path d="M185 80 h20 v40 h-20 Z" fill="#ffffff"/>
      </g>
      <g id="Mark">
        <path d="M320 40 l30 0 l0 30 l-30 0 Z" fill="#f6a623"/>
        <path d="M330 50 l10 0 l0 10 l-10 0 Z" fill="#161a22"/>
      </g>
    </svg>`,
    'outlined-name.svg',
  );
  await page.locator('.wz-next').click();

  // The honest answer still stands — and now names the third road.
  await expect(page.getByTestId('map-svg-outlined')).toContainText('tick a group of shapes');
  // Every glyph-shaped group is offered, OFF, labelled from its layer name; the backplate's
  // rects are furniture, never letters, so it is not on the list.
  const rows = page.getByTestId('map-svg-outlines');
  await expect(rows).toContainText('0 of 2 replaced');
  await expect(page.getByTestId('map-svg-outline-title-o0')).toHaveValue('Name');
  await expect(page.getByTestId('map-svg-outline-title-o1')).toHaveValue('Mark');
  const tick = page.getByTestId('map-svg-outline-o0').locator('input[type=checkbox]');
  await expect(tick).not.toBeChecked();
  await expect(tick).toBeEnabled(); // measured on the step's own render
  await page.getByTestId('map-svg-outline-o0').hover();
  await expect(page.getByTestId('wz-preview-highlight')).toBeVisible();
  await tick.check();
  await page.getByTestId('map-svg-outline-sample-o0').fill('Ada');
  // Ticked, the shapes are hidden and the live stand-in wears the row's marker instead — so
  // exactly one node answers the hover, and it is the one that actually airs.
  await page.getByTestId('map-svg-outline-o0').hover();
  await expect(page.getByTestId('wz-preview-highlight')).toBeVisible();

  await createProject(page);

  const state = await page.evaluate(async () => {
    const [{ useTemplateStore }, { getTemplateParts }, { validateTemplate }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/model/structure.ts'),
      import('/src/validation/validateTemplate.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    return {
      fields: t.fields.map((f) => `${f.field}:${f.ftype}:${f.title}:${f.value}`),
      html: t.html,
      css: t.css,
      js: t.js,
      parts: getTemplateParts(t.html, t.fields).map((p) => `${p.selector}|${p.kind}`),
      valid: validateTemplate(t).ok,
    };
  });
  // One real placed field, through the raster flow's own transform: mask wrapper + span
  // in the design unit (AFTER the inlined svg, never inside it), shrink-fit by default.
  expect(state.fields).toEqual(['f0:textfield:Name:Ada']);
  const svgEnd = state.html.lastIndexOf('</svg>');
  expect(state.html.slice(svgEnd)).toMatch(/<div class="imported-design-mask" id="fw0"\s*>\s*<span id="f0" data-fit="shrink"\s*>\s*Ada\s*<\/span>/);
  expect(state.html.slice(0, svgEnd)).not.toContain('imported-design-mask');
  // The outlined group is hidden — in the file, not deleted — by the class + the one rule.
  expect(state.html).toMatch(/<g id="Name" class="imported-design-outlined"\s*>/);
  expect(state.css).toContain('.imported-design-outlined {\n  display: none;');
  // …and the field sits where the shapes were: their left edge, cap top a tenth of an em up,
  // sized from the measured cap height (40 design px / 0.72 ≈ 56), in the shapes' own fill.
  expect(state.css).toMatch(/#fw0 \{\n {2}position: absolute;\n {2}left: calc\(60px \* var\(--scale\)\);[^}]*top: calc\(74px \* var\(--scale\)\);/);
  expect(state.css).toMatch(/#f0 \{[^}]*font-size: calc\(56px \* var\(--scale\)\);[^}]*color: rgb\(255, 255, 255\);/);
  // ONE FIT (docs/SVG_IMPORT_PLAN.md §6b): the ladder measures the placed line too, so the
  // placed-text runtime is not emitted at all and update() calls one hook, not two.
  expect(state.js).toContain('function fitSvgText');
  expect(state.js).not.toContain('function fitPlacedText');
  expect(state.js).toMatch(/typeof fitSvgText === 'function'\) fitSvgText\(\)/);
  expect(state.js).not.toContain('typeof fitPlacedText');
  // A hidden group is not a layer: no registry part, no phantom timeline row. The mark is.
  expect(state.parts).not.toContain('#Name|block');
  expect(state.parts).toContain('#Mark|block');
  expect(state.parts).toContain('#f0|line');
  expect(state.valid).toBe(true);

  // On screen: the live text shows, the shapes it replaced do not.
  const frame = previewFrame(page);
  await expect(frame.locator('#f0')).toHaveText('Ada');
  await expect(frame.locator('#f0')).toBeVisible();
  await expect(frame.locator('#Name')).toBeHidden();
});

test('svg import: the layer stagger preset walks the artwork’s own top-level layers, as per-layer data', async ({ page }) => {
  await dropSvg(page);
  await page.locator('.wz-next').click();
  await page.locator('.wz-next').click();
  // Only the SVG variant offers it — its groups are the layers.
  await page.locator('.wz-anim', { hasText: 'Layer stagger' }).click();
  await createProject(page);

  const data = await page.evaluate(async () => {
    const [{ useTemplateStore }, { parseAnimData }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/blocks/animData.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    const d = parseAnimData(t.js)!;
    const at = (step: number, sel: string) => d.steps[step].layers[sel]?.opacity?.map((k) => k.time) ?? null;
    return {
      enter: { box: at(0, '.imported-design-box'), back: at(0, '#Backplate'), text: at(0, '#Text_x20_Layer'), details: at(0, '#Details') },
      out: { back: at(d.steps.length - 1, '#Backplate'), details: at(d.steps.length - 1, '#Details') },
    };
  });
  // Every named top-level group has its own track (the keyframe model has no stagger field,
  // so the stagger survives ONLY as per-layer offsets); they start a beat apart, in file
  // order on the way in and reversed on the way out.
  expect(data.enter.box).not.toBeNull();
  expect(data.enter.back![0]).toBeLessThan(data.enter.text![0]);
  expect(data.enter.text![0]).toBeLessThan(data.enter.details![0]);
  expect(data.out.details![0]).toBeLessThan(data.out.back![0]);
});

test('svg import: a clock-shaped layer can bind as a countdown — the node ticks, the operator sets minutes', async ({ page }) => {
  await dropSvg(page);
  await page.locator('.wz-next').click();

  // Only the clock-shaped layer ("22:40", t3) offers the choice; it starts as text.
  await expect(page.getByTestId('map-svg-kind-t0')).toHaveCount(0);
  const kind = page.getByTestId('map-svg-kind-t3');
  await expect(kind).toHaveValue('text');
  await kind.selectOption('countdown');

  await createProject(page);

  const state = await page.evaluate(async () => {
    const [{ useTemplateStore }, { parseAnimData }, { validateTemplate }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/blocks/animData.ts'),
      import('/src/validation/validateTemplate.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    const d = parseAnimData(t.js)!;
    return {
      field: t.fields[3],
      html: t.html,
      css: t.css,
      js: t.js,
      enterCalls: d.steps[0].calls?.map((c) => c.call) ?? [],
      outCalls: d.steps[d.steps.length - 1].calls?.map((c) => c.call) ?? [],
      valid: validateTemplate(t).ok,
    };
  });
  // The field is the count's LENGTH in minutes (the drawn "22:40" read as M:SS), held in a
  // hidden data source; the drawn layer is the display — class, not id, so update() can
  // never write "22.67" over the ticking readout.
  expect(state.field).toMatchObject({ field: 'f3', ftype: 'number', title: 'Text Layer (minutes)', value: '22.67' });
  expect(state.html).toMatch(/<div id="f3" class="noacg-data-source"\s*>\s*22\.67\s*<\/div>/);
  expect(state.html).toMatch(/<tspan[^>]*class="imported-design-clock"[^>]*>22:40<\/tspan>/);
  expect(state.html).not.toMatch(/<tspan[^>]*id="f3"/);
  expect(state.css).toContain('.noacg-data-source {');
  // The shared clock runtime rides outside the region, and the data calls it at the edges.
  expect(state.js).toContain('function startClock()');
  expect(state.enterCalls).toEqual(['startClock']);
  expect(state.outCalls).toEqual(['stopClock']);
  expect(state.valid).toBe(true);

  // Idle, the display shows the full length — the designer's own readout, round-tripped.
  const frame = previewFrame(page);
  await expect(frame.locator('.imported-design-clock')).toHaveText('22:40');
  // Playing starts the count: within a couple of seconds the readout has moved.
  await page.getByRole('button', { name: /^▶ Play$/ }).click();
  await expect(frame.locator('.imported-design-clock')).not.toHaveText('22:40', { timeout: 5_000 });
});

// ── THE MAPPING STEP'S HEIGHT BUDGET ──
// The step exists to answer one question — which text becomes an operator field — and the
// artwork above the checklist used to eat the whole scrollport on a short laptop window: the
// rows were real, ticked and working, and three graphics were imported without anybody
// noticing they were there. Geometry, not visibility: a row clipped away by a scrolling
// ancestor still reports `toBeVisible()`, which is exactly how it shipped.
//
// The artwork has since left the step entirely (plan §6a step 1 — the preview is the one
// canvas), so the budget got easier and the numbers below are re-measured, not inherited: the
// scorebug's seven rows all fit on a 768-tall window, six of seven on a 720-tall one. Three
// fitted before, at either size.
for (const [width, height, rowsExpected] of [[1366, 768, 7], [1280, 720, 6]] as const) {
  test(`svg import: the mapping step's checklist is on screen at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/app');
    await expect(page.locator('.wz-modal')).toBeVisible();
    await page.locator('[data-entry="import-graphic"]').click();
    await page.locator('.wz-drop input[type="file"]').setInputFiles(SCOREBUG_SVG);
    await expect(page.getByTestId('import-svg-card')).toBeVisible();
    await page.locator('.wz-modal').getByRole('button', { name: 'Next' }).click();
    await expect(page.getByTestId('map-svg-fields')).toBeVisible();

    const fold = await page.evaluate(() => {
      const port = document.querySelector('.wz-step')!.getBoundingClientRect();
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="map-svg-fields"] .map-svg-row'),
      ).map((r) => r.getBoundingClientRect());
      return {
        heading: document.querySelector('[data-testid="map-svg-fields"] h3')!.getBoundingClientRect().bottom,
        portBottom: port.bottom,
        firstRowBottom: rows[0].bottom,
        rowsOnScreen: rows.filter((r) => r.bottom <= port.bottom + 0.5).length,
        rowCount: rows.length,
      };
    });
    // The heading that says what the step is for, and the first row under it, are both in the
    // scrollport on arrival — nothing about the job is discovered by scrolling.
    expect(fold.heading).toBeLessThan(fold.portBottom);
    expect(fold.firstRowBottom).toBeLessThanOrEqual(fold.portBottom + 0.5);
    // With the artwork gone from the step, the checklist arrives whole (or all but its last
    // row on the shortest laptop) instead of the three rows the sticky band could afford.
    expect(fold.rowCount).toBe(7);
    expect(fold.rowsOnScreen).toBe(rowsExpected);

    // Every detected layer arrives ticked. The scorebug exports one layer as `f:Competition`,
    // which used to switch the other six off.
    const boxes = page.getByTestId('map-svg-fields').locator('input[type=checkbox]');
    expect(await boxes.count()).toBeGreaterThan(1);
    for (const box of await boxes.all()) await expect(box).toBeChecked();

    // THE ONE CANVAS. The step's own render of the markup is still there — measureOutline
    // needs the artwork laid out — but it is OFF SCREEN, and the preview is what the reader
    // judges the import on. Two canvases answering the same question differently is the
    // defect this step's road opens with (plan §6a step 1).
    // The frame arrives a debounce after the step does (WizardPreview commits its srcdoc at
    // 220 ms), so wait for it rather than reading a null out of the evaluate.
    await expect(page.locator('.wz-stage iframe')).toBeVisible();
    const canvases = await page.evaluate(() => {
      const port = document.querySelector('.wz-step')!.getBoundingClientRect();
      const inline = document.querySelector('[data-testid="map-svg-stage"]')!.getBoundingClientRect();
      const frame = document.querySelector('.wz-stage iframe')!.getBoundingClientRect();
      return {
        inlineOnScreen: inline.right > port.left && inline.left < port.right,
        inlineRendered: inline.width > 0 && inline.height > 0,
        previewArea: Math.round(frame.width * frame.height),
      };
    });
    expect(canvases.inlineOnScreen).toBe(false);
    expect(canvases.inlineRendered).toBe(true);
    // And the truthful canvas is no longer the small one: it used to be 260x146 beside a
    // 464x261 render that could not run the fit.
    expect(canvases.previewArea).toBeGreaterThan(464 * 261);
  });
}

test('svg import: the text-fit budget is the DRAWN text, whenever the first value arrives', async ({ page }) => {
  // The fit condenses an operator value that is wider than the text the designer drew. What
  // "the designer drew" means used to be "whatever was on screen the first time we measured",
  // and a playout renderer replays its control log the moment the page exists — so on air the
  // budget was often the OPERATOR'S value, which can never overflow itself. The same file then
  // squished in the editor and ran clean past the artwork on air. The drawn text is remembered
  // before update() can be called, and re-measured (not re-taken) when the real face lands.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300">
      <text id="Presenter" x="40" y="120" font-size="48" fill="#fff">Ada</text>
    </svg>`,
    'budget.svg',
  );
  await page.locator('.wz-next').click();
  await createProject(page);

  const frame = previewFrame(page);
  const fitted = await frame.locator('#f0').evaluate((el) => {
    const w = window as unknown as {
      update: (json: string) => void;
      refitSvgText: () => void;
      svgFitDrawn: Record<string, string>;
      svgFitWidths: Record<string, number>;
      svgFitRoom: Record<string, { width: number }>;
      svgFitSizes: Record<string, number>;
    };
    w.update(JSON.stringify({ f0: 'An extremely long presenter name' }));
    w.refitSvgText(); // what document.fonts.ready fires once the real face has loaded
    const node = el as unknown as SVGTextContentElement;
    return {
      drawn: w.svgFitDrawn.f0,
      budget: w.svgFitWidths.f0,
      room: w.svgFitRoom.f0.width,
      drawnSize: w.svgFitSizes.f0,
      size: parseFloat(getComputedStyle(node).fontSize),
      length: node.getComputedTextLength(),
    };
  });

  // The drawn text is still Ada's — three characters, nothing like the value now on screen — so
  // the long value is fitted against the design rather than against itself. With no shape drawn
  // behind this line there is no room to fill, so the drawn width IS the budget, and a value far
  // past it shrinks until the readability floor stops it.
  expect(fitted.drawn).toBe('Ada');
  expect(fitted.budget).toBeCloseTo(fitted.room, 1);
  expect(fitted.size).toBeLessThan(fitted.drawnSize);
  expect(fitted.size).toBeGreaterThanOrEqual(fitted.drawnSize * 0.55 - 0.1);
});

// ── THE FIT LADDER (owner-ruled 2026-08-23) ──────────────────────────────────────────────
// Fill the panel, then wrap inside the height the design already has, then shrink to the
// readability floor, then report it. The artwork is never reshaped to make copy fit.
//
// The fixture is shaped like the shipped lower third: a wide panel with a short name drawn into
// it, so the empty banner beside the name is the thing under test.
const LADDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect id="Panel" x="140" y="760" width="1040" height="190" rx="8" fill="#0d1017"/>
  <text id="Name" x="190" y="840" font-size="56" fill="#ffffff">Ada</text>
  <text id="Role" x="190" y="892" font-size="30" fill="#b7bcc4">Correspondent</text>
</svg>`;

test('svg import: a value fills the panel it was drawn in before any of it shrinks', async ({ page }) => {
  // The budget used to be the width of the text the DESIGNER typed, so a name drawn 3 characters
  // wide inside a 1040px banner began shrinking at its own fourth character while most of the
  // panel stood empty. The budget is the ROOM: out to a right margin mirroring the left one.
  await dropSvgMarkup(page, LADDER_SVG, 'ladder.svg');
  await page.locator('.wz-next').click();
  await createProject(page);

  const frame = previewFrame(page);
  const read = (value: string) =>
    frame.locator('#f0').evaluate((el, v) => {
      const w = window as unknown as {
        update: (json: string) => void;
        svgFitWidths: Record<string, number>;
        svgFitRoom: Record<string, { width: number; height: number }>;
        noacgTextOverflow: () => string[];
      };
      w.update(JSON.stringify({ f0: v }));
      const panel = document.getElementById('Panel')!.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      return {
        drawnBudget: w.svgFitWidths.f0,
        room: w.svgFitRoom.f0.width,
        size: parseFloat(getComputedStyle(el).fontSize),
        gapRight: panel.right - box.right,
        overflowing: w.noacgTextOverflow(),
      };
    }, value);

  const drawn = await read('Ada');
  // The room is the panel's, and it is far more than the three characters drawn into it.
  expect(drawn.room).toBeGreaterThan(drawn.drawnBudget * 2);

  // A value several times the drawn one still airs at FULL SIZE, because the banner holds it.
  const filling = await read('Alexandra Riva');
  expect(filling.size).toBe(drawn.size);
  expect(filling.overflowing).toEqual([]);

  // Past the room it shrinks - and having shrunk, it reaches the far margin instead of stopping
  // at the width of the designer's own three characters.
  const long = await read('Alexandra Konstantinopolous-Riva de la Vega y Santa Maria');
  expect(long.size).toBeLessThan(drawn.size);
  expect(long.gapRight).toBeLessThan(drawn.gapRight / 4);
});

test('svg import: copy too long for any size floors instead of vanishing, and says so', async ({ page }) => {
  // Unfloored, the shrink drove a 400-character value to 3.7px - which reads on air as the text
  // having disappeared. It stops at 55% of the drawn size, the same floor the raster import
  // keeps, and reports the field rather than clipping the copy or reshaping the artwork.
  await dropSvgMarkup(page, LADDER_SVG, 'ladder.svg');
  await page.locator('.wz-next').click();
  await createProject(page);

  const state = await previewFrame(page).locator('#f0').evaluate((el) => {
    const w = window as unknown as {
      update: (json: string) => void;
      svgFitSizes: Record<string, number>;
      noacgTextOverflow: () => string[];
    };
    w.update(JSON.stringify({ f0: 'A'.repeat(400) }));
    return {
      drawnSize: w.svgFitSizes.f0,
      size: parseFloat(getComputedStyle(el).fontSize),
      text: el.textContent,
      overflowing: w.noacgTextOverflow(),
    };
  });

  expect(state.size).toBeCloseTo(state.drawnSize * 0.55, 1);
  expect(state.text).toHaveLength(400); // the copy is whole - never trimmed to fit
  expect(state.overflowing).toEqual(['f0']);
});

// ── ONE FITTING SYSTEM (docs/SVG_IMPORT_PLAN.md §6b) ─────────────────────────────────────
// An imported SVG used to carry TWO fit runtimes: the ladder for the layers the designer drew,
// and the raster import's `fitPlacedText` for the HTML lines placed on the artwork afterwards -
// which had no room measurement, no height check and NO OVERFLOW REPORT. So the operator's
// too-long warning covered the drawn text and went silent on an outlined-text field, which is
// exactly the kind of field the road ahead adds more of.
//
// The fixture is the outlined export the fallback exists for: a backplate and one group of glyph
// shapes named "Name", which the mapping step replaces with a live field.
const OUTLINED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <g id="Backplate"><rect x="10" y="10" width="380" height="180" rx="8" fill="#161a22"/></g>
  <g id="Name">
    <path d="M60 80 h20 v40 h-20 Z" fill="#ffffff"/>
    <path d="M85 80 h20 v40 h-20 Z" fill="#ffffff"/>
    <path d="M110 80 h20 v40 h-20 Z" fill="#ffffff"/>
    <path d="M135 80 h20 v50 h-20 Z" fill="#ffffff"/>
    <path d="M160 80 h20 v40 h-20 Z" fill="#ffffff"/>
    <path d="M185 80 h20 v40 h-20 Z" fill="#ffffff"/>
  </g>
</svg>`;

/** Drop the outlined file and replace its one glyph group with a live field, sampled `sample`. */
async function replaceOutline(page: Page, sample: string) {
  await dropSvgMarkup(page, OUTLINED_SVG, 'outlined.svg');
  await page.locator('.wz-next').click();
  await page.getByTestId('map-svg-outline-o0').locator('input[type=checkbox]').check();
  await page.getByTestId('map-svg-outline-sample-o0').fill(sample);
}

test('svg import: an outlined-text field is measured by the SAME ladder, against its own slot', async ({ page }) => {
  await replaceOutline(page, 'Ada');
  await createProject(page);

  const frame = previewFrame(page);
  const read = (value: string) =>
    frame.locator('#f0').evaluate((el, v) => {
      const w = window as unknown as {
        update: (json: string) => void;
        svgFitWidths: Record<string, number>;
        svgFitRoom: Record<string, { width: number; height: number }>;
        svgFitSizes: Record<string, number>;
        noacgTextOverflow: () => string[];
      };
      w.update(JSON.stringify({ f0: v }));
      return {
        drawnWidth: w.svgFitWidths.f0,
        room: w.svgFitRoom.f0,
        drawnSize: w.svgFitSizes.f0,
        size: parseFloat(getComputedStyle(el).fontSize),
        text: el.textContent,
        overflowing: w.noacgTextOverflow(),
      };
    }, value);

  // THE ROOM RULE. The placed line has no shape behind it - the group it stands in for is
  // hidden - so its room is its own SLOT, the width measured from that group's box. It is not
  // the width of the sample typed into it, which is the defect the drawn lines were cured of.
  const drawn = await read('Ada');
  expect(drawn.room.width).toBeGreaterThan(drawn.drawnWidth);
  // A slot is a WIDTH: nothing under a placed line was drawn for it, so it never wraps.
  expect(drawn.room.height).toBe(0);
  expect(drawn.size).toBe(drawn.drawnSize);
  expect(drawn.overflowing).toEqual([]);

  // Past the slot it shrinks - and past the floor it is REPORTED, which is the half a placed
  // line never had. The copy stays whole: warned about, never cut.
  const long = await read('A'.repeat(400));
  expect(long.size).toBeCloseTo(long.drawnSize * 0.55, 1);
  expect(long.text).toHaveLength(400);
  expect(long.overflowing).toEqual(['f0']);
});

test('svg import: the operator is WARNED about an outlined-text field that cannot hold its copy', async ({ page }) => {
  // THE PROOF OF THE MERGE. The warning has always ridden `noacgTextOverflow()`, and every
  // surface where a value is typed reads it (docs/SVG_IMPORT_PLAN.md §3, "THE OVERFLOW
  // WARNING") - so a field whose fit could not report went silent on all five of them at once.
  // Measured on the cue editor because that is where the value is typed, and against the
  // PREVIEW monitor's own answer: only the rendered graphic can say whether copy fits, which is
  // why no source check stands in for this.
  await replaceOutline(page, 'Ada');
  await intoProduction(page, 'Outlined name', 'Warning Night');
  await settleDurableWrites(page);

  const name = page.getByTestId('cue-field-f0');
  const note = page.getByTestId('cue-overflow');

  // Quiet first, or "it warns" would also be true of a surface that always warns.
  await name.fill('Ada');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);

  await name.fill('A'.repeat(400));
  await expect(note).toContainText('too long for the design');
  await expect(note).toContainText('Name');
  await expect(page.getByTestId('cue-field-over-f0')).toBeVisible();

  // …and it tracks the value rather than latching on the cue.
  await name.fill('Ada');
  await expect(note).toHaveCount(0);
  await expect(page.getByTestId('cue-field-over-f0')).toHaveCount(0);
});

// ── ADD A FIELD WHERE THE FILE DREW NOTHING (docs/SVG_IMPORT_PLAN.md §6a step 3) ──────────
// The imported SVG is a fixed STAGE, not immutable artwork. The mapping step used to be a pure
// BINDING form, which assumes the file contains a layer for everything the show needs; it does
// not, and the answer is to draw the missing line ON the artwork rather than to send a reader
// who has never opened the editor into it.
//
// Full-frame on purpose: with the artwork covering the canvas, a fraction of the draw surface
// IS that fraction of the design, so the assertions below can say where the field landed.
const STAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect x="0" y="0" width="1920" height="1080" fill="#0d1017"/>
  <text id="Headline" x="160" y="300" font-size="72" fill="#ffffff">Tonight</text>
</svg>`;

/** Drag a box over the preview, in fractions of the canvas. */
async function drawField(page: Page, from: [number, number], to: [number, number]) {
  const surface = page.getByTestId('wz-preview-draw');
  const b = (await surface.boundingBox())!;
  await page.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps: 8 });
  await expect(page.getByTestId('wz-preview-marquee')).toBeVisible();
  await page.mouse.up();
}

test('svg import: a field drawn on the artwork becomes a real field, where it was drawn', async ({ page }) => {
  // THE ARMED STEP MUST NOT SPIN. The step re-reports its drop handler on every render, because
  // the closure reads the draft — so holding that FUNCTION in the wizard's state made each
  // report a state change, each a render, each a fresh identity, and React stopped the wizard
  // with "Maximum update depth exceeded" while the tool was armed. Every assertion below still
  // passed through it, which is exactly why the loop needs an assertion of its own.
  const loops: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Maximum update depth/.test(m.text())) loops.push(m.text());
  });
  page.on('pageerror', (e) => {
    if (/Maximum update depth/.test(e.message)) loops.push(e.message);
  });

  await dropSvgMarkup(page, STAGE_SVG, 'stage.svg');
  await page.locator('.wz-next').click();

  // Nothing is armed until the reader says so — the canvas is for reading the graphic, and a
  // stray drag on it must not mint a field.
  await expect(page.getByTestId('map-svg-added')).toContainText('nothing added');
  await expect(page.getByTestId('wz-preview-draw')).toHaveCount(0);

  await page.getByTestId('map-svg-add-field').click();
  await expect(page.getByTestId('wz-preview-draw')).toBeVisible();
  // From (25%, 50%) to (55%, 56%) of a 1920x1080 stage: x 480, y 540, 576 wide, ~65 tall.
  await drawField(page, [0.25, 0.5], [0.55, 0.56]);

  // One row, and the tool disarms itself: drawing a field is one gesture, not a mode the
  // reader has to remember to leave.
  // THE MESSAGE IS THE POINT. This assertion red-mained main for ~7h on 2026-08-24 (issue #40)
  // and then went green with no fix, because the only thing it could say was that some text was
  // missing. The marquee above proves the drag happened, so a failure HERE means the drop was
  // swallowed between mouseup and the row - which is one specific bug, worth naming.
  await expect(
    page.getByTestId('map-svg-added'),
    'the drag was made (the marquee showed) but no field arrived - the drop was swallowed',
  ).toContainText('1 added');
  await expect(page.getByTestId('wz-preview-draw')).toHaveCount(0);
  await page.locator('[data-testid^="map-svg-added-title-"]').fill('Subtitle');
  await page.locator('[data-testid^="map-svg-added-sample-"]').fill('Live from the studio');
  // Typing is what drove the loop hardest — every keystroke is a new draft and a new closure.
  expect(loops).toEqual([]);

  await createProject(page);

  const state = await page.evaluate(async () => {
    const [{ useTemplateStore }, { getTemplateParts }, { validateTemplate }] = await Promise.all([
      import('/src/store/templateStore.ts'),
      import('/src/model/structure.ts'),
      import('/src/validation/validateTemplate.ts'),
    ]);
    const t = useTemplateStore.getState().template;
    return {
      fields: t.fields.map((f) => `${f.field}:${f.ftype}:${f.title}:${f.value}`),
      html: t.html,
      css: t.css,
      js: t.js,
      parts: getTemplateParts(t.html, t.fields).map((p) => `${p.selector}|${p.kind}`),
      valid: validateTemplate(t).ok,
    };
  });

  // A REAL field, after the artwork's own bound layer — the drawn line is an ordinary placed
  // line, emitted AFTER `</svg>` like every other one, and it validates like any template.
  expect(state.fields).toEqual([
    'f0:textfield:Headline:Tonight',
    'f1:textfield:Subtitle:Live from the studio',
  ]);
  const svgEnd = state.html.lastIndexOf('</svg>');
  expect(state.html.slice(svgEnd)).toMatch(
    /<div class="imported-design-mask" id="fw1"\s*>\s*<span id="f1" data-fit="shrink"\s*>\s*Live from the studio\s*<\/span>/,
  );
  expect(state.parts).toContain('#f1|line');
  expect(state.valid).toBe(true);

  // …WHERE IT WAS DRAWN. The box is the type's own em box (line-height 1), so the numbers the
  // reader dragged are the numbers in the rule rather than a guess away from them.
  const left = Number(/#fw1 \{[^}]*left: calc\((\d+)px/.exec(state.css)![1]);
  const top = Number(/#fw1 \{[^}]*top: calc\((\d+)px/.exec(state.css)![1]);
  const maxWidth = Number(/#fw1 \{[^}]*max-width: calc\((\d+)px/.exec(state.css)![1]);
  const fontSize = Number(/#f1 \{[^}]*font-size: calc\((\d+)px/.exec(state.css)![1]);
  expect(Math.abs(left - 480)).toBeLessThan(14);
  expect(Math.abs(top - 540)).toBeLessThan(14);
  expect(Math.abs(maxWidth - 576)).toBeLessThan(20);
  expect(Math.abs(fontSize - 65)).toBeLessThan(14);

  // ONE FIT (plan §6b): the drawn field is a `shrink` line, so the LADDER measures it and the
  // operator's too-long warning can see it. A wrapping line would be the one field it cannot.
  expect(state.js).toContain('function fitSvgText');
  expect(state.js).not.toContain('function fitPlacedText');
  expect(state.css).toMatch(/#f1 \{[^}]*white-space: nowrap;/);

  const reported = await previewFrame(page).locator('#f1').evaluate((el) => {
    const w = window as unknown as {
      update: (json: string) => void;
      svgFitRoom: Record<string, { width: number; height: number }>;
      noacgTextOverflow: () => string[];
    };
    w.update(JSON.stringify({ f1: 'A'.repeat(400) }));
    return { room: w.svgFitRoom.f1, size: parseFloat(getComputedStyle(el).fontSize), over: w.noacgTextOverflow() };
  });
  // Its room is the slot it was DRAWN with, and it does not wrap — the room rule for a placed
  // line, now reached through a field nobody had drawn before.
  expect(reported.room.height).toBe(0);
  expect(reported.room.width).toBeGreaterThan(0);
  expect(reported.over).toEqual(['f1']);
});

// WHY THERE IS NO SPEC HERE FOR THE HELD DROP (WizardPreview's onDrawUp).
// A drop made before the artwork has reported its box used to be discarded silently, and is now
// HELD until there is a rect to place it in. That path is real - it is what red-mained main for
// ~7h on 2026-08-24 (issue #40) - but it is not reachable from a spec, and the attempt to write
// one was reverted rather than left in place reading like a guard:
//
//   - The unmeasured window opens when a rebuild clears the rect map and closes when the new
//     document reports one. Nothing a spec can do holds it open, and it is short enough that
//     `toHaveAttribute` sampled `data-measured` 18 times across 7s on CI without once seeing it.
//   - Even having caught it, the drag itself (down, move, up) outlives the window, so the mouseup
//     that does the discarding lands after the rect has arrived and the path is never exercised.
//     Asserting harder does not fix that; it only moves the flake somewhere less honest.
//
// It is verified by FAULT INJECTION instead, which is deterministic and costs one run: delay the
// `setRects` call in WizardPreview's CANVAS_RECTS_TYPE listener by a few seconds, and the test
// above fails at `toContainText` in exactly the shape CI produced - same assertion, same line,
// same column. `data-measured` on the draw surface exists for that procedure, and for anyone
// reading the DOM to work out why a drag seemed to do nothing. e2e/AGENTS.md carries the trap.
test('svg import: a drawn field can be renamed and removed, and cancelling draws nothing', async ({ page }) => {
  await dropSvgMarkup(page, STAGE_SVG, 'stage.svg');
  await page.locator('.wz-next').click();

  // Arming and then changing your mind leaves the artwork exactly as it was.
  await page.getByTestId('map-svg-add-field').click();
  await expect(page.getByTestId('wz-preview-draw')).toBeVisible();
  await page.getByTestId('map-svg-add-field').click();
  await expect(page.getByTestId('wz-preview-draw')).toHaveCount(0);
  await expect(page.getByTestId('map-svg-added')).toContainText('nothing added');

  await page.getByTestId('map-svg-add-field').click();
  await drawField(page, [0.2, 0.7], [0.5, 0.76]);
  await expect(page.getByTestId('map-svg-added')).toContainText('1 added');

  // A CLICK is a drag of no size. It reads as "put a field here", not as a two-pixel field
  // nobody could see or select.
  await page.getByTestId('map-svg-add-field').click();
  const surface = page.getByTestId('wz-preview-draw');
  const b = (await surface.boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByTestId('map-svg-added')).toContainText('2 added');

  // Removing one takes it off the artwork too — nothing about the file changed either way.
  const removes = page.locator('[data-testid^="map-svg-added-remove-"]');
  await expect(removes).toHaveCount(2);
  await removes.first().click();
  await expect(page.getByTestId('map-svg-added')).toContainText('1 added');

  await createProject(page);
  const fields = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.fields.map((f) => `${f.field}:${f.title}`);
  });
  // The clicked one survived, sized from the design rather than from the gesture — and it kept
  // the name it was given, which the next add would not have re-issued.
  expect(fields).toEqual(['f0:Headline', 'f1:Text 2']);
});

// ── VERTICAL GROWTH (docs/SVG_IMPORT_PLAN.md §6c) ────────────────────────────────────────
// A panel with room beneath it can get TALLER so a long value wraps into new height, instead of
// shrinking inside the height it was drawn at. The board below is drawn small on a tall frame,
// so the growth has somewhere to go and the caption underneath has to travel with it.
// The board is drawn for ONE line - tight enough that a second one does not fit inside the
// height the designer gave it, which is exactly when growing down is the answer.
const GROW_DOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect id="Board" x="300" y="200" width="1200" height="110" rx="8" fill="#0d1017"/>
  <text id="Question" x="340" y="260" font-size="44" fill="#ffffff">Which city?</text>
  <rect id="Footer" x="300" y="340" width="1200" height="60" rx="8" fill="#f6a623"/>
</svg>`;

test('svg import: a panel told to grow taller wraps into the new height instead of shrinking', async ({ page }) => {
  await dropSvgMarkup(page, GROW_DOWN_SVG, 'grow-down.svg');
  await page.locator('.wz-next').click();
  await page.getByTestId('map-svg-stretch-mode').selectOption('grow-y');
  await createProject(page);

  const frame = previewFrame(page);
  const run = (value: string) =>
    frame.locator('#f0').evaluate((el, v) => {
      (window as unknown as { update: (json: string) => void }).update(JSON.stringify({ f0: v }));
      const board = document.querySelector('rect[data-noacg-el="g0"]')!;
      const footer = document.getElementById('Footer')!;
      const art = document.querySelector('.imported-design-art')!.getBoundingClientRect();
      return {
        boardHeight: Math.round(parseFloat(board.getAttribute('height')!)),
        boardBottom: Math.round(board.getBoundingClientRect().bottom),
        footerTop: Math.round(footer.getBoundingClientRect().top),
        frameBottom: Math.round(art.bottom),
        frameHeight: art.height,
        size: parseFloat(getComputedStyle(el).fontSize),
        lines: el.children.length,
        over: (window as unknown as { noacgTextOverflow: () => string[] }).noacgTextOverflow(),
      };
    }, value);

  const rest = await run('Which city?');
  expect(rest.boardHeight).toBe(110);

  // A value the drawn board already holds does not move it - the design's own space first.
  const fits = await run('Which city hosted?');
  expect(fits.boardHeight).toBe(110);
  expect(fits.size).toBe(rest.size);

  // Past that, the board gets TALLER and the value WRAPS at full size. Shrinking is what this
  // rule exists to avoid: the type stays as drawn and the panel finds the room.
  const long = await run('Which city hosted the first modern Olympic Games of the modern era?');
  expect(long.boardHeight).toBeGreaterThan(rest.boardHeight);
  expect(long.lines).toBeGreaterThan(1);
  expect(long.size).toBe(rest.size);
  expect(long.over).toEqual([]);
  // …and the caption drawn below it travelled, keeping the gap the designer left.
  expect(long.footerTop - rest.footerTop).toBeCloseTo(long.boardBottom - rest.boardBottom, 0);

  // Growing off the frame is not a fit: the board stops at the safe margin and the rest of the
  // ladder answers what the cap could not give.
  const huge = await run('Which city hosted the first modern Olympic Games '.repeat(60));
  expect(huge.boardBottom).toBeLessThanOrEqual(huge.frameBottom - huge.frameHeight * 0.04 + 1);
  expect(huge.size).toBeLessThan(rest.size);

  // And a short value again puts the artwork back exactly as drawn.
  const back = await run('Which city?');
  expect(back.boardHeight).toBe(110);
  expect(back.footerTop).toBe(rest.footerTop);
});

test('svg import: growing downwards settles on ONE geometry, whatever order the values arrive in', async ({ page }) => {
  // THE OWNER'S ACCEPTANCE CRITERION (plan §6c). Wrap and grow are circular - the line count
  // depends on the size, the available height on the growth, the growth on the line count - and
  // the fit runs INSIDE the template, so the same values must settle on the same geometry in the
  // editor, in an exported package and under SPX. That is only true if the fit is a function of
  // the VALUE and the DESIGN, never of whatever the artwork happens to look like right now.
  //
  // Measured here as the two properties that make it so: running it twice changes nothing, and
  // the answer does not depend on what was on screen before.
  await dropSvgMarkup(page, GROW_DOWN_SVG, 'grow-down.svg');
  await page.locator('.wz-next').click();
  await page.getByTestId('map-svg-stretch-mode').selectOption('grow-y');
  await createProject(page);

  const LONG = 'Which city hosted the first modern Olympic Games of the modern era?';
  const geometry = async (values: string[]) =>
    previewFrame(page)
      .locator('#f0')
      .evaluate((el, vs) => {
        const w = window as unknown as {
          update: (json: string) => void;
          refitSvgText: () => void;
          noacgTextOverflow: () => string[];
        };
        for (const v of vs) w.update(JSON.stringify({ f0: v }));
        const read = () => ({
          board: Math.round(parseFloat(document.querySelector('rect[data-noacg-el="g0"]')!.getAttribute('height')!)),
          footer: Math.round(document.getElementById('Footer')!.getBoundingClientRect().top),
          size: Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100,
          lines: el.children.length,
          over: w.noacgTextOverflow().join(','),
        });
        const first = read();
        w.refitSvgText(); // the same pass the webfonts fire — running it twice must change nothing
        return { first, again: read() };
      }, values);

  // IDEMPOTENT: a second pass over a settled graphic moves nothing.
  const direct = await geometry([LONG]);
  expect(direct.again).toEqual(direct.first);
  expect(direct.first.lines).toBeGreaterThan(1);

  // ORDER-INDEPENDENT: the same value reached through a short one, a longer one, and an
  // enormous one settles on exactly the geometry it reaches directly. The trap the ladder
  // already paid for once is a budget taken from the first value that happened to arrive.
  const viaShort = await geometry(['Hi', LONG]);
  const viaHuge = await geometry(['Which city hosted the first modern Olympics '.repeat(12), LONG]);
  expect(viaShort.first).toEqual(direct.first);
  expect(viaHuge.first).toEqual(direct.first);
});

// ── THE CANVAS AS A CONTROL SURFACE (docs/SVG_IMPORT_PLAN.md §6a step 5) ─────────────────
// The checklist and the artwork are two views of one decision, and pointing at the thing itself
// is the view that needs no reading. The preview iframe carries no allow-same-origin, so nothing
// reaches in to ask what is under a pointer: every offered layer is TRACKED and the hit-test runs
// on the app side against the pushed rects.
//
// The fixture has one text layer, one rectangle a banner would grow, and a mark beyond it.
const PICK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect id="Banner" x="140" y="760" width="600" height="190" rx="8" fill="#0d1017"/>
  <text id="Name" x="190" y="860" font-size="56" fill="#ffffff">Ada</text>
</svg>`;

/**
 * Wait until the canvas can actually ANSWER a pointer.
 *
 * The preview commits its document on a debounce, and the rects only start arriving on the
 * document's own animation frame after it has been told what to track. A pointer that lands
 * before that first push finds nothing under it - and a mouse move is a one-shot, so the test
 * would sit there pointing at a canvas that had gone live a moment too late. Proving one layer
 * is pointable is proving the channel is live.
 */
async function awaitPickable(page: Page, at: [number, number]) {
  await expect(page.frameLocator('.wz-side iframe').locator('#f0')).toHaveText('Ada');
  const b = (await page.getByTestId('wz-preview-pick').boundingBox())!;
  await expect(async () => {
    await page.mouse.move(b.x + b.width * at[0], b.y + b.height * at[1]);
    await expect(page.getByTestId('wz-preview-highlight')).toBeVisible({ timeout: 400 });
  }).toPass({ timeout: 15_000 });
}

/** Click (or drag from) a point on the preview, in fractions of the canvas. */
async function pickOnCanvas(page: Page, at: [number, number], to?: [number, number]) {
  const surface = page.getByTestId('wz-preview-pick');
  const b = (await surface.boundingBox())!;
  await page.mouse.move(b.x + b.width * at[0], b.y + b.height * at[1]);
  await page.mouse.down();
  if (to) await page.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps: 8 });
  await page.mouse.up();
}

test('svg import: pointing at the artwork highlights the layer under the pointer', async ({ page }) => {
  await dropSvgMarkup(page, PICK_SVG, 'pick.svg');
  await page.locator('.wz-next').click();

  // The canvas is pointable as soon as the step opens - it is the step's one canvas, not a mode
  // to switch into. Over the name, the INNERMOST thing wins: the text sits on the banner, and a
  // reader pointing at it means the text, not the panel it happens to be drawn on.
  await expect(page.getByTestId('wz-preview-pick')).toBeVisible();
  await awaitPickable(page, [0.11, 0.79]);

  // …and empty artwork outlines nothing, so the box means "this layer" rather than "somewhere".
  const b = (await page.getByTestId('wz-preview-pick').boundingBox())!;
  await page.mouse.move(b.x + b.width * 0.05, b.y + b.height * 0.05);
  await expect(page.getByTestId('wz-preview-highlight')).toHaveCount(0);
});

test('svg import: clicking a text layer binds it, and clicking it again lets it go', async ({ page }) => {
  await dropSvgMarkup(page, PICK_SVG, 'pick.svg');
  await page.locator('.wz-next').click();

  // Every detected text layer arrives ON, so the first click is the one that turns it OFF -
  // which is the honest way round to test a toggle that starts ticked.
  const tick = page.getByTestId('map-svg-row-t0').locator('input[type=checkbox]');
  await expect(tick).toBeChecked();
  await expect(page.getByTestId('map-svg-fields')).toContainText('1 of 1');
  await awaitPickable(page, [0.11, 0.79]);

  await pickOnCanvas(page, [0.11, 0.79]);
  await expect(tick).not.toBeChecked();
  await expect(page.getByTestId('map-svg-fields')).toContainText('0 of 1');

  // …and back again, so the canvas is the same control as the checkbox rather than a one-way door.
  await pickOnCanvas(page, [0.11, 0.79]);
  await expect(tick).toBeChecked();
});

test('svg import: dragging a rectangle makes it the growing panel, and says which way', async ({ page }) => {
  await dropSvgMarkup(page, PICK_SVG, 'pick.svg');
  await page.locator('.wz-next').click();

  const mode = page.getByTestId('map-svg-stretch-mode');
  await expect(mode).toHaveValue('shrink');
  await awaitPickable(page, [0.11, 0.79]);

  // A drag ACROSS the banner says "grow this one, sideways" in one gesture - the relationship
  // stops being dropdown-authored, which is the whole of step 5.
  await pickOnCanvas(page, [0.25, 0.85], [0.36, 0.85]);
  await expect(mode).toHaveValue('grow-x');
  await expect(page.getByTestId('map-svg-stretch-shape')).toHaveValue('s0');

  // A drag DOWN the same rectangle changes the direction without touching the picker.
  await pickOnCanvas(page, [0.25, 0.80], [0.25, 0.93]);
  await expect(mode).toHaveValue('grow-y');
  await expect(page.getByTestId('map-svg-stretch-shape')).toHaveValue('s0');

  // Clicking the panel that is already growing, with no direction, turns it off again: the
  // gesture is its own undo, so nothing here is a one-way door either.
  await pickOnCanvas(page, [0.25, 0.85]);
  await expect(mode).toHaveValue('shrink');
});

// ── FOLLOWERS ARE DECLARED, GEOMETRY ONLY PROPOSES (docs/SVG_IMPORT_PLAN.md §6c) ──────────
// Sideways, "anything drawn past the growing edge" is a fair guess. Downwards it is not: below a
// panel sit things that should move, things that should stretch, and things pinned to the frame
// that must stay, and no measurement separates them. So the guess is SHOWN and the author edits
// it - and the moment they do, the whole set becomes theirs and is emitted as data.
//
// The board grows down; the caption below it should travel and the footer pinned to the frame
// bottom should not - which is exactly the distinction geometry cannot make.
const FOLLOWERS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <rect id="Board" x="300" y="200" width="1200" height="110" rx="8" fill="#0d1017"/>
  <text id="Question" x="340" y="260" font-size="44" fill="#ffffff">Which city?</text>
  <rect id="Caption" x="300" y="340" width="1200" height="60" rx="8" fill="#f6a623"/>
  <rect id="Strap" x="0" y="1000" width="1000" height="60" fill="#20242c"/>
</svg>`;
// Shape ids are ranked WIDEST FIRST, not by document order: s0 Board (1200), s1 Caption (1200,
// tied and second in the file), s2 Strap (1000).

test('svg import: the followers of a growing panel are proposed, then become the author’s own', async ({ page }) => {
  await dropSvgMarkup(page, FOLLOWERS_SVG, 'followers.svg');
  await page.locator('.wz-next').click();

  // Nothing is proposed until something grows - a follower list for a fixed graphic would be a
  // control with no effect.
  await expect(page.getByTestId('map-svg-followers')).toHaveCount(0);
  await page.getByTestId('map-svg-stretch-mode').selectOption('grow-y');
  await page.getByTestId('map-svg-stretch-shape').selectOption('s0');

  // THE PROPOSAL, measured off the artwork: everything drawn below the board. It says so - the
  // reader must be able to tell a guess from their own answer.
  const list = page.getByTestId('map-svg-followers');
  await expect(list).toContainText('proposed');
  await expect(page.getByTestId('map-svg-follower-s1')).toBeVisible(); // the caption
  await expect(page.getByTestId('map-svg-follower-s2')).toBeVisible(); // the frame-bottom strap

  // …and the strap is exactly the thing geometry got wrong: it is pinned to the frame, so the
  // author drops it. That first edit MATERIALIZES the set, and the list stops calling itself a
  // proposal.
  await page.getByTestId('map-svg-follower-drop-s2').click();
  await expect(page.getByTestId('map-svg-follower-s2')).toHaveCount(0);
  await expect(list).not.toContainText('proposed');
  await page.getByTestId('map-svg-follower-mode-s1').selectOption('grow');

  await createProject(page);

  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  // WHAT THE READER SAW IS WHAT SHIPPED: one rule, growing down, with exactly the follower they
  // kept and the behaviour they chose - and the strap is nowhere in the table.
  const table = /var NOACG_LAYOUT = \{[\s\S]*?\n\};/.exec(js)![0];
  expect(table).toContain('version: 1');
  expect(table).toContain("axis: 'y'");
  expect(table).toMatch(/followers: \[\{ el: 'g0f0', mode: 'grow' \}\]/);
  // One follower, not two - the dropped strap left no row behind.
  expect(table.match(/mode: '/g)).toHaveLength(1);
});

test('svg import: picking WHICH panel grows does not quietly change which WAY', async ({ page }) => {
  // A real defect, found by the test above rather than by reading the code: the panel picker
  // rebuilt the whole answer as a fresh object, so choosing a panel dropped the direction the
  // reader had just chosen and sent a "grows taller" graphic back to growing sideways - with
  // nothing on screen to say it had happened. Two controls, one of them silently resetting the
  // other, is the kind of thing only a walk catches.
  await dropSvgMarkup(page, FOLLOWERS_SVG, 'followers.svg');
  await page.locator('.wz-next').click();

  const mode = page.getByTestId('map-svg-stretch-mode');
  await mode.selectOption('grow-y');
  await expect(page.getByTestId('map-svg-stretch')).toContainText('the panel gets taller');

  // Pick a DIFFERENT panel, then the original one back. Neither may touch the direction.
  await page.getByTestId('map-svg-stretch-shape').selectOption('s1');
  await expect(mode).toHaveValue('grow-y');
  await page.getByTestId('map-svg-stretch-shape').selectOption('s0');
  await expect(mode).toHaveValue('grow-y');
  await expect(page.getByTestId('map-svg-stretch')).toContainText('the panel gets taller');

  // …and the follower set goes back to being a PROPOSAL, because the one that was there was
  // measured against a different element and would be stale rows about the wrong panel.
  await expect(page.getByTestId('map-svg-followers')).toContainText('proposed');
});

test('svg import: an untouched proposal is left to the runtime, not frozen into the graphic', async ({ page }) => {
  // A reader who never opens the follower list has expressed no opinion, so the graphic ships
  // WITHOUT a follower table and the runtime derives the set the way the hug always has. Writing
  // the proposal down instead would freeze a design-time guess into every future playout.
  await dropSvgMarkup(page, FOLLOWERS_SVG, 'followers.svg');
  await page.locator('.wz-next').click();
  await page.getByTestId('map-svg-stretch-mode').selectOption('grow-x');
  await createProject(page);

  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  const table = /var NOACG_LAYOUT = \{[\s\S]*?\n\};/.exec(js)![0];
  expect(table).toContain("axis: 'x'");
  expect(table).not.toContain('followers:');
  // …and the comment above the row says which of the two it is, in the file the user can read.
  expect(table).toContain('drawn past its moving edge travels with it');
});

test('svg import: a value wraps inside the height the design drew, and never past it', async ({ page }) => {
  // Wrapping is allowed only into room the artwork already has: the panel's own height, down to
  // whatever is drawn below the line. How many lines that is depends on the SIZE - a 190px panel
  // holds one 56px line and three 30px ones - so the ladder re-asks as it shrinks.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
      <rect id="Board" x="360" y="240" width="1200" height="300" rx="8" fill="#0d1017"/>
      <text id="Question" x="404" y="312" font-size="44" fill="#ffffff">Which city?</text>
    </svg>`,
    'wrap.svg',
  );
  await page.locator('.wz-next').click();
  await createProject(page);

  const wrapped = await previewFrame(page).locator('#f0').evaluate((el) => {
    const w = window as unknown as { update: (json: string) => void; svgFitSizes: Record<string, number> };
    w.update(
      JSON.stringify({
        f0: 'Which Finnish city hosted the Summer Olympic Games in the year nineteen fifty two, and which country topped the medal table',
      }),
    );
    const board = document.getElementById('Board')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return {
      lines: el.children.length,
      texts: Array.from(el.children).map((c) => c.textContent ?? ''),
      insideBoard: box.bottom <= board.bottom + 0.5,
      size: parseFloat(getComputedStyle(el).fontSize),
      drawnSize: w.svgFitSizes.f0,
    };
  });

  // More than one line, every line carrying words, and the whole block still inside the shape
  // it was drawn in - the artwork does not grow to hold the copy.
  expect(wrapped.lines).toBeGreaterThan(1);
  expect(wrapped.texts.every((t) => t.trim().length > 0)).toBe(true);
  expect(wrapped.insideBoard).toBe(true);
  // And it wrapped rather than shrinking all the way: bigger than the floor it would have hit.
  expect(wrapped.size).toBeGreaterThan(wrapped.drawnSize * 0.55);
});

test('svg import: a line with another drawn right below it stays on one line', async ({ page }) => {
  // The room is measured, not assumed: the name in a two-line strap has the role directly under
  // it, so there is nowhere to wrap into and it shrinks instead. Wrapping there would print the
  // second line straight through somebody else's layer.
  await dropSvgMarkup(page, LADDER_SVG, 'ladder.svg');
  await page.locator('.wz-next').click();
  await createProject(page);

  const state = await previewFrame(page).locator('#f0').evaluate((el) => {
    const w = window as unknown as { update: (json: string) => void };
    w.update(JSON.stringify({ f0: 'Alexandra Konstantinopolous-Riva de la Vega y Santa Maria del Mar' }));
    const role = document.getElementById('f1')!.getBoundingClientRect();
    return { lines: el.children.length, bottom: el.getBoundingClientRect().bottom, roleTop: role.top };
  });

  // No tspans: one plain line, and it stays clear of the layer below. A second line would have
  // printed straight through the role - which is the artwork being rewritten to fit copy.
  expect(state.lines).toBe(0);
  expect(state.bottom).toBeLessThanOrEqual(state.roleTop + 0.5);
});

// THE HUG (docs/SVG_IMPORT_PLAN.md §3): a lower third's banner is as wide as the name on it.
// Fixed is the default and the board's behaviour; growing is a per-graphic answer the mapping
// step asks for, because no geometry separates the two — the shipped lower third is drawn on a
// full-frame artboard and the shipped scorebug is a small floating object.
const HUG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <g id="Panel">
    <rect x="140" y="760" width="600" height="190" rx="8" fill="#0d1017"/>
    <rect x="140" y="760" width="10" height="190" fill="#f6a623"/>
  </g>
  <text id="Name" x="190" y="860" font-size="56" fill="#ffffff">Ada</text>
  <rect id="Logo" x="800" y="780" width="90" height="90" fill="#ffffff"/>
</svg>`;

test('svg import: the panel hug is offered, off, with the widest rectangle proposed', async ({ page }) => {
  await dropSvgMarkup(page, HUG_SVG, 'hug.svg');
  await page.locator('.wz-next').click();

  const mode = page.getByTestId('map-svg-stretch-mode');
  await expect(mode).toHaveValue('shrink');
  // Nothing to pick until the answer is "grow" — a shape picker for a graphic that never
  // resizes is a control with no effect.
  await expect(page.getByTestId('map-svg-stretch-shape')).toHaveCount(0);

  await mode.selectOption('grow-x');
  const shape = page.getByTestId('map-svg-stretch-shape');
  // Widest first, and it is the proposal: a banner's background is the widest rectangle on it.
  await expect(shape.locator('option')).toHaveText([
    'Panel — 600 × 190',
    'Logo — 90 × 90',
    'Panel — 10 × 190',
  ]);
  await expect(shape).toHaveValue('s0');
});

test('svg import: a hugging panel grows with its text, and what is beyond it travels', async ({ page }) => {
  await dropSvgMarkup(page, HUG_SVG, 'hug.svg');
  await page.locator('.wz-next').click();
  await page.getByTestId('map-svg-stretch-mode').selectOption('grow-x');
  await createProject(page);

  const frame = previewFrame(page);
  // ONE stamp per participant is the whole markup edit; the emitted NOACG_LAYOUT table says
  // what each stamp does, and the runtime loops that table (docs/SVG_IMPORT_PLAN.md §6c).
  await expect(frame.locator('rect[data-noacg-el="g0"]')).toHaveAttribute('width', '600');

  const run = (value: string) =>
    frame.locator('#f0').evaluate((el, v) => {
      (window as unknown as { update: (json: string) => void }).update(JSON.stringify({ f0: v }));
      const panel = document.querySelector('rect[data-noacg-el="g0"]')!;
      const logo = document.getElementById('Logo')!;
      return {
        panelWidth: Math.round(parseFloat(panel.getAttribute('width')!)),
        logoLeft: Math.round(logo.getBoundingClientRect().left),
        panelRight: Math.round(panel.getBoundingClientRect().right),
        frameRight: Math.round(document.querySelector('.imported-design-art')!.getBoundingClientRect().right),
        frameWidth: document.querySelector('.imported-design-art')!.getBoundingClientRect().width,
        size: parseFloat(getComputedStyle(el).fontSize),
        lines: el.children.length,
      };
    }, value);

  const rest = await run('Ada');
  expect(rest.panelWidth).toBe(600);

  // A value the panel can already hold does NOT grow it: the design's own space is spent first,
  // which is what stops a banner from widening at the fourth character of a three-letter name.
  const fits = await run('Alexandra');
  expect(fits.panelWidth).toBe(600);
  expect(fits.size).toBe(rest.size);

  // Past that room the panel widens instead of shrinking the type — the whole point of the hug —
  // and the logo drawn past the panel's right edge travels with it, keeping the gap as drawn.
  const longer = await run('Alexandra Konstantinopolous-Riva');
  expect(longer.panelWidth).toBeGreaterThan(rest.panelWidth);
  expect(longer.size).toBe(rest.size);
  expect(longer.logoLeft - rest.logoLeft).toBeGreaterThan(0);
  expect(longer.logoLeft - rest.logoLeft).toBeCloseTo(longer.panelRight - rest.panelRight, 0);

  // A name nothing could hold: the panel stops at the frame's safe margin, and what the cap
  // could not give is answered by the rest of the ladder - this panel has clear room below the
  // line, so the value wraps into it rather than shrinking. Growing off the screen is not a fit.
  const huge = await run('Alexandra Konstantinopolous-Riva de la Vega y Santa Maria del Mar y Consuelo de la Santisima Trinidad');
  expect(huge.panelRight).toBeLessThanOrEqual(huge.frameRight - huge.frameWidth * 0.04 + 1);
  expect(huge.lines > 1 || huge.size < rest.size).toBe(true);

  // And a short value again puts the artwork back exactly as drawn.
  const back = await run('Ada');
  expect(back.panelWidth).toBe(600);
  expect(back.logoLeft).toBe(rest.logoLeft);
  expect(back.size).toBe(rest.size);
});

test('svg import: retyping a sample repaints the PREVIEW, not a second canvas', async ({ page }) => {
  // A real value has to be tryable on this step — it is where lengths are decided — and the
  // canvas that answers is the PREVIEW, because it is the only one running the emitted fit
  // (plan §6a step 1). The step's own render of the markup stays off screen and stays exactly
  // as the designer drew it: it exists for measureOutline, and a second painted canvas is what
  // was showing values as clipped that the ladder had already made fit.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Presenter" x="20" y="80" font-size="30" fill="#fff">Alexandra Riva</text>
    </svg>`,
    'repaint.svg',
  );
  await page.locator('.wz-next').click();

  const drawn = page.getByTestId('map-svg-stage').locator('[data-noacg-candidate="t0"]');
  const live = page.frameLocator('.wz-side iframe').locator('#f0');
  await expect(drawn).toHaveText('Alexandra Riva');
  await expect(live).toHaveText('Alexandra Riva');

  await page.getByTestId('map-svg-sample-t0').fill('Zephyrine');
  await expect(live).toHaveText('Zephyrine');
  await expect(drawn).toHaveText('Alexandra Riva');

  // Switched off, the layer is not a field any more and the graphic keeps the drawn text.
  await page.getByTestId('map-svg-row-t0').locator('input[type=checkbox]').uncheck();
  await expect(page.frameLocator('.wz-side iframe').locator('[data-noacg-candidate="t0"]')).toHaveText(
    'Alexandra Riva',
  );
  await expect(drawn).toHaveText('Alexandra Riva');
});

test('svg import: hovering a checklist row highlights that layer in the preview', async ({ page }) => {
  // "Which layer is this" is the only question the step really has to answer, and it is now
  // answered on the one canvas (plan §6a step 1): the preview keeps the import-time candidate
  // markers, composeDocument's canvasControl channel pushes the tracked layer's rect every
  // frame, and the highlight rides a layer wearing the frame's own transform. Nothing reaches
  // into the iframe — it carries no allow-same-origin, like every other preview surface.
  await dropSvgMarkup(
    page,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
      <text id="Home" x="20" y="60" font-size="30" fill="#fff">Rovers</text>
      <text id="Away" x="20" y="150" font-size="30" fill="#fff">City</text>
    </svg>`,
    'hover.svg',
  );
  await page.locator('.wz-next').click();
  await expect(page.frameLocator('.wz-side iframe').locator('#f1')).toHaveText('City');

  const highlight = page.getByTestId('wz-preview-highlight');
  await expect(highlight).toHaveCount(0);

  // The lower layer: the box lands over it, not over the one above.
  await page.getByTestId('map-svg-row-t1').hover();
  await expect(highlight).toBeVisible();
  const over = async (fieldId: string) => {
    const [hl, target] = await Promise.all([
      highlight.boundingBox(),
      page.frameLocator('.wz-side iframe').locator(fieldId).boundingBox(),
    ]);
    if (!hl || !target) return false;
    const cx = target.x + target.width / 2;
    const cy = target.y + target.height / 2;
    return cx > hl.x && cx < hl.x + hl.width && cy > hl.y && cy < hl.y + hl.height;
  };
  expect(await over('#f1')).toBe(true);
  expect(await over('#f0')).toBe(false);

  // And it follows the hover to the other row rather than staying where it was.
  await page.getByTestId('map-svg-row-t0').hover();
  await expect.poll(() => over('#f0')).toBe(true);
  expect(await over('#f1')).toBe(false);

  // Off the list, nothing is lit.
  await page.getByTestId('map-svg-fields').locator('h3').hover();
  await expect(highlight).toHaveCount(0);
});
