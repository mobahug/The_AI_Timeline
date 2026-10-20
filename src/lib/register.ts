// Read by vite.config.ts, through scripts/split-events.ts, so its imports are
// written as Vite's native config loader needs them: with extensions, and no data.
import type { Correction } from './types.ts';

/* The corrections register, a page at a time. It printed every entry on one
   page, and at 256 entries that page weighed 96KB of HTML and a 72KB script:
   each entry's words travelled twice, once printed and once to hydrate them,
   and the first paint waited for both. Every card checked against its sources
   brings more, so the register prints PER_PAGE entries to a page, newest
   first, and a page's script carries its own entries and no others.

   The order and the cut are made here from any list of entries, with no data
   imported, so the build (scripts/split-events.ts), the prerenderer, the
   sitemap and the site all cut the register in the same places. */

/** How many entries a page of the register prints. */
export const PER_PAGE = 40;

interface Entry { id: string; date: string; event?: string }

/** How many pages a register of `n` entries fills. An empty register still has its first. */
export const pageCount = (n: number): number => Math.max(1, Math.ceil(n / PER_PAGE));

/** Newest first, and in a commit's own order within a day: the file's order. */
export function newestFirst<T extends Entry>(list: readonly T[]): T[] {
  return list.map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.date.localeCompare(a.c.date) || a.i - b.i)
    .map(({ c }) => c);
}

/** The page that prints each anchor: every entry's, and every month's, on the
 *  page where the month begins. Newer entries move an entry along the pages,
 *  so an address made before them is sent on by this (scripts/split-events.ts
 *  serves it as virtual:register-index). */
export function registerIndex(list: readonly Entry[]): Record<string, number> {
  const index: Record<string, number> = {};
  newestFirst(list).forEach((c, i) => {
    const page = Math.floor(i / PER_PAGE) + 1;
    const month = 'm-' + c.date.slice(0, 7);
    index[c.id] = page;
    if (!index[month]) index[month] = page;
  });
  return index;
}

/** One page of the register, as the build writes it: its entries, and what it
 *  says of the whole register, which no page holds. */
export interface RegisterPage<T extends Entry = Correction> {
  /** The sentence the register prints about how it is kept. */
  note: string;
  /** How many entries the register has in all, and how many cards they touch. */
  total: number;
  cards: number;
  /** Each month this page prints: how many entries the month has in all, and
   *  how many of them the pages before this one print. */
  months: Record<string, { total: number; before: number }>;
  corrections: T[];
}

/** The register's pages, first to last. */
export function registerPages<T extends Entry>(list: readonly T[], note: string): RegisterPage<T>[] {
  const order = newestFirst(list);
  const cards = new Set(list.map((c) => c.event).filter(Boolean)).size;
  const inMonth: Record<string, number> = {};
  order.forEach((c) => { const m = c.date.slice(0, 7); inMonth[m] = (inMonth[m] || 0) + 1; });
  const printed: Record<string, number> = {};
  const out: RegisterPage<T>[] = [];
  for (let p = 0; p < pageCount(order.length); p++) {
    const corrections = order.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
    const months: RegisterPage['months'] = {};
    corrections.forEach((c) => { const m = c.date.slice(0, 7); if (!months[m]) months[m] = { total: inMonth[m], before: printed[m] || 0 }; });
    corrections.forEach((c) => { const m = c.date.slice(0, 7); printed[m] = (printed[m] || 0) + 1; });
    out.push({ note, total: list.length, cards, months, corrections });
  }
  return out;
}
