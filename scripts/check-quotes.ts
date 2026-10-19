#!/usr/bin/env node
/**
 * A headline check sets a report's words beside its primary account's, both
 * quoted, and a quote is only worth printing if it is really there. Fetches the
 * reported article and every primary source of each check in data/checks.json,
 * reduces each page to its text, and reports every quote that cannot be found
 * in it character for character — curly quotes, dashes and all; only runs of
 * whitespace are folded. Nothing is paraphrased into a match.
 *
 * Said in advance is checked the same way: each prediction's words against the
 * page they were said on, and every quote on what happened against its source
 * (data/predictions.json). So are Promises made: each promise's words against
 * the promiser's page, and every quote on what was done (data/promises.json).
 *
 * With --cards it checks the cards instead: every source in data/events.json
 * that carries a quote, against the page it cites, card by card. Ids named
 * beside the flags check only those records, as after a card is edited.
 *
 * Pages are read by scripts/page-text.ts, which takes the routes the board
 * relies on — Wayback captures, openai.com's flight payload, the press corner's
 * API — and says where a page parts from a quote it does not hold. A PDF is
 * read with macOS PDFKit; where that is not to be had, it is reported as a PDF
 * not read and does not fail --ci. package.json runs this with a larger header
 * limit than Node's: Yahoo answers with some 30 KB of headers.
 *
 * A site that refuses the request can be read from an archive instead: run it
 * with --via=wayback and every page is fetched from the Wayback Machine's
 * latest capture.
 *
 *   npm run check:quotes                     the headline checks, Said in advance and Promises made
 *   npm run check:quotes -- --cards          every card's quoted sources
 *   npm run check:quotes -- --cards <id> …   only the cards named
 *   npm run check:quotes -- --ci             exit 1 if a quote is missing or a page unread
 */
import { readFile } from 'node:fs/promises';
import type { Check, EventRaw, Pledge, Prediction } from '../src/lib/types';
import { Unread, parting, read } from './page-text';
import type { Page } from './page-text';

const args = process.argv.slice(2);
const ci = args.includes('--ci');
const cards = args.includes('--cards');
const opts = { wayback: args.includes('--via=wayback') };
const only = args.filter((a) => !a.startsWith('--'));

const load = async <T>(file: string): Promise<T> => JSON.parse(await readFile(new URL('../data/' + file, import.meta.url), 'utf8')) as T;

/** Every page is read once, however many quotes cite it. Asking for them all
 *  at the start lets each host's lane run while another's waits. */
const pages = new Map<string, Promise<Page | Unread>>();
const page = (url: string) => {
  if (!pages.has(url)) pages.set(url, read(url, opts).catch((err: Error) => err instanceof Unread ? err : new Unread(err.message)));
  return pages.get(url) as Promise<Page | Unread>;
};

let found = 0;
let missing = 0;
let unread = 0;
let pdfs = 0;
const short = (quote: string) => quote.slice(0, 72) + (quote.length > 72 ? '…' : '');
const look = async (label: string, url: string, quote: string, date = '') => {
  let got = await page(url);
  // A capture made before the source's date cannot be the page it cites.
  if (!(got instanceof Unread) && got.captured && got.captured < date) {
    got = new Unread('its latest capture, of ' + got.captured + ', is older than the source');
  }
  if (got instanceof Unread) {
    if (got.pdf) pdfs++; else unread++;
    console.log('  ?  ' + label + ' — ' + (got.pdf ? 'PDF' : 'page') + ' unread: ' + got.message);
    return;
  }
  const parts = parting(got.text, quote);
  if (parts) missing++; else found++;
  console.log('  ' + (parts ? '✗' : '✓') + '  ' + label + (got.via ? ', ' + got.via : '') + ': ' + short(quote));
  if (parts) console.log('       ' + parts);
};
const lost = (what: string) => { missing++; console.log('  ✗  ' + what); };

/** The records named after the flags, or all of them; a name that is no
 *  record's is said, and counted as missing. */
const named = <T extends { id: string }>(all: T[], kind: string): T[] => {
  if (!only.length) return all;
  for (const id of only) if (!all.some((r) => r.id === id)) lost('no ' + kind + ' "' + id + '"');
  return all.filter((r) => only.includes(r.id));
};

if (cards) {
  const events = named(await load<EventRaw[]>('events.json'), 'card');
  const quoted = events.map((e) => ({ id: e.id, sources: (e.sources ?? []).filter((s) => s.quote) })).filter((e) => e.sources.length);
  quoted.forEach((e) => e.sources.forEach((s) => { if (s.url) page(s.url); }));
  console.log('Reading ' + pages.size + ' pages for the quotes on ' + quoted.length + ' cards' + (opts.wayback ? ' from the Wayback Machine, some fifteen requests a minute' : '') + '…');
  for (const e of quoted) {
    console.log('\n' + e.id);
    for (const s of e.sources) {
      const label = (s.publisher || s.kind || 'a source') + (s.date ? ' (' + s.date + ')' : '');
      if (s.url) await look(label, s.url, s.quote as string, s.date);
      else lost(label + ' — a quote with no page to find it on');
    }
  }
} else {
  const checksAll = (await load<{ checks: Check[] }>('checks.json')).checks;
  const predictionsAll = (await load<{ predictions: Prediction[] }>('predictions.json')).predictions;
  const promisesAll = (await load<{ promises: Pledge[] }>('promises.json')).promises;
  const kept = new Set<string>(named([...checksAll, ...predictionsAll, ...promisesAll], 'check, prediction or promise').map((r) => r.id));
  const checks = checksAll.filter((c) => kept.has(c.id));
  // A promise is quoted as a prediction is: its words, then what happened.
  const predictions: { id: string; source: string; words: string; evidence: { source: string; quote: string }[]; sources: { id: string; publisher: string; url: string; date: string }[] }[] =
    [...predictionsAll, ...promisesAll].filter((p) => kept.has(p.id));
  checks.forEach((c) => [c.reported, ...c.primary].forEach((s) => page(s.url)));
  predictions.forEach((p) => p.sources.forEach((s) => page(s.url)));

  for (const c of checks) {
    console.log('\n' + c.id);
    for (const claim of c.claims) {
      await look(c.reported.publisher, c.reported.url, claim.said, c.reported.date);
      for (const q of claim.primary) {
        const src = c.primary.find((p) => p.id === q.source);
        if (src) await look(src.publisher + ' (' + src.date + ')', src.url, q.quote, src.date);
        else lost('no primary source "' + q.source + '"');
      }
    }
  }

  for (const p of predictions) {
    console.log('\n' + p.id);
    for (const q of [{ source: p.source, quote: p.words }, ...p.evidence]) {
      const src = p.sources.find((s) => s.id === q.source);
      if (src) await look(src.publisher + ' (' + src.date + ')', src.url, q.quote, src.date);
      else lost('no source "' + q.source + '"');
    }
  }
}

const n = (k: number, one: string, many = one + 's') => k + ' ' + (k === 1 ? one : many);
console.log('\n' + n(found + missing + unread + pdfs, 'quote') + ': ' + found + ' found, ' + missing + ' not found'
  + (unread ? ', ' + unread + ' on pages unread' + (opts.wayback ? '' : ' (try --via=wayback)') : '')
  + (pdfs ? ', ' + n(pdfs, 'in a PDF', 'in PDFs') + ' not read' : '') + '.');
if (ci && (missing || unread)) process.exit(1);
