// AI provider interface. The app is built entirely against this interface so the Claude-backed
// provider and the deterministic stub are interchangeable. AI output is always run through
// validation before it can be applied or exported — the platform owns the structure.

import type { AssetFile, Resolution, SpxTemplate, TemplateChange } from '../model/types';
import type { Palette } from '../model/wizard';

/** Extra inputs for generation: uploaded images (logo / still), brand colors, canvas. */
export interface GenerateContext {
  /** Uploaded images, already stored as data-URL assets (paths like images/logo.png). */
  images: AssetFile[];
  /** Brand colors to honor (the project brand or a custom palette), if any. */
  palette: Palette | null;
  resolution: Resolution;
  fps: number;
}

export interface AIProvider {
  /** Create a new template from a natural-language prompt (+ optional images/brand). */
  generate(prompt: string, context?: GenerateContext): Promise<TemplateChange>;
  /** Modify the current template per a prompt. */
  modify(prompt: string, template: SpxTemplate): Promise<TemplateChange>;
  /** Explain a piece of code (returns prose, no template change). */
  explain(code: string): Promise<string>;
  /** Attempt fixes for known validation problems. */
  fix(template: SpxTemplate): Promise<TemplateChange>;
  /** Make the template more SPX-ready (definition, relative paths, runtime functions). */
  makeSpxReady(template: SpxTemplate): Promise<TemplateChange>;
}
