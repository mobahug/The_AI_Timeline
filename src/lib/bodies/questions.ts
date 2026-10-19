import file from '../../../data/questions.json?bodies';
import { QUESTIONS } from '../questions';
import type { Question } from '../types';

/* A plain question in full: the answer at length, what it means in practice,
   the line it gives each card it rests on, and what the record does not
   settle. Every page may list a question from its head (questions.ts); only
   the question's own page prints this, and brings it in its chunk
   (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.questions.map((q) => [q.id, q]));
const FULL: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => {
  const body = BODY[q.id];
  return [q.id, { ...q, ...body, record: q.record.map((r, i) => ({ ...r, note: body.record[i].note })) }];
}));

/** A question with its answer. */
export const questionInFull = (id: string): Question | null => FULL[id] || null;
