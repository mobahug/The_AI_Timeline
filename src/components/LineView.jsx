import React from 'react';
import { FIRST, NOW, accent, catLabel } from '../lib/data.js';
import { buildLine, readingOf } from '../lib/spine.js';
import { INK, MONO, RED, RED_LIT, SANS, SERIF, micro } from '../lib/styles.js';
import OpenFile from './OpenFile.jsx';

/* The route. One numbered pass through the case, oldest first, with every entry
   filed underneath by date. Nothing about a finding's contents is written down —
   the counts, the readings and the joints are all derived from the graph. */

const SHELL = { maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px) 140px' };
const RULE = '1px solid rgba(243,240,234,0.12)';

const Claim = ({ children, tone }) => (
  <span style={{
    font: '400 10px/1.5 ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: tone || 'oklch(0.78 0.16 25)', whiteSpace: 'nowrap'
  }}>{children}</span>
);

/** A worked example of the site's whole grammar, in one line, from real data. */
const Hop = ({ from, claim, to, onOpen }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 10px' }}>
    <button onClick={() => onOpen(from.id)} style={btnPlain}>
      <span style={yearBit}>{from.year}</span> {from.title}
    </button>
    <Claim>— {claim} →</Claim>
    <button onClick={() => onOpen(to.id)} style={btnPlain}>
      <span style={yearBit}>{to.year}</span> {to.title}
    </button>
  </div>
);

const btnPlain = {
  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
  font: '400 clamp(15px,1.7vw,19px)/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em'
};
const yearBit = { font: '400 11px/1 ' + MONO, color: 'rgba(243,240,234,0.45)', fontVariantNumeric: 'tabular-nums', marginRight: 5 };

export default function LineView({ graph, navigate, onOpen }) {
  const line = buildLine(graph);

  // The opening example is derived, not chosen: the first boundary-crossing string
  // that leaves a card the board already marks as significant.
  const opener = (() => {
    for (const j of line.joints) {
      for (const c of j.crossing) {
        const from = graph.index[c.from];
        const to = graph.index[c.to];
        if (from && to && from.featured) return { from, to, claim: c.claim };
      }
    }
    const j = line.joints.find((x) => x.crossing.length);
    if (!j) return null;
    const c = j.crossing[0];
    return { from: graph.index[c.from], to: graph.index[c.to], claim: c.claim };
  })();

  const argued = line.rows.filter((r) => r.kind === 'argued').length;
  const jointed = line.joints.filter((j) => j.crossing.length).length;

  return (
    <div style={SHELL}>
      <div data-year={FIRST} style={{ padding: '56px 0 0' }}>
        <div style={{ ...micro(0.4), letterSpacing: '0.24em', marginBottom: 18 }}>
          The route · {line.rows.length} findings · derived from the board
        </div>
        <h1 style={{ margin: 0, font: '400 clamp(32px,6.4vw,74px)/1.02 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance', maxWidth: '18ch' }}>
          How a machine that could not add became something governments argue about.
        </h1>
        <p style={{ margin: '20px 0 0', font: '400 clamp(14px,1.5vw,17px)/1.6 ' + SANS, color: 'rgba(243,240,234,0.66)', maxWidth: '54ch', textWrap: 'pretty' }}>
          Here is the order it happened in, and where the trail goes cold. Every arrow below is a
          claim someone wrote on the board that one event made another possible — read it as the
          argument, not as decoration.
        </p>

        {opener && (
          <div style={{ marginTop: 30, padding: '20px 0 0', borderTop: RULE }}>
            <div style={{ ...micro(0.34), letterSpacing: '0.2em', marginBottom: 12 }}>Like this</div>
            <Hop from={opener.from} claim={opener.claim} to={opener.to} onOpen={onOpen} />
          </div>
        )}

        <div style={{ marginTop: 26, ...micro(0.36), letterSpacing: '0.12em', textTransform: 'none', font: '400 11.5px/1.7 ' + MONO }}>
          {argued} of the {line.rows.length} findings carry an argument inside themselves ·
          {' '}{jointed} of the {line.joints.length} boundaries have a string crossing them ·
          {' '}the rest are said plainly rather than dressed up
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: '40px 0 0', padding: 0 }}>
        {line.rows.map((row, i) => {
          const f = row.finding;
          const joint = line.joints[i];
          const open = f.title === 'Still open';
          return (
            <li key={f.n}>
              <button
                onClick={() => navigate({ view: 'finding', finding: String(f.n), id: null, clue: null })}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: 'transparent', border: 'none', borderTop: RULE,
                  padding: 'clamp(22px,3vw,30px) 0'
                }}
              >
                <div style={{ display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 'none', width: 54 }}>
                    <div style={{ font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, color: open ? RED_LIT : 'rgba(243,240,234,0.32)', fontVariantNumeric: 'tabular-nums' }}>
                      {String(f.n).padStart(2, '0')}
                    </div>
                  </div>

                  <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ ...micro(0.42), letterSpacing: '0.2em' }}>
                      {row.span.from}{row.span.to !== row.span.from ? ' — ' + row.span.to : ''}
                    </div>
                    <h2 style={{ margin: 0, font: '400 clamp(21px,2.8vw,34px)/1.08 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>
                      {f.title}
                    </h2>
                    <p style={{ margin: 0, font: '400 clamp(13px,1.3vw,14.5px)/1.6 ' + SANS, color: 'rgba(243,240,234,0.6)', maxWidth: '58ch', textWrap: 'pretty' }}>
                      {f.blurb}
                    </p>
                    <p style={{ margin: '2px 0 0', font: '400 11.5px/1.7 ' + MONO, color: 'rgba(243,240,234,0.42)', maxWidth: '66ch', textWrap: 'pretty' }}>
                      {readingOf(row)}
                    </p>
                  </div>

                  <div style={{ flex: '0 1 210px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {row.lead && (
                      <>
                        <div style={{ ...micro(0.32), letterSpacing: '0.2em' }}>Led by</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent(row.lead.category, 0), display: 'inline-block' }} />
                          <span style={{ font: '400 15px/1.2 ' + SERIF, color: INK }}>{row.lead.title}</span>
                        </div>
                        <div style={micro(0.3)}>{row.lead.year} · {catLabel(row.lead.category)}</div>
                      </>
                    )}
                    <div style={{ ...micro(0.3), marginTop: row.lead ? 6 : 0 }}>
                      {row.cards.length} {row.cards.length === 1 ? 'entry' : 'entries'}
                      {row.kind === 'context' && ' · unargued'}
                    </div>
                  </div>
                </div>
              </button>

              {joint && (
                <div style={{ padding: '0 0 0 clamp(0px,4vw,54px)', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {joint.crossing.length ? joint.crossing.map((c, k) => {
                    const from = graph.index[c.from];
                    const to = graph.index[c.to];
                    if (!from || !to) return null;
                    return (
                      <div key={k} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                        <span style={{ flex: 'none', width: 1, alignSelf: 'stretch', minHeight: 22, background: accent(from.category, 0), opacity: 0.55 }} />
                        <div style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 9px', paddingBottom: 4 }}>
                          <button onClick={() => navigate({ view: 'board', clue: { from: c.from, to: c.to }, id: null })} style={{ ...btnPlain, font: '400 13.5px/1.4 ' + SERIF }}>
                            <span style={yearBit}>{from.year}</span>{from.title}
                          </button>
                          <Claim tone={accent(from.category, 0)}>{c.claim} →</Claim>
                          <button onClick={() => navigate({ view: 'board', clue: { from: c.from, to: c.to }, id: null })} style={{ ...btnPlain, font: '400 13.5px/1.4 ' + SERIF }}>
                            <span style={yearBit}>{to.year}</span>{to.title}
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ ...micro(0.26), letterSpacing: '0.2em', padding: '2px 0 6px' }}>
                      No string crosses here
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <OpenFile graph={graph} navigate={navigate} />

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(0.34), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        Everything after {NOW} is a scenario rather than a record. Where a boundary carries no
        string, the board has not argued that one stretch produced the next — only that one
        followed the other.
      </div>
    </div>
  );
}
