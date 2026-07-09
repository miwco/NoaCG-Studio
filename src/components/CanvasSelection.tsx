// The canvas selection/hover overlay (Era 6): an amber outline + naming chip for the
// selected element, and a subtler outline + tag for the element under the pointer.
// Purely presentational and pointer-events: none — selection is editor UI state only;
// nothing here is ever written into the template or the export. Every label comes from
// the TemplatePart registry (model/structure.ts), so the canvas speaks exactly the same
// names as the timeline strip ("Whole graphic", "Panel", field titles, …).

/** A rect in CANVAS px (the preview iframe's internal, native-resolution space). */
export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  /** Screen px per canvas px (the iframe renders at native resolution, then scales). */
  scale: number;
  /** The canvas layer's on-screen width — keeps the chip/tag inside the stage. */
  width: number;
  selection: { rect: CanvasRect; label: string; hint?: string } | null;
  hover: { rect: CanvasRect; label: string } | null;
}

export default function CanvasSelection({ scale, width, selection, hover }: Props) {
  const toScreen = (r: CanvasRect) => ({
    left: r.left * scale,
    top: r.top * scale,
    width: r.width * scale,
    height: r.height * scale,
  });

  let hoverEls = null;
  if (hover) {
    const h = toScreen(hover.rect);
    hoverEls = (
      <>
        <div className="canvas-hover-outline" data-testid="canvas-hover" style={h} />
        <div
          className="canvas-hover-tag"
          data-testid="hover-tag"
          style={{ left: Math.max(2, Math.min(h.left, width - 120)), top: Math.max(2, h.top - 22) }}
        >
          {hover.label}
        </div>
      </>
    );
  }

  let selectionEls = null;
  if (selection) {
    const s = toScreen(selection.rect);
    // The chip prefers the spot just above the outline's top-left corner; when the
    // selection touches the top edge it flips below, and it never leaves the stage sideways.
    const chipTop = s.top > 34 ? s.top - 28 : s.top + s.height + 8;
    selectionEls = (
      <>
        <div className="canvas-selection-outline" data-testid="canvas-selection" style={s} />
        <div
          className="canvas-chip"
          data-testid="selection-chip"
          style={{ left: Math.max(2, Math.min(s.left, width - 220)), top: chipTop }}
        >
          <span className="canvas-chip-label">{selection.label}</span>
          {selection.hint && <span className="canvas-chip-hint">{selection.hint}</span>}
        </div>
      </>
    );
  }

  return (
    <>
      {hoverEls}
      {selectionEls}
    </>
  );
}
