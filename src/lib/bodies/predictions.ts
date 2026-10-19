import file from '../../../data/predictions.json?bodies';
import { PREDICTIONS } from '../predictions';
import type { Prediction } from '../types';

/* A prediction in full: its words, the year they named, what the record shows
   happened, quoted, the verdict at length, the sources and the line it gives
   each card. Every page may list a prediction from its head (predictions.ts);
   the two prediction pages print the rest, and bring it in their chunks
   (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.predictions.map((p) => [p.id, p]));
const FULL: Record<string, Prediction> = Object.fromEntries(PREDICTIONS.map((p) => {
  const body = BODY[p.id];
  return [p.id, { ...p, ...body, record: p.record.map((r, i) => ({ ...r, note: body.record[i].note })) }];
}));

/** A prediction with its words, its verdict at length and its sources. */
export const predictionInFull = (id: string): Prediction | null => FULL[id] || null;
