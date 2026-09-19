/* Every page the site has, in one list. The router, the header, the page titles,
   the sitemap and the prerenderer all read from here, so a view is added or
   retired in one place.

   path    — the address under the site's base, as segments; `:name` captures a
             route field (`:id` for a card, a lead, a person, an organisation or a
             term; `:finding` for a stretch of the line)
   tab     — one of the doors in the header
   parent  — the tab that stays lit while this page is open
   title / description — what the document carries for that route
   sitemap — listed for crawlers as a fixed address (parametrised pages are
             enumerated from the data by the sitemap and the prerenderer)
   shell   — the page column: 'read' for one card or the essay, 'route' for the
             line and the open file, 'wide' for the board, the archive, the landing */

import type { Route, ViewId } from './types';

export type Shell = 'read' | 'route' | 'wide';
export interface View {
  id: ViewId;
  path: string;
  label?: string;
  tab?: boolean;
  parent?: ViewId;
  sitemap: boolean;
  shell: Shell;
  title?: string;
  description?: string;
}

export const VIEWS: View[] = [
  { id: 'landing', path: '', label: 'The AI Timeline', sitemap: false, shell: 'wide' },
  { id: 'line', path: 'line', label: 'The line', tab: true, sitemap: true, shell: 'route',
    title: 'The line',
    description: 'How a machine that could not add became something governments argue about — the order it happened in, and where the trail goes cold.' },
  { id: 'finding', path: 'line/:finding', parent: 'line', sitemap: false, shell: 'route' },
  { id: 'case', path: 'case', parent: 'line', sitemap: true, shell: 'route',
    title: 'The case as it stands',
    description: 'Where the board stands, the road here, and what the case does not do — derived from the data.' },
  { id: 'horizon', path: 'horizon', parent: 'line', sitemap: true, shell: 'route',
    title: 'The horizon',
    description: 'The forward half of the board as three horizons: scenarios, not forecasts.' },
  { id: 'board', path: 'board', label: 'The board', tab: true, sitemap: true, shell: 'wide',
    title: 'The board',
    description: 'Photo cards, string connections, and a walkthrough that follows each causal chain clue by clue.' },
  { id: 'card', path: 'card/:id', parent: 'board', sitemap: false, shell: 'read' },
  { id: 'leads', path: 'leads', label: 'The leads', tab: true, sitemap: true, shell: 'route',
    title: 'The leads',
    description: 'The lines of inquiry: how far machines got at mathematics, at games, at gaming their own tests, and how cheap the answers became — one rung at a time, on the record.' },
  { id: 'lead', path: 'lead/:id', parent: 'leads', sitemap: false, shell: 'route' },
  { id: 'archive', path: 'archive', label: 'The archive', tab: true, sitemap: true, shell: 'wide',
    title: 'The archive',
    description: 'Every entry on the board in date order — dense, filterable, searchable.' },
  { id: 'plates', path: 'archive/plates', parent: 'archive', sitemap: true, shell: 'wide',
    title: 'The archive · plates',
    description: 'The archive as image-led plates, in date order.' },
  { id: 'mosaic', path: 'archive/mosaic', parent: 'archive', sitemap: true, shell: 'wide',
    title: 'The archive · mosaic',
    description: 'Every photograph on the board.' },
  { id: 'files', path: 'files', label: 'The files', tab: true, sitemap: true, shell: 'route',
    title: 'The files',
    description: 'Persons of interest, organisations and the glossary — every name on the board, and every card it appears on, without leaving the site.' },
  { id: 'person', path: 'person/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'org', path: 'org/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'glossary', path: 'glossary', parent: 'files', sitemap: true, shell: 'route',
    title: 'The glossary',
    description: 'The terms the board uses, defined in place — transformer, scaling law, reward hacking, test-time compute — each with the cards it turns up on.' },
  { id: 'term', path: 'term/:id', parent: 'files', sitemap: false, shell: 'read' },
  { id: 'about', path: 'about', label: 'About', sitemap: true, shell: 'read',
    title: 'About',
    description: 'How this board works, what a string means, what it does not claim, and the licence it is published under.' }
];

/** Retired view names keep working: every link ever shared still lands somewhere sensible. */
export const RETIRED: Record<string, ViewId> = { index: 'archive' };

export const viewById = Object.fromEntries(VIEWS.map((v) => [v.id, v])) as Record<ViewId, View>;
export const VIEW_IDS = new Set<string>(VIEWS.map((v) => v.id));
export const TABS = VIEWS.filter((v) => v.tab);
export const SITEMAP_VIEWS = VIEWS.filter((v) => v.sitemap).map((v) => v.id);

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
