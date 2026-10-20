import { describe, it, expect } from 'vitest';
import raw from '../data/promises.json';
import { PLEDGED, PLEDGED_ORDER, PLEDGES as HEADS, pledgeById, pledgesBy } from '../src/lib/pledges';
import { pledgeInFull } from '../src/lib/bodies/pledges';
import { pledgesOf } from '../src/lib/notes';
import type { Pledge } from '../src/lib/types';
import { leadById } from '../src/lib/leads';
import { ORGS, PEOPLE } from '../src/lib/files';
import { buildGraph, SOURCE_KINDS } from '../src/lib/data';
import { hrefFor, parse } from '../src/lib/url';
import { metaFor } from '../src/lib/meta';
import { tabOf } from '../src/lib/views';

const graph = buildGraph();
const PLEDGES = (raw.promises as Pledge[]).slice();
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WHEN = /^\d{4}(-\d{2}(-\d{2})?)?$/;

describe('promises made: commitments set beside what was done', () => {
  it('has unique, stable ids, oldest first', () => {
    expect(PLEDGES.length).toBeGreaterThan(0);
    expect(new Set(PLEDGES.map((p) => p.id)).size).toBe(PLEDGES.length);
    PLEDGES.forEach((p) => expect(p.id, p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
    const said = PLEDGES.map((p) => p.said);
    expect(said).toEqual(said.slice().sort());
  });

  it('quotes the promise and names who made it and when', () => {
    PLEDGES.forEach((p) => {
      expect(p.title, p.id + ': a title is never dressed as a quotation').not.toMatch(/[“”"]/);
      expect(p.who.trim(), p.id).toBeTruthy();
      expect(p.said, p.id).toMatch(ISO);
      expect(p.words.trim().length, p.id).toBeGreaterThan(10);
      expect(p.sources.map((s) => s.id), p.id + ': the words have a source').toContain(p.source);
      if (p.byWords) expect(p.words.includes(p.byWords), p.id + ': “' + p.byWords + '” is not in the words').toBe(true);
      if (p.by) { expect(p.by, p.id).toMatch(WHEN); expect(p.by >= p.said.slice(0, p.by.length), p.id + ': its date is after it was said').toBe(true); }
      p.people.forEach((id) => expect(PEOPLE.some((x) => x.id === id), p.id + ' → ' + id).toBe(true));
      p.orgs.forEach((id) => expect(ORGS.some((x) => x.id === id), p.id + ' → ' + id).toBe(true));
      expect(p.people.length + p.orgs.length > 0 || p.who.length > 0, p.id).toBe(true);
    });
  });

  it('gives a verdict, and a day the record settled it unless it is still open', () => {
    PLEDGES.forEach((p) => {
      expect(PLEDGED_ORDER, p.id).toContain(p.verdict);
      if (p.verdict === 'open') expect(p.settled, p.id + ': an open promise is not settled').toBeUndefined();
      if (p.settled) { expect(p.settled, p.id).toMatch(ISO); expect(p.settled >= p.said, p.id).toBe(true); expect(p.settled <= p.checked, p.id).toBe(true); }
    });
  });

  it('answers in short and in full, and says what is not settled', () => {
    PLEDGES.forEach((p) => {
      expect(p.short.length, p.id).toBeGreaterThan(40);
      expect(p.short.length, p.id).toBeLessThanOrEqual(260);
      expect(p.reading.length, p.id).toBeGreaterThan(0);
      p.reading.forEach((para) => expect(para.trim().length, p.id).toBeGreaterThan(0));
      expect(p.open.trim().length, p.id).toBeGreaterThan(0);
      expect(p.checked, p.id).toMatch(ISO);
    });
  });

  it('quotes what was done, each quote from a source it names, and uses every source', () => {
    PLEDGES.forEach((p) => {
      const ids = new Set(p.sources.map((s) => s.id));
      expect(ids.size, p.id).toBe(p.sources.length);
      expect(new Set(p.sources.map((s) => s.url)).size, p.id + ': one url per source').toBe(p.sources.length);
      p.sources.forEach((s) => {
        expect(SOURCE_KINDS, p.id + ' / ' + s.id).toContain(s.kind);
        expect(s.publisher && s.title, p.id + ' / ' + s.id).toBeTruthy();
        expect(s.url, p.id + ' / ' + s.id).toMatch(/^https:\/\//);
        expect(s.date, p.id + ' / ' + s.id).toMatch(WHEN);
        expect(s.date <= p.checked, p.id + ' / ' + s.id).toBe(true);
      });
      expect(p.evidence.length, p.id).toBeGreaterThan(0);
      p.evidence.forEach((q) => {
        expect(ids.has(q.source), p.id + ' → ' + q.source).toBe(true);
        expect(q.quote.trim().length, p.id).toBeGreaterThan(10);
      });
      const used = new Set([p.source, ...p.evidence.map((q) => q.source)]);
      p.sources.forEach((s) => expect(used.has(s.id), p.id + ': source ' + s.id + ' is never quoted').toBe(true));
    });
  });

  it('bears on cards that exist, on the record among them, and on leads that exist', () => {
    PLEDGES.forEach((p) => {
      expect(p.record.length, p.id).toBeGreaterThan(0);
      p.record.forEach((r) => {
        expect(graph.index[r.event], p.id + ' → ' + r.event).toBeTruthy();
        expect(r.note.trim().length, p.id + ' → ' + r.event).toBeGreaterThan(0);
      });
      expect(p.record.some((r) => !graph.index[r.event].future), p.id + ': at least one card on the record').toBe(true);
      p.leads.forEach((id) => expect(leadById[id], p.id + ' → ' + id).toBeTruthy());
    });
  });

  it('lists each promise on its cards and its files, from a head that matches the file', () => {
    expect(HEADS.map((h) => h.id).sort()).toEqual(PLEDGES.map((p) => p.id).sort());
    HEADS.forEach((h) => {
      const p = PLEDGES.find((x) => x.id === h.id) as Pledge;
      expect(h.title).toBe(p.title);
      expect(h.verdict).toBe(p.verdict);
      expect(pledgeInFull(h.id)).toEqual(p);
      p.record.forEach((r) => expect(pledgesOf(graph.index[r.event]).map((x) => x.pledge.id), r.event).toContain(p.id));
      p.orgs.forEach((o) => expect(pledgesBy('org', o).map((x) => x.id), o).toContain(p.id));
      p.people.forEach((o) => expect(pledgesBy('person', o).map((x) => x.id), o).toContain(p.id));
    });
  });

  it('has an address of its own, filed under the line, titled with its verdict', () => {
    PLEDGES.forEach((p) => {
      expect(hrefFor({ view: 'promise', id: p.id })).toBe('/promise/' + p.id + '/');
      expect(parse('/promise/' + p.id + '/', '', '').view).toBe('promise');
      const meta = metaFor({ ...parse('/promise/' + p.id + '/', '', '') });
      expect(meta.title.startsWith(pledgeById[p.id].title)).toBe(true);
      expect(meta.title).toContain(PLEDGED[p.verdict].label);
    });
    expect(tabOf('promises')).toBe('line');
    expect(tabOf('promise')).toBe('line');
  });
});
