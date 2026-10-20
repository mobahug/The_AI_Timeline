import heads from '../../data/corrections.json?heads';
import { PER_PAGE, newestFirst } from './register';
import type { Route, RoutePatch } from './types';

/* What a card's dossier says of the corrections register: how many times the
   card was corrected, and the newest correction's day and entry, to link. The
   register's words are its pages' own (lib/corrections.ts); a dossier reads
   only each entry's day and card, so it does not carry them.

   The same heads say which page of the register prints each entry, so a
   dossier links straight to it, and the register can send an old address on
   to the page that prints it now: an entry's anchor, or a month's, on a page
   it has moved off as newer entries arrived. */

export interface Corrected { n: number; date: string; id: string }

const BY_CARD = new Map<string, Corrected>();
/** The page each anchor is printed on: every entry's, and every month's, on
 *  the page where the month begins. */
const PAGE = new Map<string, number>();
newestFirst(heads.corrections).forEach((c, i) => {
  const page = Math.floor(i / PER_PAGE) + 1;
  const month = 'm-' + c.date.slice(0, 7);
  PAGE.set(c.id, page);
  if (!PAGE.has(month)) PAGE.set(month, page);
  if (!c.event) return;
  const known = BY_CARD.get(c.event);
  if (known) known.n += 1; else BY_CARD.set(c.event, { n: 1, date: c.date, id: c.id });
});

/** How often a card was corrected, and its newest correction; null if never. */
export const correctedOf = (event: string): Corrected | null => BY_CARD.get(event) || null;

/** The page of the register that prints an anchor, an entry's or a month's; null if none does. */
export const pageOf = (anchor: string): number | null => PAGE.get(anchor) || null;

/** Where the register prints an anchor: its page, and the anchor on it. */
export function atRegister(anchor: string): RoutePatch & Pick<Route, 'view'> {
  const page = pageOf(anchor) || 1;
  return page === 1 ? { view: 'corrections', hash: anchor } : { view: 'register', id: String(page), hash: anchor };
}
