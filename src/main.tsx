import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { loadBoard } from './components/boardChunk';
import { chunkOf } from './components/viewChunks';
import { registerFor } from './lib/corrections';
import { hasPapers, loadPapers, papersFor, papersVersion } from './lib/papers';
import { parse } from './lib/url';

declare global {
  interface Window { __hydration?: string[] }
}

/* A prerendered page hydrates: the HTML already on the page becomes live. The
   board is the exception — its canvas is nothing like the listing the server
   wrote for crawlers, so that page is marked and rendered afresh. */
const root = document.getElementById('root') as HTMLElement;
// A filter or a search in the address changes what the page shows, and an
// old-form ?view= address names a different page than the one served: the
// server rendered neither, so such a page is drawn afresh, not hydrated.
const q = new URLSearchParams(window.location.search);
const refined = q.has('cat') || q.has('q') || q.has('view');
const prerendered = root.hasChildNodes() && !refined && !document.documentElement.hasAttribute('data-client-render');
if (prerendered) {
  const hydrate = () => hydrateRoot(root, <App />, {
    // A mismatch between the prerendered HTML and the first client render is
    // recovered by React and recorded here, so a build can be checked for them.
    onRecoverableError: (err: unknown) => {
      (window.__hydration = window.__hydration || []).push(String(err && (err as Error).message || err));
      if (import.meta.env.DEV) console.warn('hydration', err);
    }
  });
  // The page's own chunk is fetched apart from this script (viewChunks.ts),
  // with the words it prints (lib/bodies/), and a page of the corrections
  // register its entries beside it (lib/corrections.ts); the printed page
  // stays up until they are here, so the first render is the one the server made.
  const here = parse(window.location.pathname, window.location.search, window.location.hash);
  const own = chunkOf(here.view);
  const entries = registerFor(here);
  if (own || entries) Promise.all([own ? own.load() : null, entries]).then(hydrate, hydrate);
  else hydrate();
} else {
  const draw = () => {
    root.innerHTML = '';
    createRoot(root).render(<App />);
  };
  // The board's address arrives with a listing for crawlers and without its
  // canvas. Wiping the listing first left a blank page and "loading the
  // canvas…" for as long as the chunk took, and the chunk was only asked for
  // once this script had run. The page now names the chunk (prerender.ts),
  // the listing stays up until it is here, and the page is drawn once. A page
  // drawn afresh that reads papers the document did not bring — a search, a
  // card opened on the board, an old address — waits for those the same way.
  const board = root.querySelector('[data-board-listing]') ? loadBoard() : null;
  const here = parse(window.location.pathname, window.location.search, window.location.hash);
  const papers = papersFor(here, null);
  const own = chunkOf(here.view);
  const chunk = own ? own.load() : null;
  const entries = registerFor(here);
  if (board || papers || chunk || entries) Promise.all([board, papers, chunk, entries]).then(draw, draw);
  else draw();
}

/* A turn to a page waits for its chunk and for any papers that are not here
   (viewChunks.ts, papers.ts), and a page of the register for its entries. A
   pointer resting on a link, a finger on it or the focus on it sends for them
   before the click, so the wait is seldom felt; once a thing is here there is
   nothing left to send for. */
const WARM = ['pointerover', 'focusin', 'touchstart'] as const;
const warm = (e: Event) => {
  const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (!(a instanceof HTMLAnchorElement) || a.origin !== window.location.origin) return;
  const to = parse(a.pathname, a.search, a.hash);
  if (!papersVersion() && !hasPapers(to)) loadPapers().catch(() => {});
  const own = chunkOf(to.view);
  if (own && !own.now()) own.load().catch(() => {});
  const entries = registerFor(to);
  if (entries) entries.catch(() => {});
};
WARM.forEach((type) => document.addEventListener(type, warm, { passive: true }));
