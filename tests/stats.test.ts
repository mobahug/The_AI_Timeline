import { describe, it, expect } from 'vitest';
import { FIRST, NOW, THREADS, buildGraph, yearFraction } from '../src/lib/data';
import { LEADS } from '../src/lib/leads';
import { appearancesOf } from '../src/lib/files';
import { eraGrid, eraIndexOf, ladders, pace, peakOf, perYear, placeOf, recordEras, stringSpans, threadPair, topNames, topThread, within } from '../src/lib/stats';
import { CHART, RAMP } from '../src/lib/styles';
import { ticksFor } from '../src/components/Chart';

/* The charts count the board, and the sentence above each chart is built from
   the same counts. These hold the counting to the data — every card once,
   every string once — and prove it is the data's by adding a card and a string
   the files do not contain. */

const graph = buildGraph();
const record = graph.all.filter((e) => !e.future);
const extra = buildGraph({
  nodes: [{ id: 'a-test-card', year: NOW, date: NOW + '-01', category: 'incident', title: 'A card a test adds', summary: 'Only here.' }],
  edges: [{ from: 'eliza', to: 'a-test-card', claim: 'is tested by' }]
});
const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);

describe('the pace', () => {
  it('counts every card on the record once, in its year and its thread', () => {
    const rows = perYear(graph);
    expect(rows[0].year).toBe(FIRST);
    expect(rows[rows.length - 1].year).toBe(NOW);
    expect(rows.length).toBe(NOW - FIRST + 1);
    expect(sum(rows.map((r) => r.total))).toBe(record.length);
    rows.forEach((r) => {
      expect(sum(Object.values(r.byThread)), String(r.year)).toBe(r.total);
      expect(r.cards.length).toBe(r.total);
    });
  });

  it('finds the busiest year, and the run of early years it outweighs', () => {
    const p = pace(graph);
    expect(p.peak.total).toBe(Math.max(...p.rows.map((r) => r.total)));
    const early = sum(p.rows.filter((r) => r.year <= p.before.to).map((r) => r.total));
    expect(early).toBe(p.before.cards);
    expect(early).toBeLessThanOrEqual(p.peak.total);
    const next = p.rows.find((r) => r.year === p.before.to + 1);
    if (next) expect(early + next.total).toBeGreaterThan(p.peak.total);
    expect(p.since.of).toBe(record.length);
    expect(p.since.cards).toBe(record.filter((e) => e.year >= p.since.from).length);
  });

  it('moves when a card is added', () => {
    const at = (g: typeof graph) => (perYear(g).find((r) => r.year === NOW) as { total: number }).total;
    expect(at(extra)).toBe(at(graph) + 1);
  });
});

describe('the eras', () => {
  it('files every card on the record under one thread and one era', () => {
    const g = eraGrid(graph);
    expect(g.eras).toEqual(recordEras());
    expect(g.threads).toEqual(THREADS);
    expect(sum(g.cells.flat())).toBe(record.length);
    g.eras.forEach((_, i) => expect(sum(g.cells.map((row) => row[i]))).toBe(g.totals[i]));
    expect(g.max).toBe(Math.max(...g.cells.flat()));
    expect(sum(eraGrid(extra).totals)).toBe(record.length + 1);
  });

  it('names the largest thread of an era', () => {
    const g = eraGrid(graph);
    g.eras.forEach((_, i) => {
      const top = topThread(g, i);
      expect(top.cards).toBe(Math.max(...g.cells.map((row) => row[i])));
      expect(top.of).toBe(g.totals[i]);
    });
    expect(eraIndexOf(g.eras, g.eras[0].year)).toBe(0);
    expect(eraIndexOf(g.eras, NOW)).toBe(g.eras.length - 1);
  });
});

describe('two threads, year by year', () => {
  it('counts both, and finds each peak', () => {
    const from = NOW - 10;
    const rows = threadPair(graph, 'fail', 'rules', from);
    expect(rows.length).toBe(11);
    expect(sum(rows.map((r) => r.a))).toBe(record.filter((e) => e.thread === 'fail' && e.year >= from).length);
    expect(sum(rows.map((r) => r.b))).toBe(record.filter((e) => e.thread === 'rules' && e.year >= from).length);
    const pa = peakOf(rows, 'a');
    expect(pa.count).toBe(Math.max(...rows.map((r) => r.a)));
    // The two threads the page compares are threads the board has.
    expect(THREADS.map((t) => t.id)).toEqual(expect.arrayContaining(['fail', 'rules']));
  });
});

describe('how long a string takes', () => {
  it('measures every string with both ends on the record, and bins each once', () => {
    const s = stringSpans(graph);
    const measured = graph.edges.filter((l) => !graph.index[l.from].future && !graph.index[l.to].future);
    expect(s.measured).toBe(measured.length);
    expect(s.total).toBe(graph.edges.length);
    expect(sum(s.bins.map((b) => b.edges.length))).toBe(s.measured);
    const gaps = measured.map((l) => graph.index[l.to].year - graph.index[l.from].year);
    expect(gaps.filter((g) => g <= s.median).length).toBeGreaterThanOrEqual(gaps.length / 2);
    expect(gaps.filter((g) => g < s.median).length).toBeLessThan(gaps.length / 2);
    expect(s.longest[0].gap).toBe(Math.max(...gaps));
    expect(stringSpans(extra).measured).toBe(s.measured + 1);
  });
});

describe('the ladders', () => {
  it('places every rung of every lead on the board’s time axis', () => {
    const l = ladders(graph);
    expect(l.ladders.length).toBe(LEADS.length);
    expect(l.total).toBe(sum(LEADS.map((x) => x.rungs.length)));
    l.ladders.forEach((lad) => lad.rungs.forEach((r) => {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThanOrEqual(1);
      expect(r.x).toBeGreaterThanOrEqual(yearFraction(r.event.year));
      expect(r.x).toBeLessThanOrEqual(yearFraction(r.event.year + 1));
    }));
    expect(l.scenarios).toBe(sum(l.ladders.map((lad) => lad.rungs.filter((r) => r.event.future).length)));
  });

  it('places a dated card inside its year, an undated one in the middle', () => {
    expect(within({ date: '2026-01-01' } as never)).toBe(0);
    expect(within({ date: '2026-12' } as never)).toBeCloseTo(11.5 / 12);
    expect(within({} as never)).toBe(0.5);
    expect(placeOf(graph.index.chatgpt)).toBeGreaterThan(yearFraction(2022));
  });
});

describe('the names', () => {
  it('counts a name as the files do, most first', () => {
    (['org', 'person'] as const).forEach((kind) => {
      const top = topNames(graph, kind, 5);
      expect(top.length).toBe(5);
      top.forEach((t) => expect(t.cards).toBe(appearancesOf(graph, t.entity).length));
      for (let i = 1; i < top.length; i++) expect(top[i].cards).toBeLessThanOrEqual(top[i - 1].cards);
    });
  });
});

describe('the chart furniture', () => {
  it('rounds an axis to clean steps that reach the top', () => {
    expect(ticksFor(16, 3)).toEqual([0, 10, 20]);
    expect(ticksFor(49, 3)).toEqual([0, 20, 40, 60]);
    expect(ticksFor(5, 3)).toEqual([0, 2, 4, 6]);
    expect(ticksFor(0)).toEqual([0]);
  });

  it('draws a plain mark that clears 3:1 on the ground, and a count ramp that only brightens', () => {
    expect(Number((CHART.mark.match(/,([\d.]+)\)$/) as RegExpMatchArray)[1])).toBeGreaterThanOrEqual(0.42);
    const l = RAMP.map((c) => Number((/oklch\(([\d.]+)/.exec(c) as RegExpExecArray)[1]));
    for (let i = 1; i < l.length; i++) expect(l[i] - l[i - 1]).toBeGreaterThanOrEqual(0.06);
  });
});
