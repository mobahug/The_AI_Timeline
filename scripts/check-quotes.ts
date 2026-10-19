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
 * (data/predictions.json). A PDF is not read here — its text is in a layer this
 * script does not open — and is reported as unread.
 *
 * A site that refuses the request can be read from an archive instead: run it
 * with --via=wayback and every page is fetched from the Wayback Machine's
 * latest capture.
 *
 *   npm run check:quotes          report only
 *   npm run check:quotes -- --ci  exit 1 if a quote is missing or a page unread
 */
import { readFile } from 'node:fs/promises';
import type { Check, Prediction } from '../src/lib/types';

const UA = 'Mozilla/5.0 (compatible; TheAITimeline-quotecheck/1.0; +https://github.com/mobahug/The_AI_Timeline)';
const ci = process.argv.includes('--ci');
const wayback = process.argv.includes('--via=wayback');

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

/** A page's readable text: no scripts or styles, tags gone (block tags leave a
 *  space, inline ones nothing, so a word split by <em> stays whole), entities
 *  decoded, whitespace folded to single spaces. */
function textOf(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|br|blockquote|figcaption|section|article|header|footer|tr|td|th|title)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/[\s ]+/g, ' ');
}

const fold = (s: string) => s.replace(/[\s ]+/g, ' ').trim();

async function read(url: string): Promise<string> {
  // Google Books draws a page's text by script, so the HTML holds none of it.
  if (!wayback && /^https:\/\/books\.google\./.test(url)) throw new Error('Google Books, whose text is drawn by script');
  const target = wayback ? 'https://web.archive.org/web/2/' + url : url;
  const res = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = textOf(await res.text());
  // A site that challenges scripts can answer 200 with a page of almost no
  // text; that page has not been read, and saying a quote is missing from it
  // would be wrong.
  if (text.length < 600) throw new Error('answered with ' + text.length + ' characters of text, a challenge rather than the page');
  return text;
}

const checks = JSON.parse(await readFile(new URL('../data/checks.json', import.meta.url), 'utf8')).checks as Check[];

let missing = 0;
let unread = 0;
for (const c of checks) {
  console.log('\n' + c.id);
  const pages = new Map<string, string | Error>();
  for (const url of [c.reported.url, ...c.primary.map((p) => p.url)]) {
    try { pages.set(url, await read(url)); } catch (err) { pages.set(url, err as Error); }
  }
  const look = (label: string, url: string, quote: string) => {
    const page = pages.get(url);
    if (page instanceof Error || page === undefined) { unread++; console.log('  ?  ' + label + ' — page unread: ' + (page ? page.message : url)); return; }
    const found = page.includes(fold(quote));
    if (!found) missing++;
    console.log('  ' + (found ? '✓' : '✗') + '  ' + label + ': ' + quote.slice(0, 72) + (quote.length > 72 ? '…' : ''));
  };
  for (const claim of c.claims) {
    look(c.reported.publisher, c.reported.url, claim.said);
    for (const q of claim.primary) {
      const src = c.primary.find((p) => p.id === q.source);
      if (!src) { missing++; console.log('  ✗  no primary source "' + q.source + '"'); continue; }
      look(src.publisher + ' (' + src.date + ')', src.url, q.quote);
    }
  }
}

const predictions = JSON.parse(await readFile(new URL('../data/predictions.json', import.meta.url), 'utf8')).predictions as Prediction[];
for (const p of predictions) {
  console.log('\n' + p.id);
  const pages = new Map<string, string | Error>();
  for (const s of p.sources) {
    if (pages.has(s.url)) continue;
    if (/\.pdf($|\?)/i.test(s.url)) { pages.set(s.url, new Error('a PDF, not read by this script')); continue; }
    try { pages.set(s.url, await read(s.url)); } catch (err) { pages.set(s.url, err as Error); }
  }
  const look = (sourceId: string, quote: string) => {
    const src = p.sources.find((s) => s.id === sourceId);
    if (!src) { missing++; console.log('  ✗  no source "' + sourceId + '"'); return; }
    const page = pages.get(src.url);
    const label = src.publisher + ' (' + src.date + ')';
    if (page instanceof Error || page === undefined) { unread++; console.log('  ?  ' + label + ' — page unread: ' + (page ? page.message : src.url)); return; }
    const found = page.includes(fold(quote));
    if (!found) missing++;
    console.log('  ' + (found ? '✓' : '✗') + '  ' + label + ': ' + quote.slice(0, 72) + (quote.length > 72 ? '…' : ''));
  };
  look(p.source, p.words);
  for (const q of p.evidence) look(q.source, q.quote);
}

console.log('\n' + (missing ? missing + ' quote' + (missing === 1 ? '' : 's') + ' not found' : 'every quote found') + (unread ? ', ' + unread + ' unread (try --via=wayback)' : '') + '.');
if (ci && (missing || unread)) process.exit(1);
