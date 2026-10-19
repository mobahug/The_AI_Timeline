// Read by vite.config.ts, through scripts/split-events.ts, so its imports are
// written as Vite's native config loader needs them: extensions, and JSON asked
// for as JSON.
import rawPeople from '../../data/people.json' with { type: 'json' };
import rawOrgs from '../../data/orgs.json' with { type: 'json' };
import rawTerms from '../../data/glossary.json' with { type: 'json' };
import type { Entity, EntityKind, Org, Person, Term } from './types.ts';

/* Every name on file — persons of interest, organisations, the glossary — and
   the one rule for whether a card's own words use one. The build runs the rule
   over every card once, papers and all (scripts/split-events.ts), and files the
   answer on the card; the browser runs it only for a card that carries its own
   words, which a test writes. Nothing here reads the cards, so the build can
   import it. */

export type PersonEntity = Extract<Entity, { kind: 'person' }>;
export type OrgEntity = Extract<Entity, { kind: 'org' }>;
export type TermEntity = Extract<Entity, { kind: 'term' }>;

export const PEOPLE: PersonEntity[] = (rawPeople.people as Person[]).map((p) => ({ ...p, kind: 'person' as const, label: p.name }));
export const ORGS: OrgEntity[] = (rawOrgs.orgs as Org[]).map((o) => ({ ...o, kind: 'org' as const, label: o.name }));
export const TERMS: TermEntity[] = (rawTerms.terms as Term[]).map((t) => ({ ...t, kind: 'term' as const, label: t.term }));

export const personById: Record<string, PersonEntity> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const orgById: Record<string, OrgEntity> = Object.fromEntries(ORGS.map((o) => [o.id, o]));
export const termById: Record<string, TermEntity> = Object.fromEntries(TERMS.map((t) => [t.id, t]));

export const ALL_ENTITIES: Entity[] = [...PEOPLE, ...ORGS, ...TERMS];
export const entityById = (kind: EntityKind, id: string): Entity | null => (kind === 'person' ? personById[id] : kind === 'org' ? orgById[id] : termById[id]) || null;

/** The field of a card that tags an entity of each kind. */
export const TAG: Record<EntityKind, 'people' | 'orgs' | 'terms'> = { person: 'people', org: 'orgs', term: 'terms' };

/** The text of a card an entity can appear in: never its sources, whose text
 *  belongs to someone else. */
export const wordsOf = (card: { title: string; summary: string; why?: string; detail?: string[] }): string =>
  [card.title, card.summary, card.why || '', ...(card.detail || [])].join('\n');

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

/* A word-bounded regex can only match where the plain substring is there, so a
   substring test is a sound gate in front of it — and about a hundred times
   cheaper than a unicode-mode alternation over two kilobytes of prose. Most of
   the 120 entities are absent from most of the 163 cards, so the regex now runs
   only where it might succeed. */
const needles = new Map<string, string[]>();
const needlesFor = (entity: Entity): string[] => {
  const key = entity.id + '|' + entity.kind;
  let found = needles.get(key);
  if (!found) {
    found = [entity.label, ...(entity.aka || [])].filter(Boolean).map((n) => n.toLowerCase());
    needles.set(key, found);
  }
  return found;
};

/** Do these words — a card's, as `wordsOf` joins them, and their lower-cased
 *  copy — use this entity's name? */
export function speaks(text: string, lower: string, entity: Entity): boolean {
  if (!needlesFor(entity).some((n) => lower.includes(n))) return false;
  return patternFor(entity).some((re) => re.test(text));
}
