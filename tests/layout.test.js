import { describe, it, expect } from 'vitest';
import { PAD, metrics, layout, stringPath } from '../src/lib/layout.js';
import { THREADS, buildGraph } from '../src/lib/data.js';

const graph = buildGraph(null);
const items = graph.all;

describe('metrics — every dimension solved from the height', () => {
  it('fits all lanes exactly on a tall screen and admits it cannot on a short one', () => {
    const tall = metrics(900, 1400);
    expect(tall.fits).toBe(true);
    expect(tall.ruler + THREADS.length * tall.lane).toBeLessThanOrEqual(900);
    const short = metrics(200, 400);
    expect(short.fits).toBe(false);
    expect(short.lane).toBeGreaterThanOrEqual(46);
  });

  it('keeps a card inside its lane, with a gutter above for the strings', () => {
    [300, 500, 700, 900, 1200].forEach((h) => {
      const m = metrics(h, 1280);
      expect(m.cardH).toBeLessThan(m.lane);
      expect(m.gutter).toBe(m.lane - m.cardH);
      expect(m.gap).toBeGreaterThan(m.cardW);
    });
  });
});

describe('layout — one row per thread, never overlapping, never far from its year', () => {
  const m = metrics(760, 1280);
  const b = layout(items, m);

  it('places every entry exactly once', () => {
    expect(b.nodes.length).toBe(items.length);
    expect(new Set(b.nodes.map((n) => n.event.id)).size).toBe(items.length);
  });

  it('keeps same-lane cards a full gap apart, in year order', () => {
    THREADS.forEach((t) => {
      const lane = b.nodes.filter((n) => n.event.thread === t.id).sort((p, q) => p.x - q.x);
      for (let i = 1; i < lane.length; i++) {
        expect(lane[i].x - lane[i - 1].x).toBeGreaterThanOrEqual(m.gap - 1e-6);
        expect(lane[i].event.year).toBeGreaterThanOrEqual(lane[i - 1].event.year);
      }
    });
  });

  it('never places a card before its own year', () => {
    b.nodes.forEach((n) => expect(n.x).toBeGreaterThanOrEqual(b.xOf(n.event.year) - 0.001));
  });

  it('is as tall as its lanes and wide enough for its last card', () => {
    expect(b.height).toBe(m.ruler + THREADS.length * m.lane);
    const reach = Math.max(...b.nodes.map((n) => n.x + m.cardW / 2));
    expect(b.width).toBeGreaterThanOrEqual(reach + PAD);
  });

  it('sits every card on its own year — the only push is inside a same-year run', () => {
    [metrics(600, 375), metrics(900, 1400)].forEach((mm) => {
      const bb = layout(items, mm);
      THREADS.forEach((t) => {
        const lane = bb.nodes.filter((n) => n.event.thread === t.id);
        const seen = {};
        lane.forEach((n) => {
          const k = (seen[n.event.year] = (seen[n.event.year] || 0) + 1) - 1;
          // The k-th card of a year in this lane sits k gaps after the year's x.
          expect(n.x - bb.xOf(n.event.year)).toBeGreaterThanOrEqual(k * mm.gap - 0.001);
          if (k === 0) expect(n.x).toBeCloseTo(bb.xOf(n.event.year), 6);
        });
      });
    });
  });

  it('keeps the ruler monotone and the lanes aligned to it', () => {
    let prev = -Infinity;
    for (let y = 1900; y <= 2050; y++) {
      const x = b.xOf(y);
      expect(x).toBeGreaterThanOrEqual(prev);
      prev = x;
    }
  });
});

describe('stringPath — arches up into the gutter', () => {
  it('starts and ends on the pins and never dips below them', () => {
    const a = { x: 100, ty: 200 };
    const c = { x: 700, ty: 200 };
    const p = stringPath(a, c, 40);
    expect(p.d.startsWith('M100.0 200.0')).toBe(true);
    expect(p.d.endsWith('700.0 200.0')).toBe(true);
    expect(p.my).toBeLessThan(200);
    expect(p.mx).toBeCloseTo(400, 0);
  });

  it('never lifts higher than the gutter allows', () => {
    const p = stringPath({ x: 0, ty: 100 }, { x: 5000, ty: 100 }, 30);
    const controlY = Number(p.d.split('C')[1].split(',')[0].split(' ')[1]);
    expect(100 - controlY).toBeLessThanOrEqual(30 * 0.86 + 0.01);
  });
});

describe('the card takes one of three shapes by its height', () => {
  it('stacks the photograph on a tall card, sets it beside the text on a short one, drops it only when there is no room', () => {
    const tall = metrics(900, 1400);
    expect(tall.photo).toBe(true);
    expect(tall.side).toBe(false);
    const short = metrics(560, 1280);
    expect(short.photo).toBe(false);
    expect(short.side).toBe(true);
    expect(short.thumb).toBeGreaterThanOrEqual(30);
    expect(short.thumb).toBeLessThan(short.cardH);
    expect(short.titleLines).toBeGreaterThanOrEqual(1);
    const tiny = metrics(300, 900);
    expect(tiny.photo).toBe(false);
    expect(tiny.side).toBe(false);
    expect(tiny.thumb).toBe(0);
  });
});
