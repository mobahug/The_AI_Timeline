import { useCallback, useEffect, useState } from 'react';
import { RETIRED, VIEW_IDS } from './views.js';

/* Every view, card and clue is addressable, so a chain can be shared as a link.
   The route is the URL and nothing else: `hrefFor` writes it, `read` parses it,
   and `navigate` is the only thing that changes it. */

const CLEAN = { id: null, clue: null, finding: null };

const read = () => {
  const q = new URLSearchParams(window.location.search);
  const clue = q.get('clue');
  const raw = q.get('view') || 'landing';
  const view = RETIRED[raw] || raw;
  return {
    // A mistyped view name lands on the front page, not a blank one.
    view: VIEW_IDS.has(view) ? view : 'landing',
    id: q.get('id') || null,
    category: q.get('cat') || 'all',
    query: q.get('q') || '',
    finding: q.get('f') || null,
    clue: clue && clue.includes('>') ? { from: clue.split('>')[0], to: clue.split('>')[1] } : null
  };
};

/** The URL for a route. Pure, so a link can carry a real href. */
export function hrefFor(route) {
  const q = new URLSearchParams();
  if (route.view && route.view !== 'landing') q.set('view', route.view);
  if (route.category && route.category !== 'all') q.set('cat', route.category);
  if (route.query) q.set('q', route.query);
  if (route.view === 'finding' && route.finding) q.set('f', route.finding);
  if (route.clue) q.set('clue', route.clue.from + '>' + route.clue.to);
  else if (route.id) q.set('id', route.id);
  const base = typeof window !== 'undefined' ? window.location.pathname : '/';
  return base + (q.toString() ? '?' + q.toString() : '');
}

/** The route a patch would produce. Setting a view starts from a clean slate —
 *  a card, clue or finding belongs to the page it was opened on — while the
 *  category filter and the search carry across pages. */
export const resolve = (prev, patch) => (patch.view ? { ...prev, ...CLEAN, ...patch } : { ...prev, ...patch });

export function useRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    // A retired name in the address bar is rewritten to its current one, quietly.
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('view');
    if (raw && RETIRED[raw]) {
      q.set('view', RETIRED[raw]);
      window.history.replaceState(window.history.state, '', window.location.pathname + '?' + q.toString());
    }
    // The page, not the browser, restores the offset: the browser would restore
    // it before React has rendered the page it belongs to.
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    // Going back lands where the reader left, not at the top of the page.
    const onPop = () => setRoute({ ...read(), pop: (window.history.state && window.history.state.y) || 0 });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((patch, replace) => {
    setRoute((prev) => {
      const next = { ...resolve(prev, patch), pop: 0 };
      const url = hrefFor(next);
      if (replace) {
        window.history.replaceState(window.history.state, '', url);
      } else {
        // Remember where this page was left before moving on, so Back can return there.
        window.history.replaceState({ ...(window.history.state || {}), y: window.scrollY }, '', window.location.href);
        window.history.pushState({ y: 0 }, '', url);
      }
      return next;
    });
  }, []);

  return [route, navigate];
}
