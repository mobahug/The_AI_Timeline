import { paperOf } from './papers';
import type { Corrected, Event } from './types';

/* What a card's dossier says of the corrections register: how many times the
   card was corrected, and the newest correction's day and entry, to link. The
   register's words are the register page's own (lib/corrections.ts). The
   build counts each card's from the register and files the count with the
   card's papers (scripts/split-events.ts), so a dossier brings its own card's
   and no other card's. */

/** How often a card was corrected, and its newest correction; null if never. */
export const correctedOf = (card: Event): Corrected | null => paperOf(card, 'corrected') || null;
