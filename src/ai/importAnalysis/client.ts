// Browser client for the imported-graphic-analysis task (docs/AI_TASK_REGISTRY.md).
// The lite/client pattern: typed wire calls, bearer token when signed in, stable error
// codes - the browser never supplies a model, route, prompt, or policy. It also owns the
// client-side DATA MINIMIZATION step: the artwork is downscaled to the task's ceiling
// and re-encoded before anything leaves the machine (ratified decision 3).

import { getAccessToken } from '../../backend/auth';
import {
  IMPORT_ANALYSIS_LIMITS,
  type ImportAnalysisOutcomeRequest,
  type ImportAnalysisRequest,
  type ImportAnalysisResult,
  type ImportAnalysisStatusResponse,
} from './contract';

export class ImportAnalysisError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function checkedJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null) as
      | { error?: { code?: string; message?: string; retryable?: boolean } }
      | null;
    throw new ImportAnalysisError(
      body?.error?.code ?? 'generation_failed',
      body?.error?.message ?? 'The graphic could not be analyzed.',
      body?.error?.retryable ?? false,
    );
  }
  return response.json() as Promise<T>;
}

export async function loadImportAnalysisStatus(): Promise<ImportAnalysisStatusResponse> {
  const token = await getAccessToken();
  const response = await fetch('/api/ai/tasks/import-analysis-status', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return checkedJson<ImportAnalysisStatusResponse>(response);
}

export interface AnalysisImagePayload {
  base64: string;
  mediaType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

/**
 * Downscale the artwork to fit the task ceiling and re-encode as JPEG (the original is
 * never uploaded at full size). Transparency flattens onto the dark broadcast frame the
 * graphic keys over, so what the model sees matches what an operator would.
 */
export async function downscaleForAnalysis(dataUrl: string): Promise<AnalysisImagePayload> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('The artwork could not be decoded for analysis.'));
    el.src = dataUrl;
  });
  // Fit to the PIXEL budget rather than to each axis, so a portrait keeps the same budget a
  // landscape gets instead of being squeezed to the short side (contract.ts maxPixels).
  const w = Math.max(1, image.naturalWidth);
  const h = Math.max(1, image.naturalHeight);
  const k = Math.min(
    1,
    Math.sqrt(IMPORT_ANALYSIS_LIMITS.maxPixels / (w * h)),
    IMPORT_ANALYSIS_LIMITS.maxEdge / Math.max(w, h),
  );
  // FLOOR, not round: rounding up on both axes can push the area a pixel over the budget the
  // server enforces, which would refuse the browser's own correctly-scaled output.
  const width = Math.max(16, Math.floor(w * k));
  const height = Math.max(16, Math.floor(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The artwork could not be prepared for analysis.');
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const encoded = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = encoded.slice(encoded.indexOf(',') + 1);
  if (base64.length > IMPORT_ANALYSIS_LIMITS.imageBase64Chars) {
    throw new Error('The artwork is too complex to encode within the analysis size limit.');
  }
  return { base64, mediaType: 'image/jpeg', width, height };
}

export async function requestImportAnalysis(
  image: AnalysisImagePayload,
  instructions: string,
): Promise<ImportAnalysisResult> {
  const request: ImportAnalysisRequest = {
    idempotencyKey: crypto.randomUUID(),
    image,
    ...(instructions.trim()
      ? { instructions: instructions.trim().slice(0, IMPORT_ANALYSIS_LIMITS.instructionChars) }
      : {}),
  };
  const response = await fetch('/api/ai/tasks/import-analysis', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(request),
  });
  return checkedJson<ImportAnalysisResult>(response);
}

export async function recordImportAnalysisOutcome(request: ImportAnalysisOutcomeRequest): Promise<void> {
  const response = await fetch('/api/ai/tasks/import-analysis-outcome', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(request),
  });
  await checkedJson(response);
}
