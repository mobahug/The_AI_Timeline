import { describe, it, expect } from 'vitest';
import { Perceptron, TWO_GROUPS, XOR } from '../src/lib/machines/perceptron';

describe('the perceptron’s learning rule', () => {
  it('parts two groups a line can part, and then makes no mistakes', () => {
    const p = new Perceptron();
    const mistakes = p.train(TWO_GROUPS, 100);
    expect(mistakes[mistakes.length - 1]).toBe(0);
    expect(mistakes.length).toBeLessThan(100);
    TWO_GROUPS.forEach((pt) => expect(p.says(pt)).toBe(pt.yes));
  });

  it('changes nothing when it is right, and moves towards the answer when it is wrong', () => {
    const p = new Perceptron();
    expect(p.pass([{ x: 0.5, y: 0.5, yes: true }])).toBe(0);
    expect(p.w).toEqual([0, 0]);
    expect(p.pass([{ x: 0.5, y: 0.25, yes: false }])).toBe(1);
    expect(p.w).toEqual([-0.5, -0.25]);
    expect(p.b).toBe(-1);
  });

  it('never stops making mistakes on the exclusive or', () => {
    const p = new Perceptron();
    const mistakes = p.train(XOR, 200);
    expect(mistakes).toHaveLength(200);
    expect(Math.min(...mistakes)).toBeGreaterThan(0);
  });
});
