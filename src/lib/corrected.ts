import { paperOf } from './papers';
import type { Corrected, Event, Route, RoutePatch } from './types';

/* What a card's dossier says of the corrections register: how many times the
   card was corrected, and the newest correction's day and entry, to link. The
   register's words are its pages' own (lib/corrections.ts). The build counts
   each card's from the register and files the count with the card's papers
   (scripts/split-events.ts), with the page of the register that prints the
   newest, so a dossier brings its own card's and no other card's, and links
   straight to that page. */

/** How often a card was corrected, and its newest correction; null if never. */
export const correctedOf = (card: Event): Corrected | null => paperOf(card, 'corrected') || null;

/** Where the register prints an anchor, on the page given: the page, and the anchor on it. */
export function atRegister(anchor: string, page: number): RoutePatch & Pick<Route, 'view'> {
  return page === 1 ? { view: 'corrections', hash: anchor } : { view: 'register', id: String(page), hash: anchor };
}
