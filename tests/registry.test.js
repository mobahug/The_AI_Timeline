import { describe, it, expect } from 'vitest';
import { VIEWS, VIEW_IDS, TABS, SITEMAP_VIEWS, RETIRED, tabOf, viewById } from '../src/lib/views.js';
import { hrefFor, resolve } from '../src/lib/url.js';
import { metaFor } from '../src/lib/meta.js';
import { FIRST, NOW, LAST, buildGraph, yearFraction, yearAtFraction, TICKS, forwardLedger } from '../src/lib/data.js';
import { ink, micro, button, badge, shell, headline } from '../src/lib/styles.js';

const graph = buildGraph(null);

describe('the view registry is the one list of pages', () => {
  it('has unique ids and exactly three tabs', () => {
    expect(new Set(VIEWS.map((v) => v.id)).size).toBe(VIEWS.length);
    expect(TABS.map((v) => v.id)).toEqual(['line', 'board', 'archive']);
  });

  it('files every child under a tab that exists', () => {
    VIEWS.filter((v) => v.parent).forEach((v) => expect(viewById[v.parent].tab, v.id).toBe(true));
    expect(tabOf('finding')).toBe('line');
    expect(tabOf('card')).toBe('board');
    expect(tabOf('plates')).toBe('archive');
    expect(tabOf('board')).toBe('board');
  });

  it('gives every sitemap view a title and a description', () => {
    SITEMAP_VIEWS.forEach((id) => {
      expect(viewById[id].title, id).toBeTruthy();
      expect(viewById[id].description, id).toBeTruthy();
    });
  });

  it('retires names to views that exist', () => {
    Object.values(RETIRED).forEach((id) => expect(VIEW_IDS.has(id)).toBe(true));
  });
});

describe('routes round-trip through the URL', () => {
  it('writes only what differs from the default', () => {
    expect(hrefFor({ view: 'landing', category: 'all', query: '' })).toBe('/');
    expect(hrefFor({ view: 'card', id: 'alexnet' })).toBe('/?view=card&id=alexnet');
    expect(hrefFor({ view: 'finding', finding: '3' })).toBe('/?view=finding&f=3');
    expect(hrefFor({ view: 'board', clue: { from: 'a', to: 'b' }, id: 'ignored' })).toBe('/?view=board&clue=a%3Eb');
  });

  it('starts a new view from a clean slate but carries the filter', () => {
    const prev = { view: 'board', id: 'alexnet', clue: null, finding: null, category: 'power', query: 'x' };
    expect(resolve(prev, { view: 'line' })).toMatchObject({ view: 'line', id: null, clue: null, finding: null, category: 'power', query: 'x' });
    expect(resolve(prev, { view: 'card', id: 'gpt-3' })).toMatchObject({ view: 'card', id: 'gpt-3', clue: null });
    expect(resolve(prev, { query: 'y' })).toMatchObject({ view: 'board', id: 'alexnet', query: 'y' });
  });
});

describe('page meta derives from the route', () => {
  it('names a card by its year and title', () => {
    const e = graph.all[0];
    expect(metaFor({ view: 'card', id: e.id }, graph).title).toBe(e.year + ' · ' + e.title + ' · The AI Timeline');
  });

  it('spells out a clue as A claim B', () => {
    const l = graph.edges[0];
    const m = metaFor({ view: 'board', clue: { from: l.from, to: l.to } }, graph);
    expect(m.description.startsWith(graph.index[l.from].title + ' ' + l.claim + ' ' + graph.index[l.to].title + '.')).toBe(true);
  });

  it('never types a year the data does not carry', () => {
    const m = metaFor({ view: 'landing' }, graph);
    expect(m.title).toContain(String(FIRST));
    expect(m.title).toContain(String(LAST));
  });

  it('falls back to the registry for a titled view and to the site for the rest', () => {
    expect(metaFor({ view: 'archive' }, graph).title).toBe('The archive · The AI Timeline');
    expect(metaFor({ view: 'landing' }, graph).title).toContain('The AI Timeline');
  });
});

describe('the time axis', () => {
  it('runs from FIRST to LAST, monotonically', () => {
    expect(yearFraction(FIRST)).toBe(0);
    expect(yearFraction(LAST)).toBe(1);
    let prev = -1;
    for (let y = FIRST; y <= LAST; y++) {
      const f = yearFraction(y);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('gives the last fifteen years more room than the first ninety', () => {
    expect(yearFraction(LAST) - yearFraction(NOW - 15)).toBeGreaterThan(yearFraction(FIRST + 90) - yearFraction(FIRST));
  });

  it('inverts on every tick', () => {
    TICKS.forEach((y) => expect(yearAtFraction(yearFraction(y))).toBe(y));
  });
});

describe('the forward ledger', () => {
  it('counts every scenario once and never more argued than total', () => {
    const f = forwardLedger(graph);
    expect(f.total).toBe(graph.all.filter((e) => e.future).length);
    expect(f.argued).toBeLessThanOrEqual(f.total);
    expect(f.crossing + f.internal).toBe(f.landing);
  });
});

describe('the style helpers hold the contrast floor', () => {
  it('never writes an ink step below 0.5 on the ground', () => {
    [1, 2, 3, 4, 5].forEach((s) => {
      const a = Number(ink(s).match(/,([\d.]+)\)$/)[1]);
      expect(a).toBeGreaterThanOrEqual(0.5);
    });
    expect(micro(5).color).toBe(ink(5));
    expect(micro(0.7).color).toBe('rgba(243,240,234,0.7)');
  });

  it('gives buttons three tones and four sizes, and no caller needs its own padding', () => {
    expect(button('loud').color).not.toBe(button('quiet').color);
    expect(button('dim').color).toBe(ink(5));
    expect(button('quiet', 'sm').padding).not.toBe(button('quiet', 'lg').padding);
    expect(button('quiet', 'nonsense').padding).toBe(button('quiet', 'md').padding);
  });

  it('draws the scenario badge dashed, like every manila element', () => {
    expect(badge().border).toContain('dashed');
  });

  it('has three page widths and three headline scales', () => {
    expect(shell('read').maxWidth).toBeLessThan(shell('route').maxWidth);
    expect(shell('route').maxWidth).toBeLessThan(shell('wide').maxWidth);
    ['page', 'panel', 'row'].forEach((k) => expect(headline(k).title.font).toContain('Instrument Serif'));
  });
});
