import { describe, it, expect } from 'vitest';
import { PAD, metrics, layout, stringPath, inTime, seek, firstInView } from '../src/lib/layout';
import { THREADS, buildGraph } from '../src/lib/data';
import type { Node } from '../src/lib/types';

const graph = buildGraph(null as unknown as undefined);
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
        const seen: Record<number, number> = {};
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

/* The wall's card face. `showCat` needs a card 120px tall, which needs a lane of
   167, which needs a canvas over ~1032px — no ordinary desk gives one, so the
   category line has never rendered outside a very tall window. That is tolerable
   for the category, which the pin's colour and the header's chips both carry.
   It was not tolerable for a scenario's confidence, which the board tells
   readers to read instead of the date and then printed nowhere on the wall. */
describe('what a card can say at a real window size', () => {
  const desk = metrics(900 - 150, 1440);   // a laptop, less the chrome
  const big = metrics(1080 - 150, 1920);   // a large desk monitor

  it('shows a scenario its confidence at ordinary desk sizes', () => {
    expect(desk.showConfidence).toBe(true);
    expect(big.showConfidence).toBe(true);
  });

  it('still asks a very tall card before naming the category', () => {
    expect(desk.showCat).toBe(false);
    expect(metrics(1200, 1440).showCat).toBe(true);
  });

  it('says neither on a card too short to carry a line', () => {
    const tiny = metrics(300, 375);
    expect(tiny.showConfidence).toBe(false);
    expect(tiny.showCat).toBe(false);
  });
});

/* The wall by keyboard: one Tab stop, and the arrow keys walk it. What the walk
   promises is checked on every card, on a desk and a phone, in full and in brief. */
describe('the wall by keyboard — one Tab stop, and the arrow keys walk it', () => {
  const walls: [string, ReturnType<typeof layout>][] = [
    ['desk, full', layout(items, metrics(760, 1280))],
    ['phone, full', layout(items, metrics(600, 375))],
    ['desk, brief', layout(items.filter((e) => e.landmark), metrics(760, 1280))]
  ];
  const id = (n: Node) => n.event.id;
  const at = (nodes: Node[], card: string | null) => nodes.find((n) => id(n) === card) as Node;

  it('reads the wall in order of the years, across every lane', () => {
    walls.forEach(([, b]) => {
      const order = inTime(b.nodes);
      expect(order.length).toBe(b.nodes.length);
      for (let i = 1; i < order.length; i++) expect(order[i].event.year).toBeGreaterThanOrEqual(order[i - 1].event.year);
    });
  });

  it('moves along a lane through its years with ← and →', () => {
    walls.forEach(([, b]) => THREADS.forEach((t) => {
      const lane = inTime(b.nodes).filter((n) => n.event.thread === t.id);
      for (let i = 1; i < lane.length; i++) {
        expect(seek(b.nodes, id(lane[i - 1]), 'later')).toBe(id(lane[i]));
        expect(seek(b.nodes, id(lane[i]), 'earlier')).toBe(id(lane[i - 1]));
      }
    }));
  });

  it('carries on from either end of a lane to the card nearest in time on another, and stops at the ends of the record', () => {
    walls.forEach(([, b]) => {
      const order = inTime(b.nodes);
      THREADS.forEach((t) => {
        const lane = order.filter((n) => n.event.thread === t.id);
        if (!lane.length) return;
        const first = lane[0];
        const last = lane[lane.length - 1];
        const after = order[order.indexOf(last) + 1];
        const before = order[order.indexOf(first) - 1];
        expect(seek(b.nodes, id(last), 'later')).toBe(after ? id(after) : null);
        expect(seek(b.nodes, id(first), 'earlier')).toBe(before ? id(before) : null);
        if (after) {
          expect(after.event.thread).not.toBe(t.id);
          expect(after.event.year).toBeGreaterThanOrEqual(last.event.year);
        }
        if (before) {
          expect(before.event.thread).not.toBe(t.id);
          expect(before.event.year).toBeLessThanOrEqual(first.event.year);
        }
      });
    });
  });

  it('goes up and down to the next lane with a card in it, to the card there nearest in time', () => {
    walls.forEach(([, b]) => {
      const tops = [...new Set(b.nodes.map((n) => n.top))].sort((p, q) => p - q);
      b.nodes.forEach((n) => (['up', 'down'] as const).forEach((move) => {
        const to = seek(b.nodes, id(n), move);
        const top = tops[tops.indexOf(n.top) + (move === 'down' ? 1 : -1)];
        if (top === undefined) { expect(to).toBeNull(); return; }
        const there = at(b.nodes, to);
        expect(there.top).toBe(top);
        // Nothing in that lane is nearer in year, or as near and nearer on the axis.
        const years = Math.abs(there.event.year - n.event.year);
        b.nodes.filter((c) => c.top === top).forEach((c) => {
          const y = Math.abs(c.event.year - n.event.year);
          expect(y).toBeGreaterThanOrEqual(years);
          if (y === years) expect(Math.abs(c.x - n.x)).toBeGreaterThanOrEqual(Math.abs(there.x - n.x));
        });
      }));
    });
  });

  it('comes back to the card it left after ↓ then ↑, and after ↑ then ↓', () => {
    walls.forEach(([, b]) => b.nodes.forEach((n) => {
      const aim = { year: n.event.year, x: n.x };
      const down = seek(b.nodes, id(n), 'down', aim);
      if (down) expect(seek(b.nodes, down, 'up', aim)).toBe(id(n));
      const up = seek(b.nodes, id(n), 'up', aim);
      if (up) expect(seek(b.nodes, up, 'down', aim)).toBe(id(n));
    }));
  });

  it('crosses a lane with nothing on it', () => {
    const b = layout(items.filter((e) => e.thread === THREADS[0].id || e.thread === THREADS[2].id), metrics(760, 1280));
    const from = b.nodes.find((n) => n.event.thread === THREADS[0].id) as Node;
    const to = seek(b.nodes, id(from), 'down');
    expect(at(b.nodes, to).event.thread).toBe(THREADS[2].id);
    expect(seek(b.nodes, to as string, 'up')).not.toBeNull();
  });

  it('reaches every card on the wall from the first', () => {
    walls.forEach(([, b]) => {
      const start = id(inTime(b.nodes)[0]);
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const from = queue.shift() as string;
        (['earlier', 'later', 'up', 'down'] as const).forEach((move) => {
          const to = seek(b.nodes, from, move);
          if (to && !seen.has(to)) { seen.add(to); queue.push(to); }
        });
      }
      expect(seen.size).toBe(b.nodes.length);
    });
  });

  it('takes Home and End to the first and last card in time', () => {
    walls.forEach(([, b]) => {
      const order = inTime(b.nodes);
      const mid = id(order[Math.floor(order.length / 2)]);
      expect(seek(b.nodes, mid, 'first')).toBe(id(order[0]));
      expect(seek(b.nodes, mid, 'last')).toBe(id(order[order.length - 1]));
      expect(order[0].event.year).toBe(Math.min(...b.nodes.map((n) => n.event.year)));
      expect(order[order.length - 1].event.year).toBe(Math.max(...b.nodes.map((n) => n.event.year)));
    });
    expect(seek([], 'anything', 'later')).toBeNull();
  });

  it('rests the Tab stop on the first card wholly in view, or the next after bare cork', () => {
    const m = metrics(760, 1280);
    const b = layout(items, m);
    const order = inTime(b.nodes);
    const edge = (n: Node) => n.x - m.cardW / 2;
    [0, 0.25, 0.5, 0.75].forEach((f) => {
      const left = f * (b.width - 1280);
      const first = firstInView(order, left, m.cardW) as Node;
      expect(edge(first)).toBeGreaterThanOrEqual(left - 1);
      order.slice(0, order.indexOf(first)).forEach((n) => expect(edge(n)).toBeLessThan(left - 1));
    });
    expect(firstInView(order, b.width, m.cardW)).toBe(order[order.length - 1]);
    expect(firstInView([], 0, m.cardW)).toBeNull();
  });
});
