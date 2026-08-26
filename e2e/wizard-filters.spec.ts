import { test, expect, type Page } from '@playwright/test';
import { enableAdvancedMode, finishIntoEditor, startNewProject } from './_create';
import { chooseCategory, chooseType, pickDesign, resultTotal, revealDesign, shownCount } from './_browse';

// The Browse step's faceted discovery (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §12-13, groups
// §4c): ONE category-group dropdown (+ the selected group's member-category chips) + field
// buckets + style chips narrow the result (facets AND together), programme selection RANKS
// into "Best for" / "Also works" without hiding anything, search reaches templates through
// aliases, and the zero-result state offers its own escape hatches.
// Counts derive from the live metadata so the assertions track catalog growth; the
// RELATIONSHIPS are what this spec guards, never absolute totals.
//
// WHAT CHANGED WITH re-design/handoff.md §2b, and why the assertions moved: the step renders
// a PAGE (12, plus "Show 12 more"), so counting `.wz-variant` cards no longer measures what a
// facet did - it measures the page size, and would read 12 for every filter leaving twelve or
// more. Every facet assertion is now against the step's own "Showing 12 of 82" line, which is
// both the honest number and the one a user actually reads. The paging itself is covered in
// its own test below, so the rest can stop caring how many cards are on screen.

async function toBrowseStep(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await expect(page.locator('.wz-browse-search')).toBeVisible();
}

async function catalogCounts(page: Page) {
  return page.evaluate(async () => {
    const { allTemplateMeta } = await import('/src/templates/templateMeta.ts');
    const all = allTemplateMeta().map(({ meta }) => meta);
    const lt = all.filter((m) => m.category === 'lower-third');
    return {
      total: all.length,
      lowerThirds: lt.length,
      ltGlass: lt.filter((m) => m.styleFamily === 'glass').length,
      ltGlassLogo: lt.filter((m) => m.styleFamily === 'glass' && m.capabilities.includes('logo-upload')).length,
      repeating: all.filter((m) => m.fieldCounts.repeating > 0).length,
    };
  });
}

test('the step shows a first page and grows it a press at a time', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  const cards = page.locator('.wz-variant');

  // A PAGE, not the catalog. The whole result is still reported - the reader is never left
  // guessing how much a filter left - but only the page is rendered.
  const page1 = await shownCount(page);
  expect(page1).toBeLessThan(n.total);
  await expect(cards).toHaveCount(page1);
  expect(await resultTotal(page)).toBe(n.total);

  // One press adds one page, and the button names how many it will add rather than saying
  // "more" - so the count line and the button agree before and after.
  const more = page.getByTestId('wz-browse-more');
  await expect(more).toHaveText(`Show ${page1} more`);
  await more.click();
  await expect(cards).toHaveCount(page1 * 2);
  expect(await shownCount(page)).toBe(page1 * 2);
  expect(await resultTotal(page)).toBe(n.total);

  // …and the page RESETS when the result changes: continuing to page 3 of the old ranking
  // through a new filter would show a slice of a list the reader never saw the start of.
  await chooseType(page, 'Lower thirds');
  await expect(cards).toHaveCount(page1);
  expect(await resultTotal(page)).toBe(n.lowerThirds);
});

test('the last page has no "Show more" button at all', async ({ page }) => {
  await toBrowseStep(page);
  // A category small enough to fit one page. Derived, not named: any category the catalog
  // grows past a page would rot a hardcoded one.
  const small = await page.evaluate(async () => {
    const { browsableCategories } = await import('/src/templates/templateMeta.ts');
    return browsableCategories().sort((a, b) => a.count - b.count)[0];
  });
  test.skip(small.count > 12, 'no category small enough to fit one page');
  // By ID here, not by name: this one is chosen by arithmetic rather than written down, so
  // whichever category it lands on must resolve exactly - a name match is a substring match.
  await chooseCategory(page, small.category);
  await expect(page.locator('.wz-variant')).toHaveCount(small.count);
  // Gone, not disabled: the button's absence is what says "that is all of them".
  await expect(page.getByTestId('wz-browse-more')).toHaveCount(0);
});

test('type, style, and capability facets AND together; clear-all restores the catalog', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  expect(await resultTotal(page)).toBe(n.total);

  // The group dropdown narrows to that shelf's templates - Lower thirds is a one-category
  // shelf, so its count is exactly the category's.
  await chooseType(page, 'Lower thirds');
  expect(await resultTotal(page)).toBe(n.lowerThirds);

  // Style: the glass family keeps exactly the glass designs.
  await page.locator('.wz-filter', { hasText: 'Elegant & glass' }).click();
  expect(await resultTotal(page)).toBe(n.ltGlass);

  // Capabilities live behind the Filters disclosure and are STRICT (has logo upload = has it).
  // ONE disclosure, at every width.
  await page.locator('.wz-browse-drawer-btn').click();
  await page.locator('.wz-browse-more .wz-filter', { hasText: 'Logo upload' }).click();
  expect(await resultTotal(page)).toBe(n.ltGlassLogo);
  await expect(page.locator('.wz-variant', { hasText: 'Frosted Card' })).toBeVisible();

  // Clear all brings the whole catalog back - including the type select, which is a filter
  // like any other however it is drawn.
  await page.locator('.wz-filter-clear').click();
  expect(await resultTotal(page)).toBe(n.total);
  await expect(page.getByTestId('wz-browse-type')).toHaveValue('');

  // The repeating bucket keeps only templates with a repeating list field.
  await page.getByRole('button', { name: '↻ Repeating' }).click();
  expect(await resultTotal(page)).toBe(n.repeating);
});

test('the dropdown offers the category groups, and a group\'s chips narrow to its categories', async ({ page }) => {
  await toBrowseStep(page);
  // Assert the RULE, not a list that rots: the options are exactly the category GROUPS with
  // catalog content (ten shelves over the 27 categories - model/taxonomy.ts), each counting
  // its members' designs, plus the "All graphics" default.
  const expected = await page.evaluate(async () => {
    const { browsableGroups } = await import('/src/templates/templateMeta.ts');
    return browsableGroups().map((g) => g.name).sort();
  });
  const options = await page.getByTestId('wz-browse-type').locator('option').allInnerTexts();
  expect(options[0]).toMatch(/^All graphics · \d+$/);
  // Each option reads "Name · count"; the count is live data, so only the name is compared.
  const rendered = options.slice(1).map((t) => t.split(' · ')[0].trim()).sort();
  expect(rendered).toEqual(expected);

  // And the counts are real: the option's number is that shelf's whole catalog, which is
  // what the result total becomes once it is picked.
  const scores = options.find((t) => t.startsWith('Scores'))!;
  await page.getByTestId('wz-browse-type').selectOption('scores');
  expect(await resultTotal(page)).toBe(Number(scores.split(' · ')[1]));

  // A multi-category shelf offers its member categories as chips - exactly the ones with
  // content - and a chip narrows the result to that one category.
  const members = await page.evaluate(async () => {
    const { browsableCategories } = await import('/src/templates/templateMeta.ts');
    const { CATEGORY_GROUP_OF } = await import('/src/model/taxonomy.ts');
    return browsableCategories().filter((t) => CATEGORY_GROUP_OF[t.category] === 'scores');
  });
  const chips = page.locator('.wz-browse-cats .wz-filter');
  await expect(chips).toHaveCount(members.length);
  await chips.first().click();
  expect(await resultTotal(page)).toBe(members[0].count);
  // Re-clicking the chip clears the narrowing back to the shelf.
  await chips.first().click();
  expect(await resultTotal(page)).toBe(Number(scores.split(' · ')[1]));

  // A one-category shelf renders no chips - a lone chip restating the dropdown would be a
  // control that changes nothing.
  await chooseType(page, 'Lower thirds');
  await expect(chips).toHaveCount(0);
});

test('programme selection ranks into Best for / Also works without hiding anything', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  // The programme selects live behind the Filters disclosure, collapsed by default at every
  // width - only search, the type select and the style chips lead the step.
  await page.locator('.wz-browse-drawer-btn').click();
  await page.locator('.wz-browse-programme select').last().selectOption('church-service');
  // RANKING, NEVER EXCLUSION: the total is the whole catalog, and the section that leads is
  // the matching one.
  await expect(page.locator('.wz-browse-section', { hasText: 'Best for church service' })).toBeVisible();
  expect(await resultTotal(page)).toBe(n.total);
  const shown = await shownCount(page);
  await expect(page.locator('.wz-variant')).toHaveCount(shown);

  // …AND "ALSO WORKS" IS A SECTION, not a promise. Across the whole catalog it starts 226
  // designs down, so reaching it by pressing "Show more" nineteen times would be a test of the
  // button. Narrow to a TYPE whose church-service matches fit inside one page instead, so the
  // second section renders on the first - and derive which type that is, because which
  // categories a pack claims is exactly the thing that changes as the catalog grows.
  const narrow = await page.evaluate(async () => {
    const { browseTemplates, NO_BROWSE_FILTERS } = await import('/src/templates/search.ts');
    const { browsableCategories } = await import('/src/templates/templateMeta.ts');
    for (const tile of browsableCategories()) {
      const outcome = browseTemplates({
        ...NO_BROWSE_FILTERS,
        format: 'church-service',
        category: tile.category,
      });
      // Both sections non-empty, and the matching one small enough to leave room on page 1.
      if (outcome.best.length > 0 && outcome.best.length < 12 && outcome.also.length > 0) {
        return { category: tile.category, best: outcome.best.length, total: outcome.total };
      }
    }
    return null;
  });
  expect(narrow, 'no graphic type splits across both sections for a church service').not.toBeNull();
  await chooseCategory(page, narrow!.category);
  await expect(page.locator('.wz-browse-section', { hasText: 'Best for church service' })).toBeVisible();
  await expect(page.locator('.wz-browse-section', { hasText: 'Also works' })).toBeVisible();
  // Nothing was hidden by the split: the two sections plus the rest add up to the total.
  expect(await resultTotal(page)).toBe(narrow!.total);
});

test('search reaches templates through aliases and field semantics', async ({ page }) => {
  await toBrowseStep(page);
  const n = await catalogCounts(page);
  // "name graphic" is an alias for lower thirds - no template carries those words.
  await page.locator('.wz-browse-search').fill('name graphic');
  expect(await resultTotal(page)).toBe(n.lowerThirds);
  await page.locator('.wz-browse-search').fill('countdown');
  // Countdown fans out across timers AND holding screens (the alias set). The claim is that
  // both are IN the result, which the page does not change - but it does change how they are
  // reached: at the time of writing "Clean Clock" ranks 18th of 23, so it arrives one press of
  // "Show more" down. `revealDesign` pages until it is on the grid, and fails naming the count
  // line if the result never contains it.
  await revealDesign(page, 'Quiet Hold');
  await revealDesign(page, 'Clean Clock');
});

test('an impossible combination shows the honest empty state with its escape hatches', async ({ page }) => {
  await toBrowseStep(page);
  // A lower third is a name-and-title strap; it structurally never carries a repeating list
  // field (that belongs to tickers, credits and agendas). This pairing therefore matches
  // nothing AND stays empty however the catalog grows.
  await chooseType(page, 'Lower thirds');
  // The field-count buckets are behind the Filters disclosure.
  await page.locator('.wz-browse-drawer-btn').click();
  await page.getByRole('button', { name: '↻ Repeating' }).click();
  await expect(page.locator('.wz-variant')).toHaveCount(0);
  expect(await resultTotal(page)).toBe(0);
  await expect(page.locator('.wz-browse-empty')).toBeVisible();
  // Nothing to page through either - the button belongs to a result that has more in it.
  await expect(page.getByTestId('wz-browse-more')).toHaveCount(0);
  // The escape hatches: drop the most limiting filter, or hand the brief to Create with AI.
  await expect(page.locator('.wz-browse-empty button', { hasText: 'Create it with AI' })).toBeVisible();
  await page.locator('.wz-browse-empty button', { hasText: 'Remove the most limiting filter' }).click();
  await expect(page.locator('.wz-variant').first()).toBeVisible();
});

test('on a phone the facets collapse into the filter drawer; results stay one flick away', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await toBrowseStep(page);
  // Closed by default: the controls are hidden, the toggle and the results are not.
  const drawer = page.locator('.wz-browse-filters');
  const toggle = page.locator('.wz-browse-drawer-btn');
  await expect(toggle).toBeVisible();
  await expect(drawer).toBeHidden();
  await expect(page.locator('.wz-browse-search')).toBeVisible();
  await expect(page.locator('.wz-variant').first()).toBeVisible();
  // Open it, narrow by type - the type select is OUTSIDE the drawer, because "what kind of
  // graphic" is the step's first question - then close: the filter holds and the badge
  // counts it.
  await toggle.click();
  await expect(drawer).toBeVisible();
  await chooseType(page, 'Lower thirds');
  await toggle.click();
  await expect(drawer).toBeHidden();
  await expect(toggle).toContainText('(1)');
  const n = await catalogCounts(page);
  expect(await resultTotal(page)).toBe(n.lowerThirds);
});

test('a card\'s ⓘ opens its full detail without picking the template', async ({ page }) => {
  await toBrowseStep(page);
  await chooseType(page, 'Scoreboards');
  const cell = page.locator('.wz-variant-cell').first();
  await cell.locator('.wz-variant-info').click();
  const detail = cell.locator('.wz-variant-detail');
  // Everything the card's strict info budget leaves out (proposal §12.3).
  await expect(detail).toContainText('Editable fields');
  await expect(detail).toContainText('f0');
  await expect(detail).toContainText('Score controls');
  await expect(detail).toContainText('Sports broadcast');
  // Opening details is NOT picking: no card is selected and the wizard stays on Browse.
  await expect(page.locator('.wz-variant.selected')).toHaveCount(0);
  await expect(page.locator('.wz-browse-search')).toBeVisible();
  // One panel at a time, and the button closes its own.
  await page.locator('.wz-variant-cell').nth(1).locator('.wz-variant-info').click();
  await expect(detail).toBeHidden();
  await expect(page.locator('.wz-variant-detail')).toHaveCount(1);
});

test('the brand toggle ranks the package siblings first without filtering anything out', async ({ page }) => {
  // Create a glass graphic so the saved project brand is the glass family, then reopen the
  // wizard and turn on "Use current project's colors & typeface" (proposal §13.3). The create
  // rides the Advanced editor door (the footer shortcut is Skip to finish since step 6).
  await enableAdvancedMode(page);
  await toBrowseStep(page);
  await pickDesign(page, 'Frosted Card');
  await finishIntoEditor(page);
  await expect(page.locator('.wz-modal')).toBeHidden();

  await startNewProject(page);
  await page.locator('[data-entry="template"]').click();
  await chooseType(page, 'Lower thirds');
  const n = await catalogCounts(page);
  const firstStyle = () => page.locator('.wz-variant .wz-style-tag').first().textContent();
  expect(await firstStyle()).not.toBe('Elegant & glass');

  await page.locator('.wz-match input[type="checkbox"]').check();
  expect(await firstStyle()).toBe('Elegant & glass');
  // Ranking, never filtering: the result total is untouched.
  expect(await resultTotal(page)).toBe(n.lowerThirds);
});

test('facet values without catalog mass render no chip', async ({ page }) => {
  await toBrowseStep(page);
  await page.locator('.wz-browse-drawer-btn').click();
  // No preset ships intensity "none", so that chip must not exist (proposal §10).
  await expect(page.locator('.wz-filter', { hasText: 'Motion: none' })).toHaveCount(0);
});

// ── The FIELD PLAN (docs/GOALS.md "Student release" step 5): the Fields step offers exactly
// what the design's contract supports - lines add/remove on the standard contract, a rows
// editor over the ONE source field on a list design, and no restructuring at all on a fixed
// contract. Before the plan existed, add/remove rendered everywhere and self-assembled
// categories silently ignored it.

test('field plan: a ticker offers a rows editor, never line add/remove', async ({ page }) => {
  await toBrowseStep(page);
  await chooseType(page, 'Tickers');
  await pickDesign(page, 'News Strip');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields

  // The items line renders as ROWS over the one textarea-backed source field.
  const rowsEditor = page.getByTestId('list-rows-editor');
  await expect(rowsEditor).toBeVisible();
  await expect(page.getByTestId('field-plan-hint')).toContainText('Rows here are CONTENT');
  // …and the list's own TEXT FORMAT is stated on the step, not only in docs/. This is where a
  // person decides whether the template suits their show, so it is where the one mark the
  // field carries has to be readable (docs/TICKERS.md).
  await expect(page.getByTestId('list-format-note')).toContainText('A colon ends a KICKER');
  // No structural line add/remove anywhere on the step.
  await expect(page.getByRole('button', { name: '+ Add a line' })).toHaveCount(0);

  // Editing rows edits the ONE field's value: add a row, type into it, and the draft's
  // sample for that line gains exactly one more \n-separated entry.
  const before = await rowsEditor.locator('input').count();
  await page.getByTestId('list-row-add').click();
  await rowsEditor.locator('input').nth(before).fill('BREAKING · Rows are content');
  await expect(rowsEditor.locator('input')).toHaveCount(before + 1);
  await expect(rowsEditor.locator('input').nth(before)).toHaveValue('BREAKING · Rows are content');
});

test('field plan: a quiz board is a fixed contract - fields edit, structure does not', async ({ page }) => {
  await toBrowseStep(page);
  await chooseType(page, 'Quiz');
  await pickDesign(page, 'Arena Quiz');
  await page.getByRole('button', { name: 'Next →' }).click(); // Fields

  // Titles and samples stay editable; add/remove is gone (it was a silent no-op).
  await expect(page.locator('.wz-line-row').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Add a line' })).toHaveCount(0);
  await expect(page.locator('.wz-line-row button', { hasText: '✕' })).toHaveCount(0);
  await expect(page.getByTestId('field-plan-hint')).toContainText('fixed set');
});

test('the first page shows the CATEGORY, not its first twelve entries', async ({ page }) => {
  // Browse renders a PAGE of twelve, so for most people the first twelve ARE the category. With
  // no query and no ranking facet the only tiebreak was catalog position, and designs get written
  // in batches - so the fold showed one batch. Measured 2026-08-21 on the lower thirds: the first
  // twelve were 10 dark and 10 orange, out of a shelf carrying nine accent hues and 7 light
  // backdrops. The owner read that page and said the graphics "all look the same". They did; the
  // category does not (docs/CATALOG_VARIETY.md).
  //
  // Asserted on the ENGINE rather than the cards, because what is being pinned is the ordering
  // rule. The axes are the ones that verified against the rendered pixels: the palette's accent
  // hue predicted the measured hue 72/72, so it is what the spread is keyed on.
  await toBrowseStep(page);
  const spread = await page.evaluate(async () => {
    const { browseTemplates, NO_BROWSE_FILTERS, accentHueBucket } = await import('/src/templates/search.ts');
    const read = (category: string) => {
      const out = browseTemplates({ ...NO_BROWSE_FILTERS, category: category as never });
      const page12 = [...(out.best ?? []), ...(out.also ?? [])].slice(0, 12);
      return {
        hues: new Set(page12.map((r) => accentHueBucket(r.variant.defaultPalette?.accent))).size,
        families: new Set(page12.map((r) => r.variant.styleTag)).size,
        shown: page12.length,
      };
    };
    return { lowerThird: read('lower-third') };
  });

  // Twelve cards off a 95-design shelf have no excuse for one or two accents. Registry order gave
  // TWO distinct hue buckets here; the floors are set below what the spread achieves so a future
  // design landing in the catalog cannot make this brittle, and far above what it replaced.
  expect(spread.lowerThird.shown).toBe(12);
  expect(spread.lowerThird.hues).toBeGreaterThanOrEqual(4);
  expect(spread.lowerThird.families).toBeGreaterThanOrEqual(4);
});
