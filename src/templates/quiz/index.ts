// The quiz catalog: game-show question graphics, family-consistent with the rest of the
// package (docs/DESIGN_LANGUAGE.md §8). Continue (next()) reveals the correct answer.

import type { TemplateVariant } from '../../model/wizard';
import { qz01 } from './qz01';

export const QUIZ: TemplateVariant[] = [
  qz01, // question + four answers with a Continue-driven correct-answer reveal
];

export function quizById(id: string): TemplateVariant | undefined {
  return QUIZ.find((v) => v.id === id);
}
