/* MENACE, the Matchbox Educable Noughts And Crosses Engine, as Donald Michie
   described it in 1963 ("Experiments on the mechanization of game-learning.
   Part I", The Computer Journal 6(3)): a box for every position the opening
   player can meet, a bead in it for every move that is different once
   reflections and rotations are set aside, a bead drawn to choose the move,
   and beads added or taken away when the game is over.

   MENACE opens, with noughts. The rules are the paper's:
   - each colour of bead is put in 4 times at stage 1, 3 times at stage 3,
     twice at stage 5 and once at stage 7, so late boxes change fastest;
   - a win adds three beads of the chosen colour to each box opened, a draw
     one, and a defeat takes the chosen bead away.
   Two things the paper leaves open are settled here: boxes are filled when
   first opened rather than all at once, which plays the same; and a box with
   no beads left resigns the game, which counts as a defeat. The paper counts
   287 positions; counted here, with no winner yet and a choice to make, they
   come to 304 (tests/menace.test.ts), and every one gets a box. */

export type Mark = 'O' | 'X';
export type Cell = Mark | null;
export type Board = Cell[];
export type Result = 'win' | 'draw' | 'loss';

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** The paper's numbering of the squares (Table 1), by square, row by row. */
export const MICHIE_NUMBER = [1, 2, 3, 8, 0, 4, 7, 6, 5];
/** Its colour code: the bead for each square, by the paper's number. */
export const COLOUR: Record<number, string> = { 1: 'white', 2: 'lilac', 3: 'silver', 4: 'green', 5: 'pink', 6: 'red', 7: 'amber', 8: 'black', 0: 'gold' };

/** Beads of each colour a box starts with, by the number of marks already on the board. */
export const REPLICATES: Record<number, number> = { 0: 4, 2: 3, 4: 2, 6: 1 };
/** Beads added to each box opened, by result; a defeat takes the chosen one away. */
export const REWARD: Record<Result, number> = { win: 3, draw: 1, loss: -1 };

export function winner(b: Board): Mark | 'draw' | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a] as Mark;
  return b.every(Boolean) ? 'draw' : null;
}

/* The eight ways a square board can be turned or reflected, each as where
   every square goes. */
const turn = (i: number) => (i % 3) * 3 + (2 - Math.floor(i / 3));
const mirror = (i: number) => Math.floor(i / 3) * 3 + (2 - (i % 3));
export const SYMMETRIES: number[][] = (() => {
  const out: number[][] = [];
  let s = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let k = 0; k < 4; k++) { out.push(s); out.push(s.map(mirror)); s = s.map(turn); }
  return out;
})();

const keyOf = (b: Board) => b.map((c) => c || '.').join('');
const apply = (b: Board, s: number[]): Board => { const o: Board = Array(9).fill(null); b.forEach((c, i) => { o[s[i]] = c; }); return o; };

/** The position as its box shows it — the turn of the board that reads first —
 *  and the turn that takes this board there. */
export function standard(b: Board): { key: string; s: number[] } {
  let best = { key: '', s: SYMMETRIES[0] };
  for (const s of SYMMETRIES) {
    const key = keyOf(apply(b, s));
    if (!best.key || key < best.key) best = { key, s };
  }
  return best;
}

/** The moves that are different from one another in a position, as squares of
 *  its standard board: one square for each set that a symmetry of the position
 *  makes the same. */
export function distinctMoves(key: string, mark: Mark = 'O'): number[] {
  const b: Board = key.split('').map((c) => (c === '.' ? null : (c as Mark)));
  const seen = new Set<string>();
  const out: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    const next = b.slice();
    next[i] = mark;
    const k = standard(next).key;
    if (!seen.has(k)) { seen.add(k); out.push(i); }
  }
  return out;
}

export interface Box { key: string; stage: number; beads: Record<number, number> }
export interface Draw { box: Box; bead: number; square: number }

/** A seeded source of chance, so a test can replay a tournament. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Menace {
  readonly boxes = new Map<string, Box>();
  constructor(private readonly chance: () => number = Math.random) {}

  /** The box for a position, filled the first time it is opened. */
  box(b: Board): Box {
    const { key } = standard(b);
    let box = this.boxes.get(key);
    if (!box) {
      const marks = b.filter(Boolean).length;
      const beads: Record<number, number> = {};
      for (const sq of distinctMoves(key)) beads[sq] = REPLICATES[marks];
      box = { key, stage: marks + 1, beads };
      this.boxes.set(key, box);
    }
    return box;
  }

  /** MENACE's move: a bead drawn from the box, or the one square left. Null
   *  when the box is empty, and MENACE resigns. */
  move(b: Board): Draw | null | { square: number } {
    const empty = b.flatMap((c, i) => (c ? [] : [i]));
    if (empty.length === 1) return { square: empty[0] };
    const box = this.box(b);
    const total = Object.values(box.beads).reduce((a, n) => a + n, 0);
    if (!total) return null;
    let r = this.chance() * total;
    let bead = Number(Object.keys(box.beads)[0]);
    for (const [sq, n] of Object.entries(box.beads)) {
      if (r < n) { bead = Number(sq); break; }
      r -= n;
    }
    const { s } = standard(b);
    return { box, bead, square: s.indexOf(bead) };
  }

  /** The beads given or taken once a game is over, for every box opened in it. */
  reinforce(draws: Draw[], result: Result): void {
    for (const d of draws) d.box.beads[d.bead] = Math.max(0, d.box.beads[d.bead] + REWARD[result]);
  }
}

/* ─── Opponents for a quick tournament ───────────────────────────────────── */

/** A player who picks any empty square. */
export const randomPlayer = (chance: () => number) => (b: Board): number => {
  const empty = b.flatMap((c, i) => (c ? [] : [i]));
  return empty[Math.floor(chance() * empty.length)];
};

const scores = new Map<string, number>();
function score(b: Board, toMove: Mark, me: Mark): number {
  const memo = keyOf(b) + toMove + me;
  const known = scores.get(memo);
  if (known !== undefined) return known;
  const v = minimax(b, toMove, me);
  scores.set(memo, v);
  return v;
}
function minimax(b: Board, toMove: Mark, me: Mark): number {
  const w = winner(b);
  if (w === me) return 1;
  if (w === 'draw') return 0;
  if (w) return -1;
  const values = b.flatMap((c, i) => {
    if (c) return [];
    const next = b.slice();
    next[i] = toMove;
    return [score(next, toMove === 'O' ? 'X' : 'O', me)];
  });
  return toMove === me ? Math.max(...values) : Math.min(...values);
}

/** A player who never loses: among the best moves, any. */
export const perfectPlayer = (chance: () => number, mark: Mark = 'X') => (b: Board): number => {
  const other: Mark = mark === 'O' ? 'X' : 'O';
  let best = -2;
  let moves: number[] = [];
  b.forEach((c, i) => {
    if (c) return;
    const next = b.slice();
    next[i] = mark;
    const v = score(next, other, mark);
    if (v > best) { best = v; moves = [i]; } else if (v === best) moves.push(i);
  });
  return moves[Math.floor(chance() * moves.length)];
};

/** One game of MENACE against a player, reinforced; what happened in it. */
export function playGame(menace: Menace, opponent: (b: Board) => number): { result: Result; board: Board } {
  const b: Board = Array(9).fill(null);
  const draws: Draw[] = [];
  for (;;) {
    const m = menace.move(b);
    if (!m) { menace.reinforce(draws, 'loss'); return { result: 'loss', board: b }; }
    if ('box' in m) draws.push(m);
    b[m.square] = 'O';
    let w = winner(b);
    if (w) { const result: Result = w === 'O' ? 'win' : 'draw'; menace.reinforce(draws, result); return { result, board: b }; }
    b[opponent(b)] = 'X';
    w = winner(b);
    if (w) { const result: Result = w === 'X' ? 'loss' : 'draw'; menace.reinforce(draws, result); return { result, board: b }; }
  }
}
