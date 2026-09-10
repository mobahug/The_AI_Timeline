import React, { useEffect, useState } from 'react';
import { accent, catLabel, fade } from '../lib/data.js';
import { INK, SERIF, micro } from '../lib/styles.js';

/** All photographs, no prose. Landmarks run double width. */
export default function MosaicView({ items, media, onOpen }) {
  // A landmark spans two columns — but only once there are two columns to span.
  // Below that it overflows the grid, which is what it used to do on a phone.
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 560 : true));
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 560);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '22px clamp(14px,4vw,32px) 70px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 10 }}>
      {items.map((e) => {
        const shot = media(e);
        const f = fade(e.year);
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onOpen(e.id)}
            style={{
              position: 'relative', overflow: 'hidden', borderRadius: 3, cursor: 'pointer', padding: 0, textAlign: 'left',
              height: e.featured ? (wide ? 330 : 250) : 230, gridColumn: e.featured && wide ? 'span 2' : 'span 1', background: '#0e0e11',
              border: e.future ? '1px dashed rgba(243,240,234,0.22)' : '1px solid rgba(243,240,234,0.1)',
              opacity: 1 - f * 0.2, animation: 'riseIn .45s both'
            }}
          >
            {shot.img
              ? <img src={shot.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85) contrast(1.05)' }} />
              : <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg,rgba(243,240,234,0.06) 0 6px,transparent 6px 12px)' }} />}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg,rgba(10,10,11,0.05) 30%,rgba(10,10,11,0.88) 100%)' }} />
            <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '14px 15px 15px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid ' + accent(e.category, f), background: e.future ? 'transparent' : accent(e.category, f) }} />
                <span style={{ ...micro(0.9), letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                <span style={micro(0.45)}>{catLabel(e.category)}</span>
              </div>
              <div style={{ font: '400 ' + (e.featured ? 27 : 19) + 'px/1.12 ' + SERIF, letterSpacing: '-0.02em', color: INK, textWrap: 'balance' }}>{e.title}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
