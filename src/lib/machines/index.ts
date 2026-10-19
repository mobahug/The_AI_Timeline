import raw from '../../../data/machines.json';
import type { Machine } from '../types';

/* The machines: programs from the record rebuilt to run in the browser, each
   from its original papers and each on its card. This file is what every page
   may read — which card runs which machine, and what the board says about it.
   The programs themselves are fetched only by the card that runs them
   (components/MachineSection.tsx). */

export const MACHINES: Machine[] = raw.machines as Machine[];
export const machineById: Record<string, Machine> = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

/** The machine that runs on a card, if one does. */
export const machineOf = (event: string): Machine | null => MACHINES.find((m) => m.event === event) || null;
