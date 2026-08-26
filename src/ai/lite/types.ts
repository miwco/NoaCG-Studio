import type { ModelUsage } from '../modelTypes';
// Both trees import this file, so it stays dependency-light - and src/feedback/contract.ts is
// held to the same discipline (pure, no DOM, no env), which is why the discard vocabulary can
// live there instead of being copied here.
import type { LiteDiscardReason } from '../../feedback/contract';

export type CreativeAiProfileId = 'lite';

export type LiteUnsupportedCode =
  | 'unsupported-category'
  | 'category-ambiguous'
  | 'multi-graphic-request'
  | 'advanced-state-machine'
  | 'reference-recreation'
  | 'import-conversion'
  | 'video-request'
  | 'external-data'
  | 'too-complex';

/** Category vocabulary shared by the browser request, server contract, and future category
 * picker. A category becomes compilable only when lite/contract.ts has a CategoryContract for
 * it - naming it here is not an allowlist expansion. */
export type LiteCategoryId =
  | 'lower-third'
  | 'title'
  | 'topic-card'
  | 'breaking'
  | 'ticker'
  | 'scoreboard'
  | 'stats-panel'
  | 'player-card'
  | 'versus'
  | 'quiz'
  | 'poll'
  | 'qa-card'
  | 'countdown'
  | 'schedule'
  | 'leaderboard'
  | 'quote'
  | 'sponsor-bug'
  | 'social-bug'
  | 'progress-goal'
  | 'starting-soon'
  | 'end-credits';

export interface LiteCategoryAlternative {
  category: LiteCategoryId;
  confidence: number;
  reason: string;
}

/** The category read made by the same constrained model call that chooses the adaptation.
 * Manual category selection still wins in server semantic validation. */
export interface LiteCategoryInference {
  category: LiteCategoryId;
  confidence: number;
  alternatives: LiteCategoryAlternative[];
}

/** Brief meaning separated from palette values. These axes describe design character; they do
 * not turn words into colors. Exact project/brand values continue to override model choices. */
export interface LiteStyleIntent {
  mood: 'authoritative' | 'warm' | 'urgent' | 'restrained' | 'playful' | 'dramatic' | 'technical' | 'luxurious';
  era: 'contemporary' | 'mid-century' | 'retro-1980s' | 'retro-1990s' | 'heritage' | 'futurist';
  energy: 'quiet' | 'measured' | 'confident' | 'high' | 'explosive';
  material: 'flat' | 'paper' | 'glass' | 'metal' | 'fabric' | 'light' | 'screen';
  paletteDirection: 'brand-led' | 'neutral-dark' | 'neutral-light' | 'warm' | 'cool' | 'high-contrast' | 'monochrome';
  typographyCharacter: 'humanist' | 'geometric' | 'editorial-serif' | 'condensed' | 'monospace' | 'display' | 'cinematic';
  shapeLanguage: 'orthogonal' | 'rounded' | 'angled' | 'ruled' | 'layered' | 'minimal';
  texture: 'none' | 'clean' | 'grain' | 'paper' | 'glow' | 'frosted' | 'scanline';
  motion: 'calm-fade' | 'editorial-reveal' | 'precise-draw' | 'soft-depth' | 'fast-stinger' | 'technical-snap' | 'cinematic-drift';
}

export type LiteLowerThirdIntentKind =
  | 'person'
  | 'story'
  | 'event'
  | 'team'
  | 'organization'
  | 'promotion';

export type LiteLowerThirdLineRole =
  | 'person-name'
  | 'person-role'
  | 'organization'
  | 'team-name'
  | 'story-headline'
  | 'event-name'
  | 'location'
  | 'social-handle'
  | 'call-to-action'
  | 'supporting-context';

export interface LiteLowerThirdIntent {
  kind: LiteLowerThirdIntentKind;
  primaryRole: LiteLowerThirdLineRole;
  secondaryRole?: LiteLowerThirdLineRole;
}

/**
 * The four shapes a brand mark comes in, as a slot has to care about them.
 *
 * A chassis's logo well is drawn for a shape, and the mismatch is not a matter of degree: a 10:1
 * sponsor rail inside a square well paints a hairline, and no amount of taste fixes it
 * (`benchmarks/lite/BRAND-AUDIT-2026-08-09.md`). Four buckets rather than a number because the
 * model reasons in kinds, and because a slot either holds a shape or does not.
 */
export type LiteMarkShape = 'portrait' | 'square' | 'wordmark' | 'rail';

/** The boundaries, in ONE place - the browser measures, the server validates, the audit's
 *  fixture bank declares its five marks against these same cuts. */
export function markShapeFromAspect(aspect: number): LiteMarkShape {
  if (!(aspect > 0) || !Number.isFinite(aspect)) return 'square';
  if (aspect < 0.85) return 'portrait';
  if (aspect <= 1.4) return 'square';
  if (aspect <= 4.5) return 'wordmark';
  return 'rail';
}

/**
 * What the user's mark IS, measured in the browser before anything is sent.
 *
 * `hasLogo` was a BOOLEAN, and that is why `LiteCatalogEntry.logoSlot` could be measured and
 * still not be actable: the model could be told a chassis offers a dark surface and holds every
 * shape, and had no way to know whether the file in the user's hand was a knockout wordmark that
 * reads there or a dark-only one that vanishes. Both facts are free and deterministic - the
 * aspect is `naturalWidth / naturalHeight` and the backing is one alpha pass - so neither needs a
 * model and neither is a guess.
 *
 * Content-free by construction: a shape bucket, an opacity fact, and a light/dark word. The
 * PIXELS never leave the machine, which is the same line every other Lite input is held to.
 */
export interface LiteMarkDescriptor {
  shape: LiteMarkShape;
  /** `own-field` = the mark brings its own background and cannot vanish on any surface;
   *  `transparent` = its ink composites onto whatever the slot paints. */
  backing: 'own-field' | 'transparent';
  /** Only meaningful for a `transparent` mark: which surfaces its ink can read against.
   *  A `light` (knockout) mark needs a dark surface, a `dark` one needs a light surface. */
  ink?: 'light' | 'dark';
}

export interface LiteDesignSpec {
  fit: 'catalog';
  reason: string;
  name: string;
  summary: string;
  category: LiteCategoryId;
  variantId: string;
  /** Same-call category reading. The server uses it only when the user left category on auto. */
  categoryInference: LiteCategoryInference;
  /** Semantic design direction interpreted in context, before concrete adaptation knobs. */
  styleIntent: LiteStyleIntent;
  /** Relevant compatible references the model ranks after its chosen chassis. The deterministic
   * compiler may try these when the rendered hold frame rejects the first treatment. */
  fallbackVariantIds?: string[];
  intent: LiteLowerThirdIntent;
  lines: { title: string; sample: string; role: LiteLowerThirdLineRole }[];
  extraFields?: { title: string; ftype: 'textfield' | 'textarea' | 'number' | 'filelist'; value: string }[];
  useLogoSlot?: boolean;
  /** Still on the wire, deliberately IGNORED by the compile since v9 - Lite assembles with
   *  `keepChassisZone`, so placement is the chosen design's own `defaultZone`. It cannot be
   *  deleted while the model still emits it (lite/contract.ts). */
  zone?: string;
  paletteId?: string;
  palette?: { accent: string; text: string; textDim: string; panel: string };
  fontId?: string;
  sizeScale?: number;
  /** `presetId` is still on the wire and still ignored by the compile, for the same reason
   *  `zone` is - see lite/contract.ts. Motion is the chosen design's own. */
  animation?: { presetId?: string; easing?: string; speed?: number; steps?: boolean };
  motionCharacter?: string;
  typography?: {
    scaleRatio?: number;
    headingWeight?: 'regular' | 'semibold' | 'bold' | 'black';
    kickerCase?: 'caps' | 'as-written';
    tracking?: 'tight' | 'normal' | 'wide';
  };
  density?: 'airy' | 'standard' | 'compact';
  alignment?: 'left' | 'center' | 'right';
  shape?: {
    corner?: 'sharp' | 'soft' | 'round';
    accentForm?: 'bar' | 'hairline' | 'block' | 'none';
    panel?: 'solid' | 'translucent' | 'outline' | 'none';
  };
  flourish?: '' | null;
}

export interface LiteGenerationSpec {
  version: 1;
  category: string;
  fields: {
    label: string;
    kind: string;
    description?: string;
    example?: string;
  }[];
  styleNotes?: string;
  mood?: string;
  avoidNotes?: string;
  brandColors?: { accent: string; text: string; textDim: string; panel: string } | null;
  animation?: Record<string, unknown>;
}

/**
 * A model-authored SKIN: bounded restyling CSS (plus optional decorative inner HTML) for
 * the neutral canvas chassis. Same writable surface as the polish pass — override CSS
 * appended after the design CSS, never :root/@font-face/scripts. The browser applies it
 * through the polish gate and REVERTS to the spec's house chassis when any check fails.
 */
export interface LiteSkinPatch {
  summary: string;
  css: string;
  html?: string;
}

/** The vision judge's four axes, each an integer 1-5 (5 = excellent). */
export interface LiteSkinJudgeScores {
  legibility: number;
  hierarchy: number;
  briefFit: number;
  strapShape: number;
}

export interface LiteSkinJudgeRequest {
  /** The generation being judged - the server verifies ownership before spending. */
  generationId: string;
  brief: string;
  skinSummary: string;
  /** Base64 PNG of the settled HOLD frame, downscaled by the caller (the server caps size). */
  imageBase64: string;
}

export interface LiteSkinJudgeResult {
  verdict: 'pass' | 'fail';
  scores: LiteSkinJudgeScores;
  /** One short judge sentence - eval tooling context only, never stored server-side. */
  reason: string;
  /** The server-configured minimum every axis must reach for a pass. */
  threshold: number;
  usage: ModelUsage;
}

export type LiteDecision =
  | { status: 'ready'; spec: LiteDesignSpec; skin?: LiteSkinPatch }
  | {
      status: 'unsupported';
      code: LiteUnsupportedCode;
      message: string;
      suggestedBrief?: string;
      /** Present for ambiguous auto-category reads and unsupported inferred categories. */
      categoryChoices?: LiteCategoryAlternative[];
    };

export interface LiteConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface LiteGenerationRequest {
  idempotencyKey: string;
  prompt: string;
  generationSpec?: LiteGenerationSpec | null;
  priorSpec?: LiteDesignSpec;
  conversation?: LiteConversationTurn[];
  palette?: { accent: string; text: string; textDim: string; panel: string } | null;
  primaryFont?: { family: string; uploaded: boolean } | null;
  /** Is there a mark at all. Kept beside `mark` rather than replaced by it: this is the field
   *  the quota check reads, and a browser tab loaded before a deploy still sends only this one
   *  - the request validator is a strict key allowlist, so dropping it would fail those
   *  requests outright instead of degrading. `mark` is the DESCRIPTION when the client could
   *  take one. */
  hasLogo?: boolean;
  mark?: LiteMarkDescriptor | null;
  resolution: { width: number; height: number };
  fps: number;
}

export interface LiteGenerationResult {
  generationId: string;
  decision: LiteDecision;
  usage: ModelUsage;
  attemptCount: number;
  repairCount: number;
  expiresAt: string;
}

export interface LiteAllowance {
  dailyStartsRemaining: number;
  monthlyStartsRemaining: number;
  dailySuccessesRemaining: number;
  monthlySuccessesRemaining: number;
}

export interface LitePublicLimits {
  promptCharacters: number;
  conversationTurns: number;
  conversationCharacters: number;
  fields: number;
  logos: number;
  logoBytes: number;
}

export interface LiteStatusResponse {
  profile: 'lite';
  enabled: boolean;
  available: boolean;
  requiresSignIn: boolean;
  reason?: 'disabled' | 'sign-in' | 'not-configured' | 'capacity';
  supportedCategories: string[];
  /** The skin experiment's server flag - additive, so older servers simply omit it. */
  skinEnabled?: boolean;
  /** The skin vision judge's server flag - additive; the eval rig gates its judge calls on it. */
  skinJudgeEnabled?: boolean;
  limits: LitePublicLimits;
  allowance?: LiteAllowance;
}

export interface LiteOutcomeRequest {
  generationId: string;
  action: 'usable' | 'validation-failed' | 'accepted' | 'discarded';
  resolvedCategory?: string;
  validationRuleCodes?: string[];
  runtimeMs?: number;
  /** The enumerated set migration 0011's CHECK constraint allows, expressed ONCE in
   *  src/feedback/contract.ts. It used to be written out here, again in the endpoint validator,
   *  and again in the SQL - three copies of a list that has to agree, which is how a value
   *  ends up accepted by the endpoint and rejected by the database. */
  discardReason?: LiteDiscardReason;
}

export interface LiteOutcomeResponse {
  recorded: true;
}

export interface LiteVariantQualityPrior {
  variantId: string;
  intentKind: LiteLowerThirdIntentKind;
  accepted: number;
  discarded: number;
}
