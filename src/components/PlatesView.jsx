import React from 'react';
import { ERAS, NOW, accent, catLabel, fade } from '../lib/data.js';
import { INK, MONO, SANS, SERIF, micro } from '../lib/styles.js';

/** Chronological, image-led. The reading view. */
export default function PlatesView({ items, media, onOpen }) {
  const rows = [];
  ERAS.forEach((era, i) => {
    const next = ERAS[i + 1] ? ERAS[i + 1].year : 9999;
    const chunk = items.filter((e) => e.year >= era.year && e.year < next);
    if (!chunk.length) return;
    rows.push({ era });
    chunk.forEach((event) => rows.push({ event }));
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px 60px' }}>
      {rows.map((row, i) => {
        if (row.era) {
          return (
            <div key={'era' + i} data-screen-label={row.era.title} style={{
              position: 'relative', padding: '96px 0 30px', marginTop: 26, overflow: 'hidden',
              borderTop: row.era.year > NOW ? '1px dashed rgba(243,240,234,0.28)' : '1px solid rgba(243,240,234,0.16)'
            }}>
              <div style={{
                position: 'absolute', right: -2, top: 34, font: '400 clamp(90px,17vw,240px)/0.8 ' + SERIF,
                letterSpacing: '-0.05em', color: 'transparent', WebkitTextStroke: '1px rgba(243,240,234,0.16)', pointerEvents: 'none'
              }}>{row.era.year}</div>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...micro(0.42), letterSpacing: '0.26em' }}>{row.era.range}</div>
                <div style={{ font: '400 clamp(34px,6vw,74px)/0.94 ' + SERIF, letterSpacing: '-0.03em' }}>{row.era.title}</div>
                <div style={{ font: '400 13.5px/1.55 ' + SANS, color: 'rgba(243,240,234,0.5)', maxWidth: '46ch', textWrap: 'pretty' }}>{row.era.subtitle}</div>
              </div>
            </div>
          );
        }

        const e = row.event;
        const f = fade(e.year);
        const shot = media(e);
        const featured = e.featured;
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onOpen(e.id)}
            style={{
              display: 'grid', width: '100%', textAlign: 'left', background: 'transparent', cursor: 'pointer',
              gridTemplateColumns: featured ? '110px minmax(0,1.35fr) minmax(0,1fr)' : '110px minmax(0,1fr) minmax(0,1.1fr)',
              gap: 30, alignItems: 'start', padding: featured ? '44px 0' : '30px 0',
              border: 'none', borderTop: e.future ? '1px dashed rgba(243,240,234,0.2)' : '1px solid rgba(243,240,234,0.11)',
              opacity: 1 - f * 0.22, animation: 'riseIn .5s cubic-bezier(.22,.7,.3,1) both'
            }}
          >
            <div>
              <div style={{ font: '400 ' + (featured ? 40 : 28) + 'px/1 ' + SERIF, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>{e.year}</div>
            </div>
            <div style={{
              position: 'relative', overflow: 'hidden', borderRadius: 3, height: featured ? 300 : 210, background: '#0e0e11',
              border: e.future ? '1px dashed rgba(243,240,234,0.22)' : '1px solid rgba(243,240,234,0.1)'
            }}>
              {shot.img
                ? <img src={shot.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'saturate(0.9) contrast(1.03)' }} />
                : <div style={{ width: '100%', height: '100%', backgroundImage: 'repeating-linear-gradient(135deg,rgba(243,240,234,0.06) 0 6px,transparent 6px 12px)' }} />}
              <div style={{
                position: 'absolute', left: 10, bottom: 10, ...micro(0.7), letterSpacing: '0.16em', maxWidth: 'calc(100% - 20px)',
                background: 'rgba(10,10,11,0.6)', backdropFilter: 'blur(6px)', padding: '5px 7px', borderRadius: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {shot.img ? (shot.borrowed ? 'Wikimedia · ' + shot.borrowed.replace(/\s*\([^)]*\)/g, '') : 'Wikimedia') : e.future ? 'Projected' : 'No photo on file'}
              </div>
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid ' + accent(e.category, f), background: e.future ? 'transparent' : accent(e.category, f) }} />
                <span style={{ ...micro(1), color: accent(e.category, 0), border: '1px solid ' + accent(e.category, 0.55), borderRadius: 2, padding: '4px 7px' }}>{catLabel(e.category)}</span>
                {e.confidence && <span style={{ ...micro(0.55), border: '1px dashed rgba(243,240,234,0.3)', borderRadius: 2, padding: '4px 7px' }}>{e.confidence}</span>}
              </div>
              <h3 style={{ margin: 0, color: INK, font: '400 ' + (featured ? 'clamp(30px,3.6vw,46px)' : 'clamp(22px,2.3vw,29px)') + '/1.04 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance' }}>{e.title}</h3>
              <p style={{ margin: 0, font: '400 14.5px/1.6 ' + SANS, color: 'rgba(243,240,234,0.58)', maxWidth: '56ch', textWrap: 'pretty' }}>{e.summary}</p>
              <div style={{ ...micro(0.3), letterSpacing: '0.16em' }}>Open on the board →</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
