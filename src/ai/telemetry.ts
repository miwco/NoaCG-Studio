// AI generation telemetry: one record per provider run — stage timings, token usage, the
// route taken, repair rounds, outcome, and the DIVERSITY of what was produced (variant,
// preset, palette, …). The harness must EARN its place with measurements, and sameness is a
// named failure mode — this is where both become visible.
//
// Local-only by design (an in-memory list mirrored to a localStorage ring, JSON-exportable);
// nothing is sent anywhere. scripts/ai-bench.mjs and the hidden compare mode read these
// records; a future nightly analysis task would too.

import { uuid } from '../model/id';
import type { AiPath } from './provider';

/** Token usage of one model call (from the Messages API `usage` block). */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export type AiRunKind = 'generate' | 'modify' | 'convert' | 'fix' | 'make-ready';

export interface AiStageRecord {
  /** Stage name ('design-spec', 'assemble', 'coder', 'repair-1', 'bench', …). */
  stage: string;
  /** Model id for stages that called the API; absent for deterministic stages. */
  model?: string;
  ms: number;
  usage?: AiUsage;
}

/** What the run produced — the repetition metrics feed off these. */
export interface AiDiversity {
  variantId?: string;
  category?: string;
  presetId?: string;
  paletteId?: string;
  zone?: string;
  density?: string;
  typography?: string;
}

export interface AiRunRecord {
  id: string;
  kind: AiRunKind;
  startedAt: string; // ISO timestamp
  totalMs: number;
  route?: AiPath;
  stages: AiStageRecord[];
  repairRounds: number;
  ok?: boolean;
  /** Validation rules still failing at the end (empty when ok). */
  errorRules?: string[];
  diversity?: AiDiversity;
}

const STORAGE_KEY = 'spx-gfx-ai-telemetry';
const MAX_RECORDS = 100;

function readStored(): AiRunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as AiRunRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(records: AiRunRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
  } catch {
    // Quota or no storage — telemetry is best-effort, never in the user's way.
  }
}

/** All recorded runs, oldest first. */
export function aiRunRecords(): AiRunRecord[] {
  return readStored();
}

/** The full record list as pretty JSON (the debug export). */
export function exportAiRuns(): string {
  return JSON.stringify(readStored(), null, 2);
}

export function clearAiRuns(): void {
  persist([]);
}

/** Live recorder for one provider run. Create at the top, `finish()` exactly once. */
export interface AiRunRecorder {
  /** Record a completed stage. Call right after the stage ends; `ms` is measured here. */
  stage(name: string, startedMs: number, model?: string, usage?: AiUsage): void;
  repair(): void;
  route(route: AiPath): void;
  diversity(d: AiDiversity): void;
  finish(ok: boolean, errorRules?: string[]): AiRunRecord;
}

export function startAiRun(kind: AiRunKind): AiRunRecorder {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const record: AiRunRecord = {
    id: uuid(),
    kind,
    startedAt,
    totalMs: 0,
    stages: [],
    repairRounds: 0,
  };
  let finished = false;
  return {
    stage(name, startedMs, model, usage) {
      record.stages.push({ stage: name, ms: Date.now() - startedMs, ...(model ? { model } : {}), ...(usage ? { usage } : {}) });
    },
    repair() {
      record.repairRounds += 1;
    },
    route(route) {
      record.route = route;
    },
    diversity(d) {
      record.diversity = { ...record.diversity, ...d };
    },
    finish(ok, errorRules) {
      if (finished) return record;
      finished = true;
      record.totalMs = Date.now() - t0;
      record.ok = ok;
      if (errorRules?.length) record.errorRules = errorRules;
      persist([...readStored(), record]);
      return record;
    },
  };
}
