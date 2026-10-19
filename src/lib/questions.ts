import raw from '../../data/questions.json?heads';
import type { QuestionHead } from './types';

/* Plain questions: what a reader who has never opened the board wants to know,
   answered only from what its cards already say and source. Each answer names
   the cards it rests on, the leads that follow it further, and what the record
   does not settle.

   Every page may list a question from its head: the question, the answer in
   short, and the cards it rests on. The answer at length is its own page's
   (bodies/questions.ts), and the line it gives each card is printed there and
   on the card's dossier (bodies/notes.ts). */

export const QUESTIONS: QuestionHead[] = raw.questions;
export const questionById: Record<string, QuestionHead> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
