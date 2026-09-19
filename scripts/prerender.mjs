// Writes one HTML file per address into dist/, each with the page already
// rendered, its own title, description, canonical link, share image and
// structured data. Runs after `vite build` (the client) and `vite build --ssr`
// (the server entry), and removes the server bundle when it is done.
//
// GitHub Pages serves dist/<path>/index.html for /<path>/, so every page the
// sitemap lists is a real document. dist/404.html is the bare shell: an address
// nothing was written for still boots the app, which lands on the front page.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const ORIGIN = 'https://mobahug.github.io';
const BASE = process.env.BASE_PATH || '/The_AI_Timeline/';
const SITE = 'The AI Timeline';

const template = await readFile(join(dist, 'index.html'), 'utf8');
const cache = JSON.parse(await readFile(join(root, 'public', 'wiki-cache.json'), 'utf8'));
const events = JSON.parse(await readFile(join(root, 'data', 'events.json'), 'utf8'));
const spine = JSON.parse(await readFile(join(root, 'data', 'spine.json'), 'utf8'));
const leads = JSON.parse(await readFile(join(root, 'data', 'leads.json'), 'utf8')).leads;
const people = JSON.parse(await readFile(join(root, 'data', 'people.json'), 'utf8')).people;
const orgs = JSON.parse(await readFile(join(root, 'data', 'orgs.json'), 'utf8')).orgs;
const terms = JSON.parse(await readFile(join(root, 'data', 'glossary.json'), 'utf8')).terms;
const fallbacks = JSON.parse(await readFile(join(root, 'data', 'image-fallbacks.json'), 'utf8'));
const NOW = JSON.parse(await readFile(join(root, 'data', 'threads.json'), 'utf8')).span.now;

const { render } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const { VIEWS } = await import(pathToFileURL(join(root, 'src', 'lib', 'views.js')).href);

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const enc = (s) => encodeURIComponent(s);

/** Every address the site has, as paths under the base. */
const routes = [
  '',
  ...VIEWS.filter((v) => v.sitemap && v.path).map((v) => v.path + '/'),
  ...spine.findings.map((f) => 'line/' + f.n + '/'),
  ...events.map((e) => 'card/' + enc(e.id) + '/'),
  ...leads.map((l) => 'lead/' + enc(l.id) + '/'),
  ...people.map((p) => 'person/' + enc(p.id) + '/'),
  ...orgs.map((o) => 'org/' + enc(o.id) + '/'),
  ...terms.map((t) => 'term/' + enc(t.id) + '/')
];

/** Structured data for a route, as JSON-LD. Only what the page states. */
function jsonLd(route, meta, url, image) {
  const site = { '@type': 'WebSite', name: SITE, url: ORIGIN + BASE };
  const crumbs = (items) => ({
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
      { '@context': 'https://schema.org', '@type': 'Article', headline: e.title, description: meta.description, url,
        image: image ? [image] : undefined, datePublished: String(e.year), isPartOf: site,
        author: { '@type': 'Organization', name: SITE }, citation: sources.length ? sources : undefined,
        about: e.year > NOW ? 'Scenario, confidence ' + (e.confidence || 'Uncertain') : undefined },
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['The board', 'board/'], [e.year + ' ' + e.title, 'card/' + enc(e.id) + '/']]) }
    ];
  }
  if (route.view === 'lead') {
    const l = leads.find((x) => x.id === route.id);
    if (!l) return [];
    return [
      { '@context': 'https://schema.org', '@type': 'Article', headline: l.title, description: meta.description, url, isPartOf: site,
        author: { '@type': 'Organization', name: SITE },
        hasPart: l.rungs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.label, url: ORIGIN + BASE + 'card/' + enc(r.event) + '/' })) },
      { '@context': 'https://schema.org', ...crumbs([[SITE, ''], ['The leads', 'leads/'], [l.title, 'lead/' + enc(l.id) + '/']]) }
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

/** The page's share image: the card's own photograph, else the site's card. */
function imageFor(route, media) {
  if (route.view === 'card' && route.id) {
    const e = events.find((x) => x.id === route.id);
    const tryTitle = (t) => t && media[t] && media[t].img;
    const img = e && (tryTitle(e.wikiTitle) || tryTitle(fallbacks[e.id]));
    if (img) return img;
  }
  return ORIGIN + BASE + 'og.png';
}

function page(route, html, meta, media) {
  const url = ORIGIN + BASE + routeToPath(route);
  const image = imageFor(route, media);
  const ld = jsonLd(route, meta, url, image);
  const clientOnly = route.view === 'board';
  let out = template;
  out = out.replace(/<title>[^<]*<\/title>/, '<title>' + esc(meta.title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="' + esc(meta.description) + '" />');
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="' + esc(meta.title) + '" />');
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="' + esc(meta.description) + '" />');
  out = out.replace(/<meta property="og:image" content="[^"]*" \/>/, '<meta property="og:image" content="' + esc(image) + '" />');
  out = out.replace('<meta property="og:type" content="website" />',
    '<meta property="og:type" content="' + (route.view === 'card' || route.view === 'lead' ? 'article' : 'website') + '" />\n'
    + '    <meta property="og:url" content="' + esc(url) + '" />\n'
    + '    <link rel="canonical" href="' + esc(url) + '" />');
  const inline = Object.keys(media).length ? '\n    <script id="wiki-inline" type="application/json">' + JSON.stringify(media).replace(/</g, '\\u003c') + '</script>' : '';
  const structured = ld.length ? '\n    <script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>' : '';
  out = out.replace('</head>', structured + inline + '\n  </head>');
  if (clientOnly) out = out.replace('<html lang="en">', '<html lang="en" data-client-render>');
  out = out.replace('<div id="root"></div>', '<div id="root">' + html + '</div>');
  return out;
}

function routeToPath(route) {
  const v = VIEWS.find((x) => x.id === route.view);
  if (!v || !v.path) return '';
  return v.path.split('/').map((seg) => (seg[0] === ':' ? enc(route[seg.slice(1) === 'finding' ? 'finding' : 'id']) : seg)).join('/') + '/';
}

let n = 0;
for (const path of routes) {
  const { html, route, meta, media: used } = render(BASE + path, cache);
  // A page that touched many entries — the archive, the plates — only needs
  // their photographs; the extracts are for a card's own page.
  const media = Object.keys(used).length > 12
    ? Object.fromEntries(Object.entries(used).map(([k, v]) => [k, { img: v.img || '' }]))
    : used;
  const out = page(route, html, meta, media);
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
