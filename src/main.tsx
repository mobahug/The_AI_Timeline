import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

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
  root.innerHTML = '';
  createRoot(root).render(<App />);
}
