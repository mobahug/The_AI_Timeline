// Caches Wikipedia lead images + extracts into public/wiki-cache.json.
// Run before a build; the app falls back to live lookups for anything missing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { EventRaw, WikiCache, WikiPage } from '../src/lib/types';

const OUT = new URL('../public/wiki-cache.json', import.meta.url);
const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8')) as EventRaw[];
const fallbacks = JSON.parse(await readFile(new URL('../data/image-fallbacks.json', import.meta.url), 'utf8')) as Record<string, string>;
const { span: { now: NOW } } = JSON.parse(await readFile(new URL('../data/threads.json', import.meta.url), 'utf8')) as { span: { now: number } };

let cache: WikiCache = {};
try { cache = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

/** The article a citation URL actually points at. This is NOT always wikiTitle:
 *  wikiTitle picks the illustration, the URL is the claim's evidence, and after
 *  the source audit repointed several citations the two deliberately differ. The
 *  text shown to a reader must come from the page we cite, never from the page we
 *  borrowed a photograph from. */
export const citedTitle = (url: string | undefined): string | null => {
  try {
    const u = new URL(url as string);
    if (!/(^|\.)wikipedia\.org$/.test(u.hostname)) return null;
    if (!u.pathname.startsWith('/wiki/')) return null;
    return decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
  } catch {
    return null;
  }
};

const wanted = new Set<string>();
for (const e of events) {
  // A projection carries no citation and needs no page — but one that does cite
  // something still needs it fetched. "The date on the poster" (2045) cites
  // Technological singularity and was silently skipped by a bare year test.
  if (e.year > NOW && !e.url) continue;
  if (e.wikiTitle) wanted.add(e.wikiTitle);
  if (fallbacks[e.id]) wanted.add(fallbacks[e.id]);
  const cited = citedTitle(e.url);
  if (cited) wanted.add(cited);
  for (const s of (Array.isArray(e.sources) ? e.sources : [])) {
    const t = citedTitle(s.url);
    if (t) wanted.add(t);
  }
}

const summary = async (title: string): Promise<WikiPage> => {
  const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(url, { headers: { 'user-agent': 'the-ai-timeline/1.0 (https://github.com/mobahug/The_AI_Timeline)' } });
  if (!res.ok) throw new Error(title + ': ' + res.status);
  const p = await res.json() as { thumbnail?: { source?: string }; originalimage?: { source?: string }; extract?: string };
  return { img: p.thumbnail?.source || p.originalimage?.source || '', extract: p.extract || '' };
};

let fetched = 0, failed = 0;
for (const title of wanted) {
  // Presence alone must not short-circuit, or no cached row can ever gain a field
  // a later version adds. Refetch anything missing the current shape.
  if (cache[title] && cache[title].extract !== undefined) continue;
  try {
    cache[title] = await summary(title);
    fetched++;
  } catch (err) {
    failed++;
    console.warn('skip', (err as Error).message);
  }
  await new Promise((r) => setTimeout(r, 120));
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(cache, null, 0) + '\n');
const withImage = Object.values(cache).filter((v) => v.img).length;
console.log(`cache: ${Object.keys(cache).length} pages, ${withImage} with photographs (+${fetched} new, ${failed} failed)`);
