import file from '../../../data/leads.json?bodies';
import { LEADS, buildLead } from '../leads';
import type { Graph, Lead, Step } from '../types';

/* A lead in full: where it stands, and the sentence each rung adds. Every page
   holds a lead's head (leads.ts); the lead's own page, the dossier of a card on
   its ladder and the board that walks it print the rest, and bring it in their
   chunks (components/viewChunks.ts). */

const BODY = Object.fromEntries(file.leads.map((l) => [l.id, l]));
const FULL: Record<string, Lead> = Object.fromEntries(LEADS.map((l) => {
  const body = BODY[l.id];
  return [l.id, { ...l, standing: body.standing, rungs: l.rungs.map((r, i) => ({ ...r, text: body.rungs[i].text })) }];
}));

/** A lead with where it stands and its rungs' sentences. */
export const leadInFull = (id: string): Lead | null => FULL[id] || null;

/** The rungs as chain steps the board can walk: one step per rung, from the
 *  rung before it (the first rung steps from itself), the claim being the level
 *  reached and the note being the rung's text. */
export function leadChain(graph: Graph, lead: Lead): Step[] {
  const built = buildLead(graph, lead);
  return built.rungs.map((r, i): Step => ({
    from: i ? built.rungs[i - 1].event : r.event, to: r.event,
    claim: r.label, note: r.text,
    lead: lead.id, rung: r.n, of: built.rungs.length,
    string: i ? built.steps[i - 1].string : null
  }));
}
