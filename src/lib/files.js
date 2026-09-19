import rawPeople from '../../data/people.json';
import rawOrgs from '../../data/orgs.json';
import rawTerms from '../../data/glossary.json';

/* The files: persons of interest, organisations and the glossary. A card names
   an entity either by id (`people`, `orgs`, `terms`) or simply by using its name
   in the text; both count as an appearance, so a reader following a name lands
   on every card that carries it without each one having been tagged by hand. */

export const PEOPLE = rawPeople.people.map((p) => ({ ...p, kind: 'person', label: p.name }));
export const ORGS = rawOrgs.orgs.map((o) => ({ ...o, kind: 'org', label: o.name }));
export const TERMS = rawTerms.terms.map((t) => ({ ...t, kind: 'term', label: t.term }));

export const personById = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const orgById = Object.fromEntries(ORGS.map((o) => [o.id, o]));
export const termById = Object.fromEntries(TERMS.map((t) => [t.id, t]));

const FIELD = { person: 'people', org: 'orgs', term: 'terms' };
const VIEW = { person: 'person', org: 'org', term: 'term' };

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One regex per entity, over its name and aliases. An alias with a capital
 *  letter is matched as written (Lean, RL, Clay); an all-lowercase alias is
 *  matched case-insensitively (winter, tokens). Whole words only. */
function patternOf(entity) {
  const names = [entity.label, ...(entity.aka || [])].filter(Boolean);
  const exact = names.filter((n) => /[A-Z]/.test(n));
  const loose = names.filter((n) => !/[A-Z]/.test(n));
  const parts = [];
  if (exact.length) parts.push(new RegExp('(^|[^\\p{L}\\p{N}])(' + exact.map(escapeRe).join('|') + ")(?![\\p{L}\\p{N}])", 'u'));
  if (loose.length) parts.push(new RegExp('(^|[^\\p{L}\\p{N}])(' + loose.map(escapeRe).join('|') + ")(?![\\p{L}\\p{N}])", 'iu'));
  return parts;
}

const patterns = new Map();
const patternFor = (entity) => {
  if (!patterns.has(entity.id + '|' + entity.kind)) patterns.set(entity.id + '|' + entity.kind, patternOf(entity));
  return patterns.get(entity.id + '|' + entity.kind);
};

/** The text of a card an entity can appear in: never its sources, whose text
 *  belongs to someone else. */
const textOf = (event) => [event.title, event.summary, event.why || '', ...(event.detail || [])].join('\n');

/** Does a card name this entity, by tag or by text? */
export function names(event, entity) {
  const tagged = event[FIELD[entity.kind]];
  if (Array.isArray(tagged) && tagged.includes(entity.id)) return true;
  const text = textOf(event);
  return patternFor(entity).some((re) => re.test(text));
}

/** Every entity a card names, grouped by kind, tagged ones first. */
export function entitiesOf(event) {
  const pick = (list) => {
    const tagged = list.filter((x) => Array.isArray(event[FIELD[x.kind]]) && event[FIELD[x.kind]].includes(x.id));
    const found = list.filter((x) => !tagged.includes(x) && names(event, x));
    return [...tagged, ...found];
  };
  return { people: pick(PEOPLE), orgs: pick(ORGS), terms: pick(TERMS) };
}

/** Every card that names an entity, in date order. */
export const appearancesOf = (graph, entity) => graph.all.filter((e) => names(e, entity));

/** The route to an entity's page. */
export const routeOf = (entity) => ({ view: VIEW[entity.kind], id: entity.id });

export const ALL_ENTITIES = [...PEOPLE, ...ORGS, ...TERMS];
export const entityById = (kind, id) => (kind === 'person' ? personById[id] : kind === 'org' ? orgById[id] : termById[id]) || null;
