// Writes public/sitemap.xml from the data: every page, every card, every
// finding, every lead, every question, every headline check, every prediction, every name. Runs before build so the sitemap can never
// drift from what the site contains. Addresses are paths, one document each.
//
// A card, a lead, a plain question or a headline check carries the day its
// record last changed, from the same history the feed and the dossiers are
// dated by (scripts/feed.ts), so a crawler can tell what moved. The front page
// and the latest page carry the newest of those days. Pages the history does
// not date carry none rather than a guess.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pages } from '../src/lib/pages';
import type { PageKind } from '../src/lib/pages';
import type { Check, EventRaw, Finding, Lead, Org, Person, Prediction, Question, Term } from '../src/lib/types';
import { datedHistory } from './feed';
import { ORIGIN } from './site';
import type { Dated } from './feed';

const read = async (name: string) => JSON.parse(await readFile(new URL('../data/' + name, import.meta.url), 'utf8'));
const events = await read('events.json') as EventRaw[];
const spine = await read('spine.json') as { findings: Finding[] };
const leads = (await read('leads.json')).leads as Lead[];
const questions = (await read('questions.json')).questions as Question[];
const checks = (await read('checks.json')).checks as Check[];
const predictions = (await read('predictions.json')).predictions as Prediction[];
const promises = (await read('promises.json')).promises as { id: string }[];
const people = (await read('people.json')).people as Person[];
const orgs = (await read('orgs.json')).orgs as Org[];
const terms = (await read('glossary.json')).terms as Term[];
const corrections = (await read('corrections.json')).corrections as { id: string }[];

// A shallow clone cannot be dated; the sitemap is still written, undated, and
// the feed's own step refuses the clone with the reason.
let dated = new Map<string, Dated>();
try { dated = datedHistory(fileURLToPath(new URL('..', import.meta.url))); } catch (err) {
  console.warn('sitemap: ' + (err instanceof Error ? err.message : String(err)) + ' No page carries a lastmod.');
}
const day = (key: string): string | undefined => { const d = dated.get(key); return d ? d.changed.date.slice(0, 10) : undefined; };
const newest = [...dated.values()].map((d) => d.changed.date.slice(0, 10)).sort().pop();

const PRIORITY: Record<PageKind, string> = {
  view: '0.8', lead: '0.8', question: '0.8', check: '0.8', prediction: '0.8', promise: '0.8', finding: '0.7', card: '0.5', person: '0.4', org: '0.4', term: '0.3', register: '0.3'
};
/** The kinds of record the history dates (scripts/feed.ts). */
const DATED_KINDS = new Set<PageKind>(['card', 'lead', 'question', 'check', 'prediction', 'promise']);
const featured = new Set(events.filter((e) => e.featured).map((e) => e.id));
const urls: { loc: string; priority: string; lastmod?: string }[] =
  pages({ findings: spine.findings, events, leads, questions, checks, predictions, promises, people, orgs, terms, corrections }).map((p) => ({
    loc: ORIGIN + p.path,
    priority: p.path === '' ? '1.0' : p.kind === 'card' && featured.has(p.id) ? '0.6' : PRIORITY[p.kind],
    lastmod: p.path === '' || (p.kind === 'view' && p.id === 'latest') ? newest : DATED_KINDS.has(p.kind) ? day(p.kind + '/' + p.id) : undefined
  }));

const esc = (s: string): string => s.replace(/&/g, '&amp;');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '<priority>' + u.priority + '</priority></url>').join('\n')
  + '\n</urlset>\n';

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log('sitemap: ' + urls.length + ' urls, ' + urls.filter((u) => u.lastmod).length + ' dated');
