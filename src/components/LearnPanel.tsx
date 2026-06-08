import { useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { explain } from '../teach/explain';
import type { ExplainCategory } from '../teach/knowledge';
import { CSS_REFERENCE, mdnUrl } from '../teach/cssReference';

const CAT_COLOR: Record<ExplainCategory, string> = {
  SPX: '#3aa0ff',
  CSS: '#4ec9b0',
  JS: '#dcb267',
  GSAP: '#c586c0',
  HTML: '#e06c75',
};

/** A few key concepts shown when the cursor isn't on anything recognizable yet. */
const GLOSSARY: { term: string; what: string }[] = [
  { term: 'play() / stop()', what: 'SPX takes the graphic on/off air.' },
  { term: 'update(data)', what: 'SPX sends the operator’s field values as JSON.' },
  { term: 'fN → id="fN"', what: 'Field f0 fills the element with id="f0".' },
  { term: 'SPXGCTemplateDefinition', what: 'Declares the data fields the operator sees.' },
  { term: 'position / left / top', what: 'Place elements on the 1920×1080 canvas.' },
];

/**
 * Teaching layer: explains the code under the editor cursor in short, beginner-friendly,
 * SPX-specific terms. Deterministic (offline) — see src/teach/knowledge.ts.
 */
export default function LearnPanel() {
  const ctx = useTemplateStore((s) => s.editorContext);
  const explanations = ctx ? explain(ctx) : [];
  const [openGroup, setOpenGroup] = useState<string | null>('Text');

  return (
    <div>
      <div className="panel-section">
        <h3>Learn</h3>
        <p className="hint">
          Click anywhere in the code editor. This panel explains what the code under your cursor does.
        </p>
      </div>

      {ctx && ctx.token && (
        <div className="panel-section">
          <span className="muted">
            Cursor on <code className="inline">{ctx.token}</code> ({ctx.tab.toUpperCase()})
          </span>
        </div>
      )}

      {explanations.length > 0 ? (
        explanations.map((e) => (
          <div className="panel-section learn-card" key={e.title}>
            <div className="learn-head">
              <span className="learn-badge" style={{ background: CAT_COLOR[e.category] }}>
                {e.category}
              </span>
              <strong>{e.title}</strong>
            </div>
            <p className="learn-body">{e.body}</p>
            {e.affects && (
              <p className="learn-affects">
                <span className="learn-affects-label">In the preview:</span> {e.affects}
              </p>
            )}
          </div>
        ))
      ) : (
        <div className="panel-section">
          {ctx && ctx.token ? (
            <p className="hint">
              No explanation for <code className="inline">{ctx.token}</code> yet — try clicking a CSS
              property, an SPX function, or a field id.
            </p>
          ) : (
            <p className="hint">Nothing selected yet.</p>
          )}
          <div className="learn-glossary">
            <div className="block-cat">Key concepts</div>
            {GLOSSARY.map((g) => (
              <div className="learn-gloss-row" key={g.term}>
                <code className="inline">{g.term}</code>
                <span className="muted">{g.what}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browsable CSS property reference. */}
      <div className="panel-section">
        <h3>CSS reference</h3>
        <p className="hint">Common properties grouped by purpose. Each links to the full MDN docs.</p>
        {CSS_REFERENCE.map((group) => {
          const open = openGroup === group.name;
          return (
            <div className="ref-group" key={group.name}>
              <button className="ref-group-head" onClick={() => setOpenGroup(open ? null : group.name)}>
                <span>{open ? '▾' : '▸'} {group.name}</span>
                <span className="muted" style={{ fontSize: 11 }}>{group.blurb}</span>
              </button>
              {open && (
                <div className="ref-props">
                  {group.props.map((p) => (
                    <div className="ref-prop" key={p.prop}>
                      <div className="ref-prop-head">
                        <code className="inline">{p.prop}</code>
                        <a className="ref-mdn" href={mdnUrl(p.prop)} target="_blank" rel="noreferrer">
                          MDN ↗
                        </a>
                      </div>
                      <div className="ref-prop-desc">{p.description}</div>
                      <code className="ref-prop-eg">{p.prop}: {p.example};</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
