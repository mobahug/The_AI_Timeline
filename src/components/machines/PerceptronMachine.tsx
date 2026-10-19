import React, { useRef, useState } from 'react';
import { Perceptron, TWO_GROUPS, XOR } from '../../lib/machines/perceptron';
import type { Point } from '../../lib/machines/perceptron';
import { GOLD, INK, MONO, STRING_INK, button, ink } from '../../lib/styles';
import { Btn } from '../kit';
import { label, panel } from './kit';

/* The perceptron on a plane: points that should get a yes (filled) or a no
   (open), the line the weights draw between the two answers, and the passes
   it takes to stop being wrong — or the passes it never stops being wrong in,
   when no line will do. Click the plane to add a point. */

const SIZE = 300;
const GRID = 15;
const toPx = (v: number) => ((v + 1) / 2) * SIZE;
const toY = (v: number) => SIZE - toPx(v);
const LIMIT = 100;

export default function PerceptronMachine() {
  const net = useRef(new Perceptron());
  const [points, setPoints] = useState<Point[]>(TWO_GROUPS);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [adding, setAdding] = useState(true);
  const [, redraw] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const p = net.current;

  const reset = (pts: Point[]) => { net.current = new Perceptron(); setPoints(pts); setMistakes([]); };
  const pass = () => { setMistakes((ms) => [...ms, p.pass(points)]); redraw((n) => n + 1); };
  const run = () => { setMistakes((ms) => [...ms, ...p.train(points, LIMIT)]); redraw((n) => n + 1); };

  const add = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = svg.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = 1 - ((e.clientY - r.top) / r.height) * 2;
    setPoints((ps) => [...ps, { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, yes: adding }]);
  };

  const wrong = points.filter((pt) => p.says(pt) !== pt.yes).length;
  const last = mistakes[mistakes.length - 1];
  const status = !mistakes.length
    ? 'Not yet trained. Each pass shows it every point once and corrects it each time it is wrong.'
    : last === 0
      ? 'Settled after ' + mistakes.length + (mistakes.length === 1 ? ' pass' : ' passes') + ': every point is on its own side of the line.'
      : mistakes.length >= LIMIT && Math.min(...mistakes.slice(-20)) > 0
        ? mistakes.length + ' passes, and it is still wrong every pass: no straight line puts every filled point on one side and every open one on the other.'
        : 'Pass ' + mistakes.length + ': ' + last + (last === 1 ? ' mistake' : ' mistakes') + ', each one corrected as it was made.';

  const cells = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = -1 + (2 * (i + 0.5)) / GRID;
      const y = -1 + (2 * (j + 0.5)) / GRID;
      cells.push(<rect key={i + '-' + j} x={(i * SIZE) / GRID} y={SIZE - ((j + 1) * SIZE) / GRID} width={SIZE / GRID} height={SIZE / GRID} fill={p.says({ x, y }) ? 'rgba(243,240,234,0.07)' : 'rgba(255,80,60,0.06)'} />);
    }
  }

  // The line w·x + b = 0, where it crosses the square.
  const [w0, w1] = p.w;
  const ends: [number, number][] = [];
  if (w0 || w1) {
    for (const x of [-1, 1]) if (w1) { const y = -(w0 * x + p.b) / w1; if (y >= -1 && y <= 1) ends.push([x, y]); }
    for (const y of [-1, 1]) if (w0) { const x = -(w1 * y + p.b) / w0; if (x >= -1 && x <= 1) ends.push([x, y]); }
  }

  return (
    <div style={{ ...panel, padding: 'clamp(14px,2vw,20px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(18px,3vw,32px)' }}>
      <div style={{ minWidth: 0 }}>
        <svg
          ref={svg}
          viewBox={'0 0 ' + SIZE + ' ' + SIZE}
          onClick={add}
          role="img"
          aria-label={points.length + ' points, ' + wrong + ' on the wrong side of the line'}
          style={{ width: '100%', maxWidth: 340, aspectRatio: '1 / 1', display: 'block', cursor: 'crosshair', border: '1px solid rgba(243,240,234,0.14)', borderRadius: 2 }}
        >
          {cells}
          <line x1={0} x2={SIZE} y1={SIZE / 2} y2={SIZE / 2} stroke="rgba(243,240,234,0.1)" />
          <line y1={0} y2={SIZE} x1={SIZE / 2} x2={SIZE / 2} stroke="rgba(243,240,234,0.1)" />
          {ends.length >= 2 && <line x1={toPx(ends[0][0])} y1={toY(ends[0][1])} x2={toPx(ends[1][0])} y2={toY(ends[1][1])} stroke={GOLD} strokeWidth={1.5} />}
          {points.map((pt, k) => {
            const bad = !!mistakes.length && p.says(pt) !== pt.yes;
            return (
              <g key={k}>
                {bad && <circle cx={toPx(pt.x)} cy={toY(pt.y)} r={10} fill="none" stroke={GOLD} strokeDasharray="2 2" />}
                <circle cx={toPx(pt.x)} cy={toY(pt.y)} r={5.5} fill={pt.yes ? INK : 'none'} stroke={pt.yes ? INK : STRING_INK} strokeWidth={1.6} />
              </g>
            );
          })}
        </svg>
        <p style={{ margin: '8px 0 0', font: '400 11px/1.6 ' + MONO, color: ink(4) }}>
          Filled: should answer yes. Open: should answer no. Shaded light: where it says yes. Ringed: where it is wrong.
        </p>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p role="status" style={{ margin: 0, minHeight: '3.2em', font: '400 12.5px/1.6 ' + MONO, color: ink(2), textWrap: 'pretty' }}>{status}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ix ix-btn" data-tone="loud" onClick={run} style={button('loud', 'lg')}>Train until it settles</button>
          <Btn size="lg" onClick={pass}>One pass</Btn>
        </div>
        <div>
          <div style={{ ...label, marginBottom: 8 }}>Points</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn size="sm" onClick={() => reset(TWO_GROUPS)}>Two groups</Btn>
            <Btn size="sm" onClick={() => reset(XOR)}>The exclusive or</Btn>
            <Btn size="sm" tone="dim" onClick={() => reset([])}>Clear</Btn>
            <Btn size="sm" aria-pressed={adding} onClick={() => setAdding((a) => !a)}>Clicks add: {adding ? 'filled ●' : 'open ○'}</Btn>
          </div>
        </div>
        <div style={{ font: '400 11.5px/1.7 ' + MONO, color: ink(3) }}>
          <div style={label}>The weights</div>
          {p.w[0].toFixed(2)} × across + {p.w[1].toFixed(2)} × up + {p.b.toFixed(2)} {'≥'} 0 means yes
        </div>
        {mistakes.length > 0 && (
          <div>
            <div style={{ ...label, marginBottom: 6 }}>Mistakes in each pass · {mistakes.length} {mistakes.length === 1 ? 'pass' : 'passes'}</div>
            <svg viewBox={'0 0 ' + Math.max(mistakes.length, 10) * 4 + ' 30'} width="100%" height={30} preserveAspectRatio="none" aria-hidden="true">
              {mistakes.map((m, k) => {
                const top = Math.max(...mistakes, 1);
                const h = (m / top) * 28;
                return <rect key={k} x={k * 4} y={30 - h} width={3} height={Math.max(h, m ? 1 : 0)} fill={m ? STRING_INK : GOLD} />;
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
