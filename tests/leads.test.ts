import { describe, it, expect } from 'vitest';
import { LEADS as HEADS, LEAD_CARD_IDS, buildLead, leadsOf } from '../src/lib/leads';
import { leadChain, leadInFull } from '../src/lib/bodies/leads';
import { buildGraph, NOW } from '../src/lib/data';
import type { Lead } from '../src/lib/types';

const graph = buildGraph(null as unknown as undefined);
/* Each lead in full, as its own page reads it: its head and its body. */
const LEADS = HEADS.map((h) => leadInFull(h.id) as Lead);

describe('leads.json', () => {
  it('has unique kebab-case ids and every field a page needs', () => {
    const ids = LEADS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    LEADS.forEach((l) => {
      expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      (['title', 'question', 'blurb', 'standing'] as (keyof Lead)[]).forEach((k) => expect(typeof l[k], l.id + '.' + k).toBe('string'));
      expect(['capability', 'failure', 'economy']).toContain(l.kind);
      expect(l.hue).toBeGreaterThanOrEqual(0);
      expect(l.hue).toBeLessThanOrEqual(360);
      expect(l.rungs.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('names only cards that exist, once per lead, each with a label and a text', () => {
    LEADS.forEach((l) => {
      const seen = new Set();
      l.rungs.forEach((r) => {
        expect(graph.index[r.event], l.id + ' → ' + r.event).toBeTruthy();
        expect(seen.has(r.event), l.id + ' repeats ' + r.event).toBe(false);
        seen.add(r.event);
        expect(r.label && r.label.length <= 60, l.id + ' / ' + r.event + ' label').toBe(true);
        expect(r.text && r.text.length >= 80, l.id + ' / ' + r.event + ' text').toBe(true);
      });
    });
  });

  it('ends every lead on the record or a scenario, never past the board', () => {
    LEADS.forEach((l) => {
      const b = buildLead(graph, l);
      expect(b.rungs.length).toBe(l.rungs.length);
      expect(b.steps.length).toBe(l.rungs.length - 1);
      expect((b.span as { from: number; to: number }).from).toBeLessThanOrEqual((b.span as { from: number; to: number }).to);
      expect(b.record + b.scenarios).toBe(b.rungs.length);
      expect(b.strung).toBeLessThanOrEqual(b.steps.length);
    });
  });

  it('walks as one step per rung, with the first rung stepping from itself', () => {
    LEADS.forEach((l) => {
      const steps = leadChain(graph, l);
      expect(steps.length).toBe(l.rungs.length);
      expect(steps[0].from).toBe(steps[0].to);
      steps.forEach((s, i) => {
        expect(s.rung).toBe(i + 1);
        expect(s.of).toBe(l.rungs.length);
        expect(s.lead).toBe(l.id);
        if (i) expect(s.from).toBe(steps[i - 1].to);
      });
    });
  });

  it('files every rung card as a landmark, and finds a card\'s leads', () => {
    LEAD_CARD_IDS.forEach((id) => expect(graph.index[id].landmark, id).toBe(true));
    const shared = graph.all.filter((e) => leadsOf(e.id).length > 1);
    expect(shared.length).toBeGreaterThan(0);
    shared.forEach((e) => leadsOf(e.id).forEach(({ lead, index, rung }) => expect(lead.rungs[index]).toBe(rung)));
    // A lead built in full keeps its rungs' sentences; built from its head, it
    // has none to keep.
    LEADS.forEach((l) => {
      expect(buildLead(graph, l).rungs.map((r) => r.text)).toEqual(l.rungs.map((r) => r.text));
      expect(buildLead(graph, HEADS.find((h) => h.id === l.id) as typeof HEADS[number]).rungs.some((r) => 'text' in r), l.id).toBe(false);
    });
  });

  it('keeps the standing current: it names the present year or a later one', () => {
    LEADS.forEach((l) => expect(/\b(20[2-9]\d)\b/.test(l.standing), l.id).toBe(true));
    LEADS.forEach((l) => {
      const years = l.standing.match(/\b(19|20)\d\d\b/g) || [];
      years.forEach((y) => expect(Number(y)).toBeLessThanOrEqual(NOW));
    });
  });
});

describe('landmarks', () => {
  it('are fewer than every card and more than the featured ones', () => {
    const featured = graph.all.filter((e) => e.featured).length;
    expect(graph.landmarks).toBeGreaterThan(featured);
    expect(graph.landmarks).toBeLessThan(graph.all.length);
  });
  it('include both ends of every case-noted string', () => {
    graph.edges.filter((l) => l.noted).forEach((l) => {
      expect(graph.index[l.from].landmark, l.from).toBe(true);
      expect(graph.index[l.to].landmark, l.to).toBe(true);
    });
  });
});
