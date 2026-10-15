#!/usr/bin/env node
/**
 * A headline check sets a report's words beside its primary account's, both
 * quoted, and a quote is only worth printing if it is really there. Fetches the
 * reported article and every primary source of each check in data/checks.json,
 * reduces each page to its text, and reports every quote that cannot be found
 * in it character for character — curly quotes, dashes and all; only runs of
 * whitespace are folded. Nothing is paraphrased into a match.
 *
 * A site that refuses the request can be read from an archive instead: run it
 * with --via=wayback and every page is fetched from the Wayback Machine's
 * latest capture.
 *
 *   npm run check:quotes          report only
 *   npm run check:quotes -- --ci  exit 1 if a quote is missing or a page unread
 */
import { readFile } from 'node:fs/promises';
import type { Check } from '../src/lib/types';

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
  const target = wayback ? 'https://web.archive.org/web/2/' + url : url;
  const res = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return textOf(await res.text());
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

console.log('\n' + (missing ? missing + ' quote' + (missing === 1 ? '' : 's') + ' not found' : 'every quote found') + (unread ? ', ' + unread + ' unread (try --via=wayback)' : '') + '.');
if (ci && (missing || unread)) process.exit(1);
