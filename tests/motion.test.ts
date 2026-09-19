import { describe, it, expect } from 'vitest';
import { easeOut, panDuration, panPosition, rubberBand, sheetClaims, spring, springDuration, springEasing } from '../src/lib/motion';

describe('the pan curve is smooth, not a snap', () => {
  it('starts exactly at the origin and ends exactly at the target', () => {
    expect(panPosition(0, 4500, 0)).toBe(0);
    expect(panPosition(0, 4500, panDuration(4500))).toBe(4500);
    expect(panPosition(4500, 0, panDuration(4500))).toBe(0);
    expect(panPosition(1200, 1200, 100)).toBe(1200);
  });

  it('moves monotonically — never reverses, never overshoots', () => {
    const [from, to] = [0, 4500];
    const D = panDuration(to - from);
    let prev = from;
    for (let t = 0; t <= D; t += 8) {
      const x = panPosition(from, to, t);
      expect(x).toBeGreaterThanOrEqual(prev);
      expect(x).toBeLessThanOrEqual(to);
      prev = x;
    }
  });

  it('has no single frame that jumps more than a small fraction of the distance', () => {
    // At 60fps a frame is ~16.7ms. A snap would show up as one enormous step.
    const [from, to] = [0, 4500];
    const D = panDuration(to - from);
    let worst = 0;
    for (let t = 0; t < D; t += 16.7) {
      worst = Math.max(worst, panPosition(from, to, t + 16.7) - panPosition(from, to, t));
    }
    expect(worst / (to - from)).toBeLessThan(0.06);
  });

  it('decelerates — the second half covers less ground than the first', () => {
    const [from, to] = [0, 4500];
    const D = panDuration(to - from);
    const firstHalf = panPosition(from, to, D / 2) - from;
    const secondHalf = to - panPosition(from, to, D / 2);
    expect(firstHalf).toBeGreaterThan(secondHalf);
    expect(firstHalf / (to - from)).toBeGreaterThan(0.8);
  });

  it('scales duration with distance inside a sane band', () => {
    expect(panDuration(10)).toBe(320);
    expect(panDuration(2000)).toBe(400);
    expect(panDuration(8000)).toBe(950);
    expect(panDuration(-3000)).toBe(600);
  });

  it('easing is clamped and well behaved at the edges', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });

  it('a throttled tab that wakes late lands on the target rather than stalling', () => {
    // If frames stop for a second and resume, the time-based curve is already
    // at or past its duration, so the next frame writes the final position.
    expect(panPosition(0, 4500, 5000)).toBe(4500);
  });
});

describe('the sheet gives past its ends, and springs back', () => {
  it('a rubber band gives nothing for nothing, and never the full pull', () => {
    expect(rubberBand(0)).toBe(0);
    for (const over of [1, 10, 50, 200, 1000]) {
      expect(rubberBand(over)).toBeGreaterThan(0);
      expect(rubberBand(over)).toBeLessThan(over);
      expect(rubberBand(over)).toBeLessThan(56);
      expect(rubberBand(-over)).toBe(-rubberBand(over));
    }
  });

  it('a rubber band stiffens: each extra px gives less than the one before', () => {
    let prevGain = Infinity;
    for (let over = 10; over <= 400; over += 10) {
      const gain = rubberBand(over) - rubberBand(over - 10);
      expect(gain).toBeLessThan(prevGain);
      prevGain = gain;
    }
  });

  it('the spring starts where the finger left it and rests on the stop', () => {
    expect(spring(0)).toBeCloseTo(0, 6);
    expect(spring(springDuration() / 1000)).toBeCloseTo(1, 2);
    expect(spring(5)).toBeCloseTo(1, 6);
  });

  it('the spring overshoots a little, then comes back — a bounce, not a fade', () => {
    let peak = 0;
    const D = springDuration() / 1000;
    for (let t = 0; t <= D; t += 0.004) peak = Math.max(peak, spring(t));
    expect(peak).toBeGreaterThan(1.03);
    expect(peak).toBeLessThan(1.12);
  });

  it('a flick carries: released at speed it overshoots more than released still', () => {
    const peakAt = (v0: number) => { let p = 0; for (let t = 0; t <= 1; t += 0.004) p = Math.max(p, spring(t, { v0 })); return p; };
    expect(peakAt(8)).toBeGreaterThan(peakAt(0));
    expect(peakAt(12)).toBeLessThan(1.5);
  });

  it('the spring rises without a stall before its first peak', () => {
    let prev = 0;
    for (let t = 0.004; ; t += 0.004) {
      const x = spring(t);
      if (x < prev) break;
      expect(x).toBeGreaterThan(prev);
      prev = x;
      if (t > 1) throw new Error('never peaked');
    }
    expect(prev).toBeGreaterThan(1);
  });

  it('the spring rests inside a phone-sized moment', () => {
    expect(springDuration()).toBeGreaterThan(300);
    expect(springDuration()).toBeLessThan(700);
  });

  it('the easing is a well-formed linear() from 0 to exactly 1', () => {
    const s = springEasing();
    expect(s.startsWith('linear(0, ')).toBe(true);
    expect(s.endsWith(', 1)')).toBe(true);
    const pts = s.slice(7, -1).split(', ').map(Number);
    expect(pts.length).toBe(33);
    expect(pts.every((p) => Number.isFinite(p))).toBe(true);
    expect(Math.max(...pts)).toBeGreaterThan(1);
  });
});

describe('a touch on the sheet goes to the sheet or to the scroll, the native way', () => {
  const at = (o: Partial<Parameters<typeof sheetClaims>[0]>) => sheetClaims({ dx: 0, dy: 0, scrollTop: 0, atTop: false, onHandle: false, ...o });

  it('the handle is always the sheet’s, whatever the content is doing', () => {
    expect(at({ onHandle: true, dy: -30, scrollTop: 400, atTop: true })).toBe('sheet');
    expect(at({ onHandle: true, dx: 40, dy: 2 })).toBe('sheet');
  });

  it('nothing moved yet is nobody’s', () => {
    expect(at({})).toBe(null);
  });

  it('a sideways move is the content’s: a strip inside scrolls that way', () => {
    expect(at({ dx: 20, dy: 4 })).toBe('scroll');
    expect(at({ dx: -20, dy: -4, scrollTop: 0 })).toBe('scroll');
  });

  it('a pull down takes the sheet only from the top of the content', () => {
    expect(at({ dy: 8, scrollTop: 0 })).toBe('sheet');
    expect(at({ dy: 8, scrollTop: 0, atTop: true })).toBe('sheet');
    expect(at({ dy: 8, scrollTop: 120 })).toBe('scroll');
  });

  it('a push up grows the sheet first, and scrolls only at the top stop', () => {
    expect(at({ dy: -8, scrollTop: 0 })).toBe('sheet');
    expect(at({ dy: -8, scrollTop: 120 })).toBe('sheet');
    expect(at({ dy: -8, scrollTop: 0, atTop: true })).toBe('scroll');
    expect(at({ dy: -8, scrollTop: 120, atTop: true })).toBe('scroll');
  });
});
