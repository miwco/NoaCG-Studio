// PHASE 0 SPIKE - the zero-token CONTROL and the gallery's blind ANCHORS
// (docs/NOACG_PRO_PLAN.md §0.1, §0.2).
//
// BENCH-ONLY (see exemplars.ts for the deletion condition).
//
// THE CONTROL is the first thing that runs and the reason this file exists first. Before any
// token is spent, one known-good HAND-AUTHORED lower third goes through the complete wrapper
// - scaffold contract, render set, deterministic gates, motion capture, gallery. If the
// control looks broken, the harness is broken. Two paid rounds have already been mis-read as
// model failure when the platform was at fault (docs/AI_ATTEMPTS.md: a gateway that refused
// correctly-encoded structured output; a style patch that collapsed the root to 0x0), and
// every gate stayed green through both. The control rerun is MANDATORY after any change to
// the wrapper, not just before the first round.
//
// THE ANCHORS are what stops the human read from happening cold. §0.2 requires the review
// gallery to blind-mix a few adapt-first outputs and strong catalog graphics among the
// candidates, so "coherent, deliberate composition" is judged against visible references
// rather than against a memory of one. Both anchor kinds are free: a catalog graphic is
// `variant.create()`, and an adapt-first output is the offline stub, which is the SAME
// grounded compile path (keyword -> DesignSpec -> specToTemplate) the product runs, minus
// the model call.

import { variantById } from '../../templates/catalog';
import { assembleGroundedTemplate } from '../lite/pipeline';
import { VETTED_EXEMPLAR_IDS } from './exemplars';
import { fillBrandMark, type SpikeBrand } from './brand';
import { composeFromLanguage } from '../pro/language/compose';
import { STUB_LANGUAGES } from '../pro/language/stub';
import type { DesignSpec } from '../designSpec';
import type { SpxTemplate } from '../../model/types';
import type { SpikeBrief } from './run';

/** What every anchor and the control is, for the key file the human reads AFTER judging.
 *  `design-language` is Phase A (docs/NOACG_PRO_PLAN.md §15.5): the platform composes the
 *  graphic and a design LANGUAGE paints it. Free while the language is hand-written. */
export type AnchorKind = 'control' | 'catalog' | 'adapt-first' | 'design-language';

export interface SpikeAnchor {
  id: string;
  kind: AnchorKind;
  /** Human-readable provenance, revealed only with the key. */
  provenance: string;
  template: SpxTemplate;
  data: Record<string, string>;
  stressData: Record<string, string>;
  /** Set on the mark-fill control: which field carries the brand mark, so the runner points
   *  the rendered mark measurement at it - the same measurement every candidate gets. */
  markFieldId?: string;
}

/**
 * The control brief. Ordinary on purpose - the control measures the WRAPPER, so anything
 * unusual about the graphic would make a broken strip ambiguous.
 */
export const CONTROL_BRIEF: SpikeBrief = {
  brief: 'Control run - a hand-authored house lower third, no model involved.',
  name: 'Alexandra Riva',
  title: 'Chief Political Correspondent',
};

/** The control design: `lt11` House Strap - the house lower third, the one design whose
 *  correct appearance everyone working on this repo already knows by sight. */
const CONTROL_VARIANT_ID = 'lt11';

/** Stress text is what §0.2 asks the human to review beside the normal case, and it is also
 *  what the mid-air `update()` cue writes during the motion capture: a strap that survives
 *  its entrance and breaks on the first real name is a strap that breaks on air. */
export function stressFor(brief: SpikeBrief): Record<string, string> {
  if (brief.fields) {
    return Object.fromEntries(
      brief.fields.map((f) => [f.id, f.stress ?? `${f.sample} and a good deal longer than planned`]),
    );
  }
  return {
    f0: `${brief.name} de la Cruz-Whittington`,
    f1: `${brief.title}, Southern Bureau and Election Desk`,
  };
}

export function dataFor(brief: SpikeBrief): Record<string, string> {
  if (brief.fields) {
    return Object.fromEntries(brief.fields.map((f) => [f.id, f.sample]));
  }
  return { f0: brief.name, f1: brief.title };
}

/** Field values for an arbitrary template: the brief's two lines against whatever text
 *  fields the design actually declares, so an anchor with a logo slot or a third line is
 *  still driven rather than left on its design defaults. */
function driveData(template: SpxTemplate, values: string[]): Record<string, string> {
  const text = template.fields.filter((f) => f.ftype === 'textfield' || f.ftype === 'textarea');
  return Object.fromEntries(
    text.map((f, i) => [f.field, values[i] ?? String(f.value ?? '')]),
  );
}

/** A value only a score, a clock or a duration would carry - digits and their punctuation. */
const NUMERIC_VALUE = /^[\d.,:+\- ]+$/;

/**
 * Map a brief's values onto a catalog design's fields BY WHAT EACH FIELD IS, not by position.
 *
 * The blind pages' catalog anchors used to assign purely by order, and the 2026-08-19 read
 * paid for it twice: sb01's field order is name/score/name/score while the scoreboard brief
 * lists name/name/score/score, so "NORTHBRIDGE ALBION" landed on a score chip and a score sat
 * bare in a name slot ("one number has a yellow background and the other doesn't"); tk01
 * declares its items TEXTAREA first and its label second while the ticker brief leads with the
 * label, so the whole headlines block landed in the label and blew the strip out of its band.
 * Both frames were then judged as the DESIGN's failure.
 *
 * The classes are the ones the field types themselves declare: a textarea wants the multiline
 * value, a number field takes only a numeric-looking one, and a textfield prefers ordinary
 * words. Within a class the brief's order still decides, so a two-name board keeps home before
 * away. A value nothing claims is dropped and a field nothing fits keeps its design default -
 * exactly what the positional map did when the counts differed.
 */
export function mapBriefValues(
  fields: { field: string; ftype: string; value?: unknown }[],
  values: string[],
): Record<string, string> {
  const remaining = [...values];
  const take = (pred: (v: string) => boolean): string | undefined => {
    const i = remaining.findIndex(pred);
    return i === -1 ? undefined : remaining.splice(i, 1)[0];
  };
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!['textfield', 'textarea', 'number'].includes(f.ftype)) continue;
    let v: string | undefined;
    if (f.ftype === 'textarea') {
      v = take((s) => s.includes('\n')) ?? take(() => true);
    } else if (f.ftype === 'number') {
      v = take((s) => NUMERIC_VALUE.test(s));
    } else {
      v = take((s) => !s.includes('\n') && !NUMERIC_VALUE.test(s)) ?? take((s) => !s.includes('\n'));
    }
    out[f.field] = v ?? String(f.value ?? '');
  }
  return out;
}

/**
 * The zero-token control: a real catalog design created with the control brief's own lines,
 * exactly as the wizard would build it.
 */
export function controlAnchor(): SpikeAnchor {
  const variant = variantById(CONTROL_VARIANT_ID);
  if (!variant) throw new Error(`spike control: variant ${CONTROL_VARIANT_ID} is gone from the catalog`);
  const template = variant.create({
    lines: [
      { title: 'Name', sample: CONTROL_BRIEF.name },
      { title: 'Role', sample: CONTROL_BRIEF.title },
    ],
  });
  const stress = stressFor(CONTROL_BRIEF);
  return {
    id: 'control',
    kind: 'control',
    provenance: `hand-authored catalog design ${variant.id} "${variant.name}"`,
    template,
    data: driveData(template, [CONTROL_BRIEF.name, CONTROL_BRIEF.title]),
    stressData: driveData(template, [stress.f0, stress.f1]),
  };
}

/**
 * The MARK-FILL control (the brand round's addition to the zero-token set): a hand-authored
 * catalog design with its shared logo slot turned on, filled with a REAL synthetic brand mark
 * through the SAME `fillBrandMark` every candidate goes through, and measured by the same
 * rendered gate. If this control's mark is broken, missing or unmeasurable, the fill or the
 * measurement is broken - and a paid round would have measured the harness (the Phase 0
 * lesson, twice over). lt11's slot is the shared band (templates/shared/logoSlot.ts), the one
 * every 'optional' design inherits, so the control exercises the canonical slot rather than a
 * bespoke one.
 */
export function markControlAnchor(brand: SpikeBrand): SpikeAnchor {
  const variant = variantById(CONTROL_VARIANT_ID);
  if (!variant) throw new Error(`spike mark control: variant ${CONTROL_VARIANT_ID} is gone from the catalog`);
  if (variant.logo === 'none') {
    throw new Error(`spike mark control: ${CONTROL_VARIANT_ID} no longer declares a logo capability`);
  }
  const bare = variant.create({
    lines: [
      { title: 'Name', sample: CONTROL_BRIEF.name },
      { title: 'Role', sample: CONTROL_BRIEF.title },
    ],
    logoEnabled: true,
  });
  // NOT placed by the platform: lt11 already carries the catalog's own shared slot, and this
  // control exists to prove that slot still works. Two placement systems on one box collide.
  const { template, fill } = fillBrandMark(bare, brand, { place: false });
  if (!fill.slotFieldId || !fill.path) {
    throw new Error('spike mark control: the shared logo slot was not found by the fill - the fill is broken');
  }
  const stress = stressFor(CONTROL_BRIEF);
  return {
    id: 'control-mark',
    kind: 'control',
    provenance: `hand-authored ${variant.id} "${variant.name}" + shared logo slot, filled with the "${brand.name}" mark by fillBrandMark`,
    template,
    // The mark's path rides the update payload too, so the runtime's own setFieldValue path
    // (src + has-image) is exercised beside the baked src.
    data: { ...driveData(template, [CONTROL_BRIEF.name, CONTROL_BRIEF.title]), [fill.slotFieldId]: fill.path },
    stressData: { ...driveData(template, [stress.f0, stress.f1]), [fill.slotFieldId]: fill.path },
    markFieldId: fill.slotFieldId,
  };
}

/**
 * THE SEATED-MARK CONTROL: the platform's own PLACEMENT path, exercised for free.
 *
 * The mark control above deliberately runs with `place: false`, because lt11 is a catalog
 * design that already carries its slot - so until this existed, the placement path had NO
 * zero-token coverage at all. A paid round then ran on it and every one of its twelve
 * generations came back without its SPX definition, because the move serialized the document's
 * BODY and an SPX definition lives in a <script> outside it. $0.25, and the control could not
 * have caught it: the control never ran the code under test.
 *
 * That is the Phase 0 lesson arriving a third time, so this closes it structurally. The
 * template is hand-authored HERE rather than taken from the catalog, in the shape a GENERATED
 * design emits - a full document with a definition, its own logo container for the platform to
 * empty, the structure spine - because that is what the fill will meet in a paid round. If the
 * seat breaks the definition, drops the fields, loses the stylesheet link or fails to move the
 * mark, this control says so before any tokens burn.
 */
const SEATED_CONTROL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="css/template.css">
<script src="js/gsap.min.js"></script>
<script>
  window.SPXGCTemplateDefinition = {
    description: "Seated-mark control",
    DataFields: [
      { field: "f0", ftype: "textfield", title: "Name", value: "${CONTROL_BRIEF.name}" },
      { field: "f1", ftype: "textfield", title: "Role", value: "${CONTROL_BRIEF.title}" },
      { field: "f2", ftype: "filelist", title: "Logo", value: "", assetfolder: "./images/", extension: "png" }
    ]
  };
</script>
<script src="js/template.js"></script>
</head>
<body>
  <div class="seated-control">
    <div class="seated-control-box">
      <!-- The design's own container, exactly what a generation writes and the fill empties. -->
      <div class="seated-control-logo-holder"><img id="f2" class="seated-control-logo" alt=""></div>
      <div class="seated-control-mask"><span id="f0" class="seated-control-name">${CONTROL_BRIEF.name}</span></div>
      <div class="seated-control-mask"><span id="f1" class="seated-control-role">${CONTROL_BRIEF.title}</span></div>
    </div>
  </div>
</body>
</html>`;

const SEATED_CONTROL_CSS = `:root {
  --accent: #f6a623;
  --text-color: #ffffff;
  --text-dim: rgba(255, 255, 255, 0.72);
  --panel-bg: #101216;
  --font-heading: Inter, system-ui, sans-serif;
  --scale: 1;
  --type-scale: 1;
}
.seated-control {
  position: absolute;
  left: calc(160px * var(--scale));
  bottom: calc(160px * var(--scale));
  /* VISIBLE, unlike a real template, because this control carries no template.js and so has no
     play() to reveal it. The first version copied the house opacity:0 and the owner's blind
     read caught it in one line - "has nothing in it, it's empty fields". It also exposed a real
     gap in the gate beside it: measureRenderedMark tests the img's OWN opacity, so this mark
     measured CLEAN at 260x62 inside a root nobody could see. */
  opacity: 1;
}
.seated-control-box {
  display: flex;
  align-items: center;
  gap: calc(20px * var(--scale));
  padding: calc(24px * var(--scale));
  background: var(--panel-bg);
}
.seated-control-logo-holder { display: flex; align-items: center; }
.seated-control-logo { height: calc(56px * var(--scale)); width: auto; object-fit: contain; }
.seated-control-mask { overflow: hidden; }
.seated-control-name {
  font: 700 calc(38px * var(--scale) * var(--type-scale)) / 1.1 var(--font-heading);
  color: var(--text-color);
}
.seated-control-role {
  font: 500 calc(20px * var(--scale) * var(--type-scale)) / 1.2 var(--font-heading);
  color: var(--text-dim);
}`;

export function seatedMarkControlAnchor(brand: SpikeBrand): SpikeAnchor {
  const bare: SpxTemplate = {
    name: 'Seated-mark control',
    type: 'lower-third',
    resolution: { width: 1920, height: 1080, label: '1080p' },
    fps: 25,
    html: SEATED_CONTROL_HTML,
    css: SEATED_CONTROL_CSS,
    js: '',
    fields: [
      { field: 'f0', ftype: 'textfield', title: 'Name', value: CONTROL_BRIEF.name },
      { field: 'f1', ftype: 'textfield', title: 'Role', value: CONTROL_BRIEF.title },
      { field: 'f2', ftype: 'filelist', title: 'Logo', value: '' },
    ],
    settings: {} as SpxTemplate['settings'],
    assets: [],
    layers: [],
  };
  const { template, fill } = fillBrandMark(bare, brand);
  // Every property the paid round lost. Each one is a throw rather than a finding: this is the
  // harness checking itself, and a broken harness must stop the run, not score it.
  if (!fill.placed) throw new Error('seated-mark control: the platform did not place the mark');
  if (!fill.slotFieldId || !fill.path) throw new Error('seated-mark control: the fill found no slot');
  if (!template.html.includes('SPXGCTemplateDefinition')) {
    throw new Error('seated-mark control: placing the mark DESTROYED the SPX definition');
  }
  if ((template.html.match(/ftype:/g) ?? []).length < 3) {
    throw new Error('seated-mark control: placing the mark lost DataFields from the definition');
  }
  if (!/^<!DOCTYPE html>/i.test(template.html.trim()) || !template.html.includes('css/template.css')) {
    throw new Error('seated-mark control: placing the mark lost the document head');
  }
  if (template.html.includes('seated-control-logo-holder')) {
    throw new Error('seated-mark control: the emptied container the mark left was not removed');
  }
  const stress = stressFor(CONTROL_BRIEF);
  return {
    id: 'control-seated-mark',
    kind: 'control',
    provenance: `hand-authored generation-shaped design, mark PLACED by the platform from the "${brand.name}" brand`,
    template,
    data: { f0: CONTROL_BRIEF.name, f1: CONTROL_BRIEF.title, [fill.slotFieldId]: fill.path },
    stressData: { f0: stress.f0, f1: stress.f1, [fill.slotFieldId]: fill.path },
    markFieldId: fill.slotFieldId,
  };
}

/**
 * Strong catalog graphics for the blind gallery.
 *
 * THREE CONSTRAINTS, and the first control run found two of them the hard way:
 *
 *   1. NOT FROM THE EXEMPLAR POOL. An anchor that is also an exemplar would let a near-copy
 *      of an exemplar score as "as good as the anchors" by being the anchor, and §0.3's last
 *      condition is precisely that the promising results are not near-copies.
 *   2. TWO LINES OR MORE. `lt19` Rule Under sat in this list until the control run rendered
 *      it: `maxLines: 1`, so the assembler correctly dropped the supporting line and the
 *      anchor showed a name and nothing else. Judged beside two-line candidates it would
 *      have read as the cleaner composition for having less in it. Asserted below rather
 *      than trusted.
 *   3. A SPREAD - different style families and different shape languages, and across the six
 *      free items as a whole an even split of ZONES (three bottom-left: the control, lt08,
 *      lt40; three bottom-right: lt27, lt42, lt38), because composition is one of the things
 *      §0.2 asks the human to read and six graphics anchored identically would not exercise
 *      it.
 */
const ANCHOR_CATALOG_IDS: readonly string[] = [
  'lt27', // Column Rule - editorial, quiet, panel-free, bottom-right
  'lt08', // Frosted Card - glass, a card rather than a strap, bottom-left
  'lt42', // Right Slam - sport, heavy, bottom-right
];

/**
 * The adapt-first anchors, as hand-written `DesignSpec`s compiled through the REAL grounded
 * path - `assembleGroundedTemplate` = specToTemplate + applyDesignAdjustments +
 * ensureSpecFonts + applySpecOutPreset, the same function `claudeProvider` and every Lite
 * generation compile through. Zero tokens: only the model call that would have WRITTEN the
 * spec is missing, and these specs stand in for it.
 *
 * WHY NOT THE OFFLINE STUB, which was the first attempt. Measured over 20 briefs, the stub
 * reaches exactly four chassis - lt11 on 15 of them, then lt05, lt32 and lt02 - and all four
 * are in the vetted exemplar pool. Its chassis choice is a small keyword table, not
 * retrieval, so a "stub adapt-first anchor" shows the compile path's quality under the
 * stub's judgement and calls it the product's. Writing the spec by hand is the more honest
 * of the two: the compile is real and the choice is stated.
 *
 * The chassis are chosen OUTSIDE the exemplar pool and outside the catalog-anchor list, for
 * the reason in `galleryAnchors` below. The compositional parameters are what makes these
 * adapt-first rather than plain catalog graphics: the deterministic adjustment block is the
 * thing that keeps grounded output diverse (src/ai/AGENTS.md), so an anchor that skipped it
 * would understate what the live path produces.
 */
const ANCHOR_NAME = 'Priya Raghunathan';
const ANCHOR_ROLE = 'Senior Research Fellow';
const ANCHOR_STRESS_NAME = 'Priya Raghunathan-Vasquez';
const ANCHOR_STRESS_ROLE = 'Senior Research Fellow, Centre for Comparative Media Policy';

const ADAPT_ANCHOR_SPECS: readonly { brief: string; spec: DesignSpec }[] = [
  {
    brief: 'a bold lower third for a live esports tournament caster',
    spec: {
      fit: 'catalog',
      reason: 'A high-energy competitive strap; the sport family carries the structure.',
      name: 'Caster Strap',
      summary: 'Condensed, high-contrast caster identification with a hard accent edge.',
      category: 'lower-third',
      variantId: 'lt40',
      lines: [
        { title: 'Caster', sample: ANCHOR_NAME },
        { title: 'Role', sample: ANCHOR_ROLE },
      ],
      typography: { scaleRatio: 1.6, headingWeight: 'black', kickerCase: 'caps', tracking: 'tight' },
      density: 'compact',
      shape: { corner: 'sharp', accentForm: 'block' },
      motionCharacter: 'a fast snap that settles hard; nothing bounces',
    },
  },
  {
    brief: 'a restrained lower third for a documentary about coastal erosion',
    spec: {
      fit: 'catalog',
      reason: 'A quiet documentary super; the cinematic family carries the structure.',
      name: 'Coastal Super',
      summary: 'Low-contrast documentary super with generous air and a hairline rule.',
      category: 'lower-third',
      // `lt34` Title Strap was here and the control run rejected it: it is a CENTRED title
      // treatment, so the anchor's name wrapped across two lines with a gap under it and read
      // as a title card rather than a strap. A weak anchor is worse than no anchor - it lowers
      // the bar a candidate is judged against. `lt38` Fade Rule is the quiet cinematic super
      // the brief actually describes.
      variantId: 'lt38',
      lines: [
        { title: 'Name', sample: ANCHOR_NAME },
        { title: 'Role', sample: ANCHOR_ROLE },
      ],
      typography: { scaleRatio: 1.35, headingWeight: 'regular', kickerCase: 'as-written', tracking: 'wide' },
      density: 'airy',
      shape: { corner: 'sharp', accentForm: 'hairline', panel: 'none' },
      motionCharacter: 'a slow resolved fade that never pulls focus from the picture',
    },
  },
];

function anchorFrom(id: string, kind: AnchorKind, provenance: string, template: SpxTemplate): SpikeAnchor {
  return {
    id,
    kind,
    provenance,
    template,
    data: driveData(template, [ANCHOR_NAME, ANCHOR_ROLE]),
    stressData: driveData(template, [ANCHOR_STRESS_NAME, ANCHOR_STRESS_ROLE]),
  };
}

/**
 * PHASE A's ZERO-TOKEN SET (docs/NOACG_PRO_PLAN.md §15.5).
 *
 * Four hand-written design LANGUAGES through the real composer - the identical function a model
 * answer goes through, with only the call that would have written the language missing. They are
 * deliberately far apart (a solid navy edge-bar package, a carbon block strap, a panel-free serif
 * super, a rounded blurred daytime package), so the control run exercises every branch of the
 * composer rather than the one the house happens to take.
 *
 * A mark is seated on the first one when a brand is supplied, because Phase A's claim is that the
 * platform owns the WHOLE composition - and the mark is the part of it that already works, so it
 * has to keep working through the new path rather than beside it. The catalog's own shared slot
 * does the seating (`logoEnabled`), which is why this passes `place: false` reasoning by simply
 * not calling the spike's own placer: two placement systems on one box is not a stricter
 * contract, it is a broken one (the `control-mark` collision, 2026-08-13).
 */
export function languageAnchors(brand?: SpikeBrand | null): SpikeAnchor[] {
  return STUB_LANGUAGES.map((language, i) => {
    const logo = i === 0 && brand
      ? {
        assetPath: brand.mark.path,
        images: [{ path: brand.mark.path, data: brand.mark.dataUrl }],
        // THE MEASURED INK travels with the file, because the composer decides the mark field
        // on it (`markFieldFor`, ON since 2026-08-15). Omitting these numbers would leave the
        // control composing a graphic the product does not - the exact way a control stops
        // being one.
        backing: brand.mark.probe.backing,
        inkLuminance: brand.mark.probe.inkLuminance,
        ...(typeof brand.mark.probe.inkSpread === 'number'
          ? { inkSpread: brand.mark.probe.inkSpread }
          : {}),
      }
      : null;
    const { template, spacing, notes } = composeFromLanguage(language, {
      lines: [
        { title: 'Name', sample: ANCHOR_NAME },
        { title: 'Role', sample: ANCHOR_ROLE },
      ],
      logo,
    });
    // The slot the shared logo band minted, so the rendered mark gate and the spacing
    // instrument point at the same field a real upload would land in.
    const markField = logo
      ? template.fields.find((f) => f.ftype === 'filelist')?.field
      : undefined;
    const anchor = anchorFrom(
      `language-${language.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      'design-language',
      `Phase A: platform-composed lower third in the hand-written "${language.name}" design language`
      + ` (${notes.join('; ')}); padding ${spacing.padVPx}/${spacing.padHPx}px, line gap`
      + ` ${spacing.lineGapPx}px, type ${spacing.headingPx}/${spacing.supportingPx}px`,
      template,
    );
    return markField ? { ...anchor, markFieldId: markField } : anchor;
  });
}

export async function galleryAnchors(): Promise<SpikeAnchor[]> {
  const anchors: SpikeAnchor[] = [];
  // Seeded with the control's own design AND the whole vetted exemplar pool.
  //
  // The pool exclusion is the same rule as constraint 1 above, applied where the control run
  // showed it also bites: the first fixed anchor set drew `lt05` and `lt32` from the stub,
  // and both are exemplars. A candidate that near-copies its exemplar would then be judged
  // beside that very design, and the reviewer has no way to tell "as good as the anchor"
  // from "is the anchor" - which is exactly the §0.3 condition the anchors exist to inform.
  const used = new Set<string>([CONTROL_VARIANT_ID, ...VETTED_EXEMPLAR_IDS]);

  for (const id of ANCHOR_CATALOG_IDS) {
    const variant = variantById(id);
    if (!variant) throw new Error(`spike anchors: catalog design ${id} is gone - pick a replacement`);
    if (variant.maxLines < 2) {
      throw new Error(
        `spike anchors: ${id} "${variant.name}" carries ${variant.maxLines} line(s) - an anchor `
        + 'judged beside two-line candidates must be able to hold two lines',
      );
    }
    used.add(id);
    anchors.push(anchorFrom(
      `anchor-catalog-${id}`,
      'catalog',
      `catalog design ${id} "${variant.name}"`,
      variant.create({
        lines: [
          { title: 'Name', sample: ANCHOR_NAME },
          { title: 'Role', sample: ANCHOR_ROLE },
        ],
      }),
    ));
  }

  for (const [i, entry] of ADAPT_ANCHOR_SPECS.entries()) {
    const chassis = entry.spec.variantId ?? '(none)';
    if (used.has(chassis)) {
      throw new Error(
        `spike anchors: adapt-first anchor ${i + 1} uses chassis ${chassis}, which is already an `
        + 'exemplar, the control or a catalog anchor - pick one outside those sets',
      );
    }
    const variant = variantById(chassis);
    if (!variant) throw new Error(`spike anchors: chassis ${chassis} is gone - pick a replacement`);
    if (variant.maxLines < 2) {
      throw new Error(`spike anchors: chassis ${chassis} "${variant.name}" cannot hold two lines`);
    }
    used.add(chassis);
    const { template } = assembleGroundedTemplate(entry.spec);
    anchors.push(anchorFrom(
      `anchor-adapt-${i + 1}`,
      'adapt-first',
      `adapt-first grounded compile on chassis ${chassis} "${variant.name}" for: ${entry.brief}`,
      template,
    ));
  }

  return anchors;
}
