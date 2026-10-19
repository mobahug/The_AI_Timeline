import heads from '../../data/promises.json?heads';
import type { PledgeHead, PledgeVerdict } from './types';

/* Promises made: commitments that labs, companies and governments made in
   public about AI, each quoted from the promiser's own text and set beside what
   the record shows it did. A promise is filed when a named organisation or
   person made it, its words can be quoted, and the record bears on it; it is
   scored on its own words, never on the promiser.

   Every page may list a promise from its head (scripts/split-events.ts). Its
   words, its reading and its sources are its own pages', which bring the whole
   file in their chunk (components/viewChunks.ts). */

export const PLEDGES: PledgeHead[] = heads.slice().sort((a, b) => a.said.localeCompare(b.said));
export const pledgeById: Record<string, PledgeHead> = Object.fromEntries(PLEDGES.map((p) => [p.id, p]));

/** The verdicts, in the order the index counts them. */
export const PLEDGED: Record<PledgeVerdict, { label: string; means: string }> = {
  kept: { label: 'Kept', means: 'Done on its own terms, and by its date if it named one.' },
  partly: { label: 'Kept in part', means: 'Some of it done, by the record; some of it not.' },
  broken: { label: 'Broken', means: 'Its date passed with it undone, or the promiser did otherwise, by the record.' },
  dropped: { label: 'Rewritten', means: 'The promiser rewrote it or took it back, in public: its words no longer stand.' },
  disputed: { label: 'Disputed', means: 'Accounts on the record differ on whether it was kept.' },
  open: { label: 'Still open', means: 'Not yet due, or not yet settled.' }
};
export const PLEDGED_ORDER = Object.keys(PLEDGED) as PledgeVerdict[];

/** Every promise a card bears on, with the note the promise gives it. */
export const pledgesOf = (id: string): { pledge: PledgeHead; note: string }[] =>
  PLEDGES.flatMap((p) => p.record.filter((r) => r.event === id).map((r) => ({ pledge: p, note: r.note })));

/** Every promise a person or an organisation made, as far as the file holds. */
export const pledgesBy = (kind: 'person' | 'org', id: string): PledgeHead[] =>
  PLEDGES.filter((p) => (kind === 'person' ? p.people : p.orgs).includes(id));
