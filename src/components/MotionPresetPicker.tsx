// THE UNIVERSAL IN/OUT PICKER — the no-code way to change how a graphic comes on and goes
// off air. One presentational component over one bank (blocks/motionPresets.ts), mounted
// in two places: the wizard's Animation step (an imported design picks its motion before it
// exists) and a saved graphic's control page (any data-block graphic changes its motion
// after). Both hosts hold the state — the wizard in its draft, the control page in the
// template itself, read back through currentMotionPreset — so this never owns a pick; it
// shows which card each phase holds and reports a click with the phases it applies to.
//
// The direction row is the wizard's own vocabulary (AnimationStep.tsx): one card for both
// phases by default, or the entrance / the exit alone, which is how a student ends up with
// "rise in, fade out" without a timeline.

import type { ReactNode } from 'react';
import { MOTION_PRESETS, type MotionPhaseName, type MotionPresetId } from '../blocks/motionPresets';
import type { AnimPhase } from '../blocks/presetRegistry';

export const MOTION_DIRECTIONS: { id: AnimPhase; label: string; hint: string }[] = [
  { id: 'both', label: 'In and out', hint: 'One matched style animates the graphic on and off air.' },
  { id: 'in', label: 'In only', hint: 'Pick the entrance — the exit keeps its current style.' },
  { id: 'out', label: 'Out only', hint: 'Pick the exit — the entrance keeps its current style.' },
];

/** The phases one click writes under a direction. */
export function phasesFor(direction: AnimPhase): MotionPhaseName[] {
  return direction === 'both' ? ['in', 'out'] : [direction];
}

interface Props {
  /** The card each phase currently holds (null = motion this bank did not write). */
  inId: MotionPresetId | null;
  outId: MotionPresetId | null;
  direction: AnimPhase;
  onDirection: (d: AnimPhase) => void;
  /** A card click: the motion and the phases the direction says it applies to. */
  onPick: (id: MotionPresetId, phases: MotionPhaseName[]) => void;
  /** Clicking the card a phase already holds replays the preview instead. */
  onReplay?: () => void;
  /** Why nothing can be picked (no unit to move) — renders the reason instead of the cards. */
  disabledReason?: string | null;
  /** Rendered inside the grid after the bank (a host's own cards, e.g. the SVG layer stagger). */
  children?: ReactNode;
  /** The section's title; the wizard keeps its own, the control page names the section. */
  title?: string;
  /** Hides the direction row (a host that renders its own, as the wizard step does). */
  hideDirection?: boolean;
}

export default function MotionPresetPicker({
  inId,
  outId,
  direction,
  onDirection,
  onPick,
  onReplay,
  disabledReason = null,
  children,
  title,
  hideDirection = false,
}: Props) {
  const mixed = inId !== outId;
  const name = (id: MotionPresetId | null) => MOTION_PRESETS.find((p) => p.id === id)?.name ?? 'its own motion';
  const activeDirection = MOTION_DIRECTIONS.find((d) => d.id === direction)!;

  return (
    <div className="motion-picker" data-testid="motion-picker">
      {title && (
        <h3>
          {title}{' '}
          <span className="muted">click a motion to watch it — ▶ Play shows the entrance, ■ Stop the exit</span>
        </h3>
      )}
      {!hideDirection && (
        <div className="row" style={{ gap: 6, marginBottom: 8 }} role="group" aria-label="Direction">
          {MOTION_DIRECTIONS.map((d) => (
            <button
              key={d.id}
              className={direction === d.id ? 'active' : ''}
              onClick={() => onDirection(d.id)}
              title={d.hint}
              data-testid={`motion-direction-${d.id}`}
            >
              {d.label}
            </button>
          ))}
          <span className="hint" style={{ alignSelf: 'center' }}>
            {activeDirection.hint}
            {mixed && (
              <>
                {' '}Now: <strong>In</strong> {name(inId)} · <strong>Out</strong> {name(outId)}.
              </>
            )}
          </span>
        </div>
      )}
      {disabledReason ? (
        <p className="hint" data-testid="motion-picker-disabled">{disabledReason}</p>
      ) : (
        <div className="motion-grid">
          {MOTION_PRESETS.map((p) => {
            const isIn = inId === p.id;
            const isOut = outId === p.id;
            const selected = direction === 'in' ? isIn : direction === 'out' ? isOut : isIn && isOut;
            return (
              <button
                key={p.id}
                className={`wz-anim motion-card ${selected ? 'selected' : ''}`}
                onClick={() => {
                  const phases = phasesFor(direction);
                  const already = phases.every((ph) => (ph === 'in' ? isIn : isOut));
                  if (already && onReplay) return onReplay();
                  onPick(p.id, phases);
                }}
                title={p.description}
                data-testid={`motion-${p.id}`}
                data-selected={selected ? 'true' : undefined}
              >
                <strong>
                  {p.name}
                  {mixed && (isIn || isOut) && (
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {' '}· {isIn && isOut ? 'in + out' : isIn ? 'in' : 'out'}
                    </span>
                  )}
                </strong>
                <span className="hint">{p.hint}</span>
              </button>
            );
          })}
          {children}
        </div>
      )}
    </div>
  );
}
