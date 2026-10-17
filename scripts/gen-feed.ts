// Writes public/feed.xml: the cards, leads, plain questions and headline checks
// most recently added or changed, newest first, dated from the repository's
// history (see scripts/feed.ts for why the dates are not in the data). Runs
// before build, beside the sitemap. The file is not committed: it names the
// commits it is built from, so a committed copy would always be one commit behind.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { atom, dateRecords, feedEntries, readHistory, readItems } from './feed';

const root = fileURLToPath(new URL('..', import.meta.url));
const items = readItems(root);

const dated = dateRecords(readHistory(root));
const entries = feedEntries(items, dated);
const unsaved = items.filter((i) => !dated.has(i.kind + '/' + i.id)).length;

await writeFile(new URL('../public/feed.xml', import.meta.url), atom(entries));
console.log('feed: ' + entries.length + ' entries, newest ' + (entries[0] ? entries[0].changed.date : 'none')
  + (unsaved ? '; ' + unsaved + ' not yet committed, left out' : ''));
