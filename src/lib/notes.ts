import { QUESTIONS } from './questions';
import { CHECKS } from './checks';
import { PREDICTIONS } from './predictions';
import { PLEDGES } from './pledges';
import { paperOf } from './papers';
import type { CheckHead, Event, Notes, PledgeHead, PredictionHead, QuestionHead } from './types';

/* The line a plain question, a headline check, a prediction or a promise gives
   each card it rests on. Every page knows which cards those are (the heads); a
   card's dossier prints the line under each record that names the card. The
   build files a card's lines with its papers (scripts/split-events.ts), so a
   dossier brings its own card's and no other card's — and not the rest of each
   record's body, which only the record's own pages print. */

/** The records of one kind that name a card, as a page lists them, each with
 *  the line it gives the card: the build files them in that order. */
const restingOn = <R extends { record: { event: string }[] }>(card: Event, kind: keyof Notes, listed: R[]): { record: R; note: string }[] => {
  const lines = (paperOf(card, 'notes') || {})[kind] || [];
  return listed.flatMap((r) => r.record.filter((x) => x.event === card.id).map(() => r)).map((record, i) => ({ record, note: lines[i] }));
};

/** Every plain question a card helps answer, with the note the question gives it. */
export const questionsOf = (card: Event): { question: QuestionHead; note: string }[] =>
  restingOn(card, 'question', QUESTIONS).map(({ record, note }) => ({ question: record, note }));

/** Every check that touches a card, with the note the check gives it. */
export const checksOf = (card: Event): { check: CheckHead; note: string }[] =>
  restingOn(card, 'check', CHECKS).map(({ record, note }) => ({ check: record, note }));

/** Every prediction a card bears on, with the note the prediction gives it. */
export const predictionsOf = (card: Event): { prediction: PredictionHead; note: string }[] =>
  restingOn(card, 'prediction', PREDICTIONS).map(({ record, note }) => ({ prediction: record, note }));

/** Every promise a card bears on, with the note the promise gives it. */
export const pledgesOf = (card: Event): { pledge: PledgeHead; note: string }[] =>
  restingOn(card, 'promise', PLEDGES).map(({ record, note }) => ({ pledge: record, note }));
