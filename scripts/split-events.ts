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
// The other files of records are read in two parts the same way, `?heads` and
// `?bodies` — see SPLITS below, and src/lib/bodies/ for the reading half.
//
// The answer is a module that parses its JSON text. Vite 8's JSON handling
// (Rolldown's, in native code) no longer takes up text another plugin loaded
// under a query, so the module is made here, the way Vite's `json.stringify`
// made it: a string literal parses faster than the same object written as code.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { TAG, entitiesFrom, speaks, wordsOf } from '../src/lib/names.ts';
import { pageCount, registerPages } from '../src/lib/register.ts';
import { PAPER_FIELDS } from '../src/lib/types.ts';
import type { Correction, Entity, EventHead, EventRaw, Named, Papers } from '../src/lib/types.ts';

/** Every name on file, read whole from the three files in `dir`: all the rule
 *  below asks of them is their names, which the build has either way. */
function namesIn(dir: string): Entity[] {
  const read = (name: string) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  const { people, orgs, terms } = entitiesFrom({ people: read('people.json').people, orgs: read('orgs.json').orgs, terms: read('glossary.json').terms });
  return [...people, ...orgs, ...terms];
}
let onFile: Entity[] | null = null;
const namesOnFile = (): Entity[] => onFile || (onFile = namesIn(fileURLToPath(new URL('../data/', import.meta.url))));

/** The names a card's own words use and its tags do not, read over the whole
 *  card. The browser never has every card's words, so it is asked once, here. */
export function namedOf(card: EventRaw, entities: Entity[] = namesOnFile()): Named {
  const text = wordsOf(card);
  const lower = text.toLowerCase();
  const out: Named = {};
  for (const entity of entities) {
    const field = TAG[entity.kind];
    const tagged = card[field];
    if (Array.isArray(tagged) && tagged.includes(entity.id)) continue;
    if (speaks(text, lower, entity)) (out[field] = out[field] || []).push(entity.id);
  }
  return out;
}

/** A card's head: everything but its papers, and the names they use. Every
 *  filed card carries `named`, empty or not: a card without it was never filed. */
export function headOf(card: EventRaw, entities?: Entity[]): EventHead {
  const head: Record<string, unknown> = { ...card };
  for (const field of PAPER_FIELDS) delete head[field];
  head.named = namedOf(card, entities);
  return head as EventHead;
}

/** A card's papers, as written: only the fields it has. */
export function papersOf(card: EventRaw): Papers {
  return Object.fromEntries(PAPER_FIELDS.filter((f) => card[f] !== undefined).map((f) => [f, card[f]])) as Papers;
}

const PARTS: Record<string, (cards: EventRaw[], dir: string) => unknown> = {
  cards: (cards, dir) => { const names = namesIn(dir); return cards.map((c) => headOf(c, names)); },
  papers: (cards) => Object.fromEntries(cards.map((c) => [c.id, papersOf(c)]))
};

/* ─── Heads and bodies ───────────────────────────────────────────────────
   Most pages list a record from a little of it: a prediction's title, who
   said it and the verdict; a person's name and the line they are filed with;
   a lead's question and the cards of its ladder. The rest — the words, the
   reading at length, the bio, the case note — is most of what each file
   weighs, and only the record's own pages print it. So each file is read in
   two parts:

     data/<file>.json?heads    what every page may read: the main bundle
     data/<file>.json?bodies   what only the record's own pages print: they
                               import it, so it travels in their chunks

   Either part keeps the file's shape — the records under the same key, each
   cut to the fields that part keeps — so the file read whole, as a script run
   by tsx reads it with no plugin to answer the query, answers for both. A
   field of a record is in one part or the other: one in neither stops the
   build, rather than going missing from both.

   A page that prints a little of a body asks for that much of it, by field:

     data/<file>.json?bodies=record   each record's body, cut to `record`

   A plain question, a headline check, a prediction and a promise each list
   the cards they rest on, with a line on each. Every page knows the cards
   (the heads); the record's own pages print the lines with the rest of its
   body, and a card's dossier prints the lines alone, under each record that
   names the card (src/lib/bodies/notes.ts). */

/** The fields a part keeps of a record: a field by name, or a list field as
 *  `[name, fields]`, keeping those fields of each of its items. */
type Fields = readonly (string | readonly [string, readonly string[]])[];
export interface Split {
  /** The key the records sit under; none for a file that is the list itself. */
  key?: string;
  /** The fields that name a record, kept in both parts. */
  id: readonly string[];
  heads: Fields;
  bodies: Fields;
  /** A body field the head is told of rather than given: `noted` for a string
   *  that carries a `note`. */
  marks?: Record<string, string>;
}
export const SPLITS: Record<string, Split> = {
  // Said in advance: a prediction is listed from its title, who said it, the
  // year it named, the verdict and the cards it bears on; its own pages print
  // the words, the verdict at length and the sources.
  '/data/predictions.json': {
    key: 'predictions', id: ['id'],
    heads: ['title', 'who', 'people', 'said', 'by', 'verdict', 'came', 'short', ['record', ['event']]],
    bodies: ['words', 'source', 'reported', 'byWords', 'reading', 'evidence', 'sources', ['record', ['note']], 'open', 'checked', 'leads']
  },
  // Promises made, likewise: listed from its head; its words, its reading and
  // its sources are its own pages'.
  '/data/promises.json': {
    key: 'promises', id: ['id'],
    heads: ['title', 'who', 'people', 'orgs', 'said', 'by', 'verdict', 'settled', 'short', ['record', ['event']]],
    bodies: ['words', 'source', 'byWords', 'reading', 'evidence', 'sources', ['record', ['note']], 'open', 'checked', 'leads']
  },
  // A string's claim is on the board; its case note is read on the pages that
  // print it, and the board knows only which strings have one.
  '/data/links.json': { id: ['from', 'to'], heads: ['claim'], bodies: ['note'], marks: { noted: 'note' } },
  // A lead's question and blurb are searched and described from every page,
  // and its ladder is drawn from the cards and labels of its rungs.
  '/data/leads.json': { key: 'leads', id: ['id'], heads: ['title', 'kind', 'hue', 'question', 'blurb', ['rungs', ['event', 'label']]], bodies: ['standing', ['rungs', ['text']]] },
  '/data/questions.json': { key: 'questions', id: ['id'], heads: ['question', 'short', ['record', ['event']], 'leads'], bodies: ['answer', 'inPractice', ['record', ['note']], 'open'] },
  '/data/checks.json': { key: 'checks', id: ['id'], heads: ['title', 'checked', 'verdict', 'short', ['record', ['event']], 'leads'], bodies: ['reported', 'primary', 'claims', 'reading', ['record', ['note']], 'open'] },
  '/data/machines.json': { key: 'machines', id: ['id'], heads: ['event', 'title', 'short', 'lead'], bodies: ['lede', 'try', 'kept', 'changed', 'credit', 'sources'] },
  '/data/people.json': { key: 'people', id: ['id'], heads: ['name', 'aka', 'role'], bodies: ['bio'] },
  '/data/orgs.json': { key: 'orgs', id: ['id'], heads: ['name', 'aka', 'kind', 'role'], bodies: ['bio'] },
  '/data/glossary.json': { key: 'terms', id: ['id'], heads: ['term', 'aka', 'short'], bodies: ['definition'] },
  // A dossier says when its card was last corrected, and links the entry; the
  // register itself prints the rest, and only the register reads it.
  '/data/corrections.json': { key: 'corrections', id: ['id'], heads: ['date', 'event'], bodies: ['commit', 'where', 'kind', 'was', 'now', 'why', 'source', 'alsoIn'] }
};

type Rec = Record<string, unknown>;
const named = (f: Fields[number]): string => (typeof f === 'string' ? f : f[0]);

/** A record cut to the fields given. */
function keep(r: Rec, fields: Fields): Rec {
  const out: Rec = {};
  for (const f of fields) {
    if (typeof f === 'string') { if (r[f] !== undefined) out[f] = r[f]; }
    else if (Array.isArray(r[f[0]])) out[f[0]] = (r[f[0]] as Rec[]).map((item) => keep(item, f[1]));
  }
  return out;
}

/** Stop on a field neither part keeps, in a record or in an item of one of its lists. */
function placed(file: string, split: Split, r: Rec): void {
  const all: Fields = [...split.id, ...split.heads, ...split.bodies, ...Object.keys(split.marks || {})];
  const lists = new Map<string, Set<string>>();
  all.forEach((f) => { if (typeof f !== 'string') lists.set(f[0], new Set([...(lists.get(f[0]) || []), ...f[1]])); });
  const names = new Set(all.map(named));
  const where = split.id.map((k) => r[k]).join('>');
  for (const k of Object.keys(r)) {
    if (!names.has(k)) throw new Error('split-events: ' + file.slice(1) + ': "' + k + '" of ' + where + ' is in neither its head nor its body (SPLITS)');
    const sub = lists.get(k);
    if (sub) (r[k] as Rec[]).forEach((item) => Object.keys(item).forEach((kk) => {
      if (!sub.has(kk)) throw new Error('split-events: ' + file.slice(1) + ': "' + k + '.' + kk + '" of ' + where + ' is in neither its head nor its body (SPLITS)');
    }));
  }
}

/** One part of a split file, in the file's shape: a body cut to the fields
 *  named in `only`, if any are. A body that keeps nothing but the record's
 *  name — a string with no note — is left out. */
export function project(file: string, split: Split, whole: unknown, part: 'heads' | 'bodies', only?: readonly string[]): unknown {
  const records = (split.key ? (whole as Record<string, Rec[]>)[split.key] : whole) as Rec[];
  records.forEach((r) => placed(file, split, r));
  let out: Rec[];
  if (part === 'heads') {
    out = records.map((r) => {
      const head = { ...keep(r, split.id), ...keep(r, split.heads) };
      for (const [mark, field] of Object.entries(split.marks || {})) if (r[field] !== undefined) head[mark] = true;
      return head;
    });
  } else {
    (only || []).forEach((f) => {
      if (!split.bodies.some((b) => named(b) === f)) throw new Error('split-events: ' + file.slice(1) + ': "' + f + '" is not in its body (SPLITS)');
    });
    const bodies = only ? split.bodies.filter((b) => only.includes(named(b))) : split.bodies;
    out = records.map((r) => ({ id: keep(r, split.id), body: keep(r, bodies) }))
      .filter((x) => Object.keys(x.body).length)
      .map((x) => ({ ...x.id, ...x.body }));
  }
  return split.key ? { [split.key]: out } : out;
}

/** The module that answers an import: its JSON, parsed from a string. */
const moduleOf = (data: unknown): string => 'export default JSON.parse(' + JSON.stringify(JSON.stringify(data)) + ');\n';

/* ─── The register, a page at a time ───────────────────────────────────
   The corrections register prints PER_PAGE entries to a page, newest first
   (src/lib/register.ts), and a page's script carries that page's entries:

     data/corrections.json?page=2   the register's second page, each entry whole
     virtual:register-pages         a loader for each page, first to last

   The loaders ride in the main script, a line each, so a turn to any page of
   the register sends for its entries beside its chunk rather than after it.
   A page keeps the file's shape, `note` and `corrections`, with what it says
   of the whole register beside them. Where every entry is printed — what a
   dossier's link and an old address need — is read from the heads. */
const REGISTER = fileURLToPath(new URL('../data/corrections.json', import.meta.url));
const PAGES = 'virtual:register-pages';
const readRegister = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as { note: string; corrections: Correction[] };

export function splitEvents(): Plugin {
  return {
    name: 'split-events',
    // Before Vite's own loader, which would answer any query on the file with
    // the whole of it.
    enforce: 'pre',
    resolveId(id) { return id === PAGES ? '\0' + PAGES : null; },
    load(id) {
      if (id === '\0' + PAGES) {
        this.addWatchFile(REGISTER);
        const count = pageCount(readRegister(REGISTER).corrections.length);
        return 'export default [\n' + Array.from({ length: count }, (_, i) => '  () => import(' + JSON.stringify(REGISTER + '?page=' + (i + 1)) + ')').join(',\n') + '\n];\n';
      }
      const [file, query] = id.split('?');
      if (!query) return null;
      const params = new URLSearchParams(query);
      if (file.endsWith('/data/corrections.json') && params.has('page')) {
        const whole = readRegister(file);
        const pages = registerPages(whole.corrections, whole.note);
        const n = Number(params.get('page'));
        if (!Number.isInteger(n) || n < 1 || n > pages.length) throw new Error('split-events: data/corrections.json has no page ' + params.get('page') + ' (it fills ' + pages.length + ')');
        this.addWatchFile(file);
        return moduleOf(pages[n - 1]);
      }
      const split = Object.keys(SPLITS).find((f) => file.endsWith(f));
      if (split) {
        const part = params.has('heads') ? 'heads' : params.has('bodies') ? 'bodies' : null;
        if (!part) return null;
        // `?bodies=record`: the body, cut to the fields named.
        const fields = part === 'bodies' ? params.get('bodies') : null;
        this.addWatchFile(file);
        return moduleOf(project(split, SPLITS[split], JSON.parse(readFileSync(file, 'utf8')), part, fields ? fields.split(',') : undefined));
      }
      if (!file.endsWith('/data/events.json')) return null;
      const part = Object.keys(PARTS).find((p) => params.has(p));
      if (!part) return null;
      this.addWatchFile(file);
      // The names a card uses are read from the three files beside it.
      const dir = dirname(file);
      if (part === 'cards') ['people.json', 'orgs.json', 'glossary.json'].forEach((f) => this.addWatchFile(join(dir, f)));
      return moduleOf(PARTS[part](JSON.parse(readFileSync(file, 'utf8')) as EventRaw[], dir));
    }
  };
}
