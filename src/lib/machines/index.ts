import raw from '../../../data/machines.json?heads';
import type { MachineHead } from '../types';

/* The machines: programs from the record rebuilt to run in the browser, each
   from its original papers and each on its card. This file is what every page
   may read — which card runs which machine, and what it is in a line. What the
   board says about each at length is read by the pages that run it or list it
   (bodies/machines.ts), and the programs themselves are fetched only by the
   card that runs them (components/MachineSection.tsx). */

export const MACHINES: MachineHead[] = raw.machines;
export const machineById: Record<string, MachineHead> = Object.fromEntries(MACHINES.map((m) => [m.id, m]));

/** The machine that runs on a card, if one does. */
export const machineOf = (event: string): MachineHead | null => MACHINES.find((m) => m.event === event) || null;
