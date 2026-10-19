import { describe, it, expect } from 'vitest';
import { COLOUR, MICHIE_NUMBER, Menace, distinctMoves, perfectPlayer, playGame, randomPlayer, seeded, standard, winner } from '../src/lib/machines/menace';
import type { Board, Mark } from '../src/lib/machines/menace';

/* MENACE as Michie described it in 1963: a box for every position the opening
   player can meet, beads for the moves that differ once the board's symmetries
   are set aside, and beads given and taken when a game ends. */

/** Every position MENACE can be asked to move in: noughts to play, nobody has
 *  won, and more than one square to choose from. */
function positions(): Map<string, number> {
  const out = new Map<string, number>();
  const walk = (b: Board, mark: Mark) => {
    if (winner(b)) return;
    const marks = b.filter(Boolean).length;
    if (mark === 'O' && marks < 8) out.set(standard(b).key, marks);
    b.forEach((c, i) => {
      if (c) return;
      const next = b.slice();
      next[i] = mark;
      walk(next, mark === 'O' ? 'X' : 'O');
    });
  };
  walk(Array(9).fill(null), 'O');
  return out;
}

describe('MENACE, from Michie 1963', () => {
  it('needs 304 boxes: 1, 12, 108 and 183 at stages 1, 3, 5 and 7 (the paper says 287)', () => {
    const all = positions();
    const byStage = [0, 2, 4, 6].map((m) => [...all.values()].filter((n) => n === m).length);
    expect(byStage).toEqual([1, 12, 108, 183]);
    expect(all.size).toBe(304);
  });

  it('opens with white, lilac and gold beads, four of each, as the paper says', () => {
    const box = new Menace(seeded(1)).box(Array(9).fill(null));
    const colours = Object.keys(box.beads).map((sq) => COLOUR[MICHIE_NUMBER[Number(sq)]]).sort();
    expect(colours).toEqual(['gold', 'lilac', 'white']);
    expect(Object.values(box.beads)).toEqual([4, 4, 4]);
  });

  it('sees four moves where the eye sees seven, in the position of the paper’s Fig. 3', () => {
    const b: Board = [null, 'X', null, null, 'O', null, null, null, null];
    expect(b.filter((c) => !c).length).toBe(7);
    expect(distinctMoves(standard(b).key)).toHaveLength(4);
    expect(Object.values(new Menace(seeded(2)).box(b).beads)).toEqual([3, 3, 3, 3]);
  });

  it('plays a legal square, in the position it was shown, and gives and takes beads', () => {
    const menace = new Menace(seeded(3));
    const b: Board = [null, 'X', null, null, 'O', null, null, null, null];
    for (let k = 0; k < 50; k++) {
      const m = menace.move(b);
      expect(m && b[m.square]).toBe(null);
    }
    const m = menace.move(b);
    if (!m || !('box' in m)) throw new Error('expected a draw from a box');
    const before = m.box.beads[m.bead];
    menace.reinforce([m], 'win');
    expect(m.box.beads[m.bead]).toBe(before + 3);
    menace.reinforce([m], 'loss');
    expect(m.box.beads[m.bead]).toBe(before + 2);
  });

  it('learns: it loses less to a random player after a few hundred games', () => {
    const menace = new Menace(seeded(4));
    const rival = randomPlayer(seeded(5));
    const results = Array.from({ length: 600 }, () => playGame(menace, rival).result);
    const lost = (from: number) => results.slice(from, from + 100).filter((r) => r === 'loss').length;
    expect(lost(500)).toBeLessThan(lost(0));
  });

  it('cannot beat a player who never loses: it finds the draw, or runs its first box dry and resigns', () => {
    // The matchbox rules give one bead for a draw and take one for a defeat, so
    // against perfect play the opening box can empty before a drawing line is
    // found. Which happens is chance; both are what the rules do.
    for (const seed of [6, 11, 21, 31]) {
      const menace = new Menace(seeded(seed));
      const rival = perfectPlayer(seeded(seed + 1));
      const results = Array.from({ length: 300 }, () => playGame(menace, rival).result);
      expect(results, 'seed ' + seed).not.toContain('win');
      const last = results.slice(-50);
      const opening = Object.values(menace.box(Array(9).fill(null)).beads).reduce((a, n) => a + n, 0);
      const drew = last.filter((r) => r === 'draw').length >= 40;
      const gaveUp = opening === 0 && last.every((r) => r === 'loss');
      expect(drew || gaveUp, 'seed ' + seed).toBe(true);
    }
  });
});
