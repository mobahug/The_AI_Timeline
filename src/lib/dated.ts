import { paperOf } from './papers';
import type { Event } from './types';

/* The days each card was filed on the board and last changed, from the
   commits that did it (scripts/board-changes.ts). A card's dossier prints them
   at its foot and in its citation, and no other page prints them. The build
   files them with the card's papers (scripts/split-events.ts), so a dossier
   brings its own card's days and no other card's. */

/** When a card was filed on the board and when it last changed, as days
 *  (`YYYY-MM-DD`), from the history — or null for one not yet committed. */
export function keptOf(card: Event): { filed: string; changed: string } | null {
  const d = paperOf(card, 'kept');
  return d ? { filed: d[0], changed: d[1] } : null;
}
