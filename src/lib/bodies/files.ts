import people from '../../../data/people.json?bodies';
import orgs from '../../../data/orgs.json?bodies';
import terms from '../../../data/glossary.json?bodies';
import { describeWith } from '../meta';
import type { Entity } from '../types';

/* What a name's own page says of it at length: a person's or an
   organisation's bio, a term's definition. Every page lists a name from its
   head (files.ts); only the name's page prints this, and brings it in its
   chunk (components/viewChunks.ts). */

const BODY: Record<string, string> = Object.fromEntries([
  ...people.people.map((p) => ['person/' + p.id, p.bio]),
  ...orgs.orgs.map((o) => ['org/' + o.id, o.bio]),
  ...terms.terms.map((t) => ['term/' + t.id, t.definition])
]);

/** A name's body: a person's or an organisation's bio, a term's definition. */
export const bodyOf = (entity: Pick<Entity, 'kind' | 'id'>): string => BODY[entity.kind + '/' + entity.id] || '';

// A name's page is described with its body (meta.ts).
describeWith({ body: bodyOf });
