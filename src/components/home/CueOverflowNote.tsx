import { overflowNote } from '../../control/controlModel';
import type { FieldDescriptor } from '../../model/fieldModel';

/**
 * THE VALUES THAT DO NOT FIT, for the cue the editor is actually pointed at.
 *
 * Two monitors answer, and which one is right depends on the editing target: editing the ON-AIR
 * cue, the only honest report is PROGRAM's, because that is the graphic carrying those values;
 * editing the previewed cue, it is PREVIEW's, which settled with exactly what a Take would send.
 * Reading one of them for both would warn about a cue nobody is typing into.
 *
 * Keys the template no longer declares are dropped: a monitor reports what it last measured, and
 * a field removed from the graphic since would otherwise warn about a box that is not on screen.
 */
export function cueOverflowKeys({
  editingIsLive,
  selectedGraphic,
  programOverflow,
  previewOverflow,
  known,
}: {
  editingIsLive: boolean;
  selectedGraphic: string | null;
  /** Per graphic, what the PROGRAM monitor last reported. */
  programOverflow: Record<string, string[]>;
  /** What the PREVIEW monitor last reported for the graphic it is showing. */
  previewOverflow: string[];
  /** The field keys the edited graphic actually declares. */
  known: ReadonlySet<string> | ReadonlyMap<string, unknown>;
}): string[] {
  const reported = editingIsLive ? programOverflow[selectedGraphic ?? ''] ?? [] : previewOverflow;
  return reported.filter((key) => known.has(key));
}

/**
 * TOO LONG TO FIT (owner ruling 2026-08-23, docs/SVG_IMPORT_PLAN.md §3), as one line in the cue
 * editor's head. The graphic itself reports it after its fit ladder has filled the panel,
 * wrapped, and shrunk to the readability floor - past that the copy runs over the artwork, and
 * neither cutting it nor reshaping the design is allowed. It sits beside the unsent note because
 * both answer the same operator question: is what I am looking at what will air?
 *
 * A pure READOUT, split out of `ProductionPage` on 2026-08-28: it renders the keys it is handed
 * and nothing else. The wording comes from `controlModel.overflowNote`, so the exported surfaces
 * and the hosted control page cannot assemble a different sentence.
 */
export default function CueOverflowNote({
  keys,
  descriptors,
}: {
  keys: string[];
  descriptors: FieldDescriptor[];
}) {
  const message = overflowNote(keys, Object.fromEntries(descriptors.map((d) => [d.key, d.label])));
  if (!message) return null;
  return (
    <span className="pd-editor-fate pd-over-note" data-testid="cue-overflow">
      {message}
    </span>
  );
}
