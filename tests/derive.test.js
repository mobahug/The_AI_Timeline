import { describe, it, expect } from 'vitest';
import {
  NOW, THREADS, buildGraph, buildChain, forwardLedger, standingNow, roadsTo, threadLedger, loadBearing, strandOf
} from '../src/lib/data.js';

const graph = buildGraph(null);

describe('standingNow — the present as the board argues it', () => {
  it('returns only record entries, never projections', () => {
    expect(standingNow(graph).filter((s) => s.event.future)).toEqual([]);
  });

  it('every entry carries at least one string across NOW', () => {
    const bad = standingNow(graph).filter((s) => !s.into.length || s.into.some((i) => !i.event.future));
    expect(bad.map((s) => s.event.id)).toEqual([]);
  });

  it('is ordered newest first', () => {
    const years = standingNow(graph).map((s) => s.event.year);
    expect([...years].sort((a, b) => b - a)).toEqual(years);
  });
});

describe('roadsTo — the road here, in the author\'s own verbs', () => {
  it('produces contiguous chains that actually end at the target', () => {
    graph.all.filter((e) => e.future).forEach((e) => {
      const { roads } = roadsTo(graph, e.id);
      roads.forEach((road) => {
        road.forEach((hop, i) => {
          if (i > 0) expect(hop.from.id).toBe(road[i - 1].to.id);
          expect(hop.claim).toBeTruthy();
        });
        expect(road[road.length - 1].to.id).toBe(e.id);
      });
    });
  });

  it('runs oldest hop first', () => {
    const { roads } = roadsTo(graph, 'a-contested-agi-claim');
    roads.forEach((road) => {
      const years = road.map((h) => h.from.year);
      expect([...years].sort((a, b) => a - b)).toEqual(years);
    });
  });

  it('returns nothing for a projection with no string on the wall', () => {
    expect(roadsTo(graph, 'the-second-half-of-the-century').roads).toEqual([]);
  });

  it('never reports a road it silently truncated', () => {
    const r = roadsTo(graph, 'a-contested-agi-claim', 2);
    expect(r.truncated).toBe(true);
    expect(r.roads.length).toBeLessThanOrEqual(2);
  });
});

describe('strandOf — honesty flags', () => {
  it('flags a chain that rests on another projection', () => {
    const s = strandOf(graph, 'a-contested-agi-claim');
    expect(s.restsOn.map((e) => e.id)).toContain('models-that-keep-learning');
  });

  it('reports no parents for exactly the scenarios forwardLedger calls unargued', () => {
    const asserted = graph.all.filter((e) => e.future && !strandOf(graph, e.id).parents.length);
    const fwd = forwardLedger(graph);
    expect(asserted.length).toBe(fwd.total - fwd.argued);
  });

  it('separates record ancestors from projection ancestors', () => {
    const s = strandOf(graph, 'a-contested-agi-claim');
    expect(s.record.every((e) => !e.future)).toBe(true);
    expect(s.restsOn.every((e) => e.future)).toBe(true);
    // Every ancestor is filed on exactly one side.
    const ids = [...s.record, ...s.restsOn].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('threadLedger — which fronts the board projects onto', () => {
  it('covers every thread that has any entry at all', () => {
    const ids = threadLedger(graph).map((r) => r.thread.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(THREADS.map((t) => t.id)).toContain(id));
  });

  it('never claims more argued scenarios than scenarios', () => {
    threadLedger(graph).forEach((r) => expect(r.argued).toBeLessThanOrEqual(r.scenarios.length));
  });
});

describe('loadBearing — what the futures actually rest on', () => {
  it('returns only record entries that reach at least one projection', () => {
    loadBearing(graph).forEach((r) => {
      expect(r.event.future).toBe(false);
      expect(r.futures).toBeGreaterThan(0);
    });
  });

  it('is ordered by how many futures depend on it', () => {
    const n = loadBearing(graph).map((r) => r.futures);
    expect([...n].sort((a, b) => b - a)).toEqual(n);
  });

  it('never counts a node as its own descendant', () => {
    loadBearing(graph).forEach((r) => expect(r.all).toBeLessThan(graph.all.length));
  });
});

describe('the derivation is genuinely data-driven', () => {
  it('picks up a new projection added to the graph', () => {
    const extended = buildGraph({
      nodes: [{ id: 'test-scenario', year: NOW + 3, category: 'research', title: 'Test', summary: '' }],
      edges: [{ from: 'attention-is-all-you-need', to: 'test-scenario', claim: 'test claim' }]
    });
    expect(standingNow(extended).map((s) => s.event.id)).toContain('attention-is-all-you-need');
    const { roads } = roadsTo(extended, 'test-scenario');
    expect(roads.length).toBeGreaterThan(0);
    expect(roads.some((r) => r[r.length - 1].claim === 'test claim')).toBe(true);
  });
});

describe('buildChain — every shared ?clue=a>b link must open', () => {
  it('builds a chain containing the requested string, for every string', () => {
    const dead = graph.edges.filter((l) => {
      const built = buildChain(graph, l.to, l.from);
      return built.steps.findIndex((s) => s.from === l.from && s.to === l.to) < 0;
    });
    expect(dead.map((l) => l.from + '>' + l.to)).toEqual([]);
  });

  it('still returns a usable start index for every string', () => {
    graph.edges.forEach((l) => {
      const built = buildChain(graph, l.to, l.from);
      expect(built.start).toBeGreaterThanOrEqual(0);
      expect(built.start).toBeLessThan(Math.max(1, built.steps.length));
    });
  });

  it('without `via` it still behaves as before for single-parent targets', () => {
    const single = graph.edges.filter((l) => (graph.adjacency[l.to] || []).filter((a) => !a.out).length === 1);
    expect(single.length).toBeGreaterThan(0);
    single.forEach((l) => {
      const built = buildChain(graph, l.to);
      expect(built.steps.some((s) => s.from === l.from && s.to === l.to)).toBe(true);
    });
  });
});
