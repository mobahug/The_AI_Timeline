import { leadById } from '../../lib/leads';
import type { Graph, RoutePatch, Step } from '../../lib/types';

/* A walk along a chain or up a lead, as the address and the live region carry
   it. Read by the board (BoardView.tsx). */

/** The address a walked step writes: ?lead=&rung= for a rung, ?clue=a>b for a string. */
export const keyOf = (s: Step): string => (s.lead ? 'lead:' + s.lead + ':' + s.rung : s.from + '>' + s.to);
export const patchOf = (s: Step): RoutePatch => (s.lead
  ? { lead: s.lead, rung: s.rung, clue: null, id: null }
  : { clue: { from: s.from, to: s.to }, id: null, lead: null, rung: null });
/** Where a step of a walk lands, in the words the live region says it with:
 *  the clue's place on its chain and the two cards it joins, or the rung's
 *  place on its lead and the card it stands on. The heading shows "3 / 7"; a
 *  voice says "3 of 7". */
export const saidOf = (graph: Graph, steps: Step[], index: number): string => {
  const s = steps[index];
  const to = graph.index[s.to];
  if (s.lead) {
    const lead = leadById[s.lead];
    return 'Rung ' + s.rung + ' of ' + s.of + (lead ? ', ' + lead.title : '') + ': ' + to.title;
  }
  const from = graph.index[s.from];
  return 'Clue ' + (index + 1) + ' of ' + steps.length + ': ' + from.year + ' ' + from.title + ' to ' + to.year + ' ' + to.title;
};
