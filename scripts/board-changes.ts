// The site's half of the feed (scripts/feed.ts): the records most recently
// added to the board or revised on it, dated from the repository's history, as
// a module the latest page imports —
//
//   import CHANGES from 'virtual:board-changes';
//
// — and, for every card, the day it was filed and the day it last changed,
// which its dossier prints at its foot and in its citation:
//
//   import DATED from 'virtual:board-dated';
//
// Two modules, so that each travels in the chunk of the page that prints it
// and neither in the main script. No page prints the days of a lead, a
// question, a check, a prediction or a promise (the prerenderer dates their
// pages from the history itself), so the browser is not sent them.
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
import { datedHistory, feedEntries, readItems } from './feed.ts';
import type { Change } from '../src/lib/types.ts';

/** The two modules, and the part of the history each answers with. */
const PARTS = new Map<string, 'changes' | 'dated'>([['virtual:board-changes', 'changes'], ['virtual:board-dated', 'dated']]);
/** How many the page lists: a few weeks of work, as the feed does. */
export const CHANGES_SIZE = 30;

/** The newest changes on the board, newest first, as the page reads them;
 *  and every dated card's two days, by `card/id`, as `[filed, changed]`. */
export function boardChangesOf(root: string, size = CHANGES_SIZE): { changes: Change[]; dated: Record<string, [string, string]> } {
  const items = readItems(root);
  const history = datedHistory(root);
  const changes = feedEntries(items, history, size).map((e) => ({
    kind: e.kind,
    id: e.id,
    added: e.added.date,
    changed: e.changed.date,
    // A new record has no change to describe; a revision quotes its commit.
    subject: e.added.sha === e.changed.sha ? '' : e.changed.subject
  }));
  const dated: Record<string, [string, string]> = {};
  for (const e of feedEntries(items, history, Infinity)) if (e.kind === 'card') dated[e.kind + '/' + e.id] = [e.added.date.slice(0, 10), e.changed.date.slice(0, 10)];
  return { changes, dated };
}

export function boardChanges(): Plugin {
  const root = fileURLToPath(new URL('..', import.meta.url));
  let strict = false;
  let out: ReturnType<typeof boardChangesOf> | null = null;
  return {
    name: 'board-changes',
    configResolved(config) { strict = config.command === 'build'; },
    resolveId(id) { return PARTS.has(id) ? '\0' + id : null; },
    load(id) {
      const part = id.startsWith('\0') ? PARTS.get(id.slice(1)) : undefined;
      if (!part) return null;
      if (out === null) {
        try {
          out = boardChangesOf(root);
        } catch (err) {
          if (strict) throw err;
          console.warn('board-changes: ' + (err instanceof Error ? err.message : String(err)) + ' The latest page lists no changes.');
          out = { changes: [], dated: {} };
        }
      }
      return 'export default JSON.parse(' + JSON.stringify(JSON.stringify(out[part])) + ');\n';
    }
  };
}
