import React from 'react';
import { NOW, forwardLedger } from '../lib/data.js';
import { INK, MONO, SANS, SERIF, micro } from '../lib/styles.js';

/* The open file. The route ends at the present, and past that the board holds two
   pages rather than more findings: where the case stands, and what it argues comes
   next. Both are derived from the same data; the numbers here are the same ones the
   pages open with. */

const RULE = '1px solid rgba(243,240,234,0.12)';

export default function OpenFile({ graph, navigate, compact }) {
  const fwd = forwardLedger(graph);
  const doors = [
    {
      view: 'case',
      eyebrow: 'Where it stands',
      title: 'The case as it stands',
      body: 'Why the present looks the way it does — the road here, what carries forward, and which parts of the record the board has never argued from.',
      figure: fwd.crossing + ' of ' + graph.edges.length + ' strings cross ' + NOW
    },
    {
      view: 'horizon',
      eyebrow: 'What comes next',
      title: 'The horizon',
      body: 'Every entry past ' + NOW + ' as three horizons — scenarios with a confidence, never a citation — and the strings, if any, that argue for each.',
      figure: fwd.argued + ' of ' + fwd.total + ' scenarios carry a string'
    }
  ];

  return (
    <div style={{ marginTop: compact ? 26 : 40, borderTop: RULE, paddingTop: compact ? 18 : 24 }}>
      <div style={{ ...micro(0.36), letterSpacing: '0.2em', marginBottom: 14 }}>The open file · two pages</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 'clamp(12px,2vw,20px)' }}>
        {doors.map((d) => (
          <button
            key={d.view}
            onClick={() => navigate({ view: d.view, id: null, clue: null, finding: null })}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', textAlign: 'left',
              cursor: 'pointer', background: 'rgba(243,240,234,0.035)', border: '1px solid rgba(243,240,234,0.1)',
              borderRadius: 3, padding: 'clamp(14px,2vw,20px)', minWidth: 0
            }}
          >
            <span style={{ ...micro(0.4), letterSpacing: '0.2em' }}>{d.eyebrow}</span>
            <span style={{ font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em', textWrap: 'balance' }}>{d.title} →</span>
            <span style={{ font: '400 13px/1.55 ' + SANS, color: 'rgba(243,240,234,0.58)', textWrap: 'pretty' }}>{d.body}</span>
            <span style={{ font: '400 11px/1.6 ' + MONO, color: 'rgba(243,240,234,0.4)', marginTop: 2 }}>{d.figure}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
