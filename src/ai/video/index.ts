// Video provider selection, mirroring ai/index.ts: the Claude motion-design harness when
// AI is configured (key or proxy), the deterministic offline stub otherwise.

import { aiConfigured } from '../settings';
import type { VideoAIProvider } from './provider';
import { stubVideoProvider } from './stubVideoProvider';

export function getVideoAiProvider(): VideoAIProvider {
  // The Claude harness lands with the AI slice; until then every mode uses the stub.
  return aiConfigured() ? stubVideoProvider : stubVideoProvider;
}
