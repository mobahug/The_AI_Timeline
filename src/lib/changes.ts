import CHANGED from 'virtual:board-changes';
import { leadById } from './leads';
import { questionById } from './questions';
import { checkById } from './checks';
import { predictionById } from './predictions';
import { pledgeById } from './pledges';
import type { Change, ChangeKind, Graph, RoutePatch } from './types';

/* What changed on the board: the records most recently added or revised, dated
   from the commits that did it (scripts/board-changes.ts). Only the latest page
   prints them, so they travel in its chunk (components/viewChunks.ts), not in
   the main script. */

export const CHANGES: Change[] = CHANGED;

export interface Changed extends Change { title: string; to: RoutePatch; noun: string; isNew: boolean }

const NOUN: Record<ChangeKind, string> = { card: 'Card', lead: 'Lead', question: 'Plain question', check: 'Headline check', prediction: 'Prediction', promise: 'Promise' };

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
