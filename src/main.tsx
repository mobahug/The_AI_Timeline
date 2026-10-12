import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { loadBoard } from './components/boardChunk';
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
  hydrateRoot(root, <App />, {
    // A mismatch between the prerendered HTML and the first client render is
    // recovered by React and recorded here, so a build can be checked for them.
    onRecoverableError: (err: unknown) => {
      (window.__hydration = window.__hydration || []).push(String(err && (err as Error).message || err));
      if (import.meta.env.DEV) console.warn('hydration', err);
    }
  });
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
  const papers = papersFor(parse(window.location.pathname, window.location.search, window.location.hash), null);
  if (board || papers) Promise.all([board, papers]).then(draw, draw);
  else draw();
}

/* A turn to a page whose papers are not here waits for them (papers.ts). A
   pointer resting on a link to such a page, a finger on it or the focus on it
   sends for them before the click, so the wait is seldom felt; once they are
   here there is nothing left to send for. */
const WARM = ['pointerover', 'focusin', 'touchstart'] as const;
const warm = (e: Event) => {
  if (papersVersion()) { WARM.forEach((type) => document.removeEventListener(type, warm)); return; }
  const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (!(a instanceof HTMLAnchorElement) || a.origin !== window.location.origin) return;
  if (!hasPapers(parse(a.pathname, a.search, a.hash))) loadPapers().catch(() => {});
};
WARM.forEach((type) => document.addEventListener(type, warm, { passive: true }));
