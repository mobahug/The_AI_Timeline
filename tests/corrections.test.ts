import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import raw from '../data/corrections.json';
import App from '../src/App';
import { CORRECTION_KIND, REGISTER_PAGES, registerPageNow, registerPageOf } from '../src/lib/corrections';
import { PER_PAGE, newestFirst, pageCount } from '../src/lib/register';
import { hrefFor, parse } from '../src/lib/url';
import type { Correction } from '../src/lib/types';
import type { RegisterPage } from '../src/lib/register';
import { buildGraph } from '../src/lib/data';
import { leadById } from '../src/lib/leads';
import { entityById } from '../src/lib/files';
import linksFile from '../data/links.json';
import { questionById } from '../src/lib/questions';
import { findingByNumber } from '../src/lib/spine';

const graph = buildGraph();
const ALL = raw.corrections as Correction[];
/** The register in the order it prints, and each card's own entries in it. */
const ORDER = newestFirst(ALL);
const correctionsOf = (event: string): Correction[] => ORDER.filter((c) => c.event === event);
/** Every page of the register, as the build cut them (the tests hold every page, as the server does). */
const PAGES = Array.from({ length: REGISTER_PAGES }, (_, i) => registerPageNow(i + 1)).filter((p): p is RegisterPage => !!p);
const render = (path: string) => renderToString(React.createElement(App, { initialRoute: parse(path, '', '') }));
const root = fileURLToPath(new URL('..', import.meta.url));
const shallow = (() => { try { return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true'; } catch { return true; } })();
const links = new Set((linksFile as { from: string; to: string }[]).map((l) => l.from + '>' + l.to));

/** Whether a record a correction points at is still on the board. */
const exists = (file: string, id: string): boolean =>
  file === 'data/events.json' ? !!graph.index[id]
  : file === 'data/leads.json' ? !!leadById[id]
  : file === 'data/links.json' ? links.has(id)
  : file === 'data/people.json' ? !!entityById('person', id)
  : file === 'data/orgs.json' ? !!entityById('org', id)
  : file === 'data/glossary.json' ? !!entityById('term', id)
  : file === 'data/questions.json' ? !!questionById[id]
  : file === 'data/spine.json' ? !!findingByNumber(id)
  : file === 'data/watch.json';

describe('corrections: every change of fact, as the history has it', () => {
  it('has unique ids and says, of each, what it said, what it says and why', () => {
    expect(ALL.length).toBeGreaterThan(0);
    expect(new Set(ALL.map((c) => c.id)).size).toBe(ALL.length);
    ALL.forEach((c) => {
      expect(c.id, c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.date, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.commit, c.id).toMatch(/^[0-9a-f]{7,40}$/);
      expect(Object.keys(CORRECTION_KIND), c.id).toContain(c.kind);
      expect(c.was.trim() && c.now.trim(), c.id).toBeTruthy();
      expect(c.was, c.id + ': nothing changed').not.toBe(c.now);
      expect(c.why.trim().length, c.id).toBeGreaterThan(20);
      if (c.source) expect(c.source.url, c.id).toMatch(/^https:\/\//);
    });
  });

  it('points at records still on the board', () => {
    ALL.forEach((c) => {
      expect(!!c.event !== !!c.where, c.id + ': a card or a place, not both').toBe(true);
      if (c.event) expect(graph.index[c.event], c.id + ' → ' + c.event).toBeTruthy();
      if (c.where) expect(exists(c.where.file, c.where.id), c.id + ' → ' + c.where.file + ' ' + c.where.id).toBe(true);
      (c.alsoIn || []).forEach((a) => expect(exists(a.file, a.id), c.id + ' → ' + a.file + ' ' + a.id).toBe(true));
    });
  });

  it('lists the newest first, and each card its own', () => {
    const dates = ORDER.map((c) => c.date);
    expect(dates).toEqual(dates.slice().sort().reverse());
    ALL.filter((c) => c.event).forEach((c) => expect(correctionsOf(c.event as string).map((x) => x.id), c.id).toContain(c.id));
  });

  it.skipIf(shallow)('is dated by commits that are in the history, on the days they were made', () => {
    // One lookup per commit: many corrections share one.
    const days = new Map<string, string>();
    ALL.forEach((c) => {
      if (!days.has(c.commit)) days.set(c.commit, execFileSync('git', ['show', '-s', '--format=%ad', '--date=short', c.commit], { cwd: root, encoding: 'utf8' }).trim());
      expect(days.get(c.commit), c.id + ' @ ' + c.commit).toBe(c.date);
    });
  });
});

describe('a dossier, on its corrections', () => {
  it('links its newest correction on the page of the register that prints it', async () => {
    const { atRegister, correctedOf } = await import('../src/lib/corrected');
    const cards = [...new Set(ORDER.map((c) => c.event).filter(Boolean) as string[])];
    // The card corrected most lately, and the one whose newest correction the register prints furthest back.
    [cards[0], cards[cards.length - 1]].forEach((id) => {
      const seen = correctedOf(id);
      if (!seen) throw new Error(id + ' was never corrected');
      expect(render('/card/' + id + '/'), id).toContain('href="' + hrefFor(atRegister(seen.id)) + '"');
    });
  });

  it('counts each card’s corrections from the heads alone, and links the newest', async () => {
    const { correctedOf } = await import('../src/lib/corrected');
    const cards = new Set(ALL.map((c) => c.event).filter(Boolean) as string[]);
    cards.forEach((id) => {
      const full = correctionsOf(id);
      const seen = correctedOf(id);
      expect(seen, id).not.toBeNull();
      expect(seen && seen.n, id).toBe(full.length);
      expect(seen && seen.id, id).toBe(full[0].id);
      expect(seen && seen.date, id).toBe(full[0].date);
    });
    expect(correctedOf('no-such-card')).toBeNull();
  });
});

describe('the register, a page at a time', () => {
  it('prints every entry once, newest first, and no page more than its share', () => {
    expect(PAGES.length).toBe(REGISTER_PAGES);
    expect(REGISTER_PAGES).toBe(pageCount(ALL.length));
    expect(PAGES.flatMap((p) => p.corrections.map((c) => c.id))).toEqual(ORDER.map((c) => c.id));
    PAGES.forEach((p, i) => {
      expect(p.corrections.length, 'page ' + (i + 1)).toBeLessThanOrEqual(PER_PAGE);
      if (i < PAGES.length - 1) expect(p.corrections.length, 'page ' + (i + 1)).toBe(PER_PAGE);
    });
  });

  it('says on every page what the whole register holds, and where each of its months stands', () => {
    const cards = new Set(ALL.map((c) => c.event).filter(Boolean)).size;
    const printed: Record<string, number> = {};
    PAGES.forEach((p, i) => {
      expect([p.total, p.cards, p.note], 'page ' + (i + 1)).toEqual([ALL.length, cards, raw.note]);
      const months = [...new Set(p.corrections.map((c) => c.date.slice(0, 7)))];
      expect(Object.keys(p.months).sort(), 'page ' + (i + 1)).toEqual(months.slice().sort());
      months.forEach((m) => {
        expect(p.months[m], 'page ' + (i + 1) + ' ' + m).toEqual({ total: ALL.filter((c) => c.date.startsWith(m)).length, before: printed[m] || 0 });
      });
      p.corrections.forEach((c) => { printed[c.date.slice(0, 7)] = (printed[c.date.slice(0, 7)] || 0) + 1; });
    });
  });

  it('knows which page prints each entry and each month, and sends a link there', async () => {
    const { atRegister, pageOf } = await import('../src/lib/corrected');
    PAGES.forEach((p, i) => {
      const n = i + 1;
      p.corrections.forEach((c) => {
        expect(pageOf(c.id), c.id).toBe(n);
        expect(atRegister(c.id), c.id).toEqual(n === 1 ? { view: 'corrections', hash: c.id } : { view: 'register', id: String(n), hash: c.id });
      });
      Object.entries(p.months).forEach(([m, { before }]) => { if (before === 0) expect(pageOf('m-' + m), m).toBe(n); });
    });
    expect(pageOf('no-such-entry')).toBeNull();
  });

  it('reads its page from the address, and no page it does not fill', () => {
    expect(registerPageOf(parse('/corrections/'))).toBe(1);
    expect(registerPageOf(parse('/card/chatgpt/'))).toBeNull();
    ['0', '1', 'x', String(REGISTER_PAGES + 1)].forEach((n) => expect(registerPageOf(parse('/corrections/' + n + '/')), n).toBeNull());
    for (let n = 2; n <= REGISTER_PAGES; n++) expect(registerPageOf(parse('/corrections/' + n + '/'))).toBe(n);
    expect(render('/corrections/' + (REGISTER_PAGES + 1) + '/').replace(/<!-- -->/g, '')).toContain('There is no page ' + (REGISTER_PAGES + 1) + ' of the register');
  });

  it('prints on each page its own entries, each under its own anchor, and none of the others', () => {
    PAGES.forEach((p, i) => {
      const html = render(i === 0 ? '/corrections/' : '/corrections/' + (i + 1) + '/');
      p.corrections.forEach((c) => expect(html, 'page ' + (i + 1) + ' prints ' + c.id).toContain('id="' + c.id + '"'));
      PAGES.filter((_, j) => j !== i).forEach((q) => q.corrections.forEach((c) => expect(html, 'page ' + (i + 1) + ' leaves ' + c.id).not.toContain('id="' + c.id + '"')));
    });
  });
});
