import questions from '../../../data/questions.json?bodies=record';
import checks from '../../../data/checks.json?bodies=record';
import predictions from '../../../data/predictions.json?bodies=record';
import promises from '../../../data/promises.json?bodies=record';
import { QUESTIONS } from '../questions';
import { CHECKS } from '../checks';
import { PREDICTIONS } from '../predictions';
import { PLEDGES } from '../pledges';
import type { CheckHead, PledgeHead, PredictionHead, QuestionHead } from '../types';

/* The line a plain question, a headline check, a prediction or a promise gives
   each card it rests on. Every page knows which cards those are (the heads); a
   card's dossier prints the line under each record that names the card, and
   brings the lines alone in its chunk (components/viewChunks.ts) — not the rest
   of each record's body, which only the record's own pages print. */

/** Each record's lines, by its id, in the order of its cards. */
const linesOf = (file: { id: string; record: { note: string }[] }[]): Record<string, string[]> =>
  Object.fromEntries(file.map((r) => [r.id, r.record.map((x) => x.note)]));
const LINES = {
  question: linesOf(questions.questions),
  check: linesOf(checks.checks),
  prediction: linesOf(predictions.predictions),
  promise: linesOf(promises.promises)
};

/** Every plain question a card helps answer, with the note the question gives it. */
export const questionsOf = (id: string): { question: QuestionHead; note: string }[] =>
  QUESTIONS.flatMap((q) => q.record.flatMap((r, i) => (r.event === id ? [{ question: q, note: LINES.question[q.id][i] }] : [])));

/** Every check that touches a card, with the note the check gives it. */
export const checksOf = (id: string): { check: CheckHead; note: string }[] =>
  CHECKS.flatMap((c) => c.record.flatMap((r, i) => (r.event === id ? [{ check: c, note: LINES.check[c.id][i] }] : [])));

/** Every prediction a card bears on, with the note the prediction gives it. */
export const predictionsOf = (id: string): { prediction: PredictionHead; note: string }[] =>
  PREDICTIONS.flatMap((p) => p.record.flatMap((r, i) => (r.event === id ? [{ prediction: p, note: LINES.prediction[p.id][i] }] : [])));

/** Every promise a card bears on, with the note the promise gives it. */
export const pledgesOf = (id: string): { pledge: PledgeHead; note: string }[] =>
  PLEDGES.flatMap((p) => p.record.flatMap((r, i) => (r.event === id ? [{ pledge: p, note: LINES.promise[p.id][i] }] : [])));
