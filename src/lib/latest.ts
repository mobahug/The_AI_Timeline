import CHANGED, { DATED } from 'virtual:board-changes';
import raw from '../../data/watch.json';
import { AS_OF, dayText } from './data';
import { leadById } from './leads';
import { questionById } from './questions';
import { checkById } from './checks';
import { predictionById } from './predictions';
import { pledgeById } from './pledges';
import type { Change, ChangeKind, Event, Graph, RoutePatch, Watch } from './types';

/* The latest: what happened most recently on the record, what the record
   already knows is coming, and what changed on the board itself. Every date on
   the page is the record's own or the history's: the cards' dates, the dates
   their words name (data/watch.json, each one quoted from its card), and the
   commits that added or revised a record (scripts/board-changes.ts). The page
   is as current as the record says it is — AS_OF — and no more. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** `2026-09` → `September 2026`. */
export const monthOf = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  return (MONTHS[m - 1] || '') + ' ' + y;
};

export interface Stretch { key: string; label: string; items: Event[] }

/** The record's newest cards, newest first: every card dated within a year of
 *  the day the record was last brought up to date, by month, and the cards of
 *  that year that carry no date, under the year itself, after its months — a
 *  card written at year scale is the ground the dated ones happened on. */
export function lately(graph: Graph, asOf: string = AS_OF): Stretch[] {
  const year = Number(asOf.slice(0, 4));
  const since = (year - 1) + asOf.slice(4, 7);
  const out: Stretch[] = [];
  const at = (key: string, label: string) => {
    let s = out.find((x) => x.key === key);
    if (!s) { s = { key, label, items: [] }; out.push(s); }
    return s;
  };
  const record = graph.all.filter((e) => !e.future).slice().reverse();
  for (const e of record) {
    if (e.date && e.date.slice(0, 7) >= since && e.date.slice(0, 10) <= asOf) at(e.date.slice(0, 7), monthOf(e.date.slice(0, 7))).items.push(e);
    else if (!e.date && e.year === year) at(String(e.year), e.year + ', across the year').items.push(e);
  }
  // Newest first; a year's undated cards after its dated months.
  const rank = (key: string) => (key.length === 4 ? key + '-00' : key);
  return out.sort((a, b) => rank(b.key).localeCompare(rank(a.key)));
}

/* ─── The watch ──────────────────────────────────────────────────────── */

export const WATCH: Watch[] = raw.watch as Watch[];

/** The dates still ahead of the record, soonest first; the dates it has passed;
 *  and the questions it is waiting on with no date set. */
export function watchList(asOf: string = AS_OF): { ahead: Watch[]; passed: Watch[]; open: Watch[] } {
  const dated = WATCH.filter((w) => w.date).sort((a, b) => (a.date as string).localeCompare(b.date as string));
  return {
    ahead: dated.filter((w) => (w.date as string) > asOf),
    passed: dated.filter((w) => (w.date as string) <= asOf),
    open: WATCH.filter((w) => !w.date)
  };
}

/** A watched date, as the board writes dates: `12 Nov 2026`. */
export const dateOf = (w: Watch): string => dayText(w.date || '');

/* ─── What changed on the board ──────────────────────────────────────── */

export const CHANGES: Change[] = CHANGED;

/** When a record was filed on the board and when it last changed, as days
 *  (`YYYY-MM-DD`), from the history — or null for one not yet committed. */
export function keptOf(kind: ChangeKind, id: string): { filed: string; changed: string } | null {
  const d = DATED[kind + '/' + id];
  return d ? { filed: d[0], changed: d[1] } : null;
}

export interface Changed extends Change { title: string; to: RoutePatch; noun: string; isNew: boolean }

const NOUN: Record<ChangeKind, string> = { card: 'Card', lead: 'Lead', question: 'Plain question', check: 'Headline check', prediction: 'Prediction', promise: 'Promise' };

/** The day a commit was made, as the board writes dates: `15 Oct 2026`. */
export const dayOf = dayText;

/** The changes, each resolved against the data the page holds: its present
 *  title and its address. A record no longer on the board is left out. */
export function changes(graph: Graph, list: Change[] = CHANGES): Changed[] {
  const out: Changed[] = [];
  for (const c of list) {
    const title =
      c.kind === 'card' ? graph.index[c.id] && graph.index[c.id].title
      : c.kind === 'lead' ? leadById[c.id] && leadById[c.id].title
      : c.kind === 'question' ? questionById[c.id] && questionById[c.id].question
      : c.kind === 'check' ? checkById[c.id] && checkById[c.id].title
      : c.kind === 'prediction' ? predictionById[c.id] && predictionById[c.id].title
      : pledgeById[c.id] && pledgeById[c.id].title;
    if (!title) continue;
    out.push({ ...c, title, noun: NOUN[c.kind], isNew: !c.subject, to: { view: c.kind, id: c.id } });
  }
  return out;
}
