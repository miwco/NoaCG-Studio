import { useMemo, useState } from 'react';
import type { StyleTag } from '../../../model/fonts';
import type { TemplateVariant } from '../../../model/wizard';
import { STYLE_FAMILY_LABELS } from '../../../model/taxonomy';
import ProjectFormatPicker from '../../ProjectFormatPicker';
import MiniPreview from '../MiniPreview';
import {
  draftFormatSelection,
  formatDraftPatch,
  type DraftPatch,
  type WizardDraft,
} from '../draft';

interface Props {
  variants: TemplateVariant[];
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
  onPickVariant: (variant: TemplateVariant) => void;
}

/** Every style family, in the order the chips offer them. The labels are the taxonomy's
 *  (model/taxonomy.ts STYLE_FAMILY_LABELS), not a second copy kept here: this step and the
 *  Browse step print the same facet, and two copies is how a rename half-lands. */
const STYLE_ORDER = Object.keys(STYLE_FAMILY_LABELS) as StyleTag[];

/** The discovery filters — every facet derives from variant metadata, so a new
 *  template family inherits filtering with no extra code. Ephemeral UI state
 *  (not part of the draft): re-entering the step starts from the full catalog. */
interface Filters {
  style: StyleTag | null;
  logo: boolean;
  manyLines: boolean;
}

const NO_FILTERS: Filters = { style: null, logo: false, manyLines: false };

function matches(v: TemplateVariant, f: Filters): boolean {
  if (f.style && v.styleTag !== f.style) return false;
  if (f.logo && v.logo === 'none') return false;
  if (f.manyLines && v.maxLines < 3) return false;
  return true;
}

/** Step 2 — pick the design (plus canvas format), narrowed by practical filters. */
export default function TemplateStep({ variants, draft, onDraft, onPickVariant }: Props) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  // Only offer chips that can actually narrow THIS category's catalog.
  const styleTags = useMemo(
    () => STYLE_ORDER.filter((t) => variants.some((v) => v.styleTag === t)),
    [variants],
  );
  const anyLogo = variants.some((v) => v.logo !== 'none');
  const anyManyLines = variants.some((v) => v.maxLines >= 3) && variants.some((v) => v.maxLines < 3);

  const filtered = variants.filter((v) => matches(v, filters));
  const active = filters.style !== null || filters.logo || filters.manyLines;

  return (
    <div>
      <ProjectFormatPicker
        value={draftFormatSelection(draft)}
        onChange={(selection) => onDraft(formatDraftPatch(selection))}
        idPrefix="legacy-template-format"
        description="The selected template will be authored for this project format."
      />

      {/* Discovery filters — style family, logo capability, line capacity. */}
      {(styleTags.length > 1 || anyLogo || anyManyLines) && (
        <div className="wz-filter-row" role="group" aria-label="Filter templates">
          {styleTags.length > 1 &&
            styleTags.map((t) => (
              <button
                key={t}
                className={`wz-filter ${filters.style === t ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, style: f.style === t ? null : t }))}
                title={`Only ${STYLE_FAMILY_LABELS[t]} designs`}
              >
                {STYLE_FAMILY_LABELS[t]}
              </button>
            ))}
          {anyLogo && (
            <button
              className={`wz-filter ${filters.logo ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, logo: !f.logo }))}
              title="Only designs with a logo slot (built-in or optional)"
            >
              ◨ Logo slot
            </button>
          )}
          {anyManyLines && (
            <button
              className={`wz-filter ${filters.manyLines ? 'active' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, manyLines: !f.manyLines }))}
              title="Only designs that take three or more text lines"
            >
              ☰ 3+ lines
            </button>
          )}
          {active && (
            <button className="wz-filter wz-filter-clear" onClick={() => setFilters(NO_FILTERS)}>
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Variant cards */}
      <div className="wz-variant-grid">
        {filtered.map((v) => (
          <button
            key={v.id}
            className={`wz-variant ${draft.variantId === v.id ? 'selected' : ''}`}
            onClick={() => onPickVariant(v)}
            title={v.description}
          >
            <MiniPreview variant={v} />
            <div className="wz-variant-cap">
              <strong>{v.name}</strong>
              <span className="wz-style-tag">{STYLE_FAMILY_LABELS[v.styleTag]}</span>
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="hint wz-filter-empty">
          No design matches these filters.{' '}
          <button className="wz-filter" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
        </p>
      )}
    </div>
  );
}
