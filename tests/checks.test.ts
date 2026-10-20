import { describe, it, expect } from 'vitest';
import { CHECKS as HEADS, VERDICTS, VERDICT_ORDER, checkById } from '../src/lib/checks';
import { checkInFull } from '../src/lib/bodies/checks';
import { checksOf } from '../src/lib/notes';
import { leadById } from '../src/lib/leads';
import { buildGraph, sourcesOf } from '../src/lib/data';
import { hrefFor, parse } from '../src/lib/url';
import { metaFor } from '../src/lib/meta';
import { tabOf } from '../src/lib/views';
import type { Check } from '../src/lib/types';

const graph = buildGraph();
/* Each check in full, as its own page reads it: its head and its body. */
const CHECKS = HEADS.map((h) => checkInFull(h.id) as Check);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('headline checks set a report beside its primary account', () => {
  it('has unique, stable ids', () => {
    expect(CHECKS.length).toBeGreaterThan(0);
    expect(new Set(CHECKS.map((c) => c.id)).size).toBe(CHECKS.length);
    CHECKS.forEach((c) => expect(c.id, c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });

  it('asks a question, gives a verdict and answers it in short and in full', () => {
    CHECKS.forEach((c) => {
      expect(c.title.endsWith('?'), c.id).toBe(true);
      expect(c.title, c.id + ': a title is never dressed as a quotation').not.toMatch(/[“”"]/);
      expect(VERDICT_ORDER, c.id).toContain(c.verdict);
      expect(c.short.length, c.id).toBeGreaterThan(40);
      expect(c.short.length, c.id).toBeLessThanOrEqual(260);
      expect(c.reading.length, c.id).toBeGreaterThan(0);
      c.reading.forEach((p) => expect(p.trim().length, c.id).toBeGreaterThan(0));
      expect(c.open.trim().length, c.id).toBeGreaterThan(0);
    });
  });

  it('names the report and its primary accounts in full, dated no later than the check', () => {
    CHECKS.forEach((c) => {
      expect(c.checked, c.id).toMatch(ISO);
      [c.reported, ...c.primary].forEach((s) => {
        expect(s.publisher, c.id).toBeTruthy();
        expect(s.title, c.id).toBeTruthy();
        expect(s.url, c.id).toMatch(/^https:\/\//);
        expect(s.date, c.id + ' / ' + s.title).toMatch(ISO);
        expect(s.date <= c.checked, c.id + ' / ' + s.title).toBe(true);
      });
      expect(new Set(c.primary.map((p) => p.id)).size, c.id).toBe(c.primary.length);
      expect(c.primary.map((p) => p.url), c.id + ': the report is not its own primary account').not.toContain(c.reported.url);
    });
  });

  it('quotes both sides of every line, each quote from a source the check names', () => {
    CHECKS.forEach((c) => {
      expect(c.claims.length, c.id).toBeGreaterThan(0);
      const ids = new Set(c.primary.map((p) => p.id));
      const used = new Set<string>();
      c.claims.forEach((claim) => {
        expect(VERDICT_ORDER, c.id).toContain(claim.verdict);
        expect(claim.said.trim().length, c.id).toBeGreaterThan(10);
        expect(claim.note.trim().length, c.id).toBeGreaterThan(0);
        expect(claim.primary.length, c.id + ': ' + claim.said).toBeGreaterThan(0);
        claim.primary.forEach((q) => {
          expect(ids.has(q.source), c.id + ' → ' + q.source).toBe(true);
          expect(q.quote.trim().length, c.id).toBeGreaterThan(10);
          used.add(q.source);
        });
      });
      expect([...ids].filter((id) => !used.has(id)), c.id + ': every primary source is quoted').toEqual([]);
    });
  });

  it('gives the report a verdict its lines bear out', () => {
    CHECKS.forEach((c) => {
      const ratings = c.claims.map((claim) => VERDICTS[claim.verdict].rating);
      expect(VERDICTS[c.verdict].rating, c.id + ': no kinder than its worst line allows').toBeGreaterThanOrEqual(Math.min(...ratings));
      expect(VERDICTS[c.verdict].rating, c.id + ': no harsher than its best line').toBeLessThanOrEqual(Math.max(...ratings));
      if (c.verdict === 'stands') expect(c.claims.every((x) => x.verdict === 'stands'), c.id).toBe(true);
    });
  });

  it('rests on cards that exist, and the cards carry its primary accounts', () => {
    CHECKS.forEach((c) => {
      expect(c.record.length, c.id).toBeGreaterThan(0);
      expect(new Set(c.record.map((r) => r.event)).size, c.id).toBe(c.record.length);
      c.record.forEach((r) => {
        expect(graph.index[r.event], c.id + ' → ' + r.event).toBeTruthy();
        expect(r.note.trim().length, r.event).toBeGreaterThan(0);
      });
      const cited = new Set(c.record.flatMap((r) => sourcesOf(graph.index[r.event]).map((s) => s.url)));
      c.primary.forEach((p) => expect(cited.has(p.url), c.id + ': ' + p.url + ' is on none of its cards').toBe(true));
    });
  });

  it('points only to leads that exist', () => {
    CHECKS.forEach((c) => c.leads.forEach((l) => expect(leadById[l], c.id + ' → ' + l).toBeTruthy()));
  });

  it('is listed on every card it touches', () => {
    CHECKS.forEach((c) => c.record.forEach((r) => {
      expect(checksOf(graph.index[r.event]).map((x) => x.check.id), r.event).toContain(c.id);
    }));
  });

  it('has an address of its own, filed under the leads', () => {
    const c = CHECKS[0];
    expect(hrefFor({ view: 'checks' })).toBe('/checks/');
    expect(hrefFor({ view: 'check', id: c.id })).toBe('/check/' + c.id + '/');
    expect(parse('/check/' + c.id + '/')).toMatchObject({ view: 'check', id: c.id });
    expect(tabOf('check')).toBe('leads');
    expect(tabOf('checks')).toBe('leads');
    const meta = metaFor({ ...parse('/check/' + c.id + '/') });
    expect(meta.title.startsWith(checkById[c.id].title)).toBe(true);
    expect(meta.title).toContain(VERDICTS[c.verdict].label);
  });
});
