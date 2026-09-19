import React, { useMemo } from 'react';
import { accent, catLabel, fade } from '../lib/data.js';
import { PEOPLE, ORGS, TERMS, entityById, appearancesOf } from '../lib/files.js';
import { leadsOf } from '../lib/leads.js';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, badge, ink, micro, shell } from '../lib/styles.js';
import { Btn, Claim, CopyLink, Eyebrow, Link, NavRow, Ref, Section } from './kit.jsx';

/* One entity — a person, an organisation or a term — and its trail across the
   board: every card that names it, in date order, and every string that runs
   between two of those cards. The page is the reason a reader never has to
   leave for an encyclopaedia: what the board knows about a name is here. */

const KIND_LABEL = { person: 'Person of interest', org: 'Organisation', term: 'Term' };
const LIST = { person: PEOPLE, org: ORGS, term: TERMS };
const INDEX_VIEW = { person: 'files', org: 'files', term: 'glossary' };
const INDEX_LABEL = { person: 'The files', org: 'The files', term: 'The glossary' };

function EntityView({ graph, route }) {
  const kind = route.view;
  const entity = entityById(kind, route.id);
  const cards = useMemo(() => (entity ? appearancesOf(graph, entity) : []), [graph, entity]);
  const ids = useMemo(() => new Set(cards.map((e) => e.id)), [cards]);
  const between = useMemo(() => graph.edges.filter((l) => ids.has(l.from) && ids.has(l.to)), [graph.edges, ids]);
  const leads = useMemo(() => {
    const seen = new Map();
    cards.forEach((e) => leadsOf(e.id).forEach(({ lead }) => {
      const row = seen.get(lead.id) || { lead, n: 0 };
      row.n += 1;
      seen.set(lead.id, row);
    }));
    return [...seen.values()].sort((a, b) => b.n - a.n);
  }, [cards]);

  if (!entity) {
    return (
      <div style={shell('read')}>
        <div style={{ padding: '30px 0 0' }}>
          <p role="status" style={{ margin: '0 0 18px', ...micro(5) }}>Nothing on file under “{route.id}”.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn to={{ view: INDEX_VIEW[kind] || 'files' }}>← {INDEX_LABEL[kind] || 'The files'}</Btn>
            <Btn to={{ view: 'board' }}>The board</Btn>
          </div>
        </div>
      </div>
    );
  }

  const list = LIST[kind];
  const i = list.findIndex((x) => x.id === entity.id);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i < list.length - 1 ? list[i + 1] : null;
  const first = cards[0];
  const last = cards[cards.length - 1];

  const nav = (
    <NavRow
      up={[{ label: INDEX_LABEL[kind], to: { view: INDEX_VIEW[kind] } }]}
      prev={prev && { label: prev.label, to: { view: kind, id: prev.id } }}
      next={next && { label: next.label, to: { view: kind, id: next.id } }}
    />
  );

  return (
    <div style={shell('read')}>
      <div data-year={first ? first.year : undefined} style={{ padding: '30px 0 0' }}>
        {nav}
        <Eyebrow tier="page" dim style={{ margin: '34px 0 14px' }}>
          {KIND_LABEL[kind]}{first ? ' · on the board ' + first.year + (last && last.year !== first.year ? ' — ' + last.year : '') : ' · not yet on a card'}
        </Eyebrow>
        <h1 tabIndex={-1} style={{ margin: 0, outline: 'none', font: '400 clamp(32px,5.6vw,64px)/1.02 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance', maxWidth: '18ch' }}>
          {entity.label}
        </h1>
        {(entity.role || entity.short) && (
          <p style={{ margin: '14px 0 0', font: '400 clamp(14px,1.5vw,17px)/1.5 ' + SANS, color: ink(3), maxWidth: '56ch', textWrap: 'pretty' }}>{entity.role || entity.short}</p>
        )}
        <p style={{ margin: '18px 0 0', font: '400 clamp(15px,1.6vw,18px)/1.6 ' + SERIF, color: ink(2), maxWidth: '58ch', textWrap: 'pretty', borderLeft: '2px solid ' + (kind === 'person' ? 'oklch(0.8 0.12 85)' : kind === 'org' ? 'oklch(0.8 0.1 205)' : 'rgba(243,240,234,0.35)'), paddingLeft: 14 }}>
          {entity.bio || entity.definition}
        </p>
        {entity.aka && entity.aka.length > 0 && (
          <div style={{ ...micro(5), marginTop: 14, textTransform: 'none', letterSpacing: '0.06em' }}>Also as: {entity.aka.join(' · ')}</div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          {first && <Btn tone="loud" to={{ view: 'board', id: first.id, category: 'all', query: '' }}>Open the first card on the board →</Btn>}
          <CopyLink />
        </div>
      </div>

      <Section id="cards" eyebrow="On the board" title="Every card that carries the name" count={cards.length + (cards.length === 1 ? ' card' : ' cards')}>
        {cards.length ? cards.map((e) => {
          const linked = (graph.adjacency[e.id] || []).length;
          return (
            <Link
              key={e.id}
              to={{ view: 'card', id: e.id }}
              className="ix-row"
              data-year={e.year}
              style={{
                display: 'grid', gridTemplateColumns: 'clamp(46px,7vw,64px) minmax(0,1fr) auto', gap: 'clamp(10px,2vw,20px)',
                alignItems: 'baseline', padding: '14px 2px', borderTop: ROW_RULE,
                borderLeft: e.future ? '2px dashed rgba(243,240,234,0.25)' : '2px solid ' + accent(e.category, fade(e.year)),
                paddingLeft: 12
              }}
            >
              <span style={{ font: '400 12px/1.5 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', font: '400 clamp(15px,1.8vw,18px)/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em', textWrap: 'balance' }}>{e.title}</span>
                <span style={{ display: 'block', marginTop: 4, font: '400 12.5px/1.55 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>{e.summary}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={micro(5)}>{catLabel(e.category)}</span>
                {e.confidence && <span style={badge()}>{e.confidence}</span>}
                <span style={{ ...micro(linked ? 4 : 5), whiteSpace: 'nowrap' }}>{linked ? linked + (linked === 1 ? ' string' : ' strings') : 'no string'}</span>
              </span>
            </Link>
          );
        }) : <div style={micro(5)}>No card on the board names this yet.</div>}
      </Section>

      {between.length > 0 && (
        <Section id="strings" eyebrow="Strings between these cards" title="The trail, in the board's words" count={between.length + (between.length === 1 ? ' string' : ' strings')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {between.map((l, k) => {
              const from = graph.index[l.from];
              const to = graph.index[l.to];
              return (
                <Link
                  key={k}
                  to={{ view: 'board', clue: { from: l.from, to: l.to } }}
                  className="ix-row"
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '5px 10px', borderLeft: '2px solid ' + accent(from.category, 0), paddingLeft: 13, paddingTop: 4, paddingBottom: 4 }}
                >
                  <Ref event={from} />
                  <Claim tone={accent(from.category, 0)}>{l.claim}</Claim>
                  <Ref event={to} />
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {leads.length > 0 && (
        <Section id="leads" eyebrow="Leads" title="Lines of inquiry this name is on">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leads.map(({ lead, n }) => (
              <Link key={lead.id} to={{ view: 'lead', id: lead.id }} className="ix-ref" style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ font: '400 17px/1.25 ' + SERIF, color: INK }}>{lead.title} →</span>
                <span style={micro(5)}>{n} {n === 1 ? 'rung' : 'rungs'}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        This page is derived: the cards are every card whose own text names {entity.label}, and the strings are the ones already drawn between them. Nothing here is written about {entity.label} that a card does not say.
      </div>
    </div>
  );
}

export default React.memo(EntityView);
