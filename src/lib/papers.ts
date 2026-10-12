import { useSyncExternalStore } from 'react';
import { PAPER_FIELDS } from './types';
import { viewById } from './views';
import type { Dossier, PaperField, Papers, Route } from './types';

/* A card's papers — the reading, the file, the figures, the sources — are two
   thirds of what data/events.json weighs, and most pages print none of them.
   The build files them apart from the cards (scripts/split-events.ts); this is
   the one place they are read.

   On the server every card's papers are here from the start, and a render
   notes which it read. The prerenderer writes exactly those into the page's
   HTML, so the browser's first render — the hydration — reads what the server
   read and nothing else. The rest arrive in one request: when the search is
   opened, when the board is, or when the reader turns to a page whose papers
   the document did not bring. A turn waits for them rather than drawing a page
   with holes in it, and a pointer resting on a link to such a page sends for
   them early (main.tsx), so the wait is seldom felt. */

/** One page's papers, as written into its HTML: the page they were printed
 *  for, and per card each field its render read — null where the card has none. */
export interface Carried { at: string; papers: Record<string, { [K in PaperField]?: Papers[K] | null }> }

/** Every card's papers, once they are here: primed on the server, fetched in the browser. */
let all: Record<string, Papers> | null = null;
/** What the page was printed with, until the rest arrive. */
let carried: Carried['papers'] = {};
let carriedAt = '';
/** Server side: per card, the fields read since the last prime. */
let recording: Map<string, Set<PaperField>> | null = null;
/** The one request for the rest, while it is out or once it has landed. */
let pending: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();
const isBrowser = typeof window !== 'undefined';

/** The page a route names. Two routes of one page — a search typed, a section
 *  linked, a card pinned on the board — are not a turn. */
const pageOf = (route: Route): string =>
  (route.view === 'board' ? 'board' : route.view + '|' + (route.id || '') + '|' + (route.finding || ''));

/** Take the papers a page was printed with. The browser reads its own block,
 *  below; a test hands one over to read as a browser would. */
export function carryPapers(block: Carried | null): void {
  carried = (block && block.papers) || {};
  carriedAt = (block && block.at) || '';
}

try {
  const el = typeof document !== 'undefined' ? document.getElementById('papers-inline') : null;
  if (el) carryPapers(JSON.parse(el.textContent || 'null'));
} catch { carryPapers(null); }

/** Server side: every card's papers, and start noting which are read. `null`
 *  forgets them — only a test does that, to read as a browser would. */
export function primePapers(papers: Record<string, Papers> | null): void {
  all = papers;
  recording = papers ? new Map() : null;
  pending = null;
}

/** Server side: what the render since `primePapers` read, for its page to
 *  carry. A page the registry says reads papers carries a block even when this
 *  one read none — a stretch of the line with no lead card — so a turn back to
 *  it knows it has what it needs. */
export function carriedPapers(route: Route): Carried | null {
  const have = all;
  const view = viewById[route.view];
  if (!recording || !have || (!recording.size && !(view && view.papers))) return null;
  const papers: Carried['papers'] = {};
  recording.forEach((fields, id) => {
    const out: Record<string, unknown> = {};
    fields.forEach((f) => { const v = have[id] ? have[id][f] : undefined; out[f] = v === undefined ? null : v; });
    papers[id] = out;
  });
  return { at: pageOf(route), papers };
}

/** One of a card's papers. A card that carries its own is read as written; a
 *  filed card from what is here — and in the browser a miss sends for the rest,
 *  and whatever called `usePapers` draws again when they land. */
export function paperOf<K extends PaperField>(card: Dossier | null | undefined, field: K): Papers[K] | undefined {
  if (!card) return undefined;
  const own = card[field];
  if (own !== undefined) return own;
  const id = card.id;
  if (!id) return undefined;
  if (recording) {
    const fields = recording.get(id);
    if (fields) fields.add(field); else recording.set(id, new Set([field]));
  }
  if (all) return all[id] ? all[id][field] : undefined;
  const page = carried[id];
  if (page && field in page) return (page[field] ?? undefined) as Papers[K] | undefined;
  if (isBrowser) loadPapers().catch(() => {});
  return undefined;
}

/** Every card's papers, in one request however many ask. A failed request is
 *  forgotten, so the next ask tries again. */
export function loadPapers(): Promise<void> {
  if (all) return Promise.resolve();
  if (!pending) {
    pending = import('../../data/events.json?papers').then(
      (m) => { all = m.default; version += 1; listeners.forEach((l) => l()); },
      (err: unknown) => { pending = null; throw err; }
    );
  }
  return pending;
}

/** How many times the papers have arrived: 0, then 1. */
export const papersVersion = (): number => version;

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Draw again when the papers arrive. The server, and the hydration, say 0. */
export const usePapers = (): number => useSyncExternalStore(subscribe, papersVersion, () => 0);

const knows = (id: string): boolean => !!carried[id] && PAPER_FIELDS.every((f) => f in carried[id]);

/** Does the page a route names have every paper it reads? */
export function hasPapers(route: Route): boolean {
  if (all) return true;
  // The field filters by every card's words, and so does a missed address's guess.
  if (route.query || route.missing) return false;
  // A dossier reads one card's papers, and so does the board's panel.
  if (route.view === 'card' || route.view === 'board') return !route.id || knows(route.id);
  const view = viewById[route.view];
  return !(view && view.papers) || pageOf(route) === carriedAt;
}

/** What a turn to `next` waits for: nothing when that page has its papers or
 *  is the page already open, else the papers. A failed request turns the page
 *  anyway, and the page reads what there is. */
export function papersFor(next: Route, prev: Route | null): Promise<void> | null {
  if ((prev && pageOf(prev) === pageOf(next)) || hasPapers(next)) return null;
  return loadPapers().catch(() => undefined);
}
