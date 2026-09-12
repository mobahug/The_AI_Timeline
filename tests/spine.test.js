import { describe, it, expect } from 'vitest';
import { buildGraph, NOW } from '../src/lib/data.js';
import { FINDINGS, findingFor, spanOf, buildLine, readingOf } from '../src/lib/spine.js';

const graph = buildGraph(null);
const line = buildLine(graph);

describe('the spine is well formed', () => {
  it('numbers findings 1..n with no gaps', () => {
    expect(FINDINGS.map((f) => f.n)).toEqual(FINDINGS.map((_, i) => i + 1));
  });

  it('starts strictly ascending, so assignment is unambiguous', () => {
    const from = FINDINGS.map((f) => f.from);
    expect([...from].sort((a, b) => a - b)).toEqual(from);
    expect(new Set(from).size).toBe(from.length);
  });

  it('every lead names a real entry', () => {
    FINDINGS.filter((f) => f.lead).forEach((f) => {
      expect(graph.index[f.lead], f.n + ' ' + f.title + ' leads with ' + f.lead).toBeTruthy();
    });
  });

  it('every lead falls inside its own span', () => {
    FINDINGS.filter((f) => f.lead).forEach((f) => {
      const span = spanOf(f, line.lastYear);
      const year = graph.index[f.lead].year;
      expect(year, f.title).toBeGreaterThanOrEqual(span.from);
      expect(year, f.title).toBeLessThanOrEqual(span.to);
    });
  });

  it('every lead is a card the board already treats as significant', () => {
    FINDINGS.filter((f) => f.lead).forEach((f) => {
      const e = graph.index[f.lead];
      const linked = (graph.adjacency[f.lead] || []).length > 0;
      expect(e.featured || linked, f.title + ' leads with an unfeatured, unlinked card').toBe(true);
    });
  });

  it('gives every finding a title and a blurb', () => {
    FINDINGS.forEach((f) => {
      expect(f.title.length).toBeGreaterThan(3);
      expect(f.blurb.length).toBeGreaterThan(30);
    });
  });
});

describe('assignment is total — nothing is orphaned', () => {
  it('files every entry, each exactly once', () => {
    const filed = line.rows.flatMap((r) => r.cards.map((e) => e.id));
    expect(filed.length).toBe(graph.all.length);
    expect(new Set(filed).size).toBe(graph.all.length);
  });

  it('files a brand-new entry without touching the spine', () => {
    const extended = buildGraph({
      nodes: [{ id: 'test-new', year: 2024, category: 'research', title: 'Test', summary: '' }],
      edges: [], hidden: [], hiddenEdges: [], edits: {}
    });
    const filed = buildLine(extended).rows.flatMap((r) => r.cards.map((e) => e.id));
    expect(filed).toContain('test-new');
    expect(filed.length).toBe(extended.all.length);
  });

  it('puts every card in the finding findingFor() would choose', () => {
    line.rows.forEach((row) => {
      row.cards.forEach((e) => expect(findingFor(e.year).n, e.title).toBe(row.finding.n));
    });
  });

  it('keeps every projection in the still-open finding', () => {
    const open = line.rows[line.rows.length - 1];
    expect(open.finding.title).toBe('Still open');
    expect(open.cards.every((e) => e.future)).toBe(true);
    expect(open.cards.length).toBe(graph.all.filter((e) => e.future).length);
  });

  it('keeps every record entry out of it', () => {
    line.rows.slice(0, -1).forEach((row) => {
      expect(row.cards.every((e) => !e.future), row.finding.title).toBe(true);
    });
  });
});

describe('the joints are honest', () => {
  it('never claims a crossing string that does not exist', () => {
    line.joints.forEach((j) => {
      const nextIds = new Set(j.to.cards.map((e) => e.id));
      j.crossing.forEach((l) => {
        expect(nextIds.has(l.to)).toBe(true);
        expect(j.from.cards.some((e) => e.id === l.from)).toBe(true);
      });
    });
  });

  it('accounts for every string exactly once across inside/leaving/arriving', () => {
    line.rows.forEach((row) => {
      const ids = new Set(row.cards.map((e) => e.id));
      graph.edges.forEach((l) => {
        const f = ids.has(l.from);
        const t = ids.has(l.to);
        if (f && t) expect(row.inside).toContain(l);
        else if (f) expect(row.leaving).toContain(l);
        else if (t) expect(row.arriving).toContain(l);
      });
    });
  });

  it('classifies each stretch by what its strings actually do', () => {
    line.rows.forEach((row) => {
      const expected = row.inside.length ? 'argued'
        : ((row.leaving.length || row.arriving.length) ? 'connected' : 'context');
      expect(row.kind, row.finding.title).toBe(expected);
    });
  });

  it('only calls a stretch context when no string touches any of its cards', () => {
    line.rows.filter((r) => r.kind === 'context').forEach((row) => {
      expect(row.inside.length + row.leaving.length + row.arriving.length, row.finding.title).toBe(0);
    });
  });
});

describe('the derived reading', () => {
  it('produces a sentence for every finding', () => {
    line.rows.forEach((row) => {
      const s = readingOf(row);
      expect(s.length, row.finding.title).toBeGreaterThan(20);
      expect(s.endsWith('.'), row.finding.title + ': ' + s).toBe(true);
    });
  });

  it('never claims strings a context stretch does not have', () => {
    line.rows.filter((r) => r.kind === 'context').forEach((row) => {
      expect(readingOf(row)).toMatch(/not one carries a string/);
    });
  });

  it('does not call a connected stretch unargued background', () => {
    line.rows.filter((r) => r.kind === 'connected').forEach((row) => {
      expect(readingOf(row), row.finding.title).toMatch(/not isolated/);
      expect(readingOf(row)).not.toMatch(/never argued about/);
    });
  });
});
