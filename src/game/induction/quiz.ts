/**
 * Site Induction — quiz scoring (pure).
 */

import type { QuizQuestion } from './types';

/** Fraction of correct answers required to pass a module check. */
export const QUIZ_PASS_FRACTION = 2 / 3;

export interface QuizScore {
  correct: number;
  total: number;
  passed: boolean;
}

export function correctOptionId(question: QuizQuestion): string {
  const option = question.options.find((o) => o.correct);
  if (!option) throw new Error(`Question ${question.id} has no correct option`);
  return option.id;
}

export function isAnswerCorrect(question: QuizQuestion, optionId: string | undefined): boolean {
  return optionId !== undefined && question.options.some((o) => o.id === optionId && o.correct);
}

/** Scores answers keyed by question id. Unanswered questions count as wrong. */
export function scoreQuiz(questions: readonly QuizQuestion[], answers: Record<string, string | undefined>): QuizScore {
  const total = questions.length;
  const correct = questions.filter((q) => isAnswerCorrect(q, answers[q.id])).length;
  const passed = total > 0 && correct >= Math.ceil(total * QUIZ_PASS_FRACTION - 1e-9);
  return { correct, total, passed };
}
