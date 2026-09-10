import { useCallback, useEffect, useState } from 'react';

const read = () => {
  const q = new URLSearchParams(window.location.search);
  const clue = q.get('clue');
  return {
    view: q.get('view') || 'landing',
    id: q.get('id') || null,
    category: q.get('cat') || 'all',
    query: q.get('q') || '',
    clue: clue && clue.includes('>') ? { from: clue.split('>')[0], to: clue.split('>')[1] } : null
  };
};

/** Every view, card and clue is addressable, so a chain can be shared as a link. */
export function useRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onPop = () => setRoute(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((patch, replace) => {
    setRoute((prev) => {
      const next = { ...prev, ...patch };
      const q = new URLSearchParams();
      if (next.view && next.view !== 'landing') q.set('view', next.view);
      if (next.category && next.category !== 'all') q.set('cat', next.category);
      if (next.query) q.set('q', next.query);
      if (next.clue) q.set('clue', next.clue.from + '>' + next.clue.to);
      else if (next.id) q.set('id', next.id);
      const url = window.location.pathname + (q.toString() ? '?' + q.toString() : '');
      if (replace) window.history.replaceState({}, '', url);
      else window.history.pushState({}, '', url);
      return next;
    });
  }, []);

  return [route, navigate];
}
