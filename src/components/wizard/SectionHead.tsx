import { useState, type ReactNode } from 'react';

/**
 * ONE LINE PER THING, AND AN ⓘ FOR THE REST (owner, 2026-08-25 - docs/GOALS.md NOW goal 4).
 *
 * The rule the owner stated on the SVG walk: everything automatically visible is ONE LINE,
 * and anything more sits behind a small ⓘ per section that also says WHY the section is here
 * at all - "we should have a small eye for info or something like that where you can see what
 * this actually does and why it is here". So a section head is three things: the title, one
 * muted line saying what the section currently answers, and the ⓘ. The paragraphs that used
 * to sit under every heading move inside the ⓘ - they are the WHY, and nobody has to read
 * them to use the step.
 *
 * A button holding React state rather than a `<details>`: the disclosure sits INSIDE an h3,
 * where flow content is invalid, and the global closed-details rule (styles.css) is tuned for
 * form disclosures rather than an inline dot.
 */
export default function SectionHead({
  title,
  summary,
  testid,
  children,
}: {
  title: ReactNode;
  /** The one always-visible line: what this section currently says about the graphic. */
  summary?: ReactNode;
  testid?: string;
  /** The WHY - what this does and why it exists - shown only when the reader asks. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <h3 className="wz-sec-head">
        {title}
        {summary != null && <span className="muted">{summary}</span>}
        <button
          type="button"
          className={`wz-why-btn${open ? ' active' : ''}`}
          aria-expanded={open}
          title="What this does, and why it is here"
          onClick={() => setOpen((o) => !o)}
          data-testid={testid}
        >
          ⓘ
        </button>
      </h3>
      {open && (
        <div className="wz-why hint" data-testid={testid ? `${testid}-body` : undefined}>
          {children}
        </div>
      )}
    </>
  );
}
