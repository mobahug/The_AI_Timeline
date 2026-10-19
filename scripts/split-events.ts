// The build's half of a card's papers (see PAPER_FIELDS in src/lib/types.ts,
// and src/lib/papers.ts for the reading half). data/events.json stays the one
// file the author writes. Two imports of it are answered here, each a
// projection of the same cards:
//
//   data/events.json?cards    every card's head and the names its words use:
//                             what the wall is drawn from, in the main bundle
//   data/events.json?papers   every card's papers, by id: the browser imports
//                             it when a page needs it, the server imports it whole
//
// The answer is a module that parses its JSON text. Vite 8's JSON handling
// (Rolldown's, in native code) no longer takes up text another plugin loaded
// under a query, so the module is made here, the way Vite's `json.stringify`
// made it: a string literal parses faster than the same object written as code.
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { ALL_ENTITIES, TAG, speaks, wordsOf } from '../src/lib/names.ts';
import { PAPER_FIELDS } from '../src/lib/types.ts';
import type { EventHead, EventRaw, Named, Papers } from '../src/lib/types.ts';

/** The names a card's own words use and its tags do not, read over the whole
 *  card. The browser never has every card's words, so it is asked once, here. */
export function namedOf(card: EventRaw): Named {
  const text = wordsOf(card);
  const lower = text.toLowerCase();
  const out: Named = {};
  for (const entity of ALL_ENTITIES) {
    const field = TAG[entity.kind];
    const tagged = card[field];
    if (Array.isArray(tagged) && tagged.includes(entity.id)) continue;
    if (speaks(text, lower, entity)) (out[field] = out[field] || []).push(entity.id);
  }
  return out;
}

/** A card's head: everything but its papers, and the names they use. Every
 *  filed card carries `named`, empty or not: a card without it was never filed. */
export function headOf(card: EventRaw): EventHead {
  const head: Record<string, unknown> = { ...card };
  for (const field of PAPER_FIELDS) delete head[field];
  head.named = namedOf(card);
  return head as EventHead;
}

/** A card's papers, as written: only the fields it has. */
export function papersOf(card: EventRaw): Papers {
  return Object.fromEntries(PAPER_FIELDS.filter((f) => card[f] !== undefined).map((f) => [f, card[f]])) as Papers;
}

const PARTS: Record<string, (cards: EventRaw[]) => unknown> = {
  cards: (cards) => cards.map(headOf),
  papers: (cards) => Object.fromEntries(cards.map((c) => [c.id, papersOf(c)]))
};

/* Said in advance is read the same way. Most pages need a prediction's head —
   its title, who said it, the year it named, the verdict, the cards it bears
   on — to list it; only its own pages read the words, the verdict at length
   and the sources, which are most of what data/predictions.json weighs. */
export const PREDICTION_HEAD = ['id', 'title', 'who', 'people', 'said', 'by', 'verdict', 'came', 'short', 'record'] as const;
/* Promises made, likewise: most pages list a promise from its head, and only
   its own pages read its words, its reading and its sources. */
export const PLEDGE_HEAD = ['id', 'title', 'who', 'people', 'orgs', 'said', 'by', 'verdict', 'settled', 'short', 'record'] as const;
/** The files read as heads, with the key their records sit under and the fields kept. */
const HEADS: Record<string, { key: string; fields: readonly string[] }> = {
  '/data/predictions.json': { key: 'predictions', fields: PREDICTION_HEAD },
  '/data/promises.json': { key: 'promises', fields: PLEDGE_HEAD }
};
const headsOf = (all: Record<string, unknown>[], fields: readonly string[]) =>
  all.map((p) => Object.fromEntries(fields.filter((k) => p[k] !== undefined).map((k) => [k, p[k]])));

export function splitEvents(): Plugin {
  return {
    name: 'split-events',
    // Before Vite's own loader, which would answer any query on the file with
    // the whole of it.
    enforce: 'pre',
    load(id) {
      const [file, query] = id.split('?');
      const heads = query && new URLSearchParams(query).has('heads') ? Object.keys(HEADS).find((f) => file.endsWith(f)) : undefined;
      if (heads) {
        this.addWatchFile(file);
        const { key, fields } = HEADS[heads];
        const text = JSON.stringify(headsOf((JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, unknown>[]>)[key], fields));
        return `export default JSON.parse(${JSON.stringify(text)});\n`;
      }
      if (!query || !file.endsWith('/data/events.json')) return null;
      const params = new URLSearchParams(query);
      const part = Object.keys(PARTS).find((p) => params.has(p));
      if (!part) return null;
      this.addWatchFile(file);
      const text = JSON.stringify(PARTS[part](JSON.parse(readFileSync(file, 'utf8')) as EventRaw[]));
      return `export default JSON.parse(${JSON.stringify(text)});\n`;
    }
  };
}
