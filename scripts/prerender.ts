// Writes one HTML file per address into dist/, each with the page already
// rendered, its own title, description, canonical link, share image and
// structured data. Runs after `vite build` (the client) and `vite build --ssr`
// (the server entry), and removes the server bundle when it is done. The share
// images are drawn first (share-images.tsx), so each page can name its own.
//
// GitHub Pages serves dist/<path>/index.html for /<path>/, so every page the
// sitemap lists is a real document. dist/404.html is the bare shell: an address
// nothing was written for still boots the app, which lands on the front page.
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VIEWS } from '../src/lib/views';
import type { Carried } from '../src/lib/papers';
import type { Check, EventRaw, Finding, Lead, Org, PageMeta, Person, Prediction, Question, Route, Term, WikiCache, WikiPage } from '../src/lib/types';
import { VERDICTS } from '../src/lib/checks';
import { SHARE_H, SHARE_W, writeShareImages } from './share-images';
import type { ShareImage } from './share-images';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const ORIGIN = 'https://mobahug.github.io';
const BASE = process.env.BASE_PATH || '/The_AI_Timeline/';
const SITE = 'The AI Timeline';

const template = await readFile(join(dist, 'index.html'), 'utf8');
const cache = JSON.parse(await readFile(join(root, 'public', 'wiki-cache.json'), 'utf8')) as WikiCache;
const events = JSON.parse(await readFile(join(root, 'data', 'events.json'), 'utf8')) as EventRaw[];
const spine = JSON.parse(await readFile(join(root, 'data', 'spine.json'), 'utf8')) as { findings: Finding[] };
const leads = JSON.parse(await readFile(join(root, 'data', 'leads.json'), 'utf8')).leads as Lead[];
const questions = JSON.parse(await readFile(join(root, 'data', 'questions.json'), 'utf8')).questions as Question[];
const checks = JSON.parse(await readFile(join(root, 'data', 'checks.json'), 'utf8')).checks as Check[];
const predictions = JSON.parse(await readFile(join(root, 'data', 'predictions.json'), 'utf8')).predictions as Prediction[];
const people = JSON.parse(await readFile(join(root, 'data', 'people.json'), 'utf8')).people as Person[];
const orgs = JSON.parse(await readFile(join(root, 'data', 'orgs.json'), 'utf8')).orgs as Org[];
const terms = JSON.parse(await readFile(join(root, 'data', 'glossary.json'), 'utf8')).terms as Term[];
const fallbacks = JSON.parse(await readFile(join(root, 'data', 'image-fallbacks.json'), 'utf8')) as Record<string, string>;
const NOW = JSON.parse(await readFile(join(root, 'data', 'threads.json'), 'utf8')).span.now as number;

/** The built SSR bundle's entry: what src/entry-server.tsx exports. */
interface Rendered { html: string; route: Route; meta: PageMeta; media: WikiCache; papers: Carried | null }
const { render } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href) as { render: (pathname: string, cache: WikiCache) => Rendered };

const esc = (s: unknown): string => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const enc = (s: string | null): string => encodeURIComponent(s as string);

/** Every address the site has, as paths under the base. */
const routes: string[] = [
  '',
  ...VIEWS.filter((v) => v.sitemap && v.path).map((v) => v.path + '/'),
  ...spine.findings.map((f) => 'line/' + f.n + '/'),
  ...events.map((e) => 'card/' + enc(e.id) + '/'),
  ...leads.map((l) => 'lead/' + enc(l.id) + '/'),
  ...questions.map((q) => 'question/' + enc(q.id) + '/'),
  ...checks.map((c) => 'check/' + enc(c.id) + '/'),
  ...predictions.map((p) => 'prediction/' + enc(p.id) + '/'),
  ...people.map((p) => 'person/' + enc(p.id) + '/'),
  ...orgs.map((o) => 'org/' + enc(o.id) + '/'),
  ...terms.map((t) => 'term/' + enc(t.id) + '/')
];

/** Structured data for a route, as JSON-LD. Only what the page states. */
function jsonLd(route: Route, meta: PageMeta, url: string, image: string): Record<string, unknown>[] {
  const site = { '@type': 'WebSite', name: SITE, url: ORIGIN + BASE };
  const crumbs = (items: [string, string][]) => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + BASE + path }))
  });
  if (route.view === 'landing') {
    return [{ '@context': 'https://schema.org', ...site, description: meta.description,
      potentialAction: { '@type': 'SearchAction', target: ORIGIN + BASE + 'archive/?q={search_term_string}', 'query-input': 'required name=search_term_string' } }];
  }
  if (route.view === 'card') {
    const e = events.find((x) => x.id === route.id);
    if (!e) return [];
    const sources = Array.isArray(e.sources) ? e.sources.map((s) => s.url) : (e.url ? [e.url] : []);
    return [
      // The year is when the event happened, not when the page was written —
      // as datePublished it dated a page to 1900, and every scenario to the
      // future. It is the date of what the article is about.
      { '@context': 'https://schema.org', '@type': 'Article', headline: e.title, description: meta.description, url,
        image: [image], isPartOf: site,
        author: { '@type': 'Organization', name: SITE }, citation: sources.length ? sources : undefined,
        about: e.year > NOW ? 'Scenario, confidence ' + (e.confidence || 'Uncertain') : { '@type': 'Event', name: e.title, startDate: e.date || String(e.year) } },
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['The board', 'board/'], [e.year + ' ' + e.title, 'card/' + enc(e.id) + '/']]) }
    ];
  }
  if (route.view === 'lead') {
    const l = leads.find((x) => x.id === route.id);
    if (!l) return [];
    return [
      { '@context': 'https://schema.org', '@type': 'Article', headline: l.title, description: meta.description, url, isPartOf: site,
        image: [image], author: { '@type': 'Organization', name: SITE },
        hasPart: l.rungs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.label, url: ORIGIN + BASE + 'card/' + enc(r.event) + '/' })) },
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['The leads', 'leads/'], [l.title, 'lead/' + enc(l.id) + '/']]) }
    ];
  }
  // A plain question is a question with an answer, which is what FAQPage
  // describes: the list page carries every one, a question's page its own.
  const faq = (qs: Question[]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', url, isPartOf: site,
    mainEntity: qs.map((q) => ({ '@type': 'Question', name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: [q.short, ...q.answer].join(' '), url: ORIGIN + BASE + 'question/' + enc(q.id) + '/' } })) });
  if (route.view === 'questions') return [faq(questions)];
  if (route.view === 'question') {
    const q = questions.find((x) => x.id === route.id);
    if (!q) return [];
    return [faq([q]), { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['Plain questions', 'questions/'], [q.question, 'question/' + enc(q.id) + '/']]) }];
  }
  // A headline check reviews claims, which is what ClaimReview describes: one
  // per line checked, each the report's words verbatim with the verdict the
  // page gives it, the claim attributed to the report it appeared in.
  if (route.view === 'check') {
    const c = checks.find((x) => x.id === route.id);
    if (!c) return [];
    const appearance = { '@type': 'NewsArticle', headline: c.reported.title, url: c.reported.url, datePublished: c.reported.date,
      publisher: { '@type': 'Organization', name: c.reported.publisher }, author: c.reported.byline ? { '@type': 'Person', name: c.reported.byline } : undefined };
    return [
      ...c.claims.map((claim) => ({ '@context': 'https://schema.org', '@type': 'ClaimReview', url, datePublished: c.checked, isPartOf: site,
        author: { '@type': 'Organization', name: SITE, url: ORIGIN + BASE },
        claimReviewed: claim.said,
        itemReviewed: { '@type': 'Claim', datePublished: c.reported.date, author: { '@type': 'Organization', name: c.reported.publisher }, appearance },
        reviewRating: { '@type': 'Rating', ratingValue: VERDICTS[claim.verdict].rating, bestRating: 4, worstRating: 1, alternateName: VERDICTS[claim.verdict].label },
        citation: c.primary.map((p) => p.url) })),
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['Headline checks', 'checks/'], [c.title, 'check/' + enc(c.id) + '/']]) }
    ];
  }
  if (route.view === 'person') {
    const p = people.find((x) => x.id === route.id);
    return p ? [{ '@context': 'https://schema.org', '@type': 'Person', name: p.name, alternateName: p.aka && p.aka.length ? p.aka : undefined, description: p.bio, jobTitle: p.role, url }] : [];
  }
  if (route.view === 'org') {
    const o = orgs.find((x) => x.id === route.id);
    return o ? [{ '@context': 'https://schema.org', '@type': 'Organization', name: o.name, alternateName: o.aka && o.aka.length ? o.aka : undefined, description: o.bio, url }] : [];
  }
  if (route.view === 'term') {
    const t = terms.find((x) => x.id === route.id);
    return t ? [{ '@context': 'https://schema.org', '@type': 'DefinedTerm', name: t.term, description: t.definition, url,
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: SITE + ' glossary', url: ORIGIN + BASE + 'glossary/' } }] : [];
  }
  if (route.view === 'finding') {
    const f = spine.findings.find((x) => String(x.n) === String(route.finding));
    return f ? [{ '@context': 'https://schema.org', '@type': 'Article', headline: f.title, description: f.blurb, url, isPartOf: site },
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['The line', 'line/'], [f.title, 'line/' + f.n + '/']]) }] : [];
  }
  return [{ '@context': 'https://schema.org', '@type': 'WebPage', name: meta.title, description: meta.description, url, isPartOf: site }];
}

/* Every card and every lead has a share image of its own — the card as the
   board draws it, or the lead's question beside three of its rungs — drawn
   into dist/og/ before any page is written. A photograph that cannot be
   fetched leaves its card typographic rather than failing the build. */
const shares = await writeShareImages({ dist, cache, fallbacks });

/** The page's share image: the card's or the lead's own, else the site's. */
function imageFor(route: Route): ShareImage {
  const own = route.view === 'card' && route.id ? shares.cards.get(route.id)
    : route.view === 'lead' && route.id ? shares.leads.get(route.id)
    : undefined;
  return own || shares.site;
}

function page(route: Route, html: string, meta: PageMeta, media: WikiCache, papers: Carried | null): string {
  const url = ORIGIN + BASE + routeToPath(route);
  const share = imageFor(route);
  const image = ORIGIN + BASE + share.path;
  const ld = jsonLd(route, meta, url, image);
  const clientOnly = route.view === 'board';
  let out = template;
  out = out.replace(/<title>[^<]*<\/title>/, '<title>' + esc(meta.title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="' + esc(meta.description) + '" />');
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="' + esc(meta.title) + '" />');
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="' + esc(meta.description) + '" />');
  out = out.replace(/<meta property="og:image" content="[^"]*" \/>/, '<meta property="og:image" content="' + esc(image) + '" />');
  // The size lets a preview be laid out before the image arrives; the alt is
  // what a reader who cannot see it is told it shows.
  out = out.replace(/<meta property="og:image:width" content="[^"]*" \/>/, '<meta property="og:image:width" content="' + SHARE_W + '" />');
  out = out.replace(/<meta property="og:image:height" content="[^"]*" \/>/, '<meta property="og:image:height" content="' + SHARE_H + '" />');
  out = out.replace(/<meta property="og:image:alt" content="[^"]*" \/>/, '<meta property="og:image:alt" content="' + esc(share.alt) + '" />');
  out = out.replace(/<meta name="twitter:image:alt" content="[^"]*" \/>/, '<meta name="twitter:image:alt" content="' + esc(share.alt) + '" />');
  out = out.replace('<meta property="og:type" content="website" />',
    '<meta property="og:type" content="' + (route.view === 'card' || route.view === 'lead' || route.view === 'check' ? 'article' : 'website') + '" />\n'
    + '    <meta property="og:url" content="' + esc(url) + '" />\n'
    + '    <link rel="canonical" href="' + esc(url) + '" />');
  const inline = Object.keys(media).length ? '\n    <script id="wiki-inline" type="application/json">' + JSON.stringify(media).replace(/</g, '\\u003c') + '</script>' : '';
  const structured = ld.length ? '\n    <script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>' : '';
  // The papers this page printed — a dossier's reading, file, figures and
  // sources; the readings on the horizon — so the hydration reads them here
  // rather than from a request it would have to wait for (src/lib/papers.ts).
  const filed = papers ? '\n    <script id="papers-inline" type="application/json">' + JSON.stringify(papers).replace(/</g, '\\u003c') + '</script>' : '';
  out = out.replace('</head>', structured + inline + filed + '\n  </head>');
  // The front page's headline is set half in the italic, the largest type on
  // the site, and the italic was the one face not asked for in advance: the
  // headline drew in the fallback and rewrapped when the face arrived.
  if (route.view === 'landing') {
    out = out.replace('</head>', '  <link rel="preload" href="' + BASE + 'fonts/instrument-serif-400-italic-latin.woff2" as="font" type="font/woff2" crossorigin />\n  </head>');
  }
  if (clientOnly) {
    out = out.replace('<html lang="en">', '<html lang="en" data-client-render>');
    out = out.replace('</head>', '  <link rel="modulepreload" crossorigin href="' + BASE + 'assets/' + BOARD_CHUNK + '">\n  </head>');
  }
  out = out.replace('<div id="root"></div>', '<div id="root">' + html + '</div>');
  return out;
}

function routeToPath(route: Route): string {
  const v = VIEWS.find((x) => x.id === route.view);
  if (!v || !v.path) return '';
  return v.path.split('/').map((seg) => (seg[0] === ':' ? enc(route[seg.slice(1) === 'finding' ? 'finding' : 'id']) : seg)).join('/') + '/';
}

/* The board is the one page the server does not render as itself: a crawler
   gets the static listing, and the canvas is drawn fresh in the browser. That
   listing reads no photograph, so the board used to ship with no inline block
   at all — the wall painted hatched, and the 120KB cache raced the 44KB canvas
   chunk to fill it in. The board's own subset is therefore built here, from
   the same events, cache and fallbacks the rest of this file already holds:
   every title a card can illustrate, images only, no extracts.

   It is a projection of data that must exist. If it comes out empty the cache
   has gone missing and the whole wall would be hatched, so the build stops
   rather than shipping it. */
function boardMedia(): WikiCache {
  const out: WikiCache = {};
  for (const e of events) {
    for (const title of [e.wikiTitle, fallbacks[e.id]]) {
      if (title && cache[title] && cache[title].img) out[title] = { img: cache[title].img } as WikiPage;
    }
  }
  return out;
}
const BOARD_MEDIA = boardMedia();

/* The canvas is its own chunk, and the board's page named only the main script
   and React: the chunk was asked for after both had run and React had reached
   the board. Naming it lets the browser fetch all three at once. */
const BOARD_CHUNK = (await readdir(join(dist, 'assets'))).find((f) => /^BoardView-[\w-]+\.js$/.test(f));
if (!BOARD_CHUNK) throw new Error('prerender: no BoardView chunk in dist/assets');
if (!Object.keys(BOARD_MEDIA).length) throw new Error('prerender: no photographs for the board — is public/wiki-cache.json missing?');

let n = 0;
for (const path of routes) {
  const { html, route, meta, media: used, papers } = render(BASE + path, cache);
  // A page that touched many entries — the archive, the plates — only needs
  // their photographs; the extracts are for a card's own page.
  const media: WikiCache = route.view === 'board'
    ? BOARD_MEDIA
    : Object.keys(used).length > 12
      ? Object.fromEntries(Object.entries(used).map(([k, v]) => [k, { img: v.img || '' } as WikiPage]))
      : used;
  const out = page(route, html, meta, media, papers);
  const dir = join(dist, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), out);
  n++;
}

// The shell for addresses nothing was written for: the app boots and lands on
// the front page. GitHub Pages serves this file, with a 404 status, for them.
await writeFile(join(dist, '404.html'), template.replace('<html lang="en">', '<html lang="en" data-client-render>'));
await rm(ssrDir, { recursive: true, force: true });
console.log('prerender: ' + n + ' pages');
