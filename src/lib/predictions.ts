import heads from '../../data/predictions.json?heads';
import type { Foretold, PredictionHead } from './types';

/* Said in advance: predictions about AI that people remember and repeat, each
   quoted from where it was made, with the year it named and what the record
   shows happened. The file collects the famous ones, not a fair sample, and
   says so; it scores the words, never the speaker.

   Every page may list a prediction from its head (scripts/split-events.ts).
   The rest — the words, the verdict at length, the quotes, the sources — is
   most of the file, and only the prediction pages print it, from their chunk
   (bodies/predictions.ts); the line it gives each card is printed there and on
   the card's dossier (bodies/notes.ts). */

export const PREDICTIONS: PredictionHead[] = heads.predictions.slice().sort((a, b) => a.said.localeCompare(b.said));
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

/** Every prediction a person made, as far as the file holds. */
export const predictionsBy = (person: string): PredictionHead[] => PREDICTIONS.filter((p) => p.people.includes(person));

/** The year a prediction was made. */
export const yearOf = (p: Pick<PredictionHead, 'said'>): number => Number(p.said.slice(0, 4));
