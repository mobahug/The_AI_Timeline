import rawEvents from '../../data/events.json';
import rawLinks from '../../data/links.json';
import meta from '../../data/threads.json';

export const NOW = 2026;
export const LAST = 2050;
export const THREADS = meta.threads;
export const ERAS = meta.eras;
export const CATEGORIES = meta.categories;

const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const catLabel = (id) => (catById[id] ? catById[id].label : id);
export const catHue = (id) => (catById[id] ? catById[id].hue : 250);
export const threadOf = (id) => (catById[id] ? catById[id].thread : THREADS[0].id);

export const events = rawEvents.map((e) => ({
  ...e,
  thread: threadOf(e.category),
  future: e.year > NOW
}));

export const links = rawLinks;
export const byId = Object.fromEntries(events.map((e) => [e.id, e]));

/** Warm-to-cool accent for a category, faded as a projection gets further out. */
export const fade = (year) => (year <= NOW ? 0 : Math.min(1, (year - NOW) / (LAST - NOW)));
export const accent = (cat, f = 0) =>
  'oklch(' + (0.8 - f * 0.16).toFixed(2) + ' ' + (0.14 - f * 0.1).toFixed(3) + ' ' + catHue(cat) + ')';

/** Non-linear time axis: the last fifteen years get as much room as the first ninety. */
const ANCHORS = [[1900, 0], [1950, 0.05], [1980, 0.11], [2000, 0.19], [2010, 0.29], [2015, 0.4],
  [2018, 0.48], [2020, 0.55], [2022, 0.62], [2023, 0.69], [2024, 0.755], [2025, 0.815],
  [2026, 0.865], [2030, 0.915], [2040, 0.96], [2050, 1]];

export const yearFraction = (year) => {
  if (year <= ANCHORS[0][0]) return 0;
  for (let i = 1; i < ANCHORS.length; i++) {
    if (year <= ANCHORS[i][0]) {
      const [ay, af] = ANCHORS[i - 1];
      const [by, bf] = ANCHORS[i];
      return af + ((bf - af) * (year - ay)) / (by - ay);
    }
  }
  return 1;
};

export const yearAtFraction = (v) => {
  for (let i = 1; i < ANCHORS.length; i++) {
    if (v <= ANCHORS[i][1]) {
      const [ay, af] = ANCHORS[i - 1];
      const [by, bf] = ANCHORS[i];
      return Math.round(ay + ((by - ay) * (v - af)) / Math.max(1e-6, bf - af));
    }
  }
  return LAST;
};

export const TICKS = ANCHORS.map(([y]) => y);

/** Merge the canonical data with a contributor's local board edits. */
export function buildGraph(board) {
  const b = board || { nodes: [], edges: [], hidden: [], hiddenEdges: [], edits: {} };
  const hidden = b.hidden || [];
  const edits = b.edits || {};
  const base = events
    .filter((e) => !hidden.includes(e.id))
    .map((e) => {
      const patch = edits[e.id];
      if (!patch) return e;
      const merged = { ...e, ...patch };
      merged.thread = threadOf(merged.category);
      merged.future = merged.year > NOW;
      return merged;
    });
  const mine = (b.nodes || []).map((n) => ({
    ...n,
    thread: threadOf(n.category),
    future: n.year > NOW,
    local: true
  }));
  const all = [...base, ...mine].sort((a, c) => a.year - c.year);
  const index = Object.fromEntries(all.map((e) => [e.id, e]));

  const canon = links.map((l, i) => ({ ...l, id: 'c' + i }));
  const extra = (b.edges || []).map((l, i) => ({ ...l, id: 'l' + i, local: true }));
  const edges = [...canon, ...extra]
    .filter((l) => !(b.hiddenEdges || []).includes(l.id))
    .filter((l) => index[l.from] && index[l.to] && l.from !== l.to);

  const adjacency = {};
  edges.forEach((l) => {
    (adjacency[l.from] = adjacency[l.from] || []).push({ id: l.to, claim: l.claim, note: l.note, out: true, edge: l.id });
    (adjacency[l.to] = adjacency[l.to] || []).push({ id: l.from, claim: l.claim, note: l.note, out: false, edge: l.id });
  });

  return { all, index, edges, adjacency };
}

/** Walk backwards then forwards from an event to assemble one causal chain. */
export function buildChain(graph, id) {
  const steps = [];
  const seen = [id];
  let cur = id;
  for (let i = 0; i < 10; i++) {
    const incoming = (graph.adjacency[cur] || []).filter((a) => !a.out && !seen.includes(a.id));
    if (!incoming.length) break;
    steps.unshift({ from: incoming[0].id, to: cur, claim: incoming[0].claim, note: incoming[0].note });
    cur = incoming[0].id;
    seen.push(cur);
  }
  const startIndex = steps.length;
  cur = id;
  for (let i = 0; i < 10; i++) {
    const outgoing = (graph.adjacency[cur] || []).filter((a) => a.out && !seen.includes(a.id));
    if (!outgoing.length) break;
    steps.push({ from: cur, to: outgoing[0].id, claim: outgoing[0].claim, note: outgoing[0].note });
    cur = outgoing[0].id;
    seen.push(cur);
  }
  return { steps, start: Math.min(startIndex, Math.max(0, steps.length - 1)) };
}
