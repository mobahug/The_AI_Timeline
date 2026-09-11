import React from 'react';
import { accent, catLabel, fade } from '../lib/data.js';
import { buildLine, readingOf, findingByNumber } from '../lib/spine.js';
import { INK, MONO, SANS, SERIF, button, micro, tag } from '../lib/styles.js';

/* One stretch of the route, in full. The lead card with its reasoning, every other
   entry from those years, and the strings that leave for later. */

const SHELL = { maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px) 120px' };
const RULE = '1px solid rgba(243,240,234,0.12)';

const Claim = ({ children, tone }) => (
  <span style={{
    font: '400 10px/1.5 ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: tone || 'oklch(0.78 0.16 25)', whiteSpace: 'nowrap'
  }}>{children}</span>
);

export default function FindingView({ graph, route, navigate, onOpen, media }) {
  const line = buildLine(graph);
  const n = Number(route.finding) || 1;
  const finding = findingByNumber(n);
  const row = line.rows.find((r) => r.finding.n === n);

  if (!finding || !row) {
    return (
      <div style={SHELL}>
        <div style={{ padding: '80px 0', ...micro(0.4) }}>No finding {route.finding}.</div>
        <button onClick={() => navigate({ view: 'line', finding: null })} style={button()}>← The route</button>
      </div>
    );
  }

  const prev = line.rows.find((r) => r.finding.n === n - 1);
  const next = line.rows.find((r) => r.finding.n === n + 1);
  const rest = row.cards.filter((e) => !row.lead || e.id !== row.lead.id);
  const shot = row.lead ? media(row.lead) : null;

  const nav = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={() => navigate({ view: 'line', finding: null, id: null, clue: null })} style={button()}>← The route</button>
      <span style={{ flex: 1 }} />
      {prev && (
        <button onClick={() => navigate({ view: 'finding', finding: String(prev.finding.n) })} style={button()}>
          ← {String(prev.finding.n).padStart(2, '0')} {prev.finding.title}
        </button>
      )}
      {next && (
        <button onClick={() => navigate({ view: 'finding', finding: String(next.finding.n) })} style={button('loud')}>
          {String(next.finding.n).padStart(2, '0')} {next.finding.title} →
        </button>
      )}
    </div>
  );

  return (
    <div style={SHELL}>
      <div data-year={row.span.from} style={{ padding: '30px 0 0' }}>
        {nav}

        <div style={{ marginTop: 34, display: 'flex', gap: 'clamp(14px,3vw,26px)', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ font: '400 clamp(34px,5vw,58px)/1 ' + SERIF, color: 'rgba(243,240,234,0.3)', fontVariantNumeric: 'tabular-nums' }}>
            {String(finding.n).padStart(2, '0')}
          </span>
          <span style={{ ...micro(0.45), letterSpacing: '0.2em' }}>
            {row.span.from}{row.span.to !== row.span.from ? ' — ' + row.span.to : ''}
          </span>
        </div>

        <h1 style={{ margin: '10px 0 0', font: '400 clamp(30px,5.4vw,62px)/1.02 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance', maxWidth: '20ch' }}>
          {finding.title}
        </h1>
        <p style={{ margin: '18px 0 0', font: '400 clamp(14px,1.5vw,17px)/1.6 ' + SANS, color: 'rgba(243,240,234,0.66)', maxWidth: '56ch', textWrap: 'pretty' }}>
          {finding.blurb}
        </p>
        <p style={{ margin: '14px 0 0', font: '400 11.5px/1.75 ' + MONO, color: 'rgba(243,240,234,0.42)', maxWidth: '70ch', textWrap: 'pretty' }}>
          {readingOf(row)}
        </p>
      </div>

      {row.lead && (
        <div style={{ marginTop: 40, paddingTop: 26, borderTop: RULE, display: 'flex', gap: 'clamp(16px,3vw,32px)', flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 230px', minWidth: 0, maxWidth: 340, minHeight: 170, borderRadius: 3,
            border: '1px solid rgba(243,240,234,0.12)', backgroundColor: '#0e0e11',
            backgroundSize: shot && shot.img ? 'cover' : undefined, backgroundPosition: 'center',
            backgroundImage: shot && shot.img ? 'url(' + shot.img + ')' : 'repeating-linear-gradient(135deg,rgba(243,240,234,0.06) 0 6px,transparent 6px 12px)'
          }} />
          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...micro(0.32), letterSpacing: '0.2em' }}>The lead card</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: '400 clamp(24px,3vw,34px)/1 ' + SERIF, fontVariantNumeric: 'tabular-nums' }}>{row.lead.year}</span>
              <span style={tag(row.lead.category, accent)}>{catLabel(row.lead.category)}</span>
            </div>
            <button onClick={() => onOpen(row.lead.id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: '400 clamp(20px,2.6vw,30px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.025em', textWrap: 'balance' }}>
              {row.lead.title}
            </button>
            <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: 'rgba(243,240,234,0.64)', maxWidth: '52ch', textWrap: 'pretty' }}>{row.lead.summary}</p>
            {row.lead.why && (
              <p style={{ margin: 0, font: '400 15px/1.55 ' + SERIF, color: 'rgba(243,240,234,0.78)', maxWidth: '48ch', borderLeft: '2px solid ' + accent(row.lead.category, 0), paddingLeft: 14, textWrap: 'pretty' }}>
                {row.lead.why}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => onOpen(row.lead.id)} style={button('loud')}>Open on the board →</button>
              {row.lead.url
                ? <a href={row.lead.url} target="_blank" rel="noopener" style={{ ...micro(1), letterSpacing: '0.14em' }}>{row.lead.source || 'Source'} ↗</a>
                : <span style={micro(0.32)}>No citation on this entry</span>}
            </div>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <div style={{ ...micro(0.36), letterSpacing: '0.2em', paddingBottom: 12, borderBottom: RULE }}>
            Also in these years · {rest.length}
          </div>
          {rest.map((e) => {
            const f = fade(e.year);
            const linked = (graph.adjacency[e.id] || []).length;
            return (
              <button
                key={e.id}
                onClick={() => onOpen(e.id)}
                style={{
                  display: 'grid', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent',
                  gridTemplateColumns: 'clamp(46px,7vw,64px) minmax(0,1fr) auto', gap: 'clamp(10px,2vw,20px)',
                  alignItems: 'baseline', padding: '14px 2px', border: 'none', borderBottom: '1px solid rgba(243,240,234,0.08)',
                  borderLeft: linked ? '2px solid ' + accent(e.category, f) : '2px dashed rgba(243,240,234,0.18)',
                  paddingLeft: 12, opacity: 1 - f * 0.2
                }}
              >
                <span style={{ font: '400 12px/1.5 ' + MONO, color: 'rgba(243,240,234,0.44)', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', font: '400 clamp(15px,1.8vw,18px)/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em', textWrap: 'balance' }}>{e.title}</span>
                  <span style={{ display: 'block', marginTop: 4, font: '400 12.5px/1.55 ' + SANS, color: 'rgba(243,240,234,0.46)', maxWidth: '64ch', textWrap: 'pretty' }}>{e.summary}</span>
                </span>
                <span style={{ ...micro(linked ? 0.4 : 0.24), whiteSpace: 'nowrap' }}>
                  {linked ? linked + (linked === 1 ? ' string' : ' strings') : 'no string'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {row.leaving.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <div style={{ ...micro(0.36), letterSpacing: '0.2em', paddingBottom: 12, borderBottom: RULE }}>
            What these years set up · {row.leaving.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14 }}>
            {row.leaving.map((l, i) => {
              const from = graph.index[l.from];
              const to = graph.index[l.to];
              if (!from || !to) return null;
              return (
                <button
                  key={i}
                  onClick={() => navigate({ view: 'board', clue: { from: l.from, to: l.to }, id: null, finding: null })}
                  style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '5px 10px', width: '100%',
                    textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none',
                    borderLeft: '2px solid ' + accent(from.category, 0), paddingLeft: 13, paddingTop: 4, paddingBottom: 4
                  }}
                >
                  <span style={{ font: '400 15px/1.3 ' + SERIF, color: INK }}>
                    <span style={{ font: '400 11px/1 ' + MONO, color: 'rgba(243,240,234,0.45)', marginRight: 5 }}>{from.year}</span>{from.title}
                  </span>
                  <Claim tone={accent(from.category, 0)}>{l.claim} →</Claim>
                  <span style={{ font: '400 15px/1.3 ' + SERIF, color: INK }}>
                    <span style={{ font: '400 11px/1 ' + MONO, color: 'rgba(243,240,234,0.45)', marginRight: 5 }}>{to.year}</span>{to.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 48, paddingTop: 22, borderTop: RULE }}>{nav}</div>
    </div>
  );
}
