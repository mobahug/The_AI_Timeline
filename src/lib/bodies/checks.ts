import file from '../../../data/checks.json?bodies';
import { CHECKS } from '../checks';
import type { Check } from '../types';

/* A headline check in full: the report, the primary accounts, each line set
   beside them, the reading and what is open. Every page may list a check from
   its head (checks.ts); the two check pages print the rest, and bring it in
   their chunks (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.checks.map((c) => [c.id, c]));
const FULL: Record<string, Check> = Object.fromEntries(CHECKS.map((c) => [c.id, { ...c, ...BODY[c.id] }]));

/** A check with its report, its primary accounts and the lines it checked. */
export const checkInFull = (id: string): Check | null => FULL[id] || null;
