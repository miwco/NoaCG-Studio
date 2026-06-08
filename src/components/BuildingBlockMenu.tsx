import { useMemo, useState } from 'react';
import { BUILDING_BLOCKS, type BuildingBlock } from '../blocks/registry';
import { lastInsertedSelector, setCssDeclaration } from '../blocks/edit';
import { CHIP_PROPS } from '../teach/cssReference';
import { useTemplateStore, type EditorTab } from '../store/templateStore';

/** Hierarchical menu location for a block (falls back to a sensible default from its category). */
function pathOf(b: BuildingBlock): string[] {
  if (b.path) return b.path;
  if (b.category === 'Animation') return ['Animation', b.id.startsWith('gsap') ? 'GSAP' : 'CSS'];
  if (b.category === 'Fields') return ['Text & data'];
  if (b.category === 'Elements') return ['Elements'];
  return ['Layouts'];
}

/** Editor tab to reveal after applying a block. */
function tabOf(b: BuildingBlock): EditorTab {
  if (b.primaryTab) return b.primaryTab;
  if (b.category === 'Animation') return b.id.startsWith('gsap') ? 'js' : 'css';
  if (b.id === 'countdown') return 'js';
  return 'html';
}

function startsWith(path: string[], prefix: string[]): boolean {
  return prefix.every((seg, i) => path[i] === seg);
}

/**
 * Building blocks — a guided, hierarchical menu (decision tree) rather than a flat grid.
 * Each block inserts clean, commented code; applying jumps to the relevant editor tab and
 * offers a one-click Undo (Ctrl/Cmd+Z also works).
 */
export default function BuildingBlockMenu() {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const setLastInserted = useTemplateStore((s) => s.setLastInserted);
  const lastInserted = useTemplateStore((s) => s.lastInserted);
  const undo = useTemplateStore((s) => s.undo);
  const historyLen = useTemplateStore((s) => s.history.length);

  const [crumbs, setCrumbs] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const apply = (block: BuildingBlock) => {
    const tab = tabOf(block);
    const next = block.apply(template);
    applyTemplate(next);
    setActiveTab(tab);
    setLastInserted({ selector: lastInsertedSelector(next.html), tab });
    setToast(block.label);
  };

  // Insert a suggested property into the rule the last block created.
  const addProperty = (prop: string, example: string) => {
    if (!lastInserted?.selector) return;
    applyTemplate({ ...template, css: setCssDeclaration(template.css, lastInserted.selector, prop, example) });
    setActiveTab('css');
    setToast(prop);
  };

  // Search across the whole tree.
  const searchResults = useMemo(() => {
    if (!searching) return [];
    return BUILDING_BLOCKS.filter((b) => {
      const hay = [b.label, b.description, ...(b.keywords ?? []), ...pathOf(b)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [q, searching]);

  // Blocks at or under the current location.
  const inScope = BUILDING_BLOCKS.filter((b) => startsWith(pathOf(b), crumbs));
  const subGroups = [
    ...new Set(inScope.filter((b) => pathOf(b).length > crumbs.length).map((b) => pathOf(b)[crumbs.length])),
  ];
  const leafBlocks = inScope.filter((b) => pathOf(b).length === crumbs.length);

  const countUnder = (seg: string) => inScope.filter((b) => pathOf(b)[crumbs.length] === seg).length;

  const BlockButton = ({ block }: { block: BuildingBlock }) => (
    <button className="block-btn" onClick={() => apply(block)} title={block.description}>
      <span className="b-title">{block.label}</span>
      <span className="b-desc">{block.description}</span>
    </button>
  );

  return (
    <div>
      <div className="panel-section">
        <h3>Building blocks</h3>
        <input
          className="block-search"
          type="search"
          placeholder="Search blocks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching ? (
        <div className="panel-section">
          <div className="block-cat">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</div>
          <div className="block-grid">
            {searchResults.map((b) => (
              <BlockButton key={b.id} block={b} />
            ))}
          </div>
          {searchResults.length === 0 && <p className="hint">No blocks match “{query}”.</p>}
        </div>
      ) : (
        <div className="panel-section">
          {/* Breadcrumb */}
          <div className="block-breadcrumb">
            <button className="crumb" onClick={() => setCrumbs([])}>
              All
            </button>
            {crumbs.map((c, i) => (
              <span key={c}>
                <span className="crumb-sep">›</span>
                <button className="crumb" onClick={() => setCrumbs(crumbs.slice(0, i + 1))}>
                  {c}
                </button>
              </span>
            ))}
          </div>

          {/* Sub-groups at this level */}
          {subGroups.length > 0 && (
            <div className="block-groups">
              {subGroups.map((g) => (
                <button key={g} className="block-group" onClick={() => setCrumbs([...crumbs, g])}>
                  <span className="bg-name">{g}</span>
                  <span className="bg-count">{countUnder(g)} ›</span>
                </button>
              ))}
            </div>
          )}

          {/* Blocks that live exactly at this level */}
          {leafBlocks.length > 0 && (
            <div className="block-grid" style={{ marginTop: subGroups.length ? 12 : 0 }}>
              {leafBlocks.map((b) => (
                <BlockButton key={b.id} block={b} />
              ))}
            </div>
          )}
        </div>
      )}

      {lastInserted?.selector && !searching && (
        <div className="panel-section chip-section">
          <div className="block-cat">
            Add a property to <code className="inline">{lastInserted.selector}</code>
          </div>
          <div className="chip-row">
            {CHIP_PROPS.map((p) => (
              <button
                key={p.prop}
                className="prop-chip"
                title={`${p.description}  (inserts ${p.prop}: ${p.example})`}
                onClick={() => addProperty(p.prop, p.example)}
              >
                + {p.prop}
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            See the <strong>Learn</strong> tab for the full CSS reference.
          </p>
        </div>
      )}

      {toast && (
        <div className="block-toast">
          <span>✓ Added <strong>{toast}</strong></span>
          <button
            className="link-btn"
            onClick={() => {
              undo();
              setToast(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      {!toast && historyLen > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          Tip: press <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo the last block.
        </p>
      )}
    </div>
  );
}
