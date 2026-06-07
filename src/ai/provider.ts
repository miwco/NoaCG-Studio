// AI provider interface. The app is built entirely against this interface so a real Claude-backed
// provider can replace the deterministic stub later without touching the UI. AI output is always
// run through validation before it can be applied or exported — the platform owns the structure.

import type { SpxTemplate, TemplateChange } from '../model/types';

export interface AIProvider {
  /** Create a new template from a natural-language prompt. */
  generate(prompt: string): Promise<TemplateChange>;
  /** Modify the current template per a prompt. */
  modify(prompt: string, template: SpxTemplate): Promise<TemplateChange>;
  /** Explain a piece of code (returns prose, no template change). */
  explain(code: string): Promise<string>;
  /** Attempt deterministic fixes for known validation problems. */
  fix(template: SpxTemplate): Promise<TemplateChange>;
  /** Make the template more SPX-ready (definition, relative paths, runtime functions). */
  makeSpxReady(template: SpxTemplate): Promise<TemplateChange>;
}
