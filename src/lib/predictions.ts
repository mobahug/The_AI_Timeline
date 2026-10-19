import { useSyncExternalStore } from 'react';
import heads from '../../data/predictions.json?heads';
import type { Foretold, Prediction, PredictionHead, Route } from './types';

/* Said in advance: predictions about AI that people remember and repeat, each
   quoted from where it was made, with the year it named and what the record
   shows happened. The file collects the famous ones, not a fair sample, and
   says so; it scores the words, never the speaker.

   Every page may list a prediction from its head (scripts/split-events.ts).
   The rest — the words, the verdict at length, the quotes, the sources — is
   most of the file, and only the prediction pages print it: the server holds
   it from the start, a prerendered prediction page waits for it before it
   hydrates (main.tsx), and a turn to one waits for it as a turn waits for a
   card's papers. */

export const PREDICTIONS: PredictionHead[] = heads.slice().sort((a, b) => a.said.localeCompare(b.said));
export const predictionById: Record<string, PredictionHead> = Object.fromEntries(PREDICTIONS.map((p) => [p.id, p]));

/** The verdicts, in the order the index counts them. */
export const FORETOLD: Record<Foretold, { label: string; means: string }> = {
  kept: { label: 'Came true', means: 'It happened by the year it named.' },
  early: { label: 'Came early', means: 'It happened, years before the year it named: right about what, wrong about when.' },
  late: { label: 'Came late', means: 'It happened, but after the year it named.' },
  overdue: { label: 'Overdue', means: 'The year it named has passed, and it has not happened.' },
  wrong: { label: 'Proved wrong', means: 'It said something would not happen, and it did.' },
  disputed: { label: 'Disputed', means: 'Accounts on the record differ on whether it has happened.' },
  open: { label: 'Not yet due', means: 'The year it named has not come.' }
};
export const FORETOLD_ORDER = Object.keys(FORETOLD) as Foretold[];

/** Every prediction a card bears on, with the note the prediction gives it. */
export const predictionsOf = (id: string): { prediction: PredictionHead; note: string }[] =>
  PREDICTIONS.flatMap((p) => p.record.filter((r) => r.event === id).map((r) => ({ prediction: p, note: r.note })));

/** Every prediction a person made, as far as the file holds. */
export const predictionsBy = (person: string): PredictionHead[] => PREDICTIONS.filter((p) => p.people.includes(person));

/** The year a prediction was made. */
export const yearOf = (p: Pick<PredictionHead, 'said'>): number => Number(p.said.slice(0, 4));

/* ─── The whole file, for the prediction pages ───────────────────────────── */

let whole: Record<string, Prediction> | null = null;
let pending: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

const keep = (all: Prediction[]) => { whole = Object.fromEntries(all.map((p) => [p.id, p])); version += 1; listeners.forEach((l) => l()); };

/** The server, and a test, hold the whole file from the start. */
export function primePredictions(all: Prediction[] | null): void { if (all) keep(all); else { whole = null; pending = null; } }

/** The whole file, in one request however many ask; a failed request is forgotten. */
export function loadPredictions(): Promise<void> {
  if (whole) return Promise.resolve();
  if (!pending) {
    pending = import('../../data/predictions.json').then(
      (m) => keep((m.default as { predictions: Prediction[] }).predictions),
      (err: unknown) => { pending = null; throw err; }
    );
  }
  return pending;
}

/** A prediction in full, once the file is here. */
export const predictionInFull = (id: string): Prediction | null => (whole && whole[id]) || null;

/** Does a page need the whole file, and is it not here yet? */
export function predictionsFor(route: Pick<Route, 'view'>): Promise<void> | null {
  if (whole || (route.view !== 'predictions' && route.view !== 'prediction')) return null;
  return loadPredictions().catch(() => undefined);
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Draw again when the whole file arrives. */
export const usePredictions = (): number => useSyncExternalStore(subscribe, () => version, () => version);
