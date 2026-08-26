import { json } from '../http.js';
import type { ProErrorBody, ProErrorCode } from '../../../src/ai/pro/types.js';

/** Hosted Pro's error shape - the same one Lite answers in, because the browser branches on
 *  the same set of reasons and one vocabulary is one set of UI branches. */
export function proError(
  code: ProErrorCode,
  message: string,
  status: number,
  retryable = false,
  headers: Record<string, string> = {},
): Response {
  return json({ error: { code, message, retryable } } satisfies ProErrorBody, status, headers);
}
