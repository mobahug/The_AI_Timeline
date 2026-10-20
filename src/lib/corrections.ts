import file from '../../data/corrections.json';
import type { Correction } from './types';

/* Corrections: every change of fact the board has made to its own record, as
   its history has it — what a card said, what it says now, why, and the source
   that settled it, dated by the commit that made the change. Wording that
   changed without a fact changing is not listed, nor a quote matched to its
   page's own curly marks. Read by the register, a page of its own
   (components/viewChunks.ts), so the main script never carries it; a dossier
   reads only its own card's count, filed with the card's papers
   (lib/corrected.ts). */

export const CORRECTIONS_NOTE: string = file.note;

/** Newest first, and in a commit's own order within a day. */
export const CORRECTIONS: Correction[] = (file.corrections as Correction[]).slice()
  .map((c, i) => ({ c, i }))
  .sort((a, b) => b.c.date.localeCompare(a.c.date) || a.i - b.i)
  .map(({ c }) => c);

/** Every correction made to one card, newest first. */
export const correctionsOf = (event: string): Correction[] => CORRECTIONS.filter((c) => c.event === event);

/** What each kind of correction is called on the page. */
export const CORRECTION_KIND: Record<Correction['kind'], string> = {
  fact: 'A fact', date: 'A date', figure: 'A figure', attribution: 'Who said it', framing: 'The framing', citation: 'The citation'
};
