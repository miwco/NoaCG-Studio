// DECLARED template metadata — the small hand-authored sliver of the discovery facets
// (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §11). Everything derivable is computed in
// templateMeta.ts; this file holds only what no canonical source can answer: which graphic
// category a template is, its subtype, its information structure, and what each field MEANS.
//
// Resolution order (templateMeta.ts): VARIANT_META[variant.id] → TYPE_META[variant.typeId]
// → CATEGORY_DEFAULT_META[variant.category]. The fallback is always single-valued
// (proposal §4), so a variant nobody has described yet still browses sanely.

import type { TemplateCategory } from '../model/wizard';
import type {
  CapabilityId,
  CoverageClass,
  FieldSemantic,
  GraphicCategoryId,
  StructureId,
} from '../model/taxonomy';

export interface DeclaredTemplateMeta {
  /** The ONE primary graphic category (predictable browsing). */
  category: GraphicCategoryId;
  /** From the category's controlled subtype list. */
  subtype?: string;
  structures: StructureId[];
  /** Overrides the category's default coverage class (proposal §8). */
  coverage?: CoverageClass;
  /** Field meanings. For typed variants keyed by the type's LOGICAL field key; the
   *  positional array form serves unclaimed variants (index = line index). */
  semantics?: Record<string, FieldSemantic>;
  positionalSemantics?: FieldSemantic[];
  /** Capabilities no derivation can see (proposal §7) — most derive in templateMeta.ts. */
  extraCapabilities?: CapabilityId[];
}

// ── Per-type declarations (cover the 48 type-compiled designs) ──────────────

export const TYPE_META: Record<string, DeclaredTemplateMeta> = {
  'lower-third': {
    category: 'lower-third', subtype: 'speaker', structures: ['name-role'],
    semantics: { name: 'name', title: 'role' },
  },
  'sponsor-bug': {
    category: 'bug', subtype: 'sponsor', structures: ['corner-chip', 'logo-text'],
    semantics: { caption: 'headline', logo: 'logo' },
  },
  'social-bug': {
    category: 'bug', subtype: 'social-handle', structures: ['corner-chip', 'single-line'],
    semantics: { handle: 'social-handle', platform: 'source' },
  },

  // ── The identity family (templates/types/identityBugs.ts) ──────────────────
  // All eight are `bug` graphics; the subtype is what an operator would call each one.
  'station-bug': {
    category: 'bug', subtype: 'station', structures: ['corner-chip', 'logo-text'],
    semantics: { channel: 'organization', show: 'topic', logo: 'logo' },
  },
  'live-bug': {
    category: 'bug', subtype: 'live', structures: ['corner-chip', 'single-line'],
    // The three mode words are operator copy, not three separate meanings: each is the
    // headline this bug shows while it is in that state.
    semantics: {
      status: 'headline', liveWord: 'headline', replayWord: 'headline', standbyWord: 'headline',
    },
    // The machine's three modes are the graphic's point — see identityBugs.ts.
    extraCapabilities: ['operator-states'],
  },
  'logo-bug': {
    category: 'bug', subtype: 'logo-only', structures: ['corner-chip', 'image-text'],
    semantics: { logo: 'logo' },
  },
  'sponsor-strip': {
    category: 'bug', subtype: 'sponsor', structures: ['strip', 'logo-text'],
    semantics: { kicker: 'headline', sponsor1: 'logo', sponsor2: 'logo', sponsor3: 'logo' },
  },
  'sponsor-rotator': {
    category: 'bug', subtype: 'sponsor', structures: ['corner-chip', 'logo-text'],
    semantics: { kicker: 'headline', sponsor1: 'logo', sponsor2: 'logo', sponsor3: 'logo' },
    // It advances on its own AND the operator can hold or skip it.
    extraCapabilities: ['sponsor-rotation', 'operator-states'],
  },
  'event-bug': {
    category: 'bug', subtype: 'event', structures: ['corner-chip', 'logo-text'],
    semantics: { event: 'headline', detail: 'description', logo: 'logo' },
  },
  'award-bug': {
    category: 'bug', subtype: 'award', structures: ['corner-chip', 'logo-text'],
    // Inverted hierarchy: the award word is the label, the category is what you read.
    semantics: { award: 'headline', category: 'topic', logo: 'logo' },
  },
  'status-chip': {
    category: 'bug', subtype: 'location', structures: ['corner-chip', 'single-line'],
    semantics: { place: 'location', status: 'headline' },
  },
  'countdown': {
    category: 'timer', subtype: 'countdown', structures: ['single-line'],
    semantics: { label: 'headline', minutes: 'duration' },
    extraCapabilities: ['countdown', 'pause-resume'],
  },
  'topic-card': {
    category: 'topic', subtype: 'topic', structures: ['multi-line'],
    semantics: { heading: 'headline', line1: 'description', line2: 'description' },
  },
  'title-card': {
    category: 'title', subtype: 'session-title', structures: ['multi-line'],
    semantics: { title: 'headline', kicker: 'topic', subtitle: 'description' },
  },
  'agenda': {
    category: 'list', subtype: 'agenda', structures: ['rows'],
    semantics: { rows: 'items', heading: 'headline' },
    extraCapabilities: ['repeating'],
  },
  'poll': {
    category: 'poll-quiz', subtype: 'poll-result', structures: ['bars'],
    semantics: { options: 'items', question: 'question' },
    extraCapabilities: ['poll-states', 'repeating'],
  },
  'holding-screen': {
    category: 'holding', subtype: 'starting', structures: ['full-panel'], coverage: 'full',
    semantics: { title: 'headline', show: 'topic', minutes: 'duration' },
    extraCapabilities: ['countdown', 'loop'],
  },
  'ticker': {
    category: 'ticker', subtype: 'rotator', structures: ['strip'], coverage: 'strip',
    semantics: { items: 'items', label: 'headline' },
    extraCapabilities: ['ticker', 'repeating', 'loop', 'pause-resume', 'operator-states'],
  },
  'scoreboard': {
    category: 'scoreboard', subtype: 'match-score', structures: ['strip', 'logo-text'],
    semantics: { teamA: 'team', scoreA: 'score', teamB: 'team', scoreB: 'score' },
    extraCapabilities: ['score-controls', 'clock', 'pause-resume', 'operator-states'],
  },
  'quiz-board': {
    category: 'poll-quiz', subtype: 'quiz-question', structures: ['rows', 'full-panel'],
    coverage: 'panel',
    semantics: {
      question: 'question', answerA: 'answer', answerB: 'answer', answerC: 'answer',
      answerD: 'answer', correctAnswer: 'answer', selectedAnswer: 'answer',
    },
    extraCapabilities: ['quiz-states', 'operator-states', 'multi-step'],
  },

  // ── The title / topic / information pack (templates/pack4/) ─────────────────
  // The seven shapes the opener and the topic card were being made to stand in for. Each names
  // the graphic CATEGORY an operator would browse it under — a now/next card is not a title, a
  // notice is not a topic — so they scatter across topic / quote / info / alert / list rather
  // than piling into one 'info' bucket.
  'now-next': {
    category: 'topic', subtype: 'now-playing', structures: ['multi-line'],
    semantics: { nowLabel: 'headline', now: 'topic', nowMeta: 'description', nextLabel: 'headline', next: 'topic' },
  },
  'headline-card': {
    category: 'quote', subtype: 'headline', structures: ['multi-line'],
    semantics: { kicker: 'topic', headline: 'headline', body: 'description', source: 'source' },
  },
  'process-steps': {
    category: 'info', subtype: 'step', structures: ['multi-line'],
    semantics: { heading: 'headline', step1: 'description', step2: 'description', step3: 'description', step4: 'description' },
    // Stepped by construction — the reveal is the graphic (TemplateVariant.defaultSteps).
    extraCapabilities: ['multi-step'],
  },
  'notice-card': {
    category: 'alert', subtype: 'notice', structures: ['multi-line'],
    semantics: { label: 'headline', headline: 'headline', body: 'description', action: 'description', contact: 'source' },
    // The parallel `level` group escalates and stands down while on air (briefings.ts).
    extraCapabilities: ['alert-state', 'operator-states'],
  },
  'statement-card': {
    category: 'quote', subtype: 'quote', structures: ['multi-line'],
    semantics: { label: 'headline', primary: 'description', secondary: 'description', attribution: 'source' },
  },
  'key-facts': {
    category: 'info', subtype: 'explainer', structures: ['rows'],
    semantics: { facts: 'items', heading: 'headline' },
    extraCapabilities: ['repeating'],
  },
  'recap-card': {
    category: 'list', subtype: 'order', structures: ['rows'],
    semantics: { items: 'items', heading: 'headline' },
    extraCapabilities: ['repeating'],
  },
  // ── The gap-list pack (types/commerce.ts, goals.ts, transitions.ts) ──
  'product-card': {
    category: 'product', subtype: 'product-card', structures: ['image-text', 'multi-line'],
    semantics: { product: 'headline', price: 'price', was: 'price', saving: 'discount', detail: 'description', image: 'image' },
  },
  'offer-card': {
    category: 'product', subtype: 'price', structures: ['multi-line'],
    semantics: { kicker: 'headline', offer: 'discount', detail: 'description', code: 'description', ends: 'date' },
  },
  'listing-card': {
    category: 'product', subtype: 'lot-bid', structures: ['image-text', 'multi-line'],
    semantics: { title: 'headline', meta: 'description', valueLabel: 'description', value: 'price', status: 'description', image: 'image' },
  },
  'qr-card': {
    category: 'cta', subtype: 'qr', structures: ['image-text', 'multi-line'],
    semantics: { headline: 'headline', address: 'url', detail: 'description', code: 'qr-content' },
  },
  'call-to-action': {
    category: 'cta', subtype: 'follow', structures: ['single-line', 'multi-line'],
    semantics: { action: 'headline', target: 'url', detail: 'description' },
  },
  'goal-meter': {
    category: 'progress', subtype: 'donation-goal', structures: ['bars'],
    semantics: { raised: 'amount', goal: 'amount', label: 'headline', unit: 'description' },
  },
  'milestone-track': {
    category: 'progress', subtype: 'milestone', structures: ['bars'],
    semantics: { milestones: 'items', current: 'amount', label: 'headline' },
  },
  'transition': {
    category: 'transition', subtype: 'stinger', structures: ['full-panel'], coverage: 'full',
    semantics: { label: 'headline' },
  },
  // ── The public-service pack (templates/alerts, templates/publicInfo) ────────
  // Neither type gets a graphic category of its own. An alert IS the `alert` category — the
  // same tile pack4's notice-card already browses under, which is the point: two designs of
  // the same graphic must not land on two tiles. The two-language notice is a TRANSLATION,
  // which is what the `caption` category's 'translation' subtype is for.
  'alert-level': {
    category: 'alert', subtype: 'warning', structures: ['strip', 'multi-line'],
    semantics: { headline: 'headline', detail: 'description', source: 'source' },
    // The four severity states are the graphic's point (types/alertLevel.ts).
    extraCapabilities: ['alert-state', 'operator-states'],
  },
  'public-notice': {
    category: 'caption', subtype: 'translation', structures: ['multi-line'], coverage: 'panel',
    semantics: {
      heading1: 'headline', notice1: 'description',
      heading2: 'headline', notice2: 'description', source: 'source',
    },
    // The languages take turns on the graphic's own timer, and the operator can hold one.
    extraCapabilities: ['operator-states'],
  },
};

// ── Per-variant declarations (the ~30 unclaimed hand-written designs where the
// ── category fallback would be wrong — proposal §4's split table) ───────────

export const VARIANT_META: Record<string, DeclaredTemplateMeta> = {
  // infographic split (§4): the fallback for the category is 'stats'.
  ig01: { category: 'stats', subtype: 'stat-panel', structures: ['single-line', 'bars'], positionalSemantics: ['headline', 'percentage'] },
  ig03: { category: 'results', subtype: 'leaderboard', structures: ['rows'], positionalSemantics: ['headline', 'items'], extraCapabilities: ['repeating'] },
  ig04: { category: 'poll-quiz', subtype: 'poll-result', structures: ['bars'], positionalSemantics: ['percentage', 'answer', 'question'], extraCapabilities: ['poll-states'] },
  ig05: { category: 'progress', subtype: 'donation-goal', structures: ['bars'], positionalSemantics: ['amount', 'amount', 'topic'], extraCapabilities: ['progress'] },
  ig07: { category: 'poll-quiz', subtype: 'vote', structures: ['bars', 'rows'], positionalSemantics: ['name', 'organization', 'percentage', 'name', 'organization', 'percentage', 'name', 'organization', 'percentage'], extraCapabilities: ['poll-states'] },
  // info-card split (§4): card04 turned out to be a QUOTE card (Quote + Name + Role) — the
  // quote category's first catalog content, found by the factory's schema-length assertion.
  card04: { category: 'quote', subtype: 'quote', structures: ['multi-line', 'name-role'], positionalSemantics: ['description', 'name', 'role'] },
  // The gap-list pack's four TYPELESS cards (docs/PACK_TAXONOMY.md, "known limitations"): a
  // family whose field COUNT varies cannot be one graphic type, so these stayed hand-written —
  // and a hand-written info-card falls to the category default, which files a venue marker and
  // a partner board as 'explainer'. Declared here so they browse as what they are.
  // card46/47 are LOCATION cards: the pin is a drawn marker over an operator-supplied picture,
  // never a plotted coordinate, which is why 'map-pin' and not 'map'.
  card46: { category: 'map', subtype: 'map-pin', structures: ['image-text', 'multi-line'], positionalSemantics: ['location', 'location', 'description', 'image'] },
  card47: { category: 'map', subtype: 'map-pin', structures: ['multi-line'], positionalSemantics: ['location', 'location', 'description'] },
  // card48/49 are SPONSOR boards — a strip of four slots and a 3 x 2 grid of six. Neither
  // rotates (the ticker type is the one that cycles, and it earns it with a real machine).
  card48: { category: 'sponsor', subtype: 'logo-strip', structures: ['strip', 'logo-text'], positionalSemantics: ['headline', 'logo', 'logo', 'logo', 'logo'] },
  card49: { category: 'sponsor', subtype: 'panel', structures: ['grid', 'logo-text'], positionalSemantics: ['headline', 'description', 'logo', 'logo', 'logo', 'logo', 'logo', 'logo'] },

  // ── The SPECIALIST lower thirds (templates/lowerThirds/specialist, ls01…ls32) ──
  //
  // These are declared per variant rather than left to the lower-third fallback, because the
  // fallback's single value is exactly what they are not: it calls every strap a two-field
  // 'speaker' with a 'name-role' structure, which would file a two-person interview strap, a
  // squad-number tag and a world clock as the same graphic. The subtype and structure here are
  // what let Browse tell them apart, and the positional semantics are what make the card's
  // field summary read truthfully ("Name · Role · Name · Role", not "Name · Role · Org").
  //
  // Interview — two people, equal billing.
  ls01: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls02: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls03: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  // Host & guest — the same two-person structure, deliberately unequal billing.
  ls04: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls05: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  // Commentary — the booth, named as a unit under its own header.
  ls06: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'multi-line'], positionalSemantics: ['headline', 'name', 'role', 'name', 'role'] },
  ls07: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'single-line'], positionalSemantics: ['headline', 'name', 'name'] },
  // Sport — the athlete.
  ls08: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['score', 'name', 'role', 'team'] },
  ls09: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'table'], positionalSemantics: ['name', 'team', 'score', 'score', 'score'] },
  ls10: { category: 'lower-third', subtype: 'name-tag', structures: ['logo-text', 'name-role'], positionalSemantics: ['name', 'role', 'team'] },
  // Esports — tags, handles and the desk.
  ls11: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['team', 'name', 'role', 'organization'] },
  ls12: { category: 'lower-third', subtype: 'speaker', structures: ['name-role'], positionalSemantics: ['social-handle', 'name', 'role'] },
  ls13: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'social-handle', 'name', 'social-handle'] },
  // Worship — the register that must not interrupt.
  ls14: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['role', 'name', 'organization'] },
  ls15: { category: 'lower-third', subtype: 'speaker', structures: ['multi-line', 'name-role'], positionalSemantics: ['topic', 'source', 'name', 'role'] },
  ls16: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['topic', 'name', 'role'] },
  // Academic — the person and the institution behind them.
  ls17: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['name', 'role', 'role', 'organization'] },
  ls18: { category: 'lower-third', subtype: 'speaker', structures: ['logo-text', 'name-role'], positionalSemantics: ['name', 'role', 'organization'] },
  ls19: { category: 'lower-third', subtype: 'speaker', structures: ['multi-line', 'name-role'], positionalSemantics: ['topic', 'name', 'organization', 'time'] },
  // Politics — the party colour is the identity.
  ls20: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['organization', 'name', 'location', 'percentage'] },
  ls21: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role'], positionalSemantics: ['name', 'organization', 'location'] },
  ls22: { category: 'lower-third', subtype: 'speaker', structures: ['name-role'], positionalSemantics: ['name', 'role', 'organization'] },
  // Analysis — marking interpretation, and marking expertise.
  ls23: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['headline', 'name', 'role', 'topic'] },
  ls24: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['topic', 'name', 'role'] },
  // Music — the track, the billing, and the programme.
  ls25: { category: 'lower-third', subtype: 'name-tag', structures: ['image-text', 'multi-line'], positionalSemantics: ['topic', 'name', 'description'] },
  ls26: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['name', 'topic', 'location'] },
  ls27: { category: 'lower-third', subtype: 'name-tag', structures: ['multi-line', 'name-role'], positionalSemantics: ['score', 'topic', 'name', 'duration'] },
  // Live & location — where, and when.
  ls28: { category: 'lower-third', subtype: 'live-tag', structures: ['single-line', 'multi-line'], positionalSemantics: ['headline', 'location', 'location'] },
  ls29: { category: 'lower-third', subtype: 'locator', structures: ['name-role', 'multi-line'], positionalSemantics: ['location', 'name', 'role'] },
  // ls30's fourth field is the hidden UTC offset the clock runtime reads — an input-only
  // value, but a real DataField, so the positional array has to account for it.
  ls30: { category: 'lower-third', subtype: 'locator', structures: ['single-line', 'multi-line'], positionalSemantics: ['location', 'time', 'description', 'duration'] },
  // Creator — handles and stream identity.
  ls31: { category: 'lower-third', subtype: 'name-tag', structures: ['multi-line', 'single-line'], positionalSemantics: ['name', 'description', 'social-handle', 'social-handle', 'social-handle'] },
  ls32: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['social-handle', 'name', 'headline', 'amount'] },

  // ── The PUBLIC-SERVICE pack's tickers (tk11…tk17, tk20) ────────────────────
  //
  // The ticker fallback calls every strip a 'news-ticker', which is right for the wire strips
  // it was written for and wrong for these: a travelling crawl, an index board and a
  // double-decker are three things an operator picks between by name. tk18/tk19 are compiled
  // by the `ticker` TYPE and browse as 'rotator' from there.
  tk11: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'topic', 'source'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  tk12: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'headline'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  tk13: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'headline', 'topic'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  tk14: { category: 'ticker', subtype: 'market-ticker', structures: ['strip'], positionalSemantics: ['items', 'headline', 'topic'], extraCapabilities: ['ticker', 'repeating', 'loop', 'live-data'] },
  tk15: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'headline', 'source'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  tk16: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'headline'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  tk17: { category: 'ticker', subtype: 'crawl', structures: ['strip'], positionalSemantics: ['items', 'headline', 'source'], extraCapabilities: ['ticker', 'repeating', 'loop'] },
  // The double-decker holds the current story STILL above the crawl, which is what makes it a
  // news ticker rather than one more crawl.
  tk20: { category: 'ticker', subtype: 'news-ticker', structures: ['strip', 'multi-line'], positionalSemantics: ['items', 'topic', 'headline'], extraCapabilities: ['ticker', 'repeating', 'loop'] },

  // ── The PUBLIC-SERVICE pack's alerts (templates/alerts) ────────────────────
  //
  // al01/al02/al04 take the `alert-level` TYPE_META above unchanged. The three declared here
  // are the ones whose SHAPE differs from the flat band: a contained corner panel, a
  // met-office card, and the card that takes the whole frame.
  al03: { category: 'alert', subtype: 'warning', structures: ['multi-line'], coverage: 'panel', semantics: { headline: 'headline', detail: 'description', source: 'source' }, extraCapabilities: ['alert-state', 'operator-states'] },
  al05: { category: 'alert', subtype: 'warning', structures: ['multi-line'], coverage: 'panel', semantics: { headline: 'headline', detail: 'description', source: 'source' }, extraCapabilities: ['alert-state', 'operator-states'] },
  al06: { category: 'alert', subtype: 'emergency', structures: ['full-panel', 'multi-line'], coverage: 'full', semantics: { headline: 'headline', detail: 'description', source: 'source' }, extraCapabilities: ['alert-state', 'operator-states'] },
  // The four single-state notices. None carries a severity flag, so none claims 'alert-state':
  // the capability facet has to mean the graphic really offers the ladder.
  al07: { category: 'alert', subtype: 'status', structures: ['strip', 'multi-line'], positionalSemantics: ['description', 'description'] },
  al08: { category: 'alert', subtype: 'status', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description'], extraCapabilities: ['clock'] },
  al09: { category: 'alert', subtype: 'breaking', structures: ['strip', 'multi-line'], positionalSemantics: ['topic', 'headline', 'source'] },
  al10: { category: 'alert', subtype: 'notice', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'time'] },

  // ── The PUBLIC-SERVICE pack's public information (templates/publicInfo) ────
  //
  // These SCATTER, which is why every one of them is declared. An official notice is an alert
  // in everything but tone; a numbered instruction and a page of small print are information
  // cards; a bilingual panel is a translation; a source label is a corner bug. Filing all nine
  // under one tile would have put pi01 on a different tile from pack4's notice-card, which is
  // the same graphic. pi08/pi09 come from the `public-notice` TYPE_META above.
  pi01: { category: 'alert', subtype: 'notice', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'organization'] },
  pi02: { category: 'info', subtype: 'step', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'description', 'description', 'organization'], extraCapabilities: ['multi-step'] },
  pi03: { category: 'bug', subtype: 'source', structures: ['corner-chip', 'single-line'], coverage: 'overlay', positionalSemantics: ['source', 'description'] },
  pi04: { category: 'info', subtype: 'disclaimer', structures: ['strip'], coverage: 'strip', positionalSemantics: ['description', 'source'] },
  pi05: { category: 'alert', subtype: 'notice', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'description', 'organization'] },
  pi06: { category: 'info', subtype: 'explainer', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'description', 'organization'] },
  pi07: { category: 'caption', subtype: 'translation', structures: ['multi-line'], coverage: 'panel', positionalSemantics: ['headline', 'description', 'headline', 'description', 'organization'] },
};

// ── Per-old-category fallback (single-valued, proposal §4) ──────────────────

export const CATEGORY_DEFAULT_META: Record<TemplateCategory, DeclaredTemplateMeta | null> = {
  'lower-third': {
    category: 'lower-third', subtype: 'speaker', structures: ['name-role'],
    positionalSemantics: ['name', 'role', 'organization', 'description', 'description'],
  },
  'ticker': {
    category: 'ticker', subtype: 'news-ticker', structures: ['strip'],
    positionalSemantics: ['items', 'headline'],
    extraCapabilities: ['ticker', 'repeating', 'loop'],
  },
  'alert': {
    category: 'alert', subtype: 'warning', structures: ['strip', 'multi-line'],
    positionalSemantics: ['headline', 'description', 'source'],
  },
  // Single-valued, like every fallback — the nine shipped designs each declare what they
  // really are in VARIANT_META above, and an information card is what an undeclared one is
  // most likely to be.
  'public-info': {
    category: 'info', subtype: 'explainer', structures: ['multi-line'], coverage: 'panel',
    positionalSemantics: ['headline', 'description', 'description', 'description', 'organization'],
  },
  'scoreboard': {
    category: 'scoreboard', subtype: 'match-score', structures: ['strip', 'logo-text'],
    positionalSemantics: ['team', 'score', 'team', 'score'],
    extraCapabilities: ['score-controls'],
  },
  'info-card': {
    category: 'info', subtype: 'explainer', structures: ['multi-line'],
    positionalSemantics: ['headline', 'description', 'description', 'description', 'description'],
  },
  'starting-soon': {
    category: 'holding', subtype: 'starting', structures: ['full-panel'], coverage: 'full',
    positionalSemantics: ['headline', 'topic', 'duration'],
    extraCapabilities: ['countdown', 'loop'],
  },
  'end-credits': {
    category: 'credits', subtype: 'end-credits', structures: ['rows'], coverage: 'full',
    positionalSemantics: ['items', 'headline', 'logo'],
    extraCapabilities: ['repeating'],
  },
  'corner-bug': {
    category: 'bug', subtype: 'sponsor', structures: ['corner-chip', 'logo-text'],
    positionalSemantics: ['headline', 'logo'],
  },
  'infographic': {
    category: 'stats', subtype: 'stat-panel', structures: ['bars'],
    positionalSemantics: ['headline', 'percentage'],
  },
  'game-timer': {
    category: 'timer', subtype: 'countdown', structures: ['single-line'],
    positionalSemantics: ['headline', 'duration'],
    extraCapabilities: ['countdown'],
  },
  'versus': {
    category: 'reveal', subtype: 'versus', structures: ['two-person', 'full-panel'], coverage: 'full',
    positionalSemantics: ['team', 'team', 'headline', 'logo', 'logo'],
  },
  'quiz': {
    category: 'poll-quiz', subtype: 'quiz-question', structures: ['rows', 'full-panel'],
    positionalSemantics: ['question', 'answer', 'answer', 'answer', 'answer', 'answer'],
    extraCapabilities: ['quiz-states', 'multi-step'],
  },
  'frame': {
    category: 'frame', subtype: 'webcam', structures: ['media-frame'], coverage: 'frame',
    positionalSemantics: ['headline', 'name'],
  },
  'transition': {
    category: 'transition', subtype: 'stinger', structures: ['full-panel'], coverage: 'full',
    positionalSemantics: ['headline'],
  },
  'esports-score': {
    category: 'scoreboard', subtype: 'simple-score', structures: ['strip', 'logo-text'],
    positionalSemantics: ['team', 'score', 'team', 'score'],
  },
  'matchup': {
    category: 'reveal', subtype: 'versus', structures: ['two-person', 'full-panel'], coverage: 'full',
    positionalSemantics: ['team', 'team', 'headline'],
  },
  'results-board': {
    category: 'results', subtype: 'leaderboard', structures: ['table', 'rows'],
    positionalSemantics: ['items', 'headline'],
  },
  'reveal': {
    category: 'reveal', subtype: 'winner', structures: ['full-panel'], coverage: 'full',
    positionalSemantics: ['headline', 'name'],
  },
  'poll': {
    category: 'poll-quiz', subtype: 'vote', structures: ['rows', 'full-panel'],
    positionalSemantics: ['headline', 'items'],
  },
  'audience': {
    category: 'question', subtype: 'viewer-question', structures: ['multi-line'],
    positionalSemantics: ['question', 'name', 'source'],
  },
  'imported-design': null, // user content — never browsable
};

/** Field ids that are hidden CONFIG inputs, excluded from the visible-field buckets
 *  (proposal §6.1). Keyed by wizard category because these are fixed per-category field
 *  contracts (self-assembled categories). */
export const HIDDEN_CONFIG_FIELDS: Partial<Record<TemplateCategory, string[]>> = {
  'game-timer': ['f1'],
  'starting-soon': ['f2'],
  'quiz': ['f5', 'f6'],
};
