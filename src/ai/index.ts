// Provider selection: the Claude provider when the user configured a key (or a gateway
// URL), the deterministic stub otherwise — same interface, so the UI never cares.

import type { AIProvider } from './provider';
import { aiProvider as stubProvider } from './stubProvider';
import { claudeProvider } from './claudeProvider';
import { aiConfigured } from './settings';

export function getAiProvider(): AIProvider {
  return aiConfigured() ? claudeProvider : stubProvider;
}
