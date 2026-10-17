import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { AS_OF, buildGraph } from '../src/lib/data';
import { CHANGES, WATCH, changes, dateOf, dayOf, keptOf, lately, monthOf, watchList } from '../src/lib/latest';
import { paperOf } from '../src/lib/papers';
import { CHECKS } from '../src/lib/checks';
import { hrefFor, parse } from '../src/lib/url';
import { metaFor } from '../src/lib/meta';
import { tabOf } from '../src/lib/views';
import { boardChangesOf } from '../scripts/board-changes';
import type { Change, Dossier } from '../src/lib/types';

/* The latest page: what happened most recently, what the record knows is
   coming, and what changed on the board. Nothing on it is dated by hand, so
   these hold each date to where it comes from: a card's date, a card's own
   words, or the history. */

const graph = buildGraph();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Everything a card says in its own voice, papers included. */
const wordsOf = (e: Dossier): string => [
  e.title, e.summary, paperOf(e, 'why'), ...(paperOf(e, 'detail') || []),
  ...(paperOf(e, 'figures') || []).map((f) => f.label + ': ' + f.value)
].filter(Boolean).join('\n');

describe('the watch list rests on the record', () => {
  it('has unique, stable ids and a date in one form, or none', () => {
    expect(WATCH.length).toBeGreaterThan(0);
    expect(new Set(WATCH.map((w) => w.id)).size).toBe(WATCH.length);
    WATCH.forEach((w) => {
      expect(w.id, w.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      if (w.date !== undefined) expect(w.date, w.id).toMatch(/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/);
      expect(w.what.trim().length, w.id).toBeGreaterThan(20);
    });
  });

  it('quotes every item, word for word, from a card on the record', () => {
    WATCH.forEach((w) => {
      const e = graph.index[w.event];
      expect(e, w.id + ' → ' + w.event).toBeTruthy();
      expect(e.future, w.id).toBe(false);
      expect(wordsOf(e), w.id).toContain(w.evidence);
    });
  });

  it('dates nothing its card’s words do not name', () => {
    WATCH.filter((w) => w.date).forEach((w) => {
      const [y, m, d] = (w.date as string).split('-').map(Number);
      expect(w.evidence, w.id).toContain(String(y));
      expect(w.evidence, w.id).toContain(MONTHS[m - 1]);
      if (d) expect(w.evidence, w.id).toMatch(new RegExp('\\b' + d + ' ' + MONTHS[m - 1]));
    });
  });

  it('is split by the day the record was brought up to date, soonest first', () => {
    const { ahead, passed, open } = watchList(AS_OF);
    expect(ahead.length + passed.length + open.length).toBe(WATCH.length);
    ahead.forEach((w) => expect((w.date as string) > AS_OF, w.id).toBe(true));
    passed.forEach((w) => expect((w.date as string) <= AS_OF, w.id).toBe(true));
    for (let i = 1; i < ahead.length; i++) expect((ahead[i].date as string) >= (ahead[i - 1].date as string)).toBe(true);
    // A later record date moves every dated item behind it.
    const later = watchList('2999-12-31');
    expect(later.ahead).toEqual([]);
    expect(later.passed.length).toBe(ahead.length + passed.length);
    expect(dateOf({ id: 'x', date: '2026-11-12', what: '', event: '', evidence: '' })).toBe('12 Nov 2026');
  });
});

describe('what happened lately', () => {
  const year = Number(AS_OF.slice(0, 4));
  const since = (year - 1) + AS_OF.slice(4, 7);

  it('lists every card dated in the year to the record date, and the year’s undated cards', () => {
    const shown = lately(graph).flatMap((s) => s.items);
    const expected = graph.all.filter((e) => !e.future && (e.date
      ? e.date.slice(0, 7) >= since && e.date.slice(0, 10) <= AS_OF
      : e.year === year));
    expect(shown.map((e) => e.id).sort()).toEqual(expected.map((e) => e.id).sort());
    shown.forEach((e) => expect(e.future, e.id).toBe(false));
  });

  it('runs newest first, by month, a year’s undated cards after its months', () => {
    const stretches = lately(graph);
    const keys = stretches.map((s) => s.key);
    const rank = (k: string) => (k.length === 4 ? k + '-00' : k);
    expect(keys.slice().sort((a, b) => rank(b).localeCompare(rank(a)))).toEqual(keys);
    stretches.filter((s) => s.key.length === 7).forEach((s) => {
      expect(s.label).toBe(monthOf(s.key));
      s.items.forEach((e) => expect((e.date as string).slice(0, 7)).toBe(s.key));
      for (let i = 1; i < s.items.length; i++) expect((s.items[i].date as string) <= (s.items[i - 1].date as string)).toBe(true);
    });
    expect(monthOf('2026-09')).toBe('September 2026');
  });

  it('moves with the record date, not with a date written here', () => {
    const earlier = lately(graph, '2023-12-31').flatMap((s) => s.items);
    expect(earlier.length).toBeGreaterThan(0);
    earlier.forEach((e) => expect(e.year === 2023 || (e.year === 2022 && (e.date as string) >= '2022-12'), e.id).toBe(true));
  });
});

describe('what changed on the board', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));

  it('is the list the build dates from this repository’s history', () => {
    expect(CHANGES).toEqual(boardChangesOf(root).changes);
    expect(CHANGES.length).toBeGreaterThan(0);
  });

  it('dates every card on the board, filed before or when it last changed', () => {
    graph.all.forEach((e) => {
      const kept = keptOf('card', e.id);
      expect(kept, e.id).toBeTruthy();
      expect((kept as { filed: string }).filed <= (kept as { changed: string }).changed, e.id).toBe(true);
      expect((kept as { filed: string }).filed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    expect(keptOf('card', 'no-such-card')).toBeNull();
  });

  it('names only records the board holds, each with an address of its own', () => {
    const out = changes(graph);
    expect(out.length).toBe(CHANGES.length);
    out.forEach((c) => {
      expect(c.title.length, c.id).toBeGreaterThan(0);
      const href = hrefFor({ view: c.kind, id: c.id });
      expect(parse(href)).toMatchObject({ view: c.kind, id: c.id });
    });
  });

  it('says new or revised, and leaves out a record that is gone', () => {
    const list: Change[] = [
      { kind: 'card', id: 'chatgpt', added: '2026-01-01T09:00:00+00:00', changed: '2026-02-03T09:00:00+00:00', subject: 'ChatGPT says what its source says.' },
      { kind: 'card', id: 'no-such-card', added: '2026-01-01T09:00:00+00:00', changed: '2026-01-01T09:00:00+00:00', subject: '' },
      { kind: 'check', id: CHECKS[0].id, added: '2026-01-02T09:00:00+00:00', changed: '2026-01-02T09:00:00+00:00', subject: '' }
    ];
    const out = changes(graph, list);
    expect(out.map((c) => c.id)).toEqual(['chatgpt', CHECKS[0].id]);
    expect(out[0]).toMatchObject({ isNew: false, title: 'ChatGPT', noun: 'Card', to: { view: 'card', id: 'chatgpt' } });
    expect(out[1]).toMatchObject({ isNew: true, noun: 'Headline check', to: { view: 'check', id: CHECKS[0].id } });
    expect(dayOf('2026-10-15T11:15:27+03:00')).toBe('15 Oct 2026');
  });
});

describe('the new pages have addresses of their own', () => {
  it('start, latest and charts', () => {
    expect(hrefFor({ view: 'start' })).toBe('/start/');
    expect(hrefFor({ view: 'latest', hash: 'watch' })).toBe('/latest/#watch');
    expect(hrefFor({ view: 'charts' })).toBe('/charts/');
    expect(parse('/latest/')).toMatchObject({ view: 'latest' });
    expect(parse('/charts/', '', '#pace')).toMatchObject({ view: 'charts', hash: 'pace' });
    expect(tabOf('charts')).toBe('charts');
    expect(metaFor(parse('/charts/'), graph).title).toBe('The charts · The AI Timeline');
    expect(metaFor(parse('/latest/'), graph).description.length).toBeLessThanOrEqual(160);
    expect(metaFor(parse('/start/'), graph).description.length).toBeLessThanOrEqual(160);
  });
});
