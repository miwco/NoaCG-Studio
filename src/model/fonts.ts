// Bundled open-source fonts (SIL Open Font License). The files live in public/fonts/ (served at
// /fonts/<file> in dev) and are copied into exported packages under fonts/<file>, so templates are
// fully offline at playout. Generated CSS contains a visible @font-face rule referencing the
// relative path "fonts/<file>" — teachable and 1:1 with the export.

export type StyleTag = 'minimal' | 'sport' | 'glass';

export interface BundledFont {
  id: string;
  /** CSS font-family name used in generated code. */
  family: string;
  /** File name under public/fonts/ (dev) and fonts/ (export). */
  file: string;
  /** Variable-font weight range covered by the file, e.g. [400, 800]. */
  weights: [number, number];
  /** Which style tags this font suits (used to order the wizard's font picker). */
  styleTags: StyleTag[];
  /** Fallback stack appended after the family in generated CSS. */
  fallback: string;
  /** Short flavor line shown in the wizard. */
  blurb: string;
}

export const FONTS: BundledFont[] = [
  {
    id: 'inter',
    family: 'Inter',
    file: 'inter.woff2',
    weights: [400, 800],
    styleTags: ['minimal', 'glass'],
    fallback: 'Arial, sans-serif',
    blurb: 'Neutral, crisp UI classic — never wrong.',
  },
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    file: 'space-grotesk.woff2',
    weights: [400, 700],
    styleTags: ['minimal', 'glass'],
    fallback: 'Arial, sans-serif',
    blurb: 'Modern grotesque with a technical edge.',
  },
  {
    id: 'manrope',
    family: 'Manrope',
    file: 'manrope.woff2',
    weights: [400, 800],
    styleTags: ['glass', 'minimal'],
    fallback: 'Arial, sans-serif',
    blurb: 'Soft, rounded, friendly — social/stream feel.',
  },
  {
    id: 'archivo',
    family: 'Archivo',
    file: 'archivo.woff2',
    weights: [400, 900],
    styleTags: ['sport', 'minimal'],
    fallback: 'Arial, sans-serif',
    blurb: 'Sturdy grotesque; heavy weights hit hard.',
  },
  {
    id: 'oswald',
    family: 'Oswald',
    file: 'oswald.woff2',
    weights: [400, 700],
    styleTags: ['sport'],
    fallback: '"Arial Narrow", Arial, sans-serif',
    blurb: 'Condensed broadcast workhorse — big names, tight space.',
  },
  {
    id: 'bebas-neue',
    family: 'Bebas Neue',
    file: 'bebas-neue.woff2',
    weights: [400, 400],
    styleTags: ['sport'],
    fallback: '"Arial Narrow", Arial, sans-serif',
    blurb: 'All-caps display impact; pair with a quiet body font.',
  },
];

export function fontById(id: string): BundledFont {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

/** The visible @font-face rule generated into template CSS (exports 1:1). */
export function fontFaceCss(font: BundledFont): string {
  return `/* Bundled open-source font (the file ships with the export — no internet at playout). */
@font-face {
  font-family: "${font.family}";
  src: url("fonts/${font.file}") format("woff2");
  font-weight: ${font.weights[0]} ${font.weights[1]};  /* variable font: covers this weight range */
  font-display: swap;          /* show fallback text until the font loads */
}`;
}

/** Full font-family value for CSS (family + fallback stack). */
export function fontStack(font: BundledFont): string {
  return `"${font.family}", ${font.fallback}`;
}

/** License note written into exported packages that bundle a font. */
export const FONT_LICENSE_NOTE = `# Font licenses

The fonts bundled in fonts/ are licensed under the SIL Open Font License 1.1 (OFL).
They may be bundled, redistributed, and used commercially, but not sold on their own.

Full license text: https://openfontlicense.org
Fonts sourced from Google Fonts (https://fonts.google.com).
`;
