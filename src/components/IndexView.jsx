import React from 'react';
import { ERAS, accent, catLabel, fade } from '../lib/data.js';
import { INK, MONO, SANS, SERIF, micro } from '../lib/styles.js';

/** The archive: everything, dense, no photographs. */
export default function IndexView({ items, onOpen }) {
  const rows = [];
  ERAS.forEach((era, i) => {
    const next = ERAS[i + 1] ? ERAS[i + 1].year : 9999;
    const chunk = items.filter((e) => e.year >= era.year && e.year < next);
    if (!chunk.length) return;
    rows.push({ era });
    chunk.forEach((event) => rows.push({ event }));
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '22px 32px 70px' }}>
      <div style={{ borderTop: '1px solid rgba(243,240,234,0.14)' }}>
        {rows.map((row, i) => {
          if (row.era) {
            return (
              <div key={'era' + i} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '46px 0 14px', flexWrap: 'wrap' }}>
                <div style={{ font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, letterSpacing: '-0.02em' }}>{row.era.title}</div>
                <div style={{ ...micro(0.36), letterSpacing: '0.2em' }}>{row.era.range}</div>
              </div>
            );
          }
          const e = row.event;
          const f = fade(e.year);
          return (
            <button
              key={e.id}
              type="button"
              data-year={e.year}
              onClick={() => onOpen(e.id)}
              style={{
                display: 'grid', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent',
                gridTemplateColumns: '72px minmax(0,1.1fr) minmax(0,1.5fr) auto', gap: 20, alignItems: 'baseline',
                padding: '13px 6px', border: 'none', borderBottom: '1px solid rgba(243,240,234,0.09)',
                borderLeft: e.future ? '2px dashed rgba(243,240,234,0.25)' : '2px solid transparent', opacity: 1 - f * 0.2
              }}
            >
              <div style={{ font: '400 12px/1.5 ' + MONO, color: 'rgba(243,240,234,0.42)', fontVariantNumeric: 'tabular-nums' }}>{e.year}</div>
              <div style={{ font: '400 17px/1.2 ' + SERIF, letterSpacing: '-0.015em', color: INK, textWrap: 'balance' }}>{e.title}</div>
              <div style={{ font: '400 12.5px/1.5 ' + SANS, color: 'rgba(243,240,234,0.45)', minWidth: 0, textWrap: 'pretty' }}>{e.summary}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                {e.confidence && <span style={{ ...micro(0.55), border: '1px dashed rgba(243,240,234,0.3)', borderRadius: 2, padding: '4px 7px' }}>{e.confidence}</span>}
                <span style={{ ...micro(1), color: accent(e.category, 0), border: '1px solid ' + accent(e.category, 0.55), borderRadius: 2, padding: '4px 7px' }}>{catLabel(e.category)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
