import { describe, it, expect } from 'vitest';
import events from '../data/events.json' assert { type: 'json' };
import links from '../data/links.json' assert { type: 'json' };
import meta from '../data/threads.json' assert { type: 'json' };

const catIds = meta.categories.map((c) => c.id);
const byId = Object.fromEntries(events.map((e) => [e.id, e]));
/* The present comes from the data, not from this file. The board's `now` moves;
   a year typed in here would quietly stop meaning the present. */
const NOW = meta.span.now;

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
    const future = events.filter((e) => e.year > NOW);
    const unlabelled = future.filter((e) => !['Likely', 'Uncertain', 'Speculative'].includes(e.confidence as string));
    expect(unlabelled.map((e) => e.title)).toEqual([]);
  });

  it('never labels a recorded event with a confidence', () => {
    const bad = events.filter((e) => e.year <= NOW && e.confidence);
    expect(bad.map((e) => e.title)).toEqual([]);
  });

  /* A projection carries reasoning instead of a citation — docs/SCHEMA.md has
     always said so, and nothing checked it. Seven of eighteen scenarios had
     none, and the horizon printed the consequence out loud on every one of
     them: "Asserted, with no reason written down." */
  it('gives every projection a reading, since it has no citation', () => {
    const silent = events.filter((e) => e.year > NOW && !e.why);
    expect(silent.map((e) => e.id)).toEqual([]);
  });

  /* A date is the order inside a year, where the record knows it. It is
     `YYYY-MM` or `YYYY-MM-DD`, it agrees with the year above it, and it never
     appears on a scenario — a scenario's year is a placeholder, and a date on
     one would read as a forecast. */
  it('dates the record, in one form, never a scenario', () => {
    const dated = events.filter((e) => e.date !== undefined);
    const malformed = dated.filter((e) => !/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/.test(e.date as string));
    expect(malformed.map((e) => e.id)).toEqual([]);
    const mismatched = dated.filter((e) => (e.date as string).slice(0, 4) !== String(e.year));
    expect(mismatched.map((e) => e.id)).toEqual([]);
    expect(events.filter((e) => e.year > NOW && e.date).map((e) => e.id)).toEqual([]);
  });

  /* Two cards in the same year that both carry a date are written in that
     order, so the file and the board never disagree about which came first. */
  it('writes same-year dated cards in date order', () => {
    const out: string[] = [];
    events.forEach((e, i) => {
      const prev = events[i - 1];
      if (prev && prev.year === e.year && prev.date && e.date && prev.date > e.date) out.push(prev.id + ' before ' + e.id);
    });
    expect(out).toEqual([]);
  });
});

describe('links.json', () => {
  /* A string points forward in time. Within one year the date settles it, and
     where only one end is dated the undated card leads the year — so a dated
     card can never point back at an undated one in the same year. */
  it('never runs backwards inside a year', () => {
    const pos = Object.fromEntries(events.map((e, i) => [e.id, i]));
    const bad = links.filter((l) => {
      const a = byId[l.from], b = byId[l.to];
      if (!a || !b || a.year !== b.year) return false;
      if (a.date && b.date) return a.date > b.date;
      if (a.date && !b.date) return true;
      if (!a.date && b.date) return false;
      return pos[l.from] > pos[l.to];
    });
    expect(bad.map((l) => l.from + ' → ' + l.to)).toEqual([]);
  });

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
