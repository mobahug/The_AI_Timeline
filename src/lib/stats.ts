import { ERAS, FIRST, NOW, THREADS, yearFraction } from './data';
import { LEADS, buildLead } from './leads';
import { ORGS, PEOPLE, appearancesOf } from './files';
import type { Edge, Entity, Era, Event, Graph, Lead, Thread } from './types';

/* The charts' arithmetic: the board's cards and strings, counted. Nothing here
   is written by hand — every number is a count of what data/ holds, so a chart
   moves when the record does, and the sentence above it moves with it.

   Record only, unless a function says otherwise. A scenario's year is a
   placeholder, and a count of placeholders is not a pace. What is counted is
   what the board has pinned up: one reading of the field, not a census of it,
   and the charts page says so. */

/* ─── The pace ───────────────────────────────────────────────────────── */

export interface YearRow { year: number; total: number; byThread: Record<string, number>; cards: Event[] }

/** Cards on the record in each year, from the first year drawn to the present —
 *  the empty years included, since a gap is part of the shape. */
export function perYear(graph: Graph): YearRow[] {
  const rows: YearRow[] = [];
  for (let y = FIRST; y <= NOW; y++) rows.push({ year: y, total: 0, byThread: Object.fromEntries(THREADS.map((t) => [t.id, 0])), cards: [] });
  for (const e of graph.all) {
    if (e.future || e.year < FIRST || e.year > NOW) continue;
    const row = rows[e.year - FIRST];
    row.total += 1;
    row.byThread[e.thread] = (row.byThread[e.thread] || 0) + 1;
    row.cards.push(e);
  }
  return rows;
}

/** The record's era headings up to the present: the eras a count can fill. */
export const recordEras = (): Era[] => ERAS.filter((e) => e.year <= NOW);

export interface Pace {
  rows: YearRow[];
  /** The busiest year (the later one, on a tie) and its count. */
  peak: YearRow;
  /** The run of years from the first that, together, hold no more cards than the peak year alone. */
  before: { to: number; cards: number };
  /** The cards since the era before the present one began, of all the record's. */
  since: { from: number; cards: number; of: number };
}

export function pace(graph: Graph): Pace {
  const rows = perYear(graph);
  const peak = rows.reduce((a, b) => (b.total >= a.total ? b : a), rows[0]);
  let cards = 0;
  let to = rows[0].year;
  for (const r of rows) {
    if (cards + r.total > peak.total) break;
    cards += r.total;
    to = r.year;
  }
  const eras = recordEras();
  const from = (eras[eras.length - 2] || eras[0]).year;
  const of = rows.reduce((n, r) => n + r.total, 0);
  return { rows, peak, before: { to, cards }, since: { from, cards: rows.filter((r) => r.year >= from).reduce((n, r) => n + r.total, 0), of } };
}

/* ─── What each era is about ─────────────────────────────────────────── */

export interface EraGrid {
  eras: Era[];
  threads: Thread[];
  /** cells[thread][era]: the record's cards in that thread and era. */
  cells: number[][];
  /** Each era's cards, all threads. */
  totals: number[];
  max: number;
}

/** The era a year files under: the last heading that does not start after it. */
export const eraIndexOf = (eras: Era[], year: number): number => {
  let at = 0;
  eras.forEach((e, i) => { if (year >= e.year) at = i; });
  return at;
};

export function eraGrid(graph: Graph): EraGrid {
  const eras = recordEras();
  const cells = THREADS.map(() => eras.map(() => 0));
  const totals = eras.map(() => 0);
  for (const e of graph.all) {
    if (e.future) continue;
    const t = THREADS.findIndex((x) => x.id === e.thread);
    const i = eraIndexOf(eras, e.year);
    if (t < 0) continue;
    cells[t][i] += 1;
    totals[i] += 1;
  }
  return { eras, threads: THREADS, cells, totals, max: Math.max(...cells.flat()) };
}

/** The thread with the most cards in one era (the first listed, on a tie). */
export function topThread(grid: EraGrid, era: number): { thread: Thread; cards: number; of: number } {
  let best = 0;
  grid.threads.forEach((_, t) => { if (grid.cells[t][era] > grid.cells[best][era]) best = t; });
  return { thread: grid.threads[best], cards: grid.cells[best][era], of: grid.totals[era] };
}

/* ─── Two threads, year by year ──────────────────────────────────────── */

export interface PairRow { year: number; a: number; b: number; cards: Event[] }

/** Two threads' cards per year, over the years from `from` to the present. */
export function threadPair(graph: Graph, a: string, b: string, from: number): PairRow[] {
  const rows: PairRow[] = [];
  for (let y = from; y <= NOW; y++) rows.push({ year: y, a: 0, b: 0, cards: [] });
  for (const e of graph.all) {
    if (e.future || e.year < from || e.year > NOW) continue;
    if (e.thread !== a && e.thread !== b) continue;
    const row = rows[e.year - from];
    if (e.thread === a) row.a += 1; else row.b += 1;
    row.cards.push(e);
  }
  return rows;
}

/** The year a series peaks (the later one, on a tie), and the count. */
export function peakOf(rows: PairRow[], key: 'a' | 'b'): { year: number; count: number } {
  const top = rows.reduce((x, r) => (r[key] >= x[key] ? r : x), rows[0]);
  return { year: top.year, count: top[key] };
}

/** The first year on the record a thread appears, and the card that opens it. */
export function firstOf(graph: Graph, thread: string): Event | null {
  return graph.all.find((e) => !e.future && e.thread === thread) || null;
}

/* ─── How long a string takes ────────────────────────────────────────── */

export interface SpanBin { label: string; from: number; to: number; edges: Edge[] }
export interface Gap { edge: Edge; from: Event; to: Event; gap: number }
export interface Spans {
  bins: SpanBin[];
  /** Strings with both ends on the record — the ones a gap can be measured on. */
  measured: number;
  /** Every string on the board. */
  total: number;
  median: number;
  longest: Gap[];
}

/* The bins are a reading aid, not a claim: single years where most strings
   fall, wider bins where few do, so no bar is a sliver. */
const BINS: [string, number, number][] = [
  ['Same year', 0, 0], ['1 year', 1, 1], ['2', 2, 2], ['3–5', 3, 5], ['6–10', 6, 10],
  ['11–20', 11, 20], ['21–50', 21, 50], ['Over 50', 51, Infinity]
];

export function stringSpans(graph: Graph, longest = 3): Spans {
  const gaps: Gap[] = graph.edges
    .map((edge) => ({ edge, from: graph.index[edge.from], to: graph.index[edge.to] }))
    .filter((x) => x.from && x.to && !x.from.future && !x.to.future)
    .map((x) => ({ ...x, gap: x.to.year - x.from.year }));
  const sorted = gaps.slice().sort((a, b) => a.gap - b.gap);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)].gap : 0;
  return {
    bins: BINS.map(([label, from, to]) => ({ label, from, to, edges: gaps.filter((g) => g.gap >= from && g.gap <= to).map((g) => g.edge) })),
    measured: gaps.length,
    total: graph.edges.length,
    median,
    longest: sorted.slice(-longest).reverse()
  };
}

/* ─── The ladders ────────────────────────────────────────────────────── */

/** Where in its year a card falls, as a fraction of the year: its date where
 *  the record knows it, the middle of the year where it does not. */
export function within(e: Event): number {
  const m = /^\d{4}-(\d{2})(?:-(\d{2}))?$/.exec(e.date || '');
  if (!m) return 0.5;
  return (Number(m[1]) - 1 + (m[2] ? (Number(m[2]) - 1) / 31 : 0.5)) / 12;
}

/** A card's place on the board's own time axis, 0 to 1: the recent years drawn wider. */
export const placeOf = (e: Event): number => yearFraction(e.year + within(e));

export interface Rung { n: number; event: Event; label: string; x: number }
export interface Ladder { lead: Lead; rungs: Rung[] }
export interface Ladders { ladders: Ladder[]; total: number; median: number; first: number; scenarios: number }

export function ladders(graph: Graph): Ladders {
  const out = LEADS.map((lead) => {
    const built = buildLead(graph, lead);
    return { lead, rungs: built.rungs.map((r) => ({ n: r.n, event: r.card, label: r.label, x: placeOf(r.card) })) };
  });
  const years = out.flatMap((l) => l.rungs.map((r) => r.event.year)).sort((a, b) => a - b);
  return {
    ladders: out,
    total: years.length,
    median: years.length ? years[Math.floor((years.length - 1) / 2)] : NOW,
    first: years.length ? years[0] : FIRST,
    scenarios: out.reduce((n, l) => n + l.rungs.filter((r) => r.event.future).length, 0)
  };
}

/* ─── The names that recur ───────────────────────────────────────────── */

export interface NameCount { entity: Entity; cards: number }

/** The people or organisations on the most cards, most first, by name on a tie. */
export function topNames(graph: Graph, kind: 'person' | 'org', n = 8): NameCount[] {
  const list: Entity[] = kind === 'person' ? PEOPLE : ORGS;
  return list
    .map((entity) => ({ entity, cards: appearancesOf(graph, entity).length }))
    .sort((a, b) => b.cards - a.cards || a.entity.label.localeCompare(b.entity.label))
    .slice(0, n);
}
