import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildGraph, sourcesOf, sourceStrength, SOURCE_KINDS } from '../src/lib/data.js';

const graph = buildGraph(null);
const record = graph.all.filter((e) => !e.future);
const raw = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf8'));
const withArray = raw.filter((e) => Array.isArray(e.sources) && e.sources.length);

describe('the sources array is well formed where it exists', () => {
  it('is being adopted, not merely declared', () => {
    expect(withArray.length).toBeGreaterThan(0);
  });

  it('uses only known kinds', () => {
    withArray.forEach((e) => e.sources.forEach((s) => {
      expect(SOURCE_KINDS, e.title + ' / ' + s.url).toContain(s.kind);
    }));
  });

  it('gives every source a publisher, a title and an https url', () => {
    withArray.forEach((e) => e.sources.forEach((s) => {
      expect(s.publisher, e.title).toBeTruthy();
      expect(s.title, e.title).toBeTruthy();
      expect(s.url, e.title).toMatch(/^https:\/\//);
    }));
  });

  it('dates every source as YYYY-MM-DD', () => {
    withArray.forEach((e) => e.sources.forEach((s) => {
      expect(s.date, e.title + ' / ' + s.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }));
  });

  it('never lists the same url twice on one entry', () => {
    withArray.forEach((e) => {
      const urls = e.sources.map((s) => s.url);
      expect(new Set(urls).size, e.title).toBe(urls.length);
    });
  });

  it('keeps the legacy primary citation among its sources', () => {
    withArray.filter((e) => e.url).forEach((e) => {
      expect(e.sources.map((s) => s.url), e.title).toContain(e.url);
    });
  });

  it('only gives a timestamp to time-based media', () => {
    withArray.forEach((e) => e.sources.filter((s) => s.at).forEach((s) => {
      expect(['video', 'podcast', 'interview'], e.title + ' / ' + s.title).toContain(s.kind);
    }));
  });
});

describe('a source cannot claim support without a quote', () => {
  it('is enforced in the data', () => {
    withArray.forEach((e) => e.sources.forEach((s) => {
      if (s.supports === 'claim') {
        expect(s.quote, e.title + ' / ' + s.title + ' claims support with no quote').toBeTruthy();
        expect(s.quote.length, e.title).toBeGreaterThan(10);
      }
    }));
  });

  it('is enforced again in the reader, so bad data cannot leak through', () => {
    const forged = { url: 'https://example.test/x', sources: [
      { kind: 'article', publisher: 'P', title: 'T', url: 'https://example.test/x', date: '2026-01-01', supports: 'claim' }
    ] };
    expect(sourcesOf(forged)[0].supports).toBe('context');
  });
});

describe('sourcesOf gives one shape for migrated and unmigrated entries alike', () => {
  it('normalises a legacy source + url pair', () => {
    const legacy = record.find((e) => !Array.isArray(e.sources) && e.url);
    expect(legacy).toBeTruthy();
    const list = sourcesOf(legacy);
    expect(list.length).toBe(1);
    expect(list[0].legacy).toBe(true);
    expect(list[0].url).toBe(legacy.url);
    expect(list[0].supports).toBe('context');
  });

  it('returns nothing for an entry with no source at all', () => {
    const none = record.find((e) => !e.url && !Array.isArray(e.sources));
    if (none) expect(sourcesOf(none)).toEqual([]);
    expect(sourcesOf(null)).toEqual([]);
  });

  it('covers every record entry with either a legacy citation or an array', () => {
    const bare = record.filter((e) => sourcesOf(e).length === 0);
    // one known entry has no source; the test exists to stop that number growing
    expect(bare.length).toBeLessThanOrEqual(1);
  });
});

describe('sourceStrength reports what is actually there', () => {
  it('calls an entry quoted only when a source carries a verbatim quote', () => {
    const migrated = record.find((e) => Array.isArray(e.sources) && e.sources.some((s) => s.quote));
    expect(sourceStrength(migrated).state).toBe('quoted');
    expect(sourceStrength(migrated).supporting).toBeGreaterThan(0);

    const legacy = record.find((e) => !Array.isArray(e.sources) && e.url);
    expect(sourceStrength(legacy).state).toBe('cited');
    expect(sourceStrength(legacy).supporting).toBe(0);
  });

  it('counts media separately, since video was the point of the migration', () => {
    const s = sourceStrength({ sources: [
      { kind: 'interview', publisher: 'P', title: 'T', url: 'https://x.test/a', date: '2026-01-01', at: '14:32', quote: 'a real sentence here', supports: 'claim' },
      { kind: 'article', publisher: 'P', title: 'T2', url: 'https://x.test/b', date: '2026-01-01', supports: 'context' }
    ] });
    expect(s.media).toBe(1);
    expect(s.supporting).toBe(1);
    expect(s.total).toBe(2);
  });
});
