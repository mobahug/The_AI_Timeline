// Writes public/sitemap.xml from the data: every page, every card, every
// finding, every lead, every name. Runs before build so the sitemap can never
// drift from what the site contains. Addresses are paths, one document each.
import { readFile, writeFile } from 'node:fs/promises';
import { SITEMAP_VIEWS, viewById } from '../src/lib/views.js';

const ORIGIN = 'https://mobahug.github.io/The_AI_Timeline/';
const read = async (name) => JSON.parse(await readFile(new URL('../data/' + name, import.meta.url), 'utf8'));
const events = await read('events.json');
const spine = await read('spine.json');
const leads = (await read('leads.json')).leads;
const people = (await read('people.json')).people;
const orgs = (await read('orgs.json')).orgs;
const terms = (await read('glossary.json')).terms;
const enc = encodeURIComponent;

const urls = [
  { loc: ORIGIN, priority: '1.0' },
  ...SITEMAP_VIEWS.filter((v) => viewById[v].path).map((v) => ({ loc: ORIGIN + viewById[v].path + '/', priority: '0.8' })),
  ...leads.map((l) => ({ loc: ORIGIN + 'lead/' + enc(l.id) + '/', priority: '0.8' })),
  ...spine.findings.map((f) => ({ loc: ORIGIN + 'line/' + f.n + '/', priority: '0.7' })),
  ...events.map((e) => ({ loc: ORIGIN + 'card/' + enc(e.id) + '/', priority: e.featured ? '0.6' : '0.5' })),
  ...people.map((p) => ({ loc: ORIGIN + 'person/' + enc(p.id) + '/', priority: '0.4' })),
  ...orgs.map((o) => ({ loc: ORIGIN + 'org/' + enc(o.id) + '/', priority: '0.4' })),
  ...terms.map((t) => ({ loc: ORIGIN + 'term/' + enc(t.id) + '/', priority: '0.3' }))
];

const esc = (s) => s.replace(/&/g, '&amp;');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc><priority>' + u.priority + '</priority></url>').join('\n')
  + '\n</urlset>\n';

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log('sitemap: ' + urls.length + ' urls');
