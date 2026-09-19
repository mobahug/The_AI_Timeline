import React, { useMemo } from 'react';
import { PEOPLE, ORGS, TERMS, appearancesOf } from '../lib/files';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, ink, micro, shell } from '../lib/styles';
import { Anchor, Btn, Eyebrow, Link, PageHead, Section } from './kit';
import type { ReactNode } from 'react';
import type { Entity, Event, Graph } from '../lib/types';

/* The files: every name on the board, and every card it appears on. Three
   drawers — persons of interest, organisations, the glossary — each a list in
   order of how often the name comes up, so the most-connected are on top. */

const withCounts = <T extends Entity>(graph: Graph, list: T[]): { entity: T; cards: Event[] }[] => list
  .map((x) => ({ entity: x, cards: appearancesOf(graph, x) }))
  .sort((a, b) => b.cards.length - a.cards.length || a.entity.label.localeCompare(b.entity.label));

/** One row of a drawer: the name, the one-liner, the count. */
const Row = ({ entity, cards, sub }: { entity: Entity; cards: Event[]; sub?: ReactNode }) => (
  <Link
    to={{ view: entity.kind, id: entity.id }}
    className="ix-row"
    style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline', padding: '11px 4px', borderBottom: ROW_RULE }}
  >
    <span style={{ flex: '0 1 220px', minWidth: 0, font: '400 16px/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>{entity.label}</span>
    <span style={{ flex: '1 1 260px', minWidth: 0, font: '400 12.5px/1.5 ' + SANS, color: ink(4), textWrap: 'pretty' }}>{sub}</span>
    <span style={{ flex: '0 0 auto', marginLeft: 'auto', ...micro(cards.length ? 4 : 5), whiteSpace: 'nowrap' }}>
      {cards.length ? cards.length + (cards.length === 1 ? ' card' : ' cards') : 'no card yet'}
    </span>
  </Link>
);

export interface FilesViewProps { graph: Graph }

function FilesView({ graph }: FilesViewProps) {
  const people = useMemo(() => withCounts(graph, PEOPLE), [graph]);
  const orgs = useMemo(() => withCounts(graph, ORGS), [graph]);
  const terms = useMemo(() => withCounts(graph, TERMS), [graph]);

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'The files · ' + PEOPLE.length + ' people · ' + ORGS.length + ' organisations · ' + TERMS.length + ' terms'}
        title="Every name on the board."
        lede="A name is a way in. Open a person, an organisation or a term to see every card that carries it, in date order, and the strings between those cards — without leaving the site for an encyclopaedia."
        h1Style={{ font: '400 clamp(34px,6vw,72px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      />

      <Section id="people" eyebrow="Persons of interest" title="People" count={PEOPLE.length + ' on file'}>
        <div style={{ borderTop: RULE }}>
          {people.map(({ entity, cards }) => <Row key={entity.id} entity={entity} cards={cards} sub={entity.role} />)}
        </div>
      </Section>

      <Section id="orgs" eyebrow="Organisations" title="Labs, companies, bodies" count={ORGS.length + ' on file'}>
        <div style={{ borderTop: RULE }}>
          {orgs.map(({ entity, cards }) => <Row key={entity.id} entity={entity} cards={cards} sub={entity.role} />)}
        </div>
      </Section>

      <Section id="glossary" eyebrow="The glossary" title="Terms" count={TERMS.length + ' defined'}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <Btn to={{ view: 'glossary' }}>The glossary, alphabetical →</Btn>
          <span style={micro(5)}>below: by how often the board uses the term</span>
        </div>
        <div style={{ borderTop: RULE }}>
          {terms.slice(0, 20).map(({ entity, cards }) => <Row key={entity.id} entity={entity} cards={cards} sub={entity.short} />)}
        </div>
        {terms.length > 20 && (
          <div style={{ marginTop: 14 }}>
            <Btn size="sm" tone="dim" to={{ view: 'glossary' }}>All {TERMS.length} terms →</Btn>
          </div>
        )}
      </Section>

      <div style={{ borderTop: RULE, marginTop: 44, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        A card counts as carrying a name if the card is tagged with it or if the name appears in the card's own text.
        Quoted sources are never searched — their words belong to someone else.
      </div>
    </div>
  );
}

export default React.memo(FilesView);
