/* The perceptron's learning rule, in its simplest machine: two inputs, the
   coordinates of a point, weighted and summed with a bias; the answer is yes
   when the sum is at least nothing. When the answer is wrong the weights are
   moved towards the right one — the input added for a missed yes, taken away
   for a wrong yes — and when it is right nothing changes. Rosenblatt's 1958
   paper calls this kind of training positive and negative reinforcement, and
   says that with it a perceptron "appears to be capable of trial-and-error
   learning".

   If a straight line can put every yes on one side and every no on the other,
   the rule finds one in a finite number of passes. If none can, it never
   stops making mistakes: the four points of the exclusive or are the smallest
   case. */

export interface Point { x: number; y: number; yes: boolean }

export class Perceptron {
  w: [number, number] = [0, 0];
  b = 0;
  passes = 0;

  says(p: Pick<Point, 'x' | 'y'>): boolean { return this.w[0] * p.x + this.w[1] * p.y + this.b >= 0; }

  /** One pass through the points in order, correcting each mistake as it is
   *  made; the number of mistakes. */
  pass(points: Point[]): number {
    let mistakes = 0;
    for (const p of points) {
      if (this.says(p) === p.yes) continue;
      const s = p.yes ? 1 : -1;
      this.w = [this.w[0] + s * p.x, this.w[1] + s * p.y];
      this.b += s;
      mistakes++;
    }
    this.passes++;
    return mistakes;
  }

  /** Passes until one goes by without a mistake, or `limit` have; the mistakes in each. */
  train(points: Point[], limit = 100): number[] {
    const out: number[] = [];
    for (let k = 0; k < limit; k++) {
      const m = this.pass(points);
      out.push(m);
      if (!m) break;
    }
    return out;
  }
}

/** Two groups a line can part. */
export const TWO_GROUPS: Point[] = [
  { x: -0.7, y: 0.5, yes: true }, { x: -0.4, y: 0.75, yes: true }, { x: -0.55, y: 0.2, yes: true }, { x: -0.15, y: 0.6, yes: true },
  { x: -0.8, y: -0.1, yes: true }, { x: -0.3, y: 0.35, yes: true },
  { x: 0.6, y: -0.5, yes: false }, { x: 0.35, y: -0.75, yes: false }, { x: 0.75, y: -0.15, yes: false }, { x: 0.2, y: -0.35, yes: false },
  { x: 0.55, y: 0.25, yes: false }, { x: 0.05, y: -0.7, yes: false }
];

/** The exclusive or: yes when exactly one input is on. No line parts them. */
export const XOR: Point[] = [
  { x: -0.6, y: -0.6, yes: false }, { x: 0.6, y: 0.6, yes: false },
  { x: -0.6, y: 0.6, yes: true }, { x: 0.6, y: -0.6, yes: true }
];
