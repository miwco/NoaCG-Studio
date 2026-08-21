import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { awaitPreviewRebuild } from './_preview';
import { elementPoint } from './_canvas';
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
  await expect(page.getByTestId('map-svg-highlight')).toBeVisible();
  await tick.check();
  await page.getByTestId('map-svg-outline-sample-o0').fill('Ada');

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
  // Both fit runtimes coexist: the SVG's own textLength fit and the placed line's shrink.
  expect(state.js).toContain('function fitSvgText');
  expect(state.js).toContain('function fitPlacedText');
  expect(state.js).toMatch(/typeof fitSvgText === 'function'\) fitSvgText\(\)/);
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
