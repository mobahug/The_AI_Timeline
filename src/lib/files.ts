import rawPeople from '../../data/people.json';
import rawOrgs from '../../data/orgs.json';
import rawTerms from '../../data/glossary.json';
import type { Entity, EntityKind, Event, Graph, Org, Person, Term, ViewId } from './types';

/* The files: persons of interest, organisations and the glossary. A card names
   an entity either by id (`people`, `orgs`, `terms`) or simply by using its name
   in the text; both count as an appearance, so a reader following a name lands
   on every card that carries it without each one having been tagged by hand. */

export type PersonEntity = Extract<Entity, { kind: 'person' }>;
export type OrgEntity = Extract<Entity, { kind: 'org' }>;
export type TermEntity = Extract<Entity, { kind: 'term' }>;

export const PEOPLE: PersonEntity[] = (rawPeople.people as Person[]).map((p) => ({ ...p, kind: 'person' as const, label: p.name }));
export const ORGS: OrgEntity[] = (rawOrgs.orgs as Org[]).map((o) => ({ ...o, kind: 'org' as const, label: o.name }));
export const TERMS: TermEntity[] = (rawTerms.terms as Term[]).map((t) => ({ ...t, kind: 'term' as const, label: t.term }));

export const personById: Record<string, PersonEntity> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const orgById: Record<string, OrgEntity> = Object.fromEntries(ORGS.map((o) => [o.id, o]));
export const termById: Record<string, TermEntity> = Object.fromEntries(TERMS.map((t) => [t.id, t]));

const FIELD: Record<EntityKind, 'people' | 'orgs' | 'terms'> = { person: 'people', org: 'orgs', term: 'terms' };
const VIEW: Record<EntityKind, ViewId> = { person: 'person', org: 'org', term: 'term' };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One regex per entity, over its name and aliases. An alias with a capital
 *  letter is matched as written (Lean, RL, Clay); an all-lowercase alias is
 *  matched case-insensitively (winter, tokens). Whole words only. */
function patternOf(entity: Entity): RegExp[] {
  const names = [entity.label, ...(entity.aka || [])].filter(Boolean);
  const exact = names.filter((n) => /[A-Z]/.test(n));
  const loose = names.filter((n) => !/[A-Z]/.test(n));
  const parts: RegExp[] = [];
  if (exact.length) parts.push(new RegExp('(^|[^\\p{L}\\p{N}])(' + exact.map(escapeRe).join('|') + ")(?![\\p{L}\\p{N}])", 'u'));
  if (loose.length) parts.push(new RegExp('(^|[^\\p{L}\\p{N}])(' + loose.map(escapeRe).join('|') + ")(?![\\p{L}\\p{N}])", 'iu'));
  return parts;
}

const patterns = new Map<string, RegExp[]>();
const patternFor = (entity: Entity): RegExp[] => {
  const key = entity.id + '|' + entity.kind;
  let found = patterns.get(key);
  if (!found) { found = patternOf(entity); patterns.set(key, found); }
  return found;
};

/** The text of a card an entity can appear in: never its sources, whose text
 *  belongs to someone else. */
const textOf = (event: Event) => [event.title, event.summary, event.why || '', ...(event.detail || [])].join('\n');

/** Does a card name this entity, by tag or by text? */
export function names(event: Event, entity: Entity): boolean {
  const tagged = event[FIELD[entity.kind]];
  if (Array.isArray(tagged) && tagged.includes(entity.id)) return true;
  const text = textOf(event);
  return patternFor(entity).some((re) => re.test(text));
}

/** Every entity a card names, grouped by kind, tagged ones first. */
export function entitiesOf(event: Event): { people: PersonEntity[]; orgs: OrgEntity[]; terms: TermEntity[] } {
  const pick = <T extends Entity>(list: T[]): T[] => {
    const tagged = list.filter((x) => { const t = event[FIELD[x.kind]]; return Array.isArray(t) && t.includes(x.id); });
    const found = list.filter((x) => !tagged.includes(x) && names(event, x));
    return [...tagged, ...found];
  };
  return { people: pick(PEOPLE), orgs: pick(ORGS), terms: pick(TERMS) };
}

/** Every card that names an entity, in date order. */
export const appearancesOf = (graph: Graph, entity: Entity): Event[] => graph.all.filter((e) => names(e, entity));

/** The route to an entity's page. */
export const routeOf = (entity: Entity): { view: ViewId; id: string } => ({ view: VIEW[entity.kind], id: entity.id });

/* ─── Who else is on these cards ─────────────────────────────────────────
   No entity on this board related to any other. A name's page listed its cards
   and stopped, and prev/next walked the raw order of the JSON file — which is
   why "next from Hinton" landed on LeCun: they are written next to each other,
   and for no other reason. For the seventeen people and five organisations
   that appear on a single card, there was no onward step at all.

   Nothing new is authored for this. Two names are related when the board has
   put them on the same card, which it has already said 67, 90 and 108 times in
   `people`, `orgs` and `terms`, and says again wherever a card's own text uses
   a name it did not trouble to tag. The count is printed, not hidden in a
   tooltip, so a reader on a phone sees it too. */
export interface CoOccurrence { entity: Entity; cards: number }

export function coOccurring(graph: Graph, entity: Entity, kinds: EntityKind[]): CoOccurrence[] {
  const here = appearancesOf(graph, entity);
  const tally = new Map<string, CoOccurrence>();
  for (const card of here) {
    const named = entitiesOf(card);
    const all: Entity[] = [
      ...(kinds.includes('person') ? named.people : []),
      ...(kinds.includes('org') ? named.orgs : []),
      ...(kinds.includes('term') ? named.terms : [])
    ];
    for (const other of all) {
      if (other.kind === entity.kind && other.id === entity.id) continue;
      const key = other.kind + '|' + other.id;
      const row = tally.get(key) || { entity: other, cards: 0 };
      row.cards += 1;
      tally.set(key, row);
    }
  }
  return [...tally.values()].sort((a, b) => b.cards - a.cards || a.entity.label.localeCompare(b.entity.label));
}

/** The files page's own order — most-used first — shared with the pages it
 *  links to, so prev and next follow the order the reader arrived by. */
export function byUse(graph: Graph, list: Entity[]): Entity[] {
  return [...list].sort((a, b) => appearancesOf(graph, b).length - appearancesOf(graph, a).length || a.label.localeCompare(b.label));
}

export const ALL_ENTITIES: Entity[] = [...PEOPLE, ...ORGS, ...TERMS];
export const entityById = (kind: EntityKind, id: string): Entity | null => (kind === 'person' ? personById[id] : kind === 'org' ? orgById[id] : termById[id]) || null;

/* ─── One index for the field in the header ──────────────────────────────
   The field did two different things. It filtered the page it is on by
   `title + summary + year`, and it ranked the dropdown on `summary + why +
   year` — so one keystroke drove two indexes that disagreed, and the count in
   the header referred to whichever one the reader was not looking at.

   Worse, both of them stopped at the summary. 52,000 of the 76,000 characters
   the board has written live in `why` and `detail`, and none of it could be
   found: "hinton" filtered the archive to the five cards with his name in a
   title or summary, while the files page reached ten.

   This is what a card can be found by: everything it says in its own voice,
   the numbers it quotes, the threshold it claims, the date it carries, and the
   names it tags but does not spell out. Never its sources — a card is not
   found by the publisher of a page it cites. Built once per card and kept. */
const INDEX = new Map<string, string>();

export function searchText(event: Event): string {
  const had = INDEX.get(event.id);
  if (had !== undefined) return had;
  const tagged = [
    ...(event.people || []).map((id) => personById[id]),
    ...(event.orgs || []).map((id) => orgById[id]),
    ...(event.terms || []).map((id) => termById[id])
  ].filter(Boolean);
  const text = [
    event.title,
    event.summary,
    event.why,
    ...(event.detail || []),
    ...(event.figures || []).flatMap((f) => [f.label, f.value]),
    event.firsts,
    String(event.year),
    event.date,
    ...tagged.flatMap((x) => [x.label, ...(x.aka || [])])
  ].filter(Boolean).join(' ').toLowerCase();
  INDEX.set(event.id, text);
  return text;
}

/** Does a card answer this query? The query is already lower-cased and trimmed. */
export const matches = (event: Event, q: string): boolean => !q || searchText(event).includes(q);
