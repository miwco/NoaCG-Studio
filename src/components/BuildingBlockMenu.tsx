import { useState } from 'react';
import { BLOCK_CATEGORIES, BUILDING_BLOCKS } from '../blocks/registry';
import { useTemplateStore } from '../store/templateStore';

/**
 * Deterministic building blocks. Clicking a block edits the visible code (and definition),
 * so users learn the structure rather than getting hidden magic.
 */
export default function BuildingBlockMenu() {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  return (
    <div>
      <div className="panel-section">
        <h3>Building blocks</h3>
        <p className="hint">
          Each block inserts clean, commented code into the editor. Switch to the relevant tab to see
          what changed.
        </p>
      </div>

      {BLOCK_CATEGORIES.map((cat) => (
        <div key={cat}>
          <div className="block-cat">{cat}</div>
          <div className="block-grid">
            {BUILDING_BLOCKS.filter((b) => b.category === cat).map((block) => (
              <button
                key={block.id}
                className="block-btn"
                onClick={() => {
                  applyTemplate(block.apply(template));
                  setLastApplied(block.label);
                }}
                title={block.description}
              >
                <span className="b-title">{block.label}</span>
                <span className="b-desc">{block.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {lastApplied && (
        <p className="hint" style={{ marginTop: 14 }}>
          ✓ Added <strong>{lastApplied}</strong> to the template.
        </p>
      )}
    </div>
  );
}
