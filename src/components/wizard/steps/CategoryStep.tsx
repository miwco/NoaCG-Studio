import { CATEGORIES, type TemplateCategory } from '../../../model/wizard';

interface Props {
  selected: TemplateCategory | null;
  onSelect: (category: TemplateCategory) => void;
}

const GROUPS: { id: 'essentials' | 'specials'; title: string; hint: string }[] = [
  { id: 'essentials', title: 'Essentials', hint: 'what almost every live show needs' },
  { id: 'specials', title: 'Specials', hint: 'for particular formats and moments' },
];

/** Step 1 — what kind of graphic are you making? Grouped: essentials first. */
export default function CategoryStep({ selected, onSelect }: Props) {
  return (
    <div>
      {GROUPS.map((group) => (
        <div key={group.id} className="wz-cat-group">
          <h3 className="wz-cat-group-title">
            {group.title} <span className="muted">— {group.hint}</span>
          </h3>
          <div className="wz-cat-grid">
            {CATEGORIES.filter((c) => c.group === group.id).map((cat) => (
              <button
                key={cat.id}
                className={`wz-cat ${selected === cat.id ? 'selected' : ''}`}
                disabled={!cat.available}
                onClick={() => onSelect(cat.id)}
                title={cat.description}
              >
                <div className="wz-cat-head">
                  <strong>{cat.name}</strong>
                  {cat.available ? (
                    <span className="wz-count">{cat.plannedCount}</span>
                  ) : (
                    <span className="wz-soon">coming soon</span>
                  )}
                </div>
                <span className="hint">{cat.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
