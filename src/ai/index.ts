// Provider selection: the established Creative AI harness when the selected gateway route
// is configured, the deterministic stub otherwise. The UI and harness never branch by vendor.

import type { AIProvider } from './provider';
import { aiProvider as stubProvider } from './stubProvider';
import { claudeProvider } from './claudeProvider';
import { aiConfigured } from './settings';
import type { CreativeAiProfileId } from './lite/types';

export function getAiProvider(profile?: CreativeAiProfileId): AIProvider {
  if (profile === 'lite') return claudeProvider;
  return aiConfigured() ? claudeProvider : stubProvider;
}
