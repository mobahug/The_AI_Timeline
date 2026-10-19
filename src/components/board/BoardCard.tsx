import React from 'react';
import { accent, catHue, catLabel, fade } from '../../lib/data';
import { CARD_PHOTO_FILTER, DUR, EASE, MANILA, MONO, PAPER, RED, SERIF, paperInk } from '../../lib/styles';
import type { Event, Metrics, Node } from '../../lib/types';

/** Whether an element is a card on the wall. */
export const isCard = (t: EventTarget | null): t is HTMLElement => t instanceof HTMLElement && !!t.dataset.card;

/* One card on the cork. Memoised on plain values, so a scroll, a drag frame or a
   hover elsewhere on the board does not reconcile it: only the card whose own
   lit / subject / raised state flipped renders again. */
export interface CardProps {
  node: Node;
  m: Metrics;
  img: string;
  lit: boolean;
  subject: boolean;
  raised: boolean;
  hoverable: boolean;
  /** The wall's one Tab stop. Every other card is reached by the arrow keys. */
  tabbable: boolean;
  /** The top of the card's lane, which holds it. */
  laneTop: number;
  onClick: (e: Event) => void;
  onHover: (id: string | null) => void;
  onFocusCard: (id: string) => void;
}
export const Card = React.memo(function Card({ node, m, img, lit, subject, raised, hoverable, tabbable, laneTop, onClick, onHover, onFocusCard }: CardProps) {
  const e = node.event;
  const f = fade(e.year);
  return (
    <button
      type="button"
      id={'card-' + e.id}
      data-card={e.id}
      tabIndex={tabbable ? 0 : -1}
      aria-label={e.year + ', ' + catLabel(e.category) + ', ' + e.title}
      onClick={() => onClick(e)}
      onFocus={() => { onFocusCard(e.id); if (hoverable) onHover(e.id); }}
      // Focus going on to the next card leaves the preview to that card's own
      // focus, rather than clearing it in between.
      onBlur={(ev) => { if (hoverable && !isCard(ev.relatedTarget)) onHover(null); }}
      onMouseEnter={() => hoverable && onHover(e.id)}
      onMouseLeave={() => hoverable && onHover(null)}
      style={{
        position: 'absolute', left: node.x - m.cardW / 2, top: node.top - laneTop, width: m.cardW, height: m.cardH,
        padding: 0, border: 'none', background: 'transparent', textAlign: 'left', boxSizing: 'border-box',
        cursor: 'pointer',
        transform: 'rotate(' + node.tilt + 'deg) scale(' + (raised ? 1.05 : 1) + ')',
        transformOrigin: '50% 0%', transition: 'transform ' + DUR.move + 'ms ' + EASE + ', opacity ' + DUR.move + 'ms ' + EASE,
        opacity: lit ? 1 : 0.2, zIndex: raised ? 12 : 2
      }}
    >
      <span style={{
        display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box',
        width: '100%', height: '100%', overflow: 'hidden',
        background: e.future ? MANILA : PAPER, borderRadius: 1,
        padding: m.k < 0.6 ? '5px 6px 6px' : '7px 7px 8px',
        border: e.future ? '1px dashed rgba(23,22,26,0.4)' : '1px solid rgba(23,22,26,0.16)',
        boxShadow: (subject ? '0 0 0 2px ' + RED + ', ' : '') + '0 10px 20px rgba(0,0,0,0.5)'
      }}>
        <span style={{
          position: 'absolute', left: '50%', top: 2, marginLeft: -5, width: 10, height: 10, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, oklch(0.9 0.05 ' + catHue(e.category) + '), ' + accent(e.category, f) + ')',
          border: '1px solid rgba(0,0,0,0.35)', boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2
        }} />
        {m.side ? (
          // A short card: the text on the left, the photograph a square on the right.
          <span style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
              <span style={{ flex: 'none', display: 'block', font: '500 8.5px/1 ' + MONO, letterSpacing: '0.14em', color: paperInk(0.72), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
              <span style={{
                flex: '1 1 auto', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                WebkitLineClamp: m.titleLines, overflow: 'hidden', marginTop: 3,
                font: '400 ' + m.titlePx + 'px/1.14 ' + SERIF, color: '#17161a'
              }}>{e.title}</span>
            </span>
            {img ? (
              <img src={img} alt="" crossOrigin="anonymous" loading="lazy" decoding="async" style={{ flex: 'none', width: m.thumb, height: m.thumb, objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: CARD_PHOTO_FILTER }} />
            ) : (
              <span aria-hidden="true" style={{
                flex: 'none', width: m.thumb, height: m.thumb, border: '1px solid rgba(23,22,26,0.22)',
                background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)'
              }} />
            )}
          </span>
        ) : (<>
        {m.photo && (img ? (
          <img src={img} alt="" crossOrigin="anonymous" loading="lazy" decoding="async" style={{ flex: '1 1 auto', minHeight: 0, width: '100%', objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: CARD_PHOTO_FILTER }} />
        ) : (
          <span style={{
            flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            border: '1px solid rgba(23,22,26,0.22)', textAlign: 'center',
            background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)',
            font: '400 8px/1 ' + MONO, letterSpacing: '0.16em', textTransform: 'uppercase', color: paperInk(0.65)
          }}>no photo</span>
        ))}
        <span style={{ flex: 'none', display: 'block', marginTop: m.photo ? 5 : 8, font: '500 8.5px/1 ' + MONO, letterSpacing: '0.14em', color: paperInk(0.72), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
        <span style={{
          flex: m.photo ? 'none' : '1 1 auto', display: '-webkit-box', WebkitBoxOrient: 'vertical',
          WebkitLineClamp: m.titleLines, overflow: 'hidden', marginTop: 3,
          font: '400 ' + m.titlePx + 'px/1.14 ' + SERIF, color: '#17161a'
        }}>{e.title}</span>
        </>)}
        {(e.future ? m.showConfidence : m.showCat) && (
          <span style={{ flex: 'none', display: 'block', marginTop: 4, font: '400 7.5px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : paperInk(0.65) }}>
            {e.future ? 'Scenario · ' + (e.confidence || 'Uncertain') : catLabel(e.category)}
          </span>
        )}
      </span>
    </button>
  );
});
