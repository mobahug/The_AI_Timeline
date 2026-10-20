import heads from '../../data/corrections.json?heads';

/* What a card's dossier says of the corrections register: how many times the
   card was corrected, and the newest correction's day and entry, to link. The
   register's words are the register page's own (lib/corrections.ts); a
   dossier reads only each entry's day and card, so it does not carry them. */

export interface Corrected { n: number; date: string; id: string }

const BY_CARD = new Map<string, Corrected>();
heads.corrections
  .map((c, i) => ({ c, i }))
  .sort((a, b) => b.c.date.localeCompare(a.c.date) || a.i - b.i)
  .forEach(({ c }) => {
    if (!c.event) return;
    const known = BY_CARD.get(c.event);
    if (known) known.n += 1; else BY_CARD.set(c.event, { n: 1, date: c.date, id: c.id });
  });

/** How often a card was corrected, and its newest correction; null if never. */
export const correctedOf = (event: string): Corrected | null => BY_CARD.get(event) || null;
