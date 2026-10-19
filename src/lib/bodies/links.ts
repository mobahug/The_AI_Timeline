import file from '../../../data/links.json?bodies';
import { describeWith } from '../meta';

/* A string's case note: the paragraph that argues it. Every page knows which
   strings carry one (data.ts); the pages that print one — a card's strings, a
   scenario's parents, a clue on the board, the start page's specimen — import
   this, and the notes travel in their chunks (components/viewChunks.ts), never
   in the main script. A note is read by the string's two ends, as a clue's
   address names the string. */

const NOTES = new Map(file.map((l) => [l.from + '>' + l.to, l.note]));

/** The case note on the string from one card to another, if it carries one. */
export const noteOf = (from: string, to: string): string | undefined => NOTES.get(from + '>' + to);

// A clue's address is described with its string's note (meta.ts).
describeWith({ note: noteOf });
