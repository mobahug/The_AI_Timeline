import React from 'react';
import { NOW, accent, fade } from '../lib/data.js';
import { buildLine, readingOf, findingByNumber } from '../lib/spine.js';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, PHOTO_FILTER, PLACEHOLDER, frame, ink, micro, shell, sourceLink } from '../lib/styles.js';
import { Btn, CardTriple, Claim, Eyebrow, Link, NavRow, Ref, Reading, Section } from './kit.jsx';
import EvidenceStrip from './EvidenceStrip.jsx';
import OpenFile from './OpenFile.jsx';

/* One stretch of the line, in full. The lead card with its reasoning, every other
   entry from those years, and the strings that leave for later. */

/** A finding is referred to as `NN · Title` everywhere. */
const findingLabel = (r) => String(r.finding.n).padStart(2, '0') + ' · ' + r.finding.title;

export default function FindingView({ graph, route, navigate, onOpen, media }) {
  const line = buildLine(graph);
  const n = Number(route.finding) || 1;
  const finding = findingByNumber(n);
  const row = line.rows.find((r) => r.finding.n === n);

  if (!finding || !row) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no finding {route.finding}. The line has {line.rows.length}.</div>
        <Btn to={{ view: 'line' }}>← The line</Btn>
      </div>
    );
  }

  const prev = line.rows.find((r) => r.finding.n === n - 1);
  const next = line.rows.find((r) => r.finding.n === n + 1);
  const rest = row.cards.filter((e) => !row.lead || e.id !== row.lead.id);
  const shot = row.lead ? media(row.lead) : null;
  // The last stretch has no lead and lies past the present: it is the open file.
  const openFile = !row.lead && row.span.from > NOW;

  // The next finding is the one loud action on the page; the previous one stays quiet.
  const nav = (
    <NavRow
      up={[{ label: 'The line', to: { view: 'line' } }]}
      prev={prev && { label: findingLabel(prev), to: { view: 'finding', finding: String(prev.finding.n) } }}
      onward={next && { label: findingLabel(next), to: { view: 'finding', finding: String(next.finding.n) } }}
    />
  );

  return (
    <div style={shell('route')}>
      <div data-year={row.span.from} style={{ padding: '30px 0 0' }}>
        {nav}

        <div style={{ marginTop: 34, display: 'flex', gap: 'clamp(14px,3vw,26px)', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ font: '400 clamp(34px,5vw,58px)/1 ' + SERIF, color: ink(0.38), fontVariantNumeric: 'tabular-nums' }}>
            {String(finding.n).padStart(2, '0')}
          </span>
          <Eyebrow tier="section" as="span">
            {row.span.from}{row.span.to !== row.span.from ? ' — ' + row.span.to : ''}
          </Eyebrow>
        </div>

        <h1 style={{ margin: '10px 0 0', font: '400 clamp(30px,5.4vw,62px)/1.02 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance', maxWidth: '20ch' }}>
          {finding.title}
        </h1>
        <p style={{ margin: '18px 0 0', font: '400 clamp(14px,1.5vw,17px)/1.6 ' + SANS, color: ink(3), maxWidth: '56ch', textWrap: 'pretty' }}>
          {finding.blurb}
        </p>
        <p style={{ margin: '14px 0 0', font: '400 11.5px/1.75 ' + MONO, color: ink(4), maxWidth: '70ch', textWrap: 'pretty' }}>
          {readingOf(row)}
        </p>
      </div>

      {openFile && <OpenFile graph={graph} />}

      {row.lead && (
        <div style={{ marginTop: 40, paddingTop: 26, borderTop: RULE, display: 'flex', gap: 'clamp(16px,3vw,32px)', flexWrap: 'wrap' }}>
          <div style={{
            ...frame(row.lead.future), flex: '1 1 230px', minWidth: 0, maxWidth: 340, minHeight: 170,
            backgroundSize: shot && shot.img ? 'cover' : undefined, backgroundPosition: 'center',
            backgroundImage: shot && shot.img ? 'url(' + shot.img + ')' : PLACEHOLDER,
            filter: shot && shot.img ? PHOTO_FILTER : undefined
          }} />
          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Eyebrow tier="section" dim>The lead card</Eyebrow>
            <Link to={{ view: 'card', id: row.lead.id }}>
              <CardTriple event={row.lead} size="panel" as="h2" />
            </Link>
            <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: ink(3), maxWidth: '52ch', textWrap: 'pretty' }}>{row.lead.summary}</p>
            <Reading event={row.lead} maxWidth="48ch" />
            <EvidenceStrip event={row.lead} media={media} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* onOpen also clears the board's filter, which no route patch expresses. */}
              <Btn tone="loud" onClick={() => onOpen(row.lead.id)}>Open on the board →</Btn>
              {row.lead.url
                ? <a href={row.lead.url} target="_blank" rel="noopener" style={sourceLink}>{row.lead.source || 'Source'} ↗</a>
                : <span style={micro(5)}>No citation on this entry</span>}
            </div>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <Section eyebrow="Also in these years" count={rest.length + (rest.length === 1 ? ' entry' : ' entries')}>
          {rest.map((e) => {
            const linked = (graph.adjacency[e.id] || []).length;
            return (
              <button
                key={e.id}
                onClick={() => onOpen(e.id)}
                style={{
                  display: 'grid', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent',
                  gridTemplateColumns: 'clamp(46px,7vw,64px) minmax(0,1fr) auto', gap: 'clamp(10px,2vw,20px)',
                  alignItems: 'baseline', padding: '14px 2px', border: 'none', borderTop: ROW_RULE,
                  borderLeft: linked ? '2px solid ' + accent(e.category, fade(e.year)) : '2px dashed rgba(243,240,234,0.18)',
                  paddingLeft: 12
                }}
              >
                <span style={{ font: '400 12px/1.5 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', font: '400 clamp(15px,1.8vw,18px)/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em', textWrap: 'balance' }}>{e.title}</span>
                  <span style={{ display: 'block', marginTop: 4, font: '400 12.5px/1.55 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>{e.summary}</span>
                </span>
                <span style={{ ...micro(linked ? 4 : 5), whiteSpace: 'nowrap' }}>
                  {linked ? linked + (linked === 1 ? ' string' : ' strings') : 'no string'}
                </span>
              </button>
            );
          })}
        </Section>
      )}

      {row.leaving.length > 0 && (
        <Section eyebrow="What these years set up" count={row.leaving.length + (row.leaving.length === 1 ? ' string' : ' strings')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {row.leaving.map((l, i) => {
              const from = graph.index[l.from];
              const to = graph.index[l.to];
              if (!from || !to) return null;
              // The whole row is one link to the clue; the two references inside stay spans.
              return (
                <Link
                  key={i}
                  to={{ view: 'board', clue: { from: l.from, to: l.to } }}
                  style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '5px 10px',
                    borderLeft: '2px solid ' + accent(from.category, 0), paddingLeft: 13, paddingTop: 4, paddingBottom: 4
                  }}
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

      <Section>{nav}</Section>
    </div>
  );
}
