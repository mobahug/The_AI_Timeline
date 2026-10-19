import { useCallback, useEffect, useRef, useState } from 'react';
import { RETIRED, VIEW_IDS, matchSegments, segmentsFor } from './views';
import type { Mode, Route, RoutePatch, ViewId } from './types';

/* Every view, card, clue and lead is addressable, so a chain can be shared as a
   link. The route is the URL and nothing else: `hrefFor` writes it, `parse`
   reads it, and `navigate` is the only thing that changes it.

   Pages are paths under the site's base — /card/alexnet/, /line/3/, /lead/
   machines-doing-maths/ — so a crawler, a link preview and a reader all land on
   one document per page. What refines a page rides in the query: the board's
   open card (?id=), clue (?clue=a>b) and lead (?lead=, &rung=), and the filter
   (?cat=, ?q=) that carries across pages. A section anchor rides in the hash.

   The old ?view=… addresses still resolve, and are rewritten in place. */

/** The base the site is served under: `/` in dev, `/The_AI_Timeline/` in production. */
export const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

/** The host the board is published on. A citation names the published page,
 *  whichever server is showing it, so the server and the browser write the same
 *  address (scripts/site.ts says the same for the build). */
export const PUBLISHED = 'https://mobahug.github.io';

const CLEAN: RoutePatch = { id: null, clue: null, finding: null, lead: null, rung: null, hash: null };

const DEFAULT: Route = { view: 'landing', id: null, finding: null, category: 'all', query: '', clue: null, lead: null, rung: null, hash: null };

const trim = (s: string) => s.replace(/^\/+|\/+$/g, '');

/** A route from a pathname, a search string and a hash. Pure. `legacy` marks an
 *  address written in the old ?view= form, which the app rewrites to its path. */
export function parse(pathname: string, search = '', hash = ''): Route {
  const q = new URLSearchParams(search);
  const route: Route = { ...DEFAULT };
  route.category = q.get('cat') || 'all';
  route.query = q.get('q') || '';
  route.hash = hash ? hash.replace(/^#/, '') : null;
  const mode = q.get('mode');
  if (mode === 'full' || mode === 'brief') route.mode = mode as Mode;

  const rel = trim(pathname || '').startsWith(trim(BASE)) ? trim(pathname).slice(trim(BASE).length) : trim(pathname || '');
  const segments = trim(rel) ? trim(rel).split('/') : [];
  const hit = matchSegments(segments);

  if (hit && hit.view !== 'landing') {
    route.view = hit.view;
    Object.assign(route, hit.fields);
  } else if (q.get('view')) {
    // The old address form: ?view=card&id=…, ?view=finding&f=…
    const raw = q.get('view') as string;
    const view = RETIRED[raw] || raw;
    route.view = VIEW_IDS.has(view) ? (view as ViewId) : 'landing';
    route.legacy = true;
    if (route.view === 'finding') route.finding = q.get('f') || null;
    if (route.view !== 'board' && q.get('id')) route.id = q.get('id');
  } else if (!hit && segments.length) {
    // An address that names no page lands on the front page, not a blank one —
    // and keeps what was typed, so the page can say what missed.
    route.view = 'landing';
    route.missing = segments.join('/');
  }

  if (route.view === 'board') {
    const clue = q.get('clue');
    route.id = q.get('id') || null;
    route.clue = clue && clue.includes('>') ? { from: clue.split('>')[0], to: clue.split('>')[1] } : null;
    route.lead = q.get('lead') || null;
    const rung = Number(q.get('rung'));
    route.rung = Number.isInteger(rung) && rung > 0 ? rung : null;
  }
  return route;
}

const read = (): Route => (typeof window === 'undefined'
  ? { ...DEFAULT }
  : parse(window.location.pathname, window.location.search, window.location.hash));

/** The URL for a route. Pure, so a link can carry a real href. */
export function hrefFor(route: Pick<Route, 'view'> & Partial<Route>): string {
  const segments = segmentsFor(route) || [];
  const path = BASE + segments.join('/') + (segments.length ? '/' : '');
  const q = new URLSearchParams();
  if (route.view === 'board') {
    if (route.lead) {
      q.set('lead', route.lead);
      if (route.rung !== null && route.rung !== undefined) q.set('rung', String(route.rung));
    } else if (route.clue) q.set('clue', route.clue.from + '>' + route.clue.to);
    else if (route.id) q.set('id', route.id);
  }
  if (route.category && route.category !== 'all') q.set('cat', route.category);
  if (route.query) q.set('q', route.query);
  if (route.mode) q.set('mode', route.mode);
  const qs = q.toString();
  return path + (qs ? '?' + qs : '') + (route.hash ? '#' + route.hash : '');
}

/** The route a patch would produce. Setting a view starts from a clean slate —
 *  a card, clue, lead or finding belongs to the page it was opened on — while
 *  the category filter and the search carry across pages. */
export const resolve = (prev: Route, patch: RoutePatch): Route => (patch.view ? { ...prev, ...CLEAN, ...patch } : { ...prev, ...patch });

export type Navigate = (patch: RoutePatch, replace?: boolean) => void;

/** What a turn from one route to the next must wait for, if anything — for
 *  this site, the papers of the page it turns to (`papersFor` in papers.ts). */
export type Wait = (next: Route, prev: Route) => Promise<unknown> | null;

/** The route, the way to change it, and whether a turn is waiting to happen. */
export function useRoute(initial?: Route, wait?: Wait): [Route, Navigate, boolean] {
  const [route, setRoute] = useState<Route>(() => initial || read());
  // The route a patch is laid over: the last one asked for, which is the one on
  // screen except in the moment before React draws it. `navigate` used to read
  // it inside a state updater and write the history from there; but React may
  // run an updater more than once — StrictMode always does — and each run would
  // push its own entry, leaving Back to be pressed twice. The route is kept here
  // instead, every change goes through `show`, and the history is written once
  // per call.
  const latest = useRef(route);
  const show = useCallback((next: Route) => {
    latest.current = next;
    setRoute(next);
  }, []);
  // Every navigation takes a ticket. A turn that had to wait goes ahead only if
  // nothing was asked for in the meantime — a later click, or Back.
  const ticket = useRef(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    // An old-form or unknown address is rewritten to its path, quietly.
    const current = read();
    if (current.legacy || current.mode) {
      const { legacy, mode, ...rest } = current;
      window.history.replaceState(window.history.state, '', hrefFor(rest));
      show(rest);
    }
    // The page, not the browser, restores the offset: the browser would restore
    // it before React has rendered the page it belongs to.
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    // Going back lands where the reader left, not at the top of the page.
    const onPop = () => { ticket.current += 1; setHeld(false); show({ ...read(), pop: (window.history.state && window.history.state.y) || 0 }); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  const go = useCallback<Navigate>((patch, replace) => {
    const next: Route = { ...resolve(latest.current, patch), pop: 0 };
    delete next.legacy;
    delete next.mode;
    delete next.missing;
    const url = hrefFor(next);
    if (replace) {
      window.history.replaceState(window.history.state, '', url);
    } else {
      // Remember where this page was left before moving on, so Back can return there.
      window.history.replaceState({ ...(window.history.state || {}), y: window.scrollY }, '', window.location.href);
      window.history.pushState({ y: 0 }, '', url);
    }
    show(next);
  }, [show]);

  const navigate = useCallback<Navigate>((patch, replace) => {
    const turn = ++ticket.current;
    const until = wait ? wait(resolve(latest.current, patch), latest.current) : null;
    setHeld(!!until);
    if (!until) { go(patch, replace); return; }
    // Whether or not what it waited for came, the turn goes ahead.
    const ahead = () => { if (turn === ticket.current) { setHeld(false); go(patch, replace); } };
    until.then(ahead, ahead);
  }, [go, wait]);

  return [route, navigate, held];
}
