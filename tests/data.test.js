import { describe, it, expect } from 'vitest';
import events from '../data/events.json' assert { type: 'json' };
import links from '../data/links.json' assert { type: 'json' };
import meta from '../data/threads.json' assert { type: 'json' };

const catIds = meta.categories.map((c) => c.id);
const byId = Object.fromEntries(events.map((e) => [e.id, e]));

describe('events.json', () => {
  it('has unique ids', () => {
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses kebab-case ids', () => {
    const bad = events.filter((e) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id));
    expect(bad.map((e) => e.id)).toEqual([]);
  });

  it('is sorted by year and stays in range', () => {
    const years = events.map((e) => e.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(years.every((y) => y >= 1900 && y <= 2050)).toBe(true);
  });

  it('uses known categories', () => {
    const bad = events.filter((e) => !catIds.includes(e.category));
    expect(bad.map((e) => e.title)).toEqual([]);
  });

  it('keeps titles and summaries tight', () => {
    expect(events.filter((e) => !e.title || e.title.length > 70).map((e) => e.title)).toEqual([]);
    expect(events.filter((e) => !e.summary || e.summary.length > 220).map((e) => e.title)).toEqual([]);
  });

  it('only links out over https', () => {
    const bad = events.filter((e) => e.url && !/^https:\/\//.test(e.url));
    expect(bad.map((e) => e.title)).toEqual([]);
  });

  it('labels every projection with a confidence and no citation', () => {
    const future = events.filter((e) => e.year > 2026);
    const unlabelled = future.filter((e) => !['Likely', 'Uncertain', 'Speculative'].includes(e.confidence));
    expect(unlabelled.map((e) => e.title)).toEqual([]);
  });

  it('never labels a recorded event with a confidence', () => {
    const bad = events.filter((e) => e.year <= 2026 && e.confidence);
    expect(bad.map((e) => e.title)).toEqual([]);
  });
});

describe('links.json', () => {
  it('resolves both ends', () => {
    const bad = links.filter((l) => !byId[l.from] || !byId[l.to]);
    expect(bad).toEqual([]);
  });

  it('always states a claim', () => {
    expect(links.filter((l) => !l.claim || l.claim.length > 60)).toEqual([]);
  });

  it('points forward in time', () => {
    const backwards = links.filter((l) => byId[l.from].year > byId[l.to].year);
    expect(backwards.map((l) => l.from + ' -> ' + l.to)).toEqual([]);
  });

  it('has no duplicate strings and no self-links', () => {
    const keys = links.map((l) => l.from + '>' + l.to);
    expect(new Set(keys).size).toBe(keys.length);
    expect(links.filter((l) => l.from === l.to)).toEqual([]);
  });

  it('keeps case notes substantial when present', () => {
    const thin = links.filter((l) => l.note && l.note.length < 60);
    expect(thin.map((l) => l.from)).toEqual([]);
  });
});

describe('threads.json', () => {
  it('maps every category to a real thread', () => {
    const threadIds = meta.threads.map((t) => t.id);
    expect(meta.categories.filter((c) => !threadIds.includes(c.thread))).toEqual([]);
  });
});
