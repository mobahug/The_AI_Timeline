import { describe, it, expect } from 'vitest';
import { PEOPLE, ORGS, TERMS, ALL_ENTITIES, byUse, coOccurring, names, entitiesOf, appearancesOf, entityById } from '../src/lib/files';
import { buildGraph, events } from '../src/lib/data';
import type { Entity, Event } from '../src/lib/types';

const graph = buildGraph(null as unknown as undefined);
const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('the files', () => {
  it('have unique kebab-case ids within each kind, and the fields their pages need', () => {
    [PEOPLE, ORGS, TERMS].forEach((list) => {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(id).toMatch(kebab));
    });
    PEOPLE.forEach((p) => { expect(p.name).toBeTruthy(); expect(p.role).toBeTruthy(); expect(p.bio.length).toBeGreaterThan(40); });
    ORGS.forEach((o) => { expect(o.name).toBeTruthy(); expect(o.bio.length).toBeGreaterThan(40); });
    TERMS.forEach((t) => { expect(t.term).toBeTruthy(); expect(t.short).toBeTruthy(); expect(t.definition.length).toBeGreaterThan(60); });
  });

  it('keeps ordinary words out of the aliases', () => {
    const ordinary = new Set(['the', 'a', 'model', 'models', 'data', 'test', 'tests', 'game', 'ai', 'search', 'silver', 'brown']);
    ALL_ENTITIES.forEach((x) => (x.aka || []).forEach((a) => {
      expect(ordinary.has(a.toLowerCase()), x.id + ' aka ' + a).toBe(false);
      expect(a.length).toBeGreaterThan(1);
    }));
  });

  it('resolves every tag on every card to an entity that exists', () => {
    events.forEach((e) => {
      (e.people || []).forEach((id) => expect(entityById('person', id), e.id + ' people ' + id).toBeTruthy());
      (e.orgs || []).forEach((id) => expect(entityById('org', id), e.id + ' orgs ' + id).toBeTruthy());
      (e.terms || []).forEach((id) => expect(entityById('term', id), e.id + ' terms ' + id).toBeTruthy());
    });
  });

  it('finds a name by tag and by text, whole words only, and never in a source', () => {
    const hinton = entityById('person', 'geoffrey-hinton') as Entity;
    expect(names({ title: 'Hinton leaves Google', summary: '', why: '' } as Event, hinton)).toBe(true);
    expect(names({ title: 'x', summary: 'Hintonism is not a word', why: '' } as Event, hinton)).toBe(false);
    expect(names({ title: 'x', summary: '', why: '', people: ['geoffrey-hinton'] } as Event, hinton)).toBe(true);
    expect(names({ title: 'x', summary: '', why: '', sources: [{ quote: 'Hinton said' }] } as Event, hinton)).toBe(false);
    const lean = entityById('term', 'formal-verification') as Entity;
    expect(names({ title: 'x', summary: 'checked in Lean', why: '' } as Event, lean)).toBe(true);
    expect(names({ title: 'x', summary: 'a lean startup', why: '' } as Event, lean)).toBe(false);
    const winter = entityById('term', 'ai-winter') as Entity;
    expect(names({ title: 'x', summary: 'The first AI Winter', why: '' } as Event, winter)).toBe(true);
  });

  it('leaves few names without a card, and gives the busiest their due', () => {
    const empty = ALL_ENTITIES.filter((x) => !appearancesOf(graph, x).length);
    expect(empty.length, 'unused: ' + empty.map((x) => x.id).join(', ')).toBeLessThanOrEqual(6);
    expect(appearancesOf(graph, entityById('org', 'openai') as Entity).length).toBeGreaterThan(10);
    expect(appearancesOf(graph, entityById('person', 'geoffrey-hinton') as Entity).length).toBeGreaterThan(4);
  });

  it('groups a card\'s names by kind, tagged first', () => {
    const e = graph.index['the-boat-that-would-not-finish'];
    const n = entitiesOf(e);
    expect(n.orgs[0].id).toBe('openai');
    expect(n.terms.map((t) => t.id)).toContain('reward-hacking');
  });
});

/* Who else the board has put on these cards. Nothing here is authored: two
   names are related because a card names both, which the board has already
   said in `people`, `orgs` and `terms` and again wherever a card's own text
   uses a name it did not trouble to tag. */
describe('co-occurrence', () => {
  const person = (id: string) => PEOPLE.find((p) => p.id === id)!;
  const org = (id: string) => ORGS.find((o) => o.id === id)!;

  it('finds the names a person shares a card with', () => {
    const rows = coOccurring(graph, person('geoffrey-hinton'), ['person', 'org']);
    expect(rows.length).toBeGreaterThan(0);
    // Google is on more of Hinton's cards than anything else the board names.
    expect(rows[0].cards).toBeGreaterThanOrEqual(rows[rows.length - 1].cards);
    expect(rows.map((r) => r.entity.id)).toContain('google');
  });

  it('never counts an entity against itself', () => {
    const rows = coOccurring(graph, org('openai'), ['person', 'org']);
    expect(rows.find((r) => r.entity.kind === 'org' && r.entity.id === 'openai')).toBeUndefined();
  });

  it('gives a single-card name somewhere to go', () => {
    const lonely = PEOPLE.filter((p) => appearancesOf(graph, p).length === 1);
    expect(lonely.length).toBeGreaterThan(0);
    const stranded = lonely.filter((p) => coOccurring(graph, p, ['person', 'org', 'term']).length === 0);
    expect(stranded.map((p) => p.id)).toEqual([]);
  });

  it('orders people and organisations by how much of the board they are on', () => {
    const ordered = byUse(graph, PEOPLE);
    const counts = ordered.map((p) => appearancesOf(graph, p).length);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});
