import DATED from 'virtual:board-dated';
import type { ChangeKind } from './types';

/* The days each card was filed on the board and last changed, from the
   commits that did it (scripts/board-changes.ts). A card's dossier prints them
   at its foot and in its citation, and brings them in its chunk
   (components/viewChunks.ts); no other page prints them, nor any other
   record's. */

/** When a record was filed on the board and when it last changed, as days
 *  (`YYYY-MM-DD`), from the history — or null for one not yet committed, and
 *  for any record but a card, whose days no page prints. */
export function keptOf(kind: ChangeKind, id: string): { filed: string; changed: string } | null {
  const d = DATED[kind + '/' + id];
  return d ? { filed: d[0], changed: d[1] } : null;
}
