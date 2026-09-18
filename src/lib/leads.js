import raw from '../../data/leads.json';

/* The leads: lines of inquiry through the record. A lead is an ordered list of
   rungs, each a card on the board with the level it reached and a sentence that
   connects it to the next. Everything a lead page shows beyond that — the strings
   between consecutive rungs, the years it spans, the threads it crosses — is
   derived from the graph at render. */

export const LEADS = raw.leads;
export const leadById = Object.fromEntries(LEADS.map((l) => [l.id, l]));

/** The ids of every card that sits on any lead. */
export const LEAD_CARD_IDS = new Set(LEADS.flatMap((l) => l.rungs.map((r) => r.event)));

/** Every lead a card is a rung of, with its rung index. */
export function leadsOf(id) {
  const out = [];
  LEADS.forEach((l) => {
    const i = l.rungs.findIndex((r) => r.event === id);
    if (i >= 0) out.push({ lead: l, index: i, rung: l.rungs[i] });
  });
  return out;
}

/** A lead resolved against the graph: rungs with their cards, the string (if any)
 *  the board already draws between consecutive rungs, and the span. Rungs whose
 *  card is filtered out of the graph are dropped, so a lead on a filtered board
 *  is still a ladder, just a shorter one. */
export function buildLead(graph, lead) {
  const rungs = lead.rungs
    .map((r, i) => ({ ...r, n: i + 1, card: graph.index[r.event] }))
    .filter((r) => r.card);
  const steps = rungs.slice(1).map((r, i) => {
    const prev = rungs[i];
    const string = graph.edges.find((l) => (l.from === prev.event && l.to === r.event) || (l.from === r.event && l.to === prev.event));
    return { from: prev, to: r, string: string || null };
  });
  const years = rungs.map((r) => r.card.year);
  const threads = [...new Set(rungs.map((r) => r.card.thread))];
  return {
    lead,
    rungs,
    steps,
    strung: steps.filter((s) => s.string).length,
    span: years.length ? { from: Math.min(...years), to: Math.max(...years) } : null,
    threads,
    record: rungs.filter((r) => !r.card.future).length,
    scenarios: rungs.filter((r) => r.card.future).length
  };
}

/** The rungs as chain steps the board can walk: one step per rung, from the
 *  rung before it (the first rung steps from itself), the claim being the level
 *  reached and the note being the rung's text. */
export function leadChain(graph, lead) {
  const built = buildLead(graph, lead);
  return built.rungs.map((r, i) => ({
    from: i ? built.rungs[i - 1].event : r.event, to: r.event,
    claim: r.label, note: r.text,
    lead: lead.id, rung: r.n, of: built.rungs.length,
    string: i ? built.steps[i - 1].string : null
  }));
}
