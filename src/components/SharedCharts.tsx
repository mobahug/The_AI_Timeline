import React from 'react';
import { FIRST, NOW, TICKS, whenOf, yearFraction } from '../lib/data';
import type { Ladder, Pace } from '../lib/stats';
import { INK, MONO, SERIF, ROW_RULE, CHART, ink, markOf, micro } from '../lib/styles';
import { Link, useNav } from './kit';
import { Legend, Plot, markProps } from './Chart';

/* The two charts drawn outside the charts page: the pace, small, on the front
   page, and a lead's ladder on the lead's own page. They live apart from the
   charts page so that a page drawing one of them does not bring all six. */

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** A small count in words, as the board writes them; a larger one in figures. */
export const say = (n: number) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));

/** The pace, drawn small for the front page: the columns alone, the busiest
 *  year and the present in gold, the first and last years beneath. It is a
 *  picture with a caption and a link, not a plot: the full chart is a click
 *  away. Two paths, one per ink, rather than a box per year: the front page
 *  carried 127 styled boxes for it, a quarter of its HTML. */
export function PaceSpark({ p, height = 92 }: { p: Pace; height?: number }) {
  const bars = (hot: boolean) => p.rows.map((r, i) => {
    if (r.total <= 0 || (r.total === p.peak.total || r.year === NOW) !== hot) return '';
    const h = ((r.total / p.peak.total) * 100).toFixed(2);
    return 'M' + (i + 0.15).toFixed(2) + ' 100V' + (100 - Number(h)).toFixed(2) + 'h0.7V100z';
  }).join('');
  return (
    <div aria-hidden="true">
      <svg viewBox={'0 0 ' + p.rows.length + ' 100'} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height, borderBottom: '1px solid ' + CHART.axis }}>
        <path d={bars(false)} fill={CHART.mark} />
        <path d={bars(true)} fill={CHART.emphasis} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: '400 10px/1 ' + MONO, color: ink(5), fontVariantNumeric: 'tabular-nums' }}>
        <span>{FIRST}</span><span>{NOW}</span>
      </div>
    </div>
  );
}

/* ─── The ladders ──────────────────────────────────────────────────────── */

const LANE = 46;

/** Leads' rungs placed in time, a lane each: all five on the charts page, one
 *  on its lead's own page, where the lane needs no name (`labels={false}`). */
export function LadderChart({ ladders: list, labels = true, legend = true }: { ladders: Ladder[]; labels?: boolean; legend?: boolean }) {
  const { navigate } = useNav();
  const l = { ladders: list };
  const dots = l.ladders.flatMap((lad, li) => lad.rungs.map((r) => ({ lad, li, r })));
  const now = yearFraction(NOW + 1) * 100;
  // The board's own ticks, at least a seventh of the width apart so that they
  // never run into each other on a phone, ending on the last year drawn.
  const GAP = 0.14;
  const axis = TICKS.reduce<number[]>((out, y) => {
    const last = out[out.length - 1];
    if (last === undefined || yearFraction(y) - yearFraction(last) >= GAP) out.push(y);
    return out;
  }, []);
  const end = TICKS[TICKS.length - 1];
  if (axis[axis.length - 1] !== end) {
    while (axis.length > 1 && yearFraction(end) - yearFraction(axis[axis.length - 1]) < GAP) axis.pop();
    axis.push(end);
  }
  const open = (i: number) => navigate({ view: 'lead', id: dots[i].lad.lead.id, hash: 'rung-' + dots[i].r.n });
  // The present, drawn in every track: rungs to its right are scenarios.
  const present = (label: boolean) => (
    <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: now + '%', borderLeft: '1px dashed rgba(243,240,234,0.3)', pointerEvents: 'none' }}>
      {/* Written to the left of the line: the line sits near the right edge,
          and a label after it would run off a phone's screen. */}
      {label && <span style={{ ...micro(5), position: 'absolute', top: 2, right: 6, whiteSpace: 'nowrap' }}>{NOW} · scenarios after →</span>}
    </div>
  );
  return (
    <>
      <Plot
        label={l.ladders.length === 1 ? l.ladders[0].lead.title + ': every rung placed in time.' : 'The ' + say(l.ladders.length) + ' leads, every rung placed in time.'}
        count={dots.length}
        open={open}
        describe={(i) => {
          const d = dots[i];
          const e = d.r.event;
          return {
            value: whenOf(e),
            label: d.lad.lead.title + ' · rung ' + d.r.n + ' of ' + d.lad.rungs.length,
            detail: d.r.label + (e.future ? ' (a scenario)' : '') + ' — ' + e.title,
            text: d.lad.lead.title + ', rung ' + d.r.n + ': ' + d.r.label + '. ' + whenOf(e) + ', ' + e.title + (e.future ? ', a scenario' : '') + '.'
          };
        }}
      >
        {(walk) => (
          // On a desk the lead's name sits to the left of its lane; on a phone,
          // above it, so the lane keeps the whole width (base.css: .lanes).
          <div className="lanes" style={labels ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}>
            {labels && <span className="lane-gap" />}
            <div className="lane-track" style={{ position: 'relative', height: 22 }}>{present(true)}</div>
            {l.ladders.map((lad) => {
              const hue = lad.lead.hue;
              const xs = lad.rungs.map((r) => r.x * 100);
              return (
                <React.Fragment key={lad.lead.id}>
                  {labels && (
                    <div className="lane-label" style={{ display: 'flex', alignItems: 'center', minHeight: LANE, paddingRight: 10, borderTop: ROW_RULE }}>
                      <Link to={{ view: 'lead', id: lad.lead.id }} className="ix-ref" style={{ font: '400 13px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.01em' }}>{lad.lead.title}</Link>
                    </div>
                  )}
                  <div className="lane-track" style={{ position: 'relative', minHeight: LANE, borderTop: ROW_RULE }}>
                    {present(false)}
                    <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: Math.min(...xs) + '%', width: (Math.max(...xs) - Math.min(...xs)) + '%', borderTop: '1px solid oklch(0.64 0.13 ' + hue + ' / 0.55)' }} />
                    {lad.rungs.map((r) => {
                      const i = dots.findIndex((d) => d.lad === lad && d.r === r);
                      const lit = walk.active === i;
                      return (
                        <div key={r.n} {...markProps(i, walk)} style={{ position: 'absolute', top: '50%', left: r.x * 100 + '%', width: 24, height: 24, marginLeft: -12, marginTop: -12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: lit ? 2 : 1 }}>
                          <span style={{
                            width: lit ? 14 : 10, height: lit ? 14 : 10, borderRadius: '50%', boxSizing: 'border-box',
                            background: r.event.future ? '#0a0a0b' : lit ? INK : markOf(hue),
                            border: r.event.future ? '1.5px dashed ' + (lit ? INK : markOf(hue)) : 'none',
                            boxShadow: '0 0 0 2px #0a0a0b'
                          }} />
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
            {labels && <span className="lane-gap" />}
            <div className="lane-track" aria-hidden="true" style={{ position: 'relative', height: 26, borderTop: '1px solid ' + CHART.axis, font: '400 10px/1 ' + MONO, color: ink(5), fontVariantNumeric: 'tabular-nums' }}>
              {axis.map((y, i) => (
                <span key={y} style={{ position: 'absolute', top: 8, left: yearFraction(y) * 100 + '%', transform: i === axis.length - 1 ? 'translateX(-100%)' : i ? 'translateX(-50%)' : 'none' }}>{y}</span>
              ))}
            </div>
          </div>
        )}
      </Plot>
      {legend && (
        <Legend items={[
          ...l.ladders.map((lad) => ({ label: lad.lead.title, color: markOf(lad.lead.hue), shape: 'dot' as const })),
          { label: 'A scenario', color: 'rgba(243,240,234,0.6)', shape: 'ring' as const }
        ]} />
      )}
    </>
  );
}
