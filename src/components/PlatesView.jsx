import React from 'react';
import { NOW, accent, catLabel, groupByEra } from '../lib/data.js';
import {
  INK, SANS, SERIF, RULE, ROW_RULE, DASHED_RULE, DASHED_ROW, RISE, PHOTO_FILTER, PLACEHOLDER,
  badge, frame, ink, micro, shell, tag
} from '../lib/styles.js';
import { Eyebrow, Link } from './kit.jsx';

/** Chronological, image-led. The reading view. */
export default function PlatesView({ items, media }) {
  return (
    <div style={shell('wide')}>
      {groupByEra(items).map(({ era, items: chunk }) => (
        <React.Fragment key={era.year}>
          <div data-year={era.year} style={{
            position: 'relative', padding: '96px 0 30px', marginTop: 26, overflow: 'hidden',
            borderTop: era.year > NOW ? DASHED_RULE : RULE
          }}>
            <div aria-hidden="true" style={{
              position: 'absolute', right: -2, top: 34, font: '400 clamp(90px,17vw,240px)/0.8 ' + SERIF,
              letterSpacing: '-0.05em', color: 'transparent', WebkitTextStroke: '1px rgba(243,240,234,0.12)', pointerEvents: 'none'
            }}>{era.year}</div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Eyebrow tier="section" dim>{era.range}</Eyebrow>
              <div style={{ font: '400 clamp(34px,6vw,74px)/0.94 ' + SERIF, letterSpacing: '-0.03em' }}>{era.title}</div>
              <div style={{ font: '400 13.5px/1.55 ' + SANS, color: ink(5), maxWidth: '46ch', textWrap: 'pretty' }}>{era.subtitle}</div>
            </div>
          </div>

          {chunk.map((e) => {
            const shot = media(e);
            const featured = e.featured;
            return (
              // A plate is a link to the card on the board, with the filter cleared so
              // the card is certain to be there. It wraps rather than gridding: on a
              // desk the year, the photograph and the text share one line; on a phone
              // the photograph runs full width and the text follows under it.
              <Link
                key={e.id}
                to={{ view: 'board', id: e.id, category: 'all', query: '' }}
                className="ix-row"
                data-year={e.year}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '18px 30px', alignItems: 'flex-start',
                  padding: featured ? '44px 0' : '30px 0',
                  borderTop: e.future ? DASHED_ROW : ROW_RULE, animation: RISE
                }}
              >
                <div style={{ flex: '0 0 110px', font: '400 ' + (featured ? 40 : 28) + 'px/1 ' + SERIF, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{e.year}</div>
                <div style={{ ...frame(e.future), flex: featured ? '1.35 1 260px' : '1 1 260px', minWidth: 0, position: 'relative', overflow: 'hidden', height: featured ? 300 : 210 }}>
                  {shot.img
                    ? <img src={shot.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: PHOTO_FILTER }} />
                    : <div style={{ width: '100%', height: '100%', backgroundImage: PLACEHOLDER }} />}
                  <div style={{
                    position: 'absolute', left: 10, bottom: 10, ...micro(3), maxWidth: 'calc(100% - 20px)',
                    background: 'rgba(10,10,11,0.6)', backdropFilter: 'blur(6px)', padding: '5px 7px', borderRadius: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {shot.img ? (shot.borrowed ? 'Wikimedia · ' + shot.borrowed.replace(/\s*\([^)]*\)/g, '') : 'Wikimedia') : e.future ? 'No photo — scenario' : 'No photo on file'}
                  </div>
                </div>
                <div style={{ flex: featured ? '1 1 260px' : '1.1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={tag(e.category, accent)}>{catLabel(e.category)}</span>
                    {e.confidence && <span style={badge()}>{e.confidence}</span>}
                  </div>
                  <h3 style={{ margin: 0, color: INK, font: '400 ' + (featured ? 'clamp(30px,3.6vw,46px)' : 'clamp(22px,2.3vw,29px)') + '/1.04 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance' }}>{e.title}</h3>
                  <p style={{ margin: 0, font: '400 14.5px/1.6 ' + SANS, color: ink(4), maxWidth: '56ch', textWrap: 'pretty' }}>{e.summary}</p>
                  <div style={micro(5)}>Open on the board →</div>
                </div>
              </Link>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
