// Caches Wikipedia lead images + extracts into public/wiki-cache.json.
// Run before a build; the app falls back to live lookups for anything missing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const OUT = new URL('../public/wiki-cache.json', import.meta.url);
const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8'));
const fallbacks = JSON.parse(await readFile(new URL('../data/image-fallbacks.json', import.meta.url), 'utf8'));

let cache = {};
try { cache = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

const wanted = new Set();
for (const e of events) {
  if (e.year > 2026) continue;
  if (e.wikiTitle) wanted.add(e.wikiTitle);
  if (fallbacks[e.id]) wanted.add(fallbacks[e.id]);
}

const summary = async (title) => {
  const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(url, { headers: { 'user-agent': 'the-ai-timeline/1.0 (https://github.com/mobahug/The_AI_Timeline)' } });
  if (!res.ok) throw new Error(title + ': ' + res.status);
  const p = await res.json();
  return { img: p.thumbnail?.source || p.originalimage?.source || '', extract: p.extract || '' };
};

let fetched = 0, failed = 0;
for (const title of wanted) {
  if (cache[title]) continue;
  try {
    cache[title] = await summary(title);
    fetched++;
  } catch (err) {
    failed++;
    console.warn('skip', err.message);
  }
  await new Promise((r) => setTimeout(r, 120));
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(cache, null, 0) + '\n');
const withImage = Object.values(cache).filter((v) => v.img).length;
console.log(`cache: ${Object.keys(cache).length} pages, ${withImage} with photographs (+${fetched} new, ${failed} failed)`);
