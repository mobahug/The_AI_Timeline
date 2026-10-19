/* Every page the site has, in one list. The router, the header, the page titles,
   the sitemap and the prerenderer all read from here, so a view is added or
   retired in one place.

   path    — the address under the site's base, as segments; `:name` captures a
             route field (`:id` for a card, a lead, a question, a headline check, a
             person, an organisation or a term; `:finding` for a stretch of the line)
   tab     — one of the doors in the header (Start here and The latest sit
             beside About in the header's first row instead)
   parent  — the tab that stays lit while this page is open
   hint    — what the page is, in a few plain words, for a reader who does not
             know the board's vocabulary: the header's tooltips, the phone
             menu's second line
   title / description — what the document carries for that route
   sitemap — listed for crawlers as a fixed address (parametrised pages are
             enumerated from the data by the sitemap and the prerenderer)
   shell   — the page column: 'read' for one card or the essay, 'route' for the
             line and the open file, 'wide' for the board, the archive, the landing
   papers  — the page prints cards' papers (their readings, files, figures,
             sources), so a turn to it waits for them unless the page was
             printed with them — see src/lib/papers.ts */

import type { Route, ViewId } from './types';

export type Shell = 'read' | 'route' | 'wide';
export interface View {
  id: ViewId;
  path: string;
  label?: string;
  hint?: string;
  tab?: boolean;
  parent?: ViewId;
  sitemap: boolean;
  shell: Shell;
  title?: string;
  description?: string;
  papers?: boolean;
}

export const VIEWS: View[] = [
  { id: 'landing', path: '', label: 'The AI Timeline', sitemap: false, shell: 'wide' },
  { id: 'line', path: 'line', label: 'The line', hint: 'The story in order, a stretch of years at a time', tab: true, sitemap: true, shell: 'route',
    title: 'The line',
    description: 'How a machine that could not add became something governments argue about — the order it happened in, and where the trail goes cold.' },
  { id: 'finding', path: 'line/:finding', parent: 'line', sitemap: false, shell: 'route', papers: true },
  { id: 'case', path: 'case', parent: 'line', sitemap: true, shell: 'route', papers: true,
    title: 'The case as it stands',
    description: 'Where the board stands, the road here, and what the case does not do — derived from the data.' },
  { id: 'horizon', path: 'horizon', parent: 'line', sitemap: true, shell: 'route', papers: true,
    title: 'The horizon',
    description: 'The forward half of the board as three horizons: scenarios, not forecasts.' },
  { id: 'predictions', path: 'predictions', parent: 'line', sitemap: true, shell: 'route',
    title: 'Said in advance',
    description: 'Famous predictions about AI — Turing, Simon, Minsky, Kurzweil, Hinton, Musk, Altman, Amodei and more — each quoted from where it was made and set beside what happened.' },
  { id: 'prediction', path: 'prediction/:id', parent: 'line', sitemap: false, shell: 'route' },
  { id: 'promises', path: 'promises', parent: 'line', sitemap: true, shell: 'route',
    title: 'Promises made',
    description: 'Promises that labs, companies and governments made in public about AI — on weapons, carbon, watermarks, safety frameworks, audits — each quoted in their own words and set beside what they did.' },
  { id: 'promise', path: 'promise/:id', parent: 'line', sitemap: false, shell: 'route' },
  { id: 'board', path: 'board', label: 'The board', hint: 'Every card and string, pinned to one wall', tab: true, sitemap: true, shell: 'wide',
    title: 'The board',
    description: 'Photo cards, string connections, and a walkthrough that follows each causal chain clue by clue.' },
  { id: 'card', path: 'card/:id', parent: 'board', sitemap: false, shell: 'read', papers: true },
  { id: 'machines', path: 'machines', parent: 'board', sitemap: true, shell: 'route',
    title: 'Run the original',
    description: 'Programs from the record rebuilt from their own papers and run in the browser: ELIZA with its 1965 script, Michie’s matchbox learner MENACE, Shannon’s approximations to English and the perceptron.' },
  { id: 'leads', path: 'leads', label: 'The leads', hint: 'One question at a time, followed up the years', tab: true, sitemap: true, shell: 'route',
    title: 'The leads',
    description: 'The lines of inquiry: how far machines got at mathematics, at games, at gaming their own tests, and how cheap the answers became — one rung at a time, on the record.' },
  { id: 'lead', path: 'lead/:id', parent: 'leads', sitemap: false, shell: 'route' },
  { id: 'questions', path: 'questions', parent: 'leads', sitemap: true, shell: 'route',
    title: 'Plain questions',
    description: 'Can I trust what a chatbot tells me? Will AI take my job? Is it a bubble? Plain questions, answered from the record, with what the record does not settle.' },
  { id: 'question', path: 'question/:id', parent: 'leads', sitemap: false, shell: 'route' },
  { id: 'checks', path: 'checks', parent: 'leads', sitemap: true, shell: 'route',
    title: 'Headline checks',
    description: 'Widely reported AI headlines set beside what the primary account — the lab report, the court filing, the law — actually says, quoted on both sides.' },
  { id: 'check', path: 'check/:id', parent: 'leads', sitemap: false, shell: 'route' },
  { id: 'charts', path: 'charts', label: 'The charts', hint: 'The record, counted: pace, eras, harm, names', tab: true, sitemap: true, shell: 'route',
    title: 'The charts',
    description: 'The record counted: how fast AI moved, what each era was about, harm and the response to it, how long a cause takes to show, how far up each lead the machines climbed, and the names that recur.' },
  { id: 'archive', path: 'archive', label: 'The archive', hint: 'Every entry, dated, filtered and searchable', tab: true, sitemap: true, shell: 'wide',
    title: 'The archive',
    description: 'Every entry on the board in date order — dense, filterable, searchable.' },
  { id: 'plates', path: 'archive/plates', parent: 'archive', sitemap: true, shell: 'wide',
    title: 'The archive · plates',
    description: 'The whole record as image-led plates, era by era: each card on the board with its photograph, its category and its summary, in the order it happened.' },
  { id: 'mosaic', path: 'archive/mosaic', parent: 'archive', sitemap: true, shell: 'wide',
    title: 'The archive · mosaic',
    description: 'Every photograph on the board, in date order: the people, machines and places of the record, each tile opening its card on the board.' },
  { id: 'files', path: 'files', label: 'The files', hint: 'Every person, organisation and term', tab: true, sitemap: true, shell: 'route',
    title: 'The files',
    description: 'Persons of interest, organisations and the glossary — every name on the board, and every card it appears on, without leaving the site.' },
  { id: 'person', path: 'person/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'org', path: 'org/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'glossary', path: 'glossary', parent: 'files', sitemap: true, shell: 'route',
    title: 'The glossary',
    description: 'The terms the board uses, defined in place — transformer, scaling law, reward hacking, test-time compute — each with the cards it turns up on.' },
  { id: 'term', path: 'term/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'start', path: 'start', label: 'Start here', hint: 'New to AI, or to the board? Begin here', sitemap: true, shell: 'route',
    title: 'Start here',
    description: 'New to AI, or to this board? What the board is, how to read it, the ideas AI turns on in plain words, and where to begin for the time you have.' },
  { id: 'latest', path: 'latest', label: 'The latest', hint: 'The newest events, dates to watch, what changed', sitemap: true, shell: 'route',
    title: 'The latest',
    description: 'The newest AI events on the record, the dates it knows are coming, the questions it is waiting on, and what changed on the board, with a feed to follow it by.' },
  { id: 'about', path: 'about', label: 'About', hint: 'How the board works, and its licence', sitemap: true, shell: 'read', papers: true,
    title: 'About',
    description: 'How this board works, what a string means, what it does not claim, and the licence it is published under.' },
  { id: 'corrections', path: 'corrections', sitemap: true, shell: 'route',
    title: 'Corrections',
    description: 'Every fact the board has corrected in its own record — what a card said, what it says now, why, and the source that settled it — dated from its history.' }
];

/** Retired view names keep working: every link ever shared still lands somewhere sensible. */
export const RETIRED: Record<string, ViewId> = { index: 'archive' };

export const viewById = Object.fromEntries(VIEWS.map((v) => [v.id, v])) as Record<ViewId, View>;
export const VIEW_IDS = new Set<string>(VIEWS.map((v) => v.id));
export const TABS = VIEWS.filter((v) => v.tab);
export const SITEMAP_VIEWS = VIEWS.filter((v) => v.sitemap).map((v) => v.id);

/** The case's lede, printed on its page and on the line's open file. Here, not on
 *  the case's page, so that the line does not bring the case's chunk with it. */
export const CASE_LEDE = 'Why the present looks the way it does — the road here, what carries forward, and which parts of the record the board has never argued from.';

/** The header tab that belongs to a view — itself, or the tab it files under. */
export const tabOf = (id: ViewId): ViewId => (viewById[id] && viewById[id].parent) || id;

/** The route field a view's `:param` fills. */
export const PARAM_FIELD: Record<string, 'id' | 'finding'> = { id: 'id', finding: 'finding' };

/** The path segments of a view for a route, or null when a required field is missing. */
export function segmentsFor(route: Pick<Route, 'view'> & Partial<Route>): string[] | null {
  const v = viewById[route.view];
  if (!v) return null;
  if (!v.path) return [];
  const out: string[] = [];
  for (const seg of v.path.split('/')) {
    if (seg[0] !== ':') { out.push(seg); continue; }
    const value = route[PARAM_FIELD[seg.slice(1)] || 'id'];
    if (value === null || value === undefined || value === '') return null;
    out.push(encodeURIComponent(String(value)));
  }
  return out;
}

/** The view and captured fields for a list of path segments, or null. Longer
 *  patterns are tried first, so `archive/plates` wins over `archive`. */
export function matchSegments(segments: string[]): { view: ViewId; fields: Partial<Pick<Route, 'id' | 'finding'>> } | null {
  const ordered = VIEWS.slice().sort((a, b) => b.path.length - a.path.length);
  for (const v of ordered) {
    const pattern = v.path ? v.path.split('/') : [];
    if (pattern.length !== segments.length) continue;
    const fields: Partial<Pick<Route, 'id' | 'finding'>> = {};
    let ok = true;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i][0] === ':') {
        const name = pattern[i].slice(1);
        try { fields[PARAM_FIELD[name] || 'id'] = decodeURIComponent(segments[i]); } catch { ok = false; break; }
      } else if (pattern[i] !== segments[i]) { ok = false; break; }
    }
    if (ok) return { view: v.id, fields };
  }
  return null;
}
