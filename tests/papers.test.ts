import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import PAPERS from '../data/events.json?papers';
import App from '../src/App';
import { buildGraph, events } from '../src/lib/data';
import { ORGS, PEOPLE, TERMS, entitiesOf } from '../src/lib/files';
import { LEADS } from '../src/lib/leads';
import { metaFor } from '../src/lib/meta';
import { carriedPapers, carryPapers, hasPapers, loadPapers, papersFor, primePapers } from '../src/lib/papers';
import { FINDINGS } from '../src/lib/spine';
import { parse } from '../src/lib/url';
import { VIEWS, viewById } from '../src/lib/views';
import { pages } from '../src/lib/pages';
import { QUESTIONS } from '../src/lib/questions';
import { CHECKS } from '../src/lib/checks';
import { PREDICTIONS } from '../src/lib/predictions';
import { PLEDGES } from '../src/lib/pledges';
import corrections from '../data/corrections.json';
import { headOf, papersOf } from '../scripts/split-events';
import { PAPER_FIELDS } from '../src/lib/types';
import type { Carried } from '../src/lib/papers';
import type { Dossier, EventRaw } from '../src/lib/types';

/* A card's papers — its reading, file, figures and sources — are filed apart
   from the card (scripts/split-events.ts) and read through src/lib/papers.ts.
   What is checked here: the split loses nothing, the names the build files on
   a card are the ones its words use, the browser's bundle never holds the
   papers whole, a page carries exactly what its render read, and a turn waits
   only for a page whose papers are not here. */

const root = join(__dirname, '..');
const raw = JSON.parse(readFileSync(join(root, 'data', 'events.json'), 'utf8')) as EventRaw[];
const graph = buildGraph();

// Every test that takes the papers away hands them back.
afterEach(() => { primePapers(PAPERS); carryPapers(null); });

describe('the split', () => {
  it('loses nothing and adds nothing but the names', () => {
    raw.forEach((card) => {
      const { named, ...head } = headOf(card);
      expect(named, card.id).toBeTruthy();
      expect({ ...head, ...papersOf(card) }, card.id).toEqual(card);
      PAPER_FIELDS.forEach((f) => expect(f in head, card.id + ' keeps its ' + f + ' on the wall').toBe(false));
    });
  });

  it('files on each card the names its words use, as reading them would', () => {
    // The card as written, papers and all, is read as written; the filed card
    // answers from what the build found. The two must agree, name for name.
    const ids = (n: ReturnType<typeof entitiesOf>) => [...n.people, ...n.orgs, ...n.terms].map((x) => x.kind + ':' + x.id);
    raw.forEach((card) => {
      expect(ids(entitiesOf(graph.index[card.id])), card.id).toEqual(ids(entitiesOf(card as unknown as Dossier)));
    });
  });

  it('never puts the papers in the bundle the browser starts with', () => {
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p);
    });
    walk(join(root, 'src'));
    const imports = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:from|import\()\s*'([^']*events\.json[^']*)'/g)]
      .map((m) => ({ file: f.slice(root.length + 1), what: m[1], dynamic: m[0].startsWith('import(') })));
    // The whole file is never imported; the papers only by the server, or on demand.
    expect(imports.filter((i) => !/\?(cards|papers)$/.test(i.what))).toEqual([]);
    expect(imports.filter((i) => i.what.endsWith('?papers') && !i.dynamic).map((i) => i.file)).toEqual(['src/entry-server.tsx']);
  });
});

/* Every address the prerenderer writes: the list it writes them from. */
const ROUTES: string[] = pages({ findings: FINDINGS, events, leads: LEADS, questions: QUESTIONS, checks: CHECKS, predictions: PREDICTIONS, promises: PLEDGES, people: PEOPLE, orgs: ORGS, terms: TERMS, corrections: corrections.corrections })
  .map((p) => '/' + p.path);

/** What the prerenderer does for one address: the page, its meta, and the papers it read. */
const render = (path: string) => {
  const route = parse(path, '', '');
  const html = renderToString(React.createElement(App, { initialRoute: route }));
  return { route, html, description: metaFor(route, graph).description };
};

describe('a page carries the papers it printed', () => {
  it('reads, with only what it carries, exactly what the server wrote — on every page', () => {
    ROUTES.forEach((path) => {
      primePapers(PAPERS);
      const server = render(path);
      const carried = carriedPapers(server.route);
      // The browser's first render: no papers but the page's own.
      primePapers(null);
      carryPapers(carried);
      const browser = render(path);
      expect(browser.html === server.html, path + ' hydrates from what it carries').toBe(true);
      expect(browser.description, path).toBe(server.description);
      // And the page it was printed for is one a turn back to need not wait for.
      expect(hasPapers(server.route), path).toBe(true);
      // A page that reads papers says so in the registry, so a turn to it waits.
      if (carried && Object.keys(carried.papers).length) expect(viewById[server.route.view].papers, path + ' reads papers').toBe(true);
    });
    // It renders every page twice; on the deploy's runner it took 4.4 of the
    // default five seconds before the predictions and the machines arrived.
  }, 30_000);

  it('carries nothing on a page that prints no papers, and only its own card on a dossier', () => {
    primePapers(PAPERS);
    render('/archive/');
    expect(carriedPapers(parse('/archive/'))).toBe(null);
    primePapers(PAPERS);
    render('/card/chatgpt/');
    const carried = carriedPapers(parse('/card/chatgpt/')) as Carried;
    expect(Object.keys(carried.papers)).toEqual(['chatgpt']);
    expect(Object.keys(carried.papers.chatgpt).sort()).toEqual([...PAPER_FIELDS].sort());
    // The days it was filed and last changed, the lines on it and its
    // corrections, among them: the corrections with the page of the register
    // that prints the newest, which its link names.
    expect(carried.papers.chatgpt.kept).toEqual(PAPERS.chatgpt.kept || null);
    expect(carried.papers.chatgpt.notes).toEqual(PAPERS.chatgpt.notes || null);
    expect(carried.papers.chatgpt.corrected).toEqual(PAPERS.chatgpt.corrected || null);
    const corrected = carried.papers.chatgpt.corrected;
    if (corrected) expect(Object.keys(corrected).sort()).toEqual(['date', 'id', 'n', 'page']);
  });
});

describe('a turn waits only for papers that are not here', () => {
  const chatgpt: Carried = { at: 'card|chatgpt|', papers: { chatgpt: { why: 'x', detail: null, figures: null, sources: null, kept: null, notes: null, corrected: null } } };

  it('knows which pages a page’s own papers cover', () => {
    primePapers(null);
    carryPapers(chatgpt);
    expect(hasPapers(parse('/card/chatgpt/'))).toBe(true);
    expect(hasPapers(parse('/card/gpt-3/'))).toBe(false);
    expect(hasPapers(parse('/archive/'))).toBe(true);
    expect(hasPapers(parse('/horizon/'))).toBe(false);
    expect(hasPapers(parse('/board/'))).toBe(true);
    expect(hasPapers(parse('/board/', '?id=chatgpt'))).toBe(true);
    expect(hasPapers(parse('/board/', '?id=gpt-3'))).toBe(false);
    expect(hasPapers(parse('/board/', '?clue=gpt-3%3Echatgpt'))).toBe(true);
    // The field reads every card's papers, and so does the guess on a missed address.
    expect(hasPapers(parse('/archive/', '?q=hinton'))).toBe(false);
    expect(hasPapers(parse('/no-such-page/'))).toBe(false);
    carryPapers({ at: 'horizon||', papers: {} });
    expect(hasPapers(parse('/horizon/'))).toBe(true);
  });

  it('never waits within a page, and sends for the papers when a turn must', async () => {
    primePapers(null);
    carryPapers(chatgpt);
    expect(papersFor(parse('/archive/', '?q=hinton'), parse('/archive/'))).toBe(null);
    expect(papersFor(parse('/board/', '?id=gpt-3'), parse('/board/'))).toBe(null);
    expect(papersFor(parse('/card/chatgpt/'), parse('/archive/'))).toBe(null);
    const wait = papersFor(parse('/card/gpt-3/'), parse('/card/chatgpt/'));
    expect(wait).toBeInstanceOf(Promise);
    await wait;
    expect(hasPapers(parse('/card/gpt-3/'))).toBe(true);
    expect(papersFor(parse('/horizon/'), null)).toBe(null);
    await loadPapers();
  });
});
