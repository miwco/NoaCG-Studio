// Data model for the choose-first creation wizard. A TemplateVariant is a tasteful, hand-tuned
// design that generates a complete SpxTemplate from the user's WizardOptions. Every option has a
// default so `variant.create({})` renders for live previews. The generated code is the source of
// truth afterwards — the wizard never runs again on an existing project.

import type { Resolution, SpxField, SpxTemplate, AssetFile } from './types';
import { DEFAULT_GRAPHICS_FORMAT, DEFAULT_GRAPHICS_RESOLUTION } from './projectFormat';
import type { CustomFont, StyleTag } from './fonts';
import type { EasingId } from './easings';

// ── Categories (the full catalog; lower thirds, info cards, end credits, and tickers live) ──

export interface CategoryInfo {
  id: AssemblerId;
  name: string;
  /** How many designs this category will hold when complete. */
  plannedCount: number;
  /** False until the category's variants exist — shown as "coming soon" in the wizard. */
  available: boolean;
  description: string;
  /**
   * Wizard grouping: the live-show must-haves vs the more specialised graphics — plus
   * 'imported', which the category grid deliberately never renders (CategoryStep lists the
   * two browsable groups). An imported design has nothing to browse: it does not exist until
   * the user brings their own artwork, so the Import Graphic entry is its only way in.
   */
  group: 'essentials' | 'specials' | 'imported';
}

/**
 * The ASSEMBLER/ROUTING id — which code builds a template and which field contract it uses
 * (catalog buckets, field plans, hidden-config lists all key on it). It is NOT a taxonomy:
 * the user-facing discovery categories are `GraphicCategoryId` in model/taxonomy.ts, declared
 * per variant in templates/meta.ts. Renamed from `AssemblerId` (2026-08-11) because the
 * old name kept inviting attempts to merge the two — they answer different questions
 * (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §18): several assemblers feed one graphic category and
 * one assembler's variants scatter across several. Never render these ids in UI.
 */
export type AssemblerId =
  | 'lower-third'
  | 'info-card'
  | 'end-credits'
  | 'starting-soon'
  | 'game-timer'
  | 'scoreboard'
  | 'ticker'
  | 'alert'
  | 'public-info'
  | 'infographic'
  | 'corner-bug'
  | 'versus'
  | 'quiz'
  | 'frame'
  | 'transition'
  // The competition pack (docs/COMPETITION_PACK.md): esports, competition, result and
  // reveal graphics. Four categories, one shared assembler (templates/competition).
  | 'esports-score'
  | 'matchup'
  | 'results-board'
  | 'reveal'
  | 'poll'
  | 'audience'
  | 'stream-notification'
  | 'imported-design';

export const CATEGORIES: CategoryInfo[] = [
  // Essentials — the graphics almost every live show needs.
  { id: 'lower-third',   name: 'Lower thirds',            plannedCount: 86, available: true,  description: 'Names, titles, and straps over the action.', group: 'essentials' },
  { id: 'ticker',        name: 'Tickers',                 plannedCount: 20, available: true , description: 'Scrolling news, info, and index strips.', group: 'essentials' },
  { id: 'scoreboard',    name: 'Scoreboards',             plannedCount: 20, available: true , description: 'Scorebugs, match boards, status and event cards.', group: 'essentials' },
  { id: 'info-card',     name: 'Info cards',              plannedCount: 18, available: true,  description: 'Full / half screen cards — info, readings, quotes and ceremony.', group: 'essentials' },
  // These two carry the TAXONOMY's wording on purpose: they hold exactly the designs their
  // browse tile does (ss01-13, cr01-12), so a user meeting the same set twice must read the
  // same name both times. The description carries the nuance the tile name drops.
  { id: 'starting-soon', name: 'Holding & break screens', plannedCount: 13, available: true , description: 'Starting soon, breaks, technical pauses and sign-offs.', group: 'essentials' },
  { id: 'end-credits',   name: 'Credits & thanks',        plannedCount: 12, available: true , description: 'Credit rolls, name walls, sponsor boards and schedules.', group: 'essentials' },
  { id: 'corner-bug',    name: 'Bugs & corner logos',     plannedCount: 36, available: true , description: 'Persistent marks: logos, idents, live status, sponsors, chips.', group: 'essentials' },
  // Specials — for particular formats and moments.
  { id: 'infographic',   name: 'Infographics',            plannedCount: 29, available: true , description: 'Stats, polls, bars, schedules, goals, fixtures.', group: 'specials' },
  { id: 'game-timer',    name: 'Game show timer',         plannedCount: 4,  available: true , description: 'Countdowns and clocks for game formats.', group: 'specials' },
  { id: 'versus',        name: 'Versus cards',            plannedCount: 2,  available: true , description: 'Full-frame match-up cards — two sides meet.', group: 'specials' },
  { id: 'frame',         name: 'Camera frames',           plannedCount: 4,  available: true , description: 'Surrounds for webcams, interviews, split screens and screen shares.', group: 'specials' },
  { id: 'transition',    name: 'Transitions',             plannedCount: 4,  available: true , description: 'Full-frame stingers and wipes that cover a cut, then clear.', group: 'specials' },
  // The competition pack — esports, competition, result and reveal graphics.
  { id: 'esports-score', name: 'Esports scoreboards',     plannedCount: 8,  available: true , description: 'Series scorebugs, map / round indicators and veto boards.', group: 'specials' },
  { id: 'matchup',       name: 'Match-ups & competitors', plannedCount: 10, available: true , description: 'Match-ups with a winner pick, head-to-heads, player cards.', group: 'specials' },
  { id: 'results-board', name: 'Results & standings',     plannedCount: 14, available: true , description: 'Rosters, turn orders, standings, timing, results and brackets.', group: 'specials' },
  { id: 'reveal',        name: 'Reveals',                 plannedCount: 12, available: true , description: 'Nominees and winners, verdicts, award and launch reveals.', group: 'specials' },
  { id: 'quiz',          name: 'Quiz graphics',           plannedCount: 12, available: true , description: 'Game-show questions with two, three or four answers.', group: 'specials' },
  { id: 'poll',          name: 'Live votes',              plannedCount: 4,  available: true , description: 'Audience polls and votes — open, close, result, winner.', group: 'specials' },
  { id: 'audience',      name: 'Audience & questions',    plannedCount: 20, available: true , description: 'Viewer questions, Q&A, chat highlights, queues, requests.', group: 'specials' },
  { id: 'stream-notification', name: 'Stream notifications', plannedCount: 4, available: true, description: 'Followers, members, donations, gifts and raids in one queued event format.', group: 'specials' },
  // The public-service pack (docs/PUBLIC_SERVICE_PACK.md).
  { id: 'alert',         name: 'Alerts & warnings',       plannedCount: 10, available: true , description: 'Breaking news, weather warnings, emergency and status notices.', group: 'specials' },
  { id: 'public-info',   name: 'Public information',      plannedCount: 9,  available: true , description: 'Official notices, instructions, disclaimers — in one or two languages.', group: 'specials' },
  // Not browsable — reached only by importing artwork (see CategoryInfo.group).
  { id: 'imported-design', name: 'Imported design',       plannedCount: 1,  available: true , description: 'Your own artwork with text fields on top.', group: 'imported' },
];

// ── Wizard options (every choice the flow collects) ─────────────────────────

/** One visible text line in the design (becomes data field fN + a styled element). */
export interface LineSpec {
  /** Operator-facing label in SPX, e.g. "Name". */
  title: string;
  /** Sample/default text shown in the design. */
  sample: string;
  /**
   * Per-line placement and type. ONLY the imported-design category uses this: artwork made
   * elsewhere carries its own look, so its text has to be placed and styled to match what is
   * baked into the image. Every catalog design lays its own lines out and ignores this —
   * their typography is the design's decision, not the operator's.
   * Absent = the imported-design assembler's defaults for that line index.
   */
  style?: LineStyle;
}

/** Placement + type for one manually positioned text line (see LineSpec.style). */
export interface LineStyle {
  /** Position within the artwork, in design px from its top-left (before --scale). */
  x: number;
  y: number;
  /** Which edge of the text sits at `x` — a free-placed line has no column to align inside. */
  align: 'left' | 'center' | 'right';
  /** Type size in design px (before --scale). */
  fontSize: number;
  /** CSS font-weight (400 regular · 700 bold). */
  weight: number;
  /** Any CSS color. */
  color: string;
  /** A bundled font id, or null to inherit the graphic's --font-heading. */
  fontId: string | null;
}

/**
 * An extra, non-visual data field added to the SPX definition only.
 * The offered types are the ones live broadcast graphics actually use: text, long text,
 * a number, or an image ("filelist" — the operator picks a file from the project's
 * images/ folder). SPX also knows dropdown/checkbox/color, but those are reserved for
 * designs with a genuinely constrained choice (e.g. the quiz's correct-answer dropdown).
 */
export interface ExtraFieldSpec {
  title: string;
  ftype: 'textfield' | 'textarea' | 'number' | 'filelist';
  value: string;
}

/** The nine anchor zones, snapped to safe areas. */
export type Zone9 =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'mid-center' | 'mid-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** A curated color set. `panel` is the box background; accent appears in small sharp doses. */
export interface Palette {
  id: string;
  name: string;
  styleTags: StyleTag[];
  accent: string;
  text: string;
  textDim: string;
  panel: string;
}

export type AnimPresetId =
  // The Slide family — one choreography, four directions of travel (slide-up enters
  // rising from below, slide-left enters travelling left from the right edge, …):
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'line-reveal'
  | 'mask-wipe'
  | 'pop-spring'
  | 'snap-stinger'
  | 'blur-in'
  | 'fade'
  | 'flip-3d'
  // End-credits motion formats (templates/endCredits/creditsPresets.ts):
  | 'credits-roll'
  | 'credits-loop'
  | 'credits-board'
  | 'credits-pages'
  | 'credits-crawl'
  // Ticker motion formats (templates/tickers/tickerPresets.ts):
  | 'ticker-marquee'
  | 'ticker-flip'
  | 'ticker-rotate'
  // Countdown-clock formats (templates/startingSoon + templates/gameTimers):
  | 'hold-loop'
  | 'hold-still'
  | 'timer-run'
  | 'timer-line-reveal'
  // Versus-card formats (templates/versus/vsPresets.ts):
  | 'vs-slam'
  | 'vs-glide'
  // Live-vote motion format (templates/poll/pollPresets.ts):
  | 'poll-open'
  // Audience-graphic motion formats (templates/audience/audiencePresets.ts):
  | 'audience-rise'
  | 'audience-slide'
  // Infographic motion formats (templates/infographics/igPresets.ts):
  | 'count-up'
  | 'bars-grow'
  | 'ring-fill'
  | 'rows-cascade'
  // The goal/milestone motions: a ring drawn to raised/goal (its angle and the counted
  // figure are different values, which is why it is not 'ring-fill'), and a progress line
  // that pops each milestone it passes.
  | 'goal-ring'
  | 'milestone-run'
  // Camera-frame motion (templates/frames/framePresets.ts): the window edge, then the plate.
  | 'frame-draw'
  | 'frame-fade'
  | 'frame-slide'
  // Transition motion (templates/transitions/transitionPresets.ts): the entrance COVERS the
  // frame and holds there — the exit is what clears it again.
  | 'transition-slam'
  | 'transition-wipe'
  | 'transition-sweep'
  | 'transition-iris'
  | 'transition-spin'
  // Quiz format (templates/quiz/quizPresets.ts) — Continue plays the Reveal step, which
  // calls revealAnswer() to light up the correct row:
  | 'quiz-reveal'
  // Competition-pack motion (templates/competition/compPresets.ts) — one bank shared by the
  // four competition categories, prefix-parameterized like the standard one:
  | 'comp-rise'
  | 'comp-impact'
  | 'comp-bloom'
  | 'comp-cascade'
  // Imported-design motion (templates/importedDesign/designPresets.ts): the artwork and its
  // text move as ONE unit, so these animate the box and never the individual lines.
  | 'design-fade'
  | 'design-slide'
  | 'design-pop'
  | 'design-blur'
  // …except the SVG road's per-layer stagger, which walks the artwork's OWN top-level layers
  // in (PresetConfig.layers) — a designer-drawn structure, unlike a flat picture's.
  | 'design-stagger';

export type AnimSpeed = 0.75 | 1 | 1.5;

export interface AnimationChoice {
  presetId: AnimPresetId;
  /** Multiplier on animSpeed: 0.75 slower · 1 normal · 1.5 faster. */
  speed: AnimSpeed;
  /** Easing preset ('auto' = the animation preset's hand-tuned pair). See model/easings.ts. */
  easing: EasingId;
  /** SPX multi-step: line 1 first, further lines revealed on Continue / next(). */
  steps: boolean;
}

export interface WizardOptions {
  resolution?: Resolution;
  fps?: number;
  /** Visible text lines, up to the variant's maxLines (the design adapts). Defaults to
   *  the variant's suggested lines. */
  lines?: LineSpec[];
  /** Extra non-visual fields appended to the SPX definition. */
  extraFields?: ExtraFieldSpec[];
  /**
   * Values for a GRAPHIC TYPE's non-line fields, keyed by the type's own LOGICAL field key
   * (`{ correctAnswer: 'C' }`) - never by `fN`, which is positional and would break the moment
   * a field was inserted. Lines are what a graphic SAYS; this is the rest of what makes it the
   * graphic that was asked for: which answer is correct, how long the countdown runs, what the
   * poll's options are.
   *
   * Only a TYPE-COMPILED variant can honour it, because only a type declares logical keys and
   * the kind to clamp each value against (`variantsFromType`). A hand-written variant ignores
   * it, which is the honest answer rather than a guess at what its `fN` ids mean. Every value
   * is clamped to what its field declares and an illegal one is DROPPED, so the design's own
   * default survives instead of the graphic acquiring an option nobody offers.
   */
  content?: Record<string, string>;
  palette?: Palette;
  fontId?: string;
  /** A user-imported font (embedded as an asset) — takes precedence over fontId. */
  customFont?: CustomFont;
  /** Whole-graphic size multiplier written as --scale (S 0.8 · M 1 · L 1.25 — StyleStep's SIZES). */
  sizeScale?: number;
  /** Text-only size multiplier written as --type-scale (S 0.9 · M 1 · L 1.15). */
  typeScale?: number;
  zone?: Zone9;
  /** Pixel offsets added after zone anchoring. */
  nudge?: { x: number; y: number };
  animation?: Partial<AnimationChoice>;
  /** Images from the "Import graphics" entry (already stored as data-URL assets). */
  importedImages?: AssetFile[];
  /** Relative path of the imported image to place in the variant's logo slot. */
  logoAssetPath?: string;
  /** Whether an 'optional'-logo design should include its logo slot (field + <img>).
   *  Unset falls back to "an image was provided"; 'built-in' designs always have one. */
  logoEnabled?: boolean;
  /** Mark the logo's `<img>` as ink-KNOCKED - it carries `.{prefix}-logo--knocked` and the
   *  caller supplies the recolour rule.
   *
   *  It is a class rather than the CSS itself because the class is a CONTRACT: `assetIntegrity.ts`
   *  admits a filter on a protected picture only on this selector and only in the exact knock
   *  shape, so the one alteration the platform may make to a customer's mark is expressible and
   *  nothing else is (docs/NOACG_PRO_PLAN.md §17). Only NoaCG Pro's composer sets it today. */
  logoInkKnocked?: boolean;
  /** The artwork that IS the graphic (the Import Graphic flow's imported-design category).
   *  Its natural size decides the design's size, so it is measured at import, not guessed. */
  designArt?: DesignArt;
  /** The SVG that IS the graphic (the Import Graphic flow's SVG road,
   *  docs/SVG_IMPORT_PLAN.md): sanitized markup with its chosen text layers to bind. */
  designSvg?: DesignSvg;
}

/**
 * An imported SVG graphic: the sanitized markup (candidates tagged with
 * data-noacg-candidate — assets/svgImport.ts) plus the text layers the user chose to bind
 * as operator fields. The markup is inlined VERBATIM into the template; binding adds
 * id="fN" to the chosen nodes and nothing else, which is what keeps the pixels exactly the
 * designer's (plan §1, architecture B).
 */
export interface DesignSvg {
  /** Sanitized SVG markup from assets/svgImport.ts, candidate markers still in place. */
  markup: string;
  /** Design-space size in px — the viewBox size, fitted to the frame when larger. */
  width: number;
  height: number;
  /** The text layers becoming operator fields, in field order (index i binds as fN). */
  fields: DesignSvgField[];
  /** The `<image>` layers becoming picture fields (filelist), numbered after the text
   *  fields. update() swaps the node's href; an empty value restores the drawn picture. */
  images: DesignSvgImage[];
  /** Outlined-text groups the user chose to REPLACE (plan §1.A): the generator hides each
   *  one; the HTML field that stands in for it is placed afterwards through the raster
   *  flow's placed-line transform (components/wizard/draft.ts withSvgOutlineFields), which
   *  is why only the identity travels here — the placement is a draft concern. */
  outlines: DesignSvgOutline[];
  /** Every font family the SVG references, with how each one was resolved. */
  fonts: DesignSvgFont[];
}

/** One outlined-text group hidden in favour of a placed HTML field. */
export interface DesignSvgOutline {
  /** The group's data-noacg-candidate marker value in the markup. */
  candidateId: string;
}

/** One SVG picture layer bound as a filelist field. */
export interface DesignSvgImage {
  /** The node's data-noacg-candidate marker value in the markup. */
  candidateId: string;
  /** Operator-facing field label. */
  title: string;
}

/** One SVG text layer bound as an operator field. */
export interface DesignSvgField {
  /** The node's data-noacg-candidate marker value in the markup. */
  candidateId: string;
  /** Operator-facing field label. */
  title: string;
  /** The layer's own text — the sample/default value. */
  sample: string;
  /** True emits ftype "number" (a score, a count) instead of "textfield". */
  numeric: boolean;
}

/** How one referenced font family resolves (plan §4). Exactly one of the two sources is
 *  set when resolved; neither means UNRESOLVED — emitted with a warning, never blocked,
 *  because the designer may know the playout machine has the face installed. */
export interface DesignSvgFont {
  /** The family name exactly as the SVG references it. */
  family: string;
  /** A bundled face whose family name matches — its @font-face ships with the template. */
  fontId?: string;
  /** A fetched (Google) or uploaded face, embedded as an asset like any custom font.
   *  Its `family` must equal the SVG's family name for the @font-face to apply. */
  customFont?: CustomFont;
}

/** The imported artwork a design is built on, with the natural size measured at import. */
export interface DesignArt {
  /** Relative asset path, e.g. "images/lower-third.png". */
  path: string;
  /** The design-space size everything positions against. For artwork larger than the frame
   *  (a 2× / retina export is the common case) this is the size scaled down to FIT the frame -
   *  the file keeps its full resolution; only the display size shrinks. */
  width: number;
  height: number;
  /** The file's real pixel size, kept when it differs from the fitted width/height above. */
  sourceWidth?: number;
  sourceHeight?: number;
  /** How the artwork meets text longer than it was drawn for. Absent = fixed (the image
   *  renders exactly as drawn — today's behaviour, and the default). */
  stretch?: DesignStretch;
}

/**
 * The imported artwork's scaling mode, per axis so more modes can be added later without
 * migrating anything: absent = fixed; `horizontal` = a 9-slice whose middle band stretches
 * with the widest text field (lower thirds, straps, name tags); `vertical` is reserved for
 * growing panels. All values are DESIGN px from the artwork's top-left.
 */
export interface DesignStretch {
  /** `left` = where the left cap ends, `right` = where the right cap starts. */
  horizontal?: { left: number; right: number };
  /** Reserved — the vertical axis lands here later with no data migration. */
  vertical?: { top: number; bottom: number };
}

/** WizardOptions with every default resolved — what variant builders actually receive. */
export interface ResolvedOptions {
  resolution: Resolution;
  fps: number;
  lines: LineSpec[];
  extraFields: ExtraFieldSpec[];
  palette: Palette;
  fontId: string;
  customFont: CustomFont | null;
  sizeScale: number;
  typeScale: number;
  zone: Zone9;
  nudge: { x: number; y: number };
  animation: AnimationChoice;
  importedImages: AssetFile[];
  logoAssetPath: string | null;
  logoEnabled: boolean;
  logoInkKnocked: boolean;
  designArt: DesignArt | null;
  designSvg: DesignSvg | null;
}

// ── Template variants ────────────────────────────────────────────────────────

/** A variant's logo capability: 'built-in' = the design always carries a logo slot
 *  (corner bugs, credits), 'optional' = the wizard offers a logo toggle (+ upload),
 *  'none' = the design has no sensible place for one. */
export type LogoSupport = 'none' | 'optional' | 'built-in';

/**
 * What FIELD-STRUCTURE changes a design supports - the wizard offers EXACTLY this, nothing
 * arbitrary (docs/GOALS.md "Student release" step 5).
 *
 * - 'lines': the standard line contract - lines addable/removable between min and maxLines,
 *   each becoming its own `fN` element (shared/standard.ts's mask idiom).
 * - 'fixed': a CLOSED field contract (a scoreboard's cells, a quiz's answer rows). Titles
 *   and sample values stay editable; the field COUNT does not. Before this, the wizard
 *   rendered add/remove here anyway and the assembler silently ignored them.
 * - 'list': the design's runtime BUILDS its rows from ONE textarea field (the repeating-data
 *   doctrine, src/templates/AGENTS.md - a ticker's items, a credits roll). The wizard offers
 *   a rows editor over that one field's value; never more fields.
 */
export type FieldPlan =
  | { kind: 'lines'; min: number }
  | { kind: 'fixed'; reason: string }
  | { kind: 'list'; itemLabel: string; itemHint: string; maxItems?: number };

/**
 * The per-CATEGORY field plans that differ from the standard line contract. A category's
 * field structure is its assembler's contract (one shared assembler per category), so the
 * declaration lives in ONE table rather than on dozens of variant files; a variant that
 * genuinely deviates can override via `TemplateVariant.fieldPlan`. Categories not named here
 * keep the standard 'lines' plan - the behavior they always had.
 */
const CATEGORY_FIELD_PLANS: Partial<Record<AssemblerId, FieldPlan>> = {
  // One hidden textarea IS the rundown of items; the runtime rebuilds the strip from it.
  ticker: { kind: 'list', itemLabel: 'Ticker items', itemHint: 'One item per row' },
  // `Role | Name` per row; the roll is built from them.
  'end-credits': { kind: 'list', itemLabel: 'Credits', itemHint: 'Role | Name — one credit per row' },
  // Question + answer rows + the correct-answer marker: a machine drives them as one unit.
  quiz: { kind: 'fixed', reason: 'A quiz board is question + its answer rows — a fixed set its state machine drives.' },
  // Team names, scores, period, clock: the cells are the design.
  scoreboard: { kind: 'fixed', reason: 'A scoreboard is its cells — team names, scores and clock are the design itself.' },
  'game-timer': { kind: 'fixed', reason: 'A game clock is its readouts — the fields are the design itself.' },
  'starting-soon': { kind: 'fixed', reason: 'A countdown is its readouts — the fields are the design itself.' },
};

/** Resolve a variant's field plan: its own declaration, else its category's, else the
 *  standard line contract. THE one rule every field-offering surface asks. */
export function fieldPlanOf(variant: Pick<TemplateVariant, 'category' | 'fieldPlan'>): FieldPlan {
  return variant.fieldPlan ?? CATEGORY_FIELD_PLANS[variant.category] ?? { kind: 'lines', min: 1 };
}

export interface TemplateVariant {
  /** e.g. "lt01". */
  id: string;
  /** The GRAPHIC TYPE this variant is a design of (templates/types/), when it has one — the
   *  back-pointer Phase 4's node editor and Phase 5's control generator look up. Absent on a
   *  hand-written variant that no type has claimed yet. */
  typeId?: string;
  category: AssemblerId;
  name: string;
  styleTag: StyleTag;
  description: string;
  /** How many visible text lines the design supports (1–5). */
  maxLines: number;
  /** This design's field-structure contract, when it deviates from its category's (see
   *  fieldPlanOf - absent means the category's plan, else the standard line contract). */
  fieldPlan?: FieldPlan;
  /** Suggested lines used as the wizard's starting point (and preview defaults). */
  suggestedLines: LineSpec[];
  /** Logo capability — drives the wizard's logo toggle, the import flow, and filtering. */
  logo: LogoSupport;
  /**
   * WHAT that image slot is for, when the design's slot is not a brand mark.
   *
   * `logo` answers "does this design take an image field"; it does not answer "what kind of
   * image", and the two got conflated because for almost every design the answer is the same.
   * Measured 2026-08-09 (`benchmarks/lite/BRAND-AUDIT-2026-08-09.md`), one design in the
   * catalog is a counter-example strong enough to need the distinction: ls25's slot is RELEASE
   * ARTWORK — square by nature, correctly `object-fit: cover`, and titled "Cover artwork" in
   * the field list. Judged as a mark well it fails for cropping, and the cropping is right.
   *
   * A `mark` well holds something that must appear exactly as uploaded (no crop, no radius,
   * no distortion — `src/ai/assetIntegrity.ts` enforces this the moment the upload is marked
   * "use it as it is"). A `picture` well holds content, which a design may legitimately crop
   * to its own shape.
   *
   * ADDITIVE OPTIONAL and absent means `mark`, so every existing variant reads exactly as it
   * did. Nothing persists a variant, so there is no migration to write (root AGENTS.md rule 6
   * is about SAVED formats).
   */
  imageSlot?: 'mark' | 'picture';
  /** Animation presets that suit this design (first = default). */
  animationPresets: AnimPresetId[];
  /**
   * Whether the design starts in multi-step mode (SPX Continue reveals one line per press).
   * Absent = off, which is what every design did before this existed.
   *
   * It is a CAPABILITY like `animationPresets[0]`, not a preference: a numbered process card
   * or a checklist is a stepped graphic by construction — created single-step it shows its
   * ending on the first frame — while a name strap is not. The wizard's steps toggle still
   * wins wherever the user touches it; this only decides what an untouched `create({})`
   * produces, which is also what the previews, the sweeps and the AI see.
   */
  defaultSteps?: boolean;
  defaultPalette: Palette;
  defaultFontId: string;
  defaultZone: Zone9;
  /** Build the complete template. Every option is optional — defaults come from the variant. */
  create(options?: WizardOptions): SpxTemplate;
}

// ── Curated palettes (one accent + neutral system; see DESIGN_LANGUAGE.md) ──

export const PALETTES: Palette[] = [
  // NoaCG house (the brand system: void panel, one amber accent — BRAND-MANUAL §3)
  { id: 'noacg',    name: 'NoaCG Amber',  styleTags: ['noacg'],   accent: '#f6a623', text: '#ffffff', textDim: 'rgba(183,188,196,0.95)', panel: 'rgba(10, 12, 16, 0.86)' },
  // Minimal
  { id: 'ivory',    name: 'Ivory',        styleTags: ['minimal'], accent: '#e8c547', text: '#ffffff', textDim: 'rgba(255,255,255,0.72)', panel: 'rgba(12, 14, 18, 0.92)' },
  { id: 'porcelain',name: 'Porcelain',    styleTags: ['minimal'], accent: '#0f1115', text: '#0f1115', textDim: 'rgba(15,17,21,0.65)',    panel: 'rgba(250, 250, 248, 0.96)' },
  { id: 'signal',   name: 'Signal Red',   styleTags: ['minimal', 'sport'], accent: '#e63946', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)', panel: 'rgba(10, 12, 16, 0.92)' },
  // Sport
  { id: 'volt',     name: 'Volt',         styleTags: ['sport'],   accent: '#c8f31d', text: '#ffffff', textDim: 'rgba(255,255,255,0.75)', panel: 'rgba(8, 10, 14, 0.94)' },
  { id: 'inferno',  name: 'Inferno',      styleTags: ['sport'],   accent: '#ff5a1f', text: '#ffffff', textDim: 'rgba(255,255,255,0.75)', panel: 'rgba(12, 8, 8, 0.94)' },
  { id: 'royal',    name: 'Royal',        styleTags: ['sport', 'glass'], accent: '#3d6bff', text: '#ffffff', textDim: 'rgba(255,255,255,0.72)', panel: 'rgba(8, 10, 20, 0.94)' },
  // Editorial (the magazine/newsroom voice — printed-page colour: one ink, one paper)
  // The accent is measured, not picked by eye: editorial designs put it on SMALL tracked caps,
  // and a deeper vermilion (#d1462f) lands at 4.2:1 on the ink panel — under the 4.5:1 a caption
  // needs. This one clears it at ~5.2:1 without becoming orange.
  { id: 'vermilion',name: 'Vermilion',    styleTags: ['editorial'], accent: '#e2593f', text: '#ffffff', textDim: 'rgba(255,255,255,0.66)', panel: 'rgba(16, 15, 14, 0.90)' },
  { id: 'broadsheet',name: 'Broadsheet',  styleTags: ['editorial', 'minimal'], accent: '#1f3a5f', text: '#14161a', textDim: 'rgba(20,22,26,0.62)', panel: 'rgba(245, 243, 238, 0.96)' },
  // Cinematic (documentary colour: bone and ember over a scrim — never a saturated accent)
  { id: 'noir',     name: 'Noir',         styleTags: ['cinematic'], accent: '#e8e2d6', text: '#ffffff', textDim: 'rgba(255,255,255,0.62)', panel: 'rgba(0, 0, 0, 0.55)' },
  { id: 'ember',    name: 'Ember',        styleTags: ['cinematic'], accent: '#e0a458', text: '#ffffff', textDim: 'rgba(255,255,255,0.62)', panel: 'rgba(10, 8, 6, 0.55)' },
  // Glass
  { id: 'frost',    name: 'Frost',        styleTags: ['glass'],   accent: '#7dd3fc', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)',  panel: 'rgba(255, 255, 255, 0.10)' },
  { id: 'orchid',   name: 'Orchid',       styleTags: ['glass'],   accent: '#c084fc', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)',  panel: 'rgba(255, 255, 255, 0.10)' },
  { id: 'mint',     name: 'Mint',         styleTags: ['glass', 'minimal'], accent: '#34d399', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)', panel: 'rgba(255, 255, 255, 0.10)' },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

// ── Defaults resolver ────────────────────────────────────────────────────────

/** Fill every missing option with the variant's tasteful default. */
export function resolveOptions(variant: TemplateVariant, options: WizardOptions = {}): ResolvedOptions {
  // An EXPLICIT lines array is honoured as given — including an empty one (an imported
  // design creates bare: its fields are added in the editor's Data tab). Only an absent
  // value falls back to the variant's suggestions.
  const lines = (options.lines ?? variant.suggestedLines).slice(0, variant.maxLines);
  return {
    resolution: options.resolution ?? DEFAULT_GRAPHICS_RESOLUTION,
    fps: options.fps ?? DEFAULT_GRAPHICS_FORMAT.fps,
    lines,
    extraFields: options.extraFields ?? [],
    palette: options.palette ?? variant.defaultPalette,
    fontId: options.fontId ?? variant.defaultFontId,
    customFont: options.customFont ?? null,
    sizeScale: options.sizeScale ?? 1,
    typeScale: options.typeScale ?? 1,
    zone: options.zone ?? variant.defaultZone,
    nudge: options.nudge ?? { x: 0, y: 0 },
    animation: {
      presetId: options.animation?.presetId ?? variant.animationPresets[0],
      speed: options.animation?.speed ?? 1,
      easing: options.animation?.easing ?? 'auto',
      steps: options.animation?.steps ?? variant.defaultSteps ?? false,
    },
    importedImages: options.importedImages ?? [],
    logoAssetPath: options.logoAssetPath ?? null,
    logoEnabled:
      variant.logo === 'built-in' ||
      (variant.logo === 'optional' && (options.logoEnabled ?? !!options.logoAssetPath)),
    logoInkKnocked: options.logoInkKnocked ?? false,
    designArt: options.designArt ?? null,
    designSvg: options.designSvg ?? null,
  };
}

/** Fields (fN ids) generated from lines + extras — lines first (rundown preview uses f0/f1). */
export function fieldsFromOptions(o: ResolvedOptions): SpxField[] {
  const fields: SpxField[] = o.lines.map((line, i) => ({
    field: `f${i}`,
    ftype: 'textfield',
    title: line.title,
    value: line.sample,
  }));
  o.extraFields.forEach((extra, i) => {
    fields.push({
      field: `f${o.lines.length + i}`,
      ftype: extra.ftype,
      title: extra.title,
      value: extra.value,
      // Image fields ("filelist") list the project's images/ folder in SPX.
      ...(extra.ftype === 'filelist' ? { assetfolder: './images/', extension: 'png' } : {}),
    });
  });
  return fields;
}
