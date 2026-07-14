import { expect, type Page } from '@playwright/test';

// A LEGACY TEMPLATE, for the specs that cover the classic timeline strip.
//
// Every category now creates as a NOACG_ANIM data block, so no wizard path produces a legacy
// marked region any more. The classic strip is not dead code, though, and Phase 8 keeps it
// (docs/DYNAMIC_MOTION_SCOPE.md §8.1): it serves LEGACY TEMPLATES — a project saved before the
// migration, an imported one, hand-written GSAP the importer refuses to guess at. Those must
// keep rendering truthfully and stay editable, because regenerating them would discard their
// owner's tuning, and "code is the single source of truth" forbids that.
//
// So the strip's subject is built the way a saved project actually holds it: create the
// template, then write its preset's legacy emit back over the marked region. The dock picks the
// editing surface from the CODE, never from the category — which is exactly what makes a saved
// legacy template still work, and is what these specs pin.

/**
 * Rewrite the current template's marked ANIMATION region as the LEGACY emit of `presetId`, and
 * apply it (one undoable apply, like any other code change). The dock then hands the template to
 * the classic strip. `steps` emits the multi-step reveal block (one » Next press per body line).
 */
export async function applyLegacyRegion(
  page: Page,
  opts: { prefix: string; presetId: string; steps?: boolean },
) {
  await page.evaluate(async ({ prefix, presetId, steps }) => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { anyPresetById } = await import('/src/blocks/animPatch.ts');
    const { countLines } = await import('/src/model/structure.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const store = useTemplateStore.getState();
    const tpl = store.template;
    const preset = anyPresetById(presetId as Parameters<typeof anyPresetById>[0]);
    const region = preset.emit({
      prefix,
      lineCount: Math.max(1, countLines(tpl.html)),
      hasAccent: tpl.html.includes(`${prefix}-accent`),
      hasBars: tpl.html.includes(`${prefix}-bar-fill`),
      steps: !!steps,
      stepOutsideParts: [],
      speed: parseAnimData(tpl.js)?.speed ?? 1,
      easeIn: preset.autoEase.easeIn,
      easeOut: preset.autoEase.easeOut,
    });
    const OPEN = '/* == ANIMATION';
    const CLOSE = '/* == END ANIMATION == */';
    const start = tpl.js.indexOf(OPEN);
    const end = tpl.js.indexOf(CLOSE) + CLOSE.length;
    store.applyTemplate({ ...tpl, js: tpl.js.slice(0, start) + region + tpl.js.slice(end) });
  }, opts);
  await page.waitForTimeout(650); // the debounced preview rebuild
  await expect(page.locator('.center-timeline [data-testid="timeline"]')).toBeVisible();
}
