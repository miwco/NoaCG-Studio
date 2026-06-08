// Curated, offline CSS property reference for the Learn tab and the Blocks "suggested property"
// chips. Grouped by purpose; each entry has a short description, an example value, and links to
// MDN for the full details. This is the single source for both surfaces — we never bundle or
// fetch MDN content (offline-first), we deep-link to it.

export interface CssProp {
  prop: string;
  description: string;
  example: string; // a sensible example value, also inserted by the suggestion chips
  chip?: boolean; // surface as a quick "add a property" chip after inserting a block
}

export interface CssGroup {
  name: string;
  blurb: string;
  props: CssProp[];
}

export const CSS_REFERENCE: CssGroup[] = [
  {
    name: 'Text',
    blurb: 'How the words look.',
    props: [
      { prop: 'color', description: 'Text colour.', example: '#ffffff', chip: true },
      { prop: 'font-size', description: 'How large the text is.', example: '48px', chip: true },
      { prop: 'font-weight', description: 'Boldness: 400 normal, 700 bold, up to 900.', example: '700', chip: true },
      { prop: 'font-family', description: 'Which typeface to use (add brand fonts in the Brand tab).', example: '"Open Sans", Arial, sans-serif' },
      { prop: 'line-height', description: 'Vertical spacing between wrapped lines.', example: '1.2' },
      { prop: 'letter-spacing', description: 'Tracking between letters; small positive suits caps.', example: '0.04em', chip: true },
      { prop: 'text-transform', description: 'UPPERCASE, lowercase, or Capitalize.', example: 'uppercase', chip: true },
      { prop: 'text-align', description: 'Horizontal alignment of text.', example: 'center', chip: true },
      { prop: 'white-space', description: 'Wrapping; "nowrap" keeps a lower third on one line.', example: 'nowrap' },
      { prop: 'text-shadow', description: 'Shadow for legibility over moving video.', example: '0 2px 8px rgba(0,0,0,0.6)', chip: true },
    ],
  },
  {
    name: 'Box & background',
    blurb: 'The panel/bar behind your content.',
    props: [
      { prop: 'background', description: 'Background colour, gradient, or image.', example: 'rgba(10,14,22,0.88)', chip: true },
      { prop: 'padding', description: 'Space inside the element, around its content.', example: '14px 28px', chip: true },
      { prop: 'border-radius', description: 'Rounded corners.', example: '6px', chip: true },
      { prop: 'border', description: 'An outline: width, style, colour.', example: '2px solid #ffffff' },
      { prop: 'border-left', description: 'An accent strip on one edge (common in lower thirds).', example: '8px solid #ffd32a' },
      { prop: 'box-shadow', description: 'A drop shadow to lift the box off the video.', example: '0 10px 40px rgba(0,0,0,0.4)' },
    ],
  },
  {
    name: 'Position & size',
    blurb: 'Where it sits on the 1920×1080 canvas.',
    props: [
      { prop: 'left', description: 'Distance from the left edge (with position: absolute).', example: '120px' },
      { prop: 'top', description: 'Distance from the top edge.', example: '80px' },
      { prop: 'right', description: 'Distance from the right edge.', example: '80px' },
      { prop: 'bottom', description: 'Distance from the bottom edge (handy for lower thirds).', example: '160px' },
      { prop: 'width', description: 'Element width.', example: '600px' },
      { prop: 'height', description: 'Element height.', example: '200px' },
      { prop: 'z-index', description: 'Stacking order — higher numbers render on top.', example: '10' },
    ],
  },
  {
    name: 'Effects',
    blurb: 'Extra polish.',
    props: [
      { prop: 'opacity', description: '0 fully transparent … 1 fully solid.', example: '1', chip: true },
      { prop: 'transform', description: 'Move/scale/rotate without affecting layout.', example: 'translateY(-4px)' },
      { prop: 'filter', description: 'Visual filters: blur, brightness, drop-shadow…', example: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' },
      { prop: 'backdrop-filter', description: 'Blur/treat whatever is behind the element.', example: 'blur(8px)' },
    ],
  },
];

export const MDN_BASE = 'https://developer.mozilla.org/en-US/docs/Web/CSS/';
export function mdnUrl(prop: string): string {
  return MDN_BASE + prop;
}

/** The flat set of properties surfaced as quick chips after inserting a block. */
export const CHIP_PROPS: CssProp[] = CSS_REFERENCE.flatMap((g) => g.props).filter((p) => p.chip);
