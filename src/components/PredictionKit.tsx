import React from 'react';
import type { Foretold, PredictionHead } from '../lib/types';
import { FORETOLD, yearOf } from '../lib/predictions';
import { NOW } from '../lib/data';
import { CYAN, GOLD, MONO, RED_LIT, SERIF, STRING_INK, ink, micro } from '../lib/styles';

/* What the prediction pages share: the verdict as a stamp, and the clock —
   when it was said, the year it named, and when, if ever, it came. */

/** A verdict's ink: true in cyan, early and disputed in gold, overdue and
 *  wrong in the string's red, late in plain ink, not yet due dimmed. */
export const foretoldInk = (v: Foretold): string =>
  v === 'kept' ? CYAN : v === 'early' || v === 'disputed' ? GOLD : v === 'overdue' || v === 'wrong' ? RED_LIT : v === 'late' ? ink(2) : ink(4);

export const ForetoldMark = ({ verdict, size = 'sm' }: { verdict: Foretold; size?: 'sm' | 'lg' }) => (
  <span style={size === 'lg'
    ? { font: '400 clamp(28px,4vw,44px)/1 ' + SERIF, letterSpacing: '-0.025em', color: foretoldInk(verdict) }
    : { ...micro(1), color: foretoldInk(verdict), border: '1px ' + (verdict === 'open' ? 'dashed' : 'solid') + ' currentColor', borderRadius: 2, padding: '3px 7px', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
    {FORETOLD[verdict].label}
  </span>
);

/** The span a prediction's clock is drawn on, wide enough for all of them. */
export function spanOf(ps: PredictionHead[]): { from: number; to: number } {
  const years = ps.flatMap((p) => [yearOf(p), p.by, p.came || 0, NOW]).filter(Boolean);
  return { from: Math.min(...years) - 2, to: Math.max(...years) + 2 };
}

/** The clock: a dot when it was said, a tick at the year it named, a diamond
 *  when it came; the stretch past the year it named, while it has not come,
 *  drawn in red, and the years still to come dashed. Laid out in percentages,
 *  so it prints as it shows. The years themselves are written beside it, not
 *  on it: on a phone two of them can fall on the same few pixels. */
export function Clock({ p, from, to }: { p: PredictionHead; from: number; to: number }) {
  const at = (y: number) => ((y - from) / (to - from)) * 100 + '%';
  const said = yearOf(p);
  const end = p.came || NOW;
  const overdueFrom = !p.came && p.by < NOW ? p.by : null;
  const mark = (y: number, color: string, shape: 'dot' | 'tick' | 'diamond') => (
    <span style={{ position: 'absolute', left: at(y), top: 0, bottom: 0, width: 0 }}>
      {shape === 'dot' && <span style={{ position: 'absolute', left: -4, top: 6, width: 8, height: 8, borderRadius: '50%', background: ink(2) }} />}
      {shape === 'tick' && <span style={{ position: 'absolute', left: -0.5, top: 2, width: 1, height: 16, background: color }} />}
      {shape === 'diamond' && <span style={{ position: 'absolute', left: -5, top: 5, width: 10, height: 10, background: color, transform: 'rotate(45deg)' }} />}
    </span>
  );
  return (
    <div aria-hidden="true" style={{ position: 'relative', height: 20, margin: '6px 0', minWidth: 0 }}>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 1, background: 'rgba(243,240,234,0.1)' }} />
      <span style={{ position: 'absolute', left: at(said), width: 'calc(' + at(Math.min(p.by, end)) + ' - ' + at(said) + ')', top: 9, height: 3, background: ink(4) }} />
      {overdueFrom !== null && <span style={{ position: 'absolute', left: at(overdueFrom), width: 'calc(' + at(NOW) + ' - ' + at(overdueFrom) + ')', top: 9, height: 3, background: STRING_INK, opacity: 0.8 }} />}
      {p.came && p.came > p.by && <span style={{ position: 'absolute', left: at(p.by), width: 'calc(' + at(p.came) + ' - ' + at(p.by) + ')', top: 10, height: 0, borderTop: '1px dashed ' + ink(3) }} />}
      {p.verdict === 'open' && <span style={{ position: 'absolute', left: at(NOW), width: 'calc(' + at(p.by) + ' - ' + at(NOW) + ')', top: 10, height: 0, borderTop: '1px dashed ' + ink(4) }} />}
      {mark(said, ink(3), 'dot')}
      {mark(p.by, foretoldInk(p.verdict), 'tick')}
      {p.came !== undefined && mark(p.came, GOLD, 'diamond')}
    </div>
  );
}

/** The clock's years, in words, for the line beside it. */
export const clockWords = (p: PredictionHead): string =>
  'said ' + yearOf(p) + ' · named ' + p.by + (p.came !== undefined ? ' · came ' + p.came : p.verdict === 'open' ? ' · not yet due' : ' · not come');

/** What the clock's marks mean, once for a page. */
export function ClockKey({ from, to }: { from?: number; to?: number }) {
  const item = (el: React.ReactNode, text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>{el}{text}</span>
  );
  return (
    <p style={{ margin: 0, display: 'flex', gap: '6px 16px', flexWrap: 'wrap', alignItems: 'center', font: '400 11px/1.6 ' + MONO, color: ink(4) }}>
      {item(<span style={{ width: 8, height: 8, borderRadius: '50%', background: ink(2) }} />, 'said')}
      {item(<span style={{ width: 1, height: 12, background: ink(2) }} />, 'the year it named')}
      {item(<span style={{ width: 8, height: 8, background: GOLD, transform: 'rotate(45deg)' }} />, 'when it came')}
      {item(<span style={{ width: 16, height: 3, background: STRING_INK, opacity: 0.8 }} />, 'overdue')}
      {from !== undefined && to !== undefined && <span>each line runs {from}–{to}</span>}
    </p>
  );
}
