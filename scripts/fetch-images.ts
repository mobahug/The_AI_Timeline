// Caches Wikipedia lead images + extracts into public/wiki-cache.json, and checks
// that every photograph a card is shown with still resolves. Run before a build;
// the app falls back to live lookups for anything missing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { EventRaw, WikiCache, WikiPage } from '../src/lib/types';
// The article a citation URL points at, which is not always the one a card's
// photograph is borrowed from: the site's own reading of it, so the two agree.
import { citedTitle } from '../src/lib/wiki';

const OUT = new URL('../public/wiki-cache.json', import.meta.url);
const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8')) as EventRaw[];
const fallbacks = JSON.parse(await readFile(new URL('../data/image-fallbacks.json', import.meta.url), 'utf8')) as Record<string, string>;
const { span: { now: NOW } } = JSON.parse(await readFile(new URL('../data/threads.json', import.meta.url), 'utf8')) as { span: { now: number } };

let cache: WikiCache = {};
try { cache = JSON.parse(await readFile(OUT, 'utf8')); } catch {}


const wanted = new Set<string>();
/** The titles a card takes its photograph from: the only pictures a page shows. */
const pictured = new Set<string>();
for (const e of events) {
  // A projection carries no citation and needs no page — but one that does cite
  // something still needs it fetched. "The date on the poster" (2045) cites
  // Technological singularity and was silently skipped by a bare year test.
  if (e.year > NOW && !e.url) continue;
  for (const t of [e.wikiTitle, fallbacks[e.id]]) {
    if (t) { wanted.add(t); pictured.add(t); }
  }
  const cited = citedTitle(e.url);
  if (cited) wanted.add(cited);
  for (const s of (Array.isArray(e.sources) ? e.sources : [])) {
    const t = citedTitle(s.url);
    if (t) wanted.add(t);
  }
}

const UA = 'the-ai-timeline/1.0 (https://github.com/mobahug/The_AI_Timeline)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Wikimedia's robot policy (wikitech.wikimedia.org/wiki/Robot_policy) asks for
   fewer than five requests a second to the REST API, at most two at a time to
   the media servers, and the wait a 429's Retry-After names. So every request
   goes through here: one at a time, a quarter of a second apart, each with a
   deadline, so that a stalled connection cannot hold a deploy up. Told to wait
   longer than a build should, or a third time, the script asks nothing more this
   run, and whatever it has not asked about stays as it was. */
const GAP_MS = 250;
let nextAt = 0;
let halted = false;
async function ask(url: string, method: 'GET' | 'HEAD' = 'GET'): Promise<Response> {
  for (let tries = 1; ; tries++) {
    if (halted) throw new Error('not asked, Wikimedia wants a pause');
    const wait = nextAt - Date.now();
    if (wait > 0) await sleep(wait);
    nextAt = Date.now() + GAP_MS;
    const res = await fetch(url, { method, headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (res.status !== 429) return res;
    await res.body?.cancel();
    const pause = (Number(res.headers.get('retry-after')) || 5) * 1000;
    if (tries === 3 || pause > 30_000) {
      halted = true;
      console.warn('Wikimedia asked for a pause; no more requests this run');
      throw new Error('429');
    }
    nextAt = Date.now() + pause;
  }
}

const summary = async (title: string): Promise<WikiPage> => {
  const res = await ask('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')));
  if (!res.ok) { await res.body?.cancel(); throw new Error(String(res.status)); }
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
    console.warn('skip', title + ':', (err as Error).message);
  }
}

/* A cached photograph is a file on Wikimedia's servers, and files get deleted:
   Wikipedia removes a non-free logo a week after its article stops using it
   (criterion F5). Microsoft Copilot's old icon went that way on 27 September
   2026, and because the loop above only fills gaps, the cache went on naming it
   and the Sydney card showed an empty frame. So every photograph a card is shown
   with is asked after on every run. Only a 404 or a 410 means the file is gone,
   which is final; a timeout, a refusal or a server error says nothing about the
   file, and is no reason to drop it. */
type Verdict = 'ok' | 'gone' | 'unknown';
const verdicts = new Map<string, Verdict>();
let unanswered = 0;
async function check(img: string): Promise<Verdict> {
  let verdict = verdicts.get(img);
  if (verdict) return verdict;
  try {
    const res = await ask(img, 'HEAD');
    verdict = res.ok ? 'ok' : res.status === 404 || res.status === 410 ? 'gone' : 'unknown';
  } catch {
    verdict = 'unknown';
  }
  unanswered = verdict === 'unknown' ? unanswered + 1 : 0;
  verdicts.set(img, verdict);
  return verdict;
}

// A title an earlier run found without a working photograph is asked about again.
const stale = [...pictured].filter((t) => cache[t] && cache[t].gone);
for (const title of pictured) {
  const img = cache[title] && cache[title].img;
  if (!img) continue;
  // Five in a row with no answer is the network or a block, not five dead files.
  if (halted || unanswered >= 5) { console.warn('photograph check stopped early; the rest keep what they had'); break; }
  if ((await check(img)) === 'gone') stale.push(title);
}

/* The article of a gone photograph is fetched again. Its summary usually names
   the picture that replaced it, and the entry takes that, with the extract that
   came with it. If it still names the deleted file (the summary is cached, and
   can lag a deletion) or does not answer, the card shows no photograph rather
   than a broken one, and the dead address is kept as `gone` so that the next run
   asks again. */
let refreshed = 0;
for (const title of stale) {
  const old = cache[title];
  const dead = old.img || old.gone || '';
  try {
    const fresh = await summary(title);
    // A different picture that resolves, or none at all: either way the article has moved on.
    if (!fresh.img || (fresh.img !== dead && (await check(fresh.img)) !== 'gone')) {
      cache[title] = fresh;
      refreshed++;
      console.log('refreshed', title + ':', fresh.img || 'Wikipedia shows no photograph now');
      continue;
    }
  } catch (err) {
    failed++;
    console.warn('skip', title + ':', (err as Error).message);
  }
  cache[title] = { img: '', extract: old.extract, gone: dead };
  console.warn('no photograph for now', title + ':', dead, 'is gone');
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(cache, null, 0) + '\n');
const withImage = Object.values(cache).filter((v) => v.img).length;
console.log(`cache: ${Object.keys(cache).length} pages, ${withImage} with photographs (+${fetched} new, ${refreshed} refreshed, ${failed} failed; ${verdicts.size} photographs checked)`);
