import raw from '../../data/questions.json';
import type { Question } from './types';

/* Plain questions: what a reader who has never opened the board wants to know,
   answered only from what its cards already say and source. Each answer names
   the cards it rests on, the leads that follow it further, and what the record
   does not settle. */

export const QUESTIONS: Question[] = raw.questions as Question[];
export const questionById: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Every plain question a card helps answer, with the note the question gives it. */
export const questionsOf = (id: string): { question: Question; note: string }[] =>
  QUESTIONS.flatMap((q) => q.record.filter((r) => r.event === id).map((r) => ({ question: q, note: r.note })));
