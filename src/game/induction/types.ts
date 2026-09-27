/**
 * Site Induction — content types. Content is data-driven; screens only render it.
 */

/** Illustration shown on a concept card. Diagram ids render simple SVGs, others render a lucide icon. */
export type InductionArt =
  | 'diagram-cycle'
  | 'diagram-passes'
  | 'diagram-queue'
  | 'diagram-routes'
  | 'diagram-fuel'
  | 'diagram-right-of-way'
  | 'icon-timer'
  | 'icon-payload'
  | 'icon-match'
  | 'icon-warning'
  | 'icon-idle'
  | 'icon-balance'
  | 'icon-traffic'
  | 'icon-plan'
  | 'icon-speed'
  | 'icon-one-way'
  | 'icon-breakdown'
  | 'icon-checklist';

export interface ConceptCard {
  id: string;
  title: string;
  body: string;
  art: InductionArt;
  /** Optional one-line takeaway shown as a highlighted tip. */
  keyPoint?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  /** Shown after answering, whether right or wrong. */
  explanation: string;
}

export interface InductionModule {
  id: string;
  number: number;
  title: string;
  summary: string;
  /** Lucide icon key for the module list (mapped in the UI). */
  icon: 'cycle' | 'bucket' | 'queue' | 'route' | 'fuel' | 'safety';
  cards: ConceptCard[];
  questions: QuizQuestion[];
  /** Campaign level id that practices this module's concept. */
  practiceLevelId: string;
  practiceNote: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}
