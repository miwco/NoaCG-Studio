import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import {
  frameGraphic,
  framingTransform,
  measureGraphicBox,
  type GraphicBox,
} from '../../preview/frameGraphic';
import type { TemplateVariant } from '../../model/wizard';
import type { SpxTemplate } from '../../model/types';

/**
 * A small settled-state render for picker cards.
 * Loads the real template and jumps the entrance timeline to its end (no animation),
 * so every card shows the true on-air look without ten timelines running at once.
 *
 * FRAMED ON THE GRAPHIC, not on the canvas — the shared recipe in preview/frameGraphic.ts, so a
 * picker card, Home's library card and the big preview's "⌖ Zoom to graphic" (WizardPreview.tsx)
 * all agree about what a design looks like.
 *
 * Two sources, one render. A `variant` is BUILT here and only once the card scrolls into view,
 * because Browse can put the whole catalog on one grid. A `template` is already built — the AI
 * step's three alternatives — and is shown as-is. Sharing this component is what makes an AI
 * alternative and a catalog design look like the same kind of choice.
 */

interface MiniWindow extends Window {
  buildInTimeline?: () => { progress: (n: number) => void };
}

type Props =
  | { variant: TemplateVariant; template?: never }
  | { template: SpxTemplate; variant?: never };

export default function MiniPreview({ variant, template: built }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Mount the iframe only once the card scrolls into view (the GraphicThumb recipe): the
  // Browse step can show the whole catalog at once, and building + parsing GSAP for every
  // off-screen tile would make opening it a page-long stall.
  //
  // A ready-made `template` skips that gate. There are only ever a few of them, they cost no
  // build, and they sit below the fold of a scrolling step — waiting for an intersection
  // there means the cards a user scrolls down TO ARE the reason they scrolled, shown empty.
  const [visible, setVisible] = useState(Boolean(built));
  useEffect(() => {
    if (built) return;
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [built]);
  const template = useMemo(
    () => (visible ? (built ?? variant?.create() ?? null) : null),
    [built, variant, visible],
  );
  const doc = useMemo(() => (template ? composeDocument(template) : ''), [template]);
  const { width, height } = template?.resolution ?? { width: 1920, height: 1080 };
  const [box, setBox] = useState<GraphicBox | null>(null);
  // The card's own size, MEASURED: the grid reflows with the wizard's width, and a hard-coded
  // guess here silently mis-frames every tile the day the layout changes.
  const [card, setCard] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCard({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const settle = () => {
    const w = ref.current?.contentWindow as MiniWindow | null;
    try {
      w?.buildInTimeline?.().progress(1); // jump straight to the settled on-air state
    } catch {
      /* preview is best-effort */
    }
    // Measure AFTER settling — mid-entrance a graphic can still sit off-canvas.
    setBox(measureGraphicBox(ref.current));
  };

  const framing = frameGraphic(box, { width, height }, card);

  return (
    <div className="wz-mini" ref={cardRef}>
      {visible && (
        <iframe
          ref={ref}
          title={`${built?.name ?? variant?.name ?? 'Design'} preview`}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={doc}
          onLoad={() => setTimeout(settle, 40)}
          tabIndex={-1}
          style={{ width, height, transform: framingTransform(framing) }}
        />
      )}
    </div>
  );
}
