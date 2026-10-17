import { describe, it, expect } from 'vitest';
import { IDEAS } from '../src/lib/primer';
import { CATEGORIES, buildGraph, byWhen } from '../src/lib/data';
import { termById, names } from '../src/lib/files';

/* The Start here page puts the ideas the record turns on into everyday words.
   An idea adds no claim of its own, so each one is held to the glossary entry
   it explains and to cards on the record that name it. */

const graph = buildGraph();

describe('the primer', () => {
  it('explains each idea once, from the glossary', () => {
    expect(IDEAS.length).toBeGreaterThan(5);
    expect(new Set(IDEAS.map((i) => i.term)).size).toBe(IDEAS.length);
    IDEAS.forEach((i) => expect(termById[i.term], i.term).toBeTruthy());
  });

  it('says each idea in a few plain sentences', () => {
    IDEAS.forEach((i) => {
      expect(i.plain.length, i.term).toBeGreaterThan(60);
      expect(i.plain.length, i.term).toBeLessThanOrEqual(300);
      expect(i.plain.trim().endsWith('.'), i.term).toBe(true);
    });
  });

  it('points at cards on the record, oldest first', () => {
    IDEAS.forEach((i) => {
      expect(i.cards.length, i.term).toBeGreaterThan(0);
      const cards = i.cards.map((id) => graph.index[id]);
      cards.forEach((e, k) => {
        expect(e, i.term + ' → ' + i.cards[k]).toBeTruthy();
        expect(e.future, i.cards[k]).toBe(false);
      });
      expect(cards.slice().sort(byWhen).map((e) => e.id), i.term).toEqual(i.cards);
    });
  });

  it('rests each idea on at least one card that names it', () => {
    IDEAS.forEach((i) => {
      const t = termById[i.term];
      expect(i.cards.some((id) => names(graph.index[id], t)), i.term).toBe(true);
    });
  });

});

describe('the categories say what they cover', () => {
  it('in a short sentence each', () => {
    CATEGORIES.forEach((c) => {
      expect(c.blurb, c.id).toBeTruthy();
      expect((c.blurb as string).length, c.id).toBeLessThanOrEqual(100);
      expect((c.blurb as string).endsWith('.'), c.id).toBe(true);
    });
  });
});
