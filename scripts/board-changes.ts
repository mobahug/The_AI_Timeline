// The site's half of the feed (scripts/feed.ts): the records most recently
// added to the board or revised on it, dated from the repository's history, as
// a module the latest page imports —
//
//   import CHANGES from 'virtual:board-changes';
//
// The feed is for a reader with a feed reader; this is the same list for a
// reader without one, printed on the page. It carries only what the history
// knows — which record, what kind, the day it was added, the day it last
// changed and the subject of the commit that changed it. The titles and
// summaries are the data's own, read in the browser from the files the page
// already holds, so a record renamed since is shown by its present name.
//
// The build needs the whole history and refuses a shallow clone, as the feed
// does. The dev server and the tests are let off with an empty list and a
// warning: a shallow checkout should still be able to run the site.
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { dateRecords, feedEntries, readHistory, readItems } from './feed';
import type { Change } from '../src/lib/types';

const ID = 'virtual:board-changes';
const RESOLVED = '\0' + ID;
/** How many the page lists: a few weeks of work, as the feed does. */
export const CHANGES_SIZE = 30;

/** The newest changes on the board, newest first, as the page reads them. */
export function boardChangesOf(root: string, size = CHANGES_SIZE): Change[] {
  return feedEntries(readItems(root), dateRecords(readHistory(root)), size).map((e) => ({
    kind: e.kind,
    id: e.id,
    added: e.added.date,
    changed: e.changed.date,
    // A new record has no change to describe; a revision quotes its commit.
    subject: e.added.sha === e.changed.sha ? '' : e.changed.subject
  }));
}

export function boardChanges(): Plugin {
  const root = fileURLToPath(new URL('..', import.meta.url));
  let strict = false;
  let code: string | null = null;
  return {
    name: 'board-changes',
    configResolved(config) { strict = config.command === 'build'; },
    resolveId(id) { return id === ID ? RESOLVED : null; },
    load(id) {
      if (id !== RESOLVED) return null;
      if (code === null) {
        let changes: Change[] = [];
        try {
          changes = boardChangesOf(root);
        } catch (err) {
          if (strict) throw err;
          console.warn('board-changes: ' + (err instanceof Error ? err.message : String(err)) + ' The latest page lists no changes.');
        }
        code = 'export default JSON.parse(' + JSON.stringify(JSON.stringify(changes)) + ');\n';
      }
      return code;
    }
  };
}
