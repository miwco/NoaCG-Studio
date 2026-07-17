// Design DNA reference cards: compact craft vocabularies distilled from NoaCG's shipped
// SPX template families (docs/DESIGN_LANGUAGE.md §8 tokens + the catalog's signature
// reveals) plus two genre worlds the catalog implies. Picked per brief by keyword (free,
// deterministic - same posture as skills.ts) and injected into the Motion Director's
// prompt as INSPIRATION: sibling graphics from the same product, never the answer. The
// injection text requires an ORIGINAL design; the brief always outranks the reference.

export interface ReferenceCard {
  id: string;
  keywords: RegExp;
  card: string;
}

export const REFERENCE_CARDS: ReferenceCard[] = [
  {
    id: 'minimal',
    keywords: /minimal|clean|simple|elegant|subtle|quiet|nordic|scandi|modern/i,
    card: `MINIMAL family - whitespace does the design work: hairline accents (2-4px lines,
short underlines), panels absent or a 1px keyline rgba(255,255,255,0.14), radius 0-2px,
normal-width type at weights 400-700, expo/power-curve reveals with text sliding from
behind masked lines. Alignment is strict; margins are optically balanced.`,
  },
  {
    id: 'sport',
    keywords: /sport|match|team|derby|versus|vs\b|league|goal|esport|energy|fast|aggressive/i,
    card: `SPORT family - impact through geometry: solid slabs skewed about -8deg, 0 radius,
hard offset shadows (a sticker-slab look), condensed heavy caps with 0.02-0.1em tracking
on labels, bold accent slabs as LIT surfaces (same-hue shading + edge keylines where
slabs meet), snap entrances at or under 0.5s, x-slides that carry their skew.`,
  },
  {
    id: 'glass',
    keywords: /glass|frosted|translucent|soft|stream|social|friendly|rounded/i,
    card: `GLASS family - soft depth: translucent panels rgba(255,255,255,0.08-0.14) with
heavy backdrop blur (≈18px) and a 1px inner keyline rgba(255,255,255,0.18), radius
14-18px, one soft wide shadow (0 20px 60px rgba(0,0,0,0.35)), dot/ring/gradient-edge
accents, rounded families at weights 500-800, back-overshoot pops and blur-in reveals.`,
  },
  {
    id: 'noacg-house',
    keywords: /noacg|house style|control.room|on.air look/i,
    card: `NOACG HOUSE family (only when the brief asks for the NoaCG look) - dark
control-room: void near-black panels rgba(10,12,16,0.86-0.92) with subtle backdrop blur,
ONE amber #f6a623 accent as an 8px bar fused to a panel edge, restrained amber glow on
accent elements only, display type at 700 with -0.01/-0.02em tracking, mono small-caps
labels tracked 0.14-0.28em, controlled newsroom expo reveals - the glow never animates
on its own.`,
  },
  {
    id: 'editorial-warm',
    keywords: /warm|cooking|kitchen|food|cozy|morning|lifestyle|documentary|editorial|film|cinematic|elegant serif/i,
    card: `EDITORIAL-WARM world - daylight premium: paper/cream/earth/amber palettes built
in layered same-hue depth (never one flat wall), serif or humanist display faces, thin
drawn rules and small hand-crafted flourishes, slow confident reveals with gentle
parallax between layers, generous air around the type.`,
  },
  {
    id: 'celebration',
    keywords: /award|winner|celebrat|gala|reveal the winner|champion|anniversary|premiere/i,
    card: `CELEBRATION world - the big moment: deep stage darks with ONE metallic (gold or
silver) doing generous work, shimmer/particle fields BEHIND the hero, chip/badge labels,
a spotlight or bloom timed to the reveal beat, decisive holds - grandeur through light
and timing, not through clutter.`,
  },
];

/** Pick reference cards by keyword (max 2; none is a valid outcome). */
export function detectReferenceCards(prompt: string): ReferenceCard[] {
  return REFERENCE_CARDS.filter((c) => c.keywords.test(prompt)).slice(0, 2);
}

/** The Director-prompt section for the picked cards ('' when none matched). */
export function referenceSection(cards: ReferenceCard[]): string {
  if (cards.length === 0) return '';
  return `## Design DNA from NoaCG's shipped broadcast templates (inspiration, NOT the answer)
These are craft vocabularies of sibling graphics from this product. Borrow materials,
geometry, and motion character where they serve the brief - and design an ORIGINAL piece
that could sit next to them. The brief always outranks the reference; ignore a card that
fights it.

${cards.map((c) => c.card).join('\n\n')}`;
}
