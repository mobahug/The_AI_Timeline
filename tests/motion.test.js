import { describe, it, expect } from 'vitest';
import { easeOut, panDuration, panPosition } from '../src/lib/motion.js';

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
