// Per-deployment numeric knobs. The DEFAULTS all live in src/render/limits.ts with every
// other render number; the env reads live here because that module is pure and also runs
// in the browser, where process.env does not exist.

/** An integer override, or the default. A malformed or negative value falls back rather
 *  than being coerced — a typo in an ops knob must never silently remove a guard. */
export function envInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
