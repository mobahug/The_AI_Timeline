import PAGES from 'virtual:register-pages';
import type { Correction, Route } from './types';
import type { RegisterPage } from './register';

/* Corrections: every change of fact the board has made to its own record, as
   its history has it — what a card said, what it says now, why, and the source
   that settled it, dated by the commit that made the change. Wording that
   changed without a fact changing is not listed, nor a quote matched to its
   page's own curly marks.

   The register prints them a page at a time (register.ts), and each page's
   entries come in a chunk of their own. The main script holds a loader for
   each page and nothing of what they hold. The server and the tests hold every
   page before they render (components/viewChunks.ts); the browser fetches a
   page's entries before it draws or hydrates that page, as it fetches the
   page's chunk. A dossier reads only its own card's count, and the page that
   prints its newest entry, filed with the card's papers (lib/corrected.ts). */

/** How many pages the register fills. */
export const REGISTER_PAGES = PAGES.length;

const got: (RegisterPage | null)[] = PAGES.map(() => null);
const pending: (Promise<RegisterPage> | null)[] = PAGES.map(() => null);

/** The page of the register a route shows: 1 at /corrections/, n at
 *  /corrections/n/; null on any other page, or past the register's last. */
export function registerPageOf(route: Pick<Route, 'view' | 'id'>): number | null {
  if (route.view === 'corrections') return 1;
  if (route.view !== 'register') return null;
  const n = Number(route.id);
  return Number.isInteger(n) && n >= 2 && n <= REGISTER_PAGES ? n : null;
}

/** Fetch a page's entries. Every caller shares the one request, and a failure
 *  is forgotten, so the next ask tries again. */
export function loadRegisterPage(n: number): Promise<RegisterPage> {
  const i = n - 1;
  const have = got[i];
  if (have) return Promise.resolve(have);
  if (!PAGES[i]) return Promise.reject(new Error('The register has no page ' + n + '.'));
  return pending[i] || (pending[i] = PAGES[i]().then(
    (m) => (got[i] = m.default),
    (err: unknown) => { pending[i] = null; throw err; }
  ));
}

/** A page's entries, once they are here. */
export const registerPageNow = (n: number): RegisterPage | null => got[n - 1] || null;

/** What a page of the register waits for beyond its chunk: its entries.
 *  Null once they are here, and on every other page. */
export function registerFor(route: Pick<Route, 'view' | 'id'>): Promise<RegisterPage> | null {
  const page = registerPageOf(route);
  return page && !registerPageNow(page) ? loadRegisterPage(page) : null;
}

/** Every page, fetched: what the server and the tests do before they render. */
export const loadRegister = (): Promise<RegisterPage[]> => Promise.all(PAGES.map((_, i) => loadRegisterPage(i + 1)));

/** What each kind of correction is called on the page. */
export const CORRECTION_KIND: Record<Correction['kind'], string> = {
  fact: 'A fact', date: 'A date', figure: 'A figure', attribution: 'Who said it', framing: 'The framing', citation: 'The citation'
};
