// Writes public/feed.xml: the cards, leads and plain questions most recently
// added or changed, newest first, dated from the repository's history (see
// scripts/feed.ts for why the dates are not in the data). Runs before build,
// beside the sitemap. The file is not committed: it names the commits it is
// built from, so a committed copy would always be one commit behind.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FEED_FILES, atom, dateRecords, feedEntries, itemsOf, readHistory } from './feed';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const items = itemsOf({
  card: await read(FEED_FILES.card.path),
  lead: await read(FEED_FILES.lead.path),
  question: await read(FEED_FILES.question.path)
});

const dated = dateRecords(readHistory(root));
const entries = feedEntries(items, dated);
const unsaved = items.filter((i) => !dated.has(i.kind + '/' + i.id)).length;

await writeFile(new URL('../public/feed.xml', import.meta.url), atom(entries));
console.log('feed: ' + entries.length + ' entries, newest ' + (entries[0] ? entries[0].changed.date : 'none')
  + (unsaved ? '; ' + unsaved + ' not yet committed, left out' : ''));
