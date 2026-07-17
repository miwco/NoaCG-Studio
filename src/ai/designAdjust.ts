// Deterministic design adjustments: map the design spec's COMPOSITIONAL parameters
// (typography scale, weight, tracking, density, alignment, shape, panel treatment) onto an
// assembled catalog template — with zero model calls. This is what keeps the grounded path
// from producing "the same layout in different colours": the chassis stays correct by
// construction, while the composition follows the brief.
//
// Mechanism: a clearly marked override block appended AFTER the variant's design CSS (the
// cascade makes later equal-specificity rules win — no !important, no rewriting of the
// variant's own rules). Every adjustment is guarded on the structure actually existing and
// derives its numbers from the assembled CSS itself, so an exotic category simply no-ops.
// The pinned contracts (:root vars, auto-fit caps, zones, the ANIMATION region) are never
// touched; adjusted output must still pass the runtime bench (pinned in e2e/bench.spec.ts).

import type { SpxTemplate } from '../model/types';
import { detectPrefix } from '../model/structure';
import type { DesignSpec } from './designSpec';

const WEIGHTS: Record<string, number> = { regular: 500, semibold: 600, bold: 700, black: 800 };
const TRACKING: Record<string, string> = { tight: '-0.01em', normal: '0', wide: '0.06em' };
const DENSITY_FACTOR: Record<string, number> = { airy: 1.35, compact: 0.7 };
const CORNER: Record<string, string> = {
  sharp: '0',
  soft: 'calc(8px * var(--scale))',
  round: 'calc(18px * var(--scale))',
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The first `prop: calc(Npx * var(--scale))` inside the given class's rule, as N. */
function readScaledPx(css: string, className: string, prop: string): number | null {
  const rule = css.match(new RegExp(`\\.${escapeRe(className)}[^{}]*\\{([^}]*)\\}`));
  if (!rule) return null;
  const m = rule[1].match(new RegExp(`${prop}:\\s*calc\\(\\s*([\\d.]+)px`));
  return m ? parseFloat(m[1]) : null;
}

/** The raw value of a declaration inside the given class's rule. */
function readDecl(css: string, className: string, prop: string): string | null {
  const rule = css.match(new RegExp(`\\.${escapeRe(className)}[^{}]*\\{([^}]*)\\}`));
  if (!rule) return null;
  const m = rule[1].match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+)`));
  return m ? m[1].trim() : null;
}

/** Scale every px length in a value (plain `Npx` and `calc(Npx * var(--scale))` alike). */
function scalePxLengths(value: string, factor: number): string {
  return value.replace(/([\d.]+)px/g, (_m, n: string) => `${Math.round(parseFloat(n) * factor)}px`);
}

/** Rewrite the :root --panel-bg alpha (rgba only — anything else is left alone). */
function withPanelAlpha(css: string, alpha: number): string {
  return css.replace(
    /(--panel-bg:\s*rgba\(\s*[\d\s,.]+?),\s*([\d.]+)\s*\)/,
    (_m, head: string) => `${head}, ${alpha})`,
  );
}

const MARKER = '/* ── Design adjustments (from the design spec — override the design CSS above) ── */';

/**
 * Apply the spec's compositional parameters to an assembled template. Pure and total:
 * anything inapplicable is skipped, and a spec with no compositional parameters returns
 * the template unchanged.
 */
export function applyDesignAdjustments(template: SpxTemplate, spec: DesignSpec): SpxTemplate {
  const prefix = detectPrefix(template.html);
  if (!prefix) return template;

  let css = template.css;
  const has = (suffix: string) => css.includes(`.${prefix}-${suffix}`);
  const overrides: string[] = [];
  const push = (selector: string, comment: string, decls: string[]) => {
    if (decls.length) overrides.push(`/* ${comment} */\n${selector} {\n${decls.map((d) => `  ${d};`).join('\n')}\n}`);
  };

  // ── Typography ──────────────────────────────────────────────────────────────
  const t = spec.typography;
  if (t?.scaleRatio && has('name') && has('title')) {
    // The heading anchors the scale; the body line moves to hit the requested ratio.
    const namePx = readScaledPx(css, `${prefix}-name`, 'font-size');
    if (namePx) {
      const ratio = clamp(t.scaleRatio, 1.2, 2.6);
      const titlePx = Math.round(clamp(namePx / ratio, 14, namePx * 0.92));
      push(`.${prefix}-title`, `heading:body ratio ${ratio}`, [`font-size: calc(${titlePx}px * var(--scale))`]);
    }
  }
  if (t?.headingWeight && WEIGHTS[t.headingWeight] && has('name')) {
    push(`.${prefix}-name`, `${t.headingWeight} heading`, [`font-weight: ${WEIGHTS[t.headingWeight]}`]);
  }
  if (t?.tracking && TRACKING[t.tracking] !== undefined && has('name')) {
    push(`.${prefix}-name`, `${t.tracking} tracking`, [`letter-spacing: ${TRACKING[t.tracking]}`]);
  }
  if (t?.kickerCase === 'caps' && has('extra')) {
    push(`.${prefix}-extra`, 'small-caps kicker line', [
      'text-transform: uppercase',
      'letter-spacing: 0.14em',
    ]);
  }

  // ── Density (the box's own padding, scaled — never the auto-fit caps) ───────
  if (spec.density && DENSITY_FACTOR[spec.density] && has('box')) {
    const padding = readDecl(css, `${prefix}-box`, 'padding');
    if (padding) {
      push(`.${prefix}-box`, `${spec.density} density`, [
        `padding: ${scalePxLengths(padding, DENSITY_FACTOR[spec.density])}`,
      ]);
    }
  }

  // ── Alignment (line-based categories only — columnar layouts own theirs) ────
  if (spec.alignment && spec.alignment !== 'left' && has('box') && (template.type === 'lower-third' || template.type === 'info-card')) {
    push(`.${prefix}-box`, `${spec.alignment}-aligned text`, [`text-align: ${spec.alignment}`]);
  }

  // ── Shape ───────────────────────────────────────────────────────────────────
  if (spec.shape?.corner && CORNER[spec.shape.corner] && has('box')) {
    push(`.${prefix}-box`, `${spec.shape.corner} corners`, [`border-radius: ${CORNER[spec.shape.corner]}`]);
  }
  if (spec.shape?.accentForm === 'none' && has('accent')) {
    push(`.${prefix}-accent`, 'no accent element', ['display: none']);
  }

  // ── Panel treatment ─────────────────────────────────────────────────────────
  const panel = spec.shape?.panel;
  if (panel === 'solid') css = withPanelAlpha(css, 0.98);
  if (panel === 'translucent') css = withPanelAlpha(css, 0.55);
  if ((panel === 'outline' || panel === 'none') && has('box')) {
    push(`.${prefix}-box`, `${panel} panel`, [
      'background: transparent',
      panel === 'outline' ? 'border: calc(1px * var(--scale)) solid var(--text-dim)' : 'border: none',
      'box-shadow: none',
    ]);
    // Text now sits straight on the video — keep it broadcast-readable.
    for (const line of ['name', 'title', 'extra']) {
      if (has(line)) push(`.${prefix}-${line}`, 'contrast without a panel', ['text-shadow: 0 1px 12px rgba(0, 0, 0, 0.55)']);
    }
  }

  if (!overrides.length && css === template.css) return template;
  const block = overrides.length ? `\n\n${MARKER}\n${overrides.join('\n\n')}\n` : '';
  return { ...template, css: css + block };
}
