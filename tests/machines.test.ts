import { describe, it, expect } from 'vitest';
import { MACHINES, machineById, machineOf } from '../src/lib/machines';
import { machineInFull } from '../src/lib/bodies/machines';
import { leadById } from '../src/lib/leads';
import { buildGraph } from '../src/lib/data';
import { hrefFor, parse } from '../src/lib/url';
import { tabOf } from '../src/lib/views';
import type { Machine } from '../src/lib/types';

const graph = buildGraph();
/* Each machine in full, as the card that runs it reads it. */
const FULL = MACHINES.map((h) => machineInFull(h.id) as Machine);

describe('the machines, each run on its card', () => {
  it('has one machine of each kind, each on a card of the record', () => {
    expect(MACHINES.map((m) => m.id).sort()).toEqual(['eliza', 'menace', 'perceptron', 'shannon']);
    expect(new Set(MACHINES.map((m) => m.event)).size).toBe(MACHINES.length);
    MACHINES.forEach((m) => {
      const e = graph.index[m.event];
      expect(e, m.id + ' → ' + m.event).toBeTruthy();
      expect(e.future, m.id).toBe(false);
      expect(machineOf(m.event)).toBe(m);
      expect(machineById[m.id]).toBe(m);
    });
  });

  it('says what it is, what is as it was, what is not, and whose it is', () => {
    FULL.forEach((m) => {
      expect(m.title.length, m.id).toBeLessThanOrEqual(60);
      expect(m.short.length, m.id).toBeLessThanOrEqual(200);
      expect(m.lede.length, m.id).toBeGreaterThan(100);
      expect(m.kept.length, m.id).toBeGreaterThan(0);
      expect(m.changed.length, m.id).toBeGreaterThan(0);
      expect(m.credit.trim().length, m.id).toBeGreaterThan(20);
      (m.try || []).forEach((t) => expect(t.trim().length, m.id).toBeGreaterThan(0));
    });
  });

  it('names the papers it was rebuilt from, quoted where it quotes', () => {
    FULL.forEach((m) => {
      expect(m.sources.length, m.id).toBeGreaterThan(0);
      expect(new Set(m.sources.map((s) => s.url)).size, m.id).toBe(m.sources.length);
      m.sources.forEach((s) => {
        expect(s.url, m.id).toMatch(/^https:\/\//);
        expect(s.publisher && s.title, m.id).toBeTruthy();
        if (s.date) expect(s.date, m.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (s.quote) expect(s.quote.trim().length, m.id).toBeGreaterThan(10);
      });
    });
  });

  it('points only to leads and rungs that exist', () => {
    MACHINES.forEach((m) => {
      if (!m.lead) return;
      const lead = leadById[m.lead.id];
      expect(lead, m.id).toBeTruthy();
      expect(lead.rungs[m.lead.rung - 1].event, m.id + ': the rung is its own card').toBe(m.event);
    });
  });

  it('has an index of its own, filed under the board', () => {
    expect(hrefFor({ view: 'machines' })).toBe('/machines/');
    expect(parse('/machines/')).toMatchObject({ view: 'machines' });
    expect(tabOf('machines')).toBe('board');
  });
});
