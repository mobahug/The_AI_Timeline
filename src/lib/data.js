import rawEvents from '../../data/events.json';
import rawLinks from '../../data/links.json';
import meta from '../../data/threads.json';
import { LEAD_CARD_IDS } from './leads.js';

/* The span of the board — the first year drawn, the present, the last year drawn —
   is data, read here once and never retyped. `now` is the line between record and
   scenario: everything after it carries a confidence instead of a citation. */
export const FIRST = meta.span.first;
export const NOW = meta.span.now;
export const LAST = meta.span.last;
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

/** Warm-to-cool accent for a category, faded as a projection gets further out. */
export const fade = (year) => (year <= NOW ? 0 : Math.min(1, (year - NOW) / (LAST - NOW)));
export const accent = (cat, f = 0) =>
  'oklch(' + (0.8 - f * 0.16).toFixed(2) + ' ' + (0.14 - f * 0.1).toFixed(3) + ' ' + catHue(cat) + ')';

/** Non-linear time axis: the last fifteen years get as much room as the first ninety. */
const ANCHORS = [[FIRST, 0], [1950, 0.05], [1980, 0.11], [2000, 0.19], [2010, 0.29], [2015, 0.4],
  [2018, 0.48], [2020, 0.55], [2022, 0.62], [2023, 0.69], [2024, 0.755], [2025, 0.815],
  [NOW, 0.865], [2030, 0.915], [2040, 0.96], [LAST, 1]];

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

/** The graph: every card and string in data/, indexed and joined. The board
 *  changes in the data and nowhere else. `extra` — `{ nodes, edges }` — is
 *  for the tests, which prove the derivations are data-driven by adding a card
 *  and a string that the files do not contain. */
export function buildGraph(extra) {
  const x = extra || {};
  const more = (x.nodes || []).map((n) => ({ ...n, thread: threadOf(n.category), future: n.year > NOW }));
  const all = [...events, ...more].map((e) => ({ ...e })).sort((a, c) => a.year - c.year);
  const index = Object.fromEntries(all.map((e) => [e.id, e]));

  const canon = links.map((l, i) => ({ ...l, id: 'c' + i }));
  const added = (x.edges || []).map((l, i) => ({ ...l, id: 'x' + i }));
  const edges = [...canon, ...added].filter((l) => index[l.from] && index[l.to] && l.from !== l.to);

  const adjacency = {};
  edges.forEach((l) => {
    (adjacency[l.from] = adjacency[l.from] || []).push({ id: l.to, claim: l.claim, note: l.note, out: true, edge: l.id });
    (adjacency[l.to] = adjacency[l.to] || []).push({ id: l.from, claim: l.claim, note: l.note, out: false, edge: l.id });
  });

  // A landmark is what the board shows in brief: a featured card, a rung on a
  // lead, or either end of a string that carries a case note. Derived, never
  // tagged, so a new lead or a new note promotes its cards by itself.
  const noted = new Set();
  edges.forEach((l) => { if (l.note) { noted.add(l.from); noted.add(l.to); } });
  all.forEach((e) => { e.landmark = !!(e.featured || LEAD_CARD_IDS.has(e.id) || noted.has(e.id)); });

  return { all, index, edges, adjacency, landmarks: all.filter((e) => e.landmark).length };
}

/** Walk backwards then forwards from an event to assemble one causal chain.
 *  `via` names a preferred first parent. Without it the walk takes whichever
 *  string was authored first, so a shared ?clue=a>b link naming any other
 *  parent of `id` would build a chain that does not contain the requested
 *  string at all — and open nothing. */
export function buildChain(graph, id, via) {
  const steps = [];
  const seen = [id];
  let cur = id;
  for (let i = 0; i < 10; i++) {
    const incoming = (graph.adjacency[cur] || []).filter((a) => !a.out && !seen.includes(a.id));
    if (!incoming.length) break;
    const pick = (i === 0 && via && incoming.find((a) => a.id === via)) || incoming[0];
    steps.unshift({ from: pick.id, to: cur, claim: pick.claim, note: pick.note });
    cur = pick.id;
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

/* ─── The forward horizons ────────────────────────────────────────────────────
   Three bands derived from NOW, so they move when NOW does. Everything below is
   a fact about the strings that have been drawn, never a judgement about the
   world: how many parents a scenario has, how far back they reach, and the two
   states worth naming out loud — a chain that passes through an uncited entry,
   and a chain that rests on another scenario.                                  */

export const HORIZONS = [
  { id: 'near', label: 'Near', from: NOW + 1, to: NOW + 4 },
  { id: 'mid', label: 'Mid', from: NOW + 5, to: NOW + 9 },
  { id: 'far', label: 'Far', from: NOW + 10, to: LAST }
];

export const CONFIDENCE = ['Likely', 'Uncertain', 'Speculative'];

export const projections = events.filter((e) => e.future);

export const parentsOf = (graph, id) => (graph.adjacency[id] || []).filter((a) => !a.out);

/** The strings on one card, split by direction and ordered by the other end's
 *  year — what led to this, and what this led to. */
export function stringsOf(graph, id) {
  const byYear = (a, b) => (graph.index[a.id] ? graph.index[a.id].year : 0) - (graph.index[b.id] ? graph.index[b.id].year : 0);
  const links = (graph.adjacency[id] || []).filter((a) => graph.index[a.id]);
  return {
    into: links.filter((a) => !a.out).sort(byYear),
    outOf: links.filter((a) => a.out).sort(byYear)
  };
}

/** Entries grouped under the era heading they fall in; empty eras are skipped. */
export function groupByEra(items) {
  return ERAS.map((era, i) => {
    const next = ERAS[i + 1] ? ERAS[i + 1].year : Infinity;
    return { era, items: items.filter((e) => e.year >= era.year && e.year < next) };
  }).filter((g) => g.items.length);
}

/** Every string behind one projection — all of them, not one path. */
export function strandOf(graph, id) {
  const self = graph.index[id];
  const parents = parentsOf(graph, id)
    .map((a) => ({ event: graph.index[a.id], claim: a.claim, note: a.note }))
    .sort((a, b) => a.event.year - b.event.year);

  const depth = { [id]: 0 };
  const queue = [id];
  let hops = 0;
  while (queue.length) {
    const cur = queue.shift();
    parentsOf(graph, cur).forEach((p) => {
      if (depth[p.id] !== undefined) return;
      depth[p.id] = depth[cur] + 1;
      hops = Math.max(hops, depth[p.id]);
      queue.push(p.id);
    });
  }

  const memo = {};
  const countPaths = (node, guard) => {
    if (memo[node] !== undefined) return memo[node];
    if (guard.has(node)) return 0;
    guard.add(node);
    const up = parentsOf(graph, node);
    const n = up.length ? up.reduce((sum, p) => sum + countPaths(p.id, guard), 0) : 1;
    guard.delete(node);
    memo[node] = n;
    return n;
  };

  const ancestors = Object.keys(depth).filter((k) => k !== id).map((k) => graph.index[k]);
  const record = ancestors.filter((a) => !a.future).sort((a, b) => a.year - b.year);
  const newest = parents.filter((p) => !p.event.future).map((p) => p.event.year).sort((a, b) => b - a)[0];

  return {
    parents,
    hops,
    paths: parents.length ? countPaths(id, new Set()) : 0,
    record,
    restsOn: ancestors.filter((a) => a.future).sort((a, b) => a.year - b.year),
    uncited: record.filter((a) => !a.url),
    roots: ancestors.filter((a) => !parentsOf(graph, a.id).length).sort((a, b) => a.year - b.year),
    notes: parents.filter((p) => p.note).length,
    jump: newest ? self.year - newest : null
  };
}

/** What one horizon is made of. Counts only — no score, no ranking. */
export function horizonLedger(graph, horizon) {
  const set = graph.all.filter((e) => e.future && e.year >= horizon.from && e.year <= horizon.to);
  const strands = set.map((e) => ({ event: e, strand: strandOf(graph, e.id) }));
  const argued = strands.filter((s) => s.strand.parents.length);
  const jumps = argued.map((s) => s.strand.jump).filter((j) => j !== null).sort((a, b) => a - b);
  const reach = argued.flatMap((s) => s.strand.record).map((r) => r.year);
  const live = new Set(set.map((e) => e.thread));
  return {
    strands,
    total: set.length,
    argued: argued.length,
    confidence: CONFIDENCE.map((c) => [c, set.filter((e) => e.confidence === c).length]).filter((p) => p[1]),
    medianJump: jumps.length ? jumps[Math.floor(jumps.length / 2)] : null,
    reachesBackTo: reach.length ? Math.min(...reach) : null,
    silentThreads: THREADS.filter((t) => !live.has(t.id))
  };
}

/** Board-wide facts the horizon view opens with, both halves of each. */
export function forwardLedger(graph) {
  const future = graph.all.filter((e) => e.future);
  const record = graph.all.filter((e) => !e.future);
  const touched = new Set();
  graph.edges.forEach((l) => { touched.add(l.from); touched.add(l.to); });
  const landing = graph.edges.filter((l) => graph.index[l.to].future);
  return {
    total: future.length,
    span: future.length ? future[future.length - 1].year - NOW : 0,
    argued: future.filter((e) => parentsOf(graph, e.id).length).length,
    landing: landing.length,
    crossing: landing.filter((l) => !graph.index[l.from].future).length,
    internal: landing.filter((l) => graph.index[l.from].future).length,
    recordTotal: record.length,
    recordUnstrung: record.filter((e) => !touched.has(e.id)).length
  };
}

/* ─── The case as it stands ───────────────────────────────────────────────────
   The forward view above asks what is coming. This asks the other half: why the
   present looks the way it does, and which parts of the record are actually
   load-bearing. Same rule as everything else here — these are facts about the
   strings that were drawn, never judgements about the world.                   */

/** Record entries that carry at least one string across NOW. The present as the
 *  board argues it, rather than whatever happens to be dated most recently. */
export function standingNow(graph) {
  return graph.all
    .filter((e) => !e.future)
    .map((e) => ({
      event: e,
      into: (graph.adjacency[e.id] || [])
        .filter((a) => a.out && graph.index[a.id] && graph.index[a.id].future)
        .map((a) => ({ event: graph.index[a.id], claim: a.claim, note: a.note }))
        .sort((a, b) => a.event.year - b.event.year)
    }))
    .filter((s) => s.into.length)
    .sort((a, b) => b.event.year - a.event.year || b.into.length - a.into.length);
}

/** Every backward path from an event to a root, oldest hop first, so the road
 *  can be typeset in the author's own claim verbs. Capped, and it says so. */
export function roadsTo(graph, id, limit = 6, maxDepth = 12) {
  const roads = [];
  let truncated = false;

  const walk = (node, hops, seen) => {
    if (roads.length >= limit) { truncated = true; return; }
    const ups = parentsOf(graph, node);
    if (!ups.length || hops.length >= maxDepth) {
      if (hops.length) roads.push(hops.slice().reverse());
      if (ups.length && hops.length >= maxDepth) truncated = true;
      return;
    }
    ups.forEach((p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      walk(p.id, hops.concat({ from: graph.index[p.id], claim: p.claim, note: p.note, to: graph.index[node] }), seen);
      seen.delete(p.id);
    });
  };

  walk(id, [], new Set([id]));
  roads.sort((a, b) => b.length - a.length || a[0].from.year - b[0].from.year);
  return { roads, truncated, longest: roads.length ? roads[0].length : 0 };
}

/** One row per thread: what the board projects onto that front, and whether it
 *  argued for any of it. A thread that projects but never strings is the point. */
export function threadLedger(graph) {
  return THREADS.map((thread) => {
    const scenarios = graph.all.filter((e) => e.future && e.thread === thread.id).sort((a, b) => a.year - b.year);
    const record = graph.all.filter((e) => !e.future && e.thread === thread.id);
    return {
      thread,
      scenarios,
      argued: scenarios.filter((e) => parentsOf(graph, e.id).length).length,
      recordCount: record.length,
      recordEndsAt: record.length ? Math.max(...record.map((e) => e.year)) : null
    };
  }).filter((row) => row.scenarios.length || row.recordCount);
}

/** The load-bearing record: entries the most futures depend on, by descendants. */
export function loadBearing(graph, top = 6) {
  const reach = (id) => {
    const seen = new Set();
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift();
      (graph.adjacency[cur] || []).filter((a) => a.out).forEach((a) => {
        if (seen.has(a.id)) return;
        seen.add(a.id);
        queue.push(a.id);
      });
    }
    return [...seen].map((k) => graph.index[k]).filter(Boolean);
  };
  return graph.all
    .filter((e) => !e.future)
    .map((e) => { const d = reach(e.id); return { event: e, futures: d.filter((x) => x.future).length, all: d.length }; })
    .filter((r) => r.futures > 0)
    .sort((a, b) => b.futures - a.futures || b.all - a.all || a.event.year - b.event.year)
    .slice(0, top);
}

/* ─── Sources ─────────────────────────────────────────────────────────────────
   An entry may carry a `sources` array; those that do not still have the legacy
   `source` + `url` pair. sourcesOf() hands callers one shape either way, so the
   migration can proceed entry by entry without a flag day.

   The rule that makes this worth doing: a source only counts as supporting the
   entry's claim if it carries a verbatim quote. You cannot manufacture a quote
   from a topic page, which is exactly how 65% of this board came to be cited to
   pages that merely mention the event.                                          */

export const SOURCE_KINDS = ['primary', 'paper', 'article', 'video', 'podcast', 'interview', 'encyclopedia'];

export function sourcesOf(event) {
  if (!event) return [];
  const listed = Array.isArray(event.sources) ? event.sources : [];
  if (listed.length) {
    return listed.map((s) => ({
      kind: s.kind || 'article',
      publisher: s.publisher || '',
      title: s.title || '',
      url: s.url || '',
      date: s.date || '',
      at: s.at || '',
      quote: s.quote || '',
      // A quote is the price of claiming support. Without one this is context.
      supports: s.quote && s.supports === 'claim' ? 'claim' : 'context',
      legacy: false
    }));
  }
  if (!event.url) return [];
  return [{
    kind: /wikipedia\.org/.test(event.url) ? 'encyclopedia' : 'article',
    publisher: event.source || '', title: event.wikiTitle || event.source || '',
    url: event.url, date: '', at: '', quote: '', supports: 'context', legacy: true
  }];
}

/** How well an entry is actually sourced, in terms a reader can check. */
export function sourceStrength(event) {
  const list = sourcesOf(event);
  const claim = list.filter((s) => s.supports === 'claim');
  return {
    total: list.length,
    supporting: claim.length,
    context: list.length - claim.length,
    migrated: list.length > 0 && !list[0].legacy,
    media: list.filter((s) => s.kind === 'video' || s.kind === 'podcast' || s.kind === 'interview').length,
    state: claim.length ? 'quoted' : (list.length ? 'cited' : 'unsourced')
  };
}
