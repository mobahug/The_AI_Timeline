import file from '../../../data/promises.json?bodies';
import { PLEDGES } from '../pledges';
import type { Pledge } from '../types';

/* A promise in full: its words, its reading, what the record shows it did,
   quoted, its sources and the line it gives each card. Every page may list a
   promise from its head (pledges.ts); the two promise pages print the rest,
   and bring it in their chunks (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.promises.map((p) => [p.id, p]));
const FULL: Record<string, Pledge> = Object.fromEntries(PLEDGES.map((p) => {
  const body = BODY[p.id];
  return [p.id, { ...p, ...body, record: p.record.map((r, i) => ({ ...r, note: body.record[i].note })) }];
}));

/** A promise with its words, its reading and its sources. */
export const pledgeInFull = (id: string): Pledge | null => FULL[id] || null;
