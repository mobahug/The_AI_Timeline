import React, { useEffect, useState } from 'react';
import { catLabel } from '../lib/data.js';
import { INK, SERIF, RISE, PHOTO_FILTER, PLACEHOLDER, frame, micro, shell } from '../lib/styles.js';
import { Link } from './kit.jsx';

/** All photographs, no prose. Landmarks run double width. */
export default function MosaicView({ items, media }) {
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
    <div style={{ ...shell('wide'), paddingTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 10 }}>
      {items.map((e) => {
        const shot = media(e);
        return (
          // A tile is a link to the card on the board, with the filter cleared so
          // the card is certain to be there.
          <Link
            key={e.id}
            to={{ view: 'board', id: e.id, category: 'all', query: '' }}
            data-year={e.year}
            style={{
              ...frame(e.future), position: 'relative', overflow: 'hidden', display: 'block',
              height: e.featured ? (wide ? 330 : 250) : 230, gridColumn: e.featured && wide ? 'span 2' : 'span 1',
              animation: RISE
            }}
          >
            {shot.img
              ? <img src={shot.img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: PHOTO_FILTER }} />
              : <div style={{ position: 'absolute', inset: 0, backgroundImage: PLACEHOLDER }} />}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg,rgba(10,10,11,0.05) 30%,rgba(10,10,11,0.88) 100%)' }} />
            <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '14px 15px 15px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...micro(0.9), letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                <span style={micro(5)}>{catLabel(e.category)}</span>
              </div>
              <div style={{ font: '400 ' + (e.featured ? 27 : 19) + 'px/1.12 ' + SERIF, letterSpacing: '-0.02em', color: INK, textWrap: 'balance' }}>{e.title}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
