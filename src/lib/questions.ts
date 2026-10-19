import raw from '../../data/questions.json?heads';
import type { QuestionHead } from './types';

/* Plain questions: what a reader who has never opened the board wants to know,
   answered only from what its cards already say and source. Each answer names
   the cards it rests on, the leads that follow it further, and what the record
   does not settle.

   Every page may list a question from its head: the question, the answer in
   short, and the cards it rests on. The answer at length is its own page's
   (bodies/questions.ts). */

export const QUESTIONS: QuestionHead[] = raw.questions;
export const questionById: Record<string, QuestionHead> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Every plain question a card helps answer, with the note the question gives it. */
export const questionsOf = (id: string): { question: QuestionHead; note: string }[] =>
  QUESTIONS.flatMap((q) => q.record.filter((r) => r.event === id).map((r) => ({ question: q, note: r.note })));
