import file from '../../../data/machines.json?bodies';
import { MACHINES } from '../machines';
import type { Machine } from '../types';

/* A machine in full: the lede, what to try, what is as it was and what is
   not, whose reconstruction it is and the papers it was rebuilt from. Every
   page may list a machine from its head (machines/index.ts); the card that
   runs it and the page that lists them all print the rest, and bring it in
   their chunks (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.machines.map((m) => [m.id, m]));
const FULL: Record<string, Machine> = Object.fromEntries(MACHINES.map((m) => [m.id, { ...m, ...BODY[m.id] }]));

/** A machine with all the board says of it. */
export const machineInFull = (id: string): Machine | null => FULL[id] || null;
