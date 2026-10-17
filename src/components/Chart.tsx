import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { INK, MONO, SANS, SERIF, RULE, CHART, ink, micro } from '../lib/styles';
import { Anchor, Eyebrow } from './kit';

/* The pieces every chart on the site is made of. A chart is HTML, not a
   picture: the bars are boxes sized in percentages, so it is drawn on the
   server like any other page, stays sharp at any width, and its labels stay
   the size of the site's own type on a phone.

   A chart is read three ways, and none of them depends on another:
     - by eye: the marks, the axis, the sentence above that says what it shows;
     - by pointer or keyboard: one Tab reaches the plot, the arrow keys walk its
       marks, and the mark under either is described beside it and aloud;
     - as a table: every number the chart draws, under "The numbers". */

/* ─── The section a chart sits in ─────────────────────────────────────── */

export interface ChartSectionProps {
  id: string;
  n: number;
  eyebrow: ReactNode;
  title: ReactNode;
  /** What the chart shows, in a sentence, derived from the data. */
  finding: ReactNode;
  /** How it was counted. */
  how?: ReactNode;
  /** The numbers, as a table. */
  table?: ReactNode;
  /** What follows the chart and its caption: a list it points to. */
  after?: ReactNode;
  children?: ReactNode;
}

export function ChartSection({ id, n, eyebrow, title, finding, how, table, after, children }: ChartSectionProps) {
  return (
    <section id={id} aria-labelledby={id + '-h'} style={{ marginTop: 'clamp(44px,6vw,64px)', paddingTop: 24, borderTop: RULE, scrollMarginTop: 96 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        <span aria-hidden="true" style={{ font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{String(n).padStart(2, '0')}</span>
        <Eyebrow tier="section" dim>{eyebrow}</Eyebrow>
      </div>
      <h2 id={id + '-h'} className="anchored" style={{ margin: 0, font: '400 clamp(26px,3.4vw,40px)/1.05 ' + SERIF, letterSpacing: '-0.025em', color: INK, textWrap: 'balance', maxWidth: '24ch' }}>
        <Anchor id={id} label={typeof title === 'string' ? title : undefined}>{title}</Anchor>
      </h2>
      <p style={{ margin: '14px 0 0', font: '400 clamp(17px,1.8vw,21px)/1.42 ' + SERIF, color: ink(2), maxWidth: '58ch', textWrap: 'pretty' }}>{finding}</p>
      <figure style={{ margin: '26px 0 0' }}>
        {children}
        {how && <figcaption style={{ marginTop: 14, font: '400 11.5px/1.75 ' + MONO, color: ink(4), maxWidth: '78ch', textWrap: 'pretty' }}>{how}</figcaption>}
      </figure>
      {after}
      {table && <Numbers>{table}</Numbers>}
    </section>
  );
}

/** "The numbers": the chart as a table, closed until asked for. A native
 *  disclosure, so it works before the script has run and a screen reader
 *  announces it for what it is. */
export function Numbers({ label = 'The numbers', children }: { label?: string; children?: ReactNode }) {
  return (
    <details className="numbers" style={{ marginTop: 16 }}>
      <summary className="ix ix-ref" style={{ ...micro(4), cursor: 'pointer', padding: '8px 0', width: 'fit-content' }}>{label}</summary>
      <div style={{ marginTop: 8, overflowX: 'auto' }}>{children}</div>
    </details>
  );
}

/** A plain table for "The numbers". `head` is the column titles; numeric
 *  columns align right. */
export function Table({ head, rows, numeric = [], caption }: { head: ReactNode[]; rows: ReactNode[][]; numeric?: number[]; caption?: string }) {
  const cell = (i: number): CSSProperties => ({
    padding: '6px 14px 6px 0', textAlign: numeric.includes(i) ? 'right' : 'left', verticalAlign: 'baseline',
    fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(243,240,234,0.08)'
  });
  return (
    <table style={{ borderCollapse: 'collapse', font: '400 12.5px/1.5 ' + MONO, color: ink(3), minWidth: 'min(100%, 420px)' }}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>{head.map((h, i) => <th key={i} scope="col" style={{ ...cell(i), ...micro(5), fontWeight: 400 }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, j) => <tr key={j}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row" style={{ ...cell(i), fontWeight: 400, color: ink(2) }}>{c}</th> : <td key={i} style={cell(i)}>{c}</td>))}</tr>)}
      </tbody>
    </table>
  );
}

/* ─── The plot: pointer, keyboard and the description ─────────────────── */

export interface Tip { value: ReactNode; label: ReactNode; detail?: ReactNode; text: string }

/** What a plot hands its marks: which one is lit, and the handlers that light
 *  or open one. */
export interface Walk {
  active: number;
  set: (i: number) => void;
  /** A pointer over a mark lights it — a mouse or a pen; a finger has no hover. */
  hover: (e: PointerEvent<HTMLElement>, i: number) => void;
  /** A click or a tap: opens the mark if marks open, but a finger's first tap
   *  on a mark only lights it, so the description can be read before leaving. */
  press: (i: number) => void;
}

export interface PlotProps {
  /** What the plot is, for a screen reader, with how to walk it. */
  label: string;
  count: number;
  describe: (i: number) => Tip;
  /** Where Enter, or a click on a mark, goes — if the marks lead anywhere. */
  open?: (i: number) => void;
  style?: CSSProperties;
  children: (walk: Walk) => ReactNode;
}

/** A plot that one Tab reaches and the arrow keys walk, mark by mark. The mark
 *  under the pointer or the keyboard is described in a box beside it and read
 *  aloud. A mark carries `data-mark={i}`; the box finds it by that. */
export function Plot({ label, count, describe, open, style, children }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setLit] = useState(-1);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  // The lit mark as the handlers see it, between renders, and what the last
  // press was made with.
  const lit = useRef(-1);
  const by = useRef('mouse');
  const setActive = (i: number) => { lit.current = i; setLit(i); };
  const walk: Walk = {
    active,
    set: setActive,
    hover: (e, i) => { if (e.pointerType !== 'touch') setActive(i); },
    press: (i) => {
      if (by.current === 'touch' && lit.current !== i) { setActive(i); return; }
      if (open) open(i); else setActive(i);
    }
  };

  // Place the box over the mark once it is lit, and again whenever the window
  // changes size under it. Measured, not computed: the plot lays itself out
  // in percentages, and only the page knows the pixels.
  useEffect(() => {
    const host = ref.current;
    if (!host || active < 0) { setAt(null); return; }
    const place = () => {
      const mark = host.querySelector<HTMLElement>('[data-mark="' + active + '"]');
      if (!mark) { setAt(null); return; }
      const h = host.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      setAt({ x: m.left - h.left + m.width / 2, y: m.top - h.top });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active]);

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, number> = {
      ArrowRight: Math.min(count - 1, active + 1), ArrowDown: Math.min(count - 1, active + 1),
      ArrowLeft: Math.max(0, active < 0 ? 0 : active - 1), ArrowUp: Math.max(0, active < 0 ? 0 : active - 1),
      Home: 0, End: count - 1
    };
    if (e.key in next) { e.preventDefault(); setActive(next[e.key]); return; }
    if (e.key === 'Escape' && active >= 0) { e.preventDefault(); setActive(-1); return; }
    if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); open(active); }
  };

  const tip = active >= 0 && active < count ? describe(active) : null;
  // The box sits above the mark, kept inside the plot's width — by CSS as well
  // as by arithmetic, so that it can never push the page sideways.
  const boxW = 220;
  const left = at ? 'clamp(0px, ' + Math.round(at.x - boxW / 2) + 'px, calc(100% - ' + boxW + 'px))' : 0;

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={label + ' Use the arrow keys to read each mark.'}
      onKeyDown={key}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(-1); }}
      onPointerDown={(e) => { by.current = e.pointerType; }}
      onPointerLeave={(e: PointerEvent<HTMLDivElement>) => { if (e.pointerType === 'mouse') setActive(-1); }}
      style={{ position: 'relative', outlineOffset: 6, ...style }}
    >
      {children(walk)}
      {tip && at && (
        <div aria-hidden="true" style={{
          position: 'absolute', left, top: at.y, width: boxW, maxWidth: '100%', boxSizing: 'border-box', transform: 'translateY(calc(-100% - 10px))', zIndex: 5,
          pointerEvents: 'none', background: 'rgba(14,14,17,0.96)', border: '1px solid rgba(243,240,234,0.18)', borderRadius: 3,
          padding: '9px 11px', boxShadow: '0 10px 24px rgba(0,0,0,0.5)'
        }}>
          <div style={{ font: '400 22px/1 ' + SERIF, color: INK, letterSpacing: '-0.02em' }}>{tip.value}</div>
          <div style={{ marginTop: 5, font: '400 11px/1.45 ' + MONO, color: ink(3) }}>{tip.label}</div>
          {tip.detail && <div style={{ marginTop: 6, font: '400 12px/1.45 ' + SANS, color: ink(4) }}>{tip.detail}</div>}
        </div>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">{tip ? tip.text : ''}</span>
      {open && count > 0 && <span className="sr-only">Press Enter to open the one you are on.</span>}
    </div>
  );
}

/** The marks' common props: the plot finds a mark by `data-mark`, a pointer
 *  over it lights it, and a click or a tap presses it. */
export const markProps = (i: number, walk: Walk) => ({
  'data-mark': i,
  onPointerEnter: (e: PointerEvent<HTMLElement>) => walk.hover(e, i),
  onClick: () => walk.press(i)
});

/* ─── Axes ───────────────────────────────────────────────────────────── */

/** Round ticks for a count axis: 0 and a few clean steps up to the top. */
export function ticksFor(max: number, want = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / want;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) || raw;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v));
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** Horizontal gridlines and their labels, behind a plot of `height` px whose
 *  top is `top`. The labels sit in the plot's left gutter. */
export function Grid({ ticks, top, height, gutter }: { ticks: number[]; top: number; height: number; gutter: number }) {
  const max = ticks[ticks.length - 1] || 1;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top, height, pointerEvents: 'none' }}>
      {ticks.map((t) => (
        <div key={t} style={{ position: 'absolute', left: gutter, right: 0, bottom: (t / max) * 100 + '%', borderTop: '1px solid ' + (t === 0 ? CHART.axis : CHART.grid) }}>
          <span style={{ position: 'absolute', right: '100%', marginRight: 8, top: -7, font: '400 10px/1 ' + MONO, color: ink(5), fontVariantNumeric: 'tabular-nums' }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

/** A legend: a swatch beside each name, never colour alone. */
export function Legend({ items, style }: { items: { label: ReactNode; color: string; shape?: 'bar' | 'dot' | 'ring' }[]; style?: CSSProperties }) {
  return (
    <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', gap: '8px 18px', flexWrap: 'wrap', ...style }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, font: '400 11.5px/1.4 ' + MONO, color: ink(3) }}>
          <span aria-hidden="true" style={it.shape === 'dot' || it.shape === 'ring'
            ? { width: 10, height: 10, borderRadius: '50%', background: it.shape === 'ring' ? 'transparent' : it.color, border: it.shape === 'ring' ? '1.5px dashed ' + it.color : 'none', flex: 'none' }
            : { width: 12, height: 10, borderRadius: '2px 2px 0 0', background: it.color, flex: 'none' }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
