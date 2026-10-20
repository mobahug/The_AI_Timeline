/* Every address the site has, in one list: the fixed pages of the view registry
   and one page for each record. The prerenderer writes a file for each, the
   sitemap lists each, and the tests walk the same list — so a new kind of page
   is added here once, and none of the three can leave it out. */

import { VIEWS } from './views';
import { pageCount } from './register';

export type PageKind = 'view' | 'finding' | 'card' | 'lead' | 'question' | 'check' | 'prediction' | 'promise' | 'person' | 'org' | 'term' | 'register';

/** One address, as a path under the site's base (`''` is the front page), with
 *  the record it shows. */
export interface Page { path: string; kind: PageKind; id: string }

/** What the list is made from. The scripts read the files themselves and the
 *  site reads them through its modules, so each hands over what it holds. */
export interface PageSources {
  findings: { n: number }[];
  events: { id: string }[];
  leads: { id: string }[];
  questions: { id: string }[];
  checks: { id: string }[];
  predictions: { id: string }[];
  promises: { id: string }[];
  people: { id: string }[];
  orgs: { id: string }[];
  terms: { id: string }[];
  /** The corrections register, whose later pages are pages of their own (register.ts). */
  corrections: { id: string }[];
}

export function pages(d: PageSources): Page[] {
  const at = (kind: PageKind, list: { id: string }[]): Page[] =>
    list.map((x) => ({ path: kind + '/' + encodeURIComponent(x.id) + '/', kind, id: x.id }));
  return [
    { path: '', kind: 'view', id: 'landing' },
    ...VIEWS.filter((v) => v.sitemap && v.path).map((v): Page => ({ path: v.path + '/', kind: 'view', id: v.id })),
    ...d.findings.map((f): Page => ({ path: 'line/' + f.n + '/', kind: 'finding', id: String(f.n) })),
    ...at('card', d.events),
    ...at('lead', d.leads),
    ...at('question', d.questions),
    ...at('check', d.checks),
    ...at('prediction', d.predictions),
    ...at('promise', d.promises),
    ...at('person', d.people),
    ...at('org', d.orgs),
    ...at('term', d.terms),
    ...Array.from({ length: pageCount(d.corrections.length) - 1 }, (_, i): Page => ({ path: 'corrections/' + (i + 2) + '/', kind: 'register', id: String(i + 2) }))
  ];
}
