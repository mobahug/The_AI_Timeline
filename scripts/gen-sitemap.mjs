// Writes public/sitemap.xml from the data: every view, every card, every finding.
// Runs before build so the sitemap can never drift from what the site contains.
import { readFile, writeFile } from 'node:fs/promises';

const ORIGIN = 'https://mobahug.github.io/The_AI_Timeline/';
const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8'));
const spine = JSON.parse(await readFile(new URL('../data/spine.json', import.meta.url), 'utf8'));

const urls = [
  { loc: ORIGIN, priority: '1.0' },
  ...['line', 'board', 'case', 'horizon', 'plates', 'mosaic', 'index', 'about'].map((v) => ({ loc: ORIGIN + '?view=' + v, priority: '0.8' })),
  ...spine.findings.map((f) => ({ loc: ORIGIN + '?view=finding&f=' + f.n, priority: '0.7' })),
  ...events.map((e) => ({ loc: ORIGIN + '?view=board&id=' + encodeURIComponent(e.id), priority: e.featured ? '0.6' : '0.5' }))
];

const esc = (s) => s.replace(/&/g, '&amp;');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map((u) => '  <url><loc>' + esc(u.loc) + '</loc><priority>' + u.priority + '</priority></url>').join('\n')
  + '\n</urlset>\n';

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log('sitemap: ' + urls.length + ' urls');
