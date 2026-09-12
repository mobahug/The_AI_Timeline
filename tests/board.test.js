import { describe, it, expect } from 'vitest';
import { EMPTY, toPatch, fromPatch } from '../src/lib/board.js';
import { buildGraph } from '../src/lib/data.js';

const sample = {
  nodes: [{ id: 'local-1', year: 2027, category: 'research', title: 'A local card', local: true, thread: 'ideas', future: true }],
  edges: [{ from: 'alexnet', to: 'local-1', claim: 'led to' }],
  hidden: ['eliza'],
  hiddenEdges: ['c0'],
  edits: { alexnet: { title: 'AlexNet, edited' } }
};

describe('a contributor\'s patch', () => {
  it('survives the round trip whole — cards, strings, removals and edits', () => {
    expect(fromPatch(toPatch(sample))).toEqual({ ...EMPTY, ...sample, nodes: [{ id: 'local-1', year: 2027, category: 'research', title: 'A local card' }] });
  });

  it('strips the derived fields from a local card', () => {
    const [card] = toPatch(sample).events;
    expect(card).not.toHaveProperty('local');
    expect(card).not.toHaveProperty('thread');
    expect(card).not.toHaveProperty('future');
  });

  it('omits empty sections so a small patch stays small', () => {
    expect(Object.keys(toPatch(EMPTY))).toEqual(['events', 'links']);
  });

  it('reads the older shape too', () => {
    expect(fromPatch({ nodes: [], links: [] })).toEqual(EMPTY);
  });
});

describe('buildGraph applies the local layer', () => {
  it('hides, edits, and adds', () => {
    const g = buildGraph(sample);
    expect(g.index.eliza).toBeUndefined();
    expect(g.index.alexnet.title).toBe('AlexNet, edited');
    expect(g.index['local-1'].local).toBe(true);
    expect(g.edges.some((l) => l.to === 'local-1')).toBe(true);
  });

  it('hides a canonical string by its id', () => {
    const base = buildGraph(null);
    const first = base.edges[0].id;
    const g = buildGraph({ ...EMPTY, hiddenEdges: [first] });
    expect(g.edges.find((l) => l.id === first)).toBeUndefined();
    expect(g.edges.length).toBe(base.edges.length - 1);
  });
});
