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

export const ALL_ENTITIES: Entity[] = [...PEOPLE, ...ORGS, ...TERMS];
export const entityById = (kind: EntityKind, id: string): Entity | null => (kind === 'person' ? personById[id] : kind === 'org' ? orgById[id] : termById[id]) || null;
